declare const __APP_VERSION__: string

declare module '@djd/game-backend' {
  export interface GameServerOptions {
    host?: string
    port?: number
    seed?: number
    frontendDist?: string
    log?: boolean
  }

  export function startGameServer(options?: GameServerOptions): unknown
}
