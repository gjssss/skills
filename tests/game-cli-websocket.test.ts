import { createServer } from 'node:net'
import { describe, expect, it } from 'vitest'
import type { ServerEvent } from '../packages/game/core/src/index'
import {
  asHttpUrl,
  asWebSocketUrl,
  fetchEvents,
  fetchState,
  joinRoom,
  submitAction,
} from '../packages/game/cli/src/ws'

const describeWithBun = typeof globalThis.Bun === 'undefined' ? describe.skip : describe

async function freePort() {
  const server = createServer()
  await new Promise<void>((resolvePromise, rejectPromise) => {
    server.once('error', rejectPromise)
    server.listen(0, '127.0.0.1', resolvePromise)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Unable to allocate test port')
  await new Promise<void>((resolvePromise, rejectPromise) => {
    server.close((error) => error ? rejectPromise(error) : resolvePromise())
  })
  return address.port
}

function seq(event: ServerEvent) {
  return Number(event.seq)
}

function hand(event: ServerEvent) {
  if (!Array.isArray(event.hand)) throw new Error(`Expected private hand in ${event.type}`)
  return event.hand as string[]
}

describe('game CLI URL normalization', () => {
  it('normalizes server URLs', () => {
    expect(asWebSocketUrl('http://127.0.0.1:8787')).toBe('ws://127.0.0.1:8787/ws')
    expect(asWebSocketUrl('wss://game.example.com/old?x=1')).toBe('wss://game.example.com/ws')
    expect(asHttpUrl('ws://127.0.0.1:8787/ws')).toBe('http://127.0.0.1:8787')
  })

})

describeWithBun('game CLI WebSocket client', () => {
  it('preserves blocking join/action semantics through a complete seeded game', async () => {
    const { startGameServer } = await import('../packages/game/backend/src/server')
    const port = await freePort()
    const server = startGameServer({ host: '127.0.0.1', port, seed: 7777, log: false })
    const serverUrl = `ws://127.0.0.1:${port}/ws`
    const roomId = 'cli_full_game'

    try {
      let acceptP1!: () => void
      const p1Accepted = new Promise<void>((resolvePromise) => { acceptP1 = resolvePromise })
      const p1Join = joinRoom({
        server: serverUrl,
        roomId,
        mode: 'join',
        name: 'cli-a',
        afterSeq: 0,
        onAccepted: acceptP1,
      })
      await p1Accepted

      let acceptP2!: () => void
      const p2Accepted = new Promise<void>((resolvePromise) => { acceptP2 = resolvePromise })
      let p2NodePromise: Promise<{ next: ServerEvent }> = joinRoom({
        server: serverUrl,
        roomId,
        mode: 'join',
        name: 'cli-b',
        afterSeq: 0,
        onAccepted: acceptP2,
      })
      await p2Accepted

      let p3NodePromise: Promise<{ next: ServerEvent }> = joinRoom({
        server: serverUrl,
        roomId,
        mode: 'join',
        name: 'cli-c',
        afterSeq: 0,
      })

      const p1Bid = await p1Join
      expect(p1Bid.next).toMatchObject({ type: 'bid.request', playerId: 'p1' })
      let p1Node = (await submitAction({
        server: serverUrl,
        roomId,
        mode: 'resume',
        playerId: 'p1',
        afterSeq: seq(p1Bid.next),
        idempotencyKey: 'p1-bid-three',
        action: { type: 'bid', bid: 3, expectedSeq: seq(p1Bid.next) },
      })).next
      expect(p1Node).toMatchObject({ type: 'turn.request', playerId: 'p1' })

      let tricks = 0
      while (p1Node.type !== 'game.finished') {
        tricks += 1
        const card = hand(p1Node)[0]
        const p1Play = submitAction({
          server: serverUrl,
          roomId,
          mode: 'resume',
          playerId: 'p1',
          afterSeq: seq(p1Node),
          idempotencyKey: `p1-play-${tricks}`,
          action: { type: 'play', cards: [card], expectedSeq: seq(p1Node) },
        })

        const p2Node = (await p2NodePromise).next
        if (p2Node.type === 'game.finished') {
          expect((await p3NodePromise).next.type).toBe('game.finished')
          p1Node = (await p1Play).next
          break
        }
        p2NodePromise = submitAction({
          server: serverUrl,
          roomId,
          mode: 'resume',
          playerId: 'p2',
          afterSeq: seq(p2Node),
          idempotencyKey: `p2-pass-${tricks}`,
          action: { type: 'pass', expectedSeq: seq(p2Node) },
        })

        const p3Node = (await p3NodePromise).next
        if (p3Node.type === 'game.finished') {
          expect((await p2NodePromise).next.type).toBe('game.finished')
          p1Node = (await p1Play).next
          break
        }
        p3NodePromise = submitAction({
          server: serverUrl,
          roomId,
          mode: 'resume',
          playerId: 'p3',
          afterSeq: seq(p3Node),
          idempotencyKey: `p3-pass-${tricks}`,
          action: { type: 'pass', expectedSeq: seq(p3Node) },
        })

        p1Node = (await p1Play).next
      }

      expect(p1Node.type).toBe('game.finished')
      expect(tricks).toBe(20)

      const events = await fetchEvents({ server: serverUrl, roomId, mode: 'observe', afterSeq: 0 })
      expect(events.events.at(-1)?.type).toBe('game.finished')
      expect(events.events.filter((event) => event.type === 'turn.request').every((event) => !('hand' in event))).toBe(true)

      const state = await fetchState({ server: serverUrl, roomId, mode: 'observe', afterSeq: events.toSeq })
      expect(state.state).toMatchObject({ stage: 'finished' })
      expect(state.state).not.toHaveProperty('hand')
    }
    finally {
      await server.stop(true)
    }
  }, 15_000)
})
