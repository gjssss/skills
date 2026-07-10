import { useEffect, useMemo, useSyncExternalStore } from 'react'
import type {
  RoomSummary,
  SpectatorFrame,
  SpectatorServerMessage,
} from '@djd/game-web-contract'
import { spectatorWebSocketUrl } from './api'

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'closed' | 'error'

interface RoomsSnapshot {
  status: ConnectionStatus
  rooms: RoomSummary[]
  error?: string
}

interface RoomSnapshot {
  status: ConnectionStatus
  frames: SpectatorFrame[]
  error?: string
}

abstract class SocketStore<T> {
  protected socket?: WebSocket
  protected reconnectTimer?: number
  protected attempts = 0
  protected active = false
  protected listeners = new Set<() => void>()
  protected abstract snapshot: T

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = () => this.snapshot
  getServerSnapshot = () => this.snapshot

  connect() {
    this.active = true
    this.open()
    return () => this.disconnect()
  }

  disconnect() {
    this.active = false
    if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer)
    this.socket?.close(1000, 'page left')
    this.socket = undefined
  }

  protected abstract subscription(): object
  protected abstract receive(message: SpectatorServerMessage): void
  protected abstract setStatus(status: ConnectionStatus, error?: string): void

  protected emit() {
    for (const listener of this.listeners) listener()
  }

  private open() {
    if (!this.active) return
    this.setStatus(this.attempts === 0 ? 'connecting' : 'reconnecting')
    const socket = new WebSocket(spectatorWebSocketUrl())
    this.socket = socket
    socket.addEventListener('open', () => {
      this.attempts = 0
      socket.send(JSON.stringify(this.subscription()))
    })
    socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(String(event.data)) as SpectatorServerMessage
        if (message.type === 'sync.complete') this.setStatus('connected')
        else if (message.type === 'error') this.setStatus('error', message.message)
        else this.receive(message)
      }
      catch (error) {
        this.setStatus('error', error instanceof Error ? error.message : '消息解析失败')
      }
    })
    socket.addEventListener('close', (event) => {
      if (!this.active || event.code === 1000) {
        this.setStatus('closed')
        return
      }
      this.attempts += 1
      this.setStatus('reconnecting')
      const delay = Math.min(5000, 300 * 2 ** Math.min(this.attempts, 4))
      this.reconnectTimer = window.setTimeout(() => this.open(), delay)
    })
    socket.addEventListener('error', () => this.setStatus('error', '实时连接失败'))
  }
}

class RoomsStore extends SocketStore<RoomsSnapshot> {
  protected snapshot: RoomsSnapshot = { status: 'connecting', rooms: [] }

  protected subscription() {
    return { type: 'spectator.subscribe', scope: 'rooms' }
  }

  protected receive(message: SpectatorServerMessage) {
    if (message.type === 'rooms.snapshot') {
      this.snapshot = { ...this.snapshot, rooms: message.rooms }
    }
    else if (message.type === 'room.updated') {
      const rooms = new Map(this.snapshot.rooms.map((room) => [room.roomId, room]))
      rooms.set(message.room.roomId, message.room)
      this.snapshot = {
        ...this.snapshot,
        rooms: [...rooms.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      }
    }
    else if (message.type === 'room.removed') {
      this.snapshot = {
        ...this.snapshot,
        rooms: this.snapshot.rooms.filter((room) => room.roomId !== message.roomId),
      }
    }
    this.emit()
  }

  protected setStatus(status: ConnectionStatus, error?: string) {
    this.snapshot = { ...this.snapshot, status, error }
    this.emit()
  }
}

class RoomStore extends SocketStore<RoomSnapshot> {
  protected snapshot: RoomSnapshot = { status: 'connecting', frames: [] }

  constructor(private readonly roomId: string) {
    super()
  }

  protected subscription() {
    return {
      type: 'spectator.subscribe',
      scope: 'room',
      roomId: this.roomId,
      afterSeq: this.snapshot.frames.at(-1)?.seq ?? 0,
    }
  }

  protected receive(message: SpectatorServerMessage) {
    if (message.type !== 'room.frame' && message.type !== 'room.snapshot') return
    const frames = new Map(this.snapshot.frames.map((frame) => [frame.seq, frame]))
    frames.set(message.frame.seq, message.frame)
    this.snapshot = {
      ...this.snapshot,
      frames: [...frames.values()].sort((a, b) => a.seq - b.seq),
    }
    this.emit()
  }

  protected setStatus(status: ConnectionStatus, error?: string) {
    this.snapshot = { ...this.snapshot, status, error }
    this.emit()
  }
}

function useStore<T>(store: SocketStore<T>) {
  useEffect(() => store.connect(), [store])
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)
}

export function useRoomsSubscription() {
  const store = useMemo(() => new RoomsStore(), [])
  return useStore(store)
}

export function useRoomSubscription(roomId: string) {
  const store = useMemo(() => new RoomStore(roomId), [roomId])
  return useStore(store)
}
