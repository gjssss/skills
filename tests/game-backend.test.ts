import { describe, expect, it } from 'vitest'
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
  })
})
