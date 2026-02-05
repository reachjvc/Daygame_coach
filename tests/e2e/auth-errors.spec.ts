import { test, expect } from '@playwright/test'
import { SELECTORS } from './helpers/selectors'

/**
 * Error-Path E2E Tests: Authentication Errors
 *
 * Tests how the app handles authentication failures mid-session.
 * Uses Playwright route interception to simulate auth failures.
 */

const AUTH_TIMEOUT = 15000

test.describe('Error Handling: Authentication Errors', () => {
  // Run tests serially to avoid parallel conflicts with auth state and route handlers
  test.describe.configure({ mode: 'serial' })

  // Cleanup route handlers after each test to prevent route stacking
  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: 'wait' })
  })

  test('401 on API call mid-session shows error', async ({ page }) => {
    // Arrange: Navigate to a protected page
    await page.goto('/dashboard/qa', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // Skip if user doesn't have subscription (redirected away from QA)
    test.skip(!page.url().includes('/dashboard/qa'), 'User does not have QA access (no subscription)')

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
    // This tests actual behavior - API 401s show inline errors, not redirects
    await expect(page.locator('text=Error:')).toBeVisible({ timeout: 10000 })
  })

  test('clearing cookies while on protected page shows error on next action', async ({ page }) => {
    // Arrange: Navigate to dashboard
    await page.goto('/dashboard/tracking', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })
    await page.waitForSelector(`[data-testid="${SELECTORS.trackingDashboard.page}"]`, { timeout: AUTH_TIMEOUT })

    // Act: Clear cookies (simulating session expiry)
    await page.context().clearCookies()

    // Intercept API calls to return 401 (what happens after cookies are cleared)
    await page.route('/api/**', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      })
    })

    // Try to interact with the page (e.g., click new session)
    await page.getByTestId(SELECTORS.trackingDashboard.newSessionLink).click()

    // Assert: Should redirect to login or show auth error
    // Wait for either redirect or error state
    await Promise.race([
      page.waitForURL(/\/auth\/login/, { timeout: AUTH_TIMEOUT }),
      page.waitForSelector('text=error', { timeout: AUTH_TIMEOUT }),
    ])

    // Verify we're either on login page or seeing an error
    const isOnLogin = page.url().includes('/auth/login')
    const hasError = await page.locator('text=error').isVisible().catch(() => false)

    expect(isOnLogin || hasError).toBe(true)
  })

  test('login with invalid credentials shows error message', async ({ page }) => {
    // Arrange: Navigate to login page
    await page.goto('/auth/login', { timeout: AUTH_TIMEOUT })

    // Act: Enter invalid credentials
    await page.getByTestId(SELECTORS.auth.emailInput).fill('invalid@example.com')
    await page.getByTestId(SELECTORS.auth.passwordInput).fill('wrongpassword123')
    await page.getByTestId(SELECTORS.auth.submitButton).click()

    // Assert: Error message should be visible
    await expect(page.getByTestId(SELECTORS.auth.errorMessage)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('login with empty credentials shows validation error', async ({ page }) => {
    // Arrange: Navigate to login page
    await page.goto('/auth/login', { timeout: AUTH_TIMEOUT })

    // Act: Click submit without entering credentials
    await page.getByTestId(SELECTORS.auth.submitButton).click()

    // Assert: Form should show validation (HTML5 validation or custom)
    // Either stay on page with error, or form doesn't submit
    await page.waitForTimeout(1000)
    expect(page.url()).toContain('/auth/login')
  })

  test('signup with existing email shows error', async ({ page }) => {
    // Arrange: Navigate to signup page
    await page.goto('/auth/sign-up', { timeout: AUTH_TIMEOUT })

    // Wait for form to load
    await page.waitForSelector(`[data-testid="${SELECTORS.signup.form}"]`, { timeout: AUTH_TIMEOUT })

    // Act: Enter email that likely already exists
    await page.getByTestId(SELECTORS.signup.fullNameInput).fill('Test User')
    await page.getByTestId(SELECTORS.signup.emailInput).fill('test@example.com')
    await page.getByTestId(SELECTORS.signup.passwordInput).fill('TestPassword123!')
    await page.getByTestId(SELECTORS.signup.repeatPasswordInput).fill('TestPassword123!')
    await page.getByTestId(SELECTORS.signup.submitButton).click()

    // Assert: Error message should appear (either duplicate email or other validation)
    await expect(page.getByTestId(SELECTORS.signup.errorMessage)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('signup with mismatched passwords shows error', async ({ page }) => {
    // Arrange: Navigate to signup page
    await page.goto('/auth/sign-up', { timeout: AUTH_TIMEOUT })

    // Wait for form to load
    await page.waitForSelector(`[data-testid="${SELECTORS.signup.form}"]`, { timeout: AUTH_TIMEOUT })

    // Act: Enter mismatched passwords
    await page.getByTestId(SELECTORS.signup.fullNameInput).fill('Test User')
    await page.getByTestId(SELECTORS.signup.emailInput).fill('newuser@example.com')
    await page.getByTestId(SELECTORS.signup.passwordInput).fill('TestPassword123!')
    await page.getByTestId(SELECTORS.signup.repeatPasswordInput).fill('DifferentPassword456!')
    await page.getByTestId(SELECTORS.signup.submitButton).click()

    // Assert: Error message should appear
    await expect(page.getByTestId(SELECTORS.signup.errorMessage)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })
})
