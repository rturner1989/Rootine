import type { HTMLAttributes, ReactNode } from 'react'
import { useState } from 'react'

/**
 * Avatar — generic image-with-fallback tile.
 *
 * Shows `src` as a cover-fit image when provided; falls back to the
 * `fallback` node when `src` is missing OR the image fails to load
 * (onError flips the internal errored flag and the fallback renders
 * in place instead of leaving an empty square).
 *
 * Sizing + shape are preset keys, not raw pixel values — every avatar
 * in the app picks from a shared scale so tile dimensions stay
 * consistent across screens. `className` is forwarded for borders,
 * shadows, and positioning; extra props flow to the root.
 *
 * No aria handling baked in — consumer intent varies (decorative plant
 * tile vs labelled user avatar vs clickable chip). Pass in via kwargs.
 *
 *   <Avatar src={user.avatar_url} fallback={<span>RT</span>} shape="circle" size="sm" />
 */

const SIZE_CLASSES = {
  xs: 'w-8 h-8 text-base',
  sm: 'w-[38px] h-[38px] text-base',
  md: 'w-12 h-12 text-xl',
  lg: 'w-[52px] h-[52px] text-2xl',
  xl: 'w-20 h-20 text-4xl',
  '2xl': 'w-[90px] h-[90px] text-5xl',
  '3xl': 'w-[130px] h-[130px] text-6xl',
} as const

export type AvatarSize = keyof typeof SIZE_CLASSES

const SHAPE_CLASSES = {
  tile: 'rounded-md',
  circle: 'rounded-full',
} as const

export type AvatarShape = keyof typeof SHAPE_CLASSES

export type AvatarProps = HTMLAttributes<HTMLDivElement> & {
  src?: string
  fallback?: ReactNode
  size?: AvatarSize
  shape?: AvatarShape
}

export default function Avatar({
  src,
  fallback = null,
  size = 'md',
  shape = 'tile',
  className = '',
  ...kwargs
}: AvatarProps) {
  const [errored, setErrored] = useState(false)
  const showImage = Boolean(src) && !errored

  return (
    <div
      className={`flex items-center justify-center leading-none bg-mint overflow-hidden shrink-0 ${SIZE_CLASSES[size]} ${SHAPE_CLASSES[shape]} ${className}`}
      {...kwargs}
    >
      {showImage ? (
        <img src={src} alt="" className="w-full h-full object-cover" onError={() => setErrored(true)} />
      ) : (
        fallback
      )}
    </div>
  )
}
