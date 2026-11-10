import { test, expect } from '../fixtures/test'
import { SELECTORS } from '../helpers/selectors'
import { ROUTES } from '@/src/shared/routes'

const AUTH_TIMEOUT = 15000

/**
 * The phone's way to Settings and out: the You tab.
 *
 * It was the More sheet until 2026-11-10, which held Settings and Log Out
 * beside the tools. The tools went to Home's tiles and All tools, and Settings
 * and Log Out to You (Plans/site-navigation-build.md, Phase 2). Log Out is
 * seen, never clicked: signing out ends every session of the account.
 */
test('the You tab opens Settings, with the way out on it', async ({ page }) => {
  await page.goto(ROUTES.dashboard, { timeout: AUTH_TIMEOUT })

  // the laptop header's links are not on a phone; the bar is
  await expect(page.getByTestId(SELECTORS.header.settingsLink)).toBeHidden()
  await page.getByTestId('tab-you').click()

  await expect(page).toHaveURL(new RegExp(`${ROUTES.settings}$`), { timeout: AUTH_TIMEOUT })
  await expect(page.getByRole('heading', { name: 'You', level: 1 })).toBeVisible({ timeout: AUTH_TIMEOUT })
  await expect(page.getByTestId('you-logout-button')).toBeVisible()
  await expect(page.getByTestId('tab-you')).toHaveAttribute('aria-current', 'page')
})
