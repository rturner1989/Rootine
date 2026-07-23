import { faDroplet, faSun, faTemperatureHalf } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useCareLogs } from '../../hooks/usePlants'
import { capitalise } from '../../utils/capitalise'
import { pluralize } from '../../utils/pluralize'
import Action from '../ui/Action'
import Card from '../ui/Card'
import EmptyState from '../ui/EmptyState'
import Heading from '../ui/Heading'

const RELATIVE_TIME = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

function PanelHeader({ title, hint }) {
  return (
    <Card.Header divider={false} className="flex items-baseline justify-between gap-3 flex-wrap">
      <Heading as="h2" variant="panel" className="text-ink !text-[18px]">
        {title}
      </Heading>
      {hint && <span className="text-[11px] font-semibold text-ink-soft">{hint}</span>}
    </Card.Header>
  )
}

function PanelRow({ icon, label, sub, action, faIcon }) {
  return (
    <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 border-b border-mint last:border-b-0">
      <span
        aria-hidden="true"
        className="w-10 h-10 rounded-full bg-paper-deep flex items-center justify-center text-base text-ink-soft shrink-0"
      >
        {faIcon ? <FontAwesomeIcon icon={faIcon} className="w-4 h-4" /> : icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-ink leading-tight">{label}</p>
        {sub && <p className="text-xs text-ink-soft leading-snug mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

export default function CareView({ plant }) {
  return (
    <section aria-label="Care details" className="flex flex-col gap-3">
      <SchedulePanel plant={plant} />
      <RecentCarePanel plant={plant} />
      <EnvironmentFitPanel plant={plant} />
    </section>
  )
}

function SchedulePanel({ plant }) {
  const speciesFeeds = Boolean(plant.species?.feeding_frequency_days)
  const spaceTuning = plant.space?.name ? `Tuned to ${plant.space.name}` : null

  return (
    <Card variant="paper-warm" className="p-5 gap-3">
      <PanelHeader title="Schedule" hint="calculated from species + environment" />
      <Card.Body className="!flex-none !overflow-visible flex flex-col">
        {plant.calculated_watering_days && (
          <PanelRow
            icon="💧"
            label="Watering"
            sub={`Every ${pluralize(plant.calculated_watering_days, 'day')}${spaceTuning ? ` · ${spaceTuning}` : ''}`}
          />
        )}
        {speciesFeeds && (
          <PanelRow
            icon="🌱"
            label="Feeding"
            sub={`Every ${pluralize(plant.calculated_feeding_days, 'day')}${spaceTuning ? ` · ${spaceTuning}` : ''}`}
          />
        )}
      </Card.Body>
    </Card>
  )
}

const CARE_TYPE_ICON = { watering: '💧', feeding: '🌱' }
const CARE_TYPE_VERB = { watering: 'Watered', feeding: 'Fed' }

function RecentCarePanel({ plant }) {
  const { data: logs = [], isLoading } = useCareLogs(plant.id)
  const recent = logs.slice(0, 5)

  function renderRows() {
    if (isLoading) return <p className="text-sm text-ink-soft">Loading…</p>
    if (recent.length === 0) {
      return (
        <EmptyState
          variant="inline"
          tone="mint"
          icon={<span>💧</span>}
          title={
            <>
              No care <em className="italic">yet</em>
            </>
          }
          description="Tap the wheel above to log the first watering or feeding — it'll land here."
          headingLevel="h4"
          className="py-4"
        />
      )
    }
    return recent.map((log) => <CareLogRow key={log.id} log={log} />)
  }

  return (
    <Card variant="paper-warm" className="p-5 gap-3">
      <PanelHeader title="Recent care" hint={recent.length > 0 ? `${recent.length} latest` : null} />
      <Card.Body className="!flex-none !overflow-visible flex flex-col">{renderRows()}</Card.Body>
    </Card>
  )
}

function CareLogRow({ log }) {
  const icon = CARE_TYPE_ICON[log.care_type] ?? '🌿'
  const verb = CARE_TYPE_VERB[log.care_type] ?? log.care_type
  const relativeWhen = log.performed_at
    ? RELATIVE_TIME.format(
        Math.round((new Date(log.performed_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        'day',
      )
    : null

  function renderSub() {
    if (!log.notes) return relativeWhen
    return (
      <>
        {relativeWhen}
        {relativeWhen && <span className="mx-1.5 text-ink-softer">·</span>}
        <span className="italic">{log.notes}</span>
      </>
    )
  }

  return <PanelRow icon={icon} label={verb} sub={renderSub()} />
}

const ENV_AXES = [
  {
    key: 'light',
    label: 'Light',
    icon: faSun,
    suggestKey: 'suggested_light_level',
    currentKey: 'light_level',
  },
  {
    key: 'temperature',
    label: 'Temperature',
    icon: faTemperatureHalf,
    suggestKey: 'suggested_temperature_level',
    currentKey: 'temperature_level',
  },
  {
    key: 'humidity',
    label: 'Humidity',
    icon: faDroplet,
    suggestKey: 'suggested_humidity_level',
    currentKey: 'humidity_level',
  },
]

function EnvironmentFitPanel({ plant }) {
  const space = plant.space
  const species = plant.species

  return (
    <Card variant="paper-warm" className="p-5 gap-3">
      <PanelHeader title="Environment fit" hint={space?.name ? `vs ${space.name}` : null} />
      <Card.Body className="!flex-none !overflow-visible flex flex-col">
        {ENV_AXES.map((axis) => {
          const ideal = species?.[axis.suggestKey]
          const current = space?.[axis.currentKey]
          const matched = ideal && current && ideal === current
          const sub = (
            <>
              Wants <span className="font-bold text-ink">{capitalise(ideal) || 'no preference'}</span>
              {current && (
                <>
                  {' · '}has <span className="font-bold text-ink">{capitalise(current)}</span>
                </>
              )}
            </>
          )
          const action = ideal && current && (
            <span
              className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                matched ? 'bg-mint text-emerald' : 'bg-coral/15 text-coral-deep'
              }`}
            >
              {matched ? '✓ Match' : '⚠ Off'}
            </span>
          )
          return <PanelRow key={axis.key} faIcon={axis.icon} label={axis.label} sub={sub} action={action} />
        })}
        {space?.id && (
          <Action
            to={`/house?view=list&space_id=${space.id}`}
            variant="ghost"
            className="self-start text-[11px] font-bold tracking-[0.04em] uppercase text-emerald mt-3"
          >
            Edit in {space.name} →
          </Action>
        )}
      </Card.Body>
    </Card>
  )
}
