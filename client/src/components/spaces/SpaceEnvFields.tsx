import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import { faDroplet, faSun, faTemperatureHalf } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { HumidityLevel, LightLevel, Space, TemperatureLevel } from '../../types/space'
import { capitalise } from '../../utils/capitalise'
import SegmentedControl from '../form/SegmentedControl'

export type SpaceEnv = {
  light_level: LightLevel
  temperature_level: TemperatureLevel
  humidity_level: HumidityLevel
}

type EnvAxis =
  | { key: 'light_level'; label: string; icon: IconProp; options: LightLevel[]; default: LightLevel }
  | {
      key: 'temperature_level'
      label: string
      icon: IconProp
      options: TemperatureLevel[]
      default: TemperatureLevel
    }
  | { key: 'humidity_level'; label: string; icon: IconProp; options: HumidityLevel[]; default: HumidityLevel }

// Per-space environment axes — the single source for both the flat
// SpaceFormDialog and the AddSpaceDialog wizard. Drives plant scheduling
// (see Space::*_MODIFIERS server-side); defaults match the server's.
export const ENV_AXES: EnvAxis[] = [
  { key: 'light_level', label: 'Light', icon: faSun, options: ['low', 'medium', 'bright'], default: 'medium' },
  {
    key: 'temperature_level',
    label: 'Temperature',
    icon: faTemperatureHalf,
    options: ['cool', 'average', 'warm'],
    default: 'average',
  },
  {
    key: 'humidity_level',
    label: 'Humidity',
    icon: faDroplet,
    options: ['dry', 'average', 'humid'],
    default: 'average',
  },
]

// Seed env state from an existing space (edit) or the axis defaults (create).
export function initEnv(space: Space | null): SpaceEnv {
  return Object.fromEntries(ENV_AXES.map((axis) => [axis.key, space?.[axis.key] ?? axis.default])) as SpaceEnv
}

type SpaceEnvFieldsProps = {
  env: SpaceEnv
  onChange: (key: keyof SpaceEnv, value: string) => void
}

// `onChange(axisKey, value)`.
export default function SpaceEnvFields({ env, onChange }: SpaceEnvFieldsProps) {
  return ENV_AXES.map((axis) => (
    <SegmentedControl
      key={axis.key}
      label={
        <span className="flex items-center gap-1.5">
          <FontAwesomeIcon icon={axis.icon} aria-hidden="true" className="w-3 h-3" />
          {axis.label}
        </span>
      }
      value={env[axis.key]}
      onChange={(next) => onChange(axis.key, next)}
      options={axis.options.map((option) => ({ value: option, label: capitalise(option) }))}
      density="equal"
    />
  ))
}
