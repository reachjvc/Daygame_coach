import type { Page } from '@playwright/test'

/**
 * Wait until the page's JavaScript has loaded, so React has attached its event
 * handlers before the test clicks anything.
 *
 * WHY THIS EXISTS. Auth pages are client components. Until React hydrates, the
 * form is plain HTML: clicking submit does a native browser submit, the page
 * reloads, and every bit of React state -- including the error message the test
 * is waiting for -- is gone. Nothing errors; the assertion just times out with
 * "element not found".
 *
 * This was invisible on Chromium and failed on WebKit and iPhone the first time
 * the auth specs were run on those engines (2026-09-04). It is a race, so
 * Chromium was not "correct" -- it was fast enough to hide it.
 *
 * Honest limit: `networkidle` proves the scripts finished downloading, not that
 * hydration completed. In practice hydration follows within a tick and
 * Playwright's auto-retrying assertions absorb the rest. A page that stayed
 * busy with long-polling would never reach networkidle -- none of the auth
 * pages do.
 *
 * The same race is reachable by a real user on a slow connection: click submit
 * fast enough and you get a page reload instead of validation. Rare, and not
 * data-losing, but real.
 */
export async function waitForHydration(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle')
}
