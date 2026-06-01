import $RefParser from '@apidevtools/json-schema-ref-parser'
import { OpenapiToolError } from '../output/error'
import type { JsonObject, SourceInput } from '../types'

export async function resolveRefs(source: SourceInput, document: JsonObject): Promise<JsonObject> {
  try {
    return await $RefParser.dereference(source.baseUri, document, {
      dereference: {
        circular: 'ignore',
        preservedProperties: ['description', 'summary'],
        externalReferenceResolution: 'relative',
      },
      resolve: {
        http: {
          safeUrlResolver: false,
        },
      },
      mutateInputSchema: false,
    }) as JsonObject
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const code = /circular/i.test(message) ? 'CIRCULAR_REF' : 'REF_RESOLUTION_FAILED'

    throw new OpenapiToolError(code, code === 'CIRCULAR_REF'
      ? 'Circular $ref detected while resolving OpenAPI document'
      : 'Failed to resolve OpenAPI $ref values', {
      source: source.value,
      cause: message,
    })
  }
}
