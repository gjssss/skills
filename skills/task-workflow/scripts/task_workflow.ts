#!/usr/bin/env bun

import type { Dirent } from 'node:fs'
import { mkdir, readdir, stat } from 'node:fs/promises'
import path from 'node:path'

const namePattern = /^(\d+)\.[^.].*\.md$/

type CommandName = 'group' | 'inspect'

export interface ParsedCommand {
  kind: 'command'
  command: CommandName
  taskDir: string
  from: number | null
  number: number | null
  create: boolean
}

export interface HelpRequest {
  kind: 'help'
  exitCode: 0 | 1
}

export interface TaskInfo {
  number: number
  name: string
  path: string
}

export interface ParsedTaskEntries {
  tasks: TaskInfo[]
  invalidEntries: string[]
}

export interface InspectOptions {
  number: number | null
  create: boolean
}

export interface InspectResult {
  taskDir: string
  startNumber: number
  explicitNumber: boolean
  maxNumber: number
  validTaskCount: number
  validTasks: TaskInfo[]
  warnings: string[]
}

interface TaskDirectoryInspection {
  absoluteTaskDir: string
  entries: Dirent[]
}

interface WritableStreamLike {
  write(chunk: string): void
}

interface CliStreams {
  stdout: WritableStreamLike
  stderr: WritableStreamLike
}

export class TaskWorkflowError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TaskWorkflowError'
  }
}

export function usage(): string {
  return [
    'Usage:',
    '  bun task_workflow.ts group <task-dir> [--from <positive-integer>]',
    '  bun task_workflow.ts inspect <task-dir> [--number <positive-integer>] [--create]',
  ].join('\n')
}

export function hasBunRuntime(): boolean {
  return typeof (globalThis as typeof globalThis & { Bun?: unknown }).Bun !== 'undefined'
}

export function assertBunRuntime(): void {
  if (!hasBunRuntime()) {
    throw new TaskWorkflowError('Bun is required to run this script. Install Bun from https://bun.com/ and retry.')
  }
}

export function parsePositiveInteger(raw: string | undefined, optionName: string): number {
  if (!raw || !/^\d+$/.test(raw)) {
    throw new TaskWorkflowError(`Invalid ${optionName} value "${raw ?? ''}". Expected a positive integer.`)
  }

  const value = Number.parseInt(raw, 10)
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TaskWorkflowError(`Invalid ${optionName} value "${raw}". Expected a positive integer.`)
  }

  return value
}

export function parseArgs(argv: string[]): ParsedCommand | HelpRequest {
  const args = [...argv]
  const command = args.shift()

  if (!command || command === '--help' || command === '-h') {
    return { kind: 'help', exitCode: command ? 0 : 1 }
  }

  if (command !== 'group' && command !== 'inspect') {
    throw new TaskWorkflowError(`Unknown command "${command}".\n${usage()}`)
  }

  let taskDir: string | null = null
  let from: number | null = null
  let number: number | null = null
  let create = false

  while (args.length > 0) {
    const arg = args.shift()
    if (arg === undefined) {
      break
    }

    if (arg === '--from') {
      if (command !== 'group') {
        throw new TaskWorkflowError('--from is only supported by the group command.')
      }
      if (from !== null) {
        throw new TaskWorkflowError('Duplicate --from option.')
      }
      from = parsePositiveInteger(args.shift(), '--from')
      continue
    }

    if (arg === '--number') {
      if (command !== 'inspect') {
        throw new TaskWorkflowError('--number is only supported by the inspect command.')
      }
      if (number !== null) {
        throw new TaskWorkflowError('Duplicate --number option.')
      }
      number = parsePositiveInteger(args.shift(), '--number')
      continue
    }

    if (arg === '--create') {
      if (command !== 'inspect') {
        throw new TaskWorkflowError('--create is only supported by the inspect command.')
      }
      if (create) {
        throw new TaskWorkflowError('Duplicate --create option.')
      }
      create = true
      continue
    }

    if (arg.startsWith('--')) {
      throw new TaskWorkflowError(`Unknown option "${arg}".\n${usage()}`)
    }

    if (taskDir !== null) {
      throw new TaskWorkflowError(`Unexpected argument "${arg}".\n${usage()}`)
    }
    taskDir = arg
  }

  if (!taskDir) {
    throw new TaskWorkflowError(`Missing task directory.\n${usage()}`)
  }

  return { kind: 'command', command, taskDir, from, number, create }
}

async function inspectTaskDir(taskDir: string, { create }: { create: boolean }): Promise<TaskDirectoryInspection> {
  const absoluteTaskDir = path.resolve(taskDir)
  let taskDirStat = await stat(absoluteTaskDir).catch((error: unknown) => {
    if (hasErrorCode(error, 'ENOENT')) {
      return null
    }
    throw new TaskWorkflowError(`Cannot inspect task directory "${taskDir}": ${getErrorMessage(error)}`)
  })

  if (!taskDirStat) {
    if (!create) {
      throw new TaskWorkflowError(`Task directory does not exist: ${taskDir}`)
    }
    await mkdir(absoluteTaskDir, { recursive: true }).catch((error: unknown) => {
      throw new TaskWorkflowError(`Cannot create task directory "${taskDir}": ${getErrorMessage(error)}`)
    })
    taskDirStat = await stat(absoluteTaskDir).catch((error: unknown) => {
      throw new TaskWorkflowError(`Cannot create task directory "${taskDir}": ${getErrorMessage(error)}`)
    })
  }

  if (!taskDirStat.isDirectory()) {
    throw new TaskWorkflowError(`Task path is not a directory: ${taskDir}`)
  }

  const entries = await readdir(absoluteTaskDir, { withFileTypes: true }).catch((error: unknown) => {
    throw new TaskWorkflowError(`Cannot read task directory "${taskDir}": ${getErrorMessage(error)}`)
  })
  return { absoluteTaskDir, entries }
}

export function parseTaskEntries(absoluteTaskDir: string, entries: Dirent[]): ParsedTaskEntries {
  const tasks: TaskInfo[] = []
  const invalidEntries: string[] = []

  for (const entry of entries) {
    const entryPath = path.join(absoluteTaskDir, entry.name)

    if (!entry.isFile()) {
      invalidEntries.push(`${entryPath} is not a regular file`)
      continue
    }

    if (!entry.name.endsWith('.md')) {
      invalidEntries.push(`${entryPath} is not a .md file`)
      continue
    }

    const match = namePattern.exec(entry.name)
    if (!match) {
      invalidEntries.push(`${entryPath} does not match <number>.<task_name>.md`)
      continue
    }

    const taskNumber = Number.parseInt(match[1] ?? '', 10)
    if (!Number.isSafeInteger(taskNumber) || taskNumber < 1) {
      invalidEntries.push(`${entryPath} has an invalid task number`)
      continue
    }

    tasks.push({ number: taskNumber, name: entry.name, path: entryPath })
  }

  return { tasks, invalidEntries }
}

export async function groupTasks(taskDir: string, from: number | null = null): Promise<string[][]> {
  const { absoluteTaskDir, entries } = await inspectTaskDir(taskDir, { create: false })

  if (entries.length === 0) {
    throw new TaskWorkflowError(`Task directory is empty: ${absoluteTaskDir}`)
  }

  const { tasks, invalidEntries } = parseTaskEntries(absoluteTaskDir, entries)
  if (invalidEntries.length > 0) {
    throw new TaskWorkflowError(`Invalid task folder:\n${invalidEntries.map((item) => `- ${item}`).join('\n')}`)
  }

  const filteredTasks = from === null
    ? tasks
    : tasks.filter((task) => task.number >= from)

  if (filteredTasks.length === 0) {
    throw new TaskWorkflowError(`No task files found${from === null ? '' : ` with number >= ${from}`}.`)
  }

  filteredTasks.sort(compareTasks)

  const groups: string[][] = []
  let currentNumber: number | null = null
  let currentGroup: string[] = []

  for (const task of filteredTasks) {
    if (task.number !== currentNumber) {
      currentNumber = task.number
      currentGroup = []
      groups.push(currentGroup)
    }
    currentGroup.push(task.path)
  }

  return groups
}

export async function inspectForGeneration(taskDir: string, { number, create }: InspectOptions): Promise<InspectResult> {
  const { absoluteTaskDir, entries } = await inspectTaskDir(taskDir, { create })
  const { tasks, invalidEntries } = parseTaskEntries(absoluteTaskDir, entries)

  tasks.sort(compareTasks)
  const maxNumber = tasks.reduce((max, task) => Math.max(max, task.number), 0)
  const startNumber = number ?? (maxNumber > 0 ? maxNumber + 1 : 1)

  return {
    taskDir: absoluteTaskDir,
    startNumber,
    explicitNumber: number !== null,
    maxNumber,
    validTaskCount: tasks.length,
    validTasks: tasks,
    warnings: invalidEntries,
  }
}

export async function main(argv = process.argv.slice(2), streams: CliStreams = process): Promise<number> {
  try {
    assertBunRuntime()
    const parsed = parseArgs(argv)

    if (parsed.kind === 'help') {
      streams.stdout.write(`${usage()}\n`)
      return parsed.exitCode
    }

    if (parsed.command === 'group') {
      const groups = await groupTasks(parsed.taskDir, parsed.from)
      streams.stdout.write(`${JSON.stringify(groups, null, 2)}\n`)
      return 0
    }

    const inspection = await inspectForGeneration(parsed.taskDir, {
      number: parsed.number,
      create: parsed.create,
    })
    streams.stdout.write(`${JSON.stringify(inspection, null, 2)}\n`)
    return 0
  } catch (error) {
    streams.stderr.write(`ERROR: ${getErrorMessage(error)}\n`)
    return 1
  }
}

export function compareTasks(a: TaskInfo, b: TaskInfo): number {
  if (a.number !== b.number) {
    return a.number - b.number
  }
  return a.name.localeCompare(b.name)
}

function hasErrorCode(error: unknown, code: string): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && (error as { code?: unknown }).code === code
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

if (import.meta.main) {
  process.exitCode = await main()
}
