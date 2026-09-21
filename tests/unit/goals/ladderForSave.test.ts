/**
 * THE LADDER A GOAL IS SAVED WITH, from the live goals editor.
 *
 * THE DEFECT THIS PINS. `GoalFormModal` held a curve in component state whose
 * `start` was a hard-coded 1, and no control anywhere on the form can change
 * it — the curve editor never came across in a half-finished migration and its
 * state is marked unused with an eslint-disable. So every Target saved from
 * the editor claimed to begin at 1.
 *
 * That was survivable while progress counted from zero and ignored the start.
 * It stopped being survivable on 2026-09-19, when progress began measuring the
 * distance TRAVELLED: a weight goal entered as "I am 96 kg, I want 85" was
 * stored as a climb from 1 to 85 sitting at 96, which reads 100% with a green
 * "Done" badge on the day it is created. The editor is live inside Life
 * Mastery's Track step, so this is reachable today.
 *
 * Where you are now was already on the form — the "starting progress" field,
 * collected to backfill history from before the app. It is the same number.
 */

import { describe, it, expect } from "vitest"
import { ladderForSave } from "@/src/goals/goalsService"
import { progressPercent, isGoalComplete } from "@/src/db/goalProgress"

const CURVE = { start: 1, target: 100, steps: 10, curveTension: 2 }

describe("a Target keeps the number you said you were at", () => {
  it("the weight goal that read 100% complete on the day it was made", () => {
    const ladder = ladderForSave({
      goalType: "milestone",
      trackingType: "counter",
      targetValue: 85,
      startingValue: 96,
      config: CURVE,
    })!

    expect(ladder.start).toBe(96) // was 1
    expect(ladder.target).toBe(85)

    // What the card would then draw.
    const row = { current_value: 96, target_value: 85, milestone_config: ladder as unknown as Record<string, unknown> }
    expect(progressPercent(row)).toBe(0)
    expect(isGoalComplete(row)).toBe(false)
  })

  it("an upward climb reads from where you are, not from one", () => {
    const ladder = ladderForSave({
      goalType: "milestone",
      trackingType: "counter",
      targetValue: 100,
      startingValue: 70,
      config: CURVE,
    })!

    const row = { current_value: 85, target_value: 100, milestone_config: ladder as unknown as Record<string, unknown> }
    expect(ladder.start).toBe(70)
    expect(progressPercent(row)).toBe(50) // 85 of the way from 70 to 100
  })

  it("nothing entered means it starts at zero, not at one", () => {
    const ladder = ladderForSave({
      goalType: "milestone",
      trackingType: "counter",
      targetValue: 100,
      startingValue: 0,
      config: CURVE,
    })!
    expect(ladder.start).toBe(0)
  })

  it("the target comes from the field, not from the curve's default", () => {
    const ladder = ladderForSave({
      goalType: "milestone",
      trackingType: "counter",
      targetValue: 42,
      startingValue: 5,
      config: CURVE,
    })!
    expect(ladder.target).toBe(42)
  })

  it("a negative starting value cannot be stored", () => {
    const ladder = ladderForSave({
      goalType: "milestone",
      trackingType: "counter",
      targetValue: 100,
      startingValue: -5,
      config: CURVE,
    })!
    expect(ladder.start).toBe(0)
  })
})

describe("a Practice counts from zero", () => {
  it("its curve never claims you have already done some", () => {
    // Four runs a week is four from nothing, every week. A ladder starting at
    // 1 would report the first run as the second.
    const ladder = ladderForSave({
      goalType: "habit_ramp",
      trackingType: "counter",
      targetValue: 4,
      startingValue: 0,
      config: CURVE,
    })!
    expect(ladder.start).toBe(0)
  })

  it("even when the form was carrying a starting value", () => {
    const ladder = ladderForSave({
      goalType: "habit_ramp",
      trackingType: "counter",
      targetValue: 4,
      startingValue: 12,
      config: CURVE,
    })!
    expect(ladder.start).toBe(0)
  })

  it("the first week of a rate reads 25%, not 0%", () => {
    const ladder = ladderForSave({
      goalType: "habit_ramp", trackingType: "counter", targetValue: 4, startingValue: 0, config: CURVE,
    })!
    const row = { current_value: 1, target_value: 4, milestone_config: ladder as unknown as Record<string, unknown> }
    expect(progressPercent(row)).toBe(25)
  })
})

describe("shapes that have no ladder are given none", () => {
  it("a finish line", () => {
    expect(ladderForSave({
      goalType: "milestone", trackingType: "boolean", targetValue: 1, startingValue: 0, config: CURVE,
    })).toBeNull()
  })

  it("a counter that only ever counts to one", () => {
    // A target of one is a finish line wearing a counter's clothes; a ladder
    // on it would draw a single rung at its own finish.
    expect(ladderForSave({
      goalType: "milestone", trackingType: "counter", targetValue: 1, startingValue: 0, config: CURVE,
    })).toBeNull()
  })

  it("a plain recurring goal", () => {
    expect(ladderForSave({
      goalType: "recurring", trackingType: "counter", targetValue: 5, startingValue: 0, config: CURVE,
    })).toBeNull()
  })
})
