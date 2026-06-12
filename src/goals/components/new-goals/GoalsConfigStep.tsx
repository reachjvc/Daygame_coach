"use client"

import { useState, useMemo, useCallback, useRef, type ReactNode } from "react"
import {
  PILLARS,
  OBJECTIVES,
  TARGETS,
  TEMPLATES,
  PRIMITIVE_META,
  getObjectivesForPillar,
  getTargetsForObjective,
  getSharedDriver,
  getTemplatesForPillar,
  getObjectivesForSharedDriver,
  getPrimaryTemplateForObjective,
  makeCustomFrameworkTarget,
} from "@/src/goals/data/newGoalFramework"
import type {
  FrameworkTarget,
  GoalPrimitive,
  SharedDriver,
  Template,
  TargetOverride,
} from "@/src/goals/data/newGoalFramework"
import { generateMilestoneLadder } from "@/src/goals/milestoneService"
import type { MilestoneLadderConfig, MilestonePin, CustomTarget } from "@/src/goals/types"
import { suggestedTargetDate, todayISO, addDaysISO } from "@/src/goals/horizonService"
import type { IntakeMatches } from "@/src/goals/intakeService"
import { EditableTitle } from "./EditableTitle"
import { PlanTimeline } from "./PlanTimeline"
import { clarifierPrompt, clarifierOption } from "./clarifiers"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, useSortable, arrayMove, horizontalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
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
  Trash2,
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
  Ban,
  Star,
  Sparkles,
  Activity,
  Flame,
  Footprints,
  Medal,
  Rocket,
  type LucideIcon,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Icon maps
// ---------------------------------------------------------------------------

const EMPTY_SET = new Set<string>()

const ICON_MAP: Record<string, LucideIcon> = {
  Dumbbell, Landmark, Heart, Compass, Scaling, Wind, TrendingUp, Shield,
  Sunrise, BookOpen, Brain, Users, Trophy, Target: TargetIcon, Zap, Repeat,
  Milestone, Flag, Plus, Ban, Activity, Flame, Footprints, Medal, Rocket,
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
  /** User-renamed titles keyed by framework / custom id. */
  labels: Record<string, string>
  /** User-added custom goals. */
  customTargets: CustomTarget[]
  onRename: (id: string, label: string) => void
  onAddCustomTarget: (pillarId: string) => void
  onRemoveCustomTarget: (id: string) => void
  /** Plan start date (YYYY-MM-DD) — anchors "from when" + date suggestions. */
  startDate?: string
  onChangeStartDate?: (date: string) => void
  /** Selected pillar ids in priority order (rank) — areas/templates render in this order. */
  pillarOrder?: string[]
  /** Templates the user EXPLICITLY picked — drives the "selected routine" UI (NOT inferred from
   * enabled targets, which over-matches sibling routines that share targets). */
  appliedTemplateIds?: Set<string>
  /** Intake match — ranks templates + relevance; null before/without a match. */
  matches?: IntakeMatches | null
  /** Overall "achieve by" anchor (intake date) — the "Vision" horizon target. */
  intakeDate?: string
  onChangeIntakeDate?: (date: string) => void
  /** Toggle a whole area on/off (off removes the area + all its goals). */
  onToggleArea?: (pillarId: string) => void
  /** Reorder the on areas → priority rank (#1..N). */
  onReorderPillars?: (ids: string[]) => void
  /** Per-objective target dates (flow-state only) — set by a template's time horizon. */
  objectiveDates?: Record<string, string>
  onChangeObjectiveDate?: (objectiveId: string, date: string) => void
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

/** A draggable Kanban column. The grip in the header (attributes/listeners) reorders the column;
 * its left-to-right position is the area's priority. Render-prop so the column body stays in the
 * parent's scope (no prop threading). */
function SortableColumn({ id, children }: { id: string; children: (handle: { attributes: ReturnType<typeof useSortable>["attributes"]; listeners: ReturnType<typeof useSortable>["listeners"] }) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 20 : undefined,
  }
  return (
    <div ref={setNodeRef} style={style} className="w-[300px] shrink-0">
      {children({ attributes, listeners })}
    </div>
  )
}

// Harvested from the production setup wizard's DirectionStep: the daygame-specific
// "pick your path" onboarding. Each path applies the matching Relations template
// (the core funnel), framing them as identities rather than plain template chips.
const NEON_FTO = "#ec4899"       // hot pink
const NEON_ABUNDANCE = "#3b82f6" // electric blue
const RELATIONS_PATHS = [
  { templateId: "tmpl_girlfriend", title: "Find The One", subtitle: "Connection & commitment", icon: Star, color: NEON_FTO },
  { templateId: "tmpl_abundance", title: "Abundance", subtitle: "Freedom & experience", icon: Sparkles, color: NEON_ABUNDANCE },
] as const

/** FTO vs Abundance path cards shown atop the Relations pillar — picking one
 * applies its template (auto-selects the core daygame funnel). */
function RelationsPathChooser({
  pillarTargets,
  targetOverrides,
  onApplyTemplate,
}: {
  pillarTargets: FrameworkTarget[]
  targetOverrides: Record<string, TargetOverride>
  onApplyTemplate: (template: Template, levelIndex: number) => void
}) {
  return (
    <div className="mb-4">
      <p className="text-xs text-zinc-500 mb-2">Choose your path — we&apos;ll set up your core funnel:</p>
      <div className="grid grid-cols-2 gap-3">
        {RELATIONS_PATHS.map((p) => {
          const tmpl = TEMPLATES.find((t) => t.id === p.templateId)
          if (!tmpl) return null
          const active = isTemplateActive(tmpl, targetOverrides, pillarTargets)
          const Icon = p.icon
          return (
            <button
              key={p.templateId}
              onClick={() => onApplyTemplate(tmpl, 0)}
              title={tmpl.description}
              className="relative rounded-xl p-4 text-left transition-all duration-200"
              style={{
                background: active ? `${p.color}35` : `${p.color}18`,
                border: `${active ? 2 : 1}px solid ${p.color}`,
                boxShadow: active ? `0 0 20px ${p.color}30, inset 0 0 20px ${p.color}10` : "none",
              }}
            >
              <Icon className="size-5 mb-2" style={{ color: p.color, filter: `drop-shadow(0 0 6px ${p.color})` }} />
              <h3 className="text-sm font-semibold text-white mb-0.5">{p.title}</h3>
              <p className="text-xs text-white/40">{p.subtitle}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
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
  label,
  onRename,
  isCustom,
  onRemoveCustomTarget,
}: {
  target: FrameworkTarget
  enabled: boolean
  override?: TargetOverride
  label: string
  onRename: (id: string, label: string) => void
  isCustom: boolean
  onRemoveCustomTarget: (id: string) => void
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
      // target — and leave 1 unit of room per step — so the ladder neither flips
      // direction nor collapses into a sub-step range.
      let v = Math.max(1, value)
      const room = Math.max(1, lastStep) // steps - 1
      if (ascending) v = Math.min(v, effectiveTarget - room)
      else v = Math.max(v, effectiveTarget + room)
      v = Math.max(1, v)
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

        <span className={`text-sm font-medium flex-1 flex items-center gap-1 ${enabled ? "text-white" : "text-zinc-500"}`}>
          <EditableTitle
            value={label}
            onCommit={(v) => onRename(target.id, v)}
            inputClassName="text-sm w-44"
            ariaLabel={`Rename ${label}`}
          />
          {isCustom && (
            <button
              onClick={() => onRemoveCustomTarget(target.id)}
              title="Remove this goal"
              className="text-zinc-600 hover:text-red-400 transition-colors"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
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
  labels,
  onRename,
  customIds,
  onRemoveCustomTarget,
}: {
  bucketKey: BucketKey
  targets: FrameworkTarget[]
  isExpanded: boolean
  onToggle: () => void
  targetOverrides: GoalsConfigStepProps["targetOverrides"]
  onUpdateTarget: GoalsConfigStepProps["onUpdateTarget"]
  labels: Record<string, string>
  onRename: (id: string, label: string) => void
  customIds: Set<string>
  onRemoveCustomTarget: (id: string) => void
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
                label={labels[target.id] ?? target.label}
                onRename={onRename}
                isCustom={customIds.has(target.id)}
                onRemoveCustomTarget={onRemoveCustomTarget}
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
  labels,
  customTargets,
  onRename,
  onAddCustomTarget,
  onRemoveCustomTarget,
  startDate,
  onChangeStartDate,
  pillarOrder = [],
  appliedTemplateIds,
  matches = null,
  intakeDate = "",
  onChangeIntakeDate,
  onToggleArea,
  onReorderPillars,
  objectiveDates = {},
  onChangeObjectiveDate,
}: GoalsConfigStepProps) {
  // Areas in priority (rank) order, matching the Intake step; unranked active areas last.
  const rankIdx = (id: string) => { const i = pillarOrder.indexOf(id); return i === -1 ? Infinity : i }
  const activePillars = PILLARS.filter((p) => selectedPillars.has(p.id)).sort((a, b) => rankIdx(a.id) - rankIdx(b.id))
  const customIds = useMemo(() => new Set(customTargets.map((c) => c.id)), [customTargets])
  // Which template rows are expanded (showing their editable goals).
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set())
  const toggleTemplate = useCallback((id: string) => {
    setExpandedTemplates((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }, [])
  // Which on-areas are collapsed (suggestions hidden) — lets you tidy/scan without removing.
  const [collapsedAreas, setCollapsedAreas] = useState<Set<string>>(new Set())
  const toggleAreaCollapse = useCallback((id: string) => {
    setCollapsedAreas((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }, [])
  // Which areas show ALL their template suggestions (vs the top few).
  const [showAllAreas, setShowAllAreas] = useState<Set<string>>(new Set())
  const toggleShowAll = useCallback((id: string) => {
    setShowAllAreas((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }, [])

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

  // Build per-pillar deduplicated targets (framework + user-added custom) + buckets
  const pillarData = useMemo(() => {
    return activePillars.map((pillar) => {
      const customs = customTargets
        .filter((c) => c.pillarId === pillar.id)
        .map((c) => makeCustomFrameworkTarget(c.id, c.pillarId, c.unit, labels[c.id] ?? "New goal"))
      const allTargets = [...getDeduplicatedTargetsForPillar(pillar.id), ...customs]

      const buckets: Record<BucketKey, FrameworkTarget[]> = {
        do: [], measure: [], milestones: [], skills: [],
      }
      for (const t of allTargets) {
        buckets[bucketForTarget(t)].push(t)
      }

      return { pillar, allTargets, buckets }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPillars, customTargets, labels])

  // ----- Template-centric plan -----
  // Time-horizon presets per template, anchored to the plan start / intake "achieve by".
  const HORIZON_PRESETS: { key: string; label: string; days: number | null }[] = [
    { key: "quarter", label: "90 days", days: 90 },
    { key: "year", label: "1 year", days: 365 },
    { key: "vision", label: "Vision", days: -1 }, // -1 → use the intake "achieve by" date
    { key: "now", label: "Ongoing", days: null }, // null → no date (habits)
  ]

  // A template's relevance = its best-matching objective's score (0 if no match yet).
  const templateScore = useCallback((t: Template) => {
    if (!matches) return 0
    let best = 0
    for (const oid of t.objectiveIds) {
      const o = matches.objectives.find((x) => x.id === oid)
      if (o) best = Math.max(best, o.score)
    }
    return best
  }, [matches])

  // An area's template suggestions, ranked by match relevance.
  const templatesForPillarRanked = useCallback((pillarId: string) =>
    getTemplatesForPillar(pillarId).slice().sort((a, b) => templateScore(b) - templateScore(a)),
  [templateScore])

  // All areas as toggleable sections: selected (rank order) first, then the rest.
  const orderedAreas = useMemo(() => {
    const sel = PILLARS.filter((p) => selectedPillars.has(p.id)).sort((a, b) => rankIdx(a.id) - rankIdx(b.id))
    const rest = PILLARS.filter((p) => !selectedPillars.has(p.id))
    return [...sel, ...rest]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPillars])

  // The "on" areas, in priority (rank) order — these are the draggable Kanban columns.
  const onAreas = orderedAreas.filter((p) => selectedPillars.has(p.id))
  const offAreas = orderedAreas.filter((p) => !selectedPillars.has(p.id))
  const areaRank = new Map(onAreas.map((p, i) => [p.id, i + 1]))

  // Drag a column left/right → reorder areas → priority (#1 = leftmost).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const onColumnDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const ids = onAreas.map((p) => p.id)
    const oldI = ids.indexOf(active.id as string)
    const newI = ids.indexOf(over.id as string)
    if (oldI === -1 || newI === -1) return
    onReorderPillars?.(arrayMove(ids, oldI, newI))
  }

  const targetIdsForTemplate = (tmpl: Template) =>
    Object.entries(tmpl.targetOverrides).filter(([, on]) => on).map(([id]) => id)

  // An area's furthest dated goal → its end on the timeline figure.
  const areaEndDate = (pillarId: string): string | null => {
    let max = ""
    for (const t of getTemplatesForPillar(pillarId)) {
      for (const id of Object.keys(t.targetOverrides)) {
        const ov = targetOverrides[id]
        if (ov?.enabled && ov.targetDate && ov.targetDate > max) max = ov.targetDate
      }
    }
    return max || null
  }

  // The template's own goals, bucketed by type, for the inline expand editor.
  const templateBuckets = (tmpl: Template) => {
    const ids = new Set(targetIdsForTemplate(tmpl))
    const buckets: Record<BucketKey, FrameworkTarget[]> = { do: [], measure: [], milestones: [], skills: [] }
    for (const t of TARGETS.filter((x) => ids.has(x.id))) buckets[bucketForTarget(t)].push(t)
    return buckets
  }

  // Apply a time-horizon preset → date the template's dated goals + its objective tier (cascade).
  const applyHorizon = (tmpl: Template, days: number | null) => {
    const start = startDate || todayISO()
    const date = days == null ? "" : days < 0 ? (intakeDate || "") : addDaysISO(start, days)
    for (const id of targetIdsForTemplate(tmpl)) {
      const t = TARGETS.find((x) => x.id === id)
      if (t?.milestoneConfig) onUpdateTarget(id, { targetDate: date }) // only dated metrics
    }
    if (onChangeObjectiveDate) for (const oid of tmpl.objectiveIds) onChangeObjectiveDate(oid, date)
  }

  // Which preset a template currently reflects (from its first dated goal's date).
  const currentHorizon = (tmpl: Template): string | null => {
    const start = startDate || todayISO()
    for (const id of targetIdsForTemplate(tmpl)) {
      const t = TARGETS.find((x) => x.id === id)
      if (!t?.milestoneConfig) continue
      const d = targetOverrides[id]?.targetDate
      if (!d) return "now"
      if (intakeDate && d === intakeDate) return "vision"
      if (d === addDaysISO(start, 90)) return "quarter"
      if (d === addDaysISO(start, 365)) return "year"
      return null
    }
    return null
  }

  // ---- Smart narrowing questions (the "question tree") ----
  // Tier 1: ask at the OBJECTIVE level — the layer the matcher scores well (each objective has its
  // own distinct vocabulary). Per unpicked area we rank its objectives by match score, keep the
  // ones genuinely in contention, and ask "which part of {area}?". Picking applies that objective's
  // primary routine. Clear-winner objectives were auto-applied upstream → those areas are "decided"
  // and don't ask. Tier 2: clarifiers.ts supplies authored prompt/option copy on top.
  const pickedIds = appliedTemplateIds ?? EMPTY_SET
  const OBJ_BAND = 0.12 // objectives within this of the top score are "in contention"
  const objOptionsForArea = (pillarId: string) => {
    const objs = (matches?.objectives ?? []).filter((o) => o.pillarId === pillarId) // already score-desc
    if (!objs.length) return []
    const top = objs[0].score
    const inContention = objs.filter((o) => o.score >= top - OBJ_BAND)
    // ≥2 in contention → offer those; otherwise fall back to the top few so it's never a dead-end.
    return (inContention.length >= 2 ? inContention : objs).slice(0, 4)
  }
  const areaState = onAreas.map((pillar) => ({
    pillar,
    pickedTmpl: getTemplatesForPillar(pillar.id).find((t) => pickedIds.has(t.id)) ?? null,
  }))
  const decided = areaState.filter((a) => a.pickedTmpl)
  const openQuestions = areaState
    .filter((a) => !a.pickedTmpl)
    .map((a) => ({ pillar: a.pillar, options: objOptionsForArea(a.pillar.id) }))
    .filter((a) => a.options.length >= 1)
  const pickObjective = (objectiveId: string) => {
    const tmpl = getPrimaryTemplateForObjective(objectiveId)
    if (tmpl) onApplyTemplate(tmpl, 0)
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-1.5">Your plan</h2>
      <p className="text-sm text-zinc-500 text-center mb-5">
        Answer a couple of quick questions on the left · drag the columns to prioritize · fine-tune on the right
      </p>

      <div className="flex items-center justify-center gap-2.5 mb-6 text-sm text-zinc-400 flex-wrap">
        <span className="font-medium text-zinc-300">Achieve by</span>
        <input
          type="date"
          value={intakeDate ?? ""}
          onChange={(e) => onChangeIntakeDate?.(e.target.value)}
          className="bg-white/5 border border-white/15 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
          aria-label="Achieve-by (target) date"
        />
        {/* Start date — secondary, smaller. */}
        <span className="text-zinc-600">·</span>
        <label className="flex items-center gap-1 text-xs text-zinc-500">
          starting
          <input
            type="date"
            value={startDate ?? ""}
            onChange={(e) => onChangeStartDate?.(e.target.value)}
            className="bg-transparent border-0 border-b border-white/10 px-1 py-0.5 text-xs text-zinc-400 focus:outline-none focus:border-white/30 transition-colors"
            aria-label="Start date"
          />
        </label>
      </div>

      {/* Split: smart narrowing questions on the LEFT, the live plan board on the RIGHT. */}
      <div className="grid lg:grid-cols-[300px_minmax(0,1fr)] gap-6 items-start">

      {/* LEFT — the question tree: only the areas we're genuinely unsure about ask. */}
      <aside className="space-y-3 lg:sticky lg:top-20">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-violet-300" />
          <h3 className="text-sm font-semibold text-white">Quick questions</h3>
          {openQuestions.length > 0 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-200">{openQuestions.length}</span>
          )}
        </div>

        {openQuestions.length === 0 ? (
          <p className="text-xs text-zinc-500 leading-relaxed">
            ✓ Nothing to decide — your plan&apos;s ready on the right. Tweak any area there.
          </p>
        ) : (
          openQuestions.map(({ pillar, options }) => {
            const Icon = ICON_MAP[pillar.icon]
            const areaLabel = labels[pillar.id] ?? pillar.label
            return (
              <div key={pillar.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center gap-2 mb-2.5">
                  {Icon && <Icon className="size-4 shrink-0" style={{ color: pillar.color }} />}
                  <p className="text-[13px] text-zinc-200 leading-snug font-medium">
                    {clarifierPrompt(pillar.id, areaLabel)}
                  </p>
                </div>
                <div className="space-y-1.5">
                  {options.map((opt) => {
                    const obj = OBJECTIVES.find((o) => o.id === opt.id)
                    const override = clarifierOption(pillar.id, opt.id)
                    const label = override?.label ?? obj?.label ?? opt.label
                    const sub = override?.sub ?? obj?.description
                    const OIcon = obj ? ICON_MAP[obj.icon] : undefined
                    return (
                      <button
                        key={opt.id}
                        onClick={() => pickObjective(opt.id)}
                        className="w-full text-left rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/25 transition-all px-3 py-2"
                      >
                        <span className="flex items-center gap-2">
                          {OIcon
                            ? <OIcon className="size-3.5 shrink-0" style={{ color: pillar.color }} />
                            : <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: pillar.color }} />}
                          <span className="text-[13px] font-medium text-white">{label}</span>
                        </span>
                        {sub && <span className="block text-[11px] text-zinc-500 mt-0.5 line-clamp-2">{sub}</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}

        {decided.length > 0 && (
          <div className="pt-2.5 border-t border-white/5">
            <p className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1.5">Decided · tap to change</p>
            <div className="flex flex-wrap gap-1.5">
              {decided.map(({ pillar, pickedTmpl }) => (
                <button
                  key={pillar.id}
                  onClick={() => pickedTmpl && onUnapplyTemplate(pickedTmpl)}
                  title={`Change ${labels[pillar.id] ?? pillar.label}`}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 transition-all"
                >
                  <Check className="size-3" />{pickedTmpl?.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* RIGHT — the live plan: timeline + draggable area columns. */}
      <div className="min-w-0">
      {/* Timeline figure — areas laddering toward the end goal, dates on the X axis. */}
      <PlanTimeline
        areas={onAreas.map((p) => ({ id: p.id, label: labels[p.id] ?? p.label, color: p.color, endDate: areaEndDate(p.id) }))}
        startDate={startDate || todayISO()}
        endGoalDate={intakeDate || null}
      />

      {/* Kanban — each life area is a column; drag them left↔right to set priority (#1 = leftmost). */}
      {onAreas.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onColumnDragEnd}>
          <SortableContext items={onAreas.map((p) => p.id)} strategy={horizontalListSortingStrategy}>
            <div className="flex gap-3 overflow-x-auto pb-3 items-start">
              {onAreas.map((pillar) => (
                <SortableColumn key={pillar.id} id={pillar.id}>
                  {(handle) => {
                    const AreaIcon = ICON_MAP[pillar.icon]
                    const templates = templatesForPillarRanked(pillar.id)
                    const collapsed = collapsedAreas.has(pillar.id)
                    const isAct = (t: Template) => pickedIds.has(t.id)
                    const showAll = showAllAreas.has(pillar.id)
                    const activeTemplates = templates.filter(isAct)
                    const hasActive = activeTemplates.length > 0
                    // Keep columns tidy: show only the picked routine(s) — or the single top
                    // suggestion when nothing's picked yet — and tuck the rest behind "Show more".
                    const base = hasActive ? activeTemplates : templates.slice(0, 1)
                    const shown = showAll ? templates : base
                    const hidden = templates.length - shown.length
                    return (
                      <div className="rounded-xl border border-white/15 bg-white/[0.03] overflow-hidden">
                        {/* Column header — the grip drags the whole column (= priority). */}
                        <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: `linear-gradient(90deg, ${pillar.color}1f, transparent)` }}>
                          <button
                            {...handle.attributes}
                            {...handle.listeners}
                            className="cursor-grab active:cursor-grabbing touch-none text-zinc-500 hover:text-zinc-300 p-0.5 shrink-0"
                            aria-label={`Reorder ${pillar.label}`}
                          >
                            <GripVertical className="size-4" />
                          </button>
                          <span className="text-[10px] font-bold size-5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: pillar.color + "33", color: pillar.color }}>
                            {areaRank.get(pillar.id)}
                          </span>
                          {AreaIcon && <AreaIcon className="size-4 shrink-0" style={{ color: pillar.color }} />}
                          <span className="text-sm font-semibold truncate" style={{ color: pillar.color }}>{labels[pillar.id] ?? pillar.label}</span>
                          <button onClick={() => toggleAreaCollapse(pillar.id)} className="ml-auto shrink-0 text-zinc-500 hover:text-zinc-200 transition-colors" aria-label={collapsed ? `Expand ${pillar.label}` : `Collapse ${pillar.label}`}>
                            {collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                          </button>
                          <button onClick={() => onToggleArea?.(pillar.id)} className="shrink-0 inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 px-2 py-0.5 text-[10px] font-medium transition-all" aria-label={`Remove ${pillar.label}`}>
                            On
                          </button>
                        </div>

                        {/* Routine suggestions for this area */}
                        {!collapsed && templates.length > 0 && (
                          <div className="px-2 pb-2 pt-1.5 space-y-1.5">
                            {!hasActive && (
                              <p className="text-[11px] text-zinc-500 px-1 pb-0.5">Pick one — or answer on the left ←</p>
                            )}
                            {shown.map((tmpl) => {
                              const active = isAct(tmpl)
                              const levelIndex = active ? detectActiveLevel(tmpl, targetOverrides) : -1
                              const expanded = expandedTemplates.has(tmpl.id)
                              const horizon = active ? currentHorizon(tmpl) : null
                              const buckets = templateBuckets(tmpl)
                              const bucketKeys: BucketKey[] = ["do", "measure", "milestones", "skills"]
                              return (
                                <div key={tmpl.id} className={`rounded-lg border transition-all ${active ? "border-white/15 bg-white/[0.04]" : "border-white/10 bg-transparent"}`}>
                                  {/* Click an unselected routine to PICK it (+ reveal goals); selected → expand toggle. */}
                                  <div
                                    onClick={() => {
                                      if (!active) { onApplyTemplate(tmpl, 0); setExpandedTemplates((s) => new Set(s).add(tmpl.id)) }
                                      else toggleTemplate(tmpl.id)
                                    }}
                                    className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer select-none hover:bg-white/[0.02] rounded-lg"
                                  >
                                    <button
                                      onClick={(e) => { e.stopPropagation(); active ? onUnapplyTemplate(tmpl) : onApplyTemplate(tmpl, 0) }}
                                      className={`size-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${active ? "" : "border-white/20 hover:border-white/40"}`}
                                      style={active ? { backgroundColor: pillar.color, borderColor: pillar.color } : undefined}
                                      aria-label={active ? `Remove ${tmpl.label}` : `Add ${tmpl.label}`}
                                    >
                                      {active && <Check className="size-3 text-zinc-950" strokeWidth={3} />}
                                    </button>
                                    <span className={`text-[13px] truncate flex-1 ${active ? "text-white font-medium" : "text-zinc-400"}`}>{tmpl.label}</span>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); toggleTemplate(tmpl.id) }}
                                      className="shrink-0 text-zinc-500 hover:text-zinc-200 transition-colors"
                                      aria-label={expanded ? `Collapse ${tmpl.label}` : `Expand ${tmpl.label}`}
                                    >
                                      {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                                    </button>
                                  </div>

                                  {/* Expand → horizon + level + the template's editable goals */}
                                  {expanded && (
                                    <div className="px-2 pb-2 border-t border-white/5 pt-2">
                                      {!active && <p className="text-[11px] text-zinc-500 px-1 mb-2">Add this routine to edit its goals.</p>}
                                      {active && (
                                        <div className="flex flex-wrap items-center gap-1 mb-2 px-1">
                                          <span className="text-[10px] text-zinc-500 mr-0.5">By</span>
                                          {HORIZON_PRESETS.map((h) => (
                                            <button
                                              key={h.key}
                                              onClick={() => applyHorizon(tmpl, h.days)}
                                              className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${horizon === h.key ? "bg-white/10 border-white/30 text-white" : "bg-white/5 border-white/10 text-zinc-500 hover:text-zinc-300"}`}
                                            >
                                              {h.label}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                      {active && tmpl.levels.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-1 mb-2 px-1">
                                          <span className="text-[10px] text-zinc-500 mr-0.5">Level</span>
                                          {tmpl.levels.map((lv, i) => (
                                            <button
                                              key={lv.label}
                                              onClick={() => onApplyTemplate(tmpl, i)}
                                              className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${i === levelIndex ? "bg-white/10 border-white/30 text-white" : "bg-white/5 border-white/10 text-zinc-400 hover:text-zinc-200"}`}
                                            >
                                              {lv.label}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                      {bucketKeys.map((bk) => buckets[bk].length > 0 && (
                                        <BucketSection
                                          key={bk}
                                          bucketKey={bk}
                                          targets={buckets[bk]}
                                          isExpanded={true}
                                          onToggle={() => {}}
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
                                          labels={labels}
                                          onRename={onRename}
                                          customIds={customIds}
                                          onRemoveCustomTarget={onRemoveCustomTarget}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                            {(hidden > 0 || showAll) && (
                              <button
                                onClick={() => toggleShowAll(pillar.id)}
                                className="w-full text-[11px] text-zinc-500 hover:text-zinc-200 py-1.5 rounded-lg hover:bg-white/[0.03] transition-colors"
                              >
                                {hidden > 0 ? `Show ${hidden} more` : "Show fewer"}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  }}
                </SortableColumn>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="text-sm text-zinc-500 text-center py-8">No areas yet — add one below.</p>
      )}

      {/* Off areas → add chips */}
      {offAreas.length > 0 && (
        <div className="mt-5">
          <p className="text-xs text-zinc-500 mb-2">Add an area:</p>
          <div className="flex flex-wrap gap-2">
            {offAreas.map((p) => {
              const Icon = ICON_MAP[p.icon]
              return (
                <button
                  key={p.id}
                  onClick={() => onToggleArea?.(p.id)}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-zinc-400 hover:text-zinc-200 hover:border-white/20 transition-all"
                  aria-label={`Add ${p.label}`}
                >
                  <Plus className="size-3.5" />{Icon && <Icon className="size-3.5" />}{labels[p.id] ?? p.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
      </div>{/* end right pane */}
      </div>{/* end split grid */}
    </div>
  )
}
