import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { buildGreeting } from '@djd/game-core'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'

const app = new Hono()

app.get('/api/health', (c) => {
  return c.json({
    ok: true,
    service: '@djd/game-backend',
    time: new Date().toISOString(),
  })
})

app.get('/api/hello', (c) => {
  return c.json({
    message: buildGreeting('backend'),
    time: new Date().toISOString(),
  })
})

const distDir = process.env.FRONTEND_DIST

if (distDir && existsSync(distDir)) {
  app.use('/*', serveStatic({ root: distDir }))
  app.get('*', async (c) => {
    if (c.req.path.startsWith('/api/')) {
      return c.notFound()
    }

    const indexPath = resolve(distDir, 'index.html')
    const html = await readFile(indexPath, 'utf-8')
    return c.html(html)
  })
}
else if (distDir) {
  console.warn(`FRONTEND_DIST not found: ${distDir}`)
}

const port = Number(process.env.PORT ?? 3000)

console.info(`@djd/game-backend listening on http://localhost:${port}`)
serve({ fetch: app.fetch, port })
