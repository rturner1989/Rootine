import type { HTMLAttributes, ReactNode } from 'react'

const SIZES = {
  sm: 'w-[30px] h-[30px] text-sm',
  md: 'w-[38px] h-[38px] text-[17px]',
} as const

export type IconDiscSize = keyof typeof SIZES

export type IconDiscProps = HTMLAttributes<HTMLSpanElement> & {
  size?: IconDiscSize
  tint?: string
  children?: ReactNode
}

// Tinted circle holding a single identity emoji — the app's stat-, tile-
// and settings-row icon. Decorative: the adjacent label always carries
// the meaning, so it stays out of the accessibility tree. Tint is a
// consumer concern; it varies per subject, not per size.
export default function IconDisc({
  size = 'md',
  tint = 'bg-mint text-emerald',
  className = '',
  children,
  ...kwargs
}: IconDiscProps) {
  const sizeClass = SIZES[size] ?? SIZES.md

  return (
    <span
      aria-hidden="true"
      className={`shrink-0 rounded-full flex items-center justify-center ${sizeClass} ${tint} ${className}`}
      {...kwargs}
    >
      {children}
    </span>
  )
}
