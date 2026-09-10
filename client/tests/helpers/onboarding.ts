import { expect, type Page } from '@playwright/test'

// Shared Playwright helpers for the v2 onboarding wizard. Three specs
// (today, house, first-run-reveal) all need to register a fresh user
// and walk them to the dashboard, so the wizard click sequence lives
// in one place — when the wizard changes again, only this file needs
// touching.

export async function registerUser(page: Page, name = 'Test User'): Promise<{ email: string; password: string }> {
  const email = `test-${crypto.randomUUID()}@example.com`
  const password = 'greenthumb99'
  await page.goto('/register')
  await page.getByLabel('Name').fill(name)
  await page.getByLabel('Email').fill(email)
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill(password)
  await page.getByLabel('Confirm password').fill(password)
  await page.getByRole('button', { name: /Create account/i }).click()
  await expect(page).toHaveURL('/welcome')
  return { email, password }
}

// Walks Step 0 → Step 7 in the shortest path that still produces a
// valid onboarded user. Default: pick "Forgetful" intent + a single
// preset space, no plants. Override `spaces` / `intent` for more
// realistic flows.
//
// Each step waits for its own h1 heading to be visible BEFORE clicking
// Continue. Without that, framer-motion's mode="wait" exit phase keeps
// the previous step's Continue button briefly in the DOM, so a bare
// `getByRole('button', { name: /^Continue/i })` matches the wrong one
// and the click silently does nothing on the right form.
export async function completeOnboarding(
  page: Page,
  { spaces = ['Living Room'], intent = /Forgetful/i }: { spaces?: string[]; intent?: string | RegExp } = {},
): Promise<void> {
  // Step 0 Welcome — editorial splash with single CTA.
  await page.getByRole('button', { name: /Let's meet them/i }).click()
  await expect(page).toHaveURL(/\/welcome\/intent$/)

  // Step 1 Intent — the radio is sr-only inside a label, so .check()
  // lands on an offscreen <input>. Click the label's visible text
  // instead. Same trick as house.spec.js's List/Spaces toggle.
  await expect(page.getByRole('heading', { level: 1, name: /What brings you here/i })).toBeVisible()
  await page.getByRole('radiogroup', { name: 'Onboarding intent' }).getByText(intent).click()
  await page.getByRole('button', { name: /^Continue/i }).click()
  await expect(page).toHaveURL(/\/welcome\/spaces$/)

  // Step 2 Spaces — Tile chips have role=checkbox.
  await expect(page.getByRole('heading', { level: 1, name: /Where do your plants live/i })).toBeVisible()
  for (const space of spaces) {
    await page.getByRole('checkbox', { name: new RegExp(space, 'i') }).click()
  }
  await page.getByRole('button', { name: /^Continue/i }).click()
  await expect(page).toHaveURL(/\/welcome\/species$/)

  // Step 3 Plants — Continue with zero plants is allowed (label is
  // bare "Continue" without an arrow on the empty path).
  await expect(page.getByRole('heading', { level: 1, name: /Meet your plants/i })).toBeVisible()
  await page.getByRole('button', { name: /^Continue$/ }).click()
  await expect(page).toHaveURL(/\/welcome\/environment$/)

  // Step 4 Environment — accept space defaults.
  await expect(page.getByRole('heading', { level: 1, name: /How do your spaces feel/i })).toBeVisible()
  await page.getByRole('button', { name: /^Continue/i }).click()
  await expect(page).toHaveURL(/\/welcome\/stakes$/)

  // Step 5 Stakes — read-only preview, single Continue.
  await expect(page.getByRole('heading', { level: 1, name: /This is your streak/i })).toBeVisible()
  await page.getByRole('button', { name: /^Continue/i }).click()
  await expect(page).toHaveURL(/\/welcome\/journal$/)

  // Step 6 Journal — same.
  await expect(page.getByRole('heading', { level: 1, name: /Meet the journal/i })).toBeVisible()
  await page.getByRole('button', { name: /^Continue/i }).click()
  await expect(page).toHaveURL(/\/welcome\/done$/)

  // Step 7 Done — CTA label varies per intent; default forgetful CTA
  // is "Enter your greenhouse →".
  await page.getByRole('button', { name: /Enter your greenhouse/i }).click()
  await expect(page).toHaveURL('/')
}
