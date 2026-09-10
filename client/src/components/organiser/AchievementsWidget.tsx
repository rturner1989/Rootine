import { useAchievements } from '../../hooks/useAchievements'
import DialogCard from '../ui/DialogCard'

const HEADER_ICON = (
  <span
    aria-hidden="true"
    className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[12px] bg-sunshine/30 text-sunshine-deep"
  >
    ★
  </span>
)

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })

export default function AchievementsWidget() {
  const { achievements, isLoading } = useAchievements()

  function renderBody() {
    if (isLoading) return <p className="px-3 pb-3 text-xs text-ink-soft">Loading…</p>
    if (achievements.length === 0) {
      return <p className="px-3 pb-3 text-xs text-ink-soft">No achievements yet — keep tending.</p>
    }
    return (
      <ul className="flex flex-col gap-1.5 px-2 pb-2">
        {achievements.map((entry) => (
          <li key={entry.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md bg-paper-deep/40">
            <span aria-hidden="true" className="text-base shrink-0">
              {entry.emoji}
            </span>
            <span className="flex-1 min-w-0 text-xs font-semibold text-ink truncate">{entry.label}</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-ink-softer shrink-0">
              {DATE_FORMATTER.format(new Date(entry.earned_at))}
            </span>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <DialogCard icon={HEADER_ICON} label="Recently earned">
      {renderBody()}
    </DialogCard>
  )
}
