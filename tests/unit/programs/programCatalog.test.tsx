/**
 * THE LIST OF PROGRAMS YOU COULD START.
 *
 * Thirteen cards in a two-column grid, each with an untappable title and its
 * own orange "View ›" button: 3,384px of scrolling on a phone, and thirteen
 * oranges competing with each other and with the one button on the screen
 * that actually starts training.
 *
 * Rows now. The row is the target — a button inside a card leaves the 300px
 * around it dead, which is the commonest "why did that not work" on a phone.
 */

import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ProgramCatalog } from "@/src/programs/components/ProgramCatalog"
import { ALL_PROGRAMS } from "@/src/programs/data/catalog"
import { DISCIPLINES } from "@/src/programs/config"

afterEach(() => vi.restoreAllMocks())

describe("the catalogue", () => {
  it("opens on All, so the whole list is one scroll", () => {
    render(<ProgramCatalog onSelect={vi.fn()} />)
    const all = screen.getByRole("tab", { name: "All" })
    expect(all.getAttribute("data-state")).toBe("active")
  })

  it("shows every program the app has, not a subset", () => {
    render(<ProgramCatalog onSelect={vi.fn()} />)
    // The named ones, so a filter that silently dropped a discipline fails.
    for (const p of ALL_PROGRAMS) {
      expect(screen.getByTestId(`catalog-${p.id}`), p.id).toBeTruthy()
    }
  })

  it("offers no tab for a discipline with nothing in it", () => {
    render(<ProgramCatalog onSelect={vi.fn()} />)
    // By the words on screen: a tab's `value` is Radix's own business and is
    // not an attribute, so asserting on it silently matched null for every
    // tab and the check passed over an empty list.
    const offered = new Set(
      ALL_PROGRAMS.map((p) => DISCIPLINES[p.discipline].label as string)
    )
    const labels = screen.getAllByRole("tab").map((t) => (t.textContent ?? "").trim())
    expect(labels.length, "premise: there should be tabs").toBeGreaterThan(1)
    for (const label of labels) {
      if (label === "All") continue
      // An empty tab is a promise of programs that do not exist.
      expect(offered.has(label), `${label} has no programs`).toBe(true)
    }
  })

  it("the whole row picks the program, not a button inside it", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<ProgramCatalog onSelect={onSelect} />)

    const first = ALL_PROGRAMS[0]
    await user.click(screen.getByTestId(`catalog-${first.id}`))
    expect(onSelect).toHaveBeenCalledWith(first.id)
  })

  it("has no 'View' buttons left to compete with Start", () => {
    render(<ProgramCatalog onSelect={vi.fn()} />)
    // Thirteen oranges on the screen whose job is choosing one thing.
    expect(screen.queryAllByRole("button", { name: /^view/i })).toHaveLength(0)
  })

  it("filtering by discipline shows that discipline and no other", async () => {
    const user = userEvent.setup()
    render(<ProgramCatalog onSelect={vi.fn()} />)

    const discipline = ALL_PROGRAMS[0].discipline
    const inIt = ALL_PROGRAMS.filter((p) => p.discipline === discipline)
    const notInIt = ALL_PROGRAMS.filter((p) => p.discipline !== discipline)
    // Only meaningful if the catalogue actually spans more than one.
    expect(notInIt.length, "premise: more than one discipline exists").toBeGreaterThan(0)

    const label = DISCIPLINES[discipline].label
    await user.click(screen.getByRole("tab", { name: label }))

    for (const p of inIt) expect(screen.getByTestId(`catalog-${p.id}`), p.id).toBeTruthy()
    for (const p of notInIt) expect(screen.queryByTestId(`catalog-${p.id}`), p.id).toBeNull()
  })
})
