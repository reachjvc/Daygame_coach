// @vitest-environment jsdom
/**
 * HOME AND ALL TOOLS TELL A PAYER FROM SOMEONE WHO HAS NOT PAID, AND SEND
 * NOBODY TO SIGN UP FOR THE ACCOUNT THEY ARE SIGNED IN TO.
 *
 * Carried over from the Dashboard's guard (dashboardViewer.test.tsx, removed
 * with the Dashboard on 2026-11-10, Plans/site-navigation-build.md Phase 1).
 * Its three reasons still hold for the page that replaced it:
 *
 * - A signed-out visitor is sent to sign in; there is no visitor view.
 * - Someone signed up but not subscribed was once sent to /auth/sign-up for
 *   the account they had just made (walked with a real account 2026-09-04).
 *   A locked thing sends them to the plans, `/#pricing`.
 * - A payer's tiles open the tools themselves, never the plans.
 *
 * And one new: Ask Coach turns away anyone who has not paid with no word
 * said, so its tile for them must open the plans, not Coach (risk 4).
 */

import { cleanup, render, screen } from "@testing-library/react"
import fs from "node:fs"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { ProfileRow } from "@/src/db"
import { TOOLS } from "@/components/navTabs"
import { ToolsPage, tileAccess, PAYWALL_HREF } from "@/src/hometab"
import { HomePage } from "@/src/hometab/components/HomePage"
import { ROUTES } from "@/src/shared/routes"

const db = vi.hoisted(() => ({
  user: null as { id: string } | null,
  profile: null as ProfileRow | null,
}))

vi.mock("@/src/db/server", () => ({
  createServerSupabaseClient: async () => ({
    auth: { getUser: async () => ({ data: { user: db.user } }) },
  }),
  getProfile: async () => db.profile,
}))

beforeEach(() => {
  db.user = null
  db.profile = null
})
afterEach(cleanup)

const hrefs = () => screen.getAllByRole("link").map((a) => a.getAttribute("href"))

describe("who is sent where", () => {
  it("a signed-out visitor is sent to sign in, from Home and from All tools", async () => {
    // Next's real redirect() throws an error whose digest names the target.
    await expect(HomePage()).rejects.toMatchObject({ digest: expect.stringContaining(";/auth/login;") })
    await expect(ToolsPage()).rejects.toMatchObject({ digest: expect.stringContaining(";/auth/login;") })
  })

  it("someone who has not paid is never sent to sign up, and Coach opens the plans", async () => {
    db.user = { id: "u1" }
    db.profile = { id: "u1", has_purchased: false }
    render(await ToolsPage())
    expect(hrefs()).not.toContain("/auth/sign-up")
    expect(screen.getByTestId("tools-row-coach")).toHaveAttribute("href", PAYWALL_HREF)
    expect(screen.getByTestId("tools-row-coach")).toHaveAttribute("data-access", "locked")
    // Previews open the tool itself, which shows its own preview.
    expect(screen.getByTestId("tools-row-scenarios").getAttribute("href")?.split("?")[0]).toBe(ROUTES.scenarios)
    expect(screen.getByTestId("tools-row-scenarios")).toHaveAttribute("data-access", "preview")
  })

  it("an account with no profile row is treated as not paid, not as a visitor", async () => {
    db.user = { id: "u1" }
    render(await ToolsPage())
    expect(screen.getByTestId("tools-row-coach")).toHaveAttribute("href", PAYWALL_HREF)
  })

  it("a payer's tools open the tools themselves", async () => {
    db.user = { id: "u1" }
    db.profile = { id: "u1", has_purchased: true }
    render(await ToolsPage())
    expect(hrefs()).not.toContain(PAYWALL_HREF)
    expect(hrefs()).not.toContain("/auth/sign-up")
    // Each opens its tool, carrying All tools as the way back (`?from=`).
    for (const t of TOOLS) expect(screen.getByTestId(`tools-row-${t.id}`).getAttribute("href")?.split("?from=")[0]).toBe(t.href)
  })
})

describe("tileAccess", () => {
  const coach = TOOLS.find((t) => t.id === "coach")!
  it("is the only thing that reads has_purchased for a tile", () => {
    expect(tileAccess(coach, { has_purchased: true })).toEqual({ state: "open", href: ROUTES.coach })
    expect(tileAccess(coach, { has_purchased: false })).toEqual({ state: "locked", href: PAYWALL_HREF })
    expect(tileAccess(coach, null)).toEqual({ state: "locked", href: PAYWALL_HREF })
  })
  it("every page that turns non-payers away is a tool marked paid", () => {
    // Coach redirects them (app/(app)/coach/page.tsx). If another page starts
    // doing that, its tile must be marked paid too, or it is a silent bounce.
    // Read from the pages themselves: a page that reads the purchase flag and
    // redirects is one that turns people away. (It was a fixed list, which
    // could not notice a second such page; Phase 4 audit.)
    const root = path.join(process.cwd(), "app/(app)")
    const pages: string[] = []
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name)
        if (e.isDirectory()) walk(p)
        else if (e.name === "page.tsx") pages.push(p)
      }
    }
    walk(root)
    const turnsAway = pages
      .filter((p) => {
        const src = fs.readFileSync(p, "utf8")
        return /has_?[pP]urchased/.test(src) && /\bredirect\(/.test(src.replace(/redirect\(\s*[`"']\/auth\/login[^)]*\)/g, ""))
      })
      .map((p) => "/" + path.relative(root, path.dirname(p)).split(path.sep).join("/"))
      .sort()
    expect(turnsAway).toEqual(TOOLS.filter((t) => t.access === "paid").map((t) => t.href).sort())
  })
})
