import { access } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { OpenapiToolError } from '../output/error'
import type { JsonValue, SourceInput, SourceOutput } from '../types'

interface RawSourceOptions {
  file?: unknown
  f?: unknown
  remote?: unknown
  r?: unknown
}

export function toSourceOutput(source: SourceInput): SourceOutput {
  return {
    type: source.type,
    value: source.value,
  }
}

export async function resolveSource(options: RawSourceOptions): Promise<SourceInput> {
  const file = normalizeSingleOption(options.file ?? options.f, 'file')
  const remote = normalizeSingleOption(options.remote ?? options.r, 'remote')

  if (file && remote) {
    throw new OpenapiToolError('SOURCE_CONFLICT', '--file and --remote cannot be used together', {
      file,
      remote,
    })
  }

  if (!file && !remote) {
    throw new OpenapiToolError('SOURCE_REQUIRED', 'Either --file or --remote is required')
  }

  if (file) {
    const absolutePath = resolve(file)

    try {
      await access(absolutePath)
    }
    catch {
      throw new OpenapiToolError('FILE_NOT_FOUND', `OpenAPI file not found: ${file}`, { file })
    }

    return {
      type: 'file',
      value: file,
      baseUri: pathToFileURL(absolutePath).href,
    }
  }

  const remoteUrl = remote as string
  validateRemoteUrl(remoteUrl)

  return {
    type: 'remote',
    value: remoteUrl,
    baseUri: remoteUrl,
  }
}

function normalizeSingleOption(value: unknown, name: string): string | null {
  if (value === undefined || value === null || value === false) {
    return null
  }

  if (Array.isArray(value)) {
    if (value.length !== 1) {
      throw new OpenapiToolError('INVALID_ARGUMENT', `--${name} can only be specified once`, {
        [name]: value as JsonValue,
      })
    }

    return normalizeSingleOption(value[0], name)
  }

  if (typeof value !== 'string' || value.length === 0) {
    throw new OpenapiToolError('INVALID_ARGUMENT', `--${name} must be a non-empty string`)
  }

  return value
}

function validateRemoteUrl(value: string): void {
  let url: URL

  try {
    url = new URL(value)
  }
  catch {
    throw new OpenapiToolError('INVALID_ARGUMENT', `Invalid remote URL: ${value}`, { remote: value })
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new OpenapiToolError('INVALID_ARGUMENT', 'Remote URL must use http or https', { remote: value })
  }
}
