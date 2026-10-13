import { describe, test, expect } from "vitest"
import {
  getCompletedSteps,
  migrateProgress,
} from "@/src/inner-game/modules/progressUtils"
import { InnerGameStep, type InnerGameProgress } from "@/src/inner-game/types"

// ============================================================================
// Test Helpers
// ============================================================================

function createBaseProgress(overrides: Partial<InnerGameProgress> = {}): InnerGameProgress {
  return {
    currentStep: InnerGameStep.WELCOME,
    currentSubstep: 0,
    welcomeDismissed: false,
    valuesCompleted: false,
    shadowCompleted: false,
    peakExperienceCompleted: false,
    hurdlesCompleted: false,
    cuttingCompleted: false,
    shadowResponse: null,
    shadowInferredValues: null,
    peakExperienceResponse: null,
    peakExperienceInferredValues: null,
    hurdlesResponse: null,
    hurdlesInferredValues: null,
    finalCoreValues: null,
    aspirationalValues: null,
    ...overrides,
  }
}

// ============================================================================
// getCompletedSteps
// ============================================================================

describe("getCompletedSteps", () => {
  test("should return empty array when nothing completed", () => {
    // Arrange
    const progress = createBaseProgress()

    // Act
    const result = getCompletedSteps(progress)

    // Assert
    expect(result).toEqual([])
  })

  test("should return [WELCOME] when only welcome dismissed", () => {
    // Arrange
    const progress = createBaseProgress({ welcomeDismissed: true })

    // Act
    const result = getCompletedSteps(progress)

    // Assert
    expect(result).toEqual([InnerGameStep.WELCOME])
  })

  test("should return all completed steps in order", () => {
    // Arrange
    const progress = createBaseProgress({
      welcomeDismissed: true,
      valuesCompleted: true,
      shadowCompleted: true,
    })

    // Act
    const result = getCompletedSteps(progress)

    // Assert
    expect(result).toEqual([
      InnerGameStep.WELCOME,
      InnerGameStep.VALUES,
      InnerGameStep.SHADOW,
    ])
  })

  test("should include all six steps when fully complete", () => {
    // Arrange
    const progress = createBaseProgress({
      welcomeDismissed: true,
      valuesCompleted: true,
      shadowCompleted: true,
      peakExperienceCompleted: true,
      hurdlesCompleted: true,
      cuttingCompleted: true,
    })

    // Act
    const result = getCompletedSteps(progress)

    // Assert
    expect(result).toHaveLength(6)
    expect(result).toContain(InnerGameStep.WELCOME)
    expect(result).toContain(InnerGameStep.VALUES)
    expect(result).toContain(InnerGameStep.SHADOW)
    expect(result).toContain(InnerGameStep.PEAK_EXPERIENCE)
    expect(result).toContain(InnerGameStep.HURDLES)
    expect(result).toContain(InnerGameStep.CUTTING)
  })
})

// ============================================================================
// migrateProgress
// ============================================================================

describe("migrateProgress", () => {
  test("should preserve existing new field values", () => {
    // Arrange
    const progress = createBaseProgress({
      valuesCompleted: true,
      shadowCompleted: true,
    })

    // Act
    const result = migrateProgress(progress)

    // Assert
    expect(result.valuesCompleted).toBe(true)
    expect(result.shadowCompleted).toBe(true)
  })

  test("should migrate step1Completed to valuesCompleted when valuesCompleted is undefined", () => {
    // Arrange - legacy progress with step1Completed but no valuesCompleted
    // Note: ?? only triggers on null/undefined, not on false
    const legacyProgress = {
      ...createBaseProgress(),
      step1Completed: true,
    }
    // Delete valuesCompleted to simulate undefined (legacy data)
    delete (legacyProgress as Partial<InnerGameProgress>).valuesCompleted

    // Act
    const result = migrateProgress(legacyProgress as InnerGameProgress)

    // Assert
    expect(result.valuesCompleted).toBe(true)
  })

  test("should migrate step2Completed to hurdlesCompleted when hurdlesCompleted is undefined", () => {
    // Arrange - legacy progress with step2Completed but no hurdlesCompleted
    const legacyProgress = {
      ...createBaseProgress(),
      step2Completed: true,
    }
    // Delete hurdlesCompleted to simulate undefined (legacy data)
    delete (legacyProgress as Partial<InnerGameProgress>).hurdlesCompleted

    // Act
    const result = migrateProgress(legacyProgress as InnerGameProgress)

    // Assert
    expect(result.hurdlesCompleted).toBe(true)
  })

  test("should prefer new field over legacy field if both set", () => {
    // Arrange
    const mixedProgress = createBaseProgress({
      valuesCompleted: true,
      step1Completed: false, // Legacy says false, but new field says true
    })

    // Act
    const result = migrateProgress(mixedProgress)

    // Assert - new field takes precedence due to ?? operator order
    expect(result.valuesCompleted).toBe(true)
  })

  test("should preserve other fields unchanged", () => {
    // Arrange
    const progress = createBaseProgress({
      currentStep: InnerGameStep.SHADOW,
      currentSubstep: 3,
      shadowResponse: "My shadow response",
    })

    // Act
    const result = migrateProgress(progress)

    // Assert
    expect(result.currentStep).toBe(InnerGameStep.SHADOW)
    expect(result.currentSubstep).toBe(3)
    expect(result.shadowResponse).toBe("My shadow response")
  })
})

// ============================================================================
// InnerGameStep enum values
// ============================================================================

describe("InnerGameStep enum", () => {
  test("should have correct numeric values for each step", () => {
    // Assert - ensure enum values are what the code expects
    expect(InnerGameStep.WELCOME).toBe(0)
    expect(InnerGameStep.VALUES).toBe(1)
    expect(InnerGameStep.SHADOW).toBe(2)
    expect(InnerGameStep.PEAK_EXPERIENCE).toBe(3)
    expect(InnerGameStep.HURDLES).toBe(4)
    expect(InnerGameStep.CUTTING).toBe(5)
    expect(InnerGameStep.COMPLETE).toBe(6)
  })
})
