/**
 * Career Sub-Module - Public API
 *
 * Scenario generation and evaluation for career revelation practice mode.
 */

// Generator
export {
  generateCareerScenario,
  generateCareerScenarioIntro,
  type CareerScenarioContext,
} from "./generator"

// Evaluator
export { evaluateCareerResponse } from "./evaluator"

// Data
export * from "./data/careers"
