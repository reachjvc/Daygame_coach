// @vitest-environment jsdom

/**
 * THE ACHIEVEMENTS BLOCK ON A GOAL CARD (Plans/life-plan-achievements.md).
 *
 * A counted goal lists what it has and what is next; a bigger goal lists what
 * the goals feeding it have earned (the owner's item 22: the goal is a
 * girlfriend, the system is approaching); a goal that is neither shows nothing.
 */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { GoalAchievements } from "@/src/goals/components/north-star/Achievements"
import { addGoal, emptyNsPlan, linkGoal, updateGoal } from "@/src/goals/northStarService"
import type { NsPlan } from "@/src/goals/types"

const NOW = "2026-11-05T09:00:00.000Z"
const TODAY = "2026-11-05"

function plan(): NsPlan {
  let p = addGoal(emptyNsPlan(), "lm_relationship", "Approaches", "habit_ramp", NOW)
  p = updateGoal(p, p.goals[0].id, { perWeek: 21, unit: "approaches", daysPerWeek: 7 }, NOW)
  p = addGoal(p, "lm_relationship", "A girlfriend", "achievement", NOW)
  p = linkGoal(p, p.goals[0].id, p.goals[1].id, NOW)
  p = addGoal(p, "lm_fun", "Northern lights", "achievement", NOW)
  return { ...p, numbers: { "2026-11-03": { [p.goals[0].id]: 12 } } }
}

afterEach(cleanup)

describe("the achievements on a goal card", () => {
  it("lists a counted goal's own, with its day, and the next one", () => {
    const p = plan()
    render(<GoalAchievements plan={p} goal={p.goals[0]} today={TODAY} />)
    const own = screen.getByRole("list", { name: "Achievements on Approaches" })
    expect(own.textContent).toContain("10 approaches in all")
    expect(own.textContent).toContain("3 Nov")
    expect(screen.getByTestId("achievement-next").textContent).toBe("Next: 25 approaches in all (13 to go)")
  })

  it("lists on the bigger goal what the goal feeding it has earned", () => {
    const p = plan()
    render(<GoalAchievements plan={p} goal={p.goals[1]} today={TODAY} />)
    const fed = screen.getByRole("list", { name: "Achievements of what feeds A girlfriend" })
    expect(fed.textContent).toContain("Approaches:")
    expect(fed.textContent).toContain("10 in one day")
    expect(screen.queryByRole("list", { name: "Achievements on A girlfriend" })).toBeNull()
  })

  it("shows nothing on a goal that is neither counted nor fed", () => {
    const p = plan()
    const { container } = render(<GoalAchievements plan={p} goal={p.goals[2]} today={TODAY} />)
    expect(container.textContent).toBe("")
  })
})
