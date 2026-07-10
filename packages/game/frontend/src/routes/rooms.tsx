import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { CompletedSessionSummary, RoomSummary } from '@djd/game-web-contract'
import { fetchSessions } from '../api'
import { useRoomsSubscription } from '../spectator-store'

const stageLabels = {
  waiting: '等待玩家',
  bidding: '叫地主',
  playing: '出牌中',
} as const
const stageClasses = {
  waiting: 'bg-slate-200 text-slate-600',
  bidding: 'bg-amber-100 text-amber-800',
  playing: 'bg-[#fee4dd] text-[#b93425]',
} as const
const avatarPositions = ['0% 0%', '50% 0%', '100% 0%']
const watchLink = 'inline-flex min-h-[38px] items-center justify-center rounded-[5px] border border-[#0b503b] bg-[#0b503b] px-[15px] text-[13px] font-extrabold text-white no-underline transition hover:-translate-y-px hover:bg-[#0d654a]'

function elapsed(room: RoomSummary) {
  const from = Date.parse(room.startedAt ?? room.createdAt)
  const seconds = Math.max(0, Math.floor((Date.now() - from) / 1000))
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

export function RoomsPage() {
  const snapshot = useRoomsSubscription()
  const [query, setQuery] = useState('')
  const [stage, setStage] = useState('all')
  const [recent, setRecent] = useState<CompletedSessionSummary[]>([])

  useEffect(() => {
    fetchSessions(1, 5).then((page) => setRecent(page.items)).catch(() => setRecent([]))
  }, [snapshot.rooms.length])

  const rooms = useMemo(() => snapshot.rooms.filter((room) => {
    const matchesStage = stage === 'all' || room.stage === stage
    const haystack = `${room.roomId} ${room.sessionId} ${room.players.map((player) => player.name).join(' ')}`.toLowerCase()
    return matchesStage && haystack.includes(query.trim().toLowerCase())
  }), [query, snapshot.rooms, stage])

  return (
    <div className="mx-auto w-[min(1440px,calc(100vw-40px))] pb-12 max-md:w-[calc(100%-24px)]">
      <div className="flex min-h-[52px] items-center justify-end gap-2.5 text-sm text-slate-300 max-md:min-h-11" data-status={snapshot.status}>
        <span className={`inline-block h-[9px] w-[9px] rounded-full shadow-[0_0_0_4px_rgba(53,214,128,.1)] ${snapshot.status === 'error' || snapshot.status === 'closed' ? 'bg-red-500' : snapshot.status === 'connecting' || snapshot.status === 'reconnecting' ? 'animate-pulse bg-amber-400' : 'bg-emerald-400'}`} />
        {snapshot.status === 'connected' ? '实时连接' : snapshot.status === 'reconnecting' ? '正在重连' : '连接中'}
      </div>
      <section className="overflow-hidden rounded-[10px] border border-white/50 bg-[#fcfbf8] text-[#17202b] shadow-[0_30px_80px_rgba(0,0,0,.28)]">
        <header className="flex items-end justify-between gap-6 border-b border-[#ddd8cf] px-[30px] pt-[34px] pb-7 max-md:flex-col max-md:items-stretch max-md:px-[18px] max-md:pt-6 max-md:pb-[18px]">
          <div>
            <h1 className="m-0 font-serif text-[clamp(30px,3vw,42px)] leading-[1.1] font-bold text-[#121820] max-md:text-[28px]">正在战斗的房间</h1>
            <p className="mt-2.5 mb-0 leading-relaxed text-slate-500">公开只读观战，实时查看三家手牌和行动进度。</p>
          </div>
          <div className="flex gap-3 max-md:grid max-md:grid-cols-[1fr_1.3fr]">
            <select className="h-11 rounded-[7px] border border-[#d4d0c8] bg-white px-3.5 text-[#232a32]" aria-label="全部阶段" value={stage} onChange={(event) => setStage(event.target.value)}>
              <option value="all">全部阶段</option>
              <option value="waiting">等待玩家</option>
              <option value="bidding">叫地主</option>
              <option value="playing">出牌中</option>
            </select>
            <input className="h-11 w-[230px] rounded-[7px] border border-[#d4d0c8] bg-white px-3.5 text-[#232a32] max-md:w-full" aria-label="搜索房间" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索房间" />
          </div>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-collapse [&_th]:bg-[#f5f3ee] [&_th]:text-left [&_th]:text-xs [&_th]:font-extrabold [&_th]:tracking-wider [&_th]:text-slate-600 [&_td]:text-sm [&_td]:text-slate-700 [&_th]:px-5 [&_th]:py-[18px] [&_td]:px-5 [&_td]:py-[18px] [&_th]:border-b [&_th]:border-[#e4e0d8] [&_td]:border-b [&_td]:border-[#e4e0d8] max-md:[&_th]:p-3.5 max-md:[&_td]:p-3.5">
            <thead><tr><th>房间 ID</th><th>本局对战 ID</th><th>玩家（座位 / 角色）</th><th>当前行动</th><th>已用时</th><th>最新序号</th><th>阶段</th><th className="max-md:sticky max-md:right-0 max-md:z-20 max-md:bg-[#f5f3ee] max-md:shadow-[-12px_0_18px_rgba(23,32,43,.08)]">操作</th></tr></thead>
            <tbody>
              {rooms.map((room) => {
                const actor = room.players.find((player) => player.playerId === room.currentPlayerId)
                return (
                  <tr key={room.roomId} className="transition-colors hover:bg-[#f8f5ee]">
                    <td><strong className="text-[19px] text-[#151b22]">{room.roomId}</strong></td>
                    <td><span className="font-mono tabular-nums">{room.sessionId.replace('session_', '').slice(0, 13)}</span></td>
                    <td>
                      <div className="flex min-w-[310px] items-center gap-4">
                        {room.players.map((player) => <span className="grid min-w-[78px] grid-cols-[30px_auto] items-center gap-x-2" key={player.playerId}><i className="row-span-2 h-[30px] w-[30px] rounded-full border border-brass/80 bg-cover" style={{ backgroundImage: 'url(/assets/player-avatar-atlas.png)', backgroundSize: '300% 200%', backgroundPosition: avatarPositions[player.seat] ?? '0% 0%' }} aria-hidden="true" />{player.name}<small className="col-start-2 text-[10px] text-slate-500">{player.role === 'landlord' ? '地主' : player.role === 'farmer' ? '农民' : `${player.seat + 1}号位`}</small></span>)}
                        {room.players.length === 0 && <em className="not-italic text-slate-400">等待第一名玩家</em>}
                      </div>
                    </td>
                    <td><strong className="block text-vermilion">{actor?.name ?? '—'}</strong><small className="mt-1 block text-slate-500">{actor ? (room.stage === 'bidding' ? '正在叫地主…' : '正在思考…') : '等待玩家加入'}</small></td>
                    <td className="font-mono tabular-nums">{elapsed(room)}</td>
                    <td className="font-mono tabular-nums">{room.currentSeq}</td>
                    <td><span className={`inline-flex min-h-[30px] items-center rounded-[5px] px-2.5 text-xs font-extrabold ${stageClasses[room.stage]}`}>{stageLabels[room.stage]}</span></td>
                    <td className="max-md:sticky max-md:right-0 max-md:z-10 max-md:bg-[#fcfbf8] max-md:shadow-[-12px_0_18px_rgba(23,32,43,.08)]"><Link className={watchLink} to="/rooms/$roomId" params={{ roomId: room.roomId }}>进入观战</Link></td>
                  </tr>
                )
              })}
              {rooms.length === 0 && <tr><td className="max-md:!static" colSpan={8}><div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-slate-500"><strong className="text-[17px] text-slate-700">暂时没有进行中的房间</strong><span>三个 CLI 玩家加入同一房间后，这里会自动更新。</span></div></td></tr>}
            </tbody>
          </table>
        </div>

        <section className="px-[30px] pt-6 pb-[30px] max-md:px-4 max-md:py-5">
          <header className="mb-3 flex items-center justify-between"><h2 className="m-0 font-serif text-[21px]">最近结束</h2><Link className="text-[13px] font-extrabold text-[#146248] no-underline" to="/sessions">查看全部复盘</Link></header>
          <div className="rounded-md border border-[#dfdbd3]">
            {recent.map((session) => (
              <Link className="grid min-h-12 grid-cols-[190px_1fr_120px_90px] items-center gap-[18px] px-4 text-[13px] text-slate-700 no-underline not-first:border-t not-first:border-[#e5e1da] hover:bg-[#f7f5f0] max-md:grid-cols-[1fr_auto] max-md:gap-x-3 max-md:gap-y-1.5 max-md:py-3" key={session.sessionId} to="/sessions/$sessionId" params={{ sessionId: session.sessionId }}>
                <time>{new Date(session.finishedAt).toLocaleString('zh-CN', { hour12: false })}</time>
                <strong>{session.roomId}</strong>
                <span>{session.winner === 'landlord' ? '地主获胜' : '农民获胜'}</span>
                <span>{session.trickCount} 回合</span>
              </Link>
            ))}
            {recent.length === 0 && <p className="m-0 p-6 text-center text-slate-500">还没有已完成的对局记录。</p>}
          </div>
        </section>
      </section>
    </div>
  )
}
