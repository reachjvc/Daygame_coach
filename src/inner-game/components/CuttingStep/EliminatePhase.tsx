"use client"

import { Undo2, X } from "lucide-react"
import { VALUE_SOURCE_CONFIG, CUTTING_CONFIG } from "../../config"
import type { EliminatePhaseProps } from "./types"

/**
 * Phase 2: Eliminate to Target Count
 *
 * Only shown if user selected more than targetCoreValues (7) essentials.
 * User taps values to remove them until target count is reached.
 */
export function EliminatePhase({
  values,
  onRemove,
  onUndo,
  onContinue,
  removedIds,
  targetCount,
  onBackToHub,
}: EliminatePhaseProps) {
  // Filter out removed values
  const remainingValues = values.filter(v => !removedIds.includes(v.id))
  const remainingCount = remainingValues.length
  const needToRemove = remainingCount - targetCount
  const canContinue = remainingCount <= targetCount
  const canUndo = removedIds.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          Which Can You Live Without?
        </h2>
        <p className="text-muted-foreground">
          Tap to remove values until you have your top <span className="font-medium text-foreground">{targetCount}</span>.
          Trust your gut—you can always undo.
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3 border border-border">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-primary">{remainingCount}</span>
          <span className="text-muted-foreground">
            remaining{" "}
            {!canContinue && (
              <span className="text-amber-600 dark:text-amber-400">
                → remove {needToRemove} more
              </span>
            )}
          </span>
        </div>
        {canUndo && (
          <button
            type="button"
            onClick={onUndo}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Undo2 className="w-4 h-4" />
            Undo
          </button>
        )}
      </div>

      {/* Value chips - tap to remove */}
      <div className="flex flex-wrap gap-2">
        {remainingValues.map(value => {
          const config = VALUE_SOURCE_CONFIG[value.source]

          return (
            <button
              key={value.id}
              type="button"
              onClick={() => onRemove(value.id)}
              className="
                group relative px-4 py-2.5 rounded-lg border
                bg-card text-foreground border-border
                hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive
                transition-all duration-150
              "
            >
              {/* Remove indicator on hover */}
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="w-3 h-3 text-destructive-foreground" />
              </span>

              {/* Value name */}
              <span className="capitalize font-medium">{value.displayName}</span>

              {/* Source indicator dot */}
              <span
                className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full opacity-60"
                style={{ backgroundColor: config.color }}
              />
            </button>
          )
        })}
      </div>

      {/* Removed values (collapsed) */}
      {removedIds.length > 0 && (
        <div className="pt-4 border-t border-border/50">
          <p className="text-sm text-muted-foreground mb-2">
            Removed ({removedIds.length}):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {removedIds.map(id => {
              const value = values.find(v => v.id === id)
              if (!value) return null

              return (
                <span
                  key={id}
                  className="px-2 py-1 rounded text-xs text-muted-foreground/60 bg-muted/30 line-through"
                >
                  {value.displayName}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Continue button */}
      <div className="pt-4 space-y-3">
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className={`
            w-full py-3 px-4 rounded-lg font-medium text-center
            transition-all duration-150
            ${canContinue
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground cursor-not-allowed"
            }
          `}
        >
          {canContinue
            ? `Continue with ${remainingCount} values`
            : `Remove ${needToRemove} more to continue`
          }
        </button>

        {/* Back to hub link */}
        {onBackToHub && (
          <button
            type="button"
            onClick={onBackToHub}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to Overview
          </button>
        )}
      </div>
    </div>
  )
}
