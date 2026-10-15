import { Page, expect } from '@playwright/test'
import { urlOf } from "@/tests/support/appRoutes"
import { ROUTES } from "@/src/shared/routes"
import { SELECTORS } from './selectors'

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
 * Navigates to the session page with a clean state (no active session).
 * Handles API cleanup, "Active Session Found" dialog, and stale UI state.
 * Uses both API and UI cleanup as fallbacks for parallel test conflicts.
 */
export async function ensureCleanSessionPage(page: Page): Promise<void> {
  const MAX_RETRIES = 5

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Clean up via API (may silently fail, that's OK - UI fallback handles it)
    await ensureNoActiveSessionViaAPI(page)

    await page.goto(ROUTES.trackingSession, { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // Clear ended session from sessionStorage to prevent "Session Ended" banner
    await page.evaluate(() => sessionStorage.removeItem('daygame_ended_session')).catch(() => {})

    // Handle "Active Session Found" dialog (parallel test may have created a session)
    const activeSessionDialog = page.getByRole('dialog', { name: 'Active Session Found' })
    const dialogVisible = await activeSessionDialog.isVisible().catch(() => false)
    if (dialogVisible) {
      await page.getByRole('button', { name: 'Start Fresh' }).click({ timeout: ACTION_TIMEOUT })
      await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })
      // Clear ended session again (Start Fresh may have set it)
      await page.evaluate(() => sessionStorage.removeItem('daygame_ended_session')).catch(() => {})
      // Check if we're now in clean state
      const startButton = page.getByTestId(SELECTORS.session.startButton)
      const startVisible = await startButton.isVisible().catch(() => false)
      if (startVisible) return
      // If not clean yet, retry
      continue
    }

    // Handle "Session Ended" banner (previous test left ended session in sessionStorage)
    const sessionEndedBanner = page.getByTestId(SELECTORS.session.sessionEndedBanner)
    const bannerVisible = await sessionEndedBanner.isVisible().catch(() => false)
    if (bannerVisible) {
      await page.getByRole('button', { name: 'Dismiss' }).click({ timeout: ACTION_TIMEOUT })
      await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })
      const startButton = page.getByTestId(SELECTORS.session.startButton)
      const startVisible = await startButton.isVisible().catch(() => false)
      if (startVisible) return
      continue
    }

    // Check if we have a clean state (start button visible)
    const startButton = page.getByTestId(SELECTORS.session.startButton)
    const startVisible = await startButton.isVisible().catch(() => false)
    if (startVisible) {
      return // Clean state achieved
    }

    // If end button is visible, end the session via UI
    const endButton = page.getByTestId(SELECTORS.session.endButton)
    const hasActiveSession = await endButton.isVisible().catch(() => false)
    if (hasActiveSession) {
      // Close quick log modal if open
      const quickLogModal = page.getByTestId(SELECTORS.session.quickLogModal)
      if (await quickLogModal.isVisible().catch(() => false)) {
        const dismissBtn = page.getByTestId(SELECTORS.session.quickLogDismiss)
        const saveBtn = page.getByTestId(SELECTORS.session.quickLogSave)
        const btnToClick = dismissBtn.or(saveBtn)
        await btnToClick.first().click({ timeout: ACTION_TIMEOUT })
        await expect(quickLogModal).not.toBeVisible({ timeout: AUTH_TIMEOUT })
      }

      // End session via UI
      await endButton.click({ timeout: ACTION_TIMEOUT })
      const endConfirm = page.getByRole('button', { name: /end session/i })
      if (await endConfirm.isVisible({ timeout: 3000 }).catch(() => false)) {
        await endConfirm.click({ timeout: ACTION_TIMEOUT })
        await page.waitForURL(urlOf(ROUTES.tracking, "(?!/)"), { timeout: AUTH_TIMEOUT })
      }
      continue // Retry from the start
    }
  }

  // If we get here after all retries, do one final API cleanup + navigate
  await ensureNoActiveSessionViaAPI(page)
  await page.goto(ROUTES.trackingSession, { timeout: AUTH_TIMEOUT })
  await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })
  // Clear ended session one more time
  await page.evaluate(() => sessionStorage.removeItem('daygame_ended_session')).catch(() => {})

  // Handle "Session Ended" banner if still visible
  const sessionEndedBanner = page.getByTestId(SELECTORS.session.sessionEndedBanner)
  if (await sessionEndedBanner.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Dismiss' }).click({ timeout: ACTION_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })
  }

  const startButton = page.getByTestId(SELECTORS.session.startButton)
  await expect(startButton).toBeVisible({ timeout: AUTH_TIMEOUT })
}
