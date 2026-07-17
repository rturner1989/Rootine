import Card from '../ui/Card'
import IconDisc from '../ui/IconDisc'

// The unit renders in its own typeface beside the value, so these are
// bare nouns — `pluralize` bakes the count in and would double it.
function unitFor(count, singular, plural = `${singular}s`) {
  return count === 1 ? singular : plural
}

// Rescues and Vitality lead mockup 24's strip, but only Vitality has a
// backing calculation — care logs take the fourth slot until a rescue
// concept exists. Tints skip coral deliberately: it reads as overdue
// everywhere else in the app, which is the wrong note for a tally.
function statsFrom(stats) {
  return [
    {
      key: 'streak',
      icon: '🔥',
      label: 'Streak',
      value: stats.care_streak_days,
      unit: unitFor(stats.care_streak_days, 'day'),
      tint: 'bg-sunshine/20 text-sunshine-deep',
    },
    {
      key: 'greenhouse',
      icon: '🌿',
      label: 'Greenhouse',
      value: stats.plants_count,
      unit: unitFor(stats.plants_count, 'plant'),
      tint: 'bg-mint text-emerald',
    },
    {
      key: 'care_logs',
      icon: '🌟',
      label: 'Care logged',
      value: stats.care_logs_count,
      unit: unitFor(stats.care_logs_count, 'time'),
      tint: 'bg-sky/40 text-sky-deep',
    },
    {
      key: 'vitality',
      icon: '❤️',
      label: 'Vitality',
      value: `${stats.vitality_percent}%`,
      unit: 'avg',
      tint: 'bg-emerald/15 text-forest',
    },
  ]
}

export default function StatStrip({ stats }) {
  if (!stats) return null

  return (
    <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {statsFrom(stats).map((stat) => (
        <li key={stat.key}>
          <Card variant="paper-warm" className="flex-row items-center gap-3 px-4 py-3.5 h-full">
            <IconDisc tint={stat.tint}>{stat.icon}</IconDisc>
            <span className="min-w-0">
              {/* ink-soft, not the mockup's ink-softer — at 10px the latter
                  lands at 3.2:1 on paper and misses AA. */}
              <span className="eyebrow-label block text-ink-soft">{stat.label}</span>
              <span className="block font-display italic font-medium text-[22px] leading-none text-ink">
                {stat.value}{' '}
                <span className="font-sans not-italic text-[11px] font-bold text-ink-soft">{stat.unit}</span>
              </span>
            </span>
          </Card>
        </li>
      ))}
    </ul>
  )
}
