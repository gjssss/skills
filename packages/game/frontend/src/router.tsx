import { createRootRoute, createRoute, createRouter, Link, Outlet, redirect } from '@tanstack/react-router'
import { LiveRoomPage } from './routes/live-room'
import { NotFoundPage } from './routes/not-found'
import { ReplayPage } from './routes/replay'
import { RoomsPage } from './routes/rooms'
import { SessionsPage } from './routes/sessions'

const rootRoute = createRootRoute({ component: RootLayout, notFoundComponent: NotFoundPage })
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', beforeLoad: () => { throw redirect({ to: '/rooms' }) } })
const roomsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/rooms', component: RoomsPage })
const liveRoomRoute = createRoute({ getParentRoute: () => rootRoute, path: '/rooms/$roomId', component: LiveRoomPage })
const sessionsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/sessions', component: SessionsPage })
const replayRoute = createRoute({ getParentRoute: () => rootRoute, path: '/sessions/$sessionId', component: ReplayPage })
const routeTree = rootRoute.addChildren([indexRoute, roomsRoute, liveRoomRoute, sessionsRoute, replayRoute])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register { router: typeof router }
}

function RootLayout() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_50%_-18rem,rgba(35,88,94,0.28),transparent_44rem)] bg-navy-950 font-sans text-slate-100 antialiased">
      <nav className="flex h-[84px] items-stretch gap-12 border-b border-brass/30 bg-navy-950/95 px-[max(24px,calc((100vw-1440px)/2))] max-md:h-[70px] max-md:justify-between max-md:gap-3 max-md:px-4" aria-label="主导航">
        <Link to="/rooms" className="flex items-center gap-3 font-serif text-[26px] font-extrabold tracking-wide text-brass no-underline max-md:gap-2 max-md:text-[19px]"><span className="text-[34px] leading-none max-md:text-[25px]" aria-hidden="true">♠</span> 斗地主观战台</Link>
        <div className="flex items-stretch gap-6 max-md:gap-0.5">
          <Link className="relative flex items-center px-3.5 text-base font-bold text-slate-400 no-underline after:absolute after:inset-x-3 after:bottom-[-1px] after:h-[3px] after:rounded-t after:bg-brass after:opacity-0 data-[status=active]:text-white data-[status=active]:after:opacity-100 max-md:px-2 max-md:text-[13px]" to="/rooms" activeOptions={{ includeSearch: false }}>实时对局</Link>
          <Link className="relative flex items-center px-3.5 text-base font-bold text-slate-400 no-underline after:absolute after:inset-x-3 after:bottom-[-1px] after:h-[3px] after:rounded-t after:bg-brass after:opacity-0 data-[status=active]:text-white data-[status=active]:after:opacity-100 max-md:px-2 max-md:text-[13px]" to="/sessions" activeOptions={{ includeSearch: false }}>历史复盘</Link>
        </div>
      </nav>
      <Outlet />
    </div>
  )
}
