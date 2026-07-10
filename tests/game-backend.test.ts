import { describe, expect, it } from 'vitest'
import { createPlayerView } from '../packages/game/core/src/index'
import { GameRoom } from '../packages/game/backend/src/room'
import { projectEvent } from '../packages/game/backend/src/websocket'

function startedRoom(roomId: string, seed = 42) {
  const room = new GameRoom(roomId, seed)
  const first = room.join('codex-a')
  room.join('codex-b')
  room.join('codex-c')
  return { room, first, pending: room.state.pending! }
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
  })

  it('rejects a fourth player after the room is full', () => {
    const { room } = startedRoom('room_backend_full')
    expect(() => room.join('codex-d')).toThrow('Room is full')
  })
})
