"use client"

import { useState, useMemo, useCallback } from "react"
import {
  ArrowLeft,
  Sprout,
  Sun,
  Leaf,
  Snowflake,
  GripVertical,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { MilestoneCurveEditor } from "@/src/goals/components/MilestoneCurveEditor"
import type {
  GoalTemplate,
  GoalDisplayCategory,
  MilestoneLadderConfig,
} from "@/src/goals/types"
import { generateMilestoneLadder } from "@/src/goals/milestoneService"
import type { GoalCustomization } from "./SeasonCustomize"

// ============================================================================
// Season configuration
// ============================================================================

type SeasonId = "spring" | "summer" | "fall" | "winter"

interface SeasonConfig {
  id: SeasonId
  label: string
  subtitle: string
  icon: typeof Sprout
  color: string
  bgColor: string
  borderColor: string
  dateRange: string
  /** Display categories that naturally belong in this season */
  naturalCategories: GoalDisplayCategory[]
  /** Goal natures that belong in this season */
  naturalNatures: Array<"input" | "outcome">
}

const SEASONS: SeasonConfig[] = [
  {
    id: "spring",
    label: "Spring",
    subtitle: "Awakening",
    icon: Sprout,
    color: "#86efac",
    bgColor: "rgba(134, 239, 172, 0.06)",
    borderColor: "rgba(134, 239, 172, 0.25)",
    dateRange: "Jan - Mar",
    naturalCategories: ["field_work"],
    naturalNatures: ["input"],
  },
  {
    id: "summer",
    label: "Summer",
    subtitle: "Growth",
    icon: Sun,
    color: "#fbbf24",
    bgColor: "rgba(251, 191, 36, 0.06)",
    borderColor: "rgba(251, 191, 36, 0.25)",
    dateRange: "Apr - Jun",
    naturalCategories: ["texting", "dates"],
    naturalNatures: ["input"],
  },
  {
    id: "fall",
    label: "Fall",
    subtitle: "Harvest",
    icon: Leaf,
    color: "#f97316",
    bgColor: "rgba(249, 115, 22, 0.06)",
    borderColor: "rgba(249, 115, 22, 0.25)",
    dateRange: "Jul - Sep",
    naturalCategories: ["results", "dirty_dog", "relationship"],
    naturalNatures: ["outcome"],
  },
  {
    id: "winter",
    label: "Winter",
    subtitle: "Reflection",
    icon: Snowflake,
    color: "#93c5fd",
    bgColor: "rgba(147, 197, 253, 0.06)",
    borderColor: "rgba(147, 197, 253, 0.25)",
    dateRange: "Oct - Dec",
    naturalCategories: [],
    naturalNatures: [],
  },
]

// ============================================================================
// Helper: assign goals to seasons automatically
// ============================================================================

function autoAssignSeason(
  goal: GoalTemplate,
  _cust: GoalCustomization
): SeasonId {
  const cat = goal.displayCategory

  // Spring: Input/habit goals (approaches, session frequency, consecutive days)
  if (cat === "field_work" && goal.nature === "input") return "spring"

  // Summer: Activity goals (texting, dating)
  if (cat === "texting" || cat === "dates") return "summer"

  // Fall: Outcome goals (results, relationships)
  if (
    cat === "results" ||
    cat === "dirty_dog" ||
    cat === "relationship"
  )
    return "fall"

  // Winter: Reflection goals -- remaining field_work outcomes, etc.
  if (goal.nature === "outcome") return "fall"

  // Default to spring for remaining input goals
  return "spring"
}

// ============================================================================
// Mini SVG curve for season cards
// ============================================================================

function MiniCurve({
  config,
  color,
  width = 180,
  height = 60,
}: {
  config: MilestoneLadderConfig
  color: string
  width?: number
  height?: number
}) {
  const milestones = useMemo(
    () => generateMilestoneLadder(config),
    [config]
  )

  const points = useMemo(() => {
    if (milestones.length < 2) return ""
    const range = config.target - config.start || 1
    const pad = { x: 8, y: 6 }
    const plotW = width - pad.x * 2
    const plotH = height - pad.y * 2

    return milestones
      .map((m, i) => {
        const x =
          pad.x +
          (milestones.length <= 1 ? plotW : (i / (milestones.length - 1)) * plotW)
        const y =
          pad.y +
          plotH -
          ((m.value - config.start) / range) * plotH
        return `${i === 0 ? "M" : "L"}${x},${y}`
      })
      .join(" ")
  }, [milestones, config.start, config.target, width, height])

  const areaD = useMemo(() => {
    if (!points) return ""
    const pad = { x: 8, y: 6 }
    const plotW = width - pad.x * 2
    return `${points} L${pad.x + plotW},${height - 6} L${pad.x},${height - 6} Z`
  }, [points, width, height])

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
    >
      <defs>
        <linearGradient
          id={`mini-fill-${color.replace("#", "")}`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {areaD && (
        <path
          d={areaD}
          fill={`url(#mini-fill-${color.replace("#", "")})`}
        />
      )}
      {points && (
        <path
          d={points}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {/* Dots at milestones */}
      {milestones.map((m, i) => {
        const range = config.target - config.start || 1
        const pad = { x: 8, y: 6 }
        const plotW = width - pad.x * 2
        const plotH = height - pad.y * 2
        const x =
          pad.x +
          (milestones.length <= 1 ? plotW : (i / (milestones.length - 1)) * plotW)
        const y =
          pad.y +
          plotH -
          ((m.value - config.start) / range) * plotH
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={2}
            fill={color}
            opacity={0.7}
          />
        )
      })}
    </svg>
  )
}

// ============================================================================
// Full-Year Overview Curve
// ============================================================================

function FullYearCurve({
  seasonGoals,
  seasonConfigs,
}: {
  seasonGoals: Record<SeasonId, MilestoneLadderConfig[]>
  seasonConfigs: readonly SeasonConfig[]
}) {
  const width = 600
  const height = 100
  const pad = { x: 12, y: 10 }
  const plotW = width - pad.x * 2
  const plotH = height - pad.y * 2

  // Draw a composite curve: each season takes 1/4 of the width
  const seasonWidth = plotW / 4

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ maxHeight: 100 }}
    >
      {/* Season background bands */}
      {seasonConfigs.map((s, i) => (
        <rect
          key={s.id}
          x={pad.x + i * seasonWidth}
          y={pad.y}
          width={seasonWidth}
          height={plotH}
          fill={s.color}
          opacity={0.04}
          rx={2}
        />
      ))}

      {/* Season dividers */}
      {[1, 2, 3].map((i) => (
        <line
          key={i}
          x1={pad.x + i * seasonWidth}
          y1={pad.y}
          x2={pad.x + i * seasonWidth}
          y2={pad.y + plotH}
          stroke="var(--border)"
          strokeOpacity={0.3}
          strokeDasharray="3,3"
        />
      ))}

      {/* Draw a representative curve for each season */}
      {seasonConfigs.map((s, si) => {
        const configs = seasonGoals[s.id]
        if (!configs || configs.length === 0) return null

        // Use the first config as representative
        const config = configs[0]
        const milestones = generateMilestoneLadder(config)
        if (milestones.length < 2) return null

        const range = config.target - config.start || 1
        const segX = pad.x + si * seasonWidth
        const segW = seasonWidth

        const pathD = milestones
          .map((m, i) => {
            const x =
              segX +
              (i / (milestones.length - 1)) * segW
            const y =
              pad.y +
              plotH -
              ((m.value - config.start) / range) * plotH
            return `${i === 0 ? "M" : "L"}${x},${y}`
          })
          .join(" ")

        return (
          <path
            key={s.id}
            d={pathD}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.8}
          />
        )
      })}

      {/* Season labels at bottom */}
      {seasonConfigs.map((s, i) => (
        <text
          key={`label-${s.id}`}
          x={pad.x + i * seasonWidth + seasonWidth / 2}
          y={height - 1}
          textAnchor="middle"
          fontSize="9"
          fill={s.color}
          fontWeight={600}
          opacity={0.6}
        >
          {s.label}
        </text>
      ))}
    </svg>
  )
}

// ============================================================================
// SeasonPlanner component
// ============================================================================

interface SeasonPlannerProps {
  selectedL1: GoalTemplate
  selectedL3s: GoalTemplate[]
  goals: GoalCustomization[]
  pathColor: string
  onBack: () => void
  onComplete: (seasonAssignments: Record<SeasonId, string[]>) => void
}

export function SeasonPlanner({
  selectedL1,
  selectedL3s,
  goals,
  pathColor,
  onBack,
  onComplete,
}: SeasonPlannerProps) {
  // Build a lookup for templates
  const templateMap = useMemo(() => {
    const map = new Map<string, GoalTemplate>()
    for (const t of selectedL3s) {
      map.set(t.id, t)
    }
    return map
  }, [selectedL3s])

  // Only L3 goals for seasonal assignment
  const l3Goals = useMemo(
    () => goals.filter((g) => g.level === 3),
    [goals]
  )

  // Auto-assign goals to seasons
  const [assignments, setAssignments] = useState<Record<string, SeasonId>>(
    () => {
      const map: Record<string, SeasonId> = {}
      for (const g of l3Goals) {
        const template = templateMap.get(g.templateId)
        if (template) {
          map[g.templateId] = autoAssignSeason(template, g)
        }
      }
      // If winter has no goals, move some consistency goals there
      const winterGoals = Object.entries(map).filter(
        ([, s]) => s === "winter"
      )
      if (winterGoals.length === 0) {
        // Move habit_ramp goals from spring to winter (reflection/consistency)
        const springRamps = l3Goals.filter((g) => {
          const t = templateMap.get(g.templateId)
          return (
            map[g.templateId] === "spring" &&
            t?.templateType === "habit_ramp"
          )
        })
        // Move up to 2 ramp goals to winter
        for (let i = 0; i < Math.min(2, springRamps.length); i++) {
          map[springRamps[i].templateId] = "winter"
        }
      }
      return map
    }
  )

  const [focusedSeason, setFocusedSeason] = useState<SeasonId | null>(null)
  const [dragGoalId, setDragGoalId] = useState<string | null>(null)

  // Per-season milestone configs for the curve editor
  const [seasonCurveConfigs, setSeasonCurveConfigs] = useState<
    Record<SeasonId, MilestoneLadderConfig>
  >(() => ({
    spring: { start: 0, target: 100, steps: 5, curveTension: 1.2 },
    summer: { start: 0, target: 200, steps: 5, curveTension: 0 },
    fall: { start: 0, target: 300, steps: 5, curveTension: -0.5 },
    winter: { start: 0, target: 50, steps: 4, curveTension: 0 },
  }))

  // Goals per season
  const goalsBySeason = useMemo(() => {
    const result: Record<SeasonId, GoalCustomization[]> = {
      spring: [],
      summer: [],
      fall: [],
      winter: [],
    }
    for (const g of l3Goals) {
      const season = assignments[g.templateId]
      if (season) result[season].push(g)
    }
    return result
  }, [l3Goals, assignments])

  // Per-season aggregated configs for mini curves
  const seasonMilestoneLookup = useMemo(() => {
    const result: Record<SeasonId, MilestoneLadderConfig[]> = {
      spring: [],
      summer: [],
      fall: [],
      winter: [],
    }
    for (const [seasonId, seasonGoals] of Object.entries(goalsBySeason)) {
      for (const g of seasonGoals) {
        const template = templateMap.get(g.templateId)
        if (template?.defaultMilestoneConfig) {
          result[seasonId as SeasonId].push(template.defaultMilestoneConfig)
        }
      }
    }
    return result
  }, [goalsBySeason, templateMap])

  const handleDragStart = (goalId: string) => {
    setDragGoalId(goalId)
  }

  const handleDropOnSeason = (seasonId: SeasonId) => {
    if (dragGoalId) {
      setAssignments((prev) => ({
        ...prev,
        [dragGoalId]: seasonId,
      }))
      setDragGoalId(null)
    }
  }

  const moveGoalToSeason = (goalId: string, targetSeason: SeasonId) => {
    setAssignments((prev) => ({
      ...prev,
      [goalId]: targetSeason,
    }))
  }

  const handleCurveChange = useCallback(
    (seasonId: SeasonId, config: MilestoneLadderConfig) => {
      setSeasonCurveConfigs((prev) => ({
        ...prev,
        [seasonId]: config,
      }))
    },
    []
  )

  const handleComplete = () => {
    const result: Record<SeasonId, string[]> = {
      spring: [],
      summer: [],
      fall: [],
      winter: [],
    }
    for (const [goalId, season] of Object.entries(assignments)) {
      result[season].push(goalId)
    }
    onComplete(result)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="size-4" />
          Back to customize
        </button>
      </div>

      <div>
        <h2 className="text-xl font-bold">Plan Your Seasons</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Distribute your goals across the four seasons. Click a season to
          focus on it. Drag goals between seasons or use the arrows to
          reorganize.
        </p>
      </div>

      {/* Horizontal Season Timeline */}
      <div className="grid grid-cols-4 gap-2 rounded-xl overflow-hidden border border-border/50">
        {SEASONS.map((season) => {
          const Icon = season.icon
          const goalCount = goalsBySeason[season.id].length
          const isFocused = focusedSeason === season.id

          return (
            <button
              key={season.id}
              onClick={() =>
                setFocusedSeason(
                  isFocused ? null : season.id
                )
              }
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = "move"
              }}
              onDrop={() => handleDropOnSeason(season.id)}
              className={`flex flex-col items-center gap-1.5 py-4 px-2 text-center transition-all duration-200 cursor-pointer`}
              style={{
                backgroundColor: isFocused
                  ? `${season.color}12`
                  : `${season.color}06`,
                boxShadow: isFocused
                  ? `inset 0 0 0 2px ${season.color}`
                  : undefined,
              }}
            >
              <Icon
                className="size-5"
                style={{ color: season.color }}
              />
              <span
                className="text-xs font-bold"
                style={{ color: season.color }}
              >
                {season.label}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {season.subtitle}
              </span>
              <span className="text-[10px] text-muted-foreground/60">
                {season.dateRange}
              </span>
              <span
                className="text-xs font-semibold mt-1 rounded-full px-2 py-0.5"
                style={{
                  backgroundColor: `${season.color}15`,
                  color: season.color,
                }}
              >
                {goalCount} goal{goalCount !== 1 ? "s" : ""}
              </span>
            </button>
          )
        })}
      </div>

      {/* Season Cards */}
      <div className="space-y-4">
        {SEASONS.map((season) => {
          const Icon = season.icon
          const seasonGoals = goalsBySeason[season.id]
          const isFocused =
            focusedSeason === null || focusedSeason === season.id
          const isCollapsed = focusedSeason !== null && focusedSeason !== season.id

          if (isCollapsed) return null

          return (
            <div
              key={season.id}
              className="rounded-xl border overflow-hidden transition-all duration-300"
              style={{
                borderColor: season.borderColor,
                backgroundColor: season.bgColor,
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = "move"
              }}
              onDrop={() => handleDropOnSeason(season.id)}
            >
              {/* Season card header */}
              <div
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  borderBottom: `1px solid ${season.borderColor}`,
                }}
              >
                <Icon
                  className="size-5"
                  style={{ color: season.color }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-bold"
                      style={{ color: season.color }}
                    >
                      {season.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {season.subtitle}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground/60">
                    {season.dateRange}
                  </span>
                </div>
                <span
                  className="text-xs font-semibold rounded-full px-2 py-0.5"
                  style={{
                    backgroundColor: `${season.color}15`,
                    color: season.color,
                  }}
                >
                  {seasonGoals.length} goal
                  {seasonGoals.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Goals list */}
              <div className="px-4 py-3">
                {seasonGoals.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60 text-center py-4 italic">
                    No goals assigned to this season. Drag goals here or use
                    the arrows to move them.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {seasonGoals.map((g) => {
                      const template = templateMap.get(g.templateId)
                      const isRamp =
                        template?.templateType === "habit_ramp"
                      return (
                        <div
                          key={g.templateId}
                          draggable
                          onDragStart={() =>
                            handleDragStart(g.templateId)
                          }
                          className="flex items-center gap-2 rounded-lg bg-background/60 border border-border/30 px-3 py-2 text-sm group cursor-grab active:cursor-grabbing"
                        >
                          <GripVertical className="size-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 flex-shrink-0" />
                          <span className="flex-1 text-sm truncate">
                            {g.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground/50">
                            {isRamp ? "habit" : "milestone"}
                          </span>
                          {/* Move arrows */}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {SEASONS.filter(
                              (s) => s.id !== season.id
                            ).map((s) => (
                              <button
                                key={s.id}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  moveGoalToSeason(
                                    g.templateId,
                                    s.id
                                  )
                                }}
                                className="rounded p-0.5 hover:bg-muted/50 transition-colors cursor-pointer"
                                title={`Move to ${s.label}`}
                              >
                                <s.icon
                                  className="size-3"
                                  style={{ color: s.color }}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Mini curve or full curve editor when focused */}
              {seasonGoals.length > 0 && (
                <div
                  className="px-4 pb-4"
                  style={{
                    borderTop: `1px solid ${season.borderColor}`,
                  }}
                >
                  {isFocused && focusedSeason === season.id ? (
                    <div className="mt-3">
                      <p
                        className="text-xs font-medium mb-2"
                        style={{ color: season.color }}
                      >
                        Growth curve for {season.label}
                      </p>
                      <MilestoneCurveEditor
                        config={seasonCurveConfigs[season.id]}
                        onChange={(config) =>
                          handleCurveChange(season.id, config)
                        }
                        themeId="zen"
                        allowDirectEdit
                      />
                    </div>
                  ) : (
                    <div className="mt-3">
                      <p className="text-[10px] text-muted-foreground/50 mb-1">
                        Growth trajectory
                      </p>
                      <MiniCurve
                        config={seasonCurveConfigs[season.id]}
                        color={season.color}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Full Year Overview */}
      <div className="rounded-xl border border-border/50 p-4">
        <h3 className="text-sm font-bold mb-2 text-muted-foreground">
          Full-Year Growth Overview
        </h3>
        <FullYearCurve
          seasonGoals={seasonMilestoneLookup}
          seasonConfigs={SEASONS}
        />
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground/60">
          <span>January</span>
          <span>December</span>
        </div>
      </div>

      {/* Confirm footer */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border/50 -mx-6 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              {l3Goals.length}
            </span>{" "}
            goals across{" "}
            <span className="font-semibold text-foreground">
              {
                SEASONS.filter((s) => goalsBySeason[s.id].length > 0)
                  .length
              }
            </span>{" "}
            seasons
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onBack}>
              Back
            </Button>
            <Button
              onClick={handleComplete}
              className="px-6"
              style={{
                background:
                  "linear-gradient(135deg, #86efac, #fbbf24, #f97316, #93c5fd)",
                color: "#1a1a1a",
              }}
            >
              Complete Your Year
              <ChevronRight className="size-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
