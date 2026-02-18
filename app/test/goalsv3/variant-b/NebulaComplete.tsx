"use client"

import { useState, useMemo, useEffect } from "react"
import { Star, Sparkles, Trophy, Target, Repeat, Milestone as MilestoneIcon, Telescope } from "lucide-react"
import { Button } from "@/components/ui/button"
import { generateMilestoneLadder } from "@/src/goals/milestoneService"
import type { GoalTemplate, MilestoneLadderConfig, GoalDisplayCategory } from "@/src/goals/types"
import type { GoalCustomization } from "./NebulaCustomizer"
import { NebulaCanvas } from "./NebulaCanvas"

const CATEGORY_LABELS: Partial<Record<GoalDisplayCategory, string>> = {
  field_work: "Field Work",
  results: "Results",
  dirty_dog: "Dirty Dog",
  texting: "Texting Game",
  dates: "Dating",
  relationship: "Relationship",
}

const NEBULA_NAMES: Record<string, string> = {
  one_person: "Rosette Nebula",
  abundance: "Carina Nebula",
}

/** Hex to rgba */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

interface NebulaCompleteProps {
  path: "one_person" | "abundance"
  selectedL1: GoalTemplate
  selectedL2s: GoalTemplate[]
  selectedL3s: GoalTemplate[]
  goals: GoalCustomization[]
  curveConfigs: Map<string, MilestoneLadderConfig>
  pathColor: string
  onStartOver: () => void
}

export function NebulaComplete({
  path,
  selectedL1,
  selectedL2s,
  selectedL3s,
  goals,
  curveConfigs,
  pathColor,
  onStartOver,
}: NebulaCompleteProps) {
  const nebulaName = NEBULA_NAMES[path] ?? "Orion Nebula"
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const l2Goals = goals.filter((g) => g.level === 2)
  const l3Goals = goals.filter((g) => g.level === 3)

  const l3ByCategory = useMemo(() => {
    const grouped: Record<string, GoalCustomization[]> = {}
    for (const g of l3Goals) {
      const template = selectedL3s.find((t) => t.id === g.templateId)
      const cat = template?.displayCategory || "field_work"
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(g)
    }
    return grouped as Partial<Record<GoalDisplayCategory, GoalCustomization[]>>
  }, [l3Goals, selectedL3s])

  const milestoneCount = l3Goals.filter((g) => {
    const tmpl = selectedL3s.find((t) => t.id === g.templateId)
    return tmpl?.templateType === "milestone_ladder"
  }).length

  const habitCount = l3Goals.filter((g) => {
    const tmpl = selectedL3s.find((t) => t.id === g.templateId)
    return tmpl?.templateType === "habit_ramp"
  }).length

  const brightestStar = useMemo(() => {
    let maxSteps = 0
    let brightest = ""
    for (const [id, config] of curveConfigs) {
      const milestones = generateMilestoneLadder(config)
      if (milestones.length > maxSteps) {
        maxSteps = milestones.length
        const tmpl = [...selectedL2s, ...selectedL3s].find((t) => t.id === id)
        brightest = tmpl?.title || id
      }
    }
    return brightest || selectedL1.title
  }, [curveConfigs, selectedL1, selectedL2s, selectedL3s])

  const totalStars = 1 + l2Goals.length + l3Goals.length
  const totalConnections = l2Goals.length + l3Goals.length

  return (
    <div className="relative space-y-8">
      {/* Background nebula */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl" style={{ zIndex: 0 }}>
        <NebulaCanvas
          particleCount={80}
          intensity={0.5}
          regions={[
            { x: 50, y: 30, rx: 40, ry: 30, color: pathColor, opacity: 0.04, rotation: 0 },
            { x: 30, y: 50, rx: 25, ry: 20, color: "#6366f1", opacity: 0.02, rotation: 0 },
            { x: 70, y: 60, rx: 20, ry: 18, color: "#a855f7", opacity: 0.02, rotation: 0 },
          ]}
        />
      </div>

      {/* Hero summary */}
      <div
        className="relative text-center space-y-4 py-8"
        style={{
          transition: "opacity 0.8s ease, transform 0.8s ease",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(20px)",
        }}
      >
        {/* Supergiant icon */}
        <div
          className="inline-flex items-center justify-center size-20 rounded-full mx-auto"
          style={{
            background: `radial-gradient(circle, ${hexToRgba(pathColor, 0.15)} 0%, ${hexToRgba(pathColor, 0.03)} 60%, transparent 100%)`,
            boxShadow: `0 0 40px ${hexToRgba(pathColor, 0.15)}, 0 0 80px ${hexToRgba(pathColor, 0.06)}, inset 0 0 30px ${hexToRgba(pathColor, 0.08)}`,
          }}
        >
          <div
            className="size-10 rounded-full flex items-center justify-center"
            style={{
              background: `radial-gradient(circle, ${hexToRgba(pathColor, 0.4)} 0%, ${hexToRgba(pathColor, 0.1)} 70%)`,
              boxShadow: `0 0 20px ${pathColor}`,
            }}
          >
            <Sparkles className="size-5" style={{ color: "white" }} />
          </div>
        </div>

        <div>
          <h1
            className="text-2xl font-bold"
            style={{
              color: "rgba(255,255,255,0.95)",
              textShadow: `0 0 30px ${hexToRgba(pathColor, 0.2)}`,
            }}
          >
            Nebula Charted
          </h1>
          <p className="mt-1 max-w-md mx-auto text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Your &quot;{nebulaName}&quot; is mapped with {goals.length} stars to guide your journey toward &quot;{selectedL1.title}&quot;.
          </p>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-center gap-6 pt-2">
          {[
            { value: totalStars, label: "Stars", color: pathColor },
            { value: totalConnections, label: "Gas Streams", color: hexToRgba(pathColor, 0.7) },
            { value: milestoneCount, label: "Milestones", color: hexToRgba(pathColor, 0.7) },
            { value: habitCount, label: "Habits", color: hexToRgba(pathColor, 0.7) },
          ].map((stat, i) => (
            <div key={stat.label} className="flex items-center gap-6">
              <div className="text-center">
                <div
                  className="text-2xl font-bold"
                  style={{ color: stat.color, textShadow: `0 0 12px ${hexToRgba(pathColor, 0.3)}` }}
                >
                  {stat.value}
                </div>
                <div className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{stat.label}</div>
              </div>
              {i < 3 && (
                <div className="w-px h-8" style={{ backgroundColor: "rgba(255,255,255,0.06)" }} />
              )}
            </div>
          ))}
        </div>

        {/* Nebula + brightest star badges */}
        <div className="flex items-center justify-center gap-4 pt-2">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
            style={{
              border: `1px solid ${hexToRgba(pathColor, 0.2)}`,
              background: hexToRgba(pathColor, 0.06),
              color: pathColor,
              textShadow: `0 0 6px ${hexToRgba(pathColor, 0.3)}`,
            }}
          >
            <Star className="size-3" />
            {nebulaName}
          </div>
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
            style={{
              border: `1px solid ${hexToRgba(pathColor, 0.15)}`,
              background: hexToRgba(pathColor, 0.04),
              color: hexToRgba(pathColor, 0.8),
            }}
          >
            <Telescope className="size-3" />
            Brightest: {brightestStar}
          </div>
        </div>
      </div>

      {/* Mini nebula constellation visualization */}
      <div
        className="relative rounded-2xl overflow-hidden max-w-xl mx-auto"
        style={{
          background: "#000005",
          border: `1px solid ${hexToRgba(pathColor, 0.1)}`,
          height: 200,
        }}
      >
        <NebulaCanvas
          particleCount={40}
          intensity={0.4}
          regions={[
            { x: 50, y: 50, rx: 35, ry: 30, color: pathColor, opacity: 0.05, rotation: 0 },
          ]}
        />
        <svg viewBox="0 0 100 50" className="w-full h-full relative" style={{ zIndex: 1 }}>
          <defs>
            <filter id="complete-nebula-glow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" result="blur" />
              <feFlood floodColor={pathColor} floodOpacity="0.6" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Center supergiant */}
          <circle cx={50} cy={25} r={3} fill={pathColor} fillOpacity={0.9} filter="url(#complete-nebula-glow)">
            <animate attributeName="r" values="2.5;3.5;2.5" dur="3s" repeatCount="indefinite" />
          </circle>
          {/* Lens flare rays on center */}
          <line x1={44} y1={25} x2={56} y2={25} stroke={pathColor} strokeOpacity={0.15} strokeWidth={0.08} />
          <line x1={50} y1={19} x2={50} y2={31} stroke={pathColor} strokeOpacity={0.12} strokeWidth={0.08} />

          {/* L2 stars in arc */}
          {selectedL2s.map((l2, i) => {
            const angle = (i / selectedL2s.length) * Math.PI * 2 - Math.PI / 2
            const x = 50 + Math.cos(angle) * 15
            const y = 25 + Math.sin(angle) * 10
            return (
              <g key={l2.id}>
                <line x1={50} y1={25} x2={x} y2={y} stroke={pathColor} strokeOpacity={0.15} strokeWidth={0.12} />
                <circle cx={x} cy={y} r={1.5} fill={pathColor} fillOpacity={0.6} />
              </g>
            )
          })}

          {/* L3 stars scattered */}
          {selectedL3s.slice(0, 20).map((l3, i) => {
            const angle = (i / Math.min(selectedL3s.length, 20)) * Math.PI * 2 - Math.PI / 2
            const r = 20 + Math.sin(i * 3.7) * 5
            const x = 50 + Math.cos(angle) * r
            const y = 25 + Math.sin(angle) * (r * 0.6)
            return (
              <circle
                key={l3.id}
                cx={Math.max(3, Math.min(97, x))}
                cy={Math.max(3, Math.min(47, y))}
                r={0.5}
                fill="#c7d2fe"
                fillOpacity={0.3}
              >
                <animate
                  attributeName="fill-opacity"
                  values="0.15;0.4;0.15"
                  dur={`${2 + (i % 3)}s`}
                  begin={`${(i * 0.3) % 2}s`}
                  repeatCount="indefinite"
                />
              </circle>
            )
          })}
        </svg>
      </div>

      {/* Goal breakdown */}
      <div className="relative space-y-4 max-w-xl mx-auto">
        {/* Supergiant */}
        <div
          className="rounded-xl p-4 flex items-center gap-3 overflow-hidden relative"
          style={{
            border: `1px solid ${hexToRgba(pathColor, 0.2)}`,
            background: `radial-gradient(ellipse at 20% 30%, ${hexToRgba(pathColor, 0.06)} 0%, transparent 60%)`,
            boxShadow: `0 0 20px ${hexToRgba(pathColor, 0.05)}`,
          }}
        >
          <div
            className="rounded-lg p-2"
            style={{
              background: hexToRgba(pathColor, 0.12),
              boxShadow: `0 0 12px ${hexToRgba(pathColor, 0.2)}`,
            }}
          >
            <Star className="size-5" style={{ color: pathColor }} />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>
              Supergiant
            </div>
            <div className="font-bold" style={{ color: "rgba(255,255,255,0.9)" }}>{selectedL1.title}</div>
          </div>
        </div>

        {/* Main Sequence */}
        {l2Goals.length > 0 && (
          <div className="space-y-2">
            <div
              className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider"
              style={{ color: hexToRgba(pathColor, 0.6) }}
            >
              <Trophy
                className="size-3.5"
                style={{ color: pathColor, filter: `drop-shadow(0 0 3px ${hexToRgba(pathColor, 0.4)})` }}
              />
              Main Sequence Stars
            </div>
            {l2Goals.map((g) => (
              <div
                key={g.templateId}
                className="flex items-center gap-3 rounded-lg p-3"
                style={{
                  border: `1px solid ${hexToRgba(pathColor, 0.06)}`,
                  background: hexToRgba(pathColor, 0.015),
                }}
              >
                <div
                  className="size-5 rounded-full flex items-center justify-center"
                  style={{
                    background: hexToRgba(pathColor, 0.12),
                    boxShadow: `0 0 6px ${hexToRgba(pathColor, 0.15)}`,
                  }}
                >
                  <Star className="size-2.5" style={{ color: pathColor }} />
                </div>
                <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>
                  {g.title}
                </span>
                {curveConfigs.has(g.templateId) && (
                  <span
                    className="text-[10px] ml-auto px-2 py-0.5 rounded-full"
                    style={{
                      background: "rgba(34,197,94,0.08)",
                      color: "#22c55e",
                      border: "1px solid rgba(34,197,94,0.15)",
                    }}
                  >
                    scanned
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Young stars by category */}
        {(Object.entries(l3ByCategory) as [GoalDisplayCategory, GoalCustomization[]][]).map(([cat, catGoals]) => {
          if (!catGoals || catGoals.length === 0) return null
          return (
            <div key={cat} className="space-y-2">
              <div
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider"
                style={{ color: "rgba(255,255,255,0.25)" }}
              >
                <Target className="size-3.5" style={{ color: "rgba(255,255,255,0.2)" }} />
                {CATEGORY_LABELS[cat] ?? cat}
              </div>
              {catGoals.map((g) => {
                const tmpl = selectedL3s.find((t) => t.id === g.templateId)
                const isRamp = tmpl?.templateType === "habit_ramp"
                return (
                  <div
                    key={g.templateId}
                    className="flex items-center gap-3 rounded-lg p-3"
                    style={{
                      border: "1px solid rgba(255,255,255,0.03)",
                      backgroundColor: "rgba(255,255,255,0.01)",
                    }}
                  >
                    <div
                      className="size-5 rounded flex items-center justify-center"
                      style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                    >
                      {isRamp ? (
                        <Repeat className="size-3" style={{ color: "rgba(255,255,255,0.25)" }} />
                      ) : (
                        <MilestoneIcon className="size-3" style={{ color: "rgba(255,255,255,0.25)" }} />
                      )}
                    </div>
                    <span className="text-sm flex-1" style={{ color: "rgba(255,255,255,0.6)" }}>
                      {g.title}
                    </span>
                    <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {g.targetValue}{isRamp ? "/wk" : ""}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div
        className="relative text-center space-y-4 py-6"
        style={{ borderTop: `1px solid ${hexToRgba(pathColor, 0.08)}` }}
      >
        <div
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium"
          style={{
            background: hexToRgba(pathColor, 0.08),
            color: pathColor,
            boxShadow: `0 0 16px ${hexToRgba(pathColor, 0.1)}`,
            textShadow: `0 0 8px ${hexToRgba(pathColor, 0.3)}`,
          }}
        >
          <Sparkles className="size-4" />
          Nebula charted
        </div>
        <p className="text-sm max-w-md mx-auto" style={{ color: "rgba(255,255,255,0.35)" }}>
          In the real app, this would create all {goals.length} goals and take you to your personalized dashboard. For this prototype, you can chart a new nebula.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            onClick={onStartOver}
            className="cursor-pointer"
            style={{
              borderColor: "rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.5)",
              backgroundColor: "transparent",
            }}
          >
            Chart a new nebula
          </Button>
          <Button
            disabled
            style={{
              backgroundColor: pathColor,
              opacity: 0.5,
              boxShadow: `0 0 12px ${hexToRgba(pathColor, 0.2)}`,
            }}
          >
            Create {goals.length} Goals (Demo)
          </Button>
        </div>
      </div>
    </div>
  )
}
