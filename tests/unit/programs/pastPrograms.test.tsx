/**
 * FINISHED PROGRAMS: STARTING ONE AGAIN, AND REMOVING ONE.
 *
 * Two buttons in each row, and they shared one `busy` id. Press "Start
 * again" and the button beside it read "Deleting…" — the app saying it was
 * deleting a year of training that you had just asked it to restart. Nothing
 * was being deleted. There is no worse sentence to show somebody about their
 * own history.
 *
 * The delete confirmation had its own lie: "its 47 logged sessions will be
 * erased, this cannot be undone". Not one was erased —
 * `workout_logs.enrollment_id` is ON DELETE SET NULL, so every session
 * survives and is detached from the program. Nobody who wanted it gone got
 * what they asked for, and anybody who mis-tapped was told their year was
 * gone.
 */

import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PastPrograms } from "@/src/programs/components/PastPrograms"
import type { ProgramEnrollment } from "@/src/programs/types"

function past(over: Partial<ProgramEnrollment> = {}): ProgramEnrollment {
  return {
    id: "p1",
    user_id: "u1",
    program_id: "stronglifts-5x5",
    level: "beginner",
    unitSystem: "kg",
    exerciseState: {},
    cursor: { cycle: 1, week: 1, dayIndex: 0, sessionCount: 0 },
    is_active: false,
    started_at: "2026-01-01T00:00:00.000Z",
    sessionsLogged: 47,
    ...over,
  } as ProgramEnrollment
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** A restart that never answers, so the pending state stays observable. */
function held() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "POST" || init?.method === "DELETE") {
        return await new Promise<Response>(() => {})
      }
      return { ok: true, status: 200, json: async () => [past()] } as unknown as Response
    })
  )
}

/**
 * THE TWO ACTIONS MOVED BEHIND THE ROW'S ⋮ on 2026-09-24.
 *
 * "Start again" and "Delete" beside the name left it about 100 px on a 390-px
 * screen — "StrongLifts …", with "Beginner · starte…" under it — which is the
 * clipping this whole phase existed to remove. They were also real `<button>`s
 * INSIDE the row's own `<button>`, which is invalid HTML and was causing a
 * hydration failure on the Training tab for anybody with a finished program.
 *
 * Every assertion below is unchanged except for opening the sheet first: what
 * the actions do, and what they must not say while the other is running, is the
 * same behaviour reached a different way.
 */
async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /^Options for / }))
}

describe("the two actions on a finished program", () => {
  it("restarting never says it is deleting", async () => {
    const user = userEvent.setup()
    held()
    render(<PastPrograms initial={[past()]} />)

    await openMenu(user)
    await user.click(screen.getByTestId("resume-program"))

    /**
     * The pending state is on the ROW now, not on the word: the sheet closes
     * when a row is tapped, so "Starting…" has nowhere to live. The options
     * button going disabled is what says the row is busy, and the whole point
     * survives — nothing anywhere says "deleting".
     */
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^Options for / })).toBeDisabled()
    )
    expect(screen.queryByText(/deleting/i)).toBeNull()
  })

  it("asks before removing, and says the sessions survive", async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => [] }))
    vi.stubGlobal("fetch", fetchMock)
    render(<PastPrograms initial={[past()]} />)

    await openMenu(user)
    await user.click(screen.getByTestId("delete-past-program"))

    expect(screen.getByText(/47 logged sessions stay in your history/i)).toBeTruthy()
    // The sentence it used to show, which was not true of this button.
    expect(screen.queryByText(/will be erased/i)).toBeNull()
    expect(screen.queryByText(/cannot be undone/i)).toBeNull()
  })

  it("counts one session in the singular, because 1 sessions is how you spot a template", async () => {
    const user = userEvent.setup()
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => [] })))
    render(<PastPrograms initial={[past({ sessionsLogged: 1 })]} />)

    await openMenu(user)
    await user.click(screen.getByTestId("delete-past-program"))
    expect(screen.getByText(/1 logged session stays in your history/i)).toBeTruthy()
  })

  it("says so plainly when it has nothing logged", async () => {
    const user = userEvent.setup()
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => [] })))
    render(<PastPrograms initial={[past({ sessionsLogged: 0 })]} />)

    await openMenu(user)
    await user.click(screen.getByTestId("delete-past-program"))
    expect(screen.getByText(/no logged sessions/i)).toBeTruthy()
  })
})
