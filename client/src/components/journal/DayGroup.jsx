import { pluralize } from '../../utils/pluralize'
import Heading from '../ui/Heading'
import Entry from './Entry'

// Sticky day header (mockup .j-day): emerald uppercase relative word +
// italic absolute date + right-aligned count, on a paper-deep band with
// a dashed top divider. Sticks to the scrolling entries container.
export default function DayGroup({ relativeLabel, dateLabel, entries, isFirst = false }) {
  return (
    <section className="flex flex-col">
      <header
        className={`sticky top-0 z-[5] flex items-center gap-2.5 px-4 lg:px-5 py-2.5 bg-paper-deep border-b border-dashed border-paper-edge ${
          isFirst ? '' : 'border-t'
        }`}
      >
        <Heading as="h2" variant="card" className="flex items-baseline gap-2 !text-[13px] text-ink-softer">
          <span className="eyebrow-label not-italic text-emerald">{relativeLabel}</span>
          <span>· {dateLabel}</span>
        </Heading>
        <span className="ml-auto eyebrow-label text-ink-softer">{pluralize(entries.length, 'entry', 'entries')}</span>
      </header>
      <ul className="flex flex-col">
        {entries.map((entry) => (
          <Entry key={entry.id} entry={entry} />
        ))}
      </ul>
    </section>
  )
}
