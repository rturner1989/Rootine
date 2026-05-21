import Action from '../ui/Action'
import Heading from '../ui/Heading'
import { KIND_LABEL } from './filter/config'
import PlantThumb from './filter/PlantThumb'

const KIND_DOT = {
  water: 'bg-sky-deep',
  feed: 'bg-leaf',
  photo: 'bg-coral',
  achievement: 'bg-sunshine',
  acquisition: 'bg-emerald',
}
const KIND_ORDER = ['water', 'feed', 'photo', 'achievement', 'acquisition']

function RailBlock({ title, children }) {
  return (
    <div>
      <Heading as="h4" variant="eyebrow" className="text-ink-soft mb-2">
        {title}
      </Heading>
      {children}
    </div>
  )
}

function Counter({ value, unit }) {
  return (
    <div className="flex items-baseline gap-1.5 font-display italic text-[26px] text-ink leading-none">
      {value}
      <span className="not-italic font-sans text-[11px] font-bold text-ink-soft">{unit}</span>
    </div>
  )
}

// "In view" + "Most active" are filter-aware off the journal summary; the
// care streak is the user's global habit (not filter-scoped).
//
// Outer cell clips; the inner keeps a fixed width + constant padding so the
// parent grid can animate the column 260px→0 without the padding snapping.
export default function StatsRail({ summary }) {
  const entryCount = summary?.entry_count ?? 0
  const kindCounts = summary?.kind_counts ?? {}
  const topPlants = summary?.top_plants ?? []
  const streakDays = summary?.streak?.days ?? 0
  const activeKinds = KIND_ORDER.filter((kind) => (kindCounts[kind] ?? 0) > 0)

  return (
    <aside className="hidden lg:block min-h-0 overflow-hidden">
      <div className="w-[260px] h-full flex flex-col gap-[18px] border-l border-paper-edge bg-paper-deep p-4 overflow-y-auto overflow-x-hidden">
        <RailBlock title="In view">
          <Counter value={entryCount} unit={entryCount === 1 ? 'entry' : 'entries'} />
          {activeKinds.length > 0 && (
            <ul className="mt-2 flex flex-col">
              {activeKinds.map((kind) => (
                <li key={kind} className="flex items-center gap-2 py-1 text-[11px] text-ink-soft">
                  <span aria-hidden="true" className={`w-2 h-2 rounded-full shrink-0 ${KIND_DOT[kind]}`} />
                  {KIND_LABEL[kind]}
                  <span className="ml-auto font-display italic font-bold text-[13px] text-ink">{kindCounts[kind]}</span>
                </li>
              ))}
            </ul>
          )}
        </RailBlock>

        <RailBlock title="Most active">
          {topPlants.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {topPlants.map((plant) => (
                <li key={plant.id}>
                  <Action
                    to={`/plants/${plant.id}`}
                    variant="unstyled"
                    aria-label={`${plant.nickname}, ${plant.count} ${plant.count === 1 ? 'entry' : 'entries'}`}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-full bg-paper shadow-warm-sm text-[11px] font-bold text-ink transition-colors hover:bg-mint"
                  >
                    <PlantThumb src={plant.image_url} />
                    <span className="truncate">{plant.nickname}</span>
                    <span className="ml-auto font-display italic font-normal text-[11px] text-ink-soft">
                      {plant.count}
                    </span>
                  </Action>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] italic text-ink-soft">No plants in view</p>
          )}
        </RailBlock>

        <RailBlock title="Care streak">
          {streakDays > 0 ? (
            <>
              <Counter value={streakDays} unit={streakDays === 1 ? 'day in a row' : 'days in a row'} />
              <p className="mt-1 font-display italic text-[12px] text-ink-soft">
                Keep it going — log care to extend it.
              </p>
            </>
          ) : (
            <p className="text-[11px] italic text-ink-soft">No active streak — log care to start one.</p>
          )}
        </RailBlock>
      </div>
    </aside>
  )
}
