import { Link } from '@tanstack/react-router'

export function NotFoundPage() {
  return (
    <section className="mx-auto grid min-h-[calc(100vh-84px)] w-[min(1440px,calc(100vw-40px))] place-items-center py-10 max-md:min-h-[calc(100vh-70px)] max-md:w-[calc(100%-24px)]">
      <div className="w-full max-w-xl rounded-2xl border border-brass/25 bg-navy-800 p-10 text-center shadow-[0_28px_80px_rgba(0,0,0,.3)] max-md:p-6">
        <h1 className="m-0 font-serif text-3xl text-white">页面不存在</h1>
        <p className="mt-3 mb-7 text-sm text-slate-400">当前路径没有匹配的页面。</p>
        <Link to="/rooms" className="inline-flex min-h-10 items-center justify-center rounded-md bg-vermilion px-4 text-sm font-extrabold text-white no-underline hover:bg-[#f05a48]">
          返回观战大厅
        </Link>
      </div>
    </section>
  )
}
