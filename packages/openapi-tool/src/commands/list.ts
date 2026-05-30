import { OpenapiToolError } from '../output/error'
import type { JsonValue, ListOptions, ListPayload, SourceInput } from '../types'
import { collectOperations, toListItem } from '../core/collect-operations'
import { filterDeprecated } from '../core/filter-deprecated'
import { cloneJsonObject } from '../core/json'
import { loadDocument } from '../core/parse-document'
import { toSourceOutput } from '../core/source'

export async function listApis(source: SourceInput, options: ListOptions): Promise<ListPayload> {
  validatePagination(options)

  const loaded = await loadDocument(source)
  const filteredDocument = filterDeprecated(cloneJsonObject(loaded.document)) ?? loaded.document
  const operations = collectOperations(filteredDocument)
  const filteredOperations = options.keywords.length === 0
    ? operations
    : operations.filter((operation) => matchesAnyKeyword(operation, options.keywords))

  const start = options.page * options.size
  const items = filteredOperations.slice(start, start + options.size).map(toListItem)
  const total = filteredOperations.length

  return {
    command: 'list',
    source: toSourceOutput(source),
    pagination: {
      page: options.page,
      size: options.size,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / options.size),
    },
    filters: {
      keywords: options.keywords,
      mode: 'OR',
      caseSensitive: true,
      regex: false,
    },
    items,
  }
}

function validatePagination(options: ListOptions): void {
  if (!Number.isInteger(options.page) || options.page < 0) {
    throw new OpenapiToolError('INVALID_ARGUMENT', '--page must be a non-negative integer', {
      page: options.page,
    })
  }

  if (!Number.isInteger(options.size) || options.size <= 0) {
    throw new OpenapiToolError('INVALID_ARGUMENT', '--size must be a positive integer', {
      size: options.size,
    })
  }
}

function matchesAnyKeyword(operation: ReturnType<typeof collectOperations>[number], keywords: string[]): boolean {
  const searchableValues = [
    operation.path,
    operation.name,
    operation.description,
    ...operation.tags,
    operation.operationId,
  ].filter((value): value is string => typeof value === 'string')

  return keywords.some((keyword) => searchableValues.some((value) => value.includes(keyword)))
}

export function parseListOptions(rawOptions: Record<string, unknown>): ListOptions {
  return {
    keywords: normalizeKeywords(rawOptions.keyword ?? rawOptions.k),
    page: normalizeInteger(rawOptions.page, 0, 'page'),
    size: normalizeInteger(rawOptions.size, 10, 'size'),
  }
}

function normalizeKeywords(value: unknown): string[] {
  if (value === undefined || value === null || value === false) {
    return []
  }

  const values = Array.isArray(value) ? value : [value]

  return values.map((item) => {
    if (typeof item !== 'string') {
      throw new OpenapiToolError('INVALID_ARGUMENT', '--keyword must be a string', {
        keyword: values as JsonValue,
      })
    }

    return item
  })
}

function normalizeInteger(value: unknown, defaultValue: number, name: string): number {
  if (value === undefined || value === null || value === false) {
    return defaultValue
  }

  if (Array.isArray(value)) {
    throw new OpenapiToolError('INVALID_ARGUMENT', `--${name} can only be specified once`, {
      [name]: value as JsonValue,
    })
  }

  const parsed = typeof value === 'number' ? value : Number(value)

  if (!Number.isInteger(parsed)) {
    throw new OpenapiToolError('INVALID_ARGUMENT', `--${name} must be an integer`, {
      [name]: String(value),
    })
  }

  return parsed
}
