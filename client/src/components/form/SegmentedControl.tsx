import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { useId } from 'react'
import Spinner from '../ui/Spinner'

// Hidden radios inside labels — native arrow-key navigation + form semantics
// for free. The active pill slides between positions via a shared layoutId.

const TRACK_BASE = 'gap-[3px] bg-paper-deep border border-paper-edge p-[3px] rounded-md'
const LABEL = 'flex items-center gap-1.5 eyebrow-label text-ink-soft'
const OPTION_BASE =
  'relative flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-[11px] text-xs capitalize transition-colors duration-200'
const OPTION_ACTIVE = 'text-forest font-bold'
const OPTION_INACTIVE = 'text-ink-soft font-medium'
const OPTION_ENABLED = 'cursor-pointer'
const OPTION_DISABLED = 'cursor-not-allowed opacity-50'
const PILL = 'absolute inset-0 bg-paper rounded-[11px] shadow-[var(--shadow-warm-sm)]'
const SPRING = { type: 'spring', stiffness: 400, damping: 30 } as const

export type SegmentedControlOptionObject = {
  value: string
  label: ReactNode
  icon?: IconProp | string
  disabled?: boolean
  phase?: string
  loading?: boolean
  hint?: string
}

export type SegmentedControlOption = string | SegmentedControlOptionObject

export type SegmentedControlDensity = 'equal' | 'compact'

export type SegmentedControlProps = {
  icon?: IconProp
  label: ReactNode
  labelHidden?: boolean
  value: string
  onChange: (value: string) => void
  options: SegmentedControlOption[]
  density?: SegmentedControlDensity
  className?: string
}

function normalizeOption(option: SegmentedControlOption): SegmentedControlOptionObject {
  if (typeof option === 'string') return { value: option, label: option }
  return option
}

function isFontAwesomeIcon(icon: IconProp | string | undefined): icon is IconProp {
  return Boolean(icon) && typeof icon === 'object' && 'iconName' in icon
}

type OptionIconProps = {
  icon?: IconProp | string
  loading?: boolean
}

function OptionIcon({ icon, loading }: OptionIconProps) {
  if (loading) return <Spinner size="sm" className="relative w-3 h-3 border-[1.5px]" />
  if (!icon) return null
  if (isFontAwesomeIcon(icon)) {
    return <FontAwesomeIcon icon={icon} className="relative text-sm" aria-hidden="true" />
  }
  return (
    <span aria-hidden="true" className="relative text-[13px] leading-none">
      {icon}
    </span>
  )
}

export default function SegmentedControl({
  icon,
  label,
  labelHidden = false,
  value,
  onChange,
  options,
  density = 'equal',
  className = '',
}: SegmentedControlProps) {
  const groupName = useId()
  // Unique per instance — Step 4 stacks three, a shared layoutId would
  // animate the pill between unrelated controls.
  const pillLayoutId = useId()
  const shouldReduceMotion = useReducedMotion()
  const normalized = options.map(normalizeOption)

  const showLabel = label && !labelHidden
  const layoutClass = density === 'equal' ? 'grid' : 'inline-flex'
  const trackClass = `${layoutClass} ${TRACK_BASE} ${showLabel ? 'mt-2' : ''}`
  const trackStyle =
    density === 'equal' ? { gridTemplateColumns: `repeat(${normalized.length}, minmax(0, 1fr))` } : undefined

  return (
    <div className={className}>
      {showLabel && (
        <span className={LABEL}>
          {icon && <FontAwesomeIcon icon={icon} className="text-sm text-emerald" aria-hidden="true" />}
          {label}
        </span>
      )}
      <div className={trackClass} style={trackStyle} role="radiogroup" aria-label={String(label)}>
        {normalized.map((option) => {
          const isActive = option.value === value
          const isDisabled = Boolean(option.disabled)
          return (
            <label
              key={option.value}
              className={`${OPTION_BASE} ${isActive ? OPTION_ACTIVE : OPTION_INACTIVE} ${isDisabled ? OPTION_DISABLED : OPTION_ENABLED}`}
              title={option.hint}
            >
              <input
                type="radio"
                name={groupName}
                value={option.value}
                checked={isActive}
                disabled={isDisabled}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {isActive && (
                <motion.span
                  layoutId={pillLayoutId}
                  className={PILL}
                  transition={shouldReduceMotion ? { duration: 0 } : SPRING}
                  aria-hidden="true"
                />
              )}
              <OptionIcon icon={option.icon} loading={option.loading} />
              <span className="relative">{option.label}</span>
              {option.phase && (
                <span
                  aria-hidden="true"
                  className="relative ml-0.5 px-1 rounded-sm bg-sunshine text-ink text-[8px] font-extrabold tracking-wide"
                >
                  {option.phase}
                </span>
              )}
            </label>
          )
        })}
      </div>
    </div>
  )
}
