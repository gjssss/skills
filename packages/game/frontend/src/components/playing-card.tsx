import { memo } from 'react'
import type { CardId } from '@djd/game-core'

const suitNames = { S: '黑桃', H: '红桃', D: '方片', C: '梅花' } as const
const suitGlyphs = { S: '♠', H: '♥', D: '♦', C: '♣' } as const

export const PlayingCard = memo(function PlayingCard({ card }: { card: CardId }) {
  const joker = card === 'BJ' || card === 'RJ'
  const suit = joker ? undefined : card.slice(0, 1) as keyof typeof suitNames
  const rank = joker ? (card === 'RJ' ? '大王' : '小王') : card.slice(1)
  const red = card === 'RJ' || suit === 'H' || suit === 'D'
  const label = joker ? rank : `${suitNames[suit!]}${rank}`
  return (
    <span className={`playing-card relative flex h-[82px] w-12 shrink-0 flex-col justify-between rounded-[5px] border border-[#d5cfc2] bg-gradient-to-br from-[#fffef9] to-ivory-2 p-1 font-serif shadow-[0_5px_10px_rgba(0,0,0,.26)] ${red ? 'text-[#bb3025]' : 'text-[#151a1d]'} ${joker ? 'basis-[50px]' : 'basis-12'}`} aria-label={label}>
      <strong className="text-[17px] leading-none">{joker ? (card === 'RJ' ? 'RJ' : 'BJ') : rank}</strong>
      <span className={`self-center leading-none ${joker ? 'text-[9px] tracking-widest [writing-mode:vertical-rl]' : 'text-[21px]'}`}>{joker ? 'JOKER' : suitGlyphs[suit!]}</span>
    </span>
  )
})
