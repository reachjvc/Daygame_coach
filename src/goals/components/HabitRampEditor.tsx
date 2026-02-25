"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, Calendar, Wand2 } from "lucide-react"
import { computeRampMilestoneDates, generateMilestoneLadder } from "../milestoneService"
import type { HabitRampStep, MilestoneLadderConfig } from "../types"

interface HabitRampEditorProps {
  steps: HabitRampStep[]
  onChange: (steps: HabitRampStep[]) => void
  /** Milestone config to compute projected dates against */
  milestoneConfig?: MilestoneLadderConfig
  accentColor?: string
  /** Target date for auto-fit — ISO string YYYY-MM-DD */
  targetDate?: string
}

function formatWeekDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function HabitRampEditor({
  steps,
  onChange,
  milestoneConfig,
  accentColor = "#f97316",
  targetDate,
}: HabitRampEditorProps) {
  // Compute projected milestone dates if we have both ramp steps and milestone config
  const projectedDates = useMemo(() => {
    if (!milestoneConfig || steps.length === 0) return []
    const milestones = generateMilestoneLadder(milestoneConfig)
    const values = milestones.map((m) => m.value)
    return computeRampMilestoneDates(values, steps, new Date())
  }, [steps, milestoneConfig])

  // Total weeks and volume
  const totalWeeks = steps.reduce((sum, s) => sum + s.durationWeeks, 0)
  const totalVolume = steps.reduce((sum, s) => sum + s.frequencyPerWeek * s.durationWeeks, 0)

  // Available weeks until target date
  const availableWeeks = useMemo(() => {
    if (!targetDate) return null
    const now = new Date()
    const target = new Date(targetDate + "T00:00:00")
    const diffMs = target.getTime() - now.getTime()
    if (diffMs <= 0) return null
    return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7))
  }, [targetDate])

  // Date fit indicator
  const dateFitText = useMemo(() => {
    if (availableWeeks === null) return null
    const diff = totalWeeks - availableWeeks
    if (Math.abs(diff) <= 1) return { text: "On target", color: accentColor }
    if (diff > 0) return { text: `${diff}wk over target`, color: "#ef4444" }
    return { text: `${Math.abs(diff)}wk headroom`, color: "#22c55e" }
  }, [availableWeeks, totalWeeks, accentColor])

  const handleAutoFit = () => {
    if (availableWeeks === null || steps.length === 0) return
    const totalOriginalWeeks = steps.reduce((sum, s) => sum + s.durationWeeks, 0)
    if (totalOriginalWeeks === 0) return
    const ratio = availableWeeks / totalOriginalWeeks
    let remaining = availableWeeks
    const fitted = steps.map((s, idx) => {
      if (idx === steps.length - 1) {
        return { ...s, durationWeeks: Math.max(1, remaining) }
      }
      const scaled = Math.max(1, Math.round(s.durationWeeks * ratio))
      remaining -= scaled
      return { ...s, durationWeeks: scaled }
    })
    onChange(fitted)
  }

  const handleStepChange = (idx: number, field: keyof HabitRampStep, value: number) => {
    const updated = [...steps]
    updated[idx] = { ...updated[idx], [field]: Math.max(1, value) }
    onChange(updated)
  }

  const handleAddStep = () => {
    const lastStep = steps[steps.length - 1]
    const newFreq = lastStep ? lastStep.frequencyPerWeek + 5 : 10
    onChange([...steps, { frequencyPerWeek: newFreq, durationWeeks: 4 }])
  }

  const handleRemoveStep = (idx: number) => {
    if (steps.length <= 1) return
    const updated = [...steps]
    updated.splice(idx, 1)
    onChange(updated)
  }

  return (
    <div className="space-y-3">
      {/* Step rows */}
      <div className="space-y-2">
        <Label className="text-xs">Ramp schedule</Label>
        {steps.map((step, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-4 flex-shrink-0">{idx + 1}.</span>
            <div className="flex-1 flex items-center gap-1.5">
              <Input
                type="number"
                value={step.frequencyPerWeek}
                onChange={(e) =>
                  handleStepChange(idx, "frequencyPerWeek", parseInt(e.target.value) || 1)
                }
                className="h-7 w-16 text-xs text-center"
                min={1}
              />
              <span className="text-xs text-muted-foreground">/wk for</span>
              <Input
                type="number"
                value={step.durationWeeks}
                onChange={(e) =>
                  handleStepChange(idx, "durationWeeks", parseInt(e.target.value) || 1)
                }
                className="h-7 w-14 text-xs text-center"
                min={1}
              />
              <span className="text-xs text-muted-foreground">wks</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={() => handleRemoveStep(idx)}
              disabled={steps.length <= 1}
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddStep}
          className="text-xs h-7 w-full"
        >
          <Plus className="size-3 mr-1" />
          Add ramp step
        </Button>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>{totalWeeks} weeks total</span>
        <span>{totalVolume.toLocaleString()} total volume</span>
        {dateFitText && (
          <span style={{ color: dateFitText.color, fontWeight: 500 }}>
            {dateFitText.text}
          </span>
        )}
      </div>

      {/* Auto-fit to target date */}
      {availableWeeks !== null && totalWeeks !== availableWeeks && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleAutoFit}
          className="text-xs h-7 w-full"
          style={{ borderColor: `${accentColor}33`, color: accentColor }}
        >
          <Wand2 className="size-3 mr-1" />
          Auto-fit to target date ({availableWeeks}wk available)
        </Button>
      )}

      {/* Projected milestone dates */}
      {projectedDates.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1">
            <Calendar className="size-3" />
            Projected milestones
          </Label>
          <div className="bg-muted/30 rounded-lg border border-border p-2 space-y-1">
            {projectedDates.map((pd, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: accentColor }}
                  />
                  <span className="font-medium">{pd.milestoneValue.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>Week {pd.weekNumber}</span>
                  <span>{formatWeekDate(pd.estimatedDate)}</span>
                </div>
              </div>
            ))}
            {milestoneConfig && projectedDates.length < generateMilestoneLadder(milestoneConfig).length && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Some milestones extend beyond the ramp schedule
              </p>
            )}
          </div>
        </div>
      )}

      {/* Visual ramp bar */}
      <div className="space-y-1">
        <Label className="text-xs">Ramp progression</Label>
        <div className="flex h-6 rounded-md overflow-hidden border border-border">
          {steps.map((step, idx) => {
            const maxFreq = Math.max(...steps.map((s) => s.frequencyPerWeek))
            const widthPct = (step.durationWeeks / totalWeeks) * 100
            const heightPct = (step.frequencyPerWeek / maxFreq) * 100
            return (
              <div
                key={idx}
                className="relative flex items-end"
                style={{ width: `${widthPct}%` }}
                title={`${step.frequencyPerWeek}/wk for ${step.durationWeeks} weeks`}
              >
                <div
                  className="w-full transition-all"
                  style={{
                    height: `${heightPct}%`,
                    backgroundColor: accentColor,
                    opacity: 0.2 + (idx / steps.length) * 0.6,
                  }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-medium">
                  {step.frequencyPerWeek}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
