import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Action, { type ActionProps } from './Action'
import Tooltip, { type TooltipPlacement } from './Tooltip'

const HOVER_SCHEMES = {
  neutral: 'bg-ink/[0.04] hover:bg-ink/[0.08] hover:text-ink',
  paper: 'bg-paper-deep hover:bg-mint/60 hover:text-ink',
  // Every other scheme tints with a translucent hover, which reads as
  // smudged when the button sits on top of imagery rather than chrome.
  // Opaque in both states — for controls overlaying a photo.
  overlay: 'bg-paper text-ink hover:bg-paper-deep',
  ink: 'bg-ink/[0.08] hover:bg-ink/[0.12] hover:text-ink',
  warning: 'bg-ink/[0.04] hover:bg-sunshine/20 hover:text-sunshine-deep',
  danger: 'bg-ink/[0.04] hover:bg-coral/15 hover:text-coral-deep',
  ghost: 'hover:bg-paper-deep hover:text-ink',
  'ghost-danger': 'hover:bg-coral/10 hover:text-coral-deep',
} as const

export type ActionIconScheme = keyof typeof HOVER_SCHEMES

const SIZES = {
  xs: { wrapper: 'w-5 h-5', icon: 'w-2.5 h-2.5' },
  sm: { wrapper: 'w-7 h-7', icon: 'w-3 h-3' },
  md: { wrapper: 'w-9 h-9', icon: 'w-4 h-4' },
} as const

export type ActionIconSize = keyof typeof SIZES

// `variant` and `aria-label` are ActionIcon-internal — it always renders
// `variant="unstyled"` and derives its accessible name from `label`, so
// they're dropped from the public type. `Omit` on a union type would
// collapse it to the members' shared keys, losing the to/href/button
// branch shapes Action's union exists to keep separate — this distributes
// the omission over each member instead.
type DistributiveOmit<Props, Key extends keyof ActionProps> = Props extends ActionProps ? Omit<Props, Key> : never

export type ActionIconProps = DistributiveOmit<ActionProps, 'variant' | 'aria-label'> & {
  icon: IconProp
  label: string
  scheme?: ActionIconScheme
  size?: ActionIconSize
  tooltipPlacement?: TooltipPlacement
  tooltip?: boolean
}

export default function ActionIcon(props: ActionIconProps) {
  const {
    icon,
    label,
    scheme = 'neutral',
    size = 'sm',
    tooltipPlacement = 'top',
    tooltip = true,
    className = '',
    ...kwargs
  } = props
  const hoverClasses = HOVER_SCHEMES[scheme] ?? HOVER_SCHEMES.neutral
  const sizeRecipe = SIZES[size] ?? SIZES.sm

  return (
    <Action
      variant="unstyled"
      // kwargs first so explicit aria-label below wins — callers passing
      // their own aria-label via kwargs would otherwise clobber the
      // canonical accessible name. ref/onClick ride through kwargs rather
      // than being pulled out by name here — Action's union types them
      // per to/href/button branch, so naming them at this level would force
      // them back into a single (wrong) type.
      {...kwargs}
      aria-label={label}
      className={`relative group ${sizeRecipe.wrapper} rounded-full text-ink-soft ${hoverClasses} transition-colors flex items-center justify-center cursor-pointer ${className}`}
    >
      <FontAwesomeIcon icon={icon} className={sizeRecipe.icon} />
      {tooltip && <Tooltip placement={tooltipPlacement}>{label}</Tooltip>}
    </Action>
  )
}
