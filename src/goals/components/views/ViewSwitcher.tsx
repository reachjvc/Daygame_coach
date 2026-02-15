"use client"

import { Button } from "@/components/ui/button"
import { Sun, Map } from "lucide-react"
import type { GoalViewMode } from "../../types"

interface ViewSwitcherProps {
  activeView: GoalViewMode
  onViewChange: (view: GoalViewMode) => void
}

const VIEW_OPTIONS: { mode: GoalViewMode; icon: typeof Sun; label: string }[] = [
  { mode: "daily", icon: Sun, label: "Daily" },
  { mode: "strategic", icon: Map, label: "Strategic" },
]

export function ViewSwitcher({ activeView, onViewChange }: ViewSwitcherProps) {
  return (
    <div className="flex items-center rounded-lg border border-border p-0.5">
      {VIEW_OPTIONS.map(({ mode, icon: Icon, label }) => {
        const isActive = activeView === mode
        return (
          <Button
            key={mode}
            variant="ghost"
            size="sm"
            className={`gap-1.5 h-8 px-3 transition-colors ${
              isActive ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""
            }`}
            onClick={() => onViewChange(mode)}
            title={label}
          >
            <Icon className="size-4" />
            <span className="text-xs">{label}</span>
          </Button>
        )
      })}
    </div>
  )
}
