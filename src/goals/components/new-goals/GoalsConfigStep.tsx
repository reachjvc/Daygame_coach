"use client"

import { useState, useMemo, useCallback, useRef } from "react"
import {
  PILLARS,
  OBJECTIVES,
  TARGETS,
  PRIMITIVE_META,
  getObjectivesForPillar,
  getTargetsForObjective,
  getSharedDriver,
  getTemplatesForPillar,
  getObjectivesForSharedDriver,
} from "@/src/goals/data/newGoalFramework"
import type {
  FrameworkTarget,
  GoalPrimitive,
  SharedDriver,
  Template,
  TargetOverride,
} from "@/src/goals/data/newGoalFramework"
import { generateMilestoneLadder } from "@/src/goals/milestoneService"
import type { MilestoneLadderConfig, MilestonePin } from "@/src/goals/types"
import {
  ChevronDown,
  ChevronRight,
  Check,
  TrendingUp,
  Target as TargetIcon,
  Zap,
  Repeat,
  Milestone,
  Flag,
  SlidersHorizontal,
  Minus,
  Plus,
  Lock,
  RotateCcw,
  Dumbbell,
  Landmark,
  Heart,
  Compass,
  Scaling,
  Wind,
  Shield,
  Sunrise,
  BookOpen,
  Brain,
  Users,
  Trophy,
  type LucideIcon,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Icon maps
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, LucideIcon> = {
  Dumbbell, Landmark, Heart, Compass, Scaling, Wind, TrendingUp, Shield,
  Sunrise, BookOpen, Brain, Users, Trophy, Target: TargetIcon, Zap, Repeat,
  Milestone, Flag, Plus,
}

const PRIMITIVE_ICON_MAP: Record<string, LucideIcon> = {
  TrendingUp, Zap, Target: TargetIcon, Repeat, Milestone, Flag,
}

// ---------------------------------------------------------------------------
// Bucket config
// ---------------------------------------------------------------------------

type BucketKey = "do" | "measure" | "milestones" | "skills"

const BUCKET_META: Record<BucketKey, { label: string; subtitle: string; color: string }> = {
  do:         { label: "WHAT YOU DO",       subtitle: "Habits, routines & drivers",  color: "#22c55e" },
  measure:    { label: "WHAT YOU MEASURE",  subtitle: "Numbers to hit & accumulate", color: "#f59e0b" },
  milestones: { label: "JOURNEY MILESTONES", subtitle: "Stage-based progressions",   color: "#ec4899" },
  skills:     { label: "SKILLS TO BUILD",   subtitle: "Abilities to develop",        color: "#8b5cf6" },
}

function bucketForTarget(t: FrameworkTarget): BucketKey {
  if (t.role === "driver") return "do"
  if (t.primitive === "stage") return "milestones"
  if (t.primitive === "skill") return "skills"
  return "measure"
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GoalsConfigStepProps {
  selectedPillars: Set<string>
  selectedObjectives: Set<string>
  targetOverrides: Record<string, TargetOverride>
  onToggleObjective: (objectiveId: string) => void
  onApplyTemplate: (template: Template, levelIndex: number) => void
  onUnapplyTemplate: (template: Template) => void
  onUpdateTarget: (targetId: string, updates: Partial<TargetOverride>) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getIncrement(value: number): number {
  if (value < 10) return 1
  if (value < 50) return 5
  if (value < 200) return 10
  if (value < 1000) return 50
  return 100
}

function buildEffectiveConfig(
  milestoneConfig: NonNullable<FrameworkTarget["milestoneConfig"]>,
  override?: { value?: number; startValue?: number; steps?: number; curveTension?: number }
) {
  return {
    start: override?.startValue ?? milestoneConfig.start,
    target: override?.value ?? milestoneConfig.target,
    // `|| default`, not `?? default`: a 0 here always means "unset" (the slider
    // floor is 3), so fall back to the authored step count rather than 0 — a
    // 0 would collapse the ladder to a single endpoint.
    steps: override?.steps || milestoneConfig.steps,
    curveTension: override?.curveTension ?? milestoneConfig.curveTension,
  }
}

function isTemplateActive(
  template: Template,
  targetOverrides: Record<string, TargetOverride>,
  pillarTargets: FrameworkTarget[]
): boolean {
  // A template is active when its targetOverrides match the current enabled state
  // for all targets in the pillar
  for (const t of pillarTargets) {
    const templateWants = template.targetOverrides[t.id]
    if (templateWants === undefined) continue
    const currentEnabled = targetOverrides[t.id]?.enabled ?? t.defaultEnabled
    if (currentEnabled !== templateWants) return false
  }
  // Also check that targets NOT in the template overrides haven't been changed
  // from defaults (only if the template defines overrides for this pillar)
  const hasOverrides = Object.keys(template.targetOverrides).length > 0
  if (!hasOverrides) return false
  return true
}

/** Detect which level index is active for a template, or -1 if none match */
function detectActiveLevel(
  template: Template,
  targetOverrides: Record<string, TargetOverride>
): number {
  for (let i = 0; i < template.levels.length; i++) {
    const level = template.levels[i]
    let matches = true
    for (const [targetId, val] of Object.entries(level.targetValues)) {
      const current = targetOverrides[targetId]?.value
      if (current !== undefined && current !== val) {
        matches = false
        break
      }
    }
    if (matches) return i
  }
  return 0 // default to beginner
}

/** Collect all targets for a pillar, deduplicate shared drivers */
function getDeduplicatedTargetsForPillar(pillarId: string): FrameworkTarget[] {
  const objectives = getObjectivesForPillar(pillarId)
  const seenSharedDriverIds = new Set<string>()
  const result: FrameworkTarget[] = []

  for (const obj of objectives) {
    const targets = getTargetsForObjective(obj.id)
    for (const t of targets) {
      if (t.sharedDriverId) {
        if (seenSharedDriverIds.has(t.sharedDriverId)) continue
        seenSharedDriverIds.add(t.sharedDriverId)
      }
      result.push(t)
    }
  }
  return result
}

// ---------------------------------------------------------------------------
// PrimitiveBadge
// ---------------------------------------------------------------------------

function PrimitiveBadge({
  primitive,
  role,
}: {
  primitive: GoalPrimitive
  role: "driver" | "metric"
}) {
  const meta = PRIMITIVE_META[primitive]
  const Icon = PRIMITIVE_ICON_MAP[meta.iconName]
  return (
    <span className="flex items-center gap-1.5 shrink-0">
      <span
        className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
        style={{ backgroundColor: meta.color + "33", color: meta.color }}
      >
        {Icon && <Icon className="size-3" />}
        {meta.label}
      </span>
      <span className="text-[10px] text-zinc-500">{role}</span>
    </span>
  )
}

// ---------------------------------------------------------------------------
// RampDisplay
// ---------------------------------------------------------------------------

function RampDisplay({
  rampSteps,
  isExpanded,
  onToggle,
  enabled,
}: {
  rampSteps: { frequencyPerWeek: number; durationWeeks: number }[]
  isExpanded?: boolean
  onToggle?: () => void
  enabled?: boolean
}) {
  const totalWeeks = rampSteps.reduce((sum, r) => sum + r.durationWeeks, 0)
  return (
    <span className="flex items-center gap-1.5 shrink-0">
      <span className="text-xs text-zinc-400">
        {rampSteps.map((r) => `${r.frequencyPerWeek}/wk`).join(" → ")}
        <span className="text-zinc-600 ml-1">({totalWeeks}wk)</span>
      </span>
      {enabled && onToggle && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggle() }}
          className={`size-6 rounded flex items-center justify-center transition-colors ${
            isExpanded ? "bg-white/20" : "bg-white/5 hover:bg-white/10"
          }`}
        >
          <SlidersHorizontal className="size-3 text-zinc-400" />
        </button>
      )}
    </span>
  )
}

// ---------------------------------------------------------------------------
// InlineRampEditor
// ---------------------------------------------------------------------------

function InlineRampEditor({
  targetId,
  effectiveRamp,
  onStepChange,
  onAddStep,
  onRemoveStep,
  onFlatten,
}: {
  targetId: string
  effectiveRamp: { frequencyPerWeek: number; durationWeeks: number }[]
  onStepChange: (targetId: string, idx: number, field: "frequencyPerWeek" | "durationWeeks", value: number) => void
  onAddStep: (targetId: string) => void
  onRemoveStep: (targetId: string, idx: number) => void
  onFlatten: (targetId: string, freq: number) => void
}) {
  const totalWeeks = effectiveRamp.reduce((s, r) => s + r.durationWeeks, 0)
  const totalVolume = effectiveRamp.reduce((s, r) => s + r.frequencyPerWeek * r.durationWeeks, 0)
  const maxFreq = Math.max(...effectiveRamp.map((s) => s.frequencyPerWeek))

  return (
    <div className="bg-white/3 rounded-lg p-3 mt-2 ml-8 border border-white/5 space-y-3">
      {/* Ramp steps */}
      {effectiveRamp.map((step, idx) => (
        <div key={idx} className="flex items-center gap-2 text-xs">
          <span className="text-zinc-500 w-4">{idx + 1}.</span>
          <input
            type="number"
            value={step.frequencyPerWeek}
            min={1}
            onChange={(e) => onStepChange(targetId, idx, "frequencyPerWeek", parseInt(e.target.value) || 1)}
            className="w-14 bg-white/5 border border-white/10 rounded px-2 py-1 text-center text-white"
          />
          <span className="text-zinc-500">/wk for</span>
          <input
            type="number"
            value={step.durationWeeks}
            min={1}
            onChange={(e) => onStepChange(targetId, idx, "durationWeeks", parseInt(e.target.value) || 1)}
            className="w-14 bg-white/5 border border-white/10 rounded px-2 py-1 text-center text-white"
          />
          <span className="text-zinc-500">wks</span>
          {effectiveRamp.length > 1 && (
            <button
              onClick={() => onRemoveStep(targetId, idx)}
              className="text-zinc-600 hover:text-red-400 transition-colors"
            >
              <Minus className="size-3" />
            </button>
          )}
        </div>
      ))}

      {/* Add step */}
      <button
        onClick={() => onAddStep(targetId)}
        className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition-colors"
      >
        <Plus className="size-3" /> Add step
      </button>

      {/* Flatten toggle */}
      <div className="flex items-center gap-2 text-xs">
        <button
          onClick={() => onFlatten(targetId, effectiveRamp[0]?.frequencyPerWeek ?? 3)}
          className="text-zinc-500 hover:text-white transition-colors"
        >
          Keep flat (no scaling)
        </button>
      </div>

      {/* Summary */}
      <div className="text-[10px] text-zinc-500">
        {totalWeeks} weeks total · {totalVolume.toLocaleString()} total volume
      </div>

      {/* Visual ramp bar */}
      <div className="flex h-5 rounded overflow-hidden border border-white/10">
        {effectiveRamp.map((step, idx) => {
          const widthPct = totalWeeks > 0 ? (step.durationWeeks / totalWeeks) * 100 : 0
          const heightPct = maxFreq > 0 ? (step.frequencyPerWeek / maxFreq) * 100 : 0
          return (
            <div key={idx} className="relative flex items-end" style={{ width: `${widthPct}%` }}>
              <div
                className="w-full transition-all"
                style={{
                  height: `${heightPct}%`,
                  backgroundColor: PRIMITIVE_META.habit.color,
                  opacity: 0.2 + (idx / effectiveRamp.length) * 0.6,
                }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-[9px] text-white/60">
                {step.frequencyPerWeek}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// StageChain
// ---------------------------------------------------------------------------

function StageChain({ steps }: { steps: string[] }) {
  return (
    <div className="flex items-center gap-1 flex-wrap shrink-0">
      {steps.map((step, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="text-xs text-zinc-400">{step}</span>
          {i < steps.length - 1 && (
            <span className="text-xs text-zinc-600">{"→"}</span>
          )}
        </span>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// EndpointStepper
// ---------------------------------------------------------------------------

function EndpointStepper({
  targetId,
  config,
  unit,
  isEditing,
  setEditingValue,
  isConfigExpanded,
  toggleConfig,
  onUpdate,
}: {
  targetId: string
  config: { start: number; target: number; steps: number; curveTension: number }
  unit: string
  isEditing: boolean
  setEditingValue: (id: string | null) => void
  isConfigExpanded: boolean
  toggleConfig: (id: string) => void
  onUpdate: GoalsConfigStepProps["onUpdateTarget"]
}) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        onClick={() => {
          const inc = getIncrement(config.target)
          const newVal = Math.max(config.start + 1, config.target - inc)
          onUpdate(targetId, { value: newVal })
        }}
        className="size-6 rounded bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
      >
        <Minus className="size-3 text-zinc-400" />
      </button>

      {isEditing ? (
        <input
          type="number"
          autoFocus
          defaultValue={config.target}
          className="w-16 text-center text-sm bg-white/10 border border-white/20 rounded px-1 py-0.5 text-white"
          onBlur={(e) => {
            const parsed = parseInt(e.target.value, 10)
            if (!isNaN(parsed) && parsed > config.start) {
              onUpdate(targetId, { value: parsed })
            }
            setEditingValue(null)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              ;(e.target as HTMLInputElement).blur()
            }
          }}
        />
      ) : (
        <button
          onClick={() => setEditingValue(targetId)}
          className="text-sm text-white font-mono min-w-[4rem] text-center hover:bg-white/10 rounded px-1 py-0.5 transition-colors"
        >
          {config.target} {unit}
        </button>
      )}

      <button
        onClick={() => {
          const inc = getIncrement(config.target)
          onUpdate(targetId, { value: config.target + inc })
        }}
        className="size-6 rounded bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
      >
        <Plus className="size-3 text-zinc-400" />
      </button>

      <button
        onClick={() => toggleConfig(targetId)}
        className={`size-6 rounded flex items-center justify-center transition-colors ${
          isConfigExpanded ? "bg-white/20" : "bg-white/5 hover:bg-white/10"
        }`}
      >
        <SlidersHorizontal className="size-3 text-zinc-400" />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ConfigPanel
// ---------------------------------------------------------------------------

function ConfigPanel({
  targetId,
  config,
  onUpdate,
}: {
  targetId: string
  config: { start: number; target: number; steps: number; curveTension: number }
  onUpdate: GoalsConfigStepProps["onUpdateTarget"]
}) {
  return (
    <div className="bg-white/3 rounded-lg p-3 mt-2 ml-8 border border-white/5 space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-zinc-400">Milestones</span>
          <span className="text-xs text-white font-mono">{config.steps}</span>
        </div>
        <input
          type="range" min={3} max={15} value={config.steps}
          onChange={(e) => onUpdate(targetId, { steps: parseInt(e.target.value, 10) })}
          className="w-full accent-zinc-400 h-1"
        />
      </div>

      <div>
        <span className="text-xs text-zinc-400 block mb-1.5">Curve shape</span>
        <div className="flex gap-2">
          {[
            { label: "Quick wins", tension: 1.2 },
            { label: "Balanced", tension: 0 },
            { label: "Ambitious", tension: -1.5 },
          ].map((preset) => {
            const isActive = Math.abs(config.curveTension - preset.tension) < 0.05
            return (
              <button
                key={preset.label}
                onClick={() => onUpdate(targetId, { curveTension: preset.tension })}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all duration-200 ${
                  isActive
                    ? "border-white/30 bg-white/10 text-white"
                    : "border-white/10 text-zinc-500 hover:border-white/20"
                }`}
              >
                {preset.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-zinc-400">Fine-tune tension</span>
          <span className="text-xs text-white font-mono">
            {config.curveTension.toFixed(1)}
          </span>
        </div>
        <input
          type="range" min={-2} max={2} step={0.1} value={config.curveTension}
          onChange={(e) => onUpdate(targetId, { curveTension: parseFloat(e.target.value) })}
          className="w-full accent-zinc-400 h-1"
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// MilestoneDots
// ---------------------------------------------------------------------------

function fmtDate(iso: string): string {
  // iso is "YYYY-MM-DD"; render compact "DD MMM" without constructing a Date
  const [, m, d] = iso.split("-")
  const months = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  if (!m || !d) return iso
  return `${parseInt(d, 10)} ${months[parseInt(m, 10)] ?? ""}`.trim()
}

/**
 * Inline editor for one milestone: pin its value (nice +/- steppers or direct
 * entry) and/or give it its own checkpoint date. "Reset to auto" unpins it so
 * the curve flows it again.
 */
function MilestoneEditor({
  value,
  unit,
  color,
  isStart,
  isPinned,
  date,
  onCommitValue,
  onCommitDate,
  onReset,
}: {
  value: number
  unit: string
  color: string
  isStart: boolean
  isPinned: boolean
  date?: string
  onCommitValue: (value: number) => void
  onCommitDate: (date: string) => void
  onReset: () => void
}) {
  const inc = getIncrement(value)
  return (
    <div className="bg-white/3 rounded-lg p-3 mt-2 border border-white/5 flex flex-wrap items-center gap-3 text-xs">
      <span className="text-zinc-500">{isStart ? "Starting point (now):" : "Milestone:"}</span>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onCommitValue(Math.max(1, value - inc))}
          className="size-6 rounded bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <Minus className="size-3 text-zinc-400" />
        </button>
        <input
          type="number"
          defaultValue={value}
          key={value}
          className="w-16 text-center text-sm bg-white/10 border border-white/20 rounded px-1 py-0.5 text-white"
          onBlur={(e) => {
            const parsed = parseInt(e.target.value, 10)
            if (!isNaN(parsed)) onCommitValue(parsed)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur()
          }}
        />
        <span className="text-zinc-500">{unit}</span>
        <button
          onClick={() => onCommitValue(value + inc)}
          className="size-6 rounded bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <Plus className="size-3 text-zinc-400" />
        </button>
      </div>

      {!isStart && (
        <>
          <span className="text-zinc-600">·</span>
          <label className="flex items-center gap-1.5 text-zinc-500">
            by
            <input
              type="date"
              value={date ?? ""}
              onChange={(e) => onCommitDate(e.target.value)}
              className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-white/20"
            />
          </label>
        </>
      )}

      {(isPinned || date) && (
        <button
          onClick={onReset}
          className="ml-auto flex items-center gap-1 text-zinc-500 hover:text-white transition-colors"
        >
          <RotateCcw className="size-3" /> Reset to auto
        </button>
      )}
      {isPinned && !isStart && (
        <span className="flex items-center gap-1" style={{ color }}>
          <Lock className="size-3" /> pinned
        </span>
      )}
    </div>
  )
}

function MilestoneDots({
  milestones,
  color,
  unit,
  pinnedSteps,
  stepDates,
  onCommitValue,
  onCommitDate,
  onResetMilestone,
}: {
  milestones: { step: number; value: number }[]
  color: string
  unit: string
  /** Steps the user has manually set (start value or interior pin). */
  pinnedSteps: Set<number>
  /** Per-step checkpoint dates (interior milestoneEdits + the final targetDate). */
  stepDates: Record<number, string>
  onCommitValue: (step: number, value: number) => void
  onCommitDate: (step: number, date: string) => void
  onResetMilestone: (step: number) => void
}) {
  const [selected, setSelected] = useState<number | null>(null)
  if (milestones.length === 0) return null
  const lastStep = milestones[milestones.length - 1].step
  const selectedMs = selected != null ? milestones.find((m) => m.step === selected) : undefined

  return (
    <div className="mt-2 ml-8">
      <div className="flex items-center gap-1.5 flex-wrap">
        {milestones.map((m, i) => {
          // The final target is edited via the row's prominent stepper + date
          // field; every other milestone (including the start = current level)
          // is editable here.
          const editable = m.step !== lastStep
          const pinned = pinnedSteps.has(m.step)
          const date = stepDates[m.step]
          const isOpen = selected === m.step
          return (
            <div key={m.step} className="flex items-center gap-1">
              <button
                disabled={!editable}
                onClick={() => editable && setSelected(isOpen ? null : m.step)}
                className={`flex items-center gap-1 rounded px-1 py-0.5 transition-colors ${
                  editable ? "hover:bg-white/10 cursor-pointer" : "cursor-default"
                } ${isOpen ? "bg-white/10" : ""}`}
                title={editable ? (m.step === 0 ? "Click to edit your starting value" : "Click to edit this milestone") : undefined}
              >
                <div
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: pinned ? color : "transparent", border: `1px solid ${color}` }}
                />
                <span className={`text-[10px] ${pinned ? "text-white font-medium" : "text-zinc-500"}`}>
                  {m.value}
                </span>
                {pinned && m.step !== 0 && <Lock className="size-2.5" style={{ color }} />}
                {date && <span className="text-[9px] text-zinc-600">{fmtDate(date)}</span>}
              </button>
              {i < milestones.length - 1 && <span className="text-[10px] text-zinc-600">{"→"}</span>}
            </div>
          )
        })}
      </div>

      {selectedMs && (
        <MilestoneEditor
          value={selectedMs.value}
          unit={unit}
          color={color}
          isStart={selectedMs.step === 0}
          isPinned={pinnedSteps.has(selectedMs.step)}
          date={stepDates[selectedMs.step]}
          onCommitValue={(v) => onCommitValue(selectedMs.step, v)}
          onCommitDate={(d) => onCommitDate(selectedMs.step, d)}
          onReset={() => {
            onResetMilestone(selectedMs.step)
            setSelected(null)
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// TargetRow
// ---------------------------------------------------------------------------

function TargetRow({
  target,
  enabled,
  override,
  isEditing,
  isConfigExpanded,
  isRampExpanded,
  setEditingValue,
  toggleConfig,
  toggleRamp,
  onUpdate,
  isLast,
  sharedDriver,
  isShared,
  effectiveRamp,
  onRampStepChange,
  onRampAddStep,
  onRampRemoveStep,
  onRampFlatten,
}: {
  target: FrameworkTarget
  enabled: boolean
  override?: TargetOverride
  isEditing: boolean
  isConfigExpanded: boolean
  isRampExpanded: boolean
  setEditingValue: (id: string | null) => void
  toggleConfig: (id: string) => void
  toggleRamp: (id: string) => void
  onUpdate: GoalsConfigStepProps["onUpdateTarget"]
  isLast: boolean
  sharedDriver?: SharedDriver | null
  isShared?: boolean
  effectiveRamp: { frequencyPerWeek: number; durationWeeks: number }[] | null
  onRampStepChange: (targetId: string, idx: number, field: "frequencyPerWeek" | "durationWeeks", value: number) => void
  onRampAddStep: (targetId: string) => void
  onRampRemoveStep: (targetId: string, idx: number) => void
  onRampFlatten: (targetId: string, freq: number) => void
}) {
  const primitive = target.primitive
  const role = target.role
  const meta = PRIMITIVE_META[primitive]

  const rawMilestoneConfig = sharedDriver?.milestoneConfig ?? target.milestoneConfig
  const rampSteps = sharedDriver?.rampSteps ?? target.rampSteps
  const stageSteps = target.stageSteps

  const hasMilestoneConfig =
    (primitive === "volume" || primitive === "target") && rawMilestoneConfig !== null
  const hasRamp =
    (primitive === "habit" || (primitive === "volume" && role === "driver")) &&
    rampSteps !== null && rampSteps.length > 0
  const hasStages =
    (primitive === "skill" || primitive === "stage") &&
    stageSteps !== null && stageSteps.length > 0

  const config =
    hasMilestoneConfig && rawMilestoneConfig
      ? buildEffectiveConfig(rawMilestoneConfig, override)
      : null

  const milestoneEdits = override?.milestoneEdits
  const editsKey = milestoneEdits ? JSON.stringify(milestoneEdits) : ""

  const pins: MilestonePin[] = useMemo(() => {
    if (!milestoneEdits) return []
    return Object.entries(milestoneEdits)
      .filter(([, e]) => e.value != null)
      .map(([step, e]) => ({ step: Number(step), value: e.value! }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editsKey])

  const milestones = useMemo(() => {
    if (!config || !enabled) return null
    return generateMilestoneLadder({ ...(config as MilestoneLadderConfig), pins })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.start, config?.target, config?.steps, config?.curveTension, enabled, pins])

  // Authored direction (ascending = a goal you raise; descending = reduce).
  const ascending = rawMilestoneConfig ? rawMilestoneConfig.target >= rawMilestoneConfig.start : true
  const lastStep = config ? config.steps - 1 : -1
  const effectiveTarget = config?.target ?? 0

  // Which steps the user has manually set, and any per-step checkpoint dates.
  const pinnedSteps = new Set<number>()
  if (override?.startValue != null) pinnedSteps.add(0)
  if (milestoneEdits) {
    for (const [s, e] of Object.entries(milestoneEdits)) if (e.value != null) pinnedSteps.add(Number(s))
  }
  const stepDates: Record<number, string> = {}
  if (milestoneEdits) {
    for (const [s, e] of Object.entries(milestoneEdits)) if (e.date) stepDates[Number(s)] = e.date
  }
  if (override?.targetDate && lastStep >= 0) stepDates[lastStep] = override.targetDate

  // --- Per-milestone edit handlers (start value, value pins, checkpoint dates) ---
  const commitMilestoneValue = useCallback((step: number, value: number) => {
    if (step === 0) {
      // Editing the start (= current level). Clamp to the correct side of the
      // target so the ladder direction never flips.
      let v = Math.max(1, value)
      if (ascending) v = Math.min(v, effectiveTarget - 1)
      else v = Math.max(v, effectiveTarget + 1)
      onUpdate(target.id, { startValue: v })
      return
    }
    const next = { ...(milestoneEdits ?? {}) }
    next[step] = { ...next[step], value }
    onUpdate(target.id, { milestoneEdits: next })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ascending, effectiveTarget, editsKey, target.id, onUpdate])

  const commitMilestoneDate = useCallback((step: number, date: string) => {
    if (step === 0) return // the start is "now" — no checkpoint date
    const next = { ...(milestoneEdits ?? {}) }
    next[step] = { ...next[step], date: date || undefined }
    onUpdate(target.id, { milestoneEdits: next })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editsKey, target.id, onUpdate])

  const resetMilestone = useCallback((step: number) => {
    if (step === 0) {
      onUpdate(target.id, { startValue: undefined })
      return
    }
    const next = { ...(milestoneEdits ?? {}) }
    delete next[step]
    onUpdate(target.id, { milestoneEdits: next })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.id, onUpdate, editsKey])

  return (
    <div className={`px-4 py-3 ${!isLast ? "border-b border-white/5" : ""}`}>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onUpdate(target.id, { enabled: !enabled })}
          className="size-5 rounded border flex items-center justify-center shrink-0 transition-all duration-200"
          style={{
            borderColor: enabled ? meta.color : "rgba(255,255,255,0.2)",
            backgroundColor: enabled ? meta.color : "transparent",
          }}
        >
          {enabled && <Check className="size-3 text-zinc-950" strokeWidth={3} />}
        </button>

        <span className={`text-sm font-medium flex-1 ${enabled ? "text-white" : "text-zinc-500"}`}>
          {target.label}
        </span>

        <PrimitiveBadge primitive={primitive} role={role} />

        {isShared && target.sharedDriverId && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 shrink-0">
            {getObjectivesForSharedDriver(target.sharedDriverId).map(o => o.label).join(", ")}
          </span>
        )}

        {hasRamp && effectiveRamp && (
          <RampDisplay
            rampSteps={effectiveRamp}
            isExpanded={isRampExpanded}
            onToggle={() => toggleRamp(target.id)}
            enabled={enabled}
          />
        )}
        {hasStages && <StageChain steps={stageSteps!} />}

        {hasMilestoneConfig && config && enabled && (
          <EndpointStepper
            targetId={target.id}
            config={config}
            unit={target.unit}
            isEditing={isEditing}
            setEditingValue={setEditingValue}
            isConfigExpanded={isConfigExpanded}
            toggleConfig={toggleConfig}
            onUpdate={onUpdate}
          />
        )}

        {hasMilestoneConfig && enabled && (
          <input
            type="date"
            value={override?.targetDate ?? ""}
            onChange={(e) => onUpdate(target.id, { targetDate: e.target.value })}
            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-zinc-400 focus:outline-none focus:border-white/20"
          />
        )}
      </div>

      {milestones && milestones.length > 0 && (
        <MilestoneDots
          milestones={milestones}
          color={meta.color}
          unit={target.unit}
          pinnedSteps={pinnedSteps}
          stepDates={stepDates}
          onCommitValue={commitMilestoneValue}
          onCommitDate={commitMilestoneDate}
          onResetMilestone={resetMilestone}
        />
      )}

      {isConfigExpanded && hasMilestoneConfig && config && enabled && (
        <ConfigPanel targetId={target.id} config={config} onUpdate={onUpdate} />
      )}

      {isRampExpanded && hasRamp && effectiveRamp && enabled && (
        <InlineRampEditor
          targetId={target.id}
          effectiveRamp={effectiveRamp}
          onStepChange={onRampStepChange}
          onAddStep={onRampAddStep}
          onRemoveStep={onRampRemoveStep}
          onFlatten={onRampFlatten}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// TemplateSection — click-to-toggle template pills + inline level picker
// ---------------------------------------------------------------------------

function TemplateSection({
  pillar,
  pillarTargets,
  targetOverrides,
  onApplyTemplate,
  onUnapplyTemplate,
}: {
  pillar: { id: string; label: string; color: string; glowColor: string; icon: string }
  pillarTargets: FrameworkTarget[]
  targetOverrides: GoalsConfigStepProps["targetOverrides"]
  onApplyTemplate: (template: Template, levelIndex: number) => void
  onUnapplyTemplate: (template: Template) => void
}) {
  const templates = getTemplatesForPillar(pillar.id)
  if (templates.length === 0) return null

  // Find the active template (if any) for this pillar
  const activeTemplate = templates.find(tmpl =>
    isTemplateActive(tmpl, targetOverrides, pillarTargets)
  )
  const activeLevelIndex = activeTemplate
    ? detectActiveLevel(activeTemplate, targetOverrides)
    : -1

  const LEVEL_LABELS = ["Beginner", "Intermediate", "Advanced"]

  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 flex-wrap">
        {templates.map((tmpl) => {
          const Icon = ICON_MAP[tmpl.icon]
          const active = activeTemplate?.id === tmpl.id

          // Build pill label with level when active
          const levelLabel = active && tmpl.levels[activeLevelIndex]
            ? ` (${tmpl.levels[activeLevelIndex].label})`
            : ""

          return (
            <button
              key={tmpl.id}
              onClick={() => {
                if (active) {
                  onUnapplyTemplate(tmpl)
                } else {
                  onApplyTemplate(tmpl, 0)
                }
              }}
              title={tmpl.description}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs border transition-all duration-200 ${
                active
                  ? "text-white"
                  : "bg-white/5 border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-300"
              }`}
              style={
                active
                  ? {
                      borderColor: pillar.color,
                      backgroundColor: `${pillar.color}20`,
                      boxShadow: `0 0 12px ${pillar.glowColor}`,
                    }
                  : undefined
              }
            >
              {Icon && (
                <Icon
                  className="size-3.5"
                  style={active ? { color: pillar.color } : undefined}
                />
              )}
              {tmpl.label}{levelLabel}
            </button>
          )
        })}
      </div>

      {/* Level picker — shown below pills when a template is active */}
      {activeTemplate && activeTemplate.levels.length > 0 && (
        <div className="flex items-center gap-2 mt-2 ml-1">
          <span className="text-[10px] text-zinc-500 mr-1">Level:</span>
          {activeTemplate.levels.map((level, i) => {
            const isActive = i === activeLevelIndex
            return (
              <button
                key={level.label}
                onClick={() => onApplyTemplate(activeTemplate, i)}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all ${
                  isActive
                    ? "bg-white/10 border-white/30 text-white"
                    : "bg-white/5 border-white/10 text-zinc-400 hover:border-white/20"
                }`}
              >
                {level.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// BucketSection — collapsible section for one bucket type
// ---------------------------------------------------------------------------

function BucketSection({
  bucketKey,
  targets,
  isExpanded,
  onToggle,
  targetOverrides,
  onUpdateTarget,
  expandedConfigs,
  toggleConfig,
  expandedRamps,
  toggleRamp,
  editingValue,
  setEditingValue,
  getEffectiveRamp,
  onRampStepChange,
  onRampAddStep,
  onRampRemoveStep,
  onRampFlatten,
}: {
  bucketKey: BucketKey
  targets: FrameworkTarget[]
  isExpanded: boolean
  onToggle: () => void
  targetOverrides: GoalsConfigStepProps["targetOverrides"]
  onUpdateTarget: GoalsConfigStepProps["onUpdateTarget"]
  expandedConfigs: Set<string>
  toggleConfig: (id: string) => void
  expandedRamps: Set<string>
  toggleRamp: (id: string) => void
  editingValue: string | null
  setEditingValue: (id: string | null) => void
  getEffectiveRamp: (targetId: string) => { frequencyPerWeek: number; durationWeeks: number }[] | null
  onRampStepChange: (targetId: string, idx: number, field: "frequencyPerWeek" | "durationWeeks", value: number) => void
  onRampAddStep: (targetId: string) => void
  onRampRemoveStep: (targetId: string, idx: number) => void
  onRampFlatten: (targetId: string, freq: number) => void
}) {
  const meta = BUCKET_META[bucketKey]
  const enabledCount = targets.filter((t) => {
    const override = targetOverrides[t.id]
    return override?.enabled ?? t.defaultEnabled
  }).length

  const allEnabled = enabledCount === targets.length

  if (targets.length === 0) return null

  const handleSelectAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    const newEnabled = !allEnabled
    for (const t of targets) {
      onUpdateTarget(t.id, { enabled: newEnabled })
    }
  }

  return (
    <div className="mb-3">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 transition-colors"
        style={{ borderLeftWidth: "3px", borderLeftColor: meta.color }}
      >
        {isExpanded ? (
          <ChevronDown className="size-4 text-zinc-400 shrink-0" />
        ) : (
          <ChevronRight className="size-4 text-zinc-400 shrink-0" />
        )}
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: meta.color }}>
          {meta.label}
        </span>
        <span className="text-[10px] text-zinc-500">{meta.subtitle}</span>
        <span className="ml-auto flex items-center gap-2 shrink-0">
          <span className="text-xs text-zinc-400">
            {enabledCount}/{targets.length}
          </span>
          <span
            role="checkbox"
            aria-checked={allEnabled}
            onClick={handleSelectAll}
            className={`size-4 rounded border flex items-center justify-center transition-all duration-200 hover:border-white/40 ${
              allEnabled
                ? "border-white/40 bg-white/15"
                : enabledCount > 0
                ? "border-white/25 bg-white/5"
                : "border-white/15"
            }`}
          >
            {allEnabled && <Check className="size-2.5 text-white" strokeWidth={3} />}
            {!allEnabled && enabledCount > 0 && <Minus className="size-2.5 text-zinc-400" strokeWidth={3} />}
          </span>
        </span>
      </button>

      {isExpanded && (
        <div className="bg-white/3 border border-t-0 border-white/10 rounded-b-xl overflow-hidden -mt-1">
          {targets.map((target, idx) => {
            const override = targetOverrides[target.id]
            const enabled = override?.enabled ?? target.defaultEnabled
            const sd = target.sharedDriverId
              ? getSharedDriver(target.sharedDriverId)
              : null

            return (
              <TargetRow
                key={target.id}
                target={target}
                enabled={enabled}
                override={override}
                isEditing={editingValue === target.id}
                isConfigExpanded={expandedConfigs.has(target.id)}
                isRampExpanded={expandedRamps.has(target.id)}
                setEditingValue={setEditingValue}
                toggleConfig={toggleConfig}
                toggleRamp={toggleRamp}
                onUpdate={onUpdateTarget}
                isLast={idx === targets.length - 1}
                sharedDriver={sd}
                isShared={!!target.sharedDriverId}
                effectiveRamp={getEffectiveRamp(target.id)}
                onRampStepChange={onRampStepChange}
                onRampAddStep={onRampAddStep}
                onRampRemoveStep={onRampRemoveStep}
                onRampFlatten={onRampFlatten}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function GoalsConfigStep({
  selectedPillars,
  selectedObjectives,
  targetOverrides,
  onToggleObjective,
  onApplyTemplate,
  onUnapplyTemplate,
  onUpdateTarget,
}: GoalsConfigStepProps) {
  const activePillars = PILLARS.filter((p) => selectedPillars.has(p.id))

  const [expandedBuckets, setExpandedBuckets] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    const bucketKeys: BucketKey[] = ["do", "measure", "milestones", "skills"]
    for (const p of activePillars) {
      for (const bk of bucketKeys) {
        initial.add(`${p.id}-${bk}`)
      }
    }
    return initial
  })
  const [expandedConfigs, setExpandedConfigs] = useState<Set<string>>(new Set())
  const [expandedRamps, setExpandedRamps] = useState<Set<string>>(new Set())
  const [editingValue, setEditingValue] = useState<string | null>(null)

  const toggleBucket = useCallback((key: string) => {
    setExpandedBuckets((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const toggleConfig = useCallback((targetId: string) => {
    setExpandedConfigs((prev) => {
      const next = new Set(prev)
      if (next.has(targetId)) next.delete(targetId)
      else next.add(targetId)
      return next
    })
  }, [])

  const toggleRamp = useCallback((targetId: string) => {
    setExpandedRamps((prev) => {
      const next = new Set(prev)
      if (next.has(targetId)) next.delete(targetId)
      else next.add(targetId)
      return next
    })
  }, [])

  // --- Ramp helpers & handlers ---

  const getEffectiveRampForTarget = useCallback((targetId: string): { frequencyPerWeek: number; durationWeeks: number }[] | null => {
    const override = targetOverrides[targetId]?.rampSteps
    if (override) return override
    const target = TARGETS.find((t) => t.id === targetId)
    if (!target) return null
    if (target.sharedDriverId) {
      const sd = getSharedDriver(target.sharedDriverId)
      if (sd?.rampSteps) return sd.rampSteps
    }
    return target.rampSteps ?? null
  }, [targetOverrides])

  const getBaseRamp = useCallback((targetId: string): { frequencyPerWeek: number; durationWeeks: number }[] => {
    const effective = getEffectiveRampForTarget(targetId)
    return effective ?? [{ frequencyPerWeek: 3, durationWeeks: 52 }]
  }, [getEffectiveRampForTarget])

  const handleRampStepChange = useCallback((targetId: string, idx: number, field: "frequencyPerWeek" | "durationWeeks", value: number) => {
    const current = getBaseRamp(targetId)
    const updated = [...current]
    updated[idx] = { ...updated[idx], [field]: Math.max(1, value) }
    onUpdateTarget(targetId, { rampSteps: updated })
  }, [getBaseRamp, onUpdateTarget])

  const handleRampAddStep = useCallback((targetId: string) => {
    const current = getBaseRamp(targetId)
    const lastFreq = current[current.length - 1]?.frequencyPerWeek ?? 3
    onUpdateTarget(targetId, { rampSteps: [...current, { frequencyPerWeek: lastFreq + 2, durationWeeks: 4 }] })
  }, [getBaseRamp, onUpdateTarget])

  const handleRampRemoveStep = useCallback((targetId: string, idx: number) => {
    const current = getBaseRamp(targetId)
    if (current.length <= 1) return
    const updated = [...current]
    updated.splice(idx, 1)
    onUpdateTarget(targetId, { rampSteps: updated })
  }, [getBaseRamp, onUpdateTarget])

  const handleRampFlatten = useCallback((targetId: string, freq: number) => {
    onUpdateTarget(targetId, { rampSteps: [{ frequencyPerWeek: freq, durationWeeks: 52 }] })
  }, [onUpdateTarget])

  // Auto-expand buckets that have selected items
  const autoExpandBuckets = useCallback(() => {
    setExpandedBuckets(prev => {
      const next = new Set(prev)
      for (const p of activePillars) {
        const allTargets = getDeduplicatedTargetsForPillar(p.id)
        const bucketKeys: BucketKey[] = ["do", "measure", "milestones", "skills"]
        for (const bk of bucketKeys) {
          const key = `${p.id}-${bk}`
          const bucketTargets = allTargets.filter(t => bucketForTarget(t) === bk)
          const hasSelected = bucketTargets.some(t => {
            const override = targetOverrides[t.id]
            return override ? override.enabled : t.defaultEnabled
          })
          if (hasSelected) next.add(key)
        }
      }
      return next
    })
  }, [activePillars, targetOverrides])

  // Run auto-expand when targetOverrides change (e.g., template applied)
  const prevOverridesRef = useRef(targetOverrides)
  if (prevOverridesRef.current !== targetOverrides) {
    prevOverridesRef.current = targetOverrides
    autoExpandBuckets()
  }

  // Build per-pillar deduplicated targets + bucket groupings
  const pillarData = useMemo(() => {
    return activePillars.map((pillar) => {
      const allTargets = getDeduplicatedTargetsForPillar(pillar.id)

      const buckets: Record<BucketKey, FrameworkTarget[]> = {
        do: [], measure: [], milestones: [], skills: [],
      }
      for (const t of allTargets) {
        buckets[bucketForTarget(t)].push(t)
      }

      return { pillar, allTargets, buckets }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPillars])

  const [centralDate, setCentralDate] = useState("")

  const applyDateToAll = useCallback((date: string) => {
    for (const { allTargets } of pillarData) {
      for (const t of allTargets) {
        const isEnabled = targetOverrides[t.id]?.enabled ?? t.defaultEnabled
        if (isEnabled && t.milestoneConfig) {
          onUpdateTarget(t.id, { targetDate: date })
        }
      }
    }
  }, [pillarData, targetOverrides, onUpdateTarget])

  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-2">
        Build your goal plan
      </h2>
      <p className="text-zinc-400 text-center mb-8">
        Pick a template or choose individual goals
      </p>

      {/* Central target date */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <span className="text-sm text-zinc-400">Achieve by:</span>
        <input
          type="date"
          value={centralDate}
          onChange={e => {
            setCentralDate(e.target.value)
            applyDateToAll(e.target.value)
          }}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20 transition-colors"
        />
        {centralDate && (
          <button
            onClick={() => { setCentralDate(""); applyDateToAll("") }}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {pillarData.map(({ pillar, allTargets, buckets }) => {
        const PillarIcon = ICON_MAP[pillar.icon]
        const bucketKeys: BucketKey[] = ["do", "measure", "milestones", "skills"]

        return (
          <div key={pillar.id} className="mb-10">
            {/* Pillar header */}
            <div className="flex items-center gap-2 mb-3">
              {PillarIcon && (
                <PillarIcon className="size-5" style={{ color: pillar.color }} />
              )}
              <span
                className="text-lg font-semibold uppercase tracking-wide"
                style={{ color: pillar.color }}
              >
                {pillar.label}
              </span>
            </div>

            {/* Templates */}
            <TemplateSection
              pillar={pillar}
              pillarTargets={allTargets}
              targetOverrides={targetOverrides}
              onApplyTemplate={onApplyTemplate}
              onUnapplyTemplate={onUnapplyTemplate}
            />

            {/* Spacer between templates and buckets */}
            <div className="mt-4" />

            {/* Type-bucketed activity pool */}
            {bucketKeys.map((bk) => (
              <BucketSection
                key={`${pillar.id}-${bk}`}
                bucketKey={bk}
                targets={buckets[bk]}
                isExpanded={expandedBuckets.has(`${pillar.id}-${bk}`)}
                onToggle={() => toggleBucket(`${pillar.id}-${bk}`)}
                targetOverrides={targetOverrides}
                onUpdateTarget={onUpdateTarget}
                expandedConfigs={expandedConfigs}
                toggleConfig={toggleConfig}
                expandedRamps={expandedRamps}
                toggleRamp={toggleRamp}
                editingValue={editingValue}
                setEditingValue={setEditingValue}
                getEffectiveRamp={getEffectiveRampForTarget}
                onRampStepChange={handleRampStepChange}
                onRampAddStep={handleRampAddStep}
                onRampRemoveStep={handleRampRemoveStep}
                onRampFlatten={handleRampFlatten}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}
