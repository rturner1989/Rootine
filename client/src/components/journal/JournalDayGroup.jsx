import { pluralize } from '../../utils/pluralize'
import Heading from '../ui/Heading'
import JournalEntry from './JournalEntry'

export default function JournalDayGroup({ label, entries }) {
  return (
    <section className="flex flex-col gap-2">
      <header className="sticky top-0 z-[5] -mx-3 lg:-mx-6 px-3 lg:px-6 py-2 bg-paper/95 backdrop-blur-sm border-b border-paper-edge flex items-baseline justify-between">
        <Heading as="h2" variant="card" className="text-ink">
          {label}
        </Heading>
        <span className="eyebrow-label text-ink-softer">{pluralize(entries.length, 'entry', 'entries')}</span>
      </header>
      <ul className="flex flex-col gap-2">
        {entries.map((entry) => (
          <JournalEntry key={entry.id} entry={entry} />
        ))}
      </ul>
    </section>
  )
}
