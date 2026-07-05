import type { BidValue, GameAction } from '@djd/game-core'
import { parseCard } from '@djd/game-core'

export function normalizeBid(value: unknown): BidValue | 'pass' {
  if (value === 'pass') return 'pass'
  if (value === 0 || value === '0') return 0
  if (value === 1 || value === '1') return 1
  if (value === 2 || value === '2') return 2
  if (value === 3 || value === '3') return 3
  throw new Error('Bid must be pass, 0, 1, 2, or 3')
}

export function normalizeAction(body: Record<string, unknown>): GameAction {
  const type = body.type
  const expectedSeq = body.expectedSeq === undefined ? undefined : Number(body.expectedSeq)
  if (type === 'bid') {
    return {
      type: 'bid',
      bid: normalizeBid(body.bid),
      expectedSeq,
    }
  }
  if (type === 'pass') {
    return {
      type: 'pass',
      expectedSeq,
    }
  }
  if (type === 'play') {
    if (!Array.isArray(body.cards)) throw new Error('Play action requires cards array')
    const cards = body.cards.map((card) => {
      if (typeof card !== 'string') throw new Error('Card id must be a string')
      const parsed = parseCard(card)
      if (!parsed.ok || !parsed.value) throw new Error(parsed.error ?? `Invalid card id: ${card}`)
      return parsed.value.id
    })
    return {
      type: 'play',
      cards,
      expectedSeq,
    }
  }
  throw new Error('Unsupported action type')
}
