"use client"

import { useState, useCallback, useEffect } from "react"
import { Settings2, RotateCcw } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { WidgetGrid } from "./WidgetGrid"
import { WidgetLibraryDrawer } from "./WidgetLibraryDrawer"
import { addWidget } from "../lairService"
import { DEFAULT_LAIR_LAYOUT } from "../config"
import type { UserLairLayout } from "../types"

interface LairPageProps {
  initialLayout: UserLairLayout
  onSaveLayout: (layout: UserLairLayout) => Promise<void>
}

export function LairPage({ initialLayout, onSaveLayout }: LairPageProps) {
  const [layout, setLayout] = useState<UserLairLayout>(initialLayout)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Track changes
  useEffect(() => {
    const hasChanges = JSON.stringify(layout) !== JSON.stringify(initialLayout)
    setHasUnsavedChanges(hasChanges)
  }, [layout, initialLayout])

  // Auto-save on layout change (debounced)
  useEffect(() => {
    if (!hasUnsavedChanges) return

    const timer = setTimeout(async () => {
      setIsSaving(true)
      try {
        await onSaveLayout(layout)
      } catch (error) {
        console.error("Failed to save layout:", error)
      } finally {
        setIsSaving(false)
      }
    }, 1000) // 1 second debounce

    return () => clearTimeout(timer)
  }, [layout, hasUnsavedChanges, onSaveLayout])

  const handleLayoutChange = useCallback((newLayout: UserLairLayout) => {
    setLayout(newLayout)
  }, [])

  const handleAddWidget = useCallback(
    (widgetId: string) => {
      const newLayout = addWidget(layout, layout.activeTabId, widgetId)
      setLayout(newLayout)
    },
    [layout]
  )

  const handleTabChange = useCallback((tabId: string) => {
    setLayout((prev) => ({
      ...prev,
      activeTabId: tabId,
    }))
  }, [])

  const handleReset = useCallback(() => {
    if (confirm("Reset to default layout? This will remove all customizations.")) {
      setLayout(DEFAULT_LAIR_LAYOUT)
    }
  }, [])

  const activeTab = layout.tabs.find((t) => t.id === layout.activeTabId)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">The Lair</h1>
          <p className="text-muted-foreground text-sm">
            Your personal command center
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="text-xs text-muted-foreground">Saving...</span>
          )}
          <Button
            variant={isEditMode ? "default" : "outline"}
            size="sm"
            onClick={() => setIsEditMode(!isEditMode)}
            className="gap-2"
          >
            <Settings2 className="h-4 w-4" />
            {isEditMode ? "Done" : "Edit"}
          </Button>
          {isEditMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={layout.activeTabId} onValueChange={handleTabChange}>
        <div className="flex items-center justify-between mb-4">
          <TabsList className="overflow-x-auto">
            {layout.tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.name}
              </TabsTrigger>
            ))}
          </TabsList>
          {isEditMode && (
            <WidgetLibraryDrawer
              layout={layout}
              tabId={layout.activeTabId}
              onAddWidget={handleAddWidget}
            />
          )}
        </div>

        {/* Tab Content */}
        {layout.tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id}>
            {tab.widgets.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <p className="mb-4">No widgets in this tab yet</p>
                {isEditMode ? (
                  <p className="text-sm">
                    Click &quot;Add Widget&quot; to get started
                  </p>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditMode(true)}
                  >
                    Enter Edit Mode
                  </Button>
                )}
              </div>
            ) : (
              <WidgetGrid
                widgets={tab.widgets}
                tabId={tab.id}
                isEditMode={isEditMode}
                layout={layout}
                onLayoutChange={handleLayoutChange}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
