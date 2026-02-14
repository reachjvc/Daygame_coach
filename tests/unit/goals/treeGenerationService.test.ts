import { describe, it, expect } from "vitest"
import { generateGoalTreeInserts, type BatchGoalInsert } from "@/src/goals/treeGenerationService"
import { GOAL_TEMPLATE_MAP } from "@/src/goals/data/goalGraph"

describe("generateGoalTreeInserts", () => {
  describe("L1 pick (most common)", () => {
    const inserts = generateGoalTreeInserts("l1_girlfriend")

    it("returns correct number of inserts: 1 L1 + 2 L2 + 12 L3 = 15", () => {
      expect(inserts.length).toBe(15)
    })

    it("first insert is the picked L1 goal", () => {
      expect(inserts[0].template_id).toBe("l1_girlfriend")
      expect(inserts[0].goal_level).toBe(1)
      expect(inserts[0]._tempParentId).toBeNull()
    })

    it("L2 achievements follow the L1", () => {
      const l2s = inserts.filter((i) => i.goal_level === 2)
      expect(l2s.length).toBe(2)
      expect(l2s.map((i) => i.template_id)).toContain("l2_master_daygame")
      expect(l2s.map((i) => i.template_id)).toContain("l2_confident")
    })

    it("L2s reference the L1 as parent", () => {
      const l2s = inserts.filter((i) => i.goal_level === 2)
      for (const l2 of l2s) {
        expect(l2._tempParentId).toBe("__temp_l1_girlfriend")
      }
    })

    it("L3 goals reference an L2 as parent", () => {
      const l3s = inserts.filter((i) => i.goal_level === 3)
      expect(l3s.length).toBe(12)
      for (const l3 of l3s) {
        expect(l3._tempParentId).toMatch(/^__temp_l2_/)
      }
    })

    it("no duplicate L3 goals (deduplication across L2 fan-outs)", () => {
      const l3Ids = inserts.filter((i) => i.goal_level === 3).map((i) => i.template_id)
      expect(new Set(l3Ids).size).toBe(l3Ids.length)
    })

    it("all inserts have life_area and category set to daygame", () => {
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

    it("input goals have goal_nature 'input'", () => {
      const inputs = inserts.filter((i) => i.goal_nature === "input")
      expect(inputs.length).toBeGreaterThan(0)
      for (const g of inputs) {
        const tmpl = GOAL_TEMPLATE_MAP[g.template_id!]
        expect(tmpl.nature).toBe("input")
      }
    })

    it("outcome goals have goal_nature 'outcome'", () => {
      const outcomes = inserts.filter((i) => i.goal_nature === "outcome")
      expect(outcomes.length).toBeGreaterThan(0)
      for (const g of outcomes) {
        const tmpl = GOAL_TEMPLATE_MAP[g.template_id!]
        expect(tmpl.nature).toBe("outcome")
      }
    })

    it("L3 goals have display_category set", () => {
      const l3s = inserts.filter((i) => i.goal_level === 3)
      for (const l3 of l3s) {
        expect(["field_work", "results", "dirty_dog"]).toContain(l3.display_category)
      }
    })

    it("linked_metric is set where template defines it", () => {
      const withMetric = inserts.filter((i) => i.linked_metric)
      expect(withMetric.length).toBeGreaterThan(0)
      for (const g of withMetric) {
        const tmpl = GOAL_TEMPLATE_MAP[g.template_id!]
        expect(g.linked_metric).toBe(tmpl.linkedMetric)
      }
    })

    it("approach_volume uses cumulative metric, approach_frequency uses weekly", () => {
      const volume = inserts.find((i) => i.template_id === "l3_approach_volume")!
      const frequency = inserts.find((i) => i.template_id === "l3_approach_frequency")!
      expect(volume.linked_metric).toBe("approaches_cumulative")
      expect(frequency.linked_metric).toBe("approaches_weekly")
    })

    it("phone_numbers and instadates use cumulative metrics", () => {
      const numbers = inserts.find((i) => i.template_id === "l3_phone_numbers")!
      const instadates = inserts.find((i) => i.template_id === "l3_instadates")!
      expect(numbers.linked_metric).toBe("numbers_cumulative")
      expect(instadates.linked_metric).toBe("instadates_cumulative")
    })

    it("milestone_ladder goals include milestone_config from template defaults", () => {
      const approachVolume = inserts.find((i) => i.template_id === "l3_approach_volume")!
      expect(approachVolume.milestone_config).toBeDefined()
      const config = approachVolume.milestone_config as Record<string, unknown>
      expect(config.start).toBe(1)
      expect(config.target).toBe(1000)
      expect(config.steps).toBe(15)
      expect(config.curveTension).toBe(5)
    })

    it("habit_ramp goals include ramp_steps from template defaults", () => {
      const approachFreq = inserts.find((i) => i.template_id === "l3_approach_frequency")!
      expect(approachFreq.ramp_steps).toBeDefined()
      expect(Array.isArray(approachFreq.ramp_steps)).toBe(true)
      const steps = approachFreq.ramp_steps as Record<string, unknown>[]
      expect(steps.length).toBeGreaterThan(0)
      expect(steps[0].frequencyPerWeek).toBe(10)
    })

    it("goals without template config have no milestone_config or ramp_steps", () => {
      const l1 = inserts.find((i) => i.goal_level === 1)!
      expect(l1.milestone_config).toBeUndefined()
      expect(l1.ramp_steps).toBeUndefined()
    })
  })

  describe("L0 pick", () => {
    const inserts = generateGoalTreeInserts("dream_marry")

    it("creates L0 as root with no parent", () => {
      expect(inserts[0].template_id).toBe("dream_marry")
      expect(inserts[0].goal_level).toBe(0)
      expect(inserts[0]._tempParentId).toBeNull()
    })

    it("creates one L1 child beneath the L0", () => {
      const l1s = inserts.filter((i) => i.goal_level === 1)
      expect(l1s.length).toBe(1)
      expect(l1s[0]._tempParentId).toBe("__temp_dream_marry")
    })

    it("includes L2 and L3 beneath the L1", () => {
      const l2s = inserts.filter((i) => i.goal_level === 2)
      const l3s = inserts.filter((i) => i.goal_level === 3)
      expect(l2s.length).toBe(2)
      expect(l3s.length).toBe(12)
    })
  })

  describe("L2 pick", () => {
    const inserts = generateGoalTreeInserts("l2_master_daygame")

    it("creates L2 as root", () => {
      expect(inserts[0].template_id).toBe("l2_master_daygame")
      expect(inserts[0]._tempParentId).toBeNull()
    })

    it("creates 12 L3 children beneath it", () => {
      const l3s = inserts.filter((i) => i.goal_level === 3)
      expect(l3s.length).toBe(12)
    })
  })

  describe("invalid template", () => {
    it("returns empty array for unknown template ID", () => {
      expect(generateGoalTreeInserts("nonexistent")).toEqual([])
    })
  })

  describe("creation order", () => {
    const inserts = generateGoalTreeInserts("l1_girlfriend")

    it("L1 root comes first", () => {
      expect(inserts[0].goal_level).toBe(1)
    })

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
