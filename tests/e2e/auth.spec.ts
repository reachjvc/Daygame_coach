import { test, expect, signIn, SIGNED_OUT } from './fixtures/test'
import { SELECTORS } from './helpers/selectors'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000 // Increased for external auth service latency

/**
 * Logging in with a wrong password, and logging out.
 *
 * A successful login is what every worker's account fixture does before
 * anything else runs, so a third copy of it here proved nothing new; the
 * loading-label and settings-link tests pinned copy and accepted a login
 * redirect as success.
 *
 * Logging out revokes EVERY session of the account (Supabase's signOut is
 * global), which is why this file once ran last, in `auth-destructive`, after
 * everything else signed in as the one shared account. It logs out a `throwawayAccount`
 * made for that one test now, so it ends nobody else's session and runs
 * beside everything.
 */
test.describe('Authentication Flow', () => {
  // Both tests start at the login page with no session of their own.
  test.use({ storageState: SIGNED_OUT })

  test('should show error message with invalid credentials', async ({ page }) => {
    await page.goto('/auth/login', { timeout: AUTH_TIMEOUT })

    await page.getByTestId(SELECTORS.auth.emailInput).fill('invalid@example.com', { timeout: ACTION_TIMEOUT })
    await page.getByTestId(SELECTORS.auth.passwordInput).fill('wrongpassword', { timeout: ACTION_TIMEOUT })
    await page.getByTestId(SELECTORS.auth.submitButton).click({ timeout: ACTION_TIMEOUT })

    await expect(page.getByTestId(SELECTORS.auth.errorMessage)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('logging out ends the session: the dashboard turns you away afterwards', async ({ page, throwawayAccount }) => {
    await signIn(page, throwawayAccount)

    await page.goto('/dashboard', { timeout: AUTH_TIMEOUT })
    const logoutButton = page.getByTestId(SELECTORS.header.logoutButton)
    await expect(logoutButton).toBeVisible({ timeout: AUTH_TIMEOUT })

    await logoutButton.click({ timeout: ACTION_TIMEOUT })
    await page.waitForURL(/^\/$|localhost:\d+\/?$/, { timeout: AUTH_TIMEOUT })

    // The cookies this browser still holds must not open the dashboard again.
    // An earlier copy of this check cleared the cookies by hand first, which
    // tested the proxy and not the logout.
    await page.goto('/dashboard/tracking', { timeout: AUTH_TIMEOUT })
    await page.waitForURL(/\/auth\/login/, { timeout: AUTH_TIMEOUT })
  })
})
