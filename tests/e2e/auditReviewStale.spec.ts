import { test, expect } from "./fixtures/test"
import { devices, type Browser, type Page } from "@playwright/test"
import { randomUUID } from "node:crypto"
import { stackAdmin } from "./fixtures/stack"
import { ROUTES } from "@/src/shared/routes"

/**
 * A REVIEW SEEN STALE, AND HOURS NAMED HONESTLY (alpha prove-review-01, -02, -03).
 *
 * - A block moved on the PC, then renamed on a phone that had not reloaded:
 *   the phone is told it changed, sees the stored block, and saves its rename
 *   on top of the move. Before, the move was undone without a word.
 * - After a note-only save on the stale phone, the card shows the choice the
 *   other device stored, not the pre-filled one it opened with.
 * - "Best hours, for your hardest work" never names a weekday series or
 *   scrolling hour on the strength of weekend answers.
 *
 * The tester's two weeks (Tue 27 Oct to Mon 9 Nov 2026, Copenhagen).
 */

const Q = 15 * 60_000
const RUN_START = Date.parse("2026-10-27T07:00:00Z") // Tue 08:00 in Copenhagen
const RUN_END = Date.parse("2026-11-09T21:00:00Z") // Mon 22:00

type Seg = [string, string, string, number, number]
const WEEKDAY: Seg[] = [
  ["08:00", "08:30", "Breakfast", 5, 4],
  ["08:30", "09:00", "Scrolling", 2, 1],
  ["09:00", "11:30", "Coding the app", 5, 6],
  ["11:30", "12:00", "Email", 3, 4],
  ["12:00", "12:45", "Lunch", 5, 4],
  ["12:45", "13:30", "Avoiding work", 3, 2],
  ["13:30", "15:00", "Coding the app", 4, 6],
  ["15:00", "16:30", "Daygame", 6, 7],
  ["16:30", "17:30", "Gym", 4, 6],
  ["17:30", "18:30", "Cooking", 5, 4],
  ["18:30", "20:00", "Series", 6, 2],
  ["20:00", "21:00", "Calls with family", 6, 5],
  ["21:00", "22:00", "Scrolling", 3, 1],
]
const WEEKEND: Seg[] = [
  ["08:00", "10:00", "Sleeping in", 6, 3],
  ["10:00", "11:00", "Breakfast", 5, 4],
  ["11:00", "13:00", "Admin", 2, 3],
  ["13:00", "17:00", "daygame", 6, 7],
  ["17:00", "19:00", "Cooking", 5, 4],
  ["19:00", "22:00", "Friends", 7, 5],
]
const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3))

async function seedTwoWeeks(userId: string): Promise<string> {
  const admin = stackAdmin()
  expect((await admin.from("audit_runs").delete().eq("user_id", userId)).error).toBeNull()
  const id = randomUUID()
  const ins = await admin.from("audit_runs").insert({
    id,
    user_id: userId,
    started_at: new Date(RUN_START).toISOString(),
    ends_at: new Date(RUN_START + 14 * 86400_000).toISOString(),
    ended_at: new Date(RUN_END).toISOString(),
    quiet_start: 22 * 60,
    quiet_end: 8 * 60,
  })
  expect(ins.error).toBeNull()
  const rows: Record<string, unknown>[] = []
  let n = 0
  for (let d = 0; d < 14; d++) {
    const dayStart = RUN_START + d * 86400_000
    const dow = new Date(dayStart + 3600_000).getUTCDay()
    for (const [from, to, activity, energy, growth] of dow === 0 || dow === 6 ? WEEKEND : WEEKDAY) {
      for (let m = mins(from); m < mins(to); m += 15) {
        n++
        const at = dayStart + (m - 8 * 60) * 60_000
        if (at + Q > RUN_END || (n * 7 + d * 3) % 4 === 0) continue
        const act = activity === "Gym" && dow !== 1 && dow !== 3 && dow !== 5 ? "Admin" : activity
        rows.push({
          id: randomUUID(),
          user_id: userId,
          run_id: id,
          slot_at: new Date(at).toISOString(),
          activity: act,
          energy: act === "Admin" ? 2 : energy,
          growth: act === "Admin" ? 3 : growth,
          source: "app",
        })
      }
    }
  }
  for (let i = 0; i < rows.length; i += 400) expect((await admin.from("audit_slots").insert(rows.slice(i, i + 400))).error).toBeNull()
  return id
}

async function stored(runId: string): Promise<{ choices: Record<string, string>; notes: Record<string, string>; week: { what: string; day: number; start: number; end: number }[] }> {
  const r = await stackAdmin().from("audit_runs").select("review").eq("id", runId).single()
  expect(r.error).toBeNull()
  return r.data!.review
}

async function openReview(page: Page): Promise<void> {
  await page.goto(`${ROUTES.audit}?view=review`)
  await expect(page.getByTestId("review-activity").first()).toBeVisible({ timeout: 60_000 })
}

async function phoneOf(browser: Browser, storageState: string) {
  const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = devices["Pixel 7"]
  const ctx = await browser.newContext({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch, storageState })
  const phone = await ctx.newPage()
  await openReview(phone)
  return { phone, close: () => ctx.close() }
}

async function openBlock(page: Page, text: string) {
  await page.getByTestId("perfect-week").getByTestId("week-day-0").getByTestId("week-block").filter({ hasText: text }).click()
  const sheet = page.getByTestId("week-block-sheet")
  await expect(sheet).toBeVisible()
  return sheet
}

test.describe("a stale review on a second device", () => {
  test.setTimeout(150_000)

  test("a block moved on the PC and renamed on the stale phone keeps the move, and the phone is told first", async ({ page, browser, account }) => {
    const id = await seedTwoWeeks(account.id)
    await openReview(page)
    const week = page.getByTestId("perfect-week")
    await week.getByTestId("week-add-0").click()
    let sheet = page.getByTestId("week-block-sheet")
    await sheet.getByTestId("week-what").fill("Write the book")
    await sheet.getByRole("radio", { name: "Deep work", exact: true }).click()
    await sheet.getByTestId("week-start").selectOption("540")
    await sheet.getByTestId("week-end").selectOption("720")
    await sheet.getByTestId("week-save").click()
    await expect(sheet).toBeHidden()

    const { phone, close } = await phoneOf(browser, account.storageState)
    try {
      await expect(phone.getByTestId("week-day-0").getByTestId("week-block")).toContainText("09:00–12:00")

      // PC moves it to 13:00-16:00.
      sheet = await openBlock(page, "Write the book")
      await sheet.getByTestId("week-start").selectOption("780")
      await expect(sheet.getByTestId("week-end")).toHaveValue("960")
      await sheet.getByTestId("week-save").click()
      await expect(sheet).toBeHidden()
      expect((await stored(id)).week).toMatchObject([{ what: "Write the book", start: 780, end: 960 }])

      // The phone, still showing 09:00-12:00, only renames it: refused, with the stored block named.
      const ps = await openBlock(phone, "Write the book")
      await ps.getByTestId("week-what").fill("Write the book, chapter 2")
      await ps.getByTestId("week-save").click()
      await expect(ps.getByTestId("week-error")).toContainText('Changed on another device: now Monday 13:00–16:00, "Write the book" (Deep work)')
      expect((await stored(id)).week).toMatchObject([{ what: "Write the book", start: 780, end: 960 }])
      // The sheet now holds the stored time with the phone's new name; saving again keeps both.
      await expect(ps.getByTestId("week-start")).toHaveValue("780")
      await expect(ps.getByTestId("week-end")).toHaveValue("960")
      await expect(ps.getByTestId("week-what")).toHaveValue("Write the book, chapter 2")
      await ps.getByTestId("week-save").click()
      await expect(ps).toBeHidden()
      expect((await stored(id)).week).toMatchObject([{ what: "Write the book, chapter 2", day: 0, start: 780, end: 960 }])
      await expect(phone.getByTestId("week-day-0").getByTestId("week-block")).toContainText("13:00–16:00")
    } finally {
      await close()
    }
  })

  test("a note saved on the stale phone shows the choice the PC stored next to Saved", async ({ page, browser, account }) => {
    const id = await seedTwoWeeks(account.id)
    await openReview(page)
    const { phone, close } = await phoneOf(browser, account.storageState)
    try {
      // PC: Friends (pre-filled Do more) to Keep.
      await page.getByTestId("review-activity").filter({ hasText: "Friends" }).first().click()
      const pc = page.getByTestId("review-activity-sheet")
      await expect(pc.getByRole("radio", { name: "Do more", exact: true })).toHaveAttribute("aria-checked", "true")
      await pc.getByRole("radio", { name: "Keep", exact: true }).click()
      await pc.getByTestId("review-save").click()
      await expect(pc.getByTestId("review-saved")).toBeVisible()

      // Phone, not reloaded: opens Friends (still Do more), saves only a note.
      await phone.getByTestId("review-activity").filter({ hasText: "Friends" }).first().click()
      const s = phone.getByTestId("review-activity-sheet")
      await expect(s.getByRole("radio", { name: "Do more", exact: true })).toHaveAttribute("aria-checked", "true")
      await s.getByTestId("review-note").fill("Every Saturday")
      await s.getByTestId("review-save").click()
      await expect(s.getByTestId("review-saved")).toBeVisible()
      await expect(s.getByRole("radio", { checked: true })).toHaveText(["Keep"])
      await expect(s.getByTestId("review-note")).toHaveValue("Every Saturday")
      const r = await stored(id)
      expect(r.choices["friends"]).toBe("keep")
      expect(r.notes["friends"]).toBe("Every Saturday")
    } finally {
      await close()
    }
  })
})

test("best hours for the hardest work are the weekday daygame and coding hours, with the rule said @phone", async ({ page, account }) => {
  await seedTwoWeeks(account.id)
  await openReview(page)
  const week = page.getByTestId("perfect-week")
  await expect(week.getByTestId("week-best-hours")).toHaveText("Best hours, for your hardest work, best first: 15:00, 09:00 and 10:00.")
  await expect(week.getByTestId("week-inputs")).toContainText("Best hours are Monday-to-Friday hours where, over at least 5 work days, your energy and your growth both averaged above 4")
})
