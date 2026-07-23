import Card from '../ui/Card'
import Heading from '../ui/Heading'

// Anonymous, server-computed facts about how people here actually grow this
// species. Everything is read straight from the `community` payload — the
// client never recomputes an interval or a percentage. Absent below the
// server's grower-privacy floor.
export default function CommunityStats({ community }) {
  if (!community) {
    return (
      <Card variant="paper-warm" className="p-5 gap-3">
        <Card.Header divider={false}>
          <Heading as="h2" variant="panel" className="text-ink !text-[18px]">
            How people grow this
          </Heading>
        </Card.Header>
        <Card.Body className="!flex-none !overflow-visible">
          <p className="text-sm text-ink-soft italic">
            Not enough growers yet — community stats appear once a few more people are growing this.
          </p>
        </Card.Body>
      </Card>
    )
  }

  const stats = [
    { label: 'Growers here', value: community.grower_count },
    { label: 'Typically watered', value: `every ${community.median_watering_days} days` },
    { label: 'Usual light', value: community.typical_light },
    { label: 'Kept on schedule', value: `${community.kept_on_schedule_pct}%` },
  ]

  return (
    <Card variant="paper-warm" className="p-5 gap-3">
      <Card.Header divider={false}>
        <Heading as="h2" variant="panel" className="text-ink !text-[18px]">
          How people grow this
        </Heading>
      </Card.Header>
      <Card.Body className="!flex-none !overflow-visible">
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-0.5 px-3 py-2 rounded-md bg-paper-deep/40">
              <dt className="eyebrow-label text-ink-softer">{stat.label}</dt>
              <dd className="text-sm font-bold text-ink">{stat.value ?? '—'}</dd>
            </div>
          ))}
        </dl>
      </Card.Body>
    </Card>
  )
}
