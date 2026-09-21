/**
 * EVERYTHING YOU DO TO A PROGRAM, AND WHAT IT PROMISES FIRST.
 *
 * End, Skip and Reset. Each one used to lie in its own way:
 *
 * - End navigated away whatever the server answered, so a program the server
 *   had kept running (because a workout was open on it) looked ended.
 * - Skip was offered on every program, including a week pinned to weekdays
 *   where nothing reads the cursor it advances — so it changed nothing and
 *   left a phantom skip behind each time it was pressed.
 * - Reset promised "your current weights go back to where you began. This
 *   cannot be undone." It does not touch the weights.
 *
 * Ported here from `ProgressionView.test.tsx` when the buttons moved into the
 * sheet. The concerns are unchanged; only the door is. What they lean on —
 * `programActions`, `skipRefusal`, `resetConfirmText` — is the same in both.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ProgramSheet } from "@/src/programs/components/ProgramSheet"
import { seedEnrollment } from "@/src/programs/programsService"
import { requireProgram } from "@/src/programs/data/catalog"
import type { ProgramEnrollment, ProgramSchedule } from "@/src/programs/types"

const replace = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace, back: vi.fn() }),
}))

/** StrongLifts runs in order — A, B, A — so skipping it means something. */
const IN_ORDER = "stronglifts-5x5"

function enrollment(over: Partial<ProgramEnrollment> = {}): ProgramEnrollment {
  const program = requireProgram(IN_ORDER)
  const { exerciseState, cursor } = seedEnrollment(program, "beginner", "kg")
  return {
    id: "e1",
    user_id: "u1",
    program_id: IN_ORDER,
    level: "beginner",
    unitSystem: "kg",
    exerciseState,
    cursor,
    is_active: true,
    started_at: "2026-01-01T00:00:00.000Z",
    customSchedule: null,
    ...over,
  }
}

/** The same two days, but pinned to Monday and Thursday. */
function pinnedToWeekdays(): ProgramSchedule {
  const base = requireProgram(IN_ORDER).schedule
  if (base.kind !== "linear_rotation") throw new Error("fixture assumes a rotation")
  return { ...base, days: base.days.map((d, i) => ({ ...d, weekday: i === 0 ? 1 : 4 })) }
}

function sheet(over: Partial<ProgramEnrollment> = {}) {
  const onChanged = vi.fn()
  const onClose = vi.fn()
  render(
    <ProgramSheet
      open
      onClose={onClose}
      enrollment={enrollment(over)}
      onChanged={onChanged}
    />
  )
  return { onChanged, onClose }
}

const ok = () => vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) }))

beforeEach(() => {
  replace.mockClear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("End program", () => {
  it("stays on the program and shows the reason when the server refuses", async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 409,
        json: async () => ({ error: "Finish or throw away the workout you have open first" }),
      }))
    )
    sheet()

    await user.click(screen.getByTestId("sheet-end"))
    await user.click(screen.getByTestId("sheet-confirm"))

    await waitFor(() =>
      expect(screen.getByTestId("sheet-failed").textContent).toBe(
        "Finish or throw away the workout you have open first"
      )
    )
    // The important half: it did NOT leave the program's screen.
    expect(replace).not.toHaveBeenCalled()
  })

  it("leaves only when the server says it ended", async () => {
    const user = userEvent.setup()
    vi.stubGlobal("fetch", ok())
    sheet()

    await user.click(screen.getByTestId("sheet-end"))
    await user.click(screen.getByTestId("sheet-confirm"))

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/programs?view=programs"))
    expect(screen.queryByTestId("sheet-failed")).toBeNull()
  })

  it("asks before it ends anything, and says what is kept", async () => {
    const user = userEvent.setup()
    const fetchMock = ok()
    vi.stubGlobal("fetch", fetchMock)
    sheet()

    await user.click(screen.getByTestId("sheet-end"))
    // Nothing has been sent yet — the dialog is the whole point.
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByText(/everything you logged is kept/i)).toBeTruthy()
  })
})

describe("Skip", () => {
  it("asks first, naming the session it moves to, and says the weights hold", async () => {
    const user = userEvent.setup()
    const fetchMock = ok()
    vi.stubGlobal("fetch", fetchMock)
    const { onChanged } = sheet()

    await user.click(screen.getByTestId("sheet-skip"))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByText(/your weights do not change/i)).toBeTruthy()
    // "Skip session?" does not tell you what you end up doing tomorrow.
    expect(screen.getByText(/moves on to/i)).toBeTruthy()

    await user.click(screen.getByTestId("sheet-confirm"))
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
  })

  it("is gone entirely on a week pinned to weekdays", async () => {
    sheet({ customSchedule: pinnedToWeekdays() })
    // Nothing reads the cursor on a calendar week, so there is nothing to skip.
    expect(screen.queryByTestId("sheet-skip")).toBeNull()
  })

  it("does nothing at all when the dialog is dismissed", async () => {
    const user = userEvent.setup()
    const fetchMock = ok()
    vi.stubGlobal("fetch", fetchMock)
    sheet()

    await user.click(screen.getByTestId("sheet-skip"))
    await user.keyboard("{Escape}")

    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe("Reset to start", () => {
  it("promises the weights stay, because they do", async () => {
    const user = userEvent.setup()
    vi.stubGlobal("fetch", ok())
    sheet()

    await user.click(screen.getByTestId("sheet-reset"))

    expect(screen.getByText(/your weights stay where they are/i)).toBeTruthy()
    // The sentence it used to show, and which was not true of this button.
    expect(screen.queryByText(/go back to where you began/i)).toBeNull()
    expect(screen.queryByText(/cannot be undone/i)).toBeNull()
  })
})

describe("the sheet itself", () => {
  it("offers the way out and the way to everything else", async () => {
    sheet()
    expect(screen.getByTestId("sheet-all").getAttribute("href")).toBe("/programs?view=programs")
    expect(screen.getByTestId("sheet-reset")).toBeTruthy()
    expect(screen.getByTestId("sheet-end")).toBeTruthy()
  })

  it("renders nothing at all while closed", () => {
    render(
      <ProgramSheet open={false} onClose={vi.fn()} enrollment={enrollment()} onChanged={vi.fn()} />
    )
    // A closed sheet left in the DOM is still reachable by a screen reader and
    // still tab-focusable behind the page.
    expect(screen.queryByTestId("program-sheet")).toBeNull()
    expect(screen.queryByTestId("sheet-end")).toBeNull()
  })
})
