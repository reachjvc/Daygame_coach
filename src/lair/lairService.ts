/**
 * Lair service - business logic for the customizable dashboard
 *
 * Handles layout manipulation, widget management, and validation.
 */

import type {
  UserLairLayout,
  TabConfig,
  UserWidgetConfig,
  WidgetDefinition,
} from "./types"
import { MAX_TABS, MIN_TABS, MAX_WIDGETS_PER_TAB, DEFAULT_LAIR_LAYOUT } from "./config"
import { widgetRegistry } from "./data/widgetRegistry"

// ============================================
// Layout Validation
// ============================================

/**
 * Validate a layout structure. Returns error message or null if valid.
 */
export function validateLayout(layout: UserLairLayout): string | null {
  if (!layout.tabs || !Array.isArray(layout.tabs)) {
    return "Layout must have tabs array"
  }

  if (layout.tabs.length < MIN_TABS) {
    return `Layout must have at least ${MIN_TABS} tab`
  }

  if (layout.tabs.length > MAX_TABS) {
    return `Layout cannot have more than ${MAX_TABS} tabs`
  }

  if (!layout.activeTabId) {
    return "Layout must have an activeTabId"
  }

  const activeTabExists = layout.tabs.some(t => t.id === layout.activeTabId)
  if (!activeTabExists) {
    return "activeTabId must reference an existing tab"
  }

  for (const tab of layout.tabs) {
    if (!tab.id || !tab.name) {
      return "Each tab must have id and name"
    }

    if (tab.widgets.length > MAX_WIDGETS_PER_TAB) {
      return `Tab "${tab.name}" has too many widgets (max ${MAX_WIDGETS_PER_TAB})`
    }

    for (const widget of tab.widgets) {
      if (!widgetRegistry[widget.widgetId]) {
        return `Unknown widget: ${widget.widgetId}`
      }
    }
  }

  return null
}

// ============================================
// Tab Operations
// ============================================

/**
 * Add a new tab to the layout.
 */
export function addTab(layout: UserLairLayout, name: string): UserLairLayout {
  if (layout.tabs.length >= MAX_TABS) {
    throw new Error(`Cannot add more than ${MAX_TABS} tabs`)
  }

  const newTab: TabConfig = {
    id: `tab-${Date.now()}`,
    name,
    widgets: [],
  }

  return {
    ...layout,
    tabs: [...layout.tabs, newTab],
  }
}

/**
 * Remove a tab from the layout.
 */
export function removeTab(layout: UserLairLayout, tabId: string): UserLairLayout {
  if (layout.tabs.length <= MIN_TABS) {
    throw new Error(`Cannot have fewer than ${MIN_TABS} tab`)
  }

  const newTabs = layout.tabs.filter(t => t.id !== tabId)

  // If we removed the active tab, switch to first tab
  const newActiveTabId = layout.activeTabId === tabId
    ? newTabs[0].id
    : layout.activeTabId

  return {
    ...layout,
    tabs: newTabs,
    activeTabId: newActiveTabId,
  }
}

/**
 * Rename a tab.
 */
export function renameTab(layout: UserLairLayout, tabId: string, newName: string): UserLairLayout {
  return {
    ...layout,
    tabs: layout.tabs.map(t =>
      t.id === tabId ? { ...t, name: newName } : t
    ),
  }
}

/**
 * Reorder tabs.
 */
export function reorderTabs(layout: UserLairLayout, fromIndex: number, toIndex: number): UserLairLayout {
  const newTabs = [...layout.tabs]
  const [removed] = newTabs.splice(fromIndex, 1)
  newTabs.splice(toIndex, 0, removed)

  return {
    ...layout,
    tabs: newTabs,
  }
}

// ============================================
// Widget Operations
// ============================================

/**
 * Add a widget to a tab.
 */
export function addWidget(
  layout: UserLairLayout,
  tabId: string,
  widgetId: string
): UserLairLayout {
  const tab = layout.tabs.find(t => t.id === tabId)
  if (!tab) {
    throw new Error(`Tab not found: ${tabId}`)
  }

  if (tab.widgets.length >= MAX_WIDGETS_PER_TAB) {
    throw new Error(`Tab already has maximum widgets (${MAX_WIDGETS_PER_TAB})`)
  }

  if (!widgetRegistry[widgetId]) {
    throw new Error(`Unknown widget: ${widgetId}`)
  }

  // Check if widget already exists in this tab
  if (tab.widgets.some(w => w.widgetId === widgetId)) {
    throw new Error(`Widget already in this tab: ${widgetId}`)
  }

  const newWidget: UserWidgetConfig = {
    widgetId,
    position: tab.widgets.length,
    collapsed: false,
  }

  return {
    ...layout,
    tabs: layout.tabs.map(t =>
      t.id === tabId
        ? { ...t, widgets: [...t.widgets, newWidget] }
        : t
    ),
  }
}

/**
 * Remove a widget from a tab.
 */
export function removeWidget(
  layout: UserLairLayout,
  tabId: string,
  widgetId: string
): UserLairLayout {
  return {
    ...layout,
    tabs: layout.tabs.map(t =>
      t.id === tabId
        ? {
            ...t,
            widgets: t.widgets
              .filter(w => w.widgetId !== widgetId)
              .map((w, i) => ({ ...w, position: i })), // Reindex positions
          }
        : t
    ),
  }
}

/**
 * Toggle widget collapsed state.
 */
export function toggleWidgetCollapsed(
  layout: UserLairLayout,
  tabId: string,
  widgetId: string
): UserLairLayout {
  return {
    ...layout,
    tabs: layout.tabs.map(t =>
      t.id === tabId
        ? {
            ...t,
            widgets: t.widgets.map(w =>
              w.widgetId === widgetId
                ? { ...w, collapsed: !w.collapsed }
                : w
            ),
          }
        : t
    ),
  }
}

/**
 * Reorder widgets within a tab.
 */
export function reorderWidgets(
  layout: UserLairLayout,
  tabId: string,
  fromIndex: number,
  toIndex: number
): UserLairLayout {
  return {
    ...layout,
    tabs: layout.tabs.map(t => {
      if (t.id !== tabId) return t

      const newWidgets = [...t.widgets]
      const [removed] = newWidgets.splice(fromIndex, 1)
      newWidgets.splice(toIndex, 0, removed)

      // Reindex positions
      return {
        ...t,
        widgets: newWidgets.map((w, i) => ({ ...w, position: i })),
      }
    }),
  }
}

// ============================================
// Widget Registry Helpers
// ============================================

/**
 * Get all available widgets grouped by category.
 */
export function getWidgetsByCategory(): Record<string, WidgetDefinition[]> {
  const byCategory: Record<string, WidgetDefinition[]> = {}

  for (const widget of Object.values(widgetRegistry)) {
    if (!byCategory[widget.category]) {
      byCategory[widget.category] = []
    }
    byCategory[widget.category].push(widget)
  }

  return byCategory
}

/**
 * Get widgets that are not in a specific tab.
 */
export function getAvailableWidgetsForTab(
  layout: UserLairLayout,
  tabId: string
): WidgetDefinition[] {
  const tab = layout.tabs.find(t => t.id === tabId)
  if (!tab) return Object.values(widgetRegistry)

  const usedWidgetIds = new Set(tab.widgets.map(w => w.widgetId))

  return Object.values(widgetRegistry).filter(w => !usedWidgetIds.has(w.id))
}

/**
 * Check if a widget requires premium access.
 */
export function isWidgetPremium(widgetId: string): boolean {
  const widget = widgetRegistry[widgetId]
  return widget?.premium ?? false
}
