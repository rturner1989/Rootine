import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { DOT_KINDS } from '../../../utils/calendarGrid'
import SegmentedControl from '../../form/SegmentedControl'
import Action from '../../ui/Action'
import ActionIcon from '../../ui/ActionIcon'
import Heading from '../../ui/Heading'
import { DOT_FILL, DOT_LABEL } from './dots'

const VIEW_OPTIONS = [
  { value: 'month', label: 'Month' },
  { value: 'week', label: 'Week' },
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

// Period nav (prev / label / next / Today) + the legend (month only) and the
// Week/Month view toggle. The label lives in an aria-live region so paging
// is announced.
export default function CalendarToolbar({
  periodLabel,
  isWeek,
  isCurrentPeriod,
  view,
  onPrev,
  onNext,
  onToday,
  onViewChange,
}) {
  return (
    <div className="shrink-0 flex flex-wrap items-center gap-2.5 border-b border-paper-edge px-4 lg:px-5 py-3">
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
      <div className="ml-auto flex items-center gap-3">
        {!isWeek && renderLegend()}
        <SegmentedControl
          label="Calendar view"
          labelHidden
          density="auto"
          value={view}
          options={VIEW_OPTIONS}
          onChange={onViewChange}
        />
      </div>
    </div>
  )
}
