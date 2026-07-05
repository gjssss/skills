import type { GameAction, GameState, PlayerInfo, ServerSeq } from '@djd/game-core'
import { applyAction, attachPending, createWaitingState, startBidding } from '@djd/game-core'
import { finishedEvent, jsonKey, now, publicPendingEvent, WAIT_TIMEOUT_MS } from './events'
import type { ServerEvent, StoredIdempotency, Waiter } from './types'

export class GameRoom {
  readonly roomId: string
  readonly seed: number
  state: GameState
  events: ServerEvent[] = []
  private nextSeq: ServerSeq = 1
  private waiters: Waiter[] = []
  private idempotency = new Map<string, StoredIdempotency>()

  constructor(roomId: string, seed: number) {
    this.roomId = roomId
    this.seed = seed
    this.state = createWaitingState(roomId)
    this.emit('room.created', { stage: 'waiting' })
  }

  join(name: string, reconnectPlayerId?: string) {
    if (reconnectPlayerId && this.state.players.some((player) => player.playerId === reconnectPlayerId)) {
      const player = this.state.players.find((item) => item.playerId === reconnectPlayerId) as PlayerInfo
      return {
        seq: this.currentSeq(),
        type: 'player.reconnected',
        roomId: this.roomId,
        createdAt: now(),
        playerId: player.playerId,
        seat: player.seat,
        name: player.name,
      } as ServerEvent
    }

    if (this.state.players.length >= 3) {
      throw new Error('Room is full')
    }
    if (this.state.stage !== 'waiting') {
      throw new Error('Game already started')
    }

    const seat = this.state.players.length
    const player: PlayerInfo = {
      playerId: `p${seat + 1}`,
      name,
      seat,
    }
    this.state = {
      ...this.state,
      players: [...this.state.players, player],
      hands: {
        ...this.state.hands,
        [player.playerId]: [],
      },
    }

    const joined = this.emit('player.joined', {
      playerId: player.playerId,
      seat: player.seat,
      name: player.name,
    })

    if (this.state.players.length === 3) {
      this.state = startBidding(this.state, this.seed)
      this.emit('game.started', {
        stage: 'bidding',
        players: this.state.players.map((item) => ({
          playerId: item.playerId,
          seat: item.seat,
          name: item.name,
        })),
      })
      this.emitPending()
    }

    return joined
  }

  async joinAndWait(name: string, reconnectPlayerId?: string) {
    const joined = this.join(name, reconnectPlayerId)
    const playerId = String(joined.playerId)
    const next = await this.waitForPlayer(playerId)
    return {
      ok: true,
      joined,
      serverSeq: this.currentSeq(),
      next,
    }
  }

  async applyPlayerAction(playerId: string, action: GameAction, idempotencyKey?: string) {
    const payloadKey = jsonKey({ playerId, action })
    if (idempotencyKey) {
      const stored = this.idempotency.get(idempotencyKey)
      if (stored) {
        if (stored.payload !== payloadKey) throw new Error('Idempotency key payload mismatch')
        return stored.response
      }
    }

    const previousPending = this.state.pending
    const result = applyAction(this.state, playerId, action, this.seed + this.currentSeq())
    if (!result.ok || !result.value) {
      const rejected = this.emit('action.rejected', {
        playerId,
        expectedSeq: action.expectedSeq,
        action,
        error: result.error ?? 'Action rejected',
      })
      throw Object.assign(new Error(result.error ?? 'Action rejected'), { event: rejected })
    }

    this.state = result.value
    const applied = this.emit('action.accepted', {
      playerId,
      expectedSeq: previousPending?.seq,
      action,
    })

    let next: ServerEvent
    if (this.state.stage === 'finished') {
      next = this.emitFinished()
    }
    else {
      next = this.emitPending()
      if (this.state.stage === 'playing' && previousPending?.type === 'bid.request' && this.state.landlordId) {
        this.emit('landlord.decided', {
          landlordId: this.state.landlordId,
          bottomCards: this.state.bottomCards,
          bid: this.state.bid.current,
        })
      }
    }

    if (next.playerId !== playerId && next.type !== 'game.finished') {
      next = await this.waitForPlayer(playerId)
    }

    const response = {
      ok: true,
      serverSeq: this.currentSeq(),
      applied,
      next,
    }

    if (idempotencyKey) {
      this.idempotency.set(idempotencyKey, { payload: payloadKey, response })
    }

    return response
  }

  getEvents(afterSeq = 0) {
    return this.events.filter((event) => event.seq > afterSeq)
  }

  currentSeq() {
    return this.nextSeq - 1
  }

  private emit(type: string, payload: Record<string, unknown> = {}): ServerEvent {
    const event: ServerEvent = {
      seq: this.nextSeq,
      roomId: this.roomId,
      type,
      createdAt: now(),
      ...payload,
    }
    this.nextSeq += 1
    this.events.push(event)
    this.resolveWaiters(event)
    return event
  }

  private emitPending(): ServerEvent {
    const seq = this.nextSeq
    this.state = attachPending(this.state, seq)
    const event = publicPendingEvent(this.state)
    if (!event) throw new Error('No pending action to emit')
    this.nextSeq += 1
    this.events.push(event)
    this.resolveWaiters(event)
    return event
  }

  private emitFinished(): ServerEvent {
    const event = finishedEvent(this.state, this.nextSeq)
    this.nextSeq += 1
    this.events.push(event)
    this.resolveWaiters(event)
    return event
  }

  private waitForPlayer(playerId: string): Promise<ServerEvent> {
    const immediate = this.findWaitEvent(playerId)
    if (immediate) return Promise.resolve(immediate)

    return new Promise((resolvePromise, rejectPromise) => {
      const waiter: Waiter = {
        playerId,
        resolve: resolvePromise,
        reject: rejectPromise,
        timer: setTimeout(() => {
          this.waiters = this.waiters.filter((item) => item !== waiter)
          rejectPromise(new Error('Timed out waiting for next action'))
        }, WAIT_TIMEOUT_MS),
      }
      this.waiters.push(waiter)
    })
  }

  private findWaitEvent(playerId: string) {
    const latest = [...this.events].reverse().find((event) => {
      if (event.type === 'game.finished') return true
      return (event.type === 'bid.request' || event.type === 'turn.request') && event.playerId === playerId
    })
    if (!latest) return undefined
    if (latest.type === 'game.finished') return latest
    if (this.state.pending?.seq === latest.seq) return latest
    return undefined
  }

  private resolveWaiters(event: ServerEvent) {
    const matched = this.waiters.filter((waiter) => {
      if (event.type === 'game.finished') return true
      return (event.type === 'bid.request' || event.type === 'turn.request') && event.playerId === waiter.playerId
    })
    if (matched.length === 0) return
    this.waiters = this.waiters.filter((waiter) => !matched.includes(waiter))
    for (const waiter of matched) {
      clearTimeout(waiter.timer)
      waiter.resolve(event)
    }
  }
}

export class GameServer {
  readonly seed: number
  private rooms = new Map<string, GameRoom>()

  constructor(seed = Date.now()) {
    this.seed = seed
  }

  getRoom(roomId: string) {
    let room = this.rooms.get(roomId)
    if (!room) {
      room = new GameRoom(roomId, this.seed + this.rooms.size * 1000)
      this.rooms.set(roomId, room)
    }
    return room
  }
}
