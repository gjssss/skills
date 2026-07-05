import { describe, expect, it } from 'vitest'
import {
  type CardId,
  type GameState,
  applyAction,
  attachPending,
  canBeat,
  createWaitingState,
  identifyCombo,
  startBidding,
} from '../packages/game/core/src/index'

function expectCombo(cards: CardId[], kind: string) {
  const result = identifyCombo(cards)
  expect(result.ok, result.error).toBe(true)
  expect(result.value?.kind).toBe(kind)
  return result.value!
}

function playingState(overrides: Partial<GameState> = {}) {
  const state: GameState = {
    ...createWaitingState('room_test'),
    stage: 'playing',
    players: [
      { playerId: 'p1', name: 'a', seat: 0 },
      { playerId: 'p2', name: 'b', seat: 1 },
      { playerId: 'p3', name: 'c', seat: 2 },
    ],
    hands: {
      p1: ['S3', 'H3', 'D3', 'S4', 'H4'],
      p2: ['S5', 'H5', 'D5', 'S6'],
      p3: ['S7', 'H7', 'D7', 'S8'],
    },
    bottomCards: ['C9', 'D9', 'H9'],
    landlordId: 'p1',
    currentPlayerId: 'p1',
    trick: {
      passCount: 0,
      leadPlayerId: 'p1',
      bombsPlayed: 0,
    },
    ...overrides,
  }
  return attachPending(state, 10)
}

describe('Dou Dizhu combinations', () => {
  it('recognizes core legal combinations', () => {
    expectCombo(['S3'], 'single')
    expectCombo(['S3', 'H3'], 'pair')
    expectCombo(['S3', 'H3', 'D3'], 'trio')
    expectCombo(['S3', 'H3', 'D3', 'S4'], 'trio_solo')
    expectCombo(['S3', 'H3', 'D3', 'S4', 'H4'], 'trio_pair')
    expectCombo(['S3', 'S4', 'S5', 'S6', 'S7'], 'straight')
    expectCombo(['S3', 'H3', 'S4', 'H4', 'S5', 'H5'], 'pair_sequence')
    expectCombo(['S3', 'H3', 'D3', 'S4', 'H4', 'D4'], 'trio_sequence')
    expectCombo(['S3', 'H3', 'D3', 'S4', 'H4', 'D4', 'S5', 'S6'], 'plane_solo')
    expectCombo(['S3', 'H3', 'D3', 'S4', 'H4', 'D4', 'S5', 'H5', 'S6', 'H6'], 'plane_pair')
    expectCombo(['S3', 'H3', 'D3', 'C3'], 'bomb')
    expectCombo(['BJ', 'RJ'], 'rocket')
    expectCombo(['S3', 'H3', 'D3', 'C3', 'S4', 'S5'], 'four_two_solo')
    expectCombo(['S3', 'H3', 'D3', 'C3', 'S4', 'H4', 'S5', 'H5'], 'four_two_pair')
  })

  it('rejects edge cases that look close to legal hands', () => {
    expect(identifyCombo(['S10', 'SJ', 'SQ', 'SK', 'SA', 'S2']).ok).toBe(false)
    expect(identifyCombo(['S3', 'H3', 'S4', 'H4']).ok).toBe(false)
    expect(identifyCombo(['S3', 'H3', 'D3']).value?.kind).toBe('trio')
    expect(identifyCombo(['S3', 'H3', 'D3', 'C3', 'BJ', 'RJ']).ok).toBe(false)
  })

  it('compares by type, length, main rank, bombs, and rocket', () => {
    const single3 = expectCombo(['S3'], 'single')
    const single4 = expectCombo(['S4'], 'single')
    const pair4 = expectCombo(['S4', 'H4'], 'pair')
    const bomb3 = expectCombo(['S3', 'H3', 'D3', 'C3'], 'bomb')
    const bomb4 = expectCombo(['S4', 'H4', 'D4', 'C4'], 'bomb')
    const rocket = expectCombo(['BJ', 'RJ'], 'rocket')
    const fourTwo = expectCombo(['S3', 'H3', 'D3', 'C3', 'S4', 'S5'], 'four_two_solo')

    expect(canBeat(single4, single3)).toBe(true)
    expect(canBeat(pair4, single3)).toBe(false)
    expect(canBeat(bomb3, single4)).toBe(true)
    expect(canBeat(bomb4, bomb3)).toBe(true)
    expect(canBeat(rocket, bomb4)).toBe(true)
    expect(canBeat(fourTwo, single4)).toBe(false)
  })
})

describe('Dou Dizhu reducer validation', () => {
  it('rejects wrong player, wrong seq, cards outside hand, and leading pass', () => {
    const state = playingState()
    expect(applyAction(state, 'p2', { type: 'play', expectedSeq: 10, cards: ['S5'] }).ok).toBe(false)
    expect(applyAction(state, 'p1', { type: 'play', expectedSeq: 9, cards: ['S3'] }).ok).toBe(false)
    expect(applyAction(state, 'p1', { type: 'play', expectedSeq: 10, cards: ['S9'] }).ok).toBe(false)
    expect(applyAction(state, 'p1', { type: 'pass', expectedSeq: 10 }).ok).toBe(false)
  })

  it('returns the lead to the last player after two passes', () => {
    const first = applyAction(playingState(), 'p1', { type: 'play', expectedSeq: 10, cards: ['S3'] })
    expect(first.ok).toBe(true)
    const p2Pending = attachPending(first.value!, 11)
    const second = applyAction(p2Pending, 'p2', { type: 'pass', expectedSeq: 11 })
    expect(second.ok).toBe(true)
    const p3Pending = attachPending(second.value!, 12)
    const third = applyAction(p3Pending, 'p3', { type: 'pass', expectedSeq: 12 })
    expect(third.ok).toBe(true)
    expect(third.value?.currentPlayerId).toBe('p1')
    expect(third.value?.trick.lastPlay).toBeUndefined()
  })

  it('enforces increasing bids, ends on 3, and redeals after all pass', () => {
    const base = createWaitingState('room_bid')
    const state = startBidding({
      ...base,
      players: [
        { playerId: 'p1', name: 'a', seat: 0 },
        { playerId: 'p2', name: 'b', seat: 1 },
        { playerId: 'p3', name: 'c', seat: 2 },
      ],
    }, 42)

    const p1 = attachPending(state, 1)
    expect(applyAction(p1, 'p1', { type: 'bid', expectedSeq: 1, bid: 1 }).ok).toBe(true)
    const p2 = attachPending(applyAction(p1, 'p1', { type: 'bid', expectedSeq: 1, bid: 1 }).value!, 2)
    expect(applyAction(p2, 'p2', { type: 'bid', expectedSeq: 2, bid: 1 }).ok).toBe(false)
    const p2Win = applyAction(p2, 'p2', { type: 'bid', expectedSeq: 2, bid: 3 })
    expect(p2Win.ok).toBe(true)
    expect(p2Win.value?.stage).toBe('playing')
    expect(p2Win.value?.landlordId).toBe('p2')

    const a = applyAction(attachPending(state, 10), 'p1', { type: 'bid', expectedSeq: 10, bid: 'pass' }).value!
    const b = applyAction(attachPending(a, 11), 'p2', { type: 'bid', expectedSeq: 11, bid: 'pass' }).value!
    const c = applyAction(attachPending(b, 12), 'p3', { type: 'bid', expectedSeq: 12, bid: 'pass' })
    expect(c.ok).toBe(true)
    expect(c.value?.stage).toBe('bidding')
    expect(c.value?.bid.redeals).toBe(1)
  })
})
