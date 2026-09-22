/**
 * PHASE 0: THE PLAN'S IDS ARE SAFE TO USE AS DATABASE KEYS.
 *
 * The plan is moving out of the browser and into a table whose rule is
 * `UNIQUE (plan_id, local_id)` — one id, one thing. Before this file, a plan
 * could legally hold two routine steps with the same id, because a step added
 * from a library kept the LIBRARY entry's name as its id, and `stretch` is in
 * both the morning and the night library while `incantations` is in both the
 * morning and the manifestation one. Morning and night both ship by default.
 *
 * Nothing in the browser noticed. The database refuses the plan outright, and
 * before it ever gets there `plan.logged`, `NsDailyField.targetId` and
 * `NsSubStep.targetId` each point at two rows at once.
 *
 * These tests are the floor under that, and under the three things the repair
 * must not break: what somebody already ticked, what they already wrote, and
 * the counter that hands out the next id.
 */
import { describe, it, expect } from "vitest"
import {
  addCustomStep,
  addExperiences,
  addGoal,
  addPractice,
  addRoutine,
  applyRoutinePreset,
  addCheckpoint,
  setMilestones,
  emptyNsPlan,
  loadNsPlan,
  normalizeNsPlan,
  serializeNsPlan,
  setJournalEntry,
  journalEntry,
  toggleRoutineStep,
  routineHasLibraryStep,
} from "@/src/goals/northStarService"
import { stepLogged, toggleStepLogged } from "@/src/goals/northStarTrackService"
import type { NsPlan } from "@/src/goals/types"

const NOW = "2026-09-18T08:00:00.000Z"
const DAY = "2026-09-18"

/** Every id in a plan, in the one space the database gives them. */
function allIds(plan: NsPlan): string[] {
  return [
    ...plan.areas.map((a) => a.id),
    ...plan.routines.flatMap((r) => [r.id, ...r.steps.map((s) => s.id), ...r.splitDays.map((d) => d.id)]),
    ...plan.goals.flatMap((g) => [
      g.id,
      ...g.checkpoints.map((c) => c.id),
      ...g.obstacles.map((o) => o.id),
      ...g.beliefs.map((b) => b.id),
      ...g.habits.map((h) => h.id),
    ]),
    ...plan.experiences.map((e) => e.id),
    ...plan.fields.map((f) => f.id),
    ...plan.subSteps.map((s) => s.id),
  ]
}

function duplicates(ids: string[]): string[] {
  const seen = new Set<string>()
  const dupes = new Set<string>()
  for (const id of ids) (seen.has(id) ? dupes : seen).add(id)
  return [...dupes]
}

describe("one id, one thing", () => {
  it("gives the morning and the night stretch different ids", () => {
    // The exact collision. Both routines ship in every new plan, and `stretch`
    // is an entry in both libraries.
    let plan = emptyNsPlan()
    plan = addPractice(plan, "morning", "stretch", NOW)
    plan = addPractice(plan, "night", "stretch", NOW)

    const stretches = plan.routines.flatMap((r) => r.steps).filter((s) => s.libraryStepId === "stretch")
    expect(stretches).toHaveLength(2)
    expect(stretches[0].id).not.toBe(stretches[1].id)
    expect(duplicates(allIds(plan))).toEqual([])
  })

  it("gives the morning and the manifestation incantations different ids", () => {
    let plan = emptyNsPlan()
    plan = addPractice(plan, "morning", "incantations", NOW)
    plan = addPractice(plan, "manifestation", "incantations", NOW)
    expect(duplicates(allIds(plan))).toEqual([])
  })

  it("holds no duplicate across a plan with something of every kind in it", () => {
    let plan = emptyNsPlan()
    plan = addRoutine(plan, "manifestation", NOW)
    for (const [bp, step] of [["morning", "stretch"], ["night", "stretch"], ["manifestation", "incantations"], ["morning", "incantations"]] as const) {
      plan = addPractice(plan, bp, step, NOW)
    }
    plan = addCustomStep(plan, plan.routines[0].id, "Cold shower", 3, 7, NOW)
    plan = addExperiences(plan, "See the northern lights", null, NOW)
    const withGoal = addGoal(plan, "lm_health", "Bench 100kg", "milestone_ladder", NOW)
    plan = addCheckpoint(withGoal, withGoal.goals[0].id, "Bench 80kg", NOW)
    expect(duplicates(allIds(plan))).toEqual([])
  })

  it("repairs a saved plan that already holds a duplicate, keeping the first", () => {
    // What a plan written before this looks like: the library's name IS the id.
    let plan = emptyNsPlan()
    plan = addPractice(plan, "morning", "stretch", NOW)
    plan = addPractice(plan, "night", "stretch", NOW)
    const raw = JSON.parse(serializeNsPlan(plan))
    for (const r of raw.routines) {
      for (const s of r.steps) {
        if (typeof s.libraryStepId === "string") s.id = s.libraryStepId
        delete s.libraryStepId
      }
    }
    const before = raw.routines.flatMap((r: { steps: Array<{ id: string }> }) => r.steps).map((s: { id: string }) => s.id)
    expect(duplicates(before)).toEqual(["stretch"])

    const loaded = loadNsPlan(JSON.stringify(raw))!
    expect(duplicates(allIds(loaded))).toEqual([])
    // THE FIRST KEEPS ITS ID. That is what makes the repair safe on somebody's
    // real plan: every tick, question and sub-step already points at that id
    // and goes on pointing at the same row. Only the later one is renamed, and
    // nothing could have pointed at it unambiguously in the first place.
    const stretches = loaded.routines.flatMap((r) => r.steps).filter((s) => s.libraryStepId === "stretch")
    expect(stretches[0].id).toBe("stretch")
    expect(stretches[1].id).not.toBe("stretch")
  })

  it("backfills where a saved step came from, so nothing has to read an id for it", () => {
    const plan = addPractice(emptyNsPlan(), "morning", "water", NOW)
    const raw = JSON.parse(serializeNsPlan(plan))
    for (const r of raw.routines) for (const s of r.steps) {
      if (typeof s.libraryStepId === "string") s.id = s.libraryStepId
      delete s.libraryStepId
    }
    const loaded = loadNsPlan(JSON.stringify(raw))!
    const morning = loaded.routines.find((r) => r.blueprintId === "morning")!
    expect(routineHasLibraryStep(morning, "water")).toBe(true)
    // And a step somebody typed belongs to no library entry.
    const own = addCustomStep(loaded, morning.id, "Cold shower", 3, 7, NOW)
    expect(own.routines.find((r) => r.id === morning.id)!.steps.at(-1)!.libraryStepId).toBeNull()
  })
})

describe("the counter never hands out an id something already holds", () => {
  it("sees a checkpoint, not just areas, routines and goals", () => {
    /**
     * The counter used to be floored by the highest id among areas, routines
     * and goals only. A plan whose newest thing is a checkpoint, a routine
     * step, a field, a sub-step or an experience therefore restarted it BELOW
     * that id, and the next new goal took an id the checkpoint already held —
     * after which a daily question written under the goal renders under the
     * checkpoint.
     */
    let plan = addGoal(emptyNsPlan(), "lm_health", "Bench 100kg", "milestone_ladder", NOW)
    plan = addCheckpoint(plan, plan.goals[0].id, "Bench 80kg", NOW)
    const highest = Math.max(
      ...allIds(plan)
        .map((id) => /^[a-z]+(\d+)$/.exec(id))
        .filter((m): m is RegExpExecArray => m !== null)
        .map((m) => Number(m[1])),
    )
    const raw = JSON.parse(serializeNsPlan(plan))
    delete raw.seq // a save from before the counter existed, or edited by hand
    const loaded = loadNsPlan(JSON.stringify(raw))!
    expect(loaded.seq).toBeGreaterThanOrEqual(highest)

    // And the next thing written gets an id nothing holds.
    const next = addGoal(loaded, "lm_health", "Squat 140kg", "milestone_ladder", NOW)
    expect(duplicates(allIds(next))).toEqual([])
  })
})

describe("the repair never costs anybody what they wrote", () => {
  it("keeps a journal entry when the routine's preset changes", () => {
    /**
     * Found by a test while building this, not by inspection: rebuilding the
     * stack on a preset swap minted a fresh id for a step that was already
     * there, and the journal is keyed by step id. Three months of writing would
     * have stopped belonging to the row it was written under, with nothing on
     * screen to say so.
     */
    let plan = applyRoutinePreset(emptyNsPlan(), emptyNsPlan().routines[0].id, "15", NOW)
    const routineId = plan.routines[0].id
    const gratitude = plan.routines[0].steps.find((s) => s.libraryStepId === "gratitude")!
    plan = setJournalEntry(plan, DAY, gratitude.id, "Coffee, the sea, my brother.", NOW)
    plan = toggleStepLogged(plan, DAY, gratitude.id)

    // "15" and "60" both contain gratitude, so the step survives the swap.
    const after = applyRoutinePreset(plan, routineId, "60", NOW)
    const stillThere = after.routines[0].steps.find((s) => s.libraryStepId === "gratitude")!
    expect(stillThere.id).toBe(gratitude.id)
    expect(journalEntry(after, DAY, stillThere.id)).toBe("Coffee, the sea, my brother.")
    expect(stepLogged(after, DAY, stillThere.id)).toBe(true)
  })

  it("keeps a tick when a plan holding a duplicate is loaded", () => {
    let plan = emptyNsPlan()
    plan = addPractice(plan, "morning", "stretch", NOW)
    plan = addPractice(plan, "night", "stretch", NOW)
    const raw = JSON.parse(serializeNsPlan(plan))
    for (const r of raw.routines) for (const s of r.steps) {
      if (typeof s.libraryStepId === "string") s.id = s.libraryStepId
      delete s.libraryStepId
    }
    // The old shape could only ever record ONE tick for both rows, because both
    // rows had one id. That tick survives, on the row that kept the id.
    raw.logged = { [DAY]: ["stretch"] }
    const loaded = loadNsPlan(JSON.stringify(raw))!
    expect(stepLogged(loaded, DAY, "stretch")).toBe(true)
    expect(loaded.routines.flatMap((r) => r.steps).some((s) => s.id === "stretch")).toBe(true)
  })
})

describe("one set of rules about what a plan is", () => {
  it("normalizeNsPlan is what loadNsPlan runs, so the database path gets the same repairs", () => {
    // The rows->plan mapper in Phase 1 calls this directly. Written twice, the
    // two copies drift, and the second would live in a file with no tests.
    const plan = toggleRoutineStep(emptyNsPlan(), emptyNsPlan().routines[0].id, "water", NOW)
    const raw = serializeNsPlan(plan)
    expect(normalizeNsPlan(JSON.parse(raw))).toEqual(loadNsPlan(raw))
  })

  it("is null for something that is not a plan at all, rather than throwing", () => {
    expect(normalizeNsPlan(null)).toBeNull()
    expect(normalizeNsPlan("a string")).toBeNull()
    expect(normalizeNsPlan(42)).toBeNull()
  })
})

describe("the repair leaves the rest of the plan consistent", () => {
  /** A saved plan holding the same goal id twice — hand-edited, or corrupted. */
  function savedWithDuplicateGoal(): string {
    let plan = addGoal(emptyNsPlan(), "lm_health", "Bench 100kg", "milestone_ladder", NOW)
    plan = addGoal(plan, "lm_health", "Squat 140kg", "milestone_ladder", NOW)
    const raw = JSON.parse(serializeNsPlan(plan))
    raw.goals[1].id = raw.goals[0].id
    raw.priorityIds = [raw.goals[0].id]
    return JSON.stringify(raw)
  }

  it("keeps every goal on the priority list, so none vanishes from an ordered view", () => {
    const loaded = loadNsPlan(savedWithDuplicateGoal())!
    expect(loaded.goals).toHaveLength(2)
    // The list is the rank: a goal missing from it has no rank and is not drawn.
    expect([...loaded.priorityIds].sort()).toEqual(loaded.goals.map((g) => g.id).sort())
    expect(loaded.priorityIds).toHaveLength(new Set(loaded.priorityIds).size)
  })

  it("keeps a generated rung generated when its id has to change", () => {
    /**
     * A checkpoint's prefix is not decorative: `m` means the ladder made it and
     * `c` means somebody typed it, and that is how rebuilding the climb knows
     * which ones it may replace. A repeat keeps its own prefix.
     */
    let plan = addGoal(emptyNsPlan(), "lm_health", "Bench 100kg", "milestone_ladder", NOW)
    plan = setMilestones(plan, plan.goals[0].id, { from: 60, to: 100, count: 3, unit: "kg" }, NOW)
    const rungs = plan.goals[0].checkpoints.filter((c) => c.id.startsWith("m"))
    expect(rungs.length).toBeGreaterThan(1)

    const raw = JSON.parse(serializeNsPlan(plan))
    raw.goals[0].checkpoints[1].id = raw.goals[0].checkpoints[0].id
    const loaded = loadNsPlan(JSON.stringify(raw))!
    const after = loaded.goals[0].checkpoints
    expect(after.map((c) => c.id)).toHaveLength(new Set(after.map((c) => c.id)).size)
    expect(after.every((c) => c.id.startsWith("m"))).toBe(true)
  })
})
