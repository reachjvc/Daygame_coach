/**
 * EVERY SCREEN HAS A WAY BACK.
 *
 * The failure this prevents: a page ships with no way off it. On a phone
 * installed to the home screen there is no browser chrome and no back button,
 * so a screen with no control of its own is a dead end — the only way out is
 * to close the app.
 *
 * The rule, and it is deliberately the weaker of the two possible ones: a route
 * needs a `BackLink` UNLESS the app's own navigation is on screen. The tab bar
 * is a way back — four destinations and a menu, always visible — so a page that
 * renders it is not stuck. Everything else has to say where it goes.
 *
 * Exemptions are DERIVED, never a list somebody maintains: a tab-bar
 * destination, a page that renders the bar, a bare `redirect()` shim with no
 * UI at all, or a pre-login page. Add a tab and its route exempts itself.
 */

import { describe, it, expect } from "vitest"
import * as fs from "fs"
import * as path from "path"
import { TAB_ROUTES } from "@/components/navTabs"

const root = path.resolve(__dirname, "../../..")

/** Every real route: app/**\/page.tsx, minus the prototypes under /test. */
function routePages(): { route: string; file: string }[] {
  const out: { route: string; file: string }[] = []
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === "test" && path.relative(root, full) === "app/test") continue
        if (entry.name === "api") continue
        walk(full)
      } else if (entry.name === "page.tsx") {
        const rel = path.relative(path.join(root, "app"), path.dirname(full))
        out.push({ route: "/" + rel.replace(/\\/g, "/"), file: full })
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
 * What a page's component tree mentions, two levels deep.
 *
 * Two rather than one because several pages import a slice's `index.ts` and the
 * screen itself is a level below that; two rather than all because following
 * every import reaches the whole app and every page would "have" everything.
 */
function mentions(file: string, depth = 2, seen = new Set<string>()): string {
  if (depth < 0 || seen.has(file)) return ""
  seen.add(file)
  let src: string
  try {
    src = fs.readFileSync(file, "utf-8")
  } catch {
    return ""
  }
  let all = src
  for (const m of src.matchAll(/from "([^"]+)"/g)) {
    const next = resolveImport(m[1], file)
    if (next && (next.includes("/components/") || next.endsWith("index.ts"))) {
      all += mentions(next, depth - 1, seen)
    }
  }
  return all
}

/**
 * ROUTES THE APP PUSHES YOU INTO, which are gates rather than sub-pages.
 *
 * `/preferences` is the case that forced this: the dashboard itself redirects
 * there until onboarding is finished, so a "back to Dashboard" control on it
 * would bounce straight back — a loop, not a way out. `/auth/login` is the same
 * shape. Derived by looking for `redirect("<route>")` anywhere in the app, so a
 * new gate exempts itself the moment something redirects into it.
 */
function gateRoutes(): Set<string> {
  const found = new Set<string>()
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === "node_modules") continue
        walk(full)
      } else if (/\.tsx?$/.test(entry.name)) {
        const src = fs.readFileSync(full, "utf-8")
        for (const m of src.matchAll(/redirect\("(\/[^"]*)"\)/g)) {
          const target = m[1].split("?")[0].replace(/\/$/, "")
          const here = "/" + path.relative(path.join(root, "app"), path.dirname(full)).replace(/\\/g, "/")
          // A page redirecting to itself is a shim, not a gate.
          if (target && target !== here) found.add(target)
        }
      }
    }
  }
  walk(path.join(root, "app"))
  walk(path.join(root, "src"))
  return found
}

/** A page whose whole job is `redirect(...)` has no UI to put a control on. */
function isRedirectShim(file: string): boolean {
  const src = fs.readFileSync(file, "utf-8")
  return /\bredirect\(/.test(src) && !/<[A-Za-z]/.test(src)
}

describe("every screen has a way back", () => {
  it("has routes to check", () => {
    expect(routePages().length).toBeGreaterThan(15)
  })

  it("every sub-page renders BackLink, or shows the tab bar", () => {
    const stuck: string[] = []
    const gates = gateRoutes()

    for (const { route, file } of routePages()) {
      if (TAB_ROUTES.includes(route)) continue
      // A gate, or a step inside one: /preferences is a gate, so
      // /preferences/archetypes is part of that same forced flow.
      if ([...gates].some((g) => route === g || route.startsWith(g + "/"))) continue
      // Pre-login. There is no "back" into an app you are not in yet.
      if (route.startsWith("/auth/")) continue
      if (isRedirectShim(file)) continue

      const tree = mentions(file)
      // `<BackLink`, not "BackLink": a leftover import satisfies the word and
      // renders nothing. Caught by deleting a usage and watching this pass.
      const hasBack = /<BackLink[\s/>]/.test(tree)
      const hasTabBar = /<MobileTabBar[\s/>]/.test(tree)
      if (!hasBack && !hasTabBar) stuck.push(route)
    }

    expect(stuck, `no way back from: ${stuck.join(", ")}`).toEqual([])
  })
})

/**
 * ONE BACK CONTROL, NOT THIRTEEN.
 *
 * Each hand-written one carried its own destination, so a screen sent you to
 * the same place however you got there — and two of them said "Back to
 * Dashboard" while pointing at Tracking. `BackLink` reads the return address
 * the link carried, which a copy in a component cannot do.
 *
 * Matches `<Link>` only. In-flow "previous step" controls are `<button>`, and
 * widening this to buttons would delete step navigation across the app.
 */
describe("back links are not hand-rolled", () => {
  /**
   * Call-to-action buttons at the end of a flow, on pages that already show
   * the tab bar. They are an offer to go somewhere, not the page's way back,
   * and they are styled as buttons rather than as a back control.
   */
  const ALLOWED = new Set([
    "src/scenarios/components/ScenariosPage.tsx",
    "src/inner-game/components/SummaryPage.tsx",
  ])

  it("only BackLink pairs a Link with a back arrow", () => {
    const offenders: string[] = []
    const pattern = /<Link\s[^>]*href="\/[^"]*"[^>]*>[\s\S]{0,400}?<(?:ArrowLeft|ChevronLeft)\b/g

    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        const rel = path.relative(root, full).replace(/\\/g, "/")
        if (entry.isDirectory()) {
          if (rel.startsWith("app/test") || rel.includes("node_modules")) continue
          walk(full)
        } else if (entry.name.endsWith(".tsx")) {
          if (rel === "components/BackLink.tsx" || ALLOWED.has(rel)) continue
          // The prototype pages under /test and their variant components are
          // not product and are deliberately out of scope.
          if (rel.includes("/old-variants/") || /Variant\d?\.tsx$/.test(rel)) continue
          const src = fs.readFileSync(full, "utf-8")
          if (pattern.test(src)) offenders.push(rel)
          pattern.lastIndex = 0
        }
      }
    }
    walk(path.join(root, "app"))
    walk(path.join(root, "src"))
    walk(path.join(root, "components"))

    // /test prototypes are excluded above by directory; anything left is product.
    const product = offenders.filter((f) => !f.includes("/test/") && !f.includes("life-mastery/") && !f.includes("life-direction/") && !f.includes("change-your-life/") && !f.includes("/vice/"))
    expect(product, `hand-rolled back links in: ${product.join(", ")}`).toEqual([])
  })
})
