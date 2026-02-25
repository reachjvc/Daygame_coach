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
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Archive,
  Flame,
  RotateCcw,
  Rocket,
  Star,
  TrendingUp,
  Loader2,
  MoreVertical,
  List,
  Focus,
  Sparkles,
  ArrowRight,
  SkipForward,
  Heart,
  Clock,
  Trophy,
} from "lucide-react"

// ============================================================================
// Types
// ============================================================================

type Screen = "focus" | "list" | "discover" | "create-custom"

interface GoalEditState {
  title: string
  target_value: number
  period: string
  motivation_note: string
}

// ============================================================================
// Constants
// ============================================================================

const LEVEL_LABELS: Record<number, string> = {
  0: "Dream",
  1: "Major Goal",
  2: "Achievement",
  3: "Specific",
}

const PERIOD_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
]

// ============================================================================
// Main Component
// ============================================================================

export function V11ViewB(props: V11ViewProps) {
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
  } = props

  // --- State ---
  const [screen, setScreen] = useState<Screen>("focus")
  const [focusIndex, setFocusIndex] = useState(0)
  const [showMenu, setShowMenu] = useState(false)
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
  const [editState, setEditState] = useState<GoalEditState>({
    title: "",
    target_value: 1,
    period: "weekly",
    motivation_note: "",
  })
  const [customGoal, setCustomGoal] = useState<{
    title: string
    life_area: string
    target_value: number
    period: string
    goal_type: string
    tracking_type: string
    motivation_note: string
  }>({
    title: "",
    life_area: "daygame",
    target_value: 1,
    period: "weekly",
    goal_type: "recurring",
    tracking_type: "counter",
    motivation_note: "",
  })
  const [directEntryValues, setDirectEntryValues] = useState<Record<string, string>>({})
  const [busyGoalIds, setBusyGoalIds] = useState<Set<string>>(new Set())
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const thumbnailStripRef = useRef<HTMLDivElement>(null)
  const dotStripRef = useRef<HTMLDivElement>(null)

  // Touch/swipe state for mobile hero card navigation
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  // Completion pulse animation state
  const [completionPulse, setCompletionPulse] = useState(false)

  // Discovery flow state
  const [discoveryIndex, setDiscoveryIndex] = useState(0)
  const [addedFromDiscovery, setAddedFromDiscovery] = useState<Set<string>>(new Set())
  const [skippedTemplates, setSkippedTemplates] = useState<Set<string>>(new Set())
  const [discoveryAreaFilter, setDiscoveryAreaFilter] = useState<string | null>(null)

  // "Let's go!" celebration when transitioning from discovery to focus
  const [showLaunchCelebration, setShowLaunchCelebration] = useState(false)

  // --- Derived ---
  const activeGoals = useMemo(
    () => goals.filter((g) => !g.is_archived),
    [goals],
  )

  // Sort goals: most actionable first (incomplete, highest progress%, then by streak)
  const sortedGoals = useMemo(() => {
    const sorted = [...activeGoals]
    sorted.sort((a, b) => {
      // Incomplete first
      if (a.is_complete !== b.is_complete) return a.is_complete ? 1 : -1
      // Higher progress percentage first (closer to completion)
      if (a.progress_percentage !== b.progress_percentage)
        return b.progress_percentage - a.progress_percentage
      // Higher streak first
      if ((a.current_streak || 0) !== (b.current_streak || 0))
        return (b.current_streak || 0) - (a.current_streak || 0)
      return a.title.localeCompare(b.title)
    })
    return sorted
  }, [activeGoals])

  // Clamp focus index
  useEffect(() => {
    if (sortedGoals.length > 0 && focusIndex >= sortedGoals.length) {
      setFocusIndex(Math.max(0, sortedGoals.length - 1))
    }
  }, [sortedGoals.length, focusIndex])

  // Auto-switch to discover on empty
  useEffect(() => {
    if (!isLoading && activeGoals.length === 0 && screen === "focus") {
      setScreen("discover")
    }
  }, [isLoading, activeGoals.length, screen])

  // Click-outside-to-close for three-dot menu
  useEffect(() => {
    if (!showMenu) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showMenu])

  const navigateGoal = useCallback(
    (direction: -1 | 1) => {
      const newIndex = focusIndex + direction
      if (newIndex >= 0 && newIndex < sortedGoals.length) {
        setFocusIndex(newIndex)
        setShowMenu(false)
        setEditingGoalId(null)
        setConfirmDeleteId(null)
      }
    },
    [focusIndex, sortedGoals.length],
  )

  const selectGoalByIndex = useCallback((index: number) => {
    setFocusIndex(index)
    setShowMenu(false)
    setEditingGoalId(null)
    setConfirmDeleteId(null)
  }, [])

  // Keyboard navigation: left/right arrow keys in focus mode
  useEffect(() => {
    if (screen !== "focus") return
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        navigateGoal(-1)
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        navigateGoal(1)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [screen, navigateGoal])

  // Track slide direction for card transition animation
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null)
  const [transitionKey, setTransitionKey] = useState(0)
  const prevFocusIndex = useRef(focusIndex)

  useEffect(() => {
    if (focusIndex !== prevFocusIndex.current) {
      setSlideDirection(focusIndex > prevFocusIndex.current ? "right" : "left")
      setTransitionKey((k) => k + 1)
      prevFocusIndex.current = focusIndex
    }
  }, [focusIndex])

  // Reset slide direction after animation completes
  useEffect(() => {
    if (slideDirection === null) return
    const timer = setTimeout(() => setSlideDirection(null), 300)
    return () => clearTimeout(timer)
  }, [slideDirection, transitionKey])

  // Trigger completion pulse when focused goal becomes complete
  useEffect(() => {
    const goal = sortedGoals[focusIndex]
    if (goal?.is_complete && goal.progress_percentage >= 100) {
      setCompletionPulse(true)
      const timer = setTimeout(() => setCompletionPulse(false), 1000)
      return () => clearTimeout(timer)
    }
    setCompletionPulse(false)
  }, [sortedGoals, focusIndex])

  // Auto-dismiss "Let's go!" launch celebration after 1.2s
  useEffect(() => {
    if (!showLaunchCelebration) return
    const timer = setTimeout(() => setShowLaunchCelebration(false), 1200)
    return () => clearTimeout(timer)
  }, [showLaunchCelebration])

  // Scroll active thumbnail into view when navigating
  useEffect(() => {
    if (!thumbnailStripRef.current) return
    const activeThumb = thumbnailStripRef.current.children[0]?.children[focusIndex] as HTMLElement | undefined
    if (activeThumb) {
      activeThumb.scrollIntoView({ inline: "center", behavior: "smooth" })
    }
  }, [focusIndex])

  // Scroll active dot indicator into view when navigating
  useEffect(() => {
    if (!dotStripRef.current) return
    const activeDot = dotStripRef.current.children[focusIndex] as HTMLElement | undefined
    if (activeDot) {
      activeDot.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" })
    }
  }, [focusIndex])

  const focusedGoal = sortedGoals[focusIndex] ?? null

  // Discovery templates (filtered, excluding already added)
  const discoveryTemplates = useMemo(() => {
    let filtered = templates.filter(
      (t) => !addedFromDiscovery.has(t.id) && !skippedTemplates.has(t.id),
    )
    if (discoveryAreaFilter) {
      filtered = filtered.filter((t) => t.lifeArea === discoveryAreaFilter)
    }
    // Core first, then progressive, then niche
    const priorityOrder = { core: 0, progressive: 1, niche: 2 }
    filtered.sort(
      (a, b) =>
        (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2),
    )
    return filtered
  }, [templates, addedFromDiscovery, skippedTemplates, discoveryAreaFilter])

  const currentDiscoveryTemplate = discoveryTemplates[discoveryIndex] ?? null

  // --- Helpers ---
  const markBusy = useCallback((id: string, busy: boolean) => {
    setBusyGoalIds((prev) => {
      const next = new Set(prev)
      if (busy) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  const handleIncrement = useCallback(
    async (goal: GoalWithProgress, amount: number) => {
      markBusy(goal.id, true)
      try {
        await onIncrement(goal.id, amount)
        const newValue = goal.current_value + amount
        if (newValue >= goal.target_value && !goal.is_complete) {
          const tier = getCelebrationTier(goal)
          onCelebrate(tier, goal.title)
        }
      } finally {
        markBusy(goal.id, false)
      }
    },
    [onIncrement, getCelebrationTier, onCelebrate, markBusy],
  )

  const handleSetValue = useCallback(
    async (goal: GoalWithProgress, value: number) => {
      markBusy(goal.id, true)
      try {
        await onSetValue(goal.id, value)
        if (value >= goal.target_value && !goal.is_complete) {
          const tier = getCelebrationTier(goal)
          onCelebrate(tier, goal.title)
        }
      } finally {
        markBusy(goal.id, false)
      }
    },
    [onSetValue, getCelebrationTier, onCelebrate, markBusy],
  )

  const handleReset = useCallback(
    async (goalId: string) => {
      markBusy(goalId, true)
      try {
        await onReset(goalId)
      } finally {
        markBusy(goalId, false)
      }
    },
    [onReset, markBusy],
  )

  const handleArchive = useCallback(
    async (goalId: string) => {
      // Check if this is the last active goal before archiving
      const willBeEmpty = activeGoals.filter((g) => g.id !== goalId).length === 0
      await onArchive(goalId)
      setShowMenu(false)
      if (willBeEmpty) {
        setScreen("discover")
      }
    },
    [onArchive, activeGoals],
  )

  const handleDelete = useCallback(
    async (goalId: string) => {
      // Check if this is the last active goal before deleting
      const willBeEmpty = activeGoals.filter((g) => g.id !== goalId).length === 0
      await onDelete(goalId)
      setConfirmDeleteId(null)
      setShowMenu(false)
      if (willBeEmpty) {
        setScreen("discover")
      }
    },
    [onDelete, activeGoals],
  )

  const startEdit = useCallback((goal: GoalWithProgress) => {
    setEditingGoalId(goal.id)
    setEditState({
      title: goal.title,
      target_value: goal.target_value,
      period: goal.period,
      motivation_note: goal.motivation_note || "",
    })
    setShowMenu(false)
  }, [])

  // Compute whether edit form has valid, changed values
  const editFormValid = useMemo(() => {
    if (!editingGoalId) return false
    const goal = sortedGoals.find((g) => g.id === editingGoalId)
    if (!goal) return false

    // Title must not be empty
    if (!editState.title.trim()) return false
    // Target must be positive
    if (editState.target_value <= 0) return false

    // Must have at least one change
    const hasChange =
      editState.title !== goal.title ||
      editState.target_value !== goal.target_value ||
      editState.period !== goal.period ||
      (editState.motivation_note || "") !== (goal.motivation_note || "")

    return hasChange
  }, [editingGoalId, editState, sortedGoals])

  const saveEdit = useCallback(async () => {
    if (!editingGoalId || !editFormValid) return
    await onUpdate(editingGoalId, {
      title: editState.title.trim(),
      target_value: editState.target_value,
      period: editState.period as UserGoalInsert["period"],
      motivation_note: editState.motivation_note || null,
    })
    setEditingGoalId(null)
  }, [editingGoalId, editState, editFormValid, onUpdate])

  const cancelEdit = useCallback(() => {
    setEditingGoalId(null)
  }, [])

  // --- Discovery handlers ---
  const handleDiscoveryAdd = useCallback(
    async (template: GoalTemplate) => {
      await onCreate({
        title: template.title,
        life_area: template.lifeArea,
        category: template.lifeArea,
        goal_type:
          template.templateType === "milestone_ladder"
            ? "milestone"
            : template.templateType === "habit_ramp"
              ? "habit_ramp"
              : "recurring",
        goal_nature: template.nature,
        goal_level: template.level,
        display_category: template.displayCategory,
        tracking_type: template.linkedMetric ? "counter" : "counter",
        period: "weekly",
        target_value:
          template.defaultMilestoneConfig?.target ??
          template.defaultRampSteps?.[0]?.frequencyPerWeek ??
          1,
        template_id: template.id,
        linked_metric: template.linkedMetric,
        milestone_config: template.defaultMilestoneConfig as Record<string, unknown> | null,
        ramp_steps: template.defaultRampSteps as unknown as Record<string, unknown>[] | null,
      })
      setAddedFromDiscovery((prev) => new Set(prev).add(template.id))
      // Move to next template
      if (discoveryIndex >= discoveryTemplates.length - 1) {
        setDiscoveryIndex(0)
      }
    },
    [onCreate, discoveryIndex, discoveryTemplates.length],
  )

  const handleDiscoverySkip = useCallback(
    (templateId: string) => {
      setSkippedTemplates((prev) => new Set(prev).add(templateId))
      if (discoveryIndex >= discoveryTemplates.length - 1) {
        setDiscoveryIndex(0)
      }
    },
    [discoveryIndex, discoveryTemplates.length],
  )

  const createCustomGoal = useCallback(async () => {
    if (!customGoal.title.trim()) return
    await onCreate({
      title: customGoal.title.trim(),
      life_area: customGoal.life_area,
      category: customGoal.life_area,
      goal_type: customGoal.goal_type as UserGoalInsert["goal_type"],
      tracking_type: customGoal.tracking_type as UserGoalInsert["tracking_type"],
      period: customGoal.period as UserGoalInsert["period"],
      target_value: customGoal.target_value,
      motivation_note: customGoal.motivation_note || null,
    })
    setCustomGoal({
      title: "",
      life_area: "daygame",
      target_value: 1,
      period: "weekly",
      goal_type: "recurring",
      tracking_type: "counter",
      motivation_note: "",
    })
    if (activeGoals.length > 0) {
      setScreen("focus")
    }
  }, [customGoal, onCreate, activeGoals.length])

  // --- Loading ---
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">Loading goals...</span>
      </div>
    )
  }

  // ============================================================================
  // RENDER: DISCOVERY FLOW (empty state — card swiping)
  // ============================================================================

  if (screen === "discover") {
    return (
      <DiscoveryFlow
        currentTemplate={currentDiscoveryTemplate}
        discoveryTemplates={discoveryTemplates}
        discoveryIndex={discoveryIndex}
        addedCount={addedFromDiscovery.size}
        skippedCount={skippedTemplates.size}
        totalTemplateCount={templates.length}
        activeGoalCount={activeGoals.length}
        lifeAreas={lifeAreas}
        discoveryAreaFilter={discoveryAreaFilter}
        templates={templates}
        onAdd={handleDiscoveryAdd}
        onSkip={handleDiscoverySkip}
        onAreaFilter={setDiscoveryAreaFilter}
        onGoToCustom={() => setScreen("create-custom")}
        onStartUsing={() => {
          setShowLaunchCelebration(true)
          setScreen("focus")
          setFocusIndex(0)
        }}
        hasGoals={activeGoals.length > 0}
        onBack={() => setScreen("focus")}
      />
    )
  }

  // ============================================================================
  // RENDER: CREATE CUSTOM GOAL
  // ============================================================================

  if (screen === "create-custom") {
    return (
      <CreateCustomScreen
        customGoal={customGoal}
        lifeAreas={lifeAreas}
        onCustomGoalChange={setCustomGoal}
        onCreateCustomGoal={createCustomGoal}
        onBack={() =>
          activeGoals.length === 0 ? setScreen("discover") : setScreen("focus")
        }
      />
    )
  }

  // ============================================================================
  // RENDER: COMPACT LIST VIEW (secondary toggle)
  // ============================================================================

  if (screen === "list") {
    return (
      <CompactListView
        goals={sortedGoals}
        busyGoalIds={busyGoalIds}
        getInputMode={getInputMode}
        getButtonIncrements={getButtonIncrements}
        directEntryValues={directEntryValues}
        onIncrement={handleIncrement}
        onSetValue={handleSetValue}
        onDirectEntryChange={(id, val) =>
          setDirectEntryValues((prev) => ({ ...prev, [id]: val }))
        }
        onSelectGoal={(index) => {
          selectGoalByIndex(index)
          setScreen("focus")
        }}
        onSwitchToFocus={() => setScreen("focus")}
        onAdd={() => setScreen("discover")}
      />
    )
  }

  // ============================================================================
  // RENDER: FOCUS MODE (primary — hero card experience)
  // ============================================================================

  if (!focusedGoal) {
    // Edge case: goals exist but somehow no focused goal
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p className="text-sm">No active goals to focus on.</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => setScreen("discover")}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Goals
        </Button>
      </div>
    )
  }

  const areaConfig = getLifeAreaConfig(focusedGoal.life_area || "custom")
  const inputMode = getInputMode(focusedGoal)
  const milestoneInfo = getNextMilestoneInfo(focusedGoal)
  const projectedDate = getProjectedDate(focusedGoal)
  const isBusy = busyGoalIds.has(focusedGoal.id)
  const isEditing = editingGoalId === focusedGoal.id

  return (
    <div className="space-y-4 pb-24">
      {/* "Let's go!" celebration after discovery flow completion */}
      {showLaunchCelebration && (
        <div
          className="flex items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 transition-opacity duration-500"
          style={{ animation: "v11b-launch-fade 1.2s ease-out forwards" }}
        >
          <Rocket className="h-5 w-5 text-emerald-400" />
          <span className="text-sm font-semibold text-emerald-400">
            Let&apos;s go!
          </span>
        </div>
      )}

      {/* --- Top bar: view toggle + add --- */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            className="p-1.5 rounded-md bg-foreground/10 text-foreground"
            title="Focus mode"
          >
            <Focus className="h-4 w-4" />
          </button>
          <button
            onClick={() => setScreen("list")}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
            title="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1"
          onClick={() => setScreen("discover")}
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      {/* --- HERO CARD with side navigation arrows + swipe --- */}
      <div
        className="relative"
        onTouchStart={(e) => {
          const touch = e.touches[0]
          touchStartRef.current = { x: touch.clientX, y: touch.clientY }
        }}
        onTouchEnd={(e) => {
          if (!touchStartRef.current) return
          const touch = e.changedTouches[0]
          const deltaX = touch.clientX - touchStartRef.current.x
          const deltaY = touch.clientY - touchStartRef.current.y
          touchStartRef.current = null
          // Only trigger if horizontal swipe > 60px and more horizontal than vertical
          if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX < 0) navigateGoal(1)   // swipe left = next
            else navigateGoal(-1)              // swipe right = prev
          }
        }}
      >
        {/* Left arrow — absolutely positioned on side */}
        {sortedGoals.length > 1 && (
          <button
            onClick={() => navigateGoal(-1)}
            disabled={focusIndex === 0}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 p-2 rounded-full bg-card border border-border shadow-md text-muted-foreground hover:text-foreground hover:bg-muted/30 disabled:opacity-0 disabled:pointer-events-none transition-all"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        {/* Right arrow — absolutely positioned on side */}
        {sortedGoals.length > 1 && (
          <button
            onClick={() => navigateGoal(1)}
            disabled={focusIndex >= sortedGoals.length - 1}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 p-2 rounded-full bg-card border border-border shadow-md text-muted-foreground hover:text-foreground hover:bg-muted/30 disabled:opacity-0 disabled:pointer-events-none transition-all"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        <HeroCardTransition key={transitionKey} slideDirection={slideDirection} isComplete={focusedGoal.is_complete}>
          {/* Color accent bar */}
          <div className="h-1.5" style={{ backgroundColor: focusedGoal.is_complete ? "#22c55e" : areaConfig.hex }} />

        <div className="p-5 space-y-5">
          {/* Header: life area badge + three-dot menu */}
          <div className="flex items-center justify-between">
            <Badge
              variant="outline"
              className="text-xs font-medium"
              style={{
                borderColor: areaConfig.hex + "40",
                color: areaConfig.hex,
                backgroundColor: areaConfig.hex + "10",
              }}
            >
              {areaConfig.name}
            </Badge>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 rounded-md hover:bg-muted/30 text-muted-foreground transition-colors"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {/* Three-dot dropdown menu */}
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-lg border border-border bg-card shadow-lg py-1">
                  <button
                    onClick={() => startEdit(focusedGoal)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted/30 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleArchive(focusedGoal.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted/30 transition-colors"
                  >
                    <Archive className="h-3.5 w-3.5" /> Archive
                  </button>
                  {confirmDeleteId === focusedGoal.id ? (
                    <div className="px-3 py-2 space-y-1">
                      <p className="text-xs text-destructive">Delete permanently?</p>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs text-destructive border-destructive/30 flex-1"
                          onClick={() => handleDelete(focusedGoal.id)}
                        >
                          Yes
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs flex-1"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          No
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(focusedGoal.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive/70 hover:bg-muted/30 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Editing mode */}
          {isEditing ? (
            <div className="space-y-3">
              <Input
                value={editState.title}
                onChange={(e) =>
                  setEditState((prev) => ({ ...prev, title: e.target.value }))
                }
                className="text-lg font-semibold bg-background"
                autoFocus
              />
              <div className="flex gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-muted-foreground">Target</label>
                  <Input
                    type="number"
                    value={editState.target_value}
                    onChange={(e) =>
                      setEditState((prev) => ({
                        ...prev,
                        target_value: Number(e.target.value) || 0,
                      }))
                    }
                    min={1}
                    className="h-8 w-24 bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-muted-foreground">Period</label>
                  <select
                    value={editState.period}
                    onChange={(e) =>
                      setEditState((prev) => ({ ...prev, period: e.target.value }))
                    }
                    className="h-8 text-sm bg-background border border-border rounded px-2 text-foreground"
                  >
                    {PERIOD_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-muted-foreground">
                  Motivation note
                </label>
                <Input
                  value={editState.motivation_note}
                  onChange={(e) =>
                    setEditState((prev) => ({
                      ...prev,
                      motivation_note: e.target.value,
                    }))
                  }
                  placeholder="Why does this matter to you?"
                  className="bg-background"
                />
              </div>
              {/* Validation hints */}
              {editState.title.trim() === "" && (
                <p className="text-xs text-destructive">Title cannot be empty</p>
              )}
              {editState.target_value <= 0 && (
                <p className="text-xs text-destructive">Target must be greater than 0</p>
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={cancelEdit}>
                  Cancel
                </Button>
                <Button size="sm" onClick={saveEdit} disabled={!editFormValid}>
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Goal title — large */}
              <div className="flex items-start gap-3">
                <h2 className="text-xl font-bold text-foreground leading-tight flex-1">
                  {focusedGoal.title}
                </h2>
                {focusedGoal.is_complete && (
                  <Badge className="bg-emerald-500 text-white border-emerald-500 gap-1 flex-shrink-0">
                    <Trophy className="h-3 w-3" />
                    Completed!
                  </Badge>
                )}
              </div>

              {/* Large progress bar */}
              <div className="space-y-2">
                <div className="w-full h-3 rounded-full bg-muted/30 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                      completionPulse ? "animate-pulse" : ""
                    }`}
                    style={{
                      width: `${Math.min(100, focusedGoal.progress_percentage)}%`,
                      backgroundColor: focusedGoal.is_complete
                        ? "#22c55e"
                        : areaConfig.hex,
                    }}
                  />
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {focusedGoal.current_value} / {focusedGoal.target_value}{" "}
                    <span className="text-xs">{focusedGoal.period}</span>
                  </span>
                  <span
                    className="text-2xl font-bold tabular-nums"
                    style={{
                      color: focusedGoal.is_complete ? "#22c55e" : areaConfig.hex,
                    }}
                  >
                    {focusedGoal.progress_percentage}%
                  </span>
                </div>
              </div>

              {/* Streak + Milestone + Deadline row */}
              <div className="flex items-center gap-4 flex-wrap">
                {focusedGoal.current_streak > 0 && (
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <Flame className="h-4 w-4" />
                    <span className="text-sm font-semibold tabular-nums">
                      {focusedGoal.current_streak} streak
                    </span>
                  </div>
                )}
                {milestoneInfo && (
                  <div className="flex items-center gap-1.5 text-blue-400">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm tabular-nums">
                      Next: {milestoneInfo.nextValue}{" "}
                      <span className="text-xs text-muted-foreground">
                        ({milestoneInfo.remaining} to go)
                      </span>
                    </span>
                  </div>
                )}
                {focusedGoal.days_remaining != null && (
                  <div className={`flex items-center gap-1.5 ${
                    focusedGoal.days_remaining <= 0
                      ? "text-destructive"
                      : focusedGoal.days_remaining <= 7
                        ? "text-amber-400"
                        : "text-muted-foreground"
                  }`}>
                    <Clock className="h-3.5 w-3.5" />
                    <span className="text-sm tabular-nums">
                      {focusedGoal.days_remaining <= 0
                        ? "Overdue"
                        : `${focusedGoal.days_remaining}d left`}
                    </span>
                  </div>
                )}
              </div>

              {/* Projected completion note */}
              {projectedDate?.finalLabel && (
                <p className="text-xs text-muted-foreground">
                  Projected completion: {projectedDate.finalLabel}
                  {projectedDate.nextLabel && (
                    <span className="ml-2 text-muted-foreground/60">
                      (next: {projectedDate.nextLabel})
                    </span>
                  )}
                </p>
              )}

              {/* Progress controls — oversized for hero/focus paradigm */}
              {!focusedGoal.is_complete ? (
                <div className="flex items-center gap-3 flex-wrap">
                  {inputMode === "boolean" && (
                    <button
                      onClick={() => handleIncrement(focusedGoal, 1)}
                      disabled={isBusy}
                      className="w-24 h-24 rounded-2xl flex flex-col items-center justify-center gap-1 text-white font-semibold text-base transition-all active:scale-95 disabled:opacity-50 shadow-lg"
                      style={{ backgroundColor: areaConfig.hex }}
                    >
                      {isBusy ? (
                        <Loader2 className="h-7 w-7 animate-spin" />
                      ) : (
                        <Check className="h-7 w-7" />
                      )}
                      Done
                    </button>
                  )}
                  {inputMode === "buttons" &&
                    getButtonIncrements(focusedGoal.target_value).map((inc) => (
                      <Button
                        key={inc}
                        variant="outline"
                        onClick={() => handleIncrement(focusedGoal, inc)}
                        disabled={isBusy}
                        className="h-12 min-w-[64px] text-lg tabular-nums font-bold"
                      >
                        {isBusy ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          `+${inc}`
                        )}
                      </Button>
                    ))}
                  {inputMode === "direct-entry" && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={directEntryValues[focusedGoal.id] || ""}
                        onChange={(e) =>
                          setDirectEntryValues((prev) => ({
                            ...prev,
                            [focusedGoal.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            directEntryValues[focusedGoal.id]
                          ) {
                            handleSetValue(
                              focusedGoal,
                              Number(directEntryValues[focusedGoal.id]),
                            )
                            setDirectEntryValues((prev) => ({
                              ...prev,
                              [focusedGoal.id]: "",
                            }))
                          }
                        }}
                        placeholder="Enter value"
                        className="h-12 w-36 text-lg bg-background"
                      />
                      <Button
                        variant="outline"
                        className="h-12 text-lg px-5"
                        onClick={() => {
                          if (directEntryValues[focusedGoal.id]) {
                            handleSetValue(
                              focusedGoal,
                              Number(directEntryValues[focusedGoal.id]),
                            )
                            setDirectEntryValues((prev) => ({
                              ...prev,
                              [focusedGoal.id]: "",
                            }))
                          }
                        }}
                        disabled={isBusy || !directEntryValues[focusedGoal.id]}
                      >
                        Set
                      </Button>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReset(focusedGoal.id)}
                    disabled={isBusy}
                    className="text-muted-foreground"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Reset
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-4">
                    <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Trophy className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-emerald-400 block">
                        Goal Complete!
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {focusedGoal.goal_type === "recurring"
                          ? "Reset to start a new period"
                          : "You did it!"}
                      </span>
                    </div>
                  </div>
                  {focusedGoal.goal_type === "recurring" && (
                    <Button
                      variant="outline"
                      className="w-full h-11 gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                      onClick={() => handleReset(focusedGoal.id)}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset for Next Period
                    </Button>
                  )}
                  {focusedGoal.goal_type !== "recurring" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReset(focusedGoal.id)}
                      className="text-xs text-muted-foreground"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" /> Reset
                    </Button>
                  )}
                </div>
              )}

              {/* Motivation note */}
              {focusedGoal.motivation_note && (
                <p className="text-sm italic text-muted-foreground border-l-2 pl-3" style={{ borderColor: areaConfig.hex + "60" }}>
                  &ldquo;{focusedGoal.motivation_note}&rdquo;
                </p>
              )}
            </>
          )}
        </div>
        </HeroCardTransition>
      </div>

      {/* --- Dot indicators (centered below hero card, scrollable for many goals) --- */}
      {sortedGoals.length > 1 && (
        <div className="flex justify-center">
          <div
            ref={dotStripRef}
            className="hide-scrollbar flex items-center gap-1.5 overflow-x-auto max-w-full px-2"
          >
            {sortedGoals.map((g, i) => {
              const gArea = getLifeAreaConfig(g.life_area || "custom")
              return (
                <button
                  key={g.id}
                  onClick={() => selectGoalByIndex(i)}
                  className="flex-shrink-0 rounded-full transition-all duration-200"
                  style={{
                    width: i === focusIndex ? 16 : 8,
                    height: 8,
                    backgroundColor:
                      i === focusIndex ? gArea.hex : "currentColor",
                    opacity: i === focusIndex ? 1 : 0.2,
                  }}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* --- Thumbnail strip --- */}
      {sortedGoals.length > 1 && (
        <div
          ref={thumbnailStripRef}
          className="hide-scrollbar overflow-x-auto -mx-1 px-1"
        >
          <div className="flex gap-2" style={{ minWidth: "min-content" }}>
            {sortedGoals.map((g, i) => {
              const gArea = getLifeAreaConfig(g.life_area || "custom")
              const isFocused = i === focusIndex
              return (
                <button
                  key={g.id}
                  onClick={() => selectGoalByIndex(i)}
                  className={`flex-shrink-0 w-[140px] rounded-lg border-2 overflow-hidden text-left transition-all ${
                    isFocused
                      ? "bg-muted/20 ring-1"
                      : "border-border bg-card hover:bg-muted/10"
                  }`}
                  style={
                    isFocused
                      ? {
                          borderColor: gArea.hex,
                          boxShadow: `0 0 0 1px ${gArea.hex}30`,
                        }
                      : undefined
                  }
                >
                  {/* Life area color accent — left border strip */}
                  <div className="flex">
                    <div
                      className="w-1 flex-shrink-0 self-stretch"
                      style={{ backgroundColor: gArea.hex }}
                    />
                    <div className="px-2.5 py-2 flex-1 min-w-0">
                  <div className="text-[10px] text-muted-foreground truncate mb-0.5">
                    {gArea.name}
                  </div>
                  <div className="text-xs font-medium text-foreground truncate">
                    {g.title}
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    {/* Mini progress bar */}
                    <div className="flex-1 h-1 rounded-full bg-muted/30 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, g.progress_percentage)}%`,
                          backgroundColor: g.is_complete ? "#22c55e" : gArea.hex,
                        }}
                      />
                    </div>
                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      {g.progress_percentage}%
                    </span>
                  </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Discovery Flow — card-swiping one-at-a-time template experience
// ============================================================================

function DiscoveryFlow({
  currentTemplate,
  discoveryTemplates,
  discoveryIndex,
  addedCount,
  skippedCount,
  totalTemplateCount,
  activeGoalCount,
  lifeAreas,
  discoveryAreaFilter,
  templates,
  onAdd,
  onSkip,
  onAreaFilter,
  onGoToCustom,
  onStartUsing,
  hasGoals,
  onBack,
}: {
  currentTemplate: GoalTemplate | null
  discoveryTemplates: GoalTemplate[]
  discoveryIndex: number
  addedCount: number
  skippedCount: number
  totalTemplateCount: number
  activeGoalCount: number
  lifeAreas: LifeAreaConfig[]
  discoveryAreaFilter: string | null
  templates: GoalTemplate[]
  onAdd: (template: GoalTemplate) => Promise<void>
  onSkip: (templateId: string) => void
  onAreaFilter: (area: string | null) => void
  onGoToCustom: () => void
  onStartUsing: () => void
  hasGoals: boolean
  onBack: () => void
}) {
  const [isAdding, setIsAdding] = useState(false)
  const [justAdded, setJustAdded] = useState(false)

  const handleAdd = async (template: GoalTemplate) => {
    setIsAdding(true)
    try {
      await onAdd(template)
      setJustAdded(true)
      setTimeout(() => setJustAdded(false), 700)
    } finally {
      setIsAdding(false)
    }
  }

  // Find the next life area with remaining templates (for auto-suggest)
  const nextAreaSuggestion = useMemo(() => {
    if (!discoveryAreaFilter) return null
    if (discoveryTemplates.length > 0) return null
    // Current area is exhausted — find next area with templates
    const areasWithTemplates = lifeAreas
      .filter((la) => la.id !== "custom" && la.id !== discoveryAreaFilter)
      .filter((la) => templates.some((t) => t.lifeArea === la.id))
    return areasWithTemplates[0] ?? null
  }, [discoveryAreaFilter, discoveryTemplates.length, lifeAreas, templates])

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        {hasGoals && (
          <button
            onClick={onBack}
            className="p-1.5 rounded hover:bg-muted/30 text-muted-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-foreground">
            {hasGoals ? "Discover Goals" : "Find Your Focus"}
          </h2>
          <p className="text-xs text-muted-foreground">
            Swipe through goals — add what resonates, skip the rest
          </p>
          {/* Exploration progress bar */}
          {totalTemplateCount > 0 && (
            <div className="mt-1.5 w-full h-1 rounded-full bg-muted/30 overflow-hidden">
              <div
                className="h-full rounded-full bg-foreground/20 transition-all duration-500 ease-out"
                style={{
                  width: `${Math.min(100, ((addedCount + skippedCount) / totalTemplateCount) * 100)}%`,
                }}
              />
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={onGoToCustom}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Custom
        </Button>
      </div>

      {/* Area filter pills */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => onAreaFilter(null)}
          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
            discoveryAreaFilter === null
              ? "bg-foreground/10 border-foreground/20 text-foreground"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          All
        </button>
        {lifeAreas
          .filter((la) => la.id !== "custom")
          .map((la) => {
            const count = templates.filter((t) => t.lifeArea === la.id).length
            if (count === 0) return null
            return (
              <button
                key={la.id}
                onClick={() =>
                  onAreaFilter(discoveryAreaFilter === la.id ? null : la.id)
                }
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  discoveryAreaFilter === la.id
                    ? "border-foreground/20 text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
                style={
                  discoveryAreaFilter === la.id
                    ? { backgroundColor: la.hex + "20", borderColor: la.hex + "40" }
                    : undefined
                }
              >
                {la.name}
              </button>
            )
          })}
      </div>

      {/* Added count badge */}
      {addedCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <span className="text-sm text-foreground flex-1">
            {addedCount} goal{addedCount !== 1 ? "s" : ""} added
          </span>
          {activeGoalCount >= 3 && (
            <Button size="sm" className="h-7 gap-1" onClick={onStartUsing}>
              <ArrowRight className="h-3.5 w-3.5" />
              Start
            </Button>
          )}
        </div>
      )}

      {/* Template card — the swipeable hero */}
      {currentTemplate ? (
        <DiscoveryCard
          template={currentTemplate}
          remainingCount={discoveryTemplates.length}
          isAdding={isAdding}
          justAdded={justAdded}
          onAdd={() => handleAdd(currentTemplate)}
          onSkip={() => onSkip(currentTemplate.id)}
        />
      ) : (
        <div className="rounded-xl border border-border bg-card p-8 text-center space-y-3">
          <Rocket className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {addedCount > 0
              ? "You've seen all available templates!"
              : "No templates match this filter."}
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            {nextAreaSuggestion && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAreaFilter(nextAreaSuggestion.id)}
                style={{
                  borderColor: nextAreaSuggestion.hex + "40",
                  color: nextAreaSuggestion.hex,
                }}
              >
                <ArrowRight className="h-3.5 w-3.5 mr-1" />
                Try {nextAreaSuggestion.name}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onGoToCustom}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Create Custom
            </Button>
            {activeGoalCount > 0 && (
              <Button size="sm" onClick={onStartUsing}>
                <ArrowRight className="h-3.5 w-3.5 mr-1" /> Go to Goals
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Prompt to start once they have enough */}
      {activeGoalCount >= 3 && !hasGoals && (
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-2">
            You have {activeGoalCount} goals — ready to get started?
          </p>
          <Button onClick={onStartUsing} className="gap-2">
            <Rocket className="h-4 w-4" />
            Start Using App
          </Button>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Discovery Card — single template card with Add / Skip
// ============================================================================

function DiscoveryCard({
  template,
  remainingCount,
  isAdding,
  justAdded,
  onAdd,
  onSkip,
}: {
  template: GoalTemplate
  remainingCount: number
  isAdding: boolean
  justAdded: boolean
  onAdd: () => void
  onSkip: () => void
}) {
  const areaConfig = getLifeAreaConfig(template.lifeArea)
  const [celebrateScale, setCelebrateScale] = useState(false)

  // Drive celebration via scale transition instead of injecting <style> tags
  useEffect(() => {
    if (!justAdded) {
      setCelebrateScale(false)
      return
    }
    // Kick to scale-up, then schedule scale-back
    setCelebrateScale(true)
    const timer = setTimeout(() => setCelebrateScale(false), 300)
    return () => clearTimeout(timer)
  }, [justAdded])

  return (
    <div
      className={`rounded-xl border-2 bg-card overflow-hidden shadow-lg shadow-black/5 ${
        justAdded
          ? "border-emerald-500/60"
          : "border-border"
      }`}
      style={{
        transform: celebrateScale ? "scale(1.03)" : "scale(1)",
        transition: "transform 0.3s ease-out, border-color 0.2s ease",
      }}
    >
      {/* Color accent */}
      <div className="h-1.5" style={{ backgroundColor: areaConfig.hex }} />

      <div className="p-6 space-y-4">
        {/* Area + remaining count */}
        <div className="flex items-center justify-between">
          <Badge
            variant="outline"
            className="text-xs"
            style={{
              borderColor: areaConfig.hex + "40",
              color: areaConfig.hex,
              backgroundColor: areaConfig.hex + "10",
            }}
          >
            {areaConfig.name}
          </Badge>
          <span className="text-xs text-muted-foreground tabular-nums">
            {remainingCount} {remainingCount === 1 ? "template" : "templates"} left
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-foreground">
          {template.title}
        </h3>

        {/* Meta badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            {LEVEL_LABELS[template.level] ?? `L${template.level}`}
          </Badge>
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            {template.nature}
          </Badge>
          {template.templateType && (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              {template.templateType === "milestone_ladder" ? "Milestone" : "Ramp"}
            </Badge>
          )}
          {template.linkedMetric && (
            <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-400/30">
              auto-sync
            </Badge>
          )}
          {template.priority === "core" && (
            <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
              <Star className="h-3 w-3" /> Core
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1 h-12 gap-2 text-base"
            onClick={onSkip}
          >
            <SkipForward className="h-4 w-4" />
            Skip
          </Button>
          <Button
            className="flex-1 h-12 gap-2 text-base"
            style={{ backgroundColor: areaConfig.hex }}
            onClick={onAdd}
            disabled={isAdding}
          >
            {isAdding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : justAdded ? (
              <Check className="h-5 w-5" />
            ) : (
              <Heart className="h-4 w-4" />
            )}
            {justAdded ? "Added!" : "Add Goal"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Compact List View — secondary, toggled from focus mode
// ============================================================================

function CompactListView({
  goals,
  busyGoalIds,
  getInputMode,
  getButtonIncrements,
  directEntryValues,
  onIncrement,
  onSetValue,
  onDirectEntryChange,
  onSelectGoal,
  onSwitchToFocus,
  onAdd,
}: {
  goals: GoalWithProgress[]
  busyGoalIds: Set<string>
  getInputMode: (goal: GoalWithProgress) => InputMode
  getButtonIncrements: (target: number) => number[]
  directEntryValues: Record<string, string>
  onIncrement: (goal: GoalWithProgress, amount: number) => Promise<void>
  onSetValue: (goal: GoalWithProgress, value: number) => Promise<void>
  onDirectEntryChange: (goalId: string, value: string) => void
  onSelectGoal: (index: number) => void
  onSwitchToFocus: () => void
  onAdd: () => void
}) {
  return (
    <div className="space-y-3 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={onSwitchToFocus}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
            title="Focus mode"
          >
            <Focus className="h-4 w-4" />
          </button>
          <button
            className="p-1.5 rounded-md bg-foreground/10 text-foreground"
            title="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1"
          onClick={onAdd}
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      {/* Summary header */}
      {goals.length > 0 && (
        <div className="flex items-center gap-4 px-1 text-xs text-muted-foreground">
          <span className="tabular-nums">
            <span className="font-medium text-foreground">{goals.length}</span> active
          </span>
          <span className="tabular-nums">
            <span className="font-medium text-emerald-400">
              {goals.filter((g) => g.is_complete).length}
            </span>{" "}
            complete
          </span>
          <span className="tabular-nums">
            avg{" "}
            <span className="font-medium text-foreground">
              {goals.length > 0
                ? Math.round(
                    goals.reduce((sum, g) => sum + g.progress_percentage, 0) /
                      goals.length,
                  )
                : 0}
              %
            </span>
          </span>
        </div>
      )}

      {/* Compact goal rows */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {goals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No goals yet.</p>
          </div>
        ) : (
          goals.map((goal, index) => {
            const areaConfig = getLifeAreaConfig(goal.life_area || "custom")
            const isBusy = busyGoalIds.has(goal.id)
            const inputMode = getInputMode(goal)

            return (
              <div
                key={goal.id}
                className="group flex items-center gap-2 px-3 py-2 border-b border-border last:border-b-0 hover:bg-muted/10 transition-colors"
              >
                {/* Color pip */}
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: areaConfig.hex }}
                />

                {/* Title — clickable to focus */}
                <button
                  onClick={() => onSelectGoal(index)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div
                    className={`text-sm truncate ${
                      goal.is_complete
                        ? "line-through text-muted-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {goal.title}
                  </div>
                </button>

                {/* Progress + streak */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {goal.current_value}/{goal.target_value}
                  </span>
                  {goal.current_streak > 0 && (
                    <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                      <Flame className="h-2.5 w-2.5" />
                      {goal.current_streak}
                    </span>
                  )}
                </div>

                {/* Quick action */}
                {!goal.is_complete && (
                  <div className="flex-shrink-0">
                    {isBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : inputMode === "boolean" ? (
                      <button
                        onClick={() => onIncrement(goal, 1)}
                        className="h-7 w-7 rounded-md border border-border flex items-center justify-center hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-colors"
                      >
                        <Check className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    ) : inputMode === "buttons" ? (
                      <button
                        onClick={() =>
                          onIncrement(
                            goal,
                            getButtonIncrements(goal.target_value)[0] ?? 1,
                          )
                        }
                        className="h-7 min-w-[28px] px-1.5 rounded-md border border-border text-[11px] font-medium tabular-nums hover:bg-blue-500/20 hover:border-blue-500/40 transition-colors text-muted-foreground"
                      >
                        +{getButtonIncrements(goal.target_value)[0] ?? 1}
                      </button>
                    ) : (
                      <div className="flex items-center gap-0.5">
                        <Input
                          type="number"
                          value={directEntryValues[goal.id] || ""}
                          onChange={(e) =>
                            onDirectEntryChange(goal.id, e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && directEntryValues[goal.id]) {
                              onSetValue(goal, Number(directEntryValues[goal.id]))
                              onDirectEntryChange(goal.id, "")
                            }
                          }}
                          placeholder={String(goal.current_value)}
                          className="h-7 w-14 text-xs bg-background text-center"
                        />
                        <button
                          onClick={() => {
                            if (directEntryValues[goal.id]) {
                              onSetValue(
                                goal,
                                Number(directEntryValues[goal.id]),
                              )
                              onDirectEntryChange(goal.id, "")
                            }
                          }}
                          className="h-7 w-7 rounded-md border border-border flex items-center justify-center hover:bg-blue-500/20 hover:border-blue-500/40 transition-colors"
                        >
                          <Check className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {goal.is_complete && (
                  <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Create Custom Goal Screen
// ============================================================================

function CreateCustomScreen({
  customGoal,
  lifeAreas,
  onCustomGoalChange,
  onCreateCustomGoal,
  onBack,
}: {
  customGoal: {
    title: string
    life_area: string
    target_value: number
    period: string
    goal_type: string
    tracking_type: string
    motivation_note: string
  }
  lifeAreas: LifeAreaConfig[]
  onCustomGoalChange: (goal: typeof customGoal) => void
  onCreateCustomGoal: () => Promise<void>
  onBack: () => void
}) {
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async () => {
    setIsCreating(true)
    try {
      await onCreateCustomGoal()
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 rounded hover:bg-muted/30 text-muted-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Custom Goal</h2>
          <p className="text-xs text-muted-foreground">
            Define your own goal
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Goal Title
          </label>
          <Input
            value={customGoal.title}
            onChange={(e) =>
              onCustomGoalChange({ ...customGoal, title: e.target.value })
            }
            placeholder="e.g., Run 5km three times per week"
            className="bg-background"
            autoFocus
          />
        </div>

        {/* Life area */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Life Area
          </label>
          <div className="flex flex-wrap gap-1.5">
            {lifeAreas
              .filter((la) => la.id !== "custom")
              .map((la) => (
                <button
                  key={la.id}
                  onClick={() =>
                    onCustomGoalChange({ ...customGoal, life_area: la.id })
                  }
                  className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors ${
                    customGoal.life_area === la.id
                      ? "text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                  style={
                    customGoal.life_area === la.id
                      ? {
                          backgroundColor: la.hex + "20",
                          borderColor: la.hex + "40",
                        }
                      : undefined
                  }
                >
                  {la.name}
                </button>
              ))}
          </div>
        </div>

        {/* Target + Period */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Target Value
            </label>
            <Input
              type="number"
              value={customGoal.target_value}
              onChange={(e) =>
                onCustomGoalChange({
                  ...customGoal,
                  target_value: Number(e.target.value) || 1,
                })
              }
              className="bg-background"
              min={1}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Period
            </label>
            <select
              value={customGoal.period}
              onChange={(e) =>
                onCustomGoalChange({ ...customGoal, period: e.target.value })
              }
              className="w-full h-9 text-sm bg-background border border-border rounded-md px-3 text-foreground"
            >
              {PERIOD_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Goal type + tracking type */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Goal Type
            </label>
            <select
              value={customGoal.goal_type}
              onChange={(e) =>
                onCustomGoalChange({ ...customGoal, goal_type: e.target.value })
              }
              className="w-full h-9 text-sm bg-background border border-border rounded-md px-3 text-foreground"
            >
              <option value="recurring">Recurring</option>
              <option value="milestone">Milestone</option>
              <option value="habit_ramp">Habit Ramp</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Tracking
            </label>
            <select
              value={customGoal.tracking_type}
              onChange={(e) =>
                onCustomGoalChange({
                  ...customGoal,
                  tracking_type: e.target.value,
                })
              }
              className="w-full h-9 text-sm bg-background border border-border rounded-md px-3 text-foreground"
            >
              <option value="counter">Counter</option>
              <option value="boolean">Boolean</option>
              <option value="percentage">Percentage</option>
              <option value="streak">Streak</option>
            </select>
          </div>
        </div>

        {/* Motivation note */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Motivation Note (optional)
          </label>
          <Input
            value={customGoal.motivation_note}
            onChange={(e) =>
              onCustomGoalChange({
                ...customGoal,
                motivation_note: e.target.value,
              })
            }
            placeholder="Why does this goal matter to you?"
            className="bg-background"
          />
        </div>

        {/* Create button */}
        <Button
          onClick={handleCreate}
          disabled={!customGoal.title.trim() || isCreating}
          className="w-full gap-2"
        >
          {isCreating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Rocket className="h-4 w-4" />
          )}
          Create Goal
        </Button>
      </div>

      {/* Quick suggestions */}
      {(() => {
        const la = lifeAreas.find((l) => l.id === customGoal.life_area)
        if (!la || la.suggestions.length === 0) return null
        return (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">
              Quick suggestions for {la.name}
            </div>
            <div className="grid gap-1">
              {la.suggestions.slice(0, 6).map((s) => (
                <button
                  key={s.title}
                  onClick={() =>
                    onCustomGoalChange({
                      ...customGoal,
                      title: s.title,
                      target_value: s.defaultTarget,
                      period: s.defaultPeriod,
                    })
                  }
                  className="text-left text-xs px-3 py-2 rounded-md border border-border hover:bg-muted/20 transition-colors text-muted-foreground hover:text-foreground"
                >
                  {s.title}
                  {s.featured && (
                    <Star className="inline h-2.5 w-2.5 ml-1 text-amber-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ============================================================================
// Hero Card Transition — fade+slide wrapper for focus mode navigation
// ============================================================================

function HeroCardTransition({
  slideDirection,
  children,
  isComplete = false,
}: {
  slideDirection: "left" | "right" | null
  children: React.ReactNode
  isComplete?: boolean
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Trigger the "slide in" on the next frame after mount
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const initialOffset = slideDirection === "right" ? 30 : slideDirection === "left" ? -30 : 0

  return (
    <div
      className={`rounded-xl border overflow-hidden shadow-xl shadow-black/10 dark:shadow-black/30 ${
        isComplete
          ? "border-emerald-500/40"
          : "border-border"
      }`}
      style={{
        transform: mounted ? "translateX(0)" : `translateX(${initialOffset}px)`,
        opacity: mounted ? 1 : slideDirection ? 0.6 : 1,
        transition: "transform 0.25s ease-out, opacity 0.25s ease-out",
        background: isComplete
          ? "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.04) 50%, rgba(6, 78, 59, 0.06) 100%)"
          : undefined,
      }}
    >
      {children}
    </div>
  )
}
