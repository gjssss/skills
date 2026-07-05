import process from 'node:process'
import type { CardId, GameAction } from '@djd/game-core'
import type { CliConfig } from './types'

export async function readStdinText() {
  if (process.stdin.isTTY) return ''
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf-8').trim()
}

export function parseCards(value?: string): CardId[] {
  if (!value) return []
  return value
    .split(',')
    .map((card) => card.trim())
    .filter(Boolean) as CardId[]
}

export async function parseActionFromInput(options: { type?: string; bid?: string; cards?: string; expectedSeq?: string }, config: CliConfig): Promise<GameAction> {
  const stdin = await readStdinText()
  if (stdin) {
    const parsed = JSON.parse(stdin) as GameAction
    return {
      ...parsed,
      expectedSeq: parsed.expectedSeq ?? Number(options.expectedSeq ?? config.current.serverSeq),
    } as GameAction
  }

  const expectedSeq = Number(options.expectedSeq ?? config.current.serverSeq)
  if (options.type === 'bid') {
    const bid = options.bid ?? 'pass'
    return {
      type: 'bid',
      bid: bid === 'pass' ? 'pass' : Number(bid) as 0 | 1 | 2 | 3,
      expectedSeq,
    }
  }
  if (options.type === 'play') {
    return {
      type: 'play',
      cards: parseCards(options.cards),
      expectedSeq,
    }
  }
  if (options.type === 'pass') {
    return {
      type: 'pass',
      expectedSeq,
    }
  }

  throw new Error('Action requires JSON stdin or --type bid|play|pass')
}
