#!/usr/bin/env node

import { mkdir, readdir, stat } from 'node:fs/promises'
import path from 'node:path'

const namePattern = /^(\d+)\.[^.].*\.md$/

function usage() {
  return [
    'Usage:',
    '  node task_workflow.mjs group <task-dir> [--from <positive-integer>]',
    '  node task_workflow.mjs inspect <task-dir> [--number <positive-integer>] [--create]',
  ].join('\n')
}

function fail(message) {
  console.error(`ERROR: ${message}`)
  process.exit(1)
}

function parsePositiveInteger(raw, optionName) {
  if (!raw || !/^\d+$/.test(raw)) {
    fail(`Invalid ${optionName} value "${raw ?? ''}". Expected a positive integer.`)
  }

  const value = Number.parseInt(raw, 10)
  if (!Number.isSafeInteger(value) || value < 1) {
    fail(`Invalid ${optionName} value "${raw}". Expected a positive integer.`)
  }

  return value
}

function parseArgs(argv) {
  const args = [...argv]
  const command = args.shift()

  if (!command || command === '--help' || command === '-h') {
    console.log(usage())
    process.exit(command ? 0 : 1)
  }

  if (command !== 'group' && command !== 'inspect') {
    fail(`Unknown command "${command}".\n${usage()}`)
  }

  let taskDir = null
  let from = null
  let number = null
  let create = false

  while (args.length > 0) {
    const arg = args.shift()

    if (arg === '--from') {
      if (command !== 'group') {
        fail('--from is only supported by the group command.')
      }
      if (from !== null) {
        fail('Duplicate --from option.')
      }
      from = parsePositiveInteger(args.shift(), '--from')
      continue
    }

    if (arg === '--number') {
      if (command !== 'inspect') {
        fail('--number is only supported by the inspect command.')
      }
      if (number !== null) {
        fail('Duplicate --number option.')
      }
      number = parsePositiveInteger(args.shift(), '--number')
      continue
    }

    if (arg === '--create') {
      if (command !== 'inspect') {
        fail('--create is only supported by the inspect command.')
      }
      if (create) {
        fail('Duplicate --create option.')
      }
      create = true
      continue
    }

    if (arg.startsWith('--')) {
      fail(`Unknown option "${arg}".\n${usage()}`)
    }

    if (taskDir !== null) {
      fail(`Unexpected argument "${arg}".\n${usage()}`)
    }
    taskDir = arg
  }

  if (!taskDir) {
    fail(`Missing task directory.\n${usage()}`)
  }

  return { command, taskDir, from, number, create }
}

async function inspectTaskDir(taskDir, { create }) {
  const absoluteTaskDir = path.resolve(taskDir)
  let taskDirStat = await stat(absoluteTaskDir).catch((error) => {
    if (error && error.code === 'ENOENT') {
      return null
    }
    fail(`Cannot inspect task directory "${taskDir}": ${error.message}`)
  })

  if (!taskDirStat) {
    if (!create) {
      fail(`Task directory does not exist: ${taskDir}`)
    }
    await mkdir(absoluteTaskDir, { recursive: true }).catch((error) => {
      fail(`Cannot create task directory "${taskDir}": ${error.message}`)
    })
    taskDirStat = await stat(absoluteTaskDir).catch((error) => {
      fail(`Cannot create task directory "${taskDir}": ${error.message}`)
    })
  }

  if (!taskDirStat.isDirectory()) {
    fail(`Task path is not a directory: ${taskDir}`)
  }

  const entries = await readdir(absoluteTaskDir, { withFileTypes: true }).catch((error) => {
    fail(`Cannot read task directory "${taskDir}": ${error.message}`)
  })
  return { absoluteTaskDir, entries }
}

function parseTaskEntries(absoluteTaskDir, entries) {
  const tasks = []
  const invalidEntries = []

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

    const number = Number.parseInt(match[1], 10)
    if (!Number.isSafeInteger(number) || number < 1) {
      invalidEntries.push(`${entryPath} has an invalid task number`)
      continue
    }

    tasks.push({ number, name: entry.name, path: entryPath })
  }

  return { tasks, invalidEntries }
}

async function groupTasks(taskDir, from) {
  const { absoluteTaskDir, entries } = await inspectTaskDir(taskDir, { create: false })

  if (entries.length === 0) {
    fail(`Task directory is empty: ${absoluteTaskDir}`)
  }

  const { tasks, invalidEntries } = parseTaskEntries(absoluteTaskDir, entries)
  if (invalidEntries.length > 0) {
    fail(`Invalid task folder:\n${invalidEntries.map((item) => `- ${item}`).join('\n')}`)
  }

  const filteredTasks = from === null
    ? tasks
    : tasks.filter((task) => task.number >= from)

  if (filteredTasks.length === 0) {
    fail(`No task files found${from === null ? '' : ` with number >= ${from}`}.`)
  }

  filteredTasks.sort(compareTasks)

  const groups = []
  let currentNumber = null
  let currentGroup = null

  for (const task of filteredTasks) {
    if (task.number !== currentNumber) {
      currentNumber = task.number
      currentGroup = []
      groups.push(currentGroup)
    }
    currentGroup.push(task.path)
  }

  console.log(JSON.stringify(groups, null, 2))
}

async function inspectForGeneration(taskDir, { number, create }) {
  const { absoluteTaskDir, entries } = await inspectTaskDir(taskDir, { create })
  const { tasks, invalidEntries } = parseTaskEntries(absoluteTaskDir, entries)

  tasks.sort(compareTasks)
  const maxNumber = tasks.reduce((max, task) => Math.max(max, task.number), 0)
  const startNumber = number ?? (maxNumber > 0 ? maxNumber + 1 : 1)

  console.log(JSON.stringify({
    taskDir: absoluteTaskDir,
    startNumber,
    explicitNumber: number !== null,
    maxNumber,
    validTaskCount: tasks.length,
    validTasks: tasks,
    warnings: invalidEntries,
  }, null, 2))
}

function compareTasks(a, b) {
  if (a.number !== b.number) {
    return a.number - b.number
  }
  return a.name.localeCompare(b.name)
}

const { command, taskDir, from, number, create } = parseArgs(process.argv.slice(2))

if (command === 'group') {
  await groupTasks(taskDir, from)
} else {
  await inspectForGeneration(taskDir, { number, create })
}
