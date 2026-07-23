import { Link } from 'react-router-dom'
import { petSafetyLabel } from '../../utils/petSafety'
import Badge from '../ui/Badge'
import Card from '../ui/Card'

const TONE_SCHEME = { safe: 'emerald', toxic: 'coral', unknown: 'neutral' }

function capitalise(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

// Browse grid cell (mockup 25 .sp-card): emoji photo tile, italic common
// name, scientific name, trait badges. The whole card is the link into the
// species page. Card is a plain div (not polymorphic), so the Link wraps it
// — the outer Link is the single role="link".
export default function SpeciesCard({ species }) {
  const safety = petSafetyLabel(species.pet_safe)

  return (
    <Link
      to={`/encyclopedia/species/${species.id}`}
      className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
    >
      <Card variant="paper-warm" className="p-3.5 gap-2.5 hover:-translate-y-px hover:shadow-warm-md transition-all">
        <span
          aria-hidden="true"
          className="species-photo w-full rounded-[10px] flex items-center justify-center text-[54px]"
        >
          🌿
        </span>
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
