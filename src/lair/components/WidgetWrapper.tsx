"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ChevronDown, ChevronUp, GripVertical, X } from "lucide-react"
import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { WidgetDefinition, WidgetProps } from "../types"
import { WIDGET_SIZE_CONFIG } from "../config"

interface WidgetWrapperProps {
  widget: WidgetDefinition
  collapsed: boolean
  isEditMode: boolean
  onToggleCollapse: () => void
  onRemove: () => void
}

export function WidgetWrapper({
  widget,
  collapsed,
  isEditMode,
  onToggleCollapse,
  onRemove,
}: WidgetWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const sizeConfig = WIDGET_SIZE_CONFIG[widget.size]
  const WidgetComponent = widget.component

  const widgetProps: WidgetProps = {
    collapsed,
    onToggleCollapse,
    isEditMode,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        sizeConfig.mobile,
        `sm:${sizeConfig.tablet}`,
        `lg:${sizeConfig.desktop}`,
        isDragging && "opacity-50 z-50"
      )}
    >
      <Card className={cn("h-full", collapsed && "py-3")}>
        <CardHeader className={cn(collapsed && "pb-0")}>
          {isEditMode && (
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing touch-none"
            >
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {widget.name}
            {widget.premium && (
              <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                PRO
              </span>
            )}
          </CardTitle>
          <CardAction>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={onToggleCollapse}
              >
                {collapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
              {isEditMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  onClick={onRemove}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardAction>
        </CardHeader>
        {!collapsed && (
          <CardContent>
            <WidgetComponent {...widgetProps} />
          </CardContent>
        )}
      </Card>
    </div>
  )
}
