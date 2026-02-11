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
 * Order: Values Selection → Shadow → Peak Experience → Hurdles → Cutting → Summary
 */
export enum InnerGameStep {
  WELCOME = 0,
  VALUES = 1,
  SHADOW = 2,
  PEAK_EXPERIENCE = 3,
  HURDLES = 4,
  CUTTING = 5,
  COMPLETE = 6,
}

export type InferredValue = {
  id: string
  reason: string
}

export type CoreValue = {
  id: string
  rank: number
}

// ============================================================================
// Value Source Tracking (for prioritization flow)
// ============================================================================

/**
 * Where a value originated from in the inner game flow.
 * Used to show context during prioritization and set smart defaults.
 */
export type ValueSource = "picked" | "shadow" | "peak_experience" | "hurdles"

/**
 * A value with its source information for the prioritization UI.
 */
export type ValueWithSource = {
  id: string
  displayName: string
  source: ValueSource
  /** For inferred values, the reason why it was suggested */
  reason?: string
}

export type InnerGameProgress = {
  currentStep: InnerGameStep
  currentSubstep: number  // For values step: which category (0-10)
  welcomeDismissed: boolean
  valuesCompleted: boolean        // Step 1: Values selection
  shadowCompleted: boolean        // Step 2: Shadow prompt
  peakExperienceCompleted: boolean // Step 3: Peak experience prompt
  hurdlesCompleted: boolean       // Step 4: Hurdles prompt
  cuttingCompleted: boolean       // Step 5: Cutting/prioritization
  // Shadow step data
  shadowResponse: string | null
  shadowInferredValues: InferredValue[] | null
  // Peak experience step data
  peakExperienceResponse: string | null
  peakExperienceInferredValues: InferredValue[] | null
  // Hurdles step data (reframed - also used by premium model)
  hurdlesResponse: string | null
  hurdlesInferredValues: InferredValue[] | null
  // Prioritization flow data
  essentialSelection: string[] | null  // Values marked as essential (before elimination)
  // Final results
  finalCoreValues: CoreValue[] | null
  aspirationalValues: { id: string }[] | null
  // Legacy fields (deprecated - kept for backward compatibility during migration)
  step1Completed?: boolean
  step2Completed?: boolean
  step3Completed?: boolean
  deathbedResponse?: string | null
  deathbedInferredValues?: InferredValue[] | null
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
  valuesCompleted?: boolean
  shadowCompleted?: boolean
  peakExperienceCompleted?: boolean
  hurdlesCompleted?: boolean
  cuttingCompleted?: boolean
  shadowResponse?: string
  shadowInferredValues?: InferredValue[]
  peakExperienceResponse?: string
  peakExperienceInferredValues?: InferredValue[]
  hurdlesResponse?: string
  hurdlesInferredValues?: InferredValue[]
  essentialSelection?: string[]
  finalCoreValues?: CoreValue[]
  aspirationalValues?: { id: string }[]
}

export type InferValuesRequest = {
  context: "shadow" | "peak_experience" | "hurdles"
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

// ============================================================================
// Hub Navigation Types
// ============================================================================

export type SectionStatus = "not_started" | "in_progress" | "completed" | "locked"

export type SectionAccessResult = {
  accessible: boolean
  reason?: string
}

export type SectionStatusResult = {
  status: SectionStatus
  detail?: string
}
