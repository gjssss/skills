import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export function resolveCliDist() {
  return dirname(fileURLToPath(import.meta.url))
}
