"use client"

import { Button } from "@/components/ui/button"
import { Sun, Layers, GitFork, Orbit } from "lucide-react"
import type { GoalViewMode } from "../../types"

interface ViewSwitcherProps {
  activeView: GoalViewMode
  onViewChange: (view: GoalViewMode) => void
}

const VIEW_OPTIONS: { mode: GoalViewMode; icon: typeof Sun; label: string }[] = [
  { mode: "today", icon: Sun, label: "Today" },
  { mode: "hierarchy", icon: Layers, label: "Hierarchy" },
  { mode: "tree", icon: GitFork, label: "Tree" },
  { mode: "orrery", icon: Orbit, label: "Orrery" },
]

export function ViewSwitcher({ activeView, onViewChange }: ViewSwitcherProps) {
  return (
    <div className="flex items-center rounded-lg border border-border p-0.5" data-testid="goals-view-switcher">
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
            data-testid={`goals-view-${mode}`}
          >
            <Icon className="size-4" />
            <span className="text-xs hidden sm:inline">{label}</span>
          </Button>
        )
      })}
    </div>
  )
}
