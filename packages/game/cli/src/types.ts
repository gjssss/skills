export interface CliConfig {
  version: 2
  player: {
    nickname: string | null
  }
  current: {
    server: string | null
    roomId: string | null
    playerId: string | null
    serverSeq: number
    lastEventType: string | null
  }
  rooms: Record<string, {
    server: string
    roomId: string
    playerId: string | null
    resumeKey: string | null
    serverSeq: number
    updatedAt: string
  }>
  stats: {
    games: number
    wins: number
    losses: number
    landlordGames: number
    farmerGames: number
    lastGameAt: string | null
  }
}

export interface LegacyCliConfigV1 {
  version: 1
  player?: CliConfig['player']
  current?: CliConfig['current']
  rooms?: Record<string, {
    server: string
    roomId: string
    playerId: string
    serverSeq: number
    updatedAt: string
  }>
  stats?: CliConfig['stats']
}

export interface GlobalOptions {
  config?: string
  server?: string
  room?: string
  player?: string
  json?: boolean
}
