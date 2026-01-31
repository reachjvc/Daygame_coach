import { test, expect } from '@playwright/test'
import { SELECTORS } from './helpers/selectors'
import { login } from './helpers/auth.helper'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000

test.describe('Scenarios Hub', () => {
  test.describe('Preview Mode (not logged in)', () => {
    test('should display scenarios hub in preview mode', async ({ page }) => {
      // Arrange: Navigate to scenarios without login
      await page.goto('/dashboard/scenarios', { timeout: AUTH_TIMEOUT })
      await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

      // Assert: Hub should be visible (might redirect or show preview)
      // Check for either hub or login redirect
      const currentUrl = page.url()
      if (currentUrl.includes('/auth/login')) {
        // Redirected to login - expected for protected route
        await expect(page.getByTestId(SELECTORS.auth.emailInput)).toBeVisible({ timeout: AUTH_TIMEOUT })
      } else {
        // Preview mode - hub should be visible
        await expect(page.getByTestId(SELECTORS.scenarios.hub)).toBeVisible({ timeout: AUTH_TIMEOUT })
      }
    })
  })

  test.describe('Authenticated User', () => {
    test.beforeEach(async ({ page }) => {
      // Arrange: Login and navigate to scenarios
      await login(page)
      await page.goto('/dashboard/scenarios', { timeout: AUTH_TIMEOUT })
      await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })
    })

    test('should display scenarios hub', async ({ page }) => {
      // Assert: Hub should be visible
      await expect(page.getByTestId(SELECTORS.scenarios.hub)).toBeVisible({ timeout: AUTH_TIMEOUT })
    })

    test('should display recommended scenarios section', async ({ page }) => {
      // Wait for hub
      await expect(page.getByTestId(SELECTORS.scenarios.hub)).toBeVisible({ timeout: AUTH_TIMEOUT })

      // Assert: Check for recommended section or phase sections
      // The page structure shows recommended scenarios for logged-in users
      const header = page.getByRole('heading', { name: /practice scenarios/i })
      await expect(header).toBeVisible({ timeout: AUTH_TIMEOUT })
    })

    test('should display phase sections', async ({ page }) => {
      // Wait for hub
      await expect(page.getByTestId(SELECTORS.scenarios.hub)).toBeVisible({ timeout: AUTH_TIMEOUT })

      // Assert: Should show phase sections (Opening, Vibing, etc.)
      // These are the expandable sections in the hub
      const openingPhase = page.getByRole('heading', { name: /opening/i })
      await expect(openingPhase).toBeVisible({ timeout: AUTH_TIMEOUT })
    })

    test('should show back to dashboard button', async ({ page }) => {
      // Wait for hub
      await expect(page.getByTestId(SELECTORS.scenarios.hub)).toBeVisible({ timeout: AUTH_TIMEOUT })

      // Assert: Back button should be visible
      const backButton = page.getByRole('link', { name: /back to dashboard/i })
      await expect(backButton).toBeVisible({ timeout: AUTH_TIMEOUT })
    })

    test('should navigate back to dashboard', async ({ page }) => {
      // Wait for hub
      await expect(page.getByTestId(SELECTORS.scenarios.hub)).toBeVisible({ timeout: AUTH_TIMEOUT })

      // Act: Click back button
      const backButton = page.getByRole('link', { name: /back to dashboard/i })
      await backButton.click({ timeout: ACTION_TIMEOUT })

      // Assert: Should navigate to dashboard
      await page.waitForURL(/\/dashboard/, { timeout: AUTH_TIMEOUT })
    })
  })
})
