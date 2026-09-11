import { expect, test } from '@playwright/test'
import { registerUser } from '../helpers/onboarding'

test.describe('Error states', () => {
  test('visiting a non-existent route renders the 404 ErrorState with layout chrome intact', async ({ page }) => {
    await registerUser(page, 'Robin')
    // After register, user is on /welcome. Hit a route that doesn't
    // exist and isn't a wizard step — the catch-all route should pick
    // it up.
    await page.goto('/totally-fake-route')

    await expect(page.getByRole('heading', { level: 1, name: /isn't in your greenhouse/i })).toBeVisible()
    await expect(page.getByText(/no soil lost/i)).toBeVisible()
    // Recovery action — keyboard focus lands here, click navigates home.
    const backToToday = page.getByRole('link', { name: /Back to Today/i }).first()
    await expect(backToToday).toBeVisible()
  })

  // Plant 404 path is covered by tests/pages/plant.spec.js — needs the
  // user to be onboarded for ProtectedRoute to let them through to the
  // /plants/* tree. The catch-all route test above runs pre-onboarding,
  // so it lives here.

  test('clicking Back to Today on a 404 lands on the home route', async ({ page }) => {
    await registerUser(page, 'Robin')
    await page.goto('/totally-fake-route')

    await page
      .getByRole('link', { name: /Back to Today/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/(welcome\/?|$)/)
  })
})
