/**
 * THE LINE THAT ANSWERS "IS MY WORK SAFE" WAS WRONG IN BOTH DIRECTIONS.
 *
 * It sits under the Life Mastery flow and says one of three things: "Nothing
 * written yet", "Saved on this device." or "Saved to your account." Both of the
 * facts it reads were broken, and in opposite directions:
 *
 *   - **It claimed the account had work it did not.** `serverState` only became
 *     "saving" inside the debounce timeout's callback, so for the whole
 *     four-second window — and for as long as the request was then open — the
 *     footer still said "Saved to your account." Closing the tab in that window
 *     is how the plan this milestone exists to protect gets lost.
 *   - **It denied work the account had.** `rowsToPlan` set `updatedAt: null`
 *     unconditionally, because `PlanRows` carried no stamp. So a plan read back
 *     on a NEW PHONE printed "Nothing written yet" under an evening's writing —
 *     at exactly the moment this work exists to be trusted.
 *
 * Both are tested here against the real functions rather than the rendered
 * markup, because the rule is about which fact is true and the markup is where
 * it is spelled. `northStarFlowSaves.test.tsx` owns the rendering.
 */

import { describe, it, expect } from "vitest"
import { rowsToPlan } from "@/src/goals/lifePlanMapper"
import { planToRows } from "@/src/goals/lifePlanMapper"
import { emptyNsPlan, setAnswer } from "@/src/goals/northStarService"
import { sendableFingerprint } from "@/src/goals/lifePlanSync"
import type { PlanRows } from "@/src/db/lifePlanTypes"

const STAMP = "2026-09-24T06:12:00.000Z"

/** The empty read a brand-new plan row comes back as, with its stamp. */
function rowsFromAccount(over: Partial<PlanRows> = {}): PlanRows {
  return {
    plan_id: "11111111-1111-1111-1111-111111111111",
    user_id: "22222222-2222-2222-2222-222222222222",
    version: 1,
    seq: 0,
    season_focus_id: null,
    updated_at: STAMP,
    nodes: [], north_stars: [], areas: [], goals: [], checkpoints: [], obstacles: [],
    beliefs: [], habits: [], goal_feeds: [], goal_serves: [], routines: [],
    routine_serves: [], steps: [], split_days: [], step_serves: [], experiences: [],
    fields: [], sub_steps: [], values: [], answers: [],
    ...over,
  }
}

describe("a plan loaded from the account knows it was written", () => {
  it("carries the account's stamp rather than null", () => {
    const plan = rowsToPlan(rowsFromAccount())!

    expect(
      plan.updatedAt,
      'this was null, and the footer reads it — so a second device said "Nothing written yet"',
    ).toBe(STAMP)
  })

  /**
   * The footer's own condition, stated here so the rule is asserted rather than
   * inferred from a string on screen. `!plan.updatedAt` is what it branches on.
   */
  it("so the footer's first branch is not taken", () => {
    const plan = rowsToPlan(rowsFromAccount())!
    expect(!plan.updatedAt, '"Nothing written yet" must not be reachable for a saved plan').toBe(false)
  })

  it("and a plan nobody has saved still has no stamp", () => {
    expect(emptyNsPlan().updatedAt).toBeNull()
  })
})

describe("what the save would send is one expression, not two", () => {
  /**
   * `unsent` in the flow is `fingerprint !== lastSent.current`, where the
   * fingerprint is this function. The footer and the debounced save effect read
   * the SAME value; the bug was that the footer read `serverState` instead,
   * which the timeout had not touched yet.
   */
  it("an edit the account has not taken changes the fingerprint", () => {
    const before = emptyNsPlan()
    const after = setAnswer(before, "one_why", "because I said I would")

    expect(
      sendableFingerprint(after),
      "an unsent edit that did not move this would leave the footer honest by luck",
    ).not.toBe(sendableFingerprint(before))
  })

  /**
   * THE OTHER HALF, and the reason the footer cannot simply key off "has the
   * plan changed at all": a tick, a day note and a journal line travel on the
   * day route, not in this request. If they moved the fingerprint, the flow
   * would send the whole plan on every tick and move the revision for nothing —
   * which is what made a second device permanently stale.
   */
  it("a day-half change does not, because the save does not carry it", () => {
    const before = emptyNsPlan()
    const after = { ...before, logged: { "2026-09-24": ["s1"] } }

    expect(sendableFingerprint(after)).toBe(sendableFingerprint(before))
  })
})

describe("the stamp is the database's, not the browser's", () => {
  /**
   * `PlanRows` is one shape used in both directions. On the way IN the column
   * belongs to `save_life_plan`, so whatever the mapper puts here is ignored —
   * the field is required only so the READ direction cannot forget it, which is
   * exactly what it had done.
   */
  it("a plan sent up carries a stamp the server is free to ignore", () => {
    let n = 0
    const rows = planToRows(emptyNsPlan(), {
      planId: "11111111-1111-1111-1111-111111111111",
      userId: "22222222-2222-2222-2222-222222222222",
      idFor: () => `00000000-0000-0000-0000-${String(++n).padStart(12, "0")}`,
    })

    expect(typeof rows.updated_at, "the shape must be whole in both directions").toBe("string")
  })
})
