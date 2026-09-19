/**
 * THE SYSTEMS STEP STOPPED OFFERING TO EDIT A WEEK IT DOES NOT OWN.
 *
 * The card rendered the plan's own COPY of the training week with rename,
 * move, remove and a "training days" stepper — and none of it reached the
 * program. Rename Workout A to "Chest day" here, go to the gym, and the app
 * prescribes Workout A. Two versions of one week, and nothing able to say
 * which was right.
 *
 * The stepper was wrong on its own terms too: it showed the plan's count of
 * the program's day TEMPLATES, so StrongLifts — two templates, trained three
 * times a week — read "2×/wk".
 *
 * Five states, because "could not read your programs" and "no program" must
 * not look the same: one is a week you may type into, the other is a week
 * nobody can currently see.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { RoutineCard } from "@/src/goals/components/north-star/RoutineCard"
import { addRoutine, emptyNsPlan } from "@/src/goals/northStarService"
import type { LinkedProgram, NsRoutine } from "@/src/goals/types"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/life-mastery",
  useSearchParams: () => new URLSearchParams(),
}))

beforeEach(() => {
  // The card's Peek measures itself; jsdom has no ResizeObserver and React
  // reports its absence as an opaque AggregateError from inside the reconciler.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
})

const handlers = new Proxy({}, { get: () => vi.fn() }) as never

/** The workout routine — the only one with a training week. */
function workoutRoutine(): NsRoutine {
  const plan = addRoutine(emptyNsPlan(), "workout", "2026-09-19T10:00:00.000Z")
  return plan.routines.find((r) => r.blueprintId === "workout")!
}

function card(linkedProgram: LinkedProgram) {
  const plan = emptyNsPlan()
  render(
    <RoutineCard
      routine={workoutRoutine()}
      areas={plan.areas}
      editing
      open
      onToggleOpen={vi.fn()}
      handlers={handlers}
      linkedProgram={linkedProgram}
    />
  )
}

/**
 * The ROUTINE-level stepper that invented a weekly number for the whole week.
 *
 * Asserted through its buttons rather than its label, because the label reads
 * "training days" or "runs" depending on the routine's kind — and through the
 * buttons rather than a blanket "no ×/wk anywhere", because a routine's
 * individual STEPS legitimately carry their own cadence and always have. The
 * fault was the one number that claimed to describe the program's week.
 */
const weeklyStepper = () => screen.queryAllByLabelText(/(More|Fewer) days for/i)

describe("a training week a program owns", () => {
  it("shows the derived week, and no way to edit a copy of it", () => {
    card({ state: "linked", name: "StrongLifts 5×5", week: "Workout A · Workout B, in turn" })

    expect(screen.getByTestId("training-week-linked").textContent).toContain("StrongLifts 5×5")
    expect(screen.getByText("Workout A · Workout B, in turn")).toBeTruthy()

    // The editing surface is gone: no day-name boxes, no steppers, no number.
    expect(screen.queryByLabelText(/Name for training day/i)).toBeNull()
    expect(screen.queryByLabelText(/More days for/i)).toBeNull()
    expect(screen.queryByLabelText(/Fewer days for/i)).toBeNull()
    expect(screen.queryByText(/Name your training days/i)).toBeNull()
  })

  it("offers the page that can actually change it", () => {
    card({ state: "linked", name: "StrongLifts 5×5", week: "Mon · Thu — Upper / Lower" })
    const link = screen.getByRole("link", { name: /change on the training page/i })
    expect(link.getAttribute("href")).toContain("/programs")
  })
})

describe("more than one program running", () => {
  it("says how many, and shows no week at all", () => {
    card({ state: "several", count: 2 })

    expect(screen.getByTestId("training-week-several").textContent).toMatch(/2 programs running/)
    // Which week is "the" week has no answer with two running, so none is given.
    expect(weeklyStepper()).toHaveLength(0)
    expect(screen.queryByLabelText(/Name for training day/i)).toBeNull()
  })
})

describe("the programs could not be read", () => {
  it("says so, and shows no number anywhere", () => {
    card({ state: "failed" })

    expect(screen.getByTestId("training-week-failed").textContent).toMatch(/could not read your program/i)
    // Never a guessed "2×/wk" under an amber warning.
    expect(weeklyStepper()).toHaveLength(0)
    expect(screen.queryByLabelText(/Name for training day/i)).toBeNull()
  })
})

describe("no program at all", () => {
  it("leaves the week editable, because a hand-written week is a real thing", () => {
    card({ state: "none" })

    expect(screen.queryByTestId("training-week-linked")).toBeNull()
    expect(screen.queryByTestId("training-week-failed")).toBeNull()
    // The designer is there to be typed into: day names, and the stepper.
    expect(screen.getByLabelText(/Name for training day 1/i)).toBeTruthy()
    expect(weeklyStepper().length).toBeGreaterThan(0)
  })
})
