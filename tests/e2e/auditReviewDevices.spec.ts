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
  await sheet.getByRole("radio", { name: "Deep work" }).click()
  // From first: a new From moves To along with it.
  await sheet.getByTestId("week-start").selectOption(String(start))
  await sheet.getByTestId("week-end").selectOption(String(end))
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

test("a stale sheet never overwrites a newer note, nor brings back a block removed elsewhere", async ({ page, browser, account }) => {
  test.setTimeout(150_000) // two devices, a reload, and five saves
  const id = await seedEndedRun(account.id)
  await openReview(page)
  const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = devices["Pixel 7"]
  const phoneCtx = await browser.newContext({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch, storageState: account.storageState })
  try {
    const phone = await phoneCtx.newPage()
    await openReview(phone)
    await addBlock(page, 0, "Write the book", 540, 720)

    // PC opens the Daygame sheet; the phone then saves a note for Daygame.
    await page.getByTestId("review-activity").filter({ hasText: "Daygame" }).first().click()
    const sheet = page.getByTestId("review-activity-sheet")
    await expect(sheet.getByTestId("review-note")).toHaveValue("")
    await choose(phone, "Daygame", "Do more", "Mornings")
    await sheet.getByRole("radio", { name: "Keep", exact: true }).click()
    await sheet.getByTestId("review-note").fill("Evenings")
    await sheet.getByTestId("review-save").click()
    await expect(sheet.getByRole("alert")).toContainText("changed on another device")
    await expect(sheet.getByTestId("review-note")).toHaveValue("Mornings")
    // The choice changed there too (Do more saved): it is shown, not the Keep picked here.
    await expect(sheet.getByRole("radio", { name: "Do more", exact: true })).toHaveAttribute("aria-checked", "true")
    expect((await stored(id)).notes).toEqual({ daygame: "Mornings" })
    // Saving again now, knowingly, goes through.
    await sheet.getByTestId("review-note").fill("Mornings and evenings")
    await sheet.getByTestId("review-save").click()
    await expect(sheet.getByTestId("review-saved")).toBeVisible()
    expect((await stored(id)).notes).toEqual({ daygame: "Mornings and evenings" })
    await page.keyboard.press("Escape")

    // PC opens its block; the phone (opened again, so it sees it) removes it; PC's save is refused, not re-added.
    await page.getByTestId("perfect-week").getByTestId("week-block").filter({ hasText: "Write the book" }).click()
    const blockSheet = page.getByTestId("week-block-sheet")
    await openReview(phone)
    await phone.getByTestId("week-block").filter({ hasText: "Write the book" }).click()
    await phone.getByTestId("week-block-sheet").getByTestId("week-delete").click()
    await expect(phone.getByTestId("week-block-sheet")).toBeHidden()
    await blockSheet.getByTestId("week-what").fill("Write the book, chapter 2")
    await blockSheet.getByTestId("week-save").click()
    await expect(blockSheet.getByTestId("week-error")).toContainText("removed on another device")
    expect((await stored(id)).week).toEqual([])
  } finally {
    await phoneCtx.close()
  }
})

test("a note saved on one device keeps a choice saved on another, and a stale choice is refused, not written over it", async ({ page, browser, account }) => {
  test.setTimeout(150_000) // two devices and four saves
  const id = await seedEndedRun(account.id)
  await openReview(page)
  const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = devices["Pixel 7"]
  const phoneCtx = await browser.newContext({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch, storageState: account.storageState })
  try {
    const phone = await phoneCtx.newPage()
    await openReview(phone)

    // PC opens Daygame (top box, so "Do more" is pre-filled); the phone then saves Keep for it.
    await page.getByTestId("review-activity").filter({ hasText: "Daygame" }).first().click()
    const sheet = page.getByTestId("review-activity-sheet")
    await expect(sheet.getByRole("radio", { name: "Do more", exact: true })).toHaveAttribute("aria-checked", "true")
    await choose(phone, "Daygame", "Keep", "")
    expect((await stored(id)).choices).toEqual({ daygame: "keep" })

    // PC changes only the note: the phone's Keep stays.
    await sheet.getByTestId("review-note").fill("Mornings")
    await sheet.getByTestId("review-save").click()
    await expect(sheet.getByTestId("review-saved")).toBeVisible()
    expect(await stored(id)).toMatchObject({ choices: { daygame: "keep" }, notes: { daygame: "Mornings" } })
    // Next to Saved the PC shows the stored Keep, not the pre-filled Do more it opened with (alpha prove-review-03).
    await expect(sheet.getByRole("radio", { checked: true })).toHaveText(["Keep"])

    // The phone changes it again; the PC, still holding Keep, picks Cut: refused, and the newer choice is shown.
    await openReview(phone) // the phone reads the PC's note first
    await choose(phone, "Daygame", "Hand off", "Mornings")
    expect((await stored(id)).choices).toEqual({ daygame: "handoff" })
    await sheet.getByRole("radio", { name: "Cut", exact: true }).click()
    await sheet.getByTestId("review-save").click()
    await expect(sheet.getByRole("alert")).toContainText("changed on another device")
    await expect(sheet.getByRole("radio", { name: "Hand off", exact: true })).toHaveAttribute("aria-checked", "true")
    expect((await stored(id)).choices).toEqual({ daygame: "handoff" })

    // Picking it again, knowingly, goes through.
    await sheet.getByRole("radio", { name: "Cut", exact: true }).click()
    await sheet.getByTestId("review-save").click()
    await expect(sheet.getByTestId("review-saved")).toBeVisible()
    expect((await stored(id)).choices).toEqual({ daygame: "cut" })
  } finally {
    await phoneCtx.close()
  }
})

test("a week this version cannot read survives a choice saved over it", async ({ page, account }) => {
  const id = await seedEndedRun(account.id)
  const oldWeek = [{ id: "x", day: 9, start: 0, end: 15, what: "Old shape", kind: "deep" }]
  expect((await stackAdmin().from("audit_runs").update({ review: { choices: {}, notes: {}, week: oldWeek } }).eq("id", id)).error).toBeNull()
  await openReview(page)
  await choose(page, "Gym", "Keep", "")
  const review = await stored(id)
  expect(review.choices).toEqual({ gym: "keep" })
  expect(review.week).toEqual(oldWeek)
})

test("a page from before reviewChange, saving at the same moment, keeps every block", async ({ page, account }) => {
  const id = await seedEndedRun(account.id)
  await openReview(page)
  const sends = [
    ...Array.from({ length: 5 }, (_, i) =>
      page.request.patch(`/api/audit/runs/${id}`, { data: { reviewChange: { block: { id: `b${i}`, day: i, start: 60, end: 120, what: `Block ${i}`, kind: "deep" } } } }),
    ),
    page.request.patch(`/api/audit/runs/${id}`, { data: { review: { notes: { gym: "old page" } } } }),
  ]
  for (const res of await Promise.all(sends)) expect(res.status()).toBe(200)
  const review = await stored(id)
  expect(review.week.map((b) => b.what).sort()).toEqual(["Block 0", "Block 1", "Block 2", "Block 3", "Block 4"])
  expect(review.notes).toEqual({ gym: "old page" })
})

test("on one device, choices made one after another without waiting for Saved all stay (picky-eye-01)", async ({ page, account }) => {
  const id = await seedEndedRun(account.id)
  await openReview(page)
  const sheet = page.getByTestId("review-activity-sheet")
  for (const [activity, choice] of [["Scrolling", "Cut"], ["Daygame", "Do more"], ["Gym", "Keep"]] as const) {
    await page.getByTestId("review-activity").filter({ hasText: activity }).first().click()
    await expect(sheet).toContainText(activity)
    await sheet.getByRole("radio", { name: choice, exact: true }).click()
    await sheet.getByTestId("review-save").click()
    await page.keyboard.press("Escape") // closed before "Saved" shows
    await expect(sheet).toBeHidden()
  }
  await expect.poll(async () => (await stored(id)).choices).toEqual({ scrolling: "cut", daygame: "more", gym: "keep" })
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
