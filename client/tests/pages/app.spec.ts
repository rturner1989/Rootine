import { expect, test } from '@playwright/test'

test('app loads and shows login or content', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#root')).toBeVisible()
})

test('404 page shows for unknown routes', async ({ page }) => {
  await page.goto('/something')
  await expect(page.locator('text=404')).toBeVisible()
})
