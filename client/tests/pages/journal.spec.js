import { expect, test } from '@playwright/test'
import { completeOnboarding, registerUser } from '../helpers/onboarding'

async function registerAndOnboard(page) {
  await registerUser(page, 'Journal Tester')
  await completeOnboarding(page)
}

// The List / Week / Month toggle on the entries surface.
function selectView(page, name) {
  return page.getByRole('radiogroup', { name: 'Journal view' }).getByText(name, { exact: true }).click()
}

test.describe('Journal page', () => {
  test('shows two tabs — Journal entries and Photos — and no legacy Timeline/Calendar tabs', async ({ page }) => {
    await registerAndOnboard(page)
    await page.goto('/journal')

    await expect(page.getByRole('tab', { name: 'Journal entries' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Photos' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Timeline' })).toHaveCount(0)
    await expect(page.getByRole('tab', { name: 'Calendar' })).toHaveCount(0)
  })

  test('entries tab opens to the month grid by default', async ({ page }) => {
    await registerAndOnboard(page)
    await page.goto('/journal')

    await expect(page.getByRole('heading', { level: 1, name: 'Everything that has happened' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Previous month' })).toBeVisible()
    await expect(page.getByRole('list', { name: /Events in/ })).toBeVisible()
  })

  test('the List / Week / Month toggle swaps the entries view', async ({ page }) => {
    await registerAndOnboard(page)
    await page.goto('/journal')

    // Month is the default.
    await expect(page.getByRole('list', { name: /Events in/ })).toBeVisible()

    await selectView(page, 'List')
    await expect(page.getByRole('heading', { level: 2, name: /No events yet/i })).toBeVisible()

    await selectView(page, 'Week')
    await expect(page.getByRole('button', { name: 'Next week' })).toBeVisible()

    await selectView(page, 'Month')
    await expect(page.getByRole('list', { name: /Events in/ })).toBeVisible()
  })

  test('List view shows the empty state for a brand-new user', async ({ page }) => {
    await registerAndOnboard(page)
    await page.goto('/journal')
    await selectView(page, 'List')

    await expect(page.getByRole('heading', { level: 2, name: /No events yet/i })).toBeVisible()
  })

  test('filter popover opens with Plants, Event types and Date sections', async ({ page }) => {
    await registerAndOnboard(page)
    await page.goto('/journal')
    await selectView(page, 'List')

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
    await selectView(page, 'List')

    await page.getByRole('button', { name: /^Filters/ }).click()
    const popover = page.getByRole('dialog', { name: /Filter journal entries/i })
    await popover.getByRole('button', { name: 'Water' }).click()
    await popover.getByRole('button', { name: 'Apply' }).click()

    await expect(page).toHaveURL(/kinds=water/)
    await expect(page.getByRole('button', { name: /Remove Water filter/i })).toBeVisible()
  })

  test('active-filter chips show and clear in the calendar views too', async ({ page }) => {
    await registerAndOnboard(page)
    // Default (month) view — the editor is hidden, but the chips that scope
    // the data stay visible and clearable beside the period nav.
    await page.goto('/journal?kinds=water,feed')

    await expect(page.getByRole('button', { name: /Remove Water filter/i })).toBeVisible()
    await page.getByRole('button', { name: /^Clear all$/ }).click()

    await expect(page).toHaveURL(/\/journal$/)
    await expect(page.getByRole('button', { name: /Remove Water filter/i })).not.toBeVisible()
  })

  test('filtered-empty state appears when filters exclude every entry', async ({ page }) => {
    await registerAndOnboard(page)
    await page.goto('/journal?kinds=photo')
    await selectView(page, 'List')

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

  test('paging to the next month updates the visible grid', async ({ page }) => {
    await registerAndOnboard(page)
    await page.goto('/journal')

    const grid = page.getByRole('list', { name: /Events in/ })
    const before = await grid.getAttribute('aria-label')

    await page.getByRole('button', { name: 'Next month' }).click()

    await expect(grid).not.toHaveAttribute('aria-label', before ?? '')
    await page.getByRole('button', { name: 'Previous month' }).click()
    await expect(grid).toHaveAttribute('aria-label', before ?? '')
  })

  test('arrow keys move focus between day cells in the month grid', async ({ page }) => {
    await registerAndOnboard(page)
    await page.goto('/journal')

    const days = page.getByRole('list', { name: /Events in/ }).getByRole('button')
    const firstDay = days.first()
    const secondDay = days.nth(1)

    await firstDay.focus()
    await expect(firstDay).toBeFocused()

    await page.keyboard.press('ArrowRight')
    await expect(secondDay).toBeFocused()

    await page.keyboard.press('ArrowLeft')
    await expect(firstDay).toBeFocused()
  })

  test('Enter on a focused day cell opens the day popover', async ({ page }) => {
    await registerAndOnboard(page)
    await page.goto('/journal')

    await page
      .getByRole('list', { name: /Events in/ })
      .getByRole('button')
      .first()
      .focus()
    await page.keyboard.press('Enter')

    await expect(page.getByRole('dialog')).toBeVisible()
  })
})
