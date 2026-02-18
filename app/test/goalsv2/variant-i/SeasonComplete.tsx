"use client"

import { useMemo } from "react"
import {
  Sprout,
  Sun,
  Leaf,
  Snowflake,
  TreePine,
  RotateCcw,
  TrendingUp,
  Target,
  Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { generateMilestoneLadder } from "@/src/goals/milestoneService"
import type { MilestoneLadderConfig } from "@/src/goals/types"
import type { GoalCustomization } from "./SeasonCustomize"

type SeasonId = "spring" | "summer" | "fall" | "winter"

interface SeasonInfo {
  id: SeasonId
  label: string
  subtitle: string
  icon: typeof Sprout
  color: string
  dateRange: string
}

const SEASONS: SeasonInfo[] = [
  {
    id: "spring",
    label: "Spring",
    subtitle: "Awakening",
    icon: Sprout,
    color: "#86efac",
    dateRange: "Jan - Mar",
  },
  {
    id: "summer",
    label: "Summer",
    subtitle: "Growth",
    icon: Sun,
    color: "#fbbf24",
    dateRange: "Apr - Jun",
  },
  {
    id: "fall",
    label: "Fall",
    subtitle: "Harvest",
    icon: Leaf,
    color: "#f97316",
    dateRange: "Jul - Sep",
  },
  {
    id: "winter",
    label: "Winter",
    subtitle: "Reflection",
    icon: Snowflake,
    color: "#93c5fd",
    dateRange: "Oct - Dec",
  },
]

// Mini curve for the season panels
function PanelCurve({
  config,
  color,
}: {
  config: MilestoneLadderConfig
  color: string
}) {
  const width = 200
  const height = 50
  const milestones = useMemo(
    () => generateMilestoneLadder(config),
    [config]
  )

  const points = useMemo(() => {
    if (milestones.length < 2) return ""
    const range = config.target - config.start || 1
    const pad = { x: 4, y: 4 }
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
  }, [milestones, config.start, config.target])

  const areaD = useMemo(() => {
    if (!points) return ""
    return `${points} L${width - 4},${height - 4} L4,${height - 4} Z`
  }, [points])

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ maxHeight: 50 }}
    >
      <defs>
        <linearGradient
          id={`panel-fill-${color.replace("#", "")}`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {areaD && (
        <path
          d={areaD}
          fill={`url(#panel-fill-${color.replace("#", "")})`}
        />
      )}
      {points && (
        <path
          d={points}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}

interface SeasonCompleteProps {
  visionTitle: string
  goals: GoalCustomization[]
  seasonAssignments: Record<SeasonId, string[]>
  seasonCurveConfigs: Record<SeasonId, MilestoneLadderConfig>
  onStartOver: () => void
}

export function SeasonComplete({
  visionTitle,
  goals,
  seasonAssignments,
  seasonCurveConfigs,
  onStartOver,
}: SeasonCompleteProps) {
  const goalMap = useMemo(() => {
    const map = new Map<string, GoalCustomization>()
    for (const g of goals) {
      map.set(g.templateId, g)
    }
    return map
  }, [goals])

  const totalGoals = goals.filter((g) => g.level === 3).length
  const totalMilestones = useMemo(() => {
    let count = 0
    for (const season of SEASONS) {
      const config = seasonCurveConfigs[season.id]
      const ms = generateMilestoneLadder(config)
      count += ms.length
    }
    return count
  }, [seasonCurveConfigs])

  const activeSeasons = SEASONS.filter(
    (s) => seasonAssignments[s.id].length > 0
  ).length

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center space-y-4 pt-4">
        <div className="inline-flex items-center justify-center gap-2 mx-auto">
          <div className="flex items-center gap-1">
            {SEASONS.map((s) => (
              <div
                key={s.id}
                className="rounded-full p-1.5"
                style={{ backgroundColor: `${s.color}15` }}
              >
                <s.icon
                  className="size-4"
                  style={{ color: s.color }}
                />
              </div>
            ))}
          </div>
        </div>

        <h1 className="text-2xl font-bold tracking-tight">
          Your Growth Year
        </h1>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Your journey from seed to harvest is mapped out. Each season
          builds on the last, creating a natural rhythm of growth.
        </p>
      </div>

      {/* Vision card */}
      <div className="rounded-xl border-2 border-border/50 p-4 text-center bg-gradient-to-r from-green-500/5 via-amber-500/5 to-blue-500/5">
        <div className="flex items-center justify-center gap-2 mb-1">
          <TreePine className="size-4 text-green-600" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Your Vision
          </span>
        </div>
        <h2 className="text-lg font-bold">{visionTitle}</h2>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border/50 p-3 text-center">
          <Target className="size-4 text-muted-foreground/60 mx-auto mb-1" />
          <div className="text-lg font-bold">{totalGoals}</div>
          <div className="text-xs text-muted-foreground">Goals</div>
        </div>
        <div className="rounded-lg border border-border/50 p-3 text-center">
          <TrendingUp className="size-4 text-muted-foreground/60 mx-auto mb-1" />
          <div className="text-lg font-bold">{totalMilestones}</div>
          <div className="text-xs text-muted-foreground">Milestones</div>
        </div>
        <div className="rounded-lg border border-border/50 p-3 text-center">
          <Calendar className="size-4 text-muted-foreground/60 mx-auto mb-1" />
          <div className="text-lg font-bold">{activeSeasons}</div>
          <div className="text-xs text-muted-foreground">Seasons</div>
        </div>
      </div>

      {/* 4-panel seasonal overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SEASONS.map((season) => {
          const Icon = season.icon
          const seasonGoalIds = seasonAssignments[season.id]
          const seasonGoals = seasonGoalIds
            .map((id) => goalMap.get(id))
            .filter(Boolean) as GoalCustomization[]
          const config = seasonCurveConfigs[season.id]

          return (
            <div
              key={season.id}
              className="rounded-xl border overflow-hidden"
              style={{
                borderColor: `${season.color}30`,
                backgroundColor: `${season.color}04`,
              }}
            >
              {/* Panel header */}
              <div
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  backgroundColor: `${season.color}08`,
                  borderBottom: `1px solid ${season.color}20`,
                }}
              >
                <Icon
                  className="size-5"
                  style={{ color: season.color }}
                />
                <div className="flex-1">
                  <span
                    className="text-sm font-bold"
                    style={{ color: season.color }}
                  >
                    {season.label}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {season.subtitle}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground/60">
                  {season.dateRange}
                </span>
              </div>

              {/* Goals list */}
              <div className="px-4 py-3 space-y-1">
                {seasonGoals.length === 0 ? (
                  <p className="text-xs text-muted-foreground/40 italic text-center py-2">
                    Rest season
                  </p>
                ) : (
                  seasonGoals.map((g) => (
                    <div
                      key={g.templateId}
                      className="flex items-center gap-2 text-sm"
                    >
                      <div
                        className="size-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: season.color }}
                      />
                      <span className="truncate text-xs">
                        {g.title}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Mini curve */}
              {seasonGoals.length > 0 && (
                <div className="px-4 pb-3">
                  <PanelCurve config={config} color={season.color} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Motivational message */}
      <div className="rounded-xl bg-gradient-to-r from-green-500/5 via-amber-500/5 via-orange-500/5 to-blue-500/5 border border-border/30 p-6 text-center">
        <p className="text-sm text-muted-foreground leading-relaxed max-w-lg mx-auto">
          Growth is cyclical. Spring plants the seeds, summer provides the
          energy, fall delivers the harvest, and winter offers wisdom. Trust
          the process and let each season build on the last.
        </p>
      </div>

      {/* Start over button */}
      <div className="text-center pt-2 pb-6">
        <Button
          variant="outline"
          onClick={onStartOver}
          className="gap-2"
        >
          <RotateCcw className="size-4" />
          Start Over
        </Button>
      </div>
    </div>
  )
}
