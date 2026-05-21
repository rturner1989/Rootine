import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { completeOnboarding, registerUser } from '../helpers/onboarding'

const FIXTURE_IMAGE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../api/test/fixtures/files/test_plant.jpg',
)

// Register → onboard → add a plant via Today's empty-state CTA. Returns
// the plant nickname for downstream assertions. Same path as today.spec
// covers, lifted into a helper because Plant Detail tests need a real
// plant in the DB and the Add Plant flow is the only wired path today.
async function registerAndAddPlant(page, { nickname = 'Hisser' } = {}) {
  await registerUser(page, 'Plant Tester')
  await completeOnboarding(page)
  await page.getByRole('button', { name: /Add a plant/ }).click()
  await expect(page.getByRole('dialog', { name: /Add a plant/ })).toBeVisible()
  await page
    .getByRole('button', { name: /Snake Plant/i })
    .first()
    .click()
  const nicknameInput = page.getByLabel('Nickname')
  await expect(nicknameInput).toBeVisible()
  await nicknameInput.fill(nickname)
  await page
    .getByRole('button', { name: /^Add plant$/i })
    .last()
    .click()
  await expect(page).toHaveURL(/\/plants\/\d+$/)
  return nickname
}

test.describe('Plant Detail', () => {
  test('renders hero, breadcrumb, and switches segments', async ({ page }) => {
    const nickname = await registerAndAddPlant(page)

    // Hero h1 carries the nickname.
    await expect(page.getByRole('heading', { level: 1, name: nickname })).toBeVisible()

    // Breadcrumb landmark + current page entry.
    const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' })
    await expect(breadcrumb).toBeVisible()
    await expect(breadcrumb.getByRole('link', { name: 'House' })).toBeVisible()

    // Care segment is the default and shows the four rings region.
    const careRegion = page.getByRole('region', { name: 'Care state' })
    await expect(careRegion).toBeVisible()

    // Switching to Species swaps the panel content.
    const viewGroup = page.getByRole('radiogroup', { name: 'Plant view' })
    await viewGroup.getByText('Species', { exact: true }).click()
    await expect(page.getByRole('heading', { name: /Snake Plant/i }).first()).toBeVisible()

    // Care state row stays mounted regardless of segment (always visible).
    await expect(careRegion).toBeVisible()
  })

  test('overflow menu opens Edit / Log care / Delete dialogs and Doctor placeholder', async ({ page }) => {
    await registerAndAddPlant(page)

    async function openMenu() {
      await page
        .getByRole('button', { name: /Plant actions/ })
        .first()
        .click()
    }

    // Edit plant → opens EditPlantDialog
    await openMenu()
    await page.getByRole('menuitem', { name: /Edit plant/ }).click()
    await expect(page.getByRole('dialog', { name: /Edit plant/ })).toBeVisible()
    await page.getByRole('button', { name: /Cancel/ }).click()

    // Log care → opens LogCareDialog
    await openMenu()
    await page.getByRole('menuitem', { name: /Log care/ }).click()
    await expect(page.getByRole('dialog', { name: /Log care/ })).toBeVisible()
    await page.getByRole('button', { name: /Cancel/ }).click()

    // Delete plant → opens DeletePlantDialog
    await openMenu()
    await page.getByRole('menuitem', { name: /Delete plant/ }).click()
    await expect(page.getByRole('dialog', { name: /Delete plant/ })).toBeVisible()
    await page.getByRole('button', { name: /Cancel/ }).click()

    // Plant Doctor → still placeholder for R13
    await openMenu()
    await page.getByRole('menuitem', { name: /Plant Doctor/ }).click()
    await expect(page.getByText('Plant Doctor coming soon')).toBeVisible()
  })

  test('non-existent plant id renders the 404 ErrorState', async ({ page }) => {
    await registerUser(page, 'Empty State Tester')
    await completeOnboarding(page)
    await page.goto('/plants/999999')
    await expect(page.getByRole('heading', { name: /isn't in your greenhouse/i })).toBeVisible()
  })

  test('Journal segment: scoped tabs, no plant filter, photo upload → lightbox → delete', async ({ page }) => {
    await registerAndAddPlant(page)

    await page.getByRole('radiogroup', { name: 'Plant view' }).getByText('Journal', { exact: true }).click()

    // Shared journal renders as a two-tab folder, scoped to this plant.
    await expect(page.getByRole('tab', { name: 'Journal entries' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Photos' })).toBeVisible()

    // Entries opens to the month view; the filter editor lives on List.
    await page.getByRole('radiogroup', { name: 'Journal view' }).getByText('List', { exact: true }).click()

    // Scoped → the filter popover omits the Plants section.
    await page.getByRole('button', { name: /^Filters/ }).click()
    const popover = page.getByRole('dialog', { name: /Filter journal entries/i })
    await expect(popover.getByRole('heading', { name: 'Event types' })).toBeVisible()
    await expect(popover.getByRole('heading', { name: 'Plants' })).toHaveCount(0)
    await page.keyboard.press('Escape')

    // Photos tab — empty, then upload via the scoped CTA (native picker).
    await page.getByRole('tab', { name: 'Photos' }).click()
    await expect(page.getByRole('heading', { level: 2, name: /No photos yet/i })).toBeVisible()

    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: 'Add photo' }).click(),
    ])
    // Arm the image-response wait before the upload so we catch the grid
    // tile's ActiveStorage request whenever it fires. A 200 here guards
    // the whole serving path: the /rails Vite proxy, the proxy-mode
    // image_url, and that create didn't 500.
    const imageResponse = page.waitForResponse(
      (response) => response.url().includes('/rails/active_storage') && response.request().resourceType() === 'image',
      { timeout: 15_000 },
    )
    await chooser.setFiles(FIXTURE_IMAGE)

    // Uploaded photo appears in the grid without a manual refresh.
    const tile = page.getByRole('button', { name: /^View / })
    await expect(tile.first()).toBeVisible()
    expect((await imageResponse).status()).toBe(200)

    // Open the lightbox, then delete with confirm.
    await tile.first().click()
    const lightbox = page.getByRole('dialog', { name: /Hisser/i })
    await expect(lightbox).toBeVisible()
    await lightbox.getByRole('button', { name: 'Delete photo' }).click()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()

    // Back to the empty state — gone from the grid.
    await expect(page.getByRole('heading', { level: 2, name: /No photos yet/i })).toBeVisible()
  })
})
