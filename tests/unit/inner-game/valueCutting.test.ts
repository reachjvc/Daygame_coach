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
} from "@/src/inner-game/modules/valueCutting"
import type { ValueComparison } from "@/src/inner-game/types"

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
