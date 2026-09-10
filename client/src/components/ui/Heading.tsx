import type { ElementType, HTMLAttributes, ReactNode } from 'react'
import Preheading, { type PreheadingVariant } from './Preheading'

const VARIANTS = {
  display: 'font-display italic font-normal text-[34px] sm:text-[40px] leading-[1.15] tracking-tight',
  'display-lg': 'font-display italic font-normal text-[44px] lg:text-[54px] leading-[1.02] tracking-tight',
  'display-xl': 'font-display italic font-light text-[40px] lg:text-[64px] leading-[1.15] tracking-tight',
  panel: 'font-display italic font-semibold text-[22px] leading-none tracking-[-0.02em]',
  card: 'font-display italic font-normal text-base leading-tight tracking-[-0.01em]',
  compact: 'font-sans font-extrabold text-base text-ink leading-tight',
  // Section label inside a dialog/popover/card. Delegates to the
  // eyebrow-label utility so the canonical 10px / extrabold / 0.14em
  // tracking stays in one place (globals.css).
  eyebrow: 'eyebrow-label',
} as const

export type HeadingVariant = keyof typeof VARIANTS

const PREHEADING_VARIANT_BY_HEADING: Record<HeadingVariant, PreheadingVariant> = {
  display: 'card',
  'display-lg': 'pill',
  'display-xl': 'card',
  panel: 'card',
  card: 'card',
  compact: 'card',
  eyebrow: 'card',
}

export type HeadingProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType
  variant?: HeadingVariant
  className?: string
  preheading?: ReactNode
  subtitle?: ReactNode
  children?: ReactNode
}

export default function Heading({
  as: Tag = 'h1',
  variant = 'display',
  className = '',
  preheading,
  subtitle,
  children,
  ...kwargs
}: HeadingProps) {
  const variantClasses = VARIANTS[variant] ?? VARIANTS.display

  if (!preheading && !subtitle) {
    return (
      <Tag className={`${variantClasses} ${className}`} {...kwargs}>
        {children}
      </Tag>
    )
  }

  const preheadingVariant = PREHEADING_VARIANT_BY_HEADING[variant] ?? 'card'

  return (
    <div className={className}>
      {preheading && <Preheading variant={preheadingVariant}>{preheading}</Preheading>}
      <Tag className={variantClasses} {...kwargs}>
        {children}
      </Tag>
      {subtitle && <p className="mt-2 text-sm text-ink-soft leading-relaxed">{subtitle}</p>}
    </div>
  )
}
