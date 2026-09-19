/**
 * STARTING A WEEK YOU WROTE YOURSELF.
 *
 * TWO FAULTS, both about the app forgetting what it had already done.
 *
 * IT HAD NO NAME. The builder posted with no label, so `enrollInProgram` fell
 * back to the catalogue shell every self-built week shares — and the live
 * header, History and the Tracking card all read "Your own program" for three
 * different weeks at once.
 *
 * IT STAYED ARMED. "Started" was component state, so it returned to idle on
 * every remount and the saved design was never marked as started at all. Come
 * back the next day, press the still-green Start, and the copy you were three
 * weeks into is silently paused and a fresh one begun from your typed weights
 * — with nothing on screen saying so.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CustomProgramBuilder } from "@/src/programs/components/CustomProgramBuilder"
import type { ProgramEnrollment, ProgramSchedule } from "@/src/programs/types"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/life-mastery",
  useSearchParams: () => new URLSearchParams(),
}))

const SCHEDULE: ProgramSchedule = {
  kind: "linear_rotation",
  days: [
    {
      id: "d1",
      label: "Full body",
      exercises: [
        {
          id: "lib_squat",
          name: "Squat",
          metricType: "load",
          scheme: { kind: "linear", sets: 5, reps: 5 },
          progression: {
            kind: "linear_load",
            incrementKg: 2.5,
            incrementLb: 5,
            deloadAfterFails: 3,
            deloadPct: 0.1,
          },
        },
      ],
    },
  ],
}

const running = (over: Partial<ProgramEnrollment> = {}): ProgramEnrollment =>
  ({
    id: "e-running",
    user_id: "u1",
    program_id: "custom",
    level: "intermediate",
    unitSystem: "kg",
    exerciseState: {},
    cursor: { cycle: 1, week: 1, dayIndex: 0, sessionCount: 0 },
    is_active: true,
    started_at: "2026-09-14T10:00:00.000Z",
    customSchedule: SCHEDULE,
    label: "Winter block",
    ...over,
  }) as ProgramEnrollment

/** The enrollment list, then whatever the POST should answer. */
function server(list: ProgramEnrollment[], post?: { status?: number; body?: unknown }) {
  const posted: { url: string; body: Record<string, unknown> }[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        posted.push({ url: String(url), body: JSON.parse(String(init.body)) })
        return {
          ok: (post?.status ?? 201) < 400,
          status: post?.status ?? 201,
          json: async () => post?.body ?? { enrollment: { id: "e-new", program_id: "custom", started_at: "x" } },
        } as unknown as Response
      }
      return { ok: true, status: 200, json: async () => list } as unknown as Response
    })
  )
  return posted
}

function builder(over: { startedEnrollmentId?: string | null } = {}) {
  const onStarted = vi.fn()
  const onStartedEnrollment = vi.fn()
  render(
    <CustomProgramBuilder
      schedule={SCHEDULE}
      onChange={vi.fn()}
      unit="kg"
      onUnit={vi.fn()}
      weights={{ lib_squat: "60" }}
      onWeight={vi.fn()}
      onWeights={vi.fn()}
      ownLifts={[]}
      onRememberLift={vi.fn()}
      onForget={vi.fn()}
      onStarted={onStarted}
      startedEnrollmentId={over.startedEnrollmentId ?? null}
      onStartedEnrollment={onStartedEnrollment}
    />
  )
  return { onStarted, onStartedEnrollment }
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("naming the week before it starts", () => {
  it("asks for a name and sends it as the label", async () => {
    const user = userEvent.setup()
    const posted = server([])
    const { onStartedEnrollment } = builder()

    await user.click(await screen.findByRole("button", { name: /start tracking this/i }))

    // A dialog, prefilled with the day labels — never a date, which would make
    // the name depend on whose clock made it.
    const box = await screen.findByLabelText(/week name/i)
    expect((box as HTMLInputElement).value).toBe("Full body")

    await user.clear(box)
    await user.type(box, "Winter block")
    await user.click(screen.getAllByRole("button", { name: /start tracking this/i }).pop()!)

    await waitFor(() => expect(posted).toHaveLength(1))
    expect(posted[0].body.label).toBe("Winter block")
    expect(posted[0].body.programId).toBe("custom")
    // Recorded on the design, so the next mount knows this week is running.
    await waitFor(() => expect(onStartedEnrollment).toHaveBeenCalledWith("e-new"))
  })

  it("will not start with the name emptied", async () => {
    const user = userEvent.setup()
    const posted = server([])
    builder()

    await user.click(await screen.findByRole("button", { name: /start tracking this/i }))
    const box = await screen.findByLabelText(/week name/i)
    await user.clear(box)

    const confirm = screen.getAllByRole("button", { name: /start tracking this/i }).pop()!
    expect(confirm).toBeDisabled()
    await user.click(confirm)
    expect(posted).toHaveLength(0)
  })

  it("says what the start pushed aside", async () => {
    const user = userEvent.setup()
    server([], {
      body: {
        enrollment: { id: "e-new", program_id: "custom", started_at: "x" },
        displaced: [{ program_id: "custom", label: "Autumn block" }],
      },
    })
    builder()

    await user.click(await screen.findByRole("button", { name: /start tracking this/i }))
    await user.type(await screen.findByLabelText(/week name/i), "x")
    await user.click(screen.getAllByRole("button", { name: /start tracking this/i }).pop()!)

    // Named by its LABEL, not by the shell every self-built week shares.
    const said = await screen.findByTestId("builder-displaced")
    expect(said.textContent).toContain("Autumn block")
  })
})

describe("a design that is already running", () => {
  it("shows when it started instead of an armed Start", async () => {
    server([running()])
    builder({ startedEnrollmentId: "e-running" })

    const said = await screen.findByTestId("builder-already-running")
    expect(said.textContent).toMatch(/running since/i)
    expect(screen.getByRole("link", { name: /go to today's session/i })).toBeTruthy()
    // The button that silently paused the copy you were on is not there.
    expect(screen.queryByRole("button", { name: /^start tracking this$/i })).toBeNull()
  })

  it("is recognised by its week even when no id was recorded", async () => {
    // A design saved before the id was recorded, or restored on another device.
    server([running()])
    builder({ startedEnrollmentId: null })

    expect(await screen.findByTestId("builder-already-running")).toBeTruthy()
  })

  it("offers a fresh copy, and says what that costs before doing it", async () => {
    const user = userEvent.setup()
    const posted = server([running()])
    const asked = vi.fn<(message?: string) => boolean>(() => false)
    vi.stubGlobal("confirm", asked)
    builder({ startedEnrollmentId: "e-running" })

    await user.click(await screen.findByRole("button", { name: /start a fresh copy/i }))

    expect(String(asked.mock.calls[0]?.[0])).toMatch(/pauses the copy you are on/i)
    // Dismissed, so nothing was started.
    expect(posted).toHaveLength(0)
  })
})
