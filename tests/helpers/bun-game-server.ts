import { spawn, type ChildProcess } from 'node:child_process'
import { createServer } from 'node:net'
import { fileURLToPath } from 'node:url'

const repoRoot = fileURLToPath(new URL('../..', import.meta.url))
const fixturePath = fileURLToPath(new URL('../fixtures/game-server.ts', import.meta.url))

export interface BunGameServer {
  child: ChildProcess
  port: number
  httpUrl: string
  wsUrl: string
  stop(): Promise<void>
}

async function freePort() {
  const server = createServer()
  await new Promise<void>((resolvePromise, rejectPromise) => {
    server.once('error', rejectPromise)
    server.listen(0, '127.0.0.1', resolvePromise)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Unable to allocate a test port')
  await new Promise<void>((resolvePromise, rejectPromise) => {
    server.close((error) => error ? rejectPromise(error) : resolvePromise())
  })
  return address.port
}

export async function startBunGameServer(options: { seed?: number; dataFile?: string } = {}): Promise<BunGameServer> {
  const requestedPort = await freePort()
  const arguments_ = [fixturePath, `--port=${requestedPort}`]
  if (options.seed !== undefined) arguments_.push(`--seed=${options.seed}`)
  if (options.dataFile !== undefined) arguments_.push(`--data-file=${options.dataFile}`)

  const child = spawn('bun', arguments_, {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let stdout = ''
  let stderr = ''
  child.stdout?.setEncoding('utf8')
  child.stderr?.setEncoding('utf8')
  child.stdout?.on('data', (chunk: string) => { stdout += chunk })
  child.stderr?.on('data', (chunk: string) => { stderr += chunk })

  const port = await new Promise<number>((resolvePromise, rejectPromise) => {
    const timeout = setTimeout(() => {
      child.kill('SIGKILL')
      rejectPromise(new Error(`Timed out starting Bun game server. stdout=${stdout} stderr=${stderr}`))
    }, 10_000)
    const inspect = () => {
      for (const line of stdout.split('\n')) {
        if (!line.trim()) continue
        try {
          const parsed = JSON.parse(line) as { type?: string; port?: number }
          if (parsed.type === 'ready' && typeof parsed.port === 'number') {
            clearTimeout(timeout)
            resolvePromise(parsed.port)
            return
          }
        }
        catch {}
      }
    }
    child.stdout?.on('data', inspect)
    child.once('error', (error) => {
      clearTimeout(timeout)
      rejectPromise(error)
    })
    child.once('exit', (code, signal) => {
      clearTimeout(timeout)
      rejectPromise(new Error(`Bun game server exited before ready (code=${code}, signal=${signal}). stderr=${stderr}`))
    })
  })

  return {
    child,
    port,
    httpUrl: `http://127.0.0.1:${port}`,
    wsUrl: `ws://127.0.0.1:${port}/ws`,
    async stop() {
      if (child.exitCode !== null || child.signalCode !== null) return
      const exited = new Promise<void>((resolvePromise) => child.once('exit', () => resolvePromise()))
      child.kill('SIGTERM')
      const timeout = new Promise<'timeout'>((resolvePromise) => {
        setTimeout(() => resolvePromise('timeout'), 3_000).unref()
      })
      if (await Promise.race([exited.then(() => 'exited' as const), timeout]) === 'timeout') {
        child.kill('SIGKILL')
        await exited
      }
    },
  }
}
