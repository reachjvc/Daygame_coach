import { test, expect } from "@playwright/test"
import { QUIT_VICE, QUIT_VICE_OLD } from "@/src/shared/lifeMasteryRoutes"

/**
 * OPENING THE BLACK BOX WITH NO CONNECTION.
 *
 * The module's whole design premise is the moment somebody opens it mid-thought
 * at eleven at night, and that is not a moment that waits for signal. Two
 * different things have to be true for it, and only the first of them was:
 *
 *   1. ON SCREEN, SIGNAL DIES: keeps working, queues everything, loses nothing.
 *      `blackbox.spec.ts` has covered this since 2026-09-23.
 *   2. NOT ON SCREEN, NO SIGNAL, OPEN IT: until 2026-09-24 this was the
 *      browser's error page, because the document itself had to be fetched.
 *      `public/sw.js` kept exactly one page — the time tracker — and returned
 *      early for every other navigation.
 *
 * This file is (2).
 *
 * ----------------------------------------------------------------------------
 * WHY IT SKIPS INSTEAD OF PASSING, AND WHY THAT IS THE POINT.
 *
 * `OfflineShell` registers the worker in production builds only: under
 * `next dev` the dev server streams updates and a worker in front of that
 * serves an app that no longer exists, so it deliberately does nothing. The
 * Playwright config runs `npm run dev` locally and `npm run build && npm start`
 * in CI — so locally there is no worker at all.
 *
 * A test that quietly went green in that situation would be the worst kind
 * here: it would assert the page loaded, which it did, over a network that was
 * never actually cut in the way this is about. So it establishes that a worker
 * is controlling the page first and SKIPS WITH A REASON when there is none.
 * A skip says "not checked"; a pass would have said "checked, fine".
 *
 * To run it for real on this machine, against a production build, without
 * disturbing `npm run dev` on port 3000:
 *
 *     NEXT_DIST_DIR=.next-verify npm run build
 *     NEXT_DIST_DIR=.next-verify npx next start -p 3100
 *     PW_BASE_URL=http://localhost:3100 npx playwright test tests/e2e/vice-offline.spec.ts --project=chromium
 *
 * Verified that way on 2026-09-24: 22 entries in the store, all 16 of the
 * page's `/_next/` resources among them, and an offline reload coming up
 * hydrated with the record on screen.
 */

test.describe.configure({ mode: "serial" })

type Page = import("@playwright/test").Page

/**
 * Land on the Black Box with the worker installed and the account's answer in.
 *
 * BOTH WAITS MATTER, AND THE SECOND ONE IS THE SUBTLE ONE. `data-hydrated` goes
 * up when the browser copy has been read, but the account's rows arrive about
 * 700ms later and are written back through the same single writer. A
 * `localStorage.setItem` in that window is silently overwritten by the merge
 * that follows — which is exactly how the first version of this test lost its
 * own seeded record and reported an empty page offline. `blackbox.spec.ts`
 * records the same 700ms and the same lesson.
 */
async function landed(page: Page) {
  await page.locator('[data-hydrated="true"]').waitFor({ timeout: 30000 })
  await page
    .locator('[data-sync="synced"], [data-sync="offline"], [data-sync="failed"]')
    .waitFor({ timeout: 30000 })
}

/**
 * Answer every upload in the browser, so this file never writes to the account.
 *
 * What it is about is opening with no network; the account's round trip is
 * `blackbox.spec.ts`'s job and is covered there. Three sessions share this
 * checkout and this test user, and a spec that leaves rows behind is a spec
 * that makes somebody else's run flaky.
 */
async function neverWriteToTheAccount(page: Page) {
  await page.route("**/api/black-box**", async (route) => {
    if (route.request().method() === "PUT") {
      return route.fulfill({ status: 200, contentType: "application/json", body: '{"written":0}' })
    }
    return route.continue()
  })
}

/** Is a service worker actually in charge of this page? */
async function workerIsControlling(page: Page): Promise<boolean> {
  return page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return false
    // `ready` resolves once a worker is active for this scope. It never
    // rejects, so it is raced against a deadline rather than caught.
    const ready = navigator.serviceWorker.ready.then(() => true)
    const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 8000))
    return Promise.race([ready, timeout])
  })
}

/**
 * Wait until the worker has actually STORED the page, not merely installed.
 *
 * Install warms the shell, and `OfflineShell` posts `warm-shell` on mount, but
 * both are asynchronous and neither is finished when the page is interactive.
 * Cutting the network before the store is filled tests nothing except that an
 * empty cache cannot answer — which is true and uninteresting.
 */
async function shellIsStored(page: Page, path: string): Promise<boolean> {
  return page.evaluate(async (target) => {
    const deadline = Date.now() + 15000
    while (Date.now() < deadline) {
      const hit = await caches.match(new Request(new URL(target, location.origin).href))
      if (hit) return true
      await new Promise((r) => setTimeout(r, 250))
    }
    return false
  }, path)
}

test("the Black Box opens with no connection, and its record is there", async ({ page, context }) => {
  await neverWriteToTheAccount(page)
  await page.goto(QUIT_VICE)
  await landed(page)

  const controlled = await workerIsControlling(page)
  test.skip(
    !controlled,
    "No service worker is controlling this page, so opening offline cannot be tested. " +
      "OfflineShell registers only in a production build — this is expected under `npm run dev`. " +
      "See the header of this file for how to run it against a production build.",
  )

  // Something of the person's own, so the assertion below is about the record
  // coming back and not merely about some HTML being served.
  await page.evaluate(() => {
    const stamp = new Date().toISOString()
    window.localStorage.setItem(
      "vice-blackbox-v1",
      JSON.stringify({
        version: 1,
        attempts: [
          {
            id: crypto.randomUUID(),
            viceId: "alcohol",
            label: "Drinking",
            startedOn: "2026-01-05",
            startedBy: "offline check",
            structure: [],
            endedOn: null,
            endedByReportId: null,
            updatedAt: stamp,
            deletedAt: null,
          },
        ],
        reports: [],
      }),
    )
  })
  await page.reload()
  await landed(page)

  expect(await shellIsStored(page, QUIT_VICE), "the worker never stored the Black Box's page").toBe(true)

  // THE ACTUAL QUESTION. Not "does it survive the network going" — that is
  // covered elsewhere — but "can it be opened at all from nothing".
  await context.setOffline(true)
  try {
    await page.reload({ timeout: 30000 })
    await expect(page.getByRole("heading", { name: "Black Box" })).toBeVisible()
    // AND IT WOKE UP. The heading is in the server-rendered HTML, so it is
    // visible whether or not React ever ran — which makes it exactly the wrong
    // thing to stop at. A cached document whose chunks were not also cached
    // draws the page and does nothing, which is rule 3 in `public/sw.js`.
    await page.locator('[data-hydrated="true"]').waitFor({ timeout: 30000 })
    // And it came back with the record, not an empty shell.
    await expect(page.getByText("Drinking", { exact: false }).first()).toBeVisible()
  } finally {
    await context.setOffline(false)
  }
})

test("no other page of the module is served offline, including the old hub", async ({ page, context }) => {
  // `SHELL_PATHS` is deliberately short, and `/life-mastery/quit-vice/old`
  // starts with the Black Box's own path — a membership test written with
  // `startsWith` would quietly adopt all nine of the old module's routes.
  // `tests/unit/shared/serviceWorker.test.ts` proves the worker's rule; this
  // proves it end to end, where the URLs are real.
  await neverWriteToTheAccount(page)
  await page.goto(QUIT_VICE)
  await landed(page)

  const controlled = await workerIsControlling(page)
  test.skip(!controlled, "No service worker under `npm run dev` — see the header of this file.")
  expect(await shellIsStored(page, QUIT_VICE)).toBe(true)

  await context.setOffline(true)
  try {
    const reached = await page
      .goto(QUIT_VICE_OLD, { timeout: 20000 })
      .then(() => true)
      .catch(() => false)
    expect(reached, "the old hub was served offline; SHELL_PATHS should not match it").toBe(false)
  } finally {
    await context.setOffline(false)
  }
})
