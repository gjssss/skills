import process from 'node:process'
import { serve } from '@hono/node-server'
import { createGameApp } from './app'
import type { GameServerOptions } from './types'

export function startGameServer(options: GameServerOptions = {}) {
  const port = options.port ?? Number(process.env.PORT ?? 8787)
  const host = options.host ?? process.env.HOST ?? '127.0.0.1'
  const { app } = createGameApp(options)
  const started = serve({ fetch: app.fetch, hostname: host, port })
  if (options.log !== false) {
    console.error(`@djd/game-backend listening on http://${host}:${port}`)
  }
  return started
}
