import type { GameState, ServerEvent } from '@djd/game-core'
import { playerRole } from '@djd/game-core'
import type {
  CompletedSessionDetail,
  ReplayTrick,
  SpectatorFrame,
} from '@djd/game-web-contract'

export function buildReplayTricks(frames: SpectatorFrame[]): ReplayTrick[] {
  const tricks: ReplayTrick[] = []
  let active: ReplayTrick | undefined
  let passCount = 0

  for (const frame of frames) {
    if (frame.event.type !== 'action.accepted') continue
    const action = frame.event.action
    if (!action || (action.type !== 'play' && action.type !== 'pass')) continue

    if (action.type === 'play') {
      if (!active) {
        active = {
          index: tricks.length + 1,
          startSeq: frame.seq,
          endSeq: frame.seq,
          leaderPlayerId: frame.event.playerId ?? '',
          eventSeqs: [],
        }
      }
      active.eventSeqs.push(frame.seq)
      active.endSeq = frame.seq
      passCount = 0
    }
    else if (active) {
      active.eventSeqs.push(frame.seq)
      active.endSeq = frame.seq
      passCount += 1
      if (passCount >= 2) {
        tricks.push(active)
        active = undefined
        passCount = 0
      }
    }
  }

  if (active) tricks.push(active)
  return tricks
}

export function createCompletedSession(
  input: {
    sessionId: string
    roomId: string
    state: GameState
    events: ServerEvent[]
    frames: SpectatorFrame[]
    startedAt: string
    finishedAt: string
  },
): CompletedSessionDetail {
  const finished = input.state.finished
  if (!finished) throw new Error('Cannot create a completed session before game.finished')
  const tricks = buildReplayTricks(input.frames)
  return {
    schemaVersion: 1,
    sessionId: input.sessionId,
    roomId: input.roomId,
    players: input.state.players.map((player) => ({
      ...player,
      role: playerRole(input.state, player.playerId),
      handCount: input.state.hands[player.playerId]?.length ?? 0,
    })),
    landlordId: finished.landlordId,
    winner: finished.winner,
    winnerPlayerId: finished.winnerPlayerId,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    durationMs: Math.max(0, Date.parse(input.finishedAt) - Date.parse(input.startedAt)),
    finalSeq: input.events.at(-1)?.seq ?? 0,
    eventCount: input.events.length,
    trickCount: tricks.length,
    frames: input.frames.map((frame) => structuredClone(frame)),
    tricks,
  }
}
