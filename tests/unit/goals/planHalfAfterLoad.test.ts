import { describe, it, expect } from "vitest"
import { planHalfAfterLoad } from "@/src/goals/lifePlanSync"
import { addGoal, normalizeNsPlan, serializeNsPlan, setNorthStar } from "@/src/goals/northStarService"
import { planToRows, rowsToPlan } from "@/src/goals/lifePlanMapper"
import { fullPlan } from "@/tests/support/fullLifePlan"
import type { NsPlan } from "@/src/goals/types"

/**
 * AN EDIT MADE WHILE THE ACCOUNT IS BEING READ (Plans/life-plan-rebuild.md,
 * Phase 5, from the code review): kept when the account holds the very copy
 * the page opened with, and the account's plan taken otherwise.
 */

const NOW = "2026-11-04T09:00:00.000Z"

/** The plan as the account sends it back: through the rows and the loader, as on a real load. */
function fromAccount(plan: NsPlan): NsPlan {
  const minted = new Map<string, string>()
  let n = 0
  const rows = planToRows(plan, {
    planId: "11111111-1111-1111-1111-111111111111",
    userId: "22222222-2222-2222-2222-222222222222",
    idFor: (l) => minted.get(l) ?? minted.set(l, `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`).get(l)!,
  })
  return rowsToPlan(rows)!
}

/** The copy this browser keeps, as the page reads it back from storage. */
function browserCopy(plan: NsPlan): NsPlan {
  return normalizeNsPlan(JSON.parse(serializeNsPlan(plan)))!
}

describe("an edit made while the account is read", () => {
  it("is kept when the account holds the copy the page opened with", () => {
    const opened = browserCopy(fullPlan())
    const edited = addGoal(setNorthStar(opened, "I live by the sea.", NOW), "lm_health", "Swim weekly", "habit_ramp", NOW)
    const out = planHalfAfterLoad(edited, opened, fromAccount(opened))
    expect(out).toBe(edited)
  })

  it("gives way to the account when another device changed the plan since", () => {
    const opened = browserCopy(fullPlan())
    const elsewhere = fromAccount(setNorthStar(opened, "Written on the phone.", NOW))
    const edited = setNorthStar(opened, "Written here.", NOW)
    expect(planHalfAfterLoad(edited, opened, elsewhere)).toBe(elsewhere)
  })

  it("takes the account's plan when nothing was edited, or the page opened with no copy", () => {
    const opened = browserCopy(fullPlan())
    const account = fromAccount(opened)
    expect(planHalfAfterLoad(opened, opened, account)).toBe(account)
    expect(planHalfAfterLoad(setNorthStar(opened, "x", NOW), null, account)).toBe(account)
  })
})
