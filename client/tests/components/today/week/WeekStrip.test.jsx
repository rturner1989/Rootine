import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'

// jsdom doesn't implement scrollIntoView; WeekStrip calls it in a mount
// effect to centre the selected day.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

const { week, todayKey } = vi.hoisted(() => {
  const isoLocal = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const days = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(start)
    date.setDate(start.getDate() + offset)
    return { date: isoLocal(date), scheme: 'sun', icon_name: 'clear', label: 'Sunny', temperature: 20 }
  })
  return { week: days, todayKey: isoLocal(start) }
})

vi.mock('../../../../src/hooks/useWeather', () => ({ useWeather: () => ({ week }) }))
vi.mock('../../../../src/components/today/WeatherIcon', () => ({ default: () => <span data-testid="wx" /> }))

import WeekStrip from '../../../../src/components/today/week/WeekStrip'

function renderStrip() {
  return render(
    <WeekStrip tasksByDay={{ [todayKey]: { water: 2, feed: 1 } }} selectedDate={todayKey} onSelectDate={vi.fn()} />,
  )
}

describe('WeekStrip', () => {
  it('labels the current day "Today" with an emerald today-ring (no coral dot)', () => {
    const { container } = renderStrip()
    expect(screen.getByText('Today')).toBeInTheDocument()

    const todayButton = screen.getByRole('button', { name: /today/i })
    expect(todayButton.className).toContain('ring-emerald/40')

    // The old coral "today" dot is retired — coral is reserved for overdue.
    expect(container.querySelector('.bg-coral')).toBeNull()
  })

  it('renders task-count dots in the canonical care colours', () => {
    const { container } = renderStrip()
    expect(container.querySelector('.bg-water')).not.toBeNull()
    expect(container.querySelector('.bg-leaf')).not.toBeNull()
    // The old Today-strip colours are gone.
    expect(container.querySelector('.bg-sky-deep')).toBeNull()
    expect(container.querySelector('.bg-sunshine-deep')).toBeNull()
  })
})
