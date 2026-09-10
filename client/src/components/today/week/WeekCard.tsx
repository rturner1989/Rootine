import type { DashboardResponse } from '../../../types/dashboard'
import type { Plant } from '../../../types/plant'
import Card from '../../ui/Card'
import Heading from '../../ui/Heading'
import DayRituals from './DayRituals'
import WeekStrip from './WeekStrip'

const HEADER_ICON = (
  <span
    aria-hidden="true"
    className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[12px] bg-mint text-emerald"
  >
    📅
  </span>
)

const SELECTED_FORMATTER = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'short' })

function parseLocalDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export type WeekCardProps = {
  tasks?: DashboardResponse['tasks']
  plants?: Plant[]
  tasksByDay?: DashboardResponse['tasks_by_day']
  // Required (unlike WeekStrip/DayRituals' own optional selectedDate):
  // the non-today heading branch below always formats it, and the only
  // real caller (Today.jsx) always supplies a string.
  selectedDate: string
  onSelectDate?: (date: string) => void
  isLoading?: boolean
  isToday?: boolean
}

// Combined week-at-a-glance + selected-day rituals card. The strip
// across the top drives `selectedDate` (lifted up to Today), and the
// ritual list below filters to whatever day the strip selects.
export default function WeekCard({
  tasks,
  plants,
  tasksByDay,
  selectedDate,
  onSelectDate,
  isLoading,
  isToday,
}: WeekCardProps) {
  const heading = isToday ? "Today's rituals" : `Rituals · ${SELECTED_FORMATTER.format(parseLocalDate(selectedDate))}`
  const remaining = tasks?.length ?? 0

  return (
    <Card variant="paper-warm" className="p-4 gap-3">
      <Card.Header divider={false} className="flex items-center justify-between">
        <Heading as="h2" variant="panel" className="text-ink flex items-center gap-2">
          {HEADER_ICON}
          This week
        </Heading>
      </Card.Header>

      <Card.Body className="!overflow-visible !flex-none flex flex-col gap-3">
        <WeekStrip tasksByDay={tasksByDay} selectedDate={selectedDate} onSelectDate={onSelectDate} />

        <div className="flex items-center justify-between border-t border-paper-edge/60 pt-3">
          <Heading as="h3" variant="panel" className="text-ink">
            {heading}
          </Heading>
          {remaining === 0 ? <Card.Meta>all done</Card.Meta> : <Card.Meta count={remaining}>to go</Card.Meta>}
        </div>

        <DayRituals tasks={tasks} plants={plants} selectedDate={selectedDate} isLoading={isLoading} isToday={isToday} />
      </Card.Body>

      {remaining > 0 && isToday ? (
        <Card.Footer divider={false} className="text-center">
          <p className="text-xs italic text-ink-softer sm:hidden">← swipe to mark done</p>
          <p className="hidden sm:block text-xs italic text-ink-softer">tap a row to log care</p>
        </Card.Footer>
      ) : null}
    </Card>
  )
}
