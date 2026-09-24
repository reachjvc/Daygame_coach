/**
 * "LOG A PAST WORKOUT" — the only remaining way to record a session afterwards.
 *
 * It opens the live screen at the time you choose rather than being a second
 * form with its own rules. The two forms it replaced each had their own weight
 * boxes, their own personal-best definition and their own save path, and a
 * pounds lifter's 135 went into the database as 135 kilograms.
 *
 * The device is in Auckland and the account in Copenhagen throughout, twelve
 * hours and usually a different DAY apart, so a dialog reading the browser's
 * clock cannot pass by coincidence.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { LogPastWorkoutDialog, choicesFor } from "@/src/programs/components/LogPastWorkoutDialog"
import type { ProgramEnrollment } from "@/src/programs/types"

const push = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }),
}))

const ACCOUNT_TZ = "Europe/Copenhagen"
let realTZ: string | undefined

beforeEach(() => {
  realTZ = process.env.TZ
  process.env.TZ = "Pacific/Auckland"
  push.mockClear()
  window.localStorage.clear()
})

afterEach(() => {
  process.env.TZ = realTZ
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function enrollment(over: Partial<ProgramEnrollment> = {}): ProgramEnrollment {
  return {
    id: "e1",
    user_id: "u1",
    program_id: "stronglifts-5x5",
    level: "beginner",
    unitSystem: "kg",
    exerciseState: {},
    cursor: { dayIndex: 0, cycle: 1, week: 1, sessionCount: 0 },
    is_active: true,
    started_at: "2026-09-01T00:00:00.000Z",
    customSchedule: null,
    ...over,
  } as ProgramEnrollment
}

/**
 * A SERVER THAT IS DELIBERATELY NOT INSTANT.
 *
 * A stub that answers inside the same tick as the click is why three
 * assertions in this file used to pass: `await user.click()` waits for React's
 * queue, the reply happened to land in that window, and the state was there by
 * the time `expect` ran. That is a coincidence, and on 2026-09-24 it stopped
 * holding — a full-suite run with three vitest suites competing for the
 * machine failed "shows a refusal and lets you try again" for another session,
 * and it passed alone seconds later.
 *
 * So the coincidence is removed rather than relied on: every reply here arrives
 * a real tick late, which is what a server does. A synchronous assertion on
 * anything that only exists AFTER the reply now fails on every run instead of
 * one run in fifty — which is the whole point, because the flake was never the
 * problem. The assertion was, and the flake was the only thing saying so.
 */
const REPLY_DELAY_MS = 25

/** What the POST body was, for the one request the dialog is allowed to make. */
function captureStart(status = 201, body: unknown = { id: "w1" }) {
  const sent: Array<Record<string, unknown>> = []
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      sent.push(JSON.parse(String(init?.body)))
      await new Promise((resolve) => setTimeout(resolve, REPLY_DELAY_MS))
      return { ok: status < 400, status, json: async () => body } as unknown as Response
    })
  )
  return sent
}

function openDialog(props: Partial<React.ComponentProps<typeof LogPastWorkoutDialog>> = {}) {
  render(
    <LogPastWorkoutDialog
      enrollments={[enrollment()]}
      liveOpen={false}
      timezone={ACCOUNT_TZ}
      {...props}
    />
  )
}

describe("which sessions it offers", () => {
  it("lists every day of a rotation, plus an empty workout", () => {
    const { choices } = choicesFor([enrollment()])
    // StrongLifts is A/B, so both days plus the empty one.
    expect(choices.map((c) => c.dayId)).toEqual(["A", "B", null])
    expect(choices[choices.length - 1].label).toBe("Empty workout")
  })

  it("gives a running plan one 'Next run' chip and no day", () => {
    // `scheduleDays` THROWS on an endurance plan. Calling it here would have
    // taken the whole dialog down for anybody on Couch to 5K.
    const { choices } = choicesFor([enrollment({ id: "e2", program_id: "couch-to-5k" })])
    expect(choices[0].label).toBe("Next run")
    expect(choices[0].dayId).toBeNull()
    expect(choices[0].enrollmentId).toBe("e2")
  })

  it("names the program when more than one is running", () => {
    const { choices } = choicesFor([
      enrollment(),
      enrollment({ id: "e2", program_id: "couch-to-5k" }),
    ])
    expect(choices.map((c) => c.label)).toContain("Workout A · StrongLifts 5×5")
    expect(choices.map((c) => c.label)).toContain("Next run · Couch to 5K")
  })

  it("a program the app no longer has is named, not offered a guessed day", () => {
    const { choices, unknown } = choicesFor([enrollment({ program_id: "some-retired-program" })])
    expect(unknown).toEqual(["some-retired-program"])
    // Only the empty workout is left; nothing invented a day for it.
    expect(choices).toHaveLength(1)
  })
})

describe("opening one", () => {
  it("sends the chosen day and a startedAt resolved in the account's zone", async () => {
    const user = userEvent.setup()
    const sent = captureStart()
    openDialog()

    await user.click(screen.getByTestId("log-past-workout"))
    await user.type(screen.getByLabelText(/when the workout was/i), "2026-09-15T18:00")
    await user.click(screen.getByRole("button", { name: "Workout A" }))
    await user.click(screen.getByTestId("open-past-workout"))

    expect(sent).toHaveLength(1)
    expect(sent[0].dayId).toBe("A")
    expect(sent[0].enrollmentId).toBe("e1")
    // 18:00 Copenhagen is 16:00Z. In Auckland it would be 06:00Z.
    expect(sent[0].startedAt).toBe("2026-09-15T16:00:00.000Z")
    /**
     * WAITED FOR, NOT ASSUMED. The navigation happens after the POST resolves,
     * and `await user.click()` only waits for React's own queue — not for a
     * server. Asserted synchronously this passed because the stubbed `fetch`
     * happened to resolve inside that window, which is a coincidence and not a
     * property: `daygame-coach-0a` had it fail in a full-suite run with three
     * vitest suites competing for the machine. Proved by making the stub answer
     * 25ms later, which fails the synchronous form every time.
     */
    await waitFor(() => expect(push).toHaveBeenCalledWith("/programs/live"))
  })

  it("goes through the one start helper, so a clientKey is sent", async () => {
    const user = userEvent.setup()
    const sent = captureStart()
    openDialog()

    await user.click(screen.getByTestId("log-past-workout"))
    await user.type(screen.getByLabelText(/when the workout was/i), "2026-09-15T18:00")
    await user.click(screen.getByRole("button", { name: "Empty workout" }))
    await user.click(screen.getByTestId("open-past-workout"))

    // The key is what makes a retry after a lost reply land on the SAME
    // workout instead of opening a second one.
    expect(typeof sent[0].clientKey).toBe("string")
    expect(String(sent[0].clientKey).length).toBeGreaterThan(0)
    // An empty workout names no program and no day.
    expect("enrollmentId" in sent[0]).toBe(false)
    expect("dayId" in sent[0]).toBe(false)
  })

  it("will not open until both a time and a session are chosen", async () => {
    const user = userEvent.setup()
    openDialog()

    await user.click(screen.getByTestId("log-past-workout"))
    const open = () => screen.getByTestId("open-past-workout") as HTMLButtonElement
    expect(open().disabled).toBe(true)

    await user.type(screen.getByLabelText(/when the workout was/i), "2026-09-15T18:00")
    expect(open().disabled).toBe(true)

    await user.click(screen.getByRole("button", { name: "Workout B" }))
    expect(open().disabled).toBe(false)
  })

  it("shows a refusal and lets you try again, rather than navigating anyway", async () => {
    const user = userEvent.setup()
    captureStart(400, { error: "That program is not yours." })
    openDialog()

    await user.click(screen.getByTestId("log-past-workout"))
    await user.type(screen.getByLabelText(/when the workout was/i), "2026-09-15T18:00")
    await user.click(screen.getByRole("button", { name: "Workout A" }))
    await user.click(screen.getByTestId("open-past-workout"))

    /**
     * `findByRole` rather than `getByRole`, and FIRST — which fixes a second
     * fault in the same three lines. `expect(push).not.toHaveBeenCalled()`
     * asserted before the reply landed passes whether or not the dialog
     * navigates, because nothing has happened yet either way. Waiting for the
     * refusal to be on screen first means the request has resolved by the time
     * the navigation is denied, so that line now says something.
     */
    expect((await screen.findByRole("alert")).textContent).toContain("That program is not yours.")
    expect(push).not.toHaveBeenCalled()
    expect((screen.getByTestId("open-past-workout") as HTMLButtonElement).disabled).toBe(false)
  })

  it("says nobody knows when the server cannot be reached", async () => {
    const user = userEvent.setup()
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline") }))
    openDialog()

    await user.click(screen.getByTestId("log-past-workout"))
    await user.type(screen.getByLabelText(/when the workout was/i), "2026-09-15T18:00")
    await user.click(screen.getByRole("button", { name: "Workout A" }))
    await user.click(screen.getByTestId("open-past-workout"))

    // Not "nothing was started" — that is a guess, and the wrong one exactly
    // when the signal drops.
    expect((await screen.findByRole("alert")).textContent).toMatch(/could not reach the server/i)
    expect(push).not.toHaveBeenCalled()
  })

  it("refuses while a workout is already open, and links to it", async () => {
    const user = userEvent.setup()
    openDialog({ liveOpen: true })

    await user.click(screen.getByTestId("log-past-workout"))
    expect(screen.getByTestId("past-blocked-by-live").textContent).toContain(
      "Finish the workout you have open first"
    )
    expect(screen.queryByTestId("open-past-workout")).toBeNull()
    expect(screen.getByRole("link", { name: "Open it" }).getAttribute("href")).toBe("/programs/live")
  })

  it("cannot be dated in the future, in the account's zone", async () => {
    const user = userEvent.setup()
    vi.setSystemTime(new Date("2026-09-15T16:00:00.000Z"))
    openDialog()

    await user.click(screen.getByTestId("log-past-workout"))
    // 16:00Z is 18:00 in Copenhagen — the ceiling is the account's now, not
    // the device's 04:00 the next morning.
    expect(screen.getByLabelText(/when the workout was/i).getAttribute("max")).toBe("2026-09-15T18:00")
    vi.useRealTimers()
  })
})
