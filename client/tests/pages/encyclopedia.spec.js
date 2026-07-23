import { expect, test } from '@playwright/test'
import { completeOnboarding, registerUser } from '../helpers/onboarding'

async function registerAndOnboard(page) {
  await registerUser(page, 'Encyclopedia Tester')
  await completeOnboarding(page, { spaces: ['Living Room'] })
}

test.describe('Encyclopedia', () => {
  test('browse grid renders and a species opens its detail page', async ({ page }) => {
    await registerAndOnboard(page)
    await page.goto('/encyclopedia')

    await expect(page.getByRole('heading', { level: 1, name: /Browse every/i })).toBeVisible()

    // The catalogue is globally seeded, so the grid always has cards. Open
    // the first species card (targeted by its detail href, not any link).
    await page.locator('a[href*="/encyclopedia/species/"]').first().click()

    await expect(page).toHaveURL(/\/encyclopedia\/species\/\d+/)
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible()
  })

  test('the Filters pill narrows the grid', async ({ page }) => {
    await registerAndOnboard(page)
    await page.goto('/encyclopedia')

    await page.getByRole('button', { name: 'Filters' }).click()
    await page.getByRole('switch', { name: /Pet-safe only/i }).click()
    await page.getByRole('button', { name: 'Apply' }).click()

    await expect(page).toHaveURL(/pet_safe=true/)
  })
})
