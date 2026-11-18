import { describe, expect, it } from "vitest"
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import {
  DAY_TEXT_LIMITS,
  PLAN_TEXT_LIMITS,
  charCount,
  findDayBreach,
  findPlanBreach,
  limitMessage,
  planLimit,
} from "@/src/goals/planLimits"
import { DAY_LIMITS } from "@/src/goals/lifePlanDayService"

const MIGRATIONS = path.join(process.cwd(), "supabase/migrations")
const sql = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => readFileSync(path.join(MIGRATIONS, f), "utf8"))
  .join("\n")
/** The migrations that create or change the life_plan_* tables: other features' caps are not the plan's. */
const planSql = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => readFileSync(path.join(MIGRATIONS, f), "utf8"))
  .filter((text) => /life_plan_/.test(text))
  .join("\n")

/** Every `char_length(col) <= n` the database holds, as "col:n". */
const databaseCaps = new Set([...planSql.matchAll(/char_length\((\w+)\)\s*<=\s*(\d+)/g)].map((m) => `${m[1]}:${m[2]}`))

describe("planLimits mirrors the database CHECKs", () => {
  it("every limit named here is a real database cap", () => {
    for (const [table, columns] of Object.entries(PLAN_TEXT_LIMITS)) {
      for (const [column, { max }] of Object.entries(columns!)) {
        // `values.value` and `answers.prompt_id` are written as BETWEEN 1 AND n.
        const between = new RegExp(`char_length\\(\\s*(btrim\\()?${column === "value" ? "value" : column}\\)?\\)\\s*BETWEEN 1 AND ${max}`).test(sql)
        expect(databaseCaps.has(`${column}:${max}`) || between, `${table}.${column} = ${max}`).toBe(true)
      }
    }
  })

  it("every database cap on a plan text column is named here", () => {
    const named = new Set(Object.values(PLAN_TEXT_LIMITS).flatMap((cols) => Object.entries(cols!).map(([c, l]) => `${c}:${l.max}`)))
    // `asked` and `note` are the day half's own columns (DAY_TEXT_LIMITS).
    // `source_target_id` belonged to life_plan_goal_habits, dropped in 20261110100000.
    const missing = [...databaseCaps].filter((c) => !named.has(c) && !["asked:500", "note:100000", "source_target_id:120"].includes(c))
    expect(missing).toEqual([])
  })

  it("the day caps match the day service's", () => {
    expect(DAY_TEXT_LIMITS.note.max).toBe(DAY_LIMITS.text)
    expect(DAY_TEXT_LIMITS.journal.max).toBe(DAY_LIMITS.text)
    expect(DAY_TEXT_LIMITS.asked.max).toBe(DAY_LIMITS.asked)
  })
})

describe("naming the field", () => {
  const goal = (title: string) => ({ upsert: { goals: [{ id: "g", title }] } })

  it("says which text, how long it is and the cap", () => {
    const breach = findPlanBreach(goal("x".repeat(612)))
    expect(breach).toEqual({ field: "Goal title", count: 612, max: 500 })
    expect(limitMessage(breach!)).toBe("Goal title: 612 of 500 characters")
  })

  it("lets a text exactly at the cap through", () => {
    expect(findPlanBreach(goal("x".repeat(500)))).toBeNull()
  })

  it("counts characters the way the database does, not UTF-16 units", () => {
    // 300 emoji are 600 units and 300 characters: under the 500 cap.
    expect(findPlanBreach(goal("😀".repeat(300)))).toBeNull()
    expect(charCount("😀😀")).toBe(2)
  })

  it("looks in every table it knows, and ignores ones it does not", () => {
    expect(findPlanBreach({ upsert: { areas: [{ label: "a".repeat(201) }] } })?.field).toBe("Area name")
    expect(findPlanBreach({ upsert: { goal_serves: [{ goal_id: "x".repeat(5000) }] } })).toBeNull()
    expect(findPlanBreach({ upsert: {} })).toBeNull()
  })

  it("counts a value after btrim, as the database does", () => {
    const padded = { upsert: { values: [{ value: `${" ".repeat(50)}${"v".repeat(200)}${" ".repeat(50)}` }] } }
    expect(findPlanBreach(padded)).toBeNull()
    expect(findPlanBreach({ upsert: { values: [{ value: "v".repeat(201) }] } })).toEqual({ field: "Value", count: 201, max: 200 })
  })

  it("gives inputs the same number", () => {
    expect(planLimit("goals", "title")).toBe(500)
    expect(planLimit("areas", "label")).toBe(200)
    expect(planLimit("goals", "nope")).toBeUndefined()
  })

  it("checks the day's note and journal lines", () => {
    expect(findDayBreach({ note: "n".repeat(100_001) })).toEqual({ field: "Day note", count: 100_001, max: 100_000 })
    expect(findDayBreach({ journal: { q1: "ok", q2: "j".repeat(100_001) } })?.field).toBe("Journal line")
    expect(findDayBreach({ note: "fine", journal: { q1: "fine" } })).toBeNull()
  })
})
