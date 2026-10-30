/**
 * EVERY PAGE ADDRESS IS WRITTEN DOWN ONCE.
 *
 * Life Mastery moved twice (out of `/test/life-mastery`, where every page 404s
 * in production, and out of `/dashboard/goals/plan`) and each move was only
 * cheap because exactly one place said where it was. That rule now covers every
 * signed-in page: `src/shared/routes.ts` holds the addresses, and
 * `Plans/site-structure.md` moves most of them.
 *
 * Next.js decides routes by folder name, so a move is always two edits: rename
 * the folder under `app/`, and change the value in `src/shared/routes.ts`. This
 * test is what keeps it at two. The moment somebody writes "/dashboard/settings"
 * into a component by hand, the next move becomes a hunt through the codebase,
 * and the one they miss is a dead link that nobody notices until a user does.
 *
 * It replaced `lifeMasteryRoutes.test.ts`, which held the same rule for one
 * address and caught real drift with it (see the last test in this file).
 */

import { describe, it, expect } from "vitest"
import * as fs from "fs"
import * as path from "path"
import { ROUTES } from "../../../src/shared/routes"
import { QUIT_VICE_ARCHIVE } from "../../../app/test/archive/quit-vice/routes"
import { code, productRoutes, writesPath } from "../../support/appRoutes"

const root = path.resolve(__dirname, "../../..")
const ROUTE_LIST = path.join(root, "src/shared/routes.ts")
const ADDRESSES = Object.entries(ROUTES) as [string, string][]

/** Product code, including the lab pages under app/test (they link in too). */
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

describe("the route list", () => {
  it("is the only place a page address is written out", () => {
    const offenders: string[] = []
    for (const file of productFiles()) {
      if (file === ROUTE_LIST) continue
      const src = code(fs.readFileSync(file, "utf-8"))
      for (const [name, address] of ADDRESSES) {
        if (writesPath(src, address)) offenders.push(`${path.relative(root, file)} -> ${address} (ROUTES.${name})`)
      }
    }
    expect(
      offenders,
      `These write a page address out as text. Import ROUTES from src/shared/routes\n` +
        `instead, so the next move stays a two-line change:\n${offenders.join("\n")}`,
    ).toEqual([])
  })

  it("names only pages that exist", () => {
    // A value pointing at a folder that does not exist is a 404 that no amount
    // of importing it correctly will save you from.
    const served = new Set(productRoutes().map((r) => r.route))
    const missing = ADDRESSES.filter(([, address]) => !served.has(address)).map(([name]) => `ROUTES.${name}`)
    expect(missing).toEqual([])
  })

  // Whether the proxy guards every page is tested by what it does, in
  // proxyPrivateByDefault.test.ts: every page is private unless named public.

  it("is what the service worker keeps for offline, which cannot import it", () => {
    /**
     * `public/sw.js` is a classic worker script served from the site root. It
     * cannot import from `src/`, so the pages kept for offline use are written
     * out as literals there, and a move would leave the worker warming an
     * address that 404s. Nobody would see it: the symptom is only that the page
     * stops opening without a connection. It must also never name the retired
     * vice hub, nine routes of browser-only state with no reason to be offline.
     */
    const worker = fs.readFileSync(path.join(root, "public/sw.js"), "utf-8")
    const start = worker.indexOf("const SHELL_PATHS = [")
    expect(start, "public/sw.js no longer declares SHELL_PATHS").toBeGreaterThan(-1)
    const list = worker.slice(start, worker.indexOf("]", start))
    const named = list
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .flatMap((line) => [...line.matchAll(/"([^"]+)"/g)].map((m) => m[1]))
    expect(named).toEqual([ROUTES.time, ROUTES.quitVice, ROUTES.liveWorkout, ROUTES.thoughts])
    expect(named).not.toContain(QUIT_VICE_ARCHIVE)
  })

  /**
   * EVERY PAGE A SERVER ACTION REFRESHES EXISTS.
   *
   * `src/settings/actions.ts` refreshed `/scenarios` after a change of
   * difficulty: an address that never existed, so the Scenarios page went on
   * showing the old difficulty until a reload. Nothing caught it because the
   * argument was a plain string. Settings also kept its own copy of two
   * addresses for exactly these calls, and an indirection like that hides a dead
   * target from any check that only reads literals. So every argument must be a
   * route-list entry or a literal, and anything else fails by name.
   */
  it("refreshes only pages that exist", () => {
    const served = new Set(productRoutes().map((r) => r.route))
    const problems: string[] = []
    for (const file of productFiles()) {
      const src = code(fs.readFileSync(file, "utf-8"))
      for (const m of src.matchAll(/\brevalidatePath\(\s*([^),]*)/g)) {
        const arg = m[1].trim()
        const where = `${path.relative(root, file)}: revalidatePath(${arg})`
        const fromList = arg.match(/^ROUTES\.(\w+)$/)
        const literal = arg.match(/^["'`]([^"'`$]+)["'`]$/)
        const target = fromList ? (ROUTES as Record<string, string>)[fromList[1]] : literal?.[1]
        if (target === undefined) problems.push(`${where}: not a ROUTES entry or a literal`)
        else if (!served.has(target)) problems.push(`${where}: no page at ${target}`)
      }
    }
    expect(problems).toEqual([])
  })

  // Addresses that moved (Life Mastery's among them) are guarded by
  // legacyRoutes.test.ts: they redirect, and nothing in the product writes them.
})
