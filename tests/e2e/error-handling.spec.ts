import { test, expect } from '@playwright/test'
import { ensureCleanSessionPage, ensureNoActiveSessionViaAPI } from './helpers/auth.helper'
import { SELECTORS } from './helpers/selectors'

/**
 * Error-Path E2E Tests: API Error Handling
 *
 * Tests how the app handles API failures gracefully.
 * Uses Playwright route interception to simulate network/API failures.
 *
 * Note: This tests the ACTUAL error handling behavior, not ideal behavior.
 * If tests fail, it may indicate missing error handling in the app.
 */

const AUTH_TIMEOUT = 15000

test.describe('Error Handling: API Failures', () => {
  // Run tests serially to avoid parallel conflicts with auth state and route handlers
  test.describe.configure({ mode: 'serial' })

  // Cleanup route handlers and sessions after each test
  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: 'wait' })
    await ensureNoActiveSessionViaAPI(page)
  })

  // Moved from auth-errors.spec.ts, whose other four tests duplicated
  // auth.spec, signup-flow and protected-routes.
  test('401 on API call mid-session shows error', async ({ page }) => {
    // Arrange: Navigate to a protected page
    await page.goto('/dashboard/qa', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // The test account can open Q&A; a redirect away is a failure, not a skip
    await expect(page).toHaveURL(/\/dashboard\/qa/)

    await page.waitForSelector(`[data-testid="${SELECTORS.qa.page}"]`, { timeout: AUTH_TIMEOUT })

    // Intercept ALL API calls to return 401 (simulating expired token)
    await page.route('/api/**', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      })
    })

    // Act: Trigger an API call that will get 401
    await page.getByTestId(SELECTORS.qa.input).fill('Test question')
    await page.getByTestId(SELECTORS.qa.submit).click()

    // Assert: The page should show an error (app doesn't auto-redirect on API 401)
    await expect(page.locator('text=Error:')).toBeVisible({ timeout: 10000 })
  })

  test('QA page shows error when API times out', async ({ page }) => {
    // Arrange: Navigate to Q&A page
    await page.goto('/dashboard/qa', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // The test account can open Q&A; a redirect away is a failure, not a skip
    await expect(page).toHaveURL(/\/dashboard\/qa/)

    await page.waitForSelector(`[data-testid="${SELECTORS.qa.page}"]`, { timeout: AUTH_TIMEOUT })

    // Intercept the Q&A API and delay indefinitely (will timeout)
    await page.route('/api/qa', async (route) => {
      // Delay for 35 seconds (longer than typical timeout)
      await new Promise((resolve) => setTimeout(resolve, 35000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ answer: 'Too late' }),
      })
    })

    // Act: Submit a question
    await page.getByTestId(SELECTORS.qa.input).fill('Test question')
    await page.getByTestId(SELECTORS.qa.submit).click()

    // Assert: Loading state should appear, then eventually an error
    await expect(page.getByTestId(SELECTORS.qa.submit)).toHaveText('Thinking...')

    // After fetch timeout (~30s), error should appear
    await expect(page.locator('text=Error:')).toBeVisible({ timeout: 40000 })
  })

  test('session start shows error when API returns 500', async ({ page }) => {
    await ensureCleanSessionPage(page)
    const startButton = page.getByTestId(SELECTORS.session.startButton)

    // Intercept session creation API
    await page.route('/api/tracking/session', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Database connection failed' }),
        })
      } else {
        await route.continue()
      }
    })

    // Act: Try to start a session
    await startButton.click()
    await page.getByTestId(SELECTORS.session.goalInput).fill('5')
    const refused = page.waitForResponse(
      (r) => r.url().includes('/api/tracking/session') && r.request().method() === 'POST',
    )
    // dispatchEvent bypasses viewport issues in modals
    await page.getByTestId(SELECTORS.session.confirmButton).dispatchEvent('click')
    expect((await refused).status()).toBe(500)

    // Assert: the page is still usable, not crashed into a blank screen, and
    // no session was started
    await expect(page.getByTestId(SELECTORS.session.startButton)).toBeVisible()
    await expect(page.getByTestId(SELECTORS.session.tapButton)).toHaveCount(0)
  })

  test('approach add shows error when API returns 500', async ({ page }) => {
    await ensureCleanSessionPage(page)
    await page.getByTestId(SELECTORS.session.startButton).click()
    await page.getByTestId(SELECTORS.session.goalInput).fill('5')
    // dispatchEvent bypasses viewport issues in modals
    await page.getByTestId(SELECTORS.session.confirmButton).dispatchEvent('click')

    // Wait for session to be active (tap button visible)
    await expect(page.getByTestId(SELECTORS.session.tapButton)).toBeVisible({ timeout: 10000 })

    // Now intercept approach API to fail
    await page.route('/api/tracking/approach', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Failed to save approach' }),
        })
      } else {
        await route.continue()
      }
    })

    const counter = page.getByTestId(SELECTORS.session.counter)
    const initialCount = (await counter.textContent()) ?? '0'

    // Act: Try to add an approach
    const refused = page.waitForResponse(
      (r) => r.url().includes('/api/tracking/approach') && r.request().method() === 'POST',
    )
    await page.getByTestId(SELECTORS.session.tapButton).click()
    expect((await refused).status()).toBe(500)

    // Assert: the optimistic +1 is rolled back once the refusal arrives
    await expect(counter).toHaveText(initialCount)
  })

  test('dashboard handles stats API failure gracefully', async ({ page }) => {
    // Intercept stats API before navigating
    await page.route('/api/tracking/stats', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Stats unavailable' }),
      })
    })

    // Act: Navigate to tracking dashboard
    await page.goto('/dashboard/tracking', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // Assert: Page should load without crashing
    // The dashboard should still be visible even if stats fail
    await expect(page.getByTestId(SELECTORS.trackingDashboard.page)).toBeVisible({ timeout: 10000 })
  })
})
