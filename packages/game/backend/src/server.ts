import process from 'node:process'
import { MAX_WS_MESSAGE_BYTES } from '@djd/game-core'
import { createGameApp } from './app'
import type { GameServerOptions } from './types'

export function startGameServer(options: GameServerOptions = {}) {
  const port = options.port ?? Number(process.env.PORT ?? 8787)
  const host = options.host ?? process.env.HOST ?? '127.0.0.1'
  const { app, websocket } = createGameApp(options)
  const started = Bun.serve({
    hostname: host,
    port,
    fetch: (request, server) => app.fetch(request, { server }),
    websocket: {
      ...websocket,
      maxPayloadLength: MAX_WS_MESSAGE_BYTES,
      idleTimeout: 10 * 60,
      sendPings: true,
    },
  })
  if (options.log !== false) {
    console.error(`@djd/game-backend listening on http://${host}:${started.port} (ws://${host}:${started.port}/ws)`)
  }
  return started
}
