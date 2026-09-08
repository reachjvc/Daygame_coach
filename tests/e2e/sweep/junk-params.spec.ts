/**
 * A GARBLED URL MUST NOT PRODUCE A BROKEN PAGE.
 *
 * The failure this prevents, measured on the live site 2026-09-07:
 * `/preferences?step=abc` rendered
 *
 *     "Step NaN of 5"     "NaN% Complete"     0 headings
 *     Back button: enabled, does nothing.  Submit button: shown.
 *
 * `Number("abc")` is NaN, and NaN survives `Math.min(Math.max(NaN, 1), 5)`
 * untouched, so the clamp that was meant to make the value safe passed it
 * straight through. A stale bookmark or a mistyped address is enough.
 *
 * No test in the repo had ever put a non-number in a URL. This sweep does, for
 * every page that reads a parameter — the page list and the parameter names are
 * both DERIVED from source, so a new page or a new parameter is covered the day
 * it is written, with nobody remembering to add it.
 */

import { test, expect } from "@playwright/test"
import {
  routesReadingSearchParams,
  searchParamNames,
  JUNK_PARAM_VALUES,
} from "../../support/appRoutes"

const NAV_TIMEOUT = 30_000

/**
 * Wait for the page to have actually drawn something.
 *
 * `domcontentloaded` is too early here and produced a false positive on the
 * first run of this sweep: /dashboard/tracking/report reads its parameters with
 * useSearchParams, so it is client-rendered, and the sweep measured "0 headings,
 * 1 word" on a page that renders twelve headings a moment later. Measuring
 * before the thing exists is the same proxy error this sweep was written to
 * catch, so it is worth saying plainly: the guard was wrong, not the page.
 */
async function settle(page: import("@playwright/test").Page) {
  await page.waitForLoadState("load")
  try {
    await page.waitForFunction(
      () => document.querySelectorAll("h1,h2,h3").length > 0 ||
            document.body.innerText.trim().split(/\s+/).length > 12,
      undefined,
      { timeout: 8000 },
    )
  } catch {
    // Genuinely empty after 8s. Let the assertions below report it.
  }
}

/** Text that means an internal value leaked onto the screen. */
const LEAKED = [/\bNaN\b/, /\bundefined\b/, /\[object Object\]/]

test.describe("garbled URLs", () => {
  /**
   * One test per ROUTE, not one per rule.
   *
   * The first version looped every route-and-value combination inside two
   * tests, which is ~56 navigations each and timed out at 60s on a phone
   * viewport against a dev server that compiles on demand. Per route also
   * names the failing page in the test title instead of burying it in a list.
   */
  for (const route of routesReadingSearchParams()) {
    const params = searchParamNames(route.file)

    test(`${route.route} survives junk in ${params.join(", ")}`, async ({ page }) => {
      const broken: string[] = []

      for (const param of params) {
        for (const value of JUNK_PARAM_VALUES) {
          const url = `${route.route}?${param}=${encodeURIComponent(value)}`
          await page.goto(url, { timeout: NAV_TIMEOUT })
          await settle(page)

          const text = await page.evaluate(() => document.body.innerText)

          for (const pattern of LEAKED) {
            if (pattern.test(text)) {
              const line = text.split("\n").find((l) => pattern.test(l))?.trim().slice(0, 70)
              broken.push(`${url}  ->  shows "${line}"`)
            }
          }

          // A page that redirects somewhere sensible has done the right thing;
          // one that draws nothing has not.
          const headings = await page.locator("h1, h2, h3").count()
          const words = text.trim().split(/\s+/).filter(Boolean).length
          if (headings === 0 && words < 12) {
            broken.push(`${url}  ->  nothing on screen (${words} words)`)
          }
        }
      }

      expect(
        broken,
        `A junk URL parameter broke this page:\n  ${broken.join("\n  ")}`,
      ).toEqual([])
    })
  }

  test("the sweep actually covers something", () => {
    // The ratchet. If the source patterns stop matching, this sweep silently
    // tests nothing and passes -- the exact failure mode it exists to catch.
    const combos = routesReadingSearchParams().reduce(
      (n, r) => n + searchParamNames(r.file).length * JUNK_PARAM_VALUES.length,
      0,
    )
    expect(
      combos,
      "No junk-URL targets were derived. The parameter extraction in " +
        "tests/support/appRoutes.ts has stopped matching the page sources.",
    ).toBeGreaterThan(20)
  })
})
