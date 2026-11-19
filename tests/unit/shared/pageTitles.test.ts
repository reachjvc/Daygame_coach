// @vitest-environment node
/**
 * R4. EVERY PAGE TITLE READS "<Page> · 10K Days Club" (docs/product/look.md).
 *
 * The root layout's template adds " · 10K Days Club"; each page names itself
 * through `metadata.title` (or `generateMetadata`), on the page or on a layout
 * above it. A `"use client"` page cannot export metadata, so it gets a sibling
 * `layout.tsx`. A page may keep the bare default only if it is on KEEP_DEFAULT.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { describe, expect, it } from "vitest"

const ROOT = resolve(__dirname, "../../..")
const APP = join(ROOT, "app")

/** Pages that keep the default title "10K Days Club", on purpose. */
const KEEP_DEFAULT = new Set([
  "app", // the front page is the brand
  "app/admin/ai-usage",
  "app/redirect",
  "app/auth/forgot-password",
  "app/auth/reset-password",
  "app/auth/sign-up-success",
])

/**
 * Pages whose titles land in Phases 5 and 6 of Plans/rebrand-10kdaysclub.md.
 * Each phase empties its share; when this set is empty, delete it.
 */
const TITLES_COME_LATER = new Set([
  "app/(app)/articles",
  "app/(app)/coach",
  "app/(app)/dashboard",
  "app/(app)/inner-game",
  "app/(app)/plan",
  "app/(app)/plan/new",
  "app/(app)/plan/new/[...slug]",
  "app/(app)/plan/quit-vice",
  "app/(app)/plan/sandbox",
  "app/(app)/scenarios",
  "app/(app)/scenarios/preferences",
  "app/(app)/scenarios/preferences/archetypes",
  "app/(app)/settings",
  "app/(app)/tools",
  "app/(app)/tracking",
  "app/(app)/tracking/daily",
  "app/(app)/tracking/history",
  "app/(app)/tracking/report",
  "app/(app)/tracking/review",
  "app/(app)/tracking/session",
  "app/(app)/tracking/session/[id]",
  "app/(app)/training",
  "app/(app)/training/live",
  "app/(app)/training/workout/[id]",
  "app/auth/login",
  "app/auth/sign-up",
])

function pageDirs(): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    const rel = relative(ROOT, dir).split("\\").join("/")
    if (rel === "app/test" || rel === "app/api" || rel.split("/").includes("lab")) return
    const entries = readdirSync(dir, { withFileTypes: true })
    if (entries.some((e) => e.name === "page.tsx")) out.push(rel)
    for (const e of entries) if (e.isDirectory()) walk(join(dir, e.name))
  }
  walk(APP)
  return out.sort()
}

function namesItself(file: string): boolean {
  if (!existsSync(file)) return false
  const s = readFileSync(file, "utf8")
  return /export\s+(const\s+metadata|async\s+function\s+generateMetadata|function\s+generateMetadata)/.test(s) && /\btitle\b/.test(s)
}

/** Its own page, or a layout between it and the root (the root's default does not count). */
function hasTitle(rel: string): boolean {
  if (namesItself(join(ROOT, rel, "page.tsx"))) return true
  for (let d = rel; d !== "app"; d = dirname(d)) if (namesItself(join(ROOT, d, "layout.tsx"))) return true
  return false
}

describe("R4: every page names itself", () => {
  it("the root layout adds the brand to every title", () => {
    const layout = readFileSync(join(APP, "layout.tsx"), "utf8")
    expect(layout).toContain('template: "%s · " + BRAND.name')
  })

  it("every live page sets a title or is on the short list", () => {
    const missing = pageDirs().filter((d) => !hasTitle(d) && !KEEP_DEFAULT.has(d) && !TITLES_COME_LATER.has(d))
    expect(missing, "Give these a title (metadata.title on the page, or a sibling layout.tsx for a client page)").toEqual([])
  })

  it("the waiting list holds only pages still waiting", () => {
    const done = [...TITLES_COME_LATER].filter((d) => hasTitle(d))
    expect(done, "These have titles now: take them off TITLES_COME_LATER").toEqual([])
  })
})
