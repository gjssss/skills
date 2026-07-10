import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import type { CompletedSessionDetail } from '@djd/game-web-contract'
import { fetchSession } from '../api'
import { EventTimeline } from '../components/event-timeline'
import { GameTable } from '../components/game-table'
import { ReplayControls } from '../components/replay-controls'

export function ReplayPage() {
  const { sessionId } = useParams({ strict: false }) as { sessionId: string }
  const [session, setSession] = useState<CompletedSessionDetail>()
  const [error, setError] = useState('')
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  useEffect(() => {
    fetchSession(sessionId).then((record) => {
      setSession(record)
      const start = record.frames.findIndex((frame) => frame.event.type === 'game.started')
      setIndex(Math.max(0, start))
    }).catch((reason) => setError(reason instanceof Error ? reason.message : '加载失败'))
  }, [sessionId])

  useEffect(() => {
    if (!playing || !session) return
    const timer = window.setInterval(() => {
      setIndex((current) => {
        if (current >= session.frames.length - 1) {
          setPlaying(false)
          return current
        }
        return current + 1
      })
    }, 1000 / speed)
    return () => window.clearInterval(timer)
  }, [playing, session, speed])

  const frame = session?.frames[index]
  const activeTrick = useMemo(() => session?.tricks.find((trick) => frame && frame.seq >= trick.startSeq && frame.seq <= trick.endSeq), [frame, session])

  const goToTrick = (direction: -1 | 1) => {
    if (!session || !frame) return
    const current = activeTrick?.index ?? 0
    const target = session.tricks.find((trick) => trick.index === Math.max(1, Math.min(session.tricks.length, current + direction)))
    if (!target) return
    const targetIndex = session.frames.findIndex((item) => item.seq >= target.startSeq)
    if (targetIndex >= 0) setIndex(targetIndex)
  }

  if (!session || !frame) {
    return <div className="mx-auto grid min-h-[calc(100vh-84px)] w-[min(1440px,calc(100vw-40px))] place-items-center py-10 max-md:min-h-[calc(100vh-70px)] max-md:w-[calc(100%-24px)]"><div className="w-full max-w-xl rounded-2xl border border-brass/25 bg-navy-800 p-10 text-center shadow-[0_28px_80px_rgba(0,0,0,.3)] max-md:p-6"><h1 className="m-0 font-serif text-3xl text-white">{error ? '复盘加载失败' : '正在加载复盘'}</h1><p className="mt-3 mb-7 break-all text-sm leading-relaxed text-slate-400">{error || sessionId}</p>{error && <Link className="inline-flex min-h-10 items-center justify-center rounded-md bg-vermilion px-4 text-sm font-extrabold text-white no-underline shadow-[0_5px_12px_rgba(176,55,43,.25)] hover:bg-[#f05a48]" to="/sessions">返回历史复盘</Link>}</div></div>
  }

  return (
    <div className="pb-8">
      <header className="mx-auto grid min-h-16 w-[min(1440px,calc(100vw-40px))] grid-cols-[1fr_auto_1fr] items-center gap-4 text-xs text-slate-400 max-md:w-[calc(100%-24px)] max-md:grid-cols-[1fr_auto] max-md:py-3">
        <div className="flex min-w-0 items-center gap-2"><Link className="font-bold text-brass no-underline hover:text-white" to="/sessions">历史复盘</Link><span>/</span><strong className="truncate text-slate-100">{sessionId}</strong></div>
        <div className={`rounded-full px-4 py-1.5 text-sm font-extrabold text-white max-md:row-span-2 ${session.winner === 'landlord' ? 'bg-vermilion' : 'bg-[#3978b8]'}`}>{session.winner === 'landlord' ? '地主获胜' : '农民获胜'}</div>
        <div className="justify-self-end font-mono tabular-nums max-md:col-start-1 max-md:row-start-2 max-md:justify-self-start">第 {activeTrick?.index ?? '—'} 回合 · 事件 {index + 1} / {session.frames.length}</div>
      </header>
      <div className="mx-auto grid w-[min(1440px,calc(100vw-40px))] min-w-0 grid-cols-[minmax(0,1fr)_300px] overflow-hidden rounded-[16px] border border-white/10 bg-navy-900 shadow-[0_30px_85px_rgba(0,0,0,.34)] max-md:block max-md:w-[calc(100%-24px)] max-md:overflow-visible max-md:border-0 max-md:bg-transparent max-md:shadow-none">
        <GameTable frame={frame} />
        <EventTimeline frames={session.frames} selectedSeq={frame.seq} onSelect={(seq) => {
          const nextIndex = session.frames.findIndex((item) => item.seq === seq)
          if (nextIndex >= 0) setIndex(nextIndex)
        }} />
      </div>
      <div className="mx-auto w-[min(1440px,calc(100vw-40px))] max-md:w-[calc(100%-24px)]"><ReplayControls index={index} total={session.frames.length} playing={playing} speed={speed} onIndex={setIndex} onPlaying={setPlaying} onSpeed={setSpeed} onPreviousTrick={() => goToTrick(-1)} onNextTrick={() => goToTrick(1)} /></div>
    </div>
  )
}
