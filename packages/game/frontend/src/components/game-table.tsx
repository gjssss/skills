import { memo } from 'react'
import type { SpectatorFrame, SpectatorPlayer } from '@djd/game-web-contract'
import { PlayingCard } from './playing-card'

const positions = ['seat-top', 'seat-left', 'seat-right'] as const
const positionClasses = {
  'seat-top': 'top-5 left-1/2 w-[70%] -translate-x-1/2 max-md:order-1',
  'seat-left': 'top-[43%] left-[22px] w-[38%] -translate-y-1/2 max-md:order-2',
  'seat-right': 'top-[46%] right-[22px] w-[38%] -translate-y-1/2 max-md:order-4',
} as const
const avatarPositions = ['0% 0%', '50% 0%', '100% 0%']

const PlayerSeat = memo(function PlayerSeat({
  player,
  position,
  active,
}: {
  player: SpectatorPlayer
  position: typeof positions[number]
  active: boolean
}) {
  return (
    <section className={`absolute z-10 min-w-0 rounded-[14px] p-3 transition-shadow max-md:static max-md:w-auto max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-2xl max-md:border max-md:border-brass/20 max-md:bg-gradient-to-br max-md:from-felt-800 max-md:to-[#092f24] max-md:shadow-[inset_0_0_25px_rgba(0,0,0,.28)] ${positionClasses[position]} ${active ? 'bg-vermilion/10 shadow-[0_0_0_2px_rgba(230,79,61,.62),0_0_30px_rgba(230,79,61,.16)] max-md:from-[#174f3c] max-md:to-[#0b382b]' : ''}`} aria-label={`${player.name}的手牌`}>
      <header className="mb-2 flex items-center gap-2.5">
        <span className="h-[46px] w-[46px] shrink-0 rounded-full border border-brass/80 bg-cover shadow-[inset_0_0_18px_rgba(255,255,255,.08)] max-md:h-[42px] max-md:w-[42px]" style={{ backgroundImage: 'url(/assets/player-avatar-atlas.png)', backgroundSize: '300% 200%', backgroundPosition: avatarPositions[player.seat] ?? '0% 0%' }} aria-hidden="true" />
        <span className="flex min-w-0 items-center gap-2 max-md:flex-col max-md:items-start max-md:gap-0.5">
          <strong className="max-w-36 truncate text-[17px] text-white">{player.name}</strong>
          <span className={`rounded px-2 py-0.5 text-[11px] font-extrabold text-white ${player.role === 'landlord' ? 'bg-vermilion' : player.role === 'farmer' ? 'bg-[#4d8ddb]' : 'bg-slate-600'}`}>{player.role === 'landlord' ? '地主' : player.role === 'farmer' ? '农民' : '待定'}</span>
        </span>
        <span className="ml-auto whitespace-nowrap text-xs text-emerald-100/75">剩余 <strong className="text-lg text-brass">{player.handCount}</strong> 张</span>
      </header>
      <div className="flex min-w-0 items-end overflow-x-auto py-1 pr-3 pb-3 pl-1 [scrollbar-color:rgba(225,189,117,.45)_transparent] [scrollbar-width:thin] [&_.playing-card+_.playing-card]:-ml-[26px] max-md:gap-1 max-md:[scroll-snap-type:x_proximity] max-md:[&_.playing-card]:h-[72px] max-md:[&_.playing-card]:w-[43px] max-md:[&_.playing-card]:basis-[43px] max-md:[&_.playing-card+_.playing-card]:ml-0" tabIndex={0} aria-label={`${player.name}，${player.handCount}张牌`}>
        {player.hand.map((card) => <PlayingCard key={card} card={card} />)}
      </div>
    </section>
  )
})

export function GameTable({ frame }: { frame: SpectatorFrame }) {
  const [topPlayer, leftPlayer, rightPlayer] = frame.players
  return (
    <div className="relative min-h-[720px] min-w-0 overflow-hidden rounded-[190px] border-[14px] border-[#33281f] bg-felt-800 shadow-[inset_0_0_0_3px_#a97c3d,inset_0_0_70px_rgba(0,0,0,.48)] max-md:flex max-md:min-h-0 max-md:flex-col max-md:gap-3 max-md:overflow-visible max-md:rounded-none max-md:border-0 max-md:bg-transparent max-md:shadow-none" aria-label="全局斗地主牌桌">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,.04)_.8px,transparent_.8px)] bg-[size:5px_5px] opacity-70 max-md:hidden" aria-hidden="true" />
      {topPlayer && <PlayerSeat player={topPlayer} position="seat-top" active={frame.currentPlayerId === topPlayer.playerId} />}
      {leftPlayer && <PlayerSeat player={leftPlayer} position="seat-left" active={frame.currentPlayerId === leftPlayer.playerId} />}
      <section className="absolute inset-x-[34%] top-[44%] z-[1] flex -translate-y-1/4 flex-col items-center gap-[18px] text-center max-md:static max-md:order-3 max-md:grid max-md:translate-y-0 max-md:grid-cols-2 max-md:rounded-xl max-md:border max-md:border-white/10 max-md:bg-[#0a1928] max-md:p-3" aria-label="牌桌中央">
        <div className="whitespace-nowrap rounded-lg border border-brass-dark bg-[#051914]/80 px-7 py-2 text-lg font-black text-vermilion shadow-[0_8px_22px_rgba(0,0,0,.25)] max-md:col-span-2 max-md:text-[15px]">
          {frame.stage === 'waiting' ? '等待玩家' : frame.stage === 'bidding' ? '叫地主' : frame.stage === 'playing' ? '出牌中' : '已结束'}
        </div>
        <div>
          <span className="mb-2 block text-xs font-bold text-emerald-50/80">当前出牌</span>
          <div className="flex min-h-[62px] justify-center [&_.playing-card]:mx-0.5 [&_.playing-card]:h-16 [&_.playing-card]:w-10 [&_.playing-card]:basis-10 [&_.playing-card_strong]:text-[15px] [&_.playing-card>span]:text-lg">
            {frame.lastPlay?.cards.length
              ? frame.lastPlay.cards.map((card) => <PlayingCard key={card} card={card} />)
              : <span className="flex items-center text-[13px] text-emerald-100/55">等待领出</span>}
          </div>
        </div>
        <div className="mt-2 max-md:mt-0">
          <span className="mb-2 block text-xs font-bold text-emerald-50/80">底牌</span>
          <div className="flex min-h-[62px] justify-center [&_.playing-card]:mx-0.5 [&_.playing-card]:h-16 [&_.playing-card]:w-10 [&_.playing-card]:basis-10 [&_.playing-card_strong]:text-[15px] [&_.playing-card>span]:text-lg">
            {frame.bottomCards.map((card) => <PlayingCard key={card} card={card} />)}
          </div>
        </div>
      </section>
      {rightPlayer && <PlayerSeat player={rightPlayer} position="seat-right" active={frame.currentPlayerId === rightPlayer.playerId} />}
    </div>
  )
}
