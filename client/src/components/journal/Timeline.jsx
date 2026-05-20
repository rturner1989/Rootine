import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useSearchParams } from 'react-router-dom'
import { useInfiniteScrollSentinel } from '../../hooks/useInfiniteScrollSentinel'
import { useJournal } from '../../hooks/useJournal'
import { useLocalStorageState } from '../../hooks/useLocalStorageState'
import { groupEntriesByDay } from '../../utils/journalGrouping'
import { pluralize } from '../../utils/pluralize'
import Action from '../ui/Action'
import EmptyState from '../ui/EmptyState'
import ErrorState from '../ui/errors/ErrorState'
import Spinner from '../ui/Spinner'
import DayGroup from './DayGroup'
import FilterToolbar from './FilterToolbar'
import { dateRangeSummaryLabel, readJournalFilters } from './filter/config'
import StatsRail from './StatsRail'

// The day-grouped event feed. Rendered as the Timeline tab inside Tabs.
// When `plantId` is set (per-plant Journal on Plant Detail) the feed is
// locked to that plant and the plant filter is hidden — see
// FilterToolbar's `lockedPlantId`.
export default function Timeline({ plantId = null, fill = false }) {
  const [searchParams] = useSearchParams()
  const urlFilters = readJournalFilters(searchParams)
  const filters = plantId ? { ...urlFilters, plantIds: [plantId] } : urlFilters
  const hasActiveFilter =
    filters.kinds.length > 0 ||
    filters.dateFrom != null ||
    filters.dateTo != null ||
    (!plantId && filters.plantIds.length > 0)

  const { data, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useJournal(filters)
  const entries = data?.pages.flatMap((page) => page.entries) ?? []
  const summary = data?.pages?.[0]?.summary
  const rangeLabel = dateRangeSummaryLabel(filters.dateFrom, filters.dateTo)
  // Stats rail is the all-plants journal's concern (desktop) — a single
  // scoped plant doesn't warrant "most active plants". Open state persists.
  const showRail = !plantId
  const [railOpen, setRailOpen] = useLocalStorageState('journal:stats-rail:v1', true)
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

  return (
    <div className={`flex flex-col ${fill ? 'flex-1 min-h-0' : ''}`}>
      <div className="shrink-0 px-4 lg:px-5 py-3 border-b border-paper-edge flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <FilterToolbar lockedPlantId={plantId} />
          {showRail && (
            <Action
              variant="unstyled"
              type="button"
              onClick={() => setRailOpen((value) => !value)}
              aria-pressed={railOpen}
              className="hidden lg:inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-bold text-ink-soft hover:text-ink transition-colors"
            >
              <FontAwesomeIcon
                icon={railOpen ? faChevronRight : faChevronLeft}
                className="w-2.5 h-2.5"
                aria-hidden="true"
              />
              {railOpen ? 'Hide stats' : `Show stats · ${summary?.entry_count ?? 0}`}
            </Action>
          )}
        </div>
        {summary && summary.entry_count > 0 && (
          <p className="text-xs font-semibold text-ink-soft">
            {pluralize(summary.entry_count, 'entry', 'entries')}
            {!plantId && ` across ${pluralize(summary.plant_count, 'plant')}`}
            {` · ${rangeLabel}`}
          </p>
        )}
      </div>
      <div
        className={`grid min-h-0 ${fill ? 'flex-1' : ''} transition-[grid-template-columns] duration-300 ${
          showRail && railOpen ? 'lg:grid-cols-[1fr_260px]' : 'lg:grid-cols-[1fr_0px]'
        }`}
      >
        <div className={`min-h-0 ${fill ? 'overflow-y-auto' : ''}`}>{renderBody()}</div>
        {showRail && <StatsRail summary={summary} />}
      </div>
    </div>
  )
}
