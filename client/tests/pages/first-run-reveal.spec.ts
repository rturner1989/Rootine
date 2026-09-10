import { expect, test } from '@playwright/test'
import { completeOnboarding, registerUser } from '../helpers/onboarding'

const STORAGE_KEY = 'plantcare_tour_pending'

test.describe('First-run wizard → Today reveal', () => {
  test('reveal fires exactly once per signup: welcome toast + cleared flag', async ({ page }) => {
    const { email, password } = await registerUser(page, 'Reveal User')
    await completeOnboarding(page)

    await expect(page.getByText(/Welcome, Reveal/i)).toBeVisible()
    const flag = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)
    expect(flag).toBeNull()

    await page.reload()
    await expect(page).toHaveURL('/')
    await expect(page.getByText(/Welcome, Reveal/i)).toHaveCount(0)

    await page
      .getByRole('navigation', { name: 'Primary' })
      .getByRole('link', { name: /Encyclopedia/i })
      .click()
    await expect(page).toHaveURL(/\/encyclopedia$/)
    await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: /Today/i }).click()
    await expect(page).toHaveURL('/')
    await expect(page.getByText(/Welcome, Reveal/i)).toHaveCount(0)

    await page.goto('/')
    await page.getByRole('button', { name: /Log out/i }).click()
    await page.waitForURL('/login')
    await page.getByLabel('Email').fill(email)
    await page.getByRole('textbox', { name: 'Password', exact: true }).fill(password)
    await page.getByRole('button', { name: /Log in/i }).click()
    await page.waitForURL('/')
    await expect(page.getByText(/Welcome, Reveal/i)).toHaveCount(0)
  })
})
