import { describe, test, expect } from "vitest"
import { TEMPLATES, TARGETS, deriveStartValue } from "@/src/goals/data/newGoalFramework"
import { generateMilestoneLadder } from "@/src/goals/milestoneService"

const healthTemplates = TEMPLATES.filter((t) => t.pillarId === "health")

const scales = (target: (typeof TARGETS)[number]) =>
  !!target.metricKind && target.metricKind !== "cumulative"

/** Effective start a preset now seeds for a target at a given level target value. */
const presetStart = (target: (typeof TARGETS)[number], levelValue: number) =>
  scales(target) ? deriveStartValue(target.metricKind!, levelValue) : target.milestoneConfig!.start

/** Mirror applyTemplate's step cap so tiny ranges don't repeat milestones. */
const presetSteps = (target: (typeof TARGETS)[number], start: number, value: number) => {
  const authored = target.milestoneConfig!.steps
  return Math.min(authored, Math.max(2, Math.floor(Math.abs(value - start)) + 1))
}

const presetLadder = (target: (typeof TARGETS)[number], value: number) => {
  const start = presetStart(target, value)
  return generateMilestoneLadder({
    start, target: value, steps: presetSteps(target, start, value), curveTension: target.milestoneConfig!.curveTension,
  })
}

describe("preset start scaling — health templates produce sensible ladders", () => {
  test("PRINT: ladders per template/level", () => {
    for (const tmpl of healthTemplates) {
      for (const level of tmpl.levels) {
        for (const [tid, value] of Object.entries(level.targetValues)) {
          const target = TARGETS.find((t) => t.id === tid)
          if (!target?.milestoneConfig || !scales(target)) continue
          const ladder = presetLadder(target, value).map((m) => m.value)
          // eslint-disable-next-line no-console
          console.log(`${tmpl.label.padEnd(20)} ${level.label.padEnd(13)} ${target.label.padEnd(20)} ${ladder.join(" → ")} ${target.unit}`)
        }
      }
    }
  })

  test("every threshold target: start is on the correct side of target, ladder monotonic", () => {
    for (const tmpl of healthTemplates) {
      for (const level of tmpl.levels) {
        for (const [tid, value] of Object.entries(level.targetValues)) {
          const target = TARGETS.find((t) => t.id === tid)
          if (!target?.milestoneConfig || !scales(target)) continue
          const start = presetStart(target, value)
          const descending = ["bodymass", "bodyfat", "pace"].includes(target.metricKind!)
          const ladder = presetLadder(target, value)
          const label = `${tmpl.label}/${level.label}/${target.label}`
          if (descending) expect(start, label).toBeGreaterThan(value)
          else expect(start, label).toBeLessThan(value)
          expect(ladder[0].value, label).toBe(start)
          expect(ladder[ladder.length - 1].value, label).toBe(value)
          for (let i = 1; i < ladder.length; i++) {
            if (descending) expect(ladder[i].value, label).toBeLessThanOrEqual(ladder[i - 1].value)
            else expect(ladder[i].value, label).toBeGreaterThanOrEqual(ladder[i - 1].value)
          }
        }
      }
    }
  })

  test("Advanced lifts no longer start at the beginner floor", () => {
    const strength = TEMPLATES.find((t) => t.id === "tmpl_strength")!
    const adv = strength.levels.find((l) => l.label === "Advanced")!
    const bench = TARGETS.find((t) => t.id === "t_bench")!
    // bench Advanced target 140 → start should be ~100, not 40
    expect(presetStart(bench, adv.targetValues.t_bench)).toBeGreaterThanOrEqual(90)
  })

  test("relations rate metric (dates/month) scales; cumulative metrics don't", () => {
    const dates = TARGETS.find((t) => t.id === "t_dates_ab")!
    expect(dates.metricKind).toBe("rate")
    // Advanced 10 dates/month should start well above 1 (not "1 → 10")
    expect(presetStart(dates, 10)).toBeGreaterThanOrEqual(4)
    expect(presetStart(dates, 10)).toBeLessThan(10)

    // a cumulative metric keeps its authored baseline start (no scaling)
    const books = TARGETS.find((t) => t.id === "t_books")!
    expect(books.metricKind).toBe("cumulative")
    expect(presetStart(books, 52)).toBe(books.milestoneConfig!.start) // not scaled
  })
})
