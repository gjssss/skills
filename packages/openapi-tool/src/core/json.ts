import type { JsonArray, JsonObject, JsonValue } from '../types'

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isJsonArray(value: unknown): value is JsonArray {
  return Array.isArray(value)
}

export function getString(value: JsonValue | undefined): string | null {
  return typeof value === 'string' ? value : null
}

export function cloneJsonObject(value: JsonObject): JsonObject {
  return structuredClone(value) as JsonObject
}
