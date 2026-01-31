import { Page, expect } from '@playwright/test'
import { SELECTORS } from './selectors'
import { TEST_USER, validateTestConfig } from '../fixtures/test-user'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000 // Increased for external auth service latency

/**
 * Logs in a user with the test credentials.
 * Waits for redirect to dashboard, redirect page, or preferences.
 * Throws if login shows an error.
 */
export async function login(page: Page): Promise<void> {
  validateTestConfig()

  await page.goto('/auth/login', { timeout: AUTH_TIMEOUT })

  await page.getByTestId(SELECTORS.auth.emailInput).fill(TEST_USER.email, { timeout: ACTION_TIMEOUT })
  await page.getByTestId(SELECTORS.auth.passwordInput).fill(TEST_USER.password, { timeout: ACTION_TIMEOUT })
  await page.getByTestId(SELECTORS.auth.submitButton).click({ timeout: ACTION_TIMEOUT })

  // Wait for redirect to complete (longer timeout for external auth service)
  // Accept dashboard, redirect, or preferences as valid destinations
  await page.waitForURL(/\/(dashboard|redirect|preferences)/, { timeout: AUTH_TIMEOUT })

  // Verify no error message is shown
  const errorVisible = await page.getByTestId(SELECTORS.auth.errorMessage).isVisible().catch(() => false)
  if (errorVisible) {
    const errorText = await page.getByTestId(SELECTORS.auth.errorMessage).textContent()
    throw new Error(`Login failed with error: ${errorText}`)
  }
}

/**
 * Logs out the current user via the header button.
 * Waits for redirect to home page (production behavior).
 */
export async function logout(page: Page): Promise<void> {
  await page.getByTestId(SELECTORS.header.logoutButton).click({ timeout: ACTION_TIMEOUT })
  await page.waitForURL(/^\/$|localhost:\d+\/?$/, { timeout: AUTH_TIMEOUT })
}

/**
 * Ensures the user is logged in by checking the URL.
 * If not logged in, performs login.
 */
export async function ensureLoggedIn(page: Page): Promise<void> {
  const currentUrl = page.url()

  if (currentUrl.includes('/auth/login') || currentUrl === 'about:blank') {
    await login(page)
  }
}
