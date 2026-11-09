import { test, expect } from "./fixtures/test"
import { devices, type Page } from "@playwright/test"
import { randomUUID } from "node:crypto"
import { stackAdmin } from "./fixtures/stack"
import { ROUTES } from "@/src/shared/routes"

/**
 * ONE REVIEW OPEN ON TWO DEVICES (alpha findings fast-review-01 and -02).
 *
 * A device opened earlier and never reloaded saves a block or a choice: what
 * the other device saved meanwhile stays, and returning to the tab shows it.
 */

const QUARTER = 15 * 60_000

async function seedEndedRun(userId: string): Promise<string> {
  const admin = stackAdmin()
  expect((await admin.from("audit_runs").delete().eq("user_id", userId)).error).toBeNull()
  const id = randomUUID()
  const start = Date.parse("2026-11-02T10:00:00Z")
  expect(
    (
      await admin.from("audit_runs").insert({
        id,
        user_id: userId,
        started_at: new Date(start).toISOString(),
        ends_at: new Date(start + 14 * 86400_000).toISOString(),
        ended_at: new Date(start + 2 * 3600_000).toISOString(),
        quiet_start: 0,
        quiet_end: 0,
      })
    ).error,
  ).toBeNull()
  const { error } = await admin.from("audit_slots").insert(
    (["Daygame", "Daygame", "Scrolling", "Gym"] as const).map((activity, i) => ({
      id: randomUUID(),
      user_id: userId,
      run_id: id,
      slot_at: new Date(start + i * QUARTER).toISOString(),
      activity,
      energy: 5,
      growth: 5,
      source: "app",
    })),
  )
  expect(error).toBeNull()
  return id
}

async function stored(runId: string): Promise<{ choices: Record<string, string>; notes: Record<string, string>; week: { what: string }[] }> {
  const r = await stackAdmin().from("audit_runs").select("review").eq("id", runId).single()
  expect(r.error).toBeNull()
  return r.data!.review
}

async function openReview(page: Page): Promise<void> {
  await page.goto(`${ROUTES.audit}?view=review`)
  await expect(page.getByTestId("review-activity").first()).toBeVisible({ timeout: 60_000 })
}

async function addBlock(page: Page, day: number, what: string, start: number, end: number): Promise<void> {
  await page.getByTestId("perfect-week").getByTestId(`week-add-${day}`).click()
  const sheet = page.getByTestId("week-block-sheet")
  await sheet.getByTestId("week-what").fill(what)
  await sheet.getByTestId("week-end").selectOption(String(end))
  await sheet.getByTestId("week-start").selectOption(String(start))
  await sheet.getByTestId("week-save").click()
  await expect(sheet).toBeHidden()
}

async function choose(page: Page, activity: string, choice: string, note: string): Promise<void> {
  await page.getByTestId("review-activity").filter({ hasText: activity }).first().click()
  const sheet = page.getByTestId("review-activity-sheet")
  await expect(sheet).toContainText(activity)
  const radio = sheet.getByRole("radio", { name: choice, exact: true })
  await radio.click()
  await expect(radio).toHaveAttribute("aria-checked", "true")
  await sheet.getByTestId("review-note").fill(note)
  await sheet.getByTestId("review-save").click()
  await expect(sheet.getByTestId("review-saved")).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(sheet).toBeHidden()
}

test("blocks, choices and notes saved on two devices at once all stay", async ({ page, browser, account }) => {
  const id = await seedEndedRun(account.id)
  await openReview(page)
  const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = devices["Pixel 7"]
  const phoneCtx = await browser.newContext({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch, storageState: account.storageState })
  try {
    const phone = await phoneCtx.newPage()
    await openReview(phone)

    // Each device saves while holding the review it loaded before the other saved.
    await addBlock(page, 0, "Write the book", 540, 720)
    await addBlock(phone, 1, "Gym", 1020, 1080)
    expect((await stored(id)).week.map((b) => b.what).sort()).toEqual(["Gym", "Write the book"])

    await choose(page, "Daygame", "Do more", "Mornings")
    await choose(phone, "Scrolling", "Cut", "Phone in the other room")
    const review = await stored(id)
    expect(review.choices).toEqual({ daygame: "more", scrolling: "cut" })
    expect(review.notes).toEqual({ daygame: "Mornings", scrolling: "Phone in the other room" })

    // Removing a block on one device leaves the other device's block.
    await page.getByTestId("perfect-week").getByTestId("week-block").filter({ hasText: "Write the book" }).click()
    await page.getByTestId("week-block-sheet").getByTestId("week-delete").click()
    await expect(page.getByTestId("week-block-sheet")).toBeHidden()
    expect((await stored(id)).week.map((b) => b.what)).toEqual(["Gym"])

    // The phone, back on its tab, shows what the other device did.
    await phone.evaluate(() => document.dispatchEvent(new Event("visibilitychange")))
    await expect(phone.getByTestId("week-block")).toHaveText([/Gym/])
    await expect(phone.getByTestId("perfect-week").getByTestId("week-inputs")).toContainText("Do more: Daygame")
    await expect(page.getByTestId("week-block")).toHaveText([/Gym/])
  } finally {
    await phoneCtx.close()
  }
})

test("ten changes sent at the same moment all land", async ({ page, account }) => {
  const id = await seedEndedRun(account.id)
  await openReview(page)
  const sends = Array.from({ length: 10 }, (_, i) =>
    page.request.patch(`/api/audit/runs/${id}`, {
      data: { reviewChange: i % 2 ? { activity: `thing ${i}`, choice: "keep", note: `n${i}` } : { block: { id: `b${i}`, day: i % 7, start: i * 60, end: i * 60 + 30, what: `Block ${i}`, kind: "deep" } } },
    }),
  )
  for (const res of await Promise.all(sends)) expect(res.status()).toBe(200)
  const review = await stored(id)
  expect(Object.keys(review.choices).sort()).toEqual(["thing 1", "thing 3", "thing 5", "thing 7", "thing 9"])
  expect(review.week.map((b) => b.what).sort()).toEqual(["Block 0", "Block 2", "Block 4", "Block 6", "Block 8"])
})
