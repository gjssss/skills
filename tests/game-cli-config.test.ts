import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  defaultConfig,
  loadConfig,
  migrateConfig,
  redactedConfig,
  saveConfig,
} from '../packages/game/cli/src/config'
import { resolveContext } from '../packages/game/cli/src/ws'

const tempDirectories: string[] = []

afterEach(async () => {
  await Promise.all(tempDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe('game CLI resume key configuration', () => {
  it('migrates v1 while preserving server, room progress, and stats but clearing unsafe player bindings', () => {
    const migrated = migrateConfig({
      version: 1,
      player: { nickname: 'agent-a' },
      current: {
        server: 'ws://127.0.0.1:8787/ws',
        roomId: 'legacy-room',
        playerId: 'p1',
        serverSeq: 19,
        lastEventType: 'turn.request',
      },
      rooms: {
        'legacy-room': {
          server: 'ws://127.0.0.1:8787/ws',
          roomId: 'legacy-room',
          playerId: 'p1',
          serverSeq: 19,
          updatedAt: '2026-07-10T00:00:00.000Z',
        },
      },
      stats: {
        games: 4,
        wins: 3,
        losses: 1,
        landlordGames: 2,
        farmerGames: 2,
        lastGameAt: '2026-07-10T00:00:00.000Z',
      },
    })

    expect(migrated.version).toBe(2)
    expect(migrated.player.nickname).toBe('agent-a')
    expect(migrated.current).toMatchObject({
      server: 'ws://127.0.0.1:8787/ws',
      roomId: 'legacy-room',
      playerId: null,
      serverSeq: 19,
    })
    expect(migrated.rooms['legacy-room']).toMatchObject({
      roomId: 'legacy-room',
      playerId: null,
      resumeKey: null,
      serverSeq: 19,
    })
    expect(migrated.stats).toMatchObject({ games: 4, wins: 3, losses: 1 })
  })

  it('writes config files as 0600 and loads a v2 resume key', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'djd-game-config-'))
    tempDirectories.push(directory)
    const configFile = path.join(directory, 'config.json')
    const config = defaultConfig()
    config.rooms.room_a = {
      server: 'ws://127.0.0.1:8787/ws',
      roomId: 'room_a',
      playerId: 'p1',
      resumeKey: 'private-resume-key',
      serverSeq: 7,
      updatedAt: '2026-07-10T00:00:00.000Z',
    }

    await saveConfig(configFile, config)
    expect((await stat(configFile)).mode & 0o777).toBe(0o600)
    expect(await readFile(configFile, 'utf8')).toContain('private-resume-key')
    expect((await loadConfig({ config: configFile })).config.rooms.room_a?.resumeKey).toBe('private-resume-key')
  })

  it('redacts config output and never reuses one player key for another player id', () => {
    const config = defaultConfig()
    config.current.server = 'ws://127.0.0.1:8787/ws'
    config.current.roomId = 'room_a'
    config.current.playerId = 'p1'
    config.rooms.room_a = {
      server: config.current.server,
      roomId: 'room_a',
      playerId: 'p1',
      resumeKey: 'private-resume-key',
      serverSeq: 7,
      updatedAt: '2026-07-10T00:00:00.000Z',
    }

    const shown = redactedConfig(config)
    expect(shown.rooms.room_a?.resumeKey).toBe('[redacted]')
    expect(JSON.stringify(shown)).not.toContain('private-resume-key')
    expect(resolveContext(config, {}).resumeKey).toBe('private-resume-key')
    expect(resolveContext(config, { player: 'p2' }).resumeKey).toBeUndefined()
  })
})
