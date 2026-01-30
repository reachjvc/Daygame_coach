"use client"

import { useState } from "react"
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
import { Loader2, Plus, Minus, MapPin } from "lucide-react"
import { OUTCOME_OPTIONS, APPROACH_TAGS } from "../config"
import type { ApproachOutcome } from "@/src/db/trackingTypes"

interface QuickAddModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function QuickAddModal({ open, onOpenChange, onSuccess }: QuickAddModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [dateTime, setDateTime] = useState(() => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  })
  const [approachCount, setApproachCount] = useState(1)
  const [outcomes, setOutcomes] = useState<Record<ApproachOutcome, number>>({
    blowout: 0,
    short: 0,
    good: 0,
    number: 0,
    instadate: 0,
  })
  const [location, setLocation] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const resetForm = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    setDateTime(now.toISOString().slice(0, 16))
    setApproachCount(1)
    setOutcomes({
      blowout: 0,
      short: 0,
      good: 0,
      number: 0,
      instadate: 0,
    })
    setLocation("")
    setSelectedTags([])
    setError(null)
  }

  const totalOutcomes = Object.values(outcomes).reduce((sum, n) => sum + n, 0)

  const handleOutcomeChange = (outcome: ApproachOutcome, delta: number) => {
    const newValue = Math.max(0, outcomes[outcome] + delta)
    const newTotal = totalOutcomes + delta

    // Can't have more outcomes than approaches
    if (newTotal > approachCount) return

    setOutcomes(prev => ({ ...prev, [outcome]: newValue }))
  }

  const handleApproachCountChange = (value: number) => {
    const newCount = Math.max(1, value)
    setApproachCount(newCount)

    // Reduce outcomes if they exceed new count
    if (totalOutcomes > newCount) {
      const reduction = totalOutcomes - newCount
      let remaining = reduction
      const newOutcomes = { ...outcomes }

      // Reduce from lowest value outcomes first
      const sortedOutcomes = Object.entries(newOutcomes)
        .sort((a, b) => a[1] - b[1]) as [ApproachOutcome, number][]

      for (const [outcome, count] of sortedOutcomes) {
        if (remaining <= 0) break
        const reduceBy = Math.min(count, remaining)
        newOutcomes[outcome] -= reduceBy
        remaining -= reduceBy
      }

      setOutcomes(newOutcomes)
    }
  }

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Create approaches based on outcomes
      const approaches: Array<{ outcome: ApproachOutcome | null; timestamp: string }> = []

      // Add approaches with specific outcomes
      for (const [outcome, count] of Object.entries(outcomes)) {
        for (let i = 0; i < count; i++) {
          approaches.push({
            outcome: outcome as ApproachOutcome,
            timestamp: new Date(dateTime).toISOString(),
          })
        }
      }

      // Add remaining approaches without outcomes
      const remainingCount = approachCount - totalOutcomes
      for (let i = 0; i < remainingCount; i++) {
        approaches.push({
          outcome: null,
          timestamp: new Date(dateTime).toISOString(),
        })
      }

      // Submit each approach
      for (const approach of approaches) {
        const response = await fetch("/api/tracking/approach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            timestamp: approach.timestamp,
            outcome: approach.outcome,
            tags: selectedTags.length > 0 ? selectedTags : undefined,
            // Note: location is optional, add if we want to track it
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to add approach")
        }
      }

      onOpenChange(false)
      resetForm()
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add approaches")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm()
      onOpenChange(isOpen)
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Add Approaches</DialogTitle>
          <DialogDescription>
            Log approaches from a past session without starting a live tracker
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date/Time */}
          <div className="space-y-2">
            <Label htmlFor="datetime">When did this happen?</Label>
            <Input
              id="datetime"
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
            />
          </div>

          {/* Number of approaches */}
          <div className="space-y-2">
            <Label>How many approaches?</Label>
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleApproachCountChange(approachCount - 1)}
                disabled={approachCount <= 1}
              >
                <Minus className="size-4" />
              </Button>
              <Input
                type="number"
                value={approachCount}
                onChange={(e) => handleApproachCountChange(parseInt(e.target.value) || 1)}
                className="w-20 text-center text-lg font-bold"
                min={1}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleApproachCountChange(approachCount + 1)}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>

          {/* Outcomes breakdown */}
          <div className="space-y-2">
            <Label>Outcomes (optional)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              {totalOutcomes} of {approachCount} assigned • {approachCount - totalOutcomes} unspecified
            </p>
            <div className="space-y-2">
              {OUTCOME_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <span>{option.emoji}</span>
                    <span className="text-sm">{option.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => handleOutcomeChange(option.value, -1)}
                      disabled={outcomes[option.value] === 0}
                    >
                      <Minus className="size-3" />
                    </Button>
                    <span className="w-6 text-center font-medium">
                      {outcomes[option.value]}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => handleOutcomeChange(option.value, 1)}
                      disabled={totalOutcomes >= approachCount}
                    >
                      <Plus className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Location (optional) */}
          <div className="space-y-2">
            <Label htmlFor="location">Location (optional)</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="location"
                placeholder="e.g., Mall, Coffee shop, Street"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Tags (optional) */}
          <div className="space-y-2">
            <Label>Tags (optional)</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(APPROACH_TAGS).map(([, tags]) => (
                tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))
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
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || approachCount < 1}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                Adding...
              </>
            ) : (
              <>Add {approachCount} Approach{approachCount !== 1 ? "es" : ""}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
