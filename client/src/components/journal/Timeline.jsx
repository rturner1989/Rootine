import { useInfiniteScrollSentinel } from '../../hooks/useInfiniteScrollSentinel'
import { useJournal } from '../../hooks/useJournal'
import { groupEntriesByDay } from '../../utils/journalGrouping'
import Action from '../ui/Action'
import EmptyState from '../ui/EmptyState'
import ErrorState from '../ui/errors/ErrorState'
import Spinner from '../ui/Spinner'
import DayGroup from './DayGroup'

// The day-grouped event feed — the List view of the Journal entries surface
// (Entries.jsx). The toolbar, filters, and stats rail live on the shared
// surface; this owns only the feed: its own infinite query, day grouping,
// and the empty / error / loading states. `filters` (URL filters with any
// locked plant already merged) and `hasActiveFilter` come down from the
// surface, which reads the URL once for every view.
export default function Timeline({ filters, hasActiveFilter, fill = false }) {
  const { data, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useJournal(filters)
  const entries = data?.pages.flatMap((page) => page.entries) ?? []
  const sentinelRef = useInfiniteScrollSentinel({ hasNextPage, isFetchingNextPage, fetchNextPage })

  function renderBody() {
    if (isLoading) {
      return (
        <div role="status" aria-label="Loading your journal" className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      )
    }

    if (error) {
      return (
        <ErrorState
          scheme="500"
          headingLevel="h2"
          title={
            <>
              Couldn't open <em>your diary</em>
            </>
          }
          description="The journal didn't load. Try again, or head back to Today."
          actions={[
            <Action key="retry" type="button" variant="primary" onClick={() => refetch()}>
              Try again
            </Action>,
            <Action key="today" variant="secondary" to="/">
              Back to Today
            </Action>,
          ]}
        />
      )
    }

    if (entries.length === 0) {
      if (hasActiveFilter) {
        return (
          <EmptyState
            framed={false}
            tone="mint"
            icon="🔍"
            title="Nothing matches these filters"
            description="Try removing a chip — or clear all filters to see the full timeline."
          />
        )
      }
      return (
        <EmptyState
          framed={false}
          tone="mint"
          icon="📖"
          title="No events yet"
          description="Log a watering, take a photo, or earn an achievement — every event you collect lands here."
          actions={
            <Action variant="primary" to="/house">
              Open House
            </Action>
          }
        />
      )
    }

    const groups = groupEntriesByDay(entries)
    return (
      <>
        {groups.map((group, index) => (
          <DayGroup
            key={group.dayKey}
            relativeLabel={group.relativeLabel}
            dateLabel={group.dateLabel}
            entries={group.entries}
            isFirst={index === 0}
          />
        ))}
        <div ref={sentinelRef} aria-hidden="true" className="h-px" />
        {isFetchingNextPage && (
          <div role="status" aria-label="Loading more entries" className="flex items-center justify-center py-4">
            <Spinner />
          </div>
        )}
        {!hasNextPage && entries.length > 10 && (
          <p className="text-center text-[11px] italic text-ink-softer py-4">That's the start of your diary.</p>
        )}
      </>
    )
  }

  return <div className={`min-h-0 ${fill ? 'flex-1 overflow-y-auto' : ''}`}>{renderBody()}</div>
}
