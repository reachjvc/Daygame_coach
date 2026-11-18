import type { Page } from "@playwright/test"

/**
 * page.goto that survives the dev server compiling the page it was asked for.
 *
 * Against `next dev` the first request for a page compiles it, and the dev
 * server then reloads the page that is open, which cuts the goto short with
 * "Navigation to /x is interrupted by another navigation to /y". The page is
 * compiled by then, so asking once more lands. A production build (CI) never
 * compiles on request, so there this is one plain goto.
 */
export async function gotoPastDevCompile(page: Page, url: string): Promise<void> {
  try {
    await page.goto(url)
  } catch (error) {
    if (!/interrupted by another navigation/.test(String(error))) throw error
    await page.goto(url)
  }
}
