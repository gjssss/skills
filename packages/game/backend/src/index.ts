import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { startGameServer } from './server'

export * from './types'
export * from './action'
export * from './events'
export * from './room'
export * from './app'
export * from './server'
export * from './websocket'

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  startGameServer({
    host: process.env.HOST,
    port: Number(process.env.PORT ?? 8787),
    seed: process.env.SEED ? Number(process.env.SEED) : undefined,
  })
}
