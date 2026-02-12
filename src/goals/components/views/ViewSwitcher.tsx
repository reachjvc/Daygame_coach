"use client"

import { Button } from "@/components/ui/button"
import { LayoutGrid, GitBranch, Columns3, List } from "lucide-react"
import type { GoalViewMode } from "../../types"

interface ViewSwitcherProps {
  activeView: GoalViewMode
  onViewChange: (view: GoalViewMode) => void
}

const VIEW_OPTIONS: { mode: GoalViewMode; icon: typeof LayoutGrid; label: string }[] = [
  { mode: "dashboard", icon: LayoutGrid, label: "Dashboard" },
  { mode: "tree", icon: GitBranch, label: "Tree" },
  { mode: "kanban", icon: Columns3, label: "Kanban" },
  { mode: "list", icon: List, label: "List" },
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
            size="icon-sm"
            className={`transition-colors ${
              isActive ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""
            }`}
            onClick={() => onViewChange(mode)}
            title={label}
          >
            <Icon className="size-4" />
          </Button>
        )
      })}
    </div>
  )
}
