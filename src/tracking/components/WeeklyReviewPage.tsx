"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useHistoryBarrier } from "@/src/shared/HistoryBarrierContext"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Footprints,
  TrendingUp,
  Flame,
  Check,
  X,
  FileText,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Lightbulb,
  Trophy,
  AlertTriangle,
  Save,
  Zap,
  Target,
  Brain,
  SlidersHorizontal,
  ClipboardCheck,
  Sun,
  Heart,
} from "lucide-react"
import Link from "next/link"
import type {
  ReviewTemplateRow,
  TemplateField,
  UserTrackingStatsRow,
} from "@/src/db/trackingTypes"
import type { GoalWithProgress } from "@/src/db/goalTypes"
import { FieldRenderer } from "./FieldRenderer"
import { GoalsSummarySection } from "./GoalsSummarySection"
import { FieldPickerPanel, createCustomTextField } from "./FieldPickerPanel"
import type { FieldDefinition, FieldCategory, DailyWeekSummary } from "../types"
import { CATEGORY_INFO, FIELD_LIBRARY } from "../config"

// Template icon mapping: slug → lucide icon + color tint
type IconComponent = typeof Zap
const REVIEW_TEMPLATE_ICONS: Record<string, { icon: IconComponent; bg: string; text: string }> = {
  "quick-win": { icon: Zap, bg: "bg-amber-500/10", text: "text-amber-500" },
  "operator": { icon: Target, bg: "bg-blue-500/10", text: "text-blue-500" },
  "deep-thinker": { icon: Brain, bg: "bg-purple-500/10", text: "text-purple-500" },
  "scaling-weekly": { icon: SlidersHorizontal, bg: "bg-green-500/10", text: "text-green-500" },
  "six-phase": { icon: ClipboardCheck, bg: "bg-indigo-500/10", text: "text-indigo-500" },
}
const DEFAULT_TEMPLATE_ICON = { icon: FileText, bg: "bg-primary/10", text: "text-primary" }

function getTemplateIcon(slug?: string | null) {
  return (slug && REVIEW_TEMPLATE_ICONS[slug]) || DEFAULT_TEMPLATE_ICON
}

// Category color mapping for field grouping section headers
const CATEGORY_COLORS: Record<string, string> = {
  quick_capture: "text-amber-500",
  emotional: "text-pink-500",
  analysis: "text-indigo-500",
  action: "text-green-500",
  skill: "text-orange-500",
  context: "text-slate-400",
  cognitive: "text-violet-500",
}

interface WeeklyReviewPageProps {
  userId: string
}

interface WeeklyStatsData {
  approaches: number
  sessions: number
  numbers: number
  instadates: number
  fieldReports: number
  weekStart: string
  weekEnd: string
}

const WEEKLY_REVIEW_PRINCIPLES = [
  {
    title: "Data First, Feeling Second",
    description: "Start with objective data, then reflect. Your remembering self distorts via peak-end rule and negativity bias.",
  },
  {
    title: "Clear → Current → Creative",
    description: "Brain dump first (clear), review what happened (current), then brainstorm and set intentions (creative).",
  },
  {
    title: "Appreciate Before Analyzing",
    description: "Counter negativity bias by celebrating wins before examining problems. 'What went well?' comes first.",
  },
  {
    title: "Decide, Don't Do",
    description: "Weekly review is for deciding what work to do, not doing the work. Keep it strategic.",
  },
  {
    title: "Compare to 4-Week Average",
    description: "Compare to rolling average, not just last week. Prevents overreaction to single-week anomalies.",
  },
  {
    title: "Track Inputs, Not Just Outcomes",
    description: "'Did I do what I committed to?' matters more than results. Good process → good outcomes over time.",
  },
]

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- userId reserved for save functionality
export function WeeklyReviewPage({ userId }: WeeklyReviewPageProps) {
  const router = useRouter()
  const [templates, setTemplates] = useState<ReviewTemplateRow[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<ReviewTemplateRow | null>(null)

  // Browser back: return to template selection instead of leaving page
  const handleBarrierBack = useCallback(() => {
    setSelectedTemplate(null)
    setFormValues({})
    setSubmitError(null)
  }, [])
  useHistoryBarrier(selectedTemplate !== null, handleBarrierBack)
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStatsData | null>(null)
  const [previousCommitment, setPreviousCommitment] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [formValues, setFormValues] = useState<Record<string, unknown>>({})
  const [commitmentFulfilled, setCommitmentFulfilled] = useState<boolean | null>(null)
  const [newCommitment, setNewCommitment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showPrinciples, setShowPrinciples] = useState(false)
  const [completedGoals, setCompletedGoals] = useState<GoalWithProgress[]>([])
  const [approachingMilestones, setApproachingMilestones] = useState<GoalWithProgress[]>([])
  const [dailySummary, setDailySummary] = useState<DailyWeekSummary | null>(null)

  // Extra fields added via field picker
  const [extraFields, setExtraFields] = useState<TemplateField[]>([])
  const [saveTemplateName, setSaveTemplateName] = useState("")
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)
  const [templateSaved, setTemplateSaved] = useState(false)

  // Calculate current week boundaries
  const getWeekBoundaries = () => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)) // Monday
    startOfWeek.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6) // Sunday
    endOfWeek.setHours(23, 59, 59, 999)

    return { startOfWeek, endOfWeek }
  }

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { startOfWeek, endOfWeek } = getWeekBoundaries()
      const [templatesRes, statsRes, commitmentRes, goalsRes, dailySummaryRes] = await Promise.all([
        fetch("/api/tracking/templates/review?type=weekly"),
        fetch("/api/tracking/stats"),
        fetch("/api/tracking/review/commitment"),
        fetch("/api/goals"),
        fetch(`/api/tracking/review/daily/summary?start=${startOfWeek.toISOString()}&end=${endOfWeek.toISOString()}`),
      ])

      if (templatesRes.ok) {
        const data = await templatesRes.json()
        setTemplates(data)
      }

      if (statsRes.ok) {
        const stats: UserTrackingStatsRow = await statsRes.json()

        // Use current week stats from the tracking stats
        setWeeklyStats({
          approaches: stats.current_week_approaches || 0,
          sessions: stats.current_week_sessions || 0,
          numbers: stats.current_week_numbers || 0,
          instadates: stats.current_week_instadates || 0,
          fieldReports: stats.current_week_field_reports || 0,
          weekStart: startOfWeek.toISOString(),
          weekEnd: endOfWeek.toISOString(),
        })
      }

      if (commitmentRes.ok) {
        const data = await commitmentRes.json()
        setPreviousCommitment(data.commitment)
      }

      if (dailySummaryRes.ok) {
        const summary: DailyWeekSummary = await dailySummaryRes.json()
        setDailySummary(summary)
      }

      // Process goals for celebration + approaching milestones
      if (goalsRes.ok) {
        const goalsData = await goalsRes.json()
        const allGoals: GoalWithProgress[] = Array.isArray(goalsData) ? goalsData : []
        const activeGoals = allGoals.filter((g) => g.is_active && !g.is_archived)

        // Goals completed this week
        setCompletedGoals(activeGoals.filter((g) => g.is_complete))

        // Milestone goals approaching deadline (within 30 days)
        setApproachingMilestones(
          activeGoals
            .filter(
              (g) =>
                g.goal_type === "milestone" &&
                !g.is_complete &&
                g.days_remaining !== null &&
                g.days_remaining > 0 &&
                g.days_remaining <= 30
            )
            .sort((a, b) => (a.days_remaining ?? 0) - (b.days_remaining ?? 0))
        )
      }
    } catch (error) {
      console.error("Failed to load data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Get all fields to render
  const fieldsToRender = useMemo((): TemplateField[] => {
    if (!selectedTemplate) return []

    const staticFields = selectedTemplate.static_fields || []
    const dynamicFields = selectedTemplate.dynamic_fields || []
    const activeIds = selectedTemplate.active_dynamic_fields || []

    const activeDynamic = dynamicFields.filter((f) => activeIds.includes(f.id))

    return [...staticFields, ...activeDynamic]
  }, [selectedTemplate])

  // Group fields by category for section headers
  const groupedFields = useMemo(() => {
    if (fieldsToRender.length === 0) return []

    // Build lookup from FIELD_LIBRARY
    const fieldCategoryMap = new Map<string, FieldCategory>()
    for (const f of FIELD_LIBRARY) {
      fieldCategoryMap.set(f.id, f.category)
    }

    // Group fields maintaining original order
    const groups: { category: FieldCategory | "other"; fields: TemplateField[] }[] = []
    let currentCat: FieldCategory | "other" | null = null

    for (const field of fieldsToRender) {
      const cat = fieldCategoryMap.get(field.id) || "other"
      if (cat !== currentCat) {
        groups.push({ category: cat, fields: [field] })
        currentCat = cat
      } else {
        groups[groups.length - 1].fields.push(field)
      }
    }

    return groups
  }, [fieldsToRender])

  // Check if reflection fields have content (for commitment soft-unlock)
  const hasReflectionContent = useMemo(() => {
    return fieldsToRender.some((f) => {
      const val = formValues[f.id]
      if (typeof val === "string") return val.trim().length > 0
      if (typeof val === "number") return true
      if (Array.isArray(val)) return val.length > 0
      return !!val
    })
  }, [fieldsToRender, formValues])

  const handleFieldChange = (fieldId: string, value: unknown) => {
    setFormValues((prev) => ({ ...prev, [fieldId]: value }))
  }

  const handleSubmit = async (isDraft: boolean) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const { startOfWeek, endOfWeek } = getWeekBoundaries()

      // For system templates, don't send template_id (DB column is UUID)
      // Store the template slug in fields for reference
      const isSystemTemplate = selectedTemplate?.id?.startsWith("system-")
      const fieldsWithTemplate = isSystemTemplate
        ? { ...formValues, _template_slug: selectedTemplate?.slug }
        : formValues

      const response = await fetch("/api/tracking/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          review_type: "weekly",
          template_id: isSystemTemplate ? null : selectedTemplate?.id,
          fields: fieldsWithTemplate,
          period_start: startOfWeek.toISOString(),
          period_end: endOfWeek.toISOString(),
          previous_commitment: previousCommitment,
          commitment_fulfilled: commitmentFulfilled,
          new_commitment: newCommitment || undefined,
          is_draft: isDraft,
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" data-testid="weekly-review-loading">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  // Template selection view
  if (!selectedTemplate) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8" data-testid="weekly-review-page">
        <div className="mb-8">
          <Link
            href="/dashboard/tracking"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="size-4" />
            Back to Tracking
          </Link>
          <h1 className="text-3xl font-bold">Weekly Review</h1>
          <p className="text-muted-foreground mt-2">
            Reflect on your week and set intentions for the next one
          </p>
        </div>

        {/* Review Principles */}
        <Card className="mb-8 overflow-hidden">
          <button
            onClick={() => setShowPrinciples(!showPrinciples)}
            className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            data-testid="principles-toggle"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Lightbulb className="size-5 text-amber-500" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">6 Principles for a Useful Review</h3>
                <p className="text-sm text-muted-foreground">Research-backed tips</p>
              </div>
            </div>
            {showPrinciples ? (
              <ChevronUp className="size-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-5 text-muted-foreground" />
            )}
          </button>
          {showPrinciples && (
            <div className="px-4 pb-4 border-t">
              <div className="grid gap-3 mt-4">
                {WEEKLY_REVIEW_PRINCIPLES.map((principle, idx) => (
                  <div key={idx} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="font-medium text-sm">{principle.title}</h4>
                      <p className="text-sm text-muted-foreground">{principle.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Weekly Stats Summary */}
        {weeklyStats && (
          <Card className="p-4 sm:p-6 mb-8 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20" data-testid="weekly-stats-card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-semibold text-lg">This Week&apos;s Progress</h2>
                <p className="text-sm text-muted-foreground">
                  {new Date(weeklyStats.weekStart).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  -{" "}
                  {new Date(weeklyStats.weekEnd).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                <Footprints className="size-5 text-primary" />
                <div>
                  <div className="text-2xl font-bold">{weeklyStats.approaches}</div>
                  <div className="text-xs text-muted-foreground">Approaches</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                <Calendar className="size-5 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold">{weeklyStats.sessions}</div>
                  <div className="text-xs text-muted-foreground">Sessions</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                <TrendingUp className="size-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{weeklyStats.numbers}</div>
                  <div className="text-xs text-muted-foreground">Numbers</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                <Flame className="size-5 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold">{weeklyStats.instadates}</div>
                  <div className="text-xs text-muted-foreground">Instadates</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                <FileText className="size-5 text-cyan-500" />
                <div>
                  <div className="text-2xl font-bold">{weeklyStats.fieldReports}</div>
                  <div className="text-xs text-muted-foreground">Field Reports</div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Daily Reflections Summary */}
        {dailySummary && dailySummary.count > 0 && (
          <Card className="p-4 sm:p-6 mb-8 border-amber-500/20 bg-amber-500/5" data-testid="daily-summary-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Sun className="size-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold">Daily Reflections This Week</h3>
                <p className="text-sm text-muted-foreground">
                  {dailySummary.count} {dailySummary.count === 1 ? "reflection" : "reflections"} completed
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Averages row */}
              <div className="flex flex-wrap gap-4 text-sm">
                {dailySummary.avgEnergy !== null && (
                  <span>Energy: <strong>{dailySummary.avgEnergy}</strong>/5</span>
                )}
                {dailySummary.avgDayRating !== null && (
                  <span>Day rating: <strong>{dailySummary.avgDayRating}</strong>/5</span>
                )}
                {dailySummary.avgProcessRating !== null && (
                  <span>Process: <strong>{dailySummary.avgProcessRating}</strong>/5</span>
                )}
              </div>

              {/* Process-outcome insight */}
              {dailySummary.processOutcomeGap !== null && Math.abs(dailySummary.processOutcomeGap) > 1.0 && (
                <p className="text-sm italic text-muted-foreground">
                  {dailySummary.processOutcomeGap > 1.0
                    ? "Your effort was stronger than your outcomes suggest. Trust the process."
                    : "Outcomes outpaced your effort this week. Enjoy wins, keep investing in process."}
                </p>
              )}

              {/* Values alignment */}
              {(dailySummary.valuesAlignment.toward > 0 || dailySummary.valuesAlignment.neutral > 0 || dailySummary.valuesAlignment.away > 0) && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Values:</span>
                  {dailySummary.valuesAlignment.toward > 0 && (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600 text-xs">
                      {dailySummary.valuesAlignment.toward} toward
                    </Badge>
                  )}
                  {dailySummary.valuesAlignment.neutral > 0 && (
                    <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 text-xs">
                      {dailySummary.valuesAlignment.neutral} neutral
                    </Badge>
                  )}
                  {dailySummary.valuesAlignment.away > 0 && (
                    <Badge variant="secondary" className="bg-red-400/10 text-red-500 text-xs">
                      {dailySummary.valuesAlignment.away} away
                    </Badge>
                  )}
                </div>
              )}

              {/* Blockers */}
              {dailySummary.blockers.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Blockers you named this week</h4>
                  <ul className="space-y-1">
                    {dailySummary.blockers.map((b, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-muted-foreground/50 mt-0.5">•</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Low days empathy */}
              {dailySummary.lowDays > 0 && (
                <div className="flex items-start gap-2 text-sm p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
                  <Heart className="size-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/80">
                    {dailySummary.lowDays === 1
                      ? "You had a tough day this week and still showed up. That counts."
                      : `${dailySummary.lowDays} tough days this week — and you reflected through all of them. Real strength.`}
                  </span>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Goals Summary — enhanced with life areas, milestones, grouping */}
        <GoalsSummarySection groupByLifeArea showMilestones />

        {/* Celebration Section for Completed Goals */}
        {completedGoals.length > 0 && (
          <Card className="p-4 sm:p-6 mb-8 border-green-500/30 bg-green-500/5">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Trophy className="size-5 text-green-500" />
              Goals Completed This Week
            </h3>
            <div className="space-y-2">
              {completedGoals.map((goal) => (
                <div key={goal.id} className="flex items-center gap-2 text-sm">
                  <Check className="size-4 text-green-500 flex-shrink-0" />
                  <span className="font-medium">{goal.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {goal.current_value}/{goal.target_value}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-sm text-green-600 dark:text-green-400 mt-3 font-medium">
              {completedGoals.length === 1
                ? "Great work hitting this goal!"
                : `Amazing — ${completedGoals.length} goals crushed!`}
            </p>
          </Card>
        )}

        {/* Approaching Milestones Warning */}
        {approachingMilestones.length > 0 && (
          <Card className="p-4 sm:p-6 mb-8 border-amber-500/30 bg-amber-500/5">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              Milestones Approaching Deadline
            </h3>
            <div className="space-y-2">
              {approachingMilestones.map((goal) => (
                <div key={goal.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-amber-500 flex-shrink-0" />
                    <span className="font-medium">{goal.title}</span>
                  </div>
                  <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600">
                    {goal.days_remaining}d left • {goal.progress_percentage}%
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Previous Commitment */}
        {previousCommitment && (
          <Card className="p-4 sm:p-6 mb-8 border-yellow-500/30 bg-yellow-500/5">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <FileText className="size-5 text-yellow-500" />
              </div>
              Your Previous Commitment
            </h3>
            <p className="text-lg text-foreground italic leading-relaxed">&quot;{previousCommitment}&quot;</p>
          </Card>
        )}

        {/* Template Selection */}
        <h2 className="font-semibold text-lg mb-4">Choose a Review Template</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {templates.length > 0 ? (
            templates.map((template) => {
              const ti = getTemplateIcon(template.slug)
              const TemplateIcon = ti.icon
              const fieldCount = template.static_fields.length + (template.active_dynamic_fields?.length || 0)
              return (
                <Card
                  key={template.id}
                  className="p-4 sm:p-6 cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setSelectedTemplate(template)}
                  data-testid={`weekly-template-${template.slug || template.id}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${ti.bg} ${ti.text}`}>
                      <TemplateIcon className="size-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{template.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {template.description}
                      </p>
                      <div className="flex items-center gap-2 mt-3">
                        <Badge variant="secondary">
                          ~{template.estimated_minutes} min
                        </Badge>
                        <Badge variant="outline">
                          {fieldCount} {fieldCount === 1 ? "field" : "fields"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })
          ) : (
            <Card className="p-4 sm:p-6 col-span-2 text-center text-muted-foreground">
              <FileText className="size-12 mx-auto mb-3 opacity-30" />
              <p>No review templates available</p>
              <p className="text-sm">Templates will appear here once configured</p>
            </Card>
          )}
        </div>
      </div>
    )
  }

  // Review form view
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => {
            setSelectedTemplate(null)
            setFormValues({})
            setSubmitError(null)
          }}
          className="gap-2 text-muted-foreground hover:text-foreground mb-4 -ml-2"
          data-testid="weekly-review-back"
        >
          <ArrowLeft className="size-4" />
          Choose Different Template
        </Button>
        <h1 className="text-3xl font-bold">{selectedTemplate.name}</h1>
        <p className="text-muted-foreground mt-2">{selectedTemplate.description}</p>
      </div>

      {/* Week stats mini-card */}
      {weeklyStats && (
        <Card className="p-4 mb-6 bg-muted/50">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {weeklyStats.approaches} approaches • {weeklyStats.sessions} sessions
            </span>
            <span className="text-muted-foreground">
              {new Date(weeklyStats.weekStart).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}{" "}
              -{" "}
              {new Date(weeklyStats.weekEnd).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </Card>
      )}

      {/* Goals summary compact */}
      <GoalsSummarySection compact />

      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(false) }} data-testid="weekly-review-form">
        <Card className="p-4 sm:p-6">
          {/* Previous Commitment Check */}
          {previousCommitment && (
            <div className="mb-8 p-4 rounded-lg border bg-muted/30">
              <Label className="text-base font-semibold">
                Did you fulfill your commitment?
              </Label>
              <p className="text-sm text-muted-foreground mt-1 mb-4 italic">
                &quot;{previousCommitment}&quot;
              </p>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={commitmentFulfilled === true ? "default" : "outline"}
                  className="flex-1 gap-2"
                  onClick={() => setCommitmentFulfilled(true)}
                >
                  <Check className="size-4" />
                  Yes
                </Button>
                <Button
                  type="button"
                  variant={commitmentFulfilled === false ? "default" : "outline"}
                  className="flex-1 gap-2"
                  onClick={() => setCommitmentFulfilled(false)}
                >
                  <X className="size-4" />
                  No
                </Button>
              </div>
            </div>
          )}

          {/* Template Fields — grouped by category with section headers */}
          <div className="space-y-6">
            {groupedFields.map((group, gi) => (
              <div key={`group-${gi}`}>
                {/* Section header (skip for "other" or single-group templates) */}
                {group.category !== "other" && groupedFields.length > 1 && CATEGORY_INFO[group.category as FieldCategory] && (
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full mb-4 mt-2"
                    onClick={() => {}} // Non-collapsible, just visual grouping
                  >
                    <ChevronRight className={`size-3 ${CATEGORY_COLORS[group.category] || "text-muted-foreground"}`} />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {CATEGORY_INFO[group.category as FieldCategory]?.label}
                    </span>
                    <div className="flex-1 border-t border-border/50" />
                  </button>
                )}
                <div className="space-y-6">
                  {group.fields.map((field) => {
                    // Textarea fields get elevated card treatment
                    const isTextarea = field.type === "textarea"
                    return isTextarea ? (
                      <div key={field.id} className="bg-muted/20 rounded-xl p-4">
                        <FieldRenderer
                          field={field}
                          value={formValues[field.id]}
                          onChange={(value) => handleFieldChange(field.id, value)}
                        />
                      </div>
                    ) : (
                      <FieldRenderer
                        key={field.id}
                        field={field}
                        value={formValues[field.id]}
                        onChange={(value) => handleFieldChange(field.id, value)}
                      />
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Extra fields added via field picker */}
            {extraFields.map((field) => (
              <div key={field.id} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setExtraFields(extraFields.filter(f => f.id !== field.id))
                    setFormValues(prev => {
                      const next = { ...prev }
                      delete next[field.id]
                      return next
                    })
                  }}
                  className="absolute -top-2 -right-2 z-10 p-1 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                  aria-label={`Remove ${field.label}`}
                >
                  <X className="size-3" />
                </button>
                <FieldRenderer
                  field={field}
                  value={formValues[field.id]}
                  onChange={(value) => handleFieldChange(field.id, value)}
                />
              </div>
            ))}
          </div>

          {/* Field picker for adding extra fields */}
          <div className="mt-6">
            <FieldPickerPanel
              excludeFieldIds={new Set([
                ...fieldsToRender.map(f => f.id),
                ...extraFields.map(f => f.id),
              ])}
              onAddField={(field: FieldDefinition) => {
                const templateField: TemplateField = {
                  id: field.id,
                  type: field.type,
                  label: field.label,
                  placeholder: field.placeholder,
                  required: field.required,
                  options: field.options,
                  min: field.min,
                  max: field.max,
                  rows: field.rows,
                }
                setExtraFields(prev => [...prev, templateField])
              }}
              onAddCustomField={(label: string) => {
                const field = createCustomTextField(label)
                setExtraFields(prev => [...prev, field])
              }}
              compact
            />
          </div>

          {/* Save as custom review template (when extra fields added) */}
          {extraFields.length > 0 && !templateSaved && (
            <div className="mt-6 p-4 rounded-xl border border-primary/20 bg-primary/5">
              <div className="flex items-center gap-2 mb-2">
                <Save className="size-4 text-primary" />
                <span className="text-sm font-semibold">Save as custom review template?</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Save this field combination as a reusable review template.
              </p>
              <div className="flex gap-2">
                <Input
                  value={saveTemplateName}
                  onChange={(e) => setSaveTemplateName(e.target.value)}
                  placeholder={`${selectedTemplate?.name || "Review"} + custom`}
                  className="flex-1 text-sm"
                  data-testid="save-review-template-name-input"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={isSavingTemplate}
                  onClick={async () => {
                    setIsSavingTemplate(true)
                    try {
                      const allFields = [...fieldsToRender, ...extraFields].map(f => ({
                        id: f.id,
                        label: f.label,
                        type: f.type,
                        placeholder: f.placeholder,
                        required: f.required,
                        options: f.options,
                        min: f.min,
                        max: f.max,
                        rows: f.rows,
                      }))
                      const res = await fetch("/api/tracking/templates/review", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          name: saveTemplateName.trim() || `${selectedTemplate?.name || "Review"} + custom`,
                          review_type: "weekly",
                          fields: allFields,
                        }),
                      })
                      if (res.ok) {
                        setTemplateSaved(true)
                      }
                    } finally {
                      setIsSavingTemplate(false)
                    }
                  }}
                  data-testid="save-as-review-template-btn"
                >
                  {isSavingTemplate ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Save Template"
                  )}
                </Button>
              </div>
            </div>
          )}
          {templateSaved && (
            <div className="mt-6 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 text-sm flex items-center gap-2">
              <Check className="size-4" />
              Template saved! It will appear in your review template picker next time.
            </div>
          )}

          {/* New Commitment — soft unlock: muted until reflection fields have content */}
          <Card className={`mt-8 p-5 border-primary/20 bg-primary/5 transition-all duration-500 ${
            hasReflectionContent ? "opacity-100 border-primary/30" : "opacity-60"
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <ArrowRight className="size-4 text-primary" />
              <Label htmlFor="new-commitment" className="text-base font-semibold">
                What&apos;s your commitment for next week?
              </Label>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Set one specific, achievable goal
            </p>
            <Input
              id="new-commitment"
              placeholder="e.g., Do at least 5 approaches on 2 separate days"
              value={newCommitment}
              onChange={(e) => setNewCommitment(e.target.value)}
            />
          </Card>

          {submitError && (
            <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {submitError}
            </div>
          )}

          {/* Spacer for sticky footer */}
          <div className="h-20" />
        </Card>
      </form>

      {/* Sticky footer submit buttons */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-safe">
        <div className="max-w-2xl mx-auto px-4 py-3 flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={isSubmitting}
            onClick={() => handleSubmit(true)}
            data-testid="weekly-review-save-draft"
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
            Save Draft
          </Button>
          <Button className="flex-1" disabled={isSubmitting} onClick={() => handleSubmit(false)} data-testid="weekly-review-submit">
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <Check className="size-4 mr-2" />
            )}
            Submit Review
          </Button>
        </div>
      </div>
    </div>
  )
}
