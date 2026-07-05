export type ServerSeq = number
export type Suit = 'S' | 'H' | 'D' | 'C'
export type Rank =
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K'
  | 'A'
  | '2'
  | 'BJ'
  | 'RJ'
export type CardId = `${Suit}${Exclude<Rank, 'BJ' | 'RJ'>}` | 'BJ' | 'RJ'

export type PlayerRole = 'landlord' | 'farmer'
export type GameStage = 'waiting' | 'bidding' | 'playing' | 'finished'

export interface PlayerInfo {
  playerId: string
  name: string
  seat: number
}

export type BidValue = 0 | 1 | 2 | 3

export type GameAction =
  | { type: 'bid'; expectedSeq?: ServerSeq; bid: BidValue | 'pass' }
  | { type: 'play'; expectedSeq?: ServerSeq; cards: CardId[] }
  | { type: 'pass'; expectedSeq?: ServerSeq }

export type ComboKind =
  | 'single'
  | 'pair'
  | 'trio'
  | 'trio_solo'
  | 'trio_pair'
  | 'straight'
  | 'pair_sequence'
  | 'trio_sequence'
  | 'plane_solo'
  | 'plane_pair'
  | 'bomb'
  | 'rocket'
  | 'four_two_solo'
  | 'four_two_pair'

export interface CardCombo {
  kind: ComboKind
  cards: CardId[]
  primaryRank: Rank
  primaryValue: number
  length: number
  chainLength?: number
}

export interface PlayedTrick {
  playerId: string
  cards: CardId[]
  combo: CardCombo
}

export interface PendingAction {
  seq: ServerSeq
  type: 'bid.request' | 'turn.request'
  roomId: string
  playerId: string
  seat: number
  stage: Extract<GameStage, 'bidding' | 'playing'>
}

export interface GameState {
  roomId: string
  stage: GameStage
  players: PlayerInfo[]
  hands: Record<string, CardId[]>
  bottomCards: CardId[]
  landlordId?: string
  currentPlayerId?: string
  pending?: PendingAction
  bid: {
    current: BidValue
    highBidderId?: string
    consecutivePasses: number
    totalActions: number
    redeals: number
  }
  trick: {
    lastPlay?: PlayedTrick
    passCount: number
    leadPlayerId?: string
    bombsPlayed: number
  }
  finished?: {
    winner: 'landlord' | 'farmers'
    winnerPlayerId: string
    landlordId: string
    farmerIds: string[]
  }
}

export interface PlayerView {
  roomId: string
  stage: GameStage
  playerId: string
  seat: number
  role?: PlayerRole
  hand: CardId[]
  bottomCards: CardId[]
  players: Array<PlayerInfo & { handCount: number; role?: PlayerRole }>
  pending?: PendingAction
  currentBid: BidValue
  lastPlay?: PlayedTrick
  legalActions: LegalAction[]
  finished?: GameState['finished']
}

export type LegalAction =
  | { type: 'bid'; bid: BidValue | 'pass' }
  | ({ type: 'play' } & CardCombo)
  | { type: 'pass' }

export interface PublicStateView {
  roomId: string
  stage: GameStage
  players: Array<PlayerInfo & { handCount: number; role?: PlayerRole }>
  bottomCards: CardId[]
  landlordId?: string
  currentBid: BidValue
  pending?: PendingAction
  lastPlay?: PlayedTrick
  finished?: GameState['finished']
}

export interface ValidationResult<T = void> {
  ok: boolean
  value?: T
  error?: string
}
