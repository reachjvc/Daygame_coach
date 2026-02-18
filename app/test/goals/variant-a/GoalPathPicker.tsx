"use client"

import { useState } from "react"
import { Heart, Flame, Trophy, ChevronRight, Sparkles } from "lucide-react"
import { getCatalogTiers, getChildren } from "@/src/goals/data/goalGraph"
import { LIFE_AREAS } from "@/src/goals/data/lifeAreas"
import type { GoalTemplate, LifeAreaConfig, GoalDisplayCategory } from "@/src/goals/types"

interface GoalPathPickerProps {
  areaId: string
  onSelectGoal: (template: GoalTemplate) => void
  onBack: () => void
}

const CATEGORY_LABELS: Record<GoalDisplayCategory, string> = {
  field_work: "Field Work",
  results: "Results",
  dirty_dog: "Intimate",
  texting: "Texting",
  dates: "Dating",
  relationship: "Relationship",
}

export function GoalPathPicker({ areaId, onSelectGoal, onBack }: GoalPathPickerProps) {
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null)
  const area = LIFE_AREAS.find((a) => a.id === areaId)!
  const tiers = getCatalogTiers()

  if (areaId !== "daygame") {
    return (
      <NonDaygamePicker area={area} onSelectSuggestion={onSelectGoal} onBack={onBack} />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3 transition-colors hover:text-foreground cursor-pointer"
        >
          <ChevronRight className="size-3.5 rotate-180" />
          Change life area
        </button>
        <div className="flex items-center gap-3 mb-1">
          <div className="rounded-lg p-2" style={{ backgroundColor: `${area.hex}15`, color: area.hex }}>
            <area.icon className="size-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Choose Your Path</h2>
            <p className="text-sm text-muted-foreground">
              Pick a major goal. We will build a complete goal tree with milestones and habits.
            </p>
          </div>
        </div>
      </div>

      {/* Two paths side by side */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Find the One Path */}
        <PathSection
          icon={<Heart className="size-4" />}
          title="Find the One"
          subtitle="Relationship-focused goals"
          accentColor="#ec4899"
          goals={tiers.tier1.onePerson}
          expandedGoalId={expandedGoalId}
          onToggleExpand={setExpandedGoalId}
          onSelectGoal={onSelectGoal}
        />

        {/* Abundance Path */}
        <PathSection
          icon={<Flame className="size-4" />}
          title="Abundance"
          subtitle="Volume and variety goals"
          accentColor="#f97316"
          goals={tiers.tier1.abundance}
          expandedGoalId={expandedGoalId}
          onToggleExpand={setExpandedGoalId}
          onSelectGoal={onSelectGoal}
        />
      </div>

      {/* Achievements Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="size-4 text-amber-500" />
          <h3 className="font-semibold">Skill Achievements</h3>
          <span className="text-xs text-muted-foreground">Pick one to start tracking specific skills</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {tiers.tier2.map((tmpl) => {
            const childCount = getChildren(tmpl.id).filter(c => c.level === 3).length
            return (
              <button
                key={tmpl.id}
                onClick={() => onSelectGoal(tmpl)}
                className="flex items-center gap-3 rounded-lg border border-border p-3 text-left transition-all hover:border-amber-500/40 hover:bg-amber-500/5 cursor-pointer group"
                data-testid={`achievement-card-${tmpl.id}`}
              >
                <div className="rounded-lg p-1.5 bg-amber-500/10 text-amber-500 flex-shrink-0">
                  <Trophy className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tmpl.title}</p>
                  <p className="text-xs text-muted-foreground">{childCount} sub-goals</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground group-hover:text-amber-500 transition-colors" />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Path Section (for Find the One / Abundance)
// ============================================================================

function PathSection({
  icon,
  title,
  subtitle,
  accentColor,
  goals,
  expandedGoalId,
  onToggleExpand,
  onSelectGoal,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  accentColor: string
  goals: GoalTemplate[]
  expandedGoalId: string | null
  onToggleExpand: (id: string | null) => void
  onSelectGoal: (template: GoalTemplate) => void
}) {
  return (
    <div
      className="rounded-xl border-2 overflow-hidden"
      style={{ borderColor: `${accentColor}25` }}
    >
      {/* Path header */}
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{ backgroundColor: `${accentColor}08` }}
      >
        <div
          className="rounded-md p-1"
          style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
        >
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-sm" style={{ color: accentColor }}>{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      {/* Goal cards */}
      <div className="p-2 space-y-1">
        {goals.map((tmpl) => {
          const isExpanded = expandedGoalId === tmpl.id
          const children = getChildren(tmpl.id).filter(c => c.level === 2)
          const l3Count = children.reduce((sum, c) => sum + getChildren(c.id).filter(g => g.level === 3).length, 0)

          return (
            <div key={tmpl.id}>
              <button
                onClick={() => onToggleExpand(isExpanded ? null : tmpl.id)}
                className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all cursor-pointer group"
                style={{
                  backgroundColor: isExpanded ? `${accentColor}08` : "transparent",
                  borderLeft: `3px solid ${isExpanded ? accentColor : "transparent"}`,
                }}
                data-testid={`goal-path-${tmpl.id}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{tmpl.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {children.length} achievements, {l3Count} trackable goals
                  </p>
                </div>
                <ChevronRight
                  className="size-4 text-muted-foreground transition-transform"
                  style={{ transform: isExpanded ? "rotate(90deg)" : undefined }}
                />
              </button>

              {/* Expanded preview */}
              {isExpanded && (
                <div className="ml-6 pl-3 mb-2 space-y-2" style={{ borderLeft: `2px solid ${accentColor}20` }}>
                  <p className="text-xs text-muted-foreground py-1">
                    Selecting this goal creates a tree with:
                  </p>
                  {/* Show achievement badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {children.slice(0, 4).map((child) => (
                      <span
                        key={child.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                        style={{ backgroundColor: `${accentColor}10`, color: accentColor }}
                      >
                        <Trophy className="size-2.5" />
                        {child.title}
                      </span>
                    ))}
                    {children.length > 4 && (
                      <span className="text-[11px] text-muted-foreground px-1 py-0.5">
                        +{children.length - 4} more
                      </span>
                    )}
                  </div>

                  {/* CTA */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectGoal(tmpl)
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90 cursor-pointer mt-1"
                    style={{ backgroundColor: accentColor }}
                    data-testid={`select-goal-${tmpl.id}`}
                  >
                    <Sparkles className="size-3.5" />
                    Build this goal tree
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// Non-daygame life areas
// ============================================================================

function NonDaygamePicker({
  area,
  onSelectSuggestion,
  onBack,
}: {
  area: LifeAreaConfig
  onSelectSuggestion: (template: GoalTemplate) => void
  onBack: () => void
}) {
  // For non-daygame areas, show suggestions as cards
  // These don't have full template graphs, so we show them differently
  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3 transition-colors hover:text-foreground cursor-pointer"
        >
          <ChevronRight className="size-3.5 rotate-180" />
          Change life area
        </button>
        <div className="flex items-center gap-3 mb-1">
          <div className="rounded-lg p-2" style={{ backgroundColor: `${area.hex}15`, color: area.hex }}>
            <area.icon className="size-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{area.name}</h2>
            <p className="text-sm text-muted-foreground">
              Quick-start suggestions. Goal trees coming soon for this area.
            </p>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        {area.suggestions.map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors"
            style={{ borderLeftColor: area.hex, borderLeftWidth: 3 }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{s.title}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {s.defaultTarget} / {s.defaultPeriod}
              </p>
            </div>
            {s.featured && (
              <span
                className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded"
                style={{ backgroundColor: `${area.hex}15`, color: area.hex }}
              >
                Popular
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="text-center pt-2">
        <p className="text-sm text-muted-foreground">
          Full goal tree generation is available for Dating & Daygame.
        </p>
        <button
          onClick={onBack}
          className="text-sm font-medium text-primary mt-1 cursor-pointer hover:underline"
        >
          Switch to Dating & Daygame
        </button>
      </div>
    </div>
  )
}
