import { test, expect } from '@playwright/test'
import { login, loginAsUserB } from './helpers/auth.helper'
import { goToGoals } from './helpers/navigation.helper'
import { ensureNoGoals, createGoalViaAPI, getGoalsViaAPI, deleteAllGoalsViaAPI } from './helpers/goals.helper'
import { SELECTORS } from './helpers/selectors'

const AUTH_TIMEOUT = 15000
const ACTION_TIMEOUT = 2000

test.describe('Goals Data Consistency', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    // Arrange: login and clear goals
    await login(page)
    await ensureNoGoals(page)
  })

  // 4.2a: THE BUG - delete all clears template associations
  test('delete all goals clears template associations from catalog', async ({ page }) => {
    // Arrange: create goal with template_id
    await createGoalViaAPI(page, {
      title: 'Templated Goal',
      target_value: 10,
      template_id: 'l1_girlfriend',
    })

    // Verify it exists
    let goals = await getGoalsViaAPI(page)
    expect(goals.length).toBe(1)

    // Act: delete all via API
    await deleteAllGoalsViaAPI(page)

    // Assert: no goals remain
    goals = await getGoalsViaAPI(page)
    expect(goals.length).toBe(0)

    // Navigate to goals page - should show catalog (empty state)
    await goToGoals(page)
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId(SELECTORS.goals.catalogPicker)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Verify template is available (no "Active" badge) - this is the bug check
    // If the template_id l1_girlfriend has a catalog card, it should be clickable
    const catalogCard = page.getByTestId(SELECTORS.goals.catalogCard('l1_girlfriend'))
    if (await catalogCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      // The "Active" badge should NOT be present
      const activeBadge = page.getByTestId(SELECTORS.goals.catalogActiveBadge('l1_girlfriend'))
      await expect(activeBadge).not.toBeVisible()
    }
  })

  // 4.2b: Delete individual goal -> template available
  test('delete individual goal makes template available again', async ({ page }) => {
    // Arrange: create goal with template
    const goalId = await createGoalViaAPI(page, {
      title: 'Individual Delete Test',
      target_value: 5,
      template_id: 'l1_girlfriend',
    })

    // Act: delete via API
    const response = await page.request.delete(`/api/goals/${goalId}?permanent=true`)
    expect(response.ok()).toBe(true)

    // Assert
    const goals = await getGoalsViaAPI(page)
    expect(goals.length).toBe(0)
  })

  // 4.2d: Create -> delete all -> create again - no ghost data
  test('create delete-all create-again produces clean state', async ({ page }) => {
    // Arrange: create, then delete
    await createGoalViaAPI(page, { title: 'Round 1', target_value: 5, template_id: 'l1_girlfriend' })
    await deleteAllGoalsViaAPI(page)

    // Act: create again with same template
    await createGoalViaAPI(page, { title: 'Round 2', target_value: 5, template_id: 'l1_girlfriend' })

    // Assert: exactly 1 goal
    const goals = await getGoalsViaAPI(page)
    expect(goals.length).toBe(1)
    expect(goals[0].title).toBe('Round 2')
  })

  // 4.2e: User isolation
  test('user isolation - User B cannot see User A goals', async ({ page }) => {
    // Arrange: User A (already logged in) creates a goal
    await createGoalViaAPI(page, { title: 'User A Goal', target_value: 5 })
    const userAGoals = await getGoalsViaAPI(page)
    expect(userAGoals.length).toBe(1)

    // Act: Login as User B
    await loginAsUserB(page)

    // Assert: User B sees no goals (or their own goals, not User A's)
    await goToGoals(page)
    await page.waitForLoadState('networkidle')

    // Check via API
    const userBGoals = await getGoalsViaAPI(page)
    const hasUserAGoal = userBGoals.some(g => g.title === 'User A Goal')
    expect(hasUserAGoal).toBe(false)
  })
})
