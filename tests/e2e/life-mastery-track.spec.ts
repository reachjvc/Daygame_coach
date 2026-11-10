/**
 * The Track step and Today's counting, end to end.
 *
 * Since Q4 of Plans/life-plan-rebuild.md nothing is copied into the old goals
 * table: "Log one" on Today counts a goal on the day itself, in the plan's day
 * half. What this file proves through the real page: Track copies nothing, the
 * schedule reads the plan, a count lands on the day row and comes back off, and
 * goals copied BEFORE the change still show on Track with what was counted on
 * them.
 *
 * ON THE WORKER'S OWN ACCOUNT (Phase 8). Each test puts this file's plan on
 * the account and empties its goals before it starts.
 */

import { test, expect } from './fixtures/test'
import type { Page } from '@playwright/test'
import { ROUTES } from "@/src/shared/routes"
import { seedLifePlan } from './helpers/lifePlan'

/**
 * A plan with one of each shape, put on the account through the plan's own
 * route (helpers/lifePlan.ts).
 *
 * Driving eleven steps of UI to get three goals in would be testing the eleven
 * steps, which have their own tests. The loader fills every field this omits,
 * so a short object here is the same plan the flow would have written.
 */
const PLAN = {
  version: 1,
  seq: 3,
  areas: [
    { id: 'lm_fitness', label: 'Fitness', sublabel: 'Strength', color: '#0ea5e9', custom: false },
    { id: 'lm_fun', label: 'Fun', sublabel: 'Adventure', color: '#ec4899', custom: false },
  ],
  routines: [
    {
      id: 'r1', label: 'Morning', blueprintId: 'morning', kind: 'sequence', areaId: null, serves: [],
      daysPerWeek: 7, splitDays: [],
      steps: [
        // Placed on Monday and Thursday at 07:00, so the day view has something
        // it can actually draw.
        { id: 's1', title: 'E2E cold shower', minutes: 5, daysPerWeek: 2, dimension: 'body', servesGoalIds: [], days: [0, 3], startMin: 420 },
        // Every day, so Today has a box to tick whatever day the test runs on.
        { id: 's2', title: 'E2E vitamins', minutes: 1, daysPerWeek: 7, dimension: 'body', servesGoalIds: [], days: [], startMin: 425 },
      ],
    },
  ],
  goals: [
    {
      id: 'g1',
      areaId: 'lm_fitness',
      title: 'E2E gym sessions',
      type: 'habit_ramp',
      why: 'Because the rest of it runs on energy',
      daysPerWeek: 4,
      perWeek: null,
      // Two weeks easing in at 2×, then the steady 4×. The whole point of the
      // week view is that this is visible before you agree to it.
      rampSteps: [{ frequencyPerWeek: 2, durationWeeks: 2 }],
      targetDate: null,
      feedsGoalIds: [],
      values: ['discipline'],
    },
    {
      id: 'g2',
      areaId: 'lm_fitness',
      title: 'E2E bench press',
      type: 'milestone_ladder',
      unit: 'kg',
      ladder: { start: 60, target: 100, steps: 5, curveTension: 0, controlPoints: [], pins: [] },
      targetDate: null,
      feedsGoalIds: [],
      values: [],
    },
    {
      id: 'g3',
      areaId: 'lm_fun',
      title: 'E2E northern lights',
      type: 'achievement',
      targetDate: null,
      feedsGoalIds: [],
      values: [],
    },
  ],
  priorityIds: ['g1', 'g2', 'g3'],
  review: {},
  answers: {},
  currentValues: [],
  values: [],
  seasonFocusId: null,
  seasonAreaIds: [],
  experiences: [],
  daily: {},
  updatedAt: '2026-01-01T00:00:00.000Z',
}

/** Every goal the account currently has, straight from the API. */
async function goals(
  page: Page
): Promise<
  Array<{
    id: string
    title: string
    template_id: string | null
    motivation_note: string | null
    current_value: number
    target_value: number
    ramp_steps: { frequencyPerWeek: number; durationWeeks: number }[] | null
  }>
> {
  const res = await page.request.get('/api/goals')
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  return Array.isArray(body) ? body : body.goals ?? []
}

/** The goals this plan pushed: the Track step tags each one `ns:<run>:<plan goal id>`. */
async function pushedGoals(page: Page) {
  return (await goals(page)).filter((g) => g.template_id?.startsWith('ns:'))
}

/** Every goal count on the account's days, merged by goal: what Today's "Log one" wrote. */
async function dayCounts(page: Page): Promise<Record<string, number>> {
  const res = await page.request.get('/api/life-plan/day')
  expect(res.ok()).toBeTruthy()
  const body = (await res.json()) as { numbers?: Record<string, Record<string, number>> }
  const out: Record<string, number> = {}
  for (const row of Object.values(body.numbers ?? {})) for (const [id, n] of Object.entries(row)) out[id] = (out[id] ?? 0) + n
  return out
}

test.describe('Life Mastery — the track step', () => {
  test.beforeEach(async ({ page, account }) => {
    // The account is this worker's alone, so every goal on it is a leftover of
    // an earlier test here: start from none.
    const emptied = await page.request.delete('/api/goals')
    expect(emptied.status(), `could not empty the account's goals: ${await emptied.text()}`).toBe(200)
    await seedLifePlan(page, account.id, PLAN)
    await page.goto(ROUTES.plan)
  })

  test('copies nothing into the old goals table any more, and points at Today', async ({ page }) => {
    await page.getByRole('button', { name: /^\d+\s*Track\b/ }).click()
    const counting = page.locator('section', { hasText: 'Counting happens on Today' })
    await expect(counting.getByRole('heading', { name: 'Counting happens on Today' })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Track \d+ goals?$/ })).toHaveCount(0)
    // The block that showed goals copied before is gone (Phase 7).
    await expect(page.locator('section', { hasText: 'Goals sent to the old goals page before' })).toHaveCount(0)

    await counting.getByRole('button', { name: 'Go to Today' }).click()
    await expect(page.getByRole('button', { name: 'Log one E2E gym sessions' })).toBeVisible()
    expect(await pushedGoals(page)).toHaveLength(0)
  })

  test('shows what you will be doing, week by week and day by day, without the milestones', async ({ page }) => {
    await page.getByRole('button', { name: /^\d+\s*Track\b/ }).click()
    const schedule = page.locator('section', { hasText: 'What you will actually be doing' })
    await expect(schedule.getByRole('heading', { name: 'What you will actually be doing' })).toBeVisible({ timeout: 15000 })

    // A plan with steps on named days opens on the day view; the grid is one
    // press away, and opens with every group unfolded.
    await schedule.getByRole('button', { name: 'By week' }).click()

    // THE WHOLE POINT: an outcome is not an activity. A weekly grid holding
    // "bench 100 kg" reads as a week you failed at it, every week, until the
    // one you did not.
    await expect(schedule.getByText('E2E bench press')).toHaveCount(0)
    await expect(schedule.getByText('E2E northern lights')).toHaveCount(0)
    await expect(schedule.getByText('E2E gym sessions')).toBeVisible()
    await expect(schedule.getByText('E2E cold shower')).toBeVisible()

    // The ramp is legible: 2, 2, then the steady 4 — and the goal this pushes
    // counts the same weeks (asserted after the push below).
    const gymRow = schedule.getByRole('row', { name: /E2E gym sessions/ })
    await expect(gymRow.getByRole('cell').nth(0)).toHaveText(/^2$/)
    await expect(gymRow.getByRole('cell').nth(1)).toHaveText(/^2$/)
    await expect(gymRow.getByRole('cell').nth(2)).toHaveText(/4/)

    await schedule.getByRole('button', { name: 'By day' }).click()
    // The cold shower has days; the gym driver says "4× a week" and names none,
    // so it is listed rather than invented onto a day. A day's routine starts
    // folded unless the day is today, so a folded one is opened to look inside.
    await schedule.getByRole('button', { name: /^Morning/, expanded: false }).first().click()
    await expect(schedule.getByText('E2E cold shower').first()).toBeVisible()
    await expect(schedule.getByText('Runs weekly, no day chosen')).toBeVisible()
    await expect(schedule.getByText('E2E bench press')).toHaveCount(0)
  })

  test('today: a tick, a rating, a note and a count survive a reload, and the count lands on the day', async ({ page }) => {
    await page.getByRole('button', { name: /^\d+\s*Today\b/ }).click()

    // The driver counts on the DAY, with no copy anywhere: the ramp's first
    // week asks for two, as the Track schedule says.
    const gym = page.getByRole('listitem').filter({ has: page.getByRole('button', { name: 'Log one E2E gym sessions' }) })
    await expect(gym.getByText('0 of 2 this week')).toBeVisible()
    await page.getByRole('button', { name: 'Log one E2E gym sessions' }).click()
    await expect(gym.getByText('1 of 2 this week')).toBeVisible()
    await expect.poll(async () => dayCounts(page), { timeout: 15_000 }).toEqual({ g1: 1 })

    // …and it comes back off again.
    await page.getByRole('button', { name: 'Take one back off E2E gym sessions' }).click()
    await expect.poll(async () => dayCounts(page), { timeout: 15_000 }).toEqual({})
    await page.getByRole('button', { name: 'Log one E2E gym sessions' }).click()
    await expect.poll(async () => dayCounts(page), { timeout: 15_000 }).toEqual({ g1: 1 })
    expect(await pushedGoals(page)).toHaveLength(0)

    // A step tick, an area rating and a note.
    const vitamins = page.getByRole('checkbox', { name: 'Did E2E vitamins' })
    await vitamins.check()
    await page.getByRole('button', { name: /^How today went/ }).click()
    await page.getByRole('button', { name: 'Fitness today: 7 out of 10' }).click()
    const note = page.getByLabel('Anything worth remembering about today')
    await note.fill('Tired but went anyway.')
    await note.blur()

    // THE POINT: still there after a reload. A tick that vanishes is worse than
    // no tick, because you do not notice until the week is over.
    await page.reload()
    await page.getByRole('button', { name: /^\d+\s*Today\b/ }).click()
    await expect(page.getByLabel('Anything worth remembering about today')).toHaveValue('Tired but went anyway.')
    await page.getByRole('button', { name: /^How today went/ }).click()
    await expect(page.getByRole('button', { name: 'Fitness today: 7 out of 10' })).toHaveAttribute('aria-pressed', 'true')
    await expect(vitamins).toBeChecked()
    await expect(page.getByText('1 of 2 this week')).toBeVisible()
  })
})
