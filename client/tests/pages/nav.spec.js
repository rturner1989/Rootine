import { expect, test } from '@playwright/test'
import { completeOnboarding, registerUser } from '../helpers/onboarding'

test.describe('Primary navigation — sidebar (≥1200px)', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('user can navigate to every region from the Full sidebar', async ({ page }) => {
    await registerUser(page, 'Robin')
    await completeOnboarding(page)

    const fullSidebar = page.getByRole('navigation', { name: 'Primary' }).first()

    await fullSidebar.getByRole('link', { name: 'House' }).click()
    await expect(page).toHaveURL(/\/house$/)

    await fullSidebar.getByRole('link', { name: 'Journal' }).click()
    await expect(page).toHaveURL(/\/journal$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Everything that has happened' })).toBeVisible()

    await fullSidebar.getByRole('link', { name: 'Encyclopedia' }).click()
    await expect(page).toHaveURL(/\/encyclopedia$/)
    await expect(page.getByRole('heading', { level: 1, name: /Browse every/i })).toBeVisible()

    await fullSidebar.getByRole('link', { name: 'Me' }).click()
    await expect(page).toHaveURL(/\/me$/)

    await fullSidebar.getByRole('link', { name: 'Today' }).click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('bell button is enabled (R8 wired the drawer)', async ({ page }) => {
    await registerUser(page, 'Robin')
    await completeOnboarding(page)

    const bell = page.getByRole('button', { name: /^Notifications/ }).first()
    await expect(bell).toBeEnabled()
  })

  test('sidebar search input is disabled on pages that have not registered a search scope', async ({ page }) => {
    await registerUser(page, 'Robin')
    await completeOnboarding(page)

    const search = page.getByPlaceholder(/Search.*coming soon/i).first()
    await expect(search).toBeDisabled()
  })

  test('the v1 /discover route is gone — visiting it shows the 404 page', async ({ page }) => {
    await registerUser(page, 'Robin')
    await completeOnboarding(page)

    await page.goto('/discover')
    await expect(page.locator('text=404')).toBeVisible()
  })
})

test.describe('Primary navigation — mobile dock (<480px)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('dock navigates between Today, House, Journal, and Me', async ({ page }) => {
    await registerUser(page, 'Robin')
    await completeOnboarding(page)

    const dock = page.getByRole('navigation', { name: 'Bottom navigation' })

    await dock.getByRole('link', { name: 'House' }).click()
    await expect(page).toHaveURL(/\/house$/)

    await dock.getByRole('link', { name: 'Journal' }).click()
    await expect(page).toHaveURL(/\/journal$/)

    await dock.getByRole('link', { name: 'Me' }).click()
    await expect(page).toHaveURL(/\/me$/)

    await dock.getByRole('link', { name: 'Today' }).click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('Encyclopedia is not in the dock (sidebar-only on web)', async ({ page }) => {
    await registerUser(page, 'Robin')
    await completeOnboarding(page)

    const dock = page.getByRole('navigation', { name: 'Bottom navigation' })
    await expect(dock.getByText('Encyclopedia')).toHaveCount(0)
  })

  test('dock no longer renders an Add plant FAB — Add Plant is contextual (Today empty state, plants row, House per-space CTA)', async ({
    page,
  }) => {
    await registerUser(page, 'Robin')
    await completeOnboarding(page)

    const dock = page.getByRole('navigation', { name: 'Bottom navigation' })
    await expect(dock.getByRole('link', { name: 'Add plant' })).toHaveCount(0)
    await expect(dock.getByRole('button', { name: 'Add plant' })).toHaveCount(0)
  })
})
