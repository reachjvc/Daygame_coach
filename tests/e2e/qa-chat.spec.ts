import { test, expect } from '@playwright/test'
import { SELECTORS } from './helpers/selectors'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000

/**
 * Asking the coach a question, with the model's answer stubbed.
 *
 * One test. There were six, and every one began with
 * `test.skip(!page.url().includes('/dashboard/qa'))` — so the day the test
 * account lost access to Q&A, the whole file would have reported green having
 * checked nothing. The account can open the page (verified 2026-10-13), so a
 * redirect away from it now fails the test instead.
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
  test.describe.configure({ mode: 'serial' })

  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' })
  })

  test('a question gets an answer, with the sources it came from', async ({ page }) => {
    await page.goto('/dashboard/qa', { timeout: AUTH_TIMEOUT })
    // The test account can open Q&A; a redirect away is a failure, not a skip
    await expect(page).toHaveURL(/\/dashboard\/qa/)

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
