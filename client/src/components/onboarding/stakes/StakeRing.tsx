import type { ReactNode } from 'react'
import ProgressRing from '../../ProgressRing'

const RING_COLOR_BY_SCHEME = {
  streak: 'var(--coral)',
  vitality: 'var(--leaf)',
}

const LABEL_COLOR_BY_SCHEME = {
  streak: 'text-coral-deep',
  vitality: 'text-emerald',
}

type StakeRingScheme = keyof typeof RING_COLOR_BY_SCHEME

type StakeRingProps = {
  scheme: StakeRingScheme
  label: ReactNode
  percent: number
  valueDisplay: ReactNode
  unit?: string
  title: ReactNode
  description: ReactNode
}

export default function StakeRing({ scheme, label, percent, valueDisplay, unit, title, description }: StakeRingProps) {
  const ringColor = RING_COLOR_BY_SCHEME[scheme] ?? RING_COLOR_BY_SCHEME.vitality
  const labelColor = LABEL_COLOR_BY_SCHEME[scheme] ?? LABEL_COLOR_BY_SCHEME.vitality

  return (
    <div className="flex-1 min-w-0 flex flex-col items-center text-center gap-1.5 sm:gap-2 p-3 sm:p-4 bg-paper-deep border border-paper-edge rounded-md">
      <p className={`eyebrow-label ${labelColor}`}>{label}</p>

      <div className="block sm:hidden">
        <ProgressRing value={percent} size={88} strokeWidth={8} color={ringColor} trackColor="var(--paper-edge)">
          <div className="flex flex-col items-center">
            <span className="font-display italic text-xl font-medium text-ink leading-none">{valueDisplay}</span>
            {unit && (
              <span className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-ink-soft mt-0.5">{unit}</span>
            )}
          </div>
        </ProgressRing>
      </div>
      <div className="hidden sm:block">
        <ProgressRing value={percent} size={128} strokeWidth={10} color={ringColor} trackColor="var(--paper-edge)">
          <div className="flex flex-col items-center">
            <span className="font-display italic text-3xl font-medium text-ink leading-none">{valueDisplay}</span>
            {unit && <span className="eyebrow-label text-ink-soft mt-1">{unit}</span>}
          </div>
        </ProgressRing>
      </div>

      <p className="text-[13px] sm:text-sm font-bold text-ink">{title}</p>
      <p className="text-xs text-ink-soft leading-snug">{description}</p>
    </div>
  )
}
