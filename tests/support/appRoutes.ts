/**
 * THE ONE LIST OF THIS APP'S PAGES, DERIVED — never typed by hand.
 *
 * The failure this exists to prevent, measured on 2026-09-07: of 38 Playwright
 * projects, 37 named the spec FILES they run one at a time, and every page any
 * browser test opened was there because a person had typed its address inside a
 * spec. Across 28 real pages that left 6 never opened by a browser at all and 4
 * more opened only in Desktop Chrome. `/preferences` — the whole signup flow —
 * was never opened on a phone by anything. Nothing was excluded on purpose; the
 * lists simply were not extended, and nothing anywhere could say so.
 *
 * The knowledge was already in the repo: `routeReachability.test.ts` walks
 * `app/` and builds this list to answer a different question. This module is
 * that walk, extracted, so the browser tests can share it. A new page is then
 * covered the moment it exists, without anyone remembering anything.
 *
 * Used by:
 *   - tests/unit/navigation/*                  (way in, way back)
 *   - tests/e2e/cross-browser/route-sweep.spec.ts   (renders, weight, targets)
 *   - tests/e2e/cross-browser/junk-params.spec.ts   (garbled URLs)
 */

import * as fs from "fs"
import * as path from "path"

const root = path.resolve(__dirname, "../..")

export interface AppRoute {
  /** URL path, e.g. "/dashboard/tracking". */
  route: string
  /** Absolute path to the page.tsx that serves it. */
  file: string
  /** True for `[id]`-style routes, which cannot be opened without a real id. */
  dynamic: boolean
}

/**
 * Every real product page.
 *
 * `app/test/**` is excluded: those are prototypes, deliberately unfinished, and
 * holding them to the product's standards would mean either fixing throwaways
 * or drowning the guards in exceptions. They are already excluded from the two
 * navigation guards for the same reason.
 */
export function productRoutes(): AppRoute[] {
  const out: AppRoute[] = []

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === "test" && path.relative(root, full) === "app/test") continue
        if (entry.name === "api") continue
        walk(full)
      } else if (entry.name === "page.tsx") {
        const relDir = path.relative(path.join(root, "app"), path.dirname(full))
        const route = "/" + relDir.replace(/\\/g, "/")
        out.push({
          route: route === "/." ? "/" : route,
          file: full,
          dynamic: route.includes("["),
        })
      }
    }
  }

  walk(path.join(root, "app"))
  return out.sort((a, b) => a.route.localeCompare(b.route))
}

/** Pages a browser can open with no id — everything a sweep can actually visit. */
export function staticRoutes(): AppRoute[] {
  return productRoutes().filter((r) => !r.dynamic)
}

/**
 * Pages that read something out of the URL's query string.
 *
 * Derived from the page source rather than a list, because the fault this feeds
 * — `?step=abc` rendering "Step NaN of 5" — is only possible on a page that
 * reads a parameter, and a new such page must be swept without anyone adding it.
 */
export function routesReadingSearchParams(): AppRoute[] {
  return staticRoutes().filter((r) => {
    const src = fs.readFileSync(r.file, "utf-8")
    return /searchParams/.test(src)
  })
}

/**
 * The names of the query-string parameters a page reads, from its own source.
 *
 * Two shapes exist in this app and both are handled:
 *   searchParams: Promise<{ step?: string }>      -> "step"
 *   searchParams.get("session")                   -> "session"
 *
 * Derived rather than listed so a new parameter is fuzzed the day it is added.
 * This is what feeds the junk-URL sweep: `/preferences?step=abc` rendered
 * "Step NaN of 5" with no content, a dead Back button and a live submit button,
 * and no test in the repo had ever put a non-number in a URL.
 */
export function searchParamNames(file: string): string[] {
  const src = fs.readFileSync(file, "utf-8")
  const names = new Set<string>()

  // searchParams: Promise<{ step?: string; next?: string | string[] }>
  for (const block of src.matchAll(/searchParams\??\s*:\s*Promise<\{([^}]*)\}>/g)) {
    for (const field of block[1].matchAll(/(\w+)\s*\??\s*:/g)) names.add(field[1])
  }

  // searchParams.get("session")
  for (const get of src.matchAll(/searchParams\.get\(\s*["'`](\w+)["'`]\s*\)/g)) {
    names.add(get[1])
  }

  return [...names].sort()
}

/**
 * Values that have broken a page in this codebase, plus the obvious neighbours.
 * "abc" is the one that produced "Step NaN of 5" in production.
 */
export const JUNK_PARAM_VALUES = ["abc", "-1", "0", "999999", "", "null", "%20"]

/**
 * THE ANTI-COLLAPSE RATCHET.
 *
 * A guard that skips what it cannot handle looks identical, when it passes, to
 * a guard that checked everything. `backNavigation.test.ts` examined 2 of 28
 * pages for months and reported success under the title "EVERY SCREEN HAS A WAY
 * BACK". One prefix match did it.
 *
 * A flat percentage is the wrong floor here, because some exemptions are real:
 * that guard legitimately skips 7 pages that show the tab bar, 4 pre-login
 * pages, 3 gates and 2 redirect shims -- 16 of 28 -- so demanding 70% would
 * force a lie. What actually prevents the collapse is two cheaper rules:
 *
 *   1. An ABSOLUTE floor on how many routes were examined. If a future
 *      exemption empties the guard, the count falls through the floor and the
 *      guard fails instead of quieting.
 *   2. Every skipped route must be attributed to a NAMED bucket. A route
 *      skipped for an unstated reason is a failure, so a new broad exemption
 *      has to be declared rather than absorbed.
 *
 * Set `minChecked` a little below today's real number: it is a ratchet against
 * regression, not a target.
 */
export interface CoverageReport {
  /** Routes the guard actually examined. */
  checked: string[]
  /** Skipped route -> the named reason it was skipped. */
  skipped: Record<string, string>
  /** Absolute floor on `checked.length`. */
  minChecked: number
}

/**
 * Returns the problems with a guard's coverage. Empty array means healthy.
 * Kept as a pure function so each guard can assert on it with its own message.
 */
export function coverageProblems(
  guardName: string,
  report: CoverageReport,
  allRoutes: string[],
): string[] {
  const problems: string[] = []
  const accounted = new Set([...report.checked, ...Object.keys(report.skipped)])

  const unaccounted = allRoutes.filter((r) => !accounted.has(r))
  if (unaccounted.length) {
    problems.push(
      `${guardName}: ${unaccounted.length} route(s) neither checked nor given a ` +
        `reason for being skipped: ${unaccounted.join(", ")}`,
    )
  }

  if (report.checked.length < report.minChecked) {
    const bucketed = Object.entries(report.skipped).reduce<Record<string, number>>(
      (acc, [, reason]) => ({ ...acc, [reason]: (acc[reason] ?? 0) + 1 }),
      {},
    )
    problems.push(
      `${guardName} examined only ${report.checked.length} of ${allRoutes.length} ` +
        `routes, below its floor of ${report.minChecked}. This is how a guard goes ` +
        `quiet without going red. Skipped by reason: ${JSON.stringify(bucketed)}`,
    )
  }

  return problems
}
