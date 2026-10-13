import { describe, it, expect } from "vitest"
import { generateGoalTreeInserts, type BatchGoalInsert } from "@/src/goals/treeGenerationService"
import { GOAL_TEMPLATES } from "@/src/goals/data/goalGraph"

// Daygame-specific counts
const DAYGAME_L3_COUNT = GOAL_TEMPLATES.filter((t) => t.level === 3 && t.lifeArea === "daygame").length

describe("generateGoalTreeInserts", () => {
  describe("L1 pick (most common)", () => {
    const inserts = generateGoalTreeInserts("l1_girlfriend")

    it("returns correct number of inserts: 1 L1 + all L3 (no L2 in hierarchy)", () => {
      // L1 fans directly into all L3s
      expect(inserts.length).toBe(1 + DAYGAME_L3_COUNT)
    })

    it("first insert is the picked L1 goal", () => {
      expect(inserts[0].template_id).toBe("l1_girlfriend")
      expect(inserts[0].goal_level).toBe(1)
      expect(inserts[0]._tempParentId).toBeNull()
    })

    it("no L2 achievements in tree (L2s are standalone badges)", () => {
      const l2s = inserts.filter((i) => i.goal_level === 2)
      expect(l2s.length).toBe(0)
    })

    it("L3 goals reference the L1 as parent (not L2)", () => {
      const l3s = inserts.filter((i) => i.goal_level === 3)
      expect(l3s.length).toBe(DAYGAME_L3_COUNT)
      for (const l3 of l3s) {
        expect(l3._tempParentId).toBe("__temp_l1_girlfriend")
      }
    })

    it("no duplicate L3 goals", () => {
      const l3Ids = inserts.filter((i) => i.goal_level === 3).map((i) => i.template_id)
      expect(new Set(l3Ids).size).toBe(l3Ids.length)
    })

    it("all inserts have life_area and category set to daygame (Dating & Daygame area)", () => {
      for (const insert of inserts) {
        expect(insert.life_area).toBe("daygame")
        expect(insert.category).toBe("daygame")
      }
    })
  })

  describe("template metadata on inserts", () => {
    const inserts = generateGoalTreeInserts("l1_girlfriend")

    it("milestone_ladder goals have correct goal_type and target_value from config", () => {
      const approachVolume = inserts.find((i) => i.template_id === "l3_approach_volume")!
      expect(approachVolume.goal_type).toBe("milestone")
      expect(approachVolume.target_value).toBe(1000)
    })

    it("habit_ramp goals have correct goal_type and target_value from first ramp step", () => {
      const approachFreq = inserts.find((i) => i.template_id === "l3_approach_frequency")!
      expect(approachFreq.goal_type).toBe("habit_ramp")
      expect(approachFreq.target_value).toBe(10) // first ramp step is 10/week
    })

    it("goals without template config have no milestone_config or ramp_steps", () => {
      const l1 = inserts.find((i) => i.goal_level === 1)!
      expect(l1.milestone_config).toBeUndefined()
      expect(l1.ramp_steps).toBeUndefined()
    })
  })

  describe("L2 pick", () => {
    const inserts = generateGoalTreeInserts("l2_approach")

    it("creates standalone L2 as root (no children — L2s are badges)", () => {
      expect(inserts.length).toBe(1)
      expect(inserts[0].template_id).toBe("l2_approach")
      expect(inserts[0]._tempParentId).toBeNull()
    })
  })

  describe("invalid template", () => {
    it("returns empty array for unknown template ID", () => {
      expect(generateGoalTreeInserts("nonexistent")).toEqual([])
    })
  })

  describe("creation order", () => {
    const inserts = generateGoalTreeInserts("l1_girlfriend")

    it("every _tempParentId references a _tempId that appears earlier in the array", () => {
      const seenTempIds = new Set<string>()
      for (const insert of inserts) {
        if (insert._tempParentId !== null) {
          expect(seenTempIds.has(insert._tempParentId)).toBe(true)
        }
        seenTempIds.add(insert._tempId)
      }
    })
  })
})
