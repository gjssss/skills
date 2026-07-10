import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { CompletedSessionPage } from '@djd/game-web-contract'
import { fetchSessions } from '../api'

export function SessionsPage() {
  const [page, setPage] = useState<CompletedSessionPage>({ items: [], total: 0, page: 1, pageSize: 20 })
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSessions(1, 20).then(setPage).catch((reason) => setError(reason instanceof Error ? reason.message : '加载失败'))
  }, [])

  return (
    <div className="mx-auto w-[min(1440px,calc(100vw-40px))] py-12 max-md:w-[calc(100%-24px)] max-md:py-7">
      <header className="mb-7 flex items-end justify-between gap-5 max-md:items-start"><div><h1 className="m-0 font-serif text-[clamp(30px,3vw,42px)] text-white">历史复盘</h1><p className="mt-2 mb-0 text-sm leading-relaxed text-slate-400">服务器仅保存已完成对局，逐事件还原三家手牌与每个回合。</p></div><span className="rounded-full border border-brass/30 bg-brass/10 px-4 py-1.5 text-sm font-bold text-brass whitespace-nowrap">{page.total} 局</span></header>
      <section className="overflow-x-auto rounded-xl border border-white/10 bg-[#fcfbf8] text-[#17202b] shadow-[0_30px_80px_rgba(0,0,0,.25)]">
        {error && <p role="alert" className="m-0 border-b border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">历史记录加载失败：{error}</p>}
        <div className="hidden gap-3 p-3 max-md:grid">
          {page.items.map((session) => {
            const landlord = session.players.find((player) => player.playerId === session.landlordId)
            return (
              <article className="rounded-lg border border-[#dfdbd3] bg-white p-4 shadow-sm" key={session.sessionId}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <strong className="block truncate text-lg text-[#151b22]">{session.roomId}</strong>
                    <small className="mt-1 block truncate font-mono text-[10px] text-slate-500">{session.sessionId}</small>
                  </div>
                  <span className={`shrink-0 rounded px-2 py-1 text-[11px] font-extrabold text-white ${session.winner === 'landlord' ? 'bg-vermilion' : 'bg-[#3978b8]'}`}>{session.winner === 'landlord' ? '地主获胜' : '农民获胜'}</span>
                </div>
                <dl className="my-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-600 [&_dd]:m-0 [&_dd]:font-bold [&_dd]:text-slate-800 [&_dt]:m-0">
                  <div><dt>结束时间</dt><dd>{new Date(session.finishedAt).toLocaleString('zh-CN', { hour12: false })}</dd></div>
                  <div><dt>地主</dt><dd>{landlord?.name ?? session.landlordId}</dd></div>
                  <div><dt>玩家</dt><dd>{session.players.map((player) => player.name).join(' / ')}</dd></div>
                  <div><dt>回合 / 序号</dt><dd>{session.trickCount} / {session.finalSeq}</dd></div>
                </dl>
                <Link className="flex min-h-11 w-full items-center justify-center rounded-md bg-vermilion px-4 text-sm font-extrabold text-white no-underline shadow-[0_5px_12px_rgba(176,55,43,.22)] hover:bg-[#f05a48]" to="/sessions/$sessionId" params={{ sessionId: session.sessionId }}>查看复盘</Link>
              </article>
            )
          })}
          {page.items.length === 0 && !error && <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-slate-500"><strong className="text-lg text-slate-700">暂无历史对局</strong><span>对局完成并成功写入 SQLite 后会出现在这里。</span></div>}
        </div>
        <table className="w-full min-w-[1160px] border-collapse max-md:hidden [&_th]:border-b [&_th]:border-[#dfdbd3] [&_th]:bg-[#f4f2ed] [&_th]:px-5 [&_th]:py-[18px] [&_th]:text-left [&_th]:text-xs [&_th]:font-extrabold [&_th]:tracking-wide [&_th]:text-slate-600 [&_td]:border-b [&_td]:border-[#e5e1da] [&_td]:px-5 [&_td]:py-[18px] [&_td]:text-sm [&_td]:text-slate-700 [&_tbody_tr]:[content-visibility:auto] [&_tbody_tr]:[contain-intrinsic-size:0_72px] [&_tbody_tr]:transition-colors [&_tbody_tr]:hover:bg-[#f8f5ee]">
          <thead><tr><th>结束时间</th><th>房间 ID</th><th>玩家</th><th>地主</th><th>获胜方</th><th>用时</th><th>总回合</th><th>结束序号</th><th className="max-md:sticky max-md:right-0 max-md:z-20 max-md:bg-[#f4f2ed] max-md:shadow-[-12px_0_18px_rgba(23,32,43,.08)]">操作</th></tr></thead>
          <tbody>
            {page.items.map((session) => {
              const landlord = session.players.find((player) => player.playerId === session.landlordId)
              return <tr key={session.sessionId}>
                <td>{new Date(session.finishedAt).toLocaleString('zh-CN', { hour12: false })}</td>
                <td><strong className="block text-base text-[#151b22]">{session.roomId}</strong><small className="mt-1 block font-mono text-[10px] text-slate-500">{session.sessionId.slice(0, 22)}</small></td>
                <td>{session.players.map((player) => player.name).join(' / ')}</td>
                <td>{landlord?.name ?? session.landlordId}</td>
                <td><span className={`inline-flex min-h-7 items-center rounded px-2.5 text-xs font-extrabold text-white ${session.winner === 'landlord' ? 'bg-vermilion' : 'bg-[#3978b8]'}`}>{session.winner === 'landlord' ? '地主获胜' : '农民获胜'}</span></td>
                <td className="font-mono tabular-nums">{Math.floor(session.durationMs / 60000)}:{String(Math.floor(session.durationMs / 1000) % 60).padStart(2, '0')}</td>
                <td className="font-mono tabular-nums">{session.trickCount}</td><td className="font-mono tabular-nums">{session.finalSeq}</td>
                <td className="max-md:sticky max-md:right-0 max-md:z-10 max-md:bg-[#fcfbf8] max-md:shadow-[-12px_0_18px_rgba(23,32,43,.08)]"><Link className="inline-flex min-h-9 items-center justify-center rounded-md bg-vermilion px-3.5 text-xs font-extrabold text-white no-underline shadow-[0_5px_12px_rgba(176,55,43,.22)] hover:bg-[#f05a48]" to="/sessions/$sessionId" params={{ sessionId: session.sessionId }}>查看复盘</Link></td>
              </tr>
            })}
            {page.items.length === 0 && !error && <tr><td className="max-md:!static" colSpan={9}><div className="flex flex-col items-center gap-2 px-4 py-16 text-center text-slate-500"><strong className="text-lg text-slate-700">暂无历史对局</strong><span>对局完成并成功写入 SQLite 后会出现在这里。</span></div></td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  )
}
