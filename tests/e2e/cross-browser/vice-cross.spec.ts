import { test, expect } from "@playwright/test"
import { QUIT_VICE } from "@/src/shared/lifeMasteryRoutes"

/**
 * THE BLACK BOX ON FIREFOX AND WEBKIT.
 *
 * Until this existed, every behavioural test of this module ran on Chromium and
 * nothing else. The layout sweeps cover it on three engines — a cold open, no
 * hydration error, no nested control, nothing overflowing — but a page can draw
 * perfectly on Safari and still lose the night somebody filed.
 *
 * ----------------------------------------------------------------------------
 * THE THREE THINGS THAT GENUINELY DIFFER BETWEEN ENGINES HERE, and they are the
 * only reason this file is not a copy of `blackbox.spec.ts`.
 *
 * 1. **WHICH NIGHT A REPORT BELONGS TO.** `at` is a wall clock with no zone —
 *    `2026-02-14T22:15:00` — stored that way on purpose, because a report filed
 *    at 23:30 in Berlin must not become tomorrow. Every engine parses a
 *    date-time with no offset as local time today; they have not always, and
 *    the failure mode is silent and a day wide. So a night is filed and read
 *    back on each engine.
 *
 * 2. **IDS ARE MINTED ON THE DEVICE.** `crypto.randomUUID` needs a secure
 *    context, and the column is a `UUID` that refuses anything else — this
 *    module has already lost rows once to an id its database would not take. If
 *    an engine cannot mint one, a run cannot be started at all, which is what
 *    this asserts rather than asserting the function exists.
 *
 * 3. **THE BROWSER COPY IS THE WORKING COPY.** Everything renders from
 *    localStorage and the account arrives behind it. WebKit is the engine with
 *    the most aggressive storage rules, so "file something, reload, it is still
 *    there" is a different claim there than on Chromium.
 *
 * ----------------------------------------------------------------------------
 * IT NEITHER WRITES TO THE ACCOUNT NOR READS ITS ROWS, AND BOTH HALVES ARE
 * DELIBERATE.
 *
 * Not writing: this runs in two more projects against the SAME shared account
 * as the chromium suite, and a second writer there is precisely the race that
 * made `blackbox.spec.ts` fail half its runs for as long as it existed. Every
 * PUT is answered in the browser.
 *
 * Not reading its rows: the first version left the GET real, and the tests
 * could not find the empty state — because clearing `localStorage` empties the
 * BROWSER copy and the account still had whatever the chromium suite last left
 * there, which merges back in about 700ms later. A fixture that depends on
 * another project's leftovers is not a fixture. So the GET is answered with an
 * empty record and each test seeds exactly what it needs.
 *
 * "Can this engine reach the account at all" is still worth asking and is
 * asked once, on its own, against the real endpoint — a status, not rows.
 */

test.describe.configure({ mode: "serial" })

type Page = import("@playwright/test").Page

/** The night this test files, chosen to be unambiguous in any zone. */
const NIGHT = "2026-02-14"

async function landed(page: Page) {
  await page.locator('[data-hydrated="true"]').waitFor({ timeout: 40000 })
  await page
    .locator('[data-sync-settled="true"]')
    .waitFor({ timeout: 40000 })
}

/** Nothing this file does reaches the database, and none of its rows reach this page. */
async function isolated(page: Page) {
  await page.route("**/api/black-box**", async (route) => {
    if (route.request().method() === "PUT") {
      return route.fulfill({ status: 200, contentType: "application/json", body: '{"written":0}' })
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ rows: { attempts: [], reports: [] }, takenAt: new Date().toISOString() }),
    })
  })
}

async function fresh(page: Page) {
  await isolated(page)
  await page.goto(QUIT_VICE)
  await landed(page)
  await page.evaluate(() => {
    for (const key of ["vice-blackbox-v1", "vice-blackbox-sent-v1", "vice-blackbox-view"]) {
      window.localStorage.removeItem(key)
    }
  })
  await page.reload()
  await landed(page)
}

test("this engine can reach the account at all", async ({ page }) => {
  // The one assertion that talks to the real endpoint: a status, never rows.
  // Everything below is isolated from the account on purpose, so without this
  // the file would never find out that an engine could not read it.
  await page.goto(QUIT_VICE)
  await landed(page)
  const status = await page.evaluate(async () => {
    const res = await fetch("/api/black-box").catch(() => null)
    return res ? res.status : 0
  })
  expect(status, "this engine could not read the account").toBe(200)
})

test("a run can be started, which means this engine can mint an id the database would take", async ({
  page,
}) => {
  await fresh(page)
  await page.getByRole("button", { name: "Or start one now" }).click()
  await page.getByRole("button", { name: "Smoking or vaping" }).click()
  await page.getByRole("button", { name: "Told a specific person" }).click()
  await page.getByRole("button", { name: "Start the run" }).click()

  await expect(page.getByRole("heading", { name: "This run", exact: true })).toBeVisible()

  // A UUID, not merely a string. The column is `UUID` and refuses the old
  // non-UUID fallback this module already lost rows to once, so an engine
  // whose `crypto.randomUUID` is missing would fail here rather than at a
  // write nobody sees until later.
  const ids = await page.evaluate(() => {
    const raw = window.localStorage.getItem("vice-blackbox-v1")
    const rec = raw ? (JSON.parse(raw) as { attempts: { id: string }[] }) : null
    return (rec?.attempts ?? []).map((a) => a.id)
  })
  expect(ids.length, "no run was written to the browser copy").toBe(1)
  expect(ids[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
})

test("a night filed is the night read back, and it survives a reload", async ({ page }) => {
  await fresh(page)

  /**
   * A RUN THAT ALREADY SPANS THE NIGHT, seeded rather than clicked.
   *
   * The first version started a run through the UI — which starts it TODAY —
   * and then tried to file a report dated in February. The form refused, quite
   * rightly: nothing can have happened before the run began, and "File it"
   * stayed disabled. That was my fixture being wrong, not the product, and it
   * is the guard doing its job.
   */
  await page.evaluate(() => {
    const stamp = new Date().toISOString()
    window.localStorage.setItem(
      "vice-blackbox-v1",
      JSON.stringify({
        version: 1,
        attempts: [
          {
            id: "aaaaaaaa-0000-4000-8000-0000000000c1",
            viceId: "nicotine",
            label: "Smoking or vaping",
            startedOn: "2026-01-05",
            startedBy: "cross-browser check",
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

  await page.getByRole("button", { name: "File a report" }).click()
  const form = page.getByRole("dialog")
  await expect(form.getByRole("heading", { name: "File a report" })).toBeVisible()
  // "Which day was this?" — the field that exists because a report used to be
  // dated by the moment of FILING, so a run that ended on a Friday night was
  // recorded as ending on Saturday.
  await form.locator("#rf-on").fill(NIGHT)
  await form.getByRole("button", { name: /Just one won't matter/ }).first().click()
  await form.getByRole("button", { name: "File it" }).click()

  // Read it back off the record rather than off the screen: the screen can be
  // right while the stored day is a day out, which is the fault this guards.
  const stored = await page.evaluate(() => {
    const raw = window.localStorage.getItem("vice-blackbox-v1")
    const rec = raw ? (JSON.parse(raw) as { reports: { at: string }[] }) : null
    return (rec?.reports ?? []).map((r) => r.at)
  })
  expect(stored.length, "the report never reached the browser copy").toBeGreaterThan(0)
  expect(stored[0].slice(0, 10), "the filed night moved by a day on this engine").toBe(NIGHT)

  // AND IT IS STILL THERE AFTER A RELOAD. WebKit has the tightest storage rules
  // of the three, and the whole page renders from this copy.
  await page.reload()
  await landed(page)
  const after = await page.evaluate(() => {
    const raw = window.localStorage.getItem("vice-blackbox-v1")
    const rec = raw ? (JSON.parse(raw) as { reports: { at: string }[] }) : null
    return (rec?.reports ?? []).map((r) => r.at)
  })
  expect(after[0]?.slice(0, 10), "the record did not survive a reload on this engine").toBe(NIGHT)
})

test("the chart draws, and no lane label is pushed outside its card", async ({ page }) => {
  /**
   * The lanes are positioned as percentages and the labels are placed against
   * a measured width, so this is exactly the kind of thing that is right on one
   * engine and a few pixels wrong on another. `blackbox.spec.ts` asserts it on
   * Chromium at three widths; this asks the other two engines the same question
   * on the record they have.
   */
  await fresh(page)
  await page.getByRole("button", { name: "Add a run you already had" }).click()
  const form = page.getByRole("dialog")
  await form.getByRole("button", { name: "Smoking or vaping" }).click()
  await page.locator("#pr-from").fill("2024-01-02")
  await page.locator("#pr-to").fill("2025-11-14")
  await form.getByRole("button", { name: /Something went badly wrong/i }).first().click()
  await page.getByRole("button", { name: "Add it" }).click()

  await expect(page.getByRole("heading", { name: "Every run", exact: true })).toBeVisible({ timeout: 20000 })

  const escaping = await page.evaluate(() => {
    const card = [...document.querySelectorAll("section")].find((el) =>
      /Each bar is a run/.test(el.textContent || ""),
    )
    if (!card) return ["no chart card on the page"]
    const box = card.getBoundingClientRect()
    const out: string[] = []
    for (const el of card.querySelectorAll("*")) {
      const text = (el.textContent || "").trim()
      if (!/^\d+ days · /.test(text) || el.querySelector("div")) continue
      const r = el.getBoundingClientRect()
      if (r.width === 0) continue
      if (r.left < box.left - 1 || r.right > box.right + 1) {
        out.push(`"${text}" ${Math.round(r.left)}..${Math.round(r.right)} in ${Math.round(box.left)}..${Math.round(box.right)}`)
      }
    }
    return out
  })
  expect(escaping, "a lane label is drawn outside the chart's card on this engine").toEqual([])
})
