/**
 * Spinner — circular loading indicator.
 *
 * `size="md"` (default, 32px) suits page/route fallbacks. `size="sm"` (16px)
 * is for inline use inside buttons, inputs, and list rows.
 *
 * Colour follows the leaf token by default via `border-leaf`. If a future
 * caller needs a different palette choice, add a `scheme` prop following the
 * two-axis convention used in Action/Badge.
 */

const SIZE_CLASSES = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-[3px]',
} as const

export type SpinnerSize = keyof typeof SIZE_CLASSES

export type SpinnerProps = {
  size?: SpinnerSize
  className?: string
}

export default function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`${SIZE_CLASSES[size]} border-leaf border-t-transparent rounded-full animate-spin ${className}`}
    />
  )
}
