import { describe, expect, it } from 'vitest'
import { createPlayerView } from '../packages/game/core/src/index'
import type { CompletedSessionDetail } from '../packages/game/web-contract/src/index'
import { buildReplayTricks } from '../packages/game/backend/src/replay'
import { GameRoom } from '../packages/game/backend/src/room'
import type { CompletedSessionStore } from '../packages/game/backend/src/session-store'
import { projectEvent } from '../packages/game/backend/src/websocket'

class RecordingCompletedStore implements CompletedSessionStore {
  records: CompletedSessionDetail[] = []
  failWrites = false

  saveCompleted(record: CompletedSessionDetail) {
    if (this.failWrites) throw new Error('database unavailable')
    this.records.push(structuredClone(record))
  }

  listCompleted(page = 1, pageSize = 20) {
    return { items: this.records, total: this.records.length, page, pageSize }
  }

  getCompleted(sessionId: string) {
    return this.records.find((record) => record.sessionId === sessionId)
  }

  close() {}
}

function startedRoom(roomId: string, seed = 42) {
  const room = new GameRoom(roomId, seed)
  const first = room.join('codex-a')
  room.join('codex-b')
  room.join('codex-c')
  return { room, first, pending: room.state.pending! }
}

function advanceToFinalLandlordPlay(room: GameRoom) {
  if (room.state.stage === 'bidding') {
    const pending = room.state.pending!
    room.applyPlayerAction('p1', { type: 'bid', bid: 3, expectedSeq: pending.seq }, 'landlord-bid')
  }

  let actionIndex = 0
  while (room.state.stage === 'playing') {
    const pending = room.state.pending!
    if (pending.playerId === 'p1' && room.state.hands.p1?.length === 1 && !room.state.trick.lastPlay) {
      return pending
    }
    actionIndex += 1
    if (pending.playerId === 'p1') {
      room.applyPlayerAction('p1', {
        type: 'play',
        cards: [room.state.hands.p1![0]!],
        expectedSeq: pending.seq,
      }, `lead-${actionIndex}`)
    }
    else {
      room.applyPlayerAction(pending.playerId, {
        type: 'pass',
        expectedSeq: pending.seq,
      }, `pass-${actionIndex}`)
    }
  }
  throw new Error('Game finished before the final landlord play was captured')
}

describe('GameRoom backend flow', () => {
  it('starts after the third join and rejects invalid actors without advancing seq', () => {
    const { room, first, pending } = startedRoom('room_backend')

    expect(first.result.player.playerId).toBe('p1')
    expect(pending.type).toBe('bid.request')
    expect(pending.playerId).toBe('p1')
    const pendingEvent = room.getEvents(0).find((event) => event.seq === pending.seq)!
    expect(pendingEvent.hand).toHaveLength(17)
    expect(pendingEvent.availableBids).toEqual(['pass', 1, 2, 3])

    const beforeSeq = room.currentSeq()
    expect(() => room.applyPlayerAction('p2', {
      type: 'bid',
      bid: 1,
      expectedSeq: pending.seq,
    }, 'invalid-actor')).toThrow(/another player|turn/)
    expect(room.currentSeq()).toBe(beforeSeq)
    expect(room.getEvents(0).some((event) => event.type === 'action.rejected')).toBe(false)
  })

  it('accepts a legal bid and returns an immediate event batch', () => {
    const { room, pending } = startedRoom('room_backend_action', 7)
    const mutation = room.applyPlayerAction('p1', {
      type: 'bid',
      bid: 3,
      expectedSeq: pending.seq,
    }, 'bid-three')

    expect(mutation.result.ok).toBe(true)
    expect(mutation.result.applied.type).toBe('action.accepted')
    expect(mutation.events.map((event) => event.type)).toEqual([
      'action.accepted',
      'landlord.decided',
      'turn.request',
    ])
    expect(room.state.pending?.seq).toBe(room.currentSeq())
    expect(room.state.stage).toBe('playing')
    expect(room.state.landlordId).toBe('p1')
    expect(room.state.hands.p1).toHaveLength(20)
    expect(room.getEvents(0).map((event) => event.seq)).toEqual(
      Array.from({ length: room.currentSeq() }, (_, index) => index + 1),
    )
    expect(createPlayerView(room.state, 'p1')).not.toHaveProperty('legalActions')
  })

  it('returns cached action results immediately without emitting duplicate events', () => {
    const { room, pending } = startedRoom('room_backend_idempotent', 11)
    const action = {
      type: 'bid' as const,
      bid: 3 as const,
      expectedSeq: pending.seq,
    }
    const first = room.applyPlayerAction('p1', action, 'same-action')
    const second = room.applyPlayerAction('p1', action, 'same-action')

    expect(second.result).toBe(first.result)
    expect(second.events).toEqual([])
    expect(room.getEvents(0).filter((event) => event.type === 'action.accepted')).toHaveLength(1)
  })

  it('rejects reused idempotency keys with different nested action payloads', () => {
    const { room, pending } = startedRoom('room_backend_idempotent_mismatch', 12)
    room.applyPlayerAction('p1', {
      type: 'bid',
      bid: 3,
      expectedSeq: pending.seq,
    }, 'reused-key')

    expect(() => room.applyPlayerAction('p1', {
      type: 'bid',
      bid: 2,
      expectedSeq: pending.seq,
    }, 'reused-key')).toThrow('Idempotency key payload mismatch')
  })

  it('projects private pending fields only to the target player', () => {
    const { room, pending } = startedRoom('room_backend_projection')
    const event = room.getEvents(0).find((item) => item.seq === pending.seq)!

    expect(projectEvent(event, 'p1').hand).toHaveLength(17)
    expect(projectEvent(event, 'p2')).not.toHaveProperty('hand')
    expect(projectEvent(event)).not.toHaveProperty('availableBids')
    expect(projectEvent(event, 'p2').seq).toBe(event.seq)

    const hostile = {
      ...event,
      hands: { p1: ['S3'], p2: ['S4'], p3: ['S5'] },
      resumeKey: 'must-not-leak',
      state: { hands: { p1: ['S3'] } },
    }
    const projected = projectEvent(hostile, 'p2')
    expect(projected).not.toHaveProperty('hand')
    expect(projected).not.toHaveProperty('hands')
    expect(projected).not.toHaveProperty('resumeKey')
    expect(projected).not.toHaveProperty('state')
  })

  it('generates independent 256-bit resume keys, retains only verification material, and never emits keys as events or frames', () => {
    const room = new GameRoom('room_resume_keys', 42)
    const p1 = room.join('codex-a').result
    const p2 = room.join('codex-b').result
    const p3 = room.join('codex-c').result

    expect(new Set([p1.resumeKey, p2.resumeKey, p3.resumeKey]).size).toBe(3)
    for (const joined of [p1, p2, p3]) {
      expect(joined.resumeKey).toHaveLength(43)
      expect(Buffer.from(joined.resumeKey, 'base64url')).toHaveLength(32)
      expect(room.verifyResumeKey(joined.player.playerId, joined.resumeKey)).toBe(true)
      expect(room.verifyResumeKey(joined.player.playerId, `${joined.resumeKey}x`)).toBe(false)
    }
    expect(room.verifyResumeKey('p2', p1.resumeKey)).toBe(false)

    const serializedTimeline = JSON.stringify({ events: room.events, frames: room.frames })
    for (const joined of [p1, p2, p3]) expect(serializedTimeline).not.toContain(joined.resumeKey)
  })

  it('creates omniscient frames and precomputes replay trick boundaries', () => {
    const store = new RecordingCompletedStore()
    const room = new GameRoom('room_frames', 42, store)
    room.join('codex-a')
    room.join('codex-b')
    room.join('codex-c')

    const biddingFrame = room.latestFrame()!
    expect(biddingFrame.stage).toBe('bidding')
    expect(biddingFrame.bottomCards).toHaveLength(3)
    expect(biddingFrame.players.map((player) => player.hand.length)).toEqual([17, 17, 17])
    expect(biddingFrame.players.map((player) => player.handCount)).toEqual([17, 17, 17])
    expect(biddingFrame.currentPlayerId).toBe('p1')

    const finalPending = advanceToFinalLandlordPlay(room)
    expect(store.records).toHaveLength(0)
    room.applyPlayerAction('p1', {
      type: 'play',
      cards: [room.state.hands.p1![0]!],
      expectedSeq: finalPending.seq,
    }, 'final-play')

    expect(store.records).toHaveLength(1)
    const record = store.records[0]!
    expect(record.frames).toHaveLength(record.eventCount)
    expect(record.frames.map((frame) => frame.seq)).toEqual(
      Array.from({ length: record.finalSeq }, (_, index) => index + 1),
    )
    expect(record.frames.at(-1)).toMatchObject({ stage: 'finished', finished: { winner: 'landlord' } })
    expect(record.tricks).toHaveLength(20)
    expect(record.tricks[0]?.eventSeqs).toHaveLength(3)
    expect(record.tricks.at(-1)?.eventSeqs).toHaveLength(1)
    expect(buildReplayTricks(record.frames)).toEqual(record.tricks)
  })

  it('rolls back the final in-memory mutation when completion persistence fails and permits an identical retry', () => {
    const store = new RecordingCompletedStore()
    const room = new GameRoom('room_persist_rollback', 99, store)
    room.join('codex-a')
    room.join('codex-b')
    room.join('codex-c')
    const finalPending = advanceToFinalLandlordPlay(room)
    const before = {
      state: structuredClone(room.state),
      seq: room.currentSeq(),
      events: structuredClone(room.events),
      frames: structuredClone(room.frames),
    }
    const action = {
      type: 'play' as const,
      cards: [room.state.hands.p1![0]!],
      expectedSeq: finalPending.seq,
    }

    store.failWrites = true
    expect(() => room.applyPlayerAction('p1', action, 'retry-final')).toThrow('database unavailable')
    expect(store.records).toHaveLength(0)
    expect(room.state).toEqual(before.state)
    expect(room.currentSeq()).toBe(before.seq)
    expect(room.events).toEqual(before.events)
    expect(room.frames).toEqual(before.frames)

    store.failWrites = false
    const retry = room.applyPlayerAction('p1', action, 'retry-final')
    expect(retry.result.ok).toBe(true)
    expect(room.state.stage).toBe('finished')
    expect(store.records).toHaveLength(1)
  })

  it('rejects a fourth player after the room is full', () => {
    const { room } = startedRoom('room_backend_full')
    expect(() => room.join('codex-d')).toThrow('Room is full')
  })
})
