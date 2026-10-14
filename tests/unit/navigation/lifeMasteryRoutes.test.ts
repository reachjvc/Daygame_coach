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

import { describe, it, expect, vi } from "vitest"
import * as fs from "fs"
import * as path from "path"
import {
  LIFE_MASTERY,
  QUIT_VICE,
  SUPERSEDED_LIFE_MASTERY_PATHS,
} from "../../../src/shared/lifeMasteryRoutes"
import { QUIT_VICE_ARCHIVE } from "../../../app/test/archive/quit-vice/routes"
import OldPlanPage from "../../../app/dashboard/goals/plan/page"

/** Where `redirect()` was asked to send the request; it throws, as Next's does. */
const redirected = vi.hoisted(() => [] as string[])
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    redirected.push(to)
    throw new Error("NEXT_REDIRECT")
  },
}))

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

/**
 * DOES THIS FILE WRITE THIS EXACT PATH AS A LINK?
 *
 * One matcher for both rules below, and the boundary is the whole point. A bare
 * prefix check reported `app/test/page.tsx` for linking `/test/life-mastery-v1`
 * when the path being looked for was `/test/life-mastery` — a real, separate
 * page (`app/test/life-mastery-v1/page.tsx`), and a false accusation that would
 * have taught the next person to distrust this file. `/life-mastery` sits one
 * rename away from the same collision with `/life-mastery-v1`.
 *
 * So a hit must END where the path ends: at the closing quote, or at a `/`, `?`
 * or `#` that starts a segment, query or fragment BELOW it, which is a link to
 * the same page and equally wrong to write by hand.
 *
 * Every quote, not just the double one — a path inside a template literal is
 * exactly how a link carrying a query gets written, and checking only `"` walks
 * straight past it.
 */
function writesPath(src: string, target: string): boolean {
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`["'\`]${escaped}(?=["'\`?#/]|\\$\\{)`).test(src)
}

describe("Life Mastery's address", () => {
  it("is not written out by hand anywhere in the product", () => {
    // The route folder under app/ is the one legitimate copy: the framework
    // reads the path off the filesystem, so it cannot come from a constant.
    const routeFolder = path.join(root, "app", LIFE_MASTERY.slice(1))
    const offenders = productFiles()
      .filter((f) => !f.startsWith(routeFolder))
      .filter((f) => f !== path.join(root, "src/shared/lifeMasteryRoutes.ts"))
      // The route list holds the same address while the two files are merged.
      .filter((f) => f !== path.join(root, "src/shared/routes.ts"))
      .filter((f) => writesPath(code(fs.readFileSync(f, "utf-8")), LIFE_MASTERY))
      .map((f) => path.relative(root, f))

    expect(
      offenders,
      `These write Life Mastery's path out as text. Import LIFE_MASTERY, QUIT_VICE\n` +
        `or viceArchiveStep from src/shared/lifeMasteryRoutes instead, so the next\n` +
        `stays a two-line change:\n${offenders.join("\n")}`
    ).toEqual([])
  })

  it("still has a page at the address the constant claims", () => {
    // A constant pointing at a folder that does not exist is a 404 that no
    // amount of importing it correctly will save you from.
    expect(fs.existsSync(path.join(root, "app", LIFE_MASTERY.slice(1), "page.tsx"))).toBe(true)
    expect(fs.existsSync(path.join(root, "app", QUIT_VICE.slice(1), "page.tsx"))).toBe(true)
    expect(fs.existsSync(path.join(root, "app", QUIT_VICE_ARCHIVE.slice(1), "page.tsx"))).toBe(true)
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
    expect(proxy).toMatch(/pathname\.startsWith\(ROUTES\.plan\)/)
  })

  it("is named by the service worker, which cannot import the constant", () => {
    /**
     * `public/sw.js` is a classic worker script served from the site root. It
     * cannot import from `src/`, so the one page of Life Mastery that is kept
     * for offline use is written out as a literal there — the same situation as
     * `proxy.ts`'s matcher above, and the same failure mode: rename the folder,
     * change the constant, and the worker goes on warming and answering an
     * address that 404s. Nobody would see it, because the symptom is only that
     * the page stops opening without a connection, which is the one condition
     * nobody tests by accident.
     */
    const worker = fs.readFileSync(path.join(root, "public/sw.js"), "utf-8")
    expect(
      worker.includes(`"${QUIT_VICE}"`),
      `public/sw.js's SHELL_PATHS does not name ${QUIT_VICE}, so the Black Box\n` +
        `would no longer open without a connection. Update the list there.`
    ).toBe(true)

    // And it must be the front door, never the old hub: the hub is nine routes
    // of browser-only state with no reason to be reachable offline, and
    // `SHELL_PATHS` is deliberately short.
    expect(worker.includes(`"${QUIT_VICE_ARCHIVE}"`)).toBe(false)
  })

  it("keeps the old address working: it redirects to Life Mastery, step and all", async () => {
    // Six places in the app linked to /dashboard/goals/plan and people
    // bookmarked it. Tidying up is not a reason to break somebody's bookmark.
    // Runs the page, rather than reading it for the word `redirect`.
    redirected.length = 0
    await expect(OldPlanPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_REDIRECT")
    await expect(
      OldPlanPage({ searchParams: Promise.resolve({ step: "today" }) })
    ).rejects.toThrow("NEXT_REDIRECT")
    expect(redirected).toEqual([LIFE_MASTERY, `${LIFE_MASTERY}?step=today`])
  })

  /**
   * AND NOBODY LINKS TO THE OLD ADDRESS ON PURPOSE.
   *
   * The first test in this file forbids hand-writing the CURRENT path. That is
   * half the rule, and on 2026-09-26 the missing half cost a real regression:
   * merging `main` restored `<Link href="/dashboard/goals/plan">` in
   * `src/inner-game/components/GoalsTab.tsx`. `main` carries no
   * `app/life-mastery/` at all, so it had hardcoded the old address in order to
   * build, and the merge brought that back as a clean auto-merge — no conflict
   * to look at, and all 6,103 unit tests green, because every guard here greps
   * for the literal `LIFE_MASTERY` and this is a different string.
   *
   * The redirect means it still works, which is exactly why nothing caught it.
   * A test that only fires when the screen breaks is not the guard; it becomes
   * a dead link the day the redirect is retired, and the compiler will not say
   * a word about it then either.
   */
  it("is not reached through an address it has already left", () => {
    // The route folder that IS the old path owns it — the framework reads that
    // one off the filesystem — and so does the list itself.
    const owners = SUPERSEDED_LIFE_MASTERY_PATHS.map((p) => path.join(root, "app", p.slice(1)))
    const offenders: string[] = []

    for (const file of productFiles()) {
      if (owners.some((dir) => file.startsWith(dir))) continue
      if (file === path.join(root, "src/shared/lifeMasteryRoutes.ts")) continue
      if (file === path.join(root, "src/shared/routes.ts")) continue
      const src = code(fs.readFileSync(file, "utf-8"))
      for (const stale of SUPERSEDED_LIFE_MASTERY_PATHS) {
        if (writesPath(src, stale)) {
          offenders.push(`${path.relative(root, file)} -> ${stale}`)
        }
      }
    }

    expect(
      offenders,
      `These link to an address Life Mastery has already left. It still answers,\n` +
        `as a redirect kept for old bookmarks, so nothing looks broken — import\n` +
        `LIFE_MASTERY from src/shared/lifeMasteryRoutes instead:\n${offenders.join("\n")}`
    ).toEqual([])
  })
})
