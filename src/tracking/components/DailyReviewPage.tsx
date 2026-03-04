"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Loader2,
  ArrowLeft,
  Sun,
  Check,
  Plus,
  X,
  Heart,
} from "lucide-react"
import Link from "next/link"
import { VoiceRecorderButton } from "./VoiceRecorderButton"

type FieldType = "scale" | "textarea" | "text" | "tristate"

interface DailyField {
  id: string
  label: string
  placeholder?: string
  type: FieldType
  scaleLabels?: [string, string] // [low, high]
  tristateOptions?: { value: string; label: string; color: string }[]
  softUnlockField?: string // Only visible when this field has content
}

const DAILY_FIELDS: DailyField[] = [
  {
    id: "energy",
    label: "How's your energy right now?",
    type: "scale",
    scaleLabels: ["Drained", "Buzzing"],
  },
  {
    id: "day_rating",
    label: "How was your day overall?",
    type: "scale",
    scaleLabels: ["Rough", "Great"],
  },
  {
    id: "process_rating",
    label: "How well did you show up today, regardless of results?",
    type: "scale",
    scaleLabels: ["Phoned it in", "Gave my best"],
  },
  {
    id: "glad_moment",
    label: "What's one moment from today you're glad happened?",
    placeholder: "A conversation, a feeling, something you noticed...",
    type: "textarea",
  },
  {
    id: "glad_why",
    label: "Why did this moment matter?",
    placeholder: "What does it say about you, your values, or your growth?",
    type: "textarea",
    softUnlockField: "glad_moment",
  },
  {
    id: "values_alignment",
    label: "Did you move toward your values today?",
    type: "tristate",
    tristateOptions: [
      { value: "toward", label: "Toward", color: "bg-green-500" },
      { value: "neutral", label: "Neutral", color: "bg-yellow-500" },
      { value: "away", label: "Away", color: "bg-red-400" },
    ],
  },
  {
    id: "blocker",
    label: "Anything in your way right now?",
    placeholder: "An obstacle, a fear, a habit, or nothing at all...",
    type: "text",
  },
  {
    id: "carry_tomorrow",
    label: "What do you want to carry into tomorrow?",
    placeholder: "A mindset, intention, or specific action...",
    type: "text",
  },
]

interface DailyReviewPageProps {
  userId: string
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- userId reserved for future use
export function DailyReviewPage({ userId }: DailyReviewPageProps) {
  const router = useRouter()
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [yesterdayTomorrow, setYesterdayTomorrow] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [customFields, setCustomFields] = useState<{ id: string; label: string }[]>([])
  const [newFieldLabel, setNewFieldLabel] = useState("")
  const [showAddField, setShowAddField] = useState(false)

  // Load yesterday's "carry into tomorrow" on mount
  useEffect(() => {
    fetch("/api/tracking/review/daily")
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json()
          if (data.yesterday?.fields?.carry_tomorrow) {
            setYesterdayTomorrow(data.yesterday.fields.carry_tomorrow)
          }
          // Pre-fill if there's a draft for today
          if (data.today?.fields) {
            setFormValues(data.today.fields as Record<string, string>)
          }
        }
      })
      .catch(() => {})
      .finally(() => setIsLoaded(true))
  }, [])

  const handleFieldChange = (fieldId: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [fieldId]: value }))
  }

  const hasStarted = formValues.energy || formValues.day_rating

  const addCustomField = () => {
    const label = newFieldLabel.trim()
    if (!label) return
    const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    setCustomFields((prev) => [...prev, { id, label }])
    setNewFieldLabel("")
    setShowAddField(false)
  }

  const removeCustomField = (id: string) => {
    setCustomFields((prev) => prev.filter((f) => f.id !== id))
    setFormValues((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayEnd = new Date(today)
      todayEnd.setHours(23, 59, 59, 999)

      const response = await fetch("/api/tracking/review/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: formValues,
          period_start: today.toISOString(),
          period_end: todayEnd.toISOString(),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to save review")
      }

      router.push("/dashboard/tracking")
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to save review")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8" data-testid="daily-review-page">
      <div className="mb-8">
        <Link
          href="/dashboard/tracking"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="size-4" />
          Back to Tracking
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <Sun className="size-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Daily Reflection</h1>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      {/* Yesterday's reminder */}
      {yesterdayTomorrow && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">
            Yesterday you said:
          </p>
          <p className="text-sm italic text-foreground">&quot;{yesterdayTomorrow}&quot;</p>
        </div>
      )}

      {/* Empathy card for hard days: shows when both energy AND day_rating ≤ 2 */}
      {Number(formValues.energy) > 0 && Number(formValues.day_rating) > 0 &&
        Number(formValues.energy) <= 2 && Number(formValues.day_rating) <= 2 && (
        <div className="mb-6 p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 flex items-start gap-3">
          <Heart className="size-5 text-purple-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-foreground/80">
            Sounds like a tough day. That&apos;s okay — showing up to reflect even on hard days builds real resilience.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {DAILY_FIELDS.map((field) => {
          const isAfterScales = field.type !== "scale"
          const softUnlocked = !isAfterScales || hasStarted
          // Fields with softUnlockField only show when the referenced field has content
          const parentUnlocked = field.softUnlockField
            ? !!(formValues[field.softUnlockField] && formValues[field.softUnlockField].trim())
            : true

          if (field.softUnlockField && !parentUnlocked) return null

          return (
            <div
              key={field.id}
              className={`transition-all duration-500 ${
                softUnlocked ? "opacity-100" : "opacity-60"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor={field.id} className="text-base font-medium">
                  {field.label}
                </Label>
                {field.type === "textarea" && (
                  <VoiceRecorderButton
                    onTranscription={(text) => {
                      const current = formValues[field.id] || ""
                      handleFieldChange(field.id, current ? `${current}\n${text}` : text)
                    }}
                    onError={(err) => console.error("Voice error:", err)}
                  />
                )}
              </div>

              {field.type === "scale" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-16 text-right">
                    {field.scaleLabels?.[0]}
                  </span>
                  <div className="flex gap-1.5 flex-1 justify-center">
                    {[1, 2, 3, 4, 5].map((n) => {
                      const selected = formValues[field.id] === String(n)
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => handleFieldChange(field.id, String(n))}
                          className={`size-10 sm:size-12 rounded-full text-sm font-medium transition-all ${
                            selected
                              ? "bg-primary text-primary-foreground scale-110 shadow-md"
                              : "bg-muted/40 hover:bg-muted text-foreground"
                          }`}
                          data-testid={`daily-field-${field.id}-${n}`}
                        >
                          {n}
                        </button>
                      )
                    })}
                  </div>
                  <span className="text-xs text-muted-foreground w-16">
                    {field.scaleLabels?.[1]}
                  </span>
                </div>
              )}

              {field.type === "tristate" && (
                <div className="flex gap-2">
                  {field.tristateOptions?.map((opt) => {
                    const selected = formValues[field.id] === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleFieldChange(field.id, opt.value)}
                        className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                          selected
                            ? `${opt.color} text-white shadow-md scale-[1.02]`
                            : "bg-muted/40 hover:bg-muted text-foreground"
                        }`}
                        data-testid={`daily-field-${field.id}-${opt.value}`}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              )}

              {field.type === "textarea" && (
                <div className="bg-muted/20 rounded-xl p-4">
                  <Textarea
                    id={field.id}
                    placeholder={field.placeholder}
                    value={formValues[field.id] || ""}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    rows={3}
                    className="resize-none border-0 bg-transparent focus-visible:ring-0 p-0"
                    data-testid={`daily-field-${field.id}`}
                  />
                </div>
              )}

              {field.type === "text" && (
                <Input
                  id={field.id}
                  placeholder={field.placeholder}
                  value={formValues[field.id] || ""}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  data-testid={`daily-field-${field.id}`}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Custom fields */}
      {customFields.length > 0 && (
        <div className="space-y-6 mt-6">
          {customFields.map((field) => (
            <div key={field.id}>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor={field.id} className="text-base font-medium">
                  {field.label}
                </Label>
                <button
                  type="button"
                  onClick={() => removeCustomField(field.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="bg-muted/20 rounded-xl p-4">
                <Textarea
                  id={field.id}
                  placeholder={`Enter ${field.label.toLowerCase()}...`}
                  value={formValues[field.id] || ""}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  rows={3}
                  className="resize-none border-0 bg-transparent focus-visible:ring-0 p-0"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add custom field */}
      <div className="mt-6">
        {showAddField ? (
          <div className="flex gap-2">
            <Input
              value={newFieldLabel}
              onChange={(e) => setNewFieldLabel(e.target.value)}
              placeholder="Section label (e.g. 'Gratitude')"
              className="flex-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); addCustomField() }
                if (e.key === "Escape") { setShowAddField(false); setNewFieldLabel("") }
              }}
              data-testid="daily-custom-field-input"
            />
            <Button type="button" size="sm" onClick={addCustomField} disabled={!newFieldLabel.trim()}>
              Add
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => { setShowAddField(false); setNewFieldLabel("") }}>
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAddField(true)}
            className="w-full py-3 border-2 border-dashed border-muted-foreground/30 rounded-xl text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
            data-testid="daily-add-field-btn"
          >
            <Plus className="size-4" /> Add a section
          </button>
        )}
      </div>

      {submitError && (
        <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          {submitError}
        </div>
      )}

      <Button
        className="w-full mt-8 gap-2"
        disabled={isSubmitting}
        onClick={handleSubmit}
        data-testid="daily-review-submit"
      >
        {isSubmitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Check className="size-4" />
        )}
        Save Reflection
      </Button>
    </div>
  )
}
