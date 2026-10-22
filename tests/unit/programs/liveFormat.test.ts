/**
 * What the live screen says about a program in the new format (Phase 5).
 */

import { describe, expect, test } from "vitest"
import { addSetLimit, describeLift, effortText, weekLine, withOption } from "@/src/programs/liveFormat"
import { deriveFromEarlierSets, legacySeedInputs, prescribe, seed } from "@/src/programs/engine"
import { specFromLegacy } from "@/src/programs/spec/fromLegacy"
import { requireProgram } from "@/src/programs/data/catalog"
import { describeSets } from "@/src/programs/programsService"
import { starscream } from "../../fixtures/programs/corpus/starscream"

const monday = () => {
  const spec = starscream.spec
  const enr = { id: "e", unitSystem: "kg" as const, ...seed(spec, {}, "kg") }
  return prescribe(spec, enr, { programId: "custom", dayIndex: 0 })
}

describe("effort targets", () => {
  test("say RPE or RIR, a range, and a ceiling", () => {
    expect(effortText({ rpe: 8.5 })).toBe("RPE 8.5")
    expect(effortText({ rpe: 8, rpeMax: 9 })).toBe("RPE 8–9")
    expect(effortText({ rir: 2 })).toBe("RIR 2")
    expect(effortText({ rpe: 9, cap: true })).toBe("≤ RPE 9")
    expect(effortText({})).toBeNull()
  })
})

describe("the week", () => {
  test("names the week of the program, its phase and a deload or test week", () => {
    expect(weekLine({ week: 3, weeksTotal: 12, periodised: true })).toBe("Week 3 of 12")
    expect(weekLine({ week: 4, periodised: true, phase: "Base", deloadWeek: true })).toBe("Week 4 · Base · deload week")
    expect(weekLine({ week: 12, weeksTotal: 12, periodised: true, testWeek: true })).toBe("Week 12 of 12 · test week")
    expect(weekLine({ week: 1, periodised: false })).toBeNull()
  })
})

describe("one line for a lift", () => {
  test("Starscream's bench before and after the top set", () => {
    const [bench] = monday().exercises
    expect(describeLift(bench, "kg")).toBe("1 × 2–5 by feel, RPE 8.5 · 3–5 × 5–10 at 70–80% of the top set")
    const [after] = deriveFromEarlierSets([bench], [{ slot: "mon_bench", groupId: "top", weight: 100, reps: 4 }], { unit: "kg", rounding: starscream.spec.rounding })
    expect(describeLift(after, "kg")).toBe("1 × 2–5 by feel, RPE 8.5 · 3–5 × 5–10 @ 70–80 kg")
  })

  test("Friday's bench names the cap on the last set; the squat names its options", () => {
    const spec = starscream.spec
    const enr = { id: "e", unitSystem: "kg" as const, ...seed(spec, {}, "kg") }
    const friday = prescribe(spec, enr, { programId: "custom", dayIndex: 4 }).exercises[0]
    expect(describeLift(friday, "kg")).toBe("4–6 × 5–6 by feel, ≤ RPE 9 on the last set")
    const squat = prescribe(spec, enr, { programId: "custom", dayIndex: 3 }).exercises[0]
    expect(describeLift(squat, "kg")).toBe("1 × 2–5 by feel, RPE 8.5 · 3 × 10 … 10 × 3 at 70–90% of the top set")
  })

  test("a converted built-in reads exactly as it always did", () => {
    const program = requireProgram("push-pull-legs")
    const spec = specFromLegacy(program)
    const enr = { id: "e", unitSystem: "kg" as const, ...seed(spec, legacySeedInputs(program, "beginner", "kg"), "kg") }
    for (let day = 0; day < spec.days.length; day++) {
      for (const ex of prescribe(spec, enr, { programId: program.id, dayIndex: day }).exercises) {
        expect(describeLift(ex, "kg"), ex.name).toBe(describeSets(ex, "kg"))
      }
    }
  })
})

describe("options and ranges of sets", () => {
  test("picking 10 × 3 replaces the back-off rows with ten triples", () => {
    const spec = starscream.spec
    const enr = { id: "e", unitSystem: "kg" as const, ...seed(spec, {}, "kg") }
    const squat = prescribe(spec, enr, { programId: "custom", dayIndex: 3 }).exercises[0]
    const picked = withOption(squat, "back", { count: 10, reps: 3 })
    expect(picked.sets.map((s) => [s.setNumber, s.groupId, s.reps])).toEqual([
      [1, "top", 2],
      ...Array.from({ length: 10 }, (_, i) => [i + 2, "back", 3]),
    ])
    expect(picked.sets[1].derive).toEqual(squat.sets[1].derive)
  })

  test("a range of sets allows adding up to its top; a fixed count sets no limit", () => {
    const [bench] = monday().exercises
    expect(addSetLimit(bench)).toMatchObject({ group: { id: "back", countMin: 3, countMax: 5 }, upTo: 2 })
    const accessory = monday().exercises[2]
    expect(addSetLimit(accessory)).toBeNull()
  })
})
