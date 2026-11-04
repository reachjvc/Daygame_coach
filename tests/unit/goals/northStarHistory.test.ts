import { describe, it, expect } from "vitest"
import { emptyNsPlan, normalizeNsPlan, setAnswer, setNorthStar, startNewNorthStar } from "@/src/goals/northStarService"
import { planToRows, rowsToPlan, NORTH_STAR_LOCAL_ID } from "@/src/goals/lifePlanMapper"
import { STAR_PROMPTS } from "@/src/goals/data/northStar"
import { COMMIT_DATE_KEY, COMMIT_KEY, NORTH_STAR_ANSWER_COLUMNS } from "@/src/goals/data/northStarStart"
import type { NsPlan } from "@/src/goals/types"

const PLAN_ID = "11111111-1111-1111-1111-111111111111"
const USER_ID = "22222222-2222-2222-2222-222222222222"

function rows(plan: NsPlan) {
  const minted = new Map<string, string>()
  let n = 0
  return planToRows(plan, {
    planId: PLAN_ID,
    userId: USER_ID,
    idFor: (local) => minted.get(local) ?? minted.set(local, `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`).get(local)!,
  })
}

function written(): NsPlan {
  let plan = setNorthStar(emptyNsPlan(), "I live by the sea and build things.")
  plan = setAnswer(plan, "star_why", "To make people braver.")
  plan = setAnswer(plan, "conduct", "I keep my word.")
  plan = setAnswer(plan, COMMIT_KEY, "I commit.")
  plan = setAnswer(plan, COMMIT_DATE_KEY, "2026-10-01")
  return { ...plan, northStarStartedOn: "2026-09-22" }
}

describe("a north star that is replaced is kept", () => {
  it("moves the current one into the past, ended today, with the answers it had", () => {
    const next = startNewNorthStar(written(), "2026-11-04")
    expect(next.northStar).toBe("")
    expect(next.northStarStartedOn).toBe("2026-11-04")
    expect(next.pastNorthStars).toHaveLength(1)
    expect(next.pastNorthStars[0]).toMatchObject({
      text: "I live by the sea and build things.",
      startedOn: "2026-09-22",
      endedOn: "2026-11-04",
      answers: { star_why: "To make people braver.", conduct: "I keep my word.", [COMMIT_KEY]: "I commit.", [COMMIT_DATE_KEY]: "2026-10-01" },
    })
  })

  it("carries the purpose and the code forward, but asks for the commitment again", () => {
    const next = startNewNorthStar(written(), "2026-11-04")
    expect(next.answers.star_why).toBe("To make people braver.")
    expect(next.answers.conduct).toBe("I keep my word.")
    expect(next.answers[COMMIT_KEY]).toBe("")
    expect(next.answers[COMMIT_DATE_KEY]).toBe("")
  })

  it("keeps nothing when nothing was written", () => {
    const plan = emptyNsPlan()
    expect(startNewNorthStar(plan, "2026-11-04")).toBe(plan)
  })

  it("survives the trip to rows and back, history and answers included", () => {
    const plan = startNewNorthStar(written(), "2026-11-04")
    const again = setNorthStar(plan, "A second picture.")
    const back = rowsToPlan(rows(again))!
    expect(back.pastNorthStars).toEqual(again.pastNorthStars)
    expect(back.northStar).toBe("A second picture.")
    expect(back.answers.star_why).toBe("To make people braver.")
  })

  it("writes one current north star row and one row per earlier one", () => {
    const r = rows(startNewNorthStar(written(), "2026-11-04"))
    expect(r.north_stars.filter((s) => s.ended_on === null)).toHaveLength(1)
    expect(r.north_stars.filter((s) => s.ended_on !== null)).toHaveLength(1)
    const current = r.north_stars.find((s) => s.ended_on === null)!
    expect(r.nodes.find((n) => n.id === current.id)?.local_id).toBe(NORTH_STAR_LOCAL_ID)
  })

  it("reads the answers from the north star's own columns when the answer rows are gone", () => {
    const r = rows(written())
    const back = rowsToPlan({ ...r, answers: [] })!
    expect(back.answers.star_why).toBe("To make people braver.")
    expect(back.answers[COMMIT_KEY]).toBe("I commit.")
    expect(back.answers[COMMIT_DATE_KEY]).toBe("2026-10-01")
  })

  it("gives every north star prompt a column", () => {
    for (const prompt of STAR_PROMPTS) expect(Object.keys(NORTH_STAR_ANSWER_COLUMNS)).toContain(prompt.id)
  })

  it("drops a past north star with no dates rather than inventing them", () => {
    const loaded = normalizeNsPlan({ ...written(), pastNorthStars: [{ id: "x", text: "old" }] })!
    expect(loaded.pastNorthStars).toEqual([])
  })
})
