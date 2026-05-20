// Tone drives the illustration disc gradient. Forest is the only
// light-on-dark tone — the others use ink-on-paper.
const DISC_TONE_CLASS = {
  mint: 'bg-[linear-gradient(135deg,var(--color-paper),var(--color-mint))] text-emerald',
  forest:
    'bg-[linear-gradient(135deg,#1a5e2a_0%,#0b3a1a_50%,#124626_100%)] text-paper shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_16px_36px_rgba(80,56,18,0.12)]',
  sunshine: 'bg-[linear-gradient(135deg,var(--color-paper),#ffe5aa)] text-ink',
  coral: 'bg-[linear-gradient(135deg,var(--color-paper),#ffd8c6)] text-coral-deep',
  sky: 'bg-[linear-gradient(135deg,var(--color-paper),var(--color-sky))] text-frost-deep',
}

const DISC_BASE_CARD =
  'relative w-[140px] h-[140px] rounded-full flex items-center justify-center text-[62px] leading-none shadow-[inset_0_0_0_1px_var(--color-paper-edge),0_16px_36px_rgba(80,56,18,0.12)] overflow-hidden after:absolute after:inset-0 after:rounded-full after:bg-[radial-gradient(circle_at_30%_20%,rgba(255,240,200,0.4),transparent_55%)]'

const DISC_BASE_INLINE =
  'w-20 h-20 rounded-full flex items-center justify-center text-3xl leading-none shadow-[var(--shadow-warm-sm)]'

export default function EmptyState({
  variant = 'card',
  framed = true,
  tone = 'mint',
  icon,
  title,
  description,
  hint,
  actions,
  headingLevel = 'h2',
  className = '',
}) {
  const Heading = headingLevel
  const toneClass = DISC_TONE_CLASS[tone] ?? DISC_TONE_CLASS.mint
  const actionList = Array.isArray(actions) ? actions.filter(Boolean) : actions ? [actions] : []

  if (variant === 'inline') {
    return (
      <div className={`flex flex-col items-center justify-center text-center ${className}`}>
        {icon && (
          <div aria-hidden="true" className={`${DISC_BASE_INLINE} ${toneClass} mb-4`}>
            {icon}
          </div>
        )}
        {title && <Heading className="text-lg font-extrabold text-ink">{title}</Heading>}
        {description && (
          <p className={`text-sm text-ink-soft leading-snug max-w-xs ${title ? 'mt-1' : ''}`}>{description}</p>
        )}
        {hint && <p className="mt-2 text-xs italic text-ink-softer">{hint}</p>}
        {actionList.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">{actionList}</div>
        )}
      </div>
    )
  }

  // framed=false drops the card chrome (bg / shadow / rounded / blob) for
  // use inside a surface that already frames it (the Journal panel) —
  // keeps the large illustration + fills the parent so it stays centred.
  const frameClass = framed
    ? 'bg-paper rounded-md shadow-[var(--shadow-warm-md)] min-h-[380px] empty-card-blob'
    : 'min-h-full'

  return (
    <div
      className={`relative w-full flex-1 flex flex-col items-center justify-center text-center gap-3.5 px-10 py-12 overflow-hidden ${frameClass} ${className}`}
    >
      <div className="relative flex flex-col items-center gap-3.5">
        {icon && (
          <div aria-hidden="true" className={`${DISC_BASE_CARD} ${toneClass} mb-1`}>
            {icon}
          </div>
        )}
        {title && (
          <Heading className="font-display italic font-normal text-3xl leading-[1.05] tracking-tight text-ink max-w-md">
            {title}
          </Heading>
        )}
        {description && <p className="text-sm text-ink-soft leading-relaxed font-medium max-w-sm">{description}</p>}
        {hint && <p className="text-xs italic text-ink-softer">{hint}</p>}
        {actionList.length > 0 && (
          <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2.5">{actionList}</div>
        )}
      </div>
    </div>
  )
}
