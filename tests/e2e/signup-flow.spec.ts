import type { Page } from '@playwright/test'
import { urlOf } from "@/tests/support/appRoutes"
import { ROUTES } from "@/src/shared/routes"
import { test, expect, SIGNED_OUT } from './fixtures/test'
import { emailedAuthLink, freshAddress, openEmailedLink, strongPassword } from './helpers/authEmail'
import { waitForHydration } from './helpers/hydration'
import { fillSecret } from './helpers/secret'
import { SELECTORS } from './helpers/selectors'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000

/**
 * Signing up, end to end, on the test backend: the form, the email the auth
 * service sends (caught by Mailpit), and the link in it. Until Phase 8 these
 * stubbed the auth service's answers, because a real signup would have made
 * an account in the live project and mailed a real address; the two that did
 * are real now, so they also prove the answers the stubs assumed.
 */

/** Fills the signup form and submits it. The password goes through `fillSecret`. */
async function signUp(page: Page, fields: { name: string; email: string; password: string }): Promise<void> {
  await page.goto('/auth/sign-up', { timeout: AUTH_TIMEOUT })
  await waitForHydration(page)
  await expect(page.getByTestId(SELECTORS.signup.form)).toBeVisible({ timeout: AUTH_TIMEOUT })
  await page.getByTestId(SELECTORS.signup.fullNameInput).fill(fields.name, { timeout: ACTION_TIMEOUT })
  await page.getByTestId(SELECTORS.signup.emailInput).fill(fields.email, { timeout: ACTION_TIMEOUT })
  await fillSecret(page.getByTestId(SELECTORS.signup.passwordInput), fields.password, { timeout: ACTION_TIMEOUT })
  await fillSecret(page.getByTestId(SELECTORS.signup.repeatPasswordInput), fields.password, { timeout: ACTION_TIMEOUT })
  await page.getByTestId(SELECTORS.signup.submitButton).click({ timeout: ACTION_TIMEOUT })
}

test.describe('Signup Flow', { tag: '@phone' }, () => {
  // A stranger signing up: no session of the worker's.
  test.use({ storageState: SIGNED_OUT })

  test('should show error for password mismatch', async ({ page }) => {
    // Arrange: Navigate to signup page
    await page.goto('/auth/sign-up', { timeout: AUTH_TIMEOUT })
    await waitForHydration(page)
    await expect(page.getByTestId(SELECTORS.signup.form)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Act: Fill in form with mismatched passwords
    await page.getByTestId(SELECTORS.signup.fullNameInput).fill('Test User', { timeout: ACTION_TIMEOUT })
    await page.getByTestId(SELECTORS.signup.emailInput).fill('test@example.com', { timeout: ACTION_TIMEOUT })
    await page.getByTestId(SELECTORS.signup.passwordInput).fill('password123', { timeout: ACTION_TIMEOUT })
    await page.getByTestId(SELECTORS.signup.repeatPasswordInput).fill('password456', { timeout: ACTION_TIMEOUT })
    await page.getByTestId(SELECTORS.signup.submitButton).click({ timeout: ACTION_TIMEOUT })

    // Assert: Error message should appear
    await expect(page.getByTestId(SELECTORS.signup.errorMessage)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.signup.errorMessage)).toContainText('Passwords do not match', { timeout: AUTH_TIMEOUT })
  })

  test('should have link to login page', async ({ page }) => {
    // Arrange: Navigate to signup page
    await page.goto('/auth/sign-up', { timeout: AUTH_TIMEOUT })
    await waitForHydration(page)

    // Assert: Login link should be visible and work
    const loginLink = page.getByRole('link', { name: /login/i })
    await expect(loginLink).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Act: Click login link
    await loginLink.click({ timeout: ACTION_TIMEOUT })

    // Assert: Should navigate to login page
    await page.waitForURL(/\/auth\/login/, { timeout: AUTH_TIMEOUT })
  })

  test('the emailed confirmation link goes through /auth/confirm and signs the new account in', async ({ page }) => {
    // The regression this guards broke every real signup: the emailed link
    // carries a one-time code that must be exchanged for a session. Pointing
    // it at /dashboard meant the code was never redeemed and the confirmed
    // user was bounced back to the login page. So: sign up, open the link the
    // email holds, and be signed in as the account just made.
    const email = freshAddress('signup')
    await signUp(page, { name: 'New Signup', email, password: strongPassword() })
    await page.waitForURL(/\/auth\/sign-up-success/, { timeout: AUTH_TIMEOUT })

    const link = await emailedAuthLink(email, 'signup')
    expect(link.redirectTo, 'where the confirmation link sends the browser').toContain('/auth/confirm')
    expect(link.redirectTo).not.toMatch(urlOf(ROUTES.dashboard, "(\\?|$)"))

    expect(await openEmailedLink(page, link), 'where the link left the browser').not.toMatch(/^\/auth\//)

    // Signed in, and as the new account rather than anyone else.
    await page.goto(ROUTES.settings, { timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.settings.userEmail)).toHaveText(email, { timeout: AUTH_TIMEOUT })
  })

  test('offers a way forward when the email already has an account', async ({ page, throwawayAccount }) => {
    // The auth service answers "User already registered", which reads as a dead
    // end. The most likely person to see it is someone who signed up months ago
    // and forgot -- so the page must point at logging in or resetting, not just
    // report a failure. This happened to the owner on 2026-09-03.
    //
    // A real, confirmed account and a real answer. The stub this replaced
    // assumed the 422 `user_already_exists`. Supabase documents that answer
    // only while email OR phone confirmation is off; with both on, signUp
    // returns a made-up user instead and this page would say nothing. This is
    // the test that notices if the backend's settings ever make that so.
    await signUp(page, { name: 'Returning User', email: throwawayAccount.email, password: strongPassword() })

    await expect(page.getByTestId('signup-existing-account')).toBeVisible({ timeout: AUTH_TIMEOUT })
    // The raw error must NOT be what the user is left with.
    await expect(page.getByTestId(SELECTORS.signup.errorMessage)).not.toBeVisible({ timeout: ACTION_TIMEOUT })

    // And the way out must carry the address over, so it need not be retyped.
    await page.getByTestId('signup-existing-login-link').click({ timeout: ACTION_TIMEOUT })
    await page.waitForURL(/\/auth\/login/, { timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.auth.emailInput)).toHaveValue(throwawayAccount.email, { timeout: AUTH_TIMEOUT })
  })
})
