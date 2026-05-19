import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import JournalDayGroup from '../components/journal/JournalDayGroup'
import JournalFilterToolbar, { readJournalFilters } from '../components/journal/JournalFilterToolbar'
import Action from '../components/ui/Action'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/errors/ErrorState'
import PageHeader from '../components/ui/PageHeader'
import Spinner from '../components/ui/Spinner'
import { useJournal } from '../hooks/useJournal'
import { groupEntriesByDay } from '../utils/journalGrouping'
import { pluralize } from '../utils/pluralize'

export default function Journal() {
  const [searchParams] = useSearchParams()
  const filters = readJournalFilters(searchParams)
  const hasActiveFilter =
    filters.plantIds.length > 0 || filters.kinds.length > 0 || filters.dateFrom != null || filters.dateTo != null
  const { data, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useJournal(filters)
  const entries = data?.pages.flatMap((page) => page.entries) ?? []
  const sentinelRef = useRef(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    if (!hasNextPage) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const header = (
    <PageHeader meta={entries.length > 0 ? `${pluralize(entries.length, 'entry', 'entries')} loaded` : null}>
      Journal
    </PageHeader>
  )

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
            tone="mint"
            icon="🔍"
            title="Nothing matches these filters"
            description="Try removing a chip — or clear all filters to see the full timeline."
          />
        )
      }
      return (
        <EmptyState
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
      <div className="flex flex-col gap-4">
        {groups.map((group) => (
          <JournalDayGroup key={group.dayKey} label={group.label} entries={group.entries} />
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
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 gap-5 lg:gap-7 px-3 lg:px-6 py-4 lg:py-6 overflow-x-hidden">
      {header}
      <JournalFilterToolbar />
      {renderBody()}
    </div>
  )
}
