import DialogCard from '../ui/DialogCard'

const HEADER_ICON = (
  <span
    aria-hidden="true"
    className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[12px] bg-emerald/20 text-emerald"
  >
    ◎
  </span>
)

// Goals shipping is gated on the per-intent UX work in R10-R13 (see
// memory `project_goals_exploration.md`). Until that lands the widget
// reads as a deliberate placeholder rather than fabricated stats —
// previous mock data ("8/30 watering streak") looked authoritative on
// fresh signup and gave the wrong impression.
export default function GoalsWidget() {
  return (
    <DialogCard icon={HEADER_ICON} label="Goals">
      <div className="px-3 pb-3 pt-1 text-center">
        <p className="text-sm font-semibold text-ink">Goals coming soon</p>
        <p className="text-xs text-ink-soft mt-1">Track streaks, milestones, and the shape of your plant collection.</p>
      </div>
    </DialogCard>
  )
}
