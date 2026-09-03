import { test, expect } from '@playwright/test'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000

// Serial: these tests intercept network routes, and a parallel worker hitting
// the same page mid-interception sees the stub. Required by
// tests/unit/e2e-isolation.test.ts.
test.describe.configure({ mode: 'serial' })

// Serial: a test here intercepts a network route, and a parallel worker hitting
// the same page mid-interception sees the stub. Required by
// tests/unit/e2e-isolation.test.ts.
test.describe.configure({ mode: 'serial' })

test.describe('Password reset', () => {
  test('is reachable from the login page', async ({ page }) => {
    await page.goto('/auth/login', { timeout: AUTH_TIMEOUT })
    await page.getByTestId('login-forgot-link').click({ timeout: ACTION_TIMEOUT })
    await page.waitForURL(/\/auth\/forgot-password/, { timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId('forgot-form')).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('does not reveal whether an address is registered', async ({ page }) => {
    // The point of this file. A reset form that says "no such account" is a way
    // for anyone to test which email addresses have signed up. Both the
    // registered and unregistered cases must produce the identical response.
    const messages: string[] = []

    for (const address of ['definitely-not-registered-9f2a@example.com', 'reachjvc@gmail.com']) {
      await page.goto('/auth/forgot-password', { timeout: AUTH_TIMEOUT })

      // Stub the network call: asserting on our own UI, and a real call would
      // send mail to a real inbox.
      await page.route('**/auth/v1/recover**', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
      )

      await page.getByTestId('forgot-email-input').fill(address, { timeout: ACTION_TIMEOUT })
      await page.getByTestId('forgot-submit-button').click({ timeout: ACTION_TIMEOUT })

      const success = page.getByTestId('forgot-success-message')
      await expect(success).toBeVisible({ timeout: AUTH_TIMEOUT })
      messages.push(((await success.textContent()) ?? '').trim())
    }

    expect(messages[0]).toBe(messages[1])
    expect(messages[0]).not.toContain('not found')
  })

  test('says so when rate limited, instead of claiming an email was sent', async ({ page }) => {
    // Supabase applies a cooldown per address and answers 429. Showing the
    // usual "we've sent it" there is a lie: no mail went out, and the user
    // sits waiting for it. Safe to surface, because a 429 says nothing about
    // whether the account exists -- unlike "no such account", which must stay
    // hidden (see the enumeration test above).
    await page.goto('/auth/forgot-password', { timeout: AUTH_TIMEOUT })

    await page.route('**/auth/v1/recover**', (route) =>
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'For security purposes, you can only request this after 51 seconds.' }),
      })
    )

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
    await expect(page.getByTestId('reset-expired-message')).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId('reset-form')).not.toBeVisible({ timeout: ACTION_TIMEOUT })
  })
})

test.describe('Email confirmation callback', () => {
  test('sends a link with no code back to login with a readable reason', async ({ page }) => {
    await page.goto('/auth/confirm', { timeout: AUTH_TIMEOUT })
    await page.waitForURL(/\/auth\/login\?error=missing_code/, { timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId('login-notice-message')).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('refuses to forward to another site', async ({ page }) => {
    // Open-redirect guard: "//evil.com" starts with "/" but a browser reads it
    // as https://evil.com. Must fall back to an internal path.
    await page.goto('/auth/confirm?next=%2F%2Fevil.com', { timeout: AUTH_TIMEOUT })
    await expect(page).toHaveURL(/localhost|127\.0\.0\.1/, { timeout: AUTH_TIMEOUT })
    expect(page.url()).not.toContain('evil.com')
  })
})
