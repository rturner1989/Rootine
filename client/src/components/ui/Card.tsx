import type { HTMLAttributes, ReactNode, Ref } from 'react'

// Cards stack their slots vertically by default — Card.Header /
// Card.Body / Card.Footer were always meant to flow top-to-bottom.
// Baking the flex column in saves consumers the boilerplate.
const BASE = 'rounded-md flex flex-col'

const VARIANTS = {
  solid: 'bg-card border border-mint overflow-hidden',
  glass: 'glass-card overflow-hidden',
  // Warm-shadow paper for Today widgets and any surface that wants the
  // mockup's lifted-card look. shrink-0 baked in — every Today widget
  // sits inside a flex-column page main and never wants to compress
  // below its content. Padding/gap stay on consumers because they
  // vary (e.g. PlantsRow drops pb to give tile shadow room). No
  // clipping — children with shadows render below the card's edge.
  'paper-warm': 'bg-paper shadow-warm-sm shrink-0',
} as const

export type CardVariant = keyof typeof VARIANTS

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant
  ref?: Ref<HTMLDivElement>
}

function Card({ variant = 'solid', className = '', ref, children, ...kwargs }: CardProps) {
  const variantClass = VARIANTS[variant] ?? VARIANTS.solid
  return (
    <div ref={ref} className={`${BASE} ${variantClass} ${className}`} {...kwargs}>
      {children}
    </div>
  )
}

export type CardHeaderProps = HTMLAttributes<HTMLDivElement> & {
  divider?: boolean
}

function Header({ className = '', divider = true, children, ...kwargs }: CardHeaderProps) {
  const dividerClass = divider ? 'border-b border-mint' : ''
  return (
    <div className={`${dividerClass} ${className}`} {...kwargs}>
      {children}
    </div>
  )
}

export type CardBodyProps = HTMLAttributes<HTMLDivElement> & {
  ref?: Ref<HTMLDivElement>
}

function Body({ className = '', ref, children, ...kwargs }: CardBodyProps) {
  return (
    <div
      ref={ref}
      className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain ${className}`}
      {...kwargs}
    >
      {children}
    </div>
  )
}

export type CardFooterProps = HTMLAttributes<HTMLDivElement> & {
  divider?: boolean
}

function Footer({ className = '', divider = true, children, ...kwargs }: CardFooterProps) {
  const dividerClass = divider ? 'border-t border-mint' : ''
  return (
    <div className={`${dividerClass} ${className}`} {...kwargs}>
      {children}
    </div>
  )
}

export type CardMetaProps = {
  count?: number
  children?: ReactNode
  className?: string
}

// Header-row meta — direct port of the v2 mockup `.sl-meta`. Optional
// emerald count + uppercase tracking copy. Sits next to the heading
// inside Card.Header (or any subsection header).
function Meta({ count, children, className = '' }: CardMetaProps) {
  return (
    <span className={`text-[11px] font-bold uppercase tracking-[0.06em] text-ink-soft ${className}`}>
      {count != null ? (
        <>
          <strong className="text-emerald font-extrabold">{count}</strong>{' '}
        </>
      ) : null}
      {children}
    </span>
  )
}

export default Object.assign(Card, { Header, Body, Footer, Meta })
