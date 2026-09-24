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
 */

import { test } from "@playwright/test"
import { openCold, expectNoHydrationFailure, expectNoNestedControls } from "./helpers/coldOpen"

/**
 * The addresses from `docs/product/map.md`, minus the ones this sweep must not
 * or cannot open:
 *
 *   /auth/*, /                signed OUT flows; this project is signed in
 *   /programs/live            its whole purpose is an open workout, and a
 *                             sweep that has to create one is not a read
 *   /admin/ai-usage           behind an admin gate
 *   /redirect, /dashboard/goals/plan
 *                             redirect shims with no page of their own
 */
const ROUTES = [
  "/dashboard",
  "/dashboard/articles",
  "/dashboard/inner-game",
  "/dashboard/qa",
  "/dashboard/scenarios",
  "/dashboard/settings",
  "/dashboard/time",
  "/dashboard/tracking",
  "/dashboard/tracking/daily",
  "/dashboard/tracking/history",
  "/dashboard/tracking/report",
  "/dashboard/tracking/review",
  "/dashboard/tracking/session",
  "/life-mastery",
  "/life-mastery/quit-vice",
  "/life-mastery/quit-vice/experiment",
  "/life-mastery/quit-vice/gives",
  "/life-mastery/quit-vice/learn",
  "/life-mastery/quit-vice/line",
  "/life-mastery/quit-vice/map",
  "/life-mastery/quit-vice/old",
  "/life-mastery/quit-vice/shortlist",
  "/life-mastery/quit-vice/week",
  "/life-mastery/quit-vice/where",
  "/preferences",
  "/preferences/archetypes",
  "/programs",
  "/qa",
]

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

    expectNoHydrationFailure(route, result)

    // Checked against where it LANDED as well as where it was sent, so a route
    // that redirects onto an allowed one is not reported for its destination's
    // debt.
    if (!MAY_NEST.has(result.landedOn) && !MAY_NEST.has(route)) {
      expectNoNestedControls(route, result)
    }
  })
}
