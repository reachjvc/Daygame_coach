// @vitest-environment jsdom
/**
 * A SECOND DEVICE SEES THE COUNT, BECAUSE THE COUNT IS ON THE DAY.
 *
 * Until Q4 of Plans/life-plan-rebuild.md a driver's count lived on a goal the
 * Track step had copied into the old goals table, and resolving "which copied
 * goal is this" through a tag minted in one browser left every other device
 * with no count and no button (`48fa55b1`, then the links). Now the count is
 * the driver's number on each day, in the plan's day half, which every device
 * reads from the account: no copy, no tag, no link.
 *
 * **This file renders the real component**, so a prop the screen forgets to
 * pass shows here and not only in the functions' own tests.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { ROUTES } from "@/src/shared/routes"
import { fireEvent, render, screen } from "@testing-library/react"
import { TodayTab } from "@/src/goals/components/north-star/TodayTab"
import { addGoal, emptyNsPlan, updateGoal } from "@/src/goals/northStarService"
import { NO_TRAINING_TICKS } from "@/src/goals/dayTicks"
import type { NsPlan } from "@/src/goals/types"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => ROUTES.plan,
  useSearchParams: () => new URLSearchParams(),
}))

/** 2026-09-16 is a Wednesday; its week began on Monday the 14th. */
const TODAY = "2026-09-16"

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
  onWriteField: noop, onNumberField: noop, onFieldKind: noop, onFieldSource: noop,
  onAddSubStep: noop, onRenameSubStep: noop, onMoveSubStep: noop, onRemoveSubStep: noop,
  onOpenRoutine: noop, onOpenField: noop, onOpenGoal: noop,
  onOpenStep: noop, onStepGoesTo: noop, onStepAsks: noop, onGoToTab: noop,
}

function renderToday(plan: NsPlan, onCountGoal = vi.fn()) {
  render(<TodayTab plan={plan} today={TODAY} ticks={NO_TRAINING_TICKS} {...HANDLERS} onCountGoal={onCountGoal} />)
  return onCountGoal
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  // Nothing on this screen may ask the old goals table any more.
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("Today fetched something"))))
})
afterEach(() => vi.unstubAllGlobals())

describe("a driver on Today", () => {
  it("shows this week's count from its days, on any device that read them", () => {
    const { plan, driverId } = planWithADriver()
    // Monday 4, Wednesday 2: what the account's day rows hold, as a second device reads them.
    const withDays = { ...plan, numbers: { "2026-09-14": { [driverId]: 4 }, "2026-09-16": { [driverId]: 2 }, "2026-09-13": { [driverId]: 9 } } }
    renderToday(withDays)
    expect(screen.getByText("6 of 20 this week")).toBeTruthy()
  })

  it("logs one, and takes one back, on the day, with no request to the old goals table", () => {
    const { plan, driverId } = planWithADriver()
    const onCountGoal = renderToday({ ...plan, numbers: { "2026-09-16": { [driverId]: 1 } } })
    fireEvent.click(screen.getByRole("button", { name: "Log one Twenty approaches" }))
    fireEvent.click(screen.getByRole("button", { name: "Take one back off Twenty approaches" }))
    expect(onCountGoal.mock.calls).toEqual([[driverId, 1], [driverId, -1]])
    // The one read Today makes is the role model council's card
    // (Plans/role-models.md, Phase 8); nothing goes near the old goals table.
    const urls = vi.mocked(fetch).mock.calls.map(([u]) => String(u))
    expect(urls.filter((u) => !u.startsWith("/api/role-models/council"))).toEqual([])
  })

  it("counts a driver that was never sent anywhere", () => {
    const { plan } = planWithADriver()
    renderToday(plan)
    expect(screen.getByText("0 of 20 this week")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Log one Twenty approaches" })).toBeTruthy()
  })
})
