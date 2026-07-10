import { resolve } from 'node:path'
import { startGameServer } from '@djd/game-backend'
import { Command } from 'commander'
import { parseActionFromInput } from './action-input'
import { loadConfig, saveConfig, updateCurrentFromResponse, updateStats } from './config'
import { printJson } from './output'
import { resolveCliDist } from './paths'
import type { GlobalOptions } from './types'
import {
  asHttpUrl,
  asWebSocketUrl,
  fetchEvents,
  fetchState,
  joinRoom,
  resolveContext,
  sessionMode,
  submitAction,
} from './ws'

export function createProgram(version: string) {
  const program = new Command()
  
  program
    .name('djd-game')
    .description('Agent-friendly Dou Dizhu CLI.')
    .version(version)
    .option('--config <path>', 'Set config path')
    .option('--server <url>', 'Set server URL')
    .option('--room <roomId>', 'Set room id')
    .option('--player <playerId>', 'Set player id')
    .option('--json', 'Print JSON')

  const mergeOptions = (options: GlobalOptions = {}): GlobalOptions => ({
    ...program.opts<GlobalOptions>(),
    ...options,
  })
  
  program
    .command('server')
    .description('Start a local Dou Dizhu WebSocket server')
    .option('--host <host>', 'Set server host', '127.0.0.1')
    .option('--port <port>', 'Set server port', '8787')
    .option('--seed <seed>', 'Set deterministic seed')
    .action(async (options: { host: string; port: string; seed?: string } & GlobalOptions) => {
      const globals = mergeOptions(options)
      const { path, config } = await loadConfig(globals)
      const port = Number(options.port)
      const seed = options.seed === undefined ? undefined : Number(options.seed)
      const server = asWebSocketUrl(`ws://${options.host}:${port}`)
      const http = asHttpUrl(server)
      config.current.server = server
      await saveConfig(path, config)
      printJson({
        ok: true,
        server,
        http,
        seed,
      })
      startGameServer({
        host: options.host,
        port,
        seed,
        frontendDist: resolve(resolveCliDist(), 'web', 'frontend'),
        log: true,
      })
    })
  
  const room = program.command('room').description('Room commands')
  
  room
    .command('join')
    .description('Join a room and wait until this player needs to act')
    .option('--name <name>', 'Player nickname')
    .option('--server <url>', 'Set server URL')
    .option('--room <roomId>', 'Set room id')
    .option('--player <playerId>', 'Reconnect as player id')
    .option('--json', 'Print JSON')
    .action(async (options: { name?: string; server?: string; room?: string; player?: string } & GlobalOptions) => {
      const globals = mergeOptions(options)
      const { path, config } = await loadConfig(globals)
      const context = resolveContext(config, { ...globals, ...options })
      const name = options.name ?? config.player.nickname ?? `player-${Date.now()}`
      const playerId = options.player ?? context.playerId
      const roomConfig = config.rooms[context.roomId]
      const response = await joinRoom({
        server: context.server,
        roomId: context.roomId,
        mode: playerId ? 'resume' : 'join',
        name: playerId ? undefined : name,
        playerId,
        afterSeq: playerId ? (roomConfig?.serverSeq ?? config.current.serverSeq) : 0,
        onAccepted: async (accepted) => {
          const acceptedPlayerId = accepted.player?.playerId
          config.current.server = context.server
          config.current.roomId = context.roomId
          if (acceptedPlayerId) config.current.playerId = acceptedPlayerId
          if (acceptedPlayerId) {
            config.rooms[context.roomId] = {
              server: context.server,
              roomId: context.roomId,
              playerId: acceptedPlayerId,
              serverSeq: roomConfig?.serverSeq ?? config.current.serverSeq,
              updatedAt: new Date().toISOString(),
            }
          }
          await saveConfig(path, config)
        },
      })
      config.player.nickname = name
      const joinedPlayerId = typeof response.joined.playerId === 'string' ? response.joined.playerId : context.playerId
      updateCurrentFromResponse(config, { ...context, playerId: joinedPlayerId }, {
        serverSeq: response.serverSeq,
        next: response.next,
      })
      updateStats(config, config.current.playerId ?? undefined, response.next)
      await saveConfig(path, config)
      printJson(response)
    })
  
  program
    .command('action')
    .description('Submit a game action and wait until this player needs to act again')
    .option('--type <type>', 'Action type: bid, play, pass')
    .option('--bid <bid>', 'Bid: pass, 1, 2, 3')
    .option('--cards <cards>', 'Comma-separated cards')
    .option('--expected-seq <seq>', 'Expected pending seq')
    .option('--idempotency-key <key>', 'Idempotency key')
    .option('--server <url>', 'Set server URL')
    .option('--room <roomId>', 'Set room id')
    .option('--player <playerId>', 'Set player id')
    .option('--json', 'Print JSON')
    .action(async (options: { type?: string; bid?: string; cards?: string; expectedSeq?: string; idempotencyKey?: string; server?: string; room?: string; player?: string } & GlobalOptions) => {
      const globals = mergeOptions(options)
      const { path, config } = await loadConfig(globals)
      const context = resolveContext(config, { ...globals, ...options })
      if (!context.playerId) throw new Error('playerId is required. Join a room first or pass --player.')
      const action = await parseActionFromInput(options, config)
      const idempotencyKey = options.idempotencyKey ?? `${context.playerId}-${action.expectedSeq}-${Date.now()}`
      const response = await submitAction({
        server: context.server,
        roomId: context.roomId,
        mode: 'resume',
        playerId: context.playerId,
        afterSeq: config.rooms[context.roomId]?.serverSeq ?? config.current.serverSeq,
        action,
        idempotencyKey,
      })
      updateCurrentFromResponse(config, context, response)
      updateStats(config, context.playerId, response.next)
      await saveConfig(path, config)
      printJson(response)
    })
  
  program
    .command('events')
    .description('Fetch room events after a seq')
    .option('--after-seq <seq>', 'Fetch events after seq')
    .option('--server <url>', 'Set server URL')
    .option('--room <roomId>', 'Set room id')
    .option('--json', 'Print JSON')
    .action(async (options: { afterSeq?: string; server?: string; room?: string } & GlobalOptions) => {
      const globals = mergeOptions(options)
      const { config } = await loadConfig(globals)
      const context = resolveContext(config, { ...globals, ...options })
      const afterSeq = Number(options.afterSeq ?? config.current.serverSeq ?? 0)
      const response = await fetchEvents({
        server: context.server,
        roomId: context.roomId,
        mode: sessionMode(context.playerId),
        playerId: context.playerId,
        afterSeq,
      })
      printJson(response)
    })
  
  program
    .command('state')
    .description('Fetch room state')
    .option('--server <url>', 'Set server URL')
    .option('--room <roomId>', 'Set room id')
    .option('--player <playerId>', 'Set player id for private state')
    .option('--json', 'Print JSON')
    .action(async (options: { server?: string; room?: string; player?: string } & GlobalOptions) => {
      const globals = mergeOptions(options)
      const { path, config } = await loadConfig(globals)
      const context = resolveContext(config, { ...globals, ...options })
      const playerId = options.player ?? context.playerId
      const response = await fetchState({
        server: context.server,
        roomId: context.roomId,
        mode: sessionMode(playerId),
        playerId,
        afterSeq: config.rooms[context.roomId]?.serverSeq ?? config.current.serverSeq,
      })
      updateCurrentFromResponse(config, context, response)
      await saveConfig(path, config)
      printJson(response)
    })
  
  const configCommand = program.command('config').description('Config commands')
  
  configCommand
    .command('show')
    .description('Show config')
    .option('--json', 'Print JSON')
    .action(async (options: GlobalOptions) => {
      const globals = mergeOptions(options)
      const { config } = await loadConfig(globals)
      printJson(config)
    })
  
  configCommand
    .command('set')
    .description('Set config value')
    .argument('<key>', 'nickname or server')
    .argument('<value>', 'value')
    .action(async (key: string, value: string) => {
      const globals = mergeOptions()
      const { path, config } = await loadConfig(globals)
      if (key === 'nickname') config.player.nickname = value
      else if (key === 'server') config.current.server = asWebSocketUrl(value)
      else throw new Error('Supported keys: nickname, server')
      await saveConfig(path, config)
      printJson({ ok: true, config })
    })
  
  configCommand
    .command('use-room')
    .description('Use a room from config')
    .argument('<roomId>', 'room id')
    .action(async (roomId: string) => {
      const globals = mergeOptions()
      const { path, config } = await loadConfig(globals)
      const roomConfig = config.rooms[roomId]
      config.current.roomId = roomId
      if (roomConfig) {
        config.current.server = roomConfig.server
        config.current.playerId = roomConfig.playerId
        config.current.serverSeq = roomConfig.serverSeq
      }
      await saveConfig(path, config)
      printJson({ ok: true, current: config.current })
    })
  
  configCommand
    .command('clear-current')
    .description('Clear current room')
    .action(async () => {
      const globals = mergeOptions()
      const { path, config } = await loadConfig(globals)
      config.current.roomId = null
      config.current.playerId = null
      config.current.serverSeq = 0
      config.current.lastEventType = null
      await saveConfig(path, config)
      printJson({ ok: true, current: config.current })
    })
  
  program
    .command('stats')
    .description('Show stats')
    .option('--json', 'Print JSON')
    .action(async (options: GlobalOptions) => {
      const globals = mergeOptions(options)
      const { config } = await loadConfig(globals)
      printJson({ ok: true, stats: config.stats })
    })
  

  return program
}
