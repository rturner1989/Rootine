import type { Species } from '../../types/species'
import UiAvatar, { type AvatarProps as UiAvatarProps } from '../ui/Avatar'

const FALLBACK_EMOJI = '🌱'

export type AvatarProps = Omit<UiAvatarProps, 'src' | 'fallback'> & {
  species?: Species | null
}

export default function Avatar({ species, size = 'md', shape = 'tile', className = '', ...kwargs }: AvatarProps) {
  return (
    <UiAvatar
      src={species?.image_url ?? undefined}
      fallback={<span>{FALLBACK_EMOJI}</span>}
      size={size}
      shape={shape}
      className={className}
      aria-hidden="true"
      {...kwargs}
    />
  )
}
