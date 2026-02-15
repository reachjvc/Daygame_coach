import { test, expect } from '@playwright/test'
import { login } from './helpers/auth.helper'
import { goToGoals } from './helpers/navigation.helper'
import { ensureNoGoals, createGoalViaAPI, createGoalTreeViaAPI, getGoalsViaAPI, deleteAllGoalsViaAPI } from './helpers/goals.helper'
import { SELECTORS } from './helpers/selectors'

const AUTH_TIMEOUT = 15000
const ACTION_TIMEOUT = 2000

test.describe('Goals Hub', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    // Arrange: login and clear goals
    await login(page)
    await ensureNoGoals(page)
  })

  // 4.1a: Empty state shows catalog picker
  test('empty state shows catalog picker', async ({ page }) => {
    // Arrange: no goals (ensureNoGoals in beforeEach)

    // Act
    await goToGoals(page)
    await page.waitForLoadState('networkidle')

    // Assert
    await expect(page.getByTestId(SELECTORS.goals.catalogPicker)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  // 4.1b: Create goal via form modal
  test('create goal via form modal', async ({ page }) => {
    // Arrange: create one goal so we're not in empty state
    await createGoalViaAPI(page, { title: 'Starter Goal', target_value: 5 })
    await goToGoals(page)
    await page.waitForLoadState('networkidle')

    // Act: click New Goal
    await page.getByTestId(SELECTORS.goals.newGoalButton).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.goals.formModal)).toBeVisible({ timeout: ACTION_TIMEOUT })

    // Fill form
    await page.getByTestId(SELECTORS.goals.formTitle).fill('My Test Goal', { timeout: ACTION_TIMEOUT })

    // Submit and wait for dialog to close (indicates success)
    await page.getByTestId(SELECTORS.goals.formSubmit).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.goals.formModal)).not.toBeVisible({ timeout: AUTH_TIMEOUT })

    // Assert: goal visible via API
    const goals = await getGoalsViaAPI(page)
    expect(goals.some(g => g.title === 'My Test Goal')).toBe(true)
  })

  // 4.1d: Switch daily/strategic views
  test('switch between daily and strategic views', async ({ page }) => {
    // Arrange
    await createGoalViaAPI(page, { title: 'View Test Goal', target_value: 5 })
    await goToGoals(page)
    await page.waitForLoadState('networkidle')

    // Act & Assert: view switcher is visible and clickable
    await expect(page.getByTestId(SELECTORS.goals.viewSwitcher)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Click strategic view
    await page.getByTestId(SELECTORS.goals.viewOption('strategic')).click({ timeout: ACTION_TIMEOUT })
    await page.waitForLoadState('networkidle')

    // Click back to daily
    await page.getByTestId(SELECTORS.goals.viewOption('daily')).click({ timeout: ACTION_TIMEOUT })
    await page.waitForLoadState('networkidle')
  })

  // 4.1e: Increment goal progress
  test('increment goal progress', async ({ page }) => {
    // Arrange
    await createGoalViaAPI(page, { title: 'Increment Test', target_value: 5 })
    await goToGoals(page)
    await page.waitForLoadState('networkidle')

    // Get the goal ID
    const goals = await getGoalsViaAPI(page)
    const goal = goals.find(g => g.title === 'Increment Test')
    expect(goal).toBeDefined()

    // Act: find the goal card and expand it
    const goalCard = page.getByTestId(SELECTORS.goals.goalCard(goal!.id))
    await expect(goalCard).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Expand the goal card to see increment buttons
    const expandButton = goalCard.getByRole('button', { name: /expand goal/i })
    await expandButton.click({ timeout: ACTION_TIMEOUT })

    // Find and click the +1 increment button
    const incrementButton = goalCard.getByRole('button', { name: /\+1/ })
    await expect(incrementButton).toBeVisible({ timeout: ACTION_TIMEOUT })
    await incrementButton.click({ timeout: ACTION_TIMEOUT })

    // Wait for increment API to complete (button re-enables after loading)
    await expect(incrementButton).toBeEnabled({ timeout: AUTH_TIMEOUT })

    // Assert: progress updated
    const updatedGoals = await getGoalsViaAPI(page)
    const updated = updatedGoals.find(g => g.id === goal!.id) as unknown as { current_value: number } | undefined
    expect(updated?.current_value).toBeGreaterThan(0)
  })

  // 4.1f: Delete all goals via UI — flat goals
  test('delete all removes every goal (flat)', async ({ page }) => {
    // Arrange: create multiple flat goals
    await createGoalViaAPI(page, { title: 'Goal Alpha', target_value: 5 })
    await createGoalViaAPI(page, { title: 'Goal Beta', target_value: 3 })
    await createGoalViaAPI(page, { title: 'Goal Gamma', target_value: 7 })
    await goToGoals(page)
    await page.waitForLoadState('networkidle')

    // Act: Customize → Delete All → Confirm
    await page.getByTestId(SELECTORS.goals.customizeButton).click({ timeout: ACTION_TIMEOUT })
    await page.getByTestId(SELECTORS.goals.deleteAllButton).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.goals.deleteAllConfirm)).toBeVisible({ timeout: ACTION_TIMEOUT })
    await page.getByTestId(SELECTORS.goals.deleteAllConfirmYes).click({ timeout: ACTION_TIMEOUT })

    // Assert: wait for empty state to appear in UI
    await expect(page.getByTestId(SELECTORS.goals.catalogPicker)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Assert: API confirms zero goals
    const goals = await getGoalsViaAPI(page)
    expect(goals).toHaveLength(0)
  })

  // 4.1f2: Delete all goals via UI — hierarchical tree (parent→child FK cascade)
  test('delete all removes every goal (hierarchical tree)', async ({ page }) => {
    // Arrange: create a full L0→L1→L2→L3 tree
    await createGoalTreeViaAPI(page)
    const before = await getGoalsViaAPI(page)
    expect(before.length).toBeGreaterThanOrEqual(5)

    await goToGoals(page)
    await page.waitForLoadState('networkidle')

    // Act: Customize → Delete All → Confirm
    await page.getByTestId(SELECTORS.goals.customizeButton).click({ timeout: ACTION_TIMEOUT })
    await page.getByTestId(SELECTORS.goals.deleteAllButton).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.goals.deleteAllConfirm)).toBeVisible({ timeout: ACTION_TIMEOUT })
    await page.getByTestId(SELECTORS.goals.deleteAllConfirmYes).click({ timeout: ACTION_TIMEOUT })

    // Assert: wait for empty state to appear in UI
    await expect(page.getByTestId(SELECTORS.goals.catalogPicker)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Assert: API confirms zero goals — not a single orphan child
    const after = await getGoalsViaAPI(page)
    expect(after).toHaveLength(0)
  })

  // 4.1f3: Delete all via API — verify no survivors
  test('delete all API returns correct count and leaves zero goals', async ({ page }) => {
    // Arrange: create flat + tree goals
    await createGoalViaAPI(page, { title: 'Standalone Goal', target_value: 1 })
    await createGoalTreeViaAPI(page)
    const before = await getGoalsViaAPI(page)
    const expectedCount = before.length

    // Act: delete all via API
    const deletedCount = await deleteAllGoalsViaAPI(page)

    // Assert: reported count matches what existed
    expect(deletedCount).toBe(expectedCount)

    // Assert: truly zero goals remain
    const after = await getGoalsViaAPI(page)
    expect(after).toHaveLength(0)
  })

  // 4.1g: Customize mode toggle
  test('customize mode toggle', async ({ page }) => {
    // Arrange
    await createGoalViaAPI(page, { title: 'Customize Test', target_value: 5 })
    await goToGoals(page)
    await page.waitForLoadState('networkidle')

    // Act: click Customize
    const customizeButton = page.getByTestId(SELECTORS.goals.customizeButton)
    await expect(customizeButton).toBeVisible({ timeout: AUTH_TIMEOUT })
    await customizeButton.click({ timeout: ACTION_TIMEOUT })

    // Assert: Delete All button appears
    await expect(page.getByTestId(SELECTORS.goals.deleteAllButton)).toBeVisible({ timeout: ACTION_TIMEOUT })

    // Act: click Done (same button toggles)
    await customizeButton.click({ timeout: ACTION_TIMEOUT })

    // Assert: Delete All button gone
    await expect(page.getByTestId(SELECTORS.goals.deleteAllButton)).not.toBeVisible({ timeout: ACTION_TIMEOUT })
  })
})
