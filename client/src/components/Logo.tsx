import { Link, type To } from 'react-router-dom'

// Icon stays compact; wordmark sits next to it at a larger optical
// height so the brand reads at glance — typography cap-height is shorter
// than the icon's bounding box, so matching pixel heights makes the name
// look small relative to the mark. The wordmark height multiplier here
// brings them into perceptual balance.
const SIZES = {
  sm: { icon: 'h-9', word: 'h-5' },
  md: { icon: 'h-11', word: 'h-7' },
  lg: { icon: 'h-14', word: 'h-9' },
}

export type LogoSize = keyof typeof SIZES

export type LogoProps = {
  size?: LogoSize
  markOnly?: boolean
  className?: string
  to?: To
}

export default function Logo({ size = 'md', markOnly = false, className = '', to }: LogoProps) {
  const recipe = SIZES[size] ?? SIZES.md
  const baseClasses = `inline-flex items-center gap-2 ${className}`

  const content = markOnly ? (
    <img src="/branding/icon-192.png" alt="Rootine" className={`${recipe.icon} w-auto object-contain`} />
  ) : (
    <>
      <img src="/branding/icon-192.png" alt="" aria-hidden="true" className={`${recipe.icon} w-auto object-contain`} />
      <img src="/branding/wordmark.png" alt="Rootine" className={`${recipe.word} w-auto object-contain`} />
    </>
  )

  if (to) {
    return (
      <Link to={to} className={`${baseClasses} no-underline`} aria-label={markOnly ? 'Rootine — home' : undefined}>
        {content}
      </Link>
    )
  }

  return <div className={baseClasses}>{content}</div>
}
