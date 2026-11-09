import { test, expect, SIGNED_OUT, signIn } from "./fixtures/test"
import type { Page } from "@playwright/test"
import { randomUUID } from "node:crypto"
import { stackAdmin } from "./fixtures/stack"
import { whenHydrated } from "./helpers/hydration"
import { ROUTES } from "@/src/shared/routes"

/**
 * THE TIME & ENERGY AUDIT (Plans/energy-audit.md, Phase 4): start, answer,
 * fill in later. Pings come in Phase 5.
 *
 * Every test but the first seeds an open audit through the test backend, begun
 * three hours ago and with NO quiet hours, so the same quarters exist whatever
 * time of day the suite runs.
 */

const QUARTER = 15 * 60_000
const quarterStart = (ms: number) => Math.floor(ms / QUARTER) * QUARTER

async function clearAudits(userId: string): Promise<void> {
  const { error } = await stackAdmin().from("audit_runs").delete().eq("user_id", userId)
  expect(error).toBeNull()
}

/** An open audit begun `hoursAgo` hours ago, with no quiet hours. */
async function seedRun(userId: string, hoursAgo = 3): Promise<{ id: string; startedAt: number }> {
  await clearAudits(userId)
  const id = randomUUID()
  const startedAt = quarterStart(Date.now() - hoursAgo * 60 * 60_000)
  const { error } = await stackAdmin()
    .from("audit_runs")
    .insert({
      id,
      user_id: userId,
      started_at: new Date(startedAt).toISOString(),
      ends_at: new Date(startedAt + 14 * 24 * 60 * 60_000).toISOString(),
      quiet_start: 0,
      quiet_end: 0,
    })
  expect(error).toBeNull()
  return { id, startedAt }
}

async function slotsOf(userId: string, runId: string): Promise<{ slot_at: string; activity: string; energy: number; growth: number }[]> {
  const { data, error } = await stackAdmin().from("audit_slots").select("slot_at, activity, energy, growth").eq("user_id", userId).eq("run_id", runId)
  expect(error).toBeNull()
  return (data ?? []) as { slot_at: string; activity: string; energy: number; growth: number }[]
}

/** A stopped Time entry covering [from, to). */
async function seedTimeEntry(userId: string, description: string, from: number, to: number): Promise<void> {
  const admin = stackAdmin()
  const existing = await admin.from("timetrack_workspaces").select("id").eq("user_id", userId).is("deleted_at", null).maybeSingle()
  let workspaceId = existing.data?.id as string | undefined
  if (!workspaceId) {
    const made = await admin.from("timetrack_workspaces").insert({ user_id: userId }).select("id").single()
    expect(made.error).toBeNull()
    workspaceId = made.data!.id as string
  }
  const { error } = await admin.from("timetrack_entries").insert({
    user_id: userId,
    workspace_id: workspaceId,
    description,
    started_at: new Date(from).toISOString(),
    stopped_at: new Date(to).toISOString(),
    duration_seconds: Math.round((to - from) / 1000),
  })
  expect(error).toBeNull()
}

async function openAudit(page: Page): Promise<void> {
  await page.goto(ROUTES.audit)
  await whenHydrated(page.getByTestId("audit-page"), 60_000)
}

async function answerCard(page: Page, card: ReturnType<Page["getByTestId"]>, activity: string | null, energy: number, growth: number) {
  if (activity !== null) await card.getByTestId("audit-activity").fill(activity)
  const before = await page.getByTestId("audit-card-saved").count()
  // a new answer saves on the tap that completes it; a changed one waits for Save
  const autoSave = (await card.getAttribute("data-autosave")) === "yes"
  await card.getByTestId("audit-energy").getByRole("radio", { name: `Energy ${energy}` }).click()
  await card.getByTestId("audit-growth").getByRole("radio", { name: `Growth ${growth}` }).click()
  if (!autoSave) await card.getByTestId("audit-save").click()
  // the card folds into one green "Saved" line with the answer on it
  await expect(page.getByTestId("audit-card-saved")).toHaveCount(before + 1)
  await expect(page.getByTestId("audit-card-saved").filter({ hasText: `E ${energy} · G ${growth}` }).first()).toBeVisible()
}

test.describe("time & energy audit @phone", () => {
  test("starts an audit from the Start screen and sees Today", async ({ page, account }) => {
    await clearAudits(account.id)
    await openAudit(page)
    await expect(page.getByTestId("audit-start")).toContainText("Run it when you feel stuck")
    await page.getByTestId("audit-start-button").click()
    await expect(page.getByTestId("audit-today")).toBeVisible()
    await expect(page.getByTestId("audit-day-of")).toContainText("Day 1 of 14 · ends ")
  })

  test("answers a quarter pre-filled from a Time entry", async ({ page, account }) => {
    const run = await seedRun(account.id)
    const q = quarterStart(Date.now()) - QUARTER
    await seedTimeEntry(account.id, "Deep work", q - QUARTER, q + QUARTER - 60_000)
    await openAudit(page)
    await page.getByTestId("audit-answer-now").click()
    const sheet = page.getByTestId("audit-answer-sheet")
    await expect(sheet).toBeVisible()
    // One card per quarter (alpha F08): the entry fills two. Whichever quarter
    // has just ended, the newest "from Time" card is q, and q - 15 min is the
    // one before it, so ticking "Same answer for the quarter before" covers both.
    const fromTime = sheet.getByTestId("audit-card").filter({ hasText: "from Time" })
    await expect(fromTime).toHaveCount(2)
    const newest = fromTime.first()
    await expect(newest.getByTestId("audit-activity")).toHaveValue("Deep work")
    await newest.getByTestId("audit-cover").getByRole("checkbox").check()
    await expect(fromTime).toHaveCount(1)
    await answerCard(page, fromTime.first(), null, 3, 6)
    await expect.poll(async () => (await slotsOf(account.id, run.id)).filter((s) => s.activity === "Deep work").length).toBeGreaterThanOrEqual(2)
  })

  test("selects three gaps in the Day list and answers once, so three rows show", async ({ page, account }) => {
    const run = await seedRun(account.id)
    await openAudit(page)
    const gaps = page.getByTestId("audit-row-gap")
    await expect(gaps.first()).toBeVisible()
    await gaps.nth(0).click()
    await gaps.nth(2).click()
    await page.getByTestId("audit-answer-selection").click()
    const card = page.getByTestId("audit-answer-sheet").getByTestId("audit-card")
    await expect(card).toHaveCount(1)
    await expect(card).toContainText("3 quarters")
    await answerCard(page, card, "Email", 2, 3)
    await page.keyboard.press("Escape")
    await expect(page.getByTestId("audit-row-answered").filter({ hasText: "Email" })).toHaveCount(3)
    await expect.poll(async () => (await slotsOf(account.id, run.id)).length).toBe(3)
  })

  test("changes one answer and deletes one", async ({ page, account }) => {
    const run = await seedRun(account.id)
    const a = quarterStart(Date.now()) - 4 * QUARTER
    const admin = stackAdmin()
    for (const [i, activity] of ["Walk", "Reading"].entries()) {
      const { error } = await admin.from("audit_slots").insert({
        id: randomUUID(),
        user_id: account.id,
        run_id: run.id,
        slot_at: new Date(a + i * QUARTER).toISOString(),
        activity,
        energy: 4,
        growth: 4,
        source: "app",
      })
      expect(error).toBeNull()
    }
    await openAudit(page)
    await page.getByTestId("audit-row-answered").filter({ hasText: "Walk" }).click()
    const card = page.getByTestId("audit-answer-sheet").getByTestId("audit-card")
    await expect(card.getByTestId("audit-activity")).toHaveValue("Walk")
    await answerCard(page, card, "Walk in the park", 6, 5)
    await page.keyboard.press("Escape")
    await expect(page.getByTestId("audit-row-answered").filter({ hasText: "Walk in the park" })).toContainText("E 6 · G 5")

    await page.getByTestId("audit-row-answered").filter({ hasText: "Reading" }).click()
    await page.getByTestId("audit-answer-sheet").getByTestId("audit-delete").click()
    await expect(page.getByTestId("audit-row-answered").filter({ hasText: "Reading" })).toHaveCount(0)
    // sent once the 6 s "Deleted · Undo" has passed (alpha picky-eye-08)
    await expect.poll(async () => (await slotsOf(account.id, run.id)).map((s) => s.activity), { timeout: 20_000 }).toEqual(["Walk in the park"])
  })

  test("mutes for 1 h and sees Muted until", async ({ page, account }) => {
    await seedRun(account.id)
    await openAudit(page)
    await page.getByTestId("audit-mute-open").click()
    await page.getByTestId("audit-mute-sheet").getByRole("button", { name: /^1 hour/ }).click()
    await expect(page.getByTestId("audit-mute-open")).toContainText(/Muted until \d\d:\d\d/)
    await page.getByTestId("audit-mute-open").click()
    await page.getByTestId("audit-unmute").click()
    await expect(page.getByTestId("audit-mute-open")).toHaveText("Mute")
  })

  test("End now asks first, opens the review, and Back shows the Start screen with one past audit", async ({ page, account }) => {
    await seedRun(account.id)
    await openAudit(page)
    await page.getByTestId("audit-end-open").click()
    await expect(page.getByTestId("audit-end-confirm")).toContainText("End the audit now?")
    await page.getByTestId("audit-end-confirm-button").click()
    await expect(page.getByTestId("review")).toBeVisible()
    await expect(page.getByTestId("review-empty")).toBeVisible()
    await page.getByTestId("review-back").click()
    await expect(page.getByTestId("audit-start")).toBeVisible()
    await expect(page.getByTestId("audit-past-row")).toHaveCount(1)
  })

  test("the review puts seeded activities in the right boxes, and a choice and note survive a reload", async ({ page, account }) => {
    await clearAudits(account.id)
    const admin = stackAdmin()
    // A finished run of one day: 10:00 to 12:00 UTC, no quiet hours, so 8 possible quarters.
    const id = randomUUID()
    const start = Date.parse("2026-11-02T10:00:00Z")
    expect(
      (
        await admin.from("audit_runs").insert({
          id,
          user_id: account.id,
          started_at: new Date(start).toISOString(),
          ends_at: new Date(start + 14 * 86400_000).toISOString(),
          ended_at: new Date(start + 2 * 3600_000).toISOString(),
          quiet_start: 0,
          quiet_end: 0,
        })
      ).error,
    ).toBeNull()
    const rows = [
      ["Daygame", 6, 7],
      ["Daygame", 5, 7],
      ["Gym", 3, 6],
      ["Scrolling", 2, 1],
      ["Scrolling", 3, 2],
      ["Series", 6, 2],
    ] as const
    const { error } = await admin.from("audit_slots").insert(
      rows.map(([activity, energy, growth], i) => ({
        id: randomUUID(),
        user_id: account.id,
        run_id: id,
        slot_at: new Date(start + i * QUARTER).toISOString(),
        activity,
        energy,
        growth,
        why: activity === "Scrolling" && i === 4 ? "Avoiding the email" : null,
        source: "app",
      })),
    )
    expect(error).toBeNull()

    await page.goto(`${ROUTES.audit}?view=review`)
    await expect(page.getByTestId("review-basis")).toHaveText(
      "You answered 6 of 8 quarters (1.5 of 2 waking hours). Quarters you did not answer are not counted.",
      { timeout: 60_000 },
    )
    await expect(page.getByTestId("review-activity").first()).toContainText("Daygame")
    await expect(page.getByTestId("review-box-more")).toContainText("Daygame")
    await expect(page.getByTestId("review-box-costs")).toContainText("Gym")
    await expect(page.getByTestId("review-box-cut")).toContainText("Scrolling")
    await expect(page.getByTestId("review-box-fun")).toContainText("Series")
    await expect(page.getByTestId("review-box-more")).toContainText("33%")

    await page.getByTestId("review-activity").filter({ hasText: "Scrolling" }).click()
    const sheet = page.getByTestId("review-activity-sheet")
    await expect(sheet).toContainText("Avoiding the email")
    await sheet.getByRole("radio", { name: "Cut" }).click()
    await sheet.getByTestId("review-note").fill("Phone in the other room after 21:00")
    await sheet.getByTestId("review-save").click()
    await expect(sheet.getByTestId("review-saved")).toBeVisible()

    await page.reload()
    await page.getByTestId("audit-past-row").first().click()
    await page.getByTestId("review-activity").filter({ hasText: "Scrolling" }).click()
    await expect(sheet.getByRole("radio", { name: "Cut" })).toHaveAttribute("aria-checked", "true")
    await expect(sheet.getByTestId("review-note")).toHaveValue("Phone in the other room after 21:00")
  })

  test("the perfect week: plan a block from Do more, an overlap is refused, it survives a reload, and the choices stay", async ({ page, account }) => {
    await clearAudits(account.id)
    const admin = stackAdmin()
    const id = randomUUID()
    const start = Date.parse("2026-11-02T10:00:00Z")
    expect(
      (
        await admin.from("audit_runs").insert({
          id,
          user_id: account.id,
          started_at: new Date(start).toISOString(),
          ends_at: new Date(start + 14 * 86400_000).toISOString(),
          ended_at: new Date(start + 2 * 3600_000).toISOString(),
          quiet_start: 0,
          quiet_end: 0,
          review: { choices: { daygame: "more" }, notes: { daygame: "Mornings" } },
        })
      ).error,
    ).toBeNull()
    const { error } = await admin.from("audit_slots").insert(
      (["Daygame", "Daygame", "Gym"] as const).map((activity, i) => ({
        id: randomUUID(),
        user_id: account.id,
        run_id: id,
        slot_at: new Date(start + i * QUARTER).toISOString(),
        activity,
        energy: 6,
        growth: 7,
        source: "app",
      })),
    )
    expect(error).toBeNull()

    await page.goto(`${ROUTES.audit}?view=review`)
    const week = page.getByTestId("perfect-week")
    await expect(week.getByTestId("week-inputs")).toContainText("Do more: Daygame", { timeout: 60_000 })
    await expect(week.getByTestId("week-day-0")).toContainText("Nothing planned.")

    await week.getByTestId("week-add-0").click()
    const sheet = page.getByTestId("week-block-sheet")
    await sheet.getByRole("button", { name: "Daygame" }).click()
    await expect(sheet.getByTestId("week-what")).toHaveValue("Daygame")
    await sheet.getByRole("radio", { name: "People" }).click()
    await sheet.getByTestId("week-start").selectOption("540")
    await sheet.getByTestId("week-end").selectOption("660")
    await sheet.getByTestId("week-save").click()
    await expect(sheet).toBeHidden()
    await expect(week.getByTestId("week-day-0").getByTestId("week-block")).toContainText("09:00–11:00")
    await expect(week.getByTestId("week-totals")).toContainText("People 2 h")

    await week.getByTestId("week-add-0").click()
    await sheet.getByTestId("week-what").fill("Gym")
    await sheet.getByRole("radio", { name: "Workout or hobby" }).click()
    await sheet.getByTestId("week-start").selectOption("600")
    await sheet.getByTestId("week-end").selectOption("720")
    await sheet.getByTestId("week-save").click()
    await expect(sheet.getByTestId("week-error")).toContainText('"Gym" overlaps "Daygame" on Monday')
    await sheet.getByTestId("week-start").selectOption("660")
    await sheet.getByTestId("week-save").click()
    await expect(sheet).toBeHidden()
    await expect(week.getByTestId("week-day-0").getByTestId("week-block")).toHaveCount(2)

    await page.reload()
    await page.getByTestId("audit-past-row").first().click()
    await expect(week.getByTestId("week-day-0").getByTestId("week-block")).toHaveCount(2, { timeout: 60_000 })
    const stored = await admin.from("audit_runs").select("review").eq("id", id).single()
    expect(stored.data?.review.choices).toEqual({ daygame: "more" })
    expect(stored.data?.review.notes).toEqual({ daygame: "Mornings" })

    // A choice saved afterwards keeps the week.
    await page.getByTestId("review-activity").filter({ hasText: "Gym" }).click()
    const activity = page.getByTestId("review-activity-sheet")
    await activity.getByRole("radio", { name: "Keep" }).click()
    await activity.getByTestId("review-save").click()
    await expect(activity.getByTestId("review-saved")).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(week.getByTestId("week-day-0").getByTestId("week-block")).toHaveCount(2)

    // A page from before the perfect week sends choices and notes only: the week stays.
    const old = await page.request.patch(`/api/audit/runs/${id}`, { data: { review: { choices: { daygame: "more" }, notes: {} } } })
    expect(old.status()).toBe(200)
    const after = await admin.from("audit_runs").select("review").eq("id", id).single()
    expect(after.data?.review.week).toHaveLength(2)
    expect(after.data?.review.notes).toEqual({})

    await week.getByTestId("week-day-0").getByTestId("week-block").filter({ hasText: "Gym" }).click()
    await sheet.getByTestId("week-delete").click()
    await expect(sheet).toBeHidden()
    await expect(week.getByTestId("week-day-0").getByTestId("week-block")).toHaveCount(1)
  })

  test("answers while offline, and the answer is saved once when the signal returns", async ({ page, context, account }) => {
    const run = await seedRun(account.id)
    await openAudit(page)
    await expect(page.getByTestId("audit-row-gap").first()).toBeVisible()
    await context.setOffline(true)
    await page.getByTestId("audit-row-gap").first().click()
    await page.getByTestId("audit-answer-selection").click()
    await answerCard(page, page.getByTestId("audit-answer-sheet").getByTestId("audit-card"), "Daygame", 5, 7)
    await page.keyboard.press("Escape")
    await expect(page.getByTestId("audit-waiting")).toContainText("saved on this phone")
    await expect(page.getByTestId("audit-row-answered").filter({ hasText: "Daygame" })).toHaveCount(1)
    expect(await slotsOf(account.id, run.id)).toEqual([])
    await context.setOffline(false)
    await page.evaluate(() => window.dispatchEvent(new Event("online")))
    await expect(page.getByTestId("audit-waiting")).toBeHidden({ timeout: 20_000 })
    await expect.poll(async () => (await slotsOf(account.id, run.id)).length).toBe(1)
    await page.reload()
    await expect(page.getByTestId("audit-row-answered").filter({ hasText: "Daygame" })).toHaveCount(1)
  })

  test("a queued answer is wiped at Log Out: the next account sees none of it", async ({ browser, throwawayAccount, secondUser }) => {
    test.setTimeout(150_000)
    const baseURL = test.info().project.use.baseURL
    const context = await browser.newContext({ storageState: SIGNED_OUT, baseURL, viewport: { width: 1366, height: 900 } })
    try {
      const page = await context.newPage()
      await signIn(page, throwawayAccount)
      await seedRun(throwawayAccount.id)
      await openAudit(page)
      await page.route("**/api/audit/slots", (route) => route.abort("internetdisconnected"))
      await page.getByTestId("audit-row-gap").first().click()
      await page.getByTestId("audit-answer-selection").click()
      await answerCard(page, page.getByTestId("audit-answer-sheet").getByTestId("audit-card"), "Private thing", 2, 2)
      await page.keyboard.press("Escape")
      expect(await page.evaluate(() => localStorage.getItem("audit-queue-v1"))).toContain("Private thing")

      await page.goto("/dashboard", { waitUntil: "domcontentloaded" })
      await whenHydrated(page.getByTestId("header-logout-button"), 60_000)
      await page.getByTestId("header-logout-button").click()
      // It cannot be sent (no signal for it), so Log Out names it first (alpha
      // fast-audit-01); only "Log out anyway" throws it away.
      await page.getByTestId("log-out-anyway").click({ timeout: 20_000 })
      await expect.poll(() => new URL(page.url()).pathname, { timeout: 30_000 }).toBe("/")
      expect(await page.evaluate(() => localStorage.getItem("audit-queue-v1"))).toBeNull()

      await signIn(page, secondUser)
      await openAudit(page)
      await expect(page.getByText("Private thing")).toHaveCount(0)
    } finally {
      await context.close()
    }
  })

  test("a ping's address opens the answer sheet, then the page's own address", async ({ page, account }) => {
    await seedRun(account.id)
    const slot = new Date(quarterStart(Date.now()) - QUARTER).toISOString()
    await page.goto(`${ROUTES.audit}?answer=${encodeURIComponent(slot)}&send=${randomUUID()}`)
    await expect(page.getByTestId("audit-answer-sheet")).toBeVisible({ timeout: 60_000 })
    await expect(page.getByTestId("audit-answer-sheet").getByTestId("audit-card").first()).toBeVisible()
    expect(new URL(page.url()).search).toBe("")
  })

  test("with no device getting pings, the page offers to turn them on", async ({ page, account }) => {
    await seedRun(account.id)
    const { devices } = await (await page.request.get("/api/notifications/devices")).json()
    for (const d of devices as { id: string }[]) await page.request.delete(`/api/notifications/devices/${d.id}`)
    await openAudit(page)
    await expect(page.getByText("Pings are off on the development server").or(page.getByTestId("audit-pings-offer")).or(page.getByText("Pings need the Home Screen app")).or(page.getByText("This browser can't receive pings"))).toBeVisible()
    await page.getByTestId("audit-settings-open").click()
    await expect(page.getByTestId("audit-settings-sheet")).toContainText("Devices that get pings")
  })

  // ---- From the adversarial audit (Plans/energy-audit.md, Phase 7); each was red before its fix. ----

  test("saved rows stay on screen while a slow read is on its way", async ({ page, account }) => {
    await seedRun(account.id)
    await openAudit(page)
    // every read from now on takes 3 seconds, like a weak signal
    await page.route(/\/api\/audit(\?.*)?$/, async (route) => {
      await new Promise((r) => setTimeout(r, 3000))
      await route.continue()
    })
    const gaps = page.getByTestId("audit-row-gap")
    await gaps.nth(0).click()
    await gaps.nth(2).click()
    await page.getByTestId("audit-answer-selection").click()
    const confirmed = page.waitForResponse((r) => r.url().endsWith("/api/audit/slots") && r.request().method() === "PUT" && r.ok())
    await answerCard(page, page.getByTestId("audit-answer-sheet").getByTestId("audit-card"), "Slow signal", 4, 4)
    await page.keyboard.press("Escape")
    // The server has confirmed, the answers have left the queue, and the read
    // that includes them is still 3 seconds away: they must still be drawn.
    await confirmed
    const reRead = page.waitForResponse((r) => /\/api\/audit(\?.*)?$/.test(r.url()))
    const rows = page.getByTestId("audit-row-answered").filter({ hasText: "Slow signal" })
    expect(await rows.count()).toBe(3)
    await expect(page.getByTestId("audit-waiting")).toBeHidden()
    expect(await rows.count()).toBe(3)
    await reRead
    await expect(rows).toHaveCount(3)
  })

  test("an edit made while the first save is still on its way is the one saved", async ({ page, account }) => {
    const run = await seedRun(account.id)
    await openAudit(page)
    let first = true
    await page.route("**/api/audit/slots", async (route) => {
      if (first) {
        first = false
        await new Promise((r) => setTimeout(r, 4000))
      }
      await route.continue()
    })
    await page.getByTestId("audit-row-gap").first().click()
    await page.getByTestId("audit-answer-selection").click()
    await answerCard(page, page.getByTestId("audit-answer-sheet").getByTestId("audit-card"), "First version", 3, 3)
    await page.getByRole("button", { name: /^Change the answer for/ }).click()
    await answerCard(page, page.getByTestId("audit-answer-sheet").getByTestId("audit-card"), "Edited version", 5, 5)
    await expect.poll(async () => (await slotsOf(account.id, run.id)).map((s) => s.activity), { timeout: 20_000 }).toEqual(["Edited version"])
  })

  test("two tabs offline: both tabs' answers are saved", async ({ page, context, account }) => {
    const run = await seedRun(account.id)
    await openAudit(page)
    const tab2 = await context.newPage()
    await openAudit(tab2)
    await context.setOffline(true)
    for (const [tab, name, n] of [[page, "Tab one", 0], [tab2, "Tab two", 1]] as const) {
      await tab.getByTestId("audit-row-gap").nth(n).click()
      await tab.getByTestId("audit-answer-selection").click()
      await answerCard(tab, tab.getByTestId("audit-answer-sheet").getByTestId("audit-card"), name, 4, 4)
      await tab.keyboard.press("Escape")
    }
    await page.close()
    await context.setOffline(false)
    await tab2.evaluate(() => window.dispatchEvent(new Event("online")))
    await expect.poll(async () => (await slotsOf(account.id, run.id)).map((s) => s.activity).sort(), { timeout: 20_000 }).toEqual(["Tab one", "Tab two"])
  })

  test("a ping tapped hours later still offers the quarter it asked about", async ({ page, account }) => {
    await seedRun(account.id, 8)
    const asked = new Date(quarterStart(Date.now()) - 6 * 60 * 60_000)
    await page.goto(`${ROUTES.audit}?answer=${encodeURIComponent(asked.toISOString())}&send=${randomUUID()}`)
    const cards = page.getByTestId("audit-answer-sheet").getByTestId("audit-card")
    await expect(cards.first()).toBeVisible({ timeout: 60_000 })
    const label = await page.evaluate((ms) => {
      const f = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Copenhagen" })
      return `${f(new Date(ms))}–${f(new Date(ms + 15 * 60_000))}`
    }, asked.getTime())
    await expect(cards.first()).toContainText(label)
  })

  test("changing quiet hours keeps answers already given visible, and Settings says Saved", async ({ page, account }) => {
    const run = await seedRun(account.id)
    const first = run.startedAt
    const { error } = await stackAdmin()
      .from("audit_slots")
      .insert({ id: randomUUID(), user_id: account.id, run_id: run.id, slot_at: new Date(first).toISOString(), activity: "Early answer", energy: 4, growth: 4, source: "app" })
    expect(error).toBeNull()
    await openAudit(page)
    await expect(page.getByTestId("audit-row-answered").filter({ hasText: "Early answer" })).toHaveCount(1)
    // make the answered quarter's time quiet: quiet from its start until an hour later, every day
    const minute = await page.evaluate((ms) => {
      const d = new Date(ms)
      const [h, m] = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Copenhagen" }).split(":").map(Number)
      return h * 60 + m
    }, first)
    await page.getByTestId("audit-settings-open").click()
    await page.locator("#audit-quiet-start").selectOption(String(minute))
    await page.locator("#audit-quiet-end").selectOption(String((minute + 60) % 1440))
    await page.getByTestId("audit-quiet-save").click()
    await expect(page.getByTestId("audit-settings-sheet").getByRole("status")).toHaveText("✓ Saved")
    await page.keyboard.press("Escape")
    await page.reload()
    await expect(page.getByTestId("audit-row-answered").filter({ hasText: "Early answer" })).toHaveCount(1)
  })

  for (const width of [360, 390]) {
    test(`the answer sheet has no sideways scroll at ${width} px`, async ({ page, account }) => {
      await page.setViewportSize({ width, height: 800 })
      await seedRun(account.id)
      await openAudit(page)
      await page.getByTestId("audit-answer-now").click()
      await expect(page.getByTestId("audit-answer-sheet").getByTestId("audit-card").first()).toBeVisible()
      const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
      expect(fits).toBe(true)
    })
  }
})
