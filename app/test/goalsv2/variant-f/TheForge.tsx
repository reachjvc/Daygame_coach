"use client"

import { useState, useMemo, useCallback, useRef } from "react"
import {
  ArrowLeft,
  ChevronRight,
  Flame,
  Zap,
  Target,
  Star,
  Heart,
  Trophy,
  Layers,
  Maximize2,
  Minimize2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { MilestoneCurveEditor } from "@/src/goals/components/MilestoneCurveEditor"
import { generateMilestoneLadder, interpolateWithControlPoints } from "@/src/goals/milestoneService"
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

interface TheForgeProps {
  goals: ForgeGoalCustomization[]
  selectedL3s: GoalTemplate[]
  onBack: () => void
  onComplete: (configs: Record<string, MilestoneLadderConfig>) => void
}

export function TheForge({ goals, selectedL3s, onBack, onComplete }: TheForgeProps) {
  // Group L3 goals by display category
  const l3Goals = goals.filter((g) => g.level === 3 && g.enabled)
  const categorizedGoals = useMemo(() => {
    const grouped: Partial<Record<GoalDisplayCategory, ForgeGoalCustomization[]>> = {}
    for (const goal of l3Goals) {
      const cat = goal.displayCategory || "field_work"
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat]!.push(goal)
    }
    return grouped
  }, [l3Goals])

  const activeCategories = useMemo(() => {
    return (Object.keys(categorizedGoals) as GoalDisplayCategory[]).filter(
      (cat) => (categorizedGoals[cat]?.length ?? 0) > 0
    )
  }, [categorizedGoals])

  // Per-category curve configs
  const [categoryConfigs, setCategoryConfigs] = useState<Record<string, MilestoneLadderConfig>>(() => {
    const configs: Record<string, MilestoneLadderConfig> = {}
    for (const cat of activeCategories) {
      const catGoals = categorizedGoals[cat] || []
      // Aggregate: use the max target in the category, min start
      const milestoneGoals = catGoals.filter((g) => g.templateType === "milestone_ladder")
      if (milestoneGoals.length > 0) {
        const maxTarget = Math.max(...milestoneGoals.map((g) => g.targetValue))
        configs[cat] = {
          start: 0,
          target: maxTarget,
          steps: 5,
          curveTension: 0,
          controlPoints: [],
        }
      } else {
        // Habit ramp — use a generic config
        const maxFreq = Math.max(...catGoals.map((g) => g.targetValue), 5)
        configs[cat] = {
          start: 0,
          target: maxFreq,
          steps: 4,
          curveTension: 0,
          controlPoints: [],
        }
      }
    }
    return configs
  })

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [showOverlay, setShowOverlay] = useState(false)

  const handleConfigChange = useCallback((cat: string, config: MilestoneLadderConfig) => {
    setCategoryConfigs((prev) => ({ ...prev, [cat]: config }))
  }, [])

  // Compute total intensity score
  const totalIntensityScore = useMemo(() => {
    let score = 0
    for (const cat of activeCategories) {
      const config = categoryConfigs[cat]
      if (!config) continue
      const milestones = generateMilestoneLadder(config)
      // Score = steps * (1 + |tension|) * (target / 100)
      const tensionFactor = 1 + Math.abs(config.curveTension)
      const scaleFactor = Math.max(config.target / 100, 0.1)
      score += milestones.length * tensionFactor * scaleFactor
    }
    return Math.round(score * 10) / 10
  }, [activeCategories, categoryConfigs])

  // Intensity level label
  const intensityLabel = useMemo(() => {
    if (totalIntensityScore < 5) return { label: "Ember", color: "#fbbf24" }
    if (totalIntensityScore < 15) return { label: "Blaze", color: "#f97316" }
    if (totalIntensityScore < 30) return { label: "Inferno", color: "#ef4444" }
    return { label: "Supernova", color: "#dc2626" }
  }, [totalIntensityScore])

  const handleComplete = () => {
    onComplete(categoryConfigs)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
          <ArrowLeft className="size-4" />
          Back to customize
        </button>
        <button
          onClick={() => setShowOverlay(!showOverlay)}
          className="flex items-center gap-2 text-sm font-medium cursor-pointer transition-colors"
          style={{ color: showOverlay ? "#ea580c" : "var(--muted-foreground)" }}
        >
          <Layers className="size-4" />
          {showOverlay ? "Category View" : "Overlay View"}
        </button>
      </div>

      {/* Forge Title */}
      <div className="text-center space-y-3">
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
          style={{
            background: "linear-gradient(135deg, rgba(234,88,12,0.15) 0%, rgba(245,158,11,0.1) 100%)",
            color: "#ea580c",
          }}
        >
          <Flame className="size-4" />
          THE FORGE
        </div>
        <h2 className="text-2xl font-bold">Shape Your Growth Curves</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Each category of goals gets its own growth curve. Adjust the shape,
          steps, and tension to match your ambition. Like a blacksmith shaping metal
          -- hammer each curve until it fits your path.
        </p>
      </div>

      {/* Total Intensity Score */}
      <div
        className="rounded-xl border-2 p-4 text-center"
        style={{
          borderColor: `${intensityLabel.color}30`,
          background: `linear-gradient(135deg, ${intensityLabel.color}08 0%, ${intensityLabel.color}04 100%)`,
        }}
      >
        <div className="flex items-center justify-center gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Total Intensity
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-3xl font-bold font-mono"
                style={{ color: intensityLabel.color }}
              >
                {totalIntensityScore}
              </span>
              <div
                className="px-2 py-0.5 rounded-full text-xs font-bold"
                style={{
                  backgroundColor: `${intensityLabel.color}15`,
                  color: intensityLabel.color,
                }}
              >
                {intensityLabel.label}
              </div>
            </div>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="text-left">
            <div className="text-xs text-muted-foreground">{activeCategories.length} categories</div>
            <div className="text-xs text-muted-foreground">{l3Goals.length} goals total</div>
          </div>
        </div>
      </div>

      {/* Overlay View */}
      {showOverlay && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <OverlayChart
            activeCategories={activeCategories}
            categoryConfigs={categoryConfigs}
          />
        </div>
      )}

      {/* Category Cards */}
      {!showOverlay && (
        <div className="space-y-4">
          {activeCategories.map((cat) => {
            const config = categoryConfigs[cat]
            if (!config) return null
            const catGoals = categorizedGoals[cat] || []
            const isExpanded = expandedCategory === cat
            const CatIcon = CATEGORY_ICONS[cat] || Target
            const catColor = CATEGORY_COLORS[cat] || "#f59e0b"

            return (
              <div
                key={cat}
                className="rounded-xl overflow-hidden transition-all duration-300"
                style={{
                  border: `2px solid ${isExpanded ? catColor + "40" : "var(--border)"}`,
                  background: isExpanded
                    ? `linear-gradient(135deg, ${catColor}06 0%, ${catColor}03 100%)`
                    : "var(--card)",
                }}
              >
                {/* Category header — compact card */}
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : cat)}
                  className="w-full flex items-center gap-3 p-4 text-left cursor-pointer transition-colors hover:bg-muted/20"
                >
                  {/* Glow icon */}
                  <div
                    className="rounded-lg p-2.5 transition-all duration-300"
                    style={{
                      backgroundColor: `${catColor}15`,
                      boxShadow: isExpanded ? `0 0 16px ${catColor}20` : "none",
                    }}
                  >
                    <CatIcon className="size-5" style={{ color: catColor }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{CATEGORY_LABELS[cat]}</span>
                      <span className="text-xs text-muted-foreground">
                        {catGoals.length} goal{catGoals.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {/* Mini curve preview when collapsed */}
                    {!isExpanded && (
                      <div className="flex items-center gap-2 mt-1">
                        <MiniCurvePreview config={config} color={catColor} />
                        <span className="text-xs text-muted-foreground font-mono">
                          {config.steps} steps, {config.start} {"\u2192"} {config.target}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Expand/collapse */}
                  <div
                    className="rounded-lg p-1.5 transition-colors"
                    style={{ backgroundColor: isExpanded ? `${catColor}15` : "transparent" }}
                  >
                    {isExpanded ? (
                      <Minimize2 className="size-4" style={{ color: catColor }} />
                    ) : (
                      <Maximize2 className="size-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Expanded: full curve editor */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    {/* Goals list in this category */}
                    <div className="flex flex-wrap gap-1.5">
                      {catGoals.map((goal) => (
                        <span
                          key={goal.templateId}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{
                            backgroundColor: `${catColor}10`,
                            color: catColor,
                          }}
                        >
                          {goal.title}
                        </span>
                      ))}
                    </div>

                    {/* The actual MilestoneCurveEditor */}
                    <MilestoneCurveEditor
                      config={config}
                      onChange={(newConfig) => handleConfigChange(cat, newConfig)}
                      themeId="zen"
                      allowDirectEdit
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Complete footer */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border/50 -mx-6 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{activeCategories.length}</span> categories forged
            <span className="mx-2 text-border">|</span>
            Intensity: <span className="font-bold" style={{ color: intensityLabel.color }}>{intensityLabel.label}</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onBack}>Back</Button>
            <Button
              onClick={handleComplete}
              style={{
                background: "linear-gradient(135deg, #ea580c 0%, #dc2626 100%)",
              }}
            >
              <Flame className="size-4 mr-2" />
              Complete The Forge
              <ChevronRight className="size-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Mini inline curve preview for collapsed category cards
 */
function MiniCurvePreview({ config, color }: { config: MilestoneLadderConfig; color: string }) {
  const width = 60
  const height = 20
  const padding = 2

  const pathD = useMemo(() => {
    const points: string[] = []
    const numPts = 20
    const cps = config.controlPoints ?? []
    const range = config.target - config.start || 1

    for (let i = 0; i <= numPts; i++) {
      const t = i / numPts
      const curved = interpolateWithControlPoints(t, cps, config.curveTension)
      const x = padding + t * (width - 2 * padding)
      const y = (height - padding) - curved * (height - 2 * padding)
      points.push(`${i === 0 ? "M" : "L"}${x},${y}`)
    }
    return points.join(" ")
  }, [config])

  return (
    <svg width={width} height={height} className="flex-shrink-0">
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.6}
      />
    </svg>
  )
}

/**
 * Overlay chart showing all category curves superimposed
 */
function OverlayChart({
  activeCategories,
  categoryConfigs,
}: {
  activeCategories: GoalDisplayCategory[]
  categoryConfigs: Record<string, MilestoneLadderConfig>
}) {
  const svgId = useRef(`forge-overlay-${Math.random().toString(36).slice(2, 8)}`).current
  const SVG_W = 500
  const SVG_H = 280
  const PAD = { top: 20, right: 20, bottom: 30, left: 20 }
  const PLOT_W = SVG_W - PAD.left - PAD.right
  const PLOT_H = SVG_H - PAD.top - PAD.bottom

  const curves = useMemo(() => {
    return activeCategories.map((cat) => {
      const config = categoryConfigs[cat]
      if (!config) return { cat, points: [] }

      const numPts = 40
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
    <div
      className="rounded-xl border-2 p-4"
      style={{
        borderColor: "rgba(234,88,12,0.2)",
        background: "linear-gradient(180deg, rgba(234,88,12,0.04) 0%, transparent 100%)",
      }}
    >
      <div className="text-center mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          All Growth Curves Overlaid
        </span>
      </div>

      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full">
        <defs>
          {activeCategories.map((cat) => (
            <filter key={`glow-${cat}`} id={`${svgId}-glow-${cat}`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
              <feFlood floodColor={CATEGORY_COLORS[cat]} floodOpacity="0.3" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
        </defs>

        {/* Grid */}
        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={t}
            x1={PAD.left}
            y1={PAD.top + (1 - t) * PLOT_H}
            x2={PAD.left + PLOT_W}
            y2={PAD.top + (1 - t) * PLOT_H}
            stroke="var(--border)"
            strokeOpacity={0.15}
            strokeDasharray="3,6"
          />
        ))}

        {/* Axes */}
        <line
          x1={PAD.left} y1={PAD.top}
          x2={PAD.left} y2={PAD.top + PLOT_H}
          stroke="var(--border)" strokeOpacity={0.3}
        />
        <line
          x1={PAD.left} y1={PAD.top + PLOT_H}
          x2={PAD.left + PLOT_W} y2={PAD.top + PLOT_H}
          stroke="var(--border)" strokeOpacity={0.3}
        />

        {/* Axis labels */}
        <text x={PAD.left + PLOT_W / 2} y={SVG_H - 5} textAnchor="middle" fontSize="10" fill="var(--muted-foreground)" opacity={0.5}>
          Time
        </text>
        <text x={8} y={PAD.top + PLOT_H / 2} textAnchor="middle" fontSize="10" fill="var(--muted-foreground)" opacity={0.5} transform={`rotate(-90, 8, ${PAD.top + PLOT_H / 2})`}>
          Progress
        </text>

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
                fillOpacity={0.04}
              />
              {/* Curve line */}
              <path
                d={d}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={`url(#${svgId}-glow-${cat})`}
              />
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-3">
        {activeCategories.map((cat) => {
          const CatIcon = CATEGORY_ICONS[cat] || Target
          return (
            <div key={cat} className="flex items-center gap-1.5 text-xs">
              <div
                className="size-2.5 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[cat] }}
              />
              <CatIcon className="size-3" style={{ color: CATEGORY_COLORS[cat] }} />
              <span className="text-muted-foreground">{CATEGORY_LABELS[cat]}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
