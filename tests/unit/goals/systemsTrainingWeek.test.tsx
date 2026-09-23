// @vitest-environment jsdom

/**
 * THE SPLIT DESIGNER, FOR THE WEEKS THAT ARE ACTUALLY YOURS.
 *
 * `RoutineCard` stops offering to edit a week a program owns — that is
 * `routineCardLinked.test.tsx`. This is the other half: what the designer is
 * like when the week IS yours, and it was three separate things wrong at once.
 *
 * 1. A SPACE COULD NOT BE TYPED. The day name was a box, and every keystroke
 *    went through `renameSplitDay`, which trims. So "Upper Body" lost its space
 *    the moment it was typed — the same defect the program editor had, in a
 *    second place, which is why both are now the same dialog.
 * 2. A BLANK NAME WAS REFUSED IN SILENCE. `renameSplitDay` ignores an empty
 *    name, so the only way to learn the rule was to try it and watch nothing
 *    happen.
 * 3. THE CONTROLS WERE 18 px. Move up, move down and remove were `size-4.5`
 *    squares with 12-px icons, on a screen people use on a phone, and "up" was
 *    a rotated ChevronDown.
 */

import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { RoutineCard } from "@/src/goals/components/north-star/RoutineCard"
import { addRoutine, emptyNsPlan } from "@/src/goals/northStarService"
import type { NsRoutine } from "@/src/goals/types"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/life-mastery",
  useSearchParams: () => new URLSearchParams(),
}))

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function workoutRoutine(): NsRoutine {
  const plan = addRoutine(emptyNsPlan(), "workout", "2026-09-19T10:00:00.000Z")
  return plan.routines.find((r) => r.blueprintId === "workout")!
}

/** Every handler a spy, so what the designer CALLS is the assertion. */
function designer() {
  const onRenameSplitDay = vi.fn()
  const onMoveSplitDay = vi.fn()
  const onRemoveSplitDay = vi.fn()
  const handlers = new Proxy(
    { onRenameSplitDay, onMoveSplitDay, onRemoveSplitDay },
    { get: (target, key) => (target as Record<string, unknown>)[key as string] ?? vi.fn() }
  ) as never
  const routine = workoutRoutine()
  const plan = emptyNsPlan()
  render(
    <RoutineCard
      routine={routine}
      areas={plan.areas}
      editing
      open
      onToggleOpen={vi.fn()}
      handlers={handlers}
      linkedProgram={{ state: "none" }}
    />
  )
  return { onRenameSplitDay, onMoveSplitDay, onRemoveSplitDay, routine }
}

/** The first day's ⋮, opened. */
async function openFirstDay(user: ReturnType<typeof userEvent.setup>, routine: NsRoutine) {
  const first = routine.splitDays[0]
  await user.click(screen.getByTestId(`split-day-menu-${first.id}`))
  return first
}

describe("renaming a training day", () => {
  it("keeps the space in a two-word name", async () => {
    const user = userEvent.setup()
    const { onRenameSplitDay, routine } = designer()
    const first = await openFirstDay(user, routine)

    await user.click(screen.getByTestId("split-day-rename"))
    const box = screen.getByLabelText("Name")
    await user.clear(box)
    await user.type(box, "Upper Body")
    // Typed through a box that commits per keystroke, this read "UpperBody".
    expect(box).toHaveValue("Upper Body")

    await user.click(screen.getByTestId("split-name-save"))
    expect(onRenameSplitDay).toHaveBeenCalledTimes(1)
    expect(onRenameSplitDay).toHaveBeenCalledWith(routine.id, first.id, "Upper Body")
  })

  it("refuses a blank name out loud, and never calls renameSplitDay", async () => {
    const user = userEvent.setup()
    const { onRenameSplitDay, routine } = designer()
    await openFirstDay(user, routine)

    await user.click(screen.getByTestId("split-day-rename"))
    await user.clear(screen.getByLabelText("Name"))
    await user.click(screen.getByTestId("split-name-save"))

    expect(screen.getByRole("alert").textContent).toContain("A training day needs a name")
    // `renameSplitDay` ignores an empty name — which is the right last line of
    // defence and the wrong way for somebody to find out.
    expect(onRenameSplitDay).not.toHaveBeenCalled()
    // Still open, so the name can be typed rather than started again.
    expect(screen.getByTestId("split-day-dialog")).toBeTruthy()
  })

  it("commits once, on Save, not on the way there", async () => {
    const user = userEvent.setup()
    const { onRenameSplitDay, routine } = designer()
    await openFirstDay(user, routine)

    await user.click(screen.getByTestId("split-day-rename"))
    await user.type(screen.getByLabelText("Name"), "xyz")
    expect(onRenameSplitDay).not.toHaveBeenCalled()
  })
})

describe("moving and removing a day", () => {
  it("disables Move up on the first and Move down on the last", async () => {
    const user = userEvent.setup()
    const { routine } = designer()
    await openFirstDay(user, routine)

    const sheet = within(screen.getByTestId("split-day-sheet"))
    expect(sheet.getByTestId("split-day-up")).toBeDisabled()
    expect(sheet.getByTestId("split-day-down")).not.toBeDisabled()
  })

  it("moves the day the sheet was opened from", async () => {
    const user = userEvent.setup()
    const { onMoveSplitDay, routine } = designer()
    await openFirstDay(user, routine)

    await user.click(screen.getByTestId("split-day-down"))
    expect(onMoveSplitDay).toHaveBeenCalledWith(routine.id, 0, 1)
  })
})

describe("what a finger has to hit", () => {
  it("has no control under 44px in the designer", () => {
    designer()
    /**
     * SCOPED TO THE DESIGNER, and deliberately so. The card also holds the
     * routine's STEP rows, whose move and remove controls are still 18-px
     * squares — a real fault, in the same file, that belongs to routines in
     * general rather than to the training week, and widening this test to
     * cover them would be claiming a fix that has not been made.
     */
    for (const button of within(screen.getByTestId("split-designer")).getAllByRole("button")) {
      expect(
        button.className,
        `a control that misses the 44px floor: ${button.className}`
      ).not.toMatch(/(?:^|\s)(?:size-4\.5|size-(?:4|5|6)|min-h-(?:7|8|9|10)|h-(?:7|8|9|10))(?:\s|$)/)
    }
  })

  it("names its options button after the day, so a screen reader can tell them apart", () => {
    const { routine } = designer()
    for (const day of routine.splitDays) {
      expect(screen.getByLabelText(`Options for ${day.name}`)).toBeTruthy()
    }
  })
})
