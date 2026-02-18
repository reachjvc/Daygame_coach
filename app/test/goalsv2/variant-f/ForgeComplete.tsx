"use client"

import { useMemo, useRef } from "react"
import {
  Flame,
  Zap,
  Target,
  Star,
  Heart,
  Trophy,
  RotateCcw,
  Scroll,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { interpolateWithControlPoints } from "@/src/goals/milestoneService"
import type { GoalTemplate, GoalDisplayCategory, MilestoneLadderConfig } from "@/src/goals/types"
import type { ForgeGoalCustomization } from "./ForgeCustomize"

const CATEGORY_LABELS: Partial<Record<GoalDisplayCategory, string>> = {
  field_work: "Field Work",
  results: "Results",
  dirty_dog: "Dirty Dog",
  texting: "Texting Game",
  dates: "Dating",
  relationship: "Relationship",
}

const CATEGORY_ICONS: Partial<Record<GoalDisplayCategory, typeof Target>> = {
  field_work: Zap,
  results: Target,
  dirty_dog: Flame,
  texting: Star,
  dates: Heart,
  relationship: Trophy,
}

const CATEGORY_COLORS: Partial<Record<GoalDisplayCategory, string>> = {
  field_work: "#f59e0b",
  results: "#ef4444",
  dirty_dog: "#f97316",
  texting: "#eab308",
  dates: "#ec4899",
  relationship: "#a855f7",
}

interface ForgeCompleteProps {
  goals: ForgeGoalCustomization[]
  categoryConfigs: Record<string, MilestoneLadderConfig>
  selectedL1Title: string
  pathColor: string
  onStartOver: () => void
}

export function ForgeComplete({
  goals,
  categoryConfigs,
  selectedL1Title,
  pathColor,
  onStartOver,
}: ForgeCompleteProps) {
  const svgId = useRef(`forge-bp-${Math.random().toString(36).slice(2, 8)}`).current

  const enabledGoals = goals.filter((g) => g.enabled)
  const l3Goals = enabledGoals.filter((g) => g.level === 3)
  const l2Goals = enabledGoals.filter((g) => g.level === 2)

  const activeCategories = useMemo(() => {
    const cats = new Set<GoalDisplayCategory>()
    for (const g of l3Goals) {
      if (g.displayCategory) cats.add(g.displayCategory)
    }
    return Array.from(cats)
  }, [l3Goals])

  const totalMilestones = useMemo(() => {
    let total = 0
    for (const cat of activeCategories) {
      const config = categoryConfigs[cat]
      if (config) total += config.steps
    }
    return total
  }, [activeCategories, categoryConfigs])

  // Determine the overall curve profile
  const overallProfile = useMemo(() => {
    let totalTension = 0
    let count = 0
    for (const cat of activeCategories) {
      const config = categoryConfigs[cat]
      if (config) {
        totalTension += config.curveTension
        count++
      }
    }
    if (count === 0) return "Balanced"
    const avgTension = totalTension / count
    if (avgTension > 0.5) return "Front-loaded"
    if (avgTension < -0.5) return "Back-loaded"
    return "Balanced"
  }, [activeCategories, categoryConfigs])

  // SVG dimensions for blueprint
  const SVG_W = 600
  const SVG_H = 320
  const PAD = { top: 30, right: 30, bottom: 40, left: 30 }
  const PLOT_W = SVG_W - PAD.left - PAD.right
  const PLOT_H = SVG_H - PAD.top - PAD.bottom

  const curves = useMemo(() => {
    return activeCategories.map((cat) => {
      const config = categoryConfigs[cat]
      if (!config) return { cat, points: [] }

      const numPts = 50
      const cps = config.controlPoints ?? []
      const points: { x: number; y: number }[] = []

      for (let i = 0; i <= numPts; i++) {
        const t = i / numPts
        const curved = interpolateWithControlPoints(t, cps, config.curveTension)
        points.push({
          x: PAD.left + t * PLOT_W,
          y: PAD.top + (1 - curved) * PLOT_H,
        })
      }

      return { cat, points }
    })
  }, [activeCategories, categoryConfigs])

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center space-y-4 py-6">
        <div
          className="inline-flex items-center justify-center size-16 rounded-2xl mx-auto"
          style={{
            background: "linear-gradient(135deg, rgba(234,88,12,0.2) 0%, rgba(220,38,38,0.15) 100%)",
          }}
        >
          <Scroll className="size-8" style={{ color: "#ea580c" }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Your Growth Blueprint</h1>
          <p className="text-muted-foreground mt-1 max-w-md mx-auto text-sm">
            You have forged your path toward "{selectedL1Title}".
            Here is the blueprint of your growth, shaped in The Forge.
          </p>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-center gap-6 pt-2">
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: "#ea580c" }}>{enabledGoals.length}</div>
            <div className="text-xs text-muted-foreground">Total Goals</div>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: "#ea580c" }}>{activeCategories.length}</div>
            <div className="text-xs text-muted-foreground">Categories</div>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: "#ea580c" }}>{totalMilestones}</div>
            <div className="text-xs text-muted-foreground">Milestones</div>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: "#ea580c" }}>{overallProfile}</div>
            <div className="text-xs text-muted-foreground">Curve Profile</div>
          </div>
        </div>
      </div>

      {/* The Blueprint SVG */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          border: "2px solid rgba(234,88,12,0.15)",
          background: "linear-gradient(180deg, rgba(254,243,199,0.05) 0%, rgba(251,191,36,0.02) 50%, transparent 100%)",
        }}
      >
        {/* Blueprint header */}
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{
            borderBottom: "1px solid rgba(234,88,12,0.1)",
            background: "rgba(234,88,12,0.03)",
          }}
        >
          <div className="flex items-center gap-2">
            <Scroll className="size-4" style={{ color: "#ea580c" }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#ea580c" }}>
              Forged Blueprint
            </span>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {activeCategories.length} curves / {totalMilestones} milestones
          </span>
        </div>

        <div className="p-4">
          <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full">
            <defs>
              {activeCategories.map((cat) => (
                <filter key={`glow-${cat}`} id={`${svgId}-glow-${cat}`} x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
                  <feFlood floodColor={CATEGORY_COLORS[cat]} floodOpacity="0.35" result="color" />
                  <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              ))}
              {/* Gradient for background texture */}
              <pattern id={`${svgId}-grid`} width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(234,88,12,0.04)" strokeWidth="0.5" />
              </pattern>
            </defs>

            {/* Background grid pattern */}
            <rect x={PAD.left} y={PAD.top} width={PLOT_W} height={PLOT_H} fill={`url(#${svgId}-grid)`} />

            {/* Horizontal grid lines */}
            {[0.25, 0.5, 0.75].map((t) => (
              <line
                key={t}
                x1={PAD.left}
                y1={PAD.top + (1 - t) * PLOT_H}
                x2={PAD.left + PLOT_W}
                y2={PAD.top + (1 - t) * PLOT_H}
                stroke="rgba(234,88,12,0.08)"
                strokeDasharray="4,8"
              />
            ))}

            {/* Y-axis labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((t) => (
              <text
                key={`y-${t}`}
                x={PAD.left - 6}
                y={PAD.top + (1 - t) * PLOT_H + 3}
                textAnchor="end"
                fontSize="9"
                fill="var(--muted-foreground)"
                opacity={0.4}
                fontFamily="var(--font-mono, monospace)"
              >
                {Math.round(t * 100)}%
              </text>
            ))}

            {/* X-axis labels */}
            {["Start", "25%", "50%", "75%", "Target"].map((label, i) => (
              <text
                key={label}
                x={PAD.left + (i / 4) * PLOT_W}
                y={PAD.top + PLOT_H + 18}
                textAnchor="middle"
                fontSize="9"
                fill="var(--muted-foreground)"
                opacity={0.4}
                fontFamily="var(--font-mono, monospace)"
              >
                {label}
              </text>
            ))}

            {/* Axes */}
            <line
              x1={PAD.left} y1={PAD.top}
              x2={PAD.left} y2={PAD.top + PLOT_H}
              stroke="rgba(234,88,12,0.15)" strokeWidth={1}
            />
            <line
              x1={PAD.left} y1={PAD.top + PLOT_H}
              x2={PAD.left + PLOT_W} y2={PAD.top + PLOT_H}
              stroke="rgba(234,88,12,0.15)" strokeWidth={1}
            />

            {/* Curve paths */}
            {curves.map(({ cat, points }) => {
              if (points.length === 0) return null
              const color = CATEGORY_COLORS[cat]
              const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")

              return (
                <g key={cat}>
                  {/* Area fill */}
                  <path
                    d={`${d} L${PAD.left + PLOT_W},${PAD.top + PLOT_H} L${PAD.left},${PAD.top + PLOT_H} Z`}
                    fill={color}
                    fillOpacity={0.05}
                  />
                  {/* Curve line with glow */}
                  <path
                    d={d}
                    fill="none"
                    stroke={color}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter={`url(#${svgId}-glow-${cat})`}
                  />
                  {/* Start dot */}
                  <circle cx={points[0].x} cy={points[0].y} r={3} fill={color} />
                  {/* End dot */}
                  <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={3} fill={color} />
                </g>
              )
            })}
          </svg>
        </div>

        {/* Legend */}
        <div
          className="px-4 pb-4 flex flex-wrap items-center justify-center gap-4"
        >
          {activeCategories.map((cat) => {
            const CatIcon = CATEGORY_ICONS[cat] || Target
            const config = categoryConfigs[cat]
            return (
              <div key={cat} className="flex items-center gap-1.5 text-xs">
                <div
                  className="size-3 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                />
                <CatIcon className="size-3" style={{ color: CATEGORY_COLORS[cat] }} />
                <span className="text-muted-foreground font-medium">{CATEGORY_LABELS[cat]}</span>
                {config && (
                  <span className="text-muted-foreground/50 font-mono">
                    ({config.steps}ms)
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Category breakdown cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {activeCategories.map((cat) => {
          const config = categoryConfigs[cat]
          const catGoals = l3Goals.filter((g) => g.displayCategory === cat)
          const CatIcon = CATEGORY_ICONS[cat] || Target
          const color = CATEGORY_COLORS[cat]

          return (
            <div
              key={cat}
              className="rounded-xl border p-4 space-y-2"
              style={{
                borderColor: `${color}20`,
                background: `linear-gradient(135deg, ${color}04 0%, transparent 100%)`,
              }}
            >
              <div className="flex items-center gap-2">
                <div className="rounded-md p-1.5" style={{ backgroundColor: `${color}12` }}>
                  <CatIcon className="size-4" style={{ color }} />
                </div>
                <span className="text-sm font-bold">{CATEGORY_LABELS[cat]}</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Goals</span>
                  <span className="font-medium">{catGoals.length}</span>
                </div>
                {config && (
                  <>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Milestones</span>
                      <span className="font-medium">{config.steps}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Range</span>
                      <span className="font-medium font-mono">{config.start} {"\u2192"} {config.target}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Curve</span>
                      <span className="font-medium">
                        {Math.abs(config.curveTension) < 0.05
                          ? "Linear"
                          : config.curveTension > 0
                            ? "Front-loaded"
                            : "Back-loaded"}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Goal list summary */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          All Forged Goals ({enabledGoals.length})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {enabledGoals.map((goal) => {
            const color = goal.displayCategory ? CATEGORY_COLORS[goal.displayCategory] : pathColor
            return (
              <div
                key={goal.templateId}
                className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/10 px-3 py-2"
              >
                <div
                  className="size-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs flex-1 truncate">{goal.title}</span>
                <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">
                  L{goal.level}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center space-y-4 py-6 border-t border-border/30">
        <div
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium"
          style={{
            background: "linear-gradient(135deg, rgba(234,88,12,0.12) 0%, rgba(220,38,38,0.08) 100%)",
            color: "#ea580c",
          }}
        >
          <Flame className="size-4" />
          Your growth has been forged
        </div>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          In the real app, this would create all {enabledGoals.length} goals with their custom
          growth curves and take you to your personalized dashboard. For this prototype,
          you can start over to explore different paths.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" onClick={onStartOver}>
            <RotateCcw className="size-4 mr-2" />
            Start Over
          </Button>
          <Button
            disabled
            style={{
              background: "linear-gradient(135deg, #ea580c 0%, #dc2626 100%)",
            }}
          >
            <Flame className="size-4 mr-2" />
            Create {enabledGoals.length} Goals (Demo)
          </Button>
        </div>
      </div>
    </div>
  )
}
