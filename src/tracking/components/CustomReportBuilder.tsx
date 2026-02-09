"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  Plus,
  X,
  Check,
  Settings2,
  Save,
  Loader2,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  TrendingUp,
  FileText,
  LayoutTemplate,
} from "lucide-react"

import type { FieldDefinition, FieldCategory, SessionSummaryData } from "@/src/tracking/types"
import { FIELD_LIBRARY, CATEGORY_INFO, SESSION_IMPORT_FIELD_IDS } from "@/src/tracking/config"
import { TEMPLATE_COLORS } from "@/src/tracking/data/templates"
import { CATEGORY_ICONS } from "@/src/tracking/components/templateIcons"
import { SessionImportSection } from "./SessionImportSection"
import { DatePicker } from "./DatePicker"

interface CustomReportBuilderProps {
  sessionData?: SessionSummaryData | null
  onBack: () => void
  onSaved: () => void
}

// Mode for the builder
type BuilderMode = "select" | "template-only" | "report"

// A filled field with its value (for report mode)
interface FilledField {
  field: FieldDefinition
  value: unknown
}

// A selected field without value (for template-only mode)
interface SelectedField {
  field: FieldDefinition
}

// Category color classes (can't use dynamic Tailwind classes)
const CATEGORY_COLORS_MAP: Record<FieldCategory, { border: string; bg: string; dot: string; text: string }> = {
  quick_capture: {
    border: "border-amber-500/30 hover:border-amber-500",
    bg: "hover:bg-amber-500/10",
    dot: "bg-amber-500",
    text: "text-amber-600 border-amber-500/50",
  },
  emotional: {
    border: "border-pink-500/30 hover:border-pink-500",
    bg: "hover:bg-pink-500/10",
    dot: "bg-pink-500",
    text: "text-pink-600 border-pink-500/50",
  },
  analysis: {
    border: "border-indigo-500/30 hover:border-indigo-500",
    bg: "hover:bg-indigo-500/10",
    dot: "bg-indigo-500",
    text: "text-indigo-600 border-indigo-500/50",
  },
  action: {
    border: "border-green-500/30 hover:border-green-500",
    bg: "hover:bg-green-500/10",
    dot: "bg-green-500",
    text: "text-green-600 border-green-500/50",
  },
  skill: {
    border: "border-orange-500/30 hover:border-orange-500",
    bg: "hover:bg-orange-500/10",
    dot: "bg-orange-500",
    text: "text-orange-600 border-orange-500/50",
  },
  context: {
    border: "border-slate-500/30 hover:border-slate-500",
    bg: "hover:bg-slate-500/10",
    dot: "bg-slate-500",
    text: "text-slate-600 border-slate-500/50",
  },
  cognitive: {
    border: "border-violet-500/30 hover:border-violet-500",
    bg: "hover:bg-violet-500/10",
    dot: "bg-violet-500",
    text: "text-violet-600 border-violet-500/50",
  },
}

export function CustomReportBuilder({ sessionData, onBack, onSaved }: CustomReportBuilderProps) {
  // Builder mode: select (initial), template-only, or report
  const [mode, setMode] = useState<BuilderMode>("select")

  // Template name (used in both modes)
  const [templateName, setTemplateName] = useState("")

  // Main free-text field (always present in report mode)
  const [mainFieldTitle, setMainFieldTitle] = useState("")
  const [mainFieldValue, setMainFieldValue] = useState("")

  // Additional fields that user has added and filled (report mode)
  const [filledFields, setFilledFields] = useState<FilledField[]>([])

  // Selected fields without values (template-only mode)
  const [selectedFields, setSelectedFields] = useState<SelectedField[]>([])

  // Field being actively edited (expanded)
  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null)
  const [pendingFieldValue, setPendingFieldValue] = useState<unknown>(null)

  // Category filter for field picker
  const [activeCategory, setActiveCategory] = useState<FieldCategory | "all">("all")
  const [showFieldPicker, setShowFieldPicker] = useState(true)

  // Report date (separate from title) - defaults to today
  const [reportDate, setReportDate] = useState<Date>(new Date())

  // Post-session mood (from SessionImportSection)
  const [postSessionMood, setPostSessionMood] = useState<number | null>(null)

  // Save state
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaved, setIsSaved] = useState(false)

  // Available fields (exclude already filled/selected ones based on mode)
  const availableFields = useMemo(() => {
    const usedIds = mode === "template-only"
      ? new Set(selectedFields.map(f => f.field.id))
      : new Set(filledFields.map(f => f.field.id))
    let fields = FIELD_LIBRARY.filter(f => !usedIds.has(f.id))

    if (activeCategory !== "all") {
      fields = fields.filter(f => f.category === activeCategory)
    }

    return fields
  }, [filledFields, selectedFields, activeCategory, mode])

  // Click a field from the picker to start filling it (report mode)
  const startFillingField = (field: FieldDefinition) => {
    setExpandedFieldId(field.id)
    setPendingFieldValue(getDefaultValue(field))
    setShowFieldPicker(false)
  }

  // Add a field to template (template-only mode - no value needed)
  const addFieldToTemplate = (field: FieldDefinition) => {
    setSelectedFields([...selectedFields, { field }])
  }

  // Remove a field from template (template-only mode)
  const removeFieldFromTemplate = (fieldId: string) => {
    setSelectedFields(selectedFields.filter(f => f.field.id !== fieldId))
  }

  // Get default value for a field type
  const getDefaultValue = (field: FieldDefinition): unknown => {
    switch (field.type) {
      case "number": return field.min || 0
      case "scale": return field.min || 5
      case "multiselect": return []
      default: return ""
    }
  }

  // Confirm adding the field with its value
  const confirmField = (field: FieldDefinition) => {
    if (pendingFieldValue === null || pendingFieldValue === "" ||
        (Array.isArray(pendingFieldValue) && pendingFieldValue.length === 0)) {
      // Don't add empty fields
      setExpandedFieldId(null)
      setPendingFieldValue(null)
      return
    }

    setFilledFields([...filledFields, { field, value: pendingFieldValue }])
    setExpandedFieldId(null)
    setPendingFieldValue(null)
  }

  // Cancel adding a field
  const cancelField = () => {
    setExpandedFieldId(null)
    setPendingFieldValue(null)
  }

  // Remove a filled field
  const removeFilledField = (fieldId: string) => {
    setFilledFields(filledFields.filter(f => f.field.id !== fieldId))
  }

  // Update value of a filled field
  const updateFilledField = (fieldId: string, value: unknown) => {
    setFilledFields(filledFields.map(f =>
      f.field.id === fieldId ? { ...f, value } : f
    ))
  }

  // Get the field being expanded (from library)
  const expandedField = expandedFieldId
    ? FIELD_LIBRARY.find(f => f.id === expandedFieldId)
    : null

  // Save template only (template-only mode)
  const saveTemplateOnly = async () => {
    if (!templateName.trim() && selectedFields.length === 0) return

    setIsSaving(true)
    setSaveError(null)

    // Build fields array for template (structure only, matching TemplateField interface)
    const templateFields = selectedFields.map(f => ({
      id: f.field.id,
      label: f.field.label,
      type: f.field.type,
      placeholder: f.field.placeholder,
      required: f.field.required,
      options: f.field.options,
      min: f.field.min,
      max: f.field.max,
      rows: f.field.rows,
    }))

    try {
      const response = await fetch("/api/tracking/templates/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName || "Custom Template",
          fields: templateFields,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save template")
      }

      setIsSaved(true)
      onSaved()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save")
    } finally {
      setIsSaving(false)
    }
  }

  // Save template AND report (report mode)
  const saveTemplateAndReport = async () => {
    if (!mainFieldValue.trim() && filledFields.length === 0) return

    setIsSaving(true)
    setSaveError(null)

    // Build fields array for template (structure, matching TemplateField interface)
    const templateFields = filledFields.map(f => ({
      id: f.field.id,
      label: f.field.label,
      type: f.field.type,
      placeholder: f.field.placeholder,
      required: f.field.required,
      options: f.field.options,
      min: f.field.min,
      max: f.field.max,
      rows: f.field.rows,
    }))

    try {
      // Step 1: Save the template
      const templateResponse = await fetch("/api/tracking/templates/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName || mainFieldTitle || "Custom Template",
          fields: templateFields,
        }),
      })

      if (!templateResponse.ok) {
        const data = await templateResponse.json()
        throw new Error(data.error || "Failed to save template")
      }

      const template = await templateResponse.json()

      // Step 2: Create field report with values
      const reportFields: Record<string, unknown> = {}

      // Add main field value
      if (mainFieldValue.trim()) {
        reportFields["main_notes"] = mainFieldValue
      }

      // Add all filled field values
      for (const f of filledFields) {
        reportFields[f.field.id] = f.value
      }

      // Add post-session mood if set
      if (postSessionMood !== null) {
        reportFields[SESSION_IMPORT_FIELD_IDS.POST_SESSION_MOOD] = postSessionMood
      }

      const reportResponse = await fetch("/api/tracking/field-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: template.id,
          title: mainFieldTitle || "Custom Report",
          report_date: reportDate?.toISOString(),
          fields: reportFields,
          is_draft: false,
        }),
      })

      if (!reportResponse.ok) {
        const data = await reportResponse.json()
        throw new Error(data.error || "Failed to save report")
      }

      setIsSaved(true)
      onSaved()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save")
    } finally {
      setIsSaving(false)
    }
  }

  // Main save handler based on mode
  const handleSave = () => {
    if (mode === "template-only") {
      saveTemplateOnly()
    } else {
      saveTemplateAndReport()
    }
  }

  // Render field input based on type
  const renderFieldInput = (
    field: FieldDefinition,
    value: unknown,
    onChange: (v: unknown) => void
  ) => {
    switch (field.type) {
      case "text":
        return (
          <Input
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
          />
        )

      case "textarea":
        return (
          <Textarea
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
            rows={field.rows || 3}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
          />
        )

      case "number":
        return (
          <Input
            type="number"
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            value={(value as number) ?? ""}
            onChange={(e) => onChange(e.target.valueAsNumber)}
            autoFocus
          />
        )

      case "select":
        return (
          <Select
            value={(value as string) || ""}
            onValueChange={onChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case "multiselect":
        return (
          <div className="flex flex-wrap gap-2">
            {field.options?.map((opt) => {
              const selected = ((value as string[]) || []).includes(opt)
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    const current = (value as string[]) || []
                    onChange(selected
                      ? current.filter(v => v !== opt)
                      : [...current, opt]
                    )
                  }}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    selected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input hover:border-primary hover:bg-accent"
                  }`}
                >
                  {selected && <Check className="mr-1 inline size-3" />}
                  {opt}
                </button>
              )
            })}
          </div>
        )

      case "scale":
        const scaleValue = (value as number) || field.min || 1
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={field.min || 1}
                max={field.max || 10}
                value={scaleValue}
                onChange={(e) => onChange(e.target.valueAsNumber)}
                className="flex-1 h-2 bg-muted rounded-full appearance-none cursor-pointer"
              />
              <span className="text-2xl font-bold text-primary min-w-[2ch] text-center">
                {scaleValue}
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{field.min || 1}</span>
              <span>{field.max || 10}</span>
            </div>
          </div>
        )

      default:
        return <Input value={(value as string) || ""} onChange={(e) => onChange(e.target.value)} />
    }
  }

  const colors = TEMPLATE_COLORS["custom"] || {
    bg: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    icon: "bg-emerald-500 text-white",
    gradient: "from-emerald-500/30 via-emerald-500/10 to-teal-500/20",
  }

  // Mode selection screen
  if (mode === "select") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8" data-testid="custom-builder-mode-select">
        {/* Back button */}
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Choose Different Template
        </button>

        {/* Header */}
        <div className="rounded-2xl overflow-hidden mb-8 border border-border/50">
          <div className={`p-6 bg-gradient-to-br ${colors.gradient}`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${colors.icon} shadow-lg`}>
                <Settings2 className="size-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Custom Report Builder</h1>
                <p className="text-muted-foreground text-sm mt-0.5">
                  Create your own field layout
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Mode selection cards */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">What would you like to do?</h2>

          {/* Template Only Option */}
          <button
            onClick={() => setMode("template-only")}
            className="w-full text-left p-6 rounded-2xl border-2 border-border hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group"
            data-testid="mode-template-only"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                <LayoutTemplate className="size-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Create Template Only</h3>
                <p className="text-muted-foreground mt-1">
                  Design a reusable field layout. Save it for future reports without writing content now.
                </p>
              </div>
            </div>
          </button>

          {/* Report + Template Option */}
          <button
            onClick={() => setMode("report")}
            className="w-full text-left p-6 rounded-2xl border-2 border-border hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group"
            data-testid="mode-report"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <FileText className="size-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Write Report Now</h3>
                <p className="text-muted-foreground mt-1">
                  Add fields, fill them out, and save both the template and your report in one go.
                </p>
                {sessionData && (
                  <Badge variant="secondary" className="mt-2 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                    Session data available: {sessionData.approachCount} approaches
                  </Badge>
                )}
              </div>
            </div>
          </button>
        </div>
      </div>
    )
  }

  // Main builder UI (for both template-only and report modes)
  return (
    <div className="max-w-2xl mx-auto px-4 py-8" data-testid={`custom-builder-${mode}`}>
      {/* Back button */}
      <button
        onClick={() => setMode("select")}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Options
      </button>

      {/* Header with gradient */}
      <div className="rounded-2xl overflow-hidden mb-6 border border-border/50">
        <div className={`p-6 bg-gradient-to-br ${colors.gradient}`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${colors.icon} shadow-lg`}>
              {mode === "template-only" ? <LayoutTemplate className="size-6" /> : <Settings2 className="size-6" />}
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {mode === "template-only" ? "Create Template" : "Custom Report"}
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                {mode === "template-only"
                  ? "Design your field layout for future use"
                  : "Your fields, your way"}
              </p>
            </div>
          </div>
        </div>

        {/* Session summary mini-card (only in report mode) */}
        {mode === "report" && sessionData && (
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

      {/* Main content */}
      <div className="space-y-6">
        {/* Template-only mode: just name and field selection */}
        {mode === "template-only" && (
          <Card className="p-6 space-y-5">
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">
                Template Name
              </label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Give your template a name..."
                className="text-lg font-medium"
                data-testid="template-name-input"
              />
              <p className="text-sm text-muted-foreground">
                Choose a descriptive name so you can find it later.
              </p>
            </div>
          </Card>
        )}

        {/* Report mode: full form with title, notes, and values */}
        {mode === "report" && (
          <Card className="p-6 space-y-5">
            {/* Template name (hidden but used for saving) */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">
                Template Name <span className="text-muted-foreground font-normal">(for reuse)</span>
              </label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Name this template for future use..."
                className="text-sm"
                data-testid="template-name-input"
              />
            </div>

            <div className="h-px bg-border" />

            {/* Title section */}
            <div className="space-y-3">
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
                value={mainFieldTitle}
                onChange={(e) => setMainFieldTitle(e.target.value)}
                placeholder="Give your report a title..."
                className="text-lg font-medium"
              />
            </div>

            {/* Divider */}
            <div className="h-px bg-border" />

            {/* Main text area */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">
                Your Notes
              </label>
              <Textarea
                value={mainFieldValue}
                onChange={(e) => setMainFieldValue(e.target.value)}
                placeholder="Write freely about your session, what happened, the conversation, how you felt - or anything else."
                rows={8}
                className="resize-none text-base"
              />
            </div>

            {/* Session Import Section - shows session context and current mood picker */}
            <SessionImportSection
              sessionData={sessionData ?? null}
              postSessionMood={postSessionMood}
              onPostSessionMoodChange={setPostSessionMood}
            />
          </Card>
        )}

        {/* Selected fields (template-only mode - no values) */}
        {mode === "template-only" && selectedFields.map(({ field }) => (
          <Card key={field.id} className="p-4" data-testid={`selected-field-${field.id}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <div className={`size-2 rounded-full ${CATEGORY_COLORS_MAP[field.category].dot}`} />
                  <h3 className="font-medium">{field.label}</h3>
                  <Badge variant="outline" className={`text-xs ${CATEGORY_COLORS_MAP[field.category].text}`}>
                    {field.type}
                  </Badge>
                </div>
                {field.description && (
                  <p className="text-sm text-muted-foreground mt-1 ml-4">{field.description}</p>
                )}
              </div>
              <button
                onClick={() => removeFieldFromTemplate(field.id)}
                className="text-muted-foreground hover:text-destructive transition-colors"
                data-testid={`remove-field-${field.id}`}
              >
                <X className="size-4" />
              </button>
            </div>
          </Card>
        ))}

        {/* Filled fields (report mode - with values) */}
        {mode === "report" && filledFields.map(({ field, value }) => (
          <Card key={field.id} className="p-4" data-testid={`filled-field-${field.id}`}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 className="font-medium">{field.label}</h3>
                {field.description && (
                  <p className="text-sm text-muted-foreground">{field.description}</p>
                )}
              </div>
              <button
                onClick={() => removeFilledField(field.id)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
            {renderFieldInput(field, value, (v) => updateFilledField(field.id, v))}
          </Card>
        ))}

        {/* Field being added (expanded) - only in report mode */}
        {mode === "report" && expandedField && (
          <Card className="p-4 border-primary/50 bg-primary/5">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <h3 className="font-medium">{expandedField.label}</h3>
                {expandedField.description && (
                  <p className="text-sm text-muted-foreground">{expandedField.description}</p>
                )}
              </div>
              <Badge variant="secondary" className="text-xs">
                {CATEGORY_INFO[expandedField.category].label}
              </Badge>
            </div>

            {renderFieldInput(expandedField, pendingFieldValue, setPendingFieldValue)}

            <div className="flex gap-2 mt-4">
              <Button
                size="sm"
                onClick={() => confirmField(expandedField)}
              >
                <Check className="mr-1 size-3" />
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={cancelField}
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {/* Add field button / picker */}
        {(mode === "template-only" || !expandedField) && (
          <div className="space-y-3">
            <button
              onClick={() => setShowFieldPicker(!showFieldPicker)}
              className="w-full py-3 border-2 border-dashed border-muted-foreground/30 rounded-xl text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
            >
              {showFieldPicker ? (
                <><ChevronUp className="size-4" /> Hide fields</>
              ) : (
                <><Plus className="size-4" /> Add a field</>
              )}
            </button>

            {showFieldPicker && (
              <Card className="p-4 space-y-4">
                {/* Category filter */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={activeCategory === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveCategory("all")}
                    className="h-8"
                  >
                    All
                  </Button>
                  {(Object.keys(CATEGORY_INFO) as FieldCategory[]).map(cat => (
                    <Button
                      key={cat}
                      variant={activeCategory === cat ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveCategory(cat)}
                      className="h-8 gap-1.5"
                    >
                      {CATEGORY_ICONS[cat]}
                      <span className="hidden sm:inline">{CATEGORY_INFO[cat].label}</span>
                    </Button>
                  ))}
                </div>

                {/* Field list */}
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {availableFields.map(field => {
                    const fieldColors = CATEGORY_COLORS_MAP[field.category]
                    return (
                      <button
                        key={field.id}
                        onClick={() => mode === "template-only" ? addFieldToTemplate(field) : startFillingField(field)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${fieldColors.border} ${fieldColors.bg}`}
                        data-testid={`field-option-${field.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`size-2 rounded-full ${fieldColors.dot}`} />
                            <span className="font-medium">{field.label}</span>
                          </div>
                          <Badge variant="outline" className={`text-xs ${fieldColors.text}`}>
                            {CATEGORY_INFO[field.category].label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 ml-4">{field.description}</p>
                      </button>
                    )
                  })}

                  {availableFields.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      No more fields in this category
                    </p>
                  )}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Error message */}
        {saveError && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {saveError}
          </div>
        )}

        {/* Action buttons */}
        <Card className="p-6 rounded-2xl border-border/50">
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-xl transition-all hover:bg-muted"
              onClick={() => setMode("select")}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 h-12 rounded-xl transition-all"
              onClick={handleSave}
              disabled={isSaving || isSaved || (
                mode === "template-only"
                  ? selectedFields.length === 0
                  : (!mainFieldValue.trim() && filledFields.length === 0)
              )}
              data-testid="save-button"
            >
              {isSaving ? (
                <><Loader2 className="size-4 animate-spin mr-2" /> Saving...</>
              ) : isSaved ? (
                <><Check className="size-4 mr-2" /> Saved</>
              ) : mode === "template-only" ? (
                <><Save className="size-4 mr-2" /> Save Template</>
              ) : (
                <><Save className="size-4 mr-2" /> Save Report &amp; Template</>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
