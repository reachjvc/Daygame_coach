/**
 * THE BADGE CATALOGUE — what it must be true of, not what it happens to say.
 *
 * This file used to hold 28 tests, most of which asserted copy ("First Steps",
 * "👣", "Legend") or restated a type ("every milestone has a label", "there are
 * five tiers"). They were green the whole time 51 of the 101 badges on screen
 * had no awarding code behind them, because none of them asked the only
 * question that mattered: can this badge be won?
 *
 * What is left is behaviour: the lookup falls back safely, tiers are visually
 * distinct, and every badge is describable. Earnability is the type system's
 * job and no test restates it: the catalogue `satisfies Record<MilestoneType, …>`
 * and `MILESTONE_RULES` is a `Record<MilestoneType, MilestoneRule>`, so a badge
 * without a rule does not compile.
 */

import { describe, test, expect } from "vitest"
import {
  getMilestoneInfo,
  getTierColor,
  getTierBg,
  getAllTiers,
  ALL_MILESTONES,
  TIER_INFO,
  type MilestoneTier,
} from "@/src/tracking/data/milestones"

describe("getMilestoneInfo", () => {
  test("returns the catalogue entry for a badge that exists", () => {
    // Arrange & Act
    const result = getMilestoneInfo("first_approach")

    // Assert: the entry itself, not a copy of its wording.
    expect(result).toEqual(ALL_MILESTONES.first_approach)
    expect(result.category).not.toBe("Other")
  })

  test.each(["not_a_badge", "", "  ", "5_approaches;drop table"])(
    "falls back to something obviously generic for %j",
    (unknown) => {
      // Arrange & Act
      const result = getMilestoneInfo(unknown)

      // Assert: a rendered row still has every field, and is distinguishable
      // from a real badge rather than silently impersonating one.
      expect(result.category).toBe("Other")
      expect(result.label).toBe(unknown)
      expect(result.tier).toBe("bronze")
      expect(Object.values(ALL_MILESTONES).map((m) => m.emoji)).not.toContain(result.emoji)
    }
  )
})

describe("tier styling", () => {
  const tiers = TIER_INFO.map((t) => t.name)

  test("every tier gets its own gradient", () => {
    // Arrange & Act
    const colors = tiers.map(getTierColor)

    // Assert: two tiers sharing a colour is the defect this stands in front of —
    // a diamond badge that looks exactly like a bronze one.
    expect(new Set(colors).size).toBe(tiers.length)
  })

  test("every tier gets its own background", () => {
    // Arrange & Act
    const backgrounds = tiers.map(getTierBg)

    // Assert
    expect(new Set(backgrounds).size).toBe(tiers.length)
  })

  test("the tier set and the tier list agree", () => {
    // Arrange & Act
    const fromSet = [...getAllTiers()].sort()
    const fromList = TIER_INFO.map((t) => t.name).sort()

    // Assert
    expect(fromSet).toEqual(fromList)
  })
})

describe("every badge in the catalogue is describable", () => {
  const entries = Object.entries(ALL_MILESTONES)

  test("there is a catalogue to check", () => {
    // Guards every test below from passing vacuously.
    expect(entries.length).toBeGreaterThan(100)
  })

  test("a badge whose name carries a number says that number in its description", () => {
    // Arrange
    const numbered = entries.flatMap(([key, info]) => {
      const match = /^(\d+)_/.exec(key)
      return match ? [{ key, n: Number(match[1]), description: info.description }] : []
    })

    // Act: "1,000" is written with a separator in the copy, so compare digits.
    const mismatched = numbered.filter(
      ({ n, description }) => !description.replace(/[,.\s]/g, "").includes(String(n))
    )

    // Assert: "Complete 50 approaches" filed under `100_approaches` is a lie the
    // user reads directly off the screen.
    expect(numbered.length).toBeGreaterThan(25)
    expect(mismatched).toEqual([])
  })

  test("no two badges share a label", () => {
    // Arrange & Act
    const labels = entries.map(([, info]) => info.label)
    const duplicated = labels.filter((l, i) => labels.indexOf(l) !== i)

    // Assert: two rows reading "Hat Trick" is indistinguishable from a bug.
    expect([...new Set(duplicated)]).toEqual([])
  })

  test("every badge says what it is and how to get it", () => {
    // Arrange & Act
    const thin = entries.filter(
      ([, info]) => info.label.trim().length < 3 || info.description.trim().length < 10
    )

    // Assert
    expect(thin.map(([k]) => k)).toEqual([])
  })

  test("every badge has a tier the styling knows how to render", () => {
    // Arrange
    const known = new Set<MilestoneTier>(TIER_INFO.map((t) => t.name))

    // Act
    const unstyled = entries.filter(([, info]) => !known.has(info.tier))

    // Assert
    expect(unstyled.map(([k]) => k)).toEqual([])
  })
})
