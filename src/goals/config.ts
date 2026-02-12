/**
 * Goals slice configuration and constants
 */

import type { GoalViewMode } from "./types"

/**
 * View mode labels and icons for the ViewSwitcher
 */
export const VIEW_MODE_CONFIG: Record<GoalViewMode, { label: string; description: string }> = {
  dashboard: { label: "Dashboard", description: "Life area cards with progress overview" },
  tree: { label: "Tree", description: "Hierarchical goal tree view" },
  kanban: { label: "Kanban", description: "Time horizon columns" },
  list: { label: "List", description: "Sortable table view" },
}

/**
 * Time horizon labels in order from longest to shortest
 */
export const TIME_HORIZONS = [
  "Life",
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
