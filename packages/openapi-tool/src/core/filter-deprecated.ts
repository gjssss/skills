import type { JsonArray, JsonObject, JsonValue } from '../types'
import { isJsonArray, isJsonObject } from './json'

export function filterDeprecated<T extends JsonValue>(value: T): T | undefined {
  return filterValue(value) as T | undefined
}

function filterValue(value: JsonValue): JsonValue | undefined {
  if (isJsonArray(value)) {
    return filterArray(value)
  }

  if (isJsonObject(value)) {
    return filterObject(value)
  }

  return value
}

function filterArray(value: JsonArray): JsonArray {
  const result: JsonArray = []

  for (const item of value) {
    const filtered = filterValue(item)

    if (filtered !== undefined) {
      result.push(filtered)
    }
  }

  return result
}

function filterObject(value: JsonObject): JsonObject | undefined {
  if (value.deprecated === true) {
    return undefined
  }

  const result: JsonObject = {}

  for (const [key, child] of Object.entries(value)) {
    const filtered = filterValue(child)

    if (filtered !== undefined) {
      result[key] = filtered
    }
  }

  syncRequiredWithProperties(result)

  return result
}

function syncRequiredWithProperties(value: JsonObject): void {
  if (!isJsonObject(value.properties) || !isJsonArray(value.required)) {
    return
  }

  const propertyNames = new Set(Object.keys(value.properties))
  value.required = value.required.filter((item) => typeof item === 'string' && propertyNames.has(item))
}
