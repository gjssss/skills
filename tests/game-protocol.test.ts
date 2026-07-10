import { describe, expect, it } from 'vitest'
import {
  MAX_WS_MESSAGE_BYTES,
  decodeClientMessage,
  parseClientMessage,
} from '../packages/game/core/src/index'

describe('game WebSocket protocol', () => {
  it('normalizes session and action messages', () => {
    expect(parseClientMessage({
      type: 'session.open',
      mode: 'join',
      roomId: ' room_a ',
      name: ' codex-a ',
      afterSeq: 0,
    })).toEqual({
      type: 'session.open',
      mode: 'join',
      roomId: 'room_a',
      name: 'codex-a',
      afterSeq: 0,
    })

    expect(parseClientMessage({
      type: 'action.submit',
      expectedSeq: 7,
      idempotencyKey: 'action-7',
      action: { type: 'play', cards: ['S3'] },
    })).toEqual({
      type: 'action.submit',
      expectedSeq: 7,
      idempotencyKey: 'action-7',
      action: { type: 'play', cards: ['S3'], expectedSeq: 7 },
    })
  })

  it('rejects invalid modes, unknown messages, and invalid cards', () => {
    expect(() => parseClientMessage({
      type: 'session.open',
      mode: 'listen',
      roomId: 'room_a',
      afterSeq: 0,
    })).toThrow(/mode/)
    expect(() => parseClientMessage({ type: 'ready' })).toThrow(/Unsupported/)
    expect(() => parseClientMessage({
      type: 'action.submit',
      expectedSeq: 1,
      idempotencyKey: 'bad-card',
      action: { type: 'play', cards: ['X9'] },
    })).toThrow(/Invalid card|Unsupported card/)
  })

  it('rejects invalid JSON and oversized frames', () => {
    expect(() => decodeClientMessage('{')).toThrow(/valid JSON/)
    const oversized = JSON.stringify({ type: 'state.get', padding: 'x'.repeat(MAX_WS_MESSAGE_BYTES) })
    expect(() => decodeClientMessage(oversized)).toThrow(/exceeds/)
  })
})
