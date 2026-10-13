// @vitest-environment jsdom
/**
 * A search result names its body part the way a person would write it.
 *
 * Until 2026-10-13 the result printed the raw group id with `capitalize`, so a
 * Romanian deadlift read "Hamstrings_glutes" — while BODY_GROUP_LABELS, written
 * for exactly this, sat unused.
 */
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { AddLift } from "@/src/programs/components/live/AddLift"

describe("adding a lift mid-workout", () => {
  it("labels each result with its body part in words, not its id", () => {
    render(<AddLift alreadyHere={[]} onAdd={vi.fn()} startOpen />)

    fireEvent.change(screen.getByLabelText("Search for a lift to add"), { target: { value: "Romanian" } })

    const result = screen.getByRole("button", { name: /^Romanian Deadlift/ })
    expect(result.textContent).toContain("Hams & glutes")
    expect(result.textContent).not.toMatch(/hamstrings_glutes/i)
  })
})
