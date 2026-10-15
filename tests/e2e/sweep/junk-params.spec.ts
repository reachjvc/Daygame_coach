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

import { readFileSync } from "node:fs"
import { ROUTES } from "@/src/shared/routes"
import { join } from "node:path"
import { test, expect } from "../fixtures/test"
import {
  routesReadingSearchParams,
  searchParamNames,
  JUNK_PARAM_VALUES,
} from "../../support/appRoutes"

/**
 * PAGES THAT HAND THEIR WHOLE QUERY TO A PARSER, and where that parser is.
 *
 * `/programs` copies every parameter into a `URLSearchParams` and passes it to
 * `parseProgramsLocation`, so its page file names none of them — and
 * `searchParamNames` derived an empty list, which made `/programs`' test here
 * zero navigations long and green. The names are still DERIVED, from the
 * parser's own `params.get("…")` calls; only where to look is written down.
 */
const PARSED_ELSEWHERE: Record<string, { file: string; fn: string }> = {
  [ROUTES.training]: { file: "src/programs/programsService.ts", fn: "parseProgramsLocation" },
}

function parserParamNames({ file, fn }: { file: string; fn: string }): string[] {
  const src = readFileSync(join(process.cwd(), file), "utf-8")
  const start = src.indexOf(`export function ${fn}(`)
  if (start < 0) throw new Error(`${fn} is not in ${file}; PARSED_ELSEWHERE is out of date`)
  const next = src.indexOf("\nexport ", start + 1)
  const body = src.slice(start, next < 0 ? undefined : next)
  return [...new Set([...body.matchAll(/\.get\(\s*["'`](\w+)["'`]\s*\)/g)].map((m) => m[1]))].sort()
}

function paramNamesFor(route: { route: string; file: string }): string[] {
  const derived = searchParamNames(route.file)
  if (derived.length > 0) return derived
  const parser = PARSED_ELSEWHERE[route.route]
  return parser ? parserParamNames(parser) : []
}

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
    const params = paramNamesFor(route)

    test(`${route.route} survives junk in ${params.join(", ") || "(no parameter names found)"}`, async ({ page }) => {
      // Zero names is zero navigations, which passes having opened nothing
      expect(
        params,
        `${route.route} reads its query, but no parameter names could be found. ` +
          `If it hands the query to a parser, add that parser to PARSED_ELSEWHERE.`,
      ).not.toEqual([])
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
})
