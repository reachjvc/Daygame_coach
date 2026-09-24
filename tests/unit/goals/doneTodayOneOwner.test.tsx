/**
 * "IS THIS DONE TODAY" HAD FIVE ANSWERS, AND FOUR OF THEM WERE WRONG.
 *
 * A finished gym session and a hand tick on "Strength session" are two records
 * of one morning. Only one surface in the app merged them — the schedule's step
 * row. The group header two lines above it, the Today tab's "N of M done", the
 * season band at the top of `/dashboard/tracking` and the Recap tab's practice
 * rows all counted hand ticks alone. So a person who trained and ticked nothing
 * saw a struck-through row under a header reading `0/1`, and a dashboard that
 * said nothing had been done on a morning something had.
 *
 * `src/goals/dayTicks.ts` is the one owner now, and the arguments that carry
 * the training log are REQUIRED — an optional one is what let this happen.
 *
 * **THE TEST THAT WAS MISSING.** `trackTabDerivedTicks.test.tsx` is named after
 * `TrackTab` and renders `TrackSchedule` directly with a map built in the
 * fixture. It therefore could not see the defect that mattered: `TrackTab`
 * passed the log to the schedule on its `checking` and signed-OUT branches and
 * forgot it on the signed-IN one — the only branch a real person sits in — so
 * the feature was dead for everybody it was built for, with every test green.
 * Everything below renders the REAL caller and lets it resolve auth.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { TrackTab } from "@/src/goals/components/north-star/TrackTab"
import { addRoutine, emptyNsPlan, toggleRoutineStep, updateStep } from "@/src/goals/northStarService"
import { NO_PUSHED_GOALS, groupLogged, todayItems, todayProgress, trackActivities, trackGroups } from "@/src/goals/northStarTrackService"
import { NO_TRAINING_TICKS, stepTick, trainingTicks } from "@/src/goals/dayTicks"
import type { NsPlan } from "@/src/goals/types"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/life-mastery",
  useSearchParams: () => new URLSearchParams(),
}))

/* The hub is its own screen with its own data; this file is about the schedule
   above it, and letting it render would drag the whole goals hub in. */
vi.mock("@/src/goals/components/GoalsHubContent", () => ({
  GoalsHubContent: () => null,
}))

/** 2026-09-14 is a Monday, and the schedule's days are 0 = Monday. */
const TODAY = "2026-09-14"
const ZONE = "Europe/Copenhagen"

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
  return { plan: updateStep(withStep, routine.id, step.id, { days: [0] }, at), strengthStepId: step.id }
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
  /* 200 with an empty list is a SIGNED-IN account with no goals — which is the
     branch the defect lived on. A 401 here would render the signed-out branch,
     which always passed the log and would have hidden the bug all over again. */
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("[]", { status: 200, headers: { "content-type": "application/json" } }))
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("the training log reaches the schedule on the branch a signed-in person sees", () => {
  it("a finished session is on screen once the account has answered", async () => {
    const { plan, strengthStepId } = planWithTraining()

    render(
      <TrackTab
        plan={plan}
        runId="r1"
        today={TODAY}
        ticks={{ [TODAY]: [strengthStepId] }}
        onToggleStep={vi.fn()}
      />
    )

    /* Waiting for the signed-in branch specifically. Asserting before this
       resolves would test the `checking` branch, which always passed the log —
       and passing for that reason is how this stayed broken. */
    await waitFor(() => expect(screen.queryByText(/Checking your goals/i)).toBeNull())
    expect(screen.queryByText(/Sign in/i), "this must be the signed-IN branch").toBeNull()

    expect(
      screen.queryAllByText(/from your training log/i).length,
      "signed in, the schedule was handed no training log at all and drew the week as untrained",
    ).toBeGreaterThan(0)
  })

  it("and the header above that row counts it too", async () => {
    const { plan, strengthStepId } = planWithTraining()

    render(
      <TrackTab
        plan={plan}
        runId="r1"
        today={TODAY}
        ticks={{ [TODAY]: [strengthStepId] }}
        onToggleStep={vi.fn()}
      />
    )

    await waitFor(() => expect(screen.queryByText(/Checking your goals/i)).toBeNull())
    expect(screen.queryByText("0/1"), "the header disagreed with the row under it").toBeNull()
  })
})

/**
 * THE FOUR SURFACES, ASKED THE SAME QUESTION ABOUT THE SAME MORNING.
 *
 * Not four renders: four calls to the functions each screen uses, which is
 * where the disagreement lived. A test that only rendered would pass on a day
 * the layout changed and say nothing about the rule.
 */
describe("every surface gives the same answer for one morning", () => {
  const cases = [
    { what: "trained, never hand-ticked", trained: true, hand: false, done: 1 },
    { what: "hand-ticked, never trained", trained: false, hand: true, done: 1 },
    { what: "neither", trained: false, hand: false, done: 0 },
  ]

  for (const c of cases) {
    it(`${c.what} — all four say ${c.done} of 1`, () => {
      const { plan: base, strengthStepId } = planWithTraining()
      const plan = c.hand
        ? { ...base, logged: { ...base.logged, [TODAY]: [strengthStepId] } }
        : base
      const ticks = c.trained ? { [TODAY]: [strengthStepId] } : NO_TRAINING_TICKS

      const group = trackGroups(trackActivities(plan)).find((g) =>
        g.activities.some((a) => a.id === strengthStepId)
      )!

      // 1. the schedule's step row, and 2. the group header above it
      expect(stepTick(plan, TODAY, strengthStepId, ticks).done).toBe(c.done === 1)
      expect(groupLogged(plan, TODAY, group, ticks)).toEqual({ done: c.done, total: 1 })
      // 3. the Today tab's list, and 4. the season band, which share this path
      expect(todayProgress(todayItems(plan, TODAY, [], NO_PUSHED_GOALS, ticks))).toEqual({ done: c.done, total: 1 })
    })
  }

  /**
   * The one thing the merge must NOT do: write. A derived tick is computed at
   * render and never lands in `plan.logged`, because a second store is what let
   * the two records disagree in the first place — and because deleting the
   * workout would then leave a hand tick nobody made.
   */
  it("a derived tick is never written into the plan", () => {
    const { plan, strengthStepId } = planWithTraining()
    const ticks = { [TODAY]: [strengthStepId] }

    expect(stepTick(plan, TODAY, strengthStepId, ticks).done).toBe(true)
    expect(plan.logged[TODAY] ?? [], "the plan is untouched by a log-derived tick").toEqual([])
    expect(stepTick(plan, TODAY, strengthStepId, NO_TRAINING_TICKS).done).toBe(false)
  })

  /** And it says so, so the screen can refuse to offer an un-tick. */
  it("says which ticks may not be undone", () => {
    const { plan: base, strengthStepId } = planWithTraining()
    const byHand = { ...base, logged: { ...base.logged, [TODAY]: [strengthStepId] } }

    expect(stepTick(base, TODAY, strengthStepId, { [TODAY]: [strengthStepId] }).fromLog).toBe(true)
    expect(stepTick(byHand, TODAY, strengthStepId, NO_TRAINING_TICKS).fromLog).toBe(false)
  })
})

/**
 * THE TRANSLATION, which is the half a fixture usually fakes.
 *
 * The training log answers in LIBRARY step ids ("strength"), the same on
 * everybody's plan. The step carrying one has an id of its own ("s3") that is
 * not. Every screen asks in the plan's ids, so getting this backwards would
 * tick nothing while looking entirely correct.
 */
describe("building the ticks from real workout rows", () => {
  it("files a session under the plan's own step id, on the account's day", () => {
    const { plan, strengthStepId } = planWithTraining()

    const ticks = trainingTicks(
      plan,
      [{ logged_at: `${TODAY}T18:30:00.000Z`, session_type: "weights" }],
      ZONE
    )

    expect(ticks[TODAY]).toEqual([strengthStepId])
    expect(ticks[TODAY], "the library's id would match no row on any screen").not.toContain("strength")
  })

  /**
   * WHOSE CLOCK. A 23:45 session in Copenhagen is Monday's, and filing it under
   * Tuesday ticks a day nobody trained. Three separate bugs in this repo have
   * come from asking the wrong clock, so the guard is here rather than assumed.
   */
  it("files a late-evening session on the day it happened where the person was", () => {
    const { plan, strengthStepId } = planWithTraining()

    const ticks = trainingTicks(
      plan,
      [{ logged_at: "2026-09-14T21:45:00.000Z", session_type: "weights" }],
      ZONE
    )

    expect(ticks[TODAY], "23:45 in Copenhagen is still Monday").toEqual([strengthStepId])
    expect(ticks["2026-09-15"]).toBeUndefined()
  })

  it("a session of a kind no step claims ticks nothing", () => {
    const { plan } = planWithTraining()

    const ticks = trainingTicks(
      plan,
      [{ logged_at: `${TODAY}T08:00:00.000Z`, session_type: "yoga" }],
      ZONE
    )

    expect(ticks, "the plan holds no mobility step, so there is nothing to tick").toEqual({})
  })
})
