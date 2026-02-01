import { describe, test, expect } from "vitest"
import {
  calculateCompletionPercentage,
  getResumeStep,
  getCompletedSteps,
  canNavigateToStep,
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
// calculateCompletionPercentage
// ============================================================================

describe("calculateCompletionPercentage", () => {
  test("should return 0% when nothing completed", () => {
    // Arrange
    const progress = createBaseProgress()

    // Act
    const result = calculateCompletionPercentage(progress)

    // Assert
    expect(result).toBe(0)
  })

  test("should return 17% (1/6) when only welcome dismissed", () => {
    // Arrange
    const progress = createBaseProgress({ welcomeDismissed: true })

    // Act
    const result = calculateCompletionPercentage(progress)

    // Assert
    expect(result).toBe(17) // Math.round(1/6 * 100) = 17
  })

  test("should return 33% (2/6) when welcome + values completed", () => {
    // Arrange
    const progress = createBaseProgress({
      welcomeDismissed: true,
      valuesCompleted: true,
    })

    // Act
    const result = calculateCompletionPercentage(progress)

    // Assert
    expect(result).toBe(33) // Math.round(2/6 * 100) = 33
  })

  test("should return 50% (3/6) when three steps completed", () => {
    // Arrange
    const progress = createBaseProgress({
      welcomeDismissed: true,
      valuesCompleted: true,
      shadowCompleted: true,
    })

    // Act
    const result = calculateCompletionPercentage(progress)

    // Assert
    expect(result).toBe(50)
  })

  test("should return 67% (4/6) when four steps completed", () => {
    // Arrange
    const progress = createBaseProgress({
      welcomeDismissed: true,
      valuesCompleted: true,
      shadowCompleted: true,
      peakExperienceCompleted: true,
    })

    // Act
    const result = calculateCompletionPercentage(progress)

    // Assert
    expect(result).toBe(67)
  })

  test("should return 83% (5/6) when five steps completed", () => {
    // Arrange
    const progress = createBaseProgress({
      welcomeDismissed: true,
      valuesCompleted: true,
      shadowCompleted: true,
      peakExperienceCompleted: true,
      hurdlesCompleted: true,
    })

    // Act
    const result = calculateCompletionPercentage(progress)

    // Assert
    expect(result).toBe(83)
  })

  test("should return 100% when all six steps completed", () => {
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
    const result = calculateCompletionPercentage(progress)

    // Assert
    expect(result).toBe(100)
  })
})

// ============================================================================
// getResumeStep
// ============================================================================

describe("getResumeStep", () => {
  test("should return WELCOME when nothing completed", () => {
    // Arrange
    const progress = createBaseProgress()

    // Act
    const result = getResumeStep(progress)

    // Assert
    expect(result).toBe(InnerGameStep.WELCOME)
  })

  test("should return VALUES when only welcome dismissed", () => {
    // Arrange
    const progress = createBaseProgress({ welcomeDismissed: true })

    // Act
    const result = getResumeStep(progress)

    // Assert
    expect(result).toBe(InnerGameStep.VALUES)
  })

  test("should return SHADOW when values completed", () => {
    // Arrange
    const progress = createBaseProgress({
      welcomeDismissed: true,
      valuesCompleted: true,
    })

    // Act
    const result = getResumeStep(progress)

    // Assert
    expect(result).toBe(InnerGameStep.SHADOW)
  })

  test("should return PEAK_EXPERIENCE when shadow completed", () => {
    // Arrange
    const progress = createBaseProgress({
      welcomeDismissed: true,
      valuesCompleted: true,
      shadowCompleted: true,
    })

    // Act
    const result = getResumeStep(progress)

    // Assert
    expect(result).toBe(InnerGameStep.PEAK_EXPERIENCE)
  })

  test("should return HURDLES when peak experience completed", () => {
    // Arrange
    const progress = createBaseProgress({
      welcomeDismissed: true,
      valuesCompleted: true,
      shadowCompleted: true,
      peakExperienceCompleted: true,
    })

    // Act
    const result = getResumeStep(progress)

    // Assert
    expect(result).toBe(InnerGameStep.HURDLES)
  })

  test("should return CUTTING when hurdles completed", () => {
    // Arrange
    const progress = createBaseProgress({
      welcomeDismissed: true,
      valuesCompleted: true,
      shadowCompleted: true,
      peakExperienceCompleted: true,
      hurdlesCompleted: true,
    })

    // Act
    const result = getResumeStep(progress)

    // Assert
    expect(result).toBe(InnerGameStep.CUTTING)
  })

  test("should return COMPLETE when cutting completed", () => {
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
    const result = getResumeStep(progress)

    // Assert
    expect(result).toBe(InnerGameStep.COMPLETE)
  })
})

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
// canNavigateToStep
// ============================================================================

describe("canNavigateToStep", () => {
  test("should always allow navigation to WELCOME", () => {
    // Arrange
    const progress = createBaseProgress()

    // Act
    const result = canNavigateToStep(progress, InnerGameStep.WELCOME)

    // Assert
    expect(result).toBe(true)
  })

  test("should allow navigation to completed steps", () => {
    // Arrange
    const progress = createBaseProgress({
      welcomeDismissed: true,
      valuesCompleted: true,
      shadowCompleted: true,
      currentStep: InnerGameStep.PEAK_EXPERIENCE,
    })

    // Act & Assert
    expect(canNavigateToStep(progress, InnerGameStep.WELCOME)).toBe(true)
    expect(canNavigateToStep(progress, InnerGameStep.VALUES)).toBe(true)
    expect(canNavigateToStep(progress, InnerGameStep.SHADOW)).toBe(true)
  })

  test("should allow navigation to current step", () => {
    // Arrange
    const progress = createBaseProgress({
      welcomeDismissed: true,
      valuesCompleted: true,
      currentStep: InnerGameStep.SHADOW,
    })

    // Act
    const result = canNavigateToStep(progress, InnerGameStep.SHADOW)

    // Assert
    expect(result).toBe(true)
  })

  test("should allow navigation to next step (currentStep + 1)", () => {
    // Arrange
    const progress = createBaseProgress({
      welcomeDismissed: true,
      currentStep: InnerGameStep.VALUES,
    })

    // Act - VALUES (1) + 1 = SHADOW (2)
    const result = canNavigateToStep(progress, InnerGameStep.SHADOW)

    // Assert
    expect(result).toBe(true)
  })

  test("should NOT allow skipping ahead multiple steps", () => {
    // Arrange
    const progress = createBaseProgress({
      welcomeDismissed: true,
      currentStep: InnerGameStep.VALUES,
    })

    // Act - trying to skip from VALUES (1) to HURDLES (4)
    const result = canNavigateToStep(progress, InnerGameStep.HURDLES)

    // Assert
    expect(result).toBe(false)
  })

  test("should NOT allow navigation to non-completed future step", () => {
    // Arrange
    const progress = createBaseProgress({
      welcomeDismissed: true,
      currentStep: InnerGameStep.WELCOME,
    })

    // Act - trying to go to CUTTING from WELCOME
    const result = canNavigateToStep(progress, InnerGameStep.CUTTING)

    // Assert
    expect(result).toBe(false)
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
