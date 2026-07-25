import { useDashboard } from '../../hooks/useDashboard'
import ProgressRing from '../ProgressRing'

const MILESTONES = [7, 30, 100, 365]

function nextMilestone(current) {
  return MILESTONES.find((target) => current < target) ?? MILESTONES.at(-1)
}

// Direct port of the v2 mockup `.progress-ring.streak` (docs/mockups/plantcare-ui/v2/17-today-density-v1.html).
// Coral ring fills toward the next milestone (7 → 30 → 100 → 365).
// Reuses the ProgressRing primitive established in onboarding so the
// shape stays consistent across surfaces.
export default function StreakStat({ className = '' }) {
  const { data } = useDashboard()
  const current = data?.streak?.current ?? 0
  const target = nextMilestone(current)
  const percent = Math.min(100, Math.round((current / target) * 100))

  return (
    <ProgressRing
      value={percent}
      size={72}
      strokeWidth={5}
      color="var(--coral)"
      trackColor="var(--paper-deep)"
      className={className}
    >
      <span className="flex flex-col items-center justify-center leading-none">
        <span className="font-display italic font-medium text-[22px] text-coral-deep">{current}</span>
        <span className="mt-1 text-[9px] font-extrabold tracking-[0.12em] uppercase text-ink-softer">Day streak</span>
      </span>
    </ProgressRing>
  )
}
