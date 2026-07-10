import type { GameState, PlayerInfo, PlayerRole, ServerSeq } from './types'
import type { RandomSource } from './deck'
import { dealCards } from './deck'

export function createWaitingState(roomId: string): GameState {
  return {
    roomId,
    stage: 'waiting',
    players: [],
    hands: {},
    bottomCards: [],
    bid: {
      current: 0,
      consecutivePasses: 0,
      totalActions: 0,
      redeals: 0,
    },
    trick: {
      passCount: 0,
      bombsPlayed: 0,
    },
  }
}

export function startBidding(
  state: GameState,
  source?: number | RandomSource,
  redeals = state.bid.redeals,
): GameState {
  const dealSource = typeof source === 'number' ? source + redeals : source
  const dealt = dealCards(state.players, dealSource)
  const first = state.players[0]
  if (!first) throw new Error('Cannot start game without players')

  return {
    ...state,
    stage: 'bidding',
    hands: dealt.hands,
    bottomCards: dealt.bottomCards,
    landlordId: undefined,
    currentPlayerId: first.playerId,
    pending: undefined,
    bid: {
      current: 0,
      consecutivePasses: 0,
      totalActions: 0,
      redeals,
    },
    trick: {
      passCount: 0,
      bombsPlayed: 0,
    },
    finished: undefined,
  }
}

export function attachPending(state: GameState, seq: ServerSeq): GameState {
  if (!state.currentPlayerId || state.stage === 'waiting' || state.stage === 'finished') {
    return { ...state, pending: undefined }
  }

  const player = getPlayer(state, state.currentPlayerId)
  if (!player) return { ...state, pending: undefined }

  return {
    ...state,
    pending: {
      seq,
      type: state.stage === 'bidding' ? 'bid.request' : 'turn.request',
      roomId: state.roomId,
      playerId: player.playerId,
      seat: player.seat,
      stage: state.stage,
    },
  }
}

export function getPlayer(state: GameState, playerId: string): PlayerInfo | undefined {
  return state.players.find((player) => player.playerId === playerId)
}

export function nextPlayerId(state: GameState, playerId: string): string {
  const player = getPlayer(state, playerId)
  if (!player) throw new Error(`Unknown player: ${playerId}`)
  const nextSeat = (player.seat + 1) % state.players.length
  const next = state.players.find((item) => item.seat === nextSeat)
  if (!next) throw new Error(`Unknown next seat: ${nextSeat}`)
  return next.playerId
}

export function playerRole(state: GameState, playerId: string): PlayerRole | undefined {
  if (!state.landlordId) return undefined
  return state.landlordId === playerId ? 'landlord' : 'farmer'
}
