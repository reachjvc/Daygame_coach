/**
 * Chat Sub-Module - Public API
 *
 * Evaluators and placeholder responses for chat-based scenarios.
 */

// Evaluators
export {
  evaluateOpenerResponse,
  type SmallEvaluation,
  type MilestoneEvaluation,
  type EvaluationResult,
} from "./evaluator"

// Placeholder responses
export {
  generatePlaceholderResponse,
  generatePlaceholderShittestResponse,
  generateCareerPlaceholderResponse,
} from "./responses"
