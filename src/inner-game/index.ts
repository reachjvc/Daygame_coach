/**
 * Inner Game Slice - Public API
 */

// Main page component
export { InnerGamePage } from "./components/InnerGamePage"

// Service functions
export { getInnerGameValues, saveInnerGameValueSelection } from "./innerGameService"

// Progress functions (server-side - use in API routes only)
export {
  getUserProgress,
  updateUserProgress,
  resetUserProgress,
} from "./modules/progress"

// Progress utilities (client-safe - can use in components)
export {
  getCompletedSteps,
  getResumeStep,
  calculateCompletionPercentage,
  canNavigateToStep,
} from "./modules/progressUtils"

// Value inference
export { inferValues, ValueInferenceError } from "./modules/valueInference"

// Config
export { CATEGORIES, CATEGORY_BY_ID, CATEGORY_BY_CODE, STEP_LABELS } from "./config"

// Types
export type {
  ValueItem,
  CategoryInfo,
  InnerGameStep,
  InnerGameProgress,
  InferredValue,
  CoreValue,
  ComparisonType,
  ValueComparison,
  ProgressResponse,
  UpdateProgressRequest,
  InferValuesRequest,
  InferValuesResponse,
  SaveComparisonRequest,
} from "./types"

export { InnerGameStep as InnerGameStepEnum } from "./types"
