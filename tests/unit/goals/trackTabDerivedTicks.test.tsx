/**
 * THE TRACK STEP DID NOT KNOW YOU HAD TRAINED.
 *
 * Its ticks lived only in the plan in the browser. So a week with three
 * finished gym sessions — logged set by set at the rack, stored in the
 * database, visible in History — showed zero against "Strength session" until
 * somebody went back and ticked it by hand.
 *
 * Two records of one workout, kept apart and free to disagree, and the one
 * being ignored was the one the person had actually done.
 *
 * The tick is derived at render and never written into the plan: copying it
 * into the second store is what let them disagree in the first place.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { TrackSchedule } from "@/src/goals/components/north-star/TrackSchedule"
import { addRoutine, emptyNsPlan, toggleRoutineStep, updateStep } from "@/src/goals/northStarService"
import type { NsPlan } from "@/src/goals/types"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/life-mastery",
  useSearchParams: () => new URLSearchParams(),
}))

const TODAY = "2026-09-14"

/**
 * A plan with the training routine AND its "strength" step in the stack.
 *
 * A routine with no steps renders the schedule's empty state, so without this
 * every assertion below would pass by there being nothing on screen at all.
 */
function planWithTraining(): { plan: NsPlan; strengthStepId: string } {
  const at = `${TODAY}T08:00:00.000Z`
  const plan = addRoutine(emptyNsPlan(), "workout", at)
  const routine = plan.routines.find((r) => r.blueprintId === "workout")!
  const withStep = routine.steps.some((st) => st.libraryStepId === "strength")
    ? plan
    : toggleRoutineStep(plan, routine.id, "strength", at)
  const step = withStep.routines
    .find((r) => r.blueprintId === "workout")!
    .steps.find((st) => st.libraryStepId === "strength")!
  // Placed on the day the tests use, so the day view has something to draw.
  // 2026-09-14 is a Monday; the grid's days are 0 = Monday.
  return { plan: updateStep(withStep, routine.id, step.id, { days: [0] }, at), strengthStepId: step.id }
}

/**
 * The derived map speaks the PLAN's step ids, not the library's.
 * `STEP_FOR_SESSION_TYPE` answers "strength", which is the same on everybody's
 * plan; the step carrying it has an id of its own that is not. TrackTab does
 * this translation, so the fixture does it too rather than testing a map the
 * real caller never produces.
 */

function schedule(over: {
  /** Dates on which a finished strength session exists. */
  trainedOn?: string[]
  logUnavailable?: boolean
  onRetryLog?: () => void
} = {}) {
  const onToggleStep = vi.fn()
  const { plan, strengthStepId } = planWithTraining()
  const derivedTicks = new Map<string, Set<string>>(
    (over.trainedOn ?? []).map((date) => [date, new Set([strengthStepId])])
  )
  render(
    <TrackSchedule
      plan={plan}
      today={TODAY}
      onToggleStep={onToggleStep}
      derivedTicks={over.trainedOn ? derivedTicks : undefined}
      logUnavailable={over.logUnavailable}
      onRetryLog={over.onRetryLog}
    />
  )
  return { onToggleStep }
}

beforeEach(() => {
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

describe("a finished workout ticks its step", () => {
  it("says where the tick came from", () => {
    schedule({ trainedOn: [TODAY] })

    const said = screen.queryAllByText(/from your training log/i)
    expect(said.length, "the strength step should be marked as done from the log").toBeGreaterThan(0)
  })

  it("shows nothing of the sort when the log has no session that day", () => {
    schedule({ trainedOn: ["2026-09-01"] })
    expect(screen.queryByText(/from your training log/i)).toBeNull()
  })

  it("shows nothing of the sort when no log was supplied at all", () => {
    schedule()
    expect(screen.queryByText(/from your training log/i)).toBeNull()
  })
})

describe("a training log that could not be read", () => {
  it("says so, and offers to try again", () => {
    const onRetryLog = vi.fn()
    schedule({ logUnavailable: true, onRetryLog })

    const said = screen.getByTestId("training-log-unavailable")
    expect(said.textContent).toMatch(/could not read your training log/i)
    // It says what the ticks below therefore mean, rather than leaving an
    // untouched week looking like the whole story.
    expect(said.textContent).toMatch(/hand-ticked only/i)
    expect(said.getAttribute("role")).toBe("alert")
    expect(screen.getByRole("button", { name: /try again/i })).toBeTruthy()
  })

  it("stays quiet when the log read fine", () => {
    schedule({ trainedOn: [] })
    expect(screen.queryByTestId("training-log-unavailable")).toBeNull()
  })
})
