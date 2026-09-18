/**
 * THE THREE BUTTONS UNDER A RUNNING PROGRAM.
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
 * This component is replaced by the program sheet in a later phase. What
 * survives it is `programActions.ts`, `skipRefusal` and `resetConfirmText` —
 * the sheet uses the same three. These tests go when the component does.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ProgressionView } from "@/src/programs/components/ProgressionView"
import { seedEnrollment } from "@/src/programs/programsService"
import { requireProgram } from "@/src/programs/data/catalog"
import type { ProgramEnrollment, ProgramSchedule } from "@/src/programs/types"

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

/** The controls live behind the History disclosure; open it before reaching them. */
async function view(over: Partial<ProgramEnrollment> = {}) {
  const onChanged = vi.fn()
  const onUnenrolled = vi.fn()
  render(
    <ProgressionView
      enrollmentId="e1"
      logs={[]}
      enrollment={enrollment(over)}
      onChanged={onChanged}
      onUnenrolled={onUnenrolled}
    />
  )
  await userEvent.click(screen.getByTestId("history-toggle"))
  return { onChanged, onUnenrolled }
}

beforeEach(() => {
  vi.stubGlobal("confirm", vi.fn(() => true))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("End program", () => {
  it("stays on the program and shows the reason when the server refuses", async () => {
    const user = userEvent.setup()
    vi.stubGlobal("confirm", vi.fn(() => true))
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 409,
        json: async () => ({ error: "Finish or throw away the workout you have open first" }),
      }))
    )
    const { onUnenrolled } = await view()

    await user.click(screen.getByRole("button", { name: /end program/i }))

    await waitFor(() =>
      expect(screen.getByTestId("progression-action-failed").textContent).toBe(
        "Finish or throw away the workout you have open first"
      )
    )
    // The important half: it did NOT tell the page the program had ended.
    expect(onUnenrolled).not.toHaveBeenCalled()
  })

  it("leaves only when the server says it ended", async () => {
    const user = userEvent.setup()
    vi.stubGlobal("confirm", vi.fn(() => true))
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) })))
    const { onUnenrolled } = await view()

    await user.click(screen.getByRole("button", { name: /end program/i }))
    await waitFor(() => expect(onUnenrolled).toHaveBeenCalled())
    expect(screen.queryByTestId("progression-action-failed")).toBeNull()
  })
})

describe("Skip", () => {
  it("asks first, and is not offered on a calendar week", async () => {
    const user = userEvent.setup()
    const ask = vi.fn<(message?: string) => boolean>(() => true)
    vi.stubGlobal("confirm", ask)
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) })))

    // In order: offered, and it asks before it moves anything.
    const { onChanged } = await view()
    const skip = screen.getByRole("button", { name: /skip session/i })
    await user.click(skip)
    expect(ask).toHaveBeenCalledOnce()
    expect(String(ask.mock.calls[0]?.[0])).toMatch(/your weights do not change/i)
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
  })

  it("is gone entirely on a week pinned to weekdays", async () => {
    await view({ customSchedule: pinnedToWeekdays() })
    // Nothing reads the cursor on a calendar week, so there is nothing to skip.
    expect(screen.queryByRole("button", { name: /skip session/i })).toBeNull()
  })

  it("does nothing at all when the confirm is dismissed", async () => {
    const user = userEvent.setup()
    vi.stubGlobal("confirm", vi.fn(() => false))
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) }))
    vi.stubGlobal("fetch", fetchMock)
    await view()

    await user.click(screen.getByRole("button", { name: /skip session/i }))
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe("Reset to start", () => {
  it("promises the weights stay, because they do", async () => {
    const user = userEvent.setup()
    const ask = vi.fn<(message?: string) => boolean>(() => false)
    vi.stubGlobal("confirm", ask)
    await view()

    await user.click(screen.getByRole("button", { name: /reset to start/i }))

    const said = String(ask.mock.calls[0]?.[0])
    expect(said).toMatch(/your weights stay where they are/i)
    // The sentence it used to show, and which was not true of this button.
    expect(said).not.toMatch(/go back to where you began/i)
    expect(said).not.toMatch(/cannot be undone/i)
  })
})
