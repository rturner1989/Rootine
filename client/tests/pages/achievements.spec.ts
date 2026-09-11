import { execSync } from 'node:child_process'
import { expect, test } from '@playwright/test'
import { completeOnboarding, registerUser } from '../helpers/onboarding'

// Seeds the user state needed to trigger a login_streak_7 unlock on
// the next authenticated request: streak=6, last_login=yesterday, and
// no existing login_streak_7 row. Server runs Achievement.check_triggers
// inline on the next request, so a single page reload commits the
// achievement before the splash query fires.
function seedLoginStreakReady(email: string, streak = 6): void {
  const script = `
user = User.find_by(email: '${email}')
user.achievements.where(kind: 'login_streak_7').destroy_all
user.achievements.where(kind: 'login_streak_30').destroy_all
user.update_columns(
  current_login_streak_days: ${streak},
  longest_login_streak_days: ${streak},
  last_login_on: Date.current - 1
)
`
  runRails(script)
}

function seedFirstCareLogReady(email: string): void {
  const script = `
user = User.find_by(email: '${email}')
user.achievements.where(kind: 'first_care_log').destroy_all
`
  runRails(script)
}

function runRails(script: string): void {
  const command = process.env.CI ? 'cd ../api && bin/rails runner -' : 'docker compose exec -T api bin/rails runner -'
  execSync(command, {
    input: script,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: '/bin/bash',
  })
}

test.describe('Login streak achievement splash', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('overlays the splash on first request after streak hits 7', async ({ page }) => {
    const { email } = await registerUser(page, 'Splash User')
    await completeOnboarding(page)

    seedLoginStreakReady(email)
    await page.reload()

    const splash = page.getByRole('dialog', { name: '7-day visit streak' })
    await expect(splash).toBeVisible()
    await expect(splash.getByText('Achievement unlocked')).toBeVisible()
    await expect(splash.getByText('⭐')).toBeVisible()
  })

  test('Continue dismisses the splash and it does not reappear on refresh', async ({ page }) => {
    const { email } = await registerUser(page, 'Dismiss User')
    await completeOnboarding(page)

    seedLoginStreakReady(email)
    await page.reload()

    const splash = page.getByRole('dialog', { name: '7-day visit streak' })
    await expect(splash).toBeVisible()

    await splash.getByRole('button', { name: 'Continue' }).click()
    await expect(splash).toBeHidden()

    await page.reload()
    await expect(page.getByRole('dialog', { name: '7-day visit streak' })).toBeHidden()
  })

  test('does not show splash when streak is below the threshold', async ({ page }) => {
    const { email } = await registerUser(page, 'Below User')
    await completeOnboarding(page)

    seedLoginStreakReady(email, 3)
    await page.reload()

    await page.waitForTimeout(500)
    await expect(page.getByRole('dialog', { name: /visit streak/i })).toBeHidden()
  })

  test('notification counter and drawer entry persist after splash dismissal', async ({ page }) => {
    const { email } = await registerUser(page, 'Counter User')
    await completeOnboarding(page)

    seedLoginStreakReady(email)
    await page.reload()

    const splash = page.getByRole('dialog', { name: '7-day visit streak' })
    await expect(splash).toBeVisible()
    await splash.getByRole('button', { name: 'Continue' }).click()
    await expect(splash).toBeHidden()

    const bell = page.getByRole('button', { name: /^Notifications/ }).first()
    await expect(bell).toContainText('1')

    await bell.click()
    const drawer = page.getByRole('dialog', { name: 'Notifications' })
    await expect(drawer.getByRole('heading', { name: 'Achievements' })).toBeVisible()
    await expect(drawer.getByText('7-day visit streak')).toBeVisible()
  })
})

test.describe('In-app achievement toast', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('first care log unlock fires a toast', async ({ page }) => {
    const { email } = await registerUser(page, 'Toast User')
    await completeOnboarding(page, { spaces: ['Living Room'] })

    // Wait for AchievementsChannel to be confirmed by the server before
    // triggering the unlock — Action Cable doesn't replay missed
    // broadcasts, so a CI worker that processes Sidekiq before the
    // subscribe round-trip lands would lose the toast forever.
    await expect(page.getByTestId('achievements-cable-ready')).toBeAttached({ timeout: 15000 })

    seedFirstCareLogReady(email)

    // Wait for AppLayout to settle — AchievementsListener subscribes to
    // ActionCable on mount, and the broadcast we fire below is only
    // received if the subscription is established first. Network-idle
    // is a reliable signal that the dashboard fetch + cable handshake
    // have completed.
    await page.waitForLoadState('networkidle')

    // Trigger a care log via rails runner, then run the achievement job
    // synchronously instead of letting Sidekiq pick it up. Cold-start
    // Sidekiq on CI added 5–8s of variance and still missed the toast
    // window even at 15s. Calling perform_now removes the queue entirely.
    runRails(`
user = User.find_by(email: '${email}')
plant = user.plants.first || user.spaces.first.plants.create!(
  nickname: 'Wilty',
  species: Species.first || Species.create!(common_name: 'Test', watering_frequency_days: 7, feeding_frequency_days: 30, personality: 'chill')
)
care_log = plant.care_logs.create!(care_type: 'watering', performed_at: Time.current)
CheckAchievementsJob.new.perform(event: 'care_logged', user_id: user.id, source_type: 'CareLog', source_id: care_log.id)
`)

    const toast = page.getByText('First care logged')
    await expect(toast).toBeVisible({ timeout: 15000 })
  })
})
