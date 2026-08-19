/**
 * Step 11 of the North Star flow, end to end: a plan in localStorage becomes
 * goals the app counts.
 *
 * The unit tests cover the mapping. What they cannot cover is the crossing
 * itself — that the payload the browser builds is one the batch route accepts,
 * that the tag survives the round trip, and that pressing the button twice does
 * not write the plan twice. That is what this is for.
 *
 * It creates real rows on the shared test user and deletes exactly the ones it
 * created, by id. It never calls DELETE /api/goals, which would take the whole
 * account's goals with it.
 */

import { test, expect, type Page } from '@playwright/test'

const PLAN_KEY = 'north-star-v1'
const RUN_KEY = 'north-star-track-run'
const RUN = 'e2etrack'

/**
 * A plan with one of each shape, written straight into localStorage.
 *
 * Driving eleven steps of UI to get three goals in would be testing the eleven
 * steps, which have their own tests. `loadNsPlan` fills every field this omits,
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

/** Every goal the test user currently has, straight from the API. */
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

/** Only what this test made. Never DELETE /api/goals — that is everything. */
async function cleanUp(page: Page) {
  for (const goal of await goals(page)) {
    if (goal.template_id?.startsWith(`ns:${RUN}:`)) {
      await page.request.delete(`/api/goals/${goal.id}?permanent=true`)
    }
  }
}

test.describe('Life Mastery — the track step', () => {
  /**
   * Serial, because both tests push the same plan to the same account under
   * the same run id. Run in parallel (the project default) each one's cleanup
   * deletes the other's goals mid-assertion, and the failure looks like the
   * feature rather than the fixture.
   */
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    /**
     * Seeded BEFORE the page's own scripts, not after.
     *
     * Writing it with `page.evaluate` after `goto` races the flow's own save
     * effect: the component mounts, loads nothing, and writes the empty plan
     * back to the same key. Sometimes that lands after the seed and the test
     * opens on a blank plan — which reads exactly like the feature being
     * broken. `addInitScript` runs on every navigation before anything else,
     * so the first mount already has the plan.
     */
    await page.addInitScript(
      ([planKey, runKey, run, plan]) => {
        // Seed ONLY when there is nothing there. An init script runs on every
        // navigation, so an unconditional write re-seeds on `reload()` too —
        // which silently undoes whatever the test just typed and makes a
        // working "does it survive a reload" read as a broken one.
        if (!window.localStorage.getItem(planKey as string)) {
          window.localStorage.setItem(planKey as string, plan as string)
        }
        if (!window.localStorage.getItem(runKey as string)) {
          window.localStorage.setItem(runKey as string, run as string)
        }
      },
      [PLAN_KEY, RUN_KEY, RUN, JSON.stringify(PLAN)]
    )
    await page.goto('/test/life-mastery')
    await cleanUp(page)
    await page.reload()
  })

  test.afterEach(async ({ page }) => {
    await cleanUp(page)
  })

  test('pushes the plan into real goals, and pressing it twice does not double them', async ({ page }) => {
    await page.getByRole('button', { name: /^\d+\s*Track\b/ }).click()

    // The list reads back what each goal becomes before anything is written.
    // Scoped: the schedule above it names the same drivers, so an unscoped
    // getByText matches twice and says nothing about either.
    const pushList = page.locator('section', { hasText: 'Start tracking these' })
    await expect(pushList.getByText('E2E gym sessions')).toBeVisible()
    await expect(pushList.getByText('Fitness · 4× a week')).toBeVisible()
    await expect(pushList.getByText('Fitness · 60 → 100')).toBeVisible()
    await expect(pushList.getByText('Fun · done or not done')).toBeVisible()

    // Nothing has been written yet.
    expect((await goals(page)).filter((g) => g.template_id?.startsWith(`ns:${RUN}:`))).toHaveLength(0)

    await page.getByRole('button', { name: 'Track 3 goals' }).click()
    await expect(page.getByText('Everything in the plan is being tracked.')).toBeVisible({ timeout: 15000 })

    const afterFirst = (await goals(page)).filter((g) => g.template_id?.startsWith(`ns:${RUN}:`))
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
    expect((await goals(page)).filter((g) => g.template_id?.startsWith(`ns:${RUN}:`))).toHaveLength(3)
  })

  test('shows what you will be doing, week by week and day by day, without the milestones', async ({ page }) => {
    await page.getByRole('button', { name: /^\d+\s*Track\b/ }).click()
    const schedule = page.locator('section', { hasText: 'What you will actually be doing' })
    await expect(schedule.getByRole('heading', { name: 'What you will actually be doing' })).toBeVisible({ timeout: 15000 })

    // THE WHOLE POINT: an outcome is not an activity. A weekly grid holding
    // "bench 100 kg" reads as a week you failed at it, every week, until the
    // one you did not.
    await expect(schedule.getByText('E2E bench press')).toHaveCount(0)
    await expect(schedule.getByText('E2E northern lights')).toHaveCount(0)
    await expect(schedule.getByText('E2E gym sessions')).toBeVisible()
    await expect(schedule.getByText('E2E cold shower')).toBeVisible()

    // The ramp is legible: 2, 2, then the steady 4.
    const gymRow = schedule.getByRole('row', { name: /E2E gym sessions/ })
    await expect(gymRow.getByRole('cell').nth(0)).toHaveText(/^2$/)
    await expect(gymRow.getByRole('cell').nth(1)).toHaveText(/^2$/)
    await expect(gymRow.getByRole('cell').nth(2)).toHaveText(/4/)

    await schedule.getByRole('button', { name: 'By day' }).click()
    // The cold shower has days; the gym driver says "4× a week" and names none,
    // so it is listed rather than invented onto a day.
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
    await page.getByRole('button', { name: 'One more E2E gym sessions' }).click()
    await expect
      .poll(async () => (await goals(page)).find((g) => g.title === 'E2E gym sessions')?.current_value)
      .toBe((before.current_value ?? 0) + 1)

    // …and it comes back off again.
    await page.getByRole('button', { name: 'One fewer E2E gym sessions' }).click()
    await expect
      .poll(async () => (await goals(page)).find((g) => g.title === 'E2E gym sessions')?.current_value)
      .toBe(before.current_value ?? 0)

    // A step tick, an area rating and a note — all on the plan, all local.
    const shower = page.getByRole('checkbox', { name: 'Did E2E cold shower' })
    if (await shower.count()) await shower.check()
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
    if (await shower.count()) await expect(shower).toBeChecked()
  })

  test('shows the real goals hub on the same tab, holding the pushed goals', async ({ page }) => {
    await page.getByRole('button', { name: /^\d+\s*Track\b/ }).click()
    await page.getByRole('button', { name: 'Track 3 goals' }).click()
    await expect(page.getByText('Everything in the plan is being tracked.')).toBeVisible({ timeout: 15000 })

    // The hub is the real component, fetching its own data, below the list —
    // and scoped to this plan. It shipped unscoped and the first thing said
    // about it was that it pointed at the goals page rather than the plan.
    const hub = page.locator('section', { hasText: 'This plan, running' })
    await expect(hub.getByText('E2E gym sessions')).toBeVisible({ timeout: 15000 })

    // Goals made outside this plan must not be in it. The test account has at
    // least one; if it ever has none this assertion passes vacuously, so it is
    // checked against the API rather than assumed.
    const foreign = (await goals(page)).filter((g) => !g.template_id?.startsWith(`ns:${RUN}:`))
    expect(foreign.length).toBeGreaterThan(0)
    for (const g of foreign) await expect(hub.getByText(g.title, { exact: true })).toHaveCount(0)

    // Controls that would make a goal outside the scope are off: it would get
    // no matching tag and vanish the moment it was saved.
    await expect(hub.getByTestId('goals-new-goal-button')).toHaveCount(0)
    await expect(hub.getByTestId('goals-view-tree-of-life')).toHaveCount(0)
  })
})
