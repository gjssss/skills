import type { ClientMessage, ControlMessage, ServerEvent, SessionMode } from '@djd/game-core'
import { createPlayerView, createPublicView, decodeClientMessage } from '@djd/game-core'
import type { WSEvents, WSContext } from 'hono/ws'
import { GameServer, type GameRoom } from './room'
import type { SocketPeer } from './types'

interface SocketSession {
  peer: SocketPeer
  room: GameRoom
  mode: SessionMode
  playerId?: string
  busy: boolean
}

function json(message: ControlMessage | ServerEvent) {
  return JSON.stringify(message)
}

export function projectEvent(event: ServerEvent, playerId?: string): ServerEvent {
  const base: ServerEvent = {
    seq: event.seq,
    roomId: event.roomId,
    type: event.type,
    createdAt: event.createdAt,
  }
  switch (event.type) {
    case 'room.created':
      return { ...base, stage: event.stage }
    case 'player.joined':
      return { ...base, playerId: event.playerId, seat: event.seat, name: event.name }
    case 'game.started':
      return { ...base, stage: event.stage, players: event.players }
    case 'bid.request':
    case 'turn.request': {
      const pending = {
        ...base,
        playerId: event.playerId,
        seat: event.seat,
        stage: event.stage,
      }
      if (event.playerId !== playerId) return pending
      return {
        ...pending,
        hand: event.hand,
        ...(event.type === 'bid.request' ? { availableBids: event.availableBids } : {}),
      }
    }
    case 'action.accepted':
      return {
        ...base,
        playerId: event.playerId,
        expectedSeq: event.expectedSeq,
        idempotencyKey: event.idempotencyKey,
        action: event.action,
      }
    case 'landlord.decided':
      return {
        ...base,
        landlordId: event.landlordId,
        bottomCards: event.bottomCards,
        bid: event.bid,
      }
    case 'game.finished':
      return { ...base, stage: event.stage, finished: event.finished, state: event.state }
    default:
      return base
  }
}

export class GameSocketHub {
  private readonly connections = new Map<string, Set<SocketSession>>()

  constructor(readonly server: GameServer) {}

  createHandlers(): WSEvents {
    let session: SocketSession | undefined
    let queue = Promise.resolve()

    return {
      onMessage: (event, ws) => {
        queue = queue.then(async () => {
          if (typeof event.data !== 'string') {
            this.fail(ws, 4400, 'BINARY_MESSAGE', 'Only UTF-8 JSON text messages are supported')
            return
          }

          let message: ClientMessage
          try {
            message = decodeClientMessage(event.data)
          }
          catch (error) {
            this.fail(ws, 4400, 'INVALID_MESSAGE', error instanceof Error ? error.message : String(error))
            return
          }

          if (!session) {
            if (message.type !== 'session.open') {
              this.fail(ws, 4400, 'SESSION_REQUIRED', 'The first message must be session.open')
              return
            }
            session = this.openSession(ws, message)
            return
          }

          if (message.type === 'session.open') {
            this.fail(ws, 4400, 'SESSION_ALREADY_OPEN', 'session.open may only be sent once')
            return
          }
          if (session.busy) {
            this.send(ws, { type: 'error', code: 'COMMAND_IN_FLIGHT', message: 'Only one command may be in flight' })
            return
          }

          session.busy = true
          try {
            if (message.type === 'state.get') this.sendState(session)
            else this.applyAction(session, message)
          }
          finally {
            session.busy = false
          }
        }).catch((error) => {
          this.fail(ws, 1011, 'INTERNAL_ERROR', error instanceof Error ? error.message : String(error))
        })
      },
      onClose: () => {
        queue = queue.finally(() => {
          if (session) this.detach(session)
        })
      },
      onError: (_event, ws) => {
        if (session) this.detach(session)
        else ws.close(1011, 'WebSocket error')
      },
    }
  }

  connectionCount(roomId?: string) {
    if (roomId) return this.connections.get(roomId)?.size ?? 0
    let count = 0
    for (const connections of this.connections.values()) count += connections.size
    return count
  }

  private openSession(peer: WSContext, message: Extract<ClientMessage, { type: 'session.open' }>) {
    let room: GameRoom
    let playerId: string | undefined
    let resumeKey: string | undefined
    let changedEvents: ServerEvent[] = []

    if (message.mode === 'join') {
      room = this.server.getRoom(message.roomId)
      try {
        const mutation = room.join(message.name!)
        playerId = mutation.result.player.playerId
        resumeKey = mutation.result.resumeKey
        changedEvents = mutation.events
        this.broadcast(room.roomId, mutation.events)
      }
      catch (error) {
        const messageText = error instanceof Error ? error.message : String(error)
        this.fail(peer, messageText === 'Room is full' ? 4409 : 4400, 'JOIN_REJECTED', messageText)
        return undefined
      }
    }
    else {
      const existing = this.server.findRoom(message.roomId)
      if (!existing) {
        this.fail(peer, 4404, 'ROOM_NOT_FOUND', `Room not found: ${message.roomId}`)
        return undefined
      }
      room = existing
      if (message.mode === 'resume') {
        const player = room.getPlayer(message.playerId!)
        if (!player) {
          this.fail(peer, 4404, 'PLAYER_NOT_FOUND', `Player not found: ${message.playerId}`)
          return undefined
        }
        if (!room.verifyResumeKey(player.playerId, message.resumeKey)) {
          this.fail(peer, 4403, 'RESUME_KEY_INVALID', 'Invalid resume key')
          return undefined
        }
        playerId = player.playerId
      }
    }

    const session: SocketSession = { peer, room, mode: message.mode, playerId, busy: false }
    let roomConnections = this.connections.get(room.roomId)
    if (!roomConnections) {
      roomConnections = new Set()
      this.connections.set(room.roomId, roomConnections)
    }
    roomConnections.add(session)
    this.server.notify({ room, events: changedEvents })

    const player = playerId ? room.getPlayer(playerId) : undefined
    this.send(peer, {
      type: 'session.accepted',
      mode: message.mode,
      roomId: room.roomId,
      player,
      resumeKey,
      serverSeq: room.currentSeq(),
    })
    for (const event of room.getEvents(message.afterSeq)) {
      this.send(peer, projectEvent(event, playerId))
    }
    this.send(peer, {
      type: 'sync.complete',
      serverSeq: room.currentSeq(),
      pendingSeq: room.state.pending?.seq,
    })
    return session
  }

  private applyAction(session: SocketSession, message: Extract<ClientMessage, { type: 'action.submit' }>) {
    if (!session.playerId || session.mode === 'observe') {
      this.send(session.peer, {
        type: 'error',
        code: 'PLAYER_SESSION_REQUIRED',
        message: 'action.submit requires a joined or resumed player session',
        idempotencyKey: message.idempotencyKey,
      })
      return
    }

    try {
      const mutation = session.room.applyPlayerAction(
        session.playerId,
        { ...message.action, expectedSeq: message.expectedSeq },
        message.idempotencyKey,
      )
      this.send(session.peer, mutation.result)
      this.broadcast(session.room.roomId, mutation.events)
      this.server.notify({ room: session.room, events: mutation.events })
    }
    catch (error) {
      const messageText = error instanceof Error ? error.message : String(error)
      this.send(session.peer, {
        type: 'error',
        code: messageText === 'Idempotency key payload mismatch' ? 'IDEMPOTENCY_CONFLICT' : 'ACTION_REJECTED',
        message: messageText,
        idempotencyKey: message.idempotencyKey,
      })
    }
  }

  private sendState(session: SocketSession) {
    const state = session.playerId
      ? createPlayerView(session.room.state, session.playerId)
      : createPublicView(session.room.state)
    this.send(session.peer, {
      type: 'state.snapshot',
      roomId: session.room.roomId,
      snapshotSeq: session.room.currentSeq(),
      state,
    })
  }

  private broadcast(roomId: string, events: ServerEvent[]) {
    if (events.length === 0) return
    for (const session of this.connections.get(roomId) ?? []) {
      for (const event of events) this.send(session.peer, projectEvent(event, session.playerId))
    }
  }

  private send(peer: SocketPeer, message: ControlMessage | ServerEvent) {
    if (peer.readyState !== 1) return
    peer.send(json(message))
  }

  private fail(peer: SocketPeer, closeCode: number, code: string, message: string) {
    this.send(peer, { type: 'error', code, message })
    setTimeout(() => peer.close(closeCode, message.slice(0, 120)), 25)
  }

  private detach(session: SocketSession) {
    const roomConnections = this.connections.get(session.room.roomId)
    if (!roomConnections) return
    roomConnections.delete(session)
    if (roomConnections.size === 0) this.connections.delete(session.room.roomId)
    this.server.notify({ room: session.room, events: [] })
  }
}
