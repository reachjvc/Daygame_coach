/**
 * LIFE MASTERY'S ADDRESS IS WRITTEN DOWN ONCE.
 *
 * It has moved twice now — out of `/test/life-mastery`, where every page 404s in
 * production, and out of `/dashboard/goals/plan`, where it sat three levels
 * inside the goals dashboard — and it is expected to move again. Each move is
 * only cheap if there is exactly one place that says where it is.
 *
 * Next.js decides routes by folder name, so a move is always two edits: rename
 * the folder under `app/`, and change the constant in
 * `src/shared/lifeMasteryRoutes.ts`. This test is what keeps it at two. The
 * moment somebody writes "/life-mastery" into a component by hand, the third
 * move becomes a hunt through the codebase, and the one they miss is a dead link
 * that nobody notices until a user finds it.
 */

import { describe, it, expect } from "vitest"
import * as fs from "fs"
import * as path from "path"
import { LIFE_MASTERY, QUIT_VICE, viceStep } from "../../../src/shared/lifeMasteryRoutes"

const root = path.resolve(__dirname, "../../..")

/** Product code. Not the route folders themselves, which ARE the path. */
function productFiles(): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (["node_modules", ".next", ".git", "coverage"].includes(entry.name)) continue
        walk(full)
      } else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
        out.push(full)
      }
    }
  }
  for (const dir of ["src", "app", "components"]) walk(path.join(root, dir))
  return out
}

/**
 * Blank out comments so a doc comment naming the path is not a violation.
 * Prose about where something lives is how this codebase explains itself; the
 * rule is about links, not sentences.
 */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
}

describe("Life Mastery's address", () => {
  it("is not written out by hand anywhere in the product", () => {
    // The route folder under app/ is the one legitimate copy: the framework
    // reads the path off the filesystem, so it cannot come from a constant.
    const routeFolder = path.join(root, "app", LIFE_MASTERY.slice(1))
    const offenders = productFiles()
      .filter((f) => !f.startsWith(routeFolder))
      .filter((f) => f !== path.join(root, "src/shared/lifeMasteryRoutes.ts"))
      // Every quote, not just the double one. A path written inside a template
      // literal is the exact shape a link that carries a query gets written in,
      // and a check for the double quote alone would walk straight past it.
      .filter((f) => new RegExp(`["'\`]${LIFE_MASTERY}`).test(code(fs.readFileSync(f, "utf-8"))))
      .map((f) => path.relative(root, f))

    expect(
      offenders,
      `These write Life Mastery's path out as text. Import LIFE_MASTERY, QUIT_VICE\n` +
        `or viceStep from src/shared/lifeMasteryRoutes instead, so the next move\n` +
        `stays a two-line change:\n${offenders.join("\n")}`
    ).toEqual([])
  })

  it("still has a page at the address the constant claims", () => {
    // A constant pointing at a folder that does not exist is a 404 that no
    // amount of importing it correctly will save you from.
    expect(fs.existsSync(path.join(root, "app", LIFE_MASTERY.slice(1), "page.tsx"))).toBe(true)
    expect(fs.existsSync(path.join(root, "app", QUIT_VICE.slice(1), "page.tsx"))).toBe(true)
  })

  it("has a page for every vice step the flows can reach", () => {
    const types = fs.readFileSync(path.join(root, "src/vice/types.ts"), "utf-8")
    const union = types.match(/export type ViceFlowId\s*=\s*([^\n]+)/)
    expect(union, "ViceFlowId is gone — this test needs updating").toBeTruthy()
    const ids = [...union![1].matchAll(/"([\w-]+)"/g)].map((m) => m[1])
    expect(ids.length).toBeGreaterThan(3)

    const missing = ids.filter(
      (id) => !fs.existsSync(path.join(root, "app", viceStep(id).slice(1), "page.tsx"))
    )
    expect(
      missing,
      `The vice hub can send somebody to these and there is no page there: ${missing.join(", ")}`
    ).toEqual([])
  })

  it("is gated by the proxy at the address the constant claims", () => {
    /**
     * The edge guard decides who may reach a route at all, and its matcher has
     * to be a literal — Next reads that list at build time and cannot evaluate
     * an import. So it is the one place the path is legitimately written out,
     * and the one place a move would silently leave behind: rename the folder,
     * change the constant, and every page under here would still load for
     * somebody who is not signed in until this line was noticed.
     */
    const proxy = fs.readFileSync(path.join(root, "proxy.ts"), "utf-8")
    expect(
      proxy.includes(`"${LIFE_MASTERY}/:path*"`),
      `proxy.ts's matcher does not cover ${LIFE_MASTERY}. Add "${LIFE_MASTERY}/:path*" to it.`
    ).toBe(true)
    // And the check inside, which is what actually turns anyone away.
    expect(proxy).toMatch(/pathname\.startsWith\(LIFE_MASTERY\)/)
  })

  it("keeps the old address working", () => {
    // Six places in the app linked to /dashboard/goals/plan and people
    // bookmarked it. Tidying up is not a reason to break somebody's bookmark.
    const shim = fs.readFileSync(path.join(root, "app/dashboard/goals/plan/page.tsx"), "utf-8")
    expect(shim).toMatch(/redirect\(/)
    expect(shim).toMatch(/LIFE_MASTERY/)
  })
})
