export type SourceType = 'file' | 'remote'

export interface SourceInput {
  type: SourceType
  value: string
  baseUri: string
}

export interface SourceOutput {
  type: SourceType
  value: string
}

export type ErrorCode =
  | 'INVALID_ARGUMENT'
  | 'SOURCE_REQUIRED'
  | 'SOURCE_CONFLICT'
  | 'FILE_NOT_FOUND'
  | 'REMOTE_FETCH_FAILED'
  | 'UNSUPPORTED_FORMAT'
  | 'INVALID_OPENAPI'
  | 'UNSUPPORTED_OPENAPI_VERSION'
  | 'INVALID_INDEX'
  | 'INDEX_NOT_FOUND'
  | 'REF_RESOLUTION_FAILED'
  | 'CIRCULAR_REF'

export interface ErrorPayload {
  error: {
    code: ErrorCode
    message: string
    details?: JsonValue
  }
}

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonObject | JsonArray
export interface JsonObject {
  [key: string]: JsonValue
}
export type JsonArray = JsonValue[]

export interface LoadedDocument {
  source: SourceInput
  document: JsonObject
}

export interface OperationRecord {
  index: number
  name: string
  path: string
  method: string
  pathWithMethod: string
  tags: string[]
  operationId: string | null
  description: string | null
  summary: string | null
  operation: JsonObject
  pathParameters: JsonArray
}

export interface ListOptions {
  keywords: string[]
  page: number
  size: number
}

export interface ListItem {
  index: number
  name: string
  path: string
  method: string
  pathWithMethod: string
  tags: string[]
  operationId: string | null
}

export interface ListPayload {
  command: 'list'
  source: SourceOutput
  pagination: {
    page: number
    size: number
    total: number
    totalPages: number
  }
  filters: {
    keywords: string[]
    mode: 'OR'
    caseSensitive: true
    regex: false
  }
  items: ListItem[]
}

export interface GetPayload {
  command: 'get'
  source: SourceOutput
  api: JsonObject
}
