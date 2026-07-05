import type { BidValue, CardCombo, CardId, GameAction, GameState, LegalAction, PlayerView, ServerSeq, ValidationResult } from './types'
import { sortCards } from './deck'
import { canBeat, identifyCombo } from './combo'
import { nextPlayerId, startBidding } from './state'

export function validatePlayAction(state: GameState, playerId: string, action: Extract<GameAction, { type: 'play' }>): ValidationResult<CardCombo> {
  if (state.stage !== 'playing') return { ok: false, error: 'Game is not in playing stage' }
  if (state.currentPlayerId !== playerId) return { ok: false, error: 'It is not this player turn' }
  if (action.cards.length === 0) return { ok: false, error: 'Play action requires cards' }

  const hand = state.hands[playerId] ?? []
  const handSet = new Set(hand)
  for (const card of action.cards) {
    if (!handSet.has(card)) return { ok: false, error: `Card is not in hand: ${card}` }
  }

  const identified = identifyCombo(action.cards)
  if (!identified.ok || !identified.value) return { ok: false, error: identified.error ?? 'Invalid card combination' }

  if (!canBeat(identified.value, state.trick.lastPlay?.combo)) {
    return { ok: false, error: 'Selected cards cannot beat the previous play' }
  }

  return { ok: true, value: identified.value }
}

export function validatePassAction(state: GameState, playerId: string): ValidationResult {
  if (state.stage !== 'playing') return { ok: false, error: 'Game is not in playing stage' }
  if (state.currentPlayerId !== playerId) return { ok: false, error: 'It is not this player turn' }
  if (!state.trick.lastPlay) return { ok: false, error: 'Lead player cannot pass' }
  if (state.trick.lastPlay.playerId === playerId) return { ok: false, error: 'Current leading player cannot pass' }
  return { ok: true }
}

export function validateBidAction(state: GameState, playerId: string, action: Extract<GameAction, { type: 'bid' }>): ValidationResult<BidValue> {
  if (state.stage !== 'bidding') return { ok: false, error: 'Game is not in bidding stage' }
  if (state.currentPlayerId !== playerId) return { ok: false, error: 'It is not this player turn' }
  const bid = action.bid === 'pass' ? 0 : action.bid
  if (![0, 1, 2, 3].includes(bid)) return { ok: false, error: 'Bid must be pass, 0, 1, 2, or 3' }
  if (bid !== 0 && bid <= state.bid.current) {
    return { ok: false, error: 'Bid must be higher than current bid' }
  }
  return { ok: true, value: bid as BidValue }
}

export function applyBid(state: GameState, playerId: string, bid: BidValue, seed = Date.now()): GameState {
  if (bid === 0) {
    const nextBid = {
      ...state.bid,
      consecutivePasses: state.bid.consecutivePasses + 1,
      totalActions: state.bid.totalActions + 1,
    }

    if (!state.bid.highBidderId && nextBid.totalActions >= state.players.length) {
      return startBidding({ ...state, bid: { ...nextBid, redeals: state.bid.redeals + 1 } }, seed, state.bid.redeals + 1)
    }

    if (state.bid.highBidderId && nextBid.consecutivePasses >= state.players.length - 1) {
      return startPlaying({ ...state, bid: nextBid }, state.bid.highBidderId)
    }

    return {
      ...state,
      bid: nextBid,
      currentPlayerId: nextPlayerId(state, playerId),
      pending: undefined,
    }
  }

  const nextBid = {
    ...state.bid,
    current: bid,
    highBidderId: playerId,
    consecutivePasses: 0,
    totalActions: state.bid.totalActions + 1,
  }

  if (bid === 3) {
    return startPlaying({ ...state, bid: nextBid }, playerId)
  }

  return {
    ...state,
    bid: nextBid,
    currentPlayerId: nextPlayerId(state, playerId),
    pending: undefined,
  }
}

export function startPlaying(state: GameState, landlordId: string): GameState {
  const landlordHand = state.hands[landlordId]
  if (!landlordHand) throw new Error(`Unknown landlord hand: ${landlordId}`)
  return {
    ...state,
    stage: 'playing',
    landlordId,
    currentPlayerId: landlordId,
    pending: undefined,
    hands: {
      ...state.hands,
      [landlordId]: sortCards([...landlordHand, ...state.bottomCards]),
    },
    trick: {
      passCount: 0,
      leadPlayerId: landlordId,
      bombsPlayed: state.trick.bombsPlayed,
    },
  }
}

export function applyPlay(state: GameState, playerId: string, comboValue: CardCombo): GameState {
  const remaining = (state.hands[playerId] ?? []).filter((card) => !comboValue.cards.includes(card))
  const hands = {
    ...state.hands,
    [playerId]: sortCards(remaining),
  }

  if (remaining.length === 0) {
    const landlordId = state.landlordId
    if (!landlordId) throw new Error('Missing landlord')
    const landlordWon = playerId === landlordId
    return {
      ...state,
      stage: 'finished',
      hands,
      currentPlayerId: undefined,
      pending: undefined,
      trick: {
        ...state.trick,
        lastPlay: { playerId, cards: comboValue.cards, combo: comboValue },
        bombsPlayed: state.trick.bombsPlayed + (comboValue.kind === 'bomb' || comboValue.kind === 'rocket' ? 1 : 0),
      },
      finished: {
        winner: landlordWon ? 'landlord' : 'farmers',
        winnerPlayerId: playerId,
        landlordId,
        farmerIds: state.players.filter((player) => player.playerId !== landlordId).map((player) => player.playerId),
      },
    }
  }

  return {
    ...state,
    hands,
    currentPlayerId: nextPlayerId(state, playerId),
    pending: undefined,
    trick: {
      lastPlay: { playerId, cards: comboValue.cards, combo: comboValue },
      passCount: 0,
      leadPlayerId: playerId,
      bombsPlayed: state.trick.bombsPlayed + (comboValue.kind === 'bomb' || comboValue.kind === 'rocket' ? 1 : 0),
    },
  }
}

export function applyPass(state: GameState, playerId: string): GameState {
  const lastPlay = state.trick.lastPlay
  if (!lastPlay) throw new Error('Cannot pass without last play')
  const passCount = state.trick.passCount + 1
  if (passCount >= state.players.length - 1) {
    return {
      ...state,
      currentPlayerId: lastPlay.playerId,
      pending: undefined,
      trick: {
        ...state.trick,
        lastPlay: undefined,
        passCount: 0,
        leadPlayerId: lastPlay.playerId,
      },
    }
  }

  return {
    ...state,
    currentPlayerId: nextPlayerId(state, playerId),
    pending: undefined,
    trick: {
      ...state.trick,
      passCount,
    },
  }
}

export function validateExpectedSeq(state: GameState, playerId: string, expectedSeq?: ServerSeq): ValidationResult {
  if (!state.pending) return { ok: false, error: 'No pending action' }
  if (state.pending.playerId !== playerId) return { ok: false, error: 'Pending action belongs to another player' }
  if (expectedSeq !== undefined && expectedSeq !== state.pending.seq) {
    return { ok: false, error: `Expected seq ${expectedSeq} does not match pending seq ${state.pending.seq}` }
  }
  return { ok: true }
}

export function applyAction(state: GameState, playerId: string, action: GameAction, seed = Date.now()): ValidationResult<GameState> {
  const seqCheck = validateExpectedSeq(state, playerId, action.expectedSeq)
  if (!seqCheck.ok) return { ok: false, error: seqCheck.error }

  if (action.type === 'bid') {
    const bidCheck = validateBidAction(state, playerId, action)
    if (!bidCheck.ok || bidCheck.value === undefined) return { ok: false, error: bidCheck.error }
    return { ok: true, value: applyBid(state, playerId, bidCheck.value, seed) }
  }

  if (action.type === 'pass') {
    const passCheck = validatePassAction(state, playerId)
    if (!passCheck.ok) return { ok: false, error: passCheck.error }
    return { ok: true, value: applyPass(state, playerId) }
  }

  const playCheck = validatePlayAction(state, playerId, action)
  if (!playCheck.ok || !playCheck.value) return { ok: false, error: playCheck.error }
  return { ok: true, value: applyPlay(state, playerId, playCheck.value) }
}

export function getLegalActions(view: PlayerView): LegalAction[] {
  if (!view.pending || view.pending.playerId !== view.playerId) return []

  if (view.pending.type === 'bid.request') {
    const bids: LegalAction[] = [{ type: 'bid', bid: 'pass' }]
    for (const bid of [1, 2, 3] as const) {
      if (bid > view.currentBid) bids.push({ type: 'bid', bid })
    }
    return bids
  }

  const actions: LegalAction[] = []
  if (view.lastPlay && view.lastPlay.playerId !== view.playerId) {
    actions.push({ type: 'pass' })
  }

  for (const subset of enumerateCardSubsets(view.hand)) {
    const identified = identifyCombo(subset)
    if (identified.ok && identified.value && canBeat(identified.value, view.lastPlay?.combo)) {
      actions.push({ type: 'play', ...identified.value })
    }
  }

  return actions.sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type)
    if (a.type !== 'play' || b.type !== 'play') return 0
    if (a.length !== b.length) return a.length - b.length
    return a.primaryValue - b.primaryValue
  })
}

export function enumerateCardSubsets(cards: CardId[]): CardId[][] {
  const sorted = sortCards(cards)
  const subsets: CardId[][] = []
  const total = 1 << sorted.length
  for (let mask = 1; mask < total; mask += 1) {
    const subset: CardId[] = []
    for (let i = 0; i < sorted.length; i += 1) {
      if ((mask & (1 << i)) !== 0) {
        const card = sorted[i]
        if (card) subset.push(card)
      }
    }
    subsets.push(subset)
  }
  return subsets
}
