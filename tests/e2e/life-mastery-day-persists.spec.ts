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

/** A second browser, same account, sharing nothing but the database. */
async function secondDevice(context: BrowserContext): Promise<Page> {
  const other = await context.browser()!.newContext({
    storageState: "tests/e2e/.auth/user.json",
  })
  return other.newPage()
}

test.describe("the day half crosses devices", () => {
  test("a line written on one device is there on another", async ({ page, context }) => {
    const DAY = DAYS.crosses
    await page.goto("/life-mastery")
    await writeDay(page, { date: DAY, note: "written on the first device" })

    const laptop = await secondDevice(context)
    await laptop.goto("/life-mastery")
    const seen = await readDay(laptop)

    expect(
      seen.notes[DAY],
      "the note written on one device must be readable on another — this is the owner's report",
    ).toBe("written on the first device")

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
    await writeDay(page, { date: DAY, note: "a day I do not want to lose", journal: { [ORPHAN]: "and a line under a question" } })

    // The other device changes the PLAN — the thing that is replaced wholesale.
    const laptop = await secondDevice(context)
    await laptop.goto("/life-mastery")
    const before = await laptop.request.get("/api/life-plan")
    expect(before.status()).toBe(200)
    const body = (await before.json()) as { plan: unknown; revision: number }
    if (body.plan) {
      const saved = await laptop.request.put("/api/life-plan", {
        data: { plan: body.plan, revision: body.revision },
      })
      // A 409 is a legitimate answer here (another device saved first) and is
      // NOT a failure of this test — what matters is what survives below.
      expect([200, 409], "the plan save answered").toContain(saved.status())
    }

    const after = await readDay(page)
    expect(after.notes[DAY], "the day note survived a whole-plan save").toBe("a day I do not want to lose")
    expect(
      after.journal[DAY]?.[ORPHAN],
      "an answer under a question the plan does not carry survived too",
    ).toBe("and a line under a question")

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
