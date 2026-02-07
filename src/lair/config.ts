/**
 * Lair slice configuration
 *
 * Pure constants only - no JSX/React.
 */

import type { UserLairLayout, WidgetCategory } from "./types"

// ============================================
// Widget Categories
// ============================================

export const WIDGET_CATEGORIES: Record<WidgetCategory, { label: string; description: string }> = {
  progress: {
    label: "Progress",
    description: "Track your XP, streaks, and achievements",
  },
  tracking: {
    label: "Tracking",
    description: "Sessions, approaches, and stats",
  },
  practice: {
    label: "Practice",
    description: "Scenarios and Q&A",
  },
  goals: {
    label: "Goals",
    description: "Your personal goals",
  },
  reflection: {
    label: "Reflection",
    description: "Reports, reviews, and values",
  },
  account: {
    label: "Account",
    description: "Settings and subscription",
  },
}

// ============================================
// Widget Sizes (Tailwind grid spans)
// ============================================

export const WIDGET_SIZE_CONFIG = {
  small: {
    desktop: "col-span-1",
    tablet: "col-span-1",
    mobile: "col-span-1",
  },
  medium: {
    desktop: "col-span-1",
    tablet: "col-span-1",
    mobile: "col-span-1",
  },
  large: {
    desktop: "col-span-2",
    tablet: "col-span-2",
    mobile: "col-span-1",
  },
  full: {
    desktop: "col-span-3",
    tablet: "col-span-2",
    mobile: "col-span-1",
  },
} as const

// ============================================
// Default Layout (for new users)
// ============================================

export const DEFAULT_LAIR_LAYOUT: UserLairLayout = {
  activeTabId: "dashboard",
  tabs: [
    {
      id: "dashboard",
      name: "Dashboard",
      widgets: [
        { widgetId: "streak-counter", position: 0, collapsed: false },
        { widgetId: "level-progress", position: 1, collapsed: false },
        { widgetId: "weekly-stats", position: 2, collapsed: false },
        { widgetId: "recent-milestones", position: 3, collapsed: false },
      ],
    },
    {
      id: "practice",
      name: "Practice",
      widgets: [
        { widgetId: "session-starter", position: 0, collapsed: false },
        { widgetId: "scenario-start", position: 1, collapsed: false },
        { widgetId: "qa-box", position: 2, collapsed: false },
      ],
    },
    {
      id: "goals",
      name: "Goals",
      widgets: [
        { widgetId: "today-goals", position: 0, collapsed: false },
        { widgetId: "goals-list", position: 1, collapsed: false },
      ],
    },
    {
      id: "reflect",
      name: "Reflect",
      widgets: [
        { widgetId: "commitment", position: 0, collapsed: false },
        { widgetId: "recent-reports", position: 1, collapsed: false },
        { widgetId: "values-display", position: 2, collapsed: false },
      ],
    },
  ],
}

// ============================================
// Tab Configuration
// ============================================

export const MAX_TABS = 6
export const MIN_TABS = 1
export const MAX_WIDGETS_PER_TAB = 12
