/**
 * EVERY API ROUTE REFUSES A STRANGER.
 *
 * `security-auth.spec.ts` asks 23 routes by hand; the app has 137 route files.
 * This asks every one, derived from disk (tests/support/apiRoutes.ts), with no
 * cookies: GET for reads, `{}` as JSON for writes, a made-up UUID for every
 * dynamic segment.
 *
 * Allowed: 401, 403, 404, 405. Never a 2xx (data for a stranger), never a 5xx
 * (a route that falls over before it checks who is asking). A 400 is a finding
 * too: the route read the body before it checked sign-in.
 *
 * A route a stranger may call on purpose is in PUBLIC_API with the exact
 * answers it gives; the test asserts those, so a public route that starts
 * leaking or failing goes red.
 *
 * KNOWN_FINDINGS: routes that fail and could not be fixed small. Each has a
 * reason; the test still runs them and goes red if one is fixed (so the entry
 * is removed) -- an entry never hides a route.
 */

import { randomUUID } from "node:crypto"
import { test, expect, SIGNED_OUT } from "../fixtures/test"
import { apiRoutes, concretePath, PUBLIC_API, WRITE_METHODS, type ApiMethod } from "../../support/apiRoutes"

test.use({ storageState: SIGNED_OUT })

const REFUSALS = [401, 403, 404, 405]

/** route + method -> reason it is not fixed yet. Empty on purpose. */
const KNOWN_FINDINGS: Record<string, string> = {}

test.describe("API routes, signed out", () => {
  // Each route compiles on first request under `next dev`.
  test.setTimeout(600_000)

  test("every route and method refuses a stranger", async ({ request }, testInfo) => {
    // The sweep runs on two device sizes; a server-side answer does not depend on the screen.
    test.skip(testInfo.project.name !== "sweep-desktop", "server answers only; one project is enough")

    const routes = apiRoutes()
    const pairs = routes.flatMap((r) => r.methods.map((method) => ({ ...r, method })))
    expect(routes.length, "route files found").toBeGreaterThan(100)
    expect(pairs.length, "route x method pairs found").toBeGreaterThan(routes.length)

    const publicOf = (route: string, method: ApiMethod) =>
      PUBLIC_API.find((p) => p.route === route && p.method === method)

    const id = randomUUID()
    const problems: string[] = []
    const seenKnown = new Set<string>()

    for (const { route, method } of pairs) {
      const url = concretePath(route, id)
      const response = (WRITE_METHODS as readonly string[]).includes(method)
        ? await request.fetch(url, { method, data: {}, maxRedirects: 0 })
        : await request.fetch(url, { method, maxRedirects: 0 })
      const status = response.status()
      const key = `${method} ${route}`
      const pub = publicOf(route, method)

      const ok = pub ? pub.answers.includes(status) : REFUSALS.includes(status)
      if (ok) continue
      if (KNOWN_FINDINGS[key]) {
        seenKnown.add(key)
        continue
      }
      const why = pub
        ? `public, expected ${pub.answers.join("/")}`
        : status === 400
          ? "400: reads the body before checking sign-in"
          : status >= 500
            ? "5xx: falls over before checking sign-in"
            : status >= 200 && status < 300
              ? "2xx: answers a stranger"
              : "unexpected"
      problems.push(`${key}: got ${status} (${why})`)
    }

    for (const key of Object.keys(KNOWN_FINDINGS)) {
      if (!seenKnown.has(key)) problems.push(`${key}: listed in KNOWN_FINDINGS but now answers correctly; remove the entry`)
    }

    testInfo.annotations.push({
      type: "checked",
      description: `${routes.length} route files, ${pairs.length} route x method pairs, ${PUBLIC_API.length} public`,
    })
    console.log(`api-signed-out: ${routes.length} route files, ${pairs.length} route x method pairs, ${PUBLIC_API.length} public`)
    expect(problems, "routes that answer a request carrying no session wrongly").toEqual([])
  })
})
