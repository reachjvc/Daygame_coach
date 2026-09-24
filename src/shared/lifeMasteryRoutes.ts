/**
 * WHERE LIFE MASTERY LIVES — the one place that decides.
 *
 * It lived under `/test`, and everything under `/test` answers 404 in
 * production on purpose (`app/test/layout.tsx`). So the flow real users were
 * meant to reach was a page that did not exist for them, and the links into it
 * looked perfectly fine in development, which is the only place they were ever
 * clicked. It now has a real address.
 *
 * IT WILL MOVE AGAIN, and that is the reason this file exists. Next.js decides
 * routes by folder name, so a move is always two things: rename the folder under
 * `app/`, and change the constant below. Nothing else — every link in the
 * product is built from here, and `tests/unit/navigation/lifeMasteryRoutes.test.ts`
 * fails the build if anyone writes one of these paths out by hand again.
 *
 * The vice module sits INSIDE Life Mastery rather than beside it, because the
 * plan links into it and the two are one product. One folder, one move.
 */

/** The flow itself. Rename `app/life-mastery/` to match if you change this. */
export const LIFE_MASTERY = "/life-mastery"

/**
 * The quit-a-vice module's front door — **the Black Box** since 2026-09-20.
 *
 * READ THE NEXT CONSTANT BEFORE USING THIS ONE. On 2026-09-20 this address
 * stopped being the old hub and became a different page, and the name was left
 * alone. That is the whole of a four-day CI outage: `tests/e2e/quit-vice.spec.ts`
 * and `tests/e2e/deadControls.spec.ts` both said `HUB = QUIT_VICE`, which had
 * been true when they were written and silently stopped being true, so 22 tests
 * drove the wrong page. `deadControls` aliased BOTH pages to this one name.
 *
 * The lesson is not about those specs. **A move that gives an existing name a
 * new meaning cannot be caught by anything** — every caller still compiles,
 * every import still resolves, and the only symptom is behaviour. A move that
 * ADDS a name breaks the callers that needed the old one, loudly, at the compiler.
 * So: when a page moves out from under a constant, the page that took its place
 * gets the new name, or the page that moved does.
 */
export const QUIT_VICE = `${LIFE_MASTERY}/quit-vice`

/**
 * THE RETIRED MODULE'S ADDRESS IS NOT HERE, AND THAT IS ON PURPOSE.
 *
 * The six flows, the teaching spine, the shortlist and the seven tools were
 * retired to the test archive on 2026-09-24, on the owner's instruction to
 * keep them reachable. Their address lives with them, in the `routes.ts` beside
 * those pages — deliberately not spelled out here, because the rule below
 * greps for the literal and it is right to.
 *
 * It was here for about an hour and `tests/unit/architecture.test.ts` failed
 * it, correctly: "nothing links to the archived surfaces" exists because a link
 * from production into the archive has to be removed again the day the archive
 * goes, and a path constant is a link. Nothing under `QUIT_VICE` but the Black
 * Box now.
 */

/**
 * `viceStep` IS GONE, 2026-09-24. Every step it built — the six flows, `learn`
 * and `shortlist` — moved to the test archive with the module, so the only
 * thing under `QUIT_VICE` now is the Black Box itself. Use
 * `viceArchiveStep` for the archived screens. Removing it rather than leaving
 * it pointing at addresses that 404 is the same lesson as `QUIT_VICE` changing
 * meaning: a name that still resolves but no longer means what it says is worse
 * than no name, because nothing breaks at the compiler.
 */
