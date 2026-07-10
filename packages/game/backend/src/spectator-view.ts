import type { GameState, ServerEvent } from '@djd/game-core'
import { playerRole, sortCards } from '@djd/game-core'
import type { RoomSummary, SpectatorFrame } from '@djd/game-web-contract'

export interface RoomSnapshotSource {
  sessionId: string
  roomId: string
  state: GameState
  currentSeq(): number
  createdAt: string
  startedAt?: string
  updatedAt: string
}

export function createSpectatorFrame(
  sessionId: string,
  state: GameState,
  event: ServerEvent,
): SpectatorFrame {
  return {
    sessionId,
    roomId: state.roomId,
    seq: event.seq,
    createdAt: event.createdAt,
    stage: state.stage,
    players: state.players.map((player) => {
      const hand = sortCards(state.hands[player.playerId] ?? [])
      return {
        ...player,
        role: playerRole(state, player.playerId),
        hand,
        handCount: hand.length,
      }
    }),
    bottomCards: sortCards(state.bottomCards),
    landlordId: state.landlordId,
    currentPlayerId: state.currentPlayerId,
    pending: state.pending,
    currentBid: state.bid.current,
    lastPlay: state.trick.lastPlay,
    finished: state.finished,
    event: { ...event },
  }
}

export function createRoomSummary(source: RoomSnapshotSource, connectionCount = 0): RoomSummary | undefined {
  if (source.state.stage === 'finished') return undefined
  return {
    sessionId: source.sessionId,
    roomId: source.roomId,
    stage: source.state.stage,
    players: source.state.players.map((player) => ({
      ...player,
      role: playerRole(source.state, player.playerId),
      handCount: source.state.hands[player.playerId]?.length ?? 0,
    })),
    currentPlayerId: source.state.currentPlayerId,
    currentSeq: source.currentSeq(),
    createdAt: source.createdAt,
    startedAt: source.startedAt,
    updatedAt: source.updatedAt,
    connectionCount,
  }
}
