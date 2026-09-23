// @vitest-environment jsdom

/**
 * WRITING YOUR WEEK OUT, AND WHAT STARTING ONE COSTS.
 *
 * This replaces `customBuilderStart.test.tsx`, which drove the 1,221-line
 * tap-to-build builder. Its two faults were both the app forgetting what it had
 * already done:
 *
 *   IT HAD NO NAME. The builder posted with no label, so `enrollInProgram` fell
 *   back to the catalogue shell every self-built week shares — and the live
 *   header, History and the Tracking card all read "Your own program" for three
 *   different weeks at once.
 *
 *   IT STAYED ARMED. "Started" was component state, so it returned to idle on
 *   every remount. Come back the next day, press the still-green Start, and the
 *   copy you were three weeks into was silently paused and a fresh one begun
 *   from your typed weights, with nothing on screen saying so.
 *
 * ONE FACT THE OLD SUITE HELD THAT THIS DELIBERATELY DOES NOT: "offers a fresh
 * copy, and says what that costs before doing it". The written screen has no
 * fresh-copy path at all — an already-running week offers today's session and
 * nothing else. Restarting a block is still possible and is now two deliberate
 * acts on the screen that owns programs: end the running one, then start this.
 * That is the plan's decision, and it removes the exact foot-gun above rather
 * than labelling it.
 */

import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { BuildYourWeek } from "@/src/programs/components/BuildYourWeek"
import { BUILDER_STORAGE_KEY } from "@/src/programs/programText"
import type { ProgramEnrollment, ProgramSchedule } from "@/src/programs/types"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/programs",
  useSearchParams: () => new URLSearchParams(),
}))

/** Every request the screen made, with its parsed body. */
let calls: Array<{ method: string; url: string; body: Record<string, unknown> }> = []
let drafts: unknown[] = []
let enrollReply: { status: number; body: unknown } = {
  status: 201,
  body: { enrollment: { id: "e1" } },
}

function installFetch() {
  calls = []
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString()
    const method = init?.method ?? "GET"
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    calls.push({ method, url, body })

    if (url.startsWith("/api/programs/enrollments")) {
      return new Response(JSON.stringify(enrollReply.body), { status: enrollReply.status })
    }
    if (url.startsWith("/api/programs/drafts")) {
      if (method === "GET") return new Response(JSON.stringify(drafts), { status: 200 })
      return new Response(JSON.stringify({ id: "d1", name: body.name }), { status: 201 })
    }
    return new Response(JSON.stringify({}), { status: 200 })
  }))
}

beforeEach(() => {
  drafts = []
  enrollReply = { status: 201, body: { enrollment: { id: "e1" } } }
  window.localStorage.clear()
  installFetch()
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

const onStarted = vi.fn()

function screenFor(enrollments: ProgramEnrollment[] = [], draftId: string | null = null) {
  render(<BuildYourWeek enrollments={enrollments} draftId={draftId} onStarted={onStarted} />)
}

const WEEK = "Push\nBench Press 3x8 @60\n\nPull\nBarbell Row 3x8 @50"

async function write(user: ReturnType<typeof userEvent.setup>, text: string) {
  const box = screen.getByTestId("week-text")
  await user.clear(box)
  // Pasted rather than typed: the parser is the subject, and typing 60
  // characters through React's onChange is 60 re-parses for no extra coverage.
  await user.click(box)
  await user.paste(text)
}

describe("what the box reads back", () => {
  it("shows a row per day once the week parses, and arms Start", async () => {
    const user = userEvent.setup()
    screenFor()
    await write(user, WEEK)

    const readback = screen.getByTestId("week-readback")
    expect(readback.textContent).toContain("Push")
    expect(readback.textContent).toContain("Bench Press 3×8 @60")
    expect(readback.textContent).toContain("Pull")
    expect(screen.getByTestId("week-start")).not.toBeDisabled()
  })

  it("reads a bodyweight lift back in the word it was written in", async () => {
    const user = userEvent.setup()
    screenFor()
    await write(user, "Pull\nPull-up 3x5 @bw")
    // Stored as 0, which is the truth, and "@0" reads as zero kilos.
    expect(screen.getByTestId("week-readback").textContent).toContain("Pull-up 3×5 @bw")
  })

  it("names the line it cannot read, and refuses to start until it is fixed", async () => {
    const user = userEvent.setup()
    screenFor()
    // A set count no program could mean. Dropping the line silently would lose
    // a lift out of somebody's week without saying so.
    await write(user, "Push\nBench Press 99x8 @60")

    const problems = screen.getByTestId("week-problems")
    expect(problems.textContent).toMatch(/Line 2/)
    expect(screen.getByTestId("week-start")).toBeDisabled()
  })

  it("will not start an empty box", () => {
    screenFor()
    expect(screen.getByTestId("week-start")).toBeDisabled()
  })
})

describe("starting a written week", () => {
  it("asks for a name, and sends it as the label with the week", async () => {
    const user = userEvent.setup()
    screenFor()
    await write(user, WEEK)
    await user.click(screen.getByTestId("week-start"))
    await user.type(screen.getByLabelText("Name"), "Winter block")
    await user.click(screen.getByTestId("week-name-save"))

    await waitFor(() => {
      const post = calls.find((c) => c.method === "POST" && c.url.startsWith("/api/programs/enrollments"))
      expect(post, "no enrolment was posted").toBeTruthy()
      expect(post!.body.label).toBe("Winter block")
      expect(post!.body.programId).toBe("custom")
      expect((post!.body.customSchedule as ProgramSchedule).kind).toBe("linear_rotation")
    })
  })

  it("refuses an empty name out loud, and posts nothing", async () => {
    const user = userEvent.setup()
    screenFor()
    await write(user, WEEK)
    await user.click(screen.getByTestId("week-start"))
    await user.click(screen.getByTestId("week-name-save"))

    expect(screen.getByRole("alert").textContent).toContain("Give this week a name")
    expect(calls.some((c) => c.url.startsWith("/api/programs/enrollments"))).toBe(false)
  })

  it("sends a bodyweight lift as 0, not as nothing", async () => {
    const user = userEvent.setup()
    screenFor()
    await write(user, "Pull\nPull-up 3x5 @bw")
    await user.click(screen.getByTestId("week-start"))
    await user.type(screen.getByLabelText("Name"), "Calisthenics")
    await user.click(screen.getByTestId("week-name-save"))

    await waitFor(() => {
      const post = calls.find((c) => c.url.startsWith("/api/programs/enrollments"))
      expect(post).toBeTruthy()
      const weights = post!.body.workingWeights as Record<string, number>
      // A pull-up starts at nothing, and nothing is a number. Omitting it makes
      // `seedEnrollment` throw for a lift somebody answered about.
      expect(Object.values(weights)).toContain(0)
    })
  })

  it("says what the start pushed aside, and cannot be pressed twice", async () => {
    const user = userEvent.setup()
    enrollReply = {
      status: 201,
      body: { enrollment: { id: "e9" }, displaced: [{ label: "StrongLifts 5×5" }] },
    }
    screenFor()
    await write(user, WEEK)
    await user.click(screen.getByTestId("week-start"))
    await user.type(screen.getByLabelText("Name"), "Winter block")
    await user.click(screen.getByTestId("week-name-save"))

    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Winter block is running"))
    expect(screen.getByText(/StrongLifts 5×5 moved to your finished programs/)).toBeTruthy()
    // The Start that stayed armed is gone, and so is the autosave behind it.
    expect(screen.queryByTestId("week-start")).toBeNull()
    expect(window.localStorage.getItem(BUILDER_STORAGE_KEY)).toBeNull()
  })
})

describe("a week that is already running", () => {
  /** The same two days and lifts, at weights the engine has since moved. */
  const running = (): ProgramEnrollment =>
    ({
      id: "e-running",
      user_id: "u1",
      program_id: "custom",
      level: "intermediate",
      unitSystem: "kg",
      exerciseState: {},
      cursor: { cycle: 1, week: 1, dayIndex: 0, sessionCount: 4 },
      is_active: true,
      started_at: "2026-09-01T08:00:00.000Z",
      customSchedule: {
        kind: "linear_rotation",
        days: [
          {
            id: "d1",
            label: "Push",
            exercises: [
              {
                id: "d1_e1",
                name: "Bench Press",
                metricType: "load",
                // 82.5, not the 60 that was written: four sessions in.
                scheme: { kind: "linear", sets: 3, reps: 8 },
                progression: { kind: "none" },
              },
            ],
          },
          {
            id: "d2",
            label: "Pull",
            exercises: [
              {
                id: "d2_e1",
                name: "Barbell Row",
                metricType: "load",
                scheme: { kind: "linear", sets: 3, reps: 8 },
                progression: { kind: "none" },
              },
            ],
          },
        ],
      },
    }) as ProgramEnrollment

  it("offers today's session instead of a second start, though the weights differ", async () => {
    const user = userEvent.setup()
    screenFor([running()])
    await write(user, WEEK)

    /**
     * MATCHED ON STRUCTURE. The engine moves the weights from the first session
     * on, so a text or a deep comparison stops matching after one workout — and
     * the screen would then offer to start a second copy of the week somebody is
     * already running, which silently pauses the first.
     */
    const link = screen.getByTestId("week-already-running")
    expect(link.getAttribute("href")).toBe("/programs?program=e-running")
    expect(screen.queryByTestId("week-start")).toBeNull()
  })

  it("does not match a different week", async () => {
    const user = userEvent.setup()
    screenFor([running()])
    await write(user, "Legs\nSquat 5x5 @100")

    expect(screen.queryByTestId("week-already-running")).toBeNull()
    expect(screen.getByTestId("week-start")).not.toBeDisabled()
  })
})

describe("the box between visits", () => {
  it("reopens on whatever was being written", async () => {
    window.localStorage.setItem(BUILDER_STORAGE_KEY, JSON.stringify({ text: WEEK, unit: "lb" }))
    screenFor()
    await waitFor(() => expect(screen.getByTestId("week-text")).toHaveValue(WEEK))
    expect(screen.getByRole("button", { name: "lb" })).toHaveAttribute("aria-pressed", "true")
  })

  it("converts what the old builder left behind, rather than dropping it", async () => {
    /**
     * The tap-to-build builder stored a whole structured design under the same
     * key. Ignoring it would lose a week somebody had left half-written on the
     * screen that has just been deleted.
     */
    window.localStorage.setItem(
      BUILDER_STORAGE_KEY,
      JSON.stringify({
        unit: "kg",
        weights: { d1_e1: "60" },
        schedule: {
          kind: "linear_rotation",
          days: [
            {
              id: "d1",
              label: "Push",
              exercises: [
                {
                  id: "d1_e1",
                  name: "Bench Press",
                  metricType: "load",
                  scheme: { kind: "linear", sets: 3, reps: 8 },
                  progression: { kind: "none" },
                },
              ],
            },
          ],
        },
      })
    )
    screenFor()
    await waitFor(() =>
      expect((screen.getByTestId("week-text") as HTMLTextAreaElement).value).toContain("Push")
    )
    // The weight came back with it, so the conversion is of the whole design
    // rather than of its day names.
    expect((screen.getByTestId("week-text") as HTMLTextAreaElement).value).toContain("@60")
  })
})

describe("saving a week for later", () => {
  it("asks for a name and POSTs it", async () => {
    const user = userEvent.setup()
    screenFor()
    await write(user, WEEK)
    await user.click(screen.getByTestId("week-save"))
    await user.type(screen.getByLabelText("Name"), "Test week")
    await user.click(screen.getByTestId("week-name-save"))

    await waitFor(() => {
      const post = calls.find((c) => c.method === "POST" && c.url === "/api/programs/drafts")
      expect(post).toBeTruthy()
      expect(post!.body.name).toBe("Test week")
    })
  })
})
