import type { CardId, PlayerInfo, Rank, Suit, ValidationResult } from './types'

export const RANKS: Rank[] = [
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
  'A',
  '2',
  'BJ',
  'RJ',
]

export const CHAIN_RANKS: Rank[] = [
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
  'A',
]

export const FULL_DECK: CardId[] = [
  ...(['S', 'H', 'D', 'C'] as const).flatMap((suit) =>
    RANKS.filter((rank) => rank !== 'BJ' && rank !== 'RJ').map(
      (rank) => `${suit}${rank}` as CardId,
    ),
  ),
  'BJ',
  'RJ',
]

export function rankValue(rank: Rank): number {
  return RANKS.indexOf(rank)
}

export function parseCard(card: string): ValidationResult<{ id: CardId; rank: Rank; suit?: Suit }> {
  if (card === 'BJ' || card === 'RJ') {
    return { ok: true, value: { id: card, rank: card } }
  }

  const suit = card.slice(0, 1) as Suit
  const rank = card.slice(1) as Rank
  if (!['S', 'H', 'D', 'C'].includes(suit) || !RANKS.includes(rank) || rank === 'BJ' || rank === 'RJ') {
    return { ok: false, error: `Invalid card id: ${card}` }
  }

  return { ok: true, value: { id: card as CardId, rank, suit } }
}

export function cardRank(card: CardId): Rank {
  if (card === 'BJ' || card === 'RJ') return card
  return card.slice(1) as Rank
}

export function sortCards(cards: CardId[]): CardId[] {
  return [...cards].sort((a, b) => {
    const byRank = rankValue(cardRank(a)) - rankValue(cardRank(b))
    return byRank === 0 ? a.localeCompare(b) : byRank
  })
}

export function createSeededRandom(seed = Date.now()): () => number {
  let state = Math.trunc(seed) >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

export function shuffleDeck(seed = Date.now()): CardId[] {
  const random = createSeededRandom(seed)
  const deck = [...FULL_DECK]
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    const left = deck[i]
    const right = deck[j]
    if (left === undefined || right === undefined) continue
    deck[i] = right
    deck[j] = left
  }
  return deck
}

export function dealCards(players: PlayerInfo[], seed = Date.now()) {
  const deck = shuffleDeck(seed)
  const hands: Record<string, CardId[]> = {}
  for (const player of players) {
    hands[player.playerId] = sortCards(deck.slice(player.seat * 17, player.seat * 17 + 17))
  }

  return {
    hands,
    bottomCards: sortCards(deck.slice(51)),
  }
}
