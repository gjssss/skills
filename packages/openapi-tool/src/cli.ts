import { pathToFileURL } from 'node:url'
import { cac } from 'cac'
import { getApi, parseIndex } from './commands/get'
import { listApis, parseListOptions } from './commands/list'
import { getExitCode, OpenapiToolError, toErrorPayload } from './output/error'
import { formatJson } from './output/success'
import { resolveSource } from './core/source'

interface CliIO {
  stdout: (text: string) => void
  stderr: (text: string) => void
}

const defaultIO: CliIO = {
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
}

export async function runCli(args = process.argv.slice(2), io = defaultIO): Promise<number> {
  try {
    const cli = createCli()
    cli.parse(['bun', 'openapi-tool', ...args], { run: false })

    const source = await resolveSource(cli.options)
    let payload: unknown

    if (cli.matchedCommandName === 'list') {
      payload = await listApis(source, parseListOptions(cli.options))
    }
    else if (cli.matchedCommandName === 'get') {
      payload = await getApi(source, parseIndex(cli.args[0]))
    }
    else {
      throw new OpenapiToolError('INVALID_ARGUMENT', 'Command must be one of: list, get')
    }

    io.stdout(formatJson(payload))
    return 0
  }
  catch (error) {
    io.stderr(formatJson(toErrorPayload(error)))
    return getExitCode(error)
  }
}

function createCli() {
  const cli = cac('openapi-tool')

  const addSourceOptions = <T extends { option: (rawName: string, description: string) => T }>(command: T) => command
    .option('-f, --file <path>', 'Use local OpenAPI document')
    .option('-r, --remote <url>', 'Use remote OpenAPI document URL')

  addSourceOptions(
    cli.command('list', 'List non-deprecated APIs')
      .option('-k, --keyword <keyword>', 'Filter APIs by keyword')
      .option('--page <number>', 'Page number, starts from 0')
      .option('--size <number>', 'Page size'),
  )

  addSourceOptions(
    cli.command('get <index>', 'Get API details by stable index'),
  )

  cli.help()

  return cli
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const exitCode = await runCli()
  process.exitCode = exitCode
}
