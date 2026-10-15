import { test, expect } from "./fixtures/test"
import { ROUTES } from "@/src/shared/routes"
import type { Browser, Page } from "@playwright/test"
import { planWithSteps, seedLifePlan } from "./helpers/lifePlan"

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
 *
 * ON THE WORKER'S OWN ACCOUNT (Phase 8). It used to share one with the rest of
 * the suite, which is why it once wrote to three dates in 2019 "that nothing
 * else touches", accepted a 409 from its own plan save "because another device
 * saved first", put the plan back afterwards, and relied on a routine step
 * somebody had added to that account by hand. Each test now seeds the plan it
 * needs, and nothing else writes to this account.
 */

/**
 * A past day, because back-filling a day is allowed and a day ahead of the
 * account's calendar is refused. One day for every test: a test reads only
 * what it wrote itself, and each one starts from a freshly seeded plan whose
 * step nobody has ticked (helpers/lifePlan.ts).
 */
const DAY = "2026-01-05"

/** The one routine step every test here ticks. */
const STEP = "s1"

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
 * A second browser, same account, sharing nothing but the database: its own
 * context, signed in from the account's saved session rather than this
 * page's cookies or storage.
 */
async function secondDevice(browser: Browser, storageState: string): Promise<Page> {
  const other = await browser.newContext({ storageState })
  return other.newPage()
}

test.describe("the day half crosses devices", () => {
  test.beforeEach(async ({ page, account }) => {
    // A tick must name a routine step the plan has: the day route answers 409
    // `plan-behind` for an id it does not know, so this cannot invent one.
    await seedLifePlan(page, account.id, planWithSteps([{ id: STEP, title: "E2E cold shower", daysPerWeek: 7 }]))
  })

  test("a line AND a tick written on one device are there on another", async ({ page, browser, account }) => {
    await page.goto(ROUTES.plan)
    // The seed is a plan nobody has ticked, so the assertion below can only be
    // satisfied by the write this test sends.
    expect((await readDay(page)).logged[DAY] ?? [], "the day starts clear, or the test below proves nothing").not.toContain(STEP)

    await writeDay(page, {
      date: DAY,
      note: "written on the first device",
      // THE TICK IS THE MILESTONE'S OWN HEADLINE — "tick your morning routine
      // on your phone and see it on your laptop" — and until 2026-09-24 this
      // file sent four writes and every one of them was a `note`. The words
      // `ticks` and `logged` appeared in no payload, so the sentence M1 is
      // named after was the one thing never tested.
      ticks: { [STEP]: true },
    })

    const laptop = await secondDevice(browser, account.storageState)
    await laptop.goto(ROUTES.plan)
    const seen = await readDay(laptop)

    expect(
      seen.notes[DAY],
      "the note written on one device must be readable on another — this is the owner's report",
    ).toBe("written on the first device")
    expect(
      seen.logged[DAY] ?? [],
      "the TICK must cross too, which is the sentence this milestone is named after",
    ).toContain(STEP)

    await laptop.context().close()
  })

  /**
   * THE ONE WITH NO CURE IF IT IS WRONG.
   *
   * A plan is replaced on every save. If the whole-plan save could reach the
   * day tables, one keystroke on a laptop would wipe a year of journal written
   * on a phone — and nothing on either screen would say so.
   */
  test("editing the plan on one device does not destroy a day written on the other", async ({ page, browser, account }) => {
    await page.goto(ROUTES.plan)
    await writeDay(page, {
      date: DAY,
      note: "a day I do not want to lose",
      ticks: { [STEP]: true },
      journal: { [ORPHAN]: "and a line under a question" },
    })

    // The other device changes the PLAN — the thing that is replaced wholesale.
    const laptop = await secondDevice(browser, account.storageState)
    await laptop.goto(ROUTES.plan)
    const before = await laptop.request.get("/api/life-plan")
    expect(before.status()).toBe(200)
    const body = (await before.json()) as { plan: PlanShape | null; revision: number }
    expect(body.plan, "the seeded plan is on the account").toBeTruthy()
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
     * detail row, hanging off a node the plan already has.
     */
    const anchor = plan.nodes.find((n) => n.kind === "routine_step" && n.local_id === STEP)!
    const addedLocalId = "sub_acceptance"
    const addedId = crypto.randomUUID()
    const grown = {
      ...plan,
      nodes: [...plan.nodes, { id: addedId, plan_id: plan.plan_id, user_id: plan.user_id, kind: "sub_step", local_id: addedLocalId }],
      sub_steps: [
        ...plan.sub_steps,
        { id: addedId, user_id: plan.user_id, plan_id: plan.plan_id, node_kind: "sub_step", position: plan.sub_steps.length, target_id: anchor.id, title: "added by M1's acceptance" },
      ],
    }
    // Nobody else saves to this account, so the revision just read is current:
    // anything but 200 is this save failing.
    const saved = await laptop.request.put("/api/life-plan", { data: { plan: grown, revision: body.revision } })
    expect(saved.status(), `the plan save answered: ${await saved.text()}`).toBe(200)
    const grownBody = (await (await laptop.request.get("/api/life-plan")).json()) as { plan: PlanShape }
    expect(
      grownBody.plan.nodes.some((n) => n.local_id === addedLocalId),
      "the save has to have CHANGED the node set, or this test watches nothing",
    ).toBe(true)

    const after = await readDay(page)
    expect(after.notes[DAY], "the day note survived a whole-plan save").toBe("a day I do not want to lose")
    expect(
      after.logged[DAY] ?? [],
      "the tick survived a structural plan save — the cascade this design exists to prevent",
    ).toContain(STEP)
    expect(
      after.journal[DAY]?.[ORPHAN],
      "an answer under a question the plan does not carry survived too",
    ).toBe("and a line under a question")

    await laptop.context().close()
  })

  test("clearing a cell on one device clears it on the other, rather than coming back", async ({ page, browser, account }) => {
    await page.goto(ROUTES.plan)
    await writeDay(page, { date: DAY, note: "this will be cleared" })
    // Read back before the clear, so the clear below has something to undo.
    expect((await readDay(page)).notes[DAY]).toBe("this will be cleared")
    await writeDay(page, { date: DAY, note: "" })

    const laptop = await secondDevice(browser, account.storageState)
    await laptop.goto(ROUTES.plan)
    const seen = await readDay(laptop)

    // "Absent is not null" cuts both ways: an omitted key changes nothing, and
    // an explicit clear must actually clear. If this fails, a cleared cell
    // reappears on every other device.
    expect(seen.notes[DAY] ?? "", "a cleared note stays cleared").toBe("")

    await laptop.context().close()
  })
})
