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
} from "../data/goalCategories"
import type { GoalWithProgress, GoalPeriod, GoalTrackingType } from "@/src/db/goalTypes"

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

export function GoalFormModal({ open, onOpenChange, goal, onSuccess }: GoalFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState<string>("fitness")
  const [customCategory, setCustomCategory] = useState("")
  const [trackingType, setTrackingType] = useState<GoalTrackingType>("counter")
  const [period, setPeriod] = useState<GoalPeriod>("weekly")
  const [targetValue, setTargetValue] = useState(1)

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
    }
  }, [goal])

  const resetForm = () => {
    setTitle("")
    setCategory("fitness")
    setCustomCategory("")
    setTrackingType("counter")
    setPeriod("weekly")
    setTargetValue(1)
    setError(null)
  }

  const effectiveCategory = category === "custom" ? customCategory : category
  const categoryConfig = getCategoryConfig(effectiveCategory)
  const suggestions = categoryConfig.suggestions

  const handleSuggestionClick = (suggestion: string) => {
    setTitle(suggestion)
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Please enter a goal title")
      return
    }

    if (!effectiveCategory.trim()) {
      setError("Please select or enter a category")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const payload = {
        title: title.trim(),
        category: effectiveCategory.toLowerCase().trim(),
        tracking_type: trackingType,
        period,
        target_value: trackingType === "boolean" ? 1 : targetValue,
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

      onOpenChange(false)
      resetForm()
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save goal")
    } finally {
      setIsSubmitting(false)
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
                return (
                  <Badge
                    key={cat.id}
                    variant={category === cat.id ? "default" : "outline"}
                    className={`cursor-pointer gap-1.5 ${
                      category === cat.id ? cat.bgColor : ""
                    }`}
                    onClick={() => {
                      setCategory(cat.id)
                      setCustomCategory("")
                    }}
                  >
                    <Icon className="size-3" />
                    {cat.name}
                  </Badge>
                )
              })}
              <Badge
                variant={category === "custom" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setCategory("custom")}
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
              onChange={(e) => setTitle(e.target.value)}
            />

            {/* Suggestions */}
            {suggestions.length > 0 && !title && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Suggestions:</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((suggestion) => (
                    <Badge
                      key={suggestion}
                      variant="outline"
                      className="cursor-pointer text-xs hover:bg-muted"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tracking Type */}
          <div className="space-y-2">
            <Label>Tracking Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {TRACKING_TYPE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={trackingType === option.value ? "default" : "outline"}
                  className="h-auto py-2 px-3 flex-col items-start"
                  onClick={() => setTrackingType(option.value)}
                >
                  <span className="font-medium">{option.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </Button>
              ))}
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
              {PERIOD_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={period === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPeriod(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
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
