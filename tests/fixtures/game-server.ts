import { startGameServer } from '../../packages/game/backend/src/server'

function option(name: string) {
  const prefix = `--${name}=`
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length)
}

const seedText = option('seed')
const portText = option('port')
const server = startGameServer({
  host: '127.0.0.1',
  port: portText === undefined ? 8787 : Number(portText),
  seed: seedText === undefined ? undefined : Number(seedText),
  dataFile: option('data-file') ?? ':memory:',
  log: false,
})

process.stdout.write(`${JSON.stringify({ type: 'ready', port: server.port })}\n`)

let stopping = false
async function stop() {
  if (stopping) return
  stopping = true
  await server.stop(true)
  process.exit(0)
}

process.once('SIGINT', stop)
process.once('SIGTERM', stop)
