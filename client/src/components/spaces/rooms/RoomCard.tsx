import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Species } from '../../../types/species'
import PlantAvatar from '../../plants/Avatar'
import Card from '../../ui/Card'

const PEEK_LIMIT = 3

const ICON_VARIANT = {
  indoor: 'bg-mint text-emerald',
  outdoor: 'bg-sunshine/20 text-sunshine-deep',
} as const

type RoomCardVariant = keyof typeof ICON_VARIANT

export type RoomCardPeekPlant = {
  id: number
  nickname: string
  species: Species | null
  urgent: boolean
}

export type RoomCardNextCare = {
  icon: string
  label: string
  overdue: boolean
}

export type RoomCardWeatherPill = {
  icon: string
  label: string
  scheme: string
}

type RoomCardProps = {
  spaceId: number
  icon: string | undefined
  name: string
  count: string
  variant?: RoomCardVariant
  peek?: RoomCardPeekPlant[]
  nextCare?: RoomCardNextCare | null
  envHint?: string | null
  weatherPill?: RoomCardWeatherPill | null
}

export default function RoomCard({
  spaceId,
  icon,
  name,
  count,
  variant = 'indoor',
  peek = [],
  nextCare,
  envHint,
  weatherPill,
}: RoomCardProps) {
  const visiblePeek = peek.slice(0, PEEK_LIMIT)
  const hiddenCount = Math.max(0, peek.length - PEEK_LIMIT)

  return (
    <Card variant="paper-warm" className="h-full min-h-[200px] p-4 gap-2.5">
      <Card.Header divider={false} className="flex items-start gap-2.5">
        <span
          aria-hidden="true"
          className={`shrink-0 w-[34px] h-[34px] rounded-full flex items-center justify-center text-base ${ICON_VARIANT[variant]}`}
        >
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-extrabold text-ink tracking-tight truncate">{name}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-softer">{count}</p>
        </div>
        {/* Reserves space for the absolute-positioned actions menu
            (parent <li>). Keeps the title block from running into it. */}
        <span aria-hidden="true" className="shrink-0 w-[32px] h-7" />
      </Card.Header>

      <Card.Body className="!overflow-visible !flex-none">
        {peek.length > 0 && (
          <ul className="peek-row list-none p-0">
            {visiblePeek.map((plant, index) => (
              <li
                key={plant.id ?? index}
                className={`relative ${index === 0 ? 'ml-0' : '-ml-1.5'} ${
                  plant.urgent ? 'rounded-full ring-2 ring-coral shadow-[0_2px_6px_rgba(255,107,61,0.2)]' : ''
                }`}
              >
                <Link
                  to={`/plants/${plant.id}`}
                  aria-label={`View ${plant.nickname ?? plant.species?.common_name ?? 'plant'}`}
                  className="block rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-paper-warm"
                >
                  <PlantAvatar imageUrl={plant.species?.image_url} size="xs" shape="circle" />
                </Link>
              </li>
            ))}
            {hiddenCount > 0 && (
              <li key="more" className="-ml-1.5">
                <Link
                  to={`/house?view=list&space_id=${spaceId}`}
                  aria-label={`See all ${peek.length} plants in this space`}
                  className="w-8 h-8 rounded-full bg-paper-deep flex items-center justify-center text-[10px] font-extrabold text-ink-soft shadow-[inset_0_0_0_1px_var(--color-paper-edge),0_2px_6px_rgba(11,58,26,0.08)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-paper-warm hover:bg-paper transition-colors"
                >
                  +{hiddenCount}
                </Link>
              </li>
            )}
          </ul>
        )}
      </Card.Body>

      <Card.Footer
        divider={false}
        className="mt-auto pt-2.5 border-t border-dashed border-paper-edge flex flex-col gap-1.5 text-[11px] text-ink-soft min-h-[62px]"
      >
        {nextCare && <SummaryRow icon={nextCare.icon} text={nextCare.label} overdue={nextCare.overdue} />}
        {renderEnvLine({ weatherPill, envHint })}
      </Card.Footer>
    </Card>
  )
}

// weatherPill.scheme is a bare `z.string()` server field (weather.rb's
// scheme names aren't an enumerated contract client-side), so these stay
// indexable by any string rather than the narrow literal keys the object
// happens to define today.
const WEATHER_SCHEME: Record<string, string> = {
  frost: 'bg-frost text-frost-deep ring-frost-deep/20',
  default: 'bg-sky text-sky-deep ring-sky-deep/20',
}
const WEATHER_ICON_SCHEME: Record<string, string> = {
  frost: 'bg-frost-deep text-paper',
  default: 'bg-sky-deep text-paper',
}

function renderEnvLine({
  weatherPill,
  envHint,
}: {
  weatherPill?: RoomCardWeatherPill | null
  envHint?: string | null
}): ReactNode {
  if (weatherPill) {
    return <WeatherPillRow icon={weatherPill.icon} label={weatherPill.label} scheme={weatherPill.scheme} />
  }
  if (envHint) return <SummaryRow icon="☀" text={envHint} />
  return null
}

function WeatherPillRow({ icon, label, scheme }: { icon: string; label: string; scheme: string }) {
  const pillScheme = WEATHER_SCHEME[scheme] ?? WEATHER_SCHEME.default
  const iconScheme = WEATHER_ICON_SCHEME[scheme] ?? WEATHER_ICON_SCHEME.default
  return (
    <p
      className={`self-start max-w-full truncate flex items-center gap-1.5 pl-0.5 pr-2.5 py-0.5 rounded-full ring-1 ring-inset font-bold text-[11px] min-h-[20px] ${pillScheme}`}
    >
      <span
        aria-hidden="true"
        className={`shrink-0 w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] shadow-[0_2px_6px_rgba(44,106,148,0.3)] ${iconScheme}`}
      >
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </p>
  )
}

function SummaryRow({ icon, text, overdue = false }: { icon: string; text: string; overdue?: boolean }) {
  return (
    <p className="flex items-center gap-1.5 font-semibold min-h-[20px]">
      <span
        aria-hidden="true"
        className="shrink-0 w-[18px] h-[18px] rounded-full bg-mint text-emerald flex items-center justify-center text-[10px]"
      >
        {icon}
      </span>
      {overdue ? <em className="font-display italic text-coral-deep font-medium">{text}</em> : <span>{text}</span>}
    </p>
  )
}
