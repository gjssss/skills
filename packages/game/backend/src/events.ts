import type { GameState, ServerSeq } from '@djd/game-core'
import { createPlayerView, createPublicView } from '@djd/game-core'
import type { ServerEvent } from './types'

export const WAIT_TIMEOUT_MS = 10 * 60 * 1000

export function now() {
  return new Date().toISOString()
}

export function jsonKey(value: unknown) {
  return JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort())
}

export function publicPendingEvent(state: GameState): ServerEvent | undefined {
  if (!state.pending) return undefined
  return {
    seq: state.pending.seq,
    roomId: state.roomId,
    type: state.pending.type,
    createdAt: now(),
    playerId: state.pending.playerId,
    seat: state.pending.seat,
    stage: state.pending.stage,
    hand: createPlayerView(state, state.pending.playerId).hand,
    legalActions: createPlayerView(state, state.pending.playerId).legalActions,
  }
}

export function finishedEvent(state: GameState, seq: ServerSeq): ServerEvent {
  return {
    seq,
    roomId: state.roomId,
    type: 'game.finished',
    createdAt: now(),
    stage: 'finished',
    finished: state.finished,
    state: createPublicView(state),
  }
}
