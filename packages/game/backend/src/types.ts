import type { ControlMessage, ServerEvent } from '@djd/game-core'

export type { ServerEvent } from '@djd/game-core'

export interface GameServerOptions {
  host?: string
  port?: number
  seed?: number
  frontendDist?: string
  log?: boolean
}

export interface StoredIdempotency {
  payload: string
  result: Extract<ControlMessage, { type: 'action.result' }>
}

export interface RoomMutation<T> {
  result: T
  events: ServerEvent[]
}

export interface SocketPeer {
  readonly readyState: number
  send(source: string): void
  close(code?: number, reason?: string): void
}
