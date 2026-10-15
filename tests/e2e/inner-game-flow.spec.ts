import { test, expect } from './fixtures/test'
import { ROUTES } from "@/src/shared/routes"
import { SELECTORS } from './helpers/selectors'
import { grantPurchase } from './helpers/purchase'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000

test.describe('Inner Game Flow', () => {
  test.beforeEach(async ({ page, account }) => {
    /**
     * PAID FIRST. Inner Game is the subscriber's: an account without
     * `has_purchased` is shown a locked preview with no start button. The old
     * shared account had been marked paid by hand; nothing in the app can mark
     * a fresh one (no purchase flow yet), so it is set on the test backend.
     */
    await grantPurchase(account.id)

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
    // Read first, as the page does: the progress row is made on the first
    // read, and a write to an account that has none is refused with a 500
    // (`updateProgress` in src/db/innerGameProgressRepo.ts updates zero rows
    // and calls `.single()`) — reported, not this test's subject.
    const read = await page.request.get('/api/inner-game/progress')
    expect(read.status(), `could not read inner game progress: ${await read.text()}`).toBe(200)
    const reset = await page.request.post('/api/inner-game/progress', { data: { welcomeDismissed: false } })
    expect(reset.status(), `could not reset the welcome card: ${await reset.text()}`).toBe(200)
    await page.goto(ROUTES.innerGame, { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })
  })

  test('the welcome card leads into inner game, which has a way back out', async ({ page }) => {
    /**
     * One test. Three of the five only asserted the card rendered, one accepted
     * a start button OR a signup link, and the two that walked the flow skipped
     * themselves when the start button was missing — so a signed-in account
     * shown the preview would have passed. Signed in and paid, the start
     * button is the only right answer.
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
    await expect(wayOut).toHaveAttribute('href', ROUTES.dashboard)
  })
})
