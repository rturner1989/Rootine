import type { ReactNode } from 'react'
import ProgressRing from '../ProgressRing'

// Distinct from ProgressRing despite sharing the SVG arc — CareRing
// represents state (Water · Feed · Light · Mood), ProgressRing represents
// progress through a flow. Don't merge them.

const SCHEME_COLOR = {
  sky: 'var(--sky-deep)',
  mint: 'var(--leaf)',
  sunshine: 'var(--sunshine)',
  coral: 'var(--coral)',
} as const

export type CareRingScheme = keyof typeof SCHEME_COLOR

const SIZE = {
  md: { ring: 48, stroke: 5, icon: 'text-[17px]', label: 'text-[9px]', value: 'text-base' },
  sm: { ring: 42, stroke: 5, icon: 'text-[15px]', label: 'text-[9px]', value: 'text-[13px]' },
} as const

export type CareRingSize = keyof typeof SIZE

export type CareRingProps = {
  label: ReactNode
  value: ReactNode
  fill?: number
  scheme?: CareRingScheme
  icon?: ReactNode
  size?: CareRingSize
  emphasis?: boolean
  className?: string
}

export default function CareRing({
  label,
  value,
  fill = 0,
  scheme = 'mint',
  icon,
  size = 'md',
  emphasis = false,
  className = '',
}: CareRingProps) {
  const sizeRecipe = SIZE[size] ?? SIZE.md
  const ringColor = SCHEME_COLOR[scheme] ?? SCHEME_COLOR.mint
  const clampedFill = Math.max(0, Math.min(fill, 1))

  return (
    <div className={`flex items-center gap-3 px-4 py-3.5 bg-paper rounded-md shadow-warm-sm min-w-0 ${className}`}>
      <ProgressRing
        value={clampedFill * 100}
        size={sizeRecipe.ring}
        strokeWidth={sizeRecipe.stroke}
        color={ringColor}
        trackColor="var(--paper-deep)"
        className="shrink-0"
      >
        {icon && (
          <span aria-hidden="true" className={sizeRecipe.icon}>
            {icon}
          </span>
        )}
      </ProgressRing>
      <div className="flex-1 min-w-0">
        <div className={`font-extrabold uppercase tracking-[0.14em] text-ink-softer mb-0.5 ${sizeRecipe.label}`}>
          {label}
        </div>
        <div
          className={`font-display italic font-medium leading-tight truncate ${
            emphasis ? 'text-coral-deep' : 'text-ink'
          } ${sizeRecipe.value}`}
        >
          {value}
        </div>
      </div>
    </div>
  )
}
