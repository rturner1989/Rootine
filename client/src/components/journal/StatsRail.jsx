import Heading from '../ui/Heading'

function RailBlock({ title, children }) {
  return (
    <div>
      <Heading as="h4" variant="eyebrow" className="text-ink-softer mb-2">
        {title}
      </Heading>
      {children}
    </div>
  )
}

function RailPlaceholder() {
  return <p className="text-[11px] italic text-ink-softer">Coming soon</p>
}

// Stats rail for the journal Timeline (desktop only, collapsible via the
// toolbar toggle). Shell: the "In view" count reads the live summary;
// per-kind breakdown, most-active plants, and streak land in their own
// ticket — placeholders for now.
//
// The outer cell clips; the inner keeps a fixed width + constant padding
// so the parent grid can animate the column 260px→0 without the padding
// snapping mid-transition.
export default function StatsRail({ summary }) {
  const count = summary?.entry_count ?? 0
  return (
    <aside className="hidden lg:block min-h-0 overflow-hidden">
      <div className="w-[260px] h-full flex flex-col gap-[18px] border-l border-paper-edge bg-paper-deep p-4 overflow-y-auto overflow-x-hidden">
        <RailBlock title="In view">
          <div className="flex items-baseline gap-1.5 font-display italic text-[26px] text-ink leading-none">
            {count}
            <span className="not-italic font-sans text-[11px] font-bold text-ink-soft">
              {count === 1 ? 'entry' : 'entries'}
            </span>
          </div>
        </RailBlock>
        <RailBlock title="Most active">
          <RailPlaceholder />
        </RailBlock>
        <RailBlock title="Streak">
          <RailPlaceholder />
        </RailBlock>
      </div>
    </aside>
  )
}
