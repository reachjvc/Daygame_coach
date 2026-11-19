// @vitest-environment jsdom
/**
 * INSIDE THE APP, DATING MOVES BACK BUT STAYS WHOLE (Plans/rebrand-10kdaysclub.md, Phase 6).
 */
import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { ProfileRow } from "@/src/db"
import { DATING_TILE, TABS, TOOLS } from "@/components/navTabs"
import { ToolsPage } from "@/src/hometab"
import { ROUTES } from "@/src/shared/routes"

const db = vi.hoisted(() => ({ stats: null as null | { total_sessions: number; current_week_approaches: number; current_week_sessions: number } }))

vi.mock("@/src/db/server", () => ({
  createServerSupabaseClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) } }),
  getProfile: async () => ({ id: "u1", has_purchased: false }) as ProfileRow,
}))
vi.mock("@/src/tracking/trackingService", () => ({
  getTrackingStatsForDisplay: async () => db.stats,
  getActiveSession: async () => null,
}))

import { FieldCard } from "@/src/hometab/components/HomeCards"

afterEach(cleanup)

describe("the bar and the tools", () => {
  it("the bar is Home · Plan · You", () => {
    expect(TABS.map((t) => t.label)).toEqual(["Home", "Plan", "You"])
  })

  it("every tool is in a part, and the Black Box is in Quit", () => {
    for (const t of TOOLS) expect(["life", "quit", "dating"]).toContain(t.group)
    expect(TOOLS.find((t) => t.id === "black-box")?.group).toBe("quit")
  })

  it("Home has one Dating tile, leading to the dating tools", () => {
    expect(TOOLS.filter((t) => t.tile).map((t) => t.id)).toEqual(["training", "time", "audit", "black-box"])
    expect(DATING_TILE.href).toBe(ROUTES.datingTools)
  })

  it("All tools lists Life, Quit, Dating in that order", async () => {
    render(await ToolsPage())
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)
    expect(headings).toEqual(["Life", "Quit", "Dating"])
  })

  it("/tools/dating lists exactly the dating tools", async () => {
    render(await ToolsPage({ group: "dating" }))
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Dating")
    const rows = within(screen.getByTestId("tools-group-dating")).getAllByRole("link").map((a) => a.textContent)
    expect(rows.map((r) => r?.replace(/See plans$/, ""))).toEqual(["Scenarios", "Ask Coach", "Inner Game", "The Field", "Your dating answers"])
    expect(screen.queryByTestId("tools-group-life")).toBeNull()
  })
})

describe("the Field card on Home", () => {
  it("is hidden for someone who has never logged a field session", async () => {
    db.stats = { total_sessions: 0, current_week_approaches: 0, current_week_sessions: 0 }
    expect(await FieldCard({ userId: "u1" })).toBeNull()
  })

  it("shows for someone who has", async () => {
    db.stats = { total_sessions: 3, current_week_approaches: 2, current_week_sessions: 1 }
    render((await FieldCard({ userId: "u1" }))!)
    expect(screen.getByText("The Field")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open The Field" })).toHaveAttribute("href", ROUTES.tracking)
  })
})
