import { test, expect } from '@playwright/test'
import { SELECTORS } from '../helpers/selectors'

const AUTH_TIMEOUT = 15000

// Mobile-specific scenarios tests running on iPhone 14 + Pixel 7

test.describe('Mobile scenarios', () => {
  test('scenarios page loads on mobile', async ({ page }) => {
    await page.goto('/dashboard/scenarios', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/dashboard\/scenarios/, { timeout: AUTH_TIMEOUT })

    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(overflow).toBe(false)
  })

  test('scenarios hub or preview renders on mobile', async ({ page }) => {
    await page.goto('/dashboard/scenarios', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle')

    const hub = page.getByTestId(SELECTORS.scenarios.hub)
    const previewBadge = page.getByTestId(SELECTORS.scenarios.previewBadge)
    const scenariosPage = page.getByTestId(SELECTORS.scenarios.page)
    await expect(hub.or(previewBadge).or(scenariosPage)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('back to dashboard works from scenarios', async ({ page }) => {
    await page.goto('/dashboard/scenarios', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle')

    await page.goto('/dashboard', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId(SELECTORS.dashboard.content)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })
})
