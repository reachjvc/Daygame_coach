import { test, expect } from "./fixtures/test"
import type { Page } from "@playwright/test"
import { randomUUID } from "node:crypto"
import { stackAdmin } from "./fixtures/stack"
import { whenHydrated } from "./helpers/hydration"

/**
 * THE AUDIT WITH NO SIGNAL, FROM THE SLOW ALPHA PASS (2026-11-09).
 *
 *  slow-pass-04 Reloading /audit with no signal, an answer waiting on the
 *               phone, showed the crash page ("The fault has been reported").
 *  slow-pass-02 A Time entry kept as running in the page's last read filled
 *               every later quarter "from Time", though it had long stopped.
 *
 * The worker is registered in production builds only, so these skip, with the
 * reason, against `next dev` (see vice-offline.spec.ts).
 */

const Q = 15 * 60_000
const H = 60 * 60_000
const qStart = (ms: number) => Math.floor(ms / Q) * Q

async function seedRun(userId: string): Promise<string> {
  const admin = stackAdmin()
  expect((await admin.from("audit_runs").delete().eq("user_id", userId)).error).toBeNull()
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

async function activities(userId: string, runId: string): Promise<string[]> {
  const { data, error } = await stackAdmin().from("audit_slots").select("activity, slot_at").eq("user_id", userId).eq("run_id", runId).order("slot_at")
  expect(error).toBeNull()
  return (data ?? []).map((r) => r.activity as string)
}

const labelOf = (q: number) => {
  const f = (x: number) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Copenhagen", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(x))
  return `${f(q)}–${f(q + Q)}`
}

async function inCopenhagen(page: Page) {
  const res = await page.request.put("/api/settings/time-preferences", { data: { timezone: "Europe/Copenhagen", source: "chosen" } })
  expect(res.status()).toBe(200)
}

const NO_WORKER = "no service worker: a production build is needed (next build + next start)"

/** /audit open, its worker in control and the page stored for no signal. False when no worker controls it. */
async function openStored(page: Page): Promise<boolean> {
  await page.goto("/audit")
  await whenHydrated(page.getByTestId("audit-page"), 60_000)
  await expect(page.getByTestId("audit-today")).toBeVisible({ timeout: 30_000 })
  const controlled = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return false
    return Promise.race([navigator.serviceWorker.ready.then(() => true), new Promise<boolean>((r) => setTimeout(() => r(false), 10_000))])
  })
  if (!controlled) return false
  await expect
    .poll(() => page.evaluate(async () => Boolean(await caches.match(new Request(new URL("/audit", location.origin).href)))), { timeout: 15_000 })
    .toBe(true)
  return true
}

/**
 * No signal, for the worker too. `setOffline` alone leaves the worker's own
 * fetches on the network, so it answered from the server and hid that its
 * store lacked the page's chunks; aborting every request (routing reaches the
 * worker's fetches in Chromium) is what a phone in airplane mode sees.
 */
async function goOffline(page: Page) {
  const context = page.context()
  await context.setOffline(true)
  await context.route("**/*", (route) => route.abort("internetdisconnected"))
}

async function goOnline(page: Page) {
  const context = page.context()
  await context.unroute("**/*")
  await context.setOffline(false)
}

async function openGap(page: Page, q: number) {
  await page.getByTestId("audit-row-gap").filter({ hasText: labelOf(q) }).click()
  await page.getByTestId("audit-answer-selection").click()
  const card = page.getByTestId("audit-answer-sheet").getByTestId("audit-card")
  await expect(card).toBeVisible({ timeout: 15_000 })
  return card
}

async function answer(page: Page, card: ReturnType<Page["getByTestId"]>, activity: string) {
  await card.getByTestId("audit-activity").fill(activity)
  const autoSave = (await card.getAttribute("data-autosave")) === "yes"
  await card.getByTestId("audit-energy").getByRole("radio", { name: "Energy 4" }).click()
  await card.getByTestId("audit-growth").getByRole("radio", { name: "Growth 3" }).click()
  if (!autoSave) await card.getByTestId("audit-save").click()
}

test.describe("audit reloaded with no signal", () => {
  test.use({ serviceWorkers: "allow" })

  test("slow-pass-04: reloading /audit offline, an answer waiting, still shows the day and takes answers", async ({ page, account }) => {
    await inCopenhagen(page)
    const runId = await seedRun(account.id)
    test.skip(!(await openStored(page)), NO_WORKER)
    const errors: string[] = []
    page.on("pageerror", (e) => errors.push(e.message))

    await goOffline(page)
    try {
      await answer(page, await openGap(page, qStart(Date.now()) - 2 * Q), "Cooking")
      await page.keyboard.press("Escape")
      await expect(page.getByTestId("audit-waiting")).toContainText("1 change is saved on this phone")

      await page.reload()
      await expect(page.getByText("This page could not load")).toHaveCount(0)
      await expect(page.getByTestId("audit-today")).toBeVisible({ timeout: 30_000 })
      await expect(page.getByTestId("audit-offline-copy")).toBeVisible()
      await expect(page.getByTestId("audit-waiting")).toContainText("1 change is saved on this phone")
      await expect(page.getByTestId("audit-row-answered").filter({ hasText: "Cooking" })).toHaveCount(1)

      // A second reload, and a second answer, both while still offline.
      await page.reload()
      await expect(page.getByTestId("audit-today")).toBeVisible({ timeout: 30_000 })
      await answer(page, await openGap(page, qStart(Date.now()) - 3 * Q), "Reading")
      await page.keyboard.press("Escape")
      await expect(page.getByTestId("audit-waiting")).toContainText("2 changes are saved on this phone")
      await expect(page.getByText("This page could not load")).toHaveCount(0)
    } finally {
      await goOnline(page)
    }
    expect(errors).toEqual([])
    await page.evaluate(() => window.dispatchEvent(new Event("online")))
    await expect.poll(() => activities(account.id, runId), { timeout: 30_000 }).toEqual(["Reading", "Cooking"])
  })

  test("slow-pass-02: a Time entry the last read saw running does not fill quarters after that read", async ({ page, account }) => {
    await inCopenhagen(page)
    await seedRun(account.id)
    const now = Date.now()
    const readAt = qStart(now) - 4 * Q + 5 * 60_000
    // The page's last read was 50+ minutes ago, while "Writing report" ran.
    // (Stopped since on another device; this phone never read that.)
    await page.route("**/api/audit", async (route) => {
      const res = await route.fetch()
      const body = (await res.json()) as { now: string; timeEntries: unknown[] }
      body.now = new Date(readAt).toISOString()
      body.timeEntries = [
        { id: randomUUID(), description: "Writing report", projectName: null, startedAt: new Date(readAt - H).toISOString(), stoppedAt: null },
      ]
      await route.fulfill({ response: res, json: body })
    })
    test.skip(!(await openStored(page)), NO_WORKER)
    await page.unroute("**/api/audit")

    await goOffline(page)
    try {
      await page.reload()
      await expect(page.getByTestId("audit-offline-copy")).toBeVisible({ timeout: 30_000 })
      // A quarter after the read: Time said nothing about it.
      const late = await openGap(page, qStart(Date.now()) - 2 * Q)
      await expect(late).not.toContainText("from Time")
      await expect(late.getByTestId("audit-activity")).toHaveValue("")
      await page.keyboard.press("Escape")
      // The quarter before the read, which the entry did cover then, still fills.
      const early = await openGap(page, qStart(readAt) - Q)
      await expect(early).toContainText("from Time")
      await expect(early.getByTestId("audit-activity")).toHaveValue("Writing report")
    } finally {
      await goOnline(page)
    }
  })
})
