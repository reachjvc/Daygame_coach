/**
 * EVERY PAGE HAS A WAY IN — FROM A PAGE THAT ITSELF HAS A WAY IN.
 *
 * The failure this prevents: a finished, working page that nothing in the app
 * links to. `/programs` was it — thirteen cited training programs, a working
 * progression engine, session logging that fed the tracking dashboard's own
 * numbers, and the only way to open it was to type the URL. The page even said
 * so in its own comment and shipped anyway. Nobody noticed, because every test
 * it had passed: the route existed, the component rendered, the API worked.
 * Existing is not the same as being reachable.
 *
 * The sibling of `backNavigation.test.ts`, from the other end. That one asks
 * whether you can get OUT of a screen; this one asks whether you can get IN.
 *
 * TWO THINGS IT REFUSES TO ACCEPT AS A WAY IN, both of which a naive version of
 * this test is fooled by:
 *
 *   1. **A link in a component nothing renders.** Reachability is computed over
 *      each page's actual COMPONENT TREE — the files a page reaches by import —
 *      so a link sitting in an unmounted component counts for nothing. This is
 *      why it walks imports instead of grepping: a grep calls `/programs`
 *      linked the moment any file anywhere mentions it.
 *   2. **A link from a page that is itself unreachable.** Reachability is
 *      TRANSITIVE: a breadth-first walk from the doors into the app, following
 *      page → page links. Two orphans pointing at each other are still two
 *      orphans, and a route reached only from one of them is a third.
 *
 * And it refuses one more thing that is not navigation at all: a mere mention of
 * a path. `ROUTE_LABELS` in navTabs.ts names `/programs`, and named it the
 * entire time it was unreachable. Only `href=`, the router's push/replace and a
 * server `redirect()` count.
 *
 * THE DOORS — where the walk starts, every one derived, never a list:
 *   - the home page, and the tab-bar destinations (the bar is always on screen)
 *   - a gate the app redirects you into, and bare redirect shims
 *   - pre-login pages under /auth
 *   - a page that gates ITSELF behind the admin key: `/admin/ai-usage` shows
 *     nothing until `ADMIN_SECRET_KEY` is typed in, so it is opened by URL by
 *     one person on purpose. Derived from the page's own source rather than
 *     from its path, so a future `/admin/…` page WITHOUT that gate is not
 *     excused by sitting in the same folder.
 *   - dynamic routes, whose links are built with template strings
 *
 * WHAT IT STILL DOES NOT PROVE: that the link is on screen rather than behind a
 * condition, or that a human can find it. It proves a mounted page renders the
 * link. The rest needs a browser and a pair of eyes.
 */

import { describe, it, expect } from "vitest"
import * as fs from "fs"
import * as path from "path"
import { TAB_ROUTES } from "@/components/navTabs"

const root = path.resolve(__dirname, "../../..")

/** How far to follow imports out of a page before calling it someone else's screen. */
const TREE_DEPTH = 6

const rel = (file: string) => path.relative(root, file).replace(/\\/g, "/")

/** Files the app actually ships — the prototypes under /test are not product. */
function productFiles(): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (rel(full) === "app/test" || entry.name === "node_modules") continue
        walk(full)
      } else if (/\.tsx?$/.test(entry.name)) {
        out.push(full)
      }
    }
  }
  for (const dir of ["src", "components", "app"]) walk(path.join(root, dir))
  return out
}

/** Every real route: app/**\/page.tsx, minus the prototypes under /test. */
function routePages(): { route: string; file: string }[] {
  const out: { route: string; file: string }[] = []
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === "test" && rel(full) === "app/test") continue
        if (entry.name === "api") continue
        walk(full)
      } else if (entry.name === "page.tsx") {
        const dirRel = path.relative(path.join(root, "app"), path.dirname(full))
        out.push({ route: "/" + dirRel.replace(/\\/g, "/"), file: full })
      }
    }
  }
  walk(path.join(root, "app"))
  return out
}

/** Resolve an import specifier to a file we can read, or null. */
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

/**
 * Every file a page pulls in, so a link is attributed to the screen that
 * actually renders it.
 *
 * Follows both `from "…"` and the `import("…")` inside a lazy component — many
 * of the app's heavier panels are mounted that way, and skipping them would
 * report a mounted link as unmounted.
 */
function componentTree(file: string): Set<string> {
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
  return seen
}

/** Strip a query, a hash and a trailing slash — `/x?y=1` is a link to `/x`. */
function normalize(target: string): string {
  const bare = target.split("?")[0].split("#")[0]
  return bare.length > 1 ? bare.replace(/\/$/, "") : bare
}

/**
 * Where a set of files sends people.
 *
 * Only navigation, not any string that happens to be a path: `href=`, the
 * router's push/replace, and a server `redirect()`.
 */
function linksIn(files: Iterable<string>): Set<string> {
  const out = new Set<string>()
  const pattern = /(?:href=|\.push\(|\.replace\(|\bredirect\()\s*\{?\s*["'`](\/[^"'`${}]*)["'`]/g
  for (const file of files) {
    let src: string
    try {
      src = fs.readFileSync(file, "utf-8")
    } catch {
      continue
    }
    for (const m of src.matchAll(pattern)) out.add(normalize(m[1]))
  }
  return out
}

/** Routes the app pushes you into — a gate is entered, not linked. */
function gateRoutes(): Set<string> {
  const found = new Set<string>()
  for (const file of productFiles()) {
    const src = fs.readFileSync(file, "utf-8")
    for (const m of src.matchAll(/redirect\("(\/[^"]*)"\)/g)) {
      const target = normalize(m[1])
      const here = "/" + path.relative(path.join(root, "app"), path.dirname(file)).replace(/\\/g, "/")
      if (target && target !== here) found.add(target)
    }
  }
  return found
}

/** A page whose whole job is `redirect(...)` is a shim, not a destination. */
function isRedirectShim(file: string): boolean {
  const src = fs.readFileSync(file, "utf-8")
  return /\bredirect\(/.test(src) && !/<[A-Za-z]/.test(src)
}

/** A page that shows nothing until the admin key is typed in. */
function isAdminGated(tree: Set<string>): boolean {
  for (const file of tree) {
    let src: string
    try {
      src = fs.readFileSync(file, "utf-8")
    } catch {
      continue
    }
    if (/X-Admin-Key|ADMIN_SECRET_KEY/.test(src)) return true
  }
  return false
}

/** Route → the routes its rendered component tree links to, plus the doors. */
function buildGraph() {
  const gates = gateRoutes()
  const doors = new Set<string>()
  const edges = new Map<string, Set<string>>()
  const mustReach: string[] = []

  for (const { route, file } of routePages()) {
    const tree = componentTree(file)
    edges.set(route, linksIn(tree))

    // EXACTLY the redirect target, never its children. `/dashboard` is a
    // redirect target, so a prefix match would excuse every page under it and
    // this test would check almost nothing. A step inside a forced flow is
    // reached the ordinary way — the flow links to its own next step.
    const isGate = gates.has(route)
    if (
      route === "/" ||
      TAB_ROUTES.includes(route) ||
      route.startsWith("/auth/") ||
      route.includes("[") ||
      isGate ||
      isRedirectShim(file) ||
      isAdminGated(tree)
    ) {
      doors.add(route)
    } else {
      mustReach.push(route)
    }
  }
  return { doors, edges, mustReach }
}

describe("every page has a way in", () => {
  const { doors, edges, mustReach } = buildGraph()

  /** Breadth-first from the doors, following page → page links. */
  function reachedRoutes(graph: Map<string, Set<string>> = edges): Set<string> {
    const reached = new Set(doors)
    const queue = [...doors]
    while (queue.length) {
      const here = queue.shift()!
      for (const next of graph.get(here) ?? []) {
        if (!graph.has(next) || reached.has(next)) continue
        reached.add(next)
        queue.push(next)
      }
    }
    return reached
  }

  it("has routes to check", () => {
    expect(routePages().length).toBeGreaterThan(15)
    expect(mustReach.length).toBeGreaterThan(3)
  })

  it("every product route is reached from a page that is itself reached", () => {
    const reached = reachedRoutes()
    const orphans = mustReach.filter((r) => !reached.has(r))
    expect(
      orphans,
      `no way in to: ${orphans.join(", ")} — link it from a page people already reach, ` +
        `or remove it. A link in an unmounted component, or on a page that is itself an ` +
        `orphan, does not count. Known-failing entries (with the reason) live in ` +
        `.test-known-failures.json — check there before treating this as new`
    ).toEqual([])
  })

  it("a route linked only from an orphan is still an orphan", () => {
    // The transitive half, proved rather than asserted: hang a fake route off a
    // fake orphan and check the walk refuses to reach either.
    const graph = new Map(edges)
    graph.set("/fake-orphan", new Set(["/fake-child"]))
    graph.set("/fake-child", new Set())
    const reached = reachedRoutes(graph)
    expect(reached.has("/fake-orphan")).toBe(false)
    expect(reached.has("/fake-child")).toBe(false)
  })

  it("counts only navigation, never a path that is merely named", () => {
    // ROUTE_LABELS names /programs, and named it throughout the time it was
    // unreachable. If this ever starts counting, the test has lost its teeth.
    const named = fs.readFileSync(path.join(root, "components/navTabs.ts"), "utf-8")
    expect(named).toContain('"/programs"')
    expect([...linksIn([path.join(root, "components/navTabs.ts")])]).not.toContain("/programs")
  })
})
