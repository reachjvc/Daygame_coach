/**
 * THE BROWSER SWEEPS' RATCHETS, WHERE THEY CAN RUN WITHOUT A BROWSER.
 *
 * Every sweep under `tests/e2e/sweep/` and `cold-open-signed-out.spec.ts`
 * derives its pages from `tests/support/appRoutes.ts`, so a new page is swept
 * the day it exists. The risk of a derived list is the opposite one: the walk
 * stops matching, the list comes back empty, the sweep generates no tests and
 * passes having opened nothing. Each sweep carried a ratchet against that — as
 * a Playwright test, which needed a browser project to start, a dev server to
 * answer, and three device projects to repeat a pure computation over files on
 * disk three times.
 *
 * They are the same assertions here, over the same functions, in `npm test`.
 * The one list a browser file still owns — the cold-open sweep's exclusions —
 * is imported from tests/support/notSwept.ts, which the spec imports too, so the two cannot drift.
 */

import { describe, test, expect } from "vitest"
import {
  JUNK_PARAM_VALUES,
  routesReadingSearchParams,
  searchParamNames,
  staticRoutes,
} from "@/tests/support/appRoutes"
import { NOT_SWEPT } from "@/tests/support/notSwept"

const ON_DISK = staticRoutes().map((r) => r.route)

/** The cold-open sweep's `NOT_SWEPT` keys, from the one list both read (tests/support/notSwept.ts). */
function coldOpenExclusions(): string[] {
  return Object.keys(NOT_SWEPT)
}

describe("the route sweeps cover the app", () => {
  test("the public sweep found the public pages", () => {
    // cold-open-signed-out.spec.ts: everything reachable without an account is
    // `/` and `/auth/*`. Six as of 2026-09-24; the floor sits below that so a
    // new auth page is not a failure, while the walk breaking is.
    const publicRoutes = ON_DISK.filter((route) => route === "/" || route.startsWith("/auth/"))
    expect(
      publicRoutes.length,
      `Only ${publicRoutes.length} public routes came back from staticRoutes(), so ` +
        `either the walk is broken or the sales page and the auth flow have moved.`,
    ).toBeGreaterThanOrEqual(5)
    expect(publicRoutes, "the sales page is the one page a stranger lands on").toContain("/")
  })

  test("every exclusion from the cold-open sweep still exists", () => {
    // An exclusion whose page has gone is a line that silences the sweep for
    // whatever gets built at that address next, and nothing else would mention it.
    const excluded = coldOpenExclusions()
    expect(excluded.length, "NOT_SWEPT was read as (nearly) empty — the reader no longer matches it").toBeGreaterThanOrEqual(6)
    const gone = excluded.filter((route) => !ON_DISK.includes(route))
    expect(
      gone,
      "These are excluded from the cold-open sweep but no longer exist in app/. " +
        "Remove them — an exclusion for a deleted page silences this sweep for " +
        `whatever is built at that address next:\n${gone.join("\n")}`,
    ).toEqual([])
  })

  test("the junk-URL sweep actually covers something", () => {
    // junk-params.spec.ts: if the source patterns stop matching, that sweep
    // silently tests nothing and passes — the exact failure it exists to catch.
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

  test("the route sweep actually covers the app", () => {
    // route-sweep.spec.ts and cold-open.spec.ts both open every one of these.
    expect(
      ON_DISK.length,
      "No routes were derived from app/. tests/support/appRoutes.ts has stopped " +
        "finding pages, and every sweep is now checking nothing.",
    ).toBeGreaterThanOrEqual(25)
  })
})
