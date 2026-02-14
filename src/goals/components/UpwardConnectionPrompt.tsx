"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowUp, Search, X } from "lucide-react"
import { getLifeAreaConfig } from "../data/lifeAreas"
import type { GoalWithProgress } from "../types"

interface UpwardConnectionPromptProps {
  /** Current goal being created/edited */
  currentGoalLevel?: number | null
  /** All existing goals the user could connect upward to */
  availableParents: GoalWithProgress[]
  /** Currently selected parent ID */
  selectedParentId: string | null
  /** Called when user picks a parent */
  onSelectParent: (parentId: string | null) => void
  /** If true, always show the prompt (don't auto-hide) */
  alwaysShow?: boolean
}

/**
 * Prompt shown when creating standalone L2/L3 goals:
 * "Is this part of a bigger goal?"
 */
export function UpwardConnectionPrompt({
  currentGoalLevel,
  availableParents,
  selectedParentId,
  onSelectParent,
  alwaysShow = false,
}: UpwardConnectionPromptProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [search, setSearch] = useState("")

  // Only show for L2+ goals that don't already have a parent
  const shouldShow = alwaysShow || (currentGoalLevel !== null && currentGoalLevel !== undefined && currentGoalLevel >= 2 && !selectedParentId)

  // Filter for appropriate parent levels
  const eligibleParents = useMemo(() => {
    if (!currentGoalLevel) return availableParents
    return availableParents.filter((g) => {
      // Parents should be a higher level (lower number)
      if (g.goal_level !== null && g.goal_level !== undefined && currentGoalLevel) {
        return g.goal_level < currentGoalLevel
      }
      // Legacy goals (no level) can be parents too
      return true
    })
  }, [availableParents, currentGoalLevel])

  const filteredParents = useMemo(() => {
    if (!search.trim()) return eligibleParents
    const q = search.toLowerCase()
    return eligibleParents.filter((g) => g.title.toLowerCase().includes(q))
  }, [eligibleParents, search])

  const selectedParent = selectedParentId
    ? availableParents.find((g) => g.id === selectedParentId)
    : null

  if (!shouldShow && !selectedParentId) return null

  // Compact display when a parent is already selected
  if (selectedParentId && selectedParent && !isExpanded) {
    const areaConfig = getLifeAreaConfig(selectedParent.life_area)
    return (
      <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30 border border-border">
        <ArrowUp className="size-3.5 text-muted-foreground flex-shrink-0" />
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span
            className="size-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: areaConfig.hex }}
          />
          <span className="text-xs truncate">{selectedParent.title}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs text-muted-foreground"
          onClick={() => setIsExpanded(true)}
        >
          Change
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground"
          onClick={() => onSelectParent(null)}
        >
          <X className="size-3" />
        </Button>
      </div>
    )
  }

  if (!isExpanded && !selectedParentId) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full flex items-center gap-2 p-2.5 rounded-md border border-dashed border-border hover:border-muted-foreground/50 hover:bg-muted/30 transition-colors text-left"
      >
        <ArrowUp className="size-4 text-muted-foreground" />
        <div>
          <p className="text-xs font-medium">Part of a bigger goal?</p>
          <p className="text-[11px] text-muted-foreground">
            Connect this to a higher-level goal
          </p>
        </div>
      </button>
    )
  }

  return (
    <div className="space-y-2 p-2 rounded-md bg-muted/30 border border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ArrowUp className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">Connect to a bigger goal</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => {
            setIsExpanded(false)
            setSearch("")
          }}
        >
          <X className="size-3" />
        </Button>
      </div>

      {eligibleParents.length > 5 && (
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
          <Input
            placeholder="Search goals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 text-xs pl-7"
          />
        </div>
      )}

      <div className="max-h-36 overflow-y-auto space-y-0.5">
        {filteredParents.length === 0 ? (
          <p className="text-xs text-muted-foreground p-2 text-center">
            No eligible parent goals found
          </p>
        ) : (
          filteredParents.map((g) => {
            const areaConfig = getLifeAreaConfig(g.life_area)
            const isSelected = g.id === selectedParentId
            return (
              <button
                key={g.id}
                onClick={() => {
                  onSelectParent(g.id)
                  setIsExpanded(false)
                  setSearch("")
                }}
                className={`w-full flex items-center gap-2 p-1.5 rounded text-left transition-colors ${
                  isSelected
                    ? "bg-primary/10 border border-primary/30"
                    : "hover:bg-muted/50"
                }`}
              >
                <span
                  className="size-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: areaConfig.hex }}
                />
                <span className="text-xs truncate flex-1">{g.title}</span>
                {g.goal_level !== null && g.goal_level !== undefined && (
                  <span className="text-[10px] text-muted-foreground">L{g.goal_level}</span>
                )}
              </button>
            )
          })
        )}
      </div>

      {selectedParentId && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-6 text-muted-foreground"
          onClick={() => onSelectParent(null)}
        >
          Remove connection
        </Button>
      )}
    </div>
  )
}
