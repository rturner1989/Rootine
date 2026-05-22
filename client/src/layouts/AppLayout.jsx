import { motion, useReducedMotion } from 'motion/react'
import { Suspense, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import AchievementSplash from '../components/AchievementSplash'
import AchievementsListener from '../components/AchievementsListener'
import Dock from '../components/Dock'
import MobileTopBar from '../components/MobileTopBar'
import NotificationsDrawer from '../components/NotificationsDrawer'
import OrganiserDrawer from '../components/OrganiserDrawer'
import AddPlantDialog from '../components/plants/AddPlantDialog'
import Sidebar from '../components/Sidebar'
import MobileSearchDrawer from '../components/search/MobileSearchDrawer'
import Action from '../components/ui/Action'
import ErrorBoundary from '../components/ui/errors/ErrorBoundary'
import ErrorState from '../components/ui/errors/ErrorState'
import ProgressBar from '../components/ui/ProgressBar'
import Spinner from '../components/ui/Spinner'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../hooks/useAuth'
import { useFirstRunReveal } from '../hooks/useFirstRunReveal'
import { useSearchActions } from '../hooks/useSearch'

function RouteFallback() {
  return (
    <div className="flex items-center justify-center min-h-[50dvh]">
      <Spinner />
    </div>
  )
}

function renderRouteError({ reset }) {
  return (
    <ErrorState
      scheme="500"
      title={
        <>
          Something <em>wobbled</em> on our end
        </>
      }
      description="The page tripped over a root. It's not your fault — try again, or head back to Today."
      actions={[
        <Action key="retry" type="button" variant="primary" onClick={reset}>
          Try again
        </Action>,
        <Action key="home" variant="secondary" to="/">
          Back to Today
        </Action>,
      ]}
    />
  )
}

export default function AppLayout() {
  const mainRef = useRef(null)
  const location = useLocation()
  const previousPathRef = useRef(location.pathname)

  const { isFirstRun } = useFirstRunReveal()
  const { user } = useAuth()
  const toast = useToast()
  const shouldReduceMotion = useReducedMotion()
  // Strict Mode double-invokes the toast effect in dev; the ref guard
  // keeps a single welcome toast regardless of how many times the effect
  // fires against the same mount.
  const welcomeToastFiredRef = useRef(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { closeMobileDrawer: closeSearchDrawer } = useSearchActions()

  // Move focus to <main> on every route change so screen-reader users hear
  // the new page's context instead of dead silence after a NavLink click.
  // previousPathRef starts seeded with the initial pathname so the first
  // render's effect run is a no-op (no focus steal on mount). Subsequent
  // changes update the ref and focus main.
  useEffect(() => {
    if (previousPathRef.current === location.pathname) return
    previousPathRef.current = location.pathname
    mainRef.current?.focus()
    setDrawerOpen(false)
    closeSearchDrawer()
  }, [location.pathname, closeSearchDrawer])

  useEffect(() => {
    if (!isFirstRun || !user || welcomeToastFiredRef.current) return
    welcomeToastFiredRef.current = true
    const firstName = user.name?.split(' ')[0] ?? 'there'
    toast.info(`Welcome, ${firstName} 🌿`)
  }, [isFirstRun, user, toast])

  const animateMain = isFirstRun && !shouldReduceMotion

  return (
    <div className="h-dvh flex flex-col">
      {/* Skip link — first focusable element on the page. Appears on focus
          so keyboard users can jump past the Sidebar/Dock without Tabbing
          through every nav item first. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-forest focus:text-card focus:rounded-md focus:shadow-lg focus:no-underline"
      >
        Skip to main content
      </a>

      <Sidebar isFirstRun={isFirstRun} isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <MobileTopBar isFirstRun={isFirstRun} onMenuOpen={() => setDrawerOpen(true)} />
      <ProgressBar />

      {animateMain ? (
        <motion.main
          ref={mainRef}
          id="main-content"
          tabIndex={-1}
          className="md:ml-[64px] desktop:ml-[260px] pt-[calc(env(safe-area-inset-top)+74px)] md:pt-0 pb-[calc(74px+clamp(2px,env(safe-area-inset-bottom),12px))] xs:pb-0 flex flex-col flex-1 min-h-0 overflow-y-auto focus:outline-none"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.15 }}
        >
          <Suspense fallback={<RouteFallback />}>
            <ErrorBoundary key={location.pathname} fallback={renderRouteError}>
              <Outlet />
            </ErrorBoundary>
          </Suspense>
        </motion.main>
      ) : (
        <main
          ref={mainRef}
          id="main-content"
          tabIndex={-1}
          className="md:ml-[64px] desktop:ml-[260px] pt-[calc(env(safe-area-inset-top)+74px)] md:pt-0 pb-[calc(74px+clamp(2px,env(safe-area-inset-bottom),12px))] xs:pb-0 flex flex-col flex-1 min-h-0 overflow-y-auto focus:outline-none"
        >
          <Suspense fallback={<RouteFallback />}>
            <ErrorBoundary key={location.pathname} fallback={renderRouteError}>
              <Outlet />
            </ErrorBoundary>
          </Suspense>
        </main>
      )}

      <Dock isFirstRun={isFirstRun} />
      <NotificationsDrawer />
      <OrganiserDrawer />
      <MobileSearchDrawer />
      <AddPlantDialog />
      <AchievementsListener />
      <AchievementSplash />
    </div>
  )
}
