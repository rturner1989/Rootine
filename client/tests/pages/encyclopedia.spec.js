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

    await expect(page.getByRole('heading', { level: 1, name: /Popular species/i })).toBeVisible()

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

  test('the sidebar search swaps the grid for species results', async ({ page }) => {
    await registerAndOnboard(page)
    await page.goto('/encyclopedia')

    // The sidebar search is enabled on this page (scope registered) — its
    // placeholder proves it, and typing swaps the browse grid for results.
    const search = page.getByPlaceholder(/Search all species/i)
    await search.fill('monstera')

    // Results appear (local + Perenual merged — "monstera" returns the local
    // Monstera plus Perenual variants) and the browse filter is hidden by the
    // search swap.
    await expect(page.getByText('Monstera Deliciosa').first()).toBeVisible()
    await expect(page.locator('a[href*="/encyclopedia/species/"]').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Filters' })).toHaveCount(0)
  })

  test("the By space toggle groups species by the user's spaces", async ({ page }) => {
    await registerAndOnboard(page)
    await page.goto('/encyclopedia')

    await page.getByRole('radiogroup', { name: 'View' }).getByText('By space', { exact: true }).click()

    await expect(page).toHaveURL(/view=spaces/)
    // Onboarding creates at least one space, so at least one group heading shows.
    await expect(page.getByRole('heading', { name: /Great for your/i }).first()).toBeVisible()
  })
})
