"use client"

import { useState, useMemo, useEffect } from "react"
import { Star, Sparkles, Trophy, Target, Repeat, Milestone as MilestoneIcon, Telescope } from "lucide-react"
import { Button } from "@/components/ui/button"
import { generateMilestoneLadder } from "@/src/goals/milestoneService"
import type { GoalTemplate, MilestoneLadderConfig, GoalDisplayCategory } from "@/src/goals/types"
import type { GoalCustomization } from "./GoalCustomizer"

const CATEGORY_LABELS: Partial<Record<GoalDisplayCategory, string>> = {
  field_work: "Field Work",
  results: "Results",
  dirty_dog: "Dirty Dog",
  texting: "Texting Game",
  dates: "Dating",
  relationship: "Relationship",
}

const CONSTELLATION_NAMES: Record<string, string> = {
  one_person: "The Seeker",
  abundance: "The Explorer",
}

interface ConstellationCompleteProps {
  path: "one_person" | "abundance"
  selectedL1: GoalTemplate
  selectedL2s: GoalTemplate[]
  selectedL3s: GoalTemplate[]
  goals: GoalCustomization[]
  curveConfigs: Map<string, MilestoneLadderConfig>
  pathColor: string
  onStartOver: () => void
}

export function ConstellationComplete({
  path,
  selectedL1,
  selectedL2s,
  selectedL3s,
  goals,
  curveConfigs,
  pathColor,
  onStartOver,
}: ConstellationCompleteProps) {
  const constellationName = CONSTELLATION_NAMES[path] || "The Voyager"
  const [bgStars, setBgStars] = useState<{ id: number; x: number; y: number; size: number; opacity: number; delay: number }[]>([])

  useEffect(() => {
    setBgStars(
      Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.3 + 0.05,
        delay: Math.random() * 4,
      }))
    )
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

  // Find "brightest star" (most milestones configured)
  const brightestStar = useMemo(() => {
    let maxSteps = 0
    let brightest = ""
    for (const [id, config] of curveConfigs) {
      const milestones = generateMilestoneLadder(config)
      if (milestones.length > maxSteps) {
        maxSteps = milestones.length
        const tmpl = [...selectedL2s, ...selectedL3s].find(t => t.id === id)
        brightest = tmpl?.title || id
      }
    }
    return brightest || selectedL1.title
  }, [curveConfigs, selectedL1, selectedL2s, selectedL3s])

  const totalStars = 1 + l2Goals.length + l3Goals.length
  const totalConnections = l2Goals.length + l3Goals.length // approximate

  return (
    <div className="relative space-y-8">
      {/* Background stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {bgStars.map((s) => (
          <div
            key={s.id}
            className="absolute rounded-full"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.size,
              height: s.size,
              backgroundColor: "#e0e7ff",
              opacity: s.opacity,
              animation: `completeTwinkle ${2 + s.delay}s ease-in-out ${s.delay}s infinite`,
            }}
          />
        ))}
        <style>{`
          @keyframes completeTwinkle {
            0%, 100% { opacity: 0.05; }
            50% { opacity: 0.25; }
          }
        `}</style>
      </div>

      {/* Hero summary */}
      <div className="relative text-center space-y-4 py-6">
        <div
          className="inline-flex items-center justify-center size-16 rounded-2xl mx-auto"
          style={{
            background: `linear-gradient(135deg, ${pathColor}20 0%, rgba(124,58,237,0.2) 100%)`,
            boxShadow: `0 0 30px ${pathColor}15`,
          }}
        >
          <Sparkles className="size-8" style={{ color: pathColor }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "rgba(255,255,255,0.95)" }}>
            Constellation Charted
          </h1>
          <p className="mt-1 max-w-md mx-auto text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
            Your "{constellationName}" constellation is set with {goals.length} stars to track your journey toward "{selectedL1.title}".
          </p>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-center gap-6 pt-2">
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: pathColor }}>{totalStars}</div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Stars</div>
          </div>
          <div className="w-px h-8" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: "#a78bfa" }}>{totalConnections}</div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Connections</div>
          </div>
          <div className="w-px h-8" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: "#a78bfa" }}>{milestoneCount}</div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Milestones</div>
          </div>
          <div className="w-px h-8" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: "#a78bfa" }}>{habitCount}</div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Habits</div>
          </div>
        </div>

        {/* Constellation name + brightest star */}
        <div className="flex items-center justify-center gap-4 pt-2">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
            style={{
              border: "1px solid rgba(124,58,237,0.2)",
              background: "rgba(124,58,237,0.08)",
              color: "#a78bfa",
            }}
          >
            <Star className="size-3" />
            {constellationName}
          </div>
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
            style={{
              border: `1px solid ${pathColor}30`,
              background: `${pathColor}08`,
              color: pathColor,
            }}
          >
            <Telescope className="size-3" />
            Brightest: {brightestStar}
          </div>
        </div>
      </div>

      {/* Mini constellation visualization */}
      <div
        className="relative rounded-2xl overflow-hidden max-w-xl mx-auto"
        style={{
          background: "radial-gradient(ellipse at center, #0a0f1a 0%, #030712 70%, #000000 100%)",
          border: "1px solid rgba(124,58,237,0.15)",
          height: 200,
        }}
      >
        <svg viewBox="0 0 100 50" className="w-full h-full">
          {/* Simplified constellation view */}
          {/* Center star */}
          <circle cx={50} cy={25} r={3} fill={pathColor} fillOpacity={0.9} filter="url(#complete-glow)">
            <animate attributeName="r" values="2.5;3.5;2.5" dur="3s" repeatCount="indefinite" />
          </circle>
          <defs>
            <filter id="complete-glow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur" />
              <feFlood floodColor={pathColor} floodOpacity="0.5" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* L2 stars in arc */}
          {selectedL2s.map((l2, i) => {
            const angle = (i / selectedL2s.length) * Math.PI * 2 - Math.PI / 2
            const x = 50 + Math.cos(angle) * 15
            const y = 25 + Math.sin(angle) * 10
            return (
              <g key={l2.id}>
                <line x1={50} y1={25} x2={x} y2={y} stroke="#a78bfa" strokeOpacity={0.2} strokeWidth={0.15} />
                <circle cx={x} cy={y} r={1.5} fill="#a78bfa" fillOpacity={0.7} />
              </g>
            )
          })}

          {/* L3 stars scattered */}
          {selectedL3s.slice(0, 20).map((l3, i) => {
            const angle = (i / Math.min(selectedL3s.length, 20)) * Math.PI * 2 - Math.PI / 2
            const r = 20 + (Math.sin(i * 3.7) * 5)
            const x = 50 + Math.cos(angle) * r
            const y = 25 + Math.sin(angle) * (r * 0.6)
            return (
              <circle
                key={l3.id}
                cx={Math.max(3, Math.min(97, x))}
                cy={Math.max(3, Math.min(47, y))}
                r={0.6}
                fill="#e0e7ff"
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
        {/* Vision */}
        <div
          className="rounded-xl p-4 flex items-center gap-3"
          style={{
            border: `2px solid ${pathColor}30`,
            backgroundColor: `${pathColor}05`,
            boxShadow: `0 0 15px ${pathColor}08`,
          }}
        >
          <div className="rounded-lg p-2" style={{ backgroundColor: `${pathColor}15` }}>
            <Star className="size-5" style={{ color: pathColor }} />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>North Star</div>
            <div className="font-bold" style={{ color: "rgba(255,255,255,0.9)" }}>{selectedL1.title}</div>
          </div>
        </div>

        {/* Achievements */}
        {l2Goals.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>
              <Trophy className="size-3.5 text-amber-400" />
              Constellation Points
            </div>
            {l2Goals.map((g) => (
              <div
                key={g.templateId}
                className="flex items-center gap-3 rounded-lg p-3"
                style={{ border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="size-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(124,58,237,0.15)" }}>
                  <Star className="size-2.5" style={{ color: "#a78bfa" }} />
                </div>
                <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>{g.title}</span>
                {curveConfigs.has(g.templateId) && (
                  <span className="text-[10px] ml-auto px-2 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
                    charted
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Trackable goals by category */}
        {(Object.entries(l3ByCategory) as [GoalDisplayCategory, GoalCustomization[]][]).map(([cat, catGoals]) => {
          if (!catGoals || catGoals.length === 0) return null
          return (
            <div key={cat} className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>
                <Target className="size-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />
                {CATEGORY_LABELS[cat]}
              </div>
              {catGoals.map((g) => {
                const tmpl = selectedL3s.find((t) => t.id === g.templateId)
                const isRamp = tmpl?.templateType === "habit_ramp"
                return (
                  <div
                    key={g.templateId}
                    className="flex items-center gap-3 rounded-lg p-3"
                    style={{
                      border: "1px solid rgba(255,255,255,0.04)",
                      backgroundColor: "rgba(255,255,255,0.015)",
                    }}
                  >
                    <div className="size-5 rounded flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
                      {isRamp
                        ? <Repeat className="size-3" style={{ color: "rgba(255,255,255,0.35)" }} />
                        : <MilestoneIcon className="size-3" style={{ color: "rgba(255,255,255,0.35)" }} />
                      }
                    </div>
                    <span className="text-sm flex-1" style={{ color: "rgba(255,255,255,0.7)" }}>{g.title}</span>
                    <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
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
      <div className="relative text-center space-y-4 py-6" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium"
          style={{ backgroundColor: `${pathColor}12`, color: pathColor }}
        >
          <Sparkles className="size-4" />
          Constellation charted
        </div>
        <p className="text-sm max-w-md mx-auto" style={{ color: "rgba(255,255,255,0.4)" }}>
          In the real app, this would create all {goals.length} goals and take you to your personalized dashboard. For this prototype, you can start a new constellation.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            onClick={onStartOver}
            style={{
              borderColor: "rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.6)",
              backgroundColor: "transparent",
            }}
          >
            Start a new constellation
          </Button>
          <Button
            disabled
            style={{ backgroundColor: pathColor, opacity: 0.5 }}
          >
            Create {goals.length} Goals (Demo)
          </Button>
        </div>
      </div>
    </div>
  )
}
