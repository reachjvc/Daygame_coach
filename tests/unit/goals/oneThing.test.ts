/**
 * THE ONE THING — the tests named in docs/plans/one-thing.md before the code.
 *
 * AT2 is the one that would have caught the fault in the first design: a
 * countdown computed on the database's clock instead of the user's. It runs the
 * same instant through three timezones and across a daylight-saving boundary.
 *
 * The cases that read the one thing out of its old rows (`life_chapters`,
 * `life_answers`) and wrote it back went with those tables in Phase 7 of
 * Plans/life-plan-rebuild.md; the season holds it now (seasonService.test.ts).
 */

import { describe, it, expect, afterEach, vi } from "vitest"
import {
  daysBetween,
  addDays,
  defaultDueOn,
  DEFAULT_HORIZON_DAYS,
  dueOnProblem,
  isRealDate,
  oneThingCountdown,
  oneThingPrompt,
  oneThingStage,
  nextDueOn,
  runningSince,
  MAX_HORIZON_YEARS,
  ENDING_SOON_DAYS,
  type OneThing,
} from "@/src/goals/oneThingService"

afterEach(() => {
  vi.useRealTimers()
})

const at = (iso: string) => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(iso))
}

/** A OneThing as the reader would build it, for the pure-rule tests. */
const one = (over: Partial<OneThing> = {}): OneThing => ({
  id: "r", chapterId: "ch-1", body: "Quit weed",
  answeredAt: "2026-08-01T09:00:00Z", startedOn: "2026-08-01", dueOn: "2026-12-08",
  daysLeft: 97, lapsed: false, wordings: 1, extended: false,
  ...over,
})

// ── AT2 ────────────────────────────────────────────────────────────────────
/**
 * The countdown is the fault the first design would have shipped: a date
 * computed on the database's clock instead of the person's. It now reads the
 * CHAPTER's deadline rather than the row's, which is the whole change, so these
 * run the same instant through three timezones and a daylight-saving boundary.
 */
describe("AT2 — the countdown runs on the user's calendar", () => {
  it("counts calendar days across a daylight-saving change, not 24-hour blocks", () => {
    // Europe puts the clocks back on 2026-10-25. Ninety 24-hour blocks from
    // 1 Aug land an hour short and quietly move the date; calendar days do not.
    expect(daysBetween("2026-08-01", "2026-10-30")).toBe(90)
    expect(addDays("2026-08-01", 90)).toBe("2026-10-30")
  })

  it("defaults the deadline to 90 days out in the user's timezone", () => {
    at("2026-08-01T23:30:00Z")
    expect(DEFAULT_HORIZON_DAYS).toBe(90)
    expect(defaultDueOn("Europe/Copenhagen")).toBe("2026-10-31")
    expect(defaultDueOn("America/Los_Angeles")).toBe("2026-10-30")
  })
})

// ── AT8 ────────────────────────────────────────────────────────────────────
/**
 * A DEADLINE THAT IS A REAL DAY, AND STILL AHEAD.
 *
 * `/^\d{4}-\d{2}-\d{2}$/` was the whole check. It says yes to the 45th of
 * month 13 — which reached Postgres, failed there, and came back to the person
 * as "That did not save" — and yes to last Tuesday, so a one thing written this
 * morning could announce on the same screen that it had already run its course.
 */
describe("AT8 — the deadline has to be a day that exists, and one still ahead", () => {
  const TODAY = "2026-09-02"

  it("refuses a date that is not on the calendar", () => {
    expect(isRealDate("2026-13-45")).toBe(false)
    expect(isRealDate("2026-02-30")).toBe(false)
    expect(isRealDate("not-a-date")).toBe(false)
    expect(dueOnProblem("2026-13-45", TODAY)).toMatch(/not a date on the calendar/)
  })

  it("accepts the real end of a real February", () => {
    expect(isRealDate("2028-02-29")).toBe(true)
    expect(isRealDate("2027-02-29")).toBe(false)
  })

  it("refuses a deadline that has already been", () => {
    expect(dueOnProblem("2026-09-01", TODAY)).toMatch(/already been/)
  })

  it("allows today itself — a one thing may run out this evening", () => {
    expect(dueOnProblem(TODAY, TODAY)).toBeNull()
  })

  it("refuses a deadline past the horizon, so a mistyped year cannot be saved", () => {
    expect(dueOnProblem("9999-01-01", TODAY)).toMatch(/season, not a decade/)
    expect(dueOnProblem(addDays(TODAY, MAX_HORIZON_YEARS * 365), TODAY)).toBeNull()
  })

  it("passes the default the app offers", () => {
    expect(dueOnProblem(defaultDueOn("Europe/Copenhagen"), "2026-09-02")).toBeNull()
  })
})

// ── AT9 ────────────────────────────────────────────────────────────────────
/**
 * ASKING FOR THE NEXT ONE AS THE DATE COMES UP.
 *
 * One rule, in one place, because the tracking header and the step both draw it
 * and two wordings of one fact is how they end up disagreeing on the same day.
 * Silent while there is road left: a prompt that is always on is not a prompt.
 */
describe("AT9 — the countdown, and when it starts asking", () => {
  /** Shorthand over the shared factory: a one thing with N days left. */
  const inDays = (daysLeft: number) =>
    one({ dueOn: addDays("2026-09-02", daysLeft), daysLeft, lapsed: daysLeft < 0 })

  it("says nothing while there is road left", () => {
    expect(oneThingStage(inDays(60))).toBe("running")
    expect(oneThingPrompt(inDays(60))).toBeNull()
  })

  it("starts asking a fortnight out", () => {
    expect(oneThingStage(inDays(ENDING_SOON_DAYS + 1))).toBe("running")
    expect(oneThingStage(inDays(ENDING_SOON_DAYS))).toBe("ending")
    expect(oneThingPrompt(inDays(ENDING_SOON_DAYS))).toMatch(/what comes after/)
  })

  it("asks outright once it has run out", () => {
    expect(oneThingStage(inDays(-1))).toBe("lapsed")
    expect(oneThingPrompt(inDays(-1))).toMatch(/Write the one thing for the next one/)
  })

  it("says nothing at all when nothing has been written", () => {
    expect(oneThingStage(null)).toBe("none")
    expect(oneThingPrompt(null)).toBeNull()
    expect(oneThingCountdown(null)).toBe("")
  })

  /**
   * THE DAY ITSELF, EVERYWHERE IT IS DRAWN. "120 days left" is not something
   * anybody can put in a calendar, and the day it names is the day they typed
   * on the form.
   */
  it("carries the date, not only the number of sleeps", () => {
    // Matched loosely on the month only: Node abbreviates September as "Sept"
    // or "Sep" depending on which ICU data it was built with, and a test that
    // pins that is a test that fails on somebody else's machine for no reason.
    expect(oneThingCountdown(inDays(120))).toBe("120 days left, until 31 Dec 2026")
    expect(oneThingCountdown(inDays(1))).toMatch(/^1 day left, until 3 Sept? 2026$/)
    expect(oneThingCountdown(inDays(0))).toMatch(/^Last day — it runs out today, 2 Sept? 2026$/)
    expect(oneThingCountdown(inDays(-3))).toBe("Ran out 30 Aug 2026, 3 days ago — name the next one")
  })
})

// ── AT10 ───────────────────────────────────────────────────────────────────
/**
 * THE DEADLINE A FORM OPENS ON.
 *
 * Found in review, before it shipped: the picker followed the saved deadline,
 * which is right until the day it goes past. After that the page asks for the
 * next one thing while the form holds a date that has already been — the server
 * refuses it, correctly, and the person is left with a refusal and no way out
 * unless they spot the date box themselves.
 */
describe("AT10 — a run-out deadline is not the default for the next one", () => {

  it("keeps the saved deadline while there is road left", () => {
    expect(nextDueOn(one(), "2027-06-01")).toBe("2026-12-08")
  })

  it("offers the fresh one once it has run out", () => {
    expect(nextDueOn(one({ dueOn: "2026-01-01", daysLeft: -244, lapsed: true }), "2027-06-01")).toBe("2027-06-01")
  })

  it("offers the fresh one when nothing has ever been written", () => {
    expect(nextDueOn(null, "2027-06-01")).toBe("2027-06-01")
  })

  it("keeps the last day itself, which is still a day that can be saved", () => {
    expect(nextDueOn(one({ daysLeft: 0 }), "2027-06-01")).toBe("2026-12-08")
  })
})

// ── AT13 ───────────────────────────────────────────────────────────────────
/**
 * "RUNNING SINCE" — the line that proves the clock was not restarted.
 *
 * Silent on a one thing nobody has touched, because there is nothing to
 * reassure anybody about yet.
 */
describe("AT13 — how long you have been on this", () => {
  it("says nothing on a one thing written once and never changed", () => {
    expect(runningSince(one({ wordings: 1, extended: false }))).toBeNull()
  })

  it("says it once the wording has been changed", () => {
    expect(runningSince(one({ wordings: 2, startedOn: "2026-08-01" }))).toMatch(/Running since 1 Aug 2026/)
  })

  it("says it once the deadline has been moved", () => {
    expect(runningSince(one({ wordings: 1, extended: true, startedOn: "2026-08-01" }))).toMatch(/Running since 1 Aug 2026/)
  })

  it("says nothing when there is nothing", () => {
    expect(runningSince(null)).toBeNull()
  })
})
