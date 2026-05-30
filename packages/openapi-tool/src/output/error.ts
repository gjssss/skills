import type { ErrorCode, ErrorPayload, JsonValue } from '../types'

export class OpenapiToolError extends Error {
  readonly code: ErrorCode
  readonly details?: JsonValue
  readonly exitCode: number

  constructor(code: ErrorCode, message: string, details?: JsonValue, exitCode = 1) {
    super(message)
    this.name = 'OpenapiToolError'
    this.code = code
    this.details = details
    this.exitCode = exitCode
  }
}

export function toErrorPayload(error: unknown): ErrorPayload {
  if (error instanceof OpenapiToolError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    }
  }

  const message = error instanceof Error ? error.message : String(error)

  return {
    error: {
      code: 'INVALID_ARGUMENT',
      message,
    },
  }
}

export function getExitCode(error: unknown): number {
  return error instanceof OpenapiToolError ? error.exitCode : 1
}
