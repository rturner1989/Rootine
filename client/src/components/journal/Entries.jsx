import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useJournal } from '../../hooks/useJournal'
import { useJournalCalendar } from '../../hooks/useJournalCalendar'
import { useLocalStorageState } from '../../hooks/useLocalStorageState'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { addDays, addMonths, gridRange, startOfWeek, weekRange } from '../../utils/calendarGrid'
import { isoDateKey } from '../../utils/dateKey'
import { pluralize } from '../../utils/pluralize'
import CalendarBody from './entries/CalendarBody'
import DayDetailSurface from './entries/DayDetailSurface'
import Toolbar from './entries/Toolbar'
import { dateRangeSummaryLabel, readJournalFilters } from './filter/config'
import StatsRail from './StatsRail'
import Timeline from './Timeline'

// "8 – 14 Sep 2025", widening to "29 Sep – 5 Oct 2025" when the week spans
// two months.
function weekLabel(cursor) {
  const start = startOfWeek(cursor)
  const end = addDays(start, 6)
  const startFormat = start.getMonth() === end.getMonth() ? { day: 'numeric' } : { day: 'numeric', month: 'short' }
  return `${start.toLocaleDateString(undefined, startFormat)} – ${end.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`
}

// The Journal entries surface — one diary seen three ways off a List / Week
// / Month toggle (TICKET-064 merged the old Timeline + Calendar tabs). List
// is the infinite logged feed (Timeline); Week + Month are the calendar
// views (CalendarBody) overlaying scheduled care. This component owns the
// orchestration — active view + visible period + selected day (local UI
// state), the windowed events + schedule (server state), the stats-rail open
// state — and delegates rendering: the toolbar, the per-view body, the shared
// rail, and the day-detail surface. Each query is gated to its view so the
// inactive one doesn't fetch. Scoped to one plant on Plant Detail (plantId),
// or the URL plant/kind filters on the all-plants journal.
export default function Entries({ plantId = null, fill = false }) {
  const [searchParams] = useSearchParams()
  const urlFilters = readJournalFilters(searchParams)
  // List carries the full filter set (incl. date range); the calendar views
  // drop date — the visible window IS their date range.
  const listFilters = plantId ? { ...urlFilters, plantIds: [plantId] } : urlFilters
  const calendarFilters = {
    plantIds: plantId ? [plantId] : urlFilters.plantIds,
    kinds: urlFilters.kinds,
  }

  const [view, setView] = useState('month')
  const [cursor, setCursor] = useState(() => new Date())
  const [selected, setSelected] = useState(null)
  const anchorRef = useRef(null)
  const [railOpen, setRailOpen] = useLocalStorageState('journal:stats-rail:v1', true)
  // Day detail is an anchored popover on desktop, a bottom-sheet dialog on
  // mobile — same Popover↔Dialog split the filter control uses.
  const isMobile = useMediaQuery('(max-width: 767px)')

  const isList = view === 'list'
  const isWeek = view === 'week'
  const range = isWeek ? weekRange(cursor) : gridRange(cursor)

  // List reads its summary off the same query Timeline runs (shared cache
  // key — one fetch); the calendar endpoint now ships a window-scoped
  // summary so the rail's "in view" counts work in Week / Month too.
  const journalQuery = useJournal(listFilters, { enabled: isList })
  const calendarQuery = useJournalCalendar(range, calendarFilters, { enabled: !isList })
  const summary = isList ? journalQuery.data?.pages?.[0]?.summary : calendarQuery.data?.summary

  // Stats rail is the all-plants journal's concern (desktop) — a single
  // scoped plant doesn't warrant "most active plants".
  const showRail = !plantId
  const hasActiveFilter =
    listFilters.kinds.length > 0 ||
    listFilters.dateFrom != null ||
    listFilters.dateTo != null ||
    (!plantId && listFilters.plantIds.length > 0)

  const now = new Date()
  const periodLabel = isWeek
    ? weekLabel(cursor)
    : cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const isCurrentPeriod = isWeek
    ? isoDateKey(startOfWeek(cursor)) === isoDateKey(startOfWeek(now))
    : cursor.getFullYear() === now.getFullYear() && cursor.getMonth() === now.getMonth()

  const selectedKey = selected?.cell.key ?? null
  const scheduledForSelected = selected
    ? (calendarQuery.data?.scheduled ?? []).filter((item) => item.date === selectedKey)
    : []

  // Anchor placement flips toward the viewport centre so a bottom-row /
  // right-column cell doesn't push the popover off-screen.
  function openDay(cell, element) {
    const rect = element.getBoundingClientRect()
    const vertical = rect.bottom > window.innerHeight / 2 ? 'top' : 'bottom'
    const horizontal = rect.right > window.innerWidth / 2 ? 'right' : 'left'
    anchorRef.current = element
    setSelected({ cell, placement: `${vertical}-${horizontal}` })
  }

  function closeDay({ reason } = {}) {
    const trigger = anchorRef.current
    setSelected(null)
    if (reason === 'escape') trigger?.focus()
  }

  // Paging unmounts the anchored day button, so drop any open popover first.
  // Step moves by week or month depending on the active view.
  function changePeriod(delta) {
    setSelected(null)
    setCursor((current) => (isWeek ? addDays(current, delta * 7) : addMonths(current, delta)))
  }

  function jumpToToday() {
    setSelected(null)
    setCursor(new Date())
  }

  function changeView(next) {
    setSelected(null)
    setView(next)
  }

  function renderBody() {
    if (isList) return <Timeline filters={listFilters} hasActiveFilter={hasActiveFilter} fill={fill} />

    return (
      <CalendarBody
        query={calendarQuery}
        isWeek={isWeek}
        cursor={cursor}
        filters={calendarFilters}
        now={now}
        selectedKey={selectedKey}
        onOpenDay={openDay}
        periodLabel={periodLabel}
        fill={fill}
      />
    )
  }

  const summaryLine =
    isList && summary && summary.entry_count > 0 ? (
      <p className="text-xs font-semibold text-ink-soft">
        {pluralize(summary.entry_count, 'entry', 'entries')}
        {!plantId && ` across ${pluralize(summary.plant_count, 'plant')}`}
        {` · ${dateRangeSummaryLabel(listFilters.dateFrom, listFilters.dateTo)}`}
      </p>
    ) : null

  return (
    <div className={`flex flex-col ${fill ? 'flex-1 min-h-0' : ''}`}>
      <Toolbar
        view={view}
        onViewChange={changeView}
        plantId={plantId}
        periodLabel={periodLabel}
        isWeek={isWeek}
        isCurrentPeriod={isCurrentPeriod}
        onPrev={() => changePeriod(-1)}
        onNext={() => changePeriod(1)}
        onToday={jumpToToday}
        showRail={showRail}
        railOpen={railOpen}
        onRailToggle={() => setRailOpen((value) => !value)}
        statsCount={summary?.entry_count ?? 0}
        summaryLine={summaryLine}
      />
      <div
        className={`grid min-h-0 ${fill ? 'flex-1' : ''} transition-[grid-template-columns] duration-300 ${
          showRail && railOpen ? 'lg:grid-cols-[1fr_260px]' : 'lg:grid-cols-[1fr_0px]'
        }`}
      >
        <div className={`min-h-0 ${fill ? 'flex flex-col overflow-hidden' : ''}`}>{renderBody()}</div>
        {showRail && <StatsRail summary={summary} />}
      </div>

      <DayDetailSurface
        selected={selected}
        onClose={closeDay}
        anchorRef={anchorRef}
        filters={calendarFilters}
        scheduled={scheduledForSelected}
        isMobile={isMobile}
      />
    </div>
  )
}
