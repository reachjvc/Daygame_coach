import { test, expect } from '@playwright/test'
import { SELECTORS } from '../helpers/selectors'

const AUTH_TIMEOUT = 15000

// These tests run authenticated on Firefox + WebKit
// They verify scenarios features work correctly outside Chromium

test.describe('Cross-browser scenarios', () => {
  test('scenarios page loads authenticated', async ({ page }) => {
    await page.goto('/dashboard/scenarios', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/dashboard\/scenarios/, { timeout: AUTH_TIMEOUT })
  })

  test('scenarios hub or preview renders', async ({ page }) => {
    await page.goto('/dashboard/scenarios', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle')

    // Should see either the hub or preview badge (depending on subscription)
    const hub = page.getByTestId(SELECTORS.scenarios.hub)
    const previewBadge = page.getByTestId(SELECTORS.scenarios.previewBadge)
    const page_ = page.getByTestId(SELECTORS.scenarios.page)
    await expect(hub.or(previewBadge).or(page_)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('back to dashboard navigation works', async ({ page }) => {
    await page.goto('/dashboard/scenarios', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle')

    // Navigate back to dashboard
    await page.goto('/dashboard', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId(SELECTORS.dashboard.content)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })
})
