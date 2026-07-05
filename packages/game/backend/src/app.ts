import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { createPlayerView, createPublicView } from '@djd/game-core'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { normalizeAction } from './action'
import { now } from './events'
import { GameServer } from './room'
import type { GameServerOptions } from './types'

async function readJsonBody(c: { req: { json: () => Promise<unknown> } }) {
  try {
    const body = await c.req.json()
    if (!body || typeof body !== 'object') return {}
    return body as Record<string, unknown>
  }
  catch {
    return {}
  }
}

export function createGameApp(options: GameServerOptions = {}) {
  const server = new GameServer(options.seed)
  const app = new Hono()

  app.get('/api/health', (c) => {
    return c.json({
      ok: true,
      service: '@djd/game-backend',
      time: now(),
    })
  })

  app.post('/rooms/:roomId/join', async (c) => {
    try {
      const roomId = c.req.param('roomId')
      const body = await readJsonBody(c)
      const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'player'
      const playerId = typeof body.playerId === 'string' ? body.playerId : undefined
      const room = server.getRoom(roomId)
      return c.json(await room.joinAndWait(name, playerId))
    }
    catch (error) {
      return c.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 400)
    }
  })

  app.post('/rooms/:roomId/actions', async (c) => {
    try {
      const roomId = c.req.param('roomId')
      const body = await readJsonBody(c)
      const playerId = typeof body.playerId === 'string' ? body.playerId : undefined
      if (!playerId) throw new Error('playerId is required')
      const action = normalizeAction(body)
      const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : undefined
      const room = server.getRoom(roomId)
      return c.json(await room.applyPlayerAction(playerId, action, idempotencyKey))
    }
    catch (error) {
      const event = error && typeof error === 'object' && 'event' in error ? (error as { event?: unknown }).event : undefined
      return c.json(
        {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
          event,
        },
        400,
      )
    }
  })

  app.get('/rooms/:roomId/events', (c) => {
    const roomId = c.req.param('roomId')
    const afterSeq = Number(c.req.query('afterSeq') ?? c.req.query('after-seq') ?? 0)
    const room = server.getRoom(roomId)
    const events = room.getEvents(Number.isFinite(afterSeq) ? afterSeq : 0)
    return c.json({
      ok: true,
      roomId,
      fromSeq: events[0]?.seq ?? room.currentSeq() + 1,
      toSeq: room.currentSeq(),
      events,
    })
  })

  app.get('/rooms/:roomId/state', (c) => {
    const roomId = c.req.param('roomId')
    const playerId = c.req.query('playerId')
    const room = server.getRoom(roomId)
    return c.json({
      ok: true,
      roomId,
      snapshotSeq: room.currentSeq(),
      state: playerId ? createPlayerView(room.state, playerId) : createPublicView(room.state),
    })
  })

  const distDir = options.frontendDist ?? process.env.FRONTEND_DIST
  if (distDir && existsSync(distDir)) {
    app.use('/*', serveStatic({ root: distDir }))
    app.get('*', async (c) => {
      if (c.req.path.startsWith('/api/') || c.req.path.startsWith('/rooms/')) {
        return c.notFound()
      }

      const indexPath = resolve(distDir, 'index.html')
      const html = await readFile(indexPath, 'utf-8')
      return c.html(html)
    })
  }

  return { app, server }
}
