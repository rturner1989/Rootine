import type { Plant } from '../types/plant'
import { pluralize } from './pluralize'

// days_until_water and days_until_feed share this same nullable-number
// shape (plant.rb) — either field's type documents the parameter.
export function getDaysDisplay(daysUntil: Plant['days_until_water']): string | null {
  if (daysUntil === null || daysUntil === undefined) return null

  if (daysUntil < 0) {
    return `${pluralize(Math.abs(daysUntil), 'day')} overdue`
  }
  if (daysUntil === 0) return 'Due today'
  return `In ${pluralize(daysUntil, 'day')}`
}
