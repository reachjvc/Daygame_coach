import { test, expect } from '@playwright/test'
import { login, logout } from './helpers/auth.helper'

const AUTH_TIMEOUT = 15000

test.describe('Protected Routes - Unauthenticated Access', () => {
  // Note: /dashboard allows unauthenticated access (shows preview mode)
  // Only sub-routes require authentication

  test('should show preview mode on /dashboard for unauthenticated user', async ({ page }) => {
    // Arrange: Clear any existing session
    await page.context().clearCookies()

    // Act: Access dashboard without logging in
    await page.goto('/dashboard', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // Assert: Should stay on dashboard (preview mode) - not redirect
    expect(page.url()).toContain('/dashboard')
  })

  test('should redirect unauthenticated user from /dashboard/tracking to login', async ({ page }) => {
    // Arrange: Clear any existing session
    await page.context().clearCookies()

    // Act: Try to access tracking page without logging in
    await page.goto('/dashboard/tracking', { timeout: AUTH_TIMEOUT })

    // Assert: Should be redirected to login page
    await page.waitForURL(/\/auth\/login/, { timeout: AUTH_TIMEOUT })
    expect(page.url()).toContain('/auth/login')
  })

  test('should redirect unauthenticated user from /dashboard/settings to login', async ({ page }) => {
    // Arrange: Clear any existing session
    await page.context().clearCookies()

    // Act: Try to access settings page without logging in
    await page.goto('/dashboard/settings', { timeout: AUTH_TIMEOUT })

    // Assert: Should be redirected to login page
    await page.waitForURL(/\/auth\/login/, { timeout: AUTH_TIMEOUT })
    expect(page.url()).toContain('/auth/login')
  })

  test('should redirect unauthenticated user from /dashboard/qa to login', async ({ page }) => {
    // Arrange: Clear any existing session
    await page.context().clearCookies()

    // Act: Try to access QA page without logging in
    await page.goto('/dashboard/qa', { timeout: AUTH_TIMEOUT })

    // Assert: Should be redirected to login page
    await page.waitForURL(/\/auth\/login/, { timeout: AUTH_TIMEOUT })
    expect(page.url()).toContain('/auth/login')
  })

  // Note: /dashboard/inner-game and /dashboard/scenarios also have preview mode
  // so they don't redirect - only tracking, settings, and qa require auth
})

test.describe('Protected Routes - After Logout', () => {
  // Run serially to avoid session conflicts
  test.describe.configure({ mode: 'serial' })

  test('should redirect to login when accessing protected route after logout', async ({ page }) => {
    // Arrange: Login first
    await login(page)

    // Navigate to dashboard to access the logout button
    await page.goto('/dashboard', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // Verify logout button is visible before clicking
    const logoutButton = page.getByTestId('header-logout-button')
    await expect(logoutButton).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Act: Logout
    await logoutButton.click()
    await page.waitForURL(/^\/$|localhost:\d+\/?$/, { timeout: AUTH_TIMEOUT })

    // Try to navigate to a protected route (tracking requires auth)
    await page.goto('/dashboard/tracking', { timeout: AUTH_TIMEOUT })

    // Assert: Should be redirected to login page
    await page.waitForURL(/\/auth\/login/, { timeout: AUTH_TIMEOUT })
    expect(page.url()).toContain('/auth/login')
  })
})
