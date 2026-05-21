import { expect, test } from '@playwright/test'
import { completeOnboarding, registerUser } from '../helpers/onboarding'

async function registerAndOnboard(page) {
  await registerUser(page, 'Journal Tester')
  await completeOnboarding(page)
}

test.describe('Journal page', () => {
  test('renders the header and the empty state for a brand-new user', async ({ page }) => {
    await registerAndOnboard(page)
    await page.goto('/journal')

    await expect(page.getByRole('heading', { level: 1, name: 'Everything that has happened' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: /No events yet/i })).toBeVisible()
  })

  test('filter popover opens with Plants, Event types and Date sections', async ({ page }) => {
    await registerAndOnboard(page)
    await page.goto('/journal')

    await page.getByRole('button', { name: /^Filters/ }).click()
    const popover = page.getByRole('dialog', { name: /Filter journal entries/i })

    await expect(popover).toBeVisible()
    await expect(popover.getByRole('heading', { name: 'Plants' })).toBeVisible()
    await expect(popover.getByRole('heading', { name: 'Event types' })).toBeVisible()
    await expect(popover.getByRole('heading', { name: 'Date' })).toBeVisible()
  })

  test('selecting an event type writes the kinds param to the URL', async ({ page }) => {
    await registerAndOnboard(page)
    await page.goto('/journal')

    await page.getByRole('button', { name: /^Filters/ }).click()
    const popover = page.getByRole('dialog', { name: /Filter journal entries/i })
    await popover.getByRole('button', { name: 'Water' }).click()
    await popover.getByRole('button', { name: 'Apply' }).click()

    await expect(page).toHaveURL(/kinds=water/)
    await expect(page.getByRole('button', { name: /Remove Water filter/i })).toBeVisible()
  })

  test('Clear all removes every active filter', async ({ page }) => {
    await registerAndOnboard(page)
    await page.goto('/journal?kinds=water,feed')

    await expect(page.getByRole('button', { name: /Remove Water filter/i })).toBeVisible()
    await page.getByRole('button', { name: /^Clear all$/ }).click()

    await expect(page).toHaveURL(/\/journal$/)
    await expect(page.getByRole('button', { name: /Remove Water filter/i })).not.toBeVisible()
  })

  test('filtered-empty state appears when filters exclude every entry', async ({ page }) => {
    await registerAndOnboard(page)
    await page.goto('/journal?kinds=photo')

    await expect(page.getByRole('heading', { level: 2, name: /Nothing matches these filters/i })).toBeVisible()
  })

  test('Photos tab switches to the grid and shows its own empty state', async ({ page }) => {
    await registerAndOnboard(page)
    await page.goto('/journal')

    await page.getByRole('tab', { name: 'Photos' }).click()

    await expect(page.getByRole('heading', { level: 2, name: /No photos yet/i })).toBeVisible()
    // Global (all-plants) Photos tab has no upload CTA — uploads happen per plant.
    await expect(page.getByRole('button', { name: /Add photo/i })).toHaveCount(0)
  })

  test('Calendar tab renders a month grid', async ({ page }) => {
    await registerAndOnboard(page)
    await page.goto('/journal')

    await page.getByRole('tab', { name: 'Calendar' }).click()

    await expect(page.getByRole('button', { name: 'Previous month' })).toBeVisible()
    await expect(page.getByRole('list', { name: /Events in/ })).toBeVisible()
  })

  test('paging to the next month updates the visible grid', async ({ page }) => {
    await registerAndOnboard(page)
    await page.goto('/journal')
    await page.getByRole('tab', { name: 'Calendar' }).click()

    const grid = page.getByRole('list', { name: /Events in/ })
    const before = await grid.getAttribute('aria-label')

    await page.getByRole('button', { name: 'Next month' }).click()

    await expect(grid).not.toHaveAttribute('aria-label', before ?? '')
    await page.getByRole('button', { name: 'Previous month' }).click()
    await expect(grid).toHaveAttribute('aria-label', before ?? '')
  })

  test('the Week toggle switches the calendar to the week agenda', async ({ page }) => {
    await registerAndOnboard(page)
    await page.goto('/journal')
    await page.getByRole('tab', { name: 'Calendar' }).click()

    // The segmented toggle's native radio is visually hidden; click its label.
    await page.getByText('Week', { exact: true }).click()

    // Nav re-labels to weeks, confirming the week view is active.
    await expect(page.getByRole('button', { name: 'Next week' })).toBeVisible()
  })
})
