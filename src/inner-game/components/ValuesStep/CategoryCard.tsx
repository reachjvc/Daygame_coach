"use client"

import type { CategoryInfo, ValueItem } from "../../types"
import { ValueChip } from "./ValueChip"

type CategoryCardProps = {
  category: CategoryInfo
  selectedValues: Set<string>
  onToggleValue: (id: string) => void
}

export function CategoryCard({
  category,
  selectedValues,
  onToggleValue,
}: CategoryCardProps) {
  const selectedCount = category.values.filter(v =>
    selectedValues.has(v.toLowerCase().replace(/\s+/g, "-"))
  ).length

  return (
    <div className="space-y-6">
      {/* Category header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: category.color }}
          />
          <h2 className="text-2xl font-bold text-foreground">
            {category.label}
          </h2>
        </div>
        <p className="text-muted-foreground">
          {category.description}
        </p>
        <p className="text-sm text-primary/80 italic">
          For daygame: {category.daygameRelevance}
        </p>
      </div>

      {/* Instruction */}
      <div className="bg-muted/50 rounded-lg p-4 border border-border">
        <p className="text-sm text-foreground">
          Pick the values that resonate with you. <span className="font-medium">Use your intuition.</span>{" "}
          Don't overthink—just pick quickly.
        </p>
      </div>

      {/* Value tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {category.values.map(valueName => {
          const valueId = valueName.toLowerCase().replace(/\s+/g, "-")
          const value: ValueItem = {
            id: valueId,
            category: category.label,
            display_name: valueName,
          }

          return (
            <ValueChip
              key={valueId}
              value={value}
              selected={selectedValues.has(valueId)}
              onToggle={onToggleValue}
            />
          )
        })}
      </div>

      {/* Selection count */}
      <p className="text-sm text-muted-foreground">
        {selectedCount} value{selectedCount !== 1 ? "s" : ""} selected in this category
      </p>
    </div>
  )
}
