"use client"

import { LIFE_AREAS } from "@/src/goals/data/lifeAreas"
import type { LifeAreaConfig } from "@/src/goals/types"

interface LifeAreaSelectorProps {
  selectedAreaId: string | null
  onSelect: (area: LifeAreaConfig) => void
}

const visibleAreas = LIFE_AREAS.filter((a) => a.id !== "custom")

export function LifeAreaSelector({ selectedAreaId, onSelect }: LifeAreaSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">What area of your life do you want to level up?</h2>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Choose a life area to see curated goal paths. Each path comes with trackable milestones and habits built in.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
        {visibleAreas.map((area) => {
          const isSelected = selectedAreaId === area.id
          const Icon = area.icon
          return (
            <button
              key={area.id}
              onClick={() => onSelect(area)}
              className="group relative flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all duration-200 cursor-pointer hover:scale-[1.02]"
              style={{
                borderColor: isSelected ? area.hex : "var(--border)",
                backgroundColor: isSelected ? `${area.hex}08` : "transparent",
                boxShadow: isSelected ? `0 0 20px ${area.hex}15, 0 4px 12px ${area.hex}10` : "none",
              }}
              data-testid={`area-card-${area.id}`}
            >
              {/* Icon container */}
              <div
                className="rounded-xl p-3 transition-colors duration-200"
                style={{
                  backgroundColor: isSelected ? `${area.hex}20` : `${area.hex}10`,
                  color: area.hex,
                }}
              >
                <Icon className="size-6" />
              </div>

              {/* Label */}
              <span
                className="text-sm font-semibold text-center leading-tight"
                style={{ color: isSelected ? area.hex : undefined }}
              >
                {area.name}
              </span>

              {/* Suggestion count */}
              <span className="text-[11px] text-muted-foreground">
                {area.id === "daygame" ? "12 goal paths" : `${area.suggestions.length} suggestions`}
              </span>

              {/* Selection indicator */}
              {isSelected && (
                <div
                  className="absolute top-2 right-2 size-5 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: area.hex }}
                >
                  <svg className="size-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
