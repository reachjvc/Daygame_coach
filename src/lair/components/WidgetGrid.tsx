"use client"

import { useCallback, useState } from "react"
import {
  DndContext,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core"
import type { DropAnimation } from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable"
import { WidgetWrapper } from "./WidgetWrapper"
import { widgetRegistry } from "../data/widgetRegistry"
import type { UserWidgetConfig, UserLairLayout, WidgetDefinition } from "../types"
import { reorderWidgets, toggleWidgetCollapsed, removeWidget } from "../lairService"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface WidgetGridProps {
  widgets: UserWidgetConfig[]
  tabId: string
  isEditMode: boolean
  layout: UserLairLayout
  onLayoutChange: (layout: UserLairLayout) => void
}

/**
 * Static widget preview for drag overlay (non-interactive)
 */
function StaticWidgetPreview({
  widget,
  collapsed,
}: {
  widget: WidgetDefinition
  collapsed: boolean
}) {
  const sizeClasses: Record<string, string> = {
    small: "col-span-1 w-[300px]",
    medium: "col-span-1 w-[300px]",
    large: "col-span-1 sm:col-span-2 lg:col-span-2 w-[620px]",
    full: "col-span-1 sm:col-span-2 lg:col-span-3 w-[960px]",
  }

  const WidgetComponent = widget.component

  return (
    <div className={cn(sizeClasses[widget.size] || "col-span-1 w-[300px]")}>
      <Card className={cn("h-full shadow-2xl", collapsed && "py-3")}>
        <CardHeader className={collapsed ? "pb-0" : ""}>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {widget.name}
            {widget.premium && (
              <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                PRO
              </span>
            )}
          </CardTitle>
        </CardHeader>
        {!collapsed && (
          <CardContent>
            <WidgetComponent collapsed={false} onToggleCollapse={() => {}} isEditMode={false} />
          </CardContent>
        )}
      </Card>
    </div>
  )
}

export function WidgetGrid({
  widgets,
  tabId,
  isEditMode,
  layout,
  onLayoutChange,
}: WidgetGridProps) {
  const [activeWidgetId, setActiveWidgetId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveWidgetId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      if (over && active.id !== over.id) {
        const oldIndex = widgets.findIndex((w) => w.widgetId === active.id)
        const newIndex = widgets.findIndex((w) => w.widgetId === over.id)

        if (oldIndex !== -1 && newIndex !== -1) {
          const newLayout = reorderWidgets(layout, tabId, oldIndex, newIndex)
          onLayoutChange(newLayout)
        }
      }

      setActiveWidgetId(null)
    },
    [widgets, tabId, layout, onLayoutChange]
  )

  const handleToggleCollapse = useCallback(
    (widgetId: string) => {
      const newLayout = toggleWidgetCollapsed(layout, tabId, widgetId)
      onLayoutChange(newLayout)
    },
    [layout, tabId, onLayoutChange]
  )

  const handleRemove = useCallback(
    (widgetId: string) => {
      const newLayout = removeWidget(layout, tabId, widgetId)
      onLayoutChange(newLayout)
    },
    [layout, tabId, onLayoutChange]
  )

  // Sort widgets by position
  const sortedWidgets = [...widgets].sort((a, b) => a.position - b.position)

  // Get active widget for overlay
  const activeWidget = activeWidgetId
    ? widgetRegistry[activeWidgetId]
    : null
  const activeWidgetConfig = activeWidgetId
    ? sortedWidgets.find((w) => w.widgetId === activeWidgetId)
    : null

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: "0.4",
        },
      },
    }),
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sortedWidgets.map((w) => w.widgetId)}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedWidgets.map((widgetConfig) => {
            const widget = widgetRegistry[widgetConfig.widgetId]
            if (!widget) return null

            return (
              <WidgetWrapper
                key={widgetConfig.widgetId}
                widget={widget}
                collapsed={widgetConfig.collapsed}
                isEditMode={isEditMode}
                onToggleCollapse={() => handleToggleCollapse(widgetConfig.widgetId)}
                onRemove={() => handleRemove(widgetConfig.widgetId)}
              />
            )
          })}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={dropAnimation}>
        {activeWidget && activeWidgetConfig ? (
          <StaticWidgetPreview
            widget={activeWidget}
            collapsed={activeWidgetConfig.collapsed}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
