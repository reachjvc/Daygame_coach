"use client"

import type { WidgetProps } from "../../types"

/**
 * Placeholder widget for widgets not yet implemented.
 * Shows a "coming soon" message.
 */
export function PlaceholderWidget({ collapsed }: WidgetProps) {
  if (collapsed) {
    return null
  }

  return (
    <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
      Coming soon
    </div>
  )
}
