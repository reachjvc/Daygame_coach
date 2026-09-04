"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Trash2, Archive } from "lucide-react"
import { LIFE_AREAS } from "../data/lifeAreas"
import { GoalFormVariant6 } from "./GoalFormVariant6"
import { deriveChildLevel } from "../goalsService"
import { metricFitsPeriod } from "@/src/tracking/metricsService"
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

/* PERIOD_OPTIONS and TRACKING_TYPE_OPTIONS lived here and were dead: this
   component delegates its whole form to GoalFormVariant6, which owns its own
   lists. LINKED_METRIC_OPTIONS went the same way — nothing rendered it. */

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- see NOTE below
  const [lifeAreaOverrideNote, setLifeAreaOverrideNote] = useState<string | null>(null)

  // Milestone curve editor state
  const [milestoneConfig, setMilestoneConfig] = useState<MilestoneLadderConfig>({
    start: 1,
    target: 100,
    steps: 10,
    curveTension: 2,
  })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- see NOTE below
  const [showCurveEditor, setShowCurveEditor] = useState(false)

  // Habit ramp editor state
  const [rampSteps, setRampSteps] = useState<HabitRampStep[]>([
    { frequencyPerWeek: 10, durationWeeks: 4 },
    { frequencyPerWeek: 15, durationWeeks: 4 },
    { frequencyPerWeek: 25, durationWeeks: 8 },
  ])

  // Starting progress (backfill from pre-app history)
  const [startingValue, setStartingValue] = useState(0)
  const [startingStreak, setStartingStreak] = useState(0)

  const isEditing = !!goal

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
    setStartingValue(0)
    setStartingStreak(0)
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

  /**
   * NOTE — a half-migrated path, deliberately not deleted.
   *
   * This component now delegates its whole form to `GoalFormVariant6`, and three
   * things did not come across: this handler, `lifeAreaOverrideNote` and
   * `showCurveEditor`. Their other halves are still wired — `selectedSuggestion`
   * is passed to the variant, and both setters are still called — so removing
   * them would change what the variant receives, not just delete dead weight.
   * Whoever finishes the migration should remove all of it together.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

      /* NOT `shapeOfRow`, deliberately: this reads the form's own state before
         any row exists, so there is no `tracking_type` to read alongside it. */
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
      // A linked metric only travels if it measures the same span the goal
      // counts over — a milestone runs on `custom`, everything else on its
      // period. `metricFitsPeriod` is the same rule the API enforces, so the
      // form cannot send something the server will reject.
      const effectivePeriod = goalType === "milestone" ? "custom" : period
      if (
        effectiveLifeArea === "daygame" &&
        linkedMetric &&
        metricFitsPeriod(linkedMetric, effectivePeriod)
      ) {
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

      // Starting progress (backfill — only on create)
      if (!isEditing) {
        if (startingValue > 0) payload.current_value = startingValue
        if (startingStreak > 0) payload.current_streak = startingStreak
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
        className="sm:max-w-xl max-h-[90vh] flex flex-col"
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

        <div className="overflow-y-auto flex-1 min-h-0">
          <GoalFormVariant6
            lifeArea={lifeArea}
            setLifeArea={setLifeArea}
            parentGoals={parentGoals}
            parentGoalId={parentGoalId}
            setParentGoalId={setParentGoalId}
            goalType={goalType}
            setGoalType={setGoalType}
            title={title}
            setTitle={setTitle}
            description={description}
            setDescription={setDescription}
            goalNature={goalNature}
            setGoalNature={setGoalNature}
            motivationNote={motivationNote}
            setMotivationNote={setMotivationNote}
            selectedSuggestion={selectedSuggestion}
            setSelectedSuggestion={setSelectedSuggestion}
            trackingType={trackingType}
            setTrackingType={setTrackingType}
            targetValue={targetValue}
            setTargetValue={setTargetValue}
            period={period}
            setPeriod={setPeriod}
            targetDate={targetDate}
            setTargetDate={setTargetDate}
            startingValue={startingValue}
            setStartingValue={setStartingValue}
            startingStreak={startingStreak}
            setStartingStreak={setStartingStreak}
            isEditing={isEditing}
          />
        </div>

        <>
        {error && (
          <div className="px-5 py-2">
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          </div>
        )}
        {successMessage && (
          <div className="px-5 py-2">
            <div className="p-3 rounded-md bg-green-500/10 text-green-600 dark:text-green-400 text-sm">
              {successMessage}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
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
                    className="text-muted-foreground"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hover:text-foreground text-muted-foreground"
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
        </>
      </DialogContent>
    </Dialog>
  )
}
