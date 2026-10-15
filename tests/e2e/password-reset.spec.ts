import { test, expect, signIn, SIGNED_OUT } from './fixtures/test'
import { ROUTES } from "@/src/shared/routes"
import { createUnconfirmedAccount, emailedAuthLink, openEmailedLink, strongPassword } from './helpers/authEmail'
import { waitForHydration } from './helpers/hydration'
import { fillSecret } from './helpers/secret'
import { SELECTORS } from './helpers/selectors'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000

/**
 * Resetting a password, confirming an address, and the ways both go wrong —
 * on the test backend, whose auth service mails every link to Mailpit. The
 * reset, the resend and the unconfirmed login used to stub the auth service's
 * answers so nothing touched the live project; they are real now.
 *
 * Two stubs stay, both for a 429. The local backend's cooldown between two
 * emails to one address is one second (tests/db/supabase/config.toml,
 * `max_frequency`), so a real 429 is a race against the clock. The stubbed
 * body is the one the local auth service gives inside the cooldown.
 */

// Every test here is someone who is not signed in.
test.use({ storageState: SIGNED_OUT })

/** What the auth service answers inside its cooldown. */
const COOLDOWN = {
  status: 429,
  contentType: 'application/json',
  body: JSON.stringify({ message: 'For security purposes, you can only request this after 51 seconds.' }),
}

test.describe('Password reset', { tag: '@phone' }, () => {
  test('is reachable from the login page', async ({ page }) => {
    await page.goto('/auth/login', { timeout: AUTH_TIMEOUT })
    await waitForHydration(page)
    await page.getByTestId('login-forgot-link').click({ timeout: ACTION_TIMEOUT })
    await page.waitForURL(/\/auth\/forgot-password/, { timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId('forgot-form')).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('the emailed link sets a new password, and only the new one signs in', async ({ page, throwawayAccount }) => {
    await page.goto('/auth/forgot-password', { timeout: AUTH_TIMEOUT })
    await waitForHydration(page)
    await page.getByTestId('forgot-email-input').fill(throwawayAccount.email, { timeout: ACTION_TIMEOUT })
    await page.getByTestId('forgot-submit-button').click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId('forgot-success-message')).toBeVisible({ timeout: AUTH_TIMEOUT })

    // The link goes through /auth/confirm, which trades its code for a session
    // and forwards to the form.
    const link = await emailedAuthLink(throwawayAccount.email, 'recovery')
    expect(link.redirectTo, 'where the reset link sends the browser').toContain('/auth/confirm')
    expect(await openEmailedLink(page, link), 'where the reset link left the browser').toBe('/auth/reset-password')
    await expect(page.getByTestId('reset-form')).toBeVisible({ timeout: AUTH_TIMEOUT })

    const newPassword = strongPassword()
    await fillSecret(page.getByTestId('reset-password-input'), newPassword, { timeout: ACTION_TIMEOUT })
    await fillSecret(page.getByTestId('reset-repeat-input'), newPassword, { timeout: ACTION_TIMEOUT })
    await page.getByTestId('reset-submit-button').click({ timeout: ACTION_TIMEOUT })
    await page.waitForURL(/\/auth\/login\?reset=1/, { timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId('login-reset-success')).toBeVisible({ timeout: AUTH_TIMEOUT })

    // The old password no longer opens the account...
    await page.getByTestId(SELECTORS.auth.emailInput).fill(throwawayAccount.email, { timeout: ACTION_TIMEOUT })
    await fillSecret(page.getByTestId(SELECTORS.auth.passwordInput), throwawayAccount.password, { timeout: ACTION_TIMEOUT })
    await page.getByTestId(SELECTORS.auth.submitButton).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.auth.errorMessage)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // ...and the new one does.
    await signIn(page, { ...throwawayAccount, password: newPassword })
  })

  test('says so when rate limited, instead of claiming an email was sent', async ({ page }) => {
    // Supabase applies a cooldown per address and answers 429. Showing the
    // usual "we've sent it" there is a lie: no mail went out, and the user
    // sits waiting for it. Safe to surface, because a 429 says nothing about
    // whether the account exists -- unlike "no such account", which must stay
    // hidden. (A test of that lived here; it stubbed the reset call to answer
    // the same for both addresses, so the two messages matched whatever the
    // product did.)
    await page.goto('/auth/forgot-password', { timeout: AUTH_TIMEOUT })
    await waitForHydration(page)

    await page.route('**/auth/v1/recover**', (route) => route.fulfill(COOLDOWN))

    await page.getByTestId('forgot-email-input').fill('someone@example.com', { timeout: ACTION_TIMEOUT })
    await page.getByTestId('forgot-submit-button').click({ timeout: ACTION_TIMEOUT })

    await expect(page.getByTestId('forgot-rate-limited-message')).toBeVisible({ timeout: AUTH_TIMEOUT })
    // The success message must NOT appear: that is the bug being guarded.
    await expect(page.getByTestId('forgot-success-message')).not.toBeVisible({ timeout: ACTION_TIMEOUT })
  })

  test('tells the user plainly when a reset link has expired', async ({ page }) => {
    // Landing here without going through /auth/confirm means no recovery
    // session, which is what a stale or reused link looks like.
    await page.goto('/auth/reset-password', { timeout: AUTH_TIMEOUT })
    await waitForHydration(page)
    await expect(page.getByTestId('reset-expired-message')).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId('reset-form')).not.toBeVisible({ timeout: ACTION_TIMEOUT })
  })
})

test.describe('Email confirmation callback', { tag: '@phone' }, () => {
  test('sends a link with no code back to login with a readable reason', async ({ page }) => {
    await page.goto('/auth/confirm', { timeout: AUTH_TIMEOUT })
    await waitForHydration(page)
    await page.waitForURL(/\/auth\/login\?error=missing_code/, { timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId('login-notice-message')).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('refuses to forward to another site', async ({ page }) => {
    // Open-redirect guard: "//evil.com" starts with "/" but a browser reads it
    // as https://evil.com. Must fall back to an internal path.
    await page.goto('/auth/confirm?next=%2F%2Fevil.com', { timeout: AUTH_TIMEOUT })
    await waitForHydration(page)
    await expect(page).toHaveURL(/localhost|127\.0\.0\.1/, { timeout: AUTH_TIMEOUT })
    expect(page.url()).not.toContain('evil.com')
  })
})

test.describe('Confirmation email resend', { tag: '@phone' }, () => {
  test('the resend button mails a new confirmation link, and that link signs the account in', async ({ page }) => {
    test.fail(true, 'product bug: a resent link lands on /auth/login?error=missing_code — resend() sends no PKCE challenge, so its tokens come back in the #fragment and /auth/confirm finds no ?code')
    // Without this button the page is a dead end: the only other route is to
    // sign up again, which correctly answers "you already have an account".
    // An account that never confirmed, and whose first email is this resend.
    const waiting = await createUnconfirmedAccount('resend')
    await page.goto(`/auth/sign-up-success?email=${encodeURIComponent(waiting.email)}`, { timeout: AUTH_TIMEOUT })
    await waitForHydration(page)
    await page.getByTestId('resend-submit-button').click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId('resend-sent-message')).toBeVisible({ timeout: AUTH_TIMEOUT })

    const link = await emailedAuthLink(waiting.email, 'signup')
    expect(link.redirectTo, 'where the resent link sends the browser').toContain('/auth/confirm')
    expect(await openEmailedLink(page, link), 'where the resent link left the browser').not.toMatch(/^\/auth\//)
    await page.goto(ROUTES.settings, { timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.settings.userEmail)).toHaveText(waiting.email, { timeout: AUTH_TIMEOUT })
  })

  test('says so when rate limited instead of claiming it sent', async ({ page }) => {
    await page.goto('/auth/sign-up-success?email=someone%40example.com', { timeout: AUTH_TIMEOUT })
    await waitForHydration(page)
    await expect(page.getByTestId('resend-form')).toBeVisible({ timeout: AUTH_TIMEOUT })

    await page.route('**/auth/v1/resend**', (route) => route.fulfill(COOLDOWN))

    await page.getByTestId('resend-submit-button').click({ timeout: ACTION_TIMEOUT })

    await expect(page.getByTestId('resend-rate-limited-message')).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId('resend-sent-message')).not.toBeVisible({ timeout: ACTION_TIMEOUT })
  })

  test('asks for the address when it was not carried over', async ({ page }) => {
    // Someone who bookmarked the page or came back later has no ?email=.
    // Asking beats calling resend with an empty string.
    await page.goto('/auth/sign-up-success', { timeout: AUTH_TIMEOUT })
    await waitForHydration(page)
    await expect(page.getByTestId('resend-email-input')).toBeVisible({ timeout: AUTH_TIMEOUT })
  })
})

test.describe('Unconfirmed login', { tag: '@phone' }, () => {
  test('explains an unconfirmed account and links to the resend', async ({ page }) => {
    // The auth service answers "Email not confirmed" -- true, and useless on
    // its own. A real account that never confirmed, and the real answer.
    const waiting = await createUnconfirmedAccount('unconfirmed')
    await page.goto('/auth/login', { timeout: AUTH_TIMEOUT })
    await waitForHydration(page)

    await page.getByTestId(SELECTORS.auth.emailInput).fill(waiting.email, { timeout: ACTION_TIMEOUT })
    await fillSecret(page.getByTestId(SELECTORS.auth.passwordInput), waiting.password, { timeout: ACTION_TIMEOUT })
    await page.getByTestId(SELECTORS.auth.submitButton).click({ timeout: ACTION_TIMEOUT })

    await expect(page.getByTestId('login-unconfirmed')).toBeVisible({ timeout: AUTH_TIMEOUT })
    // The raw wording must not be what the user is left with.
    await expect(page.getByTestId(SELECTORS.auth.errorMessage)).not.toBeVisible({ timeout: ACTION_TIMEOUT })

    await page.getByTestId('login-unconfirmed-resend-link').click({ timeout: ACTION_TIMEOUT })
    await page.waitForURL(/\/auth\/sign-up-success/, { timeout: AUTH_TIMEOUT })
    // The address carries over so the resend button works without retyping.
    expect(new URL(page.url()).searchParams.get('email')).toBe(waiting.email)
  })
})
