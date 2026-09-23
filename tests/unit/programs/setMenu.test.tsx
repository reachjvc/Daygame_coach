/**
 * THE THREE FACTS A SET CARRIES BEYOND ITS WEIGHT AND REPS.
 *
 * Whether it was a warm-up, how hard it was, and whether it should be there at
 * all. The set number was a plain 18px `span`, so none of them had anywhere to
 * live: a warm-up logged as a working set stayed one — dragging the lift's
 * average down and counting towards whether the program's session was
 * finished — and the only correction was deleting the set and ticking it again
 * in another row, which loses the time it happened at.
 *
 * What this file holds down is the screen's half: the menu opens off the
 * number, an untouched row keeps its choice locally, and a set that exists is
 * corrected on the server.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { LiveWorkoutScreen } from "@/src/programs/components/live/LiveWorkoutScreen"
import { SetMenu } from "@/src/programs/components/live/SetMenu"
import type { LiveWorkout, LiveWorkoutSet, SessionPrescription } from "@/src/programs/types"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/programs/live",
  useSearchParams: () => new URLSearchParams(),
}))

const workout: LiveWorkout = {
  id: "w1",
  startedAt: new Date(Date.now() - 10 * 60_000).toISOString(),
  enrollmentId: "e1",
  dayId: "A",
  cycle: 1,
  week: 1,
  adjustments: {},
  notes: null,
  rpe: null,
  unit: "kg",
  sets: [],
}

const prescription = {
  programId: "stronglifts-5x5",
  dayId: "A",
  dayLabel: "Workout A",
  cycle: 1,
  week: 1,
  sessionCount: 0,
  periodised: false,
  exercises: [
    {
      exerciseId: "squat",
      name: "Squat",
      sets: [
        { setNumber: 1, weight: 100, reps: 5 },
        { setNumber: 2, weight: 100, reps: 5 },
      ],
    },
  ],
} as unknown as SessionPrescription

const tickedSet = (over: Partial<LiveWorkoutSet> = {}): LiveWorkoutSet => ({
  id: "set-1",
  exerciseId: "squat",
  exercise: "Squat",
  weight: 100,
  weightKg: 100,
  reps: 5,
  setNumber: 1,
  kind: "working",
  prescribedIndex: 0,
  completedAt: "2026-09-23T10:00:00Z",
  rpe: null,
  side: null,
  ...over,
})

function renderScreen(over: Partial<LiveWorkout> = {}) {
  return render(
    <LiveWorkoutScreen
      initial={{ ...workout, ...over }}
      prescription={prescription}
      programName="StrongLifts 5×5"
      unit="kg"
      lastTime={{}}
      timezone="UTC"
    />
  )
}

beforeEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe("the menu behind the set number", () => {
  it("opens off the number, which is a 44px button and not a caption", async () => {
    const user = userEvent.setup()
    renderScreen()
    const number = screen.getByTestId("set-menu-1")
    expect(number.className).toContain("h-11")
    expect(number.className).toContain("w-11")
    await user.click(number)
    expect(screen.getByTestId("set-menu")).toBeTruthy()
  })

  it("offers warm-up, working and drop set — and never Failure", async () => {
    const user = userEvent.setup()
    renderScreen()
    await user.click(screen.getByTestId("set-menu-1"))
    expect(screen.getByTestId("set-kind-warmup")).toBeTruthy()
    expect(screen.getByTestId("set-kind-working")).toBeTruthy()
    expect(screen.getByTestId("set-kind-drop")).toBeTruthy()
    // `workout_sets.set_kind`'s CHECK constraint has no such value, so offering
    // it would write something the database refuses.
    expect(screen.queryByText(/failure/i)).toBeNull()
  })

  it("tags an untouched row locally, and sends nothing, because there is no row to change", async () => {
    const user = userEvent.setup()
    vi.stubGlobal("fetch", vi.fn())
    renderScreen()
    await user.click(screen.getByTestId("set-menu-1"))
    await user.click(screen.getByTestId("set-kind-warmup"))

    /**
     * The row you tapped becomes the warm-up — it does not sprout a second row
     * beside itself. The prescribed working slot comes back the moment the set
     * lands (the test below), and until then nothing is mis-counted: the
     * finish sheet counts `asked` off the PRESCRIPTION and `done` off the
     * working sets actually ticked.
     */
    expect(screen.getByTestId("set-row-W1")).toBeTruthy()
    expect(screen.queryByTestId("set-row-1")).toBeNull()
    expect(screen.getByTestId("set-row-2")).toBeTruthy()
    // And nothing was sent: there is no row on the server to change yet.
    expect(fetch).not.toHaveBeenCalled()
  })

  it("carries that choice, and the effort, to the tick", async () => {
    const user = userEvent.setup()
    const sent: Record<string, unknown>[] = []
    const ticked = tickedSet({ kind: "warmup", weight: 60, rpe: 7 })
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (String(url).includes("/sets") && init?.body) {
          sent.push(JSON.parse(String(init.body)) as Record<string, unknown>)
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ ...workout, sets: [ticked] }),
        } as unknown as Response
      })
    )

    renderScreen()
    await user.click(screen.getByTestId("set-menu-1"))
    await user.click(screen.getByTestId("set-kind-warmup"))

    // The effort, said before the set exists. One step right of 6 is 7.
    await user.click(screen.getByTestId("set-menu-W1"))
    const slider = screen.getByRole("slider")
    slider.focus()
    await user.keyboard("{ArrowRight}")
    await user.click(screen.getByLabelText("Close"))

    /**
     * The warm-up box starts EMPTY: tagging the row dropped a prescription
     * that was written for a working set. 100 kg pre-filled in a warm-up is
     * the number you least want and most easily tick by accident.
     */
    const weight = screen.getByLabelText(/weight for set W1/i) as HTMLInputElement
    expect(weight.value).toBe("")
    await user.type(weight, "60")
    // Both boxes are empty, so both have to be typed — which is the point: a
    // warm-up nobody prescribed suggests nothing.
    await user.type(screen.getByLabelText(/reps for set W1/i), "5")
    await user.click(screen.getByTestId("tick-W1"))

    await waitFor(() => expect(sent.length).toBeGreaterThan(0))
    /**
     * Both travel WITH the tick rather than following it. A set ticked with no
     * signal is written when the signal comes back, and a second request to
     * attach the effort would have nothing to attach it to until then.
     */
    expect(sent[0]).toMatchObject({ kind: "warmup", setNumber: 1, weight: 60, rpe: 7 })

    // And now the set exists, the working row the program asked for is back.
    await waitFor(() => expect(screen.getByTestId("set-row-1")).toBeTruthy())
  })

  it("corrects a set that exists on the server, with one PATCH", async () => {
    const user = userEvent.setup()
    const calls: { url: string; method?: string; body?: unknown }[] = []
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({
          url: String(url),
          method: init?.method,
          body: init?.body ? JSON.parse(String(init.body)) : undefined,
        })
        return {
          ok: true,
          status: 200,
          json: async () => ({ ...workout, sets: [tickedSet({ kind: "warmup" })] }),
        } as unknown as Response
      })
    )

    renderScreen({ sets: [tickedSet()] })
    await user.click(screen.getByTestId("set-menu-1"))
    await user.click(screen.getByTestId("set-kind-warmup"))

    await waitFor(() => expect(calls.length).toBe(1))
    expect(calls[0].method).toBe("PATCH")
    expect(calls[0].url).toBe("/api/workouts/w1/sets/set-1")
    expect(calls[0].body).toEqual({ kind: "warmup" })
  })

  it("names the set that is in the way when the server refuses the re-tag", async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        ({
          ok: false,
          status: 400,
          json: async () => ({
            error: "Squat already has a warm-up set 1 — delete one of them first.",
          }),
        }) as unknown as Response
      )
    )

    renderScreen({ sets: [tickedSet()] })
    await user.click(screen.getByTestId("set-menu-1"))
    await user.click(screen.getByTestId("set-kind-warmup"))

    await waitFor(() =>
      expect(screen.getByTestId("live-error").textContent).toContain(
        "already has a warm-up set 1"
      )
    )
  })

  it("a warm-up already ticked does not mark the working row done", () => {
    renderScreen({ sets: [tickedSet({ id: "w-1", kind: "warmup", weight: 40 })] })
    // Four rows: W1 ticked, and the two working sets the program asked for.
    expect(screen.getByTestId("set-row-W1")).toBeTruthy()
    expect(screen.getByLabelText("Save set 1")).toBeTruthy()
    expect(screen.getByLabelText("Undo set W1")).toBeTruthy()
  })
})

describe("the sheet itself", () => {
  const base = {
    open: true,
    onClose: vi.fn(),
    label: "Set 1",
    kind: "working" as const,
    rpe: null,
    ticked: true,
    onKind: vi.fn(),
    onRpe: vi.fn(),
    onDelete: vi.fn(),
  }

  it("marks the kind the set already is", () => {
    render(<SetMenu {...base} kind="drop" />)
    expect(screen.getByTestId("set-kind-drop").textContent).toContain("✓")
    expect(screen.getByTestId("set-kind-working").textContent).not.toContain("✓")
  })

  it("says the effort has not been said rather than showing a number nobody chose", () => {
    render(<SetMenu {...base} />)
    expect(screen.getByText("not said")).toBeTruthy()
  })

  it("shows the effort that is on the set", () => {
    render(<SetMenu {...base} rpe={9} />)
    expect(screen.getByText("RPE 9")).toBeTruthy()
  })

  it("says which kind of delete it is, because one is undone by a reload", () => {
    const { unmount } = render(<SetMenu {...base} ticked />)
    expect(screen.getByTestId("set-delete").textContent).toBe("Delete this set")
    unmount()
    render(<SetMenu {...base} ticked={false} />)
    expect(screen.getByTestId("set-delete").textContent).toBe("Remove this row")
  })
})
