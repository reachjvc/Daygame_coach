/**
 * WRITING UP A SESSION YOU ALREADY DID, END TO END.
 *
 * The two forms this replaces each had their own save path, and what a browser
 * has to prove is exactly what a unit test cannot: that the workout that comes
 * out the other side is DATED WHEN YOU SAID, not when you typed it, and that
 * the live screen it opens knows it is describing the past.
 *
 * The date is the whole point. A session written up on Thursday used to be
 * filed under Thursday, so a Tuesday workout was invisible on Tuesday and
 * Thursday claimed one that never happened.
 *
 * In the `training` project: it starts and deletes workouts on the shared
 * account, at 390px, one worker.
 */

import { test, expect, type Page } from "@playwright/test"
import { openTab } from "./helpers/trainingTabs"
import { seedFinishedWorkout } from "./helpers/seedWorkout"

test.describe.configure({ mode: "serial" })

/**
 * Nothing running, nothing open, one StrongLifts enrollment started NOW.
 *
 * IT CHECKS ITS OWN WORK. The first version ignored every response, and in the
 * full training run it left an enrollment from an earlier spec in place —
 * started days ago, so a session dated two days ago was legitimately allowed
 * and the refusal test failed with nothing to point at. A fixture that fails
 * silently makes the test that depends on it lie about what it found.
 */
async function reset(page: Page): Promise<void> {
  await page.goto("/programs")
  const out = await page.evaluate(async () => {
    const problems: string[] = []
    const check = async (res: Response, what: string) => {
      if (!res.ok) problems.push(`${what}: HTTP ${res.status}`)
      return res
    }

    const live = await (await fetch("/api/workouts/live")).json()
    if (live) await check(await fetch(`/api/workouts/${live.id}`, { method: "DELETE" }), "discard open workout")

    for (const e of await (await fetch("/api/programs/enrollments")).json()) {
      const detail = await (await fetch(`/api/programs/enrollments/${e.id}`)).json()
      for (const l of detail.logs ?? []) {
        await fetch(`/api/programs/enrollments/${e.id}/log/${l.id}`, { method: "DELETE" })
      }
      await fetch(`/api/programs/enrollments/${e.id}`, { method: "DELETE" })
      await check(
        await fetch(`/api/programs/enrollments/${e.id}?permanent=1`, { method: "DELETE" }),
        `delete enrollment ${e.id}`
      )
    }

    await check(
      await fetch("/api/programs/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId: "stronglifts-5x5", level: "beginner", unitSystem: "kg" }),
      }),
      "enrol"
    )

    // THE POSTCONDITION, not the requests. Exactly one program, and it began
    // moments ago — which is what makes "two days ago" backdated at all.
    const after = (await (await fetch("/api/programs/enrollments")).json()) as {
      id: string
      started_at: string
    }[]
    if (after.length !== 1) problems.push(`${after.length} enrollments after reset, expected 1`)
    const age = after[0] ? Date.now() - new Date(after[0].started_at).getTime() : Infinity
    if (age > 5 * 60_000) problems.push(`the enrollment is ${Math.round(age / 60_000)} min old`)
    return problems
  })
  // Throws rather than skipping: a failed fixture must fail the test, not hide
  // inside it as a wrong answer.
  expect(out, "reset left the account in the wrong state").toEqual([])
}

/** Two days ago at 18:00, as a `datetime-local` string. */
function twoDaysAgoAt18(): { local: string; day: string } {
  const d = new Date(Date.now() - 2 * 24 * 3600 * 1000)
  const p = (n: number) => String(n).padStart(2, "0")
  const day = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  return { local: `${day}T18:00`, day }
}

test.beforeEach(async ({ page }) => {
  test.setTimeout(180000)
  await page.setViewportSize({ width: 390, height: 900 })
  await reset(page)
})

test("History opens the live screen at the time you choose, and it knows it is the past", async ({
  page,
}) => {
  const { local, day } = twoDaysAgoAt18()

  await page.goto("/programs", { waitUntil: "networkidle" })
  await openTab(page, "history")

  const openDialog = page.getByTestId("log-past-workout")
  await expect(openDialog).toBeVisible()
  await openDialog.click()

  await page.getByLabel("When the workout was").fill(local)
  /**
   * AN EMPTY WORKOUT, not a program session, and that is not a shortcut.
   *
   * A program session dated before the enrollment began is refused — see the
   * next test — and nothing in the app can backdate an enrollment, so a
   * program created by this spec cannot own a session from two days ago. The
   * past-mode behaviour being checked here is the live screen's, and it does
   * not depend on which door opened the workout.
   */
  await page.getByRole("button", { name: "Empty workout" }).click()
  await page.getByTestId("open-past-workout").click()

  // The live screen, not a form.
  await page.waitForURL(/\/programs\/live/)

  // PAST MODE: "since <day>", never a climbing minute count.
  await expect(page.getByText(/^since /i)).toBeVisible()
  await expect(page.getByText(/^\d+ min$/)).toHaveCount(0)

  // A lift you did two days ago, ticked now: no 90-second timer.
  await page.getByTestId("add-lift").click()
  await page.getByTestId("add-lift-search").fill("ZZPast Lift")
  await page.getByTestId("add-lift-own").click()
  // An invented lift starts blank, and the tick stays disabled until there are
  // numbers to save — the screen refusing to record a set nobody described.
  await page.getByLabel("Weight for set 1 in kg").fill("60")
  await page.getByLabel("Reps for set 1").fill("5")
  await page.getByTestId("tick-1").first().click()
  await expect(page.getByTestId("rest-bar")).toHaveCount(0)

  // The database has it dated two days ago, not today.
  const started = await page.evaluate(async () => {
    const live = await (await fetch("/api/workouts/live")).json()
    return live?.startedAt as string | undefined
  })
  expect(started).toBeTruthy()
  expect(new Date(started!).toISOString().slice(0, 10)).toBe(day)
})

test("a program session from before the program started is refused, in the dialog", async ({
  page,
}) => {
  const { local } = twoDaysAgoAt18()

  await page.goto("/programs", { waitUntil: "networkidle" })
  await openTab(page, "history")
  await page.getByTestId("log-past-workout").click()
  await page.getByLabel("When the workout was").fill(local)
  await page.getByRole("button", { name: /^Workout A/ }).click()
  await page.getByTestId("open-past-workout").click()

  // Advancing a program on a session from before it existed would move weights
  // for work it never prescribed. The refusal is the server's own sentence,
  // shown where the person is looking, and the button comes back.
  await expect(page.getByRole("alert")).toContainText("before you started this program")
  await expect(page).toHaveURL(/\/programs(?!\/live)/)
  await expect(page.getByTestId("open-past-workout")).toBeEnabled()
})

test("a session dated a minute ago opens LIVE, not in past mode", async ({ page }) => {
  /**
   * The six-hour line, from the other side. An empty workout, because a
   * program session's date is bounded by when the enrollment began and nothing
   * in the app can backdate one — the refusal above is that rule, and this
   * test is about the live screen, which does not care which door opened it.
   *
   * The bulk tick is past-mode only and needs a prescription, so a program is
   * the one thing that could prove it in a browser. It is unit-tested instead,
   * in tests/unit/programs/liveScreenPastMode.test.tsx, and revert-proved.
   */
  await page.goto("/programs", { waitUntil: "networkidle" })
  await openTab(page, "history")
  await page.getByTestId("log-past-workout").click()

  /**
   * "Now" IN THE ACCOUNT'S ZONE, taken from the box's own ceiling.
   *
   * Built from the machine's clock instead, this said 19:35 while the account
   * reads that wall-clock in a zone two hours behind, so the server refused it
   * as being in the future — the dialog working exactly as it should, and a
   * test that had not noticed whose clock it was using.
   */
  const when = page.getByLabel("When the workout was")
  const nowThere = await when.getAttribute("max")
  await when.fill(nowThere!)
  await page.getByRole("button", { name: "Empty workout" }).click()
  await page.getByTestId("open-past-workout").click()
  await page.waitForURL(/\/programs\/live/)

  /**
   * A RUNNING CLOCK, and no bulk tick anywhere on the screen.
   *
   * `mm:ss`, not "N min": the header counted whole minutes until Phase 6
   * (`01ea8765`) — it read "0 min" for the first sixty seconds and then jumped
   * to "1 min", a clock ticking every second that only ever showed one of them.
   * `tests/unit/programs/liveScreenPastMode.test.tsx` was updated with the
   * change and this assertion was not, so it sat on the old wording until the
   * whole `training` project was run again. The two now agree.
   */
  await expect(page.getByText(/^\d+:\d{2}$/)).toBeVisible()
  await expect(page.getByText(/^since /i)).toHaveCount(0)
  await expect(page.locator('[data-testid^="tick-all-"]')).toHaveCount(0)
})

test("a workout already open blocks the dialog and points at it", async ({ page }) => {
  await page.goto("/programs", { waitUntil: "networkidle" })
  await page.evaluate(async () => {
    const [e] = await (await fetch("/api/programs/enrollments")).json()
    await fetch("/api/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrollmentId: e.id, dayId: "A", clientKey: `w-${Date.now()}` }),
    })
  })
  await page.reload({ waitUntil: "networkidle" })
  await openTab(page, "history")
  await page.getByTestId("log-past-workout").click()

  // Only one workout may be open, so this has to say so rather than fail later.
  await expect(page.getByTestId("past-blocked-by-live")).toBeVisible()
  await expect(page.getByTestId("open-past-workout")).toHaveCount(0)
})

test("a finished program session lands in History and moves the program on", async ({ page }) => {
  await page.goto("/programs", { waitUntil: "networkidle" })

  const before = await page.evaluate(async () => {
    const [e] = await (await fetch("/api/programs/enrollments")).json()
    const detail = await (await fetch(`/api/programs/enrollments/${e.id}`)).json()
    return { id: e.id as string, count: detail.enrollment.cursor.sessionCount as number }
  })

  // Through the dialog's own door: History → Log a past workout → today's
  // session. The ceiling is "now" in the ACCOUNT's zone, which is the only
  // clock that gets to decide what day this is.
  await openTab(page, "history")
  await page.getByTestId("log-past-workout").click()
  const when = page.getByLabel("When the workout was")
  await when.fill((await when.getAttribute("max"))!)
  await page.getByRole("button", { name: /^Workout A/ }).click()
  await page.getByTestId("open-past-workout").click()
  await page.waitForURL(/\/programs\/live/)

  // One real set, then finish it the way a person does.
  await page.getByTestId("tick-1").first().click()
  // The id BEFORE finishing: "the newest row with sets" could be any earlier
  // spec's, and an assertion on the wrong row is not an assertion.
  const workoutId = await page.evaluate(
    async () => ((await (await fetch("/api/workouts/live")).json()) as { id: string }).id
  )
  await page.getByTestId("finish-workout").click()
  await page.getByRole("button", { name: /save this workout/i }).click()
  // The finish is a round trip that advances the program in the same
  // transaction. Reading before the summary appears reads the program as it
  // was, which is a race the assertion cannot tell from a real failure.
  await expect(page.getByTestId("workout-summary")).toBeVisible({ timeout: 30000 })

  const after = await page.evaluate(
    async ([enrollmentId, logId]: string[]) => {
      const detail = await (await fetch(`/api/programs/enrollments/${enrollmentId}`)).json()
      const logs = (await (
        await fetch("/api/health/workout?days=3&include=sets")
      ).json()) as { id: string; started_at: string | null; logged_at: string }[]
      const mine = logs.find((l) => l.id === logId)
      return {
        count: detail.enrollment.cursor.sessionCount as number,
        found: Boolean(mine),
        startedAt: mine?.started_at ?? null,
        loggedAt: mine?.logged_at ?? null,
      }
    },
    [before.id, workoutId]
  )

  expect(after.found, "the workout just finished is in History").toBe(true)

  expect(after.count, "the program moved on by exactly one").toBe(before.count + 1)
  // `workout_logs_logged_is_start` requires these two to be equal, and the day
  // a session is FILED under is logged_at. A session filed under the day it
  // was typed was the whole fault this phase set out to fix.
  expect(after.startedAt).toBeTruthy()
  expect(new Date(after.loggedAt!).toISOString()).toBe(new Date(after.startedAt!).toISOString())
})

test("a run is stored as a run, reads as one in History, and counts as one", async ({ page }) => {
  await page.goto("/programs", { waitUntil: "networkidle" })

  // Seeded rather than walked: the dialog's run path needs an endurance
  // enrollment, and the subject here is what the FINISH writes and what the
  // rest of the app then reads.
  const id = await seedFinishedWorkout(page, {
    startedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
    endedAt: new Date(Date.now() - 2 * 3600_000 + 31 * 60_000).toISOString(),
    sessionType: "running",
    sets: [],
  })

  const stored = await page.evaluate(async (logId: string) => {
    await fetch(`/api/workouts/${logId}/finish`, { method: "POST" }).catch(() => null)
    const logs = (await (await fetch("/api/health/workout?days=3")).json()) as {
      id: string
      session_type: string
      duration_min: number | null
    }[]
    const mine = logs.find((l) => l.id === logId)
    return { type: mine?.session_type, minutes: mine?.duration_min }
  }, id)

  // A run recorded through the old loose path was stored as "weights", so it
  // appeared in no running total anywhere.
  expect(stored.type).toBe("running")
  expect(stored.minutes, "the server derives the minutes from the two instants").toBe(31)

  /**
   * And History says what it WAS, rather than printing the raw column value.
   *
   * Asserted on the row itself, and in two halves. It used to look for
   * "Run · 31 min" across the whole list, which only matched because the row
   * printed the duration twice — once in the sentence and once in the numbers
   * column beside it. The sentence leaves the minutes to that column now, so
   * the two facts are checked where each one lives.
   */
  await page.reload({ waitUntil: "networkidle" })
  await openTab(page, "history")
  const row = page.getByTestId(`history-row-${id}`)
  await expect(row).toContainText("Run")
  await expect(row, "the raw column value, lower-cased").not.toContainText("running")
  await expect(row).toContainText("31 min")
  await expect(row, "a run has no sets, and that is not a failure").not.toContainText(
    "No sets recorded"
  )

  await page.evaluate(async (logId: string) => {
    await fetch(`/api/health/workout?id=${logId}`, { method: "DELETE" })
  }, id)
})

test("a day row in the editor reads its whole name at 390px, behind one options button", async ({
  page,
}) => {
  /**
   * WALK-07, MEASURED RATHER THAN LOOKED AT.
   *
   * The row used to be a text input committing a rename per keystroke, beside
   * FOUR 44-px icon buttons. At 390 px the name got about 96 px of that row, so
   * "Workout A" rendered as "Wor…" — the one thing the row exists to say was the
   * thing that got clipped. jsdom has no layout, so the unit suite can prove the
   * name is in the markup and cannot prove it is readable; this is the half that
   * needs a browser.
   *
   * On the catalogue's detail screen, which is where the editor now lives: the
   * week can be shaped BEFORE it is started, which it could not be until
   * Phase 8.
   */
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/programs?view=programs", { waitUntil: "networkidle" })
  await page.getByRole("button", { name: /StrongLifts/i }).first().click()

  const row = page.locator('[data-testid^="editor-day-"]').first()
  await expect(row).toBeVisible()
  const name = row.locator("span").first()
  await expect(name).toHaveText(/\S/)

  const clipped = await name.evaluate((el) => el.scrollWidth > el.clientWidth)
  expect(clipped, `"${await name.textContent()}" is clipped at 390px`).toBe(false)

  // ONE options button on the row, and a whole fingertip of it.
  const menus = row.locator("xpath=..").getByRole("button", { name: /^Options for / })
  await expect(menus).toHaveCount(1)
  const box = await menus.first().boundingBox()
  expect(box, "premise: the options button must be measurable").toBeTruthy()
  // Rounded: a box is measured in floats, and `size-11` has been seen at
  // 43.99993896484375 px depending on where it lands on the sub-pixel grid.
  expect(Math.round(box!.width)).toBeGreaterThanOrEqual(44)
  expect(Math.round(box!.height)).toBeGreaterThanOrEqual(44)

  /**
   * AND THE ONE IRREVERSIBLE CONTROL IS STILL REACHABLE. Mounting an editor on
   * this screen made the page taller than the viewport, and the bottom tab bar
   * is fixed over the last 65 px of it.
   */
  const start = page.getByTestId("start-program")
  await start.scrollIntoViewIfNeeded()
  const startBox = await start.boundingBox()
  const barBox = await page.getByTestId("mobile-tab-bar").boundingBox()
  expect(startBox, "premise: Start must be measurable").toBeTruthy()
  expect(barBox, "premise: the bar must be measurable").toBeTruthy()
  expect(
    startBox!.y + startBox!.height,
    "Start is underneath the bottom tab bar"
  ).toBeLessThanOrEqual(barBox!.y)
})

test("the bottom bar is on /programs, and the column does not shrink on the way in", async ({
  page,
}) => {
  /**
   * "Training" is one of the five tabs in the bottom bar, and it was the one
   * destination in the app that rendered no bar — so the way back out vanished
   * the moment you used it. The live screen is the deliberate exception:
   * `RestBar` owns that bottom edge.
   */
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/programs", { waitUntil: "networkidle" })

  await expect(page.getByTestId("mobile-tab-bar")).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Training" }).first(),
    "and it knows you are already here"
  ).toHaveAttribute("aria-current", "page")

  // THE WIDTH DOES NOT JUMP. Training was max-w-3xl and the workout screen
  // max-w-2xl, so the column narrowed again the moment you pressed Start.
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto("/programs", { waitUntil: "networkidle" })
  const training = await page.getByTestId("training-screen").boundingBox()

  await page.evaluate(async () => {
    const live = await (await fetch("/api/workouts/live")).json()
    if (live) await fetch(`/api/workouts/${live.id}`, { method: "DELETE" })
  })
  await page.goto("/programs", { waitUntil: "networkidle" })
  await page.getByTestId("start-loose-workout").click()
  await page.waitForURL(/\/programs\/live/)

  const liveCol = await page.getByTestId("live-column").boundingBox()
  expect(training, "premise: both columns must be measurable").toBeTruthy()
  expect(liveCol).toBeTruthy()
  expect(Math.abs(training!.width - liveCol!.width)).toBeLessThanOrEqual(2)

  // And the bar is not on the live screen, where it would sit over the rest
  // clock. By its own testid, not by a link named "Training" — the live screen
  // has one of those, going back to /programs, and it is not the bar.
  await expect(page.getByTestId("mobile-tab-bar")).toHaveCount(0)
})

test("'See today's workout' goes to a receipt, not a 404", async ({ page }) => {
  /**
   * The Tracking card's done-today state pushes /programs/workout/<id>. That
   * route had no page at all, so the honest alternative to a second Start
   * button was a dead end — worse than no button.
   */
  await page.goto("/programs", { waitUntil: "networkidle" })

  const id = await seedFinishedWorkout(page, {
    startedAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
    endedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
    sets: [
      { exercise: "ZZReceipt Squat", weightKg: 100, reps: 5, setNumber: 1 },
      { exercise: "ZZReceipt Squat", weightKg: 100, reps: 5, setNumber: 2 },
    ],
  })

  const res = await page.goto(`/programs/workout/${id}`, { waitUntil: "networkidle" })
  expect(res?.status(), "the receipt route must exist").toBeLessThan(400)
  await expect(page.getByTestId("workout-receipt")).toBeVisible()

  // The figures written when it was finished: 60 minutes, 2 working sets.
  await expect(page.getByTestId("workout-receipt")).toContainText("60")
  await expect(page.getByTestId("workout-receipt")).toContainText("2")

  // Somebody else's workout is not yours to read.
  const missing = await page.goto("/programs/workout/00000000-0000-0000-0000-000000000000", {
    waitUntil: "networkidle",
  })
  expect(missing?.status()).toBe(404)

  await page.evaluate(async (logId: string) => {
    await fetch(`/api/health/workout?id=${logId}`, { method: "DELETE" })
  }, id)
})

test("the session card is today's session, drawn from the server's answer", async ({ page }) => {
  /**
   * The card used to decide for itself whether the open workout was stale and
   * name its day with the PHONE's clock, while the Tracking card decided the
   * same things on the server. Two doors into training, two answers.
   */
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/programs", { waitUntil: "networkidle" })

  const card = page.getByTestId("today-card")
  await expect(card).toBeVisible()

  // The week lives inside the card now, seven cells, one marked today.
  const strip = card.getByTestId("week-strip")
  await expect(strip).toBeVisible()
  await expect(strip.locator('[data-testid^="week-day-"]')).toHaveCount(7)
  await expect(strip.locator('[data-today="1"]')).toHaveCount(1)

  // Exactly one button that starts something.
  await expect(card.getByTestId("start-workout")).toHaveCount(1)
  await expect(card.getByTestId("resume-workout")).toHaveCount(0)

  // The day chips are behind a tap — seven of them permanently on screen were
  // the widest thing on the card and the least used.
  await expect(card.getByRole("button", { name: /^Workout A/ })).toHaveCount(0)
  await card.getByTestId("change-day").click()
  await expect(card.getByRole("button", { name: /^Workout A/ })).toBeVisible()

  // Start it, and the card reads Resume on the way back.
  await card.getByTestId("change-day").click()
  await card.getByTestId("start-workout").click()
  await page.waitForURL(/\/programs\/live/)
  await page.goto("/programs", { waitUntil: "networkidle" })

  await expect(card.getByTestId("resume-workout")).toBeVisible()
  await expect(card.getByTestId("start-workout")).toHaveCount(0)

  await page.evaluate(async () => {
    const live = await (await fetch("/api/workouts/live")).json()
    if (live) await fetch(`/api/workouts/${live.id}`, { method: "DELETE" })
  })
})

test("every program control is behind the ⋮, and a refusal stays on the sheet", async ({ page }) => {
  /**
   * Four buttons — Change, Skip, Reset, End — sat in a wrapping row under
   * today's session, on the screen you open to train. End is destructive and
   * was a thumb-width from the rest, and all four asked through the browser's
   * own confirm() box.
   */
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/programs", { waitUntil: "networkidle" })

  // Not on the training screen any more.
  await expect(page.getByRole("button", { name: /^End program$/ })).toHaveCount(0)

  await page.getByTestId("program-menu").click()
  const sheet = page.getByTestId("program-sheet")
  await expect(sheet).toBeVisible()

  /**
   * 44px is the fingertip minimum. Measured heights come back as
   * 43.99993896484375 for a `min-h-11` row — the same 44px, lost to subpixel
   * rounding — so the comparison allows a hundredth of a pixel and not a
   * hair more. The fault this guards against was real and much larger: the
   * nav bar's rows were 43.75px on an iPhone 14, a quarter-pixel short.
   */
  const TAP_TARGET_PX = 43.99
  for (const row of ["sheet-reset", "sheet-all", "sheet-end"]) {
    const box = await sheet.getByTestId(row).boundingBox()
    expect(box, row).toBeTruthy()
    expect(box!.height, `${row} is ${box!.height}px`).toBeGreaterThanOrEqual(TAP_TARGET_PX)
  }

  // End asks first, and says what survives.
  await sheet.getByTestId("sheet-end").click()
  await expect(page.getByText(/everything you logged is kept/i)).toBeVisible()

  // A refusal keeps you here. Mocked, because the only real way to make the
  // server refuse is to leave a workout open, which other tests need clean.
  await page.route("**/api/programs/enrollments/*", async (route) => {
    if (route.request().method() === "DELETE") {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ error: "Finish or throw away the workout you have open first" }),
      })
      return
    }
    await route.continue()
  })

  await page.getByTestId("sheet-confirm").click()
  await expect(page.getByTestId("sheet-failed")).toContainText("Finish or throw away")
  await expect(page).toHaveURL(/\/programs(?!\?view=programs)/)
  // And the program is still there, still prescribing.
  await page.unroute("**/api/programs/enrollments/*")
  await page.keyboard.press("Escape")
  await page.keyboard.press("Escape")
  await expect(page.getByTestId("today-card")).toBeVisible()
})

test("'Change this program' opens the editor in one tap", async ({ page }) => {
  /**
   * It took two taps on two buttons with the SAME WORDS: the menu row mounted
   * the component, and the component drew its own second "Change this
   * program" that actually opened it. The first tap looked like it failed.
   */
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/programs", { waitUntil: "networkidle" })

  await page.getByTestId("program-menu").click()
  await expect(page.getByText("Change this program")).toHaveCount(1)
  await page.getByTestId("sheet-edit").click()

  // Open, on the first tap, and nothing on screen repeats the words that
  // brought you here.
  await expect(page.getByRole("button", { name: /save changes/i })).toBeVisible()
  await expect(page.getByRole("button", { name: /change this program/i })).toHaveCount(0)

  // And it is a place, so the address says so and Back returns to the session.
  await expect(page).toHaveURL(/view=edit/)
  await page.getByRole("button", { name: /^cancel$/i }).click()
  await expect(page.getByTestId("today-card")).toBeVisible()
})

test("every program list is rows you can reach with a keyboard", async ({ page }) => {
  /**
   * The running list was a `Card` with an `onClick` — a div. A keyboard
   * cannot tab to it and a screen reader does not announce it as something
   * you can do, on the list whose whole purpose is choosing one.
   */
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/programs?view=programs", { waitUntil: "networkidle" })

  // The catalogue is rows, not thirteen "View" buttons.
  await expect(page.getByRole("button", { name: /^view/i })).toHaveCount(0)
  const row = page.getByTestId("catalog-stronglifts-5x5")
  await expect(row).toBeVisible()

  // A real control: focusable, and reachable by keyboard.
  await row.focus()
  await expect(row).toBeFocused()
  const box = await row.boundingBox()
  expect(box!.height, `the row is ${box!.height}px`).toBeGreaterThanOrEqual(43.99)

  // And it opens the program rather than needing a button inside it.
  await row.press("Enter")
  await expect(page).toHaveURL(/catalog=stronglifts-5x5/)
})

test("today's session survives an action that re-reads it", async ({ page }) => {
  /**
   * The card was replaced by "Loading session…" on ANY re-read, not just the
   * first. Skip, Reset, changing a weekday and writing up a workout all
   * refresh — so each one made today's session vanish and come back with its
   * day picker shut and the page scrolled elsewhere.
   */
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/programs", { waitUntil: "networkidle" })

  const card = page.getByTestId("today-card")
  await expect(card).toBeVisible()

  // Open the day picker, then do something that re-reads the program.
  await card.getByTestId("change-day").click()
  await expect(card.getByRole("button", { name: /^Workout B/ })).toBeVisible()

  await page.getByTestId("program-menu").click()
  await page.getByTestId("sheet-reset").click()
  await page.getByTestId("sheet-confirm").click()

  // The card never went away: it is the same element, still on screen.
  await expect(card).toBeVisible()
  await expect(page.getByText(/loading session/i)).toHaveCount(0)
})
