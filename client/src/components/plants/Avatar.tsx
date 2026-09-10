import UiAvatar, { type AvatarProps as UiAvatarProps } from '../ui/Avatar'

const FALLBACK_EMOJI = '🌱'

// Only image_url is read below — a structural type with it optional
// (rather than the full Species) so slimmer species projections (e.g.
// journalPlantSchema's {id, common_name, personality}, which omits
// image_url entirely) satisfy this without a cast. A full Species, whose
// image_url is required, always satisfies an optional field too.
//
// The index signature isn't part of the real contract — without it, TS's
// "weak type" check (every property optional) rejects an object with zero
// overlapping property names, which the journal projection has: it shares
// no key with {image_url}, only with the index signature.
type AvatarSpecies = {
  image_url?: string | null
  [key: string]: unknown
}

export type AvatarProps = Omit<UiAvatarProps, 'src' | 'fallback'> & {
  species?: AvatarSpecies | null
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
