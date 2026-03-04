import { test, expect } from '@playwright/test'
import { SELECTORS } from '../helpers/selectors'

const AUTH_TIMEOUT = 15000
const NAV_TIMEOUT = 15000

// These tests run on Firefox + WebKit (authenticated via storageState)
// They verify auth flows work correctly outside Chromium

test.describe('Cross-browser auth flows', () => {
  test('authenticated dashboard loads with content', async ({ page }) => {
    await page.goto('/dashboard', { timeout: NAV_TIMEOUT })
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId(SELECTORS.dashboard.content)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('goals page loads authenticated (hub or setup)', async ({ page }) => {
    await page.goto('/dashboard/goals', { timeout: NAV_TIMEOUT })
    await page.waitForLoadState('networkidle')

    // Should land on goals hub or setup wizard (depending on goal count)
    await expect(page).toHaveURL(/\/dashboard\/goals/, { timeout: AUTH_TIMEOUT })
  })

  test('API call with auth cookie succeeds (create + read goal)', async ({ page }) => {
    // Clean state
    await page.request.delete('/api/goals')

    // Create via API
    const createResp = await page.request.post('/api/goals', {
      data: {
        title: 'Cross-browser Test Goal',
        category: 'custom',
        target_value: 5,
        life_area: 'custom',
      },
    })
    expect(createResp.ok()).toBe(true)

    // Read via API
    const getResp = await page.request.get('/api/goals')
    expect(getResp.ok()).toBe(true)
    const goals = await getResp.json()
    const arr = Array.isArray(goals) ? goals : []
    expect(arr.some((g: { title: string }) => g.title === 'Cross-browser Test Goal')).toBe(true)

    // Cleanup
    await page.request.delete('/api/goals')
  })

  test('page refresh maintains session', async ({ page }) => {
    await page.goto('/dashboard', { timeout: NAV_TIMEOUT })
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId(SELECTORS.dashboard.content)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Refresh
    await page.reload({ timeout: NAV_TIMEOUT })
    await page.waitForLoadState('networkidle')

    // Still authenticated
    await expect(page.getByTestId(SELECTORS.dashboard.content)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('navigation between authenticated pages preserves session', async ({ page }) => {
    // Dashboard
    await page.goto('/dashboard', { timeout: NAV_TIMEOUT })
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId(SELECTORS.dashboard.content)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Settings
    await page.goto('/dashboard/settings', { timeout: NAV_TIMEOUT })
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/dashboard\/settings/, { timeout: AUTH_TIMEOUT })

    // Tracking
    await page.goto('/dashboard/tracking', { timeout: NAV_TIMEOUT })
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId(SELECTORS.trackingDashboard.page)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('tracking API works with auth cookies', async ({ page }) => {
    await page.goto('/dashboard', { timeout: NAV_TIMEOUT })

    // Fetch tracking stats
    const resp = await page.request.get('/api/tracking/stats')
    expect(resp.ok()).toBe(true)
  })

  test('scenarios page loads authenticated', async ({ page }) => {
    await page.goto('/dashboard/scenarios', { timeout: NAV_TIMEOUT })
    await page.waitForLoadState('networkidle')

    // Should see scenarios page (not login redirect)
    await expect(page).toHaveURL(/\/dashboard\/scenarios/, { timeout: AUTH_TIMEOUT })
  })
})
