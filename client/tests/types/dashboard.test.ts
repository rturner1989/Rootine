import { describe, expect, it } from 'vitest'
import { dashboardResponseSchema } from '../../src/types/dashboard'
import dashboardFixture from '../fixtures/api/dashboard.json'

// Captured live from GET /api/v1/dashboard against the seeded dev DB
// (user with 7 plants across 3 spaces) — a populated payload, not a
// hand-built approximation. See task-6-report.md for capture details.
describe('dashboardResponseSchema', () => {
  it('parses a real, populated dashboard payload', () => {
    expect(dashboardResponseSchema.safeParse(dashboardFixture).success).toBe(true)
  })

  it('rejects when streak is missing — DashboardController#show always builds the full object', () => {
    const { streak: _streak, ...withoutStreak } = dashboardFixture
    expect(dashboardResponseSchema.safeParse(withoutStreak).success).toBe(false)
  })

  it('rejects when a task is missing due_state — Plant#build_task always sets it', () => {
    const broken = {
      ...dashboardFixture,
      tasks: dashboardFixture.tasks.map(({ due_state: _dueState, ...rest }) => rest),
    }
    expect(dashboardResponseSchema.safeParse(broken).success).toBe(false)
  })
})
