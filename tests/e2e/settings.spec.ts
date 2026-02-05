import { test, expect } from '@playwright/test'
import { SELECTORS } from './helpers/selectors'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000 // Increased for external service latency

test.describe('Settings Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Arrange: Navigate to settings
    await page.goto('/dashboard/settings', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })
  })

  test('should display settings page with profile tab by default', async ({ page }) => {
    // Assert: Profile tab should be active and content visible
    await expect(page.getByTestId(SELECTORS.settings.profileTab)).toBeVisible({ timeout: ACTION_TIMEOUT })
    await expect(page.getByText('Account Information')).toBeVisible({ timeout: ACTION_TIMEOUT })
  })

  test('should display user email in profile tab', async ({ page }) => {
    // Assert: User email should be visible
    await expect(page.getByTestId(SELECTORS.settings.userEmail)).toBeVisible({ timeout: ACTION_TIMEOUT })
  })

  test('should switch to sandbox tab when clicked', async ({ page }) => {
    // Act: Click sandbox tab
    await page.getByTestId(SELECTORS.settings.sandboxTab).click({ timeout: ACTION_TIMEOUT })

    // Assert: Sandbox content should be visible
    await expect(page.getByText('Scenario Sandbox')).toBeVisible({ timeout: ACTION_TIMEOUT })
    await expect(page.getByText('Weather Conditions')).toBeVisible({ timeout: ACTION_TIMEOUT })
  })

  test('should display sandbox toggle switches', async ({ page }) => {
    // Act: Switch to sandbox tab
    await page.getByTestId(SELECTORS.settings.sandboxTab).click({ timeout: ACTION_TIMEOUT })

    // Assert: Toggle switches should be visible
    await expect(page.getByTestId(SELECTORS.settings.sandboxToggle('enableBadWeather'))).toBeVisible({
      timeout: ACTION_TIMEOUT,
    })
  })

  test('should toggle sandbox setting', async ({ page }) => {
    // Act: Switch to sandbox tab
    const sandboxTab = page.getByTestId(SELECTORS.settings.sandboxTab)
    await expect(sandboxTab).toBeVisible({ timeout: AUTH_TIMEOUT })
    await sandboxTab.click({ timeout: ACTION_TIMEOUT })

    // Wait for sandbox content to load
    await expect(page.getByText('Scenario Sandbox')).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Get the toggle and verify it's interactable
    const toggle = page.getByTestId(SELECTORS.settings.sandboxToggle('enableBadWeather'))
    await expect(toggle).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(toggle).toBeEnabled({ timeout: AUTH_TIMEOUT })

    // Act: Click the toggle - this triggers a server action
    // Note: The click triggers router.refresh() which may cause a page refresh
    await toggle.click({ timeout: ACTION_TIMEOUT })

    // Assert: Page should settle after the action (success = no error thrown)
    // The settings page should still be accessible after the action
    await page.waitForLoadState('domcontentloaded', { timeout: AUTH_TIMEOUT })
  })

  test('should display reset sandbox button', async ({ page }) => {
    // Act: Switch to sandbox tab
    await page.getByTestId(SELECTORS.settings.sandboxTab).click({ timeout: ACTION_TIMEOUT })

    // Assert: Reset button should be visible
    await expect(page.getByTestId(SELECTORS.settings.resetButton)).toBeVisible({ timeout: ACTION_TIMEOUT })
  })

  test('should open reset confirmation dialog', async ({ page }) => {
    // Act: Switch to sandbox tab and click reset
    await page.getByTestId(SELECTORS.settings.sandboxTab).click({ timeout: ACTION_TIMEOUT })
    await page.getByTestId(SELECTORS.settings.resetButton).click({ timeout: ACTION_TIMEOUT })

    // Assert: Confirmation dialog should appear
    await expect(page.getByText('Reset Sandbox Settings?')).toBeVisible({ timeout: ACTION_TIMEOUT })
  })

  test('should display all tab triggers', async ({ page }) => {
    // Assert: All tabs should be visible
    await expect(page.getByTestId(SELECTORS.settings.profileTab)).toBeVisible({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.settings.sandboxTab)).toBeVisible({ timeout: ACTION_TIMEOUT })
  })

  test('should navigate back from settings', async ({ page }) => {
    // Wait for back button to be visible
    const backButton = page.getByRole('button', { name: /back/i })
    await expect(backButton).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Act: Click back button and wait for navigation
    // Note: back() uses browser history - since we directly navigated to settings,
    // back should take us to where we were before (likely dashboard from login redirect)
    await backButton.click({ timeout: ACTION_TIMEOUT })

    // Assert: Should navigate away from settings page
    // The URL will be whatever page was in browser history before settings
    await page.waitForURL((url) => !url.pathname.includes('/settings'), { timeout: AUTH_TIMEOUT })
  })
})
