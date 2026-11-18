import { test, expect, signIn } from "./fixtures/test"
import { ROUTES } from "@/src/shared/routes"
import type { Page } from "@playwright/test"
import { seedLifePlan } from "./helpers/lifePlan"
import type { PlanRows } from "@/src/db/lifePlanTypes"

/**
 * PHASE 3 OF Plans/plan-in-steps.md, through the real page and a real account:
 * the invisible fixes that stop today's /plan flow losing work.
 *
 *   3.1 a new account's first visit saves its day;
 *   3.2 a close right after typing keeps what was typed;
 *   3.4 a text over its cap is named, and is not retried for ever.
 *
 * Reading back is done in a NEW browser context signed in from the account's
 * saved session, so nothing is shared with the page but the database.
 */

async function readDay(page: import("@playwright/test").Page) {
  const res = await page.request.get("/api/life-plan/day")
  expect(res.status()).toBe(200)
  return (await res.json()) as { daily: Record<string, Record<string, number>>; notes: Record<string, string> }
}

test.describe("plan saves lose nothing", () => {
  /**
   * ONE VISIT, NO RELOAD: a second visit would import what the first one never
   * sent, which is how this hid. The rating and the note are each written on
   * their own new account, and read back from a second signed-in context.
   */
  for (const [what, write, expected] of [
    ["rates today", async (page: Page) => {
      await page.goto(`${ROUTES.plan}?step=now`)
      await page.getByRole("button", { name: /^Health\. .*Open it\.$/ }).click()
      await page.getByRole("button", { name: "Rate Health 4 out of 10 today" }).click()
    }, { rated: true, notes: [] as string[] }],
    ["writes a day note", async (page: Page) => {
      await page.goto(`${ROUTES.plan}?step=journal`)
      await page.locator("#journal-day-note").fill("first visit note")
      await page.locator("#journal-day-note").blur()
    }, { rated: false, notes: ["first visit note"] }],
  ] as const) {
    test(`a new account's first visit saves what it ${what}`, async ({ page, browser, throwawayAccount }) => {
      await signIn(page, throwawayAccount)
      const none = (await (await page.request.get("/api/life-plan")).json()) as { plan: PlanRows | null }
      expect(none.plan, "the account is brand new: no plan row").toBeNull()

      await write(page)

      const other = await browser.newContext()
      const phone = await other.newPage()
      await signIn(phone, throwawayAccount)
      await expect
        .poll(async () => {
          const day = await readDay(phone)
          return { rated: Object.values(day.daily).some((d) => Object.values(d).includes(4)), notes: Object.values(day.notes) }
        }, { timeout: 15_000 })
        .toEqual(expected)
      await other.close()
    })
  }

  test("typing and closing within a second keeps the text", async ({ page, browser, account }) => {
    await seedLifePlan(page, account.id, { version: 1, seq: 10, northStar: "E2E: a plan with a north star." })
    await page.goto(`${ROUTES.plan}?step=journal`)
    await expect(page.getByText("Saved to your account.")).toBeVisible({ timeout: 20_000 })

    await page.locator("#journal-day-note").fill("typed then closed")
    await page.locator("#journal-day-note").blur()
    // Well inside the four-second wait: nothing has been sent yet.
    expect(Object.values((await readDay(page)).notes)).not.toContain("typed then closed")
    const closing = Date.now()
    await page.close({ runBeforeUnload: false })
    expect(Date.now() - closing).toBeLessThan(1500)

    const other = await browser.newContext({ storageState: account.storageState })
    const reopened = await other.newPage()
    await expect.poll(async () => Object.values((await readDay(reopened)).notes), { timeout: 10_000 }).toContain("typed then closed")
    await other.close()
  })

  test("a plan edit made just before closing is kept", async ({ page, browser, account }) => {
    await seedLifePlan(page, account.id, { version: 1, seq: 10, northStar: "E2E: a plan with a north star." })
    await page.goto(`${ROUTES.plan}?step=now`)
    await expect(page.getByText("Saved to your account.")).toBeVisible({ timeout: 20_000 })
    await page.getByRole("button", { name: /^Health\. .*Open it\.$/ }).click()
    await page.getByRole("button", { name: "Rate Health 6 out of 10 for this week" }).click()
    await page.close({ runBeforeUnload: false })

    const other = await browser.newContext({ storageState: account.storageState })
    const reopened = await other.newPage()
    await expect
      .poll(async () => {
        const body = (await (await reopened.request.get("/api/life-plan")).json()) as { plan: PlanRows }
        return body.plan.review_scores.map((s) => s.score)
      }, { timeout: 10_000 })
      .toEqual([6])
    await other.close()
  })

  test("Done on a sheet saves at once, not four seconds later", async ({ page, account }) => {
    await seedLifePlan(page, account.id, { version: 1, seq: 10, northStar: "E2E: a plan with a north star." })
    await page.goto(`${ROUTES.plan}?step=now`)
    await expect(page.getByText("Saved to your account.")).toBeVisible({ timeout: 20_000 })
    await page.getByRole("button", { name: /^Health\. .*Open it\.$/ }).click()
    await page.getByRole("button", { name: "Rate Health 5 out of 10 for this week" }).click()
    // Done is the flush; it must land well before the 4 s wait is over.
    await page.getByRole("button", { name: "Done", exact: true }).click()
    await expect
      .poll(async () => {
        const body = (await (await page.request.get("/api/life-plan")).json()) as { plan: PlanRows }
        return body.plan.review_scores.map((s) => s.score)
      }, { timeout: 2_500, intervals: [100, 200, 300] })
      .toEqual([5])
  })

  test("an edit typed while a save is open still goes when the page is hidden @timing", async ({ page, account }) => {
    await seedLifePlan(page, account.id, { version: 1, seq: 10, northStar: "E2E: a plan with a north star." })
    await page.goto(`${ROUTES.plan}?step=now`)
    await expect(page.getByText("Saved to your account.")).toBeVisible({ timeout: 20_000 })
    // The first save is held open for 2.5 s.
    let held = false
    await page.route("**/api/life-plan", async (route) => {
      if (route.request().method() === "PATCH" && !held) {
        held = true
        await new Promise((done) => setTimeout(done, 2_500))
      }
      await route.continue()
    })
    await page.getByRole("button", { name: /^Health\. .*Open it\.$/ }).click()
    await page.getByRole("button", { name: "Rate Health 6 out of 10 for this week" }).click()
    await page.getByRole("button", { name: "Done", exact: true }).click()
    await expect.poll(() => held).toBe(true)
    // An edit made while that save is open.
    await page.getByRole("button", { name: /^Health\. .*Open it\.$|^Health\. .*Rated 6 out of 10\. Open it\.$/ }).click()
    await page.getByRole("button", { name: "Rate Health 8 out of 10 for this week" }).click()
    // The page is hidden (the phone is put away): no wait for the usual four seconds after the first save lands.
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { get: () => "hidden", configurable: true })
      document.dispatchEvent(new Event("visibilitychange"))
    })
    await expect
      .poll(async () => {
        const body = (await (await page.request.get("/api/life-plan")).json()) as { plan: PlanRows }
        return body.plan.review_scores.map((s) => s.score)
      }, { timeout: 4_500, intervals: [250] })
      .toEqual([8])
  })

  test("two day saves never overlap, and the newer text is the one the account keeps @timing", async ({ page, account }) => {
    await seedLifePlan(page, account.id, { version: 1, seq: 10, northStar: "E2E: a plan with a north star." })
    await page.goto(`${ROUTES.plan}?step=journal`)
    await expect(page.getByText("Saved to your account.")).toBeVisible({ timeout: 20_000 })
    const events: string[] = []
    let first = true
    await page.route("**/api/life-plan/day", async (route) => {
      if (route.request().method() !== "PUT") return route.continue()
      // The first save is slow: it is still open when the second is asked for.
      if (first) {
        first = false
        await new Promise((done) => setTimeout(done, 3_000))
      }
      await route.continue()
    })
    page.on("request", (r) => { if (r.method() === "PUT" && r.url().includes("/api/life-plan/day")) events.push(`req:${JSON.parse(r.postData() ?? "{}").note}`) })
    page.on("response", (r) => { if (r.request().method() === "PUT" && r.url().includes("/api/life-plan/day")) events.push(`res:${JSON.parse(r.request().postData() ?? "{}").note}`) })

    const note = page.locator("#journal-day-note")
    await note.fill("V1")
    await note.blur()
    // A step change sends at once.
    await page.getByRole("button", { name: /^←/ }).click()
    await expect.poll(() => events.length, { timeout: 5_000 }).toBeGreaterThan(0)
    // While V1 is open the person goes back, types V2 and changes step again.
    await page.getByRole("button", { name: /→$/ }).last().click()
    await page.locator("#journal-day-note").fill("V2")
    await page.locator("#journal-day-note").blur()
    await page.getByRole("button", { name: /^←/ }).click()

    await expect
      .poll(async () => Object.values((await readDay(page)).notes), { timeout: 15_000 })
      .toEqual(["V2"])
    expect(events, "the second save starts only after the first has been answered").toEqual(["req:V1", "res:V1", "req:V2", "res:V2"])
  })

  test("a goal title over its cap is named, and is not retried for ever @timing", async ({ page, account }) => {
    await seedLifePlan(page, account.id, {
      version: 1, seq: 3, northStar: "E2E: a plan with a north star.",
      areas: [{ id: "lm_fitness", label: "Fitness", sublabel: "Strength", color: "#0ea5e9", custom: false }],
      routines: [],
      goals: [{ id: "g1", areaId: "lm_fitness", title: "E2E gym", type: "habit_ramp", why: "", daysPerWeek: 4, perWeek: null, rampSteps: null, targetDate: null, feedsGoalIds: [], values: [] }],
      priorityIds: ["g1"], review: {}, answers: {}, currentValues: [], values: [], seasonFocusId: null,
    })
    // The input itself stops at the cap.
    await page.goto(`${ROUTES.plan}?step=today`)
    await expect(page.getByText("Saved to your account.")).toBeVisible({ timeout: 20_000 })
    await page.getByRole("button", { name: "Open E2E gym to change its date or its numbers" }).click()
    const title = page.getByLabel("Goal", { exact: true }).first()
    await expect(title).toHaveAttribute("maxlength", "500")

    // A longer title gets past the input another way (a paste into an older tab, an import):
    // the server says which field and how long, and the page does not keep sending it.
    let patches = 0
    await page.route("**/api/life-plan", async (route) => {
      if (route.request().method() !== "PATCH") return route.continue()
      patches++
      const body = JSON.parse(route.request().postData() ?? "{}")
      for (const rows of Object.values(body.changes.upsert ?? {}) as Record<string, unknown>[][]) {
        for (const row of rows) if (row.title === "E2E gym changed") row.title = "x".repeat(612)
      }
      await route.continue({ postData: JSON.stringify(body) })
    })
    await title.fill("E2E gym changed")
    await expect(page.getByText("Goal title: 612 of 500 characters")).toBeVisible({ timeout: 15_000 })
    // Two full save waits go by with no new PATCH: a refused save waits for an edit.
    const seen = patches
    await expect(page.waitForRequest((r) => r.method() === "PATCH" && r.url().endsWith("/api/life-plan"), { timeout: 9_000 })).rejects.toThrow()
    expect(patches, "a refused save is not sent again until something is edited").toBe(seen)

    // Nothing was written.
    const body = (await (await page.request.get("/api/life-plan")).json()) as { plan: PlanRows }
    expect(body.plan.goals[0].title).toBe("E2E gym")
  })
})
