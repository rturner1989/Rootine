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

    await expect(page.getByRole('heading', { level: 1 })).toContainText('diary')
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
})
