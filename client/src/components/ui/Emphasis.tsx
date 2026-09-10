import type { ReactNode } from 'react'

const VARIANTS = {
  // Green axis (forest → emerald → leaf). Default — used inside headings
  // on light surfaces (auth-body card, future page hero).
  brand: 'bg-[image:var(--gradient-display)]',
  // Cream → sunshine. For headings on dark backdrops where the green
  // gradient lacks contrast (e.g. forest marketing column).
  sunshine: 'bg-[image:var(--gradient-sunshine)]',
} as const

export type EmphasisVariant = keyof typeof VARIANTS

export type EmphasisProps = {
  variant?: EmphasisVariant
  className?: string
  children?: ReactNode
}

export default function Emphasis({ variant = 'brand', className = '', children }: EmphasisProps) {
  const variantClasses = VARIANTS[variant] ?? VARIANTS.brand
  return (
    <em className={`heading-emphasis font-display italic bg-clip-text text-transparent ${variantClasses} ${className}`}>
      {children}
    </em>
  )
}
