"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Zap, FileText, Microscope, Flame, ArrowLeft, Clock, MapPin, TrendingUp, Check, Settings2, ChevronRight, ChevronDown } from "lucide-react"
import Link from "next/link"
import type { FieldReportTemplateRow, SessionWithApproaches, ApproachOutcome, TemplateField } from "@/src/db/trackingTypes"
import { OUTCOME_OPTIONS, MOOD_OPTIONS } from "../types"
import { FieldRenderer } from "./FieldRenderer"

interface FieldReportPageProps {
  userId: string
  sessionId?: string
}

interface SessionSummaryData {
  approachCount: number
  duration: number | null
  location: string | null
  outcomes: Record<ApproachOutcome, number>
  averageMood: number | null
  tags: string[]
  startedAt: string
}

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  "quick-log": <Zap className="size-5" />,
  standard: <FileText className="size-5" />,
  "deep-dive": <Microscope className="size-5" />,
  blowout: <Flame className="size-5" />,
  custom: <Settings2 className="size-5" />,
}

const TEMPLATE_COLORS: Record<string, string> = {
  "quick-log": "bg-amber-500/10 text-amber-500 border-amber-500/20",
  standard: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  "deep-dive": "bg-purple-500/10 text-purple-500 border-purple-500/20",
  blowout: "bg-red-500/10 text-red-500 border-red-500/20",
  custom: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function FieldReportPage({ userId, sessionId }: FieldReportPageProps) {
  const router = useRouter()
  const [templates, setTemplates] = useState<FieldReportTemplateRow[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<FieldReportTemplateRow | null>(null)
  const [sessionData, setSessionData] = useState<SessionSummaryData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionLoading, setSessionLoading] = useState(!!sessionId)
  const [formValues, setFormValues] = useState<Record<string, unknown>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null)

  useEffect(() => {
    loadTemplates()
    if (sessionId) {
      loadSessionData(sessionId)
    }
  }, [sessionId])

  const loadSessionData = async (id: string) => {
    try {
      const response = await fetch(`/api/tracking/session/${id}`)
      if (response.ok) {
        const session: SessionWithApproaches = await response.json()

        // Calculate outcomes breakdown
        const outcomes: Record<ApproachOutcome, number> = {
          blowout: 0,
          short: 0,
          good: 0,
          number: 0,
          instadate: 0,
        }

        // Calculate mood average and collect tags
        let moodSum = 0
        let moodCount = 0
        const tagsSet = new Set<string>()

        for (const approach of session.approaches) {
          if (approach.outcome) {
            outcomes[approach.outcome]++
          }
          if (approach.mood !== null) {
            moodSum += approach.mood
            moodCount++
          }
          if (approach.tags) {
            approach.tags.forEach(tag => tagsSet.add(tag))
          }
        }

        setSessionData({
          approachCount: session.approaches.length,
          duration: session.duration_minutes,
          location: session.primary_location,
          outcomes,
          averageMood: moodCount > 0 ? Math.round(moodSum / moodCount) : null,
          tags: Array.from(tagsSet),
          startedAt: session.started_at,
        })
      }
    } catch (error) {
      console.error("Failed to load session data:", error)
    } finally {
      setSessionLoading(false)
    }
  }

  const loadTemplates = async () => {
    try {
      const response = await fetch("/api/tracking/templates/field-report")
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error("Failed to load templates:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Get all fields to render (static + active dynamic)
  const fieldsToRender = useMemo((): TemplateField[] => {
    if (!selectedTemplate) return []

    const staticFields = selectedTemplate.static_fields || []
    const dynamicFields = selectedTemplate.dynamic_fields || []
    const activeIds = selectedTemplate.active_dynamic_fields || []

    const activeDynamic = dynamicFields.filter(f => activeIds.includes(f.id))

    return [...staticFields, ...activeDynamic]
  }, [selectedTemplate])

  // Pre-fill form values when template is selected
  useEffect(() => {
    if (!selectedTemplate) return

    const prefilled: Record<string, unknown> = {}

    // Pre-fill from session data if available
    if (sessionData) {
      // Try to match common field patterns
      for (const field of fieldsToRender) {
        const fieldIdLower = field.id.toLowerCase()

        // Location fields
        if (fieldIdLower.includes("location")) {
          prefilled[field.id] = sessionData.location || ""
        }
        // Approach count fields
        else if (fieldIdLower.includes("approach") && field.type === "number") {
          prefilled[field.id] = sessionData.approachCount
        }
        // Duration fields
        else if (fieldIdLower.includes("duration") && field.type === "number") {
          prefilled[field.id] = sessionData.duration
        }
        // Mood fields
        else if (fieldIdLower.includes("mood") && field.type === "scale") {
          prefilled[field.id] = sessionData.averageMood
        }
        // Energy fields (use mood as proxy)
        else if (fieldIdLower.includes("energy") && field.type === "scale") {
          prefilled[field.id] = sessionData.averageMood
        }
        // Tags
        else if (field.type === "tags" && sessionData.tags.length > 0) {
          prefilled[field.id] = sessionData.tags
        }
      }
    }

    setFormValues(prefilled)
  }, [selectedTemplate, sessionData, fieldsToRender])

  const handleFieldChange = (fieldId: string, value: unknown) => {
    setFormValues(prev => ({ ...prev, [fieldId]: value }))
  }

  const handleSubmit = async (isDraft: boolean) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch("/api/tracking/field-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: selectedTemplate?.id,
          session_id: sessionId,
          fields: formValues,
          approach_count: sessionData?.approachCount,
          location: sessionData?.location,
          tags: sessionData?.tags,
          is_draft: isDraft,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to save report")
      }

      // Navigate back to tracking dashboard
      router.push("/dashboard/tracking")
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to save report")
    } finally {
      setIsSubmitting(false)
    }
  }

  const validateForm = (): boolean => {
    // Check all required fields have values
    for (const field of fieldsToRender) {
      if (field.required) {
        const value = formValues[field.id]
        if (value === undefined || value === null || value === "") {
          return false
        }
        if (Array.isArray(value) && value.length === 0) {
          return false
        }
      }
    }
    return true
  }

  if (isLoading || sessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  // Template selection view
  if (!selectedTemplate) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link
            href="/dashboard/tracking"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="size-4" />
            Back to Tracking
          </Link>
          <h1 className="text-3xl font-bold">Write Field Report</h1>
          <p className="text-muted-foreground mt-2">
            {sessionData ? "Review your session and choose a template" : "Choose a template that fits your session"}
          </p>
        </div>

        {/* Session Summary Card */}
        {sessionData && (
          <Card className="p-6 mb-8 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-semibold text-lg">Session Summary</h2>
                <p className="text-sm text-muted-foreground">
                  {new Date(sessionData.startedAt).toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div className="text-4xl font-bold text-primary">
                {sessionData.approachCount}
                <span className="text-sm font-normal text-muted-foreground ml-1">approaches</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {sessionData.duration && (
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-muted-foreground" />
                  <span className="text-sm">{sessionData.duration} min</span>
                </div>
              )}
              {sessionData.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-muted-foreground" />
                  <span className="text-sm">{sessionData.location}</span>
                </div>
              )}
              {sessionData.averageMood !== null && (
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {MOOD_OPTIONS.find(m => m.value === sessionData.averageMood)?.emoji || "😐"}
                  </span>
                  <span className="text-sm">avg mood</span>
                </div>
              )}
              {(sessionData.outcomes.number > 0 || sessionData.outcomes.instadate > 0) && (
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-4 text-green-500" />
                  <span className="text-sm">
                    {sessionData.outcomes.number} 📱 {sessionData.outcomes.instadate > 0 && `${sessionData.outcomes.instadate} 🎉`}
                  </span>
                </div>
              )}
            </div>

            {/* Outcomes breakdown */}
            <div className="flex flex-wrap gap-2 mb-4">
              {OUTCOME_OPTIONS.map((option) => {
                const count = sessionData.outcomes[option.value]
                if (count === 0) return null
                return (
                  <Badge key={option.value} variant="secondary" className={option.color}>
                    {option.emoji} {option.label}: {count}
                  </Badge>
                )
              })}
            </div>

            {/* Tags */}
            {sessionData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {sessionData.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </Card>
        )}

        <div className="flex flex-col gap-3">
          {templates.map((template) => {
            const colorClass = TEMPLATE_COLORS[template.slug] || "bg-primary/10 text-primary border-primary/20"
            const isExpanded = expandedTemplate === template.id
            const allFields = [
              ...template.static_fields,
              ...(template.dynamic_fields || []).filter(f =>
                template.active_dynamic_fields?.includes(f.id)
              )
            ]
            const previewFields = allFields.slice(0, 3)
            const remainingCount = allFields.length - 3

            return (
              <Card
                key={template.id}
                className={`group cursor-pointer transition-all hover:shadow-md ${
                  isExpanded ? "border-primary shadow-md" : "hover:border-primary/50"
                }`}
                onMouseEnter={() => setExpandedTemplate(template.id)}
                onMouseLeave={() => setExpandedTemplate(null)}
              >
                {/* Header */}
                <div
                  className="flex items-center gap-4 p-4"
                  onClick={() => setSelectedTemplate(template)}
                >
                  <div className={`p-3 rounded-xl border ${colorClass}`}>
                    {TEMPLATE_ICONS[template.slug] || <FileText className="size-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-base">{template.name}</h3>
                      <Badge variant="secondary" className="text-xs">
                        ~{template.estimated_minutes} min
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {allFields.length} fields
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {template.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChevronDown className={`size-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    <ChevronRight className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>

                {/* Field Preview - Always visible */}
                <div className="px-4 pb-3 border-t border-border/50">
                  <div className="pt-3 space-y-1.5">
                    {previewFields.map((field, idx) => (
                      <div key={field.id} className="flex items-start gap-2 text-sm">
                        <span className="text-muted-foreground/60 font-mono text-xs mt-0.5">{idx + 1}.</span>
                        <span className={field.required ? "text-foreground" : "text-muted-foreground"}>
                          {field.label}
                          {field.required && <span className="text-primary ml-1">*</span>}
                        </span>
                      </div>
                    ))}
                    {!isExpanded && remainingCount > 0 && (
                      <div className="text-xs text-muted-foreground pl-5">
                        +{remainingCount} more field{remainingCount > 1 ? "s" : ""}...
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded Fields */}
                {isExpanded && remainingCount > 0 && (
                  <div className="px-4 pb-4 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    {allFields.slice(3).map((field, idx) => (
                      <div key={field.id} className="flex items-start gap-2 text-sm">
                        <span className="text-muted-foreground/60 font-mono text-xs mt-0.5">{idx + 4}.</span>
                        <span className={field.required ? "text-foreground" : "text-muted-foreground"}>
                          {field.label}
                          {field.required && <span className="text-primary ml-1">*</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Use this template button on expand */}
                {isExpanded && (
                  <div className="px-4 pb-4 animate-in fade-in duration-200">
                    <Button
                      className="w-full"
                      onClick={() => setSelectedTemplate(template)}
                    >
                      Use {template.name}
                      <ChevronRight className="size-4 ml-2" />
                    </Button>
                  </div>
                )}
              </Card>
            )
          })}

          {/* Custom Field Report Option */}
          <Card
            className={`group cursor-pointer border-dashed border-2 transition-all hover:shadow-md ${
              expandedTemplate === "custom" ? "border-emerald-500 shadow-md" : "hover:border-emerald-500/50"
            }`}
            onMouseEnter={() => setExpandedTemplate("custom")}
            onMouseLeave={() => setExpandedTemplate(null)}
          >
            <div className="flex items-center gap-4 p-4">
              <div className={`p-3 rounded-xl border ${TEMPLATE_COLORS.custom}`}>
                {TEMPLATE_ICONS.custom}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-base">Custom Report</h3>
                  <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                    Build Your Own
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Create a personalized field report with the fields that matter most to you
                </p>
              </div>
              <ChevronRight className="size-5 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
            </div>

            {/* Custom template preview */}
            <div className="px-4 pb-3 border-t border-border/50">
              <div className="pt-3 space-y-1.5">
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Settings2 className="size-4 mt-0.5 text-emerald-500/60" />
                  <span>Pick from 20+ field types</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Settings2 className="size-4 mt-0.5 text-emerald-500/60" />
                  <span>Arrange in your preferred order</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Settings2 className="size-4 mt-0.5 text-emerald-500/60" />
                  <span>Save as reusable template</span>
                </div>
              </div>
            </div>

            {expandedTemplate === "custom" && (
              <div className="px-4 pb-4 animate-in fade-in duration-200">
                <Button
                  variant="outline"
                  className="w-full border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10"
                  onClick={() => {
                    // TODO: Navigate to custom template builder
                    console.log("Custom template clicked")
                  }}
                >
                  Build Custom Template
                  <ChevronRight className="size-4 ml-2" />
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    )
  }

  // Report form view
  const isValid = validateForm()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <button
          onClick={() => {
            setSelectedTemplate(null)
            setFormValues({})
            setSubmitError(null)
          }}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="size-4" />
          Choose Different Template
        </button>
        <h1 className="text-3xl font-bold">{selectedTemplate.name}</h1>
        <p className="text-muted-foreground mt-2">{selectedTemplate.description}</p>
      </div>

      {/* Session summary mini-card */}
      {sessionData && (
        <Card className="p-4 mb-6 bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <span className="font-medium">{sessionData.approachCount} approaches</span>
              {sessionData.duration && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="size-3" />
                  {sessionData.duration} min
                </span>
              )}
              {sessionData.location && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="size-3" />
                  {sessionData.location}
                </span>
              )}
            </div>
            {(sessionData.outcomes.number > 0 || sessionData.outcomes.instadate > 0) && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <TrendingUp className="size-3 mr-1" />
                {sessionData.outcomes.number} numbers{sessionData.outcomes.instadate > 0 && `, ${sessionData.outcomes.instadate} instadates`}
              </Badge>
            )}
          </div>
        </Card>
      )}

      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(false) }}>
        <Card className="p-6">
          <div className="space-y-6">
            {fieldsToRender.map((field) => (
              <FieldRenderer
                key={field.id}
                field={field}
                value={formValues[field.id]}
                onChange={(value) => handleFieldChange(field.id, value)}
              />
            ))}
          </div>

          {submitError && (
            <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {submitError}
            </div>
          )}

          <div className="flex gap-3 mt-8">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={isSubmitting}
              onClick={() => handleSubmit(true)}
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : null}
              Save Draft
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting || !isValid}
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <Check className="size-4 mr-2" />
              )}
              Submit Report
            </Button>
          </div>
        </Card>
      </form>
    </div>
  )
}
