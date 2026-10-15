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
 *   - tests/unit/navigation/*                (way in, way back, sweep debt)
 *   - tests/e2e/sweep/route-sweep.spec.ts    (renders, weight, targets)
 *   - tests/e2e/sweep/junk-params.spec.ts    (garbled URLs)
 */

import * as fs from "fs"
import * as path from "path"
import { ROUTES } from "@/src/shared/routes"
import { QUIT_VICE_ARCHIVE, viceArchiveStep } from "@/app/test/archive/quit-vice/routes"

const root = path.resolve(__dirname, "../..")

const rel = (file: string) => path.relative(root, file).replace(/\\/g, "/")

/**
 * THE ADDRESS A FOLDER UNDER `app/` SERVES.
 *
 * One owner, because three tests computed it and each did it by joining folder
 * names. That is wrong the moment a route group exists: `app/(app)/settings/`
 * serves `/settings`, because a folder named in parentheses is for sharing a
 * layout and never appears in the address. Square-bracket segments (`[id]`)
 * stay; they are what makes a route dynamic.
 */
export function routeOfDir(dir: string): string {
  const relDir = path.relative(path.join(root, "app"), dir).replace(/\\/g, "/")
  const segments = relDir.split("/").filter((s) => s && s !== "." && !/^\(.+\)$/.test(s))
  return "/" + segments.join("/")
}

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
        const route = routeOfDir(path.dirname(full))
        out.push({ route, file: full, dynamic: route.includes("[") })
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
/**
 * A page whose whole job is `redirect(...)`: a shim, not a destination.
 *
 * ONE OWNER, because there were two. `backNavigation.test.ts` and
 * `routeReachability.test.ts` each carried their own copy, identical on
 * 2026-09-23 and with nothing keeping them that way — and the two guards use it
 * for opposite purposes (one to excuse a route from needing a Back control, the
 * other to excuse it from needing to be reachable). Two copies of "what counts
 * as a shim" is two ways for a real page to start being excused.
 */
export function isRedirectShim(file: string): boolean {
  const src = fs.readFileSync(file, "utf-8")
  return /\bredirect\(/.test(src) && !/<[A-Za-z]/.test(src)
}

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

/** Files the app actually ships: the prototypes under /test are not product. */
export function productFiles(): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (rel(full) === "app/test" || entry.name === "node_modules") continue
        walk(full)
      } else if (/\.tsx?$/.test(entry.name)) {
        out.push(full)
      }
    }
  }
  for (const dir of ["src", "components", "app"]) walk(path.join(root, dir))
  return out
}

/** Strip a query, a hash and a trailing slash: `/x?y=1` is a link to `/x`. */
export function normalize(target: string): string {
  const bare = target.split("?")[0].split("#")[0]
  return bare.length > 1 ? bare.replace(/\/$/, "") : bare
}

/**
 * Where a set of files sends people.
 *
 * Only navigation, not any string that happens to be a path: `href=`, the
 * router's push/replace, and a server `redirect()`.
 */
export function linksIn(files: Iterable<string>): Set<string> {
  const out = new Set<string>()
  const sources: string[] = []
  const pattern = /(?:href=|\.push\(|\.replace\(|\bredirect\()\s*\{?\s*["'`](\/[^"'`${}]*)["'`]/g
  for (const file of files) {
    let src: string
    try {
      src = fs.readFileSync(file, "utf-8")
    } catch {
      continue
    }
    for (const m of src.matchAll(pattern)) out.add(normalize(m[1]))
    for (const target of symbolicLinksIn(src)) out.add(normalize(target))
    sources.push(src)
  }

  /**
   * `viceArchiveStep(flow.id)`: a link whose destination is decided by data.
   *
   * The vice hub draws a row per flow out of `modules.ts` and `plain.ts`, so
   * which of the nine steps it points at is a fact about the data, not about
   * the code, and no amount of reading the call site will say. Resolving it to
   * every flow id NAMED IN THE SAME COMPONENT TREE is the honest answer: those
   * are exactly the destinations this screen can produce.
   *
   * Not "every folder that exists": that would excuse a route nothing points
   * at, which is the one thing these guards are for.
   */
  if (sources.some((src) => DYNAMIC_VICE_STEP.test(src))) {
    for (const id of viceFlowIds()) out.add(viceArchiveStep(id))
  }
  return out
}

/** `viceArchiveStep(` with anything that is not a plain string in it. */
const DYNAMIC_VICE_STEP = /viceArchiveStep\(\s*(?!["'`])/

/**
 * The flow ids a dynamic `viceArchiveStep(...)` can produce, read from the type
 * that defines them. Add a flow and this picks it up; delete one and it stops
 * claiming a route that no longer exists. A hand-kept copy of the list here
 * would be a second place to forget.
 */
function viceFlowIds(): string[] {
  const src = fs.readFileSync(path.join(root, "src/vice/types.ts"), "utf-8")
  const union = src.match(/export type ViceFlowId\s*=\s*([^\n]+)/)
  if (!union) throw new Error("ViceFlowId is gone — this resolver needs updating")
  return [...union[1].matchAll(/"([\w-]+)"/g)].map((m) => m[1])
}

export function symbolicLinksIn(src: string): string[] {
  const found: string[] = []
  // The retired vice module keeps its own address, beside its pages.
  const archive =
    /(?:href=|[A-Za-z]*[Hh]ref\s*:\s*|\.push\(|\.replace\(|\bredirect\()\s*\{?\s*(QUIT_VICE_ARCHIVE\b|viceArchiveStep\(\s*["'`]([\w-]+)["'`]\s*\))/g
  for (const m of src.matchAll(archive)) {
    found.push(m[2] ? viceArchiveStep(m[2]) : QUIT_VICE_ARCHIVE)
  }
  const fromList =
    /(?:href=|[A-Za-z]*[Hh]ref\s*:\s*|\.push\(|\.replace\(|\bredirect\()\s*\{?\s*(?:`\$\{)?ROUTES\.(\w+)/g
  for (const m of src.matchAll(fromList)) {
    const value = (ROUTES as Record<string, string>)[m[1]]
    if (value) found.push(value)
  }
  return found
}

/**
 * ROUTES THE APP PUSHES YOU INTO, which are gates rather than sub-pages.
 *
 * `/preferences` is the case that forced this: the dashboard itself redirected
 * there until onboarding was finished, so a "back to Dashboard" control on it
 * would bounce straight back, a loop rather than a way out. `/auth/login` is
 * the same shape. Derived by looking for `redirect("<route>")` or
 * `redirect(ROUTES.x)` anywhere in the product, so a new gate exempts itself
 * the moment something redirects into it. A page redirecting to itself is a
 * shim, not a gate.
 */
export function gateRoutes(): Set<string> {
  const found = new Set<string>()
  for (const file of productFiles()) {
    const src = fs.readFileSync(file, "utf-8")
    for (const m of src.matchAll(/redirect\((?:"(\/[^"]*)"|ROUTES\.(\w+))\)/g)) {
      const raw = m[1] ?? (ROUTES as Record<string, string>)[m[2]]
      if (!raw) continue
      const target = normalize(raw)
      const here = routeOfDir(path.dirname(file))
      if (target && target !== here) found.add(target)
    }
  }
  return found
}

/**
 * Blank out comments so a doc comment naming a path is not a violation. Prose
 * about where something lives is how this codebase explains itself; the rules
 * that use this are about links, not sentences.
 */
export function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
}

/**
 * DOES THIS SOURCE WRITE THIS EXACT PATH AS TEXT?
 *
 * The boundary is the whole point. A bare prefix check reported
 * `app/test/page.tsx` for linking `/test/life-mastery-v1` when the path being
 * looked for was `/test/life-mastery`, a real, separate page, and a false
 * accusation that would have taught the next person to distrust the guard. So
 * a hit must END where the path ends: at the closing quote, or at a `/`, `?`
 * or `#` that starts a segment, query or fragment BELOW it, which is a link to
 * the same page and equally wrong to write by hand.
 *
 * Every quote, not just the double one: a path inside a template literal is
 * exactly how a link carrying a query gets written.
 */
export function writesPath(src: string, target: string): boolean {
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`["'\`]${escaped}(?=["'\`?#/]|\\$\\{)`).test(src)
}

/**
 * DOES THIS PAGE SHOW THE APP'S OWN NAVIGATION?
 *
 * Since `Plans/site-structure.md` Phase 3 the header and the tab bar are drawn
 * once, by `app/(app)/layout.tsx`, around every page inside that folder, except
 * on the addresses in `HIDDEN_ROUTE_PREFIXES`, which draw their own top and
 * bottom controls. A page no longer mounts the bar itself, so following its
 * imports for `<MobileTabBar` would call every page frameless.
 */
export function hasAppFrame(route: string, file: string, hiddenPrefixes: readonly string[]): boolean {
  const inGroup = rel(file).startsWith("app/(app)/")
  const hidden = hiddenPrefixes.some((p) => route === p || route.startsWith(p.endsWith("/") ? p : `${p}/`))
  return inGroup && !hidden
}

/**
 * A URL PATTERN FOR A PAGE, BUILT FROM ITS ROUTE-LIST VALUE.
 *
 * Browser tests waited for `/\/dashboard\/tracking$/`, an address typed out as
 * a regex, so moving a page meant hunting regexes as well as strings. This
 * builds the same pattern from `ROUTES.x`: `urlOf(ROUTES.tracking, "$")`. The
 * tail is regex source, for what follows the address (`$`, `(?!/live)`).
 */
export function urlOf(address: string, tail = ""): RegExp {
  return new RegExp(address.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&") + tail)
}
