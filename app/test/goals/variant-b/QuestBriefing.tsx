"use client"

import { useState, useMemo } from "react"
import {
  ArrowLeft,
  Shield,
  Zap,
  Crown,
  Star,
  ChevronDown,
  ChevronRight,
  Swords,
  Target,
  CheckCircle2,
  Circle,
  Minus,
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Quest, QuestObjective } from "./quest-data"
import { getCategoryLabel } from "./quest-data"
import type { GoalDisplayCategory } from "@/src/goals/types"

const DIFFICULTY_CONFIG = {
  beginner: { label: "Beginner", color: "#22c55e", icon: Shield, stars: 1 },
  intermediate: { label: "Intermediate", color: "#3b82f6", icon: Zap, stars: 2 },
  advanced: { label: "Advanced", color: "#a855f7", icon: Star, stars: 3 },
  legendary: { label: "Legendary", color: "#f59e0b", icon: Crown, stars: 4 },
} as const

export interface ObjectiveState {
  enabled: boolean
  targetValue: number
}

interface QuestBriefingProps {
  quest: Quest
  onAccept: (objectives: Map<string, ObjectiveState>) => void
  onBack: () => void
}

export function QuestBriefing({ quest, onAccept, onBack }: QuestBriefingProps) {
  const diff = DIFFICULTY_CONFIG[quest.difficulty]
  const DiffIcon = diff.icon

  // Group objectives by category
  const grouped = useMemo(() => {
    const groups = new Map<GoalDisplayCategory | "uncategorized", QuestObjective[]>()
    for (const obj of quest.objectives) {
      const key = obj.category ?? "uncategorized"
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(obj)
    }
    return groups
  }, [quest.objectives])

  // Objective toggle state
  const [objectiveStates, setObjectiveStates] = useState<Map<string, ObjectiveState>>(() => {
    const m = new Map<string, ObjectiveState>()
    for (const obj of quest.objectives) {
      m.set(obj.id, { enabled: true, targetValue: obj.targetValue })
    }
    return m
  })

  const enabledCount = useMemo(
    () => Array.from(objectiveStates.values()).filter((s) => s.enabled).length,
    [objectiveStates]
  )

  const totalXP = useMemo(() => {
    let xp = 0
    for (const obj of quest.objectives) {
      const state = objectiveStates.get(obj.id)
      if (state?.enabled) {
        xp += Math.round(quest.xpReward * obj.weight)
      }
    }
    return xp
  }, [quest, objectiveStates])

  const toggleObjective = (id: string) => {
    setObjectiveStates((prev) => {
      const next = new Map(prev)
      const current = next.get(id)
      if (current) {
        next.set(id, { ...current, enabled: !current.enabled })
      }
      return next
    })
  }

  const updateTarget = (id: string, value: number) => {
    setObjectiveStates((prev) => {
      const next = new Map(prev)
      const current = next.get(id)
      if (current) {
        next.set(id, { ...current, targetValue: Math.max(1, value) })
      }
      return next
    })
  }

  const toggleCategory = (cat: GoalDisplayCategory | "uncategorized") => {
    const objectives = grouped.get(cat) ?? []
    const allEnabled = objectives.every((o) => objectiveStates.get(o.id)?.enabled)

    setObjectiveStates((prev) => {
      const next = new Map(prev)
      for (const obj of objectives) {
        const current = next.get(obj.id)
        if (current) {
          next.set(obj.id, { ...current, enabled: !allEnabled })
        }
      }
      return next
    })
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        data-testid="briefing-back"
      >
        <ArrowLeft className="size-3.5" />
        Back to quest board
      </button>

      {/* Quest Header Card */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-lg p-3 bg-amber-500/10 flex-shrink-0">
            <Swords className="size-7 text-amber-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold">{quest.title}</h2>
              <Badge
                variant="outline"
                className="text-[10px]"
                style={{ color: diff.color, borderColor: `${diff.color}40` }}
              >
                <DiffIcon className="size-3 mr-0.5" />
                {diff.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{quest.description}</p>

            {/* Stats row */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Zap className="size-4 text-amber-500" />
                <span className="text-sm font-semibold text-amber-500">{totalXP} XP</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Target className="size-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {enabledCount}/{quest.objectives.length} objectives
                </span>
              </div>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Star
                    key={i}
                    className="size-3.5"
                    style={{
                      color: i < diff.stars ? diff.color : "var(--muted-foreground)",
                      opacity: i < diff.stars ? 1 : 0.2,
                      fill: i < diff.stars ? diff.color : "none",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Progress preview bar */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">Quest completion tracker</span>
            <span className="text-xs font-medium">0%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: "0%",
                background: `linear-gradient(90deg, ${diff.color}, ${diff.color}cc)`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Objectives by Category */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">
            Quest Objectives
          </span>
          <div className="flex-1 border-t border-border/30" />
          <span className="text-xs text-muted-foreground">
            Toggle objectives to customize your quest
          </span>
        </div>

        {Array.from(grouped.entries()).map(([category, objectives]) => (
          <ObjectiveCategoryGroup
            key={category}
            category={category}
            objectives={objectives}
            states={objectiveStates}
            questXP={quest.xpReward}
            diffColor={diff.color}
            onToggle={toggleObjective}
            onToggleAll={() => toggleCategory(category)}
            onUpdateTarget={updateTarget}
          />
        ))}
      </div>

      {/* Accept Quest Button */}
      <div className="sticky bottom-0 py-4 bg-gradient-to-t from-background via-background to-transparent">
        <Button
          onClick={() => onAccept(objectiveStates)}
          className="w-full h-12 text-base font-semibold"
          disabled={enabledCount === 0}
          data-testid="accept-quest-button"
        >
          <Swords className="size-5 mr-2" />
          Accept Quest ({enabledCount} objectives, {totalXP} XP)
        </Button>
        {enabledCount === 0 && (
          <p className="text-center text-xs text-muted-foreground mt-2">
            Enable at least one objective to accept this quest
          </p>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Objective Category Group
// ============================================================================

function ObjectiveCategoryGroup({
  category,
  objectives,
  states,
  questXP,
  diffColor,
  onToggle,
  onToggleAll,
  onUpdateTarget,
}: {
  category: GoalDisplayCategory | "uncategorized"
  objectives: QuestObjective[]
  states: Map<string, ObjectiveState>
  questXP: number
  diffColor: string
  onToggle: (id: string) => void
  onToggleAll: () => void
  onUpdateTarget: (id: string, value: number) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const label = category === "uncategorized" ? "General" : getCategoryLabel(category as GoalDisplayCategory)
  const enabledCount = objectives.filter((o) => states.get(o.id)?.enabled).length

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      {/* Category header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
      >
        {collapsed ? (
          <ChevronRight className="size-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-3.5 text-muted-foreground" />
        )}
        <span className="text-sm font-semibold flex-1 text-left">{label}</span>
        <span className="text-xs text-muted-foreground">
          {enabledCount}/{objectives.length}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleAll()
          }}
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded cursor-pointer"
        >
          {enabledCount === objectives.length ? "None" : "All"}
        </button>
      </button>

      {/* Objectives list */}
      {!collapsed && (
        <div className="divide-y divide-border/30">
          {objectives.map((obj) => {
            const state = states.get(obj.id)
            if (!state) return null
            const objXP = Math.round(questXP * obj.weight)

            return (
              <div
                key={obj.id}
                className={`flex items-center gap-3 px-4 py-3 transition-all ${
                  state.enabled ? "" : "opacity-40"
                }`}
                data-testid={`objective-${obj.id}`}
              >
                {/* Toggle circle */}
                <button
                  onClick={() => onToggle(obj.id)}
                  className="flex-shrink-0 cursor-pointer"
                >
                  {state.enabled ? (
                    <CheckCircle2
                      className="size-5"
                      style={{ color: diffColor }}
                    />
                  ) : (
                    <Circle className="size-5 text-muted-foreground" />
                  )}
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${!state.enabled ? "line-through" : ""}`}>
                    {obj.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">
                      {obj.isMilestone ? "Milestone" : "Habit Ramp"}
                    </span>
                    {objXP > 0 && (
                      <span className="text-[10px] text-amber-500">+{objXP} XP</span>
                    )}
                    {/* Weight bar */}
                    <div className="w-12 h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, obj.weight * 400)}%`,
                          background: diffColor,
                          opacity: 0.6,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Target adjuster */}
                {state.enabled && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => onUpdateTarget(obj.id, state.targetValue - 1)}
                      className="rounded-md p-1 hover:bg-muted transition-colors cursor-pointer"
                      disabled={state.targetValue <= 1}
                    >
                      <Minus className="size-3 text-muted-foreground" />
                    </button>
                    <span className="text-sm font-mono font-medium w-10 text-center">
                      {state.targetValue}
                    </span>
                    <button
                      onClick={() => onUpdateTarget(obj.id, state.targetValue + 1)}
                      className="rounded-md p-1 hover:bg-muted transition-colors cursor-pointer"
                    >
                      <Plus className="size-3 text-muted-foreground" />
                    </button>
                    {obj.unit && (
                      <span className="text-[10px] text-muted-foreground ml-0.5 w-12 truncate">
                        {obj.unit}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
