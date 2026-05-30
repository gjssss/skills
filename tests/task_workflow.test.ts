import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  groupTasks,
  inspectForGeneration,
  parseArgs,
  TaskWorkflowError,
} from '../skills/task-workflow/scripts/task_workflow.ts'

let tempDir: string

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), 'task-workflow-'))
})

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true })
})

describe('parseArgs', () => {
  it('parses inspect options', () => {
    expect(parseArgs(['inspect', 'tasks', '--number', '3', '--create'])).toEqual({
      kind: 'command',
      command: 'inspect',
      taskDir: 'tasks',
      from: null,
      number: 3,
      create: true,
    })
  })

  it('rejects non-positive numeric options', () => {
    expect(() => parseArgs(['group', 'tasks', '--from', '0'])).toThrow(TaskWorkflowError)
  })
})

describe('inspectForGeneration', () => {
  it('creates a missing task directory when requested', async () => {
    const taskDir = path.join(tempDir, 'new-tasks')

    const result = await inspectForGeneration(taskDir, { number: 5, create: true })
    const taskDirStat = await stat(taskDir)

    expect(taskDirStat.isDirectory()).toBe(true)
    expect(result).toMatchObject({
      taskDir,
      startNumber: 5,
      explicitNumber: true,
      maxNumber: 0,
      validTaskCount: 0,
      validTasks: [],
      warnings: [],
    })
  })

  it('calculates the next task number and reports warnings without failing', async () => {
    await writeFile(path.join(tempDir, '1.setup.md'), 'setup')
    await writeFile(path.join(tempDir, '3.finish.md'), 'finish')
    await writeFile(path.join(tempDir, 'notes.txt'), 'ignore for inspect')

    const result = await inspectForGeneration(tempDir, { number: null, create: false })

    expect(result.startNumber).toBe(4)
    expect(result.maxNumber).toBe(3)
    expect(result.validTaskCount).toBe(2)
    expect(result.validTasks.map((task) => task.name)).toEqual(['1.setup.md', '3.finish.md'])
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('notes.txt')
  })
})

describe('groupTasks', () => {
  it('groups task paths by numeric prefix and sorts each group by file name', async () => {
    await writeFile(path.join(tempDir, '2.beta.md'), 'beta')
    await writeFile(path.join(tempDir, '1.setup.md'), 'setup')
    await writeFile(path.join(tempDir, '2.alpha.md'), 'alpha')

    await expect(groupTasks(tempDir)).resolves.toEqual([
      [path.join(tempDir, '1.setup.md')],
      [path.join(tempDir, '2.alpha.md'), path.join(tempDir, '2.beta.md')],
    ])
  })

  it('filters groups by the requested start number', async () => {
    await writeFile(path.join(tempDir, '1.setup.md'), 'setup')
    await writeFile(path.join(tempDir, '2.build.md'), 'build')
    await writeFile(path.join(tempDir, '3.verify.md'), 'verify')

    await expect(groupTasks(tempDir, 2)).resolves.toEqual([
      [path.join(tempDir, '2.build.md')],
      [path.join(tempDir, '3.verify.md')],
    ])
  })

  it('fails when a first-level entry is not a valid task markdown file', async () => {
    await writeFile(path.join(tempDir, '1.valid.md'), 'valid')
    await writeFile(path.join(tempDir, 'notes.txt'), 'invalid')
    await mkdir(path.join(tempDir, 'nested'))

    await expect(groupTasks(tempDir)).rejects.toThrow('Invalid task folder')
  })
})
