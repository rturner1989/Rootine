const VARIANTS = {
  // Auth-card eyebrow — emerald tracked uppercase with concentric-ring dot.
  card: {
    wrapper:
      'inline-flex items-center gap-1.5 text-[10px] font-extrabold tracking-[0.22em] uppercase text-emerald mb-2',
    dot: 'w-[7px] h-[7px] rounded-full bg-emerald shadow-[0_0_0_3px_rgba(20,144,47,0.2)]',
  },
  // Marketing pill — paper-translucent rounded pill with sunshine dot.
  pill: {
    wrapper:
      'inline-flex w-fit items-center gap-2 px-3 py-1 rounded-full bg-paper/15 text-[10px] font-extrabold tracking-[0.18em] uppercase text-paper/85',
    dot: 'w-[7px] h-[7px] rounded-full bg-sunshine',
  },
}

export default function Preheading({ variant = 'card', as: Tag = 'div', className = '', children }) {
  const variantStyles = VARIANTS[variant] ?? VARIANTS.card
  return (
    <Tag className={`${variantStyles.wrapper} ${className}`}>
      <span aria-hidden="true" className={variantStyles.dot} />
      {children}
    </Tag>
  )
}
