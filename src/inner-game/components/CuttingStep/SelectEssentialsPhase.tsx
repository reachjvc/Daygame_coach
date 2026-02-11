"use client"

import { Check, Info } from "lucide-react"
import { VALUE_SOURCE_CONFIG, CUTTING_CONFIG } from "../../config"
import type { SelectEssentialsPhaseProps } from "./types"
import type { ValueSource } from "../../types"

/**
 * Phase 1: Select Essential Values
 *
 * Shows all values in a chip grid. User taps to toggle "essential".
 * Single tap = toggle on/off. Shows source badge on each chip.
 */
export function SelectEssentialsPhase({
  values,
  selectedIds,
  onToggle,
  onContinue,
  onBackToHub,
}: SelectEssentialsPhaseProps) {
  const selectedCount = selectedIds.size
  const canContinue = selectedCount >= 1

  // Group values by source for organized display
  const groupedBySource = values.reduce((acc, value) => {
    const source = value.source
    if (!acc[source]) acc[source] = []
    acc[source].push(value)
    return acc
  }, {} as Record<ValueSource, typeof values>)

  const sourceOrder: ValueSource[] = ["picked", "peak_experience", "shadow", "hurdles"]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          Select Your Essential Values
        </h2>
        <p className="text-muted-foreground">
          Tap the values you <span className="font-medium text-foreground">cannot imagine your best self without</span>.
          Don't overthink—use your intuition.
        </p>
      </div>

      {/* Counter */}
      <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3 border border-border">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-primary">{selectedCount}</span>
          <span className="text-muted-foreground">essential{selectedCount !== 1 ? "s" : ""} selected</span>
        </div>
        {selectedCount > CUTTING_CONFIG.targetCoreValues && (
          <div className="flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400">
            <Info className="w-4 h-4" />
            <span>You'll narrow to {CUTTING_CONFIG.targetCoreValues} next</span>
          </div>
        )}
      </div>

      {/* Value chips grouped by source */}
      <div className="space-y-6">
        {sourceOrder.map(source => {
          const sourceValues = groupedBySource[source]
          if (!sourceValues || sourceValues.length === 0) return null

          const config = VALUE_SOURCE_CONFIG[source]

          return (
            <div key={source} className="space-y-3">
              {/* Source header */}
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: config.color }}
                />
                <span className="text-sm font-medium text-muted-foreground">
                  {config.label}
                </span>
                <span className="text-xs text-muted-foreground/60">
                  ({sourceValues.length})
                </span>
              </div>

              {/* Chips grid */}
              <div className="flex flex-wrap gap-2">
                {sourceValues.map(value => {
                  const isSelected = selectedIds.has(value.id)

                  return (
                    <button
                      key={value.id}
                      type="button"
                      onClick={() => onToggle(value.id)}
                      className={`
                        relative px-3 py-2 rounded-lg border text-sm font-medium
                        transition-all duration-150 ease-out
                        ${isSelected
                          ? "bg-primary/10 text-primary border-primary shadow-sm"
                          : "bg-card text-foreground border-border hover:border-primary/40"
                        }
                      `}
                    >
                      {/* Selected checkmark */}
                      {isSelected && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-primary-foreground" />
                        </span>
                      )}

                      {/* Value name */}
                      <span className="capitalize">{value.displayName}</span>

                      {/* Source indicator dot (subtle) */}
                      <span
                        className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full opacity-60"
                        style={{ backgroundColor: config.color }}
                      />
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

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
          {selectedCount === 0
            ? "Select at least 1 value"
            : selectedCount > CUTTING_CONFIG.targetCoreValues
            ? `Continue with ${selectedCount} → Narrow to ${CUTTING_CONFIG.targetCoreValues}`
            : `Continue with ${selectedCount} essential${selectedCount !== 1 ? "s" : ""}`
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
