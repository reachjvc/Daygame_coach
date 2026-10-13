import { describe, test, expect } from "vitest"
import {
  formatValueDisplayName,
  getValueSource,
  getInferenceReason,
  buildValuesWithSource,
  getAspirationalDefault,
} from "@/src/inner-game/modules/valueCutting"
import type { InferredValue } from "@/src/inner-game/types"

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

// The cutting screen pre-selects "I live this" or "I aspire to this" from where a
// value came from. A peak experience is lived; a hurdle or a shadow is aspired
// to; a value somebody simply picked gets no default, so they must choose.
describe("getAspirationalDefault", () => {
  test.each([
    ["peak_experience", false],
    ["hurdles", true],
    ["shadow", true],
    ["picked", null],
  ] as const)("a value from %s defaults to %s", (source, expected) => {
    expect(getAspirationalDefault(source)).toBe(expected)
  })
})
