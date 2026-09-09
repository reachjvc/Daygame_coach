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

/** The quit-a-vice module, which the plan's routine card links into. */
export const QUIT_VICE = `${LIFE_MASTERY}/quit-vice`

/**
 * One step of the vice module — `learn`, `shortlist`, `map`, `where`, `gives`,
 * `week`, `line`, `experiment`. Each is a folder under `app/life-mastery/quit-vice/`.
 */
export const viceStep = (step: string): string => `${QUIT_VICE}/${step}`
