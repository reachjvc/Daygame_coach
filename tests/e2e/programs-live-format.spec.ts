import { test, expect } from "./fixtures/test"
import { ROUTES } from "@/src/shared/routes"
import { guardTrainingAccount, PHONE, resetTraining } from "./helpers/training.helper"

/**
 * THE LIVE SCREEN FOR A PROGRAM IN THE NEW FORMAT — Plans/program-builder.md,
 * Phase 5, on a phone.
 *
 * One program, started through the same route the app uses, with a day on
 * every weekday so the session under test never depends on which day the
 * suite happens to run. Each day has what Starscream has: a top set picked by
 * feel at an RPE, back-offs worked out from it, a range of sets, a choice of
 * lift, a choice of scheme, and a capped last set.
 *
 * Weeks run by the calendar from the program's first day, so each test picks
 * the first day that puts today in the week it is about.
 */

guardTrainingAccount()

const TODAY = new Date()
/** ISO weekday of today on the fixture account's clock, which is UTC. */
const WEEKDAY = ((TODAY.getUTCDay() + 6) % 7) + 1
const D = `d${WEEKDAY}`

/** The Monday `weeksAgo` weeks before this week's, as `YYYY-MM-DD` (UTC). */
function mondayWeeksAgo(weeksAgo: number): string {
  const monday = new Date(Date.UTC(TODAY.getUTCFullYear(), TODAY.getUTCMonth(), TODAY.getUTCDate() - (WEEKDAY - 1) - 7 * weeksAgo))
  return monday.toISOString().slice(0, 10)
}

function formatProgram() {
  const day = (w: number) => ({
    id: `d${w}`,
    label: `Day ${w}`,
    weekday: w,
    slots: [
      {
        id: `d${w}_bench`,
        lift: { lib: "lib_bench_press" },
        group: "A",
        sets: [
          { id: "top", kind: "top", count: 1, reps: { min: 2, max: 5 }, load: { from: "effort" }, effort: { rpe: 8.5 } },
          { id: "back", kind: "backoff", count: { min: 3, max: 5 }, reps: { min: 5, max: 10 }, load: { from: "set", group: "top", pct: { min: 0.7, max: 0.8 } } },
        ],
        weeks: [{ weeks: "12", set: "top", reps: { min: 1, max: 5 }, effort: { rpe: 9 } }],
        progression: { kind: "by-effort", group: "top" },
      },
      {
        id: `d${w}_squat`,
        lift: { name: "Back or Front Squat" },
        choices: [{ lib: "lib_back_squat" }, { lib: "lib_front_squat" }],
        sets: [
          { id: "top", kind: "top", count: 1, reps: { min: 2, max: 5 }, load: { from: "effort" }, effort: { rpe: 8.5 } },
          {
            id: "back",
            kind: "backoff",
            count: 3,
            reps: 10,
            options: [
              { count: 3, reps: 10 },
              { count: 10, reps: 3 },
            ],
            load: { from: "set", group: "top", pct: { min: 0.7, max: 0.9 } },
          },
        ],
        progression: { kind: "by-effort", group: "top" },
      },
      {
        id: `d${w}_press`,
        lift: { lib: "lib_ohp" },
        sets: [{ id: "work", kind: "working", count: { min: 4, max: 6 }, reps: { min: 5, max: 6 }, load: { from: "effort" }, effort: { rpe: 9, lastSetOnly: true, cap: true } }],
        progression: { kind: "by-effort", group: "work" },
      },
    ],
  })
  return {
    specVersion: 2,
    name: "Format check",
    unit: "kg",
    calendar: {
      days: "weekdays",
      weekCounting: "calendar",
      lengthWeeks: 12,
      atEnd: "finish",
      phases: [
        { label: "Base", weeks: "1-6" },
        { label: "Peak", weeks: "7-12" },
      ],
      deloadWeeks: "3",
      testWeeks: "12",
    },
    rounding: { stepKg: 2.5, mode: "nearest" },
    days: [1, 2, 3, 4, 5, 6, 7].map(day),
  }
}

type Page = import("@playwright/test").Page

/** Start the format-check program with today in `week`, and open the live workout. */
async function startInWeek(page: Page, week: number, { open = true } = {}) {
  await page.setViewportSize(PHONE)
  await page.goto(ROUTES.training)
  await resetTraining(page)
  const refused = await page.evaluate(
    async ({ spec, startedOn }) => {
      const res = await fetch("/api/programs/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId: "custom", level: "intermediate", unitSystem: "kg", spec, startedOn }),
      })
      return res.ok ? null : `${res.status} ${await res.text()}`
    },
    { spec: formatProgram(), startedOn: mondayWeeksAgo(week - 1) }
  )
  if (refused) throw new Error(`could not start the format-check program: ${refused}`)
  if (!open) return
  await page.reload({ waitUntil: "networkidle" })
  await page.getByTestId("start-workout").first().click()
  await page.waitForURL(`**${ROUTES.liveWorkout}`, { timeout: 20000 })
  await expect(page.getByTestId(`lift-${D}_bench`)).toBeVisible({ timeout: 20000 })
}

const lift = (page: Page, slot: string) => page.getByTestId(`lift-${D}_${slot}`)

test.describe("the live screen, for a program in the new format", () => {
  test("names the week, its phase and a deload week", { tag: ["@phone"] }, async ({ page }) => {
    await startInWeek(page, 3)
    await expect(page.getByTestId("live-week")).toHaveText("Week 3 of 12 · Base · deload week")
  })

  test("names a test week", { tag: ["@phone"] }, async ({ page }) => {
    await startInWeek(page, 12)
    await expect(page.getByTestId("live-week")).toHaveText("Week 12 of 12 · Peak · test week")
    // And week 12's own top set: 1–5 reps at RPE 9.
    await expect(lift(page, "bench").getByTestId("set-hint-Top")).toHaveText("by feel · RPE 9")
  })

  test("fills the back-off range the moment the top set is ticked — with no signal", { tag: ["@phone"] }, async ({ page, context }) => {
    test.setTimeout(120000)
    await startInWeek(page, 1)
    const bench = lift(page, "bench")
    await expect(bench.getByTestId("set-hint-Top")).toHaveText("by feel · RPE 8.5")
    await expect(bench.getByTestId("set-hint-2")).toHaveText("after the top set")

    await context.setOffline(true)
    try {
      await bench.getByLabel("Weight for set Top of Bench Press in kg").fill("105")
      await bench.getByLabel("Reps for set Top of Bench Press").fill("4")
      await bench.getByTestId("tick-Top").click()
      // mround(105 × 0.7, 2.5) = 72.5 and mround(105 × 0.8, 2.5) = 85, worked out on the phone.
      await expect(bench.getByTestId("set-hint-2")).toHaveText("72.5–85 kg")
      await expect(bench.getByLabel("Weight for set 2 of Bench Press in kg")).toHaveValue("72.5")
    } finally {
      await context.setOffline(false)
    }
    // And the top set reaches the server once the signal is back, with its slot and group.
    await page.waitForFunction(
      () => (JSON.parse(window.localStorage.getItem("live-workout-queue-v1") ?? "[]") as unknown[]).length === 0,
      undefined,
      { timeout: 60000 }
    )
    const top = await page.evaluate(async () => {
      const live = await (await fetch("/api/workouts/live")).json()
      return live.sets.find((s: { kind: string }) => s.kind === "top")
    })
    expect(top).toMatchObject({ weight: 105, reps: 4, slotId: `${D}_bench`, setGroupId: "top" })
  })

  test("adds sets up to the top of a range, then says the range is done", { tag: ["@phone"] }, async ({ page }) => {
    await startInWeek(page, 1)
    const bench = lift(page, "bench")
    await expect(bench.getByTestId("set-row-4")).toBeVisible()
    await expect(bench.getByTestId("set-row-5")).toHaveCount(0)
    await bench.getByTestId(`add-set-${D}_bench`).click()
    await bench.getByTestId(`add-set-${D}_bench`).click()
    await expect(bench.getByTestId("set-row-6")).toBeVisible()
    await expect(bench.getByTestId(`add-set-done-${D}_bench`)).toHaveText("All 5 sets are on the list.")
    await expect(bench.getByTestId(`add-set-${D}_bench`)).toHaveCount(0)
  })

  test("offers the scheme's options; 10 × 3 replaces 3 × 10", { tag: ["@phone"] }, async ({ page }) => {
    await startInWeek(page, 1)
    const squat = lift(page, "squat")
    await expect(squat.getByTestId("set-row-4")).toBeVisible()
    await expect(squat.getByTestId("set-row-5")).toHaveCount(0)
    await squat.getByLabel("10 sets of 3").click()
    await expect(squat.getByTestId("set-row-11")).toBeVisible()
    await expect(squat.getByLabel("Reps for set 11 of Back or Front Squat")).toHaveAttribute("placeholder", "3")
    // Kept on the workout: once the server holds the pick, a reload comes
    // back with ten triples.
    await expect
      .poll(async () =>
        page.evaluate(async (slot) => {
          const live = await (await fetch("/api/workouts/live")).json()
          return live.adjustments?.options?.[slot] ?? null
        }, `${D}_squat`)
      )
      .toBe(1)
    await page.reload()
    await expect(lift(page, "squat").getByTestId("set-row-11")).toBeVisible({ timeout: 20000 })
    await page.locator('[data-hydrated="true"]').waitFor({ timeout: 20000 })

    // Once a set of the lift is done the scheme is kept: switching would
    // renumber the rows under the sets already ticked.
    const again = lift(page, "squat")
    await again.getByLabel("Weight for set Top of Back or Front Squat in kg").fill("100")
    await again.getByLabel("Reps for set Top of Back or Front Squat").fill("3")
    await again.getByTestId("tick-Top").click()
    await expect(again.getByLabel("3 sets of 10")).toBeDisabled()
    await expect(again.getByTestId(`options-locked-${D}_squat`)).toHaveText("Kept for today: sets are done.")
  })

  test("a choice of lift: a set done as Front Squat is logged as Front Squat, on the slot's own numbers", { tag: ["@phone"] }, async ({ page }) => {
    await startInWeek(page, 1)
    const squat = lift(page, "squat")
    await squat.getByTestId(`choice-${D}_squat-1`).click()
    await expect(squat.getByTestId(`lift-name-${D}_squat`)).toHaveText("Front Squat")
    await squat.getByLabel("Weight for set Top of Front Squat in kg").fill("80")
    await squat.getByLabel("Reps for set Top of Front Squat").fill("3")
    await squat.getByTestId("tick-Top").click()
    await expect(squat.getByTestId("tick-Top")).toHaveAttribute("aria-pressed", "true")
    await expect
      .poll(async () =>
        page.evaluate(async () => {
          const live = await (await fetch("/api/workouts/live")).json()
          return live.sets.map((s: { exercise: string; exerciseId: string }) => `${s.exercise}|${s.exerciseId}`)
        })
      )
      .toEqual([`Front Squat|${D}_squat`])
  })

  test("says the cap on the last set, and only there", { tag: ["@phone"] }, async ({ page }) => {
    await startInWeek(page, 1)
    const press = lift(page, "press")
    await expect(press.getByTestId("set-hint-4")).toHaveText("by feel · ≤ RPE 9")
    await expect(press.getByTestId("set-hint-3")).toHaveText("by feel")
  })

  test("takes an RPE in half steps", { tag: ["@phone"] }, async ({ page }) => {
    await startInWeek(page, 1)
    const press = lift(page, "press")
    await press.getByTestId("set-menu-1").click()
    const slider = page.getByRole("slider")
    await slider.focus()
    // From 6, five half steps: 8.5.
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight")
    await expect(page.getByTestId("set-menu")).toContainText("RPE 8.5")
    await page.getByLabel("Close").click()
    await press.getByLabel("Weight for set 1 of Overhead Press in kg").fill("50")
    await press.getByLabel("Reps for set 1 of Overhead Press").fill("5")
    await press.getByTestId("tick-1").click()
    await expect
      .poll(async () =>
        page.evaluate(async () => {
          const live = await (await fetch("/api/workouts/live")).json()
          return live.sets.map((s: { rpe: number | null }) => s.rpe)
        })
      )
      .toEqual([8.5])
  })

  test("a finished program offers to run it again or pick another", { tag: ["@phone"] }, async ({ page }) => {
    await startInWeek(page, 13, { open: false })
    await page.reload({ waitUntil: "networkidle" })
    const done = page.getByTestId("program-complete")
    await expect(done).toBeVisible({ timeout: 20000 })
    await expect(done.getByRole("button", { name: "Run it again" })).toBeVisible()
    await expect(done.getByTestId("program-complete-next")).toHaveText("Pick another program")
    await expect(page.getByTestId("program-complete-retest")).toBeVisible()

    // Running it again starts week 1 today — by the calendar, not just the counter.
    await done.getByRole("button", { name: "Run it again" }).click()
    await expect(page.getByTestId("program-complete")).toHaveCount(0, { timeout: 20000 })
    await page.getByTestId("start-workout").first().click()
    await page.waitForURL(`**${ROUTES.liveWorkout}`, { timeout: 20000 })
    await expect(page.getByTestId("live-week")).toHaveText("Week 1 of 12 · Base")
  })
})

/**
 * OPENING THE WORKOUT WITH NO SIGNAL (Q21) — the phone locks between sets and
 * reloads in a basement.
 *
 * Like `vice-offline.spec.ts`, this SKIPS WITH A REASON when no service worker
 * controls the page: `OfflineShell` registers only in a production build, so
 * under `next dev` (local runs) there is nothing to test, and a pass there
 * would assert nothing. CI runs the browser tests on a production build. To
 * run it for real on this machine, build and start a production server
 * pointed at the test backend (playwright.config.ts, `PW_BASE_URL`) and run
 * this file against it.
 *
 * NOT ON WEBKIT, and the reason is Playwright's, not the page's: its WebKit
 * fails every navigation made while `setOffline` is on with "WebKit
 * encountered an internal error", service worker or not. Checked on
 * 2026-10-22 against a production build: the Black Box's own offline test
 * (`vice-offline.spec.ts`, shipped and passing on Chromium) fails the same way
 * there. So these run on Chromium — the desktop lane at a phone's size, and
 * the Pixel 7 lane — and the iPhone lane says why it skipped them.
 */
test.describe("the live workout, opened with no signal", () => {
  // The worker is the subject here; every other spec runs with it blocked
  // (playwright.config.ts says why).
  test.use({ serviceWorkers: "allow" })
  test.skip(
    ({ browserName }) => browserName === "webkit",
    "Playwright's WebKit fails any navigation while offline is emulated, with or without a service worker."
  )

  /** Is a service worker actually in charge of this page? */
  async function workerIsControlling(page: Page): Promise<boolean> {
    return page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return false
      const ready = navigator.serviceWorker.ready.then(() => true)
      const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 8000))
      return Promise.race([ready, timeout])
    })
  }

  /** Is the page stored (true) or gone from the store (false), within 15 s? */
  async function stored(page: Page, want: boolean): Promise<boolean> {
    return page.evaluate(
      async ({ path, want }) => {
        const deadline = Date.now() + 15000
        while (Date.now() < deadline) {
          const hit = Boolean(await caches.match(new Request(new URL(path, location.origin).href)))
          if (hit === want) return true
          await new Promise((r) => setTimeout(r, 250))
        }
        return false
      },
      { path: ROUTES.liveWorkout, want }
    )
  }

  const skipReason =
    "No service worker is controlling this page, so opening offline cannot be tested. " +
    "OfflineShell registers only in a production build — expected under `npm run dev`."

  test("reopens with every set on it: one saved with signal, one waiting for it", { tag: ["@phone"] }, async ({ page, context }) => {
    test.setTimeout(180000)
    await startInWeek(page, 1)
    test.skip(!(await workerIsControlling(page)), skipReason)
    // The worker stores the page as it was loaded: no sets yet.
    await page.reload()
    await page.locator('[data-hydrated="true"]').waitFor({ timeout: 20000 })
    expect(await stored(page, true), "the worker never stored the live page").toBe(true)

    // With signal: the top set reaches the server and leaves the queue.
    const bench = lift(page, "bench")
    await bench.getByLabel("Weight for set Top of Bench Press in kg").fill("100")
    await bench.getByLabel("Reps for set Top of Bench Press").fill("5")
    await bench.getByTestId("tick-Top").click()
    await expect
      .poll(async () => page.evaluate(async () => ((await (await fetch("/api/workouts/live")).json()).sets as unknown[]).length))
      .toBe(1)

    await context.setOffline(true)
    try {
      // With none: a back-off, held on the phone.
      await expect(bench.getByLabel("Weight for set 2 of Bench Press in kg")).toHaveValue("70")
      await bench.getByLabel("Reps for set 2 of Bench Press").fill("8")
      await bench.getByTestId("tick-2").click()
      await expect(page.getByText(/Not saved — no signal/i).first()).toBeVisible({ timeout: 20000 })

      // THE QUESTION: the phone reloads with no signal.
      await page.reload({ timeout: 30000 })
      // Drawn from the stored HTML first; the sets below are React's work.
      await page.locator('[data-hydrated="true"]').waitFor({ timeout: 30000 })
      const again = lift(page, "bench")
      await expect(again).toBeVisible({ timeout: 30000 })
      // The top set, saved after the page was stored, is still done…
      await expect(again.getByTestId("tick-Top")).toHaveAttribute("aria-pressed", "true", { timeout: 20000 })
      // …its back-offs are still worked out from it…
      await expect(again.getByTestId("set-hint-3")).toHaveText("70–80 kg")
      // …and the back-off ticked with no signal is back on screen.
      await expect(again.getByTestId("tick-2")).toHaveAttribute("aria-pressed", "true")
    } finally {
      await context.setOffline(false)
    }

    // Signal back: the held set lands once, beside the top set.
    await page.waitForFunction(
      () => (JSON.parse(window.localStorage.getItem("live-workout-queue-v1") ?? "[]") as unknown[]).length === 0,
      undefined,
      { timeout: 60000 }
    )
    const sets = await page.evaluate(async () => {
      const live = await (await fetch("/api/workouts/live")).json()
      return (live.sets as { kind: string; weight: number; reps: number }[]).map((s) => `${s.kind} ${s.weight}×${s.reps}`).sort()
    })
    expect(sets).toEqual(["backoff 70×8", "top 100×5"])
  })

  test("a workout that is over is not kept: its stored page is dropped", { tag: ["@phone"] }, async ({ page }) => {
    test.setTimeout(120000)
    await startInWeek(page, 1)
    test.skip(!(await workerIsControlling(page)), skipReason)
    await page.reload()
    await page.locator('[data-hydrated="true"]').waitFor({ timeout: 20000 })
    expect(await stored(page, true), "the worker never stored the live page").toBe(true)

    // Thrown away on another device: this phone never heard.
    const gone = await page.evaluate(async () => {
      const live = await (await fetch("/api/workouts/live")).json()
      return (await fetch(`/api/workouts/${live.id}`, { method: "DELETE" })).status
    })
    expect(gone).toBe(200)

    // The next time the page is asked for with signal, the server sends it
    // elsewhere — and the copy goes, so it cannot come back offline as open.
    await page.goto(ROUTES.liveWorkout)
    await page.waitForURL((url) => url.pathname !== ROUTES.liveWorkout, { timeout: 20000 })
    expect(await stored(page, false), "a finished workout's page was still stored").toBe(true)
  })
})
