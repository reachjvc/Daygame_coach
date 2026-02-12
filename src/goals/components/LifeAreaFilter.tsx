"use client"

import { Badge } from "@/components/ui/badge"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { X } from "lucide-react"
import { LIFE_AREAS, getLifeAreaConfig } from "../data/lifeAreas"
import type { GoalWithProgress } from "../types"

interface LifeAreaFilterProps {
  goals: GoalWithProgress[]
  selectedArea: string | null
  onSelect: (area: string | null) => void
}

export function LifeAreaFilter({ goals, selectedArea, onSelect }: LifeAreaFilterProps) {
  // Count goals per life area
  const areaCounts = new Map<string, number>()
  for (const goal of goals) {
    const area = goal.life_area || "custom"
    areaCounts.set(area, (areaCounts.get(area) || 0) + 1)
  }

  // Known areas that have goals
  const knownAreaIds = new Set(LIFE_AREAS.map(a => a.id))
  const areasWithGoals = LIFE_AREAS.filter((a) => areaCounts.has(a.id))

  // Custom areas (not in LIFE_AREAS) that have goals
  const customAreas = [...areaCounts.keys()]
    .filter(id => !knownAreaIds.has(id))
    .map(id => getLifeAreaConfig(id))

  const totalGoals = goals.length

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-2 pb-2">
        {/* All filter */}
        <Badge
          variant="outline"
          className="cursor-pointer whitespace-nowrap gap-1.5 transition-colors border-transparent flex-shrink-0"
          style={{
            backgroundColor: selectedArea === null ? "#6b7280" : "#6b728015",
            color: selectedArea === null ? "white" : "#6b7280",
          }}
          onClick={() => onSelect(null)}
        >
          All
          <span className="text-xs opacity-70">{totalGoals}</span>
        </Badge>

        {/* Known life area filters (daygame always first due to sortOrder) */}
        {areasWithGoals.map((area) => {
          const Icon = area.icon
          const count = areaCounts.get(area.id) || 0
          const isSelected = selectedArea === area.id
          return (
            <Badge
              key={area.id}
              variant="outline"
              className="cursor-pointer whitespace-nowrap gap-1.5 transition-colors border-transparent flex-shrink-0"
              style={{
                backgroundColor: isSelected ? area.hex : `${area.hex}15`,
                color: isSelected ? "white" : area.hex,
              }}
              onClick={() => onSelect(isSelected ? null : area.id)}
            >
              <Icon className="size-3" />
              {area.name}
              <span className="text-xs opacity-70">{count}</span>
              {isSelected && <X className="size-3 ml-0.5" />}
            </Badge>
          )
        })}

        {/* Custom life area filters */}
        {customAreas.map((area) => {
          const Icon = area.icon
          const count = areaCounts.get(area.id) || 0
          const isSelected = selectedArea === area.id
          return (
            <Badge
              key={area.id}
              variant="outline"
              className="cursor-pointer whitespace-nowrap gap-1.5 transition-colors border-transparent flex-shrink-0"
              style={{
                backgroundColor: isSelected ? area.hex : `${area.hex}15`,
                color: isSelected ? "white" : area.hex,
              }}
              onClick={() => onSelect(isSelected ? null : area.id)}
            >
              <Icon className="size-3" />
              {area.name}
              <span className="text-xs opacity-70">{count}</span>
              {isSelected && <X className="size-3 ml-0.5" />}
            </Badge>
          )
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}
