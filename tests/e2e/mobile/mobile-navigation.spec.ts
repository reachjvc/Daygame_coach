import { test, expect } from '../fixtures/test'
import { SELECTORS } from '../helpers/selectors'

const AUTH_TIMEOUT = 15000

/**
 * The header's menu on a phone: it opens, it holds the way to Settings and the
 * way out, and a tap on an item goes there and closes it. One test; it was
 * three, each opening the same menu to check one more of these.
 */
test('the phone menu opens, and an item in it navigates and closes it', async ({ page }) => {
  await page.goto('/dashboard', { timeout: AUTH_TIMEOUT })

  // the desktop links give way to the menu at this width
  await expect(page.getByTestId(SELECTORS.header.settingsLink)).toBeHidden()
  await page.getByRole('button', { name: 'Open menu' }).click()

  const menu = page.getByRole('dialog')
  await expect(menu).toBeVisible({ timeout: AUTH_TIMEOUT })
  await expect(menu.getByText('Log Out')).toBeVisible()

  await menu.getByTestId(SELECTORS.header.settingsLink).click()
  await expect(menu).toBeHidden({ timeout: AUTH_TIMEOUT })
  await expect(page).toHaveURL(/\/dashboard\/settings/, { timeout: AUTH_TIMEOUT })
})
