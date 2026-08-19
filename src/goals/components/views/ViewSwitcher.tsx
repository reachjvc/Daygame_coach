"use client"

import { Button } from "@/components/ui/button"
import { Sun, Layers, GitFork, Orbit, TreePine } from "lucide-react"
import type { GoalViewMode } from "../../types"

interface ViewSwitcherProps {
  activeView: GoalViewMode
  onViewChange: (view: GoalViewMode) => void
  /**
   * Views to leave out. For a caller that cannot honour one — the scoped hub
   * cannot scope "Life", which fetches its own unfiltered data — offering it
   * would put an unrelated view behind a button that looks like the others.
   */
  hide?: GoalViewMode[]
}

const VIEW_OPTIONS: { mode: GoalViewMode; icon: typeof Sun; label: string }[] = [
  { mode: "today", icon: Sun, label: "Today" },
  { mode: "hierarchy", icon: Layers, label: "Hierarchy" },
  { mode: "tree", icon: GitFork, label: "Tree" },
  { mode: "tree-of-life", icon: TreePine, label: "Life" },
  { mode: "orrery", icon: Orbit, label: "Orrery" },
]

export function ViewSwitcher({ activeView, onViewChange, hide }: ViewSwitcherProps) {
  const options = hide?.length ? VIEW_OPTIONS.filter((o) => !hide.includes(o.mode)) : VIEW_OPTIONS
  return (
    <div className="flex items-center rounded-lg border border-border p-0.5" data-testid="goals-view-switcher">
      {options.map(({ mode, icon: Icon, label }) => {
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
