import { expect, type Page, test } from '@playwright/test'
import { completeOnboarding, registerUser } from '../helpers/onboarding'

// Walks the wizard with a single seeded plant so the dashboard renders
// the WeekCard / Highlights / PlantsRow surfaces instead of the
// zero-plants empty state. Used by the WeekStrip + plants-row specs.
async function registerWithOnePlant(page: Page, name = 'Sprout'): Promise<void> {
  await registerUser(page, name)
  // Step 0 → Step 1
  await page.getByRole('button', { name: /Let's meet them/i }).click()
  await page
    .getByRole('radiogroup', { name: 'Onboarding intent' })
    .getByText(/Forgetful/i)
    .click()
  await page.getByRole('button', { name: /^Continue/i }).click()
  // Step 2 — Living Room
  await page.getByRole('checkbox', { name: /Living Room/i }).click()
  await page.getByRole('button', { name: /^Continue/i }).click()
  // Step 3 — pick the seeded Snake Plant tile, override nickname, confirm.
  await expect(page.getByRole('heading', { level: 1, name: /Meet your plants/i })).toBeVisible()
  await page
    .getByRole('button', { name: /Snake Plant/i })
    .first()
    .click()
  await page.getByLabel('Nickname').fill('Spike')
  await page.getByRole('button', { name: /^Add plant$/i }).click()
  await page.getByRole('button', { name: /Continue with 1 plant/i }).click()
  await expect(page).toHaveURL(/\/welcome\/environment$/)

  // Step 4 Environment — accept defaults.
  await expect(page.getByRole('heading', { level: 1, name: /How do your spaces feel/i })).toBeVisible()
  await page.getByRole('button', { name: /^Continue/i }).click()
  await expect(page).toHaveURL(/\/welcome\/stakes$/)

  // Step 5 Stakes.
  await expect(page.getByRole('heading', { level: 1, name: /This is your streak/i })).toBeVisible()
  await page.getByRole('button', { name: /^Continue/i }).click()
  await expect(page).toHaveURL(/\/welcome\/journal$/)

  // Step 6 Journal.
  await expect(page.getByRole('heading', { level: 1, name: /Meet the journal/i })).toBeVisible()
  await page.getByRole('button', { name: /^Continue/i }).click()
  await expect(page).toHaveURL(/\/welcome\/done$/)

  // Step 7 done.
  await page.getByRole('button', { name: /Enter your greenhouse/i }).click()
  await expect(page).toHaveURL('/')
}

test.describe('Today dashboard', () => {
  test('greets a brand-new user and invites them to add their first plant', async ({ page }) => {
    await registerUser(page, 'Robin')
    await completeOnboarding(page)

    await expect(page.getByRole('heading', { level: 1, name: /Robin/ })).toBeVisible()
    await expect(page.getByText(/Good (morning|afternoon|evening)/)).toBeVisible()

    // Zero-plants empty state: inviting copy + CTA routing to /add-plant.
    await expect(page.getByRole('heading', { name: /Your jungle starts here/ })).toBeVisible()
    await expect(page.getByText(/Add a plant to see it come alive/)).toBeVisible()
    await expect(page.getByRole('button', { name: /Add a plant/ })).toBeVisible()
  })

  test('unauthenticated visit redirects to login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('week strip renders seven day chips and selecting a future day swaps the rituals heading', async ({ page }) => {
    await registerWithOnePlant(page)

    // Wait for the dashboard query to land before reaching for the
    // WeekStrip chips — Today renders a Spinner while isLoading, and
    // CI cold-starts can keep that up past Playwright's 5s default.
    await expect(page.getByRole('heading', { name: /Today's rituals/ })).toBeVisible({ timeout: 15000 })

    // WeekStrip exposes each day as a button with an aria-label that
    // includes the weekday + date + count summary. "today" appears on
    // exactly one chip. The "Today's rituals" heading above isn't a
    // sufficient gate — chips depend on a separate /weather query, so
    // the heading can render while the strip is still empty.
    const todayChip = page.getByRole('button', { name: /today/ })
    await expect(todayChip).toBeVisible({ timeout: 15000 })
    await expect(todayChip).toHaveAttribute('aria-pressed', 'true')

    // Pick a future day — the chip whose aria-label contains a weekday
    // but NOT "today". WeekStrip renders today + 6 forward days, so any
    // non-today chip is in the future.
    const futureChips = page.getByRole('button', { name: /^(?!.*today).*(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/ })
    await futureChips.first().click()

    // Heading updates to "Rituals · {Weekday} {date} {month}".
    await expect(page.getByRole('heading', { name: /Rituals · / })).toBeVisible()
    // Future-day empty state when nothing's scheduled.
    await expect(page.getByText(/Nothing scheduled/)).toBeVisible()
  })

  test('plants row shows the seeded plant tile alongside the Add-a-plant CTA', async ({ page }) => {
    await registerWithOnePlant(page)

    await expect(page.getByText(/^Spike$/)).toBeVisible()
    await expect(page.getByRole('button', { name: /Add plant/i })).toBeVisible()
  })

  test('Add Plant CTA on Today opens the dialog and submission lands on the plant detail page', async ({ page }) => {
    await registerUser(page, 'Robin')
    await completeOnboarding(page)

    // Empty-state CTA — opens the dialog.
    await page.getByRole('button', { name: /Add a plant/ }).click()
    await expect(page.getByRole('dialog', { name: /Add a plant/ })).toBeVisible()

    // Step 1 — pick a species.
    await page
      .getByRole('button', { name: /Snake Plant/i })
      .first()
      .click()

    // Step 2 — details. Nickname + care anchor pickers. Hit submit.
    const nickname = page.getByLabel('Nickname')
    await expect(nickname).toBeVisible()
    await nickname.fill('Hisser')

    // Care anchor pickers — both default to today, no further interaction needed.
    await expect(page.getByLabel('When did you last water?')).toBeVisible()
    await expect(page.getByLabel('When did you last feed?')).toBeVisible()

    await page
      .getByRole('button', { name: /^Add plant$/i })
      .last()
      .click()

    // Generic CTA path → navigate to /plants/:id.
    await expect(page).toHaveURL(/\/plants\/\d+$/)
  })
})
