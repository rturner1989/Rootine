import { faDroplet, faSun, faTemperatureHalf } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { capitalise } from '../../utils/capitalise'
import SegmentedControl from '../form/SegmentedControl'

// Per-space environment axes — the single source for both the flat
// SpaceFormDialog and the AddSpaceDialog wizard. Drives plant scheduling
// (see Space::*_MODIFIERS server-side); defaults match the server's.
export const ENV_AXES = [
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
export function initEnv(space) {
  return Object.fromEntries(ENV_AXES.map((axis) => [axis.key, space?.[axis.key] ?? axis.default]))
}

// `onChange(axisKey, value)`.
export default function SpaceEnvFields({ env, onChange }) {
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
