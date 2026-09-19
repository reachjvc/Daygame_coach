/**
 * THE BAR MUST EXIST WHERE THE BAR SENDS YOU.
 *
 * `MobileTabBar` is mounted per page, not in a root layout. So "Training" —
 * one of the five tabs in the bar — sent people to `/programs`, the one
 * destination in the app that rendered no bar at all. The way back out
 * disappeared the moment you used it, and the only route left was the browser's
 * Back button.
 *
 * WHY IT WALKS IMPORTS rather than grepping for the string. A page mounts the
 * bar through the components it pulls in — `<MobileTabBar />` is usually three
 * files down, and often behind a `lazy(() => import(...))`. Grepping the page
 * file would report every one of them as missing.
 *
 * A route may opt out, but only by SAYING SO in `HIDDEN_ROUTE_PREFIXES` —
 * which is why that list moved out of the bar's own file, where nothing could
 * read it.
 */

import { describe, it, expect } from "vitest"
import * as fs from "fs"
import * as path from "path"
import { TABS, HIDDEN_ROUTE_PREFIXES } from "@/components/navTabs"

const root = path.resolve(__dirname, "../../..")
/** Deep enough to reach a bar mounted inside a screen inside a page. */
const TREE_DEPTH = 4

function resolveImport(spec: string, from: string): string | null {
  let p: string
  if (spec.startsWith("@/")) p = path.join(root, spec.slice(2))
  else if (spec.startsWith("./") || spec.startsWith("../")) p = path.resolve(path.dirname(from), spec)
  else return null
  for (const cand of [p + ".tsx", p + ".ts", path.join(p, "index.ts"), path.join(p, "index.tsx")]) {
    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) return cand
  }
  return null
}

/** Every file a page pulls in, following lazy imports too. */
function componentTree(file: string): string[] {
  const seen = new Set<string>()
  const visit = (f: string, depth: number) => {
    if (depth < 0 || seen.has(f)) return
    seen.add(f)
    let src: string
    try {
      src = fs.readFileSync(f, "utf-8")
    } catch {
      return
    }
    for (const m of src.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)) {
      const next = resolveImport(m[1], f)
      if (next) visit(next, depth - 1)
    }
  }
  visit(file, TREE_DEPTH)
  return [...seen]
}

/** The page file behind a route, or null when the route is dynamic. */
function pageFor(route: string): string | null {
  const file = path.join(root, "app", route.replace(/^\//, ""), "page.tsx")
  return fs.existsSync(file) ? file : null
}

function mountsTheBar(pageFile: string): boolean {
  return componentTree(pageFile).some((f) => {
    // The bar's own file does not count as mounting itself.
    if (f.endsWith("components/MobileTabBar.tsx")) return false
    const src = fs.readFileSync(f, "utf-8")
    // The rendered element, not the import line — an unused import is not a bar.
    return /<MobileTabBar[\s/>]/.test(src)
  })
}

describe("every tab destination renders the bar", () => {
  it("each of the five tabs lands somewhere the bar exists", () => {
    const missing: string[] = []
    for (const tab of TABS) {
      if (HIDDEN_ROUTE_PREFIXES.some((p) => tab.href.startsWith(p))) continue
      const page = pageFor(tab.href)
      // A tab pointing at a route with no page is a different fault, and
      // `routeReachability` owns it. Not silently skipped: named here.
      expect(page, `${tab.href} has no page.tsx`).not.toBeNull()
      if (page && !mountsTheBar(page)) missing.push(tab.href)
    }
    expect(
      missing,
      "the bar sends people here and then is not there — the way back out vanishes"
    ).toEqual([])
  })

  it("the live workout screen opts out in writing, because RestBar owns that edge", () => {
    // A rest countdown you cannot see because a nav bar sits over it is the
    // one thing that screen exists to show.
    expect(HIDDEN_ROUTE_PREFIXES).toContain("/programs/live")
  })

  it("premise: this test can tell a page that mounts the bar from one that does not", () => {
    /**
     * Without this, a broken `componentTree` would report every page as fine
     * and the guard above would pass for ever while protecting nothing.
     */
    const dashboard = pageFor("/dashboard")
    expect(dashboard).not.toBeNull()
    expect(mountsTheBar(dashboard!), "/dashboard has had the bar all along").toBe(true)

    const live = pageFor("/programs/live")
    expect(live).not.toBeNull()
    expect(mountsTheBar(live!), "/programs/live opts out, so it must NOT mount one").toBe(false)
  })
})
