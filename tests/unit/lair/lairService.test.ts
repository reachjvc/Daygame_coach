import { describe, test, expect } from "vitest"
import {
  validateLayout,
  addTab,
  removeTab,
  renameTab,
  reorderTabs,
  addWidget,
  removeWidget,
  toggleWidgetCollapsed,
  reorderWidgets,
} from "@/src/lair/lairService"
import { MAX_TABS, MIN_TABS, MAX_WIDGETS_PER_TAB } from "@/src/lair/config"
import type { UserLairLayout } from "@/src/lair/types"

// ============================================================================
// Test Fixtures
// ============================================================================

function createValidLayout(): UserLairLayout {
  return {
    activeTabId: "tab-1",
    tabs: [
      {
        id: "tab-1",
        name: "Dashboard",
        widgets: [
          { widgetId: "streak-counter", position: 0, collapsed: false },
          { widgetId: "level-progress", position: 1, collapsed: false },
        ],
      },
      {
        id: "tab-2",
        name: "Practice",
        widgets: [
          { widgetId: "session-starter", position: 0, collapsed: false },
        ],
      },
    ],
  }
}

function createSingleTabLayout(): UserLairLayout {
  return {
    activeTabId: "tab-1",
    tabs: [
      {
        id: "tab-1",
        name: "Dashboard",
        widgets: [],
      },
    ],
  }
}

// ============================================================================
// validateLayout
// ============================================================================

describe("validateLayout", () => {
  describe("valid layouts", () => {
    test("should return null for valid layout", () => {
      // Arrange
      const layout = createValidLayout()

      // Act
      const result = validateLayout(layout)

      // Assert
      expect(result).toBeNull()
    })

    test("should return null for layout with minimum tabs", () => {
      // Arrange
      const layout = createSingleTabLayout()

      // Act
      const result = validateLayout(layout)

      // Assert
      expect(result).toBeNull()
    })
  })

  describe("empty tabs array", () => {
    test("should return error for empty tabs array", () => {
      // Arrange
      const layout: UserLairLayout = {
        activeTabId: "tab-1",
        tabs: [],
      }

      // Act
      const result = validateLayout(layout)

      // Assert
      expect(result).toContain("at least")
    })
  })

  describe("too many tabs", () => {
    test("should return error for more than MAX_TABS", () => {
      // Arrange
      const tabs = Array.from({ length: MAX_TABS + 1 }, (_, i) => ({
        id: `tab-${i}`,
        name: `Tab ${i}`,
        widgets: [],
      }))
      const layout: UserLairLayout = {
        activeTabId: "tab-0",
        tabs,
      }

      // Act
      const result = validateLayout(layout)

      // Assert
      expect(result).toContain("more than")
    })
  })

  describe("missing activeTabId", () => {
    test("should return error for missing activeTabId", () => {
      // Arrange
      const layout = {
        activeTabId: "",
        tabs: [{ id: "tab-1", name: "Tab", widgets: [] }],
      } as UserLairLayout

      // Act
      const result = validateLayout(layout)

      // Assert
      expect(result).toContain("activeTabId")
    })

    test("should return error for activeTabId not in tabs", () => {
      // Arrange
      const layout: UserLairLayout = {
        activeTabId: "non-existent-tab",
        tabs: [{ id: "tab-1", name: "Tab", widgets: [] }],
      }

      // Act
      const result = validateLayout(layout)

      // Assert
      expect(result).toContain("activeTabId")
    })
  })

  describe("invalid widget ID", () => {
    test("should return error for unknown widget ID", () => {
      // Arrange
      const layout: UserLairLayout = {
        activeTabId: "tab-1",
        tabs: [
          {
            id: "tab-1",
            name: "Tab",
            widgets: [{ widgetId: "unknown-widget", position: 0, collapsed: false }],
          },
        ],
      }

      // Act
      const result = validateLayout(layout)

      // Assert
      expect(result).toContain("Unknown widget")
    })
  })

  describe("too many widgets per tab", () => {
    test("should return error for more than MAX_WIDGETS_PER_TAB", () => {
      // Arrange
      const widgets = Array.from({ length: MAX_WIDGETS_PER_TAB + 1 }, (_, i) => ({
        widgetId: "streak-counter", // Use a valid widget
        position: i,
        collapsed: false,
      }))
      const layout: UserLairLayout = {
        activeTabId: "tab-1",
        tabs: [{ id: "tab-1", name: "Tab", widgets }],
      }

      // Act
      const result = validateLayout(layout)

      // Assert
      expect(result).toContain("too many widgets")
    })
  })
})

// ============================================================================
// addTab
// ============================================================================

describe("addTab", () => {
  test("should add tab with generated ID", () => {
    // Arrange
    const layout = createValidLayout()
    const initialTabCount = layout.tabs.length

    // Act
    const result = addTab(layout, "New Tab")

    // Assert
    expect(result.tabs.length).toBe(initialTabCount + 1)
    expect(result.tabs[result.tabs.length - 1].id).toMatch(/^tab-/)
  })

  test("should add tab at end of tabs array", () => {
    // Arrange
    const layout = createValidLayout()

    // Act
    const result = addTab(layout, "New Tab")

    // Assert
    expect(result.tabs[result.tabs.length - 1].name).toBe("New Tab")
  })

  test("should throw error when at MAX_TABS limit", () => {
    // Arrange
    const tabs = Array.from({ length: MAX_TABS }, (_, i) => ({
      id: `tab-${i}`,
      name: `Tab ${i}`,
      widgets: [],
    }))
    const layout: UserLairLayout = {
      activeTabId: "tab-0",
      tabs,
    }

    // Act & Assert
    expect(() => addTab(layout, "Overflow Tab")).toThrow()
  })
})

// ============================================================================
// removeTab
// ============================================================================

describe("removeTab", () => {
  test("should remove tab by ID", () => {
    // Arrange
    const layout = createValidLayout()
    const initialTabCount = layout.tabs.length

    // Act
    const result = removeTab(layout, "tab-2")

    // Assert
    expect(result.tabs.length).toBe(initialTabCount - 1)
    expect(result.tabs.find(t => t.id === "tab-2")).toBeUndefined()
  })

  test("should switch activeTabId if removed tab was active", () => {
    // Arrange
    const layout = createValidLayout()
    layout.activeTabId = "tab-2"

    // Act
    const result = removeTab(layout, "tab-2")

    // Assert
    expect(result.activeTabId).not.toBe("tab-2")
    expect(result.activeTabId).toBe("tab-1")
  })

  test("should throw error when at MIN_TABS", () => {
    // Arrange
    const layout = createSingleTabLayout()

    // Act & Assert
    expect(() => removeTab(layout, "tab-1")).toThrow()
  })
})

// ============================================================================
// renameTab
// ============================================================================

describe("renameTab", () => {
  test("should rename tab by ID", () => {
    // Arrange
    const layout = createValidLayout()

    // Act
    const result = renameTab(layout, "tab-1", "Renamed Tab")

    // Assert
    const tab = result.tabs.find(t => t.id === "tab-1")
    expect(tab?.name).toBe("Renamed Tab")
  })

  test("should return unchanged if tab not found", () => {
    // Arrange
    const layout = createValidLayout()

    // Act
    const result = renameTab(layout, "non-existent", "New Name")

    // Assert
    expect(result.tabs).toEqual(layout.tabs)
  })
})

// ============================================================================
// reorderTabs
// ============================================================================

describe("reorderTabs", () => {
  test("should move tab from index A to B", () => {
    // Arrange
    const layout = createValidLayout()
    const firstTabId = layout.tabs[0].id
    const secondTabId = layout.tabs[1].id

    // Act
    const result = reorderTabs(layout, 0, 1)

    // Assert
    expect(result.tabs[0].id).toBe(secondTabId)
    expect(result.tabs[1].id).toBe(firstTabId)
  })

  test("should handle same index", () => {
    // Arrange
    const layout = createValidLayout()
    const originalOrder = layout.tabs.map(t => t.id)

    // Act
    const result = reorderTabs(layout, 0, 0)

    // Assert
    expect(result.tabs.map(t => t.id)).toEqual(originalOrder)
  })
})

// ============================================================================
// addWidget
// ============================================================================

describe("addWidget", () => {
  test("should add widget to specified tab", () => {
    // Arrange
    const layout = createValidLayout()
    const initialWidgetCount = layout.tabs[0].widgets.length

    // Act
    const result = addWidget(layout, "tab-1", "weekly-stats")

    // Assert
    const tab = result.tabs.find(t => t.id === "tab-1")
    expect(tab?.widgets.length).toBe(initialWidgetCount + 1)
  })

  test("should assign correct position", () => {
    // Arrange
    const layout = createValidLayout()
    const expectedPosition = layout.tabs[0].widgets.length

    // Act
    const result = addWidget(layout, "tab-1", "weekly-stats")

    // Assert
    const tab = result.tabs.find(t => t.id === "tab-1")
    const addedWidget = tab?.widgets.find(w => w.widgetId === "weekly-stats")
    expect(addedWidget?.position).toBe(expectedPosition)
  })

  test("should throw error for duplicate widget in same tab", () => {
    // Arrange
    const layout = createValidLayout()

    // Act & Assert
    expect(() => addWidget(layout, "tab-1", "streak-counter")).toThrow("already in this tab")
  })

  test("should throw error when at MAX_WIDGETS_PER_TAB", () => {
    // Arrange
    const widgetIds = [
      "streak-counter",
      "level-progress",
      "weekly-stats",
      "session-starter",
      "recent-sessions",
      "goal-progress",
      "today-goals",
      "goal-streaks",
      "goals-list",
      "commitment",
      "recent-reports",
      "values-display",
    ]
    const widgets = widgetIds.slice(0, MAX_WIDGETS_PER_TAB).map((id, i) => ({
      widgetId: id,
      position: i,
      collapsed: false,
    }))
    const layout: UserLairLayout = {
      activeTabId: "tab-1",
      tabs: [{ id: "tab-1", name: "Tab", widgets }],
    }

    // Act & Assert
    expect(() => addWidget(layout, "tab-1", "subscription")).toThrow("maximum widgets")
  })
})

// ============================================================================
// removeWidget
// ============================================================================

describe("removeWidget", () => {
  test("should remove widget from tab", () => {
    // Arrange
    const layout = createValidLayout()

    // Act
    const result = removeWidget(layout, "tab-1", "streak-counter")

    // Assert
    const tab = result.tabs.find(t => t.id === "tab-1")
    expect(tab?.widgets.find(w => w.widgetId === "streak-counter")).toBeUndefined()
  })

  test("should reindex remaining widget positions", () => {
    // Arrange
    const layout = createValidLayout()

    // Act
    const result = removeWidget(layout, "tab-1", "streak-counter")

    // Assert
    const tab = result.tabs.find(t => t.id === "tab-1")
    expect(tab?.widgets[0].position).toBe(0)
  })
})

// ============================================================================
// toggleWidgetCollapsed
// ============================================================================

describe("toggleWidgetCollapsed", () => {
  test("should toggle collapsed from false to true", () => {
    // Arrange
    const layout = createValidLayout()

    // Act
    const result = toggleWidgetCollapsed(layout, "tab-1", "streak-counter")

    // Assert
    const tab = result.tabs.find(t => t.id === "tab-1")
    const widget = tab?.widgets.find(w => w.widgetId === "streak-counter")
    expect(widget?.collapsed).toBe(true)
  })

  test("should toggle collapsed from true to false", () => {
    // Arrange
    const layout = createValidLayout()
    layout.tabs[0].widgets[0].collapsed = true

    // Act
    const result = toggleWidgetCollapsed(layout, "tab-1", "streak-counter")

    // Assert
    const tab = result.tabs.find(t => t.id === "tab-1")
    const widget = tab?.widgets.find(w => w.widgetId === "streak-counter")
    expect(widget?.collapsed).toBe(false)
  })
})

// ============================================================================
// reorderWidgets
// ============================================================================

describe("reorderWidgets", () => {
  test("should move widget within tab", () => {
    // Arrange
    const layout = createValidLayout()
    const firstWidgetId = layout.tabs[0].widgets[0].widgetId
    const secondWidgetId = layout.tabs[0].widgets[1].widgetId

    // Act
    const result = reorderWidgets(layout, "tab-1", 0, 1)

    // Assert
    const tab = result.tabs.find(t => t.id === "tab-1")
    expect(tab?.widgets[0].widgetId).toBe(secondWidgetId)
    expect(tab?.widgets[1].widgetId).toBe(firstWidgetId)
  })

  test("should update positions correctly", () => {
    // Arrange
    const layout = createValidLayout()

    // Act
    const result = reorderWidgets(layout, "tab-1", 0, 1)

    // Assert
    const tab = result.tabs.find(t => t.id === "tab-1")
    expect(tab?.widgets[0].position).toBe(0)
    expect(tab?.widgets[1].position).toBe(1)
  })
})
