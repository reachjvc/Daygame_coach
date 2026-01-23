/**
 * Inner Game Types
 */

// ============================================================================
// Value Types
// ============================================================================

export type ValueItem = {
  id: string
  category: string
  display_name: string | null
}

export type CategoryInfo = {
  id: string
  code: string
  label: string
  color: string
  description: string
  daygameRelevance: string
  values: string[]
}

// ============================================================================
// Progress Types
// ============================================================================

/**
 * Step numbers in the inner game journey.
 */
export enum InnerGameStep {
  WELCOME = 0,
  VALUES = 1,
  HURDLES = 2,
  DEATHBED = 3,
  CUTTING = 4,
  COMPLETE = 5,
}

export type InferredValue = {
  id: string
  reason: string
}

export type CoreValue = {
  id: string
  rank: number
}

export type InnerGameProgress = {
  currentStep: InnerGameStep
  currentSubstep: number  // For values step: which category (0-9)
  welcomeDismissed: boolean
  step1Completed: boolean
  step2Completed: boolean
  step3Completed: boolean
  cuttingCompleted: boolean
  hurdlesResponse: string | null
  hurdlesInferredValues: InferredValue[] | null
  deathbedResponse: string | null
  deathbedInferredValues: InferredValue[] | null
  finalCoreValues: CoreValue[] | null
  aspirationalValues: { id: string }[] | null
}

// ============================================================================
// Comparison Types (for cutting phase)
// ============================================================================

export type ComparisonType = "pairwise" | "aspirational_vs_current"

export type ValueComparison = {
  valueAId: string
  valueBId: string
  chosenValueId: string
  comparisonType: ComparisonType
  roundNumber: number
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export type ProgressResponse = {
  progress: InnerGameProgress
  selectedValues: string[]
  totalCategories: number
  completedCategories: number
}

export type UpdateProgressRequest = {
  currentStep?: InnerGameStep
  currentSubstep?: number
  welcomeDismissed?: boolean
  step1Completed?: boolean
  step2Completed?: boolean
  step3Completed?: boolean
  cuttingCompleted?: boolean
  hurdlesResponse?: string
  hurdlesInferredValues?: InferredValue[]
  deathbedResponse?: string
  deathbedInferredValues?: InferredValue[]
  finalCoreValues?: CoreValue[]
  aspirationalValues?: { id: string }[]
}

export type InferValuesRequest = {
  context: "hurdles" | "deathbed"
  response: string
}

export type InferValuesResponse = {
  values: InferredValue[]
}

export type SaveComparisonRequest = {
  valueAId: string
  valueBId: string
  chosenValueId: string
  comparisonType: ComparisonType
  roundNumber?: number
}

// ============================================================================
// Component Props Types
// ============================================================================

export type StepProgressProps = {
  currentStep: InnerGameStep
  completedSteps: number[]
  onStepClick?: (step: InnerGameStep) => void
}

export type NavigationButtonsProps = {
  onBack?: () => void
  onNext: () => void
  backLabel?: string
  nextLabel?: string
  nextDisabled?: boolean
  isLoading?: boolean
}

export type WelcomeCardProps = {
  progress: InnerGameProgress
  onDismiss: () => void
  totalCategories: number
  completedCategories: number
}

export type ValueChipProps = {
  value: ValueItem
  selected: boolean
  onToggle: (id: string) => void
}

export type CategoryCardProps = {
  category: CategoryInfo
  selectedValues: Set<string>
  onToggleValue: (id: string) => void
}

export type PairComparisonProps = {
  valueA: ValueItem
  valueB: ValueItem
  onChoose: (chosenId: string) => void
}
