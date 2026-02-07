/**
 * Keep It Going Sub-Module - Public API
 *
 * Scenario generation and evaluation for conversation continuation practice.
 * Train using statements, cold reads, and interesting questions instead of interview mode.
 */

// Types
export type {
  Language,
  Situation,
  ConversationPhase,
  KeepItGoingContext,
  ResponseQuality,
  CloseOutcome,
} from "./types"

// Generator
export {
  generateKeepItGoingScenario,
  generateKeepItGoingIntro,
  updateContext,
  getPhase,
} from "./generator"

// Evaluator
export {
  evaluateKeepItGoingResponse,
  getResponseQuality,
  getCloseOutcome,
  getSuggestedLine,
} from "./evaluator"

// Data
export { SITUATIONS } from "./data/situations"
export {
  pickResponse,
  pickHerQuestion,
  pickCloseResponse,
  RESPONSES,
  HER_QUESTIONS,
  CLOSE_RESPONSES,
} from "./data/responses"
