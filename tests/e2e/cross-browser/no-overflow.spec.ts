import { test, expect } from '@playwright/test'

const AUTH_TIMEOUT = 15000

// These tests run on multiple browsers/viewports to verify no horizontal overflow
// Overflow = horizontal scrollbar appearing, content wider than viewport

const BETA_PAGES = [
  { name: 'Dashboard', path: '/dashboard' },
  // Goals may redirect to /dashboard/goals/setup — both are tested
  { name: 'Goals (setup)', path: '/dashboard/goals/setup' },
  { name: 'Goals Setup', path: '/dashboard/goals/setup' },
  { name: 'Tracking', path: '/dashboard/tracking' },
  { name: 'Tracking History', path: '/dashboard/tracking/history' },
  { name: 'Scenarios', path: '/dashboard/scenarios' },
  { name: 'Settings', path: '/dashboard/settings' },
]

test.describe('No horizontal overflow on beta pages', () => {
  for (const { name, path } of BETA_PAGES) {
    test(`${name} (${path}) has no horizontal overflow`, async ({ page }) => {
      await page.goto(path, { timeout: AUTH_TIMEOUT })
      await page.waitForLoadState('networkidle')

      // Wait a bit for any dynamic content
      await page.waitForTimeout(500)

      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth
      })

      expect(overflow, `${name} has horizontal overflow`).toBe(false)
    })
  }
})
