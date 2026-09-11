import type { Plant, WaterStatus } from '../../types/plant'
import type { LightLevel } from '../../types/space'
import { pluralize } from '../../utils/pluralize'
import CareRing from '../ui/CareRing'

const LIGHT_LEVEL_LABEL: Record<LightLevel, string> = {
  low: 'Low light',
  medium: 'Medium light',
  bright: 'Bright light',
}
const LIGHT_LEVEL_FILL: Record<LightLevel, number> = { low: 0.35, medium: 0.65, bright: 1 }

function careAxisValue(daysUntil: number | null): string {
  if (daysUntil == null) return 'Not tracked'
  if (daysUntil < 0) return `${pluralize(Math.abs(daysUntil), 'day')} overdue`
  if (daysUntil === 0) return 'Due today'
  return `In ${pluralize(daysUntil, 'day')}`
}

function careAxisFill(daysUntil: number | null, cycleDays: number | null): number {
  if (daysUntil == null || !cycleDays) return 0
  if (daysUntil <= 0) return 0
  return Math.max(0, Math.min(1, daysUntil / cycleDays))
}

type Mood = { value: string; fill: number; emphasis: boolean }

function moodFor(plant: Plant): Mood {
  const states: WaterStatus[] = [plant.water_status, plant.feed_status]
  if (states.includes('overdue')) return { value: 'Struggling', fill: 0.2, emphasis: true }
  if (states.includes('due_today') || states.includes('due_soon'))
    return { value: 'Watchful', fill: 0.6, emphasis: false }
  return { value: 'Thriving', fill: 1, emphasis: false }
}

export type CareRingsRowProps = {
  plant: Plant
}

export default function CareRingsRow({ plant }: CareRingsRowProps) {
  const speciesFeeds = Boolean(plant.species?.feeding_frequency_days)
  const lightLevel = plant.space?.light_level
  const mood = moodFor(plant)

  return (
    <section aria-label="Care state" className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
      <CareRing
        label="Water"
        value={careAxisValue(plant.days_until_water)}
        fill={careAxisFill(plant.days_until_water, plant.calculated_watering_days)}
        scheme="sky"
        icon="💧"
        emphasis={plant.water_status === 'overdue'}
      />
      {speciesFeeds && (
        <CareRing
          label="Feed"
          value={careAxisValue(plant.days_until_feed)}
          fill={careAxisFill(plant.days_until_feed, plant.calculated_feeding_days)}
          scheme="mint"
          icon="🌱"
          emphasis={plant.feed_status === 'overdue'}
        />
      )}
      <CareRing
        label="Light"
        value={lightLevel ? LIGHT_LEVEL_LABEL[lightLevel] : 'Not tracked'}
        fill={lightLevel ? LIGHT_LEVEL_FILL[lightLevel] : 0}
        scheme="sunshine"
        icon="☀"
      />
      <CareRing label="Mood" value={mood.value} fill={mood.fill} scheme="coral" icon="🪴" emphasis={mood.emphasis} />
    </section>
  )
}
