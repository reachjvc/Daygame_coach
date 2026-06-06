"use client"

import { useState } from "react"
import {
  PILLARS,
  PRIMITIVE_META,
  getObjectivesForPillar,
  getTargetsForObjective,
  getDriversForObjective,
  getMetricsForObjective,
  getSharedDriver,
  getObjectivesForSharedDriver,
} from "@/src/goals/data/newGoalFramework"
import type { FrameworkTarget, GoalPrimitive, Objective } from "@/src/goals/data/newGoalFramework"
import {
  Footprints,
  Trophy,
  Brain,
  MessageCircle,
  Dumbbell,
  Landmark,
  Heart,
  Compass,
  CalendarCheck,
  Scaling,
  Apple,
  Wind,
  TrendingUp,
  Shield,
  Sunrise,
  BookOpen,
  Check,
  Plus,
  ChevronDown,
  ChevronRight,
  Target,
  Flame,
  Repeat,
  Zap,
  Milestone,
  Users,
  type LucideIcon,
} from "lucide-react"

const ICON_MAP: Record<string, LucideIcon> = {
  Footprints,
  Trophy,
  Brain,
  MessageCircle,
  Dumbbell,
  Landmark,
  Heart,
  Compass,
  CalendarCheck,
  Scaling,
  Apple,
  Wind,
  TrendingUp,
  Shield,
  Sunrise,
  BookOpen,
  Target,
  Flame,
  Repeat,
  Zap,
  Milestone,
  Users,
}

const COMMITMENT_CONFIG: Record<string, { label: string; color: string }> = {
  light: { label: "Light", color: "#22c55e" },
  moderate: { label: "Moderate", color: "#f59e0b" },
  heavy: { label: "Heavy", color: "#ef4444" },
}

interface ObjectiveStepProps {
  selectedPillars: Set<string>
  selectedObjectives: Set<string>
  onToggle: (objectiveId: string) => void
  customPillars: { id: string; label: string }[]
  customObjectives: { id: string; pillarId: string; label: string }[]
  onAddCustomObjective: (pillarId: string, label: string) => void
}

/** Format a target's value display based on its primitive type and config */
function formatTargetValue(target: FrameworkTarget): string {
  // For shared drivers, use the shared driver's config
  if (target.sharedDriverId) {
    const shared = getSharedDriver(target.sharedDriverId)
    if (shared) {
      if (shared.rampSteps && shared.rampSteps.length > 0) {
        return shared.rampSteps.map(s => `${s.frequencyPerWeek}/wk`).join(" → ")
      }
      if (shared.milestoneConfig) {
        return `${shared.milestoneConfig.target} ${target.unit}`
      }
    }
  }

  if (target.stageSteps && target.stageSteps.length > 0) {
    return target.stageSteps.join(" → ")
  }

  if (target.rampSteps && target.rampSteps.length > 0) {
    return target.rampSteps.map(s => `${s.frequencyPerWeek}/wk`).join(" → ")
  }

  if (target.milestoneConfig) {
    return `${target.milestoneConfig.target} ${target.unit}`
  }

  return "-"
}

/** Get "Also in:" objectives for a shared driver, excluding the current objective */
function getSharedDriverOtherObjectives(sharedDriverId: string, currentObjectiveId: string): string[] {
  const objectives = getObjectivesForSharedDriver(sharedDriverId)
  return objectives
    .filter(obj => obj.id !== currentObjectiveId)
    .map(obj => obj.label)
}

export function ObjectiveStep({
  selectedPillars,
  selectedObjectives,
  onToggle,
  customPillars,
  customObjectives,
  onAddCustomObjective,
}: ObjectiveStepProps) {
  const [inputValues, setInputValues] = useState<Record<string, string>>({})
  const [expandedObjectives, setExpandedObjectives] = useState<Set<string>>(new Set())

  const builtInPillars = PILLARS.filter((p) => selectedPillars.has(p.id))
  const activeCustomPillars = customPillars.filter((p) => selectedPillars.has(p.id))

  const handleAdd = (pillarId: string) => {
    const val = inputValues[pillarId]?.trim()
    if (!val) return
    onAddCustomObjective(pillarId, val)
    setInputValues(prev => ({ ...prev, [pillarId]: "" }))
  }

  const toggleExpand = (objectiveId: string) => {
    setExpandedObjectives(prev => {
      const next = new Set(prev)
      if (next.has(objectiveId)) {
        next.delete(objectiveId)
      } else {
        next.add(objectiveId)
      }
      return next
    })
  }

  function renderTargetRow(target: FrameworkTarget, objectiveId: string) {
    const primMeta = PRIMITIVE_META[target.primitive]
    const PrimIcon = ICON_MAP[primMeta.iconName]
    const value = formatTargetValue(target)
    const isStageOrSkill = target.primitive === "stage" || target.primitive === "skill"

    // Shared driver info
    const sharedOthers = target.sharedDriverId
      ? getSharedDriverOtherObjectives(target.sharedDriverId, objectiveId)
      : []

    return (
      <div key={target.id} className="flex items-start gap-2 text-xs py-0.5">
        <span className="text-zinc-500 mt-0.5">&bull;</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-zinc-300">{target.label}</span>
            <span
              className="shrink-0 flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `${primMeta.color}20`,
                color: primMeta.color,
              }}
            >
              {PrimIcon && <PrimIcon className="size-2.5" />}
              {primMeta.label}
            </span>
          </div>
          {/* Value / ramp / stages */}
          <div className="text-zinc-500 mt-0.5">
            {isStageOrSkill && target.stageSteps ? (
              <span className="text-zinc-400">{target.stageSteps.join(" → ")}</span>
            ) : (
              <span className="tabular-nums">{value}</span>
            )}
          </div>
          {/* Shared driver badge */}
          {sharedOthers.length > 0 && (
            <div className="mt-0.5">
              <span className="text-[10px] text-zinc-500 italic">
                Also in: {sharedOthers.join(", ")}
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }

  function renderBuiltInCard(obj: Objective, color: string) {
    const isSelected = selectedObjectives.has(obj.id)
    const isExpanded = expandedObjectives.has(obj.id)
    const Icon = ICON_MAP[obj.icon]
    const targets = getTargetsForObjective(obj.id)
    const drivers = getDriversForObjective(obj.id)
    const metrics = getMetricsForObjective(obj.id)
    const commitmentCfg = COMMITMENT_CONFIG[obj.commitment]

    return (
      <div
        key={obj.id}
        className={`relative bg-white/5 border border-white/10 rounded-xl transition-all duration-200 hover:border-white/20 ${
          isSelected ? "bg-white/8" : ""
        }`}
        style={{
          borderLeftWidth: isSelected ? "3px" : undefined,
          borderLeftColor: isSelected ? color : undefined,
        }}
      >
        {/* Clickable card body for expand/collapse */}
        <button
          type="button"
          onClick={() => toggleExpand(obj.id)}
          className="w-full text-left p-4 pb-3"
        >
          {/* Header row: Icon + Title + commitment badge + select toggle */}
          <div className="flex items-start gap-3">
            {Icon && (
              <Icon
                className="size-5 mt-0.5 shrink-0"
                style={{ color }}
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium text-white">{obj.label}</div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* Commitment badge */}
                  {commitmentCfg && (
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${commitmentCfg.color}20`,
                        color: commitmentCfg.color,
                      }}
                    >
                      {commitmentCfg.label}
                    </span>
                  )}
                  {/* Select toggle (checkbox) */}
                  <div
                    role="checkbox"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggle(obj.id)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        e.stopPropagation()
                        onToggle(obj.id)
                      }
                    }}
                    className={`size-5 rounded flex items-center justify-center border transition-colors cursor-pointer ${
                      isSelected
                        ? "border-transparent"
                        : "border-white/20 hover:border-white/40"
                    }`}
                    style={{
                      backgroundColor: isSelected ? color : "transparent",
                    }}
                  >
                    {isSelected && (
                      <Check className="size-3 text-zinc-950" strokeWidth={3} />
                    )}
                  </div>
                </div>
              </div>

              {/* Description + stats line */}
              <div className="text-xs text-zinc-400 mt-0.5">{obj.description}</div>

              {/* Role-based stats */}
              {targets.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-zinc-500 flex-wrap">
                  {drivers.length > 0 && (
                    <span style={{ color: "#22c55e" }}>
                      {drivers.length} driver{drivers.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  {drivers.length > 0 && metrics.length > 0 && (
                    <span className="text-zinc-600">&middot;</span>
                  )}
                  {metrics.length > 0 && (
                    <span style={{ color: "#3b82f6" }}>
                      {metrics.length} metric{metrics.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              )}

              {/* Success preview */}
              {obj.successPreview && (
                <div className="text-xs text-zinc-400 italic mt-1.5">
                  {obj.successPreview}
                </div>
              )}

              {/* Value tags */}
              {obj.values.length > 0 && (
                <div className="flex items-center gap-1 mt-2 flex-wrap">
                  {obj.values.map((value) => (
                    <span
                      key={value}
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${color}33`,
                        color,
                      }}
                    >
                      {value}
                    </span>
                  ))}
                </div>
              )}

              {/* Expand chevron */}
              {targets.length > 0 && (
                <div className="flex items-center gap-1 mt-2 text-xs text-zinc-500">
                  {isExpanded ? (
                    <ChevronDown className="size-3.5" />
                  ) : (
                    <ChevronRight className="size-3.5" />
                  )}
                  <span>{isExpanded ? "Hide" : "Show"} composition</span>
                </div>
              )}
            </div>
          </div>
        </button>

        {/* Expandable composition view */}
        {isExpanded && targets.length > 0 && (
          <div className="mx-4 mb-4 bg-white/3 rounded-lg p-3 mt-2 space-y-3">
            {/* Drivers section */}
            {drivers.length > 0 && (
              <div
                className="border-l-2 pl-3"
                style={{ borderColor: "rgba(34,197,94,0.4)" }}
              >
                <div
                  className="text-[10px] font-bold uppercase tracking-wider mb-1.5"
                  style={{ color: "#22c55e" }}
                >
                  Drivers (What you do)
                </div>
                <div className="space-y-0.5">
                  {drivers.map(t => renderTargetRow(t, obj.id))}
                </div>
              </div>
            )}

            {/* Metrics section */}
            {metrics.length > 0 && (
              <div
                className="border-l-2 pl-3"
                style={{ borderColor: "rgba(59,130,246,0.4)" }}
              >
                <div
                  className="text-[10px] font-bold uppercase tracking-wider mb-1.5"
                  style={{ color: "#3b82f6" }}
                >
                  Metrics (What you measure)
                </div>
                <div className="space-y-0.5">
                  {metrics.map(t => renderTargetRow(t, obj.id))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  function renderCustomCard(obj: { id: string; pillarId: string; label: string }, color: string) {
    const isSelected = selectedObjectives.has(obj.id)
    return (
      <div
        key={obj.id}
        className={`relative bg-white/5 border border-white/10 rounded-xl p-4 transition-all duration-200 hover:border-white/20 ${
          isSelected ? "bg-white/8" : ""
        }`}
        style={{
          borderLeftWidth: isSelected ? "3px" : undefined,
          borderLeftColor: isSelected ? color : undefined,
        }}
      >
        <div className="flex items-start gap-3">
          <Plus className="size-5 mt-0.5 shrink-0 text-zinc-500" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium text-white">{obj.label}</div>
              <div
                role="checkbox"
                aria-checked={isSelected}
                tabIndex={0}
                onClick={() => onToggle(obj.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onToggle(obj.id)
                  }
                }}
                className={`size-5 rounded flex items-center justify-center border transition-colors cursor-pointer shrink-0 ${
                  isSelected
                    ? "border-transparent"
                    : "border-white/20 hover:border-white/40"
                }`}
                style={{
                  backgroundColor: isSelected ? color : "transparent",
                }}
              >
                {isSelected && (
                  <Check className="size-3 text-zinc-950" strokeWidth={3} />
                )}
              </div>
            </div>
            <div className="text-xs text-zinc-400 mt-0.5">Custom objective</div>
          </div>
        </div>
      </div>
    )
  }

  function renderPillarSection(
    id: string,
    label: string,
    color: string,
    iconName: string | null,
  ) {
    const builtInObjectives = getObjectivesForPillar(id)
    const customObjs = customObjectives.filter(o => o.pillarId === id)
    const PillarIcon = iconName ? ICON_MAP[iconName] : null

    return (
      <div key={id} className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          {PillarIcon && (
            <PillarIcon className="size-5" style={{ color }} />
          )}
          <span className="text-lg font-semibold" style={{ color }}>
            {label}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {builtInObjectives.map((obj) => renderBuiltInCard(obj, color))}
          {customObjs.map((obj) => renderCustomCard(obj, color))}
        </div>

        {/* Custom objective input */}
        <div className="mt-3 flex items-center gap-2">
          <input
            type="text"
            value={inputValues[id] ?? ""}
            onChange={e => setInputValues(prev => ({ ...prev, [id]: e.target.value }))}
            onKeyDown={e => { if (e.key === "Enter") handleAdd(id) }}
            placeholder="Add custom objective..."
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors"
          />
          <button
            onClick={() => handleAdd(id)}
            disabled={!inputValues[id]?.trim()}
            className="px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-zinc-300 hover:bg-white/15 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-2">
        What do you want to achieve?
      </h2>
      <p className="text-zinc-400 text-center mb-8">
        Pick objectives within each life area
      </p>

      {builtInPillars.map(p => renderPillarSection(p.id, p.label, p.color, p.icon))}
      {activeCustomPillars.map(p => renderPillarSection(p.id, p.label, "#a1a1aa", null))}
    </div>
  )
}
