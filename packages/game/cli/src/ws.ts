import type {
  ClientMessage,
  ControlMessage,
  GameAction,
  ServerEvent,
  ServerMessage,
  SessionMode,
} from '@djd/game-core'
import { isServerEvent } from '@djd/game-core'
import type { CliConfig, GlobalOptions } from './types'

const RETRY_DELAYS_MS = [250, 500, 1000, 2000, 2000]
const COMMAND_TIMEOUT_MS = 10 * 60 * 1000
const CONNECT_TIMEOUT_MS = 10 * 1000

class TerminalWebSocketError extends Error {}
class RetryableWebSocketError extends Error {}

export function asWebSocketUrl(server: string) {
  const url = new URL(server.includes('://') ? server : `ws://${server}`)
  if (url.protocol === 'http:') url.protocol = 'ws:'
  if (url.protocol === 'https:') url.protocol = 'wss:'
  if (url.protocol !== 'ws:' && url.protocol !== 'wss:') throw new Error('Server must use ws, wss, http, or https')
  url.pathname = '/ws'
  url.search = ''
  url.hash = ''
  return url.toString()
}

export function asHttpUrl(server: string) {
  const url = new URL(asWebSocketUrl(server))
  url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:'
  url.pathname = '/'
  return url.toString().replace(/\/$/, '')
}

export const asWsUrl = asWebSocketUrl

export function resolveContext(config: CliConfig, options: GlobalOptions) {
  const server = options.server ?? config.current.server
  const roomId = options.room ?? config.current.roomId ?? 'default'
  const playerId = options.player
    ?? config.rooms[roomId]?.playerId
    ?? (config.current.roomId === roomId ? config.current.playerId : undefined)
  if (!server) throw new Error('Server is required. Use --server or config set server.')
  return {
    server: asWebSocketUrl(server),
    roomId,
    playerId: playerId ?? undefined,
  }
}

interface SessionDescriptor {
  server: string
  roomId: string
  mode: SessionMode
  name?: string
  playerId?: string
  afterSeq: number
}

interface MessageContext {
  send: (message: ClientMessage) => void
  lastSeq: number
}

interface Done<T> {
  done: true
  value: T
}

interface RunnerOptions<T> {
  session: SessionDescriptor
  onMessage: (message: ServerMessage, context: MessageContext) => Promise<Done<T> | undefined> | Done<T> | undefined
}

function done<T>(value: T): Done<T> {
  return { done: true, value }
}

function parseServerMessage(source: unknown): ServerMessage {
  if (typeof source !== 'string') throw new TerminalWebSocketError('Server sent a non-text WebSocket message')
  let parsed: unknown
  try {
    parsed = JSON.parse(source)
  }
  catch {
    throw new TerminalWebSocketError('Server sent invalid JSON')
  }
  if (!parsed || typeof parsed !== 'object' || typeof (parsed as { type?: unknown }).type !== 'string') {
    throw new TerminalWebSocketError('Server sent an invalid protocol message')
  }
  return parsed as ServerMessage
}

function wait(delayMs: number) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, delayMs))
}

async function runWebSocketCommand<T>(options: RunnerOptions<T>): Promise<T> {
  const deadline = Date.now() + COMMAND_TIMEOUT_MS
  let lastSeq = options.session.afterSeq

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await new Promise<T>((resolvePromise, rejectPromise) => {
        const socket = new WebSocket(asWebSocketUrl(options.session.server))
        let settled = false
        let queue = Promise.resolve()
        const remaining = Math.max(1, deadline - Date.now())
        const commandTimer = setTimeout(() => {
          fail(new TerminalWebSocketError('Timed out waiting for WebSocket command result'))
        }, remaining)
        const connectTimer = setTimeout(() => {
          fail(new RetryableWebSocketError('Timed out connecting to WebSocket server'))
        }, Math.min(CONNECT_TIMEOUT_MS, remaining))

        const cleanup = () => {
          clearTimeout(commandTimer)
          clearTimeout(connectTimer)
        }
        const finish = (value: T) => {
          if (settled) return
          settled = true
          cleanup()
          socket.close(1000, 'Command complete')
          resolvePromise(value)
        }
        function fail(error: Error) {
          if (settled) return
          settled = true
          cleanup()
          try {
            socket.close()
          }
          catch {}
          rejectPromise(error)
        }
        const send = (message: ClientMessage) => {
          if (socket.readyState !== WebSocket.OPEN) throw new RetryableWebSocketError('WebSocket is not open')
          socket.send(JSON.stringify(message))
        }

        socket.addEventListener('open', () => {
          clearTimeout(connectTimer)
          send({
            type: 'session.open',
            mode: options.session.mode,
            roomId: options.session.roomId,
            name: options.session.name,
            playerId: options.session.playerId,
            afterSeq: lastSeq,
          })
        })

        socket.addEventListener('message', (event) => {
          queue = queue.then(async () => {
            const message = parseServerMessage(event.data)
            if (isServerEvent(message)) lastSeq = Math.max(lastSeq, message.seq)
            else if (message.type === 'error') throw new TerminalWebSocketError(message.message)
            const outcome = await options.onMessage(message, { send, lastSeq })
            if (outcome?.done) finish(outcome.value)
          }).catch((error) => {
            fail(error instanceof Error ? error : new Error(String(error)))
          })
        })

        socket.addEventListener('close', (event) => {
          queue.finally(() => {
            if (settled) return
            if (event.code >= 4400 || event.code === 1011) {
              fail(new TerminalWebSocketError(event.reason || `WebSocket closed with code ${event.code}`))
            }
            else {
              fail(new RetryableWebSocketError(event.reason || 'WebSocket connection closed unexpectedly'))
            }
          })
        })
      })
    }
    catch (error) {
      if (error instanceof TerminalWebSocketError) throw error
      if (attempt >= RETRY_DELAYS_MS.length || Date.now() >= deadline) throw error
      await wait(RETRY_DELAYS_MS[attempt])
    }
  }
}

type SessionAccepted = Extract<ControlMessage, { type: 'session.accepted' }>

export interface JoinRoomOptions extends SessionDescriptor {
  onAccepted?: (message: SessionAccepted) => Promise<void> | void
}

export interface JoinRoomResponse {
  ok: true
  joined: ServerEvent
  serverSeq: number
  next: ServerEvent
}

export async function joinRoom(options: JoinRoomOptions): Promise<JoinRoomResponse> {
  let accepted: SessionAccepted | undefined
  let joined: ServerEvent | undefined
  let syncComplete = false
  let pendingSeq: number | undefined
  const events = new Map<number, ServerEvent>()

  const complete = () => {
    if (!accepted || !syncComplete) return undefined
    const finished = [...events.values()].find((event) => event.type === 'game.finished')
    const next = finished ?? (pendingSeq === undefined ? undefined : events.get(pendingSeq))
    if (!next) return undefined
    if (next.type !== 'game.finished' && next.playerId !== accepted.player?.playerId) return undefined
    const fallbackJoined: ServerEvent = {
      seq: accepted.serverSeq,
      type: options.mode === 'join' ? 'player.joined' : 'player.reconnected',
      roomId: accepted.roomId,
      createdAt: new Date().toISOString(),
      playerId: accepted.player?.playerId,
      seat: accepted.player?.seat,
      name: accepted.player?.name,
    }
    return done({
      ok: true as const,
      joined: joined ?? fallbackJoined,
      serverSeq: Math.max(accepted.serverSeq, next.seq),
      next,
    })
  }

  return runWebSocketCommand({
    session: options,
    onMessage: async (message) => {
      if (isServerEvent(message)) {
        events.set(message.seq, message)
        if (message.type === 'player.joined' && message.playerId === accepted?.player?.playerId) joined = message
        if (syncComplete && (
          message.type === 'game.finished'
          || ((message.type === 'bid.request' || message.type === 'turn.request') && message.playerId === accepted?.player?.playerId)
        )) {
          pendingSeq = message.seq
        }
        return complete()
      }
      const control = message as ControlMessage
      if (control.type === 'session.accepted') {
        accepted = control
        await options.onAccepted?.(control)
      }
      if (control.type === 'sync.complete') {
        syncComplete = true
        pendingSeq = control.pendingSeq
      }
      return complete()
    },
  })
}

export interface ActionResponse {
  ok: true
  serverSeq: number
  applied: ServerEvent
  next: ServerEvent
}

export function submitAction(options: SessionDescriptor & { action: GameAction; idempotencyKey: string }) {
  let result: Extract<ControlMessage, { type: 'action.result' }> | undefined
  const events = new Map<number, ServerEvent>()

  const complete = () => {
    if (!result) return undefined
    const next = [...events.values()]
      .filter((event) => event.seq > result!.acceptedSeq)
      .find((event) => event.type === 'game.finished' || (
        (event.type === 'bid.request' || event.type === 'turn.request')
        && event.playerId === options.playerId
      ))
    if (!next) return undefined
    return done({
      ok: true as const,
      serverSeq: Math.max(result.serverSeq, next.seq),
      applied: result.applied,
      next,
    })
  }

  return runWebSocketCommand<ActionResponse>({
    session: options,
    onMessage: (message, context) => {
      if (isServerEvent(message)) {
        events.set(message.seq, message)
        return complete()
      }
      const control = message as ControlMessage
      if (control.type === 'action.result' && control.idempotencyKey === options.idempotencyKey) {
        result = control
        return complete()
      }
      if (control.type === 'sync.complete' && !result) {
        context.send({
          type: 'action.submit',
          expectedSeq: Number(options.action.expectedSeq),
          idempotencyKey: options.idempotencyKey,
          action: options.action,
        })
      }
      return undefined
    },
  })
}

export interface EventsResponse {
  ok: true
  roomId: string
  fromSeq: number
  toSeq: number
  events: ServerEvent[]
}

export function fetchEvents(options: SessionDescriptor): Promise<EventsResponse> {
  const initialAfterSeq = options.afterSeq
  const events = new Map<number, ServerEvent>()
  return runWebSocketCommand({
    session: options,
    onMessage: (message) => {
      if (isServerEvent(message) && message.seq > initialAfterSeq) events.set(message.seq, message)
      if (isServerEvent(message)) return undefined
      const control = message as ControlMessage
      if (control.type !== 'sync.complete') return undefined
      const ordered = [...events.values()].sort((a, b) => a.seq - b.seq)
      return done({
        ok: true as const,
        roomId: options.roomId,
        fromSeq: ordered[0]?.seq ?? control.serverSeq + 1,
        toSeq: control.serverSeq,
        events: ordered,
      })
    },
  })
}

export interface StateResponse {
  ok: true
  roomId: string
  snapshotSeq: number
  state: unknown
}

export function fetchState(options: SessionDescriptor): Promise<StateResponse> {
  return runWebSocketCommand({
    session: options,
    onMessage: (message, context) => {
      if (isServerEvent(message)) return undefined
      const control = message as ControlMessage
      if (control.type === 'sync.complete') context.send({ type: 'state.get' })
      if (control.type !== 'state.snapshot') return undefined
      return done({
        ok: true as const,
        roomId: control.roomId,
        snapshotSeq: control.snapshotSeq,
        state: control.state,
      })
    },
  })
}

export function sessionMode(playerId?: string): SessionMode {
  return playerId ? 'resume' : 'observe'
}
