import { expect, test } from '@playwright/test'
import { completeOnboarding, registerUser } from '../helpers/onboarding'

async function registerAndOnboard(page, { spaces = ['Living Room', 'Kitchen'] } = {}) {
  await registerUser(page, 'House Tester')
  await completeOnboarding(page, { spaces })
}

test.describe('House screen', () => {
  test('renders the v2 header and the seeded rooms grid', async ({ page }) => {
    await registerAndOnboard(page)
    await page.goto('/house')

    await expect(page.getByRole('heading', { level: 1, name: /Browse your plants/i })).toBeVisible()

    const viewGroup = page.getByRole('radiogroup', { name: 'View as' })
    const roomsRadio = viewGroup.getByRole('radio', { name: /Rooms/ })
    const habitatRadio = viewGroup.getByRole('radio', { name: /Habitat/ })

    await expect(roomsRadio).toBeChecked()
    await expect(habitatRadio).toBeDisabled()

    await expect(page.getByText('Living Room', { exact: true })).toBeVisible()
    await expect(page.getByText('Kitchen', { exact: true })).toBeVisible()
  })

  test('Add-a-space tile opens the wizard and creating shows the new room card', async ({ page }) => {
    await registerAndOnboard(page)
    await page.goto('/house')

    await page
      .getByRole('button', { name: /Add a space/i })
      .first()
      .click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    // Step 1 — identity.
    await dialog.getByLabel('Name').fill('Sunroom')
    await dialog.getByRole('button', { name: /Continue/ }).click()
    // Step 2 — environment → create.
    await dialog.getByRole('button', { name: 'Add space' }).click()
    // Completion screen → close via Done.
    await expect(dialog.getByText(/Sunroom added/)).toBeVisible()
    await dialog.getByRole('button', { name: 'Done' }).click()

    await expect(page.getByText('Sunroom', { exact: true })).toBeVisible()
  })

  test('view toggle switches to list view and shows search + accordion summaries', async ({ page }) => {
    await registerAndOnboard(page)
    await page.goto('/house')

    const viewGroup = page.getByRole('radiogroup', { name: 'View as' })
    await viewGroup.getByText('List', { exact: true }).click()

    await expect(page).toHaveURL(/[?&]view=list/)
    await expect(page.getByPlaceholder(/Search spaces/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Living Room.*plants?/i })).toBeVisible()
  })

  test('unauthenticated visit redirects to login', async ({ page }) => {
    await page.goto('/house')
    await expect(page).toHaveURL(/\/login$/)
  })
})
