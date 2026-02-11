/**
 * Local types for the CuttingStep components.
 */

import type { ValueWithSource, ValueSource, InnerGameStep, CoreValue } from "../../types"

/**
 * Phases in the new prioritization flow.
 */
export type PrioritizationPhase =
  | "select_essentials"  // Phase 1: Select essential values
  | "eliminate"          // Phase 2: Eliminate to 7 (only if >7 selected)
  | "aspirational"       // Phase 3: Current vs aspirational check
  | "ranking"            // Phase 4: Final ranking

/**
 * Props for the SelectEssentialsPhase component.
 */
export type SelectEssentialsPhaseProps = {
  values: ValueWithSource[]
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onContinue: () => void
  onBackToHub?: () => void
}

/**
 * Props for the EliminatePhase component.
 */
export type EliminatePhaseProps = {
  values: ValueWithSource[]
  onRemove: (id: string) => void
  onUndo: () => void
  onContinue: () => void
  removedIds: string[]
  targetCount: number
  onBackToHub?: () => void
}

/**
 * Props for the AspirationalCheck component (extended).
 */
export type AspirationalCheckWithDefaultsProps = {
  value: {
    id: string
    displayName: string
    source: ValueSource
  }
  defaultValue: boolean | null
  onChoose: (isAspirational: boolean) => void
  questionNumber: number
  totalQuestions: number
}

/**
 * State for the cutting step page.
 */
export type CuttingStepState = {
  phase: PrioritizationPhase
  // Select essentials phase
  selectedEssentials: Set<string>
  // Eliminate phase
  eliminatedIds: string[]
  // Aspirational phase
  aspirationalIndex: number
  aspirationalIds: Set<string>
  // Final ranked values
  rankedValues: string[]
}

/**
 * Props for the main CuttingStepPage component.
 */
export type CuttingStepPageProps = {
  selectedValues: string[]
  hurdlesInferredValues: { id: string; reason: string }[] | null
  shadowInferredValues: { id: string; reason: string }[] | null
  peakExperienceInferredValues: { id: string; reason: string }[] | null
  completedSteps: InnerGameStep[]
  onBack: () => void
  onComplete: (coreValues: CoreValue[], aspirationalValues: { id: string }[]) => void
  onBackToHub?: () => void
  onStartFresh?: () => void
  onStepClick?: (step: InnerGameStep) => void
}
