import type { SpectatorFrame } from '@djd/game-web-contract'

function eventText(frame: SpectatorFrame) {
  const event = frame.event
  const player = frame.players.find((item) => item.playerId === event.playerId)?.name ?? event.playerId
  if (event.type === 'player.joined') return `${String(event.name ?? player)} 加入房间`
  if (event.type === 'game.started') return '发牌完成，开始叫地主'
  if (event.type === 'landlord.decided') return `${frame.players.find((item) => item.playerId === event.landlordId)?.name ?? event.landlordId} 成为地主`
  if (event.type === 'action.accepted') {
    const action = event.action
    if (action?.type === 'pass') return `${player} 跳过`
    if (action?.type === 'bid') return `${player} ${action.bid === 'pass' || action.bid === 0 ? '不叫' : `叫 ${action.bid} 分`}`
    if (action?.type === 'play') return `${player} 出牌 ${action.cards.join(' ')}`
  }
  if (event.type === 'game.finished') return `${player ?? '对局'} 完成最后出牌`
  if (event.type === 'bid.request') return `等待 ${player} 叫地主`
  if (event.type === 'turn.request') return `轮到 ${player} 出牌`
  return event.type
}

export function EventTimeline({
  frames,
  selectedSeq,
  onSelect,
}: {
  frames: SpectatorFrame[]
  selectedSeq?: number
  onSelect?: (seq: number) => void
}) {
  const events = frames.filter((frame) => !['room.created'].includes(frame.event.type))
  return (
    <aside className="min-w-0 border-l border-white/10 bg-[#0a1827] max-md:mt-3 max-md:overflow-hidden max-md:rounded-2xl max-md:border" aria-label="事件时间线">
      <header className="flex h-16 items-center justify-between border-b border-white/10 px-[18px]">
        <h2 className="m-0 text-base font-bold text-slate-100">事件时间线</h2>
        <span className="text-xs text-slate-500">{events.length} 条</span>
      </header>
      <ol className="m-0 max-h-[655px] list-none overflow-y-auto p-0 max-md:max-h-[280px]">
        {events.map((frame) => (
          <li key={frame.seq} className={`relative border-b border-white/5 [contain-intrinsic-size:0_74px] [content-visibility:auto] before:absolute before:top-[26px] before:left-4 before:h-[7px] before:w-[7px] before:rounded-full ${frame.seq === selectedSeq ? 'bg-[#4377ae]/20 before:bg-[#5597e3] before:shadow-[0_0_0_4px_rgba(85,151,227,.13)]' : 'before:bg-slate-500'}`}>
            <button className="grid min-h-[72px] w-full cursor-pointer border-0 bg-transparent py-[11px] pr-3 pl-8 text-left text-inherit disabled:cursor-default disabled:opacity-100" type="button" onClick={() => onSelect?.(frame.seq)} disabled={!onSelect}>
              <time className="text-[11px] text-slate-500 tabular-nums">{new Date(frame.createdAt).toLocaleTimeString('zh-CN', { hour12: false })}</time>
              <strong className={`[overflow-wrap:anywhere] text-xs leading-[1.45] ${frame.seq === selectedSeq ? 'text-[#76aef0]' : 'text-slate-200'}`}>{eventText(frame)}</strong>
              <span className="text-[10px] text-slate-600">序号 {frame.seq}</span>
            </button>
          </li>
        ))}
      </ol>
    </aside>
  )
}
