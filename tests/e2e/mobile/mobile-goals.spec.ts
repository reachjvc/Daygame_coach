import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth.helper'
import { goToGoals } from '../helpers/navigation.helper'
import { ensureNoGoals, createGoalViaAPI, getGoalsViaAPI } from '../helpers/goals.helper'
import { SELECTORS } from '../helpers/selectors'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000

test.describe('Mobile Goals', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await login(page)
    await ensureNoGoals(page)
  })

  test('goals page loads on mobile viewport', async ({ page }) => {
    await createGoalViaAPI(page, { title: 'Mobile Goal', target_value: 5 })
    await goToGoals(page)
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // Goal card should be visible
    const goals = await getGoalsViaAPI(page)
    const goal = goals.find(g => g.title === 'Mobile Goal')
    expect(goal).toBeDefined()

    const goalCard = page.getByTestId(SELECTORS.goals.goalCard(goal!.id))
    await expect(goalCard).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('goal creation modal works on small viewport', async ({ page }) => {
    // Need at least one goal to exit empty state
    await createGoalViaAPI(page, { title: 'Starter', target_value: 1 })
    await goToGoals(page)
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // Open new goal modal
    await page.getByTestId(SELECTORS.goals.newGoalButton).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.goals.formModal)).toBeVisible({ timeout: ACTION_TIMEOUT })

    // Fill form on mobile
    await page.getByTestId(SELECTORS.goals.formTitle).fill('Mobile Created Goal', { timeout: ACTION_TIMEOUT })

    // Submit
    await page.getByTestId(SELECTORS.goals.formSubmit).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.goals.formModal)).not.toBeVisible({ timeout: AUTH_TIMEOUT })

    // Verify goal created
    const goals = await getGoalsViaAPI(page)
    expect(goals.some(g => g.title === 'Mobile Created Goal')).toBe(true)
  })

  test('empty state catalog picker is usable on mobile', async ({ page }) => {
    await goToGoals(page)
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // Catalog picker should be visible in empty state
    await expect(page.getByTestId(SELECTORS.goals.catalogPicker)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('view switcher is accessible on mobile', async ({ page }) => {
    await createGoalViaAPI(page, { title: 'Switcher Test', target_value: 3 })
    await goToGoals(page)
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // View switcher should be visible and interactive
    await expect(page.getByTestId(SELECTORS.goals.viewSwitcher)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Switch views
    await page.getByTestId(SELECTORS.goals.viewOption('strategic')).click({ timeout: ACTION_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    await page.getByTestId(SELECTORS.goals.viewOption('daily')).click({ timeout: ACTION_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })
  })
})
