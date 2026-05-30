import { readFile } from 'node:fs/promises'
import { parse as parseYaml } from 'yaml'
import { OpenapiToolError } from '../output/error'
import type { JsonObject, LoadedDocument, SourceInput } from '../types'
import { isJsonObject } from './json'

export async function loadDocument(source: SourceInput): Promise<LoadedDocument> {
  const text = source.type === 'file'
    ? await readFile(new URL(source.baseUri), 'utf8')
    : await fetchRemoteText(source)

  const document = parseDocumentText(text)
  validateOpenapiDocument(document)

  return {
    source,
    document,
  }
}

function parseDocumentText(text: string): JsonObject {
  try {
    const parsed = parseYaml(text)

    if (!isJsonObject(parsed)) {
      throw new OpenapiToolError('INVALID_OPENAPI', 'OpenAPI document must be a JSON object')
    }

    return parsed
  }
  catch (error) {
    if (error instanceof OpenapiToolError) {
      throw error
    }

    const message = error instanceof Error ? error.message : String(error)
    throw new OpenapiToolError('UNSUPPORTED_FORMAT', 'OpenAPI document must be valid JSON or YAML', {
      cause: message,
    })
  }
}

async function fetchRemoteText(source: SourceInput): Promise<string> {
  let response: Response

  try {
    response = await fetch(source.value, { method: 'GET' })
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new OpenapiToolError('REMOTE_FETCH_FAILED', `Failed to fetch remote OpenAPI document: ${source.value}`, {
      remote: source.value,
      cause: message,
    })
  }

  if (!response.ok) {
    throw new OpenapiToolError('REMOTE_FETCH_FAILED', `Remote OpenAPI document returned HTTP ${response.status}`, {
      remote: source.value,
      status: response.status,
      statusText: response.statusText,
    })
  }

  return response.text()
}

export function validateOpenapiDocument(document: JsonObject): void {
  const version = document.openapi

  if (typeof version !== 'string' || version.length === 0) {
    throw new OpenapiToolError('INVALID_OPENAPI', 'OpenAPI document must contain an openapi version')
  }

  if (!/^3\.(0|1)(?:\.\d+)?(?:[-+].*)?$/.test(version)) {
    throw new OpenapiToolError('UNSUPPORTED_OPENAPI_VERSION', 'Only OpenAPI 3.0.x and 3.1.x are supported', {
      openapi: version,
    })
  }

  if (!isJsonObject(document.paths)) {
    throw new OpenapiToolError('INVALID_OPENAPI', 'OpenAPI document must contain a paths object')
  }
}
