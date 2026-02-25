"use client"

import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import type { V11ViewProps } from "./V11ViewProps"
import type {
  GoalWithProgress,
  GoalTemplate,
  LifeAreaConfig,
  InputMode,
  UserGoalInsert,
} from "../../types"
import type { BatchGoalInsert } from "../../treeGenerationService"
import { getLifeAreaConfig } from "../../data/lifeAreas"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Plus,
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  Flame,
  TrendingUp,
  Archive,
  Trash2,
  Pencil,
  RotateCcw,
  Minus,
  Rocket,
  Loader2,
  SkipForward,
  Settings,
  List,
  Sunrise,
  PartyPopper,
  Trophy,
  Star,
} from "lucide-react"

// ============================================================================
// Types
// ============================================================================

type CheckInPhase = "checking" | "summary"
type ManagementPanel = "none" | "sidebar" | "catalog" | "create" | "edit"

interface EditingGoal {
  id: string
  title: string
  target_value: number
  period: string
  motivation_note: string
}

interface CustomGoalDraft {
  title: string
  lifeArea: string
  target_value: number
  period: string
  tracking_type: string
}

interface CheckInEntry {
  goalId: string
  action: "progressed" | "skipped"
  previousValue: number
  newValue: number
  /** True if this action caused the goal to cross its completion threshold */
  completedDuringCheckIn?: boolean
}

/** Tracks which celebrations fired during check-in for the summary screen */
interface CheckInCelebration {
  goalTitle: string
  tier: string
}

// ============================================================================
// Helpers
// ============================================================================

function getTimeHorizonLabel(period: string): string {
  switch (period) {
    case "daily": return "Daily"
    case "weekly": return "Weekly"
    case "monthly": return "Monthly"
    case "quarterly": return "Quarterly"
    case "yearly": return "Yearly"
    default: return period
  }
}

function getLevelLabel(level: number | null): string {
  switch (level) {
    case 0: return "Dream"
    case 1: return "Major"
    case 2: return "Achievement"
    case 3: return "Specific"
    default: return ""
  }
}

function getLevelColor(level: number | null): string {
  switch (level) {
    case 0: return "text-amber-400"
    case 1: return "text-purple-400"
    case 2: return "text-blue-400"
    case 3: return "text-emerald-400"
    default: return "text-muted-foreground"
  }
}

/** Sort goals for check-in: incomplete first, then by urgency */
function sortGoalsForCheckIn(goals: GoalWithProgress[]): GoalWithProgress[] {
  return [...goals].sort((a, b) => {
    // Completed goals always last
    if (a.is_complete !== b.is_complete) return a.is_complete ? 1 : -1
    // Recurring before milestones
    const aRecurring = a.goal_type === "recurring" || a.goal_type === "habit_ramp"
    const bRecurring = b.goal_type === "recurring" || b.goal_type === "habit_ramp"
    if (aRecurring !== bRecurring) return aRecurring ? -1 : 1
    // By days remaining (lowest first = most urgent)
    const aDays = a.days_remaining ?? 999
    const bDays = b.days_remaining ?? 999
    if (aDays !== bDays) return aDays - bDays
    // By lowest progress percentage
    if (a.progress_percentage !== b.progress_percentage) return a.progress_percentage - b.progress_percentage
    return 0
  })
}

// ============================================================================
// Sub-components
// ============================================================================

/** Large hero-style progress controls for a single goal during check-in */
function HeroProgressControls({
  goal,
  inputMode,
  buttonIncrements,
  onIncrement,
  onSetValue,
  onReset,
  onSkip,
}: {
  goal: GoalWithProgress
  inputMode: InputMode
  buttonIncrements: number[]
  onIncrement: (goalId: string, amount: number) => Promise<void>
  onSetValue: (goalId: string, value: number) => Promise<void>
  onReset: (goalId: string) => Promise<void>
  onSkip: () => void
}) {
  const [directValue, setDirectValue] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAction = useCallback(
    async (action: () => Promise<void>) => {
      setIsSubmitting(true)
      try {
        await action()
      } finally {
        setIsSubmitting(false)
      }
    },
    []
  )

  if (goal.is_complete) {
    return (
      <div className="flex flex-col items-center gap-3">
        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-sm px-4 py-1.5">
          <Check className="w-4 h-4 mr-1.5" /> Already completed
        </Badge>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleAction(() => onReset(goal.id))}
            disabled={isSubmitting}
            aria-label="Reset goal progress"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
          <Button variant="ghost" size="sm" onClick={onSkip} aria-label="Skip to next goal" className="text-xs gap-1">
            <SkipForward className="w-3.5 h-3.5" /> Next
          </Button>
        </div>
      </div>
    )
  }

  if (inputMode === "boolean") {
    return (
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={() => handleAction(() => onIncrement(goal.id, 1))}
          disabled={isSubmitting}
          aria-label="Mark goal as done"
          className="w-20 h-20 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all duration-200 disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          ) : (
            <Check className="w-8 h-8 text-muted-foreground" />
          )}
        </button>
        <span className="text-xs text-muted-foreground">Tap to mark done</span>
        <Button variant="ghost" size="sm" onClick={onSkip} aria-label="Skip this goal" className="text-xs gap-1 text-muted-foreground">
          <SkipForward className="w-3.5 h-3.5" /> Skip for now
        </Button>
      </div>
    )
  }

  if (inputMode === "direct-entry") {
    return (
      <div className="flex flex-col items-center gap-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const val = parseFloat(directValue)
            if (!isNaN(val) && val >= 0) {
              handleAction(() => onSetValue(goal.id, val))
              setDirectValue("")
            }
          }}
          className="flex items-center gap-3"
        >
          <Input
            type="number"
            placeholder={String(goal.target_value)}
            value={directValue}
            onChange={(e) => setDirectValue(e.target.value)}
            className="w-24 h-12 text-lg text-center px-3"
            aria-label={`Enter value for ${goal.title}`}
            autoFocus
          />
          <Button
            type="submit"
            size="lg"
            className="h-12 px-6"
            disabled={isSubmitting}
            aria-label="Submit value"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Check className="w-5 h-5" />
            )}
          </Button>
        </form>
        <span className="text-xs text-muted-foreground">
          Enter your current value (target: {goal.target_value})
        </span>
        <Button variant="ghost" size="sm" onClick={onSkip} aria-label="Skip this goal" className="text-xs gap-1 text-muted-foreground">
          <SkipForward className="w-3.5 h-3.5" /> Skip for now
        </Button>
      </div>
    )
  }

  // Buttons mode — large, centered
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-3">
        {buttonIncrements.map((inc) => (
          <button
            key={inc}
            onClick={() => handleAction(() => onIncrement(goal.id, inc))}
            disabled={isSubmitting}
            className="h-14 px-5 text-base font-semibold rounded-xl bg-muted/60 hover:bg-muted text-foreground transition-all duration-200 disabled:opacity-50 active:scale-95"
          >
            +{inc}
          </button>
        ))}
        {goal.current_value > 0 && (
          <button
            onClick={() => handleAction(() => onIncrement(goal.id, -1))}
            disabled={isSubmitting}
            className="h-14 w-14 flex items-center justify-center rounded-xl bg-muted/40 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all duration-200 disabled:opacity-50"
          >
            <Minus className="w-5 h-5" />
          </button>
        )}
      </div>
      <span className="text-xs text-muted-foreground">
        {goal.current_value} / {goal.target_value} {getTimeHorizonLabel(goal.period).toLowerCase()}
      </span>
      <Button variant="ghost" size="sm" onClick={onSkip} aria-label="Skip this goal" className="text-xs gap-1 text-muted-foreground">
        <SkipForward className="w-3.5 h-3.5" /> Skip for now
      </Button>
    </div>
  )
}

/** Single hero goal card shown during check-in — one goal fills the screen */
function CheckInHeroCard({
  goal,
  currentIndex,
  totalCount,
  areaConfig,
  inputMode,
  buttonIncrements,
  milestoneInfo,
  projectedDate,
  interactionMap,
  sortedGoalIds,
  isFadingOut,
  justCompletedFlash,
  onIncrement,
  onSetValue,
  onReset,
  onSkip,
  onPrev,
  onCelebrate,
  getCelebrationTier,
}: {
  goal: GoalWithProgress
  currentIndex: number
  totalCount: number
  areaConfig: LifeAreaConfig
  inputMode: InputMode
  buttonIncrements: number[]
  milestoneInfo: { nextValue: number; remaining: number } | null
  projectedDate: { nextLabel: string | null; finalLabel: string | null } | null
  /** Map from goalId to interaction state for progress indicator coloring */
  interactionMap: Map<string, "progressed" | "skipped">
  /** Sorted goal IDs (same order as check-in) for positional dot coloring */
  sortedGoalIds: string[]
  /** Whether this card is currently fading out before the next goal appears */
  isFadingOut: boolean
  /** Whether to show the "Completed!" flash overlay */
  justCompletedFlash: boolean
  onIncrement: (goalId: string, amount: number) => Promise<void>
  onSetValue: (goalId: string, value: number) => Promise<void>
  onReset: (goalId: string) => Promise<void>
  onSkip: () => void
  onPrev: (() => void) | null
  onCelebrate: V11ViewProps["onCelebrate"]
  getCelebrationTier: V11ViewProps["getCelebrationTier"]
}) {
  const wasComplete = useRef(goal.is_complete)
  const AreaIcon = areaConfig.icon
  const levelLabel = getLevelLabel(goal.goal_level)
  const levelColor = getLevelColor(goal.goal_level)

  // Celebration trigger when goal becomes complete
  useEffect(() => {
    if (goal.is_complete && !wasComplete.current) {
      const tier = getCelebrationTier(goal)
      onCelebrate(tier, goal.title)
    }
    wasComplete.current = goal.is_complete
  }, [goal.is_complete, goal.title, getCelebrationTier, onCelebrate, goal])

  return (
    <div
      className={`flex flex-col items-center justify-center min-h-[60vh] px-4 py-6 relative transition-opacity duration-300 ${
        isFadingOut ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* "Completed!" flash overlay */}
      {justCompletedFlash && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 backdrop-blur-sm animate-pulse">
            <Trophy className="w-5 h-5 text-emerald-400" />
            <span className="text-base font-bold text-emerald-400">Completed!</span>
          </div>
        </div>
      )}

      {/* Progress indicator: checked=green, skipped=amber, current=white, unseen=dim */}
      <div className="flex items-center gap-2 mb-8" role="navigation" aria-label="Check-in progress">
        {onPrev && (
          <button
            onClick={onPrev}
            aria-label="Go to previous goal"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        <div className="flex items-center gap-1.5" role="list" aria-label="Goal progress dots">
          {sortedGoalIds.map((gId, i) => {
            const state = interactionMap.get(gId)
            const statusLabel = i === currentIndex
              ? "current"
              : state === "progressed"
                ? "updated"
                : state === "skipped"
                  ? "skipped"
                  : "upcoming"
            if (i === currentIndex) {
              return (
                <div key={gId} role="listitem" aria-label={`Goal ${i + 1} of ${totalCount} (${statusLabel})`} className="h-2 w-6 rounded-full bg-foreground transition-all duration-300" />
              )
            }
            const colorClass = state === "progressed"
              ? "bg-emerald-500"
              : state === "skipped"
                ? "bg-amber-500/60"
                : "bg-muted-foreground/30"
            return (
              <div key={gId} role="listitem" aria-label={`Goal ${i + 1} of ${totalCount} (${statusLabel})`} className={`h-2 w-2 rounded-full transition-all duration-300 ${colorClass}`} />
            )
          })}
        </div>
        {(() => {
          const checkedCount = Array.from(interactionMap.values()).filter(v => v === "progressed").length
          const skippedCount = Array.from(interactionMap.values()).filter(v => v === "skipped").length
          const interacted = checkedCount + skippedCount
          return (
            <span className="text-xs text-muted-foreground ml-2">
              {interacted > 0 ? (
                <>{checkedCount} checked{skippedCount > 0 ? `, ${skippedCount} skipped` : ""} &middot; </>
              ) : null}
              {currentIndex + 1} of {totalCount}
            </span>
          )
        })()}
      </div>

      {/* Life area badge */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
        style={{ backgroundColor: areaConfig.hex + "15" }}
      >
        <AreaIcon className="w-3.5 h-3.5" style={{ color: areaConfig.hex }} />
        <span className="text-xs font-medium" style={{ color: areaConfig.hex }}>
          {areaConfig.name}
        </span>
      </div>

      {/* Level + nature badges */}
      {(levelLabel || goal.goal_nature) && (
        <div className="flex items-center gap-2 mb-2">
          {levelLabel && (
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${levelColor}`}>
              {levelLabel}
            </span>
          )}
          {goal.goal_nature && (
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {goal.goal_nature === "input" ? "input" : "outcome"}
            </span>
          )}
        </div>
      )}

      {/* Goal title — large and centered */}
      <h2 className="text-xl font-bold text-foreground text-center leading-tight mb-2 max-w-md">
        {goal.title}
      </h2>

      {/* Motivation note — prominent pill with life area tint */}
      {goal.motivation_note && (
        <div
          className="rounded-lg px-4 py-2.5 mb-4 max-w-sm text-center"
          style={{ backgroundColor: areaConfig.hex + "10", borderColor: areaConfig.hex + "20", borderWidth: "1px" }}
        >
          <p className="text-base text-foreground/80 leading-snug">
            &quot;{goal.motivation_note}&quot;
          </p>
        </div>
      )}

      {/* Large progress ring */}
      <div className="relative w-32 h-32 mb-6">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-muted/40"
          />
          <circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke={goal.is_complete ? "#22c55e" : areaConfig.hex}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 42}`}
            strokeDashoffset={`${2 * Math.PI * 42 * (1 - goal.progress_percentage / 100)}`}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-foreground">
            {goal.current_value}
          </span>
          <span className="text-xs text-muted-foreground">
            / {goal.target_value}
          </span>
        </div>
      </div>

      {/* Streak + milestone info */}
      <div className="flex items-center gap-4 mb-6 text-xs text-muted-foreground">
        {goal.current_streak > 0 && (
          <span className="flex items-center gap-1 text-amber-400">
            <Flame className="w-3.5 h-3.5" /> {goal.current_streak} streak
          </span>
        )}
        {milestoneInfo && (
          <span className="flex items-center gap-1 text-blue-400">
            <TrendingUp className="w-3.5 h-3.5" /> Next milestone: {milestoneInfo.nextValue}
          </span>
        )}
        {projectedDate?.nextLabel && (
          <span className="text-muted-foreground/70">{projectedDate.nextLabel}</span>
        )}
      </div>

      {/* Progress controls */}
      <HeroProgressControls
        goal={goal}
        inputMode={inputMode}
        buttonIncrements={buttonIncrements}
        onIncrement={onIncrement}
        onSetValue={onSetValue}
        onReset={onReset}
        onSkip={onSkip}
      />
    </div>
  )
}

/** Get motivational message based on check-in performance */
function getMotivationalMessage(
  progressedCount: number,
  skippedCount: number,
  totalCount: number,
  completedDuringCount: number,
): { message: string; icon: typeof PartyPopper; iconColor: string } {
  const ratio = totalCount > 0 ? progressedCount / totalCount : 0

  if (ratio === 1 && completedDuringCount > 0) {
    return { message: "Perfect run! Every goal moved forward.", icon: Trophy, iconColor: "text-amber-400" }
  }
  if (ratio === 1) {
    return { message: "Perfect run! You showed up for every goal.", icon: Star, iconColor: "text-amber-400" }
  }
  if (ratio >= 0.75) {
    return { message: "Great session! Most goals got attention today.", icon: PartyPopper, iconColor: "text-emerald-400" }
  }
  if (ratio >= 0.5) {
    return { message: "Good progress! Consistency compounds over time.", icon: TrendingUp, iconColor: "text-blue-400" }
  }
  if (progressedCount > 0) {
    return { message: "Every step counts. You still moved the needle today.", icon: Flame, iconColor: "text-amber-400" }
  }
  return { message: "Check-in done. Tomorrow is a fresh start.", icon: Sunrise, iconColor: "text-muted-foreground" }
}

/** Day summary screen shown after all goals are checked */
function DaySummaryScreen({
  goals,
  checkInLog,
  celebrations,
  onViewAll,
  onStartNewCheckIn,
  allAlreadyCompleteMessage,
}: {
  goals: GoalWithProgress[]
  checkInLog: CheckInEntry[]
  celebrations: CheckInCelebration[]
  onViewAll: () => void
  onStartNewCheckIn: () => Promise<void>
  /** When set, shows this message instead of the normal motivational message (all goals were already done) */
  allAlreadyCompleteMessage?: string
}) {
  const active = goals.filter((g) => !g.is_archived)
  const completed = active.filter((g) => g.is_complete)
  const progressed = checkInLog.filter((e) => e.action === "progressed")
  const skipped = checkInLog.filter((e) => e.action === "skipped")
  const completedDuring = checkInLog.filter((e) => e.completedDuringCheckIn)
  const totalStreak = active.reduce((sum, g) => sum + g.current_streak, 0)
  const avgProgress =
    active.length > 0
      ? Math.round(active.reduce((sum, g) => sum + g.progress_percentage, 0) / active.length)
      : 0

  const motivation = getMotivationalMessage(
    progressed.length,
    skipped.length,
    checkInLog.length,
    completedDuring.length,
  )
  const MotivationIcon = motivation.icon

  // Determine display message
  const displayMessage = allAlreadyCompleteMessage || motivation.message
  const displayIcon = allAlreadyCompleteMessage ? Trophy : MotivationIcon
  const displayIconColor = allAlreadyCompleteMessage ? "text-emerald-400" : motivation.iconColor
  const DisplayIcon = displayIcon

  return (
    <div className="flex flex-col items-center justify-center max-h-[90vh] px-4 py-5">
      {/* Icon */}
      <div className={`w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center mb-3 ${displayIconColor}`}>
        <DisplayIcon className="w-6 h-6" />
      </div>

      {/* Motivational message — the hero element of the summary */}
      <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center leading-tight mb-1 max-w-sm">
        {displayMessage}
      </h2>

      {!allAlreadyCompleteMessage && (
        <p className="text-xs text-muted-foreground mb-3">Check-in complete</p>
      )}

      {/* Progress bar: visual ratio of updated vs skipped */}
      {checkInLog.length > 0 && (
        <div className="w-full max-w-xs mb-4">
          <div className="flex items-center gap-1 h-1.5 rounded-full overflow-hidden bg-muted/30">
            {progressed.length > 0 && (
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${(progressed.length / checkInLog.length) * 100}%` }}
              />
            )}
            {skipped.length > 0 && (
              <div
                className="h-full bg-amber-500/50 rounded-full transition-all duration-500"
                style={{ width: `${(skipped.length / checkInLog.length) * 100}%` }}
              />
            )}
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> {progressed.length} updated
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500/50 inline-block" /> {skipped.length} skipped
            </span>
          </div>
        </div>
      )}

      {/* Celebrations earned during this check-in */}
      {celebrations.length > 0 && (
        <div className="w-full max-w-xs mb-3">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Trophy className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                Completed this session
              </span>
            </div>
            <div className="space-y-0.5">
              {celebrations.map((c, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-foreground">
                  <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span className="truncate">{c.goalTitle}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-2.5 w-full max-w-xs mb-4">
        <div className="flex flex-col items-center p-2.5 rounded-xl bg-card/30 border border-border/30">
          <span className="text-xl font-bold text-foreground">{completed.length}/{active.length}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Completed</span>
        </div>
        <div className="flex flex-col items-center p-2.5 rounded-xl bg-card/30 border border-border/30">
          <span className="text-xl font-bold text-foreground">{avgProgress}%</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Average</span>
        </div>
      </div>

      {/* Streak highlight */}
      {totalStreak > 0 && (
        <div className="flex items-center gap-2 mb-4 text-amber-400">
          <Flame className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">{totalStreak} total streak days</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2 w-full max-w-xs">
        <Button className="w-full gap-2" onClick={onStartNewCheckIn}>
          <RotateCcw className="w-4 h-4" /> Start New Check-In
        </Button>
        <Button variant="outline" className="w-full gap-2" onClick={onViewAll}>
          <List className="w-4 h-4" /> View all goals
        </Button>
      </div>
    </div>
  )
}

/** Compact list view accessible via "View All" */
function CompactGoalList({
  goals,
  lifeAreas,
  getInputMode,
  getButtonIncrements,
  onIncrement,
  onSetValue,
  onReset,
  onEdit,
  onArchive,
  onDelete,
  onCelebrate,
  getCelebrationTier,
  onBackToCheckIn,
  checkedInCount,
  totalCheckInCount,
}: {
  goals: GoalWithProgress[]
  lifeAreas: LifeAreaConfig[]
  getInputMode: V11ViewProps["getInputMode"]
  getButtonIncrements: V11ViewProps["getButtonIncrements"]
  onIncrement: V11ViewProps["onIncrement"]
  onSetValue: V11ViewProps["onSetValue"]
  onReset: V11ViewProps["onReset"]
  onEdit: (goal: GoalWithProgress) => void
  onArchive: V11ViewProps["onArchive"]
  onDelete: V11ViewProps["onDelete"]
  onCelebrate: V11ViewProps["onCelebrate"]
  getCelebrationTier: V11ViewProps["getCelebrationTier"]
  onBackToCheckIn: () => void
  /** Number of goals checked in so far */
  checkedInCount: number
  /** Total number of goals in the check-in flow */
  totalCheckInCount: number
}) {
  const active = useMemo(() => goals.filter((g) => !g.is_archived), [goals])
  const [showCompleted, setShowCompleted] = useState(false)

  const displayed = useMemo(() => {
    return showCompleted ? active : active.filter((g) => !g.is_complete)
  }, [active, showCompleted])

  const completedCount = active.filter((g) => g.is_complete).length

  return (
    <div className="pb-20">
      {/* Check-in progress banner */}
      {totalCheckInCount > 0 && (
        <div className="mb-3 rounded-lg border border-border/40 bg-card/30 px-3 py-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">
              {checkedInCount}/{totalCheckInCount} checked in today
            </span>
            <span className="text-[10px] text-muted-foreground">
              {totalCheckInCount > 0 ? Math.round((checkedInCount / totalCheckInCount) * 100) : 0}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${totalCheckInCount > 0 ? (checkedInCount / totalCheckInCount) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs h-8"
          onClick={onBackToCheckIn}
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Back to Check-In
        </Button>
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
            showCompleted ? "bg-emerald-500/15 text-emerald-400" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Check className="w-3 h-3" />
          Done ({completedCount})
        </button>
      </div>

      {/* Goal rows */}
      <div className="space-y-1.5">
        {displayed.map((goal) => {
          const areaConfig = getLifeAreaConfig(goal.life_area || "custom")
          const inputMode = getInputMode(goal)
          const buttonIncrements = inputMode === "buttons" ? getButtonIncrements(goal.target_value) : []
          return (
            <CompactGoalRow
              key={goal.id}
              goal={goal}
              areaConfig={areaConfig}
              inputMode={inputMode}
              buttonIncrements={buttonIncrements}
              onIncrement={onIncrement}
              onSetValue={onSetValue}
              onReset={onReset}
              onEdit={onEdit}
              onArchive={onArchive}
              onDelete={onDelete}
              onCelebrate={onCelebrate}
              getCelebrationTier={getCelebrationTier}
            />
          )
        })}
        {displayed.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {showCompleted ? "No goals found." : "All goals completed! Nice work."}
          </div>
        )}
      </div>
    </div>
  )
}

/** A single compact row in the list view */
function CompactGoalRow({
  goal,
  areaConfig,
  inputMode,
  buttonIncrements,
  onIncrement,
  onSetValue,
  onReset,
  onEdit,
  onArchive,
  onDelete,
  onCelebrate,
  getCelebrationTier,
}: {
  goal: GoalWithProgress
  areaConfig: LifeAreaConfig
  inputMode: InputMode
  buttonIncrements: number[]
  onIncrement: (goalId: string, amount: number) => Promise<void>
  onSetValue: (goalId: string, value: number) => Promise<void>
  onReset: (goalId: string) => Promise<void>
  onEdit: (goal: GoalWithProgress) => void
  onArchive: (goalId: string) => Promise<void>
  onDelete: (goalId: string) => Promise<void>
  onCelebrate: V11ViewProps["onCelebrate"]
  getCelebrationTier: V11ViewProps["getCelebrationTier"]
}) {
  const [showActions, setShowActions] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [directValue, setDirectValue] = useState("")
  const wasComplete = useRef(goal.is_complete)

  useEffect(() => {
    if (goal.is_complete && !wasComplete.current) {
      const tier = getCelebrationTier(goal)
      onCelebrate(tier, goal.title)
    }
    wasComplete.current = goal.is_complete
  }, [goal.is_complete, goal.title, getCelebrationTier, onCelebrate, goal])

  const handleAction = useCallback(
    async (action: () => Promise<void>) => {
      setIsSubmitting(true)
      try { await action() } finally { setIsSubmitting(false) }
    },
    []
  )

  const AreaIcon = areaConfig.icon

  return (
    <div className="group rounded-lg border border-border/50 bg-card/30 hover:bg-card/60 transition-all duration-200">
      <div className="p-3 flex items-center gap-3">
        {/* Area icon */}
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
          style={{ backgroundColor: areaConfig.hex + "15" }}
        >
          <AreaIcon className="w-3.5 h-3.5" style={{ color: areaConfig.hex }} />
        </div>

        {/* Title + progress */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-foreground leading-tight truncate">
            {goal.title}
          </h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-muted-foreground">
              {goal.current_value}/{goal.target_value}
            </span>
            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden max-w-[80px]">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${goal.progress_percentage}%`,
                  backgroundColor: goal.is_complete ? "#22c55e" : areaConfig.hex,
                }}
              />
            </div>
            {goal.current_streak > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
                <Flame className="w-2.5 h-2.5" /> {goal.current_streak}
              </span>
            )}
          </div>
        </div>

        {/* Inline controls */}
        <div className="flex items-center gap-1 shrink-0">
          {goal.is_complete ? (
            <div className="flex items-center gap-1">
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0 h-5">
                <Check className="w-2.5 h-2.5 mr-0.5" /> Done
              </Badge>
              <button
                onClick={() => handleAction(() => onReset(goal.id))}
                disabled={isSubmitting}
                className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          ) : inputMode === "boolean" ? (
            <button
              onClick={() => handleAction(() => onIncrement(goal.id, 1))}
              disabled={isSubmitting}
              className="w-7 h-7 rounded-md border border-muted-foreground/30 flex items-center justify-center hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
          ) : inputMode === "direct-entry" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const val = parseFloat(directValue)
                if (!isNaN(val) && val >= 0) {
                  handleAction(() => onSetValue(goal.id, val))
                  setDirectValue("")
                }
              }}
              className="flex items-center gap-1"
            >
              <Input
                type="number"
                placeholder={String(goal.target_value)}
                value={directValue}
                onChange={(e) => setDirectValue(e.target.value)}
                className="w-14 h-7 text-xs px-2"
              />
              <Button type="submit" size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              </Button>
            </form>
          ) : (
            <div className="flex items-center gap-0.5">
              {buttonIncrements.map((inc) => (
                <button
                  key={inc}
                  onClick={() => handleAction(() => onIncrement(goal.id, inc))}
                  disabled={isSubmitting}
                  className="h-7 px-2 text-xs font-medium rounded-md bg-muted/60 hover:bg-muted text-foreground transition-colors disabled:opacity-50"
                >
                  +{inc}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => { setShowActions(!showActions); setConfirmDelete(false) }}
            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
          >
            <Pencil className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Action panel */}
      {showActions && (
        <div className="border-t border-border/30 px-3 py-2 flex items-center gap-2 bg-muted/20 rounded-b-lg">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => onEdit(goal)}>
            <Pencil className="w-3 h-3" /> Edit
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => onArchive(goal.id)}>
            <Archive className="w-3 h-3" /> Archive
          </Button>
          {confirmDelete ? (
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-[10px] text-destructive">Delete permanently?</span>
              <Button variant="destructive" size="sm" className="h-6 text-[10px] px-2" onClick={() => onDelete(goal.id)}>Yes</Button>
              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setConfirmDelete(false)}>No</Button>
            </div>
          ) : (
            <Button
              variant="ghost" size="sm"
              className="h-7 text-xs gap-1 text-destructive hover:text-destructive ml-auto"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="w-3 h-3" /> Delete
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

/** Edit goal modal */
function EditGoalPanel({
  goal,
  lifeAreas,
  onSave,
  onCancel,
}: {
  goal: EditingGoal
  lifeAreas: LifeAreaConfig[]
  onSave: (id: string, updates: Partial<UserGoalInsert>) => Promise<void>
  onCancel: () => void
}) {
  const [title, setTitle] = useState(goal.title)
  const [target, setTarget] = useState(String(goal.target_value))
  const [period, setPeriod] = useState(goal.period)
  const [note, setNote] = useState(goal.motivation_note || "")
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(goal.id, {
        title,
        target_value: parseFloat(target) || 1,
        period: period as UserGoalInsert["period"],
        motivation_note: note || null,
      })
      onCancel()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <h3 className="font-semibold text-foreground">Edit Goal</h3>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-9" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Target</label>
              <Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} className="h-9" min={1} />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Period</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
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
            <label className="text-xs text-muted-foreground mb-1 block">Motivation Note (optional)</label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why does this matter to you?"
              className="h-9"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-border/50">
          <Button variant="ghost" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Create custom goal modal */
function CreateGoalPanel({
  lifeAreas,
  onCreate,
  onCancel,
}: {
  lifeAreas: LifeAreaConfig[]
  onCreate: (goal: UserGoalInsert) => Promise<GoalWithProgress | null>
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<CustomGoalDraft>({
    title: "",
    lifeArea: "daygame",
    target_value: 1,
    period: "weekly",
    tracking_type: "counter",
  })
  const [saving, setSaving] = useState(false)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)

  const titleIsInvalid = hasAttemptedSubmit && !draft.title.trim()

  const handleCreate = async () => {
    setHasAttemptedSubmit(true)
    if (!draft.title.trim()) return
    setSaving(true)
    try {
      await onCreate({
        title: draft.title.trim(),
        category: draft.lifeArea,
        life_area: draft.lifeArea,
        tracking_type: draft.tracking_type as UserGoalInsert["tracking_type"],
        period: draft.period as UserGoalInsert["period"],
        target_value: draft.target_value,
        goal_type: "recurring",
        goal_nature: "input",
        goal_level: 3,
      })
      onCancel()
    } finally {
      setSaving(false)
    }
  }

  const filteredAreas = lifeAreas.filter((a) => a.id !== "custom")

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <h3 className="font-semibold text-foreground">Create Custom Goal</h3>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Goal Title</label>
            <Input
              value={draft.title}
              onChange={(e) => {
                setDraft({ ...draft, title: e.target.value })
                if (hasAttemptedSubmit && e.target.value.trim()) setHasAttemptedSubmit(false)
              }}
              placeholder="e.g., Meditate 15 minutes daily"
              className={`h-9 ${titleIsInvalid ? "border-red-500 focus-visible:ring-red-500/30" : ""}`}
              aria-invalid={titleIsInvalid}
              aria-label="Goal title"
              autoFocus
            />
            {titleIsInvalid && (
              <p className="text-[11px] text-red-500 mt-1">Please enter a title for your goal.</p>
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Life Area</label>
            <div className="grid grid-cols-2 gap-2">
              {filteredAreas.map((area) => {
                const AreaIcon = area.icon
                return (
                  <button
                    key={area.id}
                    onClick={() => setDraft({ ...draft, lifeArea: area.id })}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left text-xs transition-colors ${
                      draft.lifeArea === area.id
                        ? "border-foreground/30 bg-muted/60"
                        : "border-border/50 hover:bg-muted/30"
                    }`}
                  >
                    <AreaIcon className="w-3.5 h-3.5 shrink-0" style={{ color: area.hex }} />
                    <span className="truncate">{area.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Target</label>
              <Input
                type="number"
                value={draft.target_value}
                onChange={(e) => setDraft({ ...draft, target_value: parseInt(e.target.value) || 1 })}
                className="h-9"
                min={1}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Period</label>
              <select
                value={draft.period}
                onChange={(e) => setDraft({ ...draft, period: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Type</label>
              <select
                value={draft.tracking_type}
                onChange={(e) => setDraft({ ...draft, tracking_type: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="counter">Counter</option>
                <option value="boolean">Yes/No</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-border/50">
          <Button variant="ghost" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving} aria-label="Create goal">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
            Create Goal
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Template card in catalog */
function TemplateCatalogCard({
  template,
  areaConfig,
  isSelected,
  isAlreadyAdopted,
  onToggle,
}: {
  template: GoalTemplate
  areaConfig: LifeAreaConfig
  isSelected: boolean
  /** True if the user already has a goal using this template */
  isAlreadyAdopted: boolean
  onToggle: () => void
}) {
  const levelLabel = getLevelLabel(template.level)
  const levelColor = getLevelColor(template.level)

  return (
    <button
      onClick={isAlreadyAdopted ? undefined : onToggle}
      disabled={isAlreadyAdopted}
      aria-label={isAlreadyAdopted ? `${template.title} (already added)` : `Select ${template.title}`}
      className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
        isAlreadyAdopted
          ? "border-border/20 bg-muted/20 opacity-50 cursor-not-allowed"
          : isSelected
            ? "border-foreground/30 bg-muted/50 ring-1 ring-foreground/10"
            : "border-border/40 hover:border-border/70 bg-card/20 hover:bg-card/40"
      }`}
    >
      <div className="flex items-start gap-2">
        <div
          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
            isAlreadyAdopted
              ? "border-muted-foreground/20 bg-muted-foreground/10"
              : isSelected
                ? "border-emerald-500 bg-emerald-500"
                : "border-muted-foreground/30"
          }`}
        >
          {isAlreadyAdopted ? (
            <Check className="w-3 h-3 text-muted-foreground/50" />
          ) : isSelected ? (
            <Check className="w-3 h-3 text-white" />
          ) : null}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {levelLabel && (
              <span className={`text-[9px] font-semibold uppercase tracking-wider ${levelColor}`}>
                {levelLabel}
              </span>
            )}
            <span
              className="text-[9px] font-medium uppercase tracking-wider"
              style={{ color: areaConfig.hex }}
            >
              {template.nature}
            </span>
            {isAlreadyAdopted && (
              <Badge className="bg-muted text-muted-foreground border-border/30 text-[9px] px-1.5 py-0 h-4">
                Added
              </Badge>
            )}
          </div>
          <p className={`text-sm leading-tight ${isAlreadyAdopted ? "text-muted-foreground" : "text-foreground"}`}>
            {template.title}
          </p>
          {template.templateType && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {template.templateType === "milestone_ladder" ? "Milestone ladder" : "Habit ramp"}
              {template.linkedMetric && ` \u00b7 auto-synced`}
            </p>
          )}
        </div>
      </div>
    </button>
  )
}

/** Full template catalog browser */
function CatalogBrowser({
  templates,
  lifeAreas,
  existingGoalTemplateIds,
  onBatchCreate,
  onCreate,
  onClose,
}: {
  templates: GoalTemplate[]
  lifeAreas: LifeAreaConfig[]
  existingGoalTemplateIds: Set<string>
  onBatchCreate: V11ViewProps["onBatchCreate"]
  onCreate: V11ViewProps["onCreate"]
  onClose: () => void
}) {
  const [search, setSearch] = useState("")
  const [areaFilter, setAreaFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<"all" | "core" | "progressive" | "niche">("all")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isCreating, setIsCreating] = useState(false)

  const filteredTemplates = useMemo(() => {
    return templates
      .filter((t) => t.level === 3)
      .filter((t) => {
        if (areaFilter !== "all" && t.lifeArea !== areaFilter) return false
        if (priorityFilter !== "all" && t.priority !== priorityFilter) return false
        if (search) {
          const q = search.toLowerCase()
          if (!t.title.toLowerCase().includes(q)) return false
        }
        return true
      })
      // Sort: available templates first, already-adopted at bottom
      .sort((a, b) => {
        const aAdopted = existingGoalTemplateIds.has(a.id) ? 1 : 0
        const bAdopted = existingGoalTemplateIds.has(b.id) ? 1 : 0
        return aAdopted - bAdopted
      })
  }, [templates, existingGoalTemplateIds, areaFilter, priorityFilter, search])

  const toggleTemplate = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBatchAdd = async () => {
    if (selectedIds.size === 0) return
    setIsCreating(true)
    try {
      const inserts: BatchGoalInsert[] = Array.from(selectedIds).map((templateId, idx) => {
        const tmpl = templates.find((t) => t.id === templateId)!
        return {
          _tempId: `__temp_cat_${idx}`,
          _tempParentId: null,
          title: tmpl.title,
          category: tmpl.lifeArea,
          life_area: tmpl.lifeArea,
          goal_type: tmpl.templateType === "milestone_ladder" ? "milestone" as const : tmpl.templateType === "habit_ramp" ? "habit_ramp" as const : "recurring" as const,
          goal_nature: tmpl.nature,
          goal_level: tmpl.level,
          display_category: tmpl.displayCategory,
          tracking_type: "counter" as const,
          period: "weekly" as const,
          target_value: tmpl.defaultMilestoneConfig?.target ?? tmpl.defaultRampSteps?.[0]?.frequencyPerWeek ?? 1,
          template_id: tmpl.id,
          linked_metric: tmpl.linkedMetric,
          milestone_config: tmpl.defaultMilestoneConfig as Record<string, unknown> | null,
          ramp_steps: tmpl.defaultRampSteps as unknown as Record<string, unknown>[] | null,
        }
      })
      await onBatchCreate(inserts)
      onClose()
    } finally {
      setIsCreating(false)
    }
  }

  const areas = lifeAreas.filter((a) => a.id !== "custom")

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
        <h2 className="text-base font-semibold text-foreground">Goal Catalog</h2>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button size="sm" className="gap-1.5 h-8" onClick={handleBatchAdd} disabled={isCreating}>
              {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Add {selectedIds.size} goal{selectedIds.size !== 1 ? "s" : ""}
            </Button>
          )}
          <button onClick={onClose} aria-label="Close goal catalog" className="text-muted-foreground hover:text-foreground p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="px-4 py-3 border-b border-border/30 space-y-2 shrink-0">
        <div className="relative">
          <Input
            placeholder="Search goals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setAreaFilter("all")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              areaFilter === "all" ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Areas
          </button>
          {areas.map((area) => {
            const AreaIcon = area.icon
            return (
              <button
                key={area.id}
                onClick={() => setAreaFilter(area.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                  areaFilter === area.id ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <AreaIcon className="w-3 h-3" style={{ color: area.hex }} />
                {area.name.split(" ")[0]}
              </button>
            )
          })}
        </div>
        <div className="flex gap-1.5">
          {(["all", "core", "progressive", "niche"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider transition-colors ${
                priorityFilter === p ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No templates match your filters.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTemplates.map((tmpl) => (
              <TemplateCatalogCard
                key={tmpl.id}
                template={tmpl}
                areaConfig={getLifeAreaConfig(tmpl.lifeArea)}
                isSelected={selectedIds.has(tmpl.id)}
                isAlreadyAdopted={existingGoalTemplateIds.has(tmpl.id)}
                onToggle={() => toggleTemplate(tmpl.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** Morning Briefing onboarding — conversational, one question at a time */
function MorningBriefingOnboarding({
  lifeAreas,
  templates,
  onCreate,
  onBatchCreate,
  onOpenCatalog,
  onOpenCreate,
}: {
  lifeAreas: LifeAreaConfig[]
  templates: GoalTemplate[]
  onCreate: V11ViewProps["onCreate"]
  onBatchCreate: V11ViewProps["onBatchCreate"]
  onOpenCatalog: () => void
  onOpenCreate: () => void
}) {
  const [step, setStep] = useState<"welcome" | "area" | "goals" | "ready">("welcome")
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null)
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set())
  const [isCreating, setIsCreating] = useState(false)

  const filteredAreas = lifeAreas.filter((a) => a.id !== "custom")

  const areaTemplates = useMemo(() => {
    if (!selectedAreaId) return []
    return templates
      .filter((t) => t.lifeArea === selectedAreaId && t.level === 3 && t.priority === "core")
      .slice(0, 6)
  }, [selectedAreaId, templates])

  const handleQuickStart = async () => {
    if (selectedTemplates.size === 0) return
    setIsCreating(true)
    try {
      const inserts: BatchGoalInsert[] = Array.from(selectedTemplates).map((templateId, idx) => {
        const tmpl = templates.find((t) => t.id === templateId)!
        return {
          _tempId: `__temp_qs_${idx}`,
          _tempParentId: null,
          title: tmpl.title,
          category: tmpl.lifeArea,
          life_area: tmpl.lifeArea,
          goal_type: tmpl.templateType === "milestone_ladder" ? "milestone" as const : tmpl.templateType === "habit_ramp" ? "habit_ramp" as const : "recurring" as const,
          goal_nature: tmpl.nature,
          goal_level: tmpl.level,
          display_category: tmpl.displayCategory,
          tracking_type: tmpl.linkedMetric ? "counter" as const : "counter" as const,
          period: "weekly" as const,
          target_value: tmpl.defaultMilestoneConfig?.target ?? tmpl.defaultRampSteps?.[0]?.frequencyPerWeek ?? 1,
          template_id: tmpl.id,
          linked_metric: tmpl.linkedMetric,
          milestone_config: tmpl.defaultMilestoneConfig as Record<string, unknown> | null,
          ramp_steps: tmpl.defaultRampSteps as unknown as Record<string, unknown>[] | null,
        }
      })
      await onBatchCreate(inserts)
    } finally {
      setIsCreating(false)
    }
  }

  const toggleTemplate = (id: string) => {
    setSelectedTemplates((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      {step === "welcome" && (
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-border/50 flex items-center justify-center mb-6">
            <Sunrise className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Good morning</h1>
          <p className="text-sm text-muted-foreground mb-8 max-w-xs">
            Let&apos;s set up your daily check-in. First, a quick question:
          </p>
          <p className="text-base font-medium text-foreground mb-6">
            What&apos;s most important to you right now?
          </p>
          <Button className="w-full max-w-xs" onClick={() => setStep("area")}>
            Let me pick <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {step === "area" && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground text-center mb-2">
            Choose a life area to focus on
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-4">
            You can add more areas later. Start with what matters most.
          </p>
          <div className="space-y-2">
            {filteredAreas.map((area) => {
              const AreaIcon = area.icon
              const areaTemplateCount = templates.filter(
                (t) => t.lifeArea === area.id && t.level === 3
              ).length
              return (
                <button
                  key={area.id}
                  onClick={() => {
                    setSelectedAreaId(area.id)
                    setStep("goals")
                  }}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card/30 hover:bg-card/60 transition-all text-left"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: area.hex + "18" }}
                  >
                    <AreaIcon className="w-5 h-5" style={{ color: area.hex }} />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-foreground">{area.name}</span>
                    <span className="text-[11px] text-muted-foreground block">
                      {areaTemplateCount} goals available
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              )
            })}
          </div>
          <div className="pt-3 flex gap-2">
            <Button variant="outline" className="flex-1 gap-1.5 text-xs" onClick={onOpenCatalog}>
              Browse catalog
            </Button>
            <Button variant="ghost" className="flex-1 gap-1.5 text-xs" onClick={onOpenCreate}>
              <Plus className="w-3.5 h-3.5" /> Custom
            </Button>
          </div>
        </div>
      )}

      {step === "goals" && selectedAreaId && (
        <div className="space-y-4">
          <button
            onClick={() => { setStep("area"); setSelectedTemplates(new Set()) }}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <ChevronLeft className="w-3 h-3" /> Back
          </button>

          <div className="text-center mb-4">
            <h2 className="text-lg font-bold text-foreground mb-1">Pick some goals to start</h2>
            <p className="text-sm text-muted-foreground">
              Select the ones that resonate. You can always adjust later.
            </p>
          </div>

          <div className="space-y-2">
            {areaTemplates.map((tmpl) => {
              const isSelected = selectedTemplates.has(tmpl.id)
              return (
                <button
                  key={tmpl.id}
                  onClick={() => toggleTemplate(tmpl.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                    isSelected
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-border/40 bg-card/20 hover:bg-card/40"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? "border-emerald-500 bg-emerald-500" : "border-muted-foreground/30"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-foreground">{tmpl.title}</span>
                    {tmpl.templateType && (
                      <span className="text-[10px] text-muted-foreground block">
                        {tmpl.templateType === "milestone_ladder" ? "Milestone" : "Habit ramp"}
                        {tmpl.defaultRampSteps?.[0] && ` \u00b7 start ${tmpl.defaultRampSteps[0].frequencyPerWeek}/wk`}
                        {tmpl.defaultMilestoneConfig && ` \u00b7 target ${tmpl.defaultMilestoneConfig.target}`}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
            {areaTemplates.length === 0 && (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">
                  No core templates for this area yet. Try the full catalog or create a custom goal.
                </p>
              </div>
            )}
          </div>

          <div className="pt-2">
            <Button
              className="w-full gap-2"
              onClick={() => {
                if (selectedTemplates.size > 0) setStep("ready")
              }}
              disabled={selectedTemplates.size === 0}
            >
              Continue with {selectedTemplates.size} goal{selectedTemplates.size !== 1 ? "s" : ""}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {step === "ready" && (
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mb-6">
            <Rocket className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Ready to begin?</h2>
          <p className="text-sm text-muted-foreground mb-8 max-w-xs">
            We&apos;ll create {selectedTemplates.size} goal{selectedTemplates.size !== 1 ? "s" : ""} and
            start your first daily check-in right away.
          </p>
          <Button
            className="w-full max-w-xs gap-2"
            onClick={handleQuickStart}
            disabled={isCreating}
          >
            {isCreating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Rocket className="w-4 h-4" />
            )}
            Start my first check-in
          </Button>
          <button
            onClick={() => setStep("goals")}
            className="text-xs text-muted-foreground hover:text-foreground mt-3 transition-colors"
          >
            Go back and change selection
          </button>
        </div>
      )}
    </div>
  )
}

/** Management sidebar overlay — edit/archive/delete/add goals */
function ManagementSidebar({
  goals,
  lifeAreas,
  onEdit,
  onArchive,
  onDelete,
  onOpenCatalog,
  onOpenCreate,
  onClose,
}: {
  goals: GoalWithProgress[]
  lifeAreas: LifeAreaConfig[]
  onEdit: (goal: GoalWithProgress) => void
  onArchive: (goalId: string) => Promise<void>
  onDelete: (goalId: string) => Promise<void>
  onOpenCatalog: () => void
  onOpenCreate: () => void
  onClose: () => void
}) {
  const active = useMemo(() => goals.filter((g) => !g.is_archived), [goals])
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      {/* Panel */}
      <div className="relative w-full max-w-sm bg-background border-l border-border shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <h3 className="font-semibold text-foreground text-sm">Manage Goals</h3>
          <button onClick={onClose} aria-label="Close management sidebar" className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Add buttons */}
        <div className="px-4 py-3 border-b border-border/30 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={onOpenCatalog}>
            <Plus className="w-3.5 h-3.5" /> From Catalog
          </Button>
          <Button variant="ghost" size="sm" className="flex-1 gap-1.5 text-xs" onClick={onOpenCreate}>
            <Plus className="w-3.5 h-3.5" /> Custom
          </Button>
        </div>

        {/* Goal list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
          {active.map((goal) => {
            const areaConfig = getLifeAreaConfig(goal.life_area || "custom")
            const AreaIcon = areaConfig.icon
            return (
              <div
                key={goal.id}
                className="flex items-center gap-2 p-2 rounded-lg border border-border/40 bg-card/20"
              >
                <div
                  className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                  style={{ backgroundColor: areaConfig.hex + "15" }}
                >
                  <AreaIcon className="w-3 h-3" style={{ color: areaConfig.hex }} />
                </div>
                <span className="flex-1 text-xs text-foreground truncate">{goal.title}</span>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => onEdit(goal)}
                    className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit"
                    aria-label={`Edit ${goal.title}`}
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onArchive(goal.id)}
                    className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                    title="Archive"
                    aria-label={`Archive ${goal.title}`}
                  >
                    <Archive className="w-3 h-3" />
                  </button>
                  {confirmDeleteId === goal.id ? (
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => { onDelete(goal.id); setConfirmDeleteId(null) }}
                        className="px-1.5 py-0.5 text-[9px] bg-destructive text-destructive-foreground rounded"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-1.5 py-0.5 text-[9px] text-muted-foreground hover:text-foreground rounded"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(goal.id)}
                      className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete"
                      aria-label={`Delete ${goal.title}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          {active.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No active goals.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Main View Component
// ============================================================================

export function V11ViewA(props: V11ViewProps) {
  const {
    goals,
    lifeAreas,
    templates,
    isLoading,
    onIncrement,
    onSetValue,
    onReset,
    onCreate,
    onBatchCreate,
    onUpdate,
    onArchive,
    onDelete,
    onCelebrate,
    getInputMode,
    getButtonIncrements,
    getNextMilestoneInfo,
    getProjectedDate,
    getCelebrationTier,
    onRefresh,
  } = props

  // --- State ---
  const [checkInPhase, setCheckInPhase] = useState<CheckInPhase>("checking")
  const [currentGoalIndex, setCurrentGoalIndex] = useState(0)
  const [checkInLog, setCheckInLog] = useState<CheckInEntry[]>([])
  const [celebrations, setCelebrations] = useState<CheckInCelebration[]>([])
  const [showCompactList, setShowCompactList] = useState(false)
  const [managementPanel, setManagementPanel] = useState<ManagementPanel>("none")
  const [editingGoal, setEditingGoal] = useState<EditingGoal | null>(null)
  /** True while the hero card fades out before advancing */
  const [isFadingOut, setIsFadingOut] = useState(false)
  /** True while showing the "Completed!" flash before advancing */
  const [justCompletedFlash, setJustCompletedFlash] = useState(false)
  /** Guards against double-advance if user clicks during fade-out delay */
  const isAdvancingRef = useRef(false)

  // --- Computed ---
  const activeGoals = useMemo(() => goals.filter((g) => !g.is_archived), [goals])
  /** All active goals sorted for check-in (includes completed for reference) */
  const allSortedGoals = useMemo(() => sortGoalsForCheckIn(activeGoals), [activeGoals])
  /** Only incomplete goals — these are what the user actually checks in on */
  const sortedGoals = useMemo(() => allSortedGoals.filter((g) => !g.is_complete), [allSortedGoals])
  const sortedGoalIds = useMemo(() => sortedGoals.map((g) => g.id), [sortedGoals])
  /** True when all active goals were already complete before check-in started */
  const allAlreadyComplete = activeGoals.length > 0 && sortedGoals.length === 0

  // Map of goalId -> interaction state for progress indicator dots
  const interactionMap = useMemo(() => {
    const map = new Map<string, "progressed" | "skipped">()
    for (const entry of checkInLog) {
      map.set(entry.goalId, entry.action)
    }
    return map
  }, [checkInLog])

  // Template IDs already in use
  const existingTemplateIds = useMemo(
    () => new Set(goals.filter((g) => g.template_id).map((g) => g.template_id!)),
    [goals]
  )

  // --- Handlers ---
  const handleEdit = useCallback((goal: GoalWithProgress) => {
    setEditingGoal({
      id: goal.id,
      title: goal.title,
      target_value: goal.target_value,
      period: goal.period,
      motivation_note: goal.motivation_note || "",
    })
    setManagementPanel("edit")
  }, [])

  const handleSaveEdit = useCallback(
    async (id: string, updates: Partial<UserGoalInsert>) => {
      await onUpdate(id, updates)
    },
    [onUpdate]
  )

  /** Advance to next goal or summary screen (called after fade-out completes) */
  const advanceCheckIn = useCallback((action: "progressed" | "skipped", goal: GoalWithProgress, completedDuringCheckIn?: boolean) => {
    setCheckInLog((prev) => {
      // Upsert: replace any existing entry for this goalId (handles re-visit after back)
      const filtered = prev.filter((e) => e.goalId !== goal.id)
      return [
        ...filtered,
        {
          goalId: goal.id,
          action,
          previousValue: goal.current_value,
          newValue: goal.current_value,
          completedDuringCheckIn,
        },
      ]
    })

    if (completedDuringCheckIn) {
      setCelebrations((prev) => [...prev, { goalTitle: goal.title, tier: getCelebrationTier(goal) }])
    }

    // Reset visual states and advancing guard
    setIsFadingOut(false)
    setJustCompletedFlash(false)
    isAdvancingRef.current = false

    if (currentGoalIndex < sortedGoals.length - 1) {
      setCurrentGoalIndex((i) => i + 1)
    } else {
      setCheckInPhase("summary")
    }
  }, [currentGoalIndex, sortedGoals.length, getCelebrationTier])

  /**
   * Orchestrates the advance sequence after progress:
   * 1. Wait to see progress update (200ms)
   * 2. If goal completed, show "Completed!" flash (600ms)
   * 3. Fade out current card (300ms)
   * 4. Advance to next
   * Total: 800ms normal, 1100ms on completion
   */
  const scheduleAdvance = useCallback(
    (goal: GoalWithProgress, willComplete: boolean) => {
      isAdvancingRef.current = true
      if (willComplete) {
        // Show "Completed!" flash first, then fade and advance
        setTimeout(() => setJustCompletedFlash(true), 200)
        setTimeout(() => {
          setJustCompletedFlash(false)
          setIsFadingOut(true)
        }, 800)
        setTimeout(() => advanceCheckIn("progressed", goal, true), 1100)
      } else {
        // Normal advance: wait 500ms, then fade 300ms
        setTimeout(() => setIsFadingOut(true), 500)
        setTimeout(() => advanceCheckIn("progressed", goal, false), 800)
      }
    },
    [advanceCheckIn]
  )

  /** Wrap onIncrement to also advance after progress */
  const handleCheckInIncrement = useCallback(
    async (goalId: string, amount: number) => {
      if (isAdvancingRef.current) return // Prevent double-advance during fade-out
      const goal = sortedGoals[currentGoalIndex]
      if (!goal) return
      // Detect if this increment will complete the goal
      const willComplete = !goal.is_complete && (goal.current_value + amount >= goal.target_value)
      await onIncrement(goalId, amount)
      scheduleAdvance(goal, willComplete)
    },
    [onIncrement, sortedGoals, currentGoalIndex, scheduleAdvance]
  )

  /** Wrap onSetValue to also advance */
  const handleCheckInSetValue = useCallback(
    async (goalId: string, value: number) => {
      if (isAdvancingRef.current) return // Prevent double-advance during fade-out
      const goal = sortedGoals[currentGoalIndex]
      if (!goal) return
      const willComplete = !goal.is_complete && (value >= goal.target_value)
      await onSetValue(goalId, value)
      scheduleAdvance(goal, willComplete)
    },
    [onSetValue, sortedGoals, currentGoalIndex, scheduleAdvance]
  )

  const handleSkip = useCallback(() => {
    const goal = sortedGoals[currentGoalIndex]
    if (goal) advanceCheckIn("skipped", goal)
  }, [sortedGoals, currentGoalIndex, advanceCheckIn])

  const handlePrev = useCallback(() => {
    if (currentGoalIndex > 0) {
      const prevGoalId = sortedGoalIds[currentGoalIndex - 1]
      // Remove the log entry for the goal we're navigating back to,
      // so the user gets a clean re-interaction without duplication
      if (prevGoalId) {
        setCheckInLog((prev) => prev.filter((e) => e.goalId !== prevGoalId))
        // Note: celebrations are matched by goalTitle, not goalId. If two goals
        // share the same title, going back could remove the wrong celebration.
        // This is extremely unlikely in practice (goal titles are user-entered
        // and scoped to a single user's active goals).
        setCelebrations((prev) => {
          const goalTitle = sortedGoals.find((g) => g.id === prevGoalId)?.title
          return goalTitle ? prev.filter((c) => c.goalTitle !== goalTitle) : prev
        })
      }
      setCurrentGoalIndex((i) => i - 1)
    }
  }, [currentGoalIndex, sortedGoalIds, sortedGoals])

  /** Reset check-in to start fresh — refreshes data from server first */
  const resetCheckIn = useCallback(async () => {
    await onRefresh()
    setCheckInPhase("checking")
    setCurrentGoalIndex(0)
    setCheckInLog([])
    setCelebrations([])
    setShowCompactList(false)
    setIsFadingOut(false)
    setJustCompletedFlash(false)
    isAdvancingRef.current = false
  }, [onRefresh])

  // --- Loading ---
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading goals...</p>
      </div>
    )
  }

  // --- Empty state: Morning Briefing onboarding ---
  if (activeGoals.length === 0) {
    return (
      <>
        <MorningBriefingOnboarding
          lifeAreas={lifeAreas}
          templates={templates}
          onCreate={onCreate}
          onBatchCreate={onBatchCreate}
          onOpenCatalog={() => setManagementPanel("catalog")}
          onOpenCreate={() => setManagementPanel("create")}
        />
        {managementPanel === "catalog" && (
          <CatalogBrowser
            templates={templates}
            lifeAreas={lifeAreas}
            existingGoalTemplateIds={existingTemplateIds}
            onBatchCreate={onBatchCreate}
            onCreate={onCreate}
            onClose={() => setManagementPanel("none")}
          />
        )}
        {managementPanel === "create" && (
          <CreateGoalPanel
            lifeAreas={lifeAreas}
            onCreate={onCreate}
            onCancel={() => setManagementPanel("none")}
          />
        )}
      </>
    )
  }

  // --- Compact list view (accessible via "View All") ---
  if (showCompactList) {
    return (
      <>
        <CompactGoalList
          goals={goals}
          lifeAreas={lifeAreas}
          getInputMode={getInputMode}
          getButtonIncrements={getButtonIncrements}
          onIncrement={onIncrement}
          onSetValue={onSetValue}
          onReset={onReset}
          onEdit={handleEdit}
          onArchive={onArchive}
          onDelete={onDelete}
          onCelebrate={onCelebrate}
          getCelebrationTier={getCelebrationTier}
          onBackToCheckIn={() => setShowCompactList(false)}
          checkedInCount={checkInLog.length}
          totalCheckInCount={sortedGoals.length}
        />
        {managementPanel === "edit" && editingGoal && (
          <EditGoalPanel
            goal={editingGoal}
            lifeAreas={lifeAreas}
            onSave={handleSaveEdit}
            onCancel={() => { setEditingGoal(null); setManagementPanel("none") }}
          />
        )}
      </>
    )
  }

  // --- Main: Daily check-in flow ---
  return (
    <div className="pb-20">
      {/* Top bar: minimal — settings gear + "View All" link */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sunrise className="w-4.5 h-4.5 text-amber-400" />
          <span className="text-sm font-semibold text-foreground">Daily Check-In</span>
        </div>
        <div className="flex items-center gap-1.5">
          {checkInPhase === "checking" && checkInLog.length > 0 && (
            <button
              onClick={resetCheckIn}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
              title="Restart check-in"
              aria-label="Restart check-in"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setShowCompactList(true)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
            title="View all goals"
            aria-label="View all goals"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setManagementPanel("sidebar")}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
            title="Manage goals"
            aria-label="Open management sidebar"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* All goals already complete — skip straight to summary */}
      {checkInPhase === "checking" && allAlreadyComplete && (
        <DaySummaryScreen
          goals={goals}
          checkInLog={[]}
          celebrations={[]}
          onViewAll={() => setShowCompactList(true)}
          onStartNewCheckIn={resetCheckIn}
          allAlreadyCompleteMessage="All goals are already complete!"
        />
      )}

      {/* Check-in content — hero card with subtle background gradient */}
      {checkInPhase === "checking" && sortedGoals.length > 0 && (
        (() => {
          const goal = sortedGoals[Math.min(currentGoalIndex, sortedGoals.length - 1)]
          if (!goal) return null
          const areaConfig = getLifeAreaConfig(goal.life_area || "custom")
          const inputMode = getInputMode(goal)
          const buttonIncrements = inputMode === "buttons" ? getButtonIncrements(goal.target_value) : []
          const milestoneInfo = getNextMilestoneInfo(goal)
          const projectedDate = getProjectedDate(goal)

          return (
            <div className="relative rounded-2xl overflow-hidden">
              {/* Subtle radial gradient background to make the hero area feel intentional */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse at 50% 30%, ${areaConfig.hex}12 0%, transparent 70%)`,
                }}
              />
              <CheckInHeroCard
                goal={goal}
                currentIndex={currentGoalIndex}
                totalCount={sortedGoals.length}
                areaConfig={areaConfig}
                inputMode={inputMode}
                buttonIncrements={buttonIncrements}
                milestoneInfo={milestoneInfo}
                projectedDate={projectedDate}
                interactionMap={interactionMap}
                sortedGoalIds={sortedGoalIds}
                isFadingOut={isFadingOut}
                justCompletedFlash={justCompletedFlash}
                onIncrement={handleCheckInIncrement}
                onSetValue={handleCheckInSetValue}
                onReset={onReset}
                onSkip={handleSkip}
                onPrev={currentGoalIndex > 0 ? handlePrev : null}
                onCelebrate={onCelebrate}
                getCelebrationTier={getCelebrationTier}
              />
            </div>
          )
        })()
      )}

      {checkInPhase === "summary" && (
        <DaySummaryScreen
          goals={goals}
          checkInLog={checkInLog}
          celebrations={celebrations}
          onViewAll={() => setShowCompactList(true)}
          onStartNewCheckIn={resetCheckIn}
        />
      )}

      {/* Management sidebar */}
      {managementPanel === "sidebar" && (
        <ManagementSidebar
          goals={goals}
          lifeAreas={lifeAreas}
          onEdit={handleEdit}
          onArchive={onArchive}
          onDelete={onDelete}
          onOpenCatalog={() => setManagementPanel("catalog")}
          onOpenCreate={() => setManagementPanel("create")}
          onClose={() => setManagementPanel("none")}
        />
      )}

      {/* Catalog overlay */}
      {managementPanel === "catalog" && (
        <CatalogBrowser
          templates={templates}
          lifeAreas={lifeAreas}
          existingGoalTemplateIds={existingTemplateIds}
          onBatchCreate={onBatchCreate}
          onCreate={onCreate}
          onClose={() => setManagementPanel("none")}
        />
      )}

      {/* Create goal modal */}
      {managementPanel === "create" && (
        <CreateGoalPanel
          lifeAreas={lifeAreas}
          onCreate={onCreate}
          onCancel={() => setManagementPanel("none")}
        />
      )}

      {/* Edit goal modal */}
      {managementPanel === "edit" && editingGoal && (
        <EditGoalPanel
          goal={editingGoal}
          lifeAreas={lifeAreas}
          onSave={handleSaveEdit}
          onCancel={() => { setEditingGoal(null); setManagementPanel("none") }}
        />
      )}
    </div>
  )
}
