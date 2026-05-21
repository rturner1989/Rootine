import { useMediaQuery } from '../../hooks/useMediaQuery'
import Heading from './Heading'
import Preheading from './Preheading'

export default function PageHeader({
  eyebrow,
  meta,
  actions,
  headingVariant = 'display',
  compactMobile = false,
  className = '',
  children,
}) {
  const isMobile = useMediaQuery('(max-width: 639px)')
  // `compactMobile` content pages drop the big display title on mobile to
  // free vertical space — the eyebrow stands alone as a small page heading
  // (h3). Off by default, so hero headers (Today: greeting + name + streak)
  // keep eyebrow + h1 on every breakpoint.
  const eyebrowOnly = compactMobile && isMobile

  return (
    <header className={`flex items-start justify-between gap-4 flex-wrap sm:items-end ${className}`}>
      <div className="flex flex-col min-w-0">
        {eyebrow && (
          <Preheading as={eyebrowOnly ? 'h3' : 'div'} variant="card">
            {eyebrow}
          </Preheading>
        )}
        {!eyebrowOnly && (
          <Heading as="h1" variant={headingVariant} className="text-ink">
            {children}
          </Heading>
        )}
        {meta && <p className="mt-1.5 text-xs font-semibold text-ink-soft">{meta}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  )
}
