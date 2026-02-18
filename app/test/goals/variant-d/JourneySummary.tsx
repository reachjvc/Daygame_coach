"use client"

import { useMemo } from "react"
import { Check, Star, Trophy, Target, Repeat, Milestone, ArrowLeft, Zap, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import type { GoalTemplate, GoalDisplayCategory } from "@/src/goals/types"

const CATEGORY_LABELS: Record<GoalDisplayCategory, string> = {
  field_work: "Field Work",
  results: "Results",
  dirty_dog: "Dirty Dog",
  texting: "Texting Game",
  dates: "Dating",
  relationship: "Relationship",
}

interface GoalCustomization {
  templateId: string
  title: string
  enabled: boolean
  targetValue: number
  level: number
}

interface JourneySummaryProps {
  selectedL1: GoalTemplate
  goals: GoalCustomization[]
  targetDate: Date | null
  pathColor: string
  allL3Templates: GoalTemplate[]
  onBack: () => void
  onStartOver: () => void
}

export function JourneySummary({
  selectedL1,
  goals,
  targetDate,
  pathColor,
  allL3Templates,
  onBack,
  onStartOver,
}: JourneySummaryProps) {
  const l2Goals = goals.filter((g) => g.level === 2)
  const l3Goals = goals.filter((g) => g.level === 3)

  const l3ByCategory = useMemo(() => {
    const grouped: Record<string, GoalCustomization[]> = {}
    for (const g of l3Goals) {
      const template = allL3Templates.find((t) => t.id === g.templateId)
      const cat = template?.displayCategory || "field_work"
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(g)
    }
    return grouped as Partial<Record<GoalDisplayCategory, GoalCustomization[]>>
  }, [l3Goals, allL3Templates])

  const milestoneCount = l3Goals.filter((g) => {
    const tmpl = allL3Templates.find((t) => t.id === g.templateId)
    return tmpl?.templateType === "milestone_ladder"
  }).length

  const habitCount = l3Goals.filter((g) => {
    const tmpl = allL3Templates.find((t) => t.id === g.templateId)
    return tmpl?.templateType === "habit_ramp"
  }).length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
          <ArrowLeft className="size-4" />
          Back to customize
        </button>
      </div>

      {/* Hero summary */}
      <div className="text-center space-y-4 py-6">
        <div
          className="inline-flex items-center justify-center size-16 rounded-2xl mx-auto"
          style={{ backgroundColor: `${pathColor}15` }}
        >
          <Star className="size-8" style={{ color: pathColor }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Your Journey is Set</h1>
          <p className="text-muted-foreground mt-1 max-w-md mx-auto text-sm">
            You're committing to "{selectedL1.title}" with {goals.length} goals to track your progress.
          </p>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-center gap-6 pt-2">
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: pathColor }}>1</div>
            <div className="text-xs text-muted-foreground">Vision</div>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: pathColor }}>{l2Goals.length}</div>
            <div className="text-xs text-muted-foreground">Achievements</div>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: pathColor }}>{milestoneCount}</div>
            <div className="text-xs text-muted-foreground">Milestones</div>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: pathColor }}>{habitCount}</div>
            <div className="text-xs text-muted-foreground">Habits</div>
          </div>
        </div>

        {targetDate && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/50 bg-muted/20 text-sm">
            <Calendar className="size-4 text-muted-foreground" />
            <span>Target: <span className="font-medium">{format(targetDate, "MMMM d, yyyy")}</span></span>
          </div>
        )}
      </div>

      {/* Goal breakdown */}
      <div className="space-y-4 max-w-xl mx-auto">
        {/* Vision */}
        <div
          className="rounded-xl border-2 p-4 flex items-center gap-3"
          style={{ borderColor: `${pathColor}30`, backgroundColor: `${pathColor}05` }}
        >
          <div className="rounded-lg p-2" style={{ backgroundColor: `${pathColor}15` }}>
            <Star className="size-5" style={{ color: pathColor }} />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Vision</div>
            <div className="font-bold">{selectedL1.title}</div>
          </div>
          <Check className="size-5 ml-auto" style={{ color: pathColor }} />
        </div>

        {/* Achievements */}
        {l2Goals.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Trophy className="size-3.5 text-amber-500" />
              Achievements to Unlock
            </div>
            {l2Goals.map((g) => (
              <div key={g.templateId} className="flex items-center gap-3 rounded-lg border border-border/50 p-3">
                <div className="size-5 rounded-full flex items-center justify-center" style={{ backgroundColor: `${pathColor}15` }}>
                  <Check className="size-3" style={{ color: pathColor }} />
                </div>
                <span className="text-sm font-medium">{g.title}</span>
              </div>
            ))}
          </div>
        )}

        {/* Trackable goals by category */}
        {(Object.entries(l3ByCategory) as [GoalDisplayCategory, GoalCustomization[]][]).map(([cat, catGoals]) => {
          if (!catGoals || catGoals.length === 0) return null
          return (
            <div key={cat} className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Target className="size-3.5" />
                {CATEGORY_LABELS[cat]}
              </div>
              {catGoals.map((g) => {
                const tmpl = allL3Templates.find((t) => t.id === g.templateId)
                const isRamp = tmpl?.templateType === "habit_ramp"
                return (
                  <div key={g.templateId} className="flex items-center gap-3 rounded-lg border border-border/30 bg-muted/10 p-3">
                    <div className="size-5 rounded flex items-center justify-center bg-muted">
                      {isRamp ? <Repeat className="size-3 text-muted-foreground" /> : <Milestone className="size-3 text-muted-foreground" />}
                    </div>
                    <span className="text-sm flex-1">{g.title}</span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {g.targetValue}{isRamp ? "/wk" : ""}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Motivational footer */}
      <div className="text-center space-y-4 py-6 border-t border-border/30">
        <div
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium"
          style={{ backgroundColor: `${pathColor}12`, color: pathColor }}
        >
          <Zap className="size-4" />
          Ready to start tracking
        </div>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          In the real app, this would create all {goals.length} goals and take you to your personalized dashboard. For this prototype, you can start over to try a different path.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" onClick={onStartOver}>
            Start Over
          </Button>
          <Button style={{ backgroundColor: pathColor }} disabled>
            Create {goals.length} Goals (Demo)
          </Button>
        </div>
      </div>
    </div>
  )
}
