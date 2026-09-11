import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { Link, type LinkProps, type To } from 'react-router-dom'

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
} as const

export type ActionVariant = keyof typeof VARIANT_CLASSES

// Matches the form primitives' inset emerald glow so tabbing across a
// form doesn't swap between inward + outward rings mid-step.
const FOCUS_VISIBLE =
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-emerald/15'

const BUTTON_RESET = 'cursor-pointer'
const LINK_RESET = 'no-underline'

function compose(variant: ActionVariant, elementReset: string, userClassName: string): string {
  const variantClasses = VARIANT_CLASSES[variant] ?? ''
  return [variantClasses, elementReset, FOCUS_VISIBLE, userClassName].filter(Boolean).join(' ')
}

type ActionBaseProps = {
  variant?: ActionVariant
  disabled?: boolean
  className?: string
  children?: ReactNode
  'aria-label'?: string
}

type ActionLinkProps = ActionBaseProps &
  Omit<LinkProps, 'to' | 'className' | 'children'> & {
    ref?: Ref<HTMLAnchorElement>
    to: To
    href?: never
    external?: never
  }

type ActionAnchorProps = ActionBaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'className' | 'children'> & {
    ref?: Ref<HTMLAnchorElement>
    href: string
    to?: never
    external?: boolean
  }

type ActionButtonProps = ActionBaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
    ref?: Ref<HTMLButtonElement>
    to?: never
    href?: never
    external?: never
  }

export type ActionProps = ActionLinkProps | ActionAnchorProps | ActionButtonProps

// `to`/`href` aren't literal discriminants (both are plain `string`-ish on
// their owning member), so TS can't prove a falsy check eliminates that
// member on its own — it would keep carrying all three members' `ref` /
// `onClick` / `type` types into the button branch below. These predicates
// assert the same truthy check the original code branched on, so the
// narrowing actually sticks.
function hasTo(props: ActionProps): props is ActionLinkProps {
  return Boolean(props.to)
}

function hasHref(props: ActionProps): props is ActionAnchorProps {
  return Boolean(props.href)
}

export default function Action(props: ActionProps) {
  if (hasTo(props)) {
    // onClick forwards to the rendered <Link> so it fires before navigation
    // (Sidebar's UserCard relies on this to close the mobile drawer on tap).
    // Disabled renders a real disabled <button> instead — onClick is pulled
    // out of props before the spread, so it never reaches that branch.
    // `type` is still a no-op on the enabled path (anchor `type` is a
    // MIME-type hint, unused); `external` only applies to the `href` branch
    // below.
    const {
      ref,
      to,
      variant = 'primary',
      className = '',
      disabled = false,
      children,
      'aria-label': ariaLabel,
      onClick,
      type: _type,
      external: _external,
      ...kwargs
    } = props
    const classes = compose(variant, LINK_RESET, className)
    if (disabled) {
      // A bare <span role="link"> can't clear Biome's useSemanticElements
      // rule (it wants a real <a>) without an <a> that then needs a real
      // href — which would make it navigable again. A native disabled
      // <button> sidesteps that: real disabled semantics every AT already
      // understands, automatically out of tab order, and unclickable at
      // the DOM level (no onClick to strip, unlike the enabled branch).
      // kwargs is typed against HTMLAnchorElement (this branch's `ref` /
      // event-handler generics come from LinkProps); the cast only affects
      // TS's element-generic bookkeeping — the DOM attributes it carries
      // (aria-*, data-*, id, style…) are element-agnostic.
      return (
        <button
          type="button"
          disabled
          aria-disabled="true"
          aria-label={ariaLabel}
          className={classes}
          {...(kwargs as ButtonHTMLAttributes<HTMLButtonElement>)}
        >
          {children}
        </button>
      )
    }
    return (
      <Link ref={ref} to={to} className={classes} aria-label={ariaLabel} onClick={onClick} {...kwargs}>
        {children}
      </Link>
    )
  }

  if (hasHref(props)) {
    // See the `to` branch above — onClick forwards the same way, and stays
    // off the disabled <button>.
    const {
      ref,
      href,
      external = false,
      variant = 'primary',
      className = '',
      disabled = false,
      children,
      'aria-label': ariaLabel,
      onClick,
      type: _type,
      ...kwargs
    } = props
    const classes = compose(variant, LINK_RESET, className)
    const targetProps = external ? { target: '_blank', rel: 'noopener noreferrer' } : {}
    if (disabled) {
      // See the `to` branch above for why this is a real disabled <button>
      // rather than a <span role="link">, and for the kwargs cast.
      return (
        <button
          type="button"
          disabled
          aria-disabled="true"
          aria-label={ariaLabel}
          className={classes}
          {...(kwargs as ButtonHTMLAttributes<HTMLButtonElement>)}
        >
          {children}
        </button>
      )
    }
    return (
      <a
        ref={ref}
        href={href}
        className={classes}
        aria-label={ariaLabel}
        onClick={onClick}
        {...targetProps}
        {...kwargs}
      >
        {children}
      </a>
    )
  }

  const {
    ref,
    onClick,
    type,
    variant = 'primary',
    className = '',
    disabled = false,
    children,
    'aria-label': ariaLabel,
    external: _external,
    ...kwargs
  } = props

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
