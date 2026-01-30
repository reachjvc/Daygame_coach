"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  FileText,
  ArrowLeft,
  Clock,
  MapPin,
  TrendingUp,
  Check,
  Settings2,
  ArrowRight,
} from "lucide-react"
import Link from "next/link"
import type { FieldReportTemplateRow, SessionWithApproaches, ApproachOutcome, TemplateField } from "@/src/db/trackingTypes"
import { OUTCOME_OPTIONS, MOOD_OPTIONS, type SessionSummaryData } from "../types"
import { TEMPLATE_ICONS, TEMPLATE_COLORS, TEMPLATE_TAGLINES } from "../config"
import { FieldRenderer } from "./FieldRenderer"
import { KeyStatsSection } from "./KeyStatsSection"
import { PrinciplesSection } from "./PrinciplesSection"
import { ResearchDomainsSection } from "./ResearchDomainsSection"

interface FieldReportPageProps {
  userId: string
  sessionId?: string
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- userId reserved for save functionality
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

  useEffect(() => {
    loadTemplates()
    if (sessionId) {
      loadSessionData(sessionId)
    }
  }, [sessionId])

  // Handle browser back button - close template form instead of leaving page
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // If we have a selected template and user pressed back, close the form
      if (selectedTemplate && !event.state?.templateOpen) {
        setSelectedTemplate(null)
        setFormValues({})
        setSubmitError(null)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [selectedTemplate])

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

  // Select template and push history state so back button closes form
  const handleSelectTemplate = (template: FieldReportTemplateRow) => {
    setSelectedTemplate(template)
    // Push a new history entry so back button closes the form
    window.history.pushState({ templateOpen: true }, '')
  }

  // Close template form (used by back button in UI)
  const handleCloseTemplate = () => {
    setSelectedTemplate(null)
    setFormValues({})
    setSubmitError(null)
    // Go back in history to remove our pushed state
    window.history.back()
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
      <div className="max-w-6xl mx-auto px-4 py-8">
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

        {/* Key Stats - First thing users see */}
        <div className="mb-12">
          <KeyStatsSection />
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

        {/* Template Selection Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Choose Your Template</h2>
          <p className="text-muted-foreground mt-1">Match the depth to your session</p>
        </div>

        {/* Visual Cards Grid - Layout 4 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {templates.map((template) => {
            const colors = TEMPLATE_COLORS[template.slug] || {
              bg: "bg-primary/10 text-primary border-primary/20",
              icon: "bg-primary text-primary-foreground",
              gradient: "from-primary/30 via-primary/10 to-accent/20",
            }
            const tagline = TEMPLATE_TAGLINES[template.slug] || template.description
            const allFields = [
              ...template.static_fields,
              ...(template.dynamic_fields || []).filter(f =>
                template.active_dynamic_fields?.includes(f.id)
              )
            ]

            return (
              <div
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className="group rounded-2xl overflow-hidden border border-border hover:border-primary/50 transition-all duration-300 cursor-pointer hover:shadow-2xl hover:shadow-primary/10 bg-card"
              >
                {/* Visual header with pattern */}
                <div className={`h-32 relative overflow-hidden bg-gradient-to-br ${colors.gradient}`}>
                  {/* Abstract pattern overlay */}
                  <div className="absolute inset-0 opacity-30">
                    <svg width="100%" height="100%" className="text-foreground">
                      <defs>
                        <pattern id={`pattern-${template.id}`} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                          <circle cx="20" cy="20" r="1.5" fill="currentColor" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill={`url(#pattern-${template.id})`} />
                    </svg>
                  </div>

                  {/* Floating icon */}
                  <div className={`absolute top-6 left-6 p-4 rounded-2xl ${colors.icon} shadow-xl group-hover:scale-110 transition-transform duration-300`}>
                    {TEMPLATE_ICONS[template.slug] || <FileText className="size-6" />}
                  </div>

                  {/* Time badge */}
                  <div className="absolute top-6 right-6 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm text-foreground text-sm font-medium">
                    {template.estimated_minutes} min
                  </div>

                  {/* Bottom gradient */}
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="text-xl font-bold text-foreground mb-1">{template.name}</h3>
                  <p className="text-muted-foreground text-sm italic mb-3">{tagline}</p>
                  <p className="text-foreground/70 text-sm leading-relaxed mb-4">{template.description}</p>

                  {/* Quick stats */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                    <span>{allFields.length} fields</span>
                    <span>•</span>
                    <span>{allFields.filter(f => f.required).length} required</span>
                  </div>

                  {/* CTA */}
                  <button className="w-full py-3 rounded-xl text-primary-foreground font-semibold bg-primary opacity-90 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    Start Report
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              </div>
            )
          })}

          {/* Custom Field Report Option */}
          <div
            onClick={() => {
              // TODO: Navigate to custom template builder
            }}
            className="group rounded-2xl overflow-hidden border-2 border-dashed border-border hover:border-emerald-500/50 transition-all duration-300 cursor-pointer hover:shadow-2xl hover:shadow-emerald-500/10 bg-card"
          >
            {/* Visual header with pattern */}
            <div className="h-32 relative overflow-hidden bg-gradient-to-br from-emerald-500/30 via-emerald-500/10 to-teal-500/20">
              {/* Abstract pattern overlay */}
              <div className="absolute inset-0 opacity-30">
                <svg width="100%" height="100%" className="text-foreground">
                  <defs>
                    <pattern id="pattern-custom" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                      <circle cx="20" cy="20" r="1.5" fill="currentColor" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#pattern-custom)" />
                </svg>
              </div>

              {/* Floating icon */}
              <div className="absolute top-6 left-6 p-4 rounded-2xl bg-emerald-500 text-white shadow-xl group-hover:scale-110 transition-transform duration-300">
                <Settings2 className="size-6" />
              </div>

              {/* Badge */}
              <div className="absolute top-6 right-6 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm text-emerald-600 text-sm font-medium">
                Build Your Own
              </div>

              {/* Bottom gradient */}
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
            </div>

            {/* Content */}
            <div className="p-5">
              <h3 className="text-xl font-bold text-foreground mb-1">Custom Report</h3>
              <p className="text-muted-foreground text-sm italic mb-3">Your fields, your way.</p>
              <p className="text-foreground/70 text-sm leading-relaxed mb-4">
                Create a personalized field report with the fields that matter most to you.
              </p>

              {/* Features list */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                <span>20+ field types</span>
                <span>•</span>
                <span>Save as template</span>
              </div>

              {/* CTA */}
              <button className="w-full py-3 rounded-xl font-semibold border-2 border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10 transition-colors flex items-center justify-center gap-2">
                Build Custom Template
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="my-16">
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        {/* Principles Section */}
        <div className="mb-16">
          <PrinciplesSection />
        </div>

        {/* Divider */}
        <div className="mb-16">
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        {/* Research Domains */}
        <div className="mb-8">
          <ResearchDomainsSection />
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
          onClick={handleCloseTemplate}
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
