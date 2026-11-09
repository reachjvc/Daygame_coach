import { test, expect, SIGNED_OUT, signIn } from "./fixtures/test"
import type { Browser, Page } from "@playwright/test"
import { randomUUID } from "node:crypto"
import { stackAdmin } from "./fixtures/stack"
import { whenHydrated } from "./helpers/hydration"

/**
 * THE AUDIT ACROSS DEVICES, SIGNAL AND ZONES — alpha test findings of
 * 2026-11-09 (fast-audit-01 to -05), from the tester's own steps:
 *
 *  01 Log Out wiped answers still waiting on the phone, with no warning.
 *  02 The phone's offline answer lost to the PC's, and the phone still said "Saved".
 *  03 An open page never showed the other device's answer.
 *  04 A ping tapped with no signal opened the browser's error page.
 *  05 Travelling, the page never named the zone its times are in.
 *
 * Real clock: the server's clock decides which answer is newer. Every test
 * seeds an open audit begun three hours ago with no quiet hours.
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

async function openAudit(page: Page, url = "/audit") {
  await page.goto(url)
  await whenHydrated(page.getByTestId("audit-page"), 60_000)
  await expect(page.getByTestId("audit-today")).toBeVisible({ timeout: 30_000 })
}

const labelOf = (q: number) => {
  const f = (x: number) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Copenhagen", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(x))
  return `${f(q)}–${f(q + Q)}`
}

async function answerGap(page: Page, label: string, activity: string) {
  await page.getByTestId("audit-row-gap").filter({ hasText: label }).click()
  await page.getByTestId("audit-answer-selection").click()
  const card = page.getByTestId("audit-answer-sheet").getByTestId("audit-card")
  await card.getByTestId("audit-activity").fill(activity)
  // a new answer saves on the tap that completes it; otherwise Save does
  const autoSave = (await card.getAttribute("data-autosave")) === "yes"
  await card.getByTestId("audit-energy").getByRole("radio", { name: "Energy 6" }).click()
  await card.getByTestId("audit-growth").getByRole("radio", { name: "Growth 7" }).click()
  if (!autoSave) await card.getByTestId("audit-save").click()
}

/** A fresh sign-up's zone is whatever the test backend gave it; the labels here are Copenhagen's. */
async function inCopenhagen(page: Page) {
  const res = await page.request.put("/api/settings/time-preferences", { data: { timezone: "Europe/Copenhagen", source: "chosen" } })
  expect(res.status()).toBe(200)
}

async function secondDevice(browser: Browser, storageState: string) {
  const info = test.info()
  const ctx = await browser.newContext({ ...info.project.use, storageState, baseURL: info.project.use.baseURL })
  return { ctx, page: await ctx.newPage() }
}

test.describe("audit across devices @phone", () => {
  test("01: Log Out sends an answer still waiting on the phone before it signs out", async ({ browser, throwawayAccount }, info) => {
    test.setTimeout(150_000)
    const context = await browser.newContext({ ...info.project.use, storageState: SIGNED_OUT, baseURL: info.project.use.baseURL })
    try {
      const page = await context.newPage()
      await signIn(page, throwawayAccount)
      await inCopenhagen(page)
      const runId = await seedRun(throwawayAccount.id)
      await openAudit(page)
      await page.route("**/api/audit/slots", (route) => route.abort("internetdisconnected"))
      await answerGap(page, labelOf(qStart(Date.now()) - 2 * Q), "Approached in the metro")
      await page.keyboard.press("Escape")
      await expect(page.getByTestId("audit-waiting")).toBeVisible()
      // signal is back, but he is on another page now
      await page.unroute("**/api/audit/slots")
      await page.goto("/dashboard", { waitUntil: "domcontentloaded" })
      const header = page.getByTestId("header-logout-button")
      if (await header.isVisible()) await header.click()
      else {
        await page.getByRole("button", { name: "More" }).first().click()
        await page.getByRole("dialog", { name: "More" }).getByRole("button", { name: "Log Out" }).click()
      }
      await expect.poll(() => activities(throwawayAccount.id, runId), { timeout: 15_000 }).toEqual(["Approached in the metro"])
    } finally {
      await context.close()
    }
  })

  test("01: with no signal at Log Out, the waiting answer is named and kept on Stay signed in", async ({ browser, throwawayAccount }, info) => {
    test.setTimeout(150_000)
    const context = await browser.newContext({ ...info.project.use, storageState: SIGNED_OUT, baseURL: info.project.use.baseURL })
    try {
      const page = await context.newPage()
      await signIn(page, throwawayAccount)
      await inCopenhagen(page)
      const runId = await seedRun(throwawayAccount.id)
      await openAudit(page)
      await page.route("**/api/audit/slots", (route) => route.abort("internetdisconnected"))
      await answerGap(page, labelOf(qStart(Date.now()) - 2 * Q), "Approached in the metro")
      await page.keyboard.press("Escape")
      await expect(page.getByTestId("audit-waiting")).toBeVisible()
      const header = page.getByTestId("header-logout-button")
      if (await header.isVisible()) await header.click()
      else {
        await page.getByRole("button", { name: "More" }).first().click()
        await page.getByRole("dialog", { name: "More" }).getByRole("button", { name: "Log Out" }).click()
      }
      await expect(page.getByTestId("log-out-unsent")).toContainText("1 change hasn't reached your account yet", { timeout: 15_000 })
      await page.getByTestId("log-out-stay").click()
      expect(await page.evaluate(() => localStorage.getItem("audit-queue-v1"))).toContain("Approached in the metro")
      expect(await activities(throwawayAccount.id, runId)).toEqual([])
    } finally {
      await context.close()
    }
  })

  test("02: the phone's offline answer that lost to the PC's newer one is named on the phone", async ({ page, account, browser }) => {
    const runId = await seedRun(account.id)
    const label = labelOf(qStart(Date.now()) - 2 * Q)
    const phone = await secondDevice(browser, account.storageState)
    try {
      await openAudit(phone.page)
      await openAudit(page)
      await phone.ctx.setOffline(true)
      await answerGap(phone.page, label, "Daygame sets")
      await expect(phone.page.getByTestId("audit-answer-sheet").getByTestId("audit-card-saved")).toBeVisible()
      // the PC answers after the phone, by the clock
      await answerGap(page, label, "Email")
      await expect.poll(() => activities(account.id, runId)).toEqual(["Email"])
      await phone.ctx.setOffline(false)
      await phone.page.evaluate(() => window.dispatchEvent(new Event("online")))
      const sheet = phone.page.getByTestId("audit-answer-sheet")
      // named with the choice, not dropped (alpha slow-pass-06)
      await expect(sheet.getByTestId("audit-card-conflict")).toContainText("Answered on another device: Email", { timeout: 30_000 })
      await expect(sheet.getByTestId("audit-card-saved")).toHaveCount(0)
      await phone.page.keyboard.press("Escape")
      await expect(phone.page.getByTestId("audit-not-kept")).toContainText("Daygame sets")
      await expect(phone.page.getByTestId("audit-row-answered").filter({ hasText: "Email" })).toHaveCount(1)
      expect(await activities(account.id, runId)).toEqual(["Email"])
    } finally {
      await phone.ctx.close()
    }
  })

  test("03: an answer given on another device shows on an open page within a minute", async ({ page, account, browser }) => {
    test.setTimeout(120_000)
    const runId = await seedRun(account.id)
    const label = labelOf(qStart(Date.now()) - 2 * Q)
    const phone = await secondDevice(browser, account.storageState)
    try {
      await openAudit(phone.page)
      await expect(phone.page.getByTestId("audit-row-gap").filter({ hasText: label })).toHaveCount(1)
      await openAudit(page)
      await answerGap(page, label, "Email")
      await expect.poll(() => activities(account.id, runId)).toEqual(["Email"])
      // no reload, no tab switch on the phone
      await expect(phone.page.getByTestId("audit-row-answered").filter({ hasText: "Email" })).toHaveCount(1, { timeout: 45_000 })
      await expect(phone.page.getByTestId("audit-row-gap").filter({ hasText: label })).toHaveCount(0)
    } finally {
      await phone.ctx.close()
    }
  })

  test("03: a card left open on the phone says when the PC answers its quarter meanwhile", async ({ page, account, browser }) => {
    test.setTimeout(120_000)
    const runId = await seedRun(account.id)
    const label = labelOf(qStart(Date.now()) - 2 * Q)
    const phone = await secondDevice(browser, account.storageState)
    try {
      await openAudit(phone.page)
      await phone.page.getByTestId("audit-row-gap").filter({ hasText: label }).click()
      await phone.page.getByTestId("audit-answer-selection").click()
      const card = phone.page.getByTestId("audit-answer-sheet").getByTestId("audit-card")
      await expect(card).toHaveCount(1)
      await expect(card.getByTestId("audit-card-elsewhere")).toHaveCount(0)
      await openAudit(page)
      await answerGap(page, label, "Email")
      await expect.poll(() => activities(account.id, runId)).toEqual(["Email"])
      await expect(card.getByTestId("audit-card-elsewhere")).toContainText("Answered on another device just now: Email", { timeout: 45_000 })
    } finally {
      await phone.ctx.close()
    }
  })
})

async function seedTimeEntry(userId: string, description: string, from: number, to: number): Promise<string> {
  const admin = stackAdmin()
  const existing = await admin.from("timetrack_workspaces").select("id").eq("user_id", userId).is("deleted_at", null).limit(1).maybeSingle()
  let workspaceId = existing.data?.id as string | undefined
  if (!workspaceId) {
    const made = await admin.from("timetrack_workspaces").insert({ user_id: userId }).select("id").single()
    expect(made.error).toBeNull()
    workspaceId = made.data!.id as string
  }
  const { data, error } = await admin
    .from("timetrack_entries")
    .insert({
      user_id: userId,
      workspace_id: workspaceId,
      description,
      started_at: new Date(from).toISOString(),
      stopped_at: new Date(to).toISOString(),
      duration_seconds: Math.round((to - from) / 1000),
    })
    .select("id")
    .single()
  expect(error).toBeNull()
  return data!.id as string
}

test.describe("Fill in reads Time as it is now @phone", () => {
  test("fast-time-01/02: an entry made, then renamed, in Time after the page opened fills the card", async ({ page, account }) => {
    await stackAdmin().from("timetrack_entries").delete().eq("user_id", account.id)
    await seedRun(account.id)
    const last = qStart(Date.now()) - Q
    await openAudit(page)
    const card = page.getByTestId("audit-answer-sheet").getByTestId("audit-card")
    const fillIn = async () => {
      await page.getByTestId("audit-row-gap").filter({ hasText: labelOf(last) }).click()
      await page.getByTestId("audit-answer-selection").click()
      await expect(card).toHaveCount(1)
    }

    // started on another device after the page opened
    const id = await seedTimeEntry(account.id, "Walk", last - 2 * Q, last + Q)
    await fillIn()
    await expect(card.getByTestId("audit-activity")).toHaveValue("Walk")
    await expect(card.locator("h3")).toContainText("from Time")
    await page.keyboard.press("Escape")

    // renamed on another device
    const { error } = await stackAdmin().from("timetrack_entries").update({ description: "Daygame" }).eq("id", id)
    expect(error).toBeNull()
    await fillIn()
    await expect(card.getByTestId("audit-activity")).toHaveValue("Daygame")
  })
})

test.describe("audit while travelling @phone", () => {
  test.use({ timezoneId: "America/New_York" })
  test("05: the page names the account's zone and switches to this phone's on one tap", async ({ page, account }) => {
    await seedRun(account.id)
    const res = await page.request.put("/api/settings/time-preferences", { data: { timezone: "Europe/Copenhagen", source: "chosen" } })
    expect(res.status()).toBe(200)
    try {
      await openAudit(page)
      const zone = page.getByTestId("audit-zone")
      await expect(zone).toContainText("Copenhagen time (Europe/Copenhagen)")
      await expect(zone).toContainText("New York")
      await zone.getByTestId("audit-zone-switch").click()
      await expect(zone).toBeHidden({ timeout: 15_000 })
      const prefs = await (await page.request.get("/api/settings/time-preferences")).json()
      expect(prefs.timezone).toBe("America/New_York")
    } finally {
      await page.request.put("/api/settings/time-preferences", { data: { timezone: "Europe/Copenhagen", source: "chosen" } })
    }
  })

  test("05: at home, nothing about zones is shown", async ({ page, account }) => {
    await seedRun(account.id)
    const res = await page.request.put("/api/settings/time-preferences", { data: { timezone: "America/New_York", source: "chosen" } })
    expect(res.status()).toBe(200)
    try {
      await openAudit(page)
      await expect(page.getByTestId("audit-zone")).toHaveCount(0)
    } finally {
      await page.request.put("/api/settings/time-preferences", { data: { timezone: "Europe/Copenhagen", source: "chosen" } })
    }
  })
})

test.describe("audit opened with no signal", () => {
  test.use({ serviceWorkers: "allow" })
  /**
   * Skips, with the reason, when no worker controls the page: the worker is
   * registered in production builds only (see vice-offline.spec.ts).
   */
  test("04: a ping tapped with no signal opens the answer sheet, and plain /audit can be answered", async ({ page, context, account }) => {
    const runId = await seedRun(account.id)
    await openAudit(page)
    const controlled = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return false
      return Promise.race([navigator.serviceWorker.ready.then(() => true), new Promise<boolean>((r) => setTimeout(() => r(false), 10_000))])
    })
    test.skip(!controlled, "no service worker: a production build is needed (next build + next start)")
    await expect
      .poll(() => page.evaluate(async () => Boolean(await caches.match(new Request(new URL("/audit", location.origin).href)))), { timeout: 15_000 })
      .toBe(true)

    await context.setOffline(true)
    await context.route("**/api/**", (route) => route.abort("internetdisconnected"))
    try {
      const q = qStart(Date.now()) - Q
      await page.goto(`/audit?answer=${encodeURIComponent(new Date(q).toISOString())}&send=${randomUUID()}`)
      await expect(page.getByTestId("audit-answer-sheet")).toBeVisible({ timeout: 30_000 })
      await page.keyboard.press("Escape")
      await expect(page.getByTestId("audit-offline-copy")).toBeVisible()

      await page.goto("/audit")
      await expect(page.getByTestId("audit-today")).toBeVisible({ timeout: 30_000 })
      await answerGap(page, labelOf(qStart(Date.now()) - 2 * Q), "Daygame sets")
      await page.keyboard.press("Escape")
      await expect(page.getByTestId("audit-waiting")).toContainText("1 change is saved on this phone")
    } finally {
      await context.unroute("**/api/**")
      await context.setOffline(false)
    }
    await page.evaluate(() => window.dispatchEvent(new Event("online")))
    await expect.poll(() => activities(account.id, runId), { timeout: 30_000 }).toEqual(["Daygame sets"])
  })
})
