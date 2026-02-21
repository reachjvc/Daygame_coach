"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Plus, Minus, Lightbulb, Calendar, Trash2, Archive } from "lucide-react"
import { LIFE_AREAS, getLifeAreaConfig } from "../data/lifeAreas"
import { MilestoneCurveEditor } from "./MilestoneCurveEditor"
import { HabitRampEditor } from "./HabitRampEditor"
import { UpwardConnectionPrompt } from "./UpwardConnectionPrompt"
import { deriveChildLevel } from "../goalsService"
import { getCurveTheme } from "../curveThemes"
import type {
  GoalWithProgress,
  GoalPeriod,
  GoalTrackingType,
  GoalType,
  GoalNature,
  LinkedMetric,
  GoalSuggestion,
  MilestoneLadderConfig,
  HabitRampStep,
} from "../types"

interface GoalFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal?: GoalWithProgress
  parentGoals?: GoalWithProgress[]
  onSuccess?: () => void
  defaultLifeArea?: string | null
  defaultParentGoalId?: string | null
}

const PERIOD_OPTIONS: { value: GoalPeriod; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
]

const TRACKING_TYPE_OPTIONS: { value: GoalTrackingType; label: string; description: string }[] = [
  { value: "counter", label: "Counter", description: "Track towards a target number" },
  { value: "boolean", label: "Yes/No", description: "Simple done or not done" },
]

const LINKED_METRIC_OPTIONS: { value: LinkedMetric; label: string; group: string }[] = [
  { value: null, label: "None (manual tracking)", group: "none" },
  // Weekly (resets each week)
  { value: "approaches_weekly", label: "Approaches (weekly)", group: "weekly" },
  { value: "sessions_weekly", label: "Sessions (weekly)", group: "weekly" },
  { value: "numbers_weekly", label: "Phone numbers (weekly)", group: "weekly" },
  { value: "instadates_weekly", label: "Instadates (weekly)", group: "weekly" },
  // Cumulative (lifetime total)
  { value: "approaches_cumulative", label: "Approaches (cumulative)", group: "cumulative" },
  { value: "sessions_cumulative", label: "Sessions (cumulative)", group: "cumulative" },
  { value: "numbers_cumulative", label: "Phone numbers (cumulative)", group: "cumulative" },
  { value: "instadates_cumulative", label: "Instadates (cumulative)", group: "cumulative" },
]

export function GoalFormModal({ open, onOpenChange, goal, parentGoals = [], onSuccess, defaultLifeArea, defaultParentGoalId }: GoalFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMode, setSubmitMode] = useState<"add" | "continue" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Form state
  const [title, setTitle] = useState("")
  const [lifeArea, setLifeArea] = useState<string>(defaultLifeArea || "daygame")
  const [customLifeArea, setCustomLifeArea] = useState("")
  const [goalType, setGoalType] = useState<GoalType>("recurring")
  const [trackingType, setTrackingType] = useState<GoalTrackingType>("counter")
  const [period, setPeriod] = useState<GoalPeriod>("weekly")
  const [targetValue, setTargetValue] = useState(1)
  const [targetDate, setTargetDate] = useState("")
  const [parentGoalId, setParentGoalId] = useState<string | null>(null)
  const [description, setDescription] = useState("")
  const [motivationNote, setMotivationNote] = useState("")
  const [linkedMetric, setLinkedMetric] = useState<LinkedMetric>(null)
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null)
  const [goalNature, setGoalNature] = useState<GoalNature>("input")

  // Track whether user has manually picked a life area (for override warning)
  const [userPickedLifeArea, setUserPickedLifeArea] = useState(false)
  const [lifeAreaOverrideNote, setLifeAreaOverrideNote] = useState<string | null>(null)

  // Milestone curve editor state
  const [milestoneConfig, setMilestoneConfig] = useState<MilestoneLadderConfig>({
    start: 1,
    target: 100,
    steps: 10,
    curveTension: 2,
  })
  const [showCurveEditor, setShowCurveEditor] = useState(false)

  // Habit ramp editor state
  const [rampSteps, setRampSteps] = useState<HabitRampStep[]>([
    { frequencyPerWeek: 10, durationWeeks: 4 },
    { frequencyPerWeek: 15, durationWeeks: 4 },
    { frequencyPerWeek: 25, durationWeeks: 8 },
  ])

  const isEditing = !!goal
  const theme = getCurveTheme("zen")

  // Initialize form when editing
  useEffect(() => {
    if (goal) {
      setTitle(goal.title)
      const knownArea = LIFE_AREAS.find((a) => a.id === goal.life_area)
      if (knownArea) {
        setLifeArea(goal.life_area)
        setCustomLifeArea("")
      } else {
        setLifeArea("custom")
        setCustomLifeArea(goal.life_area)
      }
      setGoalType(goal.goal_type)
      setTrackingType(goal.tracking_type)
      setPeriod(goal.period)
      setTargetValue(goal.target_value)
      setTargetDate(goal.target_date || "")
      setParentGoalId(goal.parent_goal_id)
      setDescription(goal.description || "")
      setMotivationNote(goal.motivation_note || "")
      setLinkedMetric(goal.linked_metric)
      setGoalNature(goal.goal_nature || "input")
      // Restore milestone config if saved
      if (goal.milestone_config) {
        setMilestoneConfig(goal.milestone_config as unknown as MilestoneLadderConfig)
        setShowCurveEditor(true)
      }
      // Restore ramp steps if saved
      if (goal.ramp_steps) {
        setRampSteps(goal.ramp_steps as unknown as HabitRampStep[])
      }
    }
  }, [goal])

  const resetForm = () => {
    setTitle("")
    setLifeArea(defaultLifeArea || "daygame")
    setCustomLifeArea("")
    setGoalType("recurring")
    setTrackingType("counter")
    setPeriod("weekly")
    setTargetValue(1)
    setTargetDate("")
    setParentGoalId(defaultParentGoalId ?? null)
    setDescription("")
    setMotivationNote("")
    setLinkedMetric(null)
    setSelectedSuggestion(null)
    setGoalNature("input")
    setMilestoneConfig({ start: 1, target: 100, steps: 10, curveTension: 2 })
    setShowCurveEditor(false)
    setRampSteps([
      { frequencyPerWeek: 10, durationWeeks: 4 },
      { frequencyPerWeek: 15, durationWeeks: 4 },
      { frequencyPerWeek: 25, durationWeeks: 8 },
    ])
    setError(null)
    setSuccessMessage(null)
    setShowDeleteConfirm(false)
    setUserPickedLifeArea(false)
    setLifeAreaOverrideNote(null)
  }

  // Pre-fill parent when opening as "add child"
  useEffect(() => {
    if (!goal && defaultParentGoalId) {
      setParentGoalId(defaultParentGoalId)
    }
  }, [defaultParentGoalId, goal])

  const effectiveLifeArea = lifeArea === "custom" ? customLifeArea : lifeArea
  const areaConfig = getLifeAreaConfig(effectiveLifeArea || "custom")
  const suggestions = areaConfig.suggestions

  // Filter parent goals by life area for dropdown, excluding self to prevent cycles
  const filteredParentGoals = useMemo(() => {
    if (!parentGoals.length) return []
    const eligible = goal ? parentGoals.filter((g) => g.id !== goal.id) : parentGoals
    if (!effectiveLifeArea) return eligible
    return eligible.filter((g) => g.life_area === effectiveLifeArea || !effectiveLifeArea)
  }, [parentGoals, effectiveLifeArea, goal])

  // Auto-suggest life area when parent is selected
  useEffect(() => {
    if (parentGoalId && parentGoals.length) {
      const parent = parentGoals.find((g) => g.id === parentGoalId)
      if (parent) {
        const knownArea = LIFE_AREAS.find((a) => a.id === parent.life_area)
        if (knownArea && parent.life_area !== lifeArea) {
          if (userPickedLifeArea) {
            setLifeAreaOverrideNote("Life area changed to match parent goal")
          }
          setLifeArea(parent.life_area)
          setCustomLifeArea("")
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentGoalId, parentGoals])

  const handleSuggestionClick = (suggestion: GoalSuggestion) => {
    if (selectedSuggestion === suggestion.title) {
      setSelectedSuggestion(null)
      setTitle("")
      setTargetValue(1)
      setPeriod("weekly")
      setLinkedMetric(null)
      return
    }

    setSelectedSuggestion(suggestion.title)
    setTitle(suggestion.title)
    setTargetValue(suggestion.defaultTarget)
    setPeriod(suggestion.defaultPeriod)
    setTrackingType("counter")
    setGoalType("recurring")
    if (suggestion.linkedMetric) {
      setLinkedMetric(suggestion.linkedMetric)
    }
  }

  const handleDelete = async (permanent: boolean) => {
    if (!goal) return
    setIsDeleting(true)
    setError(null)
    try {
      const url = permanent ? `/api/goals/${goal.id}?permanent=true` : `/api/goals/${goal.id}`
      const response = await fetch(url, { method: "DELETE" })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete goal")
      }
      onSuccess?.()
      onOpenChange(false)
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete goal")
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleSubmit = async (keepOpen = false) => {
    const errors: string[] = []
    if (!title.trim()) errors.push("Please enter a goal title")
    if (!effectiveLifeArea.trim()) errors.push("Please select or enter a life area")
    if (errors.length > 0) {
      setError(errors.join(". "))
      return
    }

    setIsSubmitting(true)
    setSubmitMode(keepOpen ? "continue" : "add")
    setError(null)
    setSuccessMessage(null)

    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        category: effectiveLifeArea.toLowerCase().trim(),
        life_area: effectiveLifeArea.toLowerCase().trim(),
        tracking_type: trackingType,
        target_value: trackingType === "boolean" ? 1 : targetValue,
        goal_type: goalType,
      }

      if (goalType === "recurring" || goalType === "habit_ramp") {
        payload.period = period
      }
      if (goalType === "milestone" && targetDate) {
        payload.target_date = targetDate
      }
      if (goalType === "habit_ramp") {
        payload.period = period
      }
      if (parentGoalId) {
        payload.parent_goal_id = parentGoalId
      }
      if (description.trim()) {
        payload.description = description.trim()
      }
      if (motivationNote.trim()) {
        payload.motivation_note = motivationNote.trim()
      }
      if (effectiveLifeArea === "daygame" && (
        goalType === "milestone" ||
        ((goalType === "recurring" || goalType === "habit_ramp") && period === "weekly")
      )) {
        payload.linked_metric = linkedMetric
      }
      // Graph fields: nature, display_category, goal_level
      payload.goal_nature = goalNature
      if (parentGoalId && parentGoals.length) {
        const parent = parentGoals.find((g) => g.id === parentGoalId)
        if (parent) {
          if (parent.display_category) payload.display_category = parent.display_category
          payload.goal_level = deriveChildLevel(parent.goal_level)
        }
      }
      // Persist milestone curve config
      if (goalType === "milestone" && trackingType === "counter" && targetValue > 1) {
        payload.milestone_config = { ...milestoneConfig, target: targetValue }
      }
      // Persist habit ramp config
      if (goalType === "habit_ramp") {
        payload.ramp_steps = rampSteps
        payload.milestone_config = milestoneConfig
      }

      const url = isEditing ? `/api/goals/${goal.id}` : "/api/goals"
      const method = isEditing ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save goal")
      }

      onSuccess?.()

      if (keepOpen) {
        const addedTitle = title.trim()
        setTitle("")
        setSelectedSuggestion(null)
        setTargetValue(1)
        setLinkedMetric(null)
        setDescription("")
        setMotivationNote("")
        setParentGoalId(null)
        setSuccessMessage(`Added "${addedTitle}"`)
        setTimeout(() => setSuccessMessage(null), 3000)
      } else {
        onOpenChange(false)
        resetForm()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save goal")
    } finally {
      setIsSubmitting(false)
      setSubmitMode(null)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetForm()
        onOpenChange(isOpen)
      }}
    >
      <DialogContent
        className="sm:max-w-lg max-h-[90vh] flex flex-col"
        data-testid="goal-form-modal"
      >
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Goal" : "Add New Goal"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your goal details"
              : "Set a goal to track your progress"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 overflow-y-auto flex-1 min-h-0">
          {/* Goal Type Toggle */}
          <div className="space-y-2">
            <Label>Goal Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { type: "recurring" as GoalType, label: "Recurring", desc: "Resets per period" },
                { type: "milestone" as GoalType, label: "Milestone", desc: "One-time target" },
                { type: "habit_ramp" as GoalType, label: "Habit Ramp", desc: "Ramps up over time" },
              ]).map(({ type, label, desc }) => {
                const isSelected = goalType === type
                return (
                  <Button
                    key={type}
                    type="button"
                    variant="outline"
                    className="h-auto py-2 px-3 flex-col items-start transition-colors"
                    style={isSelected ? {
                      backgroundColor: areaConfig.hex,
                      color: "white",
                      borderColor: "transparent",
                    } : { borderColor: theme.border, color: theme.text, background: "transparent" }}
                    onClick={() => setGoalType(type)}
                  >
                    <span className="font-medium text-xs">{label}</span>
                    <span className={`text-[10px] ${isSelected ? "text-white/70" : ""}`} style={isSelected ? undefined : { color: theme.muted }}>
                      {desc}
                    </span>
                  </Button>
                )
              })}
            </div>
          </div>

          {/* Goal Nature Toggle */}
          <div className="space-y-2">
            <Label>Goal Nature</Label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { nature: "input" as GoalNature, label: "Input", desc: "Actions you control", color: "#22c55e" },
                { nature: "outcome" as GoalNature, label: "Outcome", desc: "Results you measure", color: "#ef4444" },
              ]).map(({ nature, label, desc, color }) => {
                const isSelected = goalNature === nature
                return (
                  <Button
                    key={nature}
                    type="button"
                    variant="outline"
                    className="h-auto py-2 px-3 flex-col items-start transition-colors"
                    style={isSelected ? {
                      backgroundColor: color,
                      color: "white",
                      borderColor: "transparent",
                    } : { borderColor: theme.border, color: theme.text, background: "transparent" }}
                    onClick={() => setGoalNature(nature)}
                  >
                    <span className="font-medium text-xs">{label}</span>
                    <span className={`text-[10px] ${isSelected ? "text-white/70" : ""}`} style={isSelected ? undefined : { color: theme.muted }}>
                      {desc}
                    </span>
                  </Button>
                )
              })}
            </div>
          </div>

          {/* Life Area Selection */}
          <div className="space-y-2">
            <Label>Life Area</Label>
            <div className="flex flex-wrap gap-2">
              {LIFE_AREAS.filter((a) => a.id !== "custom").map((area) => {
                const Icon = area.icon
                const isSelected = lifeArea === area.id
                return (
                  <Badge
                    key={area.id}
                    variant="outline"
                    className="cursor-pointer gap-1.5 transition-colors border-transparent"
                    style={{
                      backgroundColor: isSelected ? area.hex : `${area.hex}15`,
                      color: isSelected ? "white" : area.hex,
                    }}
                    onClick={() => {
                      const prevSuggestions = getLifeAreaConfig(lifeArea).suggestions
                      const titleIsSuggestion = prevSuggestions.some(s => s.title === title)
                      setLifeArea(area.id)
                      setCustomLifeArea("")
                      setSelectedSuggestion(null)
                      setUserPickedLifeArea(true)
                      setLifeAreaOverrideNote(null)
                      setParentGoalId(null)
                      if (titleIsSuggestion || !title.trim()) {
                        setTitle("")
                        setTargetValue(1)
                        setLinkedMetric(null)
                      }
                    }}
                  >
                    <Icon className="size-3" />
                    {area.name}
                  </Badge>
                )
              })}
              <Badge
                variant="outline"
                className="cursor-pointer transition-colors border-transparent"
                style={{
                  backgroundColor: lifeArea === "custom" ? "#9ca3af" : "#9ca3af15",
                  color: lifeArea === "custom" ? "white" : "#9ca3af",
                }}
                onClick={() => {
                  const prevSuggestions = getLifeAreaConfig(lifeArea).suggestions
                  const titleIsSuggestion = prevSuggestions.some(s => s.title === title)
                  setLifeArea("custom")
                  setSelectedSuggestion(null)
                  setUserPickedLifeArea(true)
                  setLifeAreaOverrideNote(null)
                  setParentGoalId(null)
                  if (titleIsSuggestion || !title.trim()) {
                    setTitle("")
                    setTargetValue(1)
                    setLinkedMetric(null)
                  }
                }}
              >
                + Custom
              </Badge>
            </div>

            {lifeArea === "custom" && (
              <Input
                placeholder="Enter life area name..."
                value={customLifeArea}
                onChange={(e) => setCustomLifeArea(e.target.value)}
                className="mt-2"
  
              />
            )}
            {lifeAreaOverrideNote && (
              <p className="text-xs text-amber-500 mt-1">{lifeAreaOverrideNote}</p>
            )}
          </div>

          {/* Goal Title */}
          <div className="space-y-2">
            <Label htmlFor="goal-title">Goal</Label>
            <Input
              id="goal-title"
              placeholder="What do you want to achieve?"
              value={title}
              data-testid="goal-form-title-input"
              onChange={(e) => {
                setTitle(e.target.value)
                if (error) setError(null)
                if (selectedSuggestion && e.target.value !== selectedSuggestion) {
                  setSelectedSuggestion(null)
                }
              }}

            />

            {suggestions.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs" style={{ color: theme.muted }}>Suggestions:</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((suggestion) => {
                    const isSelected = selectedSuggestion === suggestion.title
                    return (
                      <Badge
                        key={suggestion.title}
                        variant="outline"
                        className="cursor-pointer text-xs transition-colors border-transparent"
                        style={{
                          backgroundColor: isSelected ? areaConfig.hex : `${areaConfig.hex}15`,
                          color: isSelected ? "white" : areaConfig.hex,
                        }}
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        {suggestion.title}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="goal-description">Description (optional)</Label>
            <Textarea
              id="goal-description"
              placeholder="What is this goal about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}

            />
          </div>

          {/* Motivation Note */}
          <div className="space-y-2">
            <Label htmlFor="goal-motivation">
              Why does this matter to you? <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="goal-motivation"
              placeholder="This note will appear when you need motivation most"
              value={motivationNote}
              onChange={(e) => setMotivationNote(e.target.value)}
              rows={2}

            />
          </div>

          {/* Tracking Type */}
          <div className="space-y-2">
            <Label>Tracking Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {TRACKING_TYPE_OPTIONS.map((option) => {
                const isSelected = trackingType === option.value
                return (
                  <Button
                    key={option.value}
                    type="button"
                    variant="outline"
                    className="h-auto py-2 px-3 flex-col items-start transition-colors"
                    style={isSelected ? {
                      backgroundColor: areaConfig.hex,
                      color: "white",
                      borderColor: "transparent",
                    } : { borderColor: theme.border, color: theme.text, background: "transparent" }}
                    onClick={() => setTrackingType(option.value)}
                  >
                    <span className="font-medium">{option.label}</span>
                    <span className={`text-xs ${isSelected ? "text-white/70" : ""}`} style={isSelected ? undefined : { color: theme.muted }}>
                      {option.description}
                    </span>
                  </Button>
                )
              })}
            </div>
          </div>

          {/* Target Value (counter only, non-ramp) */}
          {trackingType === "counter" && goalType !== "habit_ramp" && (
            <div className="space-y-2">
              <Label>Target</Label>
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const newVal = Math.max(1, targetValue - 1)
                    setTargetValue(newVal)
                    setMilestoneConfig((c) => ({ ...c, target: newVal }))
                  }}
                  disabled={targetValue <= 1}
                  style={{ borderColor: theme.border, color: theme.text, background: "transparent" }}
                >
                  <Minus className="size-4" />
                </Button>
                <Input
                  type="number"
                  value={targetValue}
                  onChange={(e) => {
                    const newVal = Math.max(1, parseInt(e.target.value) || 1)
                    setTargetValue(newVal)
                    setMilestoneConfig((c) => ({ ...c, target: newVal }))
                  }}
                  className="w-20 text-center text-lg font-bold"
                  min={1}
    
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const newVal = targetValue + 1
                    setTargetValue(newVal)
                    setMilestoneConfig((c) => ({ ...c, target: newVal }))
                  }}
                  style={{ borderColor: theme.border, color: theme.text, background: "transparent" }}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Milestone Curve Editor */}
          {goalType === "milestone" && trackingType === "counter" && targetValue > 1 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Milestone Ladder</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6"
                  style={{ color: theme.muted }}
                  onClick={() => setShowCurveEditor(!showCurveEditor)}
                >
                  {showCurveEditor ? "Hide" : "Customize curve"}
                </Button>
              </div>
              {showCurveEditor && (
                <MilestoneCurveEditor
                  config={{ ...milestoneConfig, target: targetValue }}
                  onChange={setMilestoneConfig}
                  allowDirectEdit
                />
              )}
            </div>
          )}

          {/* Habit Ramp Editor */}
          {goalType === "habit_ramp" && (
            <div className="space-y-2">
              <Label>Ramp Schedule</Label>
              <HabitRampEditor
                steps={rampSteps}
                onChange={setRampSteps}
                milestoneConfig={milestoneConfig}
                accentColor={areaConfig.hex}
              />
            </div>
          )}

          {/* Period (recurring and habit_ramp goals) */}
          {(goalType === "recurring" || goalType === "habit_ramp") && (
            <div className="space-y-2">
              <Label>Reset Period</Label>
              <div className="flex flex-wrap gap-2">
                {PERIOD_OPTIONS.map((option) => {
                  const isSelected = period === option.value
                  return (
                    <Button
                      key={option.value}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="transition-colors"
                      style={isSelected ? {
                        backgroundColor: areaConfig.hex,
                        color: "white",
                        borderColor: "transparent",
                      } : { borderColor: theme.border, color: theme.text, background: "transparent" }}
                      onClick={() => setPeriod(option.value)}
                    >
                      {option.label}
                    </Button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Target Date (milestone goals only) */}
          {goalType === "milestone" && (
            <div className="space-y-2">
              <Label htmlFor="target-date">
                <Calendar className="size-3 inline mr-1" />
                Target Date (optional)
              </Label>
              <Input
                id="target-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
  
              />
              {targetDate && (
                <p className="text-xs" style={{ color: theme.muted }}>
                  {new Date(targetDate + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              )}
            </div>
          )}

          {/* Parent Goal / Upward Connection */}
          {parentGoals.length > 0 && (
            <div className="space-y-2">
              <Label>Parent Goal</Label>
              <UpwardConnectionPrompt
                availableParents={filteredParentGoals.length > 0 ? filteredParentGoals : parentGoals}
                selectedParentId={parentGoalId}
                onSelectParent={setParentGoalId}
                alwaysShow
              />
            </div>
          )}

          {/* Linked Metric (daygame goals: weekly for recurring/habit_ramp, cumulative for milestone) */}
          {effectiveLifeArea === "daygame" && (
            goalType === "milestone" ||
            ((goalType === "recurring" || goalType === "habit_ramp") && period === "weekly")
          ) && (
            <div className="space-y-2">
              <Label>Auto-Sync with Tracking</Label>
              <Select
                value={linkedMetric ?? "none"}
                onValueChange={(v) => setLinkedMetric(v === "none" ? null : (v as LinkedMetric))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select metric to sync" />
                </SelectTrigger>
                <SelectContent>
                  {LINKED_METRIC_OPTIONS
                    .filter((opt) => {
                      if (opt.group === "none") return true
                      if (goalType === "milestone") return opt.group === "cumulative"
                      return opt.group === "weekly"
                    })
                    .map((opt) => (
                      <SelectItem key={opt.value ?? "none"} value={opt.value ?? "none"}>
                        {opt.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs" style={{ color: theme.muted }}>
                Goal progress will automatically update from your session data
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-md bg-green-500/10 text-green-600 dark:text-green-400 text-sm">
              {successMessage}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0" style={{ borderColor: theme.border }}>
          {isEditing && (
            <div className="flex-1 flex items-center gap-1">
              {showDeleteConfirm ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-destructive">Delete permanently?</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(true)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
                    Confirm
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    style={{ color: theme.muted }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hover:text-foreground"
                    style={{ color: theme.muted }}
                    onClick={() => handleDelete(false)}
                    disabled={isSubmitting || isDeleting}
                  >
                    <Archive className="size-3.5 mr-1" />
                    Archive
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isSubmitting || isDeleting}
                  >
                    <Trash2 className="size-3.5 mr-1" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          )}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting || isDeleting}
            data-testid="goal-form-cancel"
            style={{ borderColor: theme.border, color: theme.text, background: "transparent" }}
          >
            Cancel
          </Button>
          {!isEditing && (
            <Button
              variant="secondary"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting || !title.trim()}
            >
              {submitMode === "continue" ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                "Add & Continue"
              )}
            </Button>
          )}
          <Button
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting || isDeleting}
            data-testid="goal-form-submit"
          >
            {submitMode === "add" ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                Saving...
              </>
            ) : isEditing ? (
              "Save Changes"
            ) : (
              "Add Goal"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
