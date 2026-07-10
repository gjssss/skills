import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import type { ControlMessage, GameAction, GameState, PlayerInfo, ServerSeq } from '@djd/game-core'
import { applyAction, attachPending, createWaitingState, startBidding } from '@djd/game-core'
import type { RoomSummary, SpectatorFrame } from '@djd/game-web-contract'
import { finishedEvent, now, publicPendingEvent } from './events'
import { jsonKey } from './payload-key'
import { createCompletedSession } from './replay'
import type { CompletedSessionStore } from './session-store'
import { createRoomSummary, createSpectatorFrame } from './spectator-view'
import type { RoomMutation, ServerEvent, StoredIdempotency } from './types'

type ActionResult = Extract<ControlMessage, { type: 'action.result' }>

export interface JoinedPlayer {
  player: PlayerInfo
  joined: ServerEvent
  resumeKey: string
}

export interface RoomChange {
  room: GameRoom
  events: ServerEvent[]
}

export type RoomChangeListener = (change: RoomChange) => void

function resumeDigest(resumeKey: string) {
  return createHash('sha256').update(resumeKey).digest()
}

export class GameRoom {
  readonly roomId: string
  readonly sessionId: string
  readonly seed?: number
  readonly createdAt: string
  startedAt?: string
  updatedAt: string
  state: GameState
  events: ServerEvent[] = []
  frames: SpectatorFrame[] = []
  private nextSeq: ServerSeq = 1
  private idempotency = new Map<string, StoredIdempotency>()
  private resumeDigests = new Map<string, Buffer>()

  constructor(
    roomId: string,
    seed?: number,
    private readonly completedStore?: CompletedSessionStore,
  ) {
    this.roomId = roomId
    this.sessionId = `session_${randomUUID()}`
    this.seed = seed
    this.createdAt = now()
    this.updatedAt = this.createdAt
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
    const resumeKey = randomBytes(32).toString('base64url')
    this.resumeDigests.set(player.playerId, resumeDigest(resumeKey))
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
      this.startedAt = now()
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
      result: { player, joined, resumeKey },
      events: this.getEvents(beforeSeq),
    }
  }

  getPlayer(playerId: string) {
    return this.state.players.find((player) => player.playerId === playerId)
  }

  verifyResumeKey(playerId: string, resumeKey?: string) {
    const expected = this.resumeDigests.get(playerId)
    if (!expected || !resumeKey) return false
    const actual = resumeDigest(resumeKey)
    return expected.length === actual.length && timingSafeEqual(expected, actual)
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
    const previousState = structuredClone(this.state)
    const previousEventLength = this.events.length
    const previousFrameLength = this.frames.length
    const previousNextSeq = this.nextSeq
    const previousUpdatedAt = this.updatedAt
    const dealSource = this.seed === undefined ? undefined : this.seed + beforeSeq
    const result = applyAction(this.state, playerId, action, dealSource)
    if (!result.ok || !result.value) throw new Error(result.error ?? 'Action rejected')

    try {
      this.state = result.value
      const applied = this.emit('action.accepted', {
        playerId,
        expectedSeq: previousPending?.seq,
        idempotencyKey,
        action,
      })

      if (this.state.stage === 'finished') {
        const finished = this.emitFinished()
        if (!this.startedAt) throw new Error('Missing game start time')
        this.completedStore?.saveCompleted(createCompletedSession({
          sessionId: this.sessionId,
          roomId: this.roomId,
          state: this.state,
          events: this.events,
          frames: this.frames,
          startedAt: this.startedAt,
          finishedAt: finished.createdAt,
        }))
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
    catch (error) {
      this.state = previousState
      this.events.length = previousEventLength
      this.frames.length = previousFrameLength
      this.nextSeq = previousNextSeq
      this.updatedAt = previousUpdatedAt
      throw error
    }
  }

  getEvents(afterSeq = 0) {
    return this.events.filter((event) => event.seq > afterSeq)
  }

  getFrames(afterSeq = 0) {
    return this.frames.filter((frame) => frame.seq > afterSeq)
  }

  latestFrame() {
    return this.frames.at(-1)
  }

  currentSeq() {
    return this.nextSeq - 1
  }

  summary(connectionCount = 0): RoomSummary | undefined {
    return createRoomSummary(this, connectionCount)
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
    this.updatedAt = event.createdAt
    this.events.push(event)
    this.frames.push(createSpectatorFrame(this.sessionId, this.state, event))
    return event
  }

  private emitPending(): ServerEvent {
    const seq = this.nextSeq
    this.state = attachPending(this.state, seq)
    const event = publicPendingEvent(this.state)
    if (!event) throw new Error('No pending action to emit')
    this.nextSeq += 1
    this.updatedAt = event.createdAt
    this.events.push(event)
    this.frames.push(createSpectatorFrame(this.sessionId, this.state, event))
    return event
  }

  private emitFinished(): ServerEvent {
    const event = finishedEvent(this.state, this.nextSeq)
    this.nextSeq += 1
    this.updatedAt = event.createdAt
    this.events.push(event)
    this.frames.push(createSpectatorFrame(this.sessionId, this.state, event))
    return event
  }
}

export class GameServer {
  readonly seed?: number
  private rooms = new Map<string, GameRoom>()
  private listeners = new Set<RoomChangeListener>()
  private roomCounter = 0

  constructor(seed?: number, readonly completedStore?: CompletedSessionStore) {
    this.seed = seed
  }

  findRoom(roomId: string) {
    return this.rooms.get(roomId)
  }

  getRoom(roomId: string) {
    let room = this.rooms.get(roomId)
    if (!room || room.state.stage === 'finished') {
      const roomSeed = this.seed === undefined ? undefined : this.seed + this.roomCounter * 1000
      this.roomCounter += 1
      room = new GameRoom(roomId, roomSeed, this.completedStore)
      this.rooms.set(roomId, room)
    }
    return room
  }

  activeRooms(connectionCount: (roomId: string) => number = () => 0) {
    return [...this.rooms.values()]
      .flatMap((room) => {
        const summary = room.summary(connectionCount(room.roomId))
        return summary ? [summary] : []
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  notify(change: RoomChange) {
    for (const listener of this.listeners) listener(change)
    if (change.room.state.stage === 'finished') {
      const finishedRoom = change.room
      const timer = setTimeout(() => {
        if (this.rooms.get(finishedRoom.roomId) === finishedRoom) {
          this.rooms.delete(finishedRoom.roomId)
        }
      }, 10 * 60 * 1000)
      timer.unref?.()
    }
  }

  subscribe(listener: RoomChangeListener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}
