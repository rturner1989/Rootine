import PageHeader from '../ui/PageHeader'
import StreakStat from './StreakStat'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatToday() {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  })
}

export type TodayHeaderProps = {
  firstName?: string
}

export default function TodayHeader({ firstName }: TodayHeaderProps) {
  return (
    <PageHeader eyebrow={`${getGreeting()} · ${formatToday()}`} headingVariant="display-lg" actions={<StreakStat />}>
      Hi, <span className="text-emerald">{firstName ?? 'there'}</span>
    </PageHeader>
  )
}
