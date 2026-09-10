import type { ReactNode } from 'react'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import Heading, { type HeadingVariant } from './Heading'
import Preheading from './Preheading'

export type PageHeaderProps = {
  eyebrow?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  headingVariant?: HeadingVariant
  compactMobile?: boolean
  className?: string
  children?: ReactNode
}

export default function PageHeader({
  eyebrow,
  meta,
  actions,
  headingVariant = 'display',
  compactMobile = false,
  className = '',
  children,
}: PageHeaderProps) {
  const isMobile = useMediaQuery('(max-width: 639px)')
  // `compactMobile` content pages shrink the display title to the smaller
  // `panel` scale on mobile to free vertical space — the eyebrow (h3) sits
  // above it. The h1 always renders (WCAG 1.3.1 / 2.4.6 — every page needs
  // exactly one), just at reduced visual weight. Off by default, so hero
  // headers (Today: greeting + name + streak) keep the full-size h1 + eyebrow
  // on every breakpoint.
  const compactHeading = compactMobile && isMobile

  return (
    <header className={`flex items-start justify-between gap-4 flex-wrap sm:items-end ${className}`}>
      <div className="flex flex-col min-w-0">
        {eyebrow && (
          <Preheading as={compactHeading ? 'h3' : 'div'} variant="card">
            {eyebrow}
          </Preheading>
        )}
        <Heading as="h1" variant={compactHeading ? 'panel' : headingVariant} className="text-ink">
          {children}
        </Heading>
        {meta && <p className="mt-1.5 text-xs font-semibold text-ink-soft">{meta}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  )
}
