/**
 * Sandbox Settings - User-configurable scenario generation toggles
 *
 * Constants and defaults for sandbox configuration.
 * Types are defined in types.ts.
 */

import type { SandboxSettings } from "./types"

export const DEFAULT_SANDBOX_SETTINGS: SandboxSettings = {
  weather: {
    enableBadWeather: true,
    enableHotWeather: true,
    showWeatherDescriptions: true,
  },
  energy: {
    enableNegativeEnergies: true,
    enableNeutralEnergies: true,
    enableShyEnergies: true,
    showEnergyDescriptions: true,
  },
  movement: {
    enableFastMovement: true,
    enableHeadphones: true,
  },
  display: {
    showOutfitDescriptions: true,
    showOpenerHooks: true,
    showCrowdDescriptions: true,
  },
  environments: {
    enableGymScenarios: true,
    enableTransitScenarios: true,
    enableCampusScenarios: true,
    enableHighCrowdScenarios: true,
  },
}

/**
 * Merges partial settings with defaults to ensure all fields exist
 */
export function mergeSandboxSettings(
  partial: Partial<SandboxSettings> | null | undefined
): SandboxSettings {
  if (!partial) return DEFAULT_SANDBOX_SETTINGS

  return {
    weather: {
      ...DEFAULT_SANDBOX_SETTINGS.weather,
      ...(partial.weather ?? {}),
    },
    energy: {
      ...DEFAULT_SANDBOX_SETTINGS.energy,
      ...(partial.energy ?? {}),
    },
    movement: {
      ...DEFAULT_SANDBOX_SETTINGS.movement,
      ...(partial.movement ?? {}),
    },
    display: {
      ...DEFAULT_SANDBOX_SETTINGS.display,
      ...(partial.display ?? {}),
    },
    environments: {
      ...DEFAULT_SANDBOX_SETTINGS.environments,
      ...(partial.environments ?? {}),
    },
  }
}

// Energy states categorized for filtering
export const NEGATIVE_ENERGIES = [
  "icy",
  "irritated",
  "rushed",
  "stressed",
  "closed",
  "impatient",
] as const

export const NEUTRAL_ENERGIES = [
  "neutral",
  "preoccupied",
  "focused",
  "distracted",
  "skeptical",
] as const

export const SHY_ENERGIES = ["shy", "melancholic", "tired"] as const

// Weather types categorized for filtering
export const BAD_WEATHER_TYPES = [
  "rain",
  "light_rain",
  "cold",
  "windy",
  "overcast",
] as const

export const HOT_WEATHER_TYPES = ["hot"] as const

// Environment codes for filtering
export const GYM_ENVIRONMENT_CODES = ["6.1", "6.2", "6.3"] as const
export const TRANSIT_ENVIRONMENT_CODES = [
  "4.1",
  "4.2",
  "4.3",
  "4.4",
  "4.5",
] as const
export const CAMPUS_ENVIRONMENT_CODES = [
  "7.1",
  "7.2",
  "7.3",
  "7.4",
  "7.5",
  "7.6",
] as const

// Re-export types for convenience
export type {
  SandboxSettings,
  WeatherSettings,
  EnergySettings,
  MovementSettings,
  DisplaySettings,
  EnvironmentSettings,
} from "./types"
