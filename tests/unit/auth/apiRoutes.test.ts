/**
 * THE LIST OF PUBLIC API ROUTES MUST NOT GO STALE.
 *
 * tests/e2e/sweep/api-signed-out.spec.ts asks every route as a stranger and
 * lets PUBLIC_API routes answer something other than a refusal. An entry whose
 * route file is gone, or whose method is no longer exported, would silently
 * excuse nothing today and the wrong thing tomorrow.
 */

import { describe, test, expect } from "vitest"
import { apiRoutes, concretePath, exportedMethods, PUBLIC_API } from "../../support/apiRoutes"

describe("PUBLIC_API", () => {
  const routes = apiRoutes()

  test("finds the routes on disk, with methods", () => {
    expect(routes.length).toBeGreaterThan(100)
    expect(routes.every((r) => r.methods.length > 0), "a route file exports no method this sweep knows").toBe(true)
  })

  test("every entry names a route file and a method it still exports", () => {
    const stale = PUBLIC_API.filter((p) => !routes.find((r) => r.route === p.route)?.methods.includes(p.method)).map(
      (p) => `${p.method} ${p.route}`,
    )
    expect(stale, "PUBLIC_API entries with no matching route file or exported method").toEqual([])
  })

  test("every entry says why and what a stranger gets", () => {
    for (const p of PUBLIC_API) {
      expect(p.reason.length, `${p.method} ${p.route} reason`).toBeGreaterThan(10)
      expect(p.answers.length, `${p.method} ${p.route} answers`).toBeGreaterThan(0)
    }
    const keys = PUBLIC_API.map((p) => `${p.method} ${p.route}`)
    expect(new Set(keys).size, "duplicate entry").toBe(keys.length)
  })

  test("reads the export shapes Next.js allows", () => {
    expect(exportedMethods("export async function GET() {}\nexport const POST = async () => {}")).toEqual(["GET", "POST"])
    expect(exportedMethods("const PUT = 1\nexport { PUT, handler as DELETE }")).toEqual(["PUT", "DELETE"])
    expect(exportedMethods("export const dynamic = 'force-dynamic'")).toEqual([])
  })

  test("fills dynamic, catch-all and optional catch-all segments", () => {
    expect(concretePath("/api/a/[id]/b/[...rest]/[[...opt]]", "X")).toBe("/api/a/X/b/X/X")
  })
})
