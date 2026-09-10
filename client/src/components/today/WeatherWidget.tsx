import { useWeather } from '../../hooks/useWeather'
import type { CurrentWeather, ForecastDay } from '../../types/weather'
import DialogCard from '../ui/DialogCard'
import LocationButton from './LocationButton'
import WeatherIcon from './WeatherIcon'

const DEFAULT_LOCATION_LABEL = 'Greenwich (default)'

const HEADER_ICON = <WeatherIcon scheme="heat" iconName="sun" size={22} className="!shadow-none" />

const DAY_FORMATTER = new Intl.DateTimeFormat(undefined, { weekday: 'short' })
const TODAY_FORMATTER = new Intl.DateTimeFormat(undefined, { weekday: 'long' })
const TOMORROW_FORMATTER = new Intl.DateTimeFormat(undefined, { weekday: 'long' })

function parseLocalDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

type StripVariantProps = {
  today: CurrentWeather
  locationLabel: string | null
  week: ForecastDay[]
}

function StripVariant({ today, locationLabel, week }: StripVariantProps) {
  const tomorrow = week[1]
  const tomorrowLabel = tomorrow ? TOMORROW_FORMATTER.format(parseLocalDate(tomorrow.date)) : null
  const todayLabel = TODAY_FORMATTER.format(new Date())
  const isDefaultLocation = locationLabel === DEFAULT_LOCATION_LABEL

  return (
    <section aria-label="Weather" className="flex items-stretch gap-4 px-5 py-4 rounded-md bg-paper shadow-warm-sm">
      <WeatherIcon scheme={today.scheme} iconName={today.icon_name} size={56} />

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-emerald mb-0.5">
          Today · {todayLabel}
        </span>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-display italic font-medium text-3xl text-ink leading-none">{today.temperature}°</span>
          <span className="text-sm font-bold text-ink">{today.label}</span>
          {locationLabel && <span className="text-xs text-ink-softer">· {locationLabel}</span>}
          {isDefaultLocation && <LocationButton />}
        </div>
        {today.advice && <p className="text-sm font-display italic text-emerald mt-1">{today.advice}</p>}
      </div>

      <div className="hidden sm:flex items-stretch shrink-0">
        <span aria-hidden="true" className="w-px bg-paper-edge mx-4" />
        <div className="flex flex-col items-end justify-center gap-0.5 text-right">
          {today.overnight_low != null && (
            <span className="text-xs text-ink-soft">
              <strong className="font-extrabold text-ink">{today.overnight_low}°</strong> overnight
            </span>
          )}
          {tomorrow && (
            <span className="text-xs text-ink-soft">
              <strong className="font-bold text-ink">{tomorrowLabel}</strong>
              {' · '}
              {tomorrow.label.toLowerCase()}
              {today.next_day?.rain_probability != null ? ` ${today.next_day.rain_probability}%` : ''}
            </span>
          )}
        </div>
      </div>
    </section>
  )
}

type CardVariantProps = {
  today: CurrentWeather
  week: ForecastDay[]
}

function CardVariant({ today, week }: CardVariantProps) {
  return (
    <DialogCard icon={HEADER_ICON} label="Weather" headingVariant="panel">
      <div className="flex flex-col gap-3 px-3 pb-3">
        <div className="flex items-center gap-3">
          <WeatherIcon scheme={today.scheme} iconName={today.icon_name} size={48} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-extrabold text-ink leading-tight">{today.label}</p>
            <p className="text-xs text-ink-soft mt-0.5">{today.detail}</p>
          </div>
          {today.overnight_low != null && (
            <div className="text-right shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-ink-softer">Tonight</p>
              <p className="text-sm font-extrabold text-ink">{today.overnight_low}°</p>
            </div>
          )}
        </div>

        <ul className="flex justify-between gap-1 pt-1 border-t border-paper-edge/40">
          {week.slice(0, 5).map((day) => (
            <li key={day.date} className="flex flex-col items-center gap-1.5 flex-1 min-w-0 pt-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-ink-softer">
                {DAY_FORMATTER.format(parseLocalDate(day.date))}
              </span>
              <WeatherIcon scheme={day.scheme} iconName={day.icon_name} size={28} />
              <span className="text-[11px] font-semibold text-ink">{day.temperature}°</span>
            </li>
          ))}
        </ul>
      </div>
    </DialogCard>
  )
}

export type WeatherWidgetVariant = 'card' | 'strip'

export type WeatherWidgetProps = {
  variant?: WeatherWidgetVariant
}

export default function WeatherWidget({ variant = 'card' }: WeatherWidgetProps) {
  const { today, week, locationLabel, isLoading } = useWeather()

  if (isLoading || !today) {
    if (variant === 'strip') {
      return (
        <section aria-label="Weather" className="flex items-center px-5 py-4 rounded-md bg-paper shadow-warm-sm">
          <p className="text-xs text-ink-soft">Loading weather…</p>
        </section>
      )
    }
    return (
      <DialogCard icon={HEADER_ICON} label="Weather" headingVariant="panel">
        <div className="px-3 pb-3 text-xs text-ink-soft">Loading…</div>
      </DialogCard>
    )
  }

  if (variant === 'strip') {
    return <StripVariant today={today} locationLabel={locationLabel} week={week} />
  }
  return <CardVariant today={today} week={week} />
}
