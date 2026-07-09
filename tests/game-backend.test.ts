import { describe, expect, it } from 'vitest'
import { createPlayerView } from '../packages/game/core/src/index'
import { GameRoom } from '../packages/game/backend/src/index'

describe('GameRoom backend flow', () => {
  it('blocks join until the first action node and rejects invalid actors', async () => {
    const room = new GameRoom('room_backend', 42)
    const firstJoin = room.joinAndWait('codex-a')
    room.join('codex-b')
    room.join('codex-c')

    const joined = await firstJoin
    expect(joined.ok).toBe(true)
    expect(joined.joined.playerId).toBe('p1')
    expect(joined.next.type).toBe('bid.request')
    expect(joined.next.playerId).toBe('p1')
    expect(joined.next.hand).toHaveLength(17)
    expect(joined.next.availableBids).toEqual(['pass', 1, 2, 3])
    expect(joined.next).not.toHaveProperty('legalActions')

    await expect(room.applyPlayerAction('p2', {
      type: 'bid',
      bid: 1,
      expectedSeq: joined.next.seq,
    })).rejects.toThrow(/another player|turn/)
  })

  it('accepts a legal bid and exposes state and events', async () => {
    const room = new GameRoom('room_backend_action', 7)
    const firstJoin = room.joinAndWait('codex-a')
    room.join('codex-b')
    room.join('codex-c')
    const joined = await firstJoin

    const response = await room.applyPlayerAction('p1', {
      type: 'bid',
      bid: 3,
      expectedSeq: joined.next.seq,
    })

    expect(response.ok).toBe(true)
    expect(response.next.type).toBe('turn.request')
    expect(response.next.playerId).toBe('p1')
    expect(room.state.stage).toBe('playing')
    expect(room.state.landlordId).toBe('p1')
    expect(room.state.hands.p1).toHaveLength(20)
    expect(room.getEvents(0).map((event) => event.seq)).toEqual(
      Array.from({ length: room.currentSeq() }, (_, index) => index + 1),
    )
    expect(response.next).not.toHaveProperty('legalActions')
    expect(createPlayerView(room.state, 'p1')).not.toHaveProperty('legalActions')
  })

  it('returns cached response for repeated idempotent payloads', async () => {
    const room = new GameRoom('room_backend_idempotent', 11)
    const firstJoin = room.joinAndWait('codex-a')
    room.join('codex-b')
    room.join('codex-c')
    const joined = await firstJoin

    const action = {
      type: 'bid' as const,
      bid: 3 as const,
      expectedSeq: joined.next.seq as number,
    }
    const first = await room.applyPlayerAction('p1', action, 'same-action')
    const second = await room.applyPlayerAction('p1', action, 'same-action')

    expect(second).toBe(first)
    expect(room.getEvents(0).filter((event) => event.type === 'action.accepted')).toHaveLength(1)
  })

  it('rejects reused idempotency keys with different nested action payloads', async () => {
    const room = new GameRoom('room_backend_idempotent_mismatch', 12)
    const firstJoin = room.joinAndWait('codex-a')
    room.join('codex-b')
    room.join('codex-c')
    const joined = await firstJoin

    await room.applyPlayerAction('p1', {
      type: 'bid',
      bid: 3,
      expectedSeq: joined.next.seq,
    }, 'reused-key')

    await expect(room.applyPlayerAction('p1', {
      type: 'bid',
      bid: 2,
      expectedSeq: joined.next.seq,
    }, 'reused-key')).rejects.toThrow('Idempotency key payload mismatch')
  })
})
