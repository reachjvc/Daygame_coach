/**
 * WHAT THE ROUTE SWEEP IS STILL ALLOWED TO FIND — ONE LIST, ONE OWNER.
 *
 * These two maps used to live inside `tests/e2e/sweep/route-sweep.spec.ts`,
 * where only Playwright could read them. That had two costs. The spec's own
 * comment promised "the test below asserts this list never grows" and no such
 * test existed — the promise was kept by nobody. And the three sweep projects
 * that read it ran in no CI job, so a list that may only shrink was checked
 * only when somebody happened to run it by hand.
 *
 * Moved here, the maps are plain data that `npm test` can read in a second
 * (tests/unit/navigation/sweepDebt.test.ts), while the browser sweep keeps
 * using them exactly as before.
 */

/**
 * KNOWN DEBT — shrinking only.
 *
 * Every entry is a page that fails a rule today. They are listed so the sweep
 * can run and still be honest about what it found, rather than being deleted or
 * weakened until it passes. Remove an entry when the page is fixed; adding one
 * needs a reason in the same line. tests/unit/navigation/sweepDebt.test.ts is
 * what asserts this list never grows.
 */
export const KNOWN_DEBT: Record<string, string[]> = {
  // Gated by design, not unfinished: the page renders only a key prompt until
  // ADMIN_SECRET_KEY is entered, so "3 words on screen" is the correct state for
  // anyone who has not typed it. routeReachability.test.ts treats it the same
  // way, deriving the exemption from the page's own source rather than its path.
  "/admin/ai-usage": ["renders"],
}

/**
 * TAP-TARGET DEBT — a count per page, and it may only go down.
 *
 * Measured on an iPhone 14 viewport, 2026-09-08: 240 controls across 25 pages
 * are smaller than the 44px minimum. Most are 4px short, because the standard
 * button is 40px tall; some are much worse.
 *
 * Recorded rather than fixed, and rather than the rule being deleted or the
 * threshold lowered until it passed. A page may not get worse than its number
 * here, and a page with no number must be clean — so new work is held to the
 * rule while the existing debt is paid down deliberately. Lower a number when
 * you fix a page. Never raise one.
 */
export const TAP_TARGET_DEBT: Record<string, number> = {
  // Re-measured 2026-09-09 after the shared button's `sm` and `icon-sm` sizes
  // went from 40px to 44px on touch. Total across the app: 250 -> 125.
  // /dashboard/goals/plan alone went 106 -> 3, and /preferences to zero, so it
  // is gone from this list entirely. Lowered here to lock the gain in: these
  // pages can no longer drift back.
  //
  // One exception below: /dashboard/goals/plan is not stable enough to lower.
  "/": 3,
  "/admin/ai-usage": 2,
  "/auth/forgot-password": 1,
  "/auth/login": 2,
  "/auth/sign-up": 1,
  "/dashboard": 6,
  "/dashboard/articles": 6,
  // 106, NOT the 3 an earlier pass recorded. This page is a multi-step flow and
  // renders wildly different amounts depending on which step it lands on:
  // measured three times on 2026-09-09 it gave 106, <=3, 106. The 3 was one
  // lucky reading, and lowering the budget to it made the guard flaky. A budget
  // has to be the high-water mark or it fails at random and gets ignored.
  // Genuinely reducing this needs the page's own controls fixed, then a
  // re-measure that is stable across runs.
  // The flow moved to /life-mastery on 2026-09-09; /dashboard/goals/plan is
  // now a redirect with no controls of its own, so the budget moved with the
  // page that actually draws them. Left on the old key it guarded nothing and
  // the real page was measured against zero.
  "/life-mastery": 106,
  /**
   * THE VICE MODULE'S CONTROLS ARE HALF THE SIZE A FINGER NEEDS.
   *
   * Measured on a 390px phone, 2026-09-09: rows like "Change nothing" are 19px
   * tall, "start over" is 48x16, the back link 80x18. The standard here is 44px.
   *
   * This is not new and it is not caused by the move — it was invisible because
   * these nine pages lived under /test, which the sweep does not examine. They
   * became product routes on 2026-09-09 and the sweep started looking. Recorded
   * with real numbers rather than quietly excluded, so it can only go down.
   *
   * Fixing it is a design pass on a module whose choices are research verdicts,
   * not a restyle to do in passing. The shape of the work: give the flow rows,
   * the "start over" control and the step chips a 44px minimum height without
   * making the pages a screen longer each.
   */
  "/life-mastery/quit-vice": 7,
  "/life-mastery/quit-vice/experiment": 7,
  "/life-mastery/quit-vice/gives": 7,
  "/life-mastery/quit-vice/learn": 2,
  // 7, not the 4 it reports when run on its own. This flow draws different
  // numbers of controls depending on how far through it the saved state is, and
  // a budget below the high-water mark fails at random and gets ignored — the
  // same lesson recorded for the plan page above.
  "/life-mastery/quit-vice/line": 7,
  "/life-mastery/quit-vice/map": 7,
  "/life-mastery/quit-vice/shortlist": 14,
  "/life-mastery/quit-vice/week": 7,
  "/life-mastery/quit-vice/where": 7,

  "/dashboard/inner-game": 8,
  "/dashboard/qa": 6,
  "/dashboard/scenarios": 5,
  "/dashboard/settings": 11,
  "/dashboard/time": 2,
  "/dashboard/tracking": 6,
  "/dashboard/tracking/daily": 16,
  "/dashboard/tracking/history": 4,
  "/dashboard/tracking/report": 8,
  "/dashboard/tracking/review": 1,
  "/dashboard/tracking/session": 1,
  "/preferences/archetypes": 1,
  "/qa": 6,
  "/redirect": 6,

  // NOT RAISED, AND FAILING ON PURPOSE.
  //
  // /programs is GONE from this table as of 2026-09-22, not lowered: measured
  // at 390px it has no control under 44px. It owed eleven — a back link at
  // 20px, the Life Mastery aside at 16px, seven week-strip cells at 43px wide
  // (one pixel short, from a four-pixel gap), the history toggle at 36px and
  // "Show all" at 16px.
  //
  // /programs/live is GONE from this table too, as of 2026-09-23. Measured at
  // 390px with a workout open it had four: the back link at 32px tall and the
  // three "+ one more set" buttons at 36px. Both maps are empty of training
  // pages now, which is what "a page with no number must be clean" means.
}

/**
 * WHAT THE TRAINING PAGES ARE ALLOWED TO OWE, UNTIL THEY OWE NOTHING.
 *
 * `/programs` and `/programs/live` are the two screens the training rebuild is
 * rewriting. Their entries above are deliberately below the real measurement —
 * the sweep fails on purpose there, and that failure is the message.
 *
 * This ceiling is the other half of the bargain, in a form a unit test can
 * check without a browser: a training page may never be recorded as owing MORE
 * than the number here, and when its phase has made every control finger-sized
 * the entry is DELETED from both maps rather than lowered to a smaller number.
 * A page with no number must be clean — which is the rule the sweep already
 * states, applied honestly instead of by hand.
 */
export const TRAINING_DEBT_CEILING: Record<string, number> = {
  // "/programs" and "/programs/live" were both here. Deleted rather than
  // lowered, which is what this comment block asks for: a page with no number
  // must be clean. The rebuild has now made both so.
}
