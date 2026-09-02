import { test, expect } from '@playwright/test'
import { SELECTORS } from './helpers/selectors'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000

// Serial: one of these tests intercepts a network route, and a parallel worker
// hitting the same page mid-interception sees the stub. Required by
// tests/unit/e2e-isolation.test.ts.
test.describe.configure({ mode: 'serial' })

test.describe('Signup Flow', () => {
  test('should show signup form', async ({ page }) => {
    // Arrange: Navigate to signup page
    await page.goto('/auth/sign-up', { timeout: AUTH_TIMEOUT })

    // Assert: Form elements should be visible
    await expect(page.getByTestId(SELECTORS.signup.form)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.signup.fullNameInput)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.signup.emailInput)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.signup.passwordInput)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.signup.repeatPasswordInput)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.signup.submitButton)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should show error for password mismatch', async ({ page }) => {
    // Arrange: Navigate to signup page
    await page.goto('/auth/sign-up', { timeout: AUTH_TIMEOUT })
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

    // Assert: Login link should be visible and work
    const loginLink = page.getByRole('link', { name: /login/i })
    await expect(loginLink).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Act: Click login link
    await loginLink.click({ timeout: ACTION_TIMEOUT })

    // Assert: Should navigate to login page
    await page.waitForURL(/\/auth\/login/, { timeout: AUTH_TIMEOUT })
  })

  test('should require all fields', async ({ page }) => {
    // Arrange: Navigate to signup page
    await page.goto('/auth/sign-up', { timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.signup.form)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Assert: All input fields should have required attribute. The name is
    // mandatory on purpose -- the onboarding flow and the dashboard greeting
    // both expect a name to exist.
    await expect(page.getByTestId(SELECTORS.signup.fullNameInput)).toHaveAttribute('required', '', { timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.signup.emailInput)).toHaveAttribute('required', '', { timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.signup.passwordInput)).toHaveAttribute('required', '', { timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.signup.repeatPasswordInput)).toHaveAttribute('required', '', { timeout: ACTION_TIMEOUT })
  })

  test('sends the confirmation link to /auth/confirm, not straight to /dashboard', async ({ page }) => {
    // This is the regression guard for the defect that broke every real signup:
    // the emailed link carries a one-time code that must be exchanged for a
    // session. Pointing it at /dashboard meant the code was never redeemed and
    // the confirmed user was bounced back to the login page.
    await page.goto('/auth/sign-up', { timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.signup.form)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Intercept before it reaches Supabase: this test must not create a live
    // account or trigger a bouncing confirmation email. We only care what the
    // client asked for.
    let redirectTo = ''
    await page.route('**/auth/v1/signup**', async (route) => {
      redirectTo = new URL(route.request().url()).searchParams.get('redirect_to') ?? ''
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'stub', email: 'stub@example.com' }),
      })
    })

    await page.getByTestId(SELECTORS.signup.emailInput).fill('e2e-redirect-check@example.com', { timeout: ACTION_TIMEOUT })
    await page.getByTestId(SELECTORS.signup.passwordInput).fill('CorrectHorse9!', { timeout: ACTION_TIMEOUT })
    await page.getByTestId(SELECTORS.signup.repeatPasswordInput).fill('CorrectHorse9!', { timeout: ACTION_TIMEOUT })
    await page.getByTestId(SELECTORS.signup.submitButton).click({ timeout: ACTION_TIMEOUT })

    await page.waitForURL(/\/auth\/sign-up-success/, { timeout: AUTH_TIMEOUT })

    expect(redirectTo).toContain('/auth/confirm')
    expect(redirectTo).not.toMatch(/\/dashboard(\?|$)/)
  })
})
