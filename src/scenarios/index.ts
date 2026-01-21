/**
 * Scenarios Slice - Public API
 *
 * This is the stable public interface for the scenarios slice.
 * All external code should import from this file, not from internal modules.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Catalog (scenario registry)
// ─────────────────────────────────────────────────────────────────────────────

export {
  // Types
  type ScenarioId,
  type ScenarioStatus,
  type ScenarioDef,
  type PhaseId,
  type PhaseDef,
  // Data
  SCENARIO_CATALOG,
  PHASE_CATALOG,
  // Helpers
  getScenario,
  getAllScenarios,
  getAvailableScenarios,
  getScenariosForPhase,
  isScenarioAvailable,
  getAvailableScenarioIds,
} from "./catalog"

// ─────────────────────────────────────────────────────────────────────────────
// Service (main orchestration)
// ─────────────────────────────────────────────────────────────────────────────

export {
  // Service instance
  scenariosService,
  ScenariosService,
  // Types
  type EnvironmentChoice,
  type GenerateEncounterRequest,
  type EvaluateOpenerRequest,
  type OpenerEvaluation,
  type ChatHistoryMessage,
  type ChatRequest,
  type ChatResponse,
} from "./scenariosService"

// ─────────────────────────────────────────────────────────────────────────────
// Sandbox settings (used by Settings slice)
// ─────────────────────────────────────────────────────────────────────────────

export {
  DEFAULT_SANDBOX_SETTINGS,
  mergeSandboxSettings,
} from "./openers/data/sandbox-settings"
export type { SandboxSettings } from "./openers/data/sandbox-settings"

// ─────────────────────────────────────────────────────────────────────────────
// Types (shared scenario types)
// ─────────────────────────────────────────────────────────────────────────────

export type { ScenarioType, ChatScenarioType } from "./types"

// ─────────────────────────────────────────────────────────────────────────────
// Components (server entrypoints)
// ─────────────────────────────────────────────────────────────────────────────

export { ScenariosPage } from "./components/ScenariosPage"
