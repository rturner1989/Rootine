const SIZES = {
  md: 'w-[120px] h-[120px] text-[52px]',
  lg: 'w-[140px] h-[140px] text-[52px]',
}

const SCHEMES = {
  brand: 'bg-[image:var(--gradient-brand)] text-paper shadow-warm-md',
  paper:
    'bg-[var(--gradient-paper)] text-ink shadow-[0_24px_48px_-8px_rgba(80,56,18,0.2),inset_0_0_0_1px_var(--color-paper-edge)]',
  danger: 'bg-[linear-gradient(135deg,#ffd8c6,#ff7a4d)] text-paper shadow-[var(--shadow-cta-danger)]',
}

// Circular display disc — a single oversized glyph (initial, error code,
// emoji) on a tinted gradient with a top-left sheen. Its glyph always
// restates adjacent text (the user's name, the error title), so it's
// decorative by default; pass aria-hidden={false} if that ever stops
// being true.
export default function Medallion({ size = 'md', scheme = 'brand', className = '', children, ...kwargs }) {
  const sizeClass = SIZES[size] ?? SIZES.md
  const schemeClass = SCHEMES[scheme] ?? SCHEMES.brand

  return (
    <div
      aria-hidden="true"
      className={`rounded-full flex items-center justify-center font-display italic tracking-tight overflow-hidden relative medallion-sheen ${sizeClass} ${schemeClass} ${className}`}
      {...kwargs}
    >
      {children}
    </div>
  )
}
