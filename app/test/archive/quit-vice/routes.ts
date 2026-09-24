/**
 * THE ARCHIVED MODULE OWNS ITS OWN ADDRESS.
 *
 * These two constants were in `src/shared/lifeMasteryRoutes.ts` for about an
 * hour, and `tests/unit/architecture.test.ts` was right to fail that: its rule
 * "nothing links to the archived surfaces" exists because a link from
 * production into the archive is a link somebody has to remove again the day
 * the archive goes. A path constant is a link.
 *
 * So the address lives here, beside the pages it names, under `app/test/` —
 * which that rule skips, because archive pages may link to each other. When
 * this folder is eventually deleted for real, this file goes with it and
 * nothing in `src/` has to be touched.
 *
 * THE DEBT THIS DOES NOT PAY. The components these pages render are still in
 * `src/vice/components/` — `ViceHub`, `ViceFlow`, the six step files, the seven
 * tools, `LearnPage`, `ShortlistPage` and their data. They are archive-only
 * code sitting in production's folder, and they import this file, which is
 * backwards. Moving them here is the honest arrangement and it is about twenty
 * files; it is recorded in `docs/plans/vice-finished.md` rather than rushed,
 * because `tests/e2e/quit-vice.spec.ts` running against them is the only thing
 * keeping the owner's "I can access it later" true, and that is not a promise
 * to break with a hasty refactor.
 */

/** Where the retired quit-a-vice module lives. */
export const QUIT_VICE_ARCHIVE = "/test/archive/quit-vice"

/**
 * One step of it — `learn`, `shortlist`, `map`, `where`, `gives`, `week`,
 * `line`, `experiment`. Each is a folder beside this file.
 *
 * Deliberately not the same builder as anything under `/life-mastery`: for four
 * days one constant meant both the Black Box and these steps, and that is what
 * put 22 browser tests on the wrong page.
 */
export const viceArchiveStep = (step: string): string => `${QUIT_VICE_ARCHIVE}/${step}`
