import type { BidValue, GameState } from '@djd/game-core'

export function availableBids(state: GameState): Array<BidValue | 'pass'> {
  const bids: Array<BidValue | 'pass'> = ['pass']
  for (const bid of [1, 2, 3] as const) {
    if (bid > state.bid.current) bids.push(bid)
  }
  return bids
}
