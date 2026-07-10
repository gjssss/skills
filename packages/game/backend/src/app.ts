import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { serveStatic, upgradeWebSocket, websocket } from 'hono/bun'
import { Hono } from 'hono'
import { now } from './events'
import { GameServer } from './room'
import type { GameServerOptions } from './types'
import { GameSocketHub } from './websocket'

export function createGameApp(options: GameServerOptions = {}) {
  const server = new GameServer(options.seed)
  const hub = new GameSocketHub(server)
  const app = new Hono()

  app.get('/api/health', (c) => {
    return c.json({
      ok: true,
      service: '@djd/game-backend',
      transport: 'websocket',
      time: now(),
    })
  })

  app.get('/ws', upgradeWebSocket(() => hub.createHandlers()))

  const distDir = options.frontendDist ?? process.env.FRONTEND_DIST
  if (distDir && existsSync(distDir)) {
    app.use('/*', serveStatic({ root: distDir }))
    app.get('*', async (c) => {
      if (c.req.path.startsWith('/api/') || c.req.path === '/ws' || c.req.path.startsWith('/rooms/')) {
        return c.notFound()
      }

      const indexPath = resolve(distDir, 'index.html')
      const html = await readFile(indexPath, 'utf-8')
      return c.html(html)
    })
  }

  return { app, server, hub, websocket }
}
