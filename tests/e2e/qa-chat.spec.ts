import { test, expect } from './fixtures/test'
import { urlOf } from "@/tests/support/appRoutes"
import { ROUTES } from "@/src/shared/routes"
import { SELECTORS } from './helpers/selectors'
import { grantPurchase } from './helpers/purchase'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000

/**
 * Asking the coach a question, with the model's answer stubbed.
 *
 * One test. There were six, and every one began with
 * `test.skip(!page.url().includes('/dashboard/qa'))` — so the day the test
 * account lost access to Q&A, the whole file would have reported green having
 * checked nothing. A redirect away from the page now fails the test instead.
 *
 * Ask Coach is the subscriber's: `/dashboard/qa` sends anyone without
 * `profiles.has_purchased` back to the dashboard, and no route in the app sets
 * that flag (there is no purchase flow yet). So the worker's fresh account is
 * marked paid on the test backend, as the database owner, before the page is
 * opened — a system-only row, not something a person could do.
 *
 * The answer is stubbed because what this checks is the page — question in,
 * answer and sources out — not the model, which is slow, costs money, and says
 * something different every time.
 */
const ANSWER = {
  answer: 'Open with what you noticed about her, then ask one question.',
  confidence: { score: 0.8, factors: { retrievalStrength: 0.8, sourceConsistency: 0.8, policyCompliance: 1 } },
  sources: [
    {
      chunkId: 'e2e-chunk-1',
      text: 'Say what made you stop, then ask something only she can answer.',
      metadata: { coach: 'E2E Coach', topic: 'openers', source: 'e2e-fixture' },
      relevanceScore: 0.9,
    },
  ],
  metaCognition: { reasoning: 'stubbed', limitations: 'stubbed', suggestedFollowUps: [] },
  meta: { provider: 'e2e', model: 'stub', latencyMs: 1, tokensUsed: 1 },
}

test.describe('Q&A Chat Flow', () => {
  // No serial mode: it existed for the shared account. The stub below is this
  // page's own and is removed after each test.
  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' })
  })

  test('a question gets an answer, with the sources it came from', async ({ page, account }) => {
    await grantPurchase(account.id)
    await page.goto(ROUTES.coach, { timeout: AUTH_TIMEOUT })
    // A paid account can open Q&A; a redirect away is a failure, not a skip
    await expect(page).toHaveURL(urlOf(ROUTES.coach))

    await page.route('**/api/qa', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ANSWER) }),
    )

    const input = page.getByTestId(SELECTORS.qa.input)
    const submit = page.getByTestId(SELECTORS.qa.submit)
    await expect(submit).toBeDisabled({ timeout: AUTH_TIMEOUT })
    await page.getByTestId(SELECTORS.qa.sample(0)).click({ timeout: ACTION_TIMEOUT })
    await expect(input).not.toHaveValue('')

    await submit.click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByText(ANSWER.answer)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.qa.sources)).toBeVisible()
  })
})
