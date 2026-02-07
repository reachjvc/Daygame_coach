"use client"

import { useCallback } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable"
import { WidgetWrapper } from "./WidgetWrapper"
import { widgetRegistry } from "../data/widgetRegistry"
import type { UserWidgetConfig, UserLairLayout } from "../types"
import { reorderWidgets, toggleWidgetCollapsed, removeWidget } from "../lairService"

interface WidgetGridProps {
  widgets: UserWidgetConfig[]
  tabId: string
  isEditMode: boolean
  layout: UserLairLayout
  onLayoutChange: (layout: UserLairLayout) => void
}

export function WidgetGrid({
  widgets,
  tabId,
  isEditMode,
  layout,
  onLayoutChange,
}: WidgetGridProps) {
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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
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
    </DndContext>
  )
}
