import { Link } from '@tanstack/react-router'

export function NotFoundPage() {
  return (
    <section className="content-page">
      <div className="section-heading">
        <h1>页面不存在</h1>
        <p>当前路径没有匹配的页面。</p>
      </div>
      <Link to="/" className="primary-action">
        回到首页
      </Link>
    </section>
  )
}
