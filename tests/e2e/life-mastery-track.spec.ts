/**
 * Step 11 of the North Star flow, end to end: a plan in localStorage becomes
 * goals the app counts.
 *
 * The unit tests cover the mapping. What they cannot cover is the crossing
 * itself — that the payload the browser builds is one the batch route accepts,
 * that the tag survives the round trip, and that pressing the button twice does
 * not write the plan twice. That is what this is for.
 *
 * ON THE WORKER'S OWN ACCOUNT (Phase 8). Each test puts this file's plan on
 * the account and empties its goals before it starts, so what it counts is
 * what it pushed. On the old shared account it had to tag its goals with a run
 * id of its own and delete only those, and run its tests one at a time.
 */

import { test, expect } from './fixtures/test'
import type { Page } from '@playwright/test'
import { LIFE_MASTERY } from "@/src/shared/lifeMasteryRoutes"
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
  Array<{ id: string; title: string; template_id: string | null; motivation_note: string | null; current_value: number }>
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

/** A goal made outside the plan, by this spec, so "not in the plan's hub" has something to be about */
const FOREIGN_TITLE = 'E2E goal from outside the plan'

test.describe('Life Mastery — the track step', () => {
  test.beforeEach(async ({ page, account }) => {
    // The account is this worker's alone, so every goal on it is a leftover of
    // an earlier test here: start from none.
    const emptied = await page.request.delete('/api/goals')
    expect(emptied.status(), `could not empty the account's goals: ${await emptied.text()}`).toBe(200)
    await seedLifePlan(page, account.id, PLAN)
    await page.goto(LIFE_MASTERY)
  })

  test('pushes the plan into real goals, and pressing it twice does not double them', async ({ page }) => {
    await page.getByRole('button', { name: /^\d+\s*Track\b/ }).click()

    // The list reads back what each goal becomes before anything is written.
    // Scoped: the schedule above it names the same drivers, so an unscoped
    // getByText matches twice and says nothing about either.
    const pushList = page.locator('section', { hasText: 'Start tracking these' })
    await expect(pushList.getByText('E2E gym sessions')).toBeVisible()
    // The ramp's FIRST week, not the 4 it eases into: starting a ramp at its
    // steady rate starts somebody at the hardest setting (`goalToInsert`).
    await expect(pushList.getByText('Fitness · 2× a week')).toBeVisible()
    await expect(pushList.getByText('Fitness · 60 → 100')).toBeVisible()
    await expect(pushList.getByText('Fun · done or not done')).toBeVisible()

    // Nothing has been written yet.
    expect(await pushedGoals(page)).toHaveLength(0)

    await page.getByRole('button', { name: 'Track 3 goals' }).click()
    await expect(page.getByText('Everything in the plan is being tracked.')).toBeVisible({ timeout: 15000 })

    const afterFirst = await pushedGoals(page)
    expect(afterFirst).toHaveLength(3)
    expect(afterFirst.map((g) => g.title).sort()).toEqual([
      'E2E bench press',
      'E2E gym sessions',
      'E2E northern lights',
    ])

    // The why crosses over. Both insert paths in goalRepo accepted this column
    // and wrote none of it, so the reason arrived blank and nothing said so.
    const gym = afterFirst.find((g) => g.title === 'E2E gym sessions')!
    expect(gym.motivation_note).toBe('Because the rest of it runs on energy')

    // The rows are ticked as tracked, and the button has nothing left to send.
    await expect(pushList.getByRole('listitem').getByText('tracked', { exact: true })).toHaveCount(3)
    await expect(page.getByRole('button', { name: 'Nothing ticked' })).toBeDisabled()

    // A second push from a fresh load must find them, not repeat them.
    await page.reload()
    await page.getByRole('button', { name: /^\d+\s*Track\b/ }).click()
    await expect(page.getByText('Everything in the plan is being tracked.')).toBeVisible({ timeout: 15000 })
    expect(await pushedGoals(page)).toHaveLength(3)
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

    // The ramp is legible: 2, 2, then the steady 4. (The goal this pushes
    // settles at 2 after its ramp instead — `rampTargetForPeriod` reads past
    // the end as the ramp's last step, this grid as `daysPerWeek`. Reported as
    // a product disagreement on 2026-10-13; this line moves with the fix.)
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

  test('today: a tick, a rating and a note survive a reload, and +1 lands in the database', async ({ page }) => {
    // Push first, so the driver has something to count into.
    await page.getByRole('button', { name: /^\d+\s*Track\b/ }).click()
    await page.getByRole('button', { name: /^Track \d+ goals?$/ }).click()
    await expect(page.getByText('Everything in the plan is being tracked.')).toBeVisible({ timeout: 20000 })

    await page.getByRole('button', { name: /^\d+\s*Today\b/ }).click()

    // The driver counts into the REAL goal, not a note in a browser.
    const before = (await goals(page)).find((g) => g.title === 'E2E gym sessions')!
    await page.getByRole('button', { name: 'Log one E2E gym sessions' }).click()
    await expect
      .poll(async () => (await goals(page)).find((g) => g.title === 'E2E gym sessions')?.current_value)
      .toBe((before.current_value ?? 0) + 1)

    // …and it comes back off again.
    await page.getByRole('button', { name: 'Take one back off E2E gym sessions' }).click()
    await expect
      .poll(async () => (await goals(page)).find((g) => g.title === 'E2E gym sessions')?.current_value)
      .toBe(before.current_value ?? 0)

    // A step tick, an area rating and a note.
    const vitamins = page.getByRole('checkbox', { name: 'Did E2E vitamins' })
    await vitamins.check()
    await page.getByRole('button', { name: 'Fitness today: 7 out of 10' }).click()
    const note = page.getByLabel('Anything worth remembering about today')
    await note.fill('Tired but went anyway.')
    await note.blur()

    // THE POINT: still there after a reload. A tick that vanishes is worse than
    // no tick, because you do not notice until the week is over.
    await page.reload()
    await page.getByRole('button', { name: /^\d+\s*Today\b/ }).click()
    await expect(page.getByLabel('Anything worth remembering about today')).toHaveValue('Tired but went anyway.')
    await expect(page.getByRole('button', { name: 'Fitness today: 7 out of 10' })).toHaveAttribute('aria-pressed', 'true')
    await expect(vitamins).toBeChecked()
  })

  test('shows the real goals hub on the same tab, holding the pushed goals', async ({ page }) => {
    const seeded = await page.request.post('/api/goals', {
      data: { title: FOREIGN_TITLE, category: 'custom', target_value: 10, life_area: 'custom' },
    })
    expect(seeded.ok(), `could not seed the outside goal: ${seeded.status()}`).toBe(true)

    await page.getByRole('button', { name: /^\d+\s*Track\b/ }).click()
    await page.getByRole('button', { name: 'Track 3 goals' }).click()
    await expect(page.getByText('Everything in the plan is being tracked.')).toBeVisible({ timeout: 15000 })

    // The hub is the real component, fetching its own data, below the list —
    // and scoped to this plan. It shipped unscoped and the first thing said
    // about it was that it pointed at the goals page rather than the plan.
    const hub = page.locator('section', { hasText: 'This plan, running' })
    await expect(hub.getByText('E2E gym sessions')).toBeVisible({ timeout: 15000 })

    // Goals made outside this plan must not be in it. A fresh account holds
    // none, so this spec seeds one above — with none, this assertion would
    // pass vacuously.
    const foreign = (await goals(page)).filter((g) => !g.template_id?.startsWith('ns:'))
    expect(foreign.map((g) => g.title)).toContain(FOREIGN_TITLE)
    for (const g of foreign) await expect(hub.getByText(g.title, { exact: true })).toHaveCount(0)

    // Controls that would make a goal outside the scope are off: it would get
    // no matching tag and vanish the moment it was saved.
    await expect(hub.getByTestId('goals-new-goal-button')).toHaveCount(0)
    await expect(hub.getByTestId('goals-view-tree-of-life')).toHaveCount(0)
  })
})
