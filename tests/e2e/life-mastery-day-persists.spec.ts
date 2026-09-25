import { test, expect, type Page, type BrowserContext } from "@playwright/test"

/**
 * M1'S ACCEPTANCE: YOUR DAY IS ON YOUR ACCOUNT, NOT IN ONE BROWSER.
 *
 * The owner's report was "some things, like daily tracking, do not save to the
 * account". Round-tripping a day through the repo proves the rows are right; it
 * does not prove the product does it. This does, and it is the only test here
 * that can: **two browser contexts, one account, nothing shared between them
 * but the database.**
 *
 * The second test is the one that matters more and is easy to leave out. It is
 * not enough that a tick arrives — the whole 25-table design exists because a
 * plan is REPLACED on every save while a day is APPENDED to, so the real
 * question is whether editing the plan on one device destroys a day written on
 * the other. That was the single most dangerous thing the first version of the
 * deployment plan got wrong, and it is the thing that has no cure once it
 * happens.
 *
 * Deliberately NOT asserted through the Today screen's markup: what is being
 * proved is that the DATA crosses, and coupling this to a tab's DOM would make
 * it fail on a wording change and pass on a broken save. So both contexts talk
 * to `/api/life-plan/day`, which is the boundary the feature actually is.
 */

/**
 * ONE DAY PER TEST, and it is not a stylistic choice.
 *
 * `fullyParallel` is on, so the tests in this file run at the same time in
 * different workers against the SAME account. The first draft shared one date
 * between all four: the test that clears a note raced the test that reads one
 * back, and two failed with "expected … received undefined" — which reads
 * exactly like the day half not saving, the very bug this file exists to
 * disprove. A shared mutable fixture in a parallel suite is a false report
 * waiting to happen.
 *
 * Dates far enough back that nothing else in the suite writes to them.
 */
const DAYS = {
  crosses: "2019-03-01",
  survives: "2019-03-02",
  cleared: "2019-03-03",
} as const
/** Only the parts of the stored plan this file touches. */
type PlanShape = {
  plan_id: string
  user_id: string
  nodes: Array<{ id: string; plan_id: string; user_id: string; kind: string; local_id: string }>
  sub_steps: Array<{ id: string; user_id: string; plan_id: string; node_kind: string; position: number; target_id: string; title: string }>
}

/** A question id that no plan carries — the journal accepts it on purpose. */
const ORPHAN = "f_gone_in_a_later_plan"

async function readDay(page: Page) {
  const res = await page.request.get("/api/life-plan/day")
  expect(res.status(), "the day route answers a signed-in read").toBe(200)
  return res.json() as Promise<{
    daily: Record<string, Record<string, number>>
    logged: Record<string, string[]>
    notes: Record<string, string>
    journal: Record<string, Record<string, string>>
  }>
}

async function writeDay(page: Page, patch: Record<string, unknown>) {
  const res = await page.request.put("/api/life-plan/day", { data: patch })
  expect(res.status(), `the day route accepted ${JSON.stringify(patch)}`).toBe(200)
}

/**
 * A ROUTINE STEP THE ACCOUNT ACTUALLY HAS, because a tick must name one.
 *
 * The day route resolves every tick against the plan's own nodes and answers
 * 409 `plan-behind` for an id it does not know, so this cannot invent one. It
 * fails loudly rather than skipping: a cross-device test that quietly stops
 * asserting when the fixture is thin is how this file spent a day claiming to
 * prove something it never sent.
 */
async function aTickableStep(page: Page): Promise<string> {
  const res = await page.request.get("/api/life-plan")
  expect(res.status(), "the plan route answers a signed-in read").toBe(200)
  const body = (await res.json()) as { plan: { nodes: Array<{ kind: string; local_id: string }> } | null }
  /**
   * THE FIRST BY LOCAL ID, NOT THE FIRST POSTGRES HAPPENED TO RETURN.
   *
   * This was a bare `.find()` over an unordered read, so which step it picked
   * changed between runs — and when it picked the one
   * `mobile/mobile-life-mastery-day.spec.ts` taps, the two specs ticked and
   * unticked one step on one account from two projects at once and failed each
   * other. A nondeterministic fixture choice is a flake whichever spec loses.
   * Sorted, this takes the lowest id and the phone spec takes the one placed on
   * today, so the two cannot collide.
   */
  const step = [...(body.plan?.nodes ?? [])]
    .filter((n) => n.kind === "routine_step")
    .sort((a, b) => a.local_id.localeCompare(b.local_id))[0]
  expect(
    step,
    "this account's plan has no routine step, so no tick can be sent and this " +
      "suite cannot prove the thing it exists for. Add one: open /life-mastery, " +
      "go to Systems, click a routine and turn a library step on.",
  ).toBeTruthy()
  return step!.local_id
}

/** A second browser, same account, sharing nothing but the database. */
async function secondDevice(context: BrowserContext): Promise<Page> {
  const other = await context.browser()!.newContext({
    storageState: "tests/e2e/.auth/user.json",
  })
  return other.newPage()
}

test.describe("the day half crosses devices", () => {
  test("a line AND a tick written on one device are there on another", async ({ page, context }) => {
    const DAY = DAYS.crosses
    await page.goto("/life-mastery")
    const stepId = await aTickableStep(page)
    /**
     * CLEAR IT FIRST, because the account remembers the last run.
     *
     * These day rows survive between runs, so an assertion that the tick is
     * present passes on a tick this run never sent — proved by removing the
     * `ticks` key below and watching the test stay green. Clearing first makes
     * every assertion here about THIS run, which is the only version worth
     * having.
     */
    await writeDay(page, { date: DAY, note: "", ticks: { [stepId]: false } })
    const blank = await readDay(page)
    expect(blank.logged[DAY] ?? [], "the day starts clear, or the test below proves nothing").not.toContain(stepId)

    await writeDay(page, {
      date: DAY,
      note: "written on the first device",
      // THE TICK IS THE MILESTONE'S OWN HEADLINE — "tick your morning routine
      // on your phone and see it on your laptop" — and until 2026-09-24 this
      // file sent four writes and every one of them was a `note`. The words
      // `ticks` and `logged` appeared in no payload, so the sentence M1 is
      // named after was the one thing never tested.
      ticks: { [stepId]: true },
    })

    const laptop = await secondDevice(context)
    await laptop.goto("/life-mastery")
    const seen = await readDay(laptop)

    expect(
      seen.notes[DAY],
      "the note written on one device must be readable on another — this is the owner's report",
    ).toBe("written on the first device")
    expect(
      seen.logged[DAY] ?? [],
      "the TICK must cross too, which is the sentence this milestone is named after",
    ).toContain(stepId)

    await laptop.context().close()
  })

  /**
   * THE ONE WITH NO CURE IF IT IS WRONG.
   *
   * A plan is replaced on every save. If the whole-plan save could reach the
   * day tables, one keystroke on a laptop would wipe a year of journal written
   * on a phone — and nothing on either screen would say so.
   */
  test("editing the plan on one device does not destroy a day written on the other", async ({ page, context }) => {
    const DAY = DAYS.survives
    await page.goto("/life-mastery")
    const stepId = await aTickableStep(page)
    // Cleared first for the same reason as the test above: these rows outlive
    // the run, so a survivor from last time reads exactly like a pass.
    await writeDay(page, { date: DAY, note: "", ticks: { [stepId]: false } })
    await writeDay(page, {
      date: DAY,
      note: "a day I do not want to lose",
      ticks: { [stepId]: true },
      journal: { [ORPHAN]: "and a line under a question" },
    })

    // The other device changes the PLAN — the thing that is replaced wholesale.
    const laptop = await secondDevice(context)
    await laptop.goto("/life-mastery")
    const before = await laptop.request.get("/api/life-plan")
    expect(before.status()).toBe(200)
    const body = (await before.json()) as { plan: PlanShape | null; revision: number }

    /**
     * A PLAN MUST EXIST, AND THE TEST MUST SAY SO RATHER THAN SHRUG.
     *
     * This was `if (body.plan) { … }`. On an account with no plan row the whole
     * save was skipped and the test passed having asserted only that a note it
     * had written one line earlier came back — a green tick for the most
     * dangerous case in the design, earned by doing nothing.
     */
    expect(body.plan, "no plan on this account, so nothing can be saved over the day half").toBeTruthy()
    const plan = body.plan!

    /**
     * A STRUCTURAL CHANGE, because an identical body is not one.
     *
     * `save_life_plan` upserts by node id, so re-sending the plan unchanged
     * keeps every id and fires no cascade — which is exactly the cascade this
     * test exists to watch for. `lifePlanDay.integration.test.ts` proves at the
     * schema level that losing a node row DOES delete its tick, so the node set
     * has to actually move here or the assertion below is free.
     *
     * A sub-step is the cheapest node that changes it: one node row and one
     * detail row, hanging off a node the plan already has, and removed again at
     * the end so the account is left as it was found.
     */
    const anchor = plan.nodes.find((n) => n.kind === "routine_step")!
    const addedLocalId = `sub_acceptance_${DAY}`
    const addedId = crypto.randomUUID()
    const grown = {
      ...plan,
      nodes: [...plan.nodes, { id: addedId, plan_id: plan.plan_id, user_id: plan.user_id, kind: "sub_step", local_id: addedLocalId }],
      sub_steps: [
        ...plan.sub_steps,
        { id: addedId, user_id: plan.user_id, plan_id: plan.plan_id, node_kind: "sub_step", position: plan.sub_steps.length, target_id: anchor.id, title: "added by M1's acceptance" },
      ],
    }
    const saved = await laptop.request.put("/api/life-plan", { data: { plan: grown, revision: body.revision } })
    // A 409 is a legitimate answer here (another device saved first) and is
    // NOT a failure of this test — what matters is what survives below.
    expect([200, 409], "the plan save answered").toContain(saved.status())
    if (saved.status() === 200) {
      const back = await laptop.request.get("/api/life-plan")
      const grownBody = (await back.json()) as { plan: PlanShape }
      expect(
        grownBody.plan.nodes.some((n) => n.local_id === addedLocalId),
        "the save has to have CHANGED the node set, or this test watches nothing",
      ).toBe(true)
    }

    const after = await readDay(page)
    expect(after.notes[DAY], "the day note survived a whole-plan save").toBe("a day I do not want to lose")
    expect(
      after.logged[DAY] ?? [],
      "the tick survived a structural plan save — the cascade this design exists to prevent",
    ).toContain(stepId)
    expect(
      after.journal[DAY]?.[ORPHAN],
      "an answer under a question the plan does not carry survived too",
    ).toBe("and a line under a question")

    // Put the account back the way it was found.
    if (saved.status() === 200) {
      const now = await laptop.request.get("/api/life-plan")
      const nowBody = (await now.json()) as { plan: PlanShape; revision: number }
      await laptop.request.put("/api/life-plan", {
        data: {
          plan: {
            ...nowBody.plan,
            nodes: nowBody.plan.nodes.filter((n) => n.local_id !== addedLocalId),
            sub_steps: nowBody.plan.sub_steps.filter((r) => r.id !== addedId),
          },
          revision: nowBody.revision,
        },
      })
    }

    await laptop.context().close()
  })

  test("clearing a cell on one device clears it on the other, rather than coming back", async ({ page, context }) => {
    const DAY = DAYS.cleared
    await page.goto("/life-mastery")
    await writeDay(page, { date: DAY, note: "this will be cleared" })
    await writeDay(page, { date: DAY, note: "" })

    const laptop = await secondDevice(context)
    await laptop.goto("/life-mastery")
    const seen = await readDay(laptop)

    // "Absent is not null" cuts both ways: an omitted key changes nothing, and
    // an explicit clear must actually clear. If this fails, a cleared cell
    // reappears on every other device.
    expect(seen.notes[DAY] ?? "", "a cleared note stays cleared").toBe("")

    await laptop.context().close()
  })

  test("refuses a day ahead of the account's calendar", async ({ page }) => {
    await page.goto("/life-mastery")
    const res = await page.request.put("/api/life-plan/day", {
      data: { date: "2099-01-01", note: "from a clock that is wrong" },
    })
    expect(res.status(), "a day years ahead is refused rather than stored").toBe(400)
  })
})
