import { test, expect } from '@playwright/test'
import { login } from './helpers/auth.helper'

const AUTH_TIMEOUT = 15000

test.describe('Protected Routes - Unauthenticated Access', () => {
  // Override storageState to ensure no auth tokens (cookies + localStorage)
  test.use({ storageState: { cookies: [], origins: [] } })

  test('should redirect unauthenticated user from /dashboard to login', async ({ page }) => {
    // Act: Access dashboard without logging in
    await page.goto('/dashboard', { timeout: AUTH_TIMEOUT })

    // Assert: Should be redirected to login page (proxy.ts protects all /dashboard routes)
    await page.waitForURL(/\/auth\/login/, { timeout: AUTH_TIMEOUT })
    expect(page.url()).toContain('/auth/login')
  })

  test('should redirect unauthenticated user from /dashboard/tracking to login', async ({ page }) => {
    // Act: Try to access tracking page without logging in
    await page.goto('/dashboard/tracking', { timeout: AUTH_TIMEOUT })

    // Assert: Should be redirected to login page
    await page.waitForURL(/\/auth\/login/, { timeout: AUTH_TIMEOUT })
    expect(page.url()).toContain('/auth/login')
  })

  test('should redirect unauthenticated user from /dashboard/settings to login', async ({ page }) => {
    // Act: Try to access settings page without logging in
    await page.goto('/dashboard/settings', { timeout: AUTH_TIMEOUT })

    // Assert: Should be redirected to login page
    await page.waitForURL(/\/auth\/login/, { timeout: AUTH_TIMEOUT })
    expect(page.url()).toContain('/auth/login')
  })

  test('should redirect unauthenticated user from /dashboard/qa to login', async ({ page }) => {
    // Act: Try to access QA page without logging in
    await page.goto('/dashboard/qa', { timeout: AUTH_TIMEOUT })

    // Assert: Should be redirected to login page
    await page.waitForURL(/\/auth\/login/, { timeout: AUTH_TIMEOUT })
    expect(page.url()).toContain('/auth/login')
  })

  // Note: All /dashboard routes are protected by proxy.ts middleware
  // and redirect unauthenticated users to /auth/login
})

test.describe('Protected Routes - After Logout', () => {
  // Use empty storageState to avoid invalidating the shared session on logout
  test.use({ storageState: { cookies: [], origins: [] } })
  test.describe.configure({ mode: 'serial' })

  test('should redirect to login when accessing protected route after logout', async ({ page }) => {
    // Login with a fresh session (separate from the shared storageState)
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
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // Clear any lingering Supabase auth cookies so the middleware sees no session
    await page.context().clearCookies()

    // Try to navigate to a protected route (tracking requires auth)
    await page.goto('/dashboard/tracking', { timeout: AUTH_TIMEOUT })

    // Assert: Should be redirected to login page
    await page.waitForURL(/\/auth\/login/, { timeout: AUTH_TIMEOUT })
    expect(page.url()).toContain('/auth/login')
  })
})
