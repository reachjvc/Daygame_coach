/**
 * THE LIVE SITE, OPENED SIGNED OUT, AFTER EVERY PRODUCTION DEPLOY.
 *
 * Run by live-check.yml only (Playwright project `live`, LIVE_CHECK=1), once
 * /api/healthz says the site runs the deployed commit. Plans/tests-catch-what-matters.md, Phase 6.
 *
 * READ-ONLY, ENFORCED: every request to LIVE_URL that is not a GET or HEAD is
 * aborted before it leaves, and the test then fails unless that request is in
 * ALLOWED_WRITES with a reason. Nothing here signs in, submits a form or reaches
 * the database; plain `@playwright/test`, not the fixtures that make accounts.
 */

import { test, expect, type Page, type Request } from "@playwright/test"

const LIVE_URL = process.env.LIVE_URL
const ORIGIN = LIVE_URL ? new URL(LIVE_URL).origin : ""

/** The public pages a stranger can reach. */
const PAGES = ["/", "/life", "/dating", "/quit", "/pricing", "/auth/login", "/privacy"]

/**
 * Non-GET requests to the live site that are allowed to go out (and are still
 * aborted here: the test only stops failing for them). Empty on purpose; add a
 * line with a reason, for example an analytics beacon the page sends on load.
 */
const ALLOWED_WRITES: Array<{ method: string; path: RegExp; reason: string }> = []

/**
 * Failed requests (status 400 or more) a signed-out visitor's page is allowed to make. The browser's
 * own console line for them ("Failed to load resource") carries no address, so failed requests are
 * judged here by status and path, and that console line is not judged twice.
 */
const ALLOWED_FAILURES: Array<{ status: number; path: RegExp; reason: string }> = [
  {
    status: 401,
    path: /^\/api\/settings\/time-preferences$/,
    reason: "components/ClockSync.tsx asks once per session in the root layout and documents the signed-out 401 as its answer",
  },
]

/** Console messages that are not the site's fault. Empty on purpose; each needs a reason. */
const ALLOWED_CONSOLE: Array<{ text: RegExp; reason: string }> = []

const BROKEN_TEXT = [/Cannot find module/i, /Application error: a client-side exception/i, /Internal Server Error/i, /This page could not be found/i]

test.beforeAll(() => {
  if (!LIVE_URL) throw new Error("LIVE_URL is not set: the live check needs the address it opens")
})

/** Abort every non-GET/HEAD request to ANY host; note the ones that are not on the allow-list (allow-list applies to the live origin only). */
async function blockWrites(page: Page, writes: string[]) {
  await page.route("**/*", (route) => {
    const req: Request = route.request()
    const method = req.method()
    if (method === "GET" || method === "HEAD") return route.continue()
    const url = new URL(req.url())
    const onLive = url.origin === new URL(ORIGIN).origin
    const allowed = onLive && ALLOWED_WRITES.some((a) => a.method === method && a.path.test(url.pathname))
    if (!allowed) writes.push(onLive ? `${method} ${url.pathname}` : `${method} ${url.origin}${url.pathname}`)
    return route.abort()
  })
}

for (const path of PAGES) {
  test(`live ${path} opens signed out, whole and quiet`, async ({ page }) => {
    const writes: string[] = []
    const consoleErrors: string[] = []
    const failedRequests: string[] = []

    await blockWrites(page, writes)
    page.on("console", (m) => {
      if (m.type() !== "error") return
      const text = m.text()
      if (/^Failed to load resource/.test(text)) return // judged by page.on("response") below, with its address
      if (!ALLOWED_CONSOLE.some((a) => a.text.test(text))) consoleErrors.push(text)
    })
    page.on("response", (res) => {
      if (res.status() < 400 || new URL(res.url()).origin !== ORIGIN) return
      const { pathname } = new URL(res.url())
      if (!ALLOWED_FAILURES.some((a) => a.status === res.status() && a.path.test(pathname))) failedRequests.push(`${res.status()} ${pathname}`)
    })
    page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`))

    const response = await page.goto(path, { waitUntil: "load" })
    // Let hydration run and any late request show itself.
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {})

    expect(response?.status(), `${path} status`).toBe(200)
    expect(new URL(page.url()).origin, "stayed on the live site").toBe(ORIGIN)
    const body = (await page.locator("body").innerText()).slice(0, 20_000)
    for (const bad of BROKEN_TEXT) expect(body, `${path} shows ${bad}`).not.toMatch(bad)
    await expect(page.locator("#__next_error__, nextjs-portal")).toHaveCount(0)
    expect(body.trim().length, `${path} is blank`).toBeGreaterThan(20)
    expect(writes, "a write request left the page (aborted)").toEqual([])
    expect(failedRequests, `${path} requests that failed`).toEqual([])
    expect(consoleErrors, `${path} console errors`).toEqual([])
  })
}

/** The guard itself: a POST from a live page never leaves the browser, and is reported. */
test("live: a write from the page is aborted and reported", async ({ page }) => {
  const writes: string[] = []
  await blockWrites(page, writes)
  await page.goto("/privacy", { waitUntil: "load" })
  const outcome = await page.evaluate(async () => {
    try {
      await fetch("/api/healthz", { method: "POST", body: "{}" })
      return "sent"
    } catch {
      return "aborted"
    }
  })
  expect(outcome).toBe("aborted")
  expect(writes).toEqual(["POST /api/healthz"])
})
