import { test, expect } from '@playwright/test'
import { SELECTORS } from './helpers/selectors'
import { login } from './helpers/auth.helper'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000

test.describe('Tracking Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Arrange: Login and navigate to tracking dashboard
    await login(page)
    await page.goto('/dashboard/tracking', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })
  })

  test('should display progress dashboard', async ({ page }) => {
    // Assert: Dashboard should be visible with stats
    await expect(page.getByTestId(SELECTORS.trackingDashboard.page)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.trackingDashboard.totalApproaches)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.trackingDashboard.totalNumbers)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.trackingDashboard.weekStreak)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.trackingDashboard.totalSessions)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should navigate to new session', async ({ page }) => {
    // Arrange: Verify dashboard is visible
    await expect(page.getByTestId(SELECTORS.trackingDashboard.page)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Act: Click new session link
    await page.getByTestId(SELECTORS.trackingDashboard.newSessionLink).click({ timeout: ACTION_TIMEOUT })

    // Assert: Should navigate to session page
    await page.waitForURL(/\/dashboard\/tracking\/session/, { timeout: AUTH_TIMEOUT })
  })

  test('should navigate to field report', async ({ page }) => {
    // Arrange: Verify dashboard is visible
    await expect(page.getByTestId(SELECTORS.trackingDashboard.page)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Act: Click field report link
    await page.getByTestId(SELECTORS.trackingDashboard.fieldReportLink).click({ timeout: ACTION_TIMEOUT })

    // Assert: Should navigate to field report page
    await page.waitForURL(/\/dashboard\/tracking\/report/, { timeout: AUTH_TIMEOUT })
  })

  test('should navigate to weekly review', async ({ page }) => {
    // Arrange: Verify dashboard is visible
    await expect(page.getByTestId(SELECTORS.trackingDashboard.page)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Act: Click weekly review link
    await page.getByTestId(SELECTORS.trackingDashboard.weeklyReviewLink).click({ timeout: ACTION_TIMEOUT })

    // Assert: Should navigate to weekly review page
    await page.waitForURL(/\/dashboard\/tracking\/review/, { timeout: AUTH_TIMEOUT })
  })

  test('should show quick add button', async ({ page }) => {
    // Arrange: Verify dashboard is visible
    await expect(page.getByTestId(SELECTORS.trackingDashboard.page)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Assert: Quick add button should be visible
    await expect(page.getByTestId(SELECTORS.trackingDashboard.quickAddButton)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })
})
