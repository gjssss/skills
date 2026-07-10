import type { SpectatorClientMessage, SpectatorServerMessage } from '@djd/game-web-contract'
import { parseSpectatorClientMessage } from '@djd/game-web-contract'
import type { WSEvents } from 'hono/ws'
import type { GameRoom, GameServer, RoomChange } from './room'
import type { SocketPeer } from './types'

interface SpectatorSession {
  peer: SocketPeer
  subscription?: SpectatorClientMessage
}

function json(message: SpectatorServerMessage) {
  return JSON.stringify(message)
}

export class SpectatorSocketHub {
  private readonly sessions = new Set<SpectatorSession>()

  constructor(
    readonly server: GameServer,
    private readonly playerConnectionCount: (roomId: string) => number,
  ) {
    this.server.subscribe((change) => this.publish(change))
  }

  createHandlers(): WSEvents {
    let session: SpectatorSession | undefined
    return {
      onOpen: (_event, ws) => {
        session = { peer: ws }
        this.sessions.add(session)
      },
      onMessage: (event, ws) => {
        if (!session) {
          session = { peer: ws }
          this.sessions.add(session)
        }
        if (typeof event.data !== 'string') {
          this.fail(ws, 4400, 'BINARY_MESSAGE', 'Only UTF-8 JSON text messages are supported')
          return
        }
        if (session.subscription) {
          this.fail(ws, 4400, 'SUBSCRIPTION_ALREADY_OPEN', 'spectator.subscribe may only be sent once')
          return
        }
        try {
          session.subscription = parseSpectatorClientMessage(JSON.parse(event.data))
        }
        catch (error) {
          this.fail(ws, 4400, 'INVALID_MESSAGE', error instanceof Error ? error.message : String(error))
          return
        }
        this.sync(session)
      },
      onClose: () => {
        if (session) this.sessions.delete(session)
      },
      onError: () => {
        if (session) this.sessions.delete(session)
      },
    }
  }

  connectionCount() {
    return this.sessions.size
  }

  private sync(session: SpectatorSession) {
    const subscription = session.subscription
    if (!subscription) return
    if (subscription.scope === 'rooms') {
      this.send(session.peer, {
        type: 'rooms.snapshot',
        rooms: this.server.activeRooms(this.playerConnectionCount),
      })
      this.send(session.peer, { type: 'sync.complete' })
      return
    }

    const room = this.server.findRoom(subscription.roomId)
    if (!room || room.state.stage === 'finished') {
      this.send(session.peer, {
        type: 'error',
        code: 'ROOM_NOT_FOUND',
        message: `Active room not found: ${subscription.roomId}`,
      })
      return
    }
    const frames = room.getFrames(subscription.afterSeq)
    if (frames.length === 0) {
      const latest = room.latestFrame()
      if (latest) this.send(session.peer, { type: 'room.snapshot', frame: latest })
    }
    else {
      for (const frame of frames) this.send(session.peer, { type: 'room.frame', frame })
    }
    this.send(session.peer, {
      type: 'sync.complete',
      roomId: room.roomId,
      serverSeq: room.currentSeq(),
    })
  }

  private publish(change: RoomChange) {
    for (const session of this.sessions) {
      const subscription = session.subscription
      if (!subscription) continue
      if (subscription.scope === 'rooms') {
        const room = change.room.summary(this.playerConnectionCount(change.room.roomId))
        if (room) this.send(session.peer, { type: 'room.updated', room })
        else {
          this.send(session.peer, {
            type: 'room.removed',
            roomId: change.room.roomId,
            sessionId: change.room.sessionId,
          })
        }
        continue
      }
      if (subscription.roomId !== change.room.roomId) continue
      this.sendChangedFrames(session.peer, change.room, change)
    }
  }

  private sendChangedFrames(peer: SocketPeer, room: GameRoom, change: RoomChange) {
    const changedSeqs = new Set(change.events.map((event) => event.seq))
    for (const frame of room.frames) {
      if (changedSeqs.has(frame.seq)) this.send(peer, { type: 'room.frame', frame })
    }
  }

  private send(peer: SocketPeer, message: SpectatorServerMessage) {
    if (peer.readyState === 1) peer.send(json(message))
  }

  private fail(peer: SocketPeer, closeCode: number, code: string, message: string) {
    this.send(peer, { type: 'error', code, message })
    setTimeout(() => peer.close(closeCode, message.slice(0, 120)), 25)
  }
}
