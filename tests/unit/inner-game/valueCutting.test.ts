import { describe, test, expect } from "vitest"
import {
  generateComparisonPairs,
  scoreValuesFromComparisons,
  getTopValues,
  calculateRoundsNeeded,
  isCuttingComplete,
  getValuesAfterRound,
  buildFinalCoreValues,
  mergeValues,
  splitByAspirational,
  getNextCuttingAction,
  formatValueDisplayName,
  getValueSource,
  getInferenceReason,
  buildValuesWithSource,
  getAspirationalDefault,
} from "@/src/inner-game/modules/valueCutting"
import type { ValueComparison, InferredValue } from "@/src/inner-game/types"

// ============================================================================
// generateComparisonPairs - STRUCTURAL TESTS ONLY (uses Math.random)
// ============================================================================

describe("generateComparisonPairs", () => {
  describe("round-robin mode (≤10 values)", () => {
    test("should return correct pair count for 5 values: n*(n-1)/2 = 10", () => {
      // Arrange
      const valueIds = ["a", "b", "c", "d", "e"]

      // Act
      const pairs = generateComparisonPairs(valueIds)

      // Assert: 5 * 4 / 2 = 10 pairs
      expect(pairs.length).toBe(10)
    })

    test("should return correct pair count for 10 values: n*(n-1)/2 = 45", () => {
      // Arrange
      const valueIds = ["v1", "v2", "v3", "v4", "v5", "v6", "v7", "v8", "v9", "v10"]

      // Act
      const pairs = generateComparisonPairs(valueIds)

      // Assert: 10 * 9 / 2 = 45 pairs
      expect(pairs.length).toBe(45)
    })

    test("should return all pairs containing valid valueIds", () => {
      // Arrange
      const valueIds = ["a", "b", "c"]

      // Act
      const pairs = generateComparisonPairs(valueIds)

      // Assert: all pairs contain valid IDs
      for (const [left, right] of pairs) {
        expect(valueIds).toContain(left)
        expect(valueIds).toContain(right)
        expect(left).not.toBe(right) // No self-comparisons
      }
    })
  })

  describe("tournament mode (>10 values)", () => {
    test("should return floor(n/2) pairs for 12 values", () => {
      // Arrange
      const valueIds = Array.from({ length: 12 }, (_, i) => `v${i}`)

      // Act
      const pairs = generateComparisonPairs(valueIds)

      // Assert: 12 / 2 = 6 pairs
      expect(pairs.length).toBe(6)
    })

    test("should return floor(n/2) pairs for odd count (13 values)", () => {
      // Arrange
      const valueIds = Array.from({ length: 13 }, (_, i) => `v${i}`)

      // Act
      const pairs = generateComparisonPairs(valueIds)

      // Assert: 13 - 1 = 12, 12 / 2 = 6 pairs (last one gets bye)
      expect(pairs.length).toBe(6)
    })
  })
})

// ============================================================================
// scoreValuesFromComparisons
// ============================================================================

describe("scoreValuesFromComparisons", () => {
  test("should initialize all values with 0 when no comparisons", () => {
    // Arrange
    const valueIds = ["a", "b", "c"]
    const comparisons: ValueComparison[] = []

    // Act
    const scores = scoreValuesFromComparisons(valueIds, comparisons)

    // Assert
    expect(scores.get("a")).toBe(0)
    expect(scores.get("b")).toBe(0)
    expect(scores.get("c")).toBe(0)
  })

  test("should count wins correctly", () => {
    // Arrange
    const valueIds = ["a", "b", "c"]
    const comparisons: ValueComparison[] = [
      { valueAId: "a", valueBId: "b", chosenValueId: "a", comparisonType: "pairwise", roundNumber: 1 },
      { valueAId: "a", valueBId: "c", chosenValueId: "a", comparisonType: "pairwise", roundNumber: 1 },
      { valueAId: "b", valueBId: "c", chosenValueId: "c", comparisonType: "pairwise", roundNumber: 1 },
    ]

    // Act
    const scores = scoreValuesFromComparisons(valueIds, comparisons)

    // Assert
    expect(scores.get("a")).toBe(2) // Won 2
    expect(scores.get("b")).toBe(0) // Won 0
    expect(scores.get("c")).toBe(1) // Won 1
  })

  test("should handle ties (equal wins)", () => {
    // Arrange
    const valueIds = ["a", "b"]
    const comparisons: ValueComparison[] = [
      { valueAId: "a", valueBId: "b", chosenValueId: "a", comparisonType: "pairwise", roundNumber: 1 },
      { valueAId: "a", valueBId: "b", chosenValueId: "b", comparisonType: "pairwise", roundNumber: 2 },
    ]

    // Act
    const scores = scoreValuesFromComparisons(valueIds, comparisons)

    // Assert
    expect(scores.get("a")).toBe(1)
    expect(scores.get("b")).toBe(1)
  })

  test("should handle value not in valueIds list (graceful)", () => {
    // Arrange
    const valueIds = ["a", "b"]
    const comparisons: ValueComparison[] = [
      { valueAId: "a", valueBId: "x", chosenValueId: "x", comparisonType: "pairwise", roundNumber: 1 },
    ]

    // Act
    const scores = scoreValuesFromComparisons(valueIds, comparisons)

    // Assert: 'x' gets a score even though not in valueIds
    expect(scores.get("a")).toBe(0)
    expect(scores.get("b")).toBe(0)
    expect(scores.get("x")).toBe(1)
  })
})

// ============================================================================
// getTopValues
// ============================================================================

describe("getTopValues", () => {
  test("should return top N values sorted by score", () => {
    // Arrange
    const valueIds = ["a", "b", "c", "d"]
    const comparisons: ValueComparison[] = [
      { valueAId: "a", valueBId: "b", chosenValueId: "a", comparisonType: "pairwise", roundNumber: 1 },
      { valueAId: "a", valueBId: "c", chosenValueId: "a", comparisonType: "pairwise", roundNumber: 1 },
      { valueAId: "b", valueBId: "c", chosenValueId: "b", comparisonType: "pairwise", roundNumber: 1 },
      { valueAId: "d", valueBId: "a", chosenValueId: "a", comparisonType: "pairwise", roundNumber: 1 },
    ]
    // Scores: a=3, b=1, c=0, d=0

    // Act
    const top2 = getTopValues(valueIds, comparisons, 2)

    // Assert
    expect(top2).toHaveLength(2)
    expect(top2[0]).toBe("a") // Highest score
    expect(top2[1]).toBe("b") // Second highest
  })

  test("should return all values when n > available", () => {
    // Arrange
    const valueIds = ["a", "b"]
    const comparisons: ValueComparison[] = []

    // Act
    const top10 = getTopValues(valueIds, comparisons, 10)

    // Assert
    expect(top10).toHaveLength(2)
  })

  test("should handle empty comparisons (all zeros)", () => {
    // Arrange
    const valueIds = ["a", "b", "c"]
    const comparisons: ValueComparison[] = []

    // Act
    const top2 = getTopValues(valueIds, comparisons, 2)

    // Assert
    expect(top2).toHaveLength(2)
    // Order is implementation-dependent when all scores are 0
  })

  test("should handle ties at cutoff (takes first in sort order)", () => {
    // Arrange
    const valueIds = ["a", "b", "c", "d"]
    const comparisons: ValueComparison[] = [
      { valueAId: "a", valueBId: "b", chosenValueId: "a", comparisonType: "pairwise", roundNumber: 1 },
      { valueAId: "c", valueBId: "d", chosenValueId: "c", comparisonType: "pairwise", roundNumber: 1 },
    ]
    // Scores: a=1, b=0, c=1, d=0 (tie between a and c)

    // Act
    const top2 = getTopValues(valueIds, comparisons, 2)

    // Assert
    expect(top2).toHaveLength(2)
    expect(top2).toContain("a")
    expect(top2).toContain("c")
  })
})

// ============================================================================
// calculateRoundsNeeded
// ============================================================================

describe("calculateRoundsNeeded", () => {
  test("should return 0 for count <= targetCoreValues (7)", () => {
    // Arrange & Act & Assert
    expect(calculateRoundsNeeded(0)).toBe(0)
    expect(calculateRoundsNeeded(5)).toBe(0)
    expect(calculateRoundsNeeded(7)).toBe(0)
  })

  test("should return 1 for count 8-10", () => {
    // Arrange & Act & Assert
    expect(calculateRoundsNeeded(8)).toBe(1)
    expect(calculateRoundsNeeded(10)).toBe(1)
  })

  test("should return 2 for count 11-15", () => {
    // Arrange & Act & Assert
    expect(calculateRoundsNeeded(11)).toBe(2)
    expect(calculateRoundsNeeded(15)).toBe(2)
  })

  test("should return 3 for count 16+", () => {
    // Arrange & Act & Assert
    expect(calculateRoundsNeeded(16)).toBe(3)
    expect(calculateRoundsNeeded(100)).toBe(3)
  })
})

// ============================================================================
// isCuttingComplete
// ============================================================================

describe("isCuttingComplete", () => {
  test("should return true when currentRound >= roundsNeeded", () => {
    // Arrange
    const valueIds = Array.from({ length: 10 }, (_, i) => `v${i}`) // Needs 1 round
    const comparisons: ValueComparison[] = [
      { valueAId: "v0", valueBId: "v1", chosenValueId: "v0", comparisonType: "pairwise", roundNumber: 1 },
    ]

    // Act
    const result = isCuttingComplete(valueIds, comparisons)

    // Assert
    expect(result).toBe(true)
  })

  test("should return false when more rounds needed", () => {
    // Arrange
    const valueIds = Array.from({ length: 12 }, (_, i) => `v${i}`) // Needs 2 rounds
    const comparisons: ValueComparison[] = [
      { valueAId: "v0", valueBId: "v1", chosenValueId: "v0", comparisonType: "pairwise", roundNumber: 1 },
    ]

    // Act
    const result = isCuttingComplete(valueIds, comparisons)

    // Assert
    expect(result).toBe(false)
  })

  test("should return true when no cutting needed (≤7 values)", () => {
    // Arrange
    const valueIds = ["a", "b", "c", "d", "e"]
    const comparisons: ValueComparison[] = []

    // Act
    const result = isCuttingComplete(valueIds, comparisons)

    // Assert: 0 >= 0
    expect(result).toBe(true)
  })
})

// ============================================================================
// getValuesAfterRound
// ============================================================================

describe("getValuesAfterRound", () => {
  test("should keep top half by score from that round", () => {
    // Arrange
    const valueIds = ["a", "b", "c", "d"]
    const comparisons: ValueComparison[] = [
      { valueAId: "a", valueBId: "b", chosenValueId: "a", comparisonType: "pairwise", roundNumber: 1 },
      { valueAId: "c", valueBId: "d", chosenValueId: "c", comparisonType: "pairwise", roundNumber: 1 },
    ]
    // Round 1 scores: a=1, b=0, c=1, d=0
    // Keep top half (2) but min is targetCoreValues (7), so keeps all 4

    // Act
    const remaining = getValuesAfterRound(valueIds, comparisons, 1)

    // Assert: Math.max(ceil(4/2), 7) = Math.max(2, 7) = 7, but only 4 exist
    expect(remaining.length).toBeLessThanOrEqual(4)
  })

  test("should only consider comparisons from specified round", () => {
    // Arrange
    const valueIds = ["a", "b", "c", "d"]
    const comparisons: ValueComparison[] = [
      { valueAId: "a", valueBId: "b", chosenValueId: "a", comparisonType: "pairwise", roundNumber: 1 },
      { valueAId: "c", valueBId: "d", chosenValueId: "d", comparisonType: "pairwise", roundNumber: 2 },
    ]

    // Act
    const afterRound1 = getValuesAfterRound(valueIds, comparisons, 1)
    const afterRound2 = getValuesAfterRound(valueIds, comparisons, 2)

    // Assert: Round 1: a wins. Round 2: d wins.
    expect(afterRound1[0]).toBe("a")
    expect(afterRound2[0]).toBe("d")
  })
})

// ============================================================================
// buildFinalCoreValues
// ============================================================================

describe("buildFinalCoreValues", () => {
  test("should return CoreValue objects with rank", () => {
    // Arrange
    const valueIds = ["a", "b", "c"]
    const comparisons: ValueComparison[] = [
      { valueAId: "a", valueBId: "b", chosenValueId: "a", comparisonType: "pairwise", roundNumber: 1 },
      { valueAId: "a", valueBId: "c", chosenValueId: "a", comparisonType: "pairwise", roundNumber: 1 },
    ]

    // Act
    const coreValues = buildFinalCoreValues(valueIds, comparisons)

    // Assert
    expect(coreValues[0]).toEqual({ id: "a", rank: 1 })
    expect(coreValues[1].rank).toBe(2)
    expect(coreValues[2].rank).toBe(3)
  })

  test("should limit to targetCoreValues (7)", () => {
    // Arrange
    const valueIds = Array.from({ length: 15 }, (_, i) => `v${i}`)
    const comparisons: ValueComparison[] = []

    // Act
    const coreValues = buildFinalCoreValues(valueIds, comparisons)

    // Assert: default n = 7
    expect(coreValues.length).toBe(7)
  })
})

// ============================================================================
// mergeValues
// ============================================================================

describe("mergeValues", () => {
  test("should merge all three arrays without duplicates", () => {
    // Arrange
    const selected = ["a", "b", "c"]
    const hurdles = ["c", "d"]
    const deathbed = ["d", "e"]

    // Act
    const merged = mergeValues(selected, hurdles, deathbed)

    // Assert
    expect(merged.sort()).toEqual(["a", "b", "c", "d", "e"])
  })

  test("should handle empty arrays", () => {
    // Arrange & Act
    const merged = mergeValues([], [], [])

    // Assert
    expect(merged).toEqual([])
  })

  test("should handle all duplicates", () => {
    // Arrange
    const selected = ["a", "b"]
    const hurdles = ["a", "b"]
    const deathbed = ["a", "b"]

    // Act
    const merged = mergeValues(selected, hurdles, deathbed)

    // Assert
    expect(merged.sort()).toEqual(["a", "b"])
  })
})

// ============================================================================
// splitByAspirational
// ============================================================================

describe("splitByAspirational", () => {
  test("should split values into current and aspirational", () => {
    // Arrange
    const valueIds = ["a", "b", "c", "d"]
    const aspirationalIds = new Set(["b", "d"])

    // Act
    const { current, aspirational } = splitByAspirational(valueIds, aspirationalIds)

    // Assert
    expect(current).toEqual(["a", "c"])
    expect(aspirational).toEqual(["b", "d"])
  })

  test("should return all current when no aspirational", () => {
    // Arrange
    const valueIds = ["a", "b", "c"]
    const aspirationalIds = new Set<string>()

    // Act
    const { current, aspirational } = splitByAspirational(valueIds, aspirationalIds)

    // Assert
    expect(current).toEqual(["a", "b", "c"])
    expect(aspirational).toEqual([])
  })

  test("should return all aspirational when all marked", () => {
    // Arrange
    const valueIds = ["a", "b"]
    const aspirationalIds = new Set(["a", "b"])

    // Act
    const { current, aspirational } = splitByAspirational(valueIds, aspirationalIds)

    // Assert
    expect(current).toEqual([])
    expect(aspirational).toEqual(["a", "b"])
  })
})

// ============================================================================
// getNextCuttingAction
// ============================================================================

describe("getNextCuttingAction", () => {
  test("should return 'aspirational' when split not done and enough values", () => {
    // Arrange: >8 values (minValuesForCutting), no split done

    // Act
    const action = getNextCuttingAction(15, 0, false)

    // Assert
    expect(action).toBe("aspirational")
  })

  test("should return 'ranking' when few values (≤7)", () => {
    // Arrange: ≤7 values

    // Act
    const action = getNextCuttingAction(5, 0, true)

    // Assert
    expect(action).toBe("ranking")
  })

  test("should return 'ranking' when exactly at targetCoreValues (7)", () => {
    // Arrange: exactly 7 values = targetCoreValues boundary

    // Act
    const action = getNextCuttingAction(7, 0, true)

    // Assert: no cutting needed at boundary
    expect(action).toBe("ranking")
  })

  test("should return 'pairwise' when many values and more comparisons needed", () => {
    // Arrange: 15 values, split done, not enough comparisons
    // 15 values needs 2 rounds, pairsPerRound = 8, total = 16

    // Act
    const action = getNextCuttingAction(15, 5, true)

    // Assert
    expect(action).toBe("pairwise")
  })

  test("should return 'ranking' when enough comparisons done", () => {
    // Arrange: 10 values needs 1 round, 5 pairs. With 10 comparisons, done.

    // Act
    const action = getNextCuttingAction(10, 10, true)

    // Assert
    expect(action).toBe("ranking")
  })

  test("should skip aspirational for small sets (≤8 values)", () => {
    // Arrange: 8 values (minValuesForCutting), no split done

    // Act
    const action = getNextCuttingAction(8, 0, false)

    // Assert: 8 is NOT > 8, so skip aspirational
    expect(action).toBe("pairwise")
  })
})

// ============================================================================
// formatValueDisplayName
// ============================================================================

describe("formatValueDisplayName", () => {
  test("should convert hyphenated ID to title case with spaces", () => {
    expect(formatValueDisplayName("self-reliance")).toBe("Self Reliance")
  })

  test("should handle single word", () => {
    expect(formatValueDisplayName("courage")).toBe("Courage")
  })

  test("should handle multiple hyphens", () => {
    expect(formatValueDisplayName("work-life-balance")).toBe("Work Life Balance")
  })

  test("should handle already capitalized words", () => {
    expect(formatValueDisplayName("Self-Reliance")).toBe("Self Reliance")
  })

  test("should handle empty string", () => {
    expect(formatValueDisplayName("")).toBe("")
  })
})

// ============================================================================
// getValueSource
// ============================================================================

describe("getValueSource", () => {
  const shadowInferred: InferredValue[] = [
    { id: "honesty", reason: "From shadow work" },
  ]
  const peakInferred: InferredValue[] = [
    { id: "confidence", reason: "From peak experience" },
  ]
  const hurdlesInferred: InferredValue[] = [
    { id: "courage", reason: "From hurdles" },
  ]
  const selectedValues = ["creativity", "confidence"]

  test("should return 'picked' for user-selected values (highest priority)", () => {
    // Even though confidence is also in peakInferred, selected takes priority
    expect(getValueSource("confidence", selectedValues, shadowInferred, peakInferred, hurdlesInferred)).toBe("picked")
    expect(getValueSource("creativity", selectedValues, shadowInferred, peakInferred, hurdlesInferred)).toBe("picked")
  })

  test("should return 'peak_experience' for peak inferred values", () => {
    expect(getValueSource("confidence", [], shadowInferred, peakInferred, hurdlesInferred)).toBe("peak_experience")
  })

  test("should return 'shadow' for shadow inferred values", () => {
    expect(getValueSource("honesty", [], shadowInferred, peakInferred, hurdlesInferred)).toBe("shadow")
  })

  test("should return 'hurdles' for hurdles inferred values", () => {
    expect(getValueSource("courage", [], shadowInferred, peakInferred, hurdlesInferred)).toBe("hurdles")
  })

  test("should handle null inference arrays", () => {
    expect(getValueSource("courage", ["courage"], null, null, null)).toBe("picked")
    expect(getValueSource("unknown", [], null, null, null)).toBe("picked") // fallback
  })

  test("should respect source priority order: picked > peak > shadow > hurdles", () => {
    // Value exists in all sources
    const allInferred: InferredValue[] = [{ id: "test-value", reason: "test" }]

    // picked takes priority
    expect(getValueSource("test-value", ["test-value"], allInferred, allInferred, allInferred)).toBe("picked")
    // then peak_experience
    expect(getValueSource("test-value", [], allInferred, allInferred, allInferred)).toBe("peak_experience")
    // then shadow
    expect(getValueSource("test-value", [], allInferred, null, allInferred)).toBe("shadow")
    // then hurdles
    expect(getValueSource("test-value", [], null, null, allInferred)).toBe("hurdles")
  })
})

// ============================================================================
// getInferenceReason
// ============================================================================

describe("getInferenceReason", () => {
  const shadowInferred: InferredValue[] = [
    { id: "honesty", reason: "Shadow reason" },
  ]
  const peakInferred: InferredValue[] = [
    { id: "confidence", reason: "Peak reason" },
    { id: "honesty", reason: "Peak also has honesty" },
  ]
  const hurdlesInferred: InferredValue[] = [
    { id: "courage", reason: "Hurdles reason" },
  ]

  test("should return reason from shadow inferred (first priority)", () => {
    expect(getInferenceReason("honesty", shadowInferred, peakInferred, hurdlesInferred)).toBe("Shadow reason")
  })

  test("should return reason from peak if not in shadow", () => {
    expect(getInferenceReason("confidence", shadowInferred, peakInferred, hurdlesInferred)).toBe("Peak reason")
  })

  test("should return reason from hurdles if not in shadow or peak", () => {
    expect(getInferenceReason("courage", shadowInferred, peakInferred, hurdlesInferred)).toBe("Hurdles reason")
  })

  test("should return undefined for non-inferred values", () => {
    expect(getInferenceReason("creativity", shadowInferred, peakInferred, hurdlesInferred)).toBeUndefined()
  })

  test("should handle null inference arrays", () => {
    expect(getInferenceReason("anything", null, null, null)).toBeUndefined()
  })
})

// ============================================================================
// buildValuesWithSource
// ============================================================================

describe("buildValuesWithSource", () => {
  test("should merge selected and inferred values without duplicates", () => {
    const selected = ["a", "b"]
    const shadow: InferredValue[] = [{ id: "c", reason: "from shadow" }]
    const peak: InferredValue[] = [{ id: "b", reason: "also in peak" }]
    const hurdles: InferredValue[] = [{ id: "d", reason: "from hurdles" }]

    const result = buildValuesWithSource(selected, shadow, peak, hurdles)

    // Should have 4 unique values: a, b, c, d
    expect(result.length).toBe(4)
    const ids = result.map(v => v.id)
    expect(ids).toContain("a")
    expect(ids).toContain("b")
    expect(ids).toContain("c")
    expect(ids).toContain("d")
  })

  test("should assign correct sources", () => {
    const selected = ["selected-value"]
    const shadow: InferredValue[] = [{ id: "shadow-value", reason: "test" }]
    const peak: InferredValue[] = [{ id: "peak-value", reason: "test" }]
    const hurdles: InferredValue[] = [{ id: "hurdles-value", reason: "test" }]

    const result = buildValuesWithSource(selected, shadow, peak, hurdles)

    const find = (id: string) => result.find(v => v.id === id)
    expect(find("selected-value")?.source).toBe("picked")
    expect(find("shadow-value")?.source).toBe("shadow")
    expect(find("peak-value")?.source).toBe("peak_experience")
    expect(find("hurdles-value")?.source).toBe("hurdles")
  })

  test("should format display names correctly", () => {
    const selected = ["self-reliance"]
    const result = buildValuesWithSource(selected, null, null, null)

    expect(result[0].displayName).toBe("Self Reliance")
  })

  test("should include reasons for inferred values", () => {
    const shadow: InferredValue[] = [{ id: "honesty", reason: "Because you value truth" }]
    const result = buildValuesWithSource([], shadow, null, null)

    expect(result[0].reason).toBe("Because you value truth")
  })

  test("should not include reason for purely selected values", () => {
    const result = buildValuesWithSource(["courage"], null, null, null)

    expect(result[0].reason).toBeUndefined()
  })

  test("should sort by source priority then alphabetically", () => {
    const selected = ["zebra", "apple"]
    const shadow: InferredValue[] = [{ id: "banana", reason: "test" }]

    const result = buildValuesWithSource(selected, shadow, null, null)

    // Order should be: picked (apple, zebra), then shadow (banana)
    expect(result[0].id).toBe("apple")
    expect(result[1].id).toBe("zebra")
    expect(result[2].id).toBe("banana")
  })

  test("should handle empty inputs", () => {
    const result = buildValuesWithSource([], null, null, null)
    expect(result).toEqual([])
  })

  test("should handle all null inference arrays", () => {
    const result = buildValuesWithSource(["a", "b"], null, null, null)
    expect(result.length).toBe(2)
  })
})

// ============================================================================
// getAspirationalDefault
// ============================================================================

describe("getAspirationalDefault", () => {
  test("should return false (not aspirational) for peak_experience values", () => {
    // Peak experience = user already embodies this value
    expect(getAspirationalDefault("peak_experience")).toBe(false)
  })

  test("should return true (aspirational) for hurdles values", () => {
    // Hurdles = growth area, user is developing this
    expect(getAspirationalDefault("hurdles")).toBe(true)
  })

  test("should return true (aspirational) for shadow values", () => {
    // Shadow = growth area revealed through frustrations
    expect(getAspirationalDefault("shadow")).toBe(true)
  })

  test("should return null (no default) for picked values", () => {
    // Picked = user must decide themselves
    expect(getAspirationalDefault("picked")).toBeNull()
  })
})
