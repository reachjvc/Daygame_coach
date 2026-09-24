import { test, expect } from "@playwright/test"
import { QUIT_VICE } from "@/src/shared/lifeMasteryRoutes"
import { QUIT_VICE_ARCHIVE } from "@/app/test/archive/quit-vice/routes"

/**
 * The Black Box, end to end.
 *
 * Walks the one path the whole feature exists for: land on it, start a run,
 * have the thought, be answered by your own record, file the close call, and
 * see the run survive it. Unit tests cover the arithmetic; this covers the
 * thing a person actually does at eleven at night.
 *
 * Built from the route constants, so the next time Life Mastery moves this does
 * not assert an address that no longer exists.
 */

/** Serial: every test writes the same browser-local record. */
test.describe.configure({ mode: "serial" })

type Page = import("@playwright/test").Page

/**
 * The record lives in localStorage, and every Playwright test gets a fresh
 * browser context — so state does NOT carry from one test to the next even in
 * serial mode. Each test seeds exactly the record it needs, which also means
 * any one of them can be run on its own.
 */
async function seed(page: Page, record: unknown | null) {
  await page.goto(QUIT_VICE)
  // Hydrated first, so the page has read its own storage before we replace it.
  await page.locator('[data-hydrated="true"]').waitFor({ timeout: 20000 })

  // AND SETTLED, BEFORE THE TOMBSTONES GO UP. THIS LINE IS THE FIX FOR A FAULT
  // THAT MADE THIS FILE FAIL ROUGHLY HALF ITS FULL RUNS, AT A DIFFERENT TEST
  // EACH TIME, FOR AS LONG AS IT HAS EXISTED.
  //
  // `data-hydrated` means the BROWSER copy has been read. It says nothing about
  // the account, and the load sync is in flight at this moment: it fetches the
  // account, merges, and then pushes — including, deliberately, the very rows
  // it just merged IN, because the watermark is not advanced past them
  // (`useBlackBoxSync` calls that "a known, deliberate redundancy" and it is
  // the cheaper wrong for the page). Those rows go up carrying their ORIGINAL
  // `updatedAt`.
  //
  // So without this wait there are two writers racing on one account: the
  // page's redundant re-push, and the tombstone PUT below. Land them in that
  // order and all is well. Land them the other way and the re-push upserts
  // every row back with `deleted_at` null — **the tombstones are undone**, the
  // account still holds the previous test's data, it merges into the page about
  // 700ms after the reload, and whichever assertion is running at that instant
  // is the one that fails. A different victim every run, invisible in
  // isolation, and `mode: "serial"` then aborts everything after it.
  //
  // Six full runs before this line: five failed, at `:159`, `:184`, `:159`,
  // `:508` and `:426`, on two different versions of the product code. Proved by
  // making the race happen on purpose rather than by running it until it went
  // quiet — see `tests/e2e/blackbox-seed-race.spec.ts`, which delays the push
  // so the losing order is guaranteed.
  await settled(page)

  await page.evaluate(async (r) => {
    const put = (rows: unknown) =>
      fetch("/api/black-box", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      })

    // Two stamps a second apart. The tombstones must be OLDER than the seed,
    // or the merge would correctly bury the very rows this test is about.
    const now = Date.now()
    const buried = new Date(now).toISOString()
    const seeded = new Date(now + 1000).toISOString()

    // THE ACCOUNT IS PART OF THE FIXTURE NOW, AND CLEARING localStorage IS NOT
    // ENOUGH. Once the page syncs, a record left on the account by an earlier
    // test arrives about 700ms after load and merges in — so an assertion made
    // before that lands passes, and the same assertion made on a slower machine
    // fails. Measured: 700ms. The whole suite was green by racing the network.
    //
    // Emptying the account means tombstoning what it holds, because a deletion
    // here is a row and there is deliberately no way to make one vanish.
    const got = await fetch("/api/black-box").then((x) => x.json()).catch(() => null)
    const live = got?.rows as { attempts: Record<string, unknown>[]; reports: Record<string, unknown>[] } | undefined
    if (live && (live.attempts.length > 0 || live.reports.length > 0)) {
      await put({
        attempts: live.attempts.map((a) => ({ ...a, updated_at: buried, deleted_at: buried })),
        reports: live.reports.map((x) => ({ ...x, updated_at: buried, deleted_at: buried })),
      })
    }

    window.localStorage.removeItem("vice-blackbox-sent-v1")
    window.localStorage.removeItem("vice-blackbox-view")
    if (r === null) {
      window.localStorage.removeItem("vice-blackbox-v1")
      return
    }
    // Every seeded row is stamped fresh, so it outranks the tombstones above
    // and is what the account ends up holding once the page pushes it.
    const rec = r as { attempts: Record<string, unknown>[]; reports: Record<string, unknown>[] }
    window.localStorage.setItem("vice-blackbox-v1", JSON.stringify({
      version: 1,
      attempts: rec.attempts.map((a) => ({ ...a, updatedAt: seeded, deletedAt: null })),
      reports: rec.reports.map((x) => ({ ...x, updatedAt: seeded, deletedAt: null })),
    }))
  }, record)

  await page.reload()
  // Wait for the browser record to be READ before anything is clicked. Without
  // this a click can land on server-rendered markup whose handler React has not
  // attached yet: Playwright counts the click as done, nothing happens, and the
  // next step fails somewhere unrelated.
  await page.locator('[data-hydrated="true"]').waitFor({ timeout: 20000 })
  // And for the account's answer to have arrived, so no assertion below is
  // racing it. Not the status line — that is inside a section which only
  // renders once there is a run, so an empty seed would wait forever.
  await settled(page)
}

/**
 * A second device: a different browser, same account, nothing of its own.
 *
 * Takes the storage state from the context that is already working rather than
 * re-reading the file — a context made by hand inherits neither `use.baseURL`
 * nor anything else from the config, and a `storageState` that quietly fails to
 * load gives an unauthenticated page whose symptom is a missing element twenty
 * seconds later rather than an auth error.
 */
async function secondDevice(page: Page, browser: import("@playwright/test").Browser) {
  const origin = new URL(page.url()).origin
  const context = await browser.newContext({
    storageState: await page.context().storageState(),
    baseURL: origin,
  })
  const fresh = await context.newPage()
  await fresh.goto(`${origin}${QUIT_VICE}`)
  await expect(fresh).toHaveURL(new RegExp(`${QUIT_VICE}$`), { timeout: 20000 })
  await fresh.locator('[data-hydrated="true"]').waitFor({ timeout: 20000 })
  await fresh.evaluate(() => {
    window.localStorage.removeItem("vice-blackbox-v1")
    window.localStorage.removeItem("vice-blackbox-sent-v1")
    window.localStorage.removeItem("vice-blackbox-view")
  })
  await fresh.reload()
  await settled(fresh)
  return { context, fresh }
}

/** Waits until the account's answer has arrived, so nothing below races it. */
async function settled(page: Page) {
  // SYNCED **AND** NOTHING PENDING. `data-sync` on its own matches the state
  // the last completed sync left, which is still "synced" for the instant
  // between an action and the effect that notices it — so waiting on it alone
  // lets an assertion run before the change has been queued, let alone sent.
  // That is what made the cross-device delete test fail intermittently while
  // the propagation it was testing worked perfectly.
  await page.locator('[data-sync="synced"][data-pending="0"], [data-sync="offline"], [data-sync="failed"]')
    .waitFor({ timeout: 20000 })
}

/** A record with one run still going, started a fortnight ago. */
function liveRun(extraReports: unknown[] = []) {
  const started = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10)
  return {
    version: 1,
    attempts: [{
      id: "aaaaaaaa-0000-4000-8000-000000000001", viceId: "nicotine", label: "Smoking or vaping", startedOn: started,
      startedBy: "Read my own record", structure: ["Told a specific person"],
      endedOn: null, endedByReportId: null,
    }],
    reports: extraReports,
  }
}

test.describe("the Black Box", () => {
  test("clicking Vices lands on it, not on the old hub", async ({ page }) => {
    await seed(page, null)
    await expect(page.getByRole("heading", { name: "Black Box", level: 1 })).toBeVisible()
    // AND THE OLD MODULE IS NOT REACHABLE FROM HERE AT ALL. One line at the
    // foot used to point at it, and it was the last thing between this page and
    // the owner's concept item 8 — "Clicking Vices shows the new work in
    // isolation. I should not have to click around old work to reach it." The
    // module was retired to the test archive on 2026-09-24.
    await expect(page.getByRole("link", { name: /the flows, tools and reading/i })).toHaveCount(0)
  })

  test("the retired module still works, at its archived address", async ({ page }) => {
    // RETIRED, NOT DELETED, and this is what makes that claim true rather than
    // a sentence in a commit message. The owner's condition for retiring it was
    // "keep it in the test archives so i can access it later", and it reads the
    // same `quit-vice-v1` key it always did — so anything ever typed into those
    // screens is still there. If this test goes, that promise is unguarded.
    await page.goto(QUIT_VICE_ARCHIVE)
    await expect(page.locator('[data-hydrated="true"]')).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole("heading", { name: "Quitting something" })).toBeVisible()
  })

  test("a run can be started, and it shows up as days", async ({ page }) => {
    await seed(page, null)
    // On an empty record the primary action is entering history; starting a run
    // now is the quiet one. Both are buttons, so this asserts the real label.
    await page.getByRole("button", { name: "Or start one now" }).click()
    await page.getByRole("button", { name: "Smoking or vaping" }).click()
    await page.getByRole("button", { name: "Told a specific person" }).click()
    await page.getByRole("button", { name: "Start the run" }).click()

    await expect(page.getByRole("heading", { name: "This run", exact: true })).toBeVisible()
    await expect(page.getByText("This run, still going")).toBeVisible()
    // The record survives a reload, which is the whole point of storing it.
    await page.reload()
    await expect(page.getByRole("heading", { name: "This run", exact: true })).toBeVisible()
  })

  test("the door is not offered until there is something behind it", async ({ page }) => {
    // With nothing filed the door can only answer "this is the first time you
    // wrote this down". A page whose loudest control leads nowhere teaches you
    // to ignore it, which is fatal for the one control that has to work
    // mid-thought. It appears with the first report.
    await seed(page, liveRun())
    await expect(page.getByRole("button", { name: /having a thought/i })).toHaveCount(0)
  })

  test("the door answers honestly about a thought it has never seen", async ({ page }) => {
    // One report on file, so the door exists — but asked about a DIFFERENT
    // thought it must say so plainly and invent no pattern.
    await seed(page, liveRun([{
      id: "bbbb0000-0000-4000-8000-000000000000", attemptId: "aaaaaaaa-0000-4000-8000-000000000001", at: "2026-09-01T20:00:00", wentThrough: false,
      thought: "Bad day at work", ending: "stress", closeness: 5,
      withWhom: "", where: "", factors: [], didInstead: "went for a walk",
    }]))
    await page.getByRole("button", { name: /having a thought/i }).click()
    await page.getByRole("button", { name: /I felt fine/i }).first().click()
    await expect(page.getByText(/first time you have written this one down/i)).toBeVisible()
  })

  test("filing a close call keeps the run alive and pays out next time", async ({ page }) => {
    await seed(page, liveRun())
    // The first report goes through "File a report", because the door is not
    // offered until there is something behind it. From the second one on, the
    // door is the way in — which is the sequence a real record actually has.
    await page.getByRole("button", { name: "File a report" }).click()
    await page.getByRole("textbox", { name: /What was the thought/i }).fill("One wouldn't undo this")
    await page.getByRole("button", { name: "File it" }).click()

    // The run is untouched: still going, and the close call cost nothing.
    await expect(page.getByRole("heading", { name: "This run", exact: true })).toBeVisible()

    // And the door now has something to say about that same thought.
    await page.getByRole("button", { name: /having a thought/i }).click()
    await page.getByRole("button", { name: /I felt fine/i }).first().click()
    // Scoped to the dialog: the landing page also shows this wording in the
    // cost list, and an assertion that passes from either place proves neither.
    const answer = page.getByRole("dialog")
    await expect(answer.getByText(/never ended a run/i)).toBeVisible()
    await expect(answer.getByText("One wouldn't undo this")).toBeVisible()
  })

  test("a run you already had can be entered, which is how the chart gets a history", async ({ page }) => {
    await seed(page, null)
    await page.getByRole("button", { name: /Add a run you already had/i }).click()

    // On an empty record there is no earlier run to take the vice from, so the
    // form asks instead of filing it as nicotine — which is what it used to do.
    await expect(page.getByRole("button", { name: "Add it" })).toBeDisabled()
    await page.getByRole("button", { name: "Smoking or vaping" }).click()

    await page.locator("#pr-from").fill("2025-02-10")
    await page.locator("#pr-to").fill("2025-05-09")
    await expect(page.getByText("89 days")).toBeVisible()

    await page.getByRole("button", { name: "Add it" }).click()

    // It lands on the chart as a finished run, and does NOT become the live one.
    await expect(page.getByRole("heading", { name: "No run going" })).toBeVisible()
    await expect(page.getByText("Longest run")).toBeVisible()
    await page.reload()
    await expect(page.getByText("Longest run")).toBeVisible()
  })

  test("a form that cannot be submitted always says why", async ({ page }) => {
    // A first user filled in both dates, read "that is 89 days", chose an
    // ending, and met a dead button with nothing on screen explaining it — the
    // required vice had no default and no hint. The primary action on the empty
    // page led to a form that could not be completed. Whenever the button is
    // disabled, a reason is on screen.
    await seed(page, null)
    await page.getByRole("button", { name: /Add a run you already had/i }).click()

    const add = page.getByRole("button", { name: "Add it" })
    await expect(add).toBeDisabled()
    await expect(page.getByText(/Pick what you were stopping/i)).toBeVisible()

    await page.getByRole("button", { name: "Smoking or vaping" }).click()
    await expect(add).toBeDisabled()
    await expect(page.getByText(/Both dates are needed/i)).toBeVisible()

    await page.locator("#pr-from").fill("2025-02-10")
    await page.locator("#pr-to").fill("2025-05-09")
    await expect(add).toBeEnabled()
  })

  test("a run that ends before it starts is refused", async ({ page }) => {
    await seed(page, null)
    await page.getByRole("button", { name: /Add a run you already had/i }).click()
    await page.getByRole("button", { name: "Smoking or vaping" }).click()
    await page.locator("#pr-from").fill("2025-05-09")
    await page.locator("#pr-to").fill("2025-02-10")
    await expect(page.getByText(/ends before it starts/i)).toBeVisible()
    await expect(page.getByRole("button", { name: "Add it" })).toBeDisabled()
  })

  test("going through with it ends the run, and the run keeps its days", async ({ page }) => {
    await seed(page, liveRun())
    await page.getByRole("button", { name: "File a report" }).click()
    await page.getByRole("button", { name: /I did it/i }).click()
    await page.getByRole("textbox", { name: /What was the thought/i }).fill("Thought I could handle one")
    await page.getByRole("button", { name: "File it" }).click()

    // Nothing resets: the ended run is still on the chart and still counted.
    await expect(page.getByRole("heading", { name: "No run going" })).toBeVisible()
    await expect(page.getByText("Across every run")).toBeVisible()
    await expect(page.getByText(/Everything above stays exactly as it is/i)).toBeVisible()
  })

  test("and it can be taken straight back", async ({ page }) => {
    // THE MIS-TAP. "I didn't do it" and "I did it" are a two-up grid one
    // thumb-width apart, read at eleven at night, and the right-hand one ends
    // the run. Until this existed there was no undo, edit or delete anywhere in
    // the module: the wrong tap ended a run for good and the page offered
    // nothing but "Start a run".
    await seed(page, liveRun())
    await page.getByRole("button", { name: "File a report" }).click()
    await page.getByRole("button", { name: /I did it/i }).click()
    await page.getByRole("button", { name: "File it" }).click()
    await expect(page.getByRole("heading", { name: "No run going" })).toBeVisible()

    await page.getByRole("button", { name: "Undo that" }).click()
    await expect(page.getByRole("heading", { name: "This run", exact: true })).toBeVisible()

    // Persisted, not only undone on screen — the record is the point.
    await page.reload()
    await expect(page.getByRole("heading", { name: "This run", exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "Undo that" })).toHaveCount(0)
  })

  test("a report filed by mistake can be removed from the run it is on", async ({ page }) => {
    // The undo strip only covers the report just filed. A close call written
    // last Tuesday is corrected where it is read, from the run's own panel,
    // with the words that were typed beside it.
    await seed(page, liveRun([{
      id: "bbbb0000-0000-4000-8000-000000000000", attemptId: "aaaaaaaa-0000-4000-8000-000000000001", at: "2026-09-01T20:00:00", wentThrough: false,
      thought: "Filed this by accident", ending: "stress", closeness: 5,
      withWhom: "", where: "", factors: [], didInstead: "",
    }]))
    await page.getByRole("button", { name: /days . still going/ }).click()
    // Scoped to the run's own panel: the cost list quotes the same words, and
    // an assertion that passes from either place proves neither.
    const filed = page.getByRole("listitem").filter({ hasText: "Filed this by accident" })
    await expect(filed).toBeVisible()

    await page.getByRole("button", { name: /Remove the report filed on/ }).click()
    await page.getByRole("button", { name: /^remove\??$/ }).click()

    await expect(filed).toHaveCount(0)
    // The run itself is untouched by removing a close call.
    await expect(page.getByRole("heading", { name: "This run", exact: true })).toBeVisible()
  })

  test("a whole run can be removed, and says what that costs first", async ({ page }) => {
    // A run entered from memory with a mistyped year is permanent otherwise,
    // and it goes on blocking every overlapping run entered after it.
    await seed(page, liveRun())
    await page.getByRole("button", { name: /days . still going/ }).click()
    await page.getByRole("button", { name: "Remove this whole run" }).click()
    await expect(page.getByText(/off your record for good/i)).toBeVisible()

    await page.getByRole("button", { name: "Remove it" }).click()
    await expect(page.getByRole("heading", { name: "Start with what already happened" })).toBeVisible()
  })

  test("a lapse is dated by the night it happened, not the morning it is written", async ({ page }) => {
    // Almost nobody files at the moment. With no field for the day, a run that
    // ended on Friday went on the chart a day longer than it lasted, for good.
    const started = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    await seed(page, liveRun())

    await page.getByRole("button", { name: "File a report" }).click()
    await page.getByRole("button", { name: /I did it/i }).click()
    await page.locator("#rf-on").fill(yesterday)
    await page.getByRole("button", { name: "File it" }).click()

    await page.getByRole("button", { name: /days . just one|days . I felt fine/ }).click()
    await expect(page.getByText(`${started} to ${yesterday}`)).toBeVisible()
  })

  test("a report cannot be dated before the run it is filed against", async ({ page }) => {
    await seed(page, liveRun())
    await page.getByRole("button", { name: "File a report" }).click()
    await page.locator("#rf-on").fill("2020-01-01")
    await expect(page.getByText(/nothing in it can be older than that/i)).toBeVisible()
    await expect(page.getByRole("button", { name: "File it" })).toBeDisabled()
  })

  test("two things being quit are two records, not one chart", async ({ page }) => {
    // Every read ignored the vice, so a smoking run and a porn run were drawn
    // on one chart under one caption and added into one total: "Lit is time
    // without porn" over a 100-day smoking bar, 215 days across every run.
    await seed(page, {
      version: 1,
      attempts: [
        { id: "aaaaaaaa-0000-4000-8000-000000000001", viceId: "nicotine", label: "Smoking or vaping", startedOn: "2025-01-01",
          startedBy: "", structure: [], endedOn: "2025-04-10", endedByReportId: "bbbb0000-0000-4000-8000-000000000001" },
        { id: "aaaaaaaa-0000-4000-8000-000000000002", viceId: "porn", label: "Porn", startedOn: "2026-06-01",
          startedBy: "", structure: [], endedOn: null, endedByReportId: null },
      ],
      reports: [
        { id: "bbbb0000-0000-4000-8000-000000000001", attemptId: "aaaaaaaa-0000-4000-8000-000000000001", at: "2025-04-10T12:00:00", wentThrough: true,
          thought: "One at the wedding", ending: "justone", closeness: null,
          withWhom: "", where: "", factors: [], didInstead: "" },
      ],
    })

    // The newest is on screen, and the caption names it rather than the other.
    await expect(page.getByText(/Lit is time without porn/i)).toBeVisible()
    await expect(page.getByText("100 days", { exact: true })).toHaveCount(0)

    await page.getByRole("button", { name: "Smoking or vaping, 1 run" }).click()
    await expect(page.getByText(/Lit is time without smoking or vaping/i)).toBeVisible()
    await expect(page.getByText("100 days").first()).toBeVisible()
    await expect(page.getByRole("heading", { name: "No run going" })).toBeVisible()

    // AND IT IS STILL THERE NEXT TIME. Defaulting to the newest run means a
    // record that is four years of smoking opens on the drinking run started
    // last month — no chart, no numbers and no door, because the door is per
    // vice. Opening this mid-thought would mean finding a switcher first.
    await page.reload()
    await expect(page.getByText(/Lit is time without smoking or vaping/i)).toBeVisible()
  })

  test("stopping a second thing over the same months is not refused", async ({ page }) => {
    // The overlap rule ignored the vice, so this was rejected at the store as
    // well as on the screen and "Add it" simply did nothing.
    await seed(page, {
      version: 1,
      attempts: [{ id: "aaaaaaaa-0000-4000-8000-000000000001", viceId: "nicotine", label: "Smoking or vaping", startedOn: "2026-01-01",
        startedBy: "", structure: [], endedOn: "2026-03-01", endedByReportId: "bbbb0000-0000-4000-8000-000000000001" }],
      reports: [{ id: "bbbb0000-0000-4000-8000-000000000001", attemptId: "aaaaaaaa-0000-4000-8000-000000000001", at: "2026-03-01T12:00:00", wentThrough: true,
        thought: "", ending: "fine", closeness: null,
        withWhom: "", where: "", factors: [], didInstead: "" }],
    })

    await page.getByRole("button", { name: /Add a run you already had/i }).click()
    await page.getByRole("button", { name: "Porn", exact: true }).click()
    await page.locator("#pr-from").fill("2026-01-15")
    await page.locator("#pr-to").fill("2026-02-15")
    await expect(page.getByRole("button", { name: "Add it" })).toBeEnabled()
    await page.getByRole("button", { name: "Add it" }).click()

    // Two vices on the record, each with its own chart.
    await expect(page.getByRole("button", { name: "Porn, 1 run" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Smoking or vaping, 1 run" })).toBeVisible()
  })

  test("a second tab does not silently wipe what the first one filed", async ({ page, context }) => {
    // The record is loaded whole and written back whole, so two tabs each held
    // their own copy and the last to write won. File a close call in one tab,
    // do anything in the other, and the close call was gone — no error, nothing
    // on screen, from the object this tool exists to accumulate over years.
    await seed(page, liveRun())

    const second = await context.newPage()
    await second.goto(QUIT_VICE)
    await second.locator('[data-hydrated="true"]').waitFor({ timeout: 20000 })

    // Tab one files a close call.
    await page.getByRole("button", { name: "File a report" }).click()
    await page.getByRole("textbox", { name: /What was the thought/i }).fill("Filed in the first tab")
    await page.getByRole("button", { name: "File it" }).click()
    await expect(page.getByRole("heading", { name: "This run", exact: true })).toBeVisible()

    // Tab two, which loaded BEFORE that, now writes something of its own.
    await second.getByRole("button", { name: "File a report" }).click()
    await second.getByRole("textbox", { name: /What was the thought/i }).fill("Filed in the second tab")
    await second.getByRole("button", { name: "File it" }).click()
    await expect(second.getByRole("heading", { name: "This run", exact: true })).toBeVisible()

    // Both survive. Read back through the door, which lists what was written.
    await second.reload()
    await second.locator('[data-hydrated="true"]').waitFor({ timeout: 20000 })
    await second.getByRole("button", { name: /having a thought/i }).click()
    await second.getByRole("button", { name: /I felt fine/i }).first().click()
    const answer = second.getByRole("dialog")
    await expect(answer.getByText("Filed in the first tab")).toBeVisible()
    await expect(answer.getByText("Filed in the second tab")).toBeVisible()
    await second.close()
  })

  test("a record entered here is on the account, and on the next device", async ({ page, browser }) => {
    // THE POINT OF THE WHOLE THING. Until this passed, the record lived in one
    // browser: clearing site data lost it, a phone never had it, and the door —
    // the one control this tool exists for — had nothing behind it anywhere
    // else. The assertion is deliberately made from a browser that has never
    // seen this record rather than from a second tab of the same one.
    await seed(page, null)
    await page.getByRole("button", { name: "Add a run you already had" }).click()
    await page.getByRole("button", { name: "Smoking or vaping", exact: true }).click()
    await page.locator("#pr-from").fill("2024-01-02")
    await page.locator("#pr-to").fill("2024-03-31")
    await page.getByRole("button", { name: /Just one won't matter/ }).click()
    await page.getByRole("button", { name: "Add it" }).click()
    await expect(page.getByText("Saved to your account.")).toBeVisible({ timeout: 20000 })

    // A different browser, signed into the same account, with nothing of its own.
    // `baseURL` is passed explicitly and the address is absolute: a context made
    // by hand does NOT inherit `use.baseURL` from the config, and a relative
    // `goto` on one fails with "Cannot navigate to invalid URL" — which then
    // surfaces further down as a missing element rather than as a bad address.
    // The SAME signed-in state, taken from the context that is already working,
    // rather than re-read from a path. A context made by hand inherits neither
    // `use.baseURL` nor anything else from the config, and a storageState that
    // quietly fails to load produces an unauthenticated page whose symptom is a
    // missing element twenty seconds later rather than an auth error.
    const origin = new URL(page.url()).origin
    const other = await browser.newContext({
      storageState: await page.context().storageState(),
      baseURL: origin,
    })
    const fresh = await other.newPage()
    await fresh.goto(`${origin}${QUIT_VICE}`)
    // Proves it is signed in before anything is concluded from what it shows.
    await expect(fresh).toHaveURL(new RegExp(`${QUIT_VICE}$`), { timeout: 20000 })
    await fresh.locator('[data-hydrated="true"]').waitFor({ timeout: 20000 })
    await fresh.evaluate(() => {
      window.localStorage.removeItem("vice-blackbox-v1")
      window.localStorage.removeItem("vice-blackbox-sent-v1")
      window.localStorage.removeItem("vice-blackbox-view")
    })
    await fresh.reload()
    await fresh.locator('[data-sync]:not([data-sync="unknown"])').waitFor({ timeout: 20000 })

    await expect(fresh.getByText("Longest run")).toBeVisible({ timeout: 20000 })
    await expect(fresh.getByText("90 days").first()).toBeVisible()
    await other.close()
  })

  test("a run removed on one device is gone on the other", async ({ page, browser }) => {
    // THE TOMBSTONE, END TO END. A hard delete would leave the account simply
    // lacking the row, and the second device — still holding it — would decide
    // the account had forgotten it and upload it again, forever.
    await seed(page, liveRun())
    const { context, fresh } = await secondDevice(page, browser)
    await expect(fresh.getByRole("heading", { name: "This run", exact: true })).toBeVisible()

    await page.getByRole("button", { name: /day[s]? . still going/ }).click()
    await page.getByRole("button", { name: "Remove this whole run" }).click()
    await page.getByRole("button", { name: "Remove it" }).click()
    await expect(page.getByRole("heading", { name: "Start with what already happened" })).toBeVisible()
    await settled(page)

    await fresh.reload()
    await settled(fresh)
    await expect(fresh.getByRole("heading", { name: "Start with what already happened" })).toBeVisible({ timeout: 20000 })
    await expect(fresh.getByRole("heading", { name: "This run", exact: true })).toHaveCount(0)
    await context.close()
  })

  test("undoing a lapse on one device brings the run back on the other", async ({ page, browser }) => {
    // THE CASE I EXPECTED TO GET WRONG. An undo writes TWO changes that have to
    // travel together: a tombstone on the report, and the run's own row losing
    // its `endedOn`. A device taking only one of them would show a run still
    // going with the report that ended it sitting underneath, or an ended run
    // with nothing that ended it.
    await seed(page, liveRun())
    await page.getByRole("button", { name: "File a report" }).click()
    await page.getByRole("button", { name: /I did it/i }).click()
    await page.getByRole("button", { name: "File it" }).click()
    await expect(page.getByRole("heading", { name: "No run going" })).toBeVisible()
    await settled(page)

    const { context, fresh } = await secondDevice(page, browser)
    await expect(fresh.getByRole("heading", { name: "No run going" })).toBeVisible()

    await page.getByRole("button", { name: "Undo that" }).click()
    await expect(page.getByRole("heading", { name: "This run", exact: true })).toBeVisible()
    await settled(page)

    await fresh.reload()
    await settled(fresh)
    await expect(fresh.getByRole("heading", { name: "This run", exact: true })).toBeVisible({ timeout: 20000 })
    await expect(fresh.getByRole("heading", { name: "No run going" })).toHaveCount(0)
    await context.close()
  })

  test("a close call filed with no signal arrives when the signal does", async ({ page, context, browser }) => {
    // THE ONE MOMENT THIS TOOL EXISTS FOR is eleven at night, on a phone, and a
    // phone at eleven at night is exactly where there is no signal. Everything
    // else in this file proves the sync works when the network does; this is
    // the case where it does not, and it is the case the page was designed
    // around — the browser copy is the working copy precisely so that filing
    // never waits for a request.
    await seed(page, liveRun())

    await context.setOffline(true)
    await page.getByRole("button", { name: "File a report" }).click()
    await page.getByRole("textbox", { name: /What was the thought/i }).fill("filed with no signal")
    await page.getByRole("button", { name: "File it" }).click()

    // Filed, kept, and the run is untouched. The page says what is true without
    // ever claiming the work was lost.
    await expect(page.getByRole("heading", { name: "This run", exact: true })).toBeVisible()
    await expect(page.getByText(/Offline\./)).toBeVisible({ timeout: 20000 })
    await expect(page.getByText(/1 change is waiting on this device/)).toBeVisible()
    await expect(page.getByText(/Saved to your account/)).toHaveCount(0)

    // NOT TESTED HERE, BECAUSE IT IS NOT TRUE: reloading with the network down
    // fails with ERR_INTERNET_DISCONNECTED. This route is server-rendered and
    // has no service worker, so the page cannot be OPENED offline at all — only
    // used offline once it is already open. The record is safe on the device
    // either way; the limitation is the page, not the data. Said out loud
    // because the design rule this file is built on claims the page "opens and
    // files with no network", and only the second half of that is true.

    // Signal comes back. Nothing is clicked: the `online` event does it.
    await context.setOffline(false)
    await expect(page.getByText(/Saved to your account/)).toBeVisible({ timeout: 30000 })

    // And it really left the device, rather than the line merely changing.
    const { context: other, fresh } = await secondDevice(page, browser)
    await fresh.getByRole("button", { name: /having a thought/i }).click()
    await fresh.getByRole("button", { name: /I felt fine/i }).first().click()
    await expect(fresh.getByRole("dialog").getByText("filed with no signal")).toBeVisible({ timeout: 20000 })
    await other.close()
  })

  test("a saved copy loaded back adds what is missing and removes nothing", async ({ page }) => {
    // THIS PATH HAD NO TEST AT ALL, which is how it broke without anyone
    // noticing. "Load a copy" replaced the record while it lived in one
    // browser; once it synced, the rows it removed came back on the next load
    // because the account still had them — and the confirm dialog was promising
    // "everything on this device is swapped for what is in the file, and there
    // is no way back" while doing neither of those things.
    await seed(page, null)

    // A record with one run, saved to a file.
    await page.getByRole("button", { name: "Add a run you already had" }).click()
    await page.getByRole("button", { name: "Smoking or vaping", exact: true }).click()
    await page.locator("#pr-from").fill("2024-01-02")
    await page.locator("#pr-to").fill("2024-03-31")
    await page.getByRole("button", { name: /Just one won't matter/ }).click()
    await page.getByRole("button", { name: "Add it" }).click()
    await settled(page)

    const download = page.waitForEvent("download")
    await page.getByRole("button", { name: "Save a copy" }).click()
    const copy = await (await download).path()

    // A second run, which the file knows nothing about.
    await page.getByRole("button", { name: /Add a run you already had/i }).click()
    await page.locator("#pr-from").fill("2025-01-02")
    await page.locator("#pr-to").fill("2025-02-01")
    await page.getByRole("button", { name: /Something went badly wrong/ }).click()
    await page.getByRole("button", { name: "Add it" }).click()
    await expect(page.getByText("31 days").first()).toBeVisible()
    await settled(page)

    // Load the older file back. The run it does not contain must survive.
    await page.setInputFiles('input[type="file"]', copy)
    await expect(page.getByText(/already on your record|Added \d+ rows? from that file/)).toBeVisible({ timeout: 20000 })
    await expect(page.getByText("90 days").first()).toBeVisible()
    await expect(page.getByText("31 days").first()).toBeVisible()

    // And it still survives the account's answer, which is where it went wrong.
    await page.reload()
    await settled(page)
    await expect(page.getByText("90 days").first()).toBeVisible()
    await expect(page.getByText("31 days").first()).toBeVisible()
  })

  test("the same days twice off one thing is still refused, and says so", async ({ page }) => {
    await seed(page, {
      version: 1,
      attempts: [{ id: "aaaaaaaa-0000-4000-8000-000000000001", viceId: "nicotine", label: "Smoking or vaping", startedOn: "2026-01-01",
        startedBy: "", structure: [], endedOn: "2026-03-01", endedByReportId: "bbbb0000-0000-4000-8000-000000000001" }],
      reports: [{ id: "bbbb0000-0000-4000-8000-000000000001", attemptId: "aaaaaaaa-0000-4000-8000-000000000001", at: "2026-03-01T12:00:00", wentThrough: true,
        thought: "", ending: "fine", closeness: null,
        withWhom: "", where: "", factors: [], didInstead: "" }],
    })
    await page.getByRole("button", { name: /Add a run you already had/i }).click()
    await page.locator("#pr-from").fill("2026-02-01")
    await page.locator("#pr-to").fill("2026-02-10")
    await expect(page.getByText(/overlap a run off smoking or vaping/i)).toBeVisible()
    await expect(page.getByRole("button", { name: "Add it" })).toBeDisabled()
  })
})
