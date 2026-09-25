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
 *
 * ONE OCCURRENCE THIS FILE HAS SEEN AND COULD NOT EXPLAIN, recorded so the next
 * person neither panics nor shrugs. On 2026-09-24
 * `/life-mastery/quit-vice/learn` failed with "the server rendered HTML didn't
 * match the client" in one full three-project run, and has not been seen since:
 * not in 24 dedicated runs of that route across all three engines, and not in
 * two further full sweeps. `useHelpLocale` and `LearnPage` were read for the
 * usual causes — a locale or timezone guess, `Math.random`, a `new Date`, a
 * `localStorage` read during render — and have none; that hook deliberately
 * starts at `null` and reads storage in an effect.
 *
 * What was unusual was the run, not the page: `webServer` below is
 * `npm run dev` locally, where every route compiles on first request, and that
 * run had three browsers pulling 28 addresses through the compiler at once.
 * Under `CI` the same config builds and serves production, where nothing
 * compiles mid-hydration — so this cannot be the same condition there.
 *
 * THE COLD COMPILER WAS THEN SAMPLED, and is clean. `daygame-coach-9f` built
 * the experiment in a throwaway worktree on its own port, so the shared dev
 * server was never disturbed: build directory wiped, then all eleven Life
 * Mastery and vice routes pulled through the compiler by three engines at once
 * with nothing precompiled — 33 loads — plus 15 more where the first request
 * ever made to `/learn` was three concurrent ones, each round after touching a
 * file in its tree, `BackLink.tsx` among them. **48 cold loads, 0 hydration
 * messages.** That round matters most: touching `BackLink` forces the subtree
 * that is the only structural candidate to recompile, so it is evidence
 * against the leading hypothesis rather than for it.
 *
 * WHERE THAT LEAVES IT: one failure in roughly 740 loads, across three
 * engines, empty and populated storage, with and without a `?from=` return
 * address, warm and cold. The cold hypothesis is not dead — 48 loads against a
 * fault seen once is a weak instrument and nobody should read it as a
 * refutation — but "nobody has tried the cold path" is no longer true of it.
 *
 * So: a reason to watch, not a verdict. If it returns it is real, and the
 * message is captured whole now (see `coldOpen.ts`, which used to keep only
 * the first 200 characters and threw the component stack away). The stack
 * either names `BackLink` or it does not, and one occurrence then settles what
 * 740 loads could not.
 */

import { test, expect } from "@playwright/test"
import { staticRoutes } from "../../support/appRoutes"
import {
  openCold,
  expectPageExists,
  expectNoHydrationFailure,
  expectNoNestedControls,
} from "../helpers/coldOpen"

/**
 * THE ROUTE LIST HAS ONE OWNER, AND IT IS NOT THIS FILE.
 *
 * `staticRoutes()` in `tests/support/appRoutes.ts` walks `app/`, skips `api`
 * and `app/test`, and drops `[id]` routes a browser cannot open without an id.
 * `route-sweep.spec.ts` beside this file has used it since 2026-09-07.
 *
 * WRITTEN DOWN BECAUSE I GOT IT WRONG FIRST, TWICE OVER. The first version of
 * this sweep hand-typed 28 addresses — on the night `quit-vice.spec.ts` was
 * found to have been driving the wrong page for four days because ITS
 * hand-typed constant had outlived a route move. I then replaced the list with
 * a walk of `app/` I wrote myself, and a ratchet of my own asserting the walk
 * found something, both of which already existed in `appRoutes.ts` and in
 * `route-sweep.spec.ts`'s "the sweep actually covers the app". So "what are
 * this app's addresses" briefly had two owners, and the second one was written
 * by someone congratulating himself for not typing a list.
 *
 * WHY THIS IS STILL A SEPARATE FILE from `route-sweep.spec.ts`, which also
 * opens every page on every device. That sweep asks whether a page is USABLE —
 * overflow, scroll traps, tap targets, junk parameters — and carries a debt
 * file of known offenders per route. These two questions are different in kind:
 * a hydration failure is not a degree of unusable, it is the server's markup
 * being thrown away, and it has no per-route debt because no route may have
 * any. Merging them would mean one red route hiding the other class entirely.
 */

/**
 * Not swept, each for a reason that is about the route and not about
 * convenience. Every one of these is asserted to still exist below: an
 * exclusion whose page is gone is a line that silences a sweep for a route that
 * could come back at that address.
 *
 * TWO MORE ARE MISSING AND ARE NOT IN THIS LIST, which is worth saying out loud
 * because nothing else would ever mention them. `staticRoutes()` drops routes
 * with a `[param]` segment, since a browser cannot open one without a real id,
 * so these two product pages are outside this sweep entirely:
 *
 *     /dashboard/tracking/session/[id]
 *     /programs/workout/[id]
 *
 * A workout receipt and a session detail are both pages people land on from a
 * link, and neither has ever been opened cold by anything. Closing that needs a
 * fixture that creates a row and sweeps its id — which means writing, so it does
 * not belong in a read-only sweep. `programs-past-workout.spec.ts` drives the
 * receipt as part of its flow, so it is not unvisited, only unswept.
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

const ON_DISK = staticRoutes().map((r) => r.route)
const ROUTES = ON_DISK.filter((route) => !(route in NOT_SWEPT))

test("every exclusion from this sweep still exists", () => {
  /**
   * "The walk found nothing" is asserted by `route-sweep.spec.ts`'s "the sweep
   * actually covers the app", which runs in these same three projects off the
   * same `staticRoutes()`. One owner, so it is not re-asserted here.
   *
   * This is the half that is this file's own: an exclusion whose page has gone
   * is a line that silences a sweep for whatever gets built at that address
   * next, and nothing else would ever mention it.
   */
  const gone = Object.keys(NOT_SWEPT).filter((route) => !ON_DISK.includes(route))
  expect(
    gone,
    "These are excluded from the cold-open sweep but no longer exist in app/. " +
      "Remove them — an exclusion for a deleted page silences this sweep for " +
      `whatever is built at that address next:\n${gone.join("\n")}`
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
