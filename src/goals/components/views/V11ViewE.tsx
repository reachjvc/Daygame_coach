"use client"

import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import {
  CalendarClock,
  Plus,
  ChevronDown,
  ChevronRight,
  Check,
  Flame,
  Loader2,
  Pencil,
  Trash2,
  Archive,
  RotateCcw,
  X,
  Clock,
  Sun,
  CalendarDays,
  CalendarRange,
  Target,
  Sunrise,
  PartyPopper,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { getLifeAreaConfig } from "../../data/lifeAreas"
import { getParents } from "../../data/goalGraph"
import type { V11ViewProps } from "./V11ViewProps"
import type {
  GoalWithProgress,
  GoalTemplate,
  UserGoalInsert,
  InputMode,
  LifeAreaConfig,
  GoalPeriod,
} from "../../types"
import type { BatchGoalInsert } from "../../treeGenerationService"

// ============================================================================
// Types
// ============================================================================

type TimeGroup = "today" | "this-week" | "this-month" | "this-quarter" | "long-term"

type OnboardingStep = "daily" | "weekly" | "milestones" | "confirm"

interface CustomGoalDraft {
  title: string
  lifeArea: string
  targetValue: number
  period: GoalPeriod
  trackingType: "counter" | "boolean"
}

// ============================================================================
// Constants
// ============================================================================

const TIME_GROUP_ORDER: TimeGroup[] = ["today", "this-week", "this-month", "this-quarter", "long-term"]

const TIME_GROUP_CONFIG: Record<TimeGroup, { label: string; periodLabel: string; icon: typeof Sun }> = {
  "today": { label: "Today", periodLabel: "today", icon: Sun },
  "this-week": { label: "This Week", periodLabel: "this week", icon: CalendarDays },
  "this-month": { label: "This Month", periodLabel: "this month", icon: CalendarRange },
  "this-quarter": { label: "This Quarter", periodLabel: "this quarter", icon: CalendarClock },
  "long-term": { label: "Milestones & Long-Term", periodLabel: "", icon: Target },
}

const PERIOD_TO_GROUP: Record<string, TimeGroup> = {
  daily: "today",
  weekly: "this-week",
  monthly: "this-month",
  quarterly: "this-quarter",
  yearly: "long-term",
  custom: "long-term",
}

const GROUP_TO_DEFAULT_PERIOD: Record<TimeGroup, GoalPeriod> = {
  "today": "daily",
  "this-week": "weekly",
  "this-month": "monthly",
  "this-quarter": "quarterly",
  "long-term": "yearly",
}

const EMPTY_CUSTOM_DRAFT: CustomGoalDraft = {
  title: "",
  lifeArea: "daygame",
  targetValue: 1,
  period: "weekly",
  trackingType: "counter",
}

// ============================================================================
// Utility functions
// ============================================================================

function progressColor(pct: number): string {
  if (pct >= 100) return "bg-emerald-500"
  if (pct >= 75) return "bg-emerald-400"
  if (pct >= 50) return "bg-amber-400"
  if (pct >= 25) return "bg-orange-400"
  return "bg-red-400"
}

function getTimeGroup(goal: GoalWithProgress): TimeGroup {
  // Milestones always go to long-term
  if (goal.goal_type === "milestone") return "long-term"
  return PERIOD_TO_GROUP[goal.period] || "long-term"
}

function groupByTimeHorizon(goals: GoalWithProgress[]): Record<TimeGroup, GoalWithProgress[]> {
  const groups: Record<TimeGroup, GoalWithProgress[]> = {
    "today": [],
    "this-week": [],
    "this-month": [],
    "this-quarter": [],
    "long-term": [],
  }
  for (const g of goals) {
    const group = getTimeGroup(g)
    groups[group].push(g)
  }
  // Within each group, sort: incomplete first (least progress first), then complete
  for (const key of TIME_GROUP_ORDER) {
    groups[key].sort((a, b) => {
      if (a.is_complete !== b.is_complete) return a.is_complete ? 1 : -1
      return a.progress_percentage - b.progress_percentage
    })
  }
  return groups
}

function templateToInsert(t: GoalTemplate): UserGoalInsert {
  return {
    title: t.title,
    life_area: t.lifeArea,
    category: t.lifeArea,
    goal_type: t.templateType === "milestone_ladder" ? "milestone" : t.templateType === "habit_ramp" ? "habit_ramp" : "recurring",
    goal_nature: t.nature,
    goal_level: t.level,
    display_category: t.displayCategory,
    tracking_type: t.linkedMetric ? "counter" : "counter",
    period: "weekly",
    target_value: t.defaultMilestoneConfig?.target ?? t.defaultRampSteps?.[0]?.frequencyPerWeek ?? 1,
    template_id: t.id,
    linked_metric: t.linkedMetric,
    milestone_config: t.defaultMilestoneConfig,
    ramp_steps: t.defaultRampSteps,
  }
}

/**
 * Convert a list of selected templates into BatchGoalInserts with proper
 * parent-child hierarchy derived from the goal graph edges.
 *
 * For each template, we look up its graph parents. If any parent is also in
 * the selected set, we link via `_tempParentId`. Otherwise it's a root (null).
 */
function templatesToBatchInserts(selectedTemplates: GoalTemplate[]): BatchGoalInsert[] {
  const selectedIds = new Set(selectedTemplates.map((t) => t.id))

  // Build parent map: for each selected template, find its first selected parent
  const parentMap = new Map<string, string | null>()
  for (const t of selectedTemplates) {
    const graphParents = getParents(t.id)
    const selectedParent = graphParents.find((p) => selectedIds.has(p.id))
    parentMap.set(t.id, selectedParent ? `__temp_${selectedParent.id}` : null)
  }

  // Sort: parents before children (lower level first) so batch endpoint resolves correctly
  const sorted = [...selectedTemplates].sort((a, b) => a.level - b.level)

  return sorted.map((t) => ({
    ...templateToInsert(t),
    _tempId: `__temp_${t.id}`,
    _tempParentId: parentMap.get(t.id) ?? null,
  }))
}

// ============================================================================
// Sub-components
// ============================================================================

// --- Mini progress ring for section headers ---
function SectionProgressRing({ pct }: { pct: number }) {
  const radius = 8
  const strokeWidth = 2.5
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(100, pct) / 100) * circumference

  return (
    <svg width={22} height={22} className="shrink-0 -rotate-90">
      {/* Background circle */}
      <circle
        cx={11}
        cy={11}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        className="stroke-muted/40"
      />
      {/* Progress arc */}
      <circle
        cx={11}
        cy={11}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className={pct >= 100 ? "stroke-emerald-500" : pct >= 50 ? "stroke-amber-400" : "stroke-orange-400"}
      />
    </svg>
  )
}

// --- Progress bar with life area color ---
function ProgressBar({ pct, hex }: { pct: number; hex?: string }) {
  return (
    <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${hex ? "" : progressColor(pct)}`}
        style={{
          width: `${Math.min(100, pct)}%`,
          ...(hex ? { backgroundColor: hex } : {}),
        }}
      />
    </div>
  )
}

// --- Goal action buttons (increment/boolean/direct entry) ---
function GoalActions({
  goal,
  inputMode,
  increments,
  onIncrement,
  onSetValue,
  onReset,
  onCelebrate,
  getCelebrationTier,
}: {
  goal: GoalWithProgress
  inputMode: InputMode
  increments: number[]
  onIncrement: (goalId: string, amount: number) => Promise<void>
  onSetValue: (goalId: string, value: number) => Promise<void>
  onReset: (goalId: string) => Promise<void>
  onCelebrate: V11ViewProps["onCelebrate"]
  getCelebrationTier: V11ViewProps["getCelebrationTier"]
}) {
  const [directValue, setDirectValue] = useState("")
  const [busy, setBusy] = useState(false)

  const doIncrement = async (amount: number) => {
    if (busy) return
    setBusy(true)
    try {
      await onIncrement(goal.id, amount)
      if (!goal.is_complete && goal.current_value + amount >= goal.target_value) {
        onCelebrate(getCelebrationTier(goal), goal.title)
      }
    } finally {
      setBusy(false)
    }
  }

  const doSetValue = async () => {
    const v = parseInt(directValue, 10)
    if (isNaN(v) || v < 0 || busy) return
    setBusy(true)
    try {
      await onSetValue(goal.id, v)
      if (!goal.is_complete && v >= goal.target_value) {
        onCelebrate(getCelebrationTier(goal), goal.title)
      }
      setDirectValue("")
    } finally {
      setBusy(false)
    }
  }

  if (goal.is_complete) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 text-xs">
          <Check className="size-3 mr-1" /> Done
        </Badge>
        <button
          onClick={() => onReset(goal.id)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          title="Reset"
        >
          <RotateCcw className="size-3" />
        </button>
      </div>
    )
  }

  if (inputMode === "boolean") {
    return (
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-3 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
        onClick={() => doIncrement(1)}
        disabled={busy}
      >
        {busy ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3 mr-1" />}
        Mark Done
      </Button>
    )
  }

  if (inputMode === "direct-entry") {
    return (
      <div className="flex items-center gap-1">
        <Input
          type="number"
          placeholder={String(goal.target_value)}
          value={directValue}
          onChange={(e) => setDirectValue(e.target.value)}
          className="h-7 w-20 text-xs bg-muted/30"
          onKeyDown={(e) => e.key === "Enter" && doSetValue()}
        />
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={doSetValue} disabled={busy}>
          {busy ? <Loader2 className="size-3 animate-spin" /> : "Set"}
        </Button>
      </div>
    )
  }

  // buttons mode
  return (
    <div className="flex items-center gap-1">
      {increments.map((inc) => (
        <Button
          key={inc}
          size="sm"
          variant="outline"
          className="h-7 min-w-[2rem] px-2 text-xs"
          onClick={() => doIncrement(inc)}
          disabled={busy}
        >
          {busy ? <Loader2 className="size-3 animate-spin" /> : `+${inc}`}
        </Button>
      ))}
    </div>
  )
}

// --- Urgency badge for days remaining ---
function DaysRemainingBadge({ daysRemaining }: { daysRemaining: number }) {
  let colorClass: string
  let label: string

  if (daysRemaining <= 0) {
    colorClass = "text-red-400 bg-red-500/10 border-red-500/30"
    label = daysRemaining === 0 ? "Due today" : "Overdue"
  } else if (daysRemaining <= 3) {
    colorClass = "text-amber-400 bg-amber-500/10 border-amber-500/30"
    label = `${daysRemaining}d left`
  } else {
    colorClass = "text-muted-foreground bg-muted/30 border-border/50"
    label = `${daysRemaining}d left`
  }

  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border shrink-0 ${colorClass}`}>
      <Clock className="size-2.5" />
      {label}
    </span>
  )
}

// --- Timeline goal card ---
function TimelineGoalCard({
  goal,
  props,
  onStartEdit,
  isExpanded,
  onToggleExpand,
  isToday,
  timeGroup,
}: {
  goal: GoalWithProgress
  props: V11ViewProps
  onStartEdit: (goalId: string) => void
  isExpanded: boolean
  onToggleExpand: () => void
  isToday?: boolean
  timeGroup?: TimeGroup
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const areaConfig = getLifeAreaConfig(goal.life_area || "custom")
  const inputMode = props.getInputMode(goal)
  const increments = props.getButtonIncrements(goal.target_value)
  const milestoneInfo = props.getNextMilestoneInfo(goal)
  const projectedDate = props.getProjectedDate(goal)

  // Reset confirmation when card collapses
  useEffect(() => {
    if (!isExpanded) setConfirmingDelete(false)
  }, [isExpanded])

  // Show days remaining badge in collapsed state for Today and This Week sections
  const showDaysRemainingInCollapsed =
    !isExpanded &&
    !goal.is_complete &&
    goal.days_remaining !== null &&
    goal.days_remaining !== undefined &&
    (timeGroup === "today" || timeGroup === "this-week")

  return (
    <div className={`rounded-lg border overflow-hidden transition-colors ${
      isToday
        ? "border-primary/20 bg-card/60 hover:bg-card/90 border-l-2 border-l-primary/40"
        : "border-border/50 bg-card/50 hover:bg-card/80"
    }`}>
      {/* Main row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={onToggleExpand}
      >
        {/* Life area colored dot */}
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: areaConfig.hex }}
          title={areaConfig.name}
        />

        {/* Title + progress */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium truncate ${goal.is_complete ? "line-through text-muted-foreground" : ""}`}>
              {goal.title}
            </span>
            {goal.current_streak > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-orange-400 shrink-0">
                <Flame className="size-3" />
                {goal.current_streak}
              </span>
            )}
            {goal.linked_metric && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-blue-500/30 text-blue-400 shrink-0">
                auto
              </Badge>
            )}
            {showDaysRemainingInCollapsed && (
              <DaysRemainingBadge daysRemaining={goal.days_remaining!} />
            )}
          </div>
          <div className="mt-1.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">
                {goal.current_value}/{goal.target_value}
              </span>
              <span className="text-xs text-muted-foreground">
                {goal.progress_percentage}%
              </span>
            </div>
            <ProgressBar pct={goal.progress_percentage} hex={areaConfig.hex} />
          </div>
        </div>

        {/* Actions (stop propagation so clicking buttons doesn't toggle expand) */}
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <GoalActions
            goal={goal}
            inputMode={inputMode}
            increments={increments}
            onIncrement={props.onIncrement}
            onSetValue={props.onSetValue}
            onReset={props.onReset}
            onCelebrate={props.onCelebrate}
            getCelebrationTier={props.getCelebrationTier}
          />
        </div>

        <ChevronDown className={`size-4 text-muted-foreground transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
      </div>

      {/* Milestone info bar — shown below progress for milestone/long-term goals */}
      {!isExpanded && milestoneInfo && (
        <div className="px-4 pb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {goal.goal_type === "milestone" && (
            <span>
              Total: <span className="font-medium text-foreground">{goal.current_value}</span>
              {goal.target_value > 0 && (
                <span className="text-muted-foreground/70">/{goal.target_value}</span>
              )}
            </span>
          )}
          <span>
            Next: <span className="font-medium text-foreground">{milestoneInfo.nextValue}</span>
            <span className="ml-1">({milestoneInfo.remaining} away)</span>
          </span>
          {projectedDate?.nextLabel && (
            <span>
              Projected: <span className="font-medium text-foreground">{projectedDate.nextLabel}</span>
            </span>
          )}
          {goal.goal_type === "milestone" && projectedDate?.finalLabel && projectedDate.finalLabel !== projectedDate.nextLabel && (
            <span>
              Final: <span className="font-medium text-foreground">{projectedDate.finalLabel}</span>
            </span>
          )}
        </div>
      )}

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-4 pb-3 pt-1 border-t border-border/30 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground block">Life Area</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: areaConfig.hex }} />
                <span className="font-medium">{areaConfig.name}</span>
              </div>
            </div>
            <div>
              <span className="text-muted-foreground block">Type</span>
              <span className="font-medium capitalize">{goal.goal_type.replace("_", " ")}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Best Streak</span>
              <span className="font-medium">{goal.best_streak}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Progress</span>
              <span className="font-medium">{goal.progress_percentage}%</span>
            </div>
          </div>

          {goal.goal_type === "milestone" && (
            <div className="text-xs">
              <span className="text-muted-foreground">Total progress: </span>
              <span className="font-medium">{goal.current_value}</span>
              {goal.target_value > 0 && (
                <span className="text-muted-foreground">/{goal.target_value} ({goal.progress_percentage}%)</span>
              )}
            </div>
          )}

          {milestoneInfo && (
            <div className="text-xs">
              <span className="text-muted-foreground">Next milestone: </span>
              <span className="font-medium">{milestoneInfo.nextValue}</span>
              <span className="text-muted-foreground"> ({milestoneInfo.remaining} remaining)</span>
            </div>
          )}

          {projectedDate?.nextLabel && (
            <div className="text-xs">
              <span className="text-muted-foreground">Next projected: </span>
              <span className="font-medium">{projectedDate.nextLabel}</span>
            </div>
          )}

          {projectedDate?.finalLabel && (
            <div className="text-xs">
              <span className="text-muted-foreground">Final projected: </span>
              <span className="font-medium">{projectedDate.finalLabel}</span>
            </div>
          )}

          {goal.motivation_note && (
            <div className="text-xs italic text-muted-foreground border-l-2 border-border pl-2">
              {goal.motivation_note}
            </div>
          )}

          {goal.days_remaining !== null && (
            <div className="text-xs">
              <Clock className="size-3 inline mr-1 text-muted-foreground" />
              <span className="text-muted-foreground">{goal.days_remaining} days remaining</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1 border-t border-border/30">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => onStartEdit(goal.id)}
            >
              <Pencil className="size-3 mr-1" /> Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => props.onArchive(goal.id)}
            >
              <Archive className="size-3 mr-1" /> Archive
            </Button>
            {confirmingDelete ? (
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-xs text-red-400">Delete permanently?</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={() => props.onDelete(goal.id)}
                >
                  Yes
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  onClick={() => setConfirmingDelete(false)}
                >
                  No
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-red-400 hover:text-red-300"
                onClick={() => setConfirmingDelete(true)}
              >
                <Trash2 className="size-3 mr-1" /> Delete
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// --- Slide-down transition wrapper for inline creator ---
function SlideDown({
  visible,
  children,
}: {
  visible: boolean
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (visible) {
      setMounted(false)
      const raf = requestAnimationFrame(() => setMounted(true))
      return () => cancelAnimationFrame(raf)
    } else {
      setMounted(false)
    }
  }, [visible])

  if (!visible) return null

  return (
    <div
      style={{
        maxHeight: mounted ? 400 : 0,
        opacity: mounted ? 1 : 0,
        overflow: "hidden",
        transition: "max-height 0.2s ease-out, opacity 0.2s ease-out",
      }}
    >
      {children}
    </div>
  )
}

// --- Inline edit panel ---
function InlineEditPanel({
  goal,
  onSave,
  onCancel,
}: {
  goal: GoalWithProgress
  onSave: (goalId: string, updates: Partial<UserGoalInsert>) => Promise<void>
  onCancel: () => void
}) {
  const [title, setTitle] = useState(goal.title)
  const [target, setTarget] = useState(String(goal.target_value))
  const [motivation, setMotivation] = useState(goal.motivation_note || "")
  const [period, setPeriod] = useState(goal.period)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(goal.id, {
        title: title.trim() || goal.title,
        target_value: parseInt(target, 10) || goal.target_value,
        motivation_note: motivation.trim() || null,
        period,
      })
      onCancel()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Edit Goal</h4>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>
      <div className="space-y-2">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground block mb-1">Target</label>
            <Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground block mb-1">Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as GoalWithProgress["period"])}
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Motivation Note</label>
          <Input value={motivation} onChange={(e) => setMotivation(e.target.value)} className="h-8 text-sm" placeholder="Why does this matter?" />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel} className="h-7 text-xs">Cancel</Button>
        <Button size="sm" onClick={handleSave} className="h-7 text-xs" disabled={saving}>
          {saving ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
          Save
        </Button>
      </div>
    </div>
  )
}

// --- Time period section (the core timeline grouping) ---
function TimeSection({
  groupKey,
  goals,
  props,
  expandedGoals,
  onToggleExpand,
  editingGoalId,
  onStartEdit,
  onCancelEdit,
  onAddToSection,
  isFirst,
  isLast,
  isSectionCollapsed,
  onToggleSectionCollapse,
}: {
  groupKey: TimeGroup
  goals: GoalWithProgress[]
  props: V11ViewProps
  expandedGoals: Set<string>
  onToggleExpand: (goalId: string) => void
  editingGoalId: string | null
  onStartEdit: (goalId: string) => void
  onCancelEdit: () => void
  onAddToSection: (group: TimeGroup) => void
  isFirst: boolean
  isLast: boolean
  isSectionCollapsed: boolean
  onToggleSectionCollapse: () => void
  isAddingHere: boolean
  lifeAreas: LifeAreaConfig[]
  onCreate: V11ViewProps["onCreate"]
  onCloseCreator: () => void
}) {
  const config = TIME_GROUP_CONFIG[groupKey]
  const Icon = config.icon
  const activeGoals = goals.filter((g) => !g.is_archived)
  const incompleteGoals = activeGoals.filter((g) => !g.is_complete)
  const completedGoals = activeGoals.filter((g) => g.is_complete)
  const [showCompleted, setShowCompleted] = useState(false)

  const isToday = groupKey === "today"

  // Average progress across all active goals in this section
  const avgProgress = activeGoals.length > 0
    ? Math.round(activeGoals.reduce((sum, g) => sum + g.progress_percentage, 0) / activeGoals.length)
    : 0

  // Whether all daily goals are done (only relevant for Today section)
  const allDailyDone = isToday && activeGoals.length > 0 && incompleteGoals.length === 0

  if (activeGoals.length === 0) return null

  return (
    <div className="relative">
      {/* Vertical timeline connector line — runs from the node dot downward */}
      {!isLast && (
        <div
          className="absolute left-[11px] top-[28px] bottom-0 w-px border-l border-dashed border-border/40"
          aria-hidden="true"
        />
      )}
      {/* Connector line from previous section to this node */}
      {!isFirst && (
        <div
          className="absolute left-[11px] top-0 h-[10px] w-px border-l border-dashed border-border/40"
          aria-hidden="true"
        />
      )}

      <div className={`space-y-2 ${isToday ? "rounded-lg bg-primary/5 border border-primary/10 p-3 -mx-1" : ""}`}>
        {/* Section header — timeline node (clickable to collapse/expand) */}
        <div
          className="flex items-center gap-3 pt-1 cursor-pointer select-none"
          onClick={onToggleSectionCollapse}
        >
          {/* Timeline node dot */}
          <div className={`relative z-10 flex items-center justify-center w-[22px] h-[22px] rounded-full border-2 shrink-0 ${
            isToday
              ? "border-primary bg-primary/20"
              : "border-border/60 bg-background"
          }`}>
            <Icon className={`size-3 ${isToday ? "text-primary" : "text-muted-foreground"}`} />
          </div>

          <ChevronRight className={`size-3 transition-transform ${isSectionCollapsed ? "" : "rotate-90"} ${
            isToday ? "text-primary" : "text-muted-foreground"
          }`} />

          <h2 className={`text-sm font-semibold uppercase tracking-wider ${
            isToday ? "text-primary" : "text-muted-foreground"
          }`}>
            {config.label}
          </h2>
          <div className="flex-1 h-px bg-border/50" />
          <div className="flex items-center gap-1.5">
            <SectionProgressRing pct={avgProgress} />
            <span className="text-xs text-muted-foreground">
              {completedGoals.length}/{activeGoals.length}
            </span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onAddToSection(groupKey) }}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title={`Add a ${config.label.toLowerCase()} goal`}
          >
            <Plus className="size-4" />
          </button>
        </div>

        {/* Inline goal creator — slides down below header when active */}
        <SlideDown visible={isAddingHere}>
          <div className="pl-8">
            <TimelineGoalCreator
              lifeAreas={lifeAreas}
              defaultPeriod={GROUP_TO_DEFAULT_PERIOD[groupKey]}
              onCreate={onCreate}
              onClose={onCloseCreator}
            />
          </div>
        </SlideDown>

        {/* Section body — hidden when collapsed */}
        {!isSectionCollapsed && (
          <>
            {/* Incomplete goals */}
            <div className="space-y-2 pl-8">
              {incompleteGoals.map((goal) =>
                editingGoalId === goal.id ? (
                  <InlineEditPanel
                    key={goal.id}
                    goal={goal}
                    onSave={props.onUpdate}
                    onCancel={onCancelEdit}
                  />
                ) : (
                  <TimelineGoalCard
                    key={goal.id}
                    goal={goal}
                    props={props}
                    onStartEdit={onStartEdit}
                    isExpanded={expandedGoals.has(goal.id)}
                    onToggleExpand={() => onToggleExpand(goal.id)}
                    isToday={isToday}
                    timeGroup={groupKey}
                  />
                )
              )}
            </div>

            {/* All daily goals done — celebration banner */}
            {allDailyDone && (
              <div className="pl-8">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <PartyPopper className="size-4 text-emerald-400 shrink-0" />
                  <span className="text-sm font-medium text-emerald-400">All daily goals done!</span>
                </div>
              </div>
            )}

            {/* Completed goals — collapsible summary bar */}
            {completedGoals.length > 0 && (
              <div className="pl-8">
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors ${
                    showCompleted
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-muted/30 hover:bg-muted/50 text-muted-foreground hover:text-emerald-400"
                  }`}
                >
                  <div className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/20 shrink-0">
                    <Check className="size-2.5 text-emerald-500" />
                  </div>
                  <span className="font-medium">{completedGoals.length} completed</span>
                  <ChevronRight className={`size-3 ml-auto transition-transform ${showCompleted ? "rotate-90" : ""}`} />
                </button>
                {showCompleted && (
                  <div className="space-y-2 mt-2">
                    {completedGoals.map((goal) =>
                      editingGoalId === goal.id ? (
                        <InlineEditPanel
                          key={goal.id}
                          goal={goal}
                          onSave={props.onUpdate}
                          onCancel={onCancelEdit}
                        />
                      ) : (
                        <TimelineGoalCard
                          key={goal.id}
                          goal={goal}
                          props={props}
                          onStartEdit={onStartEdit}
                          isExpanded={expandedGoals.has(goal.id)}
                          onToggleExpand={() => onToggleExpand(goal.id)}
                          isToday={isToday}
                          timeGroup={groupKey}
                        />
                      )
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// --- Custom goal creator with pre-selected period ---
function TimelineGoalCreator({
  lifeAreas,
  defaultPeriod,
  onCreate,
  onClose,
}: {
  lifeAreas: LifeAreaConfig[]
  defaultPeriod: GoalPeriod
  onCreate: (goal: UserGoalInsert) => Promise<GoalWithProgress | null>
  onClose: () => void
}) {
  const [draft, setDraft] = useState<CustomGoalDraft>({
    ...EMPTY_CUSTOM_DRAFT,
    period: defaultPeriod,
  })
  const [creating, setCreating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleCreate = async () => {
    if (!draft.title.trim() || creating) return
    setCreating(true)
    try {
      await onCreate({
        title: draft.title.trim(),
        life_area: draft.lifeArea,
        category: draft.lifeArea,
        tracking_type: draft.trackingType,
        period: draft.period,
        target_value: draft.trackingType === "boolean" ? 1 : draft.targetValue,
        goal_type: "recurring",
        goal_nature: "input",
        goal_level: 3,
      })
      onClose()
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-muted/10 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Add Goal</h4>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>
      <div className="space-y-2">
        <Input
          ref={inputRef}
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          placeholder="What do you want to achieve?"
          className="h-9 text-sm"
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <div className="flex gap-2 flex-wrap">
          <select
            value={draft.lifeArea}
            onChange={(e) => setDraft({ ...draft, lifeArea: e.target.value })}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs flex-1 min-w-[120px]"
          >
            {lifeAreas.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <select
            value={draft.trackingType}
            onChange={(e) => setDraft({ ...draft, trackingType: e.target.value as "counter" | "boolean" })}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="counter">Counter</option>
            <option value="boolean">Yes/No</option>
          </select>
          {draft.trackingType === "counter" && (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={draft.targetValue}
                onChange={(e) => setDraft({ ...draft, targetValue: parseInt(e.target.value, 10) || 1 })}
                className="h-8 w-16 text-xs"
                min={1}
              />
              <select
                value={draft.period}
                onChange={(e) => setDraft({ ...draft, period: e.target.value as GoalPeriod })}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="daily">/day</option>
                <option value="weekly">/week</option>
                <option value="monthly">/month</option>
                <option value="quarterly">/quarter</option>
                <option value="yearly">/year</option>
              </select>
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={handleCreate} disabled={!draft.title.trim() || creating} className="h-8 text-xs">
          {creating ? <Loader2 className="size-3 animate-spin mr-1" /> : <Plus className="size-3 mr-1" />}
          Create
        </Button>
      </div>
    </div>
  )
}

// --- Step transition wrapper for onboarding fade-in/out ---
function StepTransition({
  stepKey,
  children,
}: {
  stepKey: string
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(false)
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [stepKey])

  return (
    <div
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.3s ease-out, transform 0.3s ease-out",
      }}
    >
      {children}
    </div>
  )
}

// --- Onboarding: "Start your timeline" flow ---
function TimelineOnboarding({
  templates,
  lifeAreas,
  onBatchCreate,
  onCreate,
  onCelebrate,
}: {
  templates: GoalTemplate[]
  lifeAreas: LifeAreaConfig[]
  onBatchCreate: V11ViewProps["onBatchCreate"]
  onCreate: V11ViewProps["onCreate"]
  onCelebrate: V11ViewProps["onCelebrate"]
}) {
  const [step, setStep] = useState<OnboardingStep>("daily")
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set())
  const [creating, setCreating] = useState(false)
  const [showCustom, setShowCustom] = useState(false)

  // Filter templates by appropriate period suggestions
  const dailyTemplates = useMemo(
    () => templates.filter((t) => t.level === 3 && t.priority === "core").slice(0, 8),
    [templates]
  )
  const weeklyTemplates = useMemo(
    () => templates.filter((t) => t.level === 3 && (t.priority === "core" || t.priority === "progressive")).slice(0, 8),
    [templates]
  )
  const milestoneTemplates = useMemo(
    () => templates.filter((t) => t.templateType === "milestone_ladder" || t.level <= 2).slice(0, 6),
    [templates]
  )

  const toggleTemplate = (id: string) => {
    setSelectedTemplates((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleCreate = async () => {
    if (selectedTemplates.size === 0 || creating) return
    setCreating(true)
    try {
      const selectedList = templates.filter((t) => selectedTemplates.has(t.id))
      const inserts: BatchGoalInsert[] = templatesToBatchInserts(selectedList)
      await onBatchCreate(inserts)
      onCelebrate("confetti-epic", "Your timeline is ready!")
    } finally {
      setCreating(false)
    }
  }

  const currentTemplates = step === "daily" ? dailyTemplates : step === "weekly" ? weeklyTemplates : milestoneTemplates
  const stepConfig = {
    daily: { title: "What will you do TODAY?", subtitle: "Daily habits build the foundation", icon: Sun, period: "daily" },
    weekly: { title: "What about this WEEK?", subtitle: "Weekly goals keep momentum", icon: CalendarDays, period: "weekly" },
    milestones: { title: "Any big milestones?", subtitle: "Long-term targets give direction", icon: Target, period: "milestone" },
    confirm: { title: "Your Timeline", subtitle: `${selectedTemplates.size} goals ready to launch`, icon: CalendarClock, period: "" },
  }

  const sc = stepConfig[step]
  const StepIcon = sc.icon

  // Confirm step
  if (step === "confirm") {
    const selectedList = templates.filter((t) => selectedTemplates.has(t.id))
    return (
      <StepTransition stepKey="confirm">
        <div className="max-w-lg mx-auto py-8 px-4 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-border/50">
              <CalendarClock className="size-6 text-foreground" />
            </div>
            <h2 className="text-xl font-bold">{sc.title}</h2>
            <p className="text-sm text-muted-foreground">{sc.subtitle}</p>
          </div>

          <div className="space-y-2">
            {selectedList.map((t) => {
              const area = getLifeAreaConfig(t.lifeArea)
              return (
                <div key={t.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border/50">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: area.hex }} />
                  <span className="text-sm flex-1">{t.title}</span>
                  <button
                    onClick={() => toggleTemplate(t.id)}
                    className="text-muted-foreground hover:text-red-400 transition-colors"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              )
            })}
          </div>

          <div className="flex justify-between items-center pt-2">
            <Button variant="ghost" size="sm" onClick={() => setStep("milestones")} className="text-xs">
              Back
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={creating || selectedTemplates.size === 0} className="text-xs">
              {creating ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
              Launch {selectedTemplates.size} Goals
            </Button>
          </div>
        </div>
      </StepTransition>
    )
  }

  // Template picking steps
  return (
    <StepTransition stepKey={step}>
    <div className="max-w-lg mx-auto py-8 px-4 space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-border/50">
          <StepIcon className="size-6 text-foreground" />
        </div>
        <h2 className="text-xl font-bold">{sc.title}</h2>
        <p className="text-sm text-muted-foreground">{sc.subtitle}</p>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 pt-2">
          {(["daily", "weekly", "milestones"] as const).map((s, i) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition-colors ${
                s === step ? "bg-foreground" : selectedTemplates.size > 0 || i < ["daily", "weekly", "milestones"].indexOf(step) ? "bg-muted-foreground/50" : "bg-muted/50"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        {currentTemplates.map((t) => {
          const area = getLifeAreaConfig(t.lifeArea)
          const isSelected = selectedTemplates.has(t.id)
          return (
            <button
              key={t.id}
              onClick={() => toggleTemplate(t.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all ${
                isSelected
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : "border-border/50 hover:border-border hover:bg-muted/20"
              }`}
            >
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: area.hex }} />
              <span className="text-sm flex-1">{t.title}</span>
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                isSelected ? "border-emerald-500 bg-emerald-500" : "border-muted-foreground/30"
              }`}>
                {isSelected && <Check className="size-3 text-white" />}
              </div>
            </button>
          )
        })}
      </div>

      {!showCustom ? (
        <button
          onClick={() => setShowCustom(true)}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
        >
          <Plus className="size-3" /> Create custom goal
        </button>
      ) : (
        <TimelineGoalCreator
          lifeAreas={lifeAreas}
          defaultPeriod={step === "daily" ? "daily" : step === "weekly" ? "weekly" : "yearly"}
          onCreate={onCreate}
          onClose={() => setShowCustom(false)}
        />
      )}

      <div className="flex justify-between items-center pt-2">
        <div>
          {step !== "daily" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep(step === "weekly" ? "daily" : "weekly")}
              className="text-xs"
            >
              Back
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (step === "daily") setStep("weekly")
              else if (step === "weekly") setStep("milestones")
              else setStep("confirm")
            }}
            className="text-xs text-muted-foreground"
          >
            Skip
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (step === "daily") setStep("weekly")
              else if (step === "weekly") setStep("milestones")
              else setStep("confirm")
            }}
            className="text-xs"
          >
            Next <ChevronRight className="size-3 ml-1" />
          </Button>
        </div>
      </div>
    </div>
    </StepTransition>
  )
}

// ============================================================================
// Main V11ViewE Component — Timeline View
// ============================================================================

export function V11ViewE(props: V11ViewProps) {
  const { goals, templates, lifeAreas, isLoading } = props

  // UI state
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set())
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
  const [addingToSection, setAddingToSection] = useState<TimeGroup | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Set<TimeGroup>>(new Set())

  // Derived data
  const activeGoals = useMemo(
    () => goals.filter((g) => !g.is_archived),
    [goals]
  )

  const groupedGoals = useMemo(
    () => groupByTimeHorizon(activeGoals),
    [activeGoals]
  )

  // Clean stale collapsed sections when a section becomes empty
  useEffect(() => {
    setCollapsedSections((prev) => {
      let changed = false
      const next = new Set(prev)
      for (const group of prev) {
        const sectionGoals = groupedGoals[group]
        if (!sectionGoals || sectionGoals.filter((g) => !g.is_archived).length === 0) {
          next.delete(group)
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [groupedGoals])

  // Summary stats for header and progress banner
  const headerStats = useMemo(() => {
    const todayGoals = groupedGoals["today"]
    const todayComplete = todayGoals.filter((g) => g.is_complete).length
    const totalComplete = activeGoals.filter((g) => g.is_complete).length
    const milestonesInProgress = activeGoals.filter(
      (g) => g.goal_type === "milestone" && !g.is_complete
    ).length
    const distinctLifeAreas = new Set(
      activeGoals.filter((g) => !g.is_complete).map((g) => g.life_area).filter(Boolean)
    ).size
    return {
      todayComplete,
      todayTotal: todayGoals.length,
      totalComplete,
      totalGoals: activeGoals.length,
      milestonesInProgress,
      distinctLifeAreas,
    }
  }, [groupedGoals, activeGoals])

  const existingTemplateIds = useMemo(
    () => new Set(goals.map((g) => g.template_id).filter(Boolean) as string[]),
    [goals]
  )

  // Handlers
  const toggleExpand = useCallback((goalId: string) => {
    setExpandedGoals((prev) => {
      const next = new Set(prev)
      next.has(goalId) ? next.delete(goalId) : next.add(goalId)
      return next
    })
  }, [])

  const handleStartEdit = useCallback((goalId: string) => {
    setEditingGoalId(goalId)
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditingGoalId(null)
  }, [])

  const handleAddToSection = useCallback((group: TimeGroup) => {
    // Also expand the section if it's collapsed when adding
    setCollapsedSections((prev) => {
      if (prev.has(group)) {
        const next = new Set(prev)
        next.delete(group)
        return next
      }
      return prev
    })
    setAddingToSection((prev) => (prev === group ? null : group))
  }, [])

  const toggleSectionCollapse = useCallback((group: TimeGroup) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      next.has(group) ? next.delete(group) : next.add(group)
      return next
    })
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Empty state -> onboarding
  if (activeGoals.length === 0) {
    return (
      <TimelineOnboarding
        templates={templates}
        lifeAreas={lifeAreas}
        onBatchCreate={props.onBatchCreate}
        onCreate={props.onCreate}
        onCelebrate={props.onCelebrate}
      />
    )
  }

  // Main timeline view
  return (
    <div className="space-y-6">
      {/* Header — minimal, temporal */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sunrise className="size-5 text-muted-foreground" />
          <div>
            <h1 className="text-lg font-bold">Timeline</h1>
            {headerStats.todayTotal > 0 ? (
              <p className="text-xs text-muted-foreground">
                {headerStats.todayComplete}/{headerStats.todayTotal} done today
                {headerStats.totalGoals > headerStats.todayTotal && (
                  <span className="ml-1 text-muted-foreground/60">
                    &middot; {headerStats.totalComplete}/{headerStats.totalGoals} overall
                  </span>
                )}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {headerStats.totalComplete}/{headerStats.totalGoals} goals completed
              </p>
            )}
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={() => setAddingToSection(addingToSection ? null : "today")}
        >
          <Plus className="size-3 mr-1" /> Add Goal
        </Button>
      </div>

      {/* Progress summary banner */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 rounded-lg bg-muted/20 border border-border/30 text-xs text-muted-foreground">
        <span>
          <span className="font-semibold text-foreground">{headerStats.totalComplete}</span> of{" "}
          <span className="font-semibold text-foreground">{headerStats.totalGoals}</span> goals complete
        </span>
        {headerStats.todayTotal > 0 && (
          <>
            <span className="text-border/60 hidden sm:inline">|</span>
            <span>
              <span className="font-semibold text-foreground">{headerStats.todayComplete}</span> daily goals done today
            </span>
          </>
        )}
        {headerStats.milestonesInProgress > 0 && (
          <>
            <span className="text-border/60 hidden sm:inline">|</span>
            <span>
              <span className="font-semibold text-foreground">{headerStats.milestonesInProgress}</span>{" "}
              {headerStats.milestonesInProgress === 1 ? "milestone" : "milestones"} in progress
            </span>
          </>
        )}
        {headerStats.distinctLifeAreas > 0 && (
          <>
            <span className="text-border/60 hidden sm:inline">|</span>
            <span>
              across <span className="font-semibold text-foreground">{headerStats.distinctLifeAreas}</span>{" "}
              {headerStats.distinctLifeAreas === 1 ? "area" : "areas"}
            </span>
          </>
        )}
      </div>

      {/* Timeline sections — only render non-empty groups, with connector info */}
      {(() => {
        const nonEmptyGroups = TIME_GROUP_ORDER.filter(
          (k) => groupedGoals[k].filter((g) => !g.is_archived).length > 0
        )
        return nonEmptyGroups.map((groupKey, idx) => (
          <TimeSection
            key={groupKey}
            groupKey={groupKey}
            goals={groupedGoals[groupKey]}
            props={props}
            expandedGoals={expandedGoals}
            onToggleExpand={toggleExpand}
            editingGoalId={editingGoalId}
            onStartEdit={handleStartEdit}
            onCancelEdit={handleCancelEdit}
            onAddToSection={handleAddToSection}
            isFirst={idx === 0}
            isLast={idx === nonEmptyGroups.length - 1}
            isSectionCollapsed={collapsedSections.has(groupKey)}
            onToggleSectionCollapse={() => toggleSectionCollapse(groupKey)}
            isAddingHere={addingToSection === groupKey}
            lifeAreas={lifeAreas}
            onCreate={props.onCreate}
            onCloseCreator={() => setAddingToSection(null)}
          />
        ))
      })()}

      {/* If all sections are empty (all archived somehow) */}
      {TIME_GROUP_ORDER.every((k) => groupedGoals[k].filter((g) => !g.is_archived).length === 0) && (
        <div className="text-center py-12 text-sm text-muted-foreground">
          No active goals. Add one to start your timeline.
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-center gap-3 pt-2 pb-2">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-xs text-muted-foreground"
          onClick={() => props.onRefresh()}
        >
          <RotateCcw className="size-3 mr-1" /> Refresh
        </Button>
      </div>
    </div>
  )
}
