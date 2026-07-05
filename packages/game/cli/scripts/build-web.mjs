import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { cp, mkdir, rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export function runCommand(command, args, cwd) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit' })

    child.on('error', rejectPromise)
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise()
      } else {
        rejectPromise(new Error(`${command} ${args.join(' ')} exited with ${code}`))
      }
    })
  })
}

export function findRepoRoot(startDir) {
  let current = startDir
  for (let i = 0; i < 8; i += 1) {
    if (
      existsSync(resolve(current, 'bun.lock'))
      && existsSync(resolve(current, 'package.json'))
    ) {
      return current
    }
    const parent = resolve(current, '..')
    if (parent === current) break
    current = parent
  }
  return startDir
}

export function createBuildSteps(repoRoot) {
  return [
    ['bun', ['run', '--cwd', 'packages/game/core', 'build']],
    ['bun', ['run', '--cwd', 'packages/game/frontend', 'build']],
    ['bun', ['run', '--cwd', 'packages/game/backend', 'build']],
    ['bun', ['run', '--cwd', 'packages/game/cli', 'build:cli']],
  ].map(([command, args]) => ({ command, args, cwd: repoRoot }))
}

export async function buildWeb({ startDir = dirname(fileURLToPath(import.meta.url)) } = {}) {
  const cliDir = resolve(startDir, '..')
  const repoRoot = findRepoRoot(cliDir)

  const frontendDir = resolve(repoRoot, 'packages', 'game', 'frontend')
  const backendDir = resolve(repoRoot, 'packages', 'game', 'backend')
  const coreDir = resolve(repoRoot, 'packages', 'game', 'core')
  const cliDist = resolve(cliDir, 'dist')
  const webDist = resolve(cliDist, 'web')
  const coreDist = resolve(cliDist, 'core')

  for (const step of createBuildSteps(repoRoot)) {
    await runCommand(step.command, step.args, step.cwd)
  }

  await rm(webDist, { recursive: true, force: true })
  await mkdir(resolve(webDist, 'frontend'), { recursive: true })
  await mkdir(resolve(webDist, 'backend'), { recursive: true })

  await cp(resolve(frontendDir, 'dist'), resolve(webDist, 'frontend'), {
    recursive: true,
  })
  await cp(resolve(backendDir, 'dist'), resolve(webDist, 'backend'), {
    recursive: true,
  })

  await rm(coreDist, { recursive: true, force: true })
  await mkdir(resolve(coreDist, 'dist'), { recursive: true })
  await cp(resolve(coreDir, 'dist'), resolve(coreDist, 'dist'), {
    recursive: true,
  })

  console.log(`[build] bundled web assets into ${webDist}`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  buildWeb().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
