import { test, expect } from '@playwright/test'
import { SELECTORS } from './helpers/selectors'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000

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

    // Assert: All input fields should have required attribute
    const fullNameInput = page.getByTestId(SELECTORS.signup.fullNameInput)
    const emailInput = page.getByTestId(SELECTORS.signup.emailInput)
    const passwordInput = page.getByTestId(SELECTORS.signup.passwordInput)
    const repeatPasswordInput = page.getByTestId(SELECTORS.signup.repeatPasswordInput)

    await expect(fullNameInput).toHaveAttribute('required', '', { timeout: ACTION_TIMEOUT })
    await expect(emailInput).toHaveAttribute('required', '', { timeout: ACTION_TIMEOUT })
    await expect(passwordInput).toHaveAttribute('required', '', { timeout: ACTION_TIMEOUT })
    await expect(repeatPasswordInput).toHaveAttribute('required', '', { timeout: ACTION_TIMEOUT })
  })
})
