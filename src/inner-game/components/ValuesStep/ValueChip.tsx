"use client"

import { Check } from "lucide-react"
import type { ValueItem } from "../../types"

type ValueChipProps = {
  value: ValueItem
  selected: boolean
  onToggle: (id: string) => void
}

export function ValueChip({ value, selected, onToggle }: ValueChipProps) {
  const displayName = value.display_name || value.id.replace(/-/g, " ")

  return (
    <button
      onClick={() => onToggle(value.id)}
      className={`
        relative p-3 rounded-lg text-sm font-medium text-left
        transition-all duration-150 ease-in-out
        border min-h-[52px] flex items-center
        ${selected
          ? "bg-primary/10 text-primary border-primary shadow-sm"
          : "bg-card text-foreground border-border hover:border-primary/40 hover:bg-muted/30"
        }
      `}
    >
      {selected && (
        <Check className="w-4 h-4 absolute top-1.5 right-1.5 text-primary" />
      )}
      <span className={selected ? "pr-4" : ""}>{displayName}</span>
    </button>
  )
}
