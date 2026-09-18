/**
 * THE PROMISE THE ROUTE SWEEP MADE AND NEVER KEPT.
 *
 * The sweep walks every page of the app on three devices and reports the boring
 * universals: a page that draws nothing, sideways scrolling, a button too small
 * for a thumb. Pages that already fail are written down in two lists
 * (tests/support/sweepDebt.ts) so the sweep can run and still be honest, and the
 * bargain in its own comment is "this list may only shrink".
 *
 * Nothing enforced that. The comment said "the test below asserts this list
 * never grows"; there was no such test, the lists lived inside a Playwright
 * spec where only a browser run could reach them, and those browser projects
 * ran in no CI job at all. So the one rule holding the debt down was a sentence.
 *
 * This is that sentence, made real, in `npm test`:
 *   - every route carrying debt is a page that actually exists, so a deleted
 *     page cannot leave an excuse behind;
 *   - the known-debt list stays at its single deliberate entry;
 *   - the two training pages never owe more than their ceiling, and when a
 *     ceiling is removed the entry must be gone, not lowered.
 */

import { describe, test, expect } from "vitest"
import { KNOWN_DEBT, TAP_TARGET_DEBT, TRAINING_DEBT_CEILING } from "../../support/sweepDebt"
import { staticRoutes } from "../../support/appRoutes"

const routes = new Set(staticRoutes().map((r) => r.route))

describe("the route sweep's debt lists", () => {
  test("every route carrying debt is a real page", () => {
    const ghosts = [...Object.keys(KNOWN_DEBT), ...Object.keys(TAP_TARGET_DEBT)].filter((r) => !routes.has(r))
    expect(
      ghosts,
      "these pages no longer exist, so their entry excuses nothing — delete it and let the number fall",
    ).toEqual([])
  })

  test("the known-debt list never grows", () => {
    // One entry, on purpose: /admin/ai-usage renders a key prompt until the
    // admin secret is typed, so "almost nothing on screen" is its correct state.
    // A second entry means a page was excused rather than fixed.
    expect(Object.keys(KNOWN_DEBT)).toEqual(["/admin/ai-usage"])
  })

  test("training pages never carry more debt than their ceiling, and a ceiling that is gone means no entry", () => {
    for (const route of ["/programs", "/programs/live"]) {
      const ceiling = TRAINING_DEBT_CEILING[route]
      const recorded = TAP_TARGET_DEBT[route]
      if (ceiling === undefined) {
        // The page's phase has finished: every control is finger-sized, so the
        // entry goes away entirely rather than being lowered to a smaller number.
        expect(recorded, `${route} is done, so it must carry no tap-target debt at all`).toBeUndefined()
      } else {
        expect(recorded, `${route} has a ceiling, so it must still be listed`).toBeDefined()
        expect(recorded!, `${route} may never be recorded as owing more than ${ceiling}`).toBeLessThanOrEqual(ceiling)
      }
    }
  })

  test("the ceiling only covers training pages, so nothing else can hide behind it", () => {
    const outsiders = Object.keys(TRAINING_DEBT_CEILING).filter((r) => !r.startsWith("/programs"))
    expect(outsiders).toEqual([])
  })
})
