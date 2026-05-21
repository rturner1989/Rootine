import {
  faCalendarDays,
  faCalendarWeek,
  faChevronLeft,
  faChevronRight,
  faListUl,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { DOT_KINDS } from '../../../utils/calendarGrid'
import SegmentedControl from '../../form/SegmentedControl'
import Action from '../../ui/Action'
import ActionIcon from '../../ui/ActionIcon'
import Heading from '../../ui/Heading'
import { DOT_FILL, DOT_LABEL } from '../calendar/dots'
import FilterToolbar from '../FilterToolbar'
import ActiveChips from '../filter/ActiveChips'

const VIEW_OPTIONS = [
  { value: 'list', label: 'List', icon: faListUl },
  { value: 'week', label: 'Week', icon: faCalendarWeek },
  { value: 'month', label: 'Month', icon: faCalendarDays },
]

// Dot key for the month view (logged kinds + the upcoming/overdue states).
// aria-hidden — the cells carry the semantics; this is a sighted reference.
function renderLegend() {
  return (
    <ul aria-hidden="true" className="hidden flex-wrap items-center gap-x-3 gap-y-1 md:flex">
      {DOT_KINDS.map((kind) => (
        <li key={kind} className="eyebrow-label flex items-center gap-1.5 text-ink-softer">
          <span className={`h-2 w-2 rounded-full ${DOT_FILL[kind]}`} />
          {DOT_LABEL[kind]}
        </li>
      ))}
      <li className="eyebrow-label flex items-center gap-1.5 text-ink-softer">
        <span className="h-2 w-2 rounded-full border-[1.5px] border-ink-softer" />
        Upcoming
      </li>
      <li className="eyebrow-label flex items-center gap-1.5 text-ink-softer">
        <span className="h-2 w-2 rounded-full bg-coral-deep" />
        Overdue
      </li>
    </ul>
  )
}

// The Journal entries surface toolbar (Entries.jsx). The left region swaps
// by view — List shows the filter control, Week/Month show period nav (the
// label sits in an aria-live region so paging is announced). The right
// region is shared: the List/Week/Month toggle, the month-only dot legend,
// and the desktop stats-rail toggle.
export default function Toolbar({
  view,
  onViewChange,
  plantId,
  periodLabel,
  isWeek,
  isCurrentPeriod,
  onPrev,
  onNext,
  onToday,
  showRail,
  railOpen,
  onRailToggle,
  statsCount,
  summaryLine,
}) {
  const isList = view === 'list'

  function renderLeft() {
    if (isList) return <FilterToolbar lockedPlantId={plantId} />

    return (
      <>
        <ActionIcon
          icon={faChevronLeft}
          label={isWeek ? 'Previous week' : 'Previous month'}
          scheme="paper"
          onClick={onPrev}
        />
        <Heading as="div" variant="panel" aria-live="polite" className="text-ink">
          {periodLabel}
        </Heading>
        <ActionIcon icon={faChevronRight} label={isWeek ? 'Next week' : 'Next month'} scheme="paper" onClick={onNext} />
        <Action
          variant="unstyled"
          type="button"
          onClick={onToday}
          disabled={isCurrentPeriod}
          className="rounded-full bg-paper-deep px-3 py-1.5 text-xs font-bold text-ink transition-colors hover:bg-paper-edge disabled:cursor-not-allowed disabled:opacity-50"
        >
          Today
        </Action>
        {/* Date filter is a no-op here (the window is the date range), so hide its chip. */}
        <ActiveChips lockedPlantId={plantId} hideDate />
      </>
    )
  }

  return (
    <div className="shrink-0 flex flex-col gap-2 border-b border-paper-edge px-4 lg:px-5 py-3">
      <div className="flex flex-wrap items-center gap-2.5">
        {renderLeft()}
        {/* Full-width own row on mobile (a wrapped, right-floating toggle left
            dead space); compact + right-aligned beside the controls on desktop. */}
        <SegmentedControl
          label="Journal view"
          labelHidden
          density="equal"
          className="w-full lg:w-64 lg:ml-auto"
          value={view}
          options={VIEW_OPTIONS}
          onChange={onViewChange}
        />
      </div>
      {/* Row 2: left side is the month dot legend or the list summary line
          (mutually exclusive by view, both left-aligned under the period nav);
          right side is the desktop stats-rail toggle. Rendered in every view so
          the toolbar height matches; min-h-4 floors it when empty. */}
      <div className="flex items-center gap-2 min-h-4">
        {view === 'month' && renderLegend()}
        {summaryLine}
        {showRail && (
          <Action
            variant="unstyled"
            type="button"
            onClick={onRailToggle}
            aria-pressed={railOpen}
            className="ml-auto hidden lg:inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-bold text-ink-soft hover:text-ink transition-colors"
          >
            <FontAwesomeIcon
              icon={railOpen ? faChevronRight : faChevronLeft}
              className="w-2.5 h-2.5"
              aria-hidden="true"
            />
            {railOpen ? (
              'Hide stats'
            ) : (
              // Fixed 4-digit count box so the button width holds steady up to 9999.
              <span>
                Show stats · <span className="inline-block min-w-[4ch] tabular-nums">{statsCount ?? 0}</span>
              </span>
            )}
          </Action>
        )}
      </div>
    </div>
  )
}
