// Care-type emoji even in chrome — the 💧/🌱 carry care-as-ritual meaning
// FA's generic icons lose (project icon paradigm).
const CARE_EMOJI = { water: '💧', feed: '🌱' }
const CARE_VERB = { water: 'Water', feed: 'Feed' }

// A scheduled (due / overdue) care row, mirroring the Timeline Entry shape
// so logged + due events read alike. Shared by the day-detail popover and
// the week agenda.
export default function ScheduledRow({ item }) {
  const overdue = item.state === 'overdue'
  return (
    <li className="flex items-center gap-3 border-t border-paper-edge px-4 lg:px-5 py-3 first:border-t-0">
      <span
        aria-hidden="true"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-paper-deep text-base"
      >
        {CARE_EMOJI[item.kind]}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${overdue ? 'text-coral-deep' : 'text-ink'}`}>
          {CARE_VERB[item.kind]} {overdue ? 'overdue' : 'due'}
        </p>
        <p className="mt-0.5 text-xs text-ink-soft">{item.plant_nickname}</p>
      </div>
    </li>
  )
}
