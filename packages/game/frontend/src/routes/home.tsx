import { Link } from '@tanstack/react-router'

export function HomePage() {
  return (
    <section className="hero">
      <div className="hero-copy">
        <h1>DJD Game</h1>
        <p>
          一个干净的 React + TanStack Router 前端骨架，用于验证 Bun 工作区、
          bundled backend 和静态资源交付链路。
        </p>
        <div className="hero-actions">
          <Link to="/hello" className="primary-action">
            查看 API 示例
          </Link>
        </div>
      </div>
      <div className="status-panel" aria-label="项目状态">
        <div>
          <span>Runtime</span>
          <strong>Bun</strong>
        </div>
        <div>
          <span>Frontend</span>
          <strong>React</strong>
        </div>
        <div>
          <span>Router</span>
          <strong>TanStack Router</strong>
        </div>
      </div>
    </section>
  )
}
