import type { ElementType, HTMLAttributes, ReactNode } from 'react'

const SIZES = {
  sm: { body: 'text-sm', glyph: 'text-base' },
  md: { body: 'text-base', glyph: 'text-xl' },
  lg: { body: 'text-lg', glyph: 'text-2xl' },
} as const

export type QuoteSize = keyof typeof SIZES

const SCHEMES = {
  coral: 'text-coral-deep',
  emerald: 'text-emerald',
  sunshine: 'text-sunshine',
  ink: 'text-ink-softer',
} as const

export type QuoteScheme = keyof typeof SCHEMES

export type QuoteProps = HTMLAttributes<HTMLElement> & {
  scheme?: QuoteScheme
  size?: QuoteSize
  as?: ElementType
  children?: ReactNode
}

export default function Quote({
  scheme = 'coral',
  size = 'md',
  as: Tag = 'blockquote',
  className = '',
  children,
  ...kwargs
}: QuoteProps) {
  const sizeRecipe = SIZES[size] ?? SIZES.md
  const glyphColor = SCHEMES[scheme] ?? SCHEMES.coral
  const glyphClasses = `font-display ${sizeRecipe.glyph} ${glyphColor} leading-none align-[-0.15em]`

  return (
    <Tag className={`font-display italic text-ink leading-snug ${sizeRecipe.body} ${className}`} {...kwargs}>
      <span aria-hidden="true" className={`${glyphClasses} mr-1`}>
        &ldquo;
      </span>
      {children}
      <span aria-hidden="true" className={`${glyphClasses} ml-1`}>
        &rdquo;
      </span>
    </Tag>
  )
}
