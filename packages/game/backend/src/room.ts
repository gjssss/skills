import type { ControlMessage, GameAction, GameState, PlayerInfo, ServerSeq } from '@djd/game-core'
import { applyAction, attachPending, createWaitingState, startBidding } from '@djd/game-core'
import { finishedEvent, now, publicPendingEvent } from './events'
import { jsonKey } from './payload-key'
import type { RoomMutation, ServerEvent, StoredIdempotency } from './types'

type ActionResult = Extract<ControlMessage, { type: 'action.result' }>

export interface JoinedPlayer {
  player: PlayerInfo
  joined: ServerEvent
}

export class GameRoom {
  readonly roomId: string
  readonly seed: number
  state: GameState
  events: ServerEvent[] = []
  private nextSeq: ServerSeq = 1
  private idempotency = new Map<string, StoredIdempotency>()

  constructor(roomId: string, seed: number) {
    this.roomId = roomId
    this.seed = seed
    this.state = createWaitingState(roomId)
    this.emit('room.created', { stage: 'waiting' })
  }

  join(name: string): RoomMutation<JoinedPlayer> {
    if (this.state.players.length >= 3) throw new Error('Room is full')
    if (this.state.stage !== 'waiting') throw new Error('Game already started')

    const beforeSeq = this.currentSeq()
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

    return {
      result: { player, joined },
      events: this.getEvents(beforeSeq),
    }
  }

  getPlayer(playerId: string) {
    return this.state.players.find((player) => player.playerId === playerId)
  }

  applyPlayerAction(playerId: string, action: GameAction, idempotencyKey: string): RoomMutation<ActionResult> {
    const payloadKey = jsonKey({ playerId, action })
    const stored = this.idempotency.get(idempotencyKey)
    if (stored) {
      if (stored.payload !== payloadKey) throw new Error('Idempotency key payload mismatch')
      return { result: stored.result, events: [] }
    }

    const beforeSeq = this.currentSeq()
    const previousPending = this.state.pending
    const result = applyAction(this.state, playerId, action, this.seed + beforeSeq)
    if (!result.ok || !result.value) throw new Error(result.error ?? 'Action rejected')

    this.state = result.value
    const applied = this.emit('action.accepted', {
      playerId,
      expectedSeq: previousPending?.seq,
      idempotencyKey,
      action,
    })

    if (this.state.stage === 'finished') {
      this.emitFinished()
    }
    else {
      if (this.state.stage === 'playing' && previousPending?.type === 'bid.request' && this.state.landlordId) {
        this.emit('landlord.decided', {
          landlordId: this.state.landlordId,
          bottomCards: this.state.bottomCards,
          bid: this.state.bid.current,
        })
      }
      this.emitPending()
    }

    const actionResult: ActionResult = {
      type: 'action.result',
      ok: true,
      idempotencyKey,
      acceptedSeq: applied.seq,
      serverSeq: this.currentSeq(),
      applied,
    }
    this.idempotency.set(idempotencyKey, { payload: payloadKey, result: actionResult })
    return { result: actionResult, events: this.getEvents(beforeSeq) }
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
    return event
  }

  private emitPending(): ServerEvent {
    const seq = this.nextSeq
    this.state = attachPending(this.state, seq)
    const event = publicPendingEvent(this.state)
    if (!event) throw new Error('No pending action to emit')
    this.nextSeq += 1
    this.events.push(event)
    return event
  }

  private emitFinished(): ServerEvent {
    const event = finishedEvent(this.state, this.nextSeq)
    this.nextSeq += 1
    this.events.push(event)
    return event
  }
}

export class GameServer {
  readonly seed: number
  private rooms = new Map<string, GameRoom>()

  constructor(seed = Date.now()) {
    this.seed = seed
  }

  findRoom(roomId: string) {
    return this.rooms.get(roomId)
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
