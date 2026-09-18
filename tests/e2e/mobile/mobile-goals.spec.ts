import { test, expect } from '@playwright/test'
import { SELECTORS } from '../helpers/selectors'

const AUTH_TIMEOUT = 15000
const ACTION_TIMEOUT = 5000

// Mobile-specific goals tests running on iPhone 14 + Pixel 7

test.describe('Mobile goals', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await page.request.delete('/api/goals')
  })

  test('setup wizard loads and fits mobile viewport', async ({ page }) => {
    await page.goto('/test/archive/goal-setup', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /shape your path/i })).toBeVisible({ timeout: AUTH_TIMEOUT })

    // No horizontal overflow
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(overflow).toBe(false)
  })

  test('goals hub renders on mobile with goal cards', async ({ page }) => {
    await page.request.post('/api/goals', {
      data: { title: 'Mobile Goal 1', category: 'custom', target_value: 5, life_area: 'custom' },
    })
    await page.request.post('/api/goals', {
      data: { title: 'Mobile Goal 2', category: 'custom', target_value: 3, life_area: 'custom' },
    })

    await page.goto('/test/archive/goals-hub', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle')

    await expect(page.getByTestId(SELECTORS.goals.viewSwitcher)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // No horizontal overflow
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(overflow).toBe(false)
  })

  test('goal card expand button is tappable', async ({ page }) => {
    const resp = await page.request.post('/api/goals', {
      data: { title: 'Expand Test', category: 'custom', target_value: 10, life_area: 'custom' },
    })
    const goal = await resp.json()

    await page.goto('/test/archive/goals-hub', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle')

    const goalCard = page.getByTestId(SELECTORS.goals.goalCard(goal.id))
    await expect(goalCard).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Expand
    const expandBtn = goalCard.getByRole('button', { name: /expand goal/i })
    await expandBtn.click({ timeout: ACTION_TIMEOUT })

    // +1 button visible after expand
    const incrementBtn = goalCard.getByRole('button', { name: /\+1/ })
    await expect(incrementBtn).toBeVisible({ timeout: ACTION_TIMEOUT })
  })

  test('increment button works on mobile', async ({ page }) => {
    const resp = await page.request.post('/api/goals', {
      data: { title: 'Mobile Increment', category: 'custom', target_value: 10, life_area: 'custom' },
    })
    const goal = await resp.json()

    await page.goto('/test/archive/goals-hub', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle')

    const goalCard = page.getByTestId(SELECTORS.goals.goalCard(goal.id))
    const expandBtn = goalCard.getByRole('button', { name: /expand goal/i })
    await expandBtn.click({ timeout: ACTION_TIMEOUT })

    const incrementBtn = goalCard.getByRole('button', { name: /\+1/ })
    await incrementBtn.click({ timeout: ACTION_TIMEOUT })
    await expect(incrementBtn).toBeEnabled({ timeout: AUTH_TIMEOUT })

    const goals = await (await page.request.get('/api/goals')).json()
    const arr = Array.isArray(goals) ? goals : []
    const updated = arr.find((g: { id: string }) => g.id === goal.id)
    expect(updated?.current_value).toBeGreaterThan(0)
  })

  test('create goal modal fits mobile viewport', async ({ page }) => {
    await page.request.post('/api/goals', {
      data: { title: 'Starter', category: 'custom', target_value: 5, life_area: 'custom' },
    })

    await page.goto('/test/archive/goals-hub', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle')

    await page.getByTestId(SELECTORS.goals.newGoalButton).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.goals.formModal)).toBeVisible({ timeout: ACTION_TIMEOUT })

    // Modal doesn't cause overflow
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(overflow).toBe(false)

    // Submit button visible
    await expect(page.getByTestId(SELECTORS.goals.formSubmit)).toBeVisible({ timeout: ACTION_TIMEOUT })
  })

  test('customize mode delete-all works on mobile', async ({ page }) => {
    await page.request.post('/api/goals', {
      data: { title: 'Delete Me Mobile', category: 'custom', target_value: 5, life_area: 'custom' },
    })

    await page.goto('/test/archive/goals-hub', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle')

    await page.getByTestId(SELECTORS.goals.customizeButton).click({ timeout: ACTION_TIMEOUT })
    await page.getByTestId(SELECTORS.goals.deleteAllButton).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.goals.deleteAllConfirm)).toBeVisible({ timeout: ACTION_TIMEOUT })

    // Confirm dialog fits mobile
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(overflow).toBe(false)

    await page.getByTestId(SELECTORS.goals.deleteAllConfirmYes).click({ timeout: ACTION_TIMEOUT })
    await expect(page).toHaveURL(/\/dashboard\/goals\/setup/, { timeout: AUTH_TIMEOUT })
  })

  test('view switcher options are all tappable on narrow viewport', async ({ page }) => {
    await page.request.post('/api/goals', {
      data: { title: 'View Switcher', category: 'custom', target_value: 5, life_area: 'custom' },
    })

    await page.goto('/test/archive/goals-hub', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle')

    /**
     * THIS USED TO PASS WHEN NOTHING RENDERED.
     *
     * Every step was wrapped in "skip if not visible", and there was no
     * assertion anywhere, so a screen that drew none of the four view options
     * ran the loop zero times and reported success — under the name "view
     * switcher options are all tappable". A test that cannot fail is worse than
     * no test, because the count still goes up and somebody reads it as cover.
     *
     * Individual views legitimately come and go, so the loop still tolerates a
     * missing one. What it no longer tolerates is ALL of them missing.
     */
    const views = ['today', 'hierarchy', 'tree', 'orrery'] as const
    let tapped = 0
    for (const view of views) {
      const btn = page.getByTestId(SELECTORS.goals.viewOption(view))
      const visible = await btn.isVisible().catch(() => false)
      if (!visible) continue
      await btn.click({ timeout: ACTION_TIMEOUT })
      await page.waitForTimeout(300)
      // The tap has to leave the control usable, not navigate away from it.
      await expect(btn).toBeVisible()
      tapped += 1
    }
    expect(tapped, 'no view switcher option rendered at all — the switcher is gone, not passing').toBeGreaterThan(0)
  })

  test.afterEach(async ({ page }) => {
    await page.request.delete('/api/goals').catch(() => {})
  })
})
