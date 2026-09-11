import type { ReactNode } from 'react'

export type ProgressRingProps = {
  value?: number
  size?: number
  strokeWidth?: number
  color?: string
  trackColor?: string
  className?: string
  children?: ReactNode
}

export default function ProgressRing({
  value = 0,
  size = 44,
  strokeWidth = 3,
  color = 'var(--leaf)',
  trackColor = 'var(--mint)',
  className = '',
  children,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const clamped = Math.max(0, Math.min(value, 100))
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg aria-hidden="true" width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      {children != null && children !== false && children !== '' && (
        <div className="absolute inset-0 flex items-center justify-center">{children}</div>
      )}
    </div>
  )
}
