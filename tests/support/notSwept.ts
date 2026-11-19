import { ROUTES as PAGES } from "@/src/shared/routes"

/**
 * Not swept, each for a reason that is about the route and not about
 * convenience. Every one of these is asserted to still exist by
 * `tests/unit/navigation/sweepCoverage.test.ts`, and every page that answers 404
 * on purpose must be here or in the list below
 * (`gatedPagesAreNotSwept.test.ts`). An exclusion whose page is
 * gone is a line that silences a sweep for a route that could come back at
 * that address.
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
export const NOT_SWEPT: Record<string, string> = {
  "/": "the sales page, signed OUT — cold-open-signed-out.spec.ts owns it",
  "/auth/login": "signed-out flow, owned by cold-open-signed-out.spec.ts",
  "/auth/sign-up": "signed-out flow, owned by cold-open-signed-out.spec.ts",
  "/auth/sign-up-success": "signed-out flow, owned by cold-open-signed-out.spec.ts",
  "/auth/forgot-password": "signed-out flow, owned by cold-open-signed-out.spec.ts",
  "/auth/reset-password": "signed-out flow, owned by cold-open-signed-out.spec.ts",
  "/admin/ai-usage": "behind an admin key this account does not have",
  [PAGES.liveWorkout]:
    "its whole purpose is an open workout, and a sweep that has to start one is not a read. " +
    "route-sweep.spec.ts opens it on an account with none",
  "/redirect": "a redirect shim with no page of its own",
  [PAGES.planSandbox]:
    "answers 404 by design to an account without a copy space, like this one; " +
    "plan-sandbox.spec.ts opens it on an account that has one and checks the 404 for one that has not",
  [PAGES.planNew]:
    "the same copy-space gate as /plan/sandbox; plan-new.spec.ts walks the first rebuild (/plan/new/first) and plan-new-sequence.spec.ts the real steps on an account that has one " +
    "and checks the 404 for one that has not",
  "/plan/new/role-models":
    "under the same copy-space gate as /plan/new, so it answers 404 to this account by design; " +
    "plan-new-sequence.spec.ts opens it on an account that has a copy space",
  "/quit/lab":
    "the owner's hidden review lab: answers 404 without ?preview=1 by design; " +
    "tests/e2e/quit/lab.spec.ts opens it with the flag and checks the 404 without it",
}

/**
 * Pages that call `notFound()` but only for bad input, so the sweep (which
 * sends none) still sees them render. Each needs a reason.
 */
export const NOT_FOUND_ONLY_ON_BAD_INPUT: Record<string, string> = {
  "/quit/coaching":
    "answers 404 only in a production build without ?preview=1 (previewAllowed); in the dev/test server the sweep runs against it renders",
}
