import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { ElementType, HTMLAttributes, ReactNode } from 'react'
import Action from './Action'
import Tooltip from './Tooltip'

const SIZES = {
  sm: {
    wrapper: 'text-[10px] px-2 py-0.5 gap-1 font-extrabold',
    wrapperWithIcon: 'text-[10px] pl-1 pr-2.5 py-0.5 gap-1.5 font-extrabold',
    wrapperWithClear: 'text-[10px] pl-2 pr-0.5 py-0.5 gap-1 font-extrabold',
    icon: 'w-4 h-4 rounded-full inline-flex items-center justify-center flex-shrink-0',
    clearButton: 'w-4 h-4',
    clearIcon: 'w-2.5 h-2.5',
  },
  md: {
    wrapper: 'text-xs pl-2 pr-3.5 py-2 gap-2.5 font-semibold',
    wrapperWithIcon: 'text-xs pl-2 pr-3.5 py-2 gap-2.5 font-semibold',
    wrapperWithClear: 'text-xs pl-2 pr-1 py-1 gap-1.5 font-semibold',
    icon: 'w-7 h-7 rounded-full inline-flex items-center justify-center text-sm flex-shrink-0',
    clearButton: 'w-5 h-5',
    clearIcon: 'w-2.5 h-2.5',
  },
} as const

export type BadgeSize = keyof typeof SIZES

const SCHEMES = {
  neutral: {
    softBg: 'bg-mint',
    solidBg: 'bg-mint',
    outlineBorder: 'border-mint',
    quietText: 'text-ink',
    solidText: 'text-ink',
    iconBg: 'bg-mint',
    iconText: 'text-ink',
  },
  forest: {
    softBg: 'bg-forest/10',
    solidBg: 'bg-forest',
    outlineBorder: 'border-forest/30',
    quietText: 'text-ink',
    solidText: 'text-lime',
    iconBg: 'bg-forest',
    iconText: 'text-lime',
  },
  leaf: {
    softBg: 'bg-leaf/10',
    solidBg: 'bg-leaf',
    outlineBorder: 'border-leaf',
    quietText: 'text-forest',
    solidText: 'text-card',
    iconBg: 'bg-leaf',
    iconText: 'text-card',
  },
  emerald: {
    softBg: 'bg-emerald/10',
    solidBg: 'bg-emerald',
    outlineBorder: 'border-emerald',
    quietText: 'text-emerald',
    solidText: 'text-card',
    iconBg: 'bg-emerald',
    iconText: 'text-card',
  },
  sunshine: {
    softBg: 'bg-sunshine/15',
    solidBg: 'bg-sunshine',
    outlineBorder: 'border-sunshine',
    quietText: 'text-ink',
    solidText: 'text-ink',
    iconBg: 'bg-sunshine',
    iconText: 'text-ink',
  },
  coral: {
    softBg: 'bg-coral/10',
    solidBg: 'bg-coral',
    outlineBorder: 'border-coral',
    quietText: 'text-coral-deep',
    solidText: 'text-card',
    iconBg: 'bg-coral',
    iconText: 'text-card',
  },
  // Glassmorphic — translucent paper over dark backdrops (auth marketing
  // peek pills, future hero overlays).
  glass: {
    softBg: 'bg-paper/12 backdrop-blur-light',
    solidBg: 'bg-paper/15 backdrop-blur-light',
    outlineBorder: 'border-paper/30',
    quietText: 'text-paper/88',
    solidText: 'text-paper',
    iconBg: 'bg-paper',
    iconText: 'text-forest',
  },
} as const

export type BadgeScheme = keyof typeof SCHEMES

const VARIANT_KEYS = ['solid', 'outline', 'soft'] as const
export type BadgeVariant = (typeof VARIANT_KEYS)[number]

function schemeClasses(variant: BadgeVariant, schemeRecipe: (typeof SCHEMES)[BadgeScheme]): string {
  switch (variant) {
    case 'solid':
      return `${schemeRecipe.solidBg} ${schemeRecipe.solidText}`
    case 'outline':
      return `border ${schemeRecipe.outlineBorder} ${schemeRecipe.quietText}`
    default:
      return `${schemeRecipe.softBg} ${schemeRecipe.quietText}`
  }
}

export type BadgeProps = HTMLAttributes<HTMLElement> & {
  scheme?: BadgeScheme
  variant?: BadgeVariant
  size?: BadgeSize
  icon?: ReactNode
  as?: ElementType
  onClear?: () => void
  clearLabel?: string
  children?: ReactNode
}

export default function Badge({
  scheme = 'neutral',
  variant = 'soft',
  size = 'sm',
  icon,
  as: Tag = 'span',
  className = '',
  onClear,
  clearLabel = 'Remove',
  children,
  ...kwargs
}: BadgeProps) {
  if (children == null || children === false || children === '') return null

  const sizeRecipe = SIZES[size] ?? SIZES.sm
  const schemeRecipe = SCHEMES[scheme] ?? SCHEMES.neutral

  const wrapperToken = onClear ? sizeRecipe.wrapperWithClear : icon ? sizeRecipe.wrapperWithIcon : sizeRecipe.wrapper

  const wrapperClasses = [
    'inline-flex items-center w-fit rounded-full',
    wrapperToken,
    schemeClasses(variant, schemeRecipe),
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Tag className={wrapperClasses} {...kwargs}>
      {icon && <span className={`${sizeRecipe.icon} ${schemeRecipe.iconBg} ${schemeRecipe.iconText}`}>{icon}</span>}
      {children}
      {onClear && (
        <Action
          variant="unstyled"
          onClick={onClear}
          aria-label={clearLabel}
          className={`relative group shrink-0 rounded-full hover:bg-black/10 flex items-center justify-center ${sizeRecipe.clearButton}`}
        >
          <FontAwesomeIcon icon={faXmark} className={sizeRecipe.clearIcon} />
          <Tooltip placement="top">{clearLabel}</Tooltip>
        </Action>
      )}
    </Tag>
  )
}
