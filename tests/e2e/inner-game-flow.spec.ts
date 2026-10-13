import { test, expect } from '@playwright/test'
import { SELECTORS } from './helpers/selectors'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000

test.describe('Inner Game Flow', () => {
  test.beforeEach(async ({ page }) => {
    /**
     * THIS SPEC USED TO POISON ITSELF.
     *
     * Four of its five tests assert that the welcome card is on the page, and
     * the fifth dismisses it — which writes `welcomeDismissed` to the shared
     * test account. So the first run passed and every run after it failed four
     * tests, and running the file alone passed while running it in the suite
     * did not. The state is reset here rather than assumed, which is the only
     * thing that makes a test about a first-time screen repeatable.
     */
    await page.goto('/dashboard/inner-game', { timeout: AUTH_TIMEOUT })
    await page.evaluate(async () => {
      await fetch('/api/inner-game/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ welcomeDismissed: false }),
      })
    })
    await page.reload({ timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })
  })

  test('the welcome card leads into inner game, which has a way back out', async ({ page }) => {
    /**
     * One test. Three of the five only asserted the card rendered, one accepted
     * a start button OR a signup link, and the two that walked the flow skipped
     * themselves when the start button was missing — so a signed-in account
     * shown the preview would have passed. Signed in, the start button is the
     * only right answer.
     */
    const welcomeCard = page.getByTestId(SELECTORS.innerGame.welcomeCard)
    await expect(welcomeCard).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(welcomeCard.getByText('Your Progress', { exact: true })).toBeVisible()

    await page.getByTestId(SELECTORS.innerGame.welcomeStartButton).click({ timeout: ACTION_TIMEOUT })
    await expect(welcomeCard).toBeHidden({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.innerGame.page)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // The control is called "Exit"; what matters is that it goes to the dashboard
    const wayOut = page.getByRole('link', { name: /exit|back/i })
    await expect(wayOut).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(wayOut).toHaveAttribute('href', '/dashboard')
  })
})
