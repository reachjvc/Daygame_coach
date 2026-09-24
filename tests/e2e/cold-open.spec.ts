/**
 * EVERY LIVE ROUTE, OPENED COLD.
 *
 * WHY A BROWSER AND NOT A REGEX. `tests/unit/architecture.test.ts` has two
 * static rules for this family — one for text that differs between the server
 * render and hydration, one for a `<Link>` wrapping a `<Button>`. Neither can
 * see the shape that actually took a page down.
 *
 * On 2026-09-24 `/programs` was found to have been failing hydration for weeks.
 * The cause was a `<button>` inside a `<button>`: `ProgramRow` rendered a
 * caller-supplied `right` prop inside the row's own button element, and the
 * HTML parser auto-closes the outer button when it meets the inner one — so the
 * server's tree and the browser's disagreed, React threw the tree away, and
 * every test in the suite stayed green. No scan of `ProgramRow.tsx` could have
 * found it. The nesting does not exist in any one file; it exists once a caller
 * passes the prop, in the DOM, at runtime. The only thing that knows is the
 * browser.
 *
 * That is what this file is: open each address the way a person does, listen to
 * the console, and ask the rendered document about control ancestry. It writes
 * nothing — every route here is a read, and `?autostart=true` must never be
 * appended to the session route, because that parameter is how a workout
 * starts.
 *
 * WHAT ONE LOAD PER ROUTE CAN AND CANNOT SETTLE, because this file would
 * otherwise be read as proving more than it does.
 *
 * A STRUCTURAL mismatch — the wrong tag inside the wrong tag — happens on every
 * load, so one load finds it and this sweep is the right owner. A TIMING one
 * does not. The Settings bug that started all of this rendered the clock to the
 * second and only failed when the second ticked between the server's render and
 * the browser's: measured at 1 cold load in 6, so a single pass reads it as
 * clean five times out of six. Absence is the one result a single sample cannot
 * establish.
 *
 * Loading every route six times to fix that would cost six times the runtime to
 * make an intermittent test slightly less intermittent, which is the wrong
 * trade. The timing class has a DETERMINISTIC owner instead: the rule in
 * `tests/unit/architecture.test.ts` that fails when a client component formats
 * `new Date()` into render position at all. It cannot be flaky because it never
 * opens a browser.
 *
 * So: static analysis owns "could this text differ", this file owns "did
 * anything actually nest or disagree". Neither owns the other, and a hydration
 * failure caught HERE is a bonus rather than the design.
 */

import * as fs from "fs"
import * as path from "path"
import { test, expect } from "@playwright/test"
import {
  openCold,
  expectPageExists,
  expectNoHydrationFailure,
  expectNoNestedControls,
} from "./helpers/coldOpen"

/**
 * READ OFF `app/`, NOT TYPED OUT — and that is the whole design of this list.
 *
 * The first version was a hand-written array of 28 addresses. It was written the
 * same night `tests/e2e/quit-vice.spec.ts` was found to have been driving the
 * wrong page for four days, because ITS hand-written constant had outlived a
 * route move. Writing the same shape immediately afterwards would have been
 * remarkable.
 *
 * Two ways a typed list rots, and this file would have had both:
 *
 *   a page is DELETED  — the sweep keeps asking for an address that now 404s,
 *                        and a 404 has no hydration error and no nested
 *                        control, so it reports a missing page as a healthy
 *                        one. `expectPageExists` closes that half; deriving the
 *                        list means the question stops being asked at all.
 *   a page is ADDED    — nobody edits this file, and the new screen is simply
 *                        never swept. Nothing anywhere would say so.
 *
 * Neither can happen now: `app/` is the only place a Next route comes from, so
 * a page that exists is swept and a page that does not is not asked for. There
 * is one session in this checkout planning to delete nine of these addresses
 * this week, and this file needs no edit when they do.
 */
const APP_DIR = path.resolve(__dirname, "../../app")

/**
 * Not swept, each for a reason that is about the route and not about
 * convenience. Every one of these is asserted to still exist below: an
 * exclusion whose page is gone is a line that silences a sweep for a route that
 * could come back at that address.
 */
const NOT_SWEPT: Record<string, string> = {
  "/": "the sales page, signed OUT — cold-open-signed-out.spec.ts owns it",
  "/auth/login": "signed-out flow, owned by cold-open-signed-out.spec.ts",
  "/auth/sign-up": "signed-out flow, owned by cold-open-signed-out.spec.ts",
  "/auth/sign-up-success": "signed-out flow, owned by cold-open-signed-out.spec.ts",
  "/auth/forgot-password": "signed-out flow, owned by cold-open-signed-out.spec.ts",
  "/auth/reset-password": "signed-out flow, owned by cold-open-signed-out.spec.ts",
  "/admin/ai-usage": "behind an admin key this account does not have",
  "/programs/live":
    "its whole purpose is an open workout. A sweep that has to start one is not a read, " +
    "and this account is shared",
  "/redirect": "a redirect shim with no page of its own",
  "/dashboard/goals/plan": "a redirect shim with no page of its own",
}

/** Every `page.tsx` under `app/`, as the address Next serves it at. */
function routesOnDisk(): string[] {
  const found: string[] = []
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        // `/api` is not a page, `/test` 404s in production by design, and a
        // `[param]` segment needs a real id this sweep has no way to invent.
        if (entry.name === "api" || entry.name === "test" || entry.name.startsWith("[")) continue
        walk(full)
      } else if (entry.name === "page.tsx") {
        const url = "/" + path.relative(APP_DIR, dir).split(path.sep).join("/")
        found.push(url === "/." ? "/" : url)
      }
    }
  }
  walk(APP_DIR)
  return found.sort()
}

const ON_DISK = routesOnDisk()
const ROUTES = ON_DISK.filter((route) => !(route in NOT_SWEPT))

test("the sweep covers every page in app/, and every exclusion still exists", () => {
  /**
   * A broken walk would return nothing and every route test below would simply
   * not exist — a suite that passes by asking nothing, which is the one outcome
   * no count can catch after the fact.
   */
  expect(ON_DISK.length, "routesOnDisk() found no pages, so the walk is broken").toBeGreaterThan(20)

  const gone = Object.keys(NOT_SWEPT).filter((route) => !ON_DISK.includes(route))
  expect(
    gone,
    "These are excluded from the sweep but no longer exist in app/. Remove them: " +
      "an exclusion for a deleted page silences this sweep for whatever is built " +
      `at that address next:\n${gone.join("\n")}`
  ).toEqual([])
})

/**
 * The routes that render a control inside another control, and may.
 *
 * All of them are `<Link>` wrapping `<Button>` on the tracking screens — a
 * `<button>` inside an `<a>`. Measured on 2026-09-24: that shape does NOT break
 * hydration, because the parser does not auto-close an `<a>` for a nested
 * `<button>` the way it does for a nested `<button>`. It is invalid HTML and
 * two nested controls to a screen reader, held here until the wording-and-UX
 * pass those screens are already due.
 *
 * THIS IS AN UPPER BOUND ON WHICH ROUTES, NOT A COUNT, and it deliberately has
 * no only-shrinks companion — which every other allowlist in this repo carries.
 * The reason: what a browser counts depends on the account's data. Three logged
 * sessions put three "Edit"/"Report" pairs on the tracking page and an empty
 * account puts none, so a count here would go red for a fresh account rather
 * than for a defect. Counts are owned where they are deterministic —
 * `NESTED_CONTROL_DEBT` in `tests/unit/architecture.test.ts`, per file, off the
 * source. This file owns the question no file can answer: does anything nest at
 * runtime, anywhere else.
 */
const MAY_NEST = new Set(["/dashboard/tracking", "/dashboard/tracking/history"])

for (const route of ROUTES) {
  test(`opens clean: ${route}`, async ({ page }) => {
    const result = await openCold(page, route)

    expectPageExists(route, result)
    expectNoHydrationFailure(route, result)

    // Checked against where it LANDED as well as where it was sent, so a route
    // that redirects onto an allowed one is not reported for its destination's
    // debt.
    if (!MAY_NEST.has(result.landedOn) && !MAY_NEST.has(route)) {
      expectNoNestedControls(route, result)
    }
  })
}
