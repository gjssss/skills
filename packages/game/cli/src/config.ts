import { chmod, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import type { CliConfig, GlobalOptions, LegacyCliConfigV1 } from './types'

export function defaultConfig(): CliConfig {
  return {
    version: 2,
    player: {
      nickname: null,
    },
    current: {
      server: null,
      roomId: null,
      playerId: null,
      serverSeq: 0,
      lastEventType: null,
    },
    rooms: {},
    stats: {
      games: 0,
      wins: 0,
      losses: 0,
      landlordGames: 0,
      farmerGames: 0,
      lastGameAt: null,
    },
  }
}

export function configPath(options: GlobalOptions = {}) {
  return resolve(process.cwd(), options.config ?? 'config.json')
}

export async function loadConfig(options: GlobalOptions = {}) {
  const path = configPath(options)
  try {
    const parsed = JSON.parse(await readFile(path, 'utf-8')) as CliConfig | LegacyCliConfigV1
    const config = migrateConfig(parsed)
    if (parsed.version !== 2) await saveConfig(path, config)
    else await chmod(path, 0o600)
    return { path, config }
  }
  catch (error) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code !== 'ENOENT') {
      throw error
    }
    const config = defaultConfig()
    await saveConfig(path, config)
    return { path, config }
  }
}

export async function saveConfig(path: string, config: CliConfig) {
  await writeFile(path, `${JSON.stringify(config, null, 2)}\n`, 'utf-8')
  await chmod(path, 0o600)
}

export function migrateConfig(input: CliConfig | LegacyCliConfigV1): CliConfig {
  const base = defaultConfig()
  if (input.version === 2) {
    return {
      ...base,
      ...input,
      player: { ...base.player, ...input.player },
      current: { ...base.current, ...input.current },
      stats: { ...base.stats, ...input.stats },
      rooms: Object.fromEntries(Object.entries(input.rooms ?? {}).map(([roomId, room]) => [roomId, {
        server: room.server,
        roomId: room.roomId,
        playerId: room.playerId ?? null,
        resumeKey: room.resumeKey ?? null,
        serverSeq: room.serverSeq ?? 0,
        updatedAt: room.updatedAt ?? new Date(0).toISOString(),
      }])),
    }
  }

  return {
    ...base,
    player: { ...base.player, ...input.player },
    current: {
      ...base.current,
      ...input.current,
      playerId: null,
    },
    stats: { ...base.stats, ...input.stats },
    rooms: Object.fromEntries(Object.entries(input.rooms ?? {}).map(([roomId, room]) => [roomId, {
      server: room.server,
      roomId: room.roomId,
      playerId: null,
      resumeKey: null,
      serverSeq: room.serverSeq ?? 0,
      updatedAt: room.updatedAt ?? new Date(0).toISOString(),
    }])),
  }
}

export function redactedConfig(config: CliConfig): CliConfig {
  return {
    ...structuredClone(config),
    rooms: Object.fromEntries(Object.entries(config.rooms).map(([roomId, room]) => [roomId, {
      ...room,
      resumeKey: room.resumeKey ? '[redacted]' : null,
    }])),
  }
}

export function responseSeq(response: { serverSeq?: number; snapshotSeq?: number; next?: { seq?: number; type?: string } }) {
  return response.next?.seq ?? response.serverSeq ?? response.snapshotSeq
}

export function updateCurrentFromResponse(config: CliConfig, context: { server: string; roomId: string; playerId?: string }, response: { serverSeq?: number; snapshotSeq?: number; next?: { seq?: number; type?: string }; joined?: { playerId?: string } }) {
  const playerId = context.playerId ?? response.joined?.playerId
  const seq = responseSeq(response)
  config.current.server = context.server
  config.current.roomId = context.roomId
  if (playerId) config.current.playerId = playerId
  if (seq !== undefined) config.current.serverSeq = seq
  if (response.next?.type) config.current.lastEventType = response.next.type

  if (playerId) {
    config.rooms[context.roomId] = {
      server: context.server,
      roomId: context.roomId,
      playerId,
      resumeKey: config.rooms[context.roomId]?.resumeKey ?? null,
      serverSeq: config.current.serverSeq,
      updatedAt: new Date().toISOString(),
    }
  }
}

export function updateStats(config: CliConfig, playerId: string | undefined, next: unknown) {
  if (!next || typeof next !== 'object') return
  const event = next as { type?: string; finished?: { winner?: string; landlordId?: string; farmerIds?: string[] } }
  if (event.type !== 'game.finished' || !event.finished || !playerId) return
  const isLandlord = event.finished.landlordId === playerId
  const won = event.finished.winner === 'landlord'
    ? isLandlord
    : event.finished.farmerIds?.includes(playerId) === true
  config.stats.games += 1
  config.stats.wins += won ? 1 : 0
  config.stats.losses += won ? 0 : 1
  config.stats.landlordGames += isLandlord ? 1 : 0
  config.stats.farmerGames += isLandlord ? 0 : 1
  config.stats.lastGameAt = new Date().toISOString()
}
