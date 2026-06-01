import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { loadDocument } from '../src/core/parse-document'
import { resolveRefs } from '../src/core/resolve-ref'
import type { SourceInput } from '../src/types'

const packageRoot = fileURLToPath(new URL('..', import.meta.url))
const cliEntry = 'src/cli.ts'
const servers: Array<{ close: (callback?: (error?: Error) => void) => void }> = []

interface CliResult {
  code: number | null
  stdout: string
  stderr: string
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => {
    server.close((error?: Error) => {
      if (error) {
        reject(error)
      }
      else {
        resolve()
      }
    })
  })))
})

describe('openapi-tool cli', () => {
  it('lists non-deprecated APIs with stable indexes', async () => {
    const result = await runCli(['list', '--file', 'fixtures/basic.openapi.yaml', '--size', '10'])

    expect(result.stderr).toBe('')
    expect(result.code).toBe(0)

    const payload = parseStdout(result)
    expect(payload.pagination.total).toBe(3)
    expect(payload.items).toEqual([
      {
        index: 0,
        name: 'Create user',
        path: '/users',
        method: 'post',
        pathWithMethod: 'POST /users',
        tags: ['User'],
        operationId: 'createUser',
      },
      {
        index: 1,
        name: 'List users',
        path: '/users',
        method: 'get',
        pathWithMethod: 'GET /users',
        tags: ['User'],
        operationId: 'listUsers',
      },
      {
        index: 2,
        name: 'getOrders',
        path: '/orders',
        method: 'get',
        pathWithMethod: 'GET /orders',
        tags: ['Order'],
        operationId: 'getOrders',
      },
    ])
  })

  it('filters keywords as OR with case-sensitive substring matching', async () => {
    const result = await runCli([
      'list',
      '--file',
      'fixtures/basic.openapi.yaml',
      '--keyword',
      'Create',
      '--keyword',
      'Order',
      '--size',
      '10',
    ])

    expect(result.code).toBe(0)

    const payload = parseStdout(result)
    expect(payload.items.map((item: { index: number }) => item.index)).toEqual([0, 2])

    const caseSensitive = await runCli([
      'list',
      '--file',
      'fixtures/basic.openapi.yaml',
      '--keyword',
      'ORDER',
      '--size',
      '10',
    ])

    expect(parseStdout(caseSensitive).items).toEqual([])

    const literalRegex = await runCli([
      'list',
      '--file',
      'fixtures/basic.openapi.yaml',
      '--keyword',
      '.*',
      '--size',
      '10',
    ])

    expect(parseStdout(literalRegex).items).toEqual([])
  })

  it('gets details with resolved refs and filters deprecated nested content', async () => {
    const result = await runCli(['get', '0', '--file', 'fixtures/basic.openapi.yaml'])

    expect(result.stderr).toBe('')
    expect(result.code).toBe(0)

    const payload = parseStdout(result)
    expect(payload.api.index).toBe(0)
    expect(payload.api.name).toBe('Create user')
    expect(payload.api.parameters.map((parameter: { name: string }) => parameter.name)).toEqual(['tenantId', 'verbose'])
    expect(payload.api.extensions).toEqual({ 'x-test-extension': 'enabled' })

    const requestSchema = payload.api.requestBody.content['application/json'].schema
    expect(requestSchema.properties).toHaveProperty('name')
    expect(requestSchema.properties).not.toHaveProperty('oldField')
    expect(requestSchema.required).toEqual(['name'])

    const responseSchema = payload.api.responses['201'].content['application/json'].schema
    expect(responseSchema.properties).toHaveProperty('id')
    expect(responseSchema.properties).not.toHaveProperty('oldField')
    expect(responseSchema.required).toEqual(['id'])
  })

  it('returns structured errors for invalid indexes', async () => {
    const result = await runCli(['get', '99', '--file', 'fixtures/basic.openapi.yaml'])

    expect(result.code).toBe(1)
    expect(result.stdout).toBe('')

    const payload = JSON.parse(result.stderr)
    expect(payload.error.code).toBe('INDEX_NOT_FOUND')
    expect(payload.error.details.total).toBe(3)
  })

  it('loads OpenAPI documents from a remote URL with GET', async () => {
    const fixture = await readFile(new URL('../fixtures/basic.openapi.yaml', import.meta.url), 'utf8')
    const server = createServer((request, response) => {
      if (request.method !== 'GET') {
        response.writeHead(405).end()
        return
      }

      response.writeHead(200, { 'content-type': 'application/yaml' }).end(fixture)
    })

    servers.push(server)
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))

    const address = server.address()
    if (address === null || typeof address === 'string') {
      throw new Error('Expected TCP server address')
    }

    const result = await runCli([
      'list',
      '--remote',
      `http://127.0.0.1:${address.port}/openapi.yaml`,
      '--size',
      '1',
    ])

    expect(result.code).toBe(0)
    const payload = parseStdout(result)
    expect(payload.source.type).toBe('remote')
    expect(payload.pagination.total).toBe(3)
    expect(payload.items).toHaveLength(1)
  })

  it('resolves external remote refs relative to the remote document URL', async () => {
    const mainFixture = await readFile(new URL('../fixtures/basic.openapi.yaml', import.meta.url), 'utf8')
    const externalFixture = await readFile(new URL('../fixtures/external-schemas.yaml', import.meta.url), 'utf8')
    const server = createServer((request, response) => {
      if (request.method !== 'GET') {
        response.writeHead(405).end()
        return
      }

      if (request.url === '/openapi.yaml') {
        response.writeHead(200, { 'content-type': 'application/yaml' }).end(mainFixture)
        return
      }

      if (request.url === '/external-schemas.yaml') {
        response.writeHead(200, { 'content-type': 'application/yaml' }).end(externalFixture)
        return
      }

      response.writeHead(404).end()
    })

    servers.push(server)
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))

    const address = server.address()
    if (address === null || typeof address === 'string') {
      throw new Error('Expected TCP server address')
    }

    const result = await runCli([
      'get',
      '0',
      '--remote',
      `http://127.0.0.1:${address.port}/openapi.yaml`,
    ])

    expect(result.code).toBe(0)
    const payload = parseStdout(result)
    const responseSchema = payload.api.responses['201'].content['application/json'].schema
    expect(responseSchema.properties).toHaveProperty('id')
    expect(responseSchema.properties).not.toHaveProperty('oldField')
  })

  it('loads real OpenAPI fixtures', async () => {
    const local = await runCli(['list', '--file', 'fixtures/local-openapi-2-v3.0.json', '--size', '1'])
    expect(local.code).toBe(0)
    expect(parseStdout(local).pagination.total).toBe(9)

    const github = await runCli(['list', '--file', 'fixtures/github-rest-openapi.json', '--size', '1'])
    expect(github.code).toBe(0)
    expect(parseStdout(github).pagination.total).toBeGreaterThan(100)
  })

  it('keeps circular refs as refs without hanging', async () => {
    const result = await runCli(['get', '0', '--file', 'fixtures/circular.openapi.yaml'])

    expect(result.stderr).toBe('')
    expect(result.code).toBe(0)

    const payload = parseStdout(result)
    expect(payload.api.responses['200'].content['application/json'].schema).toEqual({
      $ref: '#/components/schemas/Node',
    })

    const fixtureUrl = new URL('../fixtures/circular.openapi.yaml', import.meta.url)
    const source: SourceInput = {
      type: 'file',
      value: 'fixtures/circular.openapi.yaml',
      baseUri: fixtureUrl.href,
    }
    const { document } = await loadDocument(source)
    const resolved = await resolveRefs(source, document)
    const nodeSchema = (resolved as any).components.schemas.Node
    expect(nodeSchema.properties.child).toEqual({
      $ref: '#/components/schemas/Node',
    })
  })
})

function runCli(args: string[]): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn('bun', [cliEntry, ...args], {
      cwd: packageRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []

    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk))
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk))
    child.on('error', reject)
    child.on('close', (code) => {
      resolve({
        code,
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8'),
      })
    })
  })
}

function parseStdout(result: CliResult) {
  return JSON.parse(result.stdout)
}
