import Card from '../ui/Card'
import Heading from '../ui/Heading'

function capitaliseLabel(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

// `media` is an optional slot rendered at the top of the card — the
// Encyclopedia species page fills it with the plant photo so the picture and
// the reference text read as one card; Plant Detail leaves it empty.
export default function SpeciesView({ species, media = null }) {
  if (!species) {
    return (
      <Card variant="paper-warm" className="p-5">
        <p className="text-sm text-ink-soft italic">No species linked to this plant yet.</p>
      </Card>
    )
  }

  const stats = [
    species.difficulty && { label: 'Difficulty', value: capitaliseLabel(species.difficulty) },
    species.growth_rate && { label: 'Growth rate', value: capitaliseLabel(species.growth_rate) },
    species.toxicity && { label: 'Toxicity', value: species.toxicity },
  ].filter(Boolean)

  return (
    <Card variant="paper-warm" className="p-5 gap-3">
      {media}
      <Card.Header divider={false} className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <Heading as="h2" variant="panel" className="text-ink !text-[18px]">
            {species.common_name}
          </Heading>
          {species.scientific_name && (
            <p className="font-display italic text-sm text-ink-soft mt-0.5">{species.scientific_name}</p>
          )}
        </div>
        {species.difficulty && (
          <span className="text-[11px] font-semibold text-ink-soft">{capitaliseLabel(species.difficulty)} care</span>
        )}
      </Card.Header>
      <Card.Body className="!flex-none !overflow-visible flex flex-col gap-4 text-sm">
        {species.description && <p className="text-ink leading-relaxed">{species.description}</p>}
        {species.care_tips && (
          <div className="flex flex-col gap-1.5">
            <p className="eyebrow-label text-ink-softer">Care tips</p>
            <p className="text-ink-soft leading-relaxed">{species.care_tips}</p>
          </div>
        )}
        {stats.length > 0 && (
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col gap-0.5 px-3 py-2 rounded-md bg-paper-deep/40">
                <dt className="eyebrow-label text-ink-softer">{stat.label}</dt>
                <dd className="text-sm font-bold text-ink">{stat.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </Card.Body>
    </Card>
  )
}
