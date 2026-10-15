import { test, expect } from "../fixtures/test"
import { ROUTES } from "@/src/shared/routes"
import type { Page } from "@playwright/test"
import { planWithSteps, seedLifePlan } from "../helpers/lifePlan"

/**
 * CHECK 5: TICK IT ON YOUR PHONE.
 *
 * M1's headline is "tick your morning routine on your phone and see it on your
 * laptop", and vision item 12 says the phone is where this product is weakest.
 * `life-mastery-day-persists.spec.ts` proves the DATA crosses devices, and it
 * does so deliberately over HTTP — it never touches the DOM, which is what keeps
 * it from failing on a wording change.
 *
 * **Which is exactly why adding that spec to a phone project would have closed
 * this check while proving nothing.** A spec with no DOM in it has no
 * viewport-dependent behaviour: running it at 390px exercises the same four
 * requests it runs at 1280px, and the box would have gone green having tested
 * the phone in no way at all. So this is a different test: it puts a thumb on
 * the actual control.
 *
 * What it asserts, in the order a person does it:
 *
 *   1. the step the plan runs every day is on today's list, with a box;
 *   2. the thing you tap is big enough to tap — measured on the element that
 *      receives the tap, not on the 16px checkbox drawn inside it;
 *   3. tapping it ticks it on screen;
 *   4. the ACCOUNT has it a moment later, which is the half a screenshot cannot
 *      show;
 *   5. and it is still there after a reload, which is the claim the milestone
 *      is named after.
 *
 * ON THE WORKER'S OWN ACCOUNT (Phase 8), with a plan it seeds itself. It used
 * to need somebody to have added a 7x-a-week step to the shared account by
 * hand, and it had to read a baseline of ticks rather than an empty one because
 * `life-mastery-day-persists.spec.ts` ticked the same step on the same account
 * from another project. Neither is true any more: the seed is a plan nobody has
 * ticked (helpers/lifePlan.ts), and nothing else writes to this account.
 */

/**
 * RUNS EVERY DAY, so it is on today's list whatever today is. A step placed on
 * named days sits under "On other days" on the rest and is drawn without a box.
 */
const STEP = { id: "s1", title: "E2E stretch", daysPerWeek: 7 }

/**
 * Which dates the account has THIS step ticked on. Never the runner's clock.
 *
 * The id is what crosses, so the id is what is asked about — and the account's
 * calendar day is never computed here, because that rule has been got wrong
 * three times in this repo and a second copy of it in a test would be a fourth.
 */
async function tickedDates(page: Page, localId: string): Promise<string[]> {
  const res = await page.request.get("/api/life-plan/day")
  expect(res.status(), "the day route answers a signed-in read").toBe(200)
  const body = (await res.json()) as { logged: Record<string, string[]> }
  return Object.entries(body.logged ?? {})
    .filter(([, ids]) => ids.includes(localId))
    .map(([date]) => date)
    .sort()
}

test.describe("ticking today's routine with a thumb", () => {
  test.beforeEach(async ({ page, account }) => {
    await seedLifePlan(page, account.id, planWithSteps([STEP]))
  })

  test("a tap at phone width ticks it, reaches the account, and survives a reload", async ({ page }) => {
    await page.goto(`${ROUTES.plan}?step=today`)

    const box = page.getByRole("checkbox", { name: `Did ${STEP.title}`, exact: true })
    await expect(box, "a step that runs every day is on today's list, with a box").toBeVisible({ timeout: 20_000 })

    /**
     * THE TAP TARGET IS THE LABEL, NOT THE CHECKBOX.
     *
     * The `input` is 16x16 and would fail a 44px floor read literally, but the
     * whole row is a `<label>`, so that is what a thumb lands on — 316x55 at
     * iPhone 14 width when this was written. Measuring the input would report a
     * defect that is not there; measuring nothing would miss the one that would
     * be. So it measures the element the tap actually goes to.
     */
    const target = page.locator("label").filter({ has: box }).first()
    const size = await target.boundingBox()
    expect(size, "the row that receives the tap must exist").not.toBeNull()
    expect(size!.height, "a thumb needs 44px, and this row is what a thumb hits").toBeGreaterThanOrEqual(44)

    // A freshly seeded plan: nobody has ticked this step, on any day.
    await expect(box).not.toBeChecked()
    expect(await tickedDates(page, STEP.id), "the seeded step starts unticked").toEqual([])

    await box.click()
    await expect(box, "the control has to answer the tap on screen").toBeChecked()

    /* The day save is debounced, so the account is asked a moment later rather
       than immediately — asking at once is how a cross-device test passes by
       racing the network, which this suite has already been caught doing. */
    await expect
      .poll(async () => (await tickedDates(page, STEP.id)).length, { timeout: 20_000 })
      .toBe(1)

    /* THE MILESTONE'S OWN SENTENCE. Not "the request succeeded" — that it is
       still there when the page is opened again. */
    await page.reload()
    const again = page.getByRole("checkbox", { name: `Did ${STEP.title}`, exact: true })
    await expect(again, "the tick survived the page being opened again").toBeChecked({ timeout: 20_000 })
  })
})
