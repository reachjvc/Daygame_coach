import { Page, expect } from '@playwright/test'
import { SELECTORS } from './selectors'
import { TEST_USER, TEST_USER_B, validateTestConfig, validateSecondUserConfig } from '../fixtures/test-user'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000 // Increased for external auth service latency

/**
 * Ensures clean session state via API.
 * Ends any active session so tests can create fresh data.
 * Use this in security tests that need to create sessions via API.
 */
export async function ensureNoActiveSessionViaAPI(page: Page): Promise<void> {
  const activeResponse = await page.request.get('/api/tracking/session/active')

  if (activeResponse.ok()) {
    const data = await activeResponse.json()
    // API returns { session: { id: ... } } structure
    const sessionId = data?.session?.id || data?.id
    if (sessionId) {
      // End the active session
      await page.request.post(`/api/tracking/session/${sessionId}/end`, {
        data: {},
      })
    }
  }
  // If no active session (404) or error, that's fine - we're in clean state
}

/**
 * Creates a test session via API, ensuring clean state first.
 * Returns the session ID or throws if creation fails.
 */
export async function createTestSessionViaAPI(
  page: Page,
  location: string = 'Test Location'
): Promise<string> {
  // First ensure no active session
  await ensureNoActiveSessionViaAPI(page)

  const createResponse = await page.request.post('/api/tracking/session', {
    data: { goal: 3, location },
  })

  if (!createResponse.ok()) {
    const errorText = await createResponse.text()
    throw new Error(`Failed to create test session: ${createResponse.status()} - ${errorText}`)
  }

  const session = await createResponse.json()
  return session.id
}

/**
 * Creates a test approach via API for a given session.
 * Returns the approach ID or throws if creation fails.
 */
export async function createTestApproachViaAPI(
  page: Page,
  sessionId: string,
  outcome: string = 'short'
): Promise<string> {
  const response = await page.request.post('/api/tracking/approach', {
    data: {
      session_id: sessionId,
      outcome,
    },
  })

  if (!response.ok()) {
    const errorText = await response.text()
    throw new Error(`Failed to create test approach: ${response.status()} - ${errorText}`)
  }

  const approach = await response.json()
  return approach.id
}

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

/**
 * Logs in as the second test user (User B).
 * Used for RLS isolation tests to verify users can't see each other's data.
 */
export async function loginAsUserB(page: Page): Promise<void> {
  validateSecondUserConfig()

  await page.goto('/auth/login', { timeout: AUTH_TIMEOUT })

  await page.getByTestId(SELECTORS.auth.emailInput).fill(TEST_USER_B.email, { timeout: ACTION_TIMEOUT })
  await page.getByTestId(SELECTORS.auth.passwordInput).fill(TEST_USER_B.password, { timeout: ACTION_TIMEOUT })
  await page.getByTestId(SELECTORS.auth.submitButton).click({ timeout: ACTION_TIMEOUT })

  // Wait for redirect to complete
  await page.waitForURL(/\/(dashboard|redirect|preferences)/, { timeout: AUTH_TIMEOUT })

  // Verify no error message is shown
  const errorVisible = await page.getByTestId(SELECTORS.auth.errorMessage).isVisible().catch(() => false)
  if (errorVisible) {
    const errorText = await page.getByTestId(SELECTORS.auth.errorMessage).textContent()
    throw new Error(`Login as User B failed with error: ${errorText}`)
  }
}
