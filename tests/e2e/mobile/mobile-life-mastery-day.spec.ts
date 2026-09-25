import { test, expect, type Page } from "@playwright/test"

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
 *   1. there is something to tick, and the test says how to fix the account if
 *      there is not, rather than skipping and reporting nothing;
 *   2. the thing you tap is big enough to tap — measured on the element that
 *      receives the tap, not on the 16px checkbox drawn inside it;
 *   3. tapping it ticks it on screen;
 *   4. the ACCOUNT has it a moment later, which is the half a screenshot cannot
 *      show;
 *   5. and it is still there after a reload, which is the claim the milestone
 *      is named after.
 *
 * **ONE PHONE PROJECT, NOT TWO.** It is listed in `mobile-iphone` and
 * deliberately not in `mobile-pixel`: both run against the same test account,
 * `fullyParallel` is on, and two runs ticking and unticking one step on one
 * account race each other into a false failure. That is the same reasoning the
 * config already carries for `mobile-training.spec.ts`.
 */

const TICK = /^Did /

/**
 * THE PLAN'S OWN ID FOR THE STEP THIS ROW DRAWS.
 *
 * The row says the step's words; the account stores its local id. Something has
 * to join them, and it has to be the account's own answer rather than a guess.
 */
async function stepLocalId(page: Page, title: string): Promise<string> {
  const res = await page.request.get("/api/life-plan")
  expect(res.status(), "the plan route answers a signed-in read").toBe(200)
  const body = (await res.json()) as {
    plan: { steps: Array<{ id: string; title: string }>; nodes: Array<{ id: string; local_id: string }> } | null
  }
  const step = body.plan?.steps.find((r) => r.title === title)
  expect(step, `no step on the account is called "${title}"`).toBeTruthy()
  const node = body.plan!.nodes.find((n) => n.id === step!.id)
  expect(node, "the step's row has no node, which should be impossible").toBeTruthy()
  return node!.local_id
}

/**
 * Which dates the account has THIS step ticked on. Never the runner's clock.
 *
 * Counting dates that hold any tick at all was the first version and it could
 * not see the thing it was watching: today already held one, so adding another
 * moved no number. The id is what crosses, so the id is what is asked about —
 * and the account's calendar day is never computed here, because that rule has
 * been got wrong three times in this repo and a second copy of it in a test
 * would be a fourth.
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
  test("a tap at phone width ticks it, reaches the account, and survives a reload", async ({ page }) => {
    await page.goto("/life-mastery?step=today")

    const box = page.getByLabel(TICK).first()
    await expect(
      box,
      "this account's plan has nothing on today to tick, so this check cannot run. " +
        "Add a step that runs EVERY day: open /life-mastery, go to Systems, click a " +
        "routine and turn on a 7x-a-week step. A step placed on named days sits under " +
        '"On other days" and is drawn without a checkbox.',
    ).toBeVisible({ timeout: 20_000 })

    /**
     * THE TAP TARGET IS THE LABEL, NOT THE CHECKBOX.
     *
     * The `input` is 16x16 and would fail a 44px floor read literally, but the
     * whole row is a `<label>`, so that is what a thumb lands on — 316x55 at
     * iPhone 14 width when this was written. Measuring the input would report a
     * defect that is not there; measuring nothing would miss the one that would
     * be. So it measures the element the tap actually goes to.
     */
    const target = page.locator("label").filter({ has: page.getByLabel(TICK).first() }).first()
    const size = await target.boundingBox()
    expect(size, "the row that receives the tap must exist").not.toBeNull()
    expect(size!.height, "a thumb needs 44px, and this row is what a thumb hits").toBeGreaterThanOrEqual(44)

    /* WHICH step this row is, asked of the account rather than assumed. */
    const title = (await box.getAttribute("aria-label"))!.replace(/^Did /, "")
    const localId = await stepLocalId(page, title)

    /**
     * A BASELINE, NOT AN EMPTY ACCOUNT — and the difference is a real race.
     *
     * The first version asserted this step was ticked on NO day. It is not:
     * `life-mastery-day-persists.spec.ts` ticks the same step on its own dates
     * in 2019, runs in a different project, and `fullyParallel` is on, so the
     * two overlap. Asserting an empty account made this spec fail on the other
     * one's legitimate rows. What this spec owns is TODAY, so it asserts on how
     * the set changes rather than on what it starts as — and it still never
     * computes the account's calendar day, because that rule has been got wrong
     * three times here and a copy of it in a test would be a fourth.
     */
    if (await box.isChecked()) {
      await box.click()
      await expect(box).not.toBeChecked()
      // The day save is debounced; this waits it out so the baseline is settled
      // rather than read mid-flight.
      await page.waitForTimeout(8_000)
    }
    const before = await tickedDates(page, localId)

    await box.click()
    await expect(box, "the control has to answer the tap on screen").toBeChecked()

    /* The day save is debounced, so the account is asked a moment later rather
       than immediately — asking at once is how a cross-device test passes by
       racing the network, which this suite has already been caught doing. */
    await expect
      .poll(async () => (await tickedDates(page, localId)).length, { timeout: 20_000 })
      .toBe(before.length + 1)

    const added = (await tickedDates(page, localId)).filter((d) => !before.includes(d))
    expect(added, "exactly one day gained it, and it is the account's today").toHaveLength(1)

    /* THE MILESTONE'S OWN SENTENCE. Not "the request succeeded" — that it is
       still there when the page is opened again. */
    await page.reload()
    const again = page.getByLabel(TICK).first()
    await expect(again, "the tick survived the page being opened again").toBeChecked({ timeout: 20_000 })

    // Leave the account as it was found, or the next run starts from a tick it
    // did not make and its own assertion becomes free.
    await again.click()
    await expect(again).not.toBeChecked()
    await expect
      .poll(async () => (await tickedDates(page, localId)), { timeout: 20_000 })
      .toEqual(before)
  })
})
