import { createRootRoute, createRoute, createRouter, Link, Outlet } from '@tanstack/react-router'
import { HelloPage } from './routes/hello'
import { HomePage } from './routes/home'
import { NotFoundPage } from './routes/not-found'

const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
})

const helloRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/hello',
  component: HelloPage,
})

const routeTree = rootRoute.addChildren([indexRoute, helloRoute])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function RootLayout() {
  return (
    <main className="app-shell">
      <nav className="top-nav" aria-label="主导航">
        <Link to="/" className="brand" activeOptions={{ exact: true }}>
          DJD Game
        </Link>
        <div className="nav-links">
          <Link to="/" activeOptions={{ exact: true }}>
            首页
          </Link>
          <Link to="/hello">API 示例</Link>
        </div>
      </nav>
      <Outlet />
    </main>
  )
}
