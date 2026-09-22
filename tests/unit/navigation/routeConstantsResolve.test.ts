// @vitest-environment node
import { describe, it, expect } from "vitest"
import { existsSync, readdirSync } from "fs"
import { join } from "path"
import * as trainingRoutes from "@/src/shared/trainingRoutes"
import * as lifeMasteryRoutes from "@/src/shared/lifeMasteryRoutes"

/**
 * A NAMED ROUTE CONSTANT READS AS "BUILT" WHEN IT IS NOT.
 *
 * On 2026-09-19 `workoutReceipt()` existed in trainingRoutes.ts and the Tracking
 * card linked to it from its done-today state. There was no page behind it. The
 * app shipped a 404 behind a visible button for a day, and nothing caught it:
 * `backNavigation.test.ts` walks the pages that exist, so a route with no page
 * is invisible to it — the one test that could have noticed is the one that
 * cannot run until the mistake is already fixed.
 *
 * This walks the other way: from the constant to the filesystem.
 *
 * HOW IT HANDLES DYNAMIC ROUTES. A route function is called with a sentinel and
 * only its literal prefix is checked — `workoutReceipt(x)` gives
 * `/programs/workout/<sentinel>`, so the assertion is that `app/programs/workout/`
 * exists. Deliberately not stricter: checking the segment itself would mean
 * knowing which values are legal (`viceStep` takes step ids, not any string),
 * and that is an allowlist, which is the kind of test people switch off. The
 * weaker check still catches the failure that actually happened, because that
 * directory did not exist at all.
 */

const APP = join(process.cwd(), "app")

/** A route is served if the directory holds a page/route file, or a dynamic
 *  `[param]` child that does. Route groups `(name)` are not used here. */
function isServed(dir: string): boolean {
  if (!existsSync(dir)) return false
  const entries = readdirSync(dir, { withFileTypes: true })
  if (entries.some((e) => e.isFile() && /^(page|route)\.(ts|tsx)$/.test(e.name))) return true
  return entries.some((e) => e.isDirectory() && e.name.startsWith("[") && isServed(join(dir, e.name)))
}

const SENTINEL = "__dynamic__"

/** Every exported string, plus every exported function's literal prefix. */
function routesOf(mod: Record<string, unknown>, file: string): Array<[string, string, string]> {
  const out: Array<[string, string, string]> = []
  for (const [name, value] of Object.entries(mod)) {
    if (typeof value === "string" && value.startsWith("/")) {
      out.push([file, name, value])
    } else if (typeof value === "function" && value.length === 1) {
      const produced = (value as (s: string) => unknown)(SENTINEL)
      if (typeof produced === "string" && produced.includes(SENTINEL)) {
        out.push([file, name, produced.slice(0, produced.indexOf(SENTINEL))])
      }
    }
  }
  return out
}

const ROUTES = [
  ...routesOf(trainingRoutes, "src/shared/trainingRoutes.ts"),
  ...routesOf(lifeMasteryRoutes, "src/shared/lifeMasteryRoutes.ts"),
]

describe("every route constant has something behind it", () => {
  it("found the constants to check", () => {
    // Guards against the import shape changing and this file silently
    // asserting nothing — a green test over an empty list is the same lie.
    expect(ROUTES.length).toBeGreaterThanOrEqual(6)
  })

  it.each(ROUTES)("%s exports %s -> %s", (file, name, path) => {
    const dir = join(APP, path.replace(/^\/+|\/+$/g, ""))
    expect(
      isServed(dir),
      `${file} exports ${name}, which points at "${path}", but ${dir.replace(process.cwd() + "/", "")} ` +
        `serves nothing — no page.tsx, no route.ts, no dynamic [param] child.\n` +
        `A constant is not a page. Either build it, or do not name it yet.`,
    ).toBe(true)
  })
})
