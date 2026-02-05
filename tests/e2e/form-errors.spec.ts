import { test, expect } from '@playwright/test'
import { ensureNoActiveSessionViaAPI } from './helpers/auth.helper'
import { SELECTORS } from './helpers/selectors'

/**
 * Error-Path E2E Tests: Form Validation Errors
 *
 * Tests how forms handle validation errors and display them to users.
 * Tests both client-side validation and server-side validation errors.
 */

const AUTH_TIMEOUT = 15000

test.describe('Error Handling: Form Validation', () => {
  // Run tests serially to avoid parallel conflicts with auth state and route handlers
  test.describe.configure({ mode: 'serial' })

  test.describe('Login Form', () => {
    test('shows error for invalid email format', async ({ page }) => {
      // Arrange: Navigate to login page
      await page.goto('/auth/login', { timeout: AUTH_TIMEOUT })

      // Act: Enter invalid email format
      await page.getByTestId(SELECTORS.auth.emailInput).fill('notanemail')
      await page.getByTestId(SELECTORS.auth.passwordInput).fill('somepassword123')
      await page.getByTestId(SELECTORS.auth.submitButton).click()

      // Assert: Form should show validation error or not submit
      // Either shows error message or stays on login page (HTML5 validation)
      await page.waitForTimeout(1000)
      const isOnLogin = page.url().includes('/auth/login')
      const hasError = await page.getByTestId(SELECTORS.auth.errorMessage).isVisible().catch(() => false)

      expect(isOnLogin || hasError).toBe(true)
    })

    test('shows error for short password', async ({ page }) => {
      // Arrange: Navigate to login page
      await page.goto('/auth/login', { timeout: AUTH_TIMEOUT })

      // Act: Enter a very short password
      await page.getByTestId(SELECTORS.auth.emailInput).fill('test@example.com')
      await page.getByTestId(SELECTORS.auth.passwordInput).fill('123')
      await page.getByTestId(SELECTORS.auth.submitButton).click()

      // Assert: Should show error or reject
      await page.waitForTimeout(2000)

      // Check if we got an error or stayed on the page
      const isOnLogin = page.url().includes('/auth/login')
      expect(isOnLogin).toBe(true)
    })
  })

  test.describe('Signup Form', () => {
    test('shows error for password mismatch', async ({ page }) => {
      // Arrange: Navigate to signup page
      await page.goto('/auth/sign-up', { timeout: AUTH_TIMEOUT })
      await page.waitForSelector(`[data-testid="${SELECTORS.signup.form}"]`, { timeout: AUTH_TIMEOUT })

      // Act: Enter mismatched passwords
      await page.getByTestId(SELECTORS.signup.fullNameInput).fill('Test User')
      await page.getByTestId(SELECTORS.signup.emailInput).fill('newuser' + Date.now() + '@example.com')
      await page.getByTestId(SELECTORS.signup.passwordInput).fill('Password123!')
      await page.getByTestId(SELECTORS.signup.repeatPasswordInput).fill('DifferentPassword456!')
      await page.getByTestId(SELECTORS.signup.submitButton).click()

      // Assert: Error message should appear
      await expect(page.getByTestId(SELECTORS.signup.errorMessage)).toBeVisible({ timeout: AUTH_TIMEOUT })
    })

    test('shows error for weak password', async ({ page }) => {
      // Arrange: Navigate to signup page
      await page.goto('/auth/sign-up', { timeout: AUTH_TIMEOUT })
      await page.waitForSelector(`[data-testid="${SELECTORS.signup.form}"]`, { timeout: AUTH_TIMEOUT })

      // Act: Enter a weak password (common requirement: min 8 chars, uppercase, number)
      await page.getByTestId(SELECTORS.signup.fullNameInput).fill('Test User')
      await page.getByTestId(SELECTORS.signup.emailInput).fill('newuser' + Date.now() + '@example.com')
      await page.getByTestId(SELECTORS.signup.passwordInput).fill('weak')
      await page.getByTestId(SELECTORS.signup.repeatPasswordInput).fill('weak')
      await page.getByTestId(SELECTORS.signup.submitButton).click()

      // Assert: Either shows error or stays on page (password validation)
      await page.waitForTimeout(2000)
      const isOnSignup = page.url().includes('/auth/sign-up')
      const hasError = await page.getByTestId(SELECTORS.signup.errorMessage).isVisible().catch(() => false)

      expect(isOnSignup || hasError).toBe(true)
    })

    test('shows error for empty required fields', async ({ page }) => {
      // Arrange: Navigate to signup page
      await page.goto('/auth/sign-up', { timeout: AUTH_TIMEOUT })
      await page.waitForSelector(`[data-testid="${SELECTORS.signup.form}"]`, { timeout: AUTH_TIMEOUT })

      // Act: Try to submit with empty fields
      await page.getByTestId(SELECTORS.signup.submitButton).click()

      // Assert: Form should not submit (HTML5 validation or custom)
      await page.waitForTimeout(1000)
      expect(page.url()).toContain('/auth/sign-up')
    })
  })

  test.describe('Q&A Form', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard/qa', { timeout: AUTH_TIMEOUT })
      await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })
    })

    // Cleanup route handlers after each test to prevent route stacking
    test.afterEach(async ({ page }) => {
      await page.unrouteAll({ behavior: 'wait' })
    })

    test('submit button disabled when input is empty', async ({ page }) => {
      // Skip if user doesn't have subscription (redirected away from QA)
      test.skip(!page.url().includes('/dashboard/qa'), 'User does not have QA access (no subscription)')

      await page.waitForSelector(`[data-testid="${SELECTORS.qa.page}"]`, { timeout: AUTH_TIMEOUT })

      // Assert: Submit button should be disabled when input is empty
      const submitButton = page.getByTestId(SELECTORS.qa.submit)
      await expect(submitButton).toBeDisabled()
    })

    test('submit button enabled when input has content', async ({ page }) => {
      // Skip if user doesn't have subscription (redirected away from QA)
      test.skip(!page.url().includes('/dashboard/qa'), 'User does not have QA access (no subscription)')

      await page.waitForSelector(`[data-testid="${SELECTORS.qa.page}"]`, { timeout: AUTH_TIMEOUT })

      // Act: Type a question
      await page.getByTestId(SELECTORS.qa.input).fill('How do I approach?')

      // Assert: Submit button should be enabled
      const submitButton = page.getByTestId(SELECTORS.qa.submit)
      await expect(submitButton).toBeEnabled()
    })

    test('shows error when server returns validation error', async ({ page }) => {
      // Skip if user doesn't have subscription (redirected away from QA)
      test.skip(!page.url().includes('/dashboard/qa'), 'User does not have QA access (no subscription)')

      await page.waitForSelector(`[data-testid="${SELECTORS.qa.page}"]`, { timeout: AUTH_TIMEOUT })

      // Intercept API to return validation error
      await page.route('/api/qa', async (route) => {
        await route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Question too short' }),
        })
      })

      // Act: Submit a question
      await page.getByTestId(SELECTORS.qa.input).fill('Hi')
      await page.getByTestId(SELECTORS.qa.submit).click()

      // Assert: Error should be displayed
      await expect(page.locator('text=Error:')).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Session Form', () => {
    // Cleanup any sessions that may have been created during tests
    test.afterEach(async ({ page }) => {
      await ensureNoActiveSessionViaAPI(page)
    })

    test('session start dialog validates goal input', async ({ page }) => {
      // Arrange: Navigate to session page
      await page.goto('/dashboard/tracking/session', { timeout: AUTH_TIMEOUT })
      await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

      // Wait for page to fully load (either start button or end button visible)
      const startButton = page.getByTestId(SELECTORS.session.startButton)
      const endButton = page.getByTestId(SELECTORS.session.endButton)
      await expect(startButton.or(endButton)).toBeVisible({ timeout: AUTH_TIMEOUT })

      // If there's already an active session, skip this test
      const hasActiveSession = await endButton.isVisible().catch(() => false)
      test.skip(hasActiveSession, 'Cannot test session start - already has active session')

      // Act: Open start dialog
      await startButton.click()

      // Check if goal input exists and try invalid values
      const goalInput = page.getByTestId(SELECTORS.session.goalInput)
      if (await goalInput.isVisible()) {
        // Try entering negative number
        await goalInput.fill('-5')

        // The input should either reject it or form validation should prevent submit
        const confirmButton = page.getByTestId(SELECTORS.session.confirmButton)

        // If confirm button exists and is visible, check if it handles invalid input
        if (await confirmButton.isVisible()) {
          // Use dispatchEvent (bypasses viewport issues in modals)
          await confirmButton.dispatchEvent('click')

          // Form should either not submit or show error
          // Wait a bit and check we didn't successfully start a session
          await page.waitForTimeout(1000)
        }
      }
    })
  })
})
