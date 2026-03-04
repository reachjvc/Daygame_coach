import { test, expect } from '@playwright/test'
import { SELECTORS } from '../helpers/selectors'

const AUTH_TIMEOUT = 15000
const ACTION_TIMEOUT = 5000

// These tests run authenticated on Firefox + WebKit
// They verify goals features work correctly outside Chromium

test.describe('Cross-browser goals', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    // Clean goals state
    await page.request.delete('/api/goals')
  })

  test('setup wizard renders and path selection works', async ({ page }) => {
    await page.goto('/dashboard/goals/setup', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle')

    // Step 1: Direction step visible
    await expect(page.getByRole('heading', { name: /shape your path/i })).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('goals hub loads with goals present', async ({ page }) => {
    // Create a goal first
    await page.request.post('/api/goals', {
      data: { title: 'Firefox/Safari Goal', category: 'custom', target_value: 5, life_area: 'custom' },
    })

    await page.goto('/dashboard/goals', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle')

    // Should see the goals page (not redirect to setup)
    await expect(page.getByTestId(SELECTORS.goals.viewSwitcher)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('create goal via form modal', async ({ page }) => {
    // Create initial goal so hub loads
    await page.request.post('/api/goals', {
      data: { title: 'Initial Goal', category: 'custom', target_value: 5, life_area: 'custom' },
    })

    await page.goto('/dashboard/goals', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle')

    // Open form
    await page.getByTestId(SELECTORS.goals.newGoalButton).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.goals.formModal)).toBeVisible({ timeout: ACTION_TIMEOUT })

    // Fill and submit
    await page.getByTestId(SELECTORS.goals.formTitle).fill('Cross-browser Modal Goal', { timeout: ACTION_TIMEOUT })
    await page.getByTestId(SELECTORS.goals.formSubmit).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.goals.formModal)).not.toBeVisible({ timeout: AUTH_TIMEOUT })

    // Verify via API
    const resp = await page.request.get('/api/goals')
    const goals = await resp.json()
    const arr = Array.isArray(goals) ? goals : []
    expect(arr.some((g: { title: string }) => g.title === 'Cross-browser Modal Goal')).toBe(true)
  })

  test('view switcher toggles between views', async ({ page }) => {
    await page.request.post('/api/goals', {
      data: { title: 'View Test', category: 'custom', target_value: 5, life_area: 'custom' },
    })

    await page.goto('/dashboard/goals', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle')

    const switcher = page.getByTestId(SELECTORS.goals.viewSwitcher)
    await expect(switcher).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Switch to hierarchy view
    await page.getByTestId(SELECTORS.goals.viewOption('hierarchy')).click({ timeout: ACTION_TIMEOUT })
    await page.waitForLoadState('networkidle')

    // Switch back to today
    await page.getByTestId(SELECTORS.goals.viewOption('today')).click({ timeout: ACTION_TIMEOUT })
    await page.waitForLoadState('networkidle')
  })

  test('increment goal progress', async ({ page }) => {
    const createResp = await page.request.post('/api/goals', {
      data: { title: 'Increment XBrowser', category: 'custom', target_value: 10, life_area: 'custom' },
    })
    const created = await createResp.json()

    await page.goto('/dashboard/goals', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle')

    const goalCard = page.getByTestId(SELECTORS.goals.goalCard(created.id))
    await expect(goalCard).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Expand and increment
    const expandButton = goalCard.getByRole('button', { name: /expand goal/i })
    await expandButton.click({ timeout: ACTION_TIMEOUT })
    const incrementBtn = goalCard.getByRole('button', { name: /\+1/ })
    await expect(incrementBtn).toBeVisible({ timeout: ACTION_TIMEOUT })
    await incrementBtn.click({ timeout: ACTION_TIMEOUT })
    await expect(incrementBtn).toBeEnabled({ timeout: AUTH_TIMEOUT })

    // Verify via API
    const resp = await page.request.get('/api/goals')
    const goals = await resp.json()
    const arr = Array.isArray(goals) ? goals : []
    const updated = arr.find((g: { id: string }) => g.id === created.id)
    expect(updated?.current_value).toBeGreaterThan(0)
  })

  test('customize mode shows delete-all option', async ({ page }) => {
    await page.request.post('/api/goals', {
      data: { title: 'Customize Test', category: 'custom', target_value: 5, life_area: 'custom' },
    })

    await page.goto('/dashboard/goals', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle')

    await page.getByTestId(SELECTORS.goals.customizeButton).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.goals.deleteAllButton)).toBeVisible({ timeout: ACTION_TIMEOUT })

    // Toggle off
    await page.getByTestId(SELECTORS.goals.customizeButton).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.goals.deleteAllButton)).not.toBeVisible({ timeout: ACTION_TIMEOUT })
  })

  test('delete all goals redirects to setup', async ({ page }) => {
    await page.request.post('/api/goals', {
      data: { title: 'Delete Me', category: 'custom', target_value: 5, life_area: 'custom' },
    })

    await page.goto('/dashboard/goals', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle')

    await page.getByTestId(SELECTORS.goals.customizeButton).click({ timeout: ACTION_TIMEOUT })
    await page.getByTestId(SELECTORS.goals.deleteAllButton).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.goals.deleteAllConfirm)).toBeVisible({ timeout: ACTION_TIMEOUT })
    await page.getByTestId(SELECTORS.goals.deleteAllConfirmYes).click({ timeout: ACTION_TIMEOUT })

    await expect(page).toHaveURL(/\/dashboard\/goals\/setup/, { timeout: AUTH_TIMEOUT })
  })

  test.afterEach(async ({ page }) => {
    // Clean up
    await page.request.delete('/api/goals').catch(() => {})
  })
})
