import type {
  CompletedSessionDetail,
  CompletedSessionPage,
  RoomSummary,
  SpectatorFrame,
} from '@djd/game-web-contract'

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json() as Promise<T>
}

export async function fetchRooms() {
  const response = await fetchJson<{ rooms: RoomSummary[] }>('/api/spectator/rooms')
  return response.rooms
}

export function fetchRoom(roomId: string) {
  return fetchJson<SpectatorFrame>(`/api/spectator/rooms/${encodeURIComponent(roomId)}`)
}

export function fetchSessions(page = 1, pageSize = 20) {
  return fetchJson<CompletedSessionPage>(`/api/spectator/sessions?page=${page}&pageSize=${pageSize}`)
}

export function fetchSession(sessionId: string) {
  return fetchJson<CompletedSessionDetail>(`/api/spectator/sessions/${encodeURIComponent(sessionId)}`)
}

export function spectatorWebSocketUrl() {
  const url = new URL('/ws/spectator', window.location.href)
  url.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.toString()
}
