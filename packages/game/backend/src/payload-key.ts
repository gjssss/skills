export function jsonKey(value: unknown) {
  return stableJsonStringify(value) ?? 'undefined'
}

function stableJsonStringify(value: unknown, seen = new WeakSet<object>()): string | undefined {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (seen.has(value)) {
    throw new TypeError('Cannot stringify circular structure')
  }

  seen.add(value)

  if (Array.isArray(value)) {
    const items = value.map((item) => stableJsonStringify(item, seen) ?? 'null')
    seen.delete(value)
    return `[${items.join(',')}]`
  }

  const object = value as Record<string, unknown>
  const entries = Object.keys(object)
    .sort()
    .flatMap((key) => {
      const stringified = stableJsonStringify(object[key], seen)
      return stringified === undefined ? [] : `${JSON.stringify(key)}:${stringified}`
    })
  seen.delete(value)
  return `{${entries.join(',')}}`
}
