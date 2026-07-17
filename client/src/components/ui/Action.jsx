import { Link } from 'react-router-dom'

// primary + secondary use rounded-md per Rob's app-wide preference
// (see memory feedback_border_radius.md).
const BASE_BUTTON = 'inline-flex items-center justify-center rounded-md transition-transform'
const SIZE_MD = 'gap-2 px-6 py-3 text-sm font-extrabold active:scale-[0.98]'

const VARIANT_CLASSES = {
  primary: `${BASE_BUTTON} ${SIZE_MD} text-white bg-[image:var(--gradient-brand)] shadow-[var(--shadow-cta)]`,
  secondary: `${BASE_BUTTON} ${SIZE_MD} bg-mint text-emerald`,
  danger: `${BASE_BUTTON} ${SIZE_MD} text-white bg-coral-deep shadow-[var(--shadow-cta-danger)]`,
  // Reversible-but-red — log out, not delete. Mirrors ActionIcon's
  // ghost-danger scheme so logging out reads the same in the sidebar rail
  // and here. Solid `danger` stays reserved for the irreversible actions,
  // so the two never compete on the same surface.
  'ghost-danger': `${BASE_BUTTON} ${SIZE_MD} bg-coral/10 text-coral-deep hover:bg-coral/15`,
  'cta-card':
    'block w-full p-4 rounded-lg text-white text-left bg-[image:var(--gradient-forest)] transition-transform active:scale-[0.99]',
  ghost: 'inline-flex items-center gap-1 text-ink-soft font-semibold hover:text-ink transition-colors',
  unstyled: '',
}

// Matches the form primitives' inset emerald glow so tabbing across a
// form doesn't swap between inward + outward rings mid-step.
const FOCUS_VISIBLE =
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-emerald/15'

const BUTTON_RESET = 'cursor-pointer'
const LINK_RESET = 'no-underline'

function compose(variant, elementReset, userClassName) {
  const variantClasses = VARIANT_CLASSES[variant] ?? ''
  return [variantClasses, elementReset, FOCUS_VISIBLE, userClassName].filter(Boolean).join(' ')
}

export default function Action({
  ref,
  to,
  href,
  external = false,
  onClick,
  variant = 'primary',
  className = '',
  disabled = false,
  type,
  children,
  'aria-label': ariaLabel,
  ...kwargs
}) {
  if (to) {
    const classes = compose(variant, LINK_RESET, className)
    if (disabled) {
      return (
        <span className={classes} aria-disabled="true" {...kwargs}>
          {children}
        </span>
      )
    }
    return (
      <Link ref={ref} to={to} className={classes} aria-label={ariaLabel} {...kwargs}>
        {children}
      </Link>
    )
  }

  if (href) {
    const classes = compose(variant, LINK_RESET, className)
    const targetProps = external ? { target: '_blank', rel: 'noopener noreferrer' } : {}
    if (disabled) {
      return (
        <span className={classes} aria-disabled="true" {...kwargs}>
          {children}
        </span>
      )
    }
    return (
      <a ref={ref} href={href} className={classes} aria-label={ariaLabel} {...targetProps} {...kwargs}>
        {children}
      </a>
    )
  }

  // Unstyled skips the default disabled dim — consumers style their own
  // disabled state (e.g. the Today task-row check circle).
  const baseButtonClasses = compose(variant, BUTTON_RESET, className)
  const classes =
    variant === 'unstyled' ? baseButtonClasses : `${baseButtonClasses} disabled:opacity-60 disabled:cursor-not-allowed`

  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      onClick={onClick}
      disabled={disabled}
      className={classes}
      aria-label={ariaLabel}
      {...kwargs}
    >
      {children}
    </button>
  )
}
