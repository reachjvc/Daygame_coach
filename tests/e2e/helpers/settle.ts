import { expect, type Page } from '@playwright/test'

/**
 * Resolve once the page has had no request in flight for `quietMs`.
 *
 * For the places a test needs "whatever the last action set off has landed"
 * and there is no element whose arrival says so: a refetch after a save that
 * may or may not repaint, a debounced write. It is a condition on the network,
 * which is what those sleeps were guessing at — a guess is too short on a slow
 * machine and too long on every other run.
 *
 * Playwright's own `waitForLoadState('networkidle')` cannot do this after the
 * first load: once a page has been idle it returns at once, forever.
 */
export async function networkQuiet(page: Page, quietMs = 500, timeout = 20_000): Promise<void> {
  let inFlight = 0
  let lastChange = Date.now()
  const started = () => {
    inFlight += 1
    lastChange = Date.now()
  }
  const ended = () => {
    // a request already in the air when this started ends without having been counted
    inFlight = Math.max(0, inFlight - 1)
    lastChange = Date.now()
  }
  page.on('request', started)
  page.on('requestfinished', ended)
  page.on('requestfailed', ended)
  try {
    await expect
      .poll(() => inFlight === 0 && Date.now() - lastChange >= quietMs, {
        timeout,
        intervals: [100],
        message: `the page never went ${quietMs}ms without a request`,
      })
      .toBe(true)
  } finally {
    page.off('request', started)
    page.off('requestfinished', ended)
    page.off('requestfailed', ended)
  }
}
