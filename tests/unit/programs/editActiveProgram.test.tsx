// @vitest-environment jsdom
/**
 * THE EDITOR IS ALREADY OPEN WHEN IT APPEARS.
 *
 * Reaching it took two taps on two buttons with the SAME WORDS: "Change this
 * program" in the menu mounted the component, and the component drew its own
 * second "Change this program" that actually opened it. The first tap looked
 * like it had failed.
 */

import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { EditActiveProgram } from "@/src/programs/components/EditActiveProgram"
import { seedEnrollment } from "@/src/programs/runtime"
import { requireProgram } from "@/src/programs/data/catalog"
import type { ProgramEnrollment } from "@/src/programs/types"

const PROGRAM = "stronglifts-5x5"

function enrollment(): ProgramEnrollment {
  const { exerciseState, cursor } = seedEnrollment(requireProgram(PROGRAM), "beginner", "kg")
  return {
    id: "e1",
    user_id: "u1",
    program_id: PROGRAM,
    level: "beginner",
    unitSystem: "kg",
    exerciseState,
    cursor,
    is_active: true,
    started_at: "2026-01-01T00:00:00.000Z",
    customSchedule: null,
  }
}

afterEach(() => vi.restoreAllMocks())

function editor() {
  const onSaved = vi.fn()
  const onCancel = vi.fn()
  render(<EditActiveProgram enrollment={enrollment()} onSaved={onSaved} onCancel={onCancel} />)
  return { onSaved, onCancel }
}

describe("the program editor", () => {
  it("is editing on the first paint, with its schedule already loaded", () => {
    editor()
    // Save is the proof it is open: it only exists in the editing state.
    expect(screen.getByRole("button", { name: /save changes/i })).toBeTruthy()
  })

  it("draws no second button with the words that opened it", () => {
    editor()
    // The menu row says this. A control on the page it opens saying the same
    // thing reads as "that did not work, try again".
    expect(screen.queryByRole("button", { name: /change this program/i })).toBeNull()
  })

  it("Cancel is a real way out", async () => {
    const user = userEvent.setup()
    const { onCancel } = editor()
    await user.click(screen.getByRole("button", { name: /^cancel$/i }))
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
