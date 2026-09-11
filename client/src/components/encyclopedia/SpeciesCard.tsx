import { Link } from 'react-router-dom'
import type { SpeciesIndexResult } from '../../types/species'
import { capitalise } from '../../utils/capitalise'
import { petSafetyLabel } from '../../utils/petSafety'
import Badge from '../ui/Badge'
import Card from '../ui/Card'
import SpeciesImage from './SpeciesImage'

const TONE_SCHEME = { safe: 'emerald', toxic: 'coral', unknown: 'neutral' } as const

// Browse grid cell (mockup 25 .sp-card): emoji photo tile, italic common
// name, scientific name, trait badges. The whole card is the link into the
// species page. Card is a plain div (not polymorphic), so the Link wraps it
// — the outer Link is the single role="link".
// Local species link by id; Perenual search results (no id yet) carry their
// perenual_id + a name/image fallback so the detail page can fetch + persist
// them on arrival.
function detailPath(species: SpeciesIndexResult): string {
  // perenual_id only exists on the not-yet-cached search-result member of
  // the union — presence narrows to it more reliably than comparing id to
  // null, since id: number on the other member isn't a literal type.
  if ('perenual_id' in species) {
    const params = new URLSearchParams({
      perenual_id: String(species.perenual_id),
      common_name: species.common_name ?? '',
      scientific_name: species.scientific_name ?? '',
      image_url: species.image_url ?? '',
    })
    return `/encyclopedia/species/lookup?${params}`
  }

  return `/encyclopedia/species/${species.id}`
}

export type SpeciesCardProps = {
  species: SpeciesIndexResult
}

export default function SpeciesCard({ species }: SpeciesCardProps) {
  // difficulty/pet_safe only exist on the local-catalogue member of the
  // union — a Perenual search result (speciesSearchResultSchema) carries
  // neither, same as the untyped original reading them as undefined.
  const difficulty = 'difficulty' in species ? species.difficulty : null
  const petSafe = 'pet_safe' in species ? species.pet_safe : null
  const safety = petSafetyLabel(petSafe)

  return (
    <Link
      to={detailPath(species)}
      className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
    >
      <Card variant="paper-warm" className="p-3.5 gap-2.5 hover:-translate-y-px hover:shadow-warm-md transition-all">
        <SpeciesImage imageUrl={species.image_url} className="w-full aspect-[1.2]" />
        <span className="flex flex-col gap-0.5 min-w-0">
          <span className="font-display italic text-[17px] leading-tight text-ink">{species.common_name}</span>
          {species.scientific_name && (
            <span className="text-[11px] italic text-ink-softer truncate">{species.scientific_name}</span>
          )}
        </span>
        <span className="flex flex-wrap gap-1 mt-1">
          {difficulty && (
            <Badge scheme="neutral" size="sm">
              {capitalise(difficulty)}
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
