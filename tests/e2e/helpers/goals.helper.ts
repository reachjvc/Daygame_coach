import { Page } from '@playwright/test'

const ACTION_TIMEOUT = 2000

/**
 * Creates a goal via API. Returns the goal ID.
 * Throws if creation fails.
 */
export async function createGoalViaAPI(
  page: Page,
  goal: {
    title: string
    category?: string
    target_value?: number
    life_area?: string
    template_id?: string
  }
): Promise<string> {
  const response = await page.request.post('/api/goals', {
    data: {
      title: goal.title,
      category: goal.category ?? goal.life_area ?? 'custom',
      target_value: goal.target_value ?? 10,
      life_area: goal.life_area ?? 'custom',
      ...(goal.template_id && { template_id: goal.template_id }),
    },
  })

  if (!response.ok()) {
    const errorText = await response.text()
    throw new Error(`Failed to create goal: ${response.status()} - ${errorText}`)
  }

  const data = await response.json()
  return data.id
}

/**
 * Deletes all goals via API. Returns the count of deleted goals.
 * Throws if deletion fails.
 */
export async function deleteAllGoalsViaAPI(page: Page): Promise<number> {
  const response = await page.request.delete('/api/goals')

  if (!response.ok()) {
    const errorText = await response.text()
    throw new Error(`Failed to delete all goals: ${response.status()} - ${errorText}`)
  }

  const data = await response.json()
  return data.deleted ?? 0
}

/**
 * Gets all goals via API. Returns array of goals.
 * Throws if request fails.
 */
export async function getGoalsViaAPI(
  page: Page
): Promise<Array<{ id: string; template_id: string | null; title: string }>> {
  const response = await page.request.get('/api/goals')

  if (!response.ok()) {
    const errorText = await response.text()
    throw new Error(`Failed to get goals: ${response.status()} - ${errorText}`)
  }

  const data = await response.json()
  // API returns plain array
  return Array.isArray(data) ? data : []
}

/**
 * Creates a hierarchical goal tree via the batch API.
 * Returns an array of created goal objects.
 * Throws if creation fails.
 */
export async function createGoalTreeViaAPI(
  page: Page
): Promise<Array<{ id: string; title: string; parent_goal_id: string | null }>> {
  const response = await page.request.post('/api/goals/batch', {
    data: {
      goals: [
        { _tempId: 'l0', _tempParentId: null, title: 'L0 Dream', category: 'dating', target_value: 1, goal_level: 0 },
        { _tempId: 'l1', _tempParentId: 'l0', title: 'L1 Outcome', category: 'dating', target_value: 1, goal_level: 1 },
        { _tempId: 'l2', _tempParentId: 'l1', title: 'L2 System', category: 'dating', target_value: 10, goal_level: 2 },
        { _tempId: 'l3a', _tempParentId: 'l2', title: 'L3 Action A', category: 'dating', target_value: 5, goal_level: 3 },
        { _tempId: 'l3b', _tempParentId: 'l2', title: 'L3 Action B', category: 'dating', target_value: 3, goal_level: 3 },
      ],
    },
  })

  if (!response.ok()) {
    const errorText = await response.text()
    throw new Error(`Failed to create goal tree: ${response.status()} - ${errorText}`)
  }

  return response.json()
}

/**
 * Ensures no goals exist. Deletes all and verifies.
 * Throws if state is not clean after deletion.
 */
export async function ensureNoGoals(page: Page): Promise<void> {
  await deleteAllGoalsViaAPI(page)
  const goals = await getGoalsViaAPI(page)
  if (goals.length > 0) {
    throw new Error(`Expected 0 goals after deletion, but found ${goals.length}`)
  }
}
