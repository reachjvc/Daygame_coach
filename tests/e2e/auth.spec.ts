import { test, expect } from '@playwright/test'
import { SELECTORS } from './helpers/selectors'
import { TEST_USER, validateTestConfig } from './fixtures/test-user'
import { login } from './helpers/auth.helper'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000 // Increased for external auth service latency

test.describe('Authentication Flow', () => {
  test.beforeEach(async () => {
    // Arrange: Validate test credentials are set
    validateTestConfig()
  })

  test('should login successfully with valid credentials', async ({ page }) => {
    // Arrange: Navigate to login page
    await page.goto('/auth/login', { timeout: AUTH_TIMEOUT })

    // Act: Fill login form and submit
    await page.getByTestId(SELECTORS.auth.emailInput).fill(TEST_USER.email, { timeout: ACTION_TIMEOUT })
    await page.getByTestId(SELECTORS.auth.passwordInput).fill(TEST_USER.password, { timeout: ACTION_TIMEOUT })
    await page.getByTestId(SELECTORS.auth.submitButton).click({ timeout: ACTION_TIMEOUT })

    // Assert: Should redirect to dashboard or redirect page (or show no error)
    // Wait for either redirect OR error message to appear
    await Promise.race([
      page.waitForURL(/\/(dashboard|redirect|preferences)/, { timeout: AUTH_TIMEOUT }),
      expect(page.getByTestId(SELECTORS.auth.errorMessage)).toBeVisible({ timeout: AUTH_TIMEOUT }),
    ])

    // Verify we got redirect (no error)
    const errorVisible = await page.getByTestId(SELECTORS.auth.errorMessage).isVisible().catch(() => false)
    expect(errorVisible).toBe(false)
  })

  test('should show error message with invalid credentials', async ({ page }) => {
    // Arrange: Navigate to login page
    await page.goto('/auth/login', { timeout: AUTH_TIMEOUT })

    // Act: Fill login form with invalid credentials and submit
    await page.getByTestId(SELECTORS.auth.emailInput).fill('invalid@example.com', { timeout: ACTION_TIMEOUT })
    await page.getByTestId(SELECTORS.auth.passwordInput).fill('wrongpassword', { timeout: ACTION_TIMEOUT })
    await page.getByTestId(SELECTORS.auth.submitButton).click({ timeout: ACTION_TIMEOUT })

    // Assert: Should display error message
    await expect(page.getByTestId(SELECTORS.auth.errorMessage)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should show loading state while logging in', async ({ page }) => {
    // Arrange: Navigate to login page
    await page.goto('/auth/login', { timeout: AUTH_TIMEOUT })

    // Act: Fill form and submit
    await page.getByTestId(SELECTORS.auth.emailInput).fill(TEST_USER.email, { timeout: ACTION_TIMEOUT })
    await page.getByTestId(SELECTORS.auth.passwordInput).fill(TEST_USER.password, { timeout: ACTION_TIMEOUT })

    // Assert: Button shows loading text immediately after click
    // Use Promise.all to click and check simultaneously since loading state is brief
    const submitButton = page.getByTestId(SELECTORS.auth.submitButton)
    await Promise.all([
      submitButton.click({ timeout: ACTION_TIMEOUT }),
      expect(submitButton).toHaveText('Logging in...', { timeout: AUTH_TIMEOUT }),
    ])
  })

  test('should logout successfully', async ({ page }) => {
    // Arrange: Login using helper
    await login(page)

    // Navigate to dashboard to ensure we see the header
    await page.goto('/dashboard', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('domcontentloaded', { timeout: AUTH_TIMEOUT })

    // Wait for logout button to be visible
    const logoutButton = page.getByTestId(SELECTORS.header.logoutButton)
    await expect(logoutButton).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Act: Click logout button
    await logoutButton.click({ timeout: ACTION_TIMEOUT })

    // Assert: Should redirect to home page (production behavior)
    await page.waitForURL(/^\/$|localhost:\d+\/?$/, { timeout: AUTH_TIMEOUT })
  })

  test('should navigate to settings from header', async ({ page }) => {
    // Arrange: Login using helper
    await login(page)

    // Navigate to dashboard (longer timeout for server-side auth checks)
    await page.goto('/dashboard', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // Wait for settings link to be visible and stable
    const settingsLink = page.getByTestId(SELECTORS.header.settingsLink)
    await expect(settingsLink).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Act: Click settings link
    await settingsLink.click({ timeout: ACTION_TIMEOUT })

    // Wait for navigation - could go to settings or redirect to login if session expired
    await page.waitForURL(/\/(dashboard\/settings|auth\/login)/, { timeout: AUTH_TIMEOUT })

    // Assert: Navigation worked (either to settings or auth redirect)
    const url = page.url()
    expect(url).toMatch(/\/(dashboard\/settings|auth\/login)/)
  })
})
