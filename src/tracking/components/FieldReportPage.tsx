"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
  Lock,
  Star,
  X,
  Heart,
} from "lucide-react"
import Link from "next/link"
import type { FieldReportTemplateRow, FieldReportRow, SessionWithApproaches, ApproachOutcome, TemplateField } from "@/src/db/trackingTypes"
import type { SessionSummaryData } from "../types"
import { OUTCOME_OPTIONS, MOOD_OPTIONS, SESSION_IMPORT_FIELD_IDS } from "../config"
import { TEMPLATE_COLORS, TEMPLATE_TAGLINES, TEMPLATE_ORDER, getSystemTemplateInfo, type TemplateSlug } from "../data/templates"
import { TEMPLATE_ICONS } from "./templateIcons"
import { FieldRenderer } from "./FieldRenderer"
import { SessionImportSection } from "./SessionImportSection"
import { KeyStatsSection } from "./KeyStatsSection"
import { PrinciplesSection } from "./PrinciplesSection"
import { ResearchDomainsSection } from "./ResearchDomainsSection"
import { CustomReportBuilder } from "./CustomReportBuilder"
import { DatePicker } from "./DatePicker"

interface FieldReportPageProps {
  userId: string
  sessionId?: string
  reportId?: string  // When provided, edit mode is enabled
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- userId reserved for save functionality
export function FieldReportPage({ userId, sessionId, reportId }: FieldReportPageProps) {
  const router = useRouter()
  const [templates, setTemplates] = useState<FieldReportTemplateRow[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<FieldReportTemplateRow | null>(null)
  const [sessionData, setSessionData] = useState<SessionSummaryData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionLoading, setSessionLoading] = useState(!!sessionId)
  const [formValues, setFormValues] = useState<Record<string, unknown>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [recentlyUsedTemplateId, setRecentlyUsedTemplateId] = useState<string | null>(null)
  const [favoriteTemplateIds, setFavoriteTemplateIds] = useState<string[]>([])
  const [isTogglingFavorite, setIsTogglingFavorite] = useState<string | null>(null)
  const [showCustomBuilder, setShowCustomBuilder] = useState(false)
  const [reportTitle, setReportTitle] = useState("")
  const [reportDate, setReportDate] = useState<Date>(new Date())
  const [postSessionMood, setPostSessionMood] = useState<number | null>(null)

  // Edit mode state
  const [existingReport, setExistingReport] = useState<FieldReportRow | null>(null)
  const [isLoadingReport, setIsLoadingReport] = useState(!!reportId)
  const [templateMatchAttempted, setTemplateMatchAttempted] = useState(false)
  const [templatesLoaded, setTemplatesLoaded] = useState(false)
  const isEditMode = !!reportId

  // Ref for scrolling to template section when coming from ended session
  const templateSectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadTemplates()
    if (reportId) {
      // Edit mode: load existing report
      loadExistingReport(reportId)
    } else {
      // Create mode: load favorites/recent
      loadRecentlyUsedTemplate()
      loadFavoriteTemplates()
      if (sessionId) {
        loadSessionData(sessionId)
      }
    }
    // Replace initial history state so we have a known "home" state to return to
    // This prevents browser back from navigating away entirely when closing modals
    window.history.replaceState({ fieldReportHome: true }, '')
  }, [sessionId, reportId])

  // Scroll to template section when coming from ended session
  useEffect(() => {
    if (sessionId && !isLoading && !sessionLoading && templateSectionRef.current) {
      // Small delay to ensure DOM is fully rendered
      const timeoutId = setTimeout(() => {
        templateSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [sessionId, isLoading, sessionLoading])

  const loadRecentlyUsedTemplate = async () => {
    try {
      const response = await fetch("/api/tracking/field-reports/recent")
      if (response.ok) {
        const data = await response.json()
        if (data.templateId) {
          setRecentlyUsedTemplateId(data.templateId)
        }
      }
    } catch (error) {
      // Silently fail - recently used is optional
      console.error("Failed to load recently used template:", error)
    }
  }

  const loadFavoriteTemplates = async () => {
    try {
      const response = await fetch("/api/tracking/templates/field-report/favorites")
      if (response.ok) {
        const data = await response.json()
        setFavoriteTemplateIds(data.favoriteIds || [])
      }
    } catch (error) {
      console.error("Failed to load favorite templates:", error)
    }
  }

  const loadExistingReport = async (id: string) => {
    setIsLoadingReport(true)
    try {
      const response = await fetch(`/api/tracking/field-report/${id}`)
      if (!response.ok) {
        throw new Error("Report not found")
      }

      const report: FieldReportRow = await response.json()
      setExistingReport(report)

      // Populate form with existing values
      setFormValues(report.fields || {})
      setReportTitle(report.title || "")
      setReportDate(new Date(report.reported_at))

      // Load post-session mood if stored
      const storedMood = report.fields?.[SESSION_IMPORT_FIELD_IDS.POST_SESSION_MOOD]
      if (typeof storedMood === "number") {
        setPostSessionMood(storedMood)
      }

      // Find and select the template used for this report
      // Wait for templates to load, then match
      const findTemplate = () => {
        if (report.system_template_slug) {
          // System template - find from loaded templates
          const systemTemplate = templates.find(t => t.slug === report.system_template_slug)
          if (systemTemplate) {
            setSelectedTemplate(systemTemplate)
          }
        } else if (report.template_id) {
          // Custom template - find from loaded templates
          const customTemplate = templates.find(t => t.id === report.template_id)
          if (customTemplate) {
            setSelectedTemplate(customTemplate)
          }
        }
      }

      // If templates are already loaded, find immediately
      // Otherwise, they'll be set when templates load and we'll match in a useEffect
      findTemplate()
    } catch (error) {
      console.error("Failed to load report:", error)
      setSubmitError("Failed to load report. It may have been deleted.")
    } finally {
      setIsLoadingReport(false)
    }
  }

  // Match template once templates are loaded (for edit mode)
  useEffect(() => {
    if (existingReport && templatesLoaded && !selectedTemplate && !templateMatchAttempted) {
      setTemplateMatchAttempted(true)
      if (existingReport.system_template_slug) {
        const systemTemplate = templates.find(t => t.slug === existingReport.system_template_slug)
        if (systemTemplate) setSelectedTemplate(systemTemplate)
      } else if (existingReport.template_id) {
        const customTemplate = templates.find(t => t.id === existingReport.template_id)
        if (customTemplate) setSelectedTemplate(customTemplate)
      }
    }
  }, [existingReport, templates, templatesLoaded, selectedTemplate, templateMatchAttempted])

  // Load session data in edit mode if report has a session_id
  useEffect(() => {
    if (isEditMode && existingReport?.session_id && !sessionData && !sessionLoading) {
      setSessionLoading(true)
      loadSessionData(existingReport.session_id)
    }
  }, [existingReport?.session_id, isEditMode, sessionData, sessionLoading])

  const toggleFavorite = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click
    setIsTogglingFavorite(templateId)

    try {
      const isFavorite = favoriteTemplateIds.includes(templateId)
      const response = await fetch("/api/tracking/templates/field-report/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          action: isFavorite ? "remove" : "add",
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setFavoriteTemplateIds(data.favoriteIds || [])
      } else {
        const error = await response.json()
        console.error("Failed to toggle favorite:", error.error)
      }
    } catch (error) {
      console.error("Failed to toggle favorite:", error)
    } finally {
      setIsTogglingFavorite(null)
    }
  }

  // Handle browser back button - close template form instead of leaving page
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // If we have the custom builder open and user pressed back, close it
      if (showCustomBuilder && !event.state?.customBuilder) {
        setShowCustomBuilder(false)
        // Restore the home state if we went too far back
        if (!event.state?.fieldReportHome) {
          window.history.replaceState({ fieldReportHome: true }, '')
        }
        return
      }
      // If we have a selected template and user pressed back, close the form
      if (selectedTemplate && !event.state?.templateOpen) {
        setSelectedTemplate(null)
        setFormValues({})
        setReportTitle("")
        setReportDate(new Date())
        setSubmitError(null)
        setPostSessionMood(null)
        // Restore the home state if we went too far back
        if (!event.state?.fieldReportHome) {
          window.history.replaceState({ fieldReportHome: true }, '')
        }
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [selectedTemplate, showCustomBuilder])

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

        // Build approach mood timeline
        const approachMoods = session.approaches.map((approach, index) => ({
          approachNumber: index + 1,
          mood: approach.mood,
          timestamp: approach.timestamp,
        }))

        // Build approach notes (only approaches with non-empty notes)
        const approachNotes = session.approaches
          .map((approach, index) => ({
            approachNumber: index + 1,
            note: approach.note,
          }))
          .filter((entry): entry is { approachNumber: number; note: string } =>
            entry.note !== null && entry.note.trim() !== ""
          )

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
          // Basic stats
          approachCount: session.approaches.length,
          duration: session.duration_minutes,
          location: session.primary_location,
          outcomes,
          averageMood: moodCount > 0 ? Math.round(moodSum / moodCount) : null,
          tags: Array.from(tagsSet),
          startedAt: session.started_at,
          // Pre-session intentions
          goal: session.goal,
          preSessionMood: session.pre_session_mood,
          sessionFocus: session.session_focus,
          techniqueFocus: session.technique_focus,
          ifThenPlan: session.if_then_plan,
          customIntention: session.custom_intention,
          // Per-approach mood timeline
          approachMoods,
          // Per-approach notes
          approachNotes,
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
      setTemplatesLoaded(true) // Always set true to unblock UI
      setIsLoading(false)
    }
  }

  // Sort templates: recently used 2nd, then by logical order
  // Split templates into favorites and non-favorites
  const { favoriteTemplates, nonFavoriteTemplates } = useMemo(() => {
    const favorites: FieldReportTemplateRow[] = []
    const nonFavorites: FieldReportTemplateRow[] = []

    // Filter out deprecated "customizable" template
    const activeTemplates = templates.filter(t => t.slug !== "customizable")

    // First, add favorites in the order they were favorited
    for (const favId of favoriteTemplateIds) {
      const template = activeTemplates.find(t => t.id === favId)
      if (template) {
        favorites.push(template)
      }
    }

    // Then sort non-favorites: recently used first, then by logical order
    const remaining = activeTemplates.filter(t => !favoriteTemplateIds.includes(t.id))
    remaining.sort((a, b) => {
      // Recently used goes to the top (if not a favorite)
      if (recentlyUsedTemplateId) {
        if (a.id === recentlyUsedTemplateId) return -1
        if (b.id === recentlyUsedTemplateId) return 1
      }
      // Then sort by logical order
      const orderA = TEMPLATE_ORDER[a.slug] ?? 100
      const orderB = TEMPLATE_ORDER[b.slug] ?? 100
      return orderA - orderB
    })

    return { favoriteTemplates: favorites, nonFavoriteTemplates: remaining }
  }, [templates, favoriteTemplateIds, recentlyUsedTemplateId])

  // Get all fields to render (static + active dynamic)
  // When session data exists, filter out approach count fields since they're shown in Session Context
  // In edit mode without template, infer fields from saved report data
  const fieldsToRender = useMemo((): TemplateField[] => {
    // In edit mode without a matched template, infer fields from saved report
    if (isEditMode && !selectedTemplate && existingReport?.fields) {
      return Object.keys(existingReport.fields).map((fieldId): TemplateField => {
        const value = existingReport.fields[fieldId]
        // Infer field type from the stored value
        let type: TemplateField["type"] = "text"
        if (typeof value === "number") type = "number"
        else if (Array.isArray(value)) type = "tags"
        else if (typeof value === "string" && value.length > 100) type = "textarea"

        return {
          id: fieldId,
          type,
          label: fieldId
            .replace(/_/g, " ")
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, str => str.toUpperCase())
            .trim(),
          placeholder: "",
          rows: type === "textarea" ? 4 : undefined,
        }
      })
    }

    if (!selectedTemplate) return []

    const staticFields = selectedTemplate.static_fields || []
    const dynamicFields = selectedTemplate.dynamic_fields || []
    const activeIds = selectedTemplate.active_dynamic_fields || []

    const activeDynamic = dynamicFields.filter(f => activeIds.includes(f.id))
    let allFields = [...staticFields, ...activeDynamic]

    // Filter out fields that are already displayed in Session Context section
    if (sessionData) {
      allFields = allFields.filter(field => {
        const fieldIdLower = field.id.toLowerCase()
        // Filter approach count fields (shown in session context)
        const isApproachField = fieldIdLower.includes("approach") && field.type === "number"
        // Filter location fields when session has location (shown in session context)
        const isLocationField = fieldIdLower.includes("location") && sessionData.location
        return !isApproachField && !isLocationField
      })
    }

    return allFields
  }, [selectedTemplate, sessionData, isEditMode, existingReport])

  // Pre-fill form values when template is selected (CREATE mode only)
  // In edit mode, we already have values from the existing report
  useEffect(() => {
    if (!selectedTemplate) return
    if (isEditMode) return // Don't overwrite existing report values

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
        // Conversation fields - pre-fill with approach notes (voice transcriptions)
        else if (
          fieldIdLower === "conversation" &&
          (field.type === "textarea" || field.type === "text") &&
          sessionData.approachNotes.length > 0
        ) {
          // For multiple textareas, return array; for single, join with newlines
          if (field.multiple) {
            prefilled[field.id] = sessionData.approachNotes
              .map(({ approachNumber, note }) => `#${approachNumber}: ${note}`)
          } else {
            prefilled[field.id] = sessionData.approachNotes
              .map(({ approachNumber, note }) => `#${approachNumber}: ${note}`)
              .join("\n\n")
          }
        }
      }
    }

    setFormValues(prefilled)
  }, [selectedTemplate, sessionData, fieldsToRender, isEditMode])

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
    setReportTitle("")
    setReportDate(new Date())
    setSubmitError(null)
    setPostSessionMood(null)
    // Go back in history to remove our pushed state
    window.history.back()
  }

  const handleSubmit = async (isDraft: boolean) => {
    setIsSubmitting(true)
    setSubmitError(null)

    // Include post-session mood in fields
    const fieldsWithMood = {
      ...formValues,
      ...(postSessionMood !== null && { [SESSION_IMPORT_FIELD_IDS.POST_SESSION_MOOD]: postSessionMood }),
    }

    // Extract approach count from form values (check for "approaches" field)
    // Priority: form value > session data
    let approachCount: number | undefined = sessionData?.approachCount ?? undefined
    const approachesFormValue = formValues["approaches"]
    if (approachesFormValue !== undefined && approachesFormValue !== null && approachesFormValue !== "") {
      const parsed = typeof approachesFormValue === "number" ? approachesFormValue : Number(approachesFormValue)
      if (!isNaN(parsed) && parsed >= 0) {
        approachCount = parsed
      }
    }

    try {
      let response: Response

      if (isEditMode && reportId) {
        // Edit mode: PUT to update existing report
        response = await fetch(`/api/tracking/field-report/${reportId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: reportTitle || undefined,
            fields: fieldsWithMood,
            approach_count: approachCount,
            location: existingReport?.location ?? sessionData?.location ?? undefined,
            tags: existingReport?.tags ?? sessionData?.tags ?? undefined,
            is_draft: isDraft,
          }),
        })
      } else {
        // Create mode: POST new report
        // Determine template type - system templates have synthetic IDs starting with "system-"
        const isSystemTemplate = selectedTemplate?.id.startsWith("system-")

        response = await fetch("/api/tracking/field-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            // Send system_template_slug for system templates, template_id (UUID) for custom
            ...(isSystemTemplate
              ? { system_template_slug: selectedTemplate?.slug }
              : { template_id: selectedTemplate?.id }),
            session_id: sessionId,
            title: reportTitle || undefined,
            report_date: reportDate?.toISOString() || undefined,
            fields: fieldsWithMood,
            approach_count: approachCount,
            location: sessionData?.location ?? undefined,
            tags: sessionData?.tags ?? undefined,
            is_draft: isDraft,
          }),
        })
      }

      if (!response.ok) {
        const error = await response.json()
        // Include validation details if available for debugging
        const details = error.details?.fieldErrors
          ? Object.entries(error.details.fieldErrors)
              .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(", ")}`)
              .join("; ")
          : ""
        throw new Error(details || error.error || "Failed to save report")
      }

      // Navigate back - go back for edit (returns to wherever user came from), to dashboard for create
      if (isEditMode) {
        router.back()
      } else {
        router.push("/dashboard/tracking")
      }
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

  // In edit mode, wait for template matching to be attempted
  const isWaitingForTemplateMatch = isEditMode &&
    existingReport &&
    (existingReport.system_template_slug || existingReport.template_id) &&
    !templateMatchAttempted

  if (isLoading || sessionLoading || isLoadingReport || isWaitingForTemplateMatch) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  // Error state for edit mode - report failed to load
  if (isEditMode && submitError && !existingReport) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          href="/dashboard/tracking/history"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to History
        </Link>
        <Card className="p-6 rounded-2xl border-destructive/50">
          <div className="text-center">
            <FileText className="size-12 mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="text-xl font-semibold mb-2">Failed to Load Report</h2>
            <p className="text-destructive">{submitError}</p>
          </div>
        </Card>
      </div>
    )
  }

  // Custom report builder view (not available in edit mode)
  if (showCustomBuilder && !isEditMode) {
    return (
      <CustomReportBuilder
        sessionData={sessionData}
        onBack={() => {
          setShowCustomBuilder(false)
          window.history.back()
        }}
        onSaved={() => router.push("/dashboard/tracking")}
      />
    )
  }

  // Template selection view (only for create mode, not edit mode)
  if (!selectedTemplate && !isEditMode) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8" data-testid="field-report-template-selection">
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
        <div ref={templateSectionRef} className="mb-6 scroll-mt-6">
          <h2 className="text-2xl font-bold text-foreground">Choose Your Template</h2>
          <p className="text-muted-foreground mt-1">Match the depth to your session</p>
        </div>

        {/* Visual Cards Grid - Layout 4 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Favorite Templates */}
          {favoriteTemplates.map((template) => {
            const colors = TEMPLATE_COLORS[template.slug as TemplateSlug] || {
              bg: "bg-primary/10 text-primary border-primary/20",
              icon: "bg-primary text-primary-foreground",
              gradient: "from-primary/30 via-primary/10 to-accent/20",
            }
            const tagline = (TEMPLATE_TAGLINES as Record<string, string>)[template.slug] || template.description
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
                className="group rounded-2xl overflow-hidden border-2 border-rose-500/50 hover:border-rose-500 transition-all duration-300 cursor-pointer hover:shadow-2xl hover:shadow-rose-500/10 bg-card"
                data-testid={`template-card-favorite-${template.slug}`}
              >
                {/* Visual header with pattern */}
                <div className={`h-32 relative overflow-hidden bg-gradient-to-br ${colors.gradient}`}>
                  {/* Abstract pattern overlay */}
                  <div className="absolute inset-0 opacity-30">
                    <svg width="100%" height="100%" className="text-foreground">
                      <defs>
                        <pattern id={`pattern-fav-${template.id}`} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                          <circle cx="20" cy="20" r="1.5" fill="currentColor" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill={`url(#pattern-fav-${template.id})`} />
                    </svg>
                  </div>

                  {/* Floating icon */}
                  <div className={`absolute top-6 left-6 p-4 rounded-2xl ${colors.icon} shadow-xl group-hover:scale-110 transition-transform duration-300`}>
                    {(TEMPLATE_ICONS as Record<string, React.ReactNode>)[template.slug] || <FileText className="size-6" />}
                  </div>

                  {/* Favorite badge and time */}
                  <div className="absolute top-6 right-6 flex items-center gap-2">
                    <div className="px-3 py-1.5 rounded-full bg-rose-500/90 text-white text-sm font-medium flex items-center gap-1.5">
                      <Star className="size-3.5 fill-current" />
                      Favorite
                    </div>
                    <div className="px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm text-foreground text-sm font-medium">
                      {template.estimated_minutes} min
                    </div>
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

                  {/* CTA row with remove favorite button */}
                  <div className="flex gap-2">
                    <button className="flex-1 py-3 rounded-xl text-primary-foreground font-semibold bg-primary opacity-90 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      Start Report
                      <ArrowRight className="size-4" />
                    </button>
                    <button
                      onClick={(e) => toggleFavorite(template.id, e)}
                      disabled={isTogglingFavorite === template.id}
                      className="px-4 py-3 rounded-xl border border-rose-500/50 text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center justify-center"
                      title="Remove from favorites"
                    >
                      {isTogglingFavorite === template.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <X className="size-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Add to Favorites Card - Only show if < 3 favorites */}
          {favoriteTemplateIds.length < 3 && (
            <div
              className="group rounded-2xl overflow-hidden border-2 border-dashed border-rose-500/30 transition-all duration-300 bg-card"
              data-testid="template-card-add-favorite"
            >
              {/* Visual header with pattern */}
              <div className="h-32 relative overflow-hidden bg-gradient-to-br from-rose-500/20 via-rose-500/10 to-pink-500/15">
                {/* Abstract pattern overlay */}
                <div className="absolute inset-0 opacity-20">
                  <svg width="100%" height="100%" className="text-foreground">
                    <defs>
                      <pattern id="pattern-add-favorite" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                        <circle cx="20" cy="20" r="1.5" fill="currentColor" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#pattern-add-favorite)" />
                  </svg>
                </div>

                {/* Floating icon */}
                <div className="absolute top-6 left-6 p-4 rounded-2xl bg-rose-500/50 text-white shadow-xl">
                  <Heart className="size-6" />
                </div>

                {/* Slots badge */}
                <div className="absolute top-6 right-6 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm text-muted-foreground text-sm font-medium flex items-center gap-1.5">
                  <Star className="size-3.5" />
                  {3 - favoriteTemplateIds.length} slot{3 - favoriteTemplateIds.length !== 1 ? 's' : ''} left
                </div>

                {/* Bottom gradient */}
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="text-xl font-bold text-muted-foreground mb-1">Add a Favorite</h3>
                <p className="text-muted-foreground/70 text-sm italic mb-3">Quick access to your go-to templates.</p>
                <p className="text-muted-foreground/60 text-sm leading-relaxed mb-4">
                  Tap the <Heart className="size-3 inline" /> on any template below to save it here. You can have up to 3 favorites.
                </p>

                {/* Hint */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground/50 mb-4">
                  <Heart className="size-3" />
                  <span>Favorites appear at the top for quick access</span>
                </div>

                {/* Visual indicator */}
                <div className="w-full py-3 rounded-xl font-semibold border border-muted-foreground/20 text-muted-foreground/50 flex items-center justify-center gap-2">
                  Tap <Heart className="size-4" /> below to add
                </div>
              </div>
            </div>
          )}

          {/* Non-Favorite Templates */}
          {nonFavoriteTemplates.map((template) => {
            const colors = TEMPLATE_COLORS[template.slug as TemplateSlug] || {
              bg: "bg-primary/10 text-primary border-primary/20",
              icon: "bg-primary text-primary-foreground",
              gradient: "from-primary/30 via-primary/10 to-accent/20",
            }
            const tagline = (TEMPLATE_TAGLINES as Record<string, string>)[template.slug] || template.description
            const allFields = [
              ...template.static_fields,
              ...(template.dynamic_fields || []).filter(f =>
                template.active_dynamic_fields?.includes(f.id)
              )
            ]
            const canAddFavorite = favoriteTemplateIds.length < 3

            return (
              <div
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className="group rounded-2xl overflow-hidden border border-border hover:border-primary/50 transition-all duration-300 cursor-pointer hover:shadow-2xl hover:shadow-primary/10 bg-card"
                data-testid={`template-card-${template.slug}`}
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
                    {(TEMPLATE_ICONS as Record<string, React.ReactNode>)[template.slug] || <FileText className="size-6" />}
                  </div>

                  {/* Time badge and Recently Used badge */}
                  <div className="absolute top-6 right-6 flex items-center gap-2">
                    {recentlyUsedTemplateId === template.id && (
                      <div className="px-3 py-1.5 rounded-full bg-green-500/90 text-white text-sm font-medium">
                        Recently Used
                      </div>
                    )}
                    <div className="px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm text-foreground text-sm font-medium">
                      {template.estimated_minutes} min
                    </div>
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

                  {/* CTA row with add favorite button */}
                  <div className="flex gap-2">
                    <button className="flex-1 py-3 rounded-xl text-primary-foreground font-semibold bg-primary opacity-90 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      Start Report
                      <ArrowRight className="size-4" />
                    </button>
                    {canAddFavorite && (
                      <button
                        onClick={(e) => toggleFavorite(template.id, e)}
                        disabled={isTogglingFavorite === template.id}
                        className="px-4 py-3 rounded-xl border border-muted-foreground/30 text-muted-foreground hover:border-rose-500/50 hover:text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center justify-center"
                        title="Add to favorites"
                      >
                        {isTogglingFavorite === template.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Heart className="size-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Custom Field Report Option */}
          <div
            onClick={() => {
              setShowCustomBuilder(true)
              window.history.pushState({ customBuilder: true }, '')
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

  // Get template info - use existing report's slug in edit mode if no matched template
  const templateSlug = selectedTemplate?.slug || existingReport?.system_template_slug || "custom"
  const systemTemplateInfo = existingReport?.system_template_slug
    ? getSystemTemplateInfo(existingReport.system_template_slug)
    : undefined
  const templateName = selectedTemplate?.name || systemTemplateInfo?.name || "Edit Report"
  const templateDescription = selectedTemplate?.description || systemTemplateInfo?.description || "Update your field report"

  const colors = TEMPLATE_COLORS[templateSlug as TemplateSlug] || {
    bg: "bg-primary/10 text-primary border-primary/20",
    icon: "bg-primary text-primary-foreground",
    gradient: "from-primary/30 via-primary/10 to-accent/20",
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8" data-testid="field-report-form">
      {/* Back button */}
      {isEditMode ? (
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          data-testid="field-report-back"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
      ) : (
        <button
          onClick={handleCloseTemplate}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          data-testid="field-report-back"
        >
          <ArrowLeft className="size-4" />
          Choose Different Template
        </button>
      )}

      {/* Template header with gradient */}
      <div className={`rounded-2xl overflow-hidden mb-6 border border-border/50`}>
        <div className={`p-6 bg-gradient-to-br ${colors.gradient}`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${colors.icon} shadow-lg`}>
              {(TEMPLATE_ICONS as Record<string, React.ReactNode>)[templateSlug] || <FileText className="size-6" />}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{templateName}</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                {(TEMPLATE_TAGLINES as Record<string, string>)[templateSlug] || templateDescription}
              </p>
            </div>
          </div>
        </div>

        {/* Session summary mini-card */}
        {sessionData && (
          <div className="p-4 bg-card border-t border-border/50">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-4 text-sm">
                <span className="font-semibold text-primary">{sessionData.approachCount} approaches</span>
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
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                  <TrendingUp className="size-3 mr-1" />
                  {sessionData.outcomes.number} numbers{sessionData.outcomes.instadate > 0 && `, ${sessionData.outcomes.instadate} instadates`}
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(false) }}>
        <Card className="p-6 rounded-2xl border-border/50">
          {/* Report Title Section */}
          <div className="space-y-3 mb-6 pb-6 border-b border-border/50">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                Report Title
              </label>
              <DatePicker
                date={reportDate}
                onDateChange={setReportDate}
                data-testid="report-date-display"
              />
            </div>
            <Input
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              placeholder="Give your report a title..."
              className="text-lg font-medium"
            />
          </div>

          {/* Session Import Section - shows session context and current mood picker */}
          <SessionImportSection
            sessionData={sessionData}
            postSessionMood={postSessionMood}
            onPostSessionMoodChange={setPostSessionMood}
          />

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
            <div className="mt-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {submitError}
            </div>
          )}

          <div className="flex gap-3 mt-8 pt-6 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-12 rounded-xl transition-all hover:bg-muted"
              disabled={isSubmitting}
              onClick={() => handleSubmit(true)}
              data-testid="field-report-save-draft"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : null}
              {isEditMode ? "Save as Draft" : "Save Draft"}
            </Button>
            <Button
              type="submit"
              className="flex-1 h-12 rounded-xl transition-all"
              disabled={isSubmitting || !isValid}
              data-testid="field-report-submit"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <Check className="size-4 mr-2" />
              )}
              {isEditMode ? "Update Report" : "Submit Report"}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  )
}
