import { animate, motion, type PanInfo, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { useState } from 'react'
import { useToast } from '../../../context/ToastContext'
import { useMediaQuery } from '../../../hooks/useMediaQuery'
import { useLogCare } from '../../../hooks/usePlants'
import type { CareType } from '../../../types/careLog'
import type { DashboardResponse } from '../../../types/dashboard'
import type { ScheduledCareKind } from '../../../types/journal'
import type { Plant } from '../../../types/plant'
import PlantActionWheel from '../../plants/ActionWheel'
import PlantAvatar from '../../plants/Avatar'
import Action from '../../ui/Action'
import EmptyState from '../../ui/EmptyState'

type DashboardTask = DashboardResponse['tasks'][number]

const KIND_LABEL: Record<ScheduledCareKind, string> = { water: 'Water', feed: 'Feed' }
const KIND_PAST: Record<ScheduledCareKind, string> = { water: 'Watered', feed: 'Fed' }
const KIND_EMOJI: Record<ScheduledCareKind, string> = { water: '💧', feed: '🌱' }
const KIND_CARE_TYPE: Record<ScheduledCareKind, CareType> = { water: 'watering', feed: 'feeding' }
const FALLBACK_EMOJI = '🌱'

const STATE_PILL_CLASS: Record<DashboardTask['due_state'], string> = {
  overdue: 'bg-coral/15 text-coral-deep',
  due_today: 'bg-emerald/15 text-emerald-deep',
}

const STATE_LABEL: Record<DashboardTask['due_state'], string> = {
  overdue: 'Overdue',
  due_today: 'Due today',
}

const STATE_PRIORITY: Record<DashboardTask['due_state'], number> = { overdue: 0, due_today: 1 }

// Mobile drag past this commits the primary action (water for water
// rows, feed for feed rows). Below it, the row snaps back.
const SWIPE_THRESHOLD = 96

export type DayRitualsProps = {
  tasks?: DashboardTask[]
  plants?: Plant[]
  selectedDate?: string
  isLoading?: boolean
  isToday?: boolean
}

// Renders the ritual rows for whichever day the strip selects.
// Mobile: swipe right-to-left commits the row's primary action; tap
// opens the multi-action wheel. Future-day rituals are read-only —
// previewing what's coming, not acting on it.
export default function DayRituals({
  tasks = [],
  plants = [],
  selectedDate,
  isLoading,
  isToday = true,
}: DayRitualsProps) {
  const sorted = [...tasks].sort((a, b) => (STATE_PRIORITY[a.due_state] ?? 9) - (STATE_PRIORITY[b.due_state] ?? 9))

  if (isLoading) {
    return <p className="px-3 py-6 text-center text-sm text-ink-soft">Loading rituals…</p>
  }

  if (sorted.length === 0) {
    return <RitualsEmpty isToday={isToday} />
  }

  return (
    <ul className="flex flex-col -mx-2">
      {sorted.map((task) => (
        // Including selectedDate in the key forces a fresh RitualRow
        // on day change — drops any stale `x` motion value that would
        // otherwise carry across days as the same task id reappears.
        <li key={`${task.id}-${selectedDate}`} className="border-b border-paper-edge/40 last:border-b-0">
          <RitualRow
            task={task}
            plant={plants.find((candidate) => candidate.id === task.plant_id) ?? null}
            actionable={isToday}
          />
        </li>
      ))}
    </ul>
  )
}

type RitualRowProps = {
  task: DashboardTask
  plant: Plant | null
  actionable?: boolean
}

function RitualRow({ task, plant, actionable = true }: RitualRowProps) {
  const stateClass = STATE_PILL_CLASS[task.due_state] ?? STATE_PILL_CLASS.due_today
  const stateLabel = STATE_LABEL[task.due_state] ?? 'Due'
  const verb = KIND_LABEL[task.kind] ?? 'Care for'
  const [wheelOpen, setWheelOpen] = useState(false)
  const isMobile = useMediaQuery('(max-width: 767px)')
  const shouldReduceMotion = useReducedMotion()
  const toast = useToast()
  const logCare = useLogCare(plant?.id)

  const x = useMotionValue(0)
  // Backdrop fades from 0 → 1 as the user drags past the threshold.
  // Right-to-left swipe (iOS pattern), so threshold is negative.
  const backdropOpacity = useTransform(x, [0, -SWIPE_THRESHOLD], [0, 1])

  function commitSwipe() {
    if (!plant) return
    const careType = KIND_CARE_TYPE[task.kind] ?? 'watering'
    const label = KIND_PAST[task.kind] ?? 'Cared for'
    const emoji = KIND_EMOJI[task.kind] ?? '✓'
    logCare.mutate(
      { care_type: careType },
      {
        onSuccess: () => toast.success(`${label} ${plant.nickname} ${emoji}`),
      },
    )
  }

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    // iOS-style right-to-left swipe: commit on threshold OR fast flick
    // (negative velocity = leftward). Either gets the row off-screen;
    // anything else springs back to rest.
    const passedThreshold = info.offset.x <= -SWIPE_THRESHOLD
    const fastFlick = info.velocity.x < -600 && info.offset.x < -30

    if (passedThreshold || fastFlick) {
      commitSwipe()
      // Dashboard refetch will remove the row; slide off-screen left in
      // the meantime so the row doesn't snap back visibly.
      animate(x, -window.innerWidth, { type: 'spring', stiffness: 400, damping: 40 })
      return
    }
    animate(x, 0, { type: 'spring', stiffness: 500, damping: 35 })
  }

  const dragEnabled = actionable && isMobile && !shouldReduceMotion && plant != null

  return (
    <>
      <div className="relative overflow-hidden rounded-md">
        <motion.div
          aria-hidden="true"
          style={{ opacity: backdropOpacity }}
          className="absolute inset-0 bg-emerald rounded-md flex items-center justify-end pr-4 text-paper text-xs font-extrabold uppercase tracking-[0.08em]"
        >
          ✓ {KIND_PAST[task.kind] ?? 'Done'}
        </motion.div>

        <motion.div
          drag={dragEnabled ? 'x' : false}
          dragDirectionLock
          dragConstraints={{ left: -window.innerWidth, right: 0 }}
          dragElastic={0}
          dragMomentum={false}
          dragTransition={{ bounceStiffness: 600, bounceDamping: 30 }}
          style={{ x, touchAction: dragEnabled ? 'pan-y' : undefined }}
          onDragEnd={handleDragEnd}
          className="relative bg-paper"
        >
          {actionable ? (
            <Action
              variant="unstyled"
              onClick={() => setWheelOpen(true)}
              aria-haspopup="menu"
              aria-expanded={wheelOpen}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-md cursor-pointer hover:bg-paper-deep/30"
            >
              <RowContent task={task} plant={plant} verb={verb} stateClass={stateClass} stateLabel={stateLabel} />
            </Action>
          ) : (
            // Future-day preview: read-only data row, not a button.
            // SR users hear the row's content as a list item, not
            // "button, unavailable, Water Spike".
            <div className="w-full flex items-center gap-3 px-3 py-3 rounded-md">
              <RowContent task={task} plant={plant} verb={verb} stateClass={stateClass} stateLabel={stateLabel} />
            </div>
          )}
        </motion.div>
      </div>

      <PlantActionWheel
        plant={plant}
        open={wheelOpen}
        onOpenChange={setWheelOpen}
        centered
        size="md"
        primaryAction={task.kind === 'feed' ? 'feed' : 'water'}
        centreSlot={
          <span className="relative w-[100px] h-[100px] rounded-full plant-portrait flex items-center justify-center">
            <span className="relative z-[2]">
              <PlantAvatar species={plant?.species} size="2xl" shape="circle" />
            </span>
          </span>
        }
      />
    </>
  )
}

type RowContentProps = {
  task: DashboardTask
  plant: Plant | null
  verb: string
  stateClass: string
  stateLabel: string
}

function RowContent({ task, plant, verb, stateClass, stateLabel }: RowContentProps) {
  return (
    <>
      <PlantAvatar species={plant?.species} size="sm" shape="circle" className="shrink-0" />
      <span className="flex-1 min-w-0 text-left">
        <span className="block text-base font-bold text-ink">
          {verb} {task.plant_nickname}
        </span>
        <span className="block text-xs text-ink-soft">
          <span className={task.due_state === 'overdue' ? 'italic font-semibold text-coral-deep' : ''}>
            {task.due_label}
          </span>
        </span>
      </span>
      <span className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold ${stateClass}`}>{stateLabel}</span>
    </>
  )
}

function RitualsEmpty({ isToday }: { isToday: boolean }) {
  const title = isToday ? (
    <>
      Everyone's <em className="italic">thriving</em>
    </>
  ) : (
    <>
      Nothing <em className="italic">scheduled</em>
    </>
  )
  const description = isToday ? 'Your plants are happy. Check back later.' : 'No rituals lined up for this day.'

  return (
    <EmptyState
      variant="inline"
      tone={isToday ? 'forest' : 'mint'}
      icon={<span>{isToday ? '🌿' : '🗓️'}</span>}
      title={title}
      description={description}
      headingLevel="h3"
      className="py-6"
    />
  )
}
