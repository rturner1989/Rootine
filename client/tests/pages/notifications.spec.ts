import { execSync } from 'node:child_process'
import { expect, test } from '@playwright/test'
import { completeOnboarding, registerUser } from '../helpers/onboarding'

// Triggers Noticed events server-side via rails runner so the drawer
// has real data to show. CI runs Rails natively (no docker compose);
// local dev runs via the `api` compose service.
//
// Sidekiq::Testing.inline! makes plant creation + achievement triggers
// + notifier delivery run synchronously inside the runner — without it,
// space.plants.create! enqueues the first-plant achievement check
// async, the notification arrives AFTER destroy_all, and the test sees
// 4 unread instead of 3.
function seedMilestonesForUser(email: string, count: number): void {
  const script = `
require 'sidekiq/testing'

Sidekiq::Testing.inline! do
  user = User.find_by(email: '${email}')
  space = user.spaces.first
  species = Species.first || Species.create!(common_name: 'Test', watering_frequency_days: 7, feeding_frequency_days: 30, personality: 'chill')
  plant = space.plants.first || space.plants.create!(nickname: 'Wilty', species: species)
  user.notifications.reload.destroy_all
  user.achievements.where(kind: 'plant_anniversary').destroy_all

  ${count}.times do |i|
    AchievementNotifier.with(
      record: plant,
      achievement_id: i + 1,
      title: 'Achievement unlocked',
      label: "#{30 + i} days with Wilty",
      emoji: '🏆',
      url: "/plants/#{plant.id}"
    ).deliver(user)
  end
end
`
  const command = process.env.CI ? 'cd ../api && bin/rails runner -' : 'docker compose exec -T api bin/rails runner -'
  execSync(command, {
    input: script,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: '/bin/bash',
  })
}

test.describe('Notifications drawer', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('bell opens an empty drawer when there are no notifications', async ({ page }) => {
    await registerUser(page, 'Bell User')
    await completeOnboarding(page)

    const bell = page.getByRole('button', { name: /^Notifications$/ }).first()
    await bell.click()

    const drawer = page.getByRole('dialog', { name: 'Notifications' })
    await expect(drawer).toBeVisible()
    await expect(drawer.getByText("You're all caught up")).toBeVisible()
  })

  test('escape key closes the drawer', async ({ page }) => {
    await registerUser(page, 'Esc User')
    await completeOnboarding(page)

    await page
      .getByRole('button', { name: /^Notifications$/ })
      .first()
      .click()
    const drawer = page.getByRole('dialog', { name: 'Notifications' })
    await expect(drawer).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
  })

  test('close button (✕) closes the drawer', async ({ page }) => {
    await registerUser(page, 'X User')
    await completeOnboarding(page)

    await page
      .getByRole('button', { name: /^Notifications$/ })
      .first()
      .click()
    const drawer = page.getByRole('dialog', { name: 'Notifications' })
    await expect(drawer).toBeVisible()

    // dispatchEvent bypasses Playwright's hit-test (the page background
    // blob's SVG ellipse intercepts clicks even though the close button
    // is at a higher z-index — Framer's animation tweens overlap timing).
    await page.getByRole('button', { name: 'Close Notifications' }).dispatchEvent('click')
    await expect(drawer).toBeHidden()
  })

  test('clicking outside the drawer (transparent overlay) closes it', async ({ page }) => {
    await registerUser(page, 'Outside User')
    await completeOnboarding(page)

    await page
      .getByRole('button', { name: /^Notifications$/ })
      .first()
      .click()
    await expect(page.getByRole('dialog', { name: 'Notifications' })).toBeVisible()

    // The transparent click-outside overlay is itself a dialog-overlay button.
    await page.getByRole('button', { name: 'Close dialog' }).click()
    await expect(page.getByRole('dialog', { name: 'Notifications' })).toBeHidden()
  })

  test('drawer renders grouped notifications and Mark all as read clears them', async ({ page }) => {
    const { email } = await registerUser(page, 'Group User')
    await completeOnboarding(page)
    seedMilestonesForUser(email, 3)
    await page.reload()

    await page
      .getByRole('button', { name: /^Notifications/ })
      .first()
      .click()
    const drawer = page.getByRole('dialog', { name: 'Notifications' })
    await expect(drawer).toBeVisible()

    await expect(drawer.getByRole('heading', { name: 'Achievements' })).toBeVisible()
    // Counter line is "{N} unread · {N} this week" — the · disambiguates
    // from sr-only "N unread" copy on the group badge + live region.
    await expect(drawer.getByText(/3 unread · /)).toBeVisible()

    await drawer.getByRole('button', { name: 'Mark all as read' }).click()
    await expect(drawer.getByText(/0 unread · /)).toBeVisible()
  })

  test('view all expands a group, back arrow returns to index', async ({ page }) => {
    const { email } = await registerUser(page, 'Expand User')
    await completeOnboarding(page)
    seedMilestonesForUser(email, 8)
    await page.reload()

    await page
      .getByRole('button', { name: /^Notifications/ })
      .first()
      .click()
    const drawer = page.getByRole('dialog', { name: 'Notifications' })

    // Capped — only "View all (8)" link shown
    await expect(drawer.getByRole('button', { name: 'View all (8)' })).toBeVisible()

    await drawer.getByRole('button', { name: 'View all (8)' }).click()

    // Drawer header swaps title to group label + back arrow appears.
    await expect(drawer.getByRole('heading', { name: 'Achievements' })).toBeVisible()
    await expect(drawer.getByRole('button', { name: 'Back to all notifications' })).toBeVisible()

    await drawer.getByRole('button', { name: 'Back to all notifications' }).click()
    await expect(drawer.getByRole('heading', { name: 'Notifications' })).toBeVisible()
  })

  test('clicking a notification marks it read and navigates to plant detail', async ({ page }) => {
    const { email } = await registerUser(page, 'Click User')
    await completeOnboarding(page)
    seedMilestonesForUser(email, 1)
    await page.reload()

    await page
      .getByRole('button', { name: /^Notifications/ })
      .first()
      .click()
    const drawer = page.getByRole('dialog', { name: 'Notifications' })

    const item = drawer.getByRole('button', { name: /30 days with/ }).first()
    await item.click()

    await expect(page).toHaveURL(/\/plants\/\d+$/)
  })
})
