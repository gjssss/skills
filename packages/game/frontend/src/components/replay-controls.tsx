export function ReplayControls({
  index,
  total,
  playing,
  speed,
  onIndex,
  onPlaying,
  onSpeed,
  onPreviousTrick,
  onNextTrick,
}: {
  index: number
  total: number
  playing: boolean
  speed: number
  onIndex: (index: number) => void
  onPlaying: (playing: boolean) => void
  onSpeed: (speed: number) => void
  onPreviousTrick: () => void
  onNextTrick: () => void
}) {
  return (
    <section className="mt-3 rounded-[9px] border border-brass/30 bg-[#0a1827] px-5 py-4 max-md:px-3.5 max-md:py-3" aria-label="复盘控制">
      <div className="grid grid-cols-[120px_1fr_90px] items-center gap-4 text-[13px] text-slate-300 tabular-nums max-md:grid-cols-[1fr_72px]">
        <span className="max-md:col-span-2">事件 {Math.min(index + 1, total)} / {total}</span>
        <input
          className="w-full accent-vermilion"
          aria-label="复盘进度"
          type="range"
          min={0}
          max={Math.max(0, total - 1)}
          value={index}
          onChange={(event) => onIndex(Number(event.target.value))}
        />
        <select className="h-[34px] rounded-[5px] border border-slate-600 bg-navy-800 px-2 text-white" aria-label="播放速度" value={speed} onChange={(event) => onSpeed(Number(event.target.value))}>
          <option value={0.5}>0.5×</option>
          <option value={1}>1×</option>
          <option value={2}>2×</option>
        </select>
      </div>
      <div className="mt-3.5 flex gap-2.5 max-md:grid max-md:grid-cols-3">
        <button className="min-h-12 flex-1 cursor-pointer rounded-md border border-brass-dark bg-navy-800 px-2 font-extrabold text-slate-100 hover:bg-[#17304a] disabled:cursor-default disabled:opacity-40 max-md:min-h-11 max-md:text-[11px]" type="button" onClick={() => onIndex(Math.max(0, index - 1))} disabled={index <= 0}>◀ 上一步</button>
        <button className="min-h-12 flex-1 cursor-pointer rounded-md border border-brass-dark bg-[#17304a] px-2 font-extrabold text-brass disabled:cursor-default disabled:opacity-40 max-md:min-h-11 max-md:text-[11px]" type="button" onClick={() => onPlaying(!playing)} disabled={total <= 1}>{playing ? 'Ⅱ 暂停' : '▶ 播放'}</button>
        <button className="min-h-12 flex-1 cursor-pointer rounded-md border border-brass-dark bg-navy-800 px-2 font-extrabold text-slate-100 hover:bg-[#17304a] disabled:cursor-default disabled:opacity-40 max-md:min-h-11 max-md:text-[11px]" type="button" onClick={() => onIndex(Math.min(total - 1, index + 1))} disabled={index >= total - 1}>下一步 ▶</button>
        <span className="w-px bg-slate-600 max-md:hidden" />
        <button className="min-h-12 flex-1 cursor-pointer rounded-md border border-brass-dark bg-navy-800 px-2 font-extrabold text-slate-100 hover:bg-[#17304a] max-md:min-h-11 max-md:text-[11px]" type="button" onClick={onPreviousTrick}>◀◀ 上一回合</button>
        <button className="min-h-12 flex-1 cursor-pointer rounded-md border border-brass-dark bg-navy-800 px-2 font-extrabold text-slate-100 hover:bg-[#17304a] max-md:min-h-11 max-md:text-[11px]" type="button" onClick={onNextTrick}>下一回合 ▶▶</button>
      </div>
    </section>
  )
}
