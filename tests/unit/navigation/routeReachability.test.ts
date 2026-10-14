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
import { gateRoutes, isRedirectShim, linksIn, productRoutes, symbolicLinksIn } from "@/tests/support/appRoutes"
import { ROUTES } from "@/src/shared/routes"

const root = path.resolve(__dirname, "../../..")

/** How far to follow imports out of a page before calling it someone else's screen. */
const TREE_DEPTH = 6

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

  for (const { route, file } of productRoutes()) {
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
    expect(productRoutes().length).toBeGreaterThan(15)
    expect(mustReach.length).toBeGreaterThan(3)
  })

  it("every product route is reached from a page that is itself reached", () => {
    const reached = reachedRoutes()
    const orphans = mustReach.filter((r) => !reached.has(r))
    expect(
      orphans,
      `no way in to: ${orphans.join(", ")} — link it from a page people already reach, ` +
        `or remove it. A link in an unmounted component, or on a page that is itself an ` +
        `orphan, does not count.`
    ).toEqual([])
  })

  /**
   * NO LIVE PAGE SENDS ANYONE TO A BENCH PAGE.
   *
   * Everything under `/test` answers 404 in production on purpose
   * (`app/test/layout.tsx`) — those are workbenches, not product. So a link to
   * one from a page real users reach is a dead end on the deployed site, and it
   * looks perfectly fine in development, which is the only place it is ever
   * clicked during the work.
   *
   * It had already happened: the Training screen's own subtitle, "Part of your
   * Life Mastery plan", pointed at `/test/life-mastery`. Every user who tapped
   * it on the live site got a 404 — on the one link joining training to the
   * plan it belongs to.
   *
   * The exceptions are the quit-a-vice module, which has no live route yet.
   * They are listed one by one and the list may only shrink: giving it a real
   * route means deleting its lines from here.
   */
  const TEST_LINKS_ALLOWED = new Set([
    // Quit-a-vice used to be here, twice: it had no live route, so the plan's
    // routine card and the door beside it both pointed into the bench. It moved
    // to /life-mastery/quit-vice with the flow that links to it, and both lines
    // came off this list the same day. That is what this list is for.
    //
    // The header's "Test Pages" entry, which is pushed only inside
    // `if (process.env.NODE_ENV === "development")` — it does not exist in the
    // build real users get. Listed rather than taught to the detector, because
    // a detector that tries to evaluate build-time conditions would be guessing.
    "components/AppHeader.tsx",
  ])

  /**
   * A LINK BUILT OUT OF A CONSTANT IS STILL A LINK.
   *
   * `linksIn` above deliberately counts only `href=`, the router and
   * `redirect()`, because its job is to refuse a path that is merely mentioned.
   * That is right for reachability and wrong here: `viceHref: "/test/quit-vice"`
   * sits in a data file, is handed to a `<Link>` by the component that imports
   * it, and this test did not see it until the allowlist disagreed with the
   * detector. So this also counts a `/test` path assigned to anything named like
   * a destination.
   */
  const BENCH_DESTINATION = new RegExp(
    [
      // A JSX attribute: href="/test/x" or href={"/test/x"}. No space before the
      // `=`, which is what separates it from the next case.
      String.raw`href=\{?\s*["'\`]\/test`,
      // A named destination in an object or a constant: `viceHref: "/test/x"`.
      String.raw`[A-Za-z]*[Hh]ref\s*:\s*["'\`]\/test`,
    ].join("|")
  )

  /**
   * DELIBERATELY NOT `backHref = "/test"`.
   *
   * That shape is a DEFAULT for a prop, and three files have one: the flow and
   * the time-tracking shell are both mounted by a bench page with no argument
   * and by a live page that passes a real address, and the header's `/test`
   * entry is inside a `NODE_ENV === "development"` check. Flagging those would
   * be crying wolf, and a rule that cries wolf gets an allowlist entry rather
   * than a fix. What is flagged is a link that renders as written.
   */
  function linksToBench(file: string): boolean {
    if ([...linksIn([file])].some((l) => l === "/test" || l.startsWith("/test/"))) return true
    try {
      return BENCH_DESTINATION.test(fs.readFileSync(file, "utf-8"))
    } catch {
      return false
    }
  }

  /** Every product file that a live page can reach and that points at a bench page. */
  function benchLinkers(): Set<string> {
    const found = new Set<string>()
    for (const { route, file } of productRoutes()) {
      if (route.startsWith("/test")) continue
      for (const f of componentTree(file)) {
        const rel = path.relative(root, f)
        if (rel.startsWith("..")) continue
        if (linksToBench(f)) found.add(rel)
      }
    }
    return found
  }

  it("no page real users reach links to a /test page", () => {
    const offenders = [...benchLinkers()].filter((rel) => !TEST_LINKS_ALLOWED.has(rel))
    expect(
      offenders,
      "These link to a page that 404s in production. Point them at the live\n" +
        "route instead, or if there is genuinely no live equivalent yet, add the\n" +
        "file to TEST_LINKS_ALLOWED and say why:\n" +
        offenders.join("\n")
    ).toEqual([])
  })

  it("the /test-link detector actually sees the links it allows", () => {
    // Otherwise the allowlist is decorative and the rule below is vacuous.
    const found = benchLinkers()
    const invisible = [...TEST_LINKS_ALLOWED].filter((f) => !found.has(f))
    expect(
      invisible,
      `The detector cannot see these, so it would not catch a new one like them:\n${invisible.join("\n")}`
    ).toEqual([])
  })

  /**
   * A LINK FROM THE ROUTE LIST IS SEEN.
   *
   * Every page address now comes from `ROUTES` (src/shared/routes.ts). If the
   * resolver ever stopped reading those, every page would look like an orphan
   * and this file would fail; worse, a change to the pattern could make it read
   * an import line as a link. Both directions, checked on fixed text.
   */
  it("resolves a link written as a route-list entry", () => {
    expect(symbolicLinksIn("<Link href={ROUTES.settings}>")).toEqual([ROUTES.settings])
    expect(symbolicLinksIn("router.push(`${ROUTES.tracking}?tab=week`)")).toEqual([ROUTES.tracking])
    expect(symbolicLinksIn("redirect(ROUTES.plan)")).toEqual([ROUTES.plan])
    expect(symbolicLinksIn("{ label: \"Plan\", href: ROUTES.plan }")).toEqual([ROUTES.plan])
    expect(symbolicLinksIn('import { ROUTES } from "@/src/shared/routes"')).toEqual([])
    expect(symbolicLinksIn("const where = ROUTES.settings")).toEqual([])
  })

  it("counts only navigation, never a path that is merely named", () => {
    // ROUTE_LABELS names /programs, and named it throughout the time it was
    // unreachable. If this ever starts counting, the test has lost its teeth.
    const named = fs.readFileSync(path.join(root, "components/navTabs.ts"), "utf-8")
    expect(named).toContain('"/programs"')
    expect([...linksIn([path.join(root, "components/navTabs.ts")])]).not.toContain("/programs")
  })
})
