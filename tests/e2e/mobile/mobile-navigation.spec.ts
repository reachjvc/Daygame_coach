import { test, expect } from '../fixtures/test'
import { SELECTORS } from '../helpers/selectors'
import { ROUTES } from '@/src/shared/routes'

const AUTH_TIMEOUT = 15000

/**
 * The phone's way to everything the bar has no room for: the More sheet. It
 * opens, it holds Settings and the way out, and a tap on an item goes there
 * and closes it.
 *
 * This used to drive the header's ☰ menu. Inside the app there is no phone
 * header any more (Plans/site-structure.md, D9): it duplicated the More sheet,
 * which already had Log Out, and the two could disagree.
 */
test('the More sheet opens, and an item in it navigates and closes it', async ({ page }) => {
  await page.goto(ROUTES.dashboard, { timeout: AUTH_TIMEOUT })

  // the laptop header's links are not on a phone; the bar is
  await expect(page.getByTestId(SELECTORS.header.settingsLink)).toBeHidden()
  await page.getByTestId('tab-more').click()

  const sheet = page.getByTestId('more-sheet')
  await expect(sheet).toBeVisible({ timeout: AUTH_TIMEOUT })
  await expect(sheet.getByText('Log Out')).toBeVisible()

  await sheet.getByRole('link', { name: 'Settings' }).click()
  await expect(sheet).toBeHidden({ timeout: AUTH_TIMEOUT })
  await expect(page).toHaveURL(new RegExp(`${ROUTES.settings}$`), { timeout: AUTH_TIMEOUT })
})
