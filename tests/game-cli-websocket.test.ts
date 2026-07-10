import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
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
import { startBunGameServer } from './helpers/bun-game-server'

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

describe('game CLI WebSocket client through a Bun subprocess', () => {
  it('preserves blocking join/action semantics through a complete seeded game', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'djd-game-cli-test-'))
    const dataFile = path.join(tempDir, 'sessions.sqlite')
    let server = await startBunGameServer({ seed: 7777, dataFile })
    let serverUrl = server.wsUrl
    const roomId = 'cli_full_game'

    try {
      let p1ResumeKey = ''
      let acceptP1!: () => void
      const p1Accepted = new Promise<void>((resolvePromise) => { acceptP1 = resolvePromise })
      const p1Join = joinRoom({
        server: serverUrl,
        roomId,
        mode: 'join',
        name: 'cli-a',
        afterSeq: 0,
        onAccepted: (accepted) => {
          p1ResumeKey = accepted.resumeKey ?? ''
          acceptP1()
        },
      })
      await p1Accepted
      expect(p1ResumeKey).toHaveLength(43)

      let p2ResumeKey = ''
      let acceptP2!: () => void
      const p2Accepted = new Promise<void>((resolvePromise) => { acceptP2 = resolvePromise })
      let p2NodePromise: Promise<{ next: ServerEvent }> = joinRoom({
        server: serverUrl,
        roomId,
        mode: 'join',
        name: 'cli-b',
        afterSeq: 0,
        onAccepted: (accepted) => {
          p2ResumeKey = accepted.resumeKey ?? ''
          acceptP2()
        },
      })
      await p2Accepted
      expect(p2ResumeKey).toHaveLength(43)

      let p3ResumeKey = ''
      let acceptP3!: () => void
      const p3Accepted = new Promise<void>((resolvePromise) => { acceptP3 = resolvePromise })
      let p3NodePromise: Promise<{ next: ServerEvent }> = joinRoom({
        server: serverUrl,
        roomId,
        mode: 'join',
        name: 'cli-c',
        afterSeq: 0,
        onAccepted: (accepted) => {
          p3ResumeKey = accepted.resumeKey ?? ''
          acceptP3()
        },
      })
      await p3Accepted
      expect(p3ResumeKey).toHaveLength(43)

      const beforeFinish = await fetch(`${server.httpUrl}/api/spectator/sessions`).then((response) => response.json()) as { total: number }
      expect(beforeFinish.total).toBe(0)

      const p1Bid = await p1Join
      expect(p1Bid.next).toMatchObject({ type: 'bid.request', playerId: 'p1' })
      let p1Node = (await submitAction({
        server: serverUrl,
        roomId,
        mode: 'resume',
        playerId: 'p1',
        resumeKey: p1ResumeKey,
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
          resumeKey: p1ResumeKey,
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
          resumeKey: p2ResumeKey,
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
          resumeKey: p3ResumeKey,
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
      expect(state.state).not.toHaveProperty('hands')

      const completed = await fetch(`${server.httpUrl}/api/spectator/sessions`).then((response) => response.json()) as {
        total: number
        items: Array<{ sessionId: string; finalSeq: number; trickCount: number }>
      }
      expect(completed.total).toBe(1)
      expect(completed.items[0]).toMatchObject({ finalSeq: events.toSeq, trickCount: 20 })
      const sessionId = completed.items[0]!.sessionId
      const detail = await fetch(`${server.httpUrl}/api/spectator/sessions/${sessionId}`).then((response) => response.json()) as {
        frames: Array<{ seq: number }>
        tricks: Array<{ index: number }>
      }
      expect(detail.frames.at(-1)?.seq).toBe(events.toSeq)
      expect(detail.tricks).toHaveLength(20)

      const unfinishedSocket = new WebSocket(serverUrl)
      await new Promise<void>((resolvePromise, rejectPromise) => {
        unfinishedSocket.addEventListener('open', () => resolvePromise(), { once: true })
        unfinishedSocket.addEventListener('error', () => rejectPromise(new Error('Unable to create unfinished room')), { once: true })
      })
      const unfinishedAccepted = new Promise<void>((resolvePromise) => {
        unfinishedSocket.addEventListener('message', (event) => {
          const message = JSON.parse(String(event.data)) as { type?: string }
          if (message.type === 'session.accepted') resolvePromise()
        })
      })
      unfinishedSocket.send(JSON.stringify({
        type: 'session.open',
        mode: 'join',
        roomId,
        name: 'new-session-player',
        afterSeq: 0,
      }))
      await unfinishedAccepted
      const liveBeforeRestart = await fetch(`${server.httpUrl}/api/spectator/rooms`).then((response) => response.json()) as {
        rooms: Array<{ roomId: string; stage: string; sessionId: string }>
      }
      expect(liveBeforeRestart.rooms).toEqual([
        expect.objectContaining({ roomId, stage: 'waiting' }),
      ])
      expect(liveBeforeRestart.rooms[0]?.sessionId).not.toBe(sessionId)
      unfinishedSocket.close(1000, 'test complete')

      await server.stop()
      server = await startBunGameServer({ seed: 7777, dataFile })
      serverUrl = server.wsUrl
      const afterRestartRooms = await fetch(`${server.httpUrl}/api/spectator/rooms`).then((response) => response.json()) as { rooms: unknown[] }
      expect(afterRestartRooms.rooms).toEqual([])
      const afterRestart = await fetch(`${server.httpUrl}/api/spectator/sessions/${sessionId}`)
      expect(afterRestart.status).toBe(200)
      expect((await afterRestart.json() as { sessionId: string }).sessionId).toBe(sessionId)
    }
    finally {
      await server.stop()
      await rm(tempDir, { recursive: true, force: true })
    }
  }, 15_000)
})
