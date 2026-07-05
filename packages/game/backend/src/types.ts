import type { ServerSeq } from '@djd/game-core'

export interface ServerEvent {
  seq: ServerSeq
  roomId: string
  type: string
  createdAt: string
  [key: string]: unknown
}

export interface GameServerOptions {
  host?: string
  port?: number
  seed?: number
  frontendDist?: string
  log?: boolean
}

export interface Waiter {
  playerId: string
  resolve: (event: ServerEvent) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

export interface StoredIdempotency {
  payload: string
  response: unknown
}
