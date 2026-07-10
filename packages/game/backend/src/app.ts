import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { serveStatic, upgradeWebSocket, websocket } from 'hono/bun'
import { Hono } from 'hono'
import { now } from './events'
import { GameServer } from './room'
import { defaultSessionDatabasePath, SqliteCompletedSessionStore } from './session-store'
import { SpectatorSocketHub } from './spectator-websocket'
import type { GameServerOptions } from './types'
import { GameSocketHub } from './websocket'

export function createGameApp(options: GameServerOptions = {}) {
  const completedStore = options.completedStore ?? new SqliteCompletedSessionStore(
    options.dataFile ?? process.env.DJD_GAME_DATA_FILE ?? defaultSessionDatabasePath(),
  )
  const server = new GameServer(options.seed, completedStore)
  const hub = new GameSocketHub(server)
  const spectatorHub = new SpectatorSocketHub(server, (roomId) => hub.connectionCount(roomId))
  const app = new Hono()

  const setNoStore = (c: { header(name: string, value: string): void }) => c.header('Cache-Control', 'no-store')

  app.get('/api/health', (c) => {
    return c.json({
      ok: true,
      service: '@djd/game-backend',
      transport: 'websocket',
      time: now(),
    })
  })

  app.get('/ws', upgradeWebSocket(() => hub.createHandlers()))
  app.get('/ws/spectator', upgradeWebSocket(() => spectatorHub.createHandlers()))

  app.get('/api/spectator/rooms', (c) => {
    setNoStore(c)
    return c.json({ rooms: server.activeRooms((roomId) => hub.connectionCount(roomId)) })
  })

  app.get('/api/spectator/rooms/:roomId', (c) => {
    setNoStore(c)
    const room = server.findRoom(c.req.param('roomId'))
    if (!room || room.state.stage === 'finished') return c.json({ error: 'ROOM_NOT_FOUND' }, 404)
    const frame = room.latestFrame()
    return frame ? c.json(frame) : c.json({ error: 'ROOM_NOT_FOUND' }, 404)
  })

  app.get('/api/spectator/sessions', (c) => {
    setNoStore(c)
    return c.json(completedStore.listCompleted(
      Number(c.req.query('page') ?? 1),
      Number(c.req.query('pageSize') ?? 20),
    ))
  })

  app.get('/api/spectator/sessions/:sessionId', (c) => {
    setNoStore(c)
    const record = completedStore.getCompleted(c.req.param('sessionId'))
    return record ? c.json(record) : c.json({ error: 'SESSION_NOT_FOUND' }, 404)
  })

  const distDir = options.frontendDist ?? process.env.FRONTEND_DIST
  if (distDir && existsSync(distDir)) {
    app.use('/*', serveStatic({ root: distDir }))
    app.get('*', async (c) => {
      if (c.req.path.startsWith('/api/') || c.req.path === '/ws' || c.req.path === '/ws/spectator') {
        return c.notFound()
      }

      const indexPath = resolve(distDir, 'index.html')
      const html = await readFile(indexPath, 'utf-8')
      return c.html(html)
    })
  }

  return { app, server, hub, spectatorHub, completedStore, websocket }
}
