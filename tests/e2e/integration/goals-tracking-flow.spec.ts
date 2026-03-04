import { test, expect } from '@playwright/test'
import { SELECTORS } from '../helpers/selectors'
import { createGoalViaAPI, ensureNoGoals } from '../helpers/goals.helper'
import { createTestSessionViaAPI, ensureNoActiveSessionViaAPI, createTestApproachViaAPI } from '../helpers/auth.helper'

const AUTH_TIMEOUT = 15000

test.describe('Cross-Feature Integration: Goals + Tracking', () => {
  test.describe.configure({ mode: 'serial' })

  test('create goal → start session → log approach → end session → goal still accessible', async ({ page }) => {
    // Setup: clean state
    await ensureNoGoals(page)
    await ensureNoActiveSessionViaAPI(page)

    // Create a goal via API
    const goalId = await createGoalViaAPI(page, { title: 'Integration Goal', target_value: 10 })

    // Create and end a session with an approach
    const sessionId = await createTestSessionViaAPI(page, 'Integration Test Location')
    await createTestApproachViaAPI(page, sessionId)
    await page.request.post(`/api/tracking/session/${sessionId}/end`, { data: {} })

    // Navigate to goals page — goal should still be there
    await page.goto('/dashboard/goals', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    await expect(page.getByTestId(SELECTORS.goals.goalCard(goalId))).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByText('Integration Goal')).toBeVisible()

    // Cleanup
    await ensureNoGoals(page)
  })

  test('dashboard → session → end → tracking dashboard shows recent session', async ({ page }) => {
    await ensureNoActiveSessionViaAPI(page)

    // Navigate from dashboard to session page
    await page.goto('/dashboard', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // Click tracking link
    const trackingLink = page.getByTestId(SELECTORS.dashboard.trackingLink)
    await expect(trackingLink).toBeVisible({ timeout: AUTH_TIMEOUT })
    await trackingLink.click()
    await page.waitForURL(/\/dashboard\/tracking/, { timeout: AUTH_TIMEOUT })

    // Create a session via API, add an approach, end it
    const sessionId = await createTestSessionViaAPI(page, 'Dashboard Flow Location')
    await createTestApproachViaAPI(page, sessionId)
    await page.request.post(`/api/tracking/session/${sessionId}/end`, { data: {} })

    // Navigate to tracking dashboard
    await page.goto('/dashboard/tracking', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // Tracking dashboard should show stats
    await expect(page.getByTestId(SELECTORS.trackingDashboard.page)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.trackingDashboard.totalSessions)).toBeVisible()
  })

  test('dashboard hub cards link to correct pages', async ({ page }) => {
    await page.goto('/dashboard', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // Verify core navigation cards are present and clickable
    await expect(page.getByTestId(SELECTORS.dashboard.scenariosLink)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.dashboard.trackingLink)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.dashboard.innerGameLink)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.dashboard.qaLink)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Click scenarios and verify navigation
    await page.getByTestId(SELECTORS.dashboard.scenariosLink).click()
    await expect(page).toHaveURL(/\/dashboard\/scenarios/, { timeout: AUTH_TIMEOUT })

    // Go back and verify tracking link
    await page.goto('/dashboard', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })
    await page.getByTestId(SELECTORS.dashboard.trackingLink).click()
    await expect(page).toHaveURL(/\/dashboard\/tracking/, { timeout: AUTH_TIMEOUT })
  })
})
