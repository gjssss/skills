import { describe, expect, it } from 'vitest'
import { startBunGameServer } from './helpers/bun-game-server'

interface WireMessage {
  type: string
  [key: string]: unknown
}

class TestClient {
  readonly messages: WireMessage[] = []
  closeEvent?: CloseEvent
  private readonly closed: Promise<CloseEvent>

  private constructor(readonly socket: WebSocket) {
    this.closed = new Promise((resolvePromise) => {
      socket.addEventListener('close', (event) => {
        this.closeEvent = event
        resolvePromise(event)
      }, { once: true })
    })
    socket.addEventListener('message', (event) => {
      this.messages.push(JSON.parse(String(event.data)) as WireMessage)
    })
  }

  static async connect(url: string) {
    const socket = new WebSocket(url)
    const client = new TestClient(socket)
    await new Promise<void>((resolvePromise, rejectPromise) => {
      socket.addEventListener('open', () => resolvePromise(), { once: true })
      socket.addEventListener('error', () => rejectPromise(new Error('WebSocket connection failed')), { once: true })
    })
    return client
  }

  send(message: Record<string, unknown>) {
    this.socket.send(JSON.stringify(message))
  }

  async waitFor(predicate: (message: WireMessage) => boolean, afterIndex = 0) {
    const deadline = Date.now() + 3000
    while (Date.now() < deadline) {
      const found = this.messages.slice(afterIndex).find(predicate)
      if (found) return found
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 5))
    }
    throw new Error(`Timed out waiting for message. Received: ${JSON.stringify(this.messages)}`)
  }

  close() {
    this.socket.close(1000, 'test complete')
  }

  waitForClose() {
    return this.closed
  }
}

describe('game WebSocket transport through a Bun subprocess', () => {
  it('supports joins, private projection, actions, replay, state, and idempotency', async () => {
    const server = await startBunGameServer({ seed: 42 })
    const { wsUrl, httpUrl } = server
    const clients: TestClient[] = []

    try {
      const health = await fetch(`${httpUrl}/api/health`).then((response) => response.json()) as WireMessage
      expect(health).toMatchObject({ ok: true, transport: 'websocket' })
      expect((await fetch(`${httpUrl}/rooms/missing/state`)).status).toBe(404)

      const p1 = await TestClient.connect(wsUrl)
      const p2 = await TestClient.connect(wsUrl)
      const p3 = await TestClient.connect(wsUrl)
      clients.push(p1, p2, p3)

      p1.send({ type: 'session.open', mode: 'join', roomId: 'room_ws', name: 'a', afterSeq: 0 })
      const p1Session = await p1.waitFor((message) => message.type === 'session.accepted')
      p2.send({ type: 'session.open', mode: 'join', roomId: 'room_ws', name: 'b', afterSeq: 0 })
      const p2Session = await p2.waitFor((message) => message.type === 'session.accepted')
      p3.send({ type: 'session.open', mode: 'join', roomId: 'room_ws', name: 'c', afterSeq: 0 })
      await p3.waitFor((message) => message.type === 'session.accepted')

      expect(p1Session.player).toMatchObject({ playerId: 'p1', seat: 0 })
      expect(p1Session.resumeKey).toEqual(expect.any(String))
      expect(String(p1Session.resumeKey)).toHaveLength(43)
      expect(p2Session.resumeKey).toEqual(expect.any(String))
      const firstTurn = await p1.waitFor((message) => message.type === 'bid.request' && message.playerId === 'p1')
      const publicFirstTurn = await p2.waitFor((message) => message.type === 'bid.request' && message.seq === firstTurn.seq)
      expect(firstTurn.hand).toHaveLength(17)
      expect(firstTurn.availableBids).toEqual(['pass', 1, 2, 3])
      expect(publicFirstTurn).not.toHaveProperty('hand')
      expect(publicFirstTurn).not.toHaveProperty('availableBids')
      expect(p1.messages.filter((message) => typeof message.seq === 'number').map((message) => message.seq)).toEqual([1, 2, 3, 4, 5, 6])

      const roomList = await fetch(`${httpUrl}/api/spectator/rooms`).then((response) => response.json()) as {
        rooms: Array<{ roomId: string; stage: string }>
      }
      expect(roomList.rooms).toEqual(expect.arrayContaining([
        expect.objectContaining({ roomId: 'room_ws', stage: 'bidding' }),
      ]))
      const globalFrame = await fetch(`${httpUrl}/api/spectator/rooms/room_ws`).then((response) => response.json()) as {
        bottomCards: unknown[]
        players: Array<{ hand: unknown[] }>
      }
      expect(globalFrame.bottomCards).toHaveLength(3)
      expect(globalFrame.players.map((player) => player.hand.length)).toEqual([17, 17, 17])

      const spectator = await TestClient.connect(`${wsUrl}/spectator`)
      clients.push(spectator)
      spectator.send({
        type: 'spectator.subscribe',
        scope: 'room',
        roomId: 'room_ws',
        afterSeq: Number(firstTurn.seq),
      })
      const spectatorSnapshot = await spectator.waitFor((message) => message.type === 'room.snapshot')
      expect((spectatorSnapshot.frame as { players: Array<{ hand: unknown[] }> }).players.map((player) => player.hand.length)).toEqual([17, 17, 17])

      const firstActionIndex = p1.messages.length
      p1.send({
        type: 'action.submit',
        expectedSeq: firstTurn.seq,
        idempotencyKey: 'bid-three',
        action: { type: 'bid', bid: 3 },
      })
      const actionResult = await p1.waitFor((message) => message.type === 'action.result', firstActionIndex)
      const landlordTurn = await p1.waitFor(
        (message) => message.type === 'turn.request' && Number(message.seq) > Number(actionResult.acceptedSeq),
        firstActionIndex,
      )
      expect(p1.messages.indexOf(actionResult)).toBeLessThan(p1.messages.indexOf(landlordTurn))
      expect(landlordTurn.playerId).toBe('p1')
      expect(landlordTurn.hand).toHaveLength(20)
      const spectatorTurn = await spectator.waitFor((message) => {
        const frame = message.frame as { seq?: number } | undefined
        return message.type === 'room.frame' && frame?.seq === landlordTurn.seq
      })
      expect((spectatorTurn.frame as { players: Array<{ hand: unknown[] }> }).players.map((player) => player.hand.length)).toEqual([20, 17, 17])
      const publicLandlordTurn = await p2.waitFor((message) => message.type === 'turn.request' && message.seq === landlordTurn.seq)
      expect(publicLandlordTurn).not.toHaveProperty('hand')

      const retryIndex = p1.messages.length
      p1.send({
        type: 'action.submit',
        expectedSeq: firstTurn.seq,
        idempotencyKey: 'bid-three',
        action: { type: 'bid', bid: 3 },
      })
      const retried = await p1.waitFor((message) => message.type === 'action.result', retryIndex)
      expect(retried.acceptedSeq).toBe(actionResult.acceptedSeq)
      expect(p1.messages.filter((message) => message.type === 'action.accepted' && message.idempotencyKey === 'bid-three')).toHaveLength(1)

      const conflictIndex = p1.messages.length
      p1.send({
        type: 'action.submit',
        expectedSeq: firstTurn.seq,
        idempotencyKey: 'bid-three',
        action: { type: 'bid', bid: 2 },
      })
      const conflict = await p1.waitFor((message) => message.type === 'error', conflictIndex)
      expect(conflict.code).toBe('IDEMPOTENCY_CONFLICT')

      const secondP1 = await TestClient.connect(wsUrl)
      clients.push(secondP1)
      secondP1.send({
        type: 'session.open',
        mode: 'resume',
        roomId: 'room_ws',
        playerId: 'p1',
        resumeKey: p1Session.resumeKey,
        afterSeq: Number(firstTurn.seq),
      })
      const resumedSession = await secondP1.waitFor((message) => message.type === 'session.accepted')
      expect(resumedSession).not.toHaveProperty('resumeKey')
      await secondP1.waitFor((message) => message.type === 'sync.complete')
      expect(await secondP1.waitFor((message) => message.type === 'action.accepted' && message.idempotencyKey === 'bid-three')).toBeDefined()
      expect((await secondP1.waitFor((message) => message.type === 'turn.request' && message.playerId === 'p1')).hand).toHaveLength(20)
      secondP1.send({ type: 'state.get' })
      const privateState = await secondP1.waitFor((message) => message.type === 'state.snapshot')
      expect(privateState.state).toHaveProperty('hand')
      expect(privateState.state).not.toHaveProperty('hands')

      const observer = await TestClient.connect(wsUrl)
      clients.push(observer)
      observer.send({ type: 'session.open', mode: 'observe', roomId: 'room_ws', afterSeq: Number(landlordTurn.seq) })
      await observer.waitFor((message) => message.type === 'sync.complete')
      observer.send({ type: 'state.get' })
      const publicState = await observer.waitFor((message) => message.type === 'state.snapshot')
      expect(publicState.state).not.toHaveProperty('hand')
      expect(publicState.state).not.toHaveProperty('hands')

      for (const [resumeKey, playerId] of [
        [undefined, 'p1'],
        ['definitely-wrong', 'p1'],
        [p1Session.resumeKey, 'p2'],
      ] as const) {
        const rejected = await TestClient.connect(wsUrl)
        clients.push(rejected)
        rejected.send({
          type: 'session.open',
          mode: 'resume',
          roomId: 'room_ws',
          playerId,
          ...(resumeKey === undefined ? {} : { resumeKey }),
          afterSeq: 0,
        })
        const error = await rejected.waitFor((message) => message.type === 'error')
        expect(error.code).toBe('RESUME_KEY_INVALID')
        expect(rejected.messages.some((message) => typeof message.seq === 'number')).toBe(false)
        expect((await rejected.waitForClose()).code).toBe(4403)
      }

      const card = (landlordTurn.hand as string[])[0]
      p1.send({
        type: 'action.submit',
        expectedSeq: landlordTurn.seq,
        idempotencyKey: 'lead-card',
        action: { type: 'play', cards: [card] },
      })
      const mirrored = await secondP1.waitFor(
        (message) => message.type === 'action.accepted' && message.idempotencyKey === 'lead-card',
      )
      expect(mirrored.playerId).toBe('p1')
      expect(JSON.stringify(p1.messages).split(String(p1Session.resumeKey))).toHaveLength(2)
    }
    finally {
      for (const client of clients) client.close()
      await server.stop()
    }
  })

  it('rejects observe sessions for missing rooms', async () => {
    const server = await startBunGameServer({ seed: 1 })
    const client = await TestClient.connect(server.wsUrl)
    try {
      client.send({ type: 'session.open', mode: 'observe', roomId: 'missing', afterSeq: 0 })
      const error = await client.waitFor((message) => message.type === 'error')
      expect(error.code).toBe('ROOM_NOT_FOUND')
    }
    finally {
      client.close()
      await server.stop()
    }
  })

  it('rejects commands before session.open and binary frames', async () => {
    const server = await startBunGameServer({ seed: 1 })
    const clients: TestClient[] = []
    try {
      const unbound = await TestClient.connect(server.wsUrl)
      clients.push(unbound)
      unbound.send({
        type: 'action.submit',
        expectedSeq: 1,
        idempotencyKey: 'before-session',
        action: { type: 'pass' },
      })
      expect((await unbound.waitFor((message) => message.type === 'error')).code).toBe('SESSION_REQUIRED')

      const binary = await TestClient.connect(server.wsUrl)
      clients.push(binary)
      binary.socket.send(new Uint8Array([1, 2, 3]))
      expect((await binary.waitFor((message) => message.type === 'error')).code).toBe('BINARY_MESSAGE')
    }
    finally {
      for (const client of clients) client.close()
      await server.stop()
    }
  })
})
