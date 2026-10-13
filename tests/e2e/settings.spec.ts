import { test, expect } from './fixtures/test'
import { SELECTORS } from './helpers/selectors'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000 // Increased for external service latency

test.describe('Settings Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Arrange: Navigate to settings
    await page.goto('/dashboard/settings', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })
  })

  test('the profile tab shows the account that is signed in', async ({ page, account }) => {
    await expect(page.getByText('Account Information')).toBeVisible({ timeout: AUTH_TIMEOUT })
    // The worker's own throwaway address, so a failure may print it.
    await expect(page.getByTestId(SELECTORS.settings.userEmail)).toHaveText(account.email)
  })

  test('a sandbox switch keeps its new position after a reload', async ({ page }) => {
    /**
     * The old toggle test clicked the switch and waited for "domcontentloaded"
     * — a page that had already loaded — so a save that never happened passed.
     * This flips it, waits for the server action, reloads, and reads it back,
     * then puts it back the way it was.
     */
    const openSandbox = async () => {
      await page.getByTestId(SELECTORS.settings.sandboxTab).click({ timeout: ACTION_TIMEOUT })
      await expect(page.getByText('Scenario Sandbox')).toBeVisible({ timeout: AUTH_TIMEOUT })
    }
    const toggle = page.getByTestId(SELECTORS.settings.sandboxToggle('enableBadWeather'))
    const flip = async () => {
      const saved = page.waitForResponse(
        (r) => r.request().method() === 'POST' && r.request().headers()['next-action'] !== undefined,
      )
      await toggle.click({ timeout: ACTION_TIMEOUT })
      expect((await saved).ok(), 'the server action refused the change').toBe(true)
    }

    await openSandbox()
    const before = await toggle.getAttribute('aria-checked')
    const after = before === 'true' ? 'false' : 'true'
    await flip()
    try {
      await page.reload({ timeout: AUTH_TIMEOUT })
      await openSandbox()
      await expect(toggle).toHaveAttribute('aria-checked', after)
    } finally {
      if ((await toggle.getAttribute('aria-checked')) === after) await flip()
    }
  })
})
