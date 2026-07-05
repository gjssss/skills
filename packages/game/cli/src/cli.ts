import process from 'node:process'
import { createProgram } from './commands'

const program = createProgram(__APP_VERSION__)

program.parseAsync(process.argv).catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
