import type {
  BidValue,
  CardId,
  GameAction,
  GameStage,
  GameState,
  PendingAction,
  PlayedTrick,
  PlayerInfo,
  PlayerRole,
  ServerSeq,
} from '@djd/game-core'

export interface SpectatorPlayer extends PlayerInfo {
  role?: PlayerRole
  hand: CardId[]
  handCount: number
}

export interface RoomPlayerSummary extends PlayerInfo {
  role?: PlayerRole
  handCount: number
}

export interface SpectatorEvent {
  seq: ServerSeq
  roomId: string
  type: string
  createdAt: string
  playerId?: string
  action?: GameAction
  [key: string]: unknown
}

export interface SpectatorFrame {
  sessionId: string
  roomId: string
  seq: ServerSeq
  createdAt: string
  stage: GameStage
  players: SpectatorPlayer[]
  bottomCards: CardId[]
  landlordId?: string
  currentPlayerId?: string
  pending?: PendingAction
  currentBid: BidValue
  lastPlay?: PlayedTrick
  finished?: GameState['finished']
  event: SpectatorEvent
}

export interface RoomSummary {
  sessionId: string
  roomId: string
  stage: Exclude<GameStage, 'finished'>
  players: RoomPlayerSummary[]
  currentPlayerId?: string
  currentSeq: ServerSeq
  createdAt: string
  startedAt?: string
  updatedAt: string
  connectionCount: number
}

export interface ReplayTrick {
  index: number
  startSeq: ServerSeq
  endSeq: ServerSeq
  leaderPlayerId: string
  eventSeqs: ServerSeq[]
}

export interface CompletedSessionSummary {
  schemaVersion: 1
  sessionId: string
  roomId: string
  players: RoomPlayerSummary[]
  landlordId: string
  winner: 'landlord' | 'farmers'
  winnerPlayerId: string
  startedAt: string
  finishedAt: string
  durationMs: number
  finalSeq: ServerSeq
  eventCount: number
  trickCount: number
}

export interface CompletedSessionDetail extends CompletedSessionSummary {
  frames: SpectatorFrame[]
  tricks: ReplayTrick[]
}

export interface CompletedSessionPage {
  items: CompletedSessionSummary[]
  total: number
  page: number
  pageSize: number
}

export type SpectatorClientMessage =
  | { type: 'spectator.subscribe', scope: 'rooms' }
  | { type: 'spectator.subscribe', scope: 'room', roomId: string, afterSeq: ServerSeq }

export type SpectatorServerMessage =
  | { type: 'rooms.snapshot', rooms: RoomSummary[] }
  | { type: 'room.updated', room: RoomSummary }
  | { type: 'room.removed', roomId: string, sessionId: string }
  | { type: 'room.snapshot', frame: SpectatorFrame }
  | { type: 'room.frame', frame: SpectatorFrame }
  | { type: 'sync.complete', roomId?: string, serverSeq?: ServerSeq }
  | { type: 'error', code: string, message: string }

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Spectator message must be a JSON object')
  }
  return value as Record<string, unknown>
}

export function parseSpectatorClientMessage(value: unknown): SpectatorClientMessage {
  const message = asRecord(value)
  if (message.type !== 'spectator.subscribe') {
    throw new Error('The first spectator message must be spectator.subscribe')
  }
  if (message.scope === 'rooms') return { type: 'spectator.subscribe', scope: 'rooms' }
  if (message.scope !== 'room') throw new Error('Spectator scope must be rooms or room')
  if (typeof message.roomId !== 'string' || !message.roomId.trim()) {
    throw new Error('roomId must be a non-empty string')
  }
  const afterSeq = Number(message.afterSeq ?? 0)
  if (!Number.isSafeInteger(afterSeq) || afterSeq < 0) {
    throw new Error('afterSeq must be a non-negative integer')
  }
  return {
    type: 'spectator.subscribe',
    scope: 'room',
    roomId: message.roomId.trim(),
    afterSeq,
  }
}
