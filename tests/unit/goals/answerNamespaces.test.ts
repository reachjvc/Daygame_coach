/**
 * AT4 — NO TWO THINGS SHARE A NAME.
 *
 * This is the guard for the bug that started the whole exercise. "The one
 * thing" existed four times in this app with four different meanings:
 *
 *   plan.seasonFocusId   a goal you starred on the Focus step
 *   start:one-thing      the sentence you wrote on the One Thing step
 *   one_focus            "ONE thing to work on next", asked after a session
 *   one_moment           "The ONE moment that mattered", asked after a session
 *
 * The tracking page's header read the first one, so writing your answer in the
 * step named after it changed nothing on the page that showed it.
 *
 * The one thing is the season's sentence now (`life_answers`, its old home, went
 * in Phase 7 of Plans/life-plan-rebuild.md). What stays to guard is the
 * field-report catalogue: no question in it may claim to be the one thing.
 */

import { describe, it, expect } from "vitest"
import { FIELD_LIBRARY } from "@/src/tracking/config"

describe("AT4 — answer namespaces stay disjoint", () => {
  it("no field-report question still claims to be the one thing", () => {
    /**
     * Matched on the words a person reads, not on the id: `one_focus` was
     * labelled "ONE thing to work on next", which is what made it look like the
     * one thing on screen even once the ids differed.
     *
     * Two patterns, and the narrowness is deliberate. A first draft of this
     * test matched any "one thing" and flagged "STOP: One thing to drop" and
     * "CONTINUE: One thing working" — which are ordinary English, not a claim
     * to be THE one thing, and rewording them to satisfy a regex would be the
     * test bullying the product. So: the definite article, or the shouted
     * emphasis that the impostors actually used.
     */
    const claimsIt = (label: string) => /\bthe one thing\b/i.test(label) || /\bONE thing\b/.test(label)
    const offenders = FIELD_LIBRARY.filter((f) => claimsIt(f.label)).map((f) => f.id)

    expect(offenders, `these are labelled as "the one thing": ${offenders.join(", ")}`).toEqual([])
  })

  it("every field-report question id is unique", () => {
    const ids = FIELD_LIBRARY.map((f) => f.id)
    const seen = new Set<string>()
    const dupes = ids.filter((id) => (seen.has(id) ? true : (seen.add(id), false)))

    expect(dupes, `duplicated question ids: ${dupes.join(", ")}`).toEqual([])
  })
})
