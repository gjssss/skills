import type { CardCombo, CardId, ComboKind, Rank, ValidationResult } from './types'
import { cardRank, CHAIN_RANKS, parseCard, rankValue, sortCards } from './deck'

function countRanks(cards: CardId[]): Map<Rank, CardId[]> {
  const counts = new Map<Rank, CardId[]>()
  for (const card of cards) {
    const rank = cardRank(card)
    const list = counts.get(rank) ?? []
    list.push(card)
    counts.set(rank, list)
  }
  return counts
}

function uniqueRanksByCount(cards: CardId[], count: number): Rank[] {
  return [...countRanks(cards).entries()]
    .filter(([, list]) => list.length === count)
    .map(([rank]) => rank)
    .sort((a, b) => rankValue(a) - rankValue(b))
}

function isConsecutive(ranks: Rank[]): boolean {
  if (ranks.length === 0) return false
  return ranks.every((rank) => CHAIN_RANKS.includes(rank))
    && ranks.every((rank, index) => index === 0 || rankValue(rank) === rankValue(ranks[index - 1] as Rank) + 1)
}

function combo(kind: ComboKind, cards: CardId[], primaryRank: Rank, chainLength?: number): CardCombo {
  return {
    kind,
    cards: sortCards(cards),
    primaryRank,
    primaryValue: rankValue(primaryRank),
    length: cards.length,
    chainLength,
  }
}

function hasDuplicateCards(cards: CardId[]): boolean {
  return new Set(cards).size !== cards.length
}

function hasBothJokers(cards: CardId[]): boolean {
  return cards.includes('BJ') && cards.includes('RJ')
}

function findConsecutiveTripleRun(counts: Map<Rank, CardId[]>, runLength: number): Rank[] | undefined {
  const tripleRanks = [...counts.entries()]
    .filter(([rank, list]) => CHAIN_RANKS.includes(rank) && list.length === 3)
    .map(([rank]) => rank)
    .sort((a, b) => rankValue(a) - rankValue(b))

  for (let start = 0; start <= tripleRanks.length - runLength; start += 1) {
    const candidate = tripleRanks.slice(start, start + runLength)
    if (candidate.length === runLength && isConsecutive(candidate)) return candidate
  }
  return undefined
}

export function identifyCombo(input: CardId[]): ValidationResult<CardCombo> {
  const cards = sortCards(input)
  if (cards.length === 0) return { ok: false, error: 'No cards selected' }
  if (hasDuplicateCards(cards)) return { ok: false, error: 'Duplicate cards selected' }

  for (const card of cards) {
    const parsed = parseCard(card)
    if (!parsed.ok) return { ok: false, error: parsed.error }
  }

  const counts = countRanks(cards)
  const entries = [...counts.entries()]
  const ranks = entries.map(([rank]) => rank).sort((a, b) => rankValue(a) - rankValue(b))
  const highest = ranks[ranks.length - 1]
  if (!highest) return { ok: false, error: 'No ranks selected' }

  if (cards.length === 2 && cards.includes('BJ') && cards.includes('RJ')) {
    return { ok: true, value: combo('rocket', cards, 'RJ') }
  }

  if (cards.length === 1) {
    return { ok: true, value: combo('single', cards, cardRank(cards[0] as CardId)) }
  }

  if (cards.length === 2 && entries.length === 1 && highest !== 'BJ' && highest !== 'RJ') {
    return { ok: true, value: combo('pair', cards, highest) }
  }

  if (cards.length === 3 && entries.length === 1 && highest !== 'BJ' && highest !== 'RJ') {
    return { ok: true, value: combo('trio', cards, highest) }
  }

  if (cards.length === 4) {
    const trioRank = uniqueRanksByCount(cards, 3)[0]
    if (trioRank) return { ok: true, value: combo('trio_solo', cards, trioRank) }
    if (entries.length === 1 && highest !== 'BJ' && highest !== 'RJ') {
      return { ok: true, value: combo('bomb', cards, highest) }
    }
  }

  if (cards.length === 5) {
    const trioRank = uniqueRanksByCount(cards, 3)[0]
    const pairRank = uniqueRanksByCount(cards, 2)[0]
    if (trioRank && pairRank && pairRank !== 'BJ' && pairRank !== 'RJ') {
      return { ok: true, value: combo('trio_pair', cards, trioRank) }
    }
  }

  if (cards.length >= 5 && entries.every(([, list]) => list.length === 1) && isConsecutive(ranks)) {
    return { ok: true, value: combo('straight', cards, highest, cards.length) }
  }

  if (cards.length >= 6 && cards.length % 2 === 0 && entries.every(([, list]) => list.length === 2) && isConsecutive(ranks)) {
    if (ranks.length >= 3) return { ok: true, value: combo('pair_sequence', cards, highest, ranks.length) }
  }

  if (cards.length >= 6 && cards.length % 3 === 0 && entries.every(([, list]) => list.length === 3) && isConsecutive(ranks)) {
    if (ranks.length >= 2) return { ok: true, value: combo('trio_sequence', cards, highest, ranks.length) }
  }

  if (cards.length >= 8 && cards.length % 4 === 0) {
    const runLength = cards.length / 4
    if (runLength >= 2) {
      const run = findConsecutiveTripleRun(counts, runLength)
      if (run) {
        const wings = cards.filter((card) => !run.includes(cardRank(card)))
        const wingCounts = countRanks(wings)
        const hasAttachmentBomb = [...wingCounts.values()].some((list) => list.length === 4)
        if (wings.length === runLength && !hasAttachmentBomb && !hasBothJokers(wings)) {
          const top = run[run.length - 1]
          if (top) return { ok: true, value: combo('plane_solo', cards, top, runLength) }
        }
      }
    }
  }

  if (cards.length >= 10 && cards.length % 5 === 0) {
    const runLength = cards.length / 5
    if (runLength >= 2) {
      const run = findConsecutiveTripleRun(counts, runLength)
      if (run) {
        const wings = cards.filter((card) => !run.includes(cardRank(card)))
        const wingEntries = [...countRanks(wings).entries()]
        if (
          wings.length === runLength * 2
          && wingEntries.length === runLength
          && wingEntries.every(([rank, list]) => list.length === 2 && rank !== 'BJ' && rank !== 'RJ')
        ) {
          const top = run[run.length - 1]
          if (top) return { ok: true, value: combo('plane_pair', cards, top, runLength) }
        }
      }
    }
  }

  if (cards.length === 6) {
    const fourRank = uniqueRanksByCount(cards, 4)[0]
    if (fourRank) {
      const wings = cards.filter((card) => cardRank(card) !== fourRank)
      if (!hasBothJokers(wings)) {
        return { ok: true, value: combo('four_two_solo', cards, fourRank) }
      }
    }
  }

  if (cards.length === 8) {
    const fourRank = uniqueRanksByCount(cards, 4)[0]
    if (fourRank) {
      const wings = cards.filter((card) => cardRank(card) !== fourRank)
      const wingEntries = [...countRanks(wings).entries()]
      if (
        wingEntries.length === 2
        && wingEntries.every(([rank, list]) => list.length === 2 && rank !== 'BJ' && rank !== 'RJ')
      ) {
        return { ok: true, value: combo('four_two_pair', cards, fourRank) }
      }
    }
  }

  return { ok: false, error: 'Invalid card combination' }
}

export function canBeat(candidate: CardCombo, previous?: CardCombo): boolean {
  if (!previous) return true
  if (candidate.kind === 'rocket') return previous.kind !== 'rocket'
  if (previous.kind === 'rocket') return false
  if (candidate.kind === 'bomb' && previous.kind !== 'bomb') return true
  if (previous.kind === 'bomb' && candidate.kind !== 'bomb') return false
  if (candidate.kind !== previous.kind || candidate.length !== previous.length) return false
  if (candidate.chainLength !== previous.chainLength) return false
  return candidate.primaryValue > previous.primaryValue
}
