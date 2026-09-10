import { motion, useReducedMotion } from 'motion/react'
import type { CurrentWeather, ForecastDay } from '../../types/weather'

const SCHEMES = {
  sky: {
    iconGradient: 'radial-gradient(circle at 30% 30%, #bfe0eb, #6eb9d1)',
    iconText: 'text-paper',
    iconRing: 'inset 0 0 0 1px rgba(44,106,148,0.18), 0 4px 10px rgba(110,185,209,0.25)',
    pillBg: 'bg-sky',
    pillText: 'text-sky-deep',
    pillRing: 'inset 0 0 0 1px rgba(44,106,148,0.18)',
    miniIconBg: 'bg-sky-deep',
    miniIconText: 'text-paper',
    cellBg: 'bg-sky',
    cellText: 'text-sky-deep',
  },
  frost: {
    iconGradient: 'radial-gradient(circle at 30% 30%, #eff3fb, #b0bbd6)',
    iconText: 'text-paper',
    iconRing: 'inset 0 0 0 1px rgba(58,74,116,0.18), 0 4px 10px rgba(176,187,214,0.25)',
    pillBg: 'bg-frost',
    pillText: 'text-frost-deep',
    pillRing: 'inset 0 0 0 1px rgba(58,74,116,0.18)',
    miniIconBg: 'bg-frost-deep',
    miniIconText: 'text-paper',
    cellBg: 'bg-frost',
    cellText: 'text-frost-deep',
  },
  // Heat reuses the sunshine palette — comment in globals.css reserved
  // --color-heat for whoever landed it; sunshine semantically covers
  // "warm sunny / heatwave" already and avoids a new token.
  heat: {
    iconGradient: 'radial-gradient(circle at 30% 30%, #ffe7a3, #ffc061)',
    iconText: 'text-ink',
    iconRing: 'inset 0 0 0 1px rgba(165,109,18,0.15), 0 4px 10px rgba(255,184,61,0.2)',
    pillBg: 'bg-sunshine/30',
    pillText: 'text-sunshine-deep',
    pillRing: 'inset 0 0 0 1px rgba(165,109,18,0.18)',
    miniIconBg: 'bg-sunshine-deep',
    miniIconText: 'text-paper',
    cellBg: 'bg-sunshine/25',
    cellText: 'text-sunshine-deep',
  },
} as const

export type WeatherScheme = keyof typeof SCHEMES

export type WeatherVariant = 'strip' | 'group' | 'calendar'

// icon/label/scheme mirror the fields OpenMeteoClient ships on both
// CurrentWeather (today) and ForecastDay (week) — the server owns the
// shape, this just borrows the field types rather than redeclaring them.
type WeatherIcon = CurrentWeather['icon'] | ForecastDay['icon']
type WeatherLabel = CurrentWeather['label'] | ForecastDay['label']
type WeatherDetail = CurrentWeather['detail']

type SchemeRecipe = (typeof SCHEMES)[WeatherScheme]

const PULSE_ANIMATE = { scale: [1, 1.04, 1], opacity: [1, 0.92, 1] }
// `as const` keeps `ease` as the literal 'easeInOut' Motion's Easing type
// expects — without it the object literal widens `ease` to `string`, which
// Motion's Transition type rejects.
const PULSE_TRANSITION = { duration: 2.4, ease: 'easeInOut', repeat: Infinity } as const

function pulseProps(urgent: boolean, shouldReduceMotion: boolean | null) {
  if (!urgent || shouldReduceMotion) return {}
  return { animate: PULSE_ANIMATE, transition: PULSE_TRANSITION }
}

type StripVariantProps = {
  scheme: SchemeRecipe
  icon: WeatherIcon
  label: WeatherLabel
  detail?: WeatherDetail
  urgent: boolean
  shouldReduceMotion: boolean | null
}

function StripVariant({ scheme, icon, label, detail, urgent, shouldReduceMotion }: StripVariantProps) {
  return (
    <motion.div
      role={urgent ? 'status' : undefined}
      aria-live={urgent ? 'polite' : undefined}
      className="flex items-center gap-3.5 px-5 py-4 rounded-lg bg-paper shadow-warm-sm"
      {...pulseProps(urgent, shouldReduceMotion)}
    >
      <span
        aria-hidden="true"
        className={`w-14 h-14 rounded-full flex items-center justify-center text-[22px] shrink-0 ${scheme.iconText}`}
        style={{ background: scheme.iconGradient, boxShadow: scheme.iconRing }}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-extrabold text-ink leading-tight">{label}</p>
        {detail && <p className="text-xs text-ink-soft mt-0.5">{detail}</p>}
      </div>
    </motion.div>
  )
}

type GroupVariantProps = {
  scheme: SchemeRecipe
  icon: WeatherIcon
  label: WeatherLabel
  urgent: boolean
  shouldReduceMotion: boolean | null
}

function GroupVariant({ scheme, icon, label, urgent, shouldReduceMotion }: GroupVariantProps) {
  return (
    <motion.span
      role={urgent ? 'status' : undefined}
      aria-live={urgent ? 'polite' : undefined}
      className={`inline-flex items-center gap-1.5 pl-1 pr-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight ${scheme.pillBg} ${scheme.pillText}`}
      style={{ boxShadow: scheme.pillRing }}
      {...pulseProps(urgent, shouldReduceMotion)}
    >
      <span
        aria-hidden="true"
        className={`w-4 h-4 rounded-full inline-flex items-center justify-center text-[9px] ${scheme.miniIconBg} ${scheme.miniIconText}`}
      >
        {icon}
      </span>
      {label}
    </motion.span>
  )
}

type CalendarVariantProps = {
  scheme: SchemeRecipe
  icon: WeatherIcon
  label?: WeatherLabel
}

function CalendarVariant({ scheme, icon, label }: CalendarVariantProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${scheme.cellBg} ${scheme.cellText}`}
    >
      <span aria-hidden="true">{icon}</span>
      {label && <span className="sr-only">{label}</span>}
    </span>
  )
}

export type WeatherProps = {
  variant?: WeatherVariant
  scheme?: WeatherScheme
  icon: WeatherIcon
  label: WeatherLabel
  detail?: WeatherDetail
  urgent?: boolean
}

export default function Weather({
  variant = 'strip',
  scheme = 'sky',
  icon,
  label,
  detail,
  urgent = false,
}: WeatherProps) {
  const shouldReduceMotion = useReducedMotion()
  const schemeRecipe = SCHEMES[scheme] ?? SCHEMES.sky

  if (variant === 'group') {
    return (
      <GroupVariant
        scheme={schemeRecipe}
        icon={icon}
        label={label}
        urgent={urgent}
        shouldReduceMotion={shouldReduceMotion}
      />
    )
  }
  if (variant === 'calendar') {
    return <CalendarVariant scheme={schemeRecipe} icon={icon} label={label} />
  }
  return (
    <StripVariant
      scheme={schemeRecipe}
      icon={icon}
      label={label}
      detail={detail}
      urgent={urgent}
      shouldReduceMotion={shouldReduceMotion}
    />
  )
}
