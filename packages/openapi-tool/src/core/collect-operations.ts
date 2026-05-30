import type { JsonArray, JsonObject, JsonValue, ListItem, OperationRecord } from '../types'
import { getString, isJsonArray, isJsonObject } from './json'

const HTTP_METHODS = new Set([
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
])

export function collectOperations(document: JsonObject): OperationRecord[] {
  if (!isJsonObject(document.paths)) {
    return []
  }

  const operations: OperationRecord[] = []

  for (const [path, pathItemValue] of Object.entries(document.paths)) {
    if (!isJsonObject(pathItemValue)) {
      continue
    }

    const pathParameters = normalizeParameters(pathItemValue.parameters)

    for (const [method, operationValue] of Object.entries(pathItemValue)) {
      if (!HTTP_METHODS.has(method) || !isJsonObject(operationValue)) {
        continue
      }

      if (operationValue.deprecated === true) {
        continue
      }

      const summary = getString(operationValue.summary)
      const operationId = getString(operationValue.operationId)
      const name = summary ?? operationId ?? `${method.toUpperCase()} ${path}`
      const tags = isJsonArray(operationValue.tags)
        ? operationValue.tags.filter((tag): tag is string => typeof tag === 'string')
        : []

      operations.push({
        index: operations.length,
        name,
        path,
        method,
        pathWithMethod: `${method.toUpperCase()} ${path}`,
        tags,
        operationId,
        summary,
        description: getString(operationValue.description),
        operation: operationValue,
        pathParameters,
      })
    }
  }

  return operations
}

export function toListItem(operation: OperationRecord): ListItem {
  return {
    index: operation.index,
    name: operation.name,
    path: operation.path,
    method: operation.method,
    pathWithMethod: operation.pathWithMethod,
    tags: operation.tags,
    operationId: operation.operationId,
  }
}

export function mergeParameters(pathParameters: JsonArray, operationParametersValue: JsonValue | undefined): JsonArray {
  const operationParameters = normalizeParameters(operationParametersValue)
  const result: JsonArray = [...pathParameters]

  for (const parameter of operationParameters) {
    if (!isJsonObject(parameter)) {
      result.push(parameter)
      continue
    }

    const key = parameterKey(parameter)
    const existingIndex = key === null
      ? -1
      : result.findIndex((item) => isJsonObject(item) && parameterKey(item) === key)

    if (existingIndex >= 0) {
      result[existingIndex] = parameter
    }
    else {
      result.push(parameter)
    }
  }

  return result
}

function normalizeParameters(value: JsonValue | undefined): JsonArray {
  return isJsonArray(value) ? value : []
}

function parameterKey(parameter: JsonObject): string | null {
  const name = getString(parameter.name)
  const location = getString(parameter.in)

  return name && location ? `${location}:${name}` : null
}
