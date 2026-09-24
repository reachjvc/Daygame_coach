/**
 * A SECOND DEVICE RECOGNISED YOUR PUSHED GOALS AND COULD NOT COUNT AGAINST THEM.
 *
 * `48fa55b1` fixed the duplication half: `life_plan_goals.user_goal_id` is
 * written at push time, so opening the plan on a phone no longer offers to push
 * the fifty goals already on the account. That half worked.
 *
 * The half it left is what a person actually hits. Two surfaces still resolved
 * "which counted goal is this plan goal" through the `ns:<run>:<goal>` TAG
 * alone, and `<run>` is a code minted in one browser's localStorage:
 *
 *   - the goals hub embedded under the Track step narrowed by the tag's prefix,
 *     so on any other device it matched nothing and rendered **empty** —
 *     underneath a step that had just said those goals were tracked;
 *   - the Today step's driver rows gate their progress bar and their "+1" on
 *     `item.goalId`, which came back null, so a driver showed no count and had
 *     no way to add one.
 *
 * Recognised, and invisible. `pushedGoalIds` has been the one owner of that
 * question since `48fa55b1` — links first, the tag only as a fallback for rows
 * pushed before links existed — and both surfaces now ask IT rather than
 * re-deriving the weaker half themselves.
 *
 * **This file renders the real component.** The unit cases in
 * `northStarTrack.test.ts` prove the functions; they cannot see whether the
 * screen passes them what they need, and a prop the caller forgets is exactly
 * how the training-log merge stayed dead for every signed-in person.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { TodayTab } from "@/src/goals/components/north-star/TodayTab"
import { addGoal, emptyNsPlan, updateGoal } from "@/src/goals/northStarService"
import { trackTemplateId } from "@/src/goals/northStarTrackService"
import { NO_TRAINING_TICKS } from "@/src/goals/dayTicks"
import type { NsPlan } from "@/src/goals/types"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/life-mastery",
  useSearchParams: () => new URLSearchParams(),
}))

/** 2026-09-14 is a Monday. */
const TODAY = "2026-09-14"
/** The run the goals were pushed under — on the OTHER device. */
const PUSHED_UNDER = "run-of-the-laptop"
/** What this browser minted for itself, which is the whole problem. */
const THIS_BROWSER = "run-of-the-phone"
const COUNTED_ID = "11111111-1111-1111-1111-111111111111"

/**
 * A plan with one driver — a rate you hold, which is what gets a counter.
 *
 * A milestone would not do: `todayItems` gives a driver the goal id and the
 * count, and gives a step a tick. Only the driver can show this defect.
 */
function planWithADriver(): { plan: NsPlan; driverId: string } {
  const added = addGoal(emptyNsPlan(), "lm_relationship", "Twenty approaches", "habit_ramp")
  const driver = added.goals[added.goals.length - 1]
  return {
    plan: updateGoal(added, driver.id, { perWeek: 20, unit: "approaches" }),
    driverId: driver.id,
  }
}

const noop = vi.fn()
const HANDLERS = {
  onToggleStep: noop, onToggleExperience: noop, onRate: noop, onNote: noop,
  onAddField: noop, onRenameField: noop, onMoveField: noop, onRemoveField: noop,
  onWriteField: noop, onFieldKind: noop, onFieldSource: noop,
  onAddSubStep: noop, onRenameSubStep: noop, onMoveSubStep: noop, onRemoveSubStep: noop,
  onGoToTrack: noop, onOpenRoutine: noop, onOpenField: noop, onOpenGoal: noop,
  onOpenStep: noop, onStepGoesTo: noop, onStepAsks: noop, onGoToTab: noop,
}

function renderToday(goalLinks: Record<string, string>, driverId: string, plan: NsPlan) {
  /* The counted row as the account really returns it: tagged with the run of
     the device that pushed it, which is not this one. */
  const hubGoals = [{
    id: COUNTED_ID,
    template_id: trackTemplateId(PUSHED_UNDER, driverId),
    current_value: 12,
    target_value: 20,
  }]
  return render(
    <TodayTab
      goalsPromise={Promise.resolve(hubGoals as never)}
      plan={plan}
      today={TODAY}
      runId={THIS_BROWSER}
      goalLinks={goalLinks}
      ticks={NO_TRAINING_TICKS}
      {...HANDLERS}
    />
  )
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
})
afterEach(() => vi.unstubAllGlobals())

describe("the Today step on a device that did not push the goals", () => {
  it("shows the driver's count once the account's link is in hand", async () => {
    const { plan, driverId } = planWithADriver()
    renderToday({ [driverId]: COUNTED_ID }, driverId, plan)

    /* "12 of 20" is `TODAY_COPY.countProgress`, and it is drawn only inside the
       `item.goalId &&` branch — the one that was null on this device. */
    await waitFor(() => expect(screen.getByText(/12\s*\/\s*20|12 of 20/)).toBeTruthy())
  })

  /**
   * THE DEFECT ITSELF, kept as a case rather than only as prose: with no link
   * in hand there is nothing to resolve the tag against, and the counter is
   * correctly absent. That is the state every second device was stuck in.
   */
  it("shows no count when the links have not been read, which is what it used to do always", async () => {
    const { plan, driverId } = planWithADriver()
    renderToday({}, driverId, plan)

    await waitFor(() => expect(screen.getByText("Twenty approaches")).toBeTruthy())
    expect(
      screen.queryByText(/12\s*\/\s*20|12 of 20/),
      "without the link the tag is all there is, and it names another browser's run",
    ).toBeNull()
  })
})
