// @vitest-environment node
/**
 * "TUE'S WORKOUT" NAMED A DAY WITHOUT SAYING WHICH ONE.
 *
 * The receipt page is reached two ways: from the card that says you trained
 * today, and from History, which lists every workout there has ever been. The
 * heading was `weekdayNameIn(startedAt)` for both — so a session from March and
 * one from last week both read "Tue's workout", and the delete dialog lower
 * down the same page said "Delete the workout from Tue, Aug 24?". The page
 * disagreed with itself about which workout you were looking at.
 *
 * `today` IS A PARAMETER. Taking it from the running process's clock is the
 * mistake `architecture.test.ts` bans by shape: on the server that clock is
 * UTC, so a Copenhagen lifter's 00:30 Tuesday session would be headed
 * "Yesterday's workout" by the very function meant to name the day.
 *
 * ASSERTED BY BUCKET, NOT BY SPELLING — and the reason has changed since this
 * was written. It used to be that `dateKeyLabel` took the runtime's locale, so
 * "Sun, Sep 20" was en-US and something else anywhere else. It defaults to
 * `DISPLAY_LOCALE` now, so the spelling IS fixed.
 *
 * The bucket matching stays anyway, because it is the better test: what is
 * under test is WHICH shape the heading chose — today, yesterday, a weekday,
 * a date, a date with a year — and pinning the exact string would make every
 * one of these fail the day somebody changes `DISPLAY_LOCALE`, for a reason
 * that has nothing to do with the logic. A reviewer caught the stale
 * reasoning; a comment that argues from a condition that no longer holds is
 * how the next person justifies the wrong change.
 */

import { describe, expect, test } from "vitest"
import { receiptHeading } from "@/src/programs/programsService"

/** Sunday 27 September 2026, in the account's own calendar. */
const TODAY = "2026-09-27"

describe("receiptHeading", () => {
  test("says today and yesterday in the words people use for them", () => {
    expect(receiptHeading(TODAY, TODAY)).toBe("Today's workout")
    expect(receiptHeading("2026-09-26", TODAY)).toBe("Yesterday's workout")
  })

  test("inside the last week a weekday names one day and no other", () => {
    // Tuesday the 22nd, five days back.
    const within = receiptHeading("2026-09-22", TODAY)
    expect(within).toMatch(/Tue/)
    expect(within).toMatch(/'s workout$/)
    expect(within, "a date as well would make the weekday pointless").not.toMatch(/\d/)
  })

  test("at a week back the weekday stops naming one day, so it gives the date", () => {
    // Seven days back is the SAME weekday as today — the exact boundary. A
    // heading of "Sunday's workout" here would name today.
    const weekBack = receiptHeading("2026-09-20", TODAY)
    expect(weekBack).toMatch(/^Workout on /)
    expect(weekBack).toMatch(/20/)
    expect(weekBack, "neither today nor a day either side of it").not.toMatch(/27|19|21/)
  })

  test("an older workout is dated rather than given a bare weekday", () => {
    const march = receiptHeading("2026-03-10", TODAY)
    expect(march).toMatch(/^Workout on /)
    expect(march).toMatch(/10/)
  })

  test("another year is said, because a bare date repeats every year", () => {
    expect(receiptHeading("2025-08-24", TODAY)).toMatch(/2025/)
    expect(
      receiptHeading("2026-08-24", TODAY),
      "and the current year is not, which is noise on every row"
    ).not.toMatch(/2026/)
  })

  test("a workout with no start time does not invent a day", () => {
    // A session written up after the fact has no `started_at`.
    expect(receiptHeading(null, TODAY)).toBe("That workout")
  })

  test("a date ahead of today is dated, not called yesterday", () => {
    // Clock skew between two devices, or a session written up with tomorrow's
    // date: the difference goes NEGATIVE and must not fall into a recency
    // bucket. `ago < 7` alone would have made tomorrow "Monday's workout".
    expect(receiptHeading("2026-09-28", TODAY)).toMatch(/^Workout on /)
  })
})
