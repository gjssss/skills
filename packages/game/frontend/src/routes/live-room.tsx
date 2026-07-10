import { Link, useParams } from '@tanstack/react-router'
import { EventTimeline } from '../components/event-timeline'
import { GameTable } from '../components/game-table'
import { useRoomSubscription } from '../spectator-store'

export function LiveRoomPage() {
  const { roomId } = useParams({ strict: false }) as { roomId: string }
  const snapshot = useRoomSubscription(roomId)
  const frame = snapshot.frames.at(-1)

  if (!frame) {
    return (
      <div className="mx-auto grid min-h-[calc(100vh-84px)] w-[min(1440px,calc(100vw-40px))] place-items-center py-10 max-md:min-h-[calc(100vh-70px)] max-md:w-[calc(100%-24px)]">
        <div className="w-full max-w-xl rounded-2xl border border-brass/25 bg-navy-800 p-10 text-center shadow-[0_28px_80px_rgba(0,0,0,.3)] max-md:p-6">
          <span className={`mx-auto mb-5 block h-3 w-3 rounded-full ${snapshot.status === 'error' ? 'bg-red-500' : 'animate-pulse bg-emerald-400 shadow-[0_0_0_5px_rgba(53,214,128,.1)]'}`} />
          <h1 className="m-0 font-serif text-3xl text-white">{snapshot.status === 'error' ? '无法进入房间' : '正在连接牌桌'}</h1>
          <p className="mt-3 mb-7 text-sm leading-relaxed text-slate-400">{snapshot.error ?? `正在同步 ${roomId} 的全局观战数据…`}</p>
          {snapshot.status === 'error' && <Link className="inline-flex min-h-10 items-center justify-center rounded-md bg-vermilion px-4 text-sm font-extrabold text-white no-underline shadow-[0_5px_12px_rgba(176,55,43,.25)] hover:bg-[#f05a48]" to="/rooms">返回大厅</Link>}
        </div>
      </div>
    )
  }

  return (
    <div className="pb-8">
      <header className="mx-auto flex min-h-14 w-[min(1440px,calc(100vw-40px))] items-center justify-between gap-4 text-xs text-slate-400 max-md:w-[calc(100%-24px)] max-md:flex-col max-md:items-start max-md:justify-center max-md:gap-2 max-md:py-3">
        <div className="flex min-w-0 items-center gap-2"><Link className="font-bold text-brass no-underline hover:text-white" to="/rooms">实时对局</Link><span>/</span><strong className="truncate text-slate-100">{roomId}</strong></div>
        <div className="flex items-center gap-2.5 max-md:w-full max-md:flex-wrap"><span className={`h-2 w-2 rounded-full ${snapshot.status === 'connected' ? 'bg-emerald-400 shadow-[0_0_0_4px_rgba(53,214,128,.1)]' : 'animate-pulse bg-amber-400'}`} />{snapshot.status === 'connected' ? '连接正常' : '正在重连'}<i className="h-3 w-px bg-slate-600" />序号 {frame.seq}<Link className="ml-2 font-bold text-slate-300 no-underline hover:text-white max-md:ml-auto" to="/rooms">← 返回大厅</Link></div>
      </header>
      <div className="mx-auto grid w-[min(1440px,calc(100vw-40px))] min-w-0 grid-cols-[minmax(0,1fr)_300px] overflow-hidden rounded-[16px] border border-white/10 bg-navy-900 shadow-[0_30px_85px_rgba(0,0,0,.34)] max-md:block max-md:w-[calc(100%-24px)] max-md:overflow-visible max-md:border-0 max-md:bg-transparent max-md:shadow-none">
        <GameTable frame={frame} />
        <EventTimeline frames={snapshot.frames} selectedSeq={frame.seq} />
      </div>
      <footer className="mx-auto mt-4 w-[min(1440px,calc(100vw-40px))] text-center text-[11px] tracking-wide text-slate-500 max-md:w-[calc(100%-24px)]">数据延迟约 1～2 秒，仅供观战参考 · 只读模式，不可操作</footer>
    </div>
  )
}
