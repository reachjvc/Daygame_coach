"use client"

import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import {
  Plus,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Search,
  Trash2,
  Archive,
  Pencil,
  X,
  Flame,
  Loader2,
  Rocket,
  Star,
  RotateCcw,
  Target,
  TrendingUp,
  Clock,
  BarChart3,
  Columns3,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { getLifeAreaConfig } from "../../data/lifeAreas"
import type { V11ViewProps } from "./V11ViewProps"
import type {
  GoalWithProgress,
  GoalTemplate,
  UserGoalInsert,
  LifeAreaConfig,
} from "../../types"

// ============================================================================
// Types
// ============================================================================

type Screen =
  | { kind: "main" }
  | { kind: "onboarding" }
  | { kind: "browse"; lifeArea?: string }
  | { kind: "create-custom" }
  | { kind: "edit"; goalId: string }

/** Kanban column definition */
interface KanbanColumn {
  id: "backlog" | "in-progress" | "almost-done" | "done"
  label: string
  description: string
}

const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: "backlog", label: "Backlog", description: "Not started" },
  { id: "in-progress", label: "In Progress", description: "1-74%" },
  { id: "almost-done", label: "Almost Done", description: "75-99%" },
  { id: "done", label: "Done", description: "Complete" },
]

// ============================================================================
// Helpers
// ============================================================================

function periodLabel(period: string): string {
  switch (period) {
    case "daily": return "day"
    case "weekly": return "week"
    case "monthly": return "month"
    case "quarterly": return "quarter"
    case "yearly": return "year"
    default: return period
  }
}

function goalTypeLabel(gt: string): string {
  switch (gt) {
    case "recurring": return "Recurring"
    case "milestone": return "Milestone"
    case "habit_ramp": return "Habit Ramp"
    default: return gt
  }
}

function levelLabel(level: number | null): string {
  switch (level) {
    case 0: return "Dream"
    case 1: return "Major Goal"
    case 2: return "Achievement"
    case 3: return "Skill Goal"
    default: return "Goal"
  }
}

/** Classify a goal into a kanban column */
function getColumnId(goal: GoalWithProgress): KanbanColumn["id"] {
  if (goal.is_complete) return "done"
  if (goal.progress_percentage >= 75) return "almost-done"
  if (goal.progress_percentage >= 1) return "in-progress"
  return "backlog"
}

/** Column accent color for headers/borders */
function getColumnAccent(colId: KanbanColumn["id"]): string {
  switch (colId) {
    case "backlog": return "text-zinc-400"
    case "in-progress": return "text-blue-400"
    case "almost-done": return "text-amber-400"
    case "done": return "text-emerald-400"
  }
}

function getColumnBorderAccent(colId: KanbanColumn["id"]): string {
  switch (colId) {
    case "backlog": return "border-zinc-500/20"
    case "in-progress": return "border-blue-500/20"
    case "almost-done": return "border-amber-500/20"
    case "done": return "border-emerald-500/20"
  }
}

function getColumnBgAccent(colId: KanbanColumn["id"]): string {
  switch (colId) {
    case "backlog": return "bg-zinc-500/5"
    case "in-progress": return "bg-blue-500/5"
    case "almost-done": return "bg-amber-500/5"
    case "done": return "bg-emerald-500/5"
  }
}

/** Solid top border color for column header visual indicator */
function getColumnTopBorder(colId: KanbanColumn["id"]): string {
  switch (colId) {
    case "backlog": return "border-t-zinc-500/40"
    case "in-progress": return "border-t-blue-500/60"
    case "almost-done": return "border-t-amber-500/60"
    case "done": return "border-t-emerald-500/60"
  }
}

/** Colored underline for mobile active tab */
function getColumnUnderlineColor(colId: KanbanColumn["id"]): string {
  switch (colId) {
    case "backlog": return "border-b-zinc-400"
    case "in-progress": return "border-b-blue-400"
    case "almost-done": return "border-b-amber-400"
    case "done": return "border-b-emerald-400"
  }
}

/** Contextual empty-column messages */
function getEmptyColumnMessage(colId: KanbanColumn["id"]): string {
  switch (colId) {
    case "backlog": return "No goals waiting \u2014 add some!"
    case "in-progress": return "Start working on a backlog goal"
    case "almost-done": return "Keep pushing \u2014 goals will appear here at 75%+"
    case "done": return "Complete a goal to see it here"
  }
}

/** Column summary stat line for the header */
function getColumnSummary(colId: KanbanColumn["id"], goals: GoalWithProgress[]): string {
  if (goals.length === 0) return ""
  switch (colId) {
    case "backlog":
      return `${goals.length} goal${goals.length === 1 ? "" : "s"} waiting`
    case "in-progress": {
      const avg = Math.round(goals.reduce((s, g) => s + g.progress_percentage, 0) / goals.length)
      return `avg ${avg}%`
    }
    case "almost-done":
      return `${goals.length} almost there`
    case "done":
      return `${goals.length} completed`
  }
}

/** Sort order label for column header */
function getColumnSortLabel(colId: KanbanColumn["id"]): string {
  switch (colId) {
    case "backlog": return "by newest"
    case "in-progress": return "by progress"
    case "almost-done": return "by progress"
    case "done": return "by recent"
  }
}

/** Icon component for goal type */
function GoalTypeIcon({ goalType }: { goalType: string }) {
  switch (goalType) {
    case "milestone":
      return <Target className="w-3 h-3 text-muted-foreground/60" />
    case "habit_ramp":
      return <TrendingUp className="w-3 h-3 text-muted-foreground/60" />
    case "recurring":
      return <RotateCcw className="w-3 h-3 text-muted-foreground/60" />
    default:
      return null
  }
}

/** Expanded card accent border */
function getColumnExpandBorder(colId: KanbanColumn["id"]): string {
  switch (colId) {
    case "backlog": return "border-zinc-400/30"
    case "in-progress": return "border-blue-400/30"
    case "almost-done": return "border-amber-400/30"
    case "done": return "border-emerald-400/30"
  }
}

// ============================================================================
// Sub-Components
// ============================================================================

/** Compact progress bar */
function MiniProgressBar({ pct, hex }: { pct: number; hex: string }) {
  return (
    <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{ width: `${Math.min(100, pct)}%`, backgroundColor: hex }}
      />
    </div>
  )
}

/** Streak badge with flame */
function StreakBadge({ streak }: { streak: number }) {
  if (streak <= 0) return null
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] text-orange-400 font-medium">
      <Flame className="w-2.5 h-2.5" />
      {streak}
    </span>
  )
}

/** Prominent reset button for completed recurring goals */
function ResetButton({
  goalId,
  props,
}: {
  goalId: string
  props: V11ViewProps
}) {
  const [busy, setBusy] = useState(false)

  const handleReset = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setBusy(true)
    try {
      await props.onReset(goalId)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      onClick={handleReset}
      disabled={busy}
      className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-medium hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-colors disabled:opacity-50"
    >
      {busy ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <>
          <RotateCcw className="w-3 h-3" />
          Reset for Next Period
        </>
      )}
    </button>
  )
}

/** Animated count badge -- pulses on value change */
function AnimatedCountBadge({
  count,
  isActive,
}: {
  count: number
  isActive?: boolean
}) {
  const prevCountRef = useRef(count)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    if (prevCountRef.current !== count) {
      prevCountRef.current = count
      setAnimating(true)
      const timer = setTimeout(() => setAnimating(false), 300)
      return () => clearTimeout(timer)
    }
  }, [count])

  return (
    <span
      className={`text-[10px] font-medium rounded-full px-1.5 py-0.5 transition-all duration-300 tabular-nums ${
        animating ? "scale-125" : "scale-100"
      } ${
        isActive ?? (count > 0)
          ? "bg-white/10 text-muted-foreground"
          : "bg-white/5 text-muted-foreground/60"
      }`}
      style={{ display: "inline-block", fontVariantNumeric: "tabular-nums" }}
    >
      {count}
    </span>
  )
}

// ============================================================================
// Goal Action Row -- progress controls for expanded card
// ============================================================================

function GoalActions({
  goal,
  props,
}: {
  goal: GoalWithProgress
  props: V11ViewProps
}) {
  const [directVal, setDirectVal] = useState("")
  const [busy, setBusy] = useState(false)
  const inputMode = props.getInputMode(goal)

  const handleIncrement = async (amount: number) => {
    setBusy(true)
    try {
      await props.onIncrement(goal.id, amount)
      if (goal.current_value + amount >= goal.target_value && !goal.is_complete) {
        const tier = props.getCelebrationTier(goal)
        props.onCelebrate(tier, goal.title)
      }
    } finally {
      setBusy(false)
    }
  }

  const handleSetValue = async () => {
    const v = Number(directVal)
    if (isNaN(v) || v < 0) return
    setBusy(true)
    try {
      await props.onSetValue(goal.id, v)
      if (v >= goal.target_value && !goal.is_complete) {
        const tier = props.getCelebrationTier(goal)
        props.onCelebrate(tier, goal.title)
      }
      setDirectVal("")
    } finally {
      setBusy(false)
    }
  }

  const handleReset = async () => {
    setBusy(true)
    try {
      await props.onReset(goal.id)
    } finally {
      setBusy(false)
    }
  }

  if (goal.is_complete) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-xs">
            <Check className="w-3 h-3 mr-1" /> Done
          </Badge>
        </div>
        {goal.goal_type === "recurring" && (
          <button
            onClick={handleReset}
            disabled={busy}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-medium hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-colors disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <RotateCcw className="w-3 h-3" />
                Reset for Next Period
              </>
            )}
          </button>
        )}
      </div>
    )
  }

  if (inputMode === "boolean") {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-7 px-3 text-xs"
        onClick={() => handleIncrement(1)}
        disabled={busy}
      >
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
        Mark Done
      </Button>
    )
  }

  if (inputMode === "direct-entry") {
    return (
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          placeholder="Value"
          value={directVal}
          onChange={(e) => setDirectVal(e.target.value)}
          className="h-7 w-20 text-xs bg-white/5 border-white/10"
          onKeyDown={(e) => e.key === "Enter" && handleSetValue()}
        />
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={handleSetValue}
          disabled={busy || !directVal}
        >
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : "Set"}
        </Button>
      </div>
    )
  }

  // buttons mode
  const increments = props.getButtonIncrements(goal.target_value)
  return (
    <div className="flex items-center gap-1">
      {increments.map((amt) => (
        <Button
          key={amt}
          variant="outline"
          size="sm"
          className="h-7 min-w-[2rem] px-2 text-xs"
          onClick={() => handleIncrement(amt)}
          disabled={busy}
        >
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : `+${amt}`}
        </Button>
      ))}
    </div>
  )
}

// ============================================================================
// Kanban Card -- compact card for within a column
// ============================================================================

function KanbanCard({
  goal,
  props,
  isExpanded,
  onToggleExpand,
  onEdit,
  justMoved,
  columnId,
}: {
  goal: GoalWithProgress
  props: V11ViewProps
  isExpanded: boolean
  onToggleExpand: () => void
  onEdit: () => void
  justMoved?: boolean
  columnId?: KanbanColumn["id"]
}) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  const la = getLifeAreaConfig(goal.life_area)
  const milestone = props.getNextMilestoneInfo(goal)
  const projected = props.getProjectedDate(goal)

  const handleArchive = async () => {
    setActionBusy(true)
    try {
      await props.onArchive(goal.id)
    } finally {
      setActionBusy(false)
    }
  }

  const handleDelete = async () => {
    setActionBusy(true)
    try {
      await props.onDelete(goal.id)
    } finally {
      setActionBusy(false)
      setShowConfirmDelete(false)
    }
  }

  const expandBorder = isExpanded && columnId ? getColumnExpandBorder(columnId) : ""

  return (
    <div
      className={`rounded-lg border bg-white/[0.02] transition-all duration-200 ${
        justMoved ? "animate-kanban-pulse ring-1 ring-white/20" : ""
      } ${
        isExpanded
          ? `${expandBorder || "border-white/[0.12]"} bg-white/[0.04] shadow-lg shadow-black/20`
          : "border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1]"
      }`}
    >
      {/* Card face -- always visible */}
      <button
        className="w-full text-left"
        onClick={onToggleExpand}
      >
        <div className="flex gap-2 p-2.5">
          {/* Life area color stripe */}
          <div
            className="w-1 shrink-0 rounded-full self-stretch"
            style={{ backgroundColor: la.hex }}
          />

          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Title row */}
            <div className="flex items-start justify-between gap-1.5">
              <div className="flex items-start gap-1.5 min-w-0">
                <GoalTypeIcon goalType={goal.goal_type} />
                <span
                  className={`text-sm font-medium leading-tight ${
                    goal.is_complete
                      ? "line-through text-muted-foreground"
                      : "text-foreground"
                  }`}
                >
                  {goal.title}
                </span>
              </div>
              <StreakBadge streak={goal.current_streak} />
            </div>

            {/* Progress info */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">
                {goal.current_value}/{goal.target_value}
              </span>
              <span className="text-[10px] text-muted-foreground/60">
                {goal.progress_percentage}%
              </span>
            </div>

            {/* Mini progress bar */}
            <MiniProgressBar pct={goal.progress_percentage} hex={la.hex} />
          </div>
        </div>
      </button>

      {/* Prominent reset button for completed recurring goals -- visible without expanding */}
      {goal.is_complete && goal.goal_type === "recurring" && !isExpanded && (
        <div className="px-2.5 pb-2 -mt-0.5">
          <ResetButton goalId={goal.id} props={props} />
        </div>
      )}

      {/* Expanded panel -- progress controls, info, management */}
      {isExpanded && (
        <div className="border-t border-white/[0.06] px-3 pb-3 pt-2.5 space-y-3">
          {/* Progress controls */}
          <div>
            <GoalActions goal={goal} props={props} />
          </div>

          {/* Detail grid */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>Type</span>
            <span className="text-foreground">{goalTypeLabel(goal.goal_type)}</span>
            <span>Level</span>
            <span className="text-foreground">{levelLabel(goal.goal_level)}</span>
            <span>Period</span>
            <span className="text-foreground capitalize">{periodLabel(goal.period)}</span>
            {goal.goal_nature && (
              <>
                <span>Nature</span>
                <span className="text-foreground capitalize">{goal.goal_nature}</span>
              </>
            )}
            {goal.current_streak > 0 && (
              <>
                <span>Streak</span>
                <span className="text-foreground">{goal.current_streak} (best: {goal.best_streak})</span>
              </>
            )}
            {milestone && (
              <>
                <span>Next milestone</span>
                <span className="text-foreground">{milestone.nextValue} ({milestone.remaining} to go)</span>
              </>
            )}
            {projected?.nextLabel && (
              <>
                <span>Projected</span>
                <span className="text-foreground">{projected.nextLabel}</span>
              </>
            )}
            {projected?.finalLabel && (
              <>
                <span>Final target</span>
                <span className="text-foreground">{projected.finalLabel}</span>
              </>
            )}
            {goal.days_remaining !== null && (
              <>
                <span>Days left</span>
                <span className={`font-medium ${
                  goal.days_remaining <= 3
                    ? "text-rose-400"
                    : goal.days_remaining <= 7
                      ? "text-amber-400"
                      : "text-foreground"
                }`}>
                  {goal.days_remaining <= 0 ? (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Overdue
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      {goal.days_remaining <= 3 && <Clock className="w-3 h-3" />}
                      {goal.days_remaining} day{goal.days_remaining !== 1 ? "s" : ""}
                    </span>
                  )}
                </span>
              </>
            )}
          </div>

          {/* Motivation note -- displayed below grid as a standalone italic quote */}
          {goal.motivation_note && (
            <p className="text-xs italic text-muted-foreground/70 pl-0.5 leading-relaxed">
              &ldquo;{goal.motivation_note}&rdquo;
            </p>
          )}

          {/* Management buttons */}
          <div className="flex items-center gap-1.5 pt-1 border-t border-white/[0.04]">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={onEdit}
            >
              <Pencil className="w-3 h-3 mr-1" /> Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={handleArchive}
              disabled={actionBusy}
            >
              <Archive className="w-3 h-3 mr-1" /> Archive
            </Button>
            {!showConfirmDelete ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px] text-muted-foreground hover:text-rose-400"
                onClick={() => setShowConfirmDelete(true)}
              >
                <Trash2 className="w-3 h-3 mr-1" /> Delete
              </Button>
            ) : (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px] text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                  onClick={handleDelete}
                  disabled={actionBusy}
                >
                  {actionBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirm"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px] text-muted-foreground"
                  onClick={() => setShowConfirmDelete(false)}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Kanban Column Component
// ============================================================================

function KanbanColumnView({
  column,
  goals,
  props,
  expandedGoalId,
  onToggleExpand,
  onEdit,
  onAddGoal,
  movedGoalIds,
}: {
  column: KanbanColumn
  goals: GoalWithProgress[]
  props: V11ViewProps
  expandedGoalId: string | null
  onToggleExpand: (goalId: string) => void
  onEdit: (goalId: string) => void
  onAddGoal?: () => void
  movedGoalIds?: Set<string>
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [hasOverflow, setHasOverflow] = useState(false)

  // Detect overflow for fade gradient indicator
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const check = () => {
      const isOverflowing = el.scrollHeight > el.clientHeight
      const isNotScrolledToBottom = el.scrollTop + el.clientHeight < el.scrollHeight - 4
      setHasOverflow(isOverflowing && isNotScrolledToBottom)
    }
    check()
    el.addEventListener("scroll", check, { passive: true })
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", check)
      ro.disconnect()
    }
  }, [goals.length])

  const summary = getColumnSummary(column.id, goals)

  return (
    <div
      className={`flex flex-col rounded-xl border border-t-2 ${getColumnTopBorder(column.id)} ${getColumnBorderAccent(column.id)} ${getColumnBgAccent(column.id)} w-full flex-1`}
    >
      {/* Column header */}
      <div className="px-3 py-2.5 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold uppercase tracking-wider ${getColumnAccent(column.id)}`}>
              {column.label}
            </span>
            <AnimatedCountBadge count={goals.length} isActive={goals.length > 0} />
          </div>
          {onAddGoal && (
            <button
              onClick={onAddGoal}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
              title="Add goal"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {/* Summary stat line */}
        {summary && (
          <div className="text-[10px] text-muted-foreground/50 mt-0.5">{summary}</div>
        )}
        {/* Sort indicator */}
        {goals.length > 1 && (
          <div className="text-[9px] text-muted-foreground/30 mt-0.5">{getColumnSortLabel(column.id)}</div>
        )}
      </div>

      {/* Cards area -- independently scrollable with overflow fade */}
      <div className="relative flex-1">
        <div
          ref={scrollRef}
          className="overflow-y-auto p-2 space-y-2 min-h-[120px] max-h-[calc(100vh-220px)]"
        >
          {goals.map((goal) => (
            <KanbanCard
              key={goal.id}
              goal={goal}
              props={props}
              isExpanded={expandedGoalId === goal.id}
              onToggleExpand={() => onToggleExpand(goal.id)}
              onEdit={() => onEdit(goal.id)}
              justMoved={movedGoalIds?.has(goal.id)}
              columnId={column.id}
            />
          ))}

          {/* Contextual empty column message */}
          {goals.length === 0 && (
            <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/40 italic text-center px-3">
              {getEmptyColumnMessage(column.id)}
            </div>
          )}

          {/* Quick-add button at bottom of every column */}
          {onAddGoal && (
            <button
              onClick={onAddGoal}
              className="w-full py-2 rounded-lg border border-dashed border-white/[0.06] text-muted-foreground/40 hover:text-muted-foreground hover:border-white/15 transition-colors flex items-center justify-center gap-1 text-[11px]"
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          )}
        </div>

        {/* Fade gradient overflow indicator */}
        {hasOverflow && (
          <div className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none rounded-b-xl bg-gradient-to-t from-black/40 to-transparent" />
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Mobile Tab Switcher -- swipeable column tabs for small screens
// ============================================================================

function MobileTabBar({
  columns,
  columnCounts,
  activeTab,
  onTabChange,
}: {
  columns: KanbanColumn[]
  columnCounts: Record<string, number>
  activeTab: KanbanColumn["id"]
  onTabChange: (id: KanbanColumn["id"]) => void
}) {
  return (
    <div className="flex border-b border-white/[0.06] overflow-x-auto">
      {columns.map((col) => {
        const isActive = activeTab === col.id
        const count = columnCounts[col.id] ?? 0
        return (
          <button
            key={col.id}
            onClick={() => onTabChange(col.id)}
            className={`flex-1 min-w-0 px-3 py-2.5 text-center transition-all duration-200 border-b-2 ${
              isActive
                ? `${getColumnAccent(col.id)} ${getColumnUnderlineColor(col.id)}`
                : "text-muted-foreground border-transparent hover:text-foreground hover:border-white/10"
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider truncate">
                {col.label}
              </span>
              <AnimatedCountBadge count={count} isActive={isActive && count > 0} />
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ============================================================================
// Onboarding Screen
// ============================================================================

function OnboardingScreen({
  props,
  onDone,
}: {
  props: V11ViewProps
  onDone: () => void
}) {
  const [selectedAreas, setSelectedAreas] = useState<Set<string>>(new Set(["daygame"]))
  const [step, setStep] = useState<"areas" | "goals" | "confirm">("areas")
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  const toggleArea = (id: string) => {
    setSelectedAreas((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleTemplate = (id: string) => {
    setSelectedTemplateIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const areaTemplates = useMemo(() => {
    const filtered = props.templates.filter(
      (t) => selectedAreas.has(t.lifeArea) && (t.level === 2 || t.level === 3)
    )
    const grouped: Record<string, GoalTemplate[]> = {}
    for (const t of filtered) {
      if (!grouped[t.lifeArea]) grouped[t.lifeArea] = []
      grouped[t.lifeArea].push(t)
    }
    return grouped
  }, [props.templates, selectedAreas])

  const enterGoalsStep = () => {
    const coreIds = new Set<string>()
    for (const templates of Object.values(areaTemplates)) {
      for (const t of templates) {
        if (t.priority === "core") coreIds.add(t.id)
      }
    }
    setSelectedTemplateIds(coreIds)
    setStep("goals")
  }

  const handleCreate = async () => {
    setBusy(true)
    try {
      const inserts = [...selectedTemplateIds]
        .map((id) => props.templates.find((t) => t.id === id))
        .filter((t): t is GoalTemplate => !!t)
        .map((template, i) => ({
          title: template.title,
          life_area: template.lifeArea,
          category: template.lifeArea,
          goal_type: template.templateType === "milestone_ladder"
            ? "milestone" as const
            : template.templateType === "habit_ramp"
              ? "habit_ramp" as const
              : "recurring" as const,
          goal_nature: template.nature,
          goal_level: template.level,
          display_category: template.displayCategory,
          tracking_type: "counter" as const,
          period: "weekly" as const,
          target_value:
            template.defaultMilestoneConfig?.target ??
            template.defaultRampSteps?.[0]?.frequencyPerWeek ??
            1,
          template_id: template.id,
          linked_metric: template.linkedMetric,
          milestone_config: template.defaultMilestoneConfig as Record<string, unknown> | null,
          ramp_steps: template.defaultRampSteps as unknown as Record<string, unknown>[] | null,
          _tempId: `__temp_onboard_${i}`,
          _tempParentId: null,
        }))

      if (inserts.length > 0) {
        await props.onBatchCreate(inserts)
      }
      onDone()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mx-auto">
          <Rocket className="w-6 h-6 text-indigo-400" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Plan Your Journey</h2>
        <p className="text-sm text-muted-foreground">
          {step === "areas" && "Choose the areas of life you want to focus on."}
          {step === "goals" && "Pick the goals you want to start with. Core goals are pre-selected."}
          {step === "confirm" && `Ready to create ${selectedTemplateIds.size} goals. Let's go.`}
        </p>
      </div>

      {/* Kanban concept intro -- explain the 4-column flow */}
      {step === "areas" && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            Goals move through columns as you make progress. Track your journey from Backlog to Done.
          </p>
          <div className="flex items-center justify-center gap-2">
            {KANBAN_COLUMNS.map((col, i) => (
              <div key={col.id} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getColumnBgAccent(col.id)} border ${getColumnBorderAccent(col.id)}`}>
                    {col.id === "backlog" && <Columns3 className={`w-4 h-4 ${getColumnAccent(col.id)}`} />}
                    {col.id === "in-progress" && <TrendingUp className={`w-4 h-4 ${getColumnAccent(col.id)}`} />}
                    {col.id === "almost-done" && <Flame className={`w-4 h-4 ${getColumnAccent(col.id)}`} />}
                    {col.id === "done" && <Check className={`w-4 h-4 ${getColumnAccent(col.id)}`} />}
                  </div>
                  <span className={`text-[9px] font-medium ${getColumnAccent(col.id)}`}>
                    {col.label}
                  </span>
                </div>
                {i < KANBAN_COLUMNS.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-muted-foreground/30 -mt-3" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Steps indicator */}
      <div className="flex items-center justify-center gap-2">
        {(["areas", "goals", "confirm"] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border transition-colors ${
                step === s
                  ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                  : i < (["areas", "goals", "confirm"] as const).indexOf(step)
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                    : "border-white/10 text-muted-foreground"
              }`}
            >
              {i < (["areas", "goals", "confirm"] as const).indexOf(step) ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                i + 1
              )}
            </div>
            {i < 2 && <div className="w-8 h-px bg-white/10" />}
          </div>
        ))}
      </div>

      {/* Step: Areas */}
      {step === "areas" && (
        <div className="space-y-3">
          {props.lifeAreas
            .filter((la) => la.id !== "custom")
            .map((la) => {
              const Icon = la.icon
              const selected = selectedAreas.has(la.id)
              return (
                <button
                  key={la.id}
                  onClick={() => toggleArea(la.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
                    selected
                      ? "border-white/20 bg-white/[0.04]"
                      : "border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.03]"
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: la.hex + "1a" }}
                  >
                    <Icon className="w-4 h-4" style={{ color: la.hex }} />
                  </div>
                  <span className="flex-1 text-sm text-left font-medium text-foreground">
                    {la.name}
                  </span>
                  <div
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      selected ? "border-indigo-500 bg-indigo-500" : "border-white/20"
                    }`}
                  >
                    {selected && <Check className="w-3 h-3 text-white" />}
                  </div>
                </button>
              )
            })}
          <Button
            className="w-full mt-4"
            onClick={enterGoalsStep}
            disabled={selectedAreas.size === 0}
          >
            Choose Goals <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Step: Goals */}
      {step === "goals" && (
        <div className="space-y-4">
          {Object.entries(areaTemplates).map(([areaId, templates]) => {
            const la = getLifeAreaConfig(areaId)
            return (
              <div key={areaId} className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: la.hex }}>
                  {la.name}
                </h3>
                <div className="space-y-1">
                  {templates.map((t) => {
                    const selected = selectedTemplateIds.has(t.id)
                    return (
                      <button
                        key={t.id}
                        onClick={() => toggleTemplate(t.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-md border text-left transition-all text-sm ${
                          selected
                            ? "border-white/15 bg-white/[0.04]"
                            : "border-transparent hover:bg-white/[0.02]"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            selected ? "border-indigo-500 bg-indigo-500" : "border-white/20"
                          }`}
                        >
                          {selected && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className="flex-1 truncate text-foreground">{t.title}</span>
                        {t.priority === "core" && (
                          <Star className="w-3 h-3 text-yellow-500 shrink-0" />
                        )}
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 shrink-0">
                          L{t.level}
                        </Badge>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep("areas")}>
              Back
            </Button>
            <Button
              className="flex-1"
              onClick={() => setStep("confirm")}
              disabled={selectedTemplateIds.size === 0}
            >
              Review ({selectedTemplateIds.size}) <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step: Confirm */}
      {step === "confirm" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 space-y-2 max-h-64 overflow-y-auto">
            {[...selectedTemplateIds].map((id) => {
              const t = props.templates.find((tt) => tt.id === id)
              if (!t) return null
              const la = getLifeAreaConfig(t.lifeArea)
              return (
                <div key={id} className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: la.hex }} />
                  <span className="flex-1 truncate text-foreground">{t.title}</span>
                  <button
                    onClick={() => toggleTemplate(id)}
                    className="text-muted-foreground hover:text-rose-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep("goals")}>
              Back
            </Button>
            <Button className="flex-1" onClick={handleCreate} disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" /> Creating...
                </>
              ) : (
                <>Create {selectedTemplateIds.size} Goals</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Template Browser
// ============================================================================

function TemplateBrowser({
  props,
  initialLifeArea,
  onClose,
}: {
  props: V11ViewProps
  initialLifeArea?: string
  onClose: () => void
}) {
  const [search, setSearch] = useState("")
  const [areaFilter, setAreaFilter] = useState<string | null>(initialLifeArea ?? null)
  const [busy, setBusy] = useState<string | null>(null)

  const existingTemplateIds = useMemo(
    () => new Set(props.goals.map((g) => g.template_id).filter(Boolean)),
    [props.goals]
  )

  const filtered = useMemo(() => {
    return props.templates.filter((t) => {
      if (areaFilter && t.lifeArea !== areaFilter) return false
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [props.templates, areaFilter, search])

  const grouped = useMemo(() => {
    const map: Record<string, GoalTemplate[]> = {}
    for (const t of filtered) {
      const key = t.lifeArea
      if (!map[key]) map[key] = []
      map[key].push(t)
    }
    return map
  }, [filtered])

  const handleAdd = async (template: GoalTemplate) => {
    setBusy(template.id)
    try {
      const insert: UserGoalInsert = {
        title: template.title,
        life_area: template.lifeArea,
        category: template.lifeArea,
        goal_type: template.templateType === "milestone_ladder"
          ? "milestone"
          : template.templateType === "habit_ramp"
            ? "habit_ramp"
            : "recurring",
        goal_nature: template.nature,
        goal_level: template.level,
        display_category: template.displayCategory,
        tracking_type: "counter",
        period: "weekly",
        target_value:
          template.defaultMilestoneConfig?.target ??
          template.defaultRampSteps?.[0]?.frequencyPerWeek ??
          1,
        template_id: template.id,
        linked_metric: template.linkedMetric,
        milestone_config: template.defaultMilestoneConfig as Record<string, unknown> | null,
        ramp_steps: template.defaultRampSteps as unknown as Record<string, unknown>[] | null,
      }
      await props.onCreate(insert)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Goal Catalog</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm bg-white/5 border-white/10"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          <Button
            variant={areaFilter === null ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setAreaFilter(null)}
          >
            All
          </Button>
          {props.lifeAreas
            .filter((la) => la.id !== "custom")
            .map((la) => (
              <Button
                key={la.id}
                variant={areaFilter === la.id ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setAreaFilter(la.id)}
              >
                <div className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: la.hex }} />
                {la.name.split(" ")[0]}
              </Button>
            ))}
        </div>
      </div>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {Object.entries(grouped).map(([areaId, templates]) => {
          const la = getLifeAreaConfig(areaId)
          return (
            <div key={areaId} className="space-y-1.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider px-1" style={{ color: la.hex }}>
                {la.name} ({templates.length})
              </h3>
              {templates.map((t) => {
                const alreadyAdded = existingTemplateIds.has(t.id)
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-md border border-white/[0.04] hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-foreground truncate">{t.title}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                          L{t.level}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground capitalize">
                          {t.nature}
                        </span>
                        {t.templateType && (
                          <span className="text-[10px] text-muted-foreground">
                            {t.templateType === "milestone_ladder" ? "Milestone" : "Ramp"}
                          </span>
                        )}
                      </div>
                    </div>
                    {alreadyAdded ? (
                      <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">
                        Added
                      </Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs shrink-0"
                        onClick={() => handleAdd(t)}
                        disabled={busy === t.id}
                      >
                        {busy === t.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <Plus className="w-3 h-3 mr-1" /> Add
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
        {Object.keys(grouped).length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No templates match your search.
          </p>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Custom Goal Creator
// ============================================================================

function CustomGoalCreator({
  props,
  onClose,
}: {
  props: V11ViewProps
  onClose: () => void
}) {
  const [title, setTitle] = useState("")
  const [lifeArea, setLifeArea] = useState("daygame")
  const [target, setTarget] = useState("1")
  const [period, setPeriod] = useState<string>("weekly")
  const [goalType, setGoalType] = useState<string>("recurring")
  const [nature, setNature] = useState<string>("input")
  const [motivation, setMotivation] = useState("")
  const [busy, setBusy] = useState(false)

  const handleCreate = async () => {
    if (!title.trim()) return
    setBusy(true)
    try {
      await props.onCreate({
        title: title.trim(),
        life_area: lifeArea,
        category: lifeArea,
        goal_type: goalType as "recurring" | "milestone" | "habit_ramp",
        goal_nature: nature as "input" | "outcome",
        tracking_type: "counter",
        period: period as "daily" | "weekly" | "monthly" | "quarterly" | "yearly",
        target_value: Math.max(1, Number(target) || 1),
        motivation_note: motivation.trim() || null,
      })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Create Custom Goal</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Goal Title</label>
          <Input
            placeholder="e.g., Run 5km three times a week"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-white/5 border-white/10"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Life Area</label>
          <div className="flex gap-1.5 flex-wrap">
            {props.lifeAreas
              .filter((la) => la.id !== "custom")
              .map((la) => {
                const Icon = la.icon
                return (
                  <button
                    key={la.id}
                    onClick={() => setLifeArea(la.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs transition-all ${
                      lifeArea === la.id
                        ? "border-white/20 bg-white/[0.06]"
                        : "border-white/[0.06] hover:bg-white/[0.03]"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: la.hex }} />
                    {la.name.split(" ")[0]}
                  </button>
                )
              })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Target</label>
            <Input
              type="number"
              min={1}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="bg-white/5 border-white/10"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-white/10 bg-white/5 text-sm text-foreground"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Type</label>
            <select
              value={goalType}
              onChange={(e) => setGoalType(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-white/10 bg-white/5 text-sm text-foreground"
            >
              <option value="recurring">Recurring</option>
              <option value="milestone">Milestone</option>
              <option value="habit_ramp">Habit Ramp</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Nature</label>
            <select
              value={nature}
              onChange={(e) => setNature(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-white/10 bg-white/5 text-sm text-foreground"
            >
              <option value="input">Input (actions I take)</option>
              <option value="outcome">Outcome (results)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Motivation (optional)</label>
          <Input
            placeholder="Why does this matter to you?"
            value={motivation}
            onChange={(e) => setMotivation(e.target.value)}
            className="bg-white/5 border-white/10"
          />
        </div>

        <Button className="w-full" onClick={handleCreate} disabled={busy || !title.trim()}>
          {busy ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-1" /> Creating...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-1" /> Create Goal
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Goal Editor
// ============================================================================

function GoalEditor({
  goal,
  props,
  onClose,
}: {
  goal: GoalWithProgress
  props: V11ViewProps
  onClose: () => void
}) {
  const [title, setTitle] = useState(goal.title)
  const [target, setTarget] = useState(String(goal.target_value))
  const [period, setPeriod] = useState(goal.period)
  const [motivation, setMotivation] = useState(goal.motivation_note || "")
  const [lifeArea, setLifeArea] = useState(goal.life_area)
  const [busy, setBusy] = useState(false)

  const handleSave = async () => {
    setBusy(true)
    try {
      await props.onUpdate(goal.id, {
        title: title.trim(),
        target_value: Math.max(1, Number(target) || 1),
        period: period as "daily" | "weekly" | "monthly" | "quarterly" | "yearly",
        motivation_note: motivation.trim() || null,
        life_area: lifeArea,
        category: lifeArea,
      })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Edit Goal</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-white/5 border-white/10"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Life Area</label>
          <div className="flex gap-1.5 flex-wrap">
            {props.lifeAreas
              .filter((la) => la.id !== "custom")
              .map((la) => {
                const Icon = la.icon
                return (
                  <button
                    key={la.id}
                    onClick={() => setLifeArea(la.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs transition-all ${
                      lifeArea === la.id
                        ? "border-white/20 bg-white/[0.06]"
                        : "border-white/[0.06] hover:bg-white/[0.03]"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: la.hex }} />
                    {la.name.split(" ")[0]}
                  </button>
                )
              })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Target</label>
            <Input
              type="number"
              min={1}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="bg-white/5 border-white/10"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-white/10 bg-white/5 text-sm text-foreground"
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
          <label className="text-xs text-muted-foreground mb-1 block">Motivation</label>
          <Input
            placeholder="Why does this matter?"
            value={motivation}
            onChange={(e) => setMotivation(e.target.value)}
            className="bg-white/5 border-white/10"
          />
        </div>

        <Button className="w-full" onClick={handleSave} disabled={busy || !title.trim()}>
          {busy ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-1" /> Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Desktop Overview Stat Bar -- aggregate stats above kanban columns
// ============================================================================

function KanbanStatBar({
  activeGoals,
  columnGoals,
}: {
  activeGoals: GoalWithProgress[]
  columnGoals: Record<KanbanColumn["id"], GoalWithProgress[]>
}) {
  const totalActive = activeGoals.length
  const doneCount = columnGoals["done"].length
  const completionRate = totalActive > 0 ? Math.round((doneCount / totalActive) * 100) : 0

  const avgProgress = totalActive > 0
    ? Math.round(activeGoals.reduce((sum, g) => sum + g.progress_percentage, 0) / totalActive)
    : 0

  // Goals added this week (created within last 7 days)
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const addedThisWeek = activeGoals.filter(
    (g) => new Date(g.created_at).getTime() >= oneWeekAgo
  ).length

  const stats = [
    { label: "Active Goals", value: String(totalActive) },
    { label: "Completion", value: `${completionRate}%` },
    { label: "Avg Progress", value: `${avgProgress}%` },
    { label: "Added This Week", value: String(addedThisWeek) },
  ]

  return (
    <>
      {/* Mobile: compact single-row stat bar */}
      <div className="md:hidden px-4">
        <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5">
          {stats.map((stat, i) => (
            <div key={stat.label} className="flex items-center gap-3">
              {i > 0 && <div className="w-px h-3.5 bg-white/[0.06]" />}
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-semibold text-foreground tabular-nums">{stat.value}</span>
                <span className="text-[9px] text-muted-foreground/50">{stat.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: full stat bar */}
      <div className="hidden md:flex items-center gap-4 px-4">
        <div className="flex items-center gap-6 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-2.5 w-full">
          <BarChart3 className="w-4 h-4 text-muted-foreground/50 shrink-0" />
          {stats.map((stat, i) => (
            <div key={stat.label} className="flex items-center gap-4">
              {i > 0 && <div className="w-px h-5 bg-white/[0.06]" />}
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-semibold text-foreground tabular-nums">{stat.value}</span>
                <span className="text-[11px] text-muted-foreground/60">{stat.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ============================================================================
// Empty Kanban State -- 4 empty columns with CTA
// ============================================================================

function EmptyKanbanState({
  onAddGoal,
  onBrowse,
}: {
  onAddGoal: () => void
  onBrowse: () => void
}) {
  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="px-4 pt-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Kanban Board</h2>
      </div>

      {/* 4 empty columns */}
      <div className="px-4 overflow-x-auto">
        <div className="flex gap-3 min-w-min pb-4">
          {KANBAN_COLUMNS.map((col) => (
            <div
              key={col.id}
              className={`flex flex-col rounded-xl border ${getColumnBorderAccent(col.id)} ${getColumnBgAccent(col.id)} min-w-[220px] max-w-[260px] flex-1`}
            >
              <div className="px-3 py-2.5 border-b border-white/[0.06]">
                <span className={`text-xs font-semibold uppercase tracking-wider ${getColumnAccent(col.id)}`}>
                  {col.label}
                </span>
              </div>
              <div className="flex-1 flex items-center justify-center min-h-[160px] p-4">
                {col.id === "backlog" ? (
                  <div className="text-center space-y-3">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mx-auto">
                      <Plus className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">Add your first goals</p>
                      <p className="text-xs text-muted-foreground">Browse templates or create custom</p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Button size="sm" className="text-xs" onClick={onBrowse}>
                        <Search className="w-3 h-3 mr-1" /> Browse Catalog
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs" onClick={onAddGoal}>
                        <Plus className="w-3 h-3 mr-1" /> Custom Goal
                      </Button>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground/30 italic">
                    {col.description}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Main View -- Kanban Board
// ============================================================================

export function V11ViewD(props: V11ViewProps) {
  const [screen, setScreen] = useState<Screen>({ kind: "main" })
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null)
  const [mobileTab, setMobileTab] = useState<KanbanColumn["id"]>("in-progress")
  const [mobileTabKey, setMobileTabKey] = useState(0)
  const [movedGoalIds, setMovedGoalIds] = useState<Set<string>>(new Set())
  const [swipeHintDismissed, setSwipeHintDismissed] = useState(false)

  // Mobile swipe tracking
  const swipeRef = useRef<{ startX: number; startY: number } | null>(null)

  // Track previous column assignments to detect moves
  const prevColumnMapRef = useRef<Record<string, KanbanColumn["id"]>>({})

  // Active (non-archived) goals
  const activeGoals = useMemo(
    () => props.goals.filter((g) => !g.is_archived),
    [props.goals]
  )

  // Classify goals into kanban columns
  const columnGoals = useMemo(() => {
    const result: Record<KanbanColumn["id"], GoalWithProgress[]> = {
      "backlog": [],
      "in-progress": [],
      "almost-done": [],
      "done": [],
    }
    for (const goal of activeGoals) {
      const colId = getColumnId(goal)
      result[colId].push(goal)
    }
    // Intentional sorting per column:
    // Backlog: newest created first (recently added goals at top)
    result["backlog"].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    // In Progress: highest progress first (closest to advancing)
    result["in-progress"].sort((a, b) => b.progress_percentage - a.progress_percentage)
    // Almost Done: highest progress first (closest to completion)
    result["almost-done"].sort((a, b) => b.progress_percentage - a.progress_percentage)
    // Done: most recently completed first
    result["done"].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    return result
  }, [activeGoals])

  // Detect column moves and trigger pulse animation
  useEffect(() => {
    const currentMap: Record<string, KanbanColumn["id"]> = {}
    const newMoved = new Set<string>()

    for (const goal of activeGoals) {
      const colId = getColumnId(goal)
      currentMap[goal.id] = colId

      const prevCol = prevColumnMapRef.current[goal.id]
      if (prevCol && prevCol !== colId) {
        newMoved.add(goal.id)
      }
    }

    prevColumnMapRef.current = currentMap

    if (newMoved.size > 0) {
      setMovedGoalIds(newMoved)
      const timer = setTimeout(() => setMovedGoalIds(new Set()), 1500)
      return () => clearTimeout(timer)
    }
  }, [activeGoals])

  const columnCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const col of KANBAN_COLUMNS) {
      counts[col.id] = columnGoals[col.id].length
    }
    return counts
  }, [columnGoals])

  const handleToggleExpand = useCallback((goalId: string) => {
    setExpandedGoalId((prev) => (prev === goalId ? null : goalId))
  }, [])

  const handleEdit = useCallback((goalId: string) => {
    setScreen({ kind: "edit", goalId })
  }, [])

  const handleMobileTabChange = useCallback((id: KanbanColumn["id"]) => {
    setMobileTab(id)
    setMobileTabKey((k) => k + 1)
    // Collapse any expanded card when switching tabs
    setExpandedGoalId(null)
    // Dismiss swipe hint after first tab change
    setSwipeHintDismissed(true)
  }, [])

  // Loading state
  if (props.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Browse catalog
  if (screen.kind === "browse") {
    return (
      <div className="px-4 py-4">
        <TemplateBrowser
          props={props}
          initialLifeArea={screen.lifeArea}
          onClose={() => setScreen({ kind: "main" })}
        />
      </div>
    )
  }

  // Create custom goal
  if (screen.kind === "create-custom") {
    return (
      <div className="px-4 py-4 max-w-lg mx-auto">
        <CustomGoalCreator props={props} onClose={() => setScreen({ kind: "main" })} />
      </div>
    )
  }

  // Edit goal -- resolved here for modal overlay, rendered at end of main board
  const editGoal = screen.kind === "edit"
    ? props.goals.find((g) => g.id === screen.goalId) ?? null
    : null
  // If edit target no longer exists, fall back to main screen
  if (screen.kind === "edit" && !editGoal) {
    setScreen({ kind: "main" })
  }

  // Onboarding screen
  if (screen.kind === "onboarding") {
    return <OnboardingScreen props={props} onDone={() => setScreen({ kind: "main" })} />
  }

  // Empty state -- show empty kanban with CTA
  if (activeGoals.length === 0) {
    return (
      <EmptyKanbanState
        onAddGoal={() => setScreen({ kind: "create-custom" })}
        onBrowse={() => setScreen({ kind: "browse" })}
      />
    )
  }

  // ── MAIN KANBAN BOARD ────────────────────────────────────────────────────
  return (
    <div className="space-y-3 pb-8">
      {/* Header -- minimal: title + add goal button */}
      <div className="px-4 pt-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Kanban Board</h2>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setScreen({ kind: "browse" })}
          >
            <Search className="w-3 h-3 mr-1" /> Catalog
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={() => setScreen({ kind: "create-custom" })}
          >
            <Plus className="w-3 h-3 mr-1" /> Add Goal
          </Button>
        </div>
      </div>

      {/* Desktop overview stat bar */}
      <KanbanStatBar activeGoals={activeGoals} columnGoals={columnGoals} />

      {/* Desktop: horizontal kanban columns (hidden on mobile) */}
      <div className="hidden md:block px-4">
        <div className="grid grid-cols-4 gap-3" style={{ minHeight: "calc(100vh - 200px)" }}>
          {KANBAN_COLUMNS.map((col) => (
            <KanbanColumnView
              key={col.id}
              column={col}
              goals={columnGoals[col.id]}
              props={props}
              expandedGoalId={expandedGoalId}
              onToggleExpand={handleToggleExpand}
              onEdit={handleEdit}
              onAddGoal={() => setScreen({ kind: "create-custom" })}
              movedGoalIds={movedGoalIds}
            />
          ))}
        </div>
      </div>

      {/* Mobile: tab-based column switcher (shown only on mobile) */}
      <div className="md:hidden">
        <MobileTabBar
          columns={KANBAN_COLUMNS}
          columnCounts={columnCounts}
          activeTab={mobileTab}
          onTabChange={handleMobileTabChange}
        />

        {/* Active column cards -- swipeable, key forces re-mount for fade-in animation */}
        <div
          key={mobileTabKey}
          className="px-4 pt-3 space-y-2 min-h-[60vh] animate-kanban-fade-in"
          onTouchStart={(e) => {
            const touch = e.touches[0]
            if (touch) swipeRef.current = { startX: touch.clientX, startY: touch.clientY }
          }}
          onTouchEnd={(e) => {
            const touch = e.changedTouches[0]
            if (!touch || !swipeRef.current) return
            const dx = touch.clientX - swipeRef.current.startX
            const dy = touch.clientY - swipeRef.current.startY
            swipeRef.current = null
            // Only trigger if horizontal swipe is dominant and >60px
            if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return
            const colIds = KANBAN_COLUMNS.map((c) => c.id)
            const idx = colIds.indexOf(mobileTab)
            if (dx < 0 && idx < colIds.length - 1) {
              handleMobileTabChange(colIds[idx + 1])
            } else if (dx > 0 && idx > 0) {
              handleMobileTabChange(colIds[idx - 1])
            }
          }}
        >
          {columnGoals[mobileTab].length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground/40 italic text-center px-4">
              {getEmptyColumnMessage(mobileTab)}
            </div>
          ) : (
            columnGoals[mobileTab].map((goal) => (
              <KanbanCard
                key={goal.id}
                goal={goal}
                props={props}
                isExpanded={expandedGoalId === goal.id}
                onToggleExpand={() => handleToggleExpand(goal.id)}
                onEdit={() => handleEdit(goal.id)}
                justMoved={movedGoalIds.has(goal.id)}
                columnId={mobileTab}
              />
            ))
          )}

          {/* Quick-add button in every mobile tab */}
          <button
            onClick={() => setScreen({ kind: "create-custom" })}
            className="w-full py-3 rounded-lg border border-dashed border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors flex items-center justify-center gap-1.5 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Goal
          </button>

          {/* Swipe hint -- shown only on first tab for discoverability */}
          {mobileTab === KANBAN_COLUMNS[0].id && !swipeHintDismissed && (
            <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground/30 pt-1">
              <ChevronRight className="w-3 h-3" />
              <span>Swipe left/right to switch columns</span>
            </div>
          )}
        </div>
      </div>

      {/* Edit goal modal overlay -- stays on top of kanban board */}
      {editGoal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => {
            // Close on backdrop click
            if (e.target === e.currentTarget) setScreen({ kind: "main" })
          }}
        >
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-white/[0.08] bg-zinc-900 shadow-2xl shadow-black/50 p-4">
            <GoalEditor goal={editGoal} props={props} onClose={() => setScreen({ kind: "main" })} />
          </div>
        </div>
      )}
    </div>
  )
}
