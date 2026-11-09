import { test, expect, SIGNED_OUT, signIn } from "./fixtures/test"
import type { Locator, Page } from "@playwright/test"
import { randomUUID } from "node:crypto"
import { stackAdmin } from "./fixtures/stack"
import { whenHydrated } from "./helpers/hydration"
import { ROUTES } from "@/src/shared/routes"

/**
 * ANSWERING A PING — alpha test findings of 2026-11-09, severity 4, from the
 * testers' own steps (~/.cache/daygame-research/alpha/findings.jsonl):
 *
 *  F08 (fast-audit-07, picky-eye-03) blank quarters merged into one card, so
 *      one Save wrote the same answer into up to 12 of them.
 *  F09 (picky-eye-02) a tapped ping opened on an older stretch; the quarter
 *      it asked about sat below the fold.
 *  F10 (fast-audit-06, picky-eye-04) 5 taps per answer, budget 3; Save below
 *      the fold on a phone.
 *  F11 (fast-audit-08) the page read the audit twice before opening the sheet.
 *  F12 (picky-eye-08) Delete was one tap with no way back.
 *  F13 (picky-eye-09) the mute sheet said "Pings are on" with no device to ping.
 *
 * Every test seeds an open audit begun three hours ago with no quiet hours.
 * Quarters are counted back from the quarter that ended LAST at the moment
 * the test asks, so a run that crosses a quarter boundary still names real,
 * ended quarters.
 */

const Q = 15 * 60_000
const H = 60 * 60_000
const qStart = (ms: number) => Math.floor(ms / Q) * Q

/** An open audit, and no Time entries: a worker's account carries over from its earlier tests. */
async function seedRun(userId: string): Promise<string> {
  const admin = stackAdmin()
  expect((await admin.from("audit_runs").delete().eq("user_id", userId)).error).toBeNull()
  expect((await admin.from("timetrack_entries").delete().eq("user_id", userId)).error).toBeNull()
  const id = randomUUID()
  const startedAt = qStart(Date.now() - 3 * H)
  const { error } = await admin.from("audit_runs").insert({
    id,
    user_id: userId,
    started_at: new Date(startedAt).toISOString(),
    ends_at: new Date(startedAt + 14 * 24 * H).toISOString(),
    quiet_start: 0,
    quiet_end: 0,
  })
  expect(error).toBeNull()
  return id
}

/** Answer every quarter of the run except `open` ones, so the sheet holds just those. */
async function answerAllBut(userId: string, runId: string, open: number[]): Promise<void> {
  const last = qStart(Date.now()) - Q
  const rows = []
  for (let q = qStart(Date.now() - 3 * H); q <= last; q += Q) {
    if (open.includes(q)) continue
    rows.push({ id: randomUUID(), user_id: userId, run_id: runId, slot_at: new Date(q).toISOString(), activity: "Earlier", energy: 4, growth: 4, source: "app" })
  }
  const { error } = await stackAdmin().from("audit_slots").insert(rows)
  expect(error).toBeNull()
}

async function slotsOf(userId: string, runId: string): Promise<{ slot_at: string; activity: string }[]> {
  const { data, error } = await stackAdmin().from("audit_slots").select("slot_at, activity").eq("user_id", userId).eq("run_id", runId).order("slot_at")
  expect(error).toBeNull()
  return (data ?? []) as { slot_at: string; activity: string }[]
}

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

const labelOf = (q: number) => {
  const f = (x: number) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Copenhagen", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(x))
  return `${f(q)}–${f(q + Q)}`
}

const pingUrl = (q: number) => `${ROUTES.audit}?answer=${encodeURIComponent(new Date(q).toISOString())}&send=${randomUUID()}`

/** Fully on screen, with no scrolling. */
async function inView(page: Page, el: Locator): Promise<boolean> {
  const box = await el.boundingBox()
  const vp = page.viewportSize()!
  return box !== null && box.y >= 0 && box.y + box.height <= vp.height
}

test.describe("answering a ping @phone", () => {
  test("F08: each blank quarter is its own card, and one answer covers more only when chosen", async ({ page, account }) => {
    const run = await seedRun(account.id)
    const newest = qStart(Date.now()) - Q
    const open = [newest - 2 * Q, newest - Q, newest]
    await answerAllBut(account.id, run, open)
    await page.goto(pingUrl(newest))
    const cards = page.getByTestId("audit-answer-sheet").getByTestId("audit-card")
    await expect(cards).toHaveCount(3, { timeout: 60_000 })
    await expect(cards.first().locator("h3")).not.toContainText("quarters")
    // the choice says which quarters it fills
    const cover = cards.first().getByTestId("audit-cover")
    await expect(cover).toContainText("Same answer for the 2 quarters before")
    await expect(cover).toContainText(`${labelOf(newest - 2 * Q).slice(0, 5)}–${labelOf(newest - Q).slice(6)}`)
    await cover.getByRole("checkbox").check()
    // the covered quarters' own cards step aside, and the card names its stretch
    await expect(cards).toHaveCount(1)
    await expect(cards.first()).toContainText("3 quarters")
    await cards.first().getByTestId("audit-activity").fill("Long lunch")
    await cards.first().getByRole("radio", { name: "Energy 5" }).click()
    await cards.first().getByRole("radio", { name: "Growth 3" }).click()
    await expect(page.getByTestId("audit-card-saved")).toHaveCount(1)
    await expect.poll(async () => (await slotsOf(account.id, run)).filter((s) => s.activity === "Long lunch").length, { timeout: 20_000 }).toBe(3)
  })

  test("F08: unchecked, one Save writes one quarter only", async ({ page, account }) => {
    const run = await seedRun(account.id)
    const newest = qStart(Date.now()) - Q
    await answerAllBut(account.id, run, [newest - Q, newest])
    await page.goto(pingUrl(newest))
    const cards = page.getByTestId("audit-answer-sheet").getByTestId("audit-card")
    await expect(cards).toHaveCount(2, { timeout: 60_000 })
    await cards.first().getByTestId("audit-activity").fill("Call mum")
    await cards.first().getByRole("radio", { name: "Energy 6" }).click()
    await cards.first().getByRole("radio", { name: "Growth 6" }).click()
    await expect.poll(async () => (await slotsOf(account.id, run)).filter((s) => s.activity === "Call mum").map((s) => Date.parse(s.slot_at)), { timeout: 20_000 }).toEqual([newest])
  })

  test("F09: a ping tapped late opens on the quarter it asked about, on screen", async ({ page, account }) => {
    const run = await seedRun(account.id)
    const newest = qStart(Date.now()) - Q
    // nine blank quarters before the asked one, as in the tester's steps
    const asked = newest - 2 * Q
    const open = Array.from({ length: 10 }, (_, i) => asked - (9 - i) * Q).concat([newest - Q, newest])
    await answerAllBut(account.id, run, open)
    await page.goto(pingUrl(asked))
    const first = page.getByTestId("audit-answer-sheet").getByTestId("audit-card").first()
    await expect(first).toBeVisible({ timeout: 60_000 })
    await expect(first.locator("h3")).toHaveText(new RegExp(`^${labelOf(asked)}`))
    await expect(first.getByTestId("audit-asked")).toBeVisible()
    expect(await inView(page, first.getByTestId("audit-growth"))).toBe(true)
  })

  test("F10: three taps from the notification when Time knows the activity, energy and growth on screen", async ({ page, account }) => {
    const run = await seedRun(account.id)
    const newest = qStart(Date.now()) - Q
    await answerAllBut(account.id, run, [newest - Q, newest])
    await seedTimeEntry(account.id, "Deep work", newest - 3 * Q, newest + Q - 60_000)
    let taps = 0
    // tap 1: the notification
    taps++
    await page.goto(pingUrl(newest))
    const first = page.getByTestId("audit-answer-sheet").getByTestId("audit-card").first()
    await expect(first.getByTestId("audit-activity")).toHaveValue("Deep work", { timeout: 60_000 })
    expect(await inView(page, first.getByTestId("audit-energy"))).toBe(true)
    expect(await inView(page, first.getByTestId("audit-growth"))).toBe(true)
    taps++
    await first.getByRole("radio", { name: "Energy 4" }).click()
    taps++
    await first.getByRole("radio", { name: "Growth 6" }).click()
    await expect(page.getByTestId("audit-card-saved").first()).toContainText("Deep work")
    expect(taps).toBeLessThanOrEqual(3)
    await expect.poll(async () => (await slotsOf(account.id, run)).filter((s) => s.activity === "Deep work").length, { timeout: 20_000 }).toBe(1)
  })

  test("F10: with no Time entry, the quarter before's answer is offered, and three taps save it", async ({ page, account }) => {
    const run = await seedRun(account.id)
    const newest = qStart(Date.now()) - Q
    await answerAllBut(account.id, run, [newest])
    let taps = 1
    await page.goto(pingUrl(newest))
    const first = page.getByTestId("audit-answer-sheet").getByTestId("audit-card").first()
    await expect(first.getByTestId("audit-activity")).toHaveValue("Earlier", { timeout: 60_000 })
    await expect(first).toContainText("same as before")
    taps++
    await first.getByRole("radio", { name: "Energy 2" }).click()
    taps++
    await first.getByRole("radio", { name: "Growth 2" }).click()
    await expect(page.getByTestId("audit-card-saved")).toHaveCount(1)
    expect(taps).toBeLessThanOrEqual(3)
    await expect.poll(async () => (await slotsOf(account.id, run)).find((s) => Date.parse(s.slot_at) === newest)?.activity ?? null, { timeout: 20_000 }).toBe("Earlier")
  })

  test("F11: a ping opens the sheet from the page's first read, not a second one", async ({ page, account }) => {
    await seedRun(account.id)
    const newest = qStart(Date.now()) - Q
    const reads: number[] = []
    page.on("request", (r) => {
      if (r.method() === "GET" && /\/api\/audit(\?.*)?$/.test(r.url())) reads.push(Date.now())
    })
    await page.goto(pingUrl(newest))
    await expect(page.getByTestId("audit-answer-sheet").getByTestId("audit-card").first()).toBeVisible({ timeout: 60_000 })
    expect(reads.length).toBe(1)
  })

  test("F12: Delete offers Undo; Undo keeps the answer, no Undo deletes it", async ({ page, account }) => {
    const run = await seedRun(account.id)
    const a = qStart(Date.now()) - 4 * Q
    for (const [i, activity] of ["Walk", "Reading"].entries()) {
      const { error } = await stackAdmin()
        .from("audit_slots")
        .insert({ id: randomUUID(), user_id: account.id, run_id: run, slot_at: new Date(a + i * Q).toISOString(), activity, energy: 4, growth: 4, source: "app" })
      expect(error).toBeNull()
    }
    const deletes: string[] = []
    page.on("request", (r) => {
      if (r.method() === "DELETE" && r.url().includes("/api/audit/slots")) deletes.push(r.url())
    })
    await page.goto(ROUTES.audit)
    await whenHydrated(page.getByTestId("audit-page"), 60_000)
    const reading = page.getByTestId("audit-row-answered").filter({ hasText: "Reading" })
    await reading.click()
    await page.getByTestId("audit-answer-sheet").getByTestId("audit-delete").click()
    await expect(reading).toHaveCount(0)
    const toast = page.getByTestId("audit-undo")
    await expect(toast).toContainText("Deleted")
    await expect(toast).toContainText("Reading")
    await toast.getByRole("button", { name: "Undo" }).click()
    await expect(reading).toHaveCount(1)
    await expect(toast).toBeHidden()
    // past the undo time: nothing was sent, the answer is still there
    await page.getByTestId("audit-row-answered").filter({ hasText: "Walk" }).click()
    await page.getByTestId("audit-answer-sheet").getByTestId("audit-delete").click()
    await expect(toast).toContainText("Walk")
    await expect(toast).toBeHidden({ timeout: 15_000 })
    await expect.poll(async () => (await slotsOf(account.id, run)).map((s) => s.activity), { timeout: 20_000 }).toEqual(["Reading"])
    expect(deletes.length).toBe(1)
    await page.reload()
    await expect(page.getByTestId("audit-row-answered").filter({ hasText: "Reading" })).toHaveCount(1)
    await expect(page.getByTestId("audit-row-answered").filter({ hasText: "Walk" })).toHaveCount(0)
  })

  test("slow-pass-01: with the phone getting pings, this device can still add itself, and Settings names the phone", async ({ page, account }) => {
    await seedRun(account.id)
    const { error } = await stackAdmin()
      .from("push_devices")
      .insert({ user_id: account.id, endpoint: `https://push.example.test/${randomUUID()}`, p256dh: "k", auth: "a", enabled: true, label: "Android phone · Chrome" })
    expect(error).toBeNull()
    await page.goto(ROUTES.audit)
    await whenHydrated(page.getByTestId("audit-page"), 60_000)
    await page.getByTestId("audit-settings-open").click()
    const here = page.getByTestId("audit-settings-sheet").getByTestId("audit-pings-this-device")
    await expect(here).toContainText("Pings go to Android phone · Chrome. Not to this device.")
    await expect(
      here
        .getByTestId("audit-pings-offer")
        .or(here.getByTestId("audit-pings-denied"))
        .or(here.getByTestId("audit-pings-install"))
        .or(here.getByText("Pings are off on the development server"))
        .or(here.getByText("This browser can't receive pings")),
    ).toBeVisible()
    // and Mute tells the truth: pings are on, on the phone
    await page.keyboard.press("Escape")
    await page.getByTestId("audit-mute-open").click()
    await expect(page.getByTestId("audit-mute-state")).toContainText("Pings are on")
    await expect(page.getByTestId("audit-mute-state")).toContainText("to Android phone · Chrome")
  })

  /** One answer to delete; returns the run. */
  async function seedOneAnswer(userId: string, activity: string): Promise<string> {
    const run = await seedRun(userId)
    const { error } = await stackAdmin()
      .from("audit_slots")
      .insert({ id: randomUUID(), user_id: userId, run_id: run, slot_at: new Date(qStart(Date.now()) - 4 * Q).toISOString(), activity, energy: 4, growth: 4, source: "app" })
    expect(error).toBeNull()
    return run
  }

  test("F12: Log Out inside the Undo time still sends the delete, and leaves no queue behind", async ({ browser, throwawayAccount }, info) => {
    test.setTimeout(150_000)
    const context = await browser.newContext({ ...info.project.use, storageState: SIGNED_OUT, baseURL: info.project.use.baseURL })
    try {
      const page = await context.newPage()
      await signIn(page, throwawayAccount)
      const run = await seedOneAnswer(throwawayAccount.id, "Reading")
      await page.goto(ROUTES.audit)
      await whenHydrated(page.getByTestId("audit-page"), 60_000)
      await page.getByTestId("audit-row-answered").filter({ hasText: "Reading" }).click()
      await page.getByTestId("audit-answer-sheet").getByTestId("audit-delete").click()
      await expect(page.getByTestId("audit-undo")).toBeVisible()
      // the delete is on the phone from the tap, not only on screen
      expect(await page.evaluate(() => localStorage.getItem("audit-queue-v1"))).toContain("notBefore")
      const header = page.getByTestId("header-logout-button")
      if (await header.isVisible()) await header.click()
      else {
        await page.getByRole("button", { name: "More" }).first().click()
        await page.getByRole("dialog", { name: "More" }).getByRole("button", { name: "Log Out" }).click()
      }
      await expect.poll(() => new URL(page.url()).pathname, { timeout: 30_000 }).toBe("/")
      await expect.poll(async () => (await slotsOf(throwawayAccount.id, run)).length, { timeout: 15_000 }).toBe(0)
      expect(await page.evaluate(() => localStorage.getItem("audit-queue-v1"))).toBeNull()
    } finally {
      await context.close()
    }
  })

  test("F12: with no signal inside the Undo time, the delete waits and is sent when the signal returns", async ({ page, context, account }) => {
    const run = await seedOneAnswer(account.id, "Reading")
    await page.goto(ROUTES.audit)
    await whenHydrated(page.getByTestId("audit-page"), 60_000)
    await page.getByTestId("audit-row-answered").filter({ hasText: "Reading" }).click()
    await context.setOffline(true)
    await page.getByTestId("audit-answer-sheet").getByTestId("audit-delete").click()
    await expect(page.getByTestId("audit-undo")).toBeHidden({ timeout: 15_000 })
    await expect(page.getByTestId("audit-waiting")).toContainText("1 change is saved on this phone")
    expect((await slotsOf(account.id, run)).length).toBe(1)
    await context.setOffline(false)
    await page.evaluate(() => window.dispatchEvent(new Event("online")))
    await expect.poll(async () => (await slotsOf(account.id, run)).length, { timeout: 20_000 }).toBe(0)
    await expect(page.getByTestId("audit-waiting")).toBeHidden()
  })

  test("F13: with no device getting pings, Mute says so and offers the fix", async ({ page, account }) => {
    await seedRun(account.id)
    const { devices } = await (await page.request.get("/api/notifications/devices")).json()
    for (const d of devices as { id: string }[]) await page.request.delete(`/api/notifications/devices/${d.id}`)
    await page.goto(ROUTES.audit)
    await whenHydrated(page.getByTestId("audit-page"), 60_000)
    await page.getByTestId("audit-mute-open").click()
    const sheet = page.getByTestId("audit-mute-sheet")
    await expect(sheet.getByTestId("audit-mute-state")).toContainText("No device gets pings")
    await expect(sheet).not.toContainText("Pings are on")
    // the fix, whichever this browser can do: turn on, unblock, install, or another browser
    await expect(
      sheet
        .getByTestId("audit-pings-offer")
        .or(sheet.getByTestId("audit-pings-denied"))
        .or(sheet.getByTestId("audit-pings-install"))
        .or(sheet.getByText("Pings are off on the development server"))
        .or(sheet.getByText("This browser can't receive pings")),
    ).toBeVisible()
  })
})
