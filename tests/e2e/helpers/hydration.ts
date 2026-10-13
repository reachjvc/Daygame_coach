import { expect, type Locator, type Page } from '@playwright/test'

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

/**
 * WAIT UNTIL REACT OWNS THIS ELEMENT, NOT JUST UNTIL IT IS VISIBLE — the proof
 * `networkidle` is not.
 *
 * A server-rendered control is visible 0.5–0.8 s before React attaches to it on
 * a busy machine, and a click in that window does nothing (a button) or a
 * native submit (a form). React writes its props onto the DOM node when it
 * hydrates it, so their presence is the fact itself. Found twice on 2026-10-13
 * under parallel load: the login form (every WebKit and phone worker failed to
 * sign in) and the program catalogue (a StrongLifts click that opened nothing).
 */
export async function whenHydrated(target: Locator, timeout = 15000): Promise<Locator> {
  await expect
    .poll(
      () =>
        target
          .first()
          .evaluate((el) => Object.keys(el).some((key) => key.startsWith('__reactProps')))
          .catch(() => false),
      { timeout, message: 'React never attached to this element' },
    )
    .toBe(true)
  return target
}
