import type { CliConfig, GlobalOptions } from './types'

export function normalizeServerUrl(server: string) {
  if (server.startsWith('ws://')) return `http://${server.slice('ws://'.length)}`
  if (server.startsWith('wss://')) return `https://${server.slice('wss://'.length)}`
  return server
}

export function asWsUrl(server: string) {
  if (server.startsWith('http://')) return `ws://${server.slice('http://'.length)}`
  if (server.startsWith('https://')) return `wss://${server.slice('https://'.length)}`
  return server
}

export function joinUrl(server: string, path: string) {
  return `${normalizeServerUrl(server).replace(/\/$/, '')}${path}`
}

export async function requestJson<T>(server: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(joinUrl(server, path), {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  const text = await response.text()
  const payload = text ? JSON.parse(text) : {}
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'error' in payload
      ? String((payload as { error?: unknown }).error)
      : `HTTP ${response.status}`
    throw new Error(message)
  }
  return payload as T
}

export function resolveContext(config: CliConfig, options: GlobalOptions) {
  const server = options.server ?? config.current.server
  const roomId = options.room ?? config.current.roomId ?? 'default'
  const playerId = options.player ?? config.current.playerId
  if (!server) throw new Error('Server is required. Use --server or config set server.')
  return {
    server,
    roomId,
    playerId: playerId ?? undefined,
  }
}
