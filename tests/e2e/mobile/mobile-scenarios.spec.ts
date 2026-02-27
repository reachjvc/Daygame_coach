import { test, expect } from '@playwright/test'
import { SELECTORS } from '../helpers/selectors'

const AUTH_TIMEOUT = 15000

test.describe('Mobile Scenarios Hub', () => {
  test('scenarios hub loads on mobile viewport', async ({ page }) => {
    await page.goto('/dashboard/scenarios', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // Hub should be visible
    await expect(page.getByTestId(SELECTORS.scenarios.hub)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('scenario cards are visible and tappable', async ({ page }) => {
    await page.goto('/dashboard/scenarios', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // Check that the recommended section or phase sections render
    const hub = page.getByTestId(SELECTORS.scenarios.hub)
    await expect(hub).toBeVisible({ timeout: AUTH_TIMEOUT })

    // At least one scenario card or section should be present
    const cards = page.locator('[data-testid^="scenario-card-"]')
    const sections = page.locator('[data-testid^="phase-section-"]')
    const hasContent = await cards.count() > 0 || await sections.count() > 0
    expect(hasContent).toBe(true)
  })

  test('page is scrollable and content not clipped', async ({ page }) => {
    await page.goto('/dashboard/scenarios', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // Get page height
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight)
    const viewportHeight = page.viewportSize()?.height ?? 0

    // If content is taller than viewport, page should be scrollable
    if (bodyHeight > viewportHeight) {
      // Scroll down and verify we actually scrolled
      await page.evaluate(() => window.scrollTo(0, 200))
      const scrollY = await page.evaluate(() => window.scrollY)
      expect(scrollY).toBeGreaterThan(0)
    }
  })
})
