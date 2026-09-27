// @vitest-environment node
/**
 * ARRAY POSITION DECIDED WHAT A YEAR OF TRAINING WAS MEASURED IN.
 *
 * History, Progress and the receipt are about the ACCOUNT — every workout
 * there has ever been — and `TrainingScreen` took their unit from
 * `initialActive[0]`, the first active enrolment. Enrolments only deactivate
 * within a discipline, so a strength program and a calisthenics one are both
 * live routinely; if they disagreed about kg and lb, whichever the query
 * returned first won.
 *
 * The existing rule stays where it has an answer: one program in pounds means
 * pounds everywhere, which is what `unitForDisplay` was written for and what
 * `programs-live-workout`'s pounds test drives. Only the disagreement is new,
 * and there the account's own setting is the only thing on the screen that is
 * about the whole account.
 */

import { describe, expect, test } from "vitest"
import { accountWideUnit } from "@/src/programs/programsService"

describe("accountWideUnit", () => {
  test("one running program decides, which is the behaviour that already worked", () => {
    expect(accountWideUnit(["lb"], "kg")).toBe("lb")
    expect(accountWideUnit(["kg"], "lb")).toBe("kg")
  })

  test("two that agree still decide", () => {
    expect(accountWideUnit(["lb", "lb"], "kg")).toBe("lb")
  })

  test("two that DISAGREE hand it back to the account", () => {
    // The bug: this used to be whichever came first in the array.
    expect(accountWideUnit(["lb", "kg"], "kg")).toBe("kg")
    expect(accountWideUnit(["kg", "lb"], "lb")).toBe("lb")
    // And the order of the enrolments changes nothing, which is the point.
    expect(accountWideUnit(["lb", "kg"], "lb")).toBe(accountWideUnit(["kg", "lb"], "lb"))
  })

  test("no program running falls to the account, not silently to kilograms", () => {
    expect(accountWideUnit([], "lb")).toBe("lb")
  })

  test("a program that states nothing is not a vote", () => {
    expect(accountWideUnit([null, "lb", undefined], "kg")).toBe("lb")
  })

  test("nobody knows means nobody knows — the caller decides, not this", () => {
    // `null`, not "kg". Answering kilograms on an account's behalf is the
    // fault `unitForDisplay` was written to stop.
    expect(accountWideUnit([], null)).toBeNull()
  })
})
