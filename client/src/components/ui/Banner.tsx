import { faCheck, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { ReactNode } from 'react'

/**
 * Banner — compact status strip with icon + title + optional subtitle and time.
 *
 * Two visual modes driven by the `urgent` boolean:
 *   urgent=true  → coral alert circle + triangle icon
 *   urgent=false → leaf circle + check icon
 *
 * The icon is decorative — title/subtitle carry the message, so FontAwesomeIcon
 * stays `aria-hidden` by default. `time` renders right-aligned as small meta.
 *
 * Informational, not interactive. Wrap in an Action at the call site if a future
 * design needs the whole banner clickable.
 *
 *   <Banner urgent title="3 things changed" subtitle="Monty's mood dropped" time="18h ago" />
 */
export type BannerProps = {
  urgent?: boolean
  title: ReactNode
  subtitle?: ReactNode
  time?: ReactNode
}

export default function Banner({ urgent = false, title, subtitle, time }: BannerProps) {
  const icon = urgent ? faTriangleExclamation : faCheck
  const iconBg = urgent ? 'bg-coral' : 'bg-leaf'

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-md bg-mint">
      <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-card ${iconBg}`}>
        <FontAwesomeIcon icon={icon} className="text-xs" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-ink">{title}</p>
        {subtitle && <p className="text-[11px] font-medium text-ink-soft mt-0.5 truncate">{subtitle}</p>}
      </div>

      {time && <span className="text-[11px] font-semibold text-ink-soft shrink-0">{time}</span>}
    </div>
  )
}
