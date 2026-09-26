/**
 * M3 WROTE THE LINK AT PUSH TIME, SO IT NEVER REACHED ANYBODY WHO HAD PUSHED.
 *
 * `48fa55b1` made the push record `life_plan_goals.user_goal_id`, which is what
 * lets a second device recognise a pushed goal instead of offering to push it
 * again. Recorded at push time — so for anybody whose push already happened,
 * there are counted goals and no links, and the fix is inert.
 *
 * Measured on the owner's own account on 2026-09-26, which is how this was
 * found rather than reasoned about: **50 `ns:`-tagged rows in `user_goals`, and
 * 0 of 50 plan goals linked.** On the browser they pushed from, the tag's run
 * still matches and the Track step looks correct. On their phone all fifty read
 * as never pushed, and pressing push would make a second copy of every one —
 * the exact failure M3 exists to prevent, still live for the person it was
 * written for, three days after it shipped.
 *
 * The tag is already the proof. It just lives in one browser's localStorage
 * instead of on the account, so the browser that can still read it writes it
 * down. One device heals every other one, with no migration and nothing deleted.
 */

import { describe, it, expect } from "vitest"
import { linksToBackfill, pushedGoalIds, trackTemplateId } from "@/src/goals/northStarTrackService"

const RUN = "run-of-the-laptop"
const ANOTHER = "run-of-the-phone"
const row = (id: string, goalLocalId: string, run = RUN) => ({ id, template_id: trackTemplateId(run, goalLocalId) })

describe("recording what only the pushing browser knows", () => {
  /** The owner's state: tagged rows, no links at all. */
  it("offers every tag-proved link when the account has none", () => {
    const rows = [row("uuid-a", "g1"), row("uuid-b", "g2")]

    expect(linksToBackfill(RUN, rows, {})).toEqual({ g1: "uuid-a", g2: "uuid-b" })
  })

  it("offers nothing when the account already has them", () => {
    const rows = [row("uuid-a", "g1"), row("uuid-b", "g2")]

    expect(linksToBackfill(RUN, rows, { g1: "uuid-a", g2: "uuid-b" })).toEqual({})
  })

  it("offers only the ones that are missing", () => {
    const rows = [row("uuid-a", "g1"), row("uuid-b", "g2")]

    expect(linksToBackfill(RUN, rows, { g1: "uuid-a" })).toEqual({ g2: "uuid-b" })
  })

  /**
   * ON THE WRONG BROWSER IT KNOWS NOTHING, AND MUST CLAIM NOTHING. The run in
   * the tag is the only thing that proves the row came from this plan; a device
   * that cannot read it has no business writing links, and guessing would point
   * the account at rows it has not identified.
   */
  it("offers nothing from a device that did not do the pushing", () => {
    const rows = [row("uuid-a", "g1", ANOTHER), row("uuid-b", "g2", ANOTHER)]

    expect(linksToBackfill(RUN, rows, {})).toEqual({})
  })

  it("ignores goals made by hand and rows from another plan's run", () => {
    const rows = [
      { id: "uuid-hand", template_id: null },
      { id: "uuid-catalogue", template_id: "daygame_approaches_10" },
      row("uuid-other", "g1", ANOTHER),
      row("uuid-mine", "g2"),
    ]

    expect(linksToBackfill(RUN, rows, {})).toEqual({ g2: "uuid-mine" })
  })

  /**
   * A LINK POINTING AT A ROW THAT IS GONE IS REPLACED, NOT KEPT. `pushedGoalIds`
   * already drops a stale link so the goal is offered again; this has to agree
   * with it, or the two would disagree about the same goal on the same screen.
   */
  it("replaces a link whose counted row has been archived or deleted", () => {
    const rows = [row("uuid-new", "g1")]

    expect(linksToBackfill(RUN, rows, { g1: "uuid-gone" })).toEqual({ g1: "uuid-new" })
  })
})

/**
 * WHAT IT BUYS, stated as the thing a person would notice rather than as a
 * column being set: once the links are recorded, the OTHER device recognises the
 * goals — which is the whole of M3's promise.
 */
describe("what the second device sees afterwards", () => {
  it("recognises nothing before the backfill, and everything after", () => {
    const rows = [row("uuid-a", "g1"), row("uuid-b", "g2")]

    const before = pushedGoalIds(ANOTHER, rows, {})
    expect(before.size, "fifty goals would be offered again, and duplicated").toBe(0)

    const recorded = linksToBackfill(RUN, rows, {})
    const after = pushedGoalIds(ANOTHER, rows, recorded)
    expect([...after.entries()].sort()).toEqual([["g1", "uuid-a"], ["g2", "uuid-b"]])
  })
})
