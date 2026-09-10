import { describe, expect, it } from 'vitest'
import { weatherResponseSchema } from '../../src/types/weather'
import weatherFixture from '../fixtures/api/weather.json'

// Captured live from GET /api/v1/weather against the seeded dev DB
// (Open-Meteo-backed, WeatherController's default location fallback) — a
// populated payload, not a hand-built approximation.
describe('weatherResponseSchema', () => {
  it('parses a real, populated weather payload', () => {
    expect(weatherResponseSchema.safeParse(weatherFixture).success).toBe(true)
  })

  it('rejects when today.next_day is missing — OpenMeteoClient#current_day_payload always nests it', () => {
    const { next_day: _nextDay, ...todayWithoutNextDay } = weatherFixture.today
    const broken = { ...weatherFixture, today: todayWithoutNextDay }
    expect(weatherResponseSchema.safeParse(broken).success).toBe(false)
  })

  it('rejects when a week entry is missing icon_name — OpenMeteoClient#forecast always sets it', () => {
    const broken = {
      ...weatherFixture,
      week: weatherFixture.week.map(({ icon_name: _iconName, ...rest }) => rest),
    }
    expect(weatherResponseSchema.safeParse(broken).success).toBe(false)
  })
})
