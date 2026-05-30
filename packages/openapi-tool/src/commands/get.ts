import { collectOperations, mergeParameters } from '../core/collect-operations'
import { filterDeprecated } from '../core/filter-deprecated'
import { cloneJsonObject, isJsonObject } from '../core/json'
import { loadDocument } from '../core/parse-document'
import { resolveRefs } from '../core/resolve-ref'
import { toSourceOutput } from '../core/source'
import { OpenapiToolError } from '../output/error'
import type { GetPayload, JsonObject, SourceInput } from '../types'

export async function getApi(source: SourceInput, index: number): Promise<GetPayload> {
  validateIndex(index)

  const loaded = await loadDocument(source)
  const dereferenced = await resolveRefs(source, loaded.document)
  const filteredDocument = filterDeprecated(cloneJsonObject(dereferenced)) ?? dereferenced
  const operations = collectOperations(filteredDocument)
  const operation = operations[index]

  if (!operation) {
    throw new OpenapiToolError('INDEX_NOT_FOUND', `API index not found: ${index}`, {
      index,
      total: operations.length,
    })
  }

  const operationFields = cloneJsonObject(operation.operation)
  const parameters = mergeParameters(operation.pathParameters, operation.operation.parameters)
  const api: JsonObject = {
    ...operationFields,
    index: operation.index,
    name: operation.name,
    path: operation.path,
    method: operation.method,
    pathWithMethod: operation.pathWithMethod,
    tags: operation.tags,
    operationId: operation.operationId,
    summary: operation.summary,
    description: operation.description,
    parameters,
    requestBody: isJsonObject(operationFields.requestBody) ? operationFields.requestBody : null,
    responses: isJsonObject(operationFields.responses) ? operationFields.responses : {},
    extensions: pickExtensions(operationFields),
  }

  return {
    command: 'get',
    source: toSourceOutput(source),
    api,
  }
}

export function parseIndex(value: unknown): number {
  if (typeof value !== 'string' || value.length === 0) {
    throw new OpenapiToolError('INVALID_INDEX', '<index> is required')
  }

  if (!/^\d+$/.test(value)) {
    throw new OpenapiToolError('INVALID_INDEX', '<index> must be a non-negative integer', {
      index: value,
    })
  }

  return Number(value)
}

function validateIndex(index: number): void {
  if (!Number.isInteger(index) || index < 0) {
    throw new OpenapiToolError('INVALID_INDEX', '<index> must be a non-negative integer', {
      index,
    })
  }
}

function pickExtensions(operation: JsonObject): JsonObject {
  const extensions: JsonObject = {}

  for (const [key, value] of Object.entries(operation)) {
    if (key.startsWith('x-')) {
      extensions[key] = value
    }
  }

  return extensions
}
