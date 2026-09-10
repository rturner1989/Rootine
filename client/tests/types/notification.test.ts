import { describe, expect, it } from 'vitest'
import { notificationsResponseSchema } from '../../src/types/notification'
import notificationsIndexFixture from '../fixtures/api/notifications-index.json'

// Real payload — includes a `kind: 'achievement'` notification with meta,
// url and params all populated the way AchievementNotifier actually builds
// them (required_param :achievement_id, derived meta/title), not the
// all-nulls shape a hand-written fixture might default to.
describe('notificationsResponseSchema', () => {
  it('parses a real, populated notifications feed', () => {
    const achievementNotification = notificationsIndexFixture.notifications.find(
      (notification) => notification.kind === 'achievement',
    )
    expect(achievementNotification?.meta).not.toBeNull()
    expect(achievementNotification?.params).not.toBeNull()
    expect(notificationsResponseSchema.safeParse(notificationsIndexFixture).success).toBe(true)
  })

  it('rejects when unread_count is not a number', () => {
    const broken = { ...notificationsIndexFixture, unread_count: '0' }
    expect(notificationsResponseSchema.safeParse(broken).success).toBe(false)
  })
})
