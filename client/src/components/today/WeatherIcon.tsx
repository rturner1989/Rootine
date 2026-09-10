import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import {
  faCloud,
  faCloudBolt,
  faCloudRain,
  faCloudShowersHeavy,
  faCloudSun,
  faQuestion,
  faSmog,
  faSnowflake,
  faSun,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

// Backend `icon_name` (kebab-case FontAwesome alias) → Solid icon. Server
// ships icon_name/scheme as plain strings (types/weather.ts), so lookups
// below key on `string` rather than a literal union — the `??` fallbacks
// are load-bearing, not just type-satisfying.
const ICON_BY_NAME: Record<string, IconDefinition> = {
  sun: faSun,
  'cloud-sun': faCloudSun,
  cloud: faCloud,
  'cloud-rain': faCloudRain,
  'cloud-showers-heavy': faCloudShowersHeavy,
  'cloud-bolt': faCloudBolt,
  snowflake: faSnowflake,
  smog: faSmog,
  question: faQuestion,
}

const SCHEME_GRADIENT: Record<string, string> = {
  heat: 'radial-gradient(circle at 30% 30%, #ffe7a3, #ffc061)',
  sky: 'radial-gradient(circle at 30% 30%, #bfe0eb, #6eb9d1)',
  frost: 'radial-gradient(circle at 30% 30%, #eff3fb, #b0bbd6)',
}

const SCHEME_TEXT: Record<string, string> = {
  heat: 'text-sunshine-deep',
  sky: 'text-sky-deep',
  frost: 'text-frost-deep',
}

export type WeatherIconProps = {
  scheme?: string
  iconName: string
  size?: number
  className?: string
}

export default function WeatherIcon({ scheme = 'sky', iconName, size = 56, className = '' }: WeatherIconProps) {
  const icon = ICON_BY_NAME[iconName] ?? faQuestion
  const gradient = SCHEME_GRADIENT[scheme] ?? SCHEME_GRADIENT.sky
  const textClass = SCHEME_TEXT[scheme] ?? SCHEME_TEXT.sky
  const iconSize = Math.round(size * 0.45)

  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center rounded-full shrink-0 shadow-warm-sm ${textClass} ${className}`}
      style={{ width: size, height: size, background: gradient }}
    >
      <FontAwesomeIcon icon={icon} style={{ width: iconSize, height: iconSize }} />
    </span>
  )
}
