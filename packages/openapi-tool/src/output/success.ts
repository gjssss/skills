export function formatJson(payload: unknown): string {
  return `${JSON.stringify(payload, null, 2)}\n`
}
