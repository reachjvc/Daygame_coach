import { test, expect } from "./fixtures/test"
import type { Page } from "@playwright/test"
import { randomUUID } from "node:crypto"
import { stackAdmin } from "./fixtures/stack"
import { whenHydrated } from "./helpers/hydration"

/**
 * WITH NO SIGNAL, /audit NEVER OFFERS TO TURN PINGS ON (alpha prove-slow-02).
 *
 * A phone that gets pings, in airplane mode, opened /audit and saw the big
 * orange "Turn on pings for this device" above "No signal: this is what this
 * phone last read": the device list could not be read, so no device was
 * assumed. Now the page uses the list the phone last read, and offers nothing
 * from it. The worker is registered in production builds only, so these skip,
 * with the reason, against `next dev`. Desktop Chromium only, like the other
 * offline specs: WebKit refuses a reload with every request aborted.
 */

const Q = 15 * 60_000
const H = 60 * 60_000
const qStart = (ms: number) => Math.floor(ms / Q) * Q
const NO_WORKER = "no service worker: a production build is needed (next build + next start)"

async function seedRun(userId: string): Promise<void> {
  const admin = stackAdmin()
  expect((await admin.from("audit_runs").delete().eq("user_id", userId)).error).toBeNull()
  // Started this quarter: nothing to answer yet, so the page names the next ping.
  const startedAt = qStart(Date.now())
  const { error } = await admin.from("audit_runs").insert({
    id: randomUUID(),
    user_id: userId,
    started_at: new Date(startedAt).toISOString(),
    ends_at: new Date(startedAt + 14 * 24 * H).toISOString(),
    quiet_start: 0,
    quiet_end: 0,
  })
  expect(error).toBeNull()
}

async function aPhoneGetsPings(userId: string): Promise<void> {
  const { error } = await stackAdmin()
    .from("push_devices")
    .insert({ user_id: userId, endpoint: `https://push.example.test/${randomUUID()}`, p256dh: "k", auth: "a", enabled: true, label: "Android phone · Chrome" })
  expect(error).toBeNull()
}

/** /audit open, its worker in control and the page stored for no signal. False when no worker controls it. */
async function openStored(page: Page, shown: string): Promise<boolean> {
  await page.goto("/audit")
  await whenHydrated(page.getByTestId("audit-page"), 60_000)
  await expect(page.getByTestId(shown)).toBeVisible({ timeout: 30_000 })
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

/** No signal, for the worker too (see audit-offline-reload.spec.ts). */
async function goOffline(page: Page) {
  await page.context().setOffline(true)
  await page.context().route("**/*", (route) => route.abort("internetdisconnected"))
}

async function goOnline(page: Page) {
  await page.context().unroute("**/*")
  await page.context().setOffline(false)
}

/** Anything that asks this browser to set pings up: the offer, its blocked or install variants, or Today's one line. */
const offers = (page: Page) =>
  page
    .getByTestId("audit-pings-offer")
    .or(page.getByTestId("audit-pings-denied"))
    .or(page.getByTestId("audit-pings-install"))
    .or(page.getByTestId("audit-pings-line"))

test.describe("pings on /audit with no signal", () => {
  test.use({ serviceWorkers: "allow" })

  test("prove-slow-02: a phone that gets pings is not offered to turn them on, and the next ping is named", async ({ page, account }) => {
    await seedRun(account.id)
    await aPhoneGetsPings(account.id)
    test.skip(!(await openStored(page, "audit-today")), NO_WORKER)
    await expect(page.getByTestId("audit-nothing-to-answer")).toContainText("Next ping at")
    await expect(offers(page)).toHaveCount(0)
    // the list this phone read is kept on it
    await expect.poll(() => page.evaluate(() => window.localStorage.getItem("push-devices-copy-v1") ?? "")).toContain("Android phone")

    await goOffline(page)
    try {
      await page.reload()
      await expect(page.getByTestId("audit-offline-copy")).toBeVisible({ timeout: 30_000 })
      await expect(page.getByTestId("audit-nothing-to-answer")).toContainText("Next ping at")
      await expect(offers(page)).toHaveCount(0)
      // and Mute still says where they go
      await page.getByTestId("audit-mute-open").click()
      await expect(page.getByTestId("audit-mute-state")).toContainText("to Android phone · Chrome")
    } finally {
      await goOnline(page)
    }
  })

  test("prove-slow-02: before an audit, with no device known, nothing about pings is offered offline", async ({ page, account }) => {
    expect((await stackAdmin().from("audit_runs").delete().eq("user_id", account.id)).error).toBeNull()
    test.skip(!(await openStored(page, "audit-start")), NO_WORKER)
    // Online, a browser with no device getting pings is asked to set them up
    // (headless Chromium answers "blocked", which shows the blocked variant).
    await expect(offers(page)).toBeVisible({ timeout: 15_000 })

    await goOffline(page)
    try {
      await page.reload()
      await expect(page.getByTestId("audit-start")).toBeVisible({ timeout: 30_000 })
      await expect(page.getByTestId("audit-start-button")).toBeVisible()
      await expect(offers(page)).toHaveCount(0)
    } finally {
      await goOnline(page)
    }
  })
})
