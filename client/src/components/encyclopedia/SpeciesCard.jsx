import { useState } from 'react'
import { Link } from 'react-router-dom'
import { petSafetyLabel } from '../../utils/petSafety'
import Badge from '../ui/Badge'
import Card from '../ui/Card'

const TONE_SCHEME = { safe: 'emerald', toxic: 'coral', unknown: 'neutral' }

function capitalise(text) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// The species photo: the real image_url when we have one, falling back to the
// emoji-on-gradient tile when it's missing OR fails to load (Wikipedia URLs
// 404 occasionally). Same shape either way so the grid never shifts.
function SpeciesPhoto({ imageUrl }) {
  const [errored, setErrored] = useState(false)

  if (imageUrl && !errored) {
    return (
      <img
        src={imageUrl}
        alt=""
        aria-hidden="true"
        loading="lazy"
        onError={() => setErrored(true)}
        className="w-full aspect-[1.2] rounded-[10px] object-cover"
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className="species-photo w-full rounded-[10px] flex items-center justify-center text-[54px]"
    >
      🌿
    </span>
  )
}

// Browse grid cell (mockup 25 .sp-card): emoji photo tile, italic common
// name, scientific name, trait badges. The whole card is the link into the
// species page. Card is a plain div (not polymorphic), so the Link wraps it
// — the outer Link is the single role="link".
// Local species link by id; Perenual search results (no id yet) carry their
// perenual_id + a name/image fallback so the detail page can fetch + persist
// them on arrival.
function detailPath(species) {
  if (species.id) return `/encyclopedia/species/${species.id}`

  const params = new URLSearchParams({
    perenual_id: String(species.perenual_id),
    common_name: species.common_name ?? '',
    scientific_name: species.scientific_name ?? '',
    image_url: species.image_url ?? '',
  })
  return `/encyclopedia/species/lookup?${params}`
}

export default function SpeciesCard({ species }) {
  const safety = petSafetyLabel(species.pet_safe)

  return (
    <Link
      to={detailPath(species)}
      className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
    >
      <Card variant="paper-warm" className="p-3.5 gap-2.5 hover:-translate-y-px hover:shadow-warm-md transition-all">
        <SpeciesPhoto imageUrl={species.image_url} />
        <span className="flex flex-col gap-0.5 min-w-0">
          <span className="font-display italic text-[17px] leading-tight text-ink">{species.common_name}</span>
          {species.scientific_name && (
            <span className="text-[11px] italic text-ink-softer truncate">{species.scientific_name}</span>
          )}
        </span>
        <span className="flex flex-wrap gap-1 mt-1">
          {species.difficulty && (
            <Badge scheme="neutral" size="sm">
              {capitalise(species.difficulty)}
            </Badge>
          )}
          <Badge scheme={TONE_SCHEME[safety.tone]} size="sm">
            {safety.text}
          </Badge>
        </span>
      </Card>
    </Link>
  )
}
