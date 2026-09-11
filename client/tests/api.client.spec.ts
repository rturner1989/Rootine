import { expect, test } from '@playwright/test'

test('api client module loads on the page', async ({ page }) => {
  await page.goto('/')
  // Verify the app loads without import errors from the api client
  await expect(page.locator('#root')).toBeVisible()
})
