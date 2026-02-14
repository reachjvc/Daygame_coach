/**
 * Goals slice configuration and constants
 */

import type { GoalViewMode } from "./types"

/**
 * View mode labels and icons for the ViewSwitcher
 */
export const VIEW_MODE_CONFIG: Record<GoalViewMode, { label: string; description: string }> = {
  daily: { label: "Daily", description: "Action-focused view for this week's goals" },
  strategic: { label: "Strategic", description: "Full hierarchy with achievements and categories" },
  standard: { label: "Standard", description: "Life area cards with progress overview" },
  "time-horizon": { label: "Time Horizon", description: "Goals grouped by time horizon with expandable chains" },
}

/**
 * Time horizon labels in order from longest to shortest
 */
export const TIME_HORIZONS = [
  "Life",
  "Multi-Year",
  "This Year",
  "This Quarter",
  "This Month",
  "This Week",
  "Today",
] as const

/**
 * Default filter state
 */
export const DEFAULT_FILTER_STATE = {
  lifeArea: null,
  timeHorizon: null,
  status: null,
  search: "",
} as const
