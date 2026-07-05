import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createBuildSteps,
  findRepoRoot,
} from '../packages/game/cli/scripts/build-web.mjs'

let tempDir: string

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), 'game-build-web-'))
})

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true })
})

describe('findRepoRoot', () => {
  it('finds the Bun workspace root from a nested package script directory', async () => {
    const repoRoot = path.join(tempDir, 'repo')
    const scriptDir = path.join(repoRoot, 'packages', 'game', 'cli', 'scripts')

    await mkdir(scriptDir, { recursive: true })
    await writeFile(path.join(repoRoot, 'bun.lock'), '')
    await writeFile(path.join(repoRoot, 'package.json'), '{"name":"repo"}')

    expect(findRepoRoot(scriptDir)).toBe(repoRoot)
  })
})

describe('createBuildSteps', () => {
  it('uses Bun and builds game packages in dependency order', () => {
    expect(createBuildSteps('/repo')).toEqual([
      {
        command: 'bun',
        args: ['run', '--cwd', 'packages/game/core', 'build'],
        cwd: '/repo',
      },
      {
        command: 'bun',
        args: ['run', '--cwd', 'packages/game/frontend', 'build'],
        cwd: '/repo',
      },
      {
        command: 'bun',
        args: ['run', '--cwd', 'packages/game/backend', 'build'],
        cwd: '/repo',
      },
      {
        command: 'bun',
        args: ['run', '--cwd', 'packages/game/cli', 'build:cli'],
        cwd: '/repo',
      },
    ])
  })
})
