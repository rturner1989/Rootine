import UiAvatar, { type AvatarProps as UiAvatarProps } from '../ui/Avatar'

const FALLBACK_EMOJI = '🌱'

// Takes the one field it reads, not the whole species object — fallback is
// a fixed emoji, not derived from personality/common_name/anything else.
export type AvatarProps = Omit<UiAvatarProps, 'src' | 'fallback'> & {
  imageUrl?: string | null
}

export default function Avatar({ imageUrl, size = 'md', shape = 'tile', className = '', ...kwargs }: AvatarProps) {
  return (
    <UiAvatar
      src={imageUrl ?? undefined}
      fallback={<span>{FALLBACK_EMOJI}</span>}
      size={size}
      shape={shape}
      className={className}
      aria-hidden="true"
      {...kwargs}
    />
  )
}
