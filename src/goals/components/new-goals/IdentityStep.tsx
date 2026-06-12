"use client"

import { useState } from "react"
import { IDENTITY_ASPECTS, PILLARS } from "@/src/goals/data/newGoalFramework"
import { GoalIntake } from "./GoalIntake"
import type { IntakePathSelection } from "./GoalIntake"
import { SortablePriorityList, type PriorityItem } from "./SortablePriorityList"
import { Dumbbell, Landmark, Heart, Compass, Ban, Check, Plus, type LucideIcon } from "lucide-react"

const ICON_MAP: Record<string, LucideIcon> = { Dumbbell, Landmark, Heart, Compass, Ban }

interface IdentityStepProps {
  selectedPillars: Set<string>
  /** Selected pillar ids in priority order (rank). */
  pillarOrder: string[]
  onTogglePillar: (pillarId: string) => void
  onReorderPillars: (ids: string[]) => void
  onNext: () => void
  customPillars: { id: string; label: string }[]
  onAddCustomPillar: (label: string) => void
  /** Free-text intake → per-area path selections (template + level + optional date) → apply + advance. */
  onApplyIntake?: (selections: IntakePathSelection[]) => void
}

export function IdentityStep({ selectedPillars, pillarOrder, onTogglePillar, onReorderPillars, onNext, customPillars, onAddCustomPillar, onApplyIntake }: IdentityStepProps) {
  const [customInput, setCustomInput] = useState("")

  // No auto-advance on select: multiple areas must stay visible so they can be
  // drag-ranked here. The user advances with the "Next" button.
  const handleClick = (pillarId: string) => {
    onTogglePillar(pillarId)
  }

  const handleAddCustom = () => {
    const trimmed = customInput.trim()
    if (!trimmed) return
    onAddCustomPillar(trimmed)
    setCustomInput("")
  }

  // Build the ranked-priority chips (framework + custom) in current rank order.
  const labelFor = (id: string) =>
    PILLARS.find((p) => p.id === id)?.label ?? customPillars.find((c) => c.id === id)?.label ?? id
  const colorFor = (id: string) => PILLARS.find((p) => p.id === id)?.color
  const rankItems: PriorityItem[] = pillarOrder.map((id) => ({ id, label: labelFor(id), color: colorFor(id) }))

  void onNext // navigation handled by the flow's Next button

  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-2">Who do you want to become?</h2>
      <p className="text-zinc-400 text-center mb-8">
        Choose the areas of life you want to focus on
      </p>

      {onApplyIntake && (
        <>
          <GoalIntake onApply={onApplyIntake} />
          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-zinc-600">or choose areas yourself</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
        </>
      )}

      {rankItems.length >= 2 && (
        <div className="mb-6 bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-xs text-zinc-400 mb-3">Your focus, in priority order — drag to rank (1 = most important)</p>
          <SortablePriorityList items={rankItems} onReorder={onReorderPillars} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {PILLARS.map(pillar => {
          const isSelected = selectedPillars.has(pillar.id)
          const Icon = ICON_MAP[pillar.icon]
          const aspect = IDENTITY_ASPECTS.find(a => a.pillarIds.includes(pillar.id))

          return (
            <button
              key={pillar.id}
              onClick={() => handleClick(pillar.id)}
              className={`relative bg-white/5 border rounded-xl p-6 text-left transition-all duration-200 ${
                isSelected
                  ? "border-white/30 bg-white/10"
                  : "border-white/10 hover:border-white/20"
              }`}
              style={
                isSelected
                  ? { boxShadow: `0 0 20px ${pillar.glowColor}`, borderColor: pillar.color }
                  : undefined
              }
            >
              {isSelected && (
                <div
                  className="absolute top-3 right-3 size-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: pillar.color }}
                >
                  <Check className="size-3.5 text-zinc-950" strokeWidth={3} />
                </div>
              )}

              {Icon && <Icon className="size-10" style={{ color: pillar.color }} />}
              <div
                className="text-xl font-bold mt-3 transition-colors"
                style={isSelected ? { color: pillar.color } : undefined}
              >
                {pillar.label}
              </div>
              <div className="text-sm text-zinc-400 mt-1">{pillar.tagline}</div>
              {isSelected && pillar.values.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {pillar.values.map(v => (
                    <span
                      key={v}
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: pillar.color + '20', color: pillar.color }}
                    >
                      {v}
                    </span>
                  ))}
                </div>
              )}
              {aspect && (
                <div className="text-xs text-zinc-500 mt-2 italic">{aspect.description}</div>
              )}
            </button>
          )
        })}

        {customPillars.map(cp => {
          const isSelected = selectedPillars.has(cp.id)
          return (
            <button
              key={cp.id}
              onClick={() => handleClick(cp.id)}
              className={`relative bg-white/5 border rounded-xl p-6 text-left transition-all duration-200 ${
                isSelected
                  ? "border-white/30 bg-white/10"
                  : "border-white/10 hover:border-white/20"
              }`}
              style={
                isSelected
                  ? { boxShadow: "0 0 20px rgba(161,161,170,0.3)", borderColor: "#a1a1aa" }
                  : undefined
              }
            >
              {isSelected && (
                <div className="absolute top-3 right-3 size-6 rounded-full flex items-center justify-center bg-zinc-400">
                  <Check className="size-3.5 text-zinc-950" strokeWidth={3} />
                </div>
              )}
              <Plus className="size-10 text-zinc-500" />
              <div className="text-xl font-bold mt-3">{cp.label}</div>
              <div className="text-sm text-zinc-400 mt-1">Custom area</div>
            </button>
          )
        })}
      </div>

      {/* Custom area input */}
      <div className="mt-6 flex items-center gap-3">
        <input
          type="text"
          value={customInput}
          onChange={e => setCustomInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleAddCustom() }}
          placeholder="Add your own area..."
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors"
        />
        <button
          onClick={handleAddCustom}
          disabled={!customInput.trim()}
          className="px-4 py-3 bg-white/10 border border-white/10 rounded-lg text-sm font-medium text-zinc-300 hover:bg-white/15 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Plus className="size-4" />
        </button>
      </div>

      {selectedPillars.size === 0 && (
        <p className="text-zinc-500 text-sm text-center mt-6">
          Select at least one area to continue
        </p>
      )}
    </div>
  )
}
