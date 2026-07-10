import type { GameAction, PlayerInfo, PlayerView, PublicStateView, ServerSeq } from './types'
import { parseCard } from './deck'

export const MAX_WS_MESSAGE_BYTES = 64 * 1024

export type SessionMode = 'join' | 'resume' | 'observe'

export type ClientMessage =
  | {
      type: 'session.open'
      mode: SessionMode
      roomId: string
      name?: string
      playerId?: string
      afterSeq: ServerSeq
    }
  | {
      type: 'action.submit'
      expectedSeq: ServerSeq
      idempotencyKey: string
      action: GameAction
    }
  | { type: 'state.get' }

export interface ServerEvent {
  seq: ServerSeq
  roomId: string
  type: string
  createdAt: string
  [key: string]: unknown
}

export type ControlMessage =
  | {
      type: 'session.accepted'
      mode: SessionMode
      roomId: string
      player?: PlayerInfo
      serverSeq: ServerSeq
    }
  | {
      type: 'sync.complete'
      serverSeq: ServerSeq
      pendingSeq?: ServerSeq
    }
  | {
      type: 'action.result'
      ok: true
      idempotencyKey: string
      acceptedSeq: ServerSeq
      serverSeq: ServerSeq
      applied: ServerEvent
    }
  | {
      type: 'state.snapshot'
      roomId: string
      snapshotSeq: ServerSeq
      state: PlayerView | PublicStateView
    }
  | {
      type: 'error'
      code: string
      message: string
      idempotencyKey?: string
    }

export type ServerMessage = ControlMessage | ServerEvent

function asRecord(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(message)
  return value as Record<string, unknown>
}

function requiredString(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} must be a non-empty string`)
  return value.trim()
}

function nonNegativeInteger(value: unknown, field: string) {
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`${field} must be a non-negative integer`)
  return parsed
}

function positiveInteger(value: unknown, field: string) {
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${field} must be a positive integer`)
  return parsed
}

function normalizeBid(value: unknown) {
  if (value === 'pass') return 'pass' as const
  const parsed = Number(value)
  if (parsed === 0 || parsed === 1 || parsed === 2 || parsed === 3) return parsed as 0 | 1 | 2 | 3
  throw new Error('action.bid must be pass, 0, 1, 2, or 3')
}

function normalizeGameAction(value: unknown, expectedSeq: ServerSeq): GameAction {
  const action = asRecord(value, 'action must be an object')
  if (action.type === 'bid') {
    return { type: 'bid', bid: normalizeBid(action.bid), expectedSeq }
  }
  if (action.type === 'pass') {
    return { type: 'pass', expectedSeq }
  }
  if (action.type === 'play') {
    if (!Array.isArray(action.cards)) throw new Error('action.cards must be an array')
    const cards = action.cards.map((card) => {
      if (typeof card !== 'string') throw new Error('card id must be a string')
      const parsed = parseCard(card)
      if (!parsed.ok || !parsed.value) throw new Error(parsed.error ?? `Invalid card id: ${card}`)
      return parsed.value.id
    })
    return { type: 'play', cards, expectedSeq }
  }
  throw new Error('Unsupported action type')
}

export function parseClientMessage(value: unknown): ClientMessage {
  const message = asRecord(value, 'WebSocket message must be a JSON object')
  if (message.type === 'session.open') {
    if (message.mode !== 'join' && message.mode !== 'resume' && message.mode !== 'observe') {
      throw new Error('session.open mode must be join, resume, or observe')
    }
    const roomId = requiredString(message.roomId, 'roomId')
    const afterSeq = nonNegativeInteger(message.afterSeq, 'afterSeq')
    if (message.mode === 'join') {
      return {
        type: 'session.open',
        mode: 'join',
        roomId,
        name: requiredString(message.name, 'name'),
        afterSeq,
      }
    }
    if (message.mode === 'resume') {
      return {
        type: 'session.open',
        mode: 'resume',
        roomId,
        playerId: requiredString(message.playerId, 'playerId'),
        afterSeq,
      }
    }
    return { type: 'session.open', mode: 'observe', roomId, afterSeq }
  }

  if (message.type === 'action.submit') {
    const expectedSeq = positiveInteger(message.expectedSeq, 'expectedSeq')
    return {
      type: 'action.submit',
      expectedSeq,
      idempotencyKey: requiredString(message.idempotencyKey, 'idempotencyKey'),
      action: normalizeGameAction(message.action, expectedSeq),
    }
  }

  if (message.type === 'state.get') return { type: 'state.get' }
  throw new Error('Unsupported WebSocket message type')
}

export function decodeClientMessage(source: string): ClientMessage {
  if (new TextEncoder().encode(source).byteLength > MAX_WS_MESSAGE_BYTES) {
    throw new Error(`WebSocket message exceeds ${MAX_WS_MESSAGE_BYTES} bytes`)
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(source)
  }
  catch {
    throw new Error('WebSocket message must be valid JSON')
  }
  return parseClientMessage(parsed)
}

export function isServerEvent(message: ServerMessage): message is ServerEvent {
  return 'seq' in message && typeof message.seq === 'number'
}
