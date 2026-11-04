// @vitest-environment jsdom
/**
 * A PLANNED ROW IS STRIPED AND SAYS SO (Q2, Phase 5 item 5).
 *
 * The totals leave a plan out until it starts (aPlannedEntryCountsNowhereUntilItStarts).
 * On screen that has to be visible too, or a day header reading 2:00 over a
 * row reading 1:30 looks like a sum that went wrong: the row is striped and
 * says "planned", and the header says what is planned beside its total.
 */

import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"

import { EntryList } from "@/src/timetrack/components/EntryList"

import { baseState, entry } from "./helpers"

const NOW = Math.floor(new Date(2026, 7, 12, 12, 0, 0, 0).getTime() / 1000)

afterEach(cleanup)

test("tomorrow's 10:00–11:30 is striped and marked planned, and today's header and This week leave it out", () => {
  const state = baseState({
    entries: [
      entry("done", "2026-08-12", "09:00", "11:00", { description: "Deep work" }),
      entry("gym", "2026-08-13", "10:00", "11:30", { description: "Gym" }),
    ],
  })
  render(<EntryList state={state} setState={vi.fn()} nowSec={NOW} pushToast={vi.fn()} onEditEntry={() => {}} />)

  expect(screen.getByText("This week").textContent).toContain("2:00")

  const tomorrow = screen.getAllByRole("heading", { level: 3 })[0].closest("section")!
  expect(within(tomorrow).getByText("0:00 · 1:30 planned")).toBeInTheDocument()
  // the row a pointer device draws (this test has no phone-sized window): striped, and its tooltip says why
  const row = within(tomorrow).getByDisplayValue("Gym").closest("[style]") as HTMLElement
  expect(row.style.backgroundImage).toContain("repeating-linear-gradient")
  expect(row).toHaveAttribute("title", "Planned: not counted until it starts")
  const worked = screen.getByDisplayValue("Deep work").closest("div") as HTMLElement
  expect(worked.style.backgroundImage).toBe("")

  const today = screen.getByRole("heading", { name: "Today" }).closest("section")!
  expect(within(today).getByText("2:00")).toBeInTheDocument()
})
