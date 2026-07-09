import type { GameState, PlayerView, PublicStateView } from './types'
import { sortCards } from './deck'
import { getPlayer, playerRole } from './state'

export function createPublicView(state: GameState): PublicStateView {
  return {
    roomId: state.roomId,
    stage: state.stage,
    players: state.players.map((player) => ({
      ...player,
      handCount: state.hands[player.playerId]?.length ?? 0,
      role: playerRole(state, player.playerId),
    })),
    bottomCards: state.stage === 'waiting' || state.stage === 'bidding' ? [] : state.bottomCards,
    landlordId: state.landlordId,
    currentBid: state.bid.current,
    pending: state.pending,
    lastPlay: state.trick.lastPlay,
    finished: state.finished,
  }
}

export function createPlayerView(state: GameState, playerId: string): PlayerView {
  const player = getPlayer(state, playerId)
  if (!player) throw new Error(`Unknown player: ${playerId}`)
  return {
    ...createPublicView(state),
    playerId,
    seat: player.seat,
    role: playerRole(state, playerId),
    hand: sortCards(state.hands[playerId] ?? []),
    bottomCards: state.stage === 'waiting' || state.stage === 'bidding' ? [] : state.bottomCards,
  }
}
