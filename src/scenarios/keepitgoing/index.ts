/**
 * Keep It Going Sub-Module - Public API
 *
 * Scenario generation and AI-based evaluation for conversation continuation practice.
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

// AI Chat & Evaluation
export {
  generateAIResponse,
  generateCloseResponse,
  evaluateWithAI,
  getCloseOutcome,
} from "./chat"

// Claude Code Integration
export { useClaudeCode } from "./claudeCode"

// Data
export { SITUATIONS } from "./data/situations"
