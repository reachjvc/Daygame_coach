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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, Minus } from "lucide-react"
import {
  GOAL_CATEGORIES,
  getCategoryConfig,
  type GoalCategoryConfig,
  type GoalSuggestion,
} from "../data/goalCategories"
import type { GoalWithProgress, GoalPeriod, GoalTrackingType, LinkedMetric } from "@/src/db/goalTypes"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface GoalFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal?: GoalWithProgress // If editing existing goal
  onSuccess?: () => void
}

const PERIOD_OPTIONS: { value: GoalPeriod; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
]

const TRACKING_TYPE_OPTIONS: { value: GoalTrackingType; label: string; description: string }[] = [
  { value: "counter", label: "Counter", description: "Track towards a target number" },
  { value: "boolean", label: "Yes/No", description: "Simple done or not done" },
]

const LINKED_METRIC_OPTIONS: { value: LinkedMetric; label: string }[] = [
  { value: null, label: "None (manual tracking)" },
  { value: "approaches_weekly", label: "Weekly approaches" },
  { value: "sessions_weekly", label: "Weekly sessions" },
  { value: "numbers_weekly", label: "Weekly numbers" },
  { value: "instadates_weekly", label: "Weekly instadates" },
]

export function GoalFormModal({ open, onOpenChange, goal, onSuccess }: GoalFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMode, setSubmitMode] = useState<"add" | "continue" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState<string>("daygame")
  const [customCategory, setCustomCategory] = useState("")
  const [trackingType, setTrackingType] = useState<GoalTrackingType>("counter")
  const [period, setPeriod] = useState<GoalPeriod>("weekly")
  const [targetValue, setTargetValue] = useState(1)
  const [linkedMetric, setLinkedMetric] = useState<LinkedMetric>(null)
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null)

  const isEditing = !!goal

  // Initialize form when editing
  useEffect(() => {
    if (goal) {
      setTitle(goal.title)
      // Check if it's a default category or custom
      const isDefaultCategory = GOAL_CATEGORIES.some((c) => c.id === goal.category)
      if (isDefaultCategory) {
        setCategory(goal.category)
        setCustomCategory("")
      } else {
        setCategory("custom")
        setCustomCategory(goal.category)
      }
      setTrackingType(goal.tracking_type)
      setPeriod(goal.period)
      setTargetValue(goal.target_value)
      setLinkedMetric(goal.linked_metric)
    }
  }, [goal])

  const resetForm = () => {
    setTitle("")
    setCategory("daygame")
    setCustomCategory("")
    setTrackingType("counter")
    setPeriod("weekly")
    setTargetValue(1)
    setLinkedMetric(null)
    setSelectedSuggestion(null)
    setError(null)
    setSuccessMessage(null)
  }

  const effectiveCategory = category === "custom" ? customCategory : category
  const categoryConfig = getCategoryConfig(effectiveCategory)
  const suggestions = categoryConfig.suggestions

  const handleSuggestionClick = (suggestion: GoalSuggestion) => {
    // Toggle off if clicking same suggestion
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
    // Auto-set linked metric for daygame suggestions
    if (suggestion.linkedMetric && effectiveCategory === "daygame") {
      setLinkedMetric(suggestion.linkedMetric)
    }
  }

  const handleSubmit = async (keepOpen = false) => {
    if (!title.trim()) {
      setError("Please enter a goal title")
      return
    }

    if (!effectiveCategory.trim()) {
      setError("Please select or enter a category")
      return
    }

    setIsSubmitting(true)
    setSubmitMode(keepOpen ? "continue" : "add")
    setError(null)
    setSuccessMessage(null)

    try {
      const payload = {
        title: title.trim(),
        category: effectiveCategory.toLowerCase().trim(),
        tracking_type: trackingType,
        period,
        target_value: trackingType === "boolean" ? 1 : targetValue,
        linked_metric: effectiveCategory === "daygame" && period === "weekly" ? linkedMetric : null,
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
        // Reset form but keep modal open for adding more goals
        const addedTitle = title.trim()
        setTitle("")
        setSelectedSuggestion(null)
        setTargetValue(1)
        setLinkedMetric(null)
        setSuccessMessage(`Added "${addedTitle}"`)
        // Auto-clear success message after 2s
        setTimeout(() => setSuccessMessage(null), 2000)
        // Keep category as-is for multi-goal flow
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Goal" : "Add New Goal"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your goal details"
              : "Set a goal to track your progress"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Category Selection */}
          <div className="space-y-2">
            <Label>Category</Label>
            <div className="flex flex-wrap gap-2">
              {GOAL_CATEGORIES.map((cat) => {
                const Icon = cat.icon
                const isSelected = category === cat.id
                return (
                  <Badge
                    key={cat.id}
                    variant="outline"
                    className="cursor-pointer gap-1.5 transition-colors border-transparent"
                    style={{
                      backgroundColor: isSelected ? cat.hex : `${cat.hex}15`,
                      color: isSelected ? "white" : cat.hex,
                    }}
                    onClick={() => {
                      setCategory(cat.id)
                      setCustomCategory("")
                      setSelectedSuggestion(null)
                      setTitle("")
                      setTargetValue(1)
                      setLinkedMetric(null)
                    }}
                  >
                    <Icon className="size-3" />
                    {cat.name}
                  </Badge>
                )
              })}
              <Badge
                variant="outline"
                className="cursor-pointer transition-colors border-transparent"
                style={{
                  backgroundColor: category === "custom" ? "#6b7280" : "#6b728015",
                  color: category === "custom" ? "white" : "#6b7280",
                }}
                onClick={() => {
                  setCategory("custom")
                  setSelectedSuggestion(null)
                  setTitle("")
                  setTargetValue(1)
                  setLinkedMetric(null)
                }}
              >
                + Custom
              </Badge>
            </div>

            {category === "custom" && (
              <Input
                placeholder="Enter category name..."
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="mt-2"
              />
            )}
          </div>

          {/* Goal Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Goal</Label>
            <Input
              id="title"
              placeholder="What do you want to achieve?"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                // Clear suggestion selection if user customizes
                if (selectedSuggestion && e.target.value !== selectedSuggestion) {
                  setSelectedSuggestion(null)
                }
              }}
            />

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Suggestions:</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((suggestion) => {
                    const isSelected = selectedSuggestion === suggestion.title
                    return (
                      <Badge
                        key={suggestion.title}
                        variant="outline"
                        className="cursor-pointer text-xs transition-colors border-transparent"
                        style={{
                          backgroundColor: isSelected ? categoryConfig.hex : `${categoryConfig.hex}15`,
                          color: isSelected ? "white" : categoryConfig.hex,
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
                      backgroundColor: categoryConfig.hex,
                      color: "white",
                      borderColor: "transparent",
                    } : undefined}
                    onClick={() => setTrackingType(option.value)}
                  >
                    <span className="font-medium">{option.label}</span>
                    <span className={`text-xs ${
                      isSelected ? "text-white/70" : "text-muted-foreground"
                    }`}>
                      {option.description}
                    </span>
                  </Button>
                )
              })}
            </div>
          </div>

          {/* Target Value (only for counter type) */}
          {trackingType === "counter" && (
            <div className="space-y-2">
              <Label>Target</Label>
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setTargetValue(Math.max(1, targetValue - 1))}
                  disabled={targetValue <= 1}
                >
                  <Minus className="size-4" />
                </Button>
                <Input
                  type="number"
                  value={targetValue}
                  onChange={(e) =>
                    setTargetValue(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="w-20 text-center text-lg font-bold"
                  min={1}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setTargetValue(targetValue + 1)}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Period */}
          <div className="space-y-2">
            <Label>Reset Period</Label>
            <div className="flex gap-2">
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
                      backgroundColor: categoryConfig.hex,
                      color: "white",
                      borderColor: "transparent",
                    } : undefined}
                    onClick={() => setPeriod(option.value)}
                  >
                    {option.label}
                  </Button>
                )
              })}
            </div>
          </div>

          {/* Linked Metric (only for daygame + weekly goals) */}
          {effectiveCategory === "daygame" && period === "weekly" && (
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
                  {LINKED_METRIC_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value ?? "none"} value={opt.value ?? "none"}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
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

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
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
          <Button onClick={() => handleSubmit(false)} disabled={isSubmitting}>
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
