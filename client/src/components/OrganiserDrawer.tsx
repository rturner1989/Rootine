import { useLocation } from 'react-router-dom'
import { useOrganiserContext } from '../hooks/useOrganiserContext'
import GoalsWidget from './organiser/GoalsWidget'
import StreakStat from './today/StreakStat'
import WeatherWidget from './today/WeatherWidget'
import DialogCard from './ui/DialogCard'
import Drawer from './ui/Drawer'
import Heading from './ui/Heading'

// Organiser is the global "snapshot" drawer — opens from any page via
// the ✎ trigger in the chrome (Sidebar / MobileTopBar). Content is
// route-aware: on Today, weather/calendar/streak live in the page body
// so the drawer holds only Goals (no duplication). On every other
// route, the drawer carries the full snapshot suite so users get
// quick-look context from House, Plant Detail, Encyclopedia, Me,
// Journal, etc. Achievements live in Notifications (events surface,
// not state). Trophy room is a future Phase 2/3 feature on /me.
// Notifications stays a separate drawer (events vs state — see memory
// project_organiser_vs_notifications_scope).

const STREAK_HEADER_ICON = (
  <span
    aria-hidden="true"
    className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[12px] bg-coral/20 text-coral-deep"
  >
    🔥
  </span>
)

function StreakCard() {
  return (
    <DialogCard icon={STREAK_HEADER_ICON} label="Visit streak">
      <div className="px-3 pb-3 flex justify-center">
        <StreakStat />
      </div>
    </DialogCard>
  )
}

export default function OrganiserDrawer() {
  const { open, closeDrawer } = useOrganiserContext()
  const location = useLocation()
  const isToday = location.pathname === '/'

  return (
    <Drawer open={open} onClose={closeDrawer} title="Organiser">
      <header className="px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2.5 shrink-0">
        <Heading as="h2" variant="panel">
          Organiser
        </Heading>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-col gap-3">
        {!isToday && (
          <>
            <WeatherWidget />
            <StreakCard />
          </>
        )}
        <GoalsWidget />
      </div>
    </Drawer>
  )
}
