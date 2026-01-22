/**
 * Encounters Slice - Public API
 *
 * Shared encounter simulation data/settings used across multiple features
 * (e.g. scenarios and future cold approach training).
 */

export {
  DEFAULT_SANDBOX_SETTINGS,
  mergeSandboxSettings,
  NEGATIVE_ENERGIES,
  NEUTRAL_ENERGIES,
  SHY_ENERGIES,
  BAD_WEATHER_TYPES,
  HOT_WEATHER_TYPES,
  GYM_ENVIRONMENT_CODES,
  TRANSIT_ENVIRONMENT_CODES,
  CAMPUS_ENVIRONMENT_CODES,
} from "./sandbox-settings"

export type {
  SandboxSettings,
  WeatherSettings,
  EnergySettings,
  MovementSettings,
  DisplaySettings,
  EnvironmentSettings,
} from "./sandbox-settings"
