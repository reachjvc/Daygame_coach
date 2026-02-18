"use client"

import { useState, useMemo, useEffect } from "react"
import { Star, Sparkles, Trophy, Target, Repeat, Milestone as MilestoneIcon, Telescope } from "lucide-react"
import { Button } from "@/components/ui/button"
import { generateMilestoneLadder } from "@/src/goals/milestoneService"
import type { GoalTemplate, MilestoneLadderConfig, GoalDisplayCategory } from "@/src/goals/types"
import type { GoalCustomization } from "./StarCustomizer"

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

const goldColor = "#daa520"
const brassColor = "#cd853f"

interface OrreryCompleteProps {
  path: "one_person" | "abundance"
  selectedL1: GoalTemplate
  selectedL2s: GoalTemplate[]
  selectedL3s: GoalTemplate[]
  goals: GoalCustomization[]
  curveConfigs: Map<string, MilestoneLadderConfig>
  pathColor: string
  onStartOver: () => void
}

export function OrreryComplete({
  path,
  selectedL1,
  selectedL2s,
  selectedL3s,
  goals,
  curveConfigs,
  pathColor,
  onStartOver,
}: OrreryCompleteProps) {
  const constellationName = CONSTELLATION_NAMES[path] || "The Voyager"
  const [bgParticles, setBgParticles] = useState<{ id: number; x: number; y: number; size: number; opacity: number; delay: number }[]>([])

  useEffect(() => {
    setBgParticles(
      Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.2 + 0.03,
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

  const totalBodies = 1 + l2Goals.length + l3Goals.length
  const totalConnections = l2Goals.length + l3Goals.length

  return (
    <div className="relative space-y-8">
      {/* Background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {bgParticles.map((s) => (
          <div
            key={s.id}
            className="absolute rounded-full"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.size,
              height: s.size,
              backgroundColor: "#e8d5b0",
              opacity: s.opacity,
              animation: `orreryCompleteTwinkle ${2 + s.delay}s ease-in-out ${s.delay}s infinite`,
            }}
          />
        ))}
        <style>{`
          @keyframes orreryCompleteTwinkle {
            0%, 100% { opacity: 0.03; }
            50% { opacity: 0.18; }
          }
        `}</style>
      </div>

      {/* Hero summary */}
      <div className="relative text-center space-y-4 py-6">
        <div
          className="inline-flex items-center justify-center size-16 rounded-2xl mx-auto"
          style={{
            background: `linear-gradient(135deg, ${goldColor}20 0%, ${brassColor}15 100%)`,
            boxShadow: `0 0 30px ${goldColor}10`,
            border: `1px solid ${goldColor}25`,
          }}
        >
          <Sparkles className="size-8" style={{ color: goldColor }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "rgba(255,255,255,0.95)" }}>
            System Engaged
          </h1>
          <p className="mt-1 max-w-md mx-auto text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
            Your &quot;{constellationName}&quot; orrery is calibrated with {goals.length} celestial bodies to track your journey toward &quot;{selectedL1.title}&quot;.
          </p>
        </div>

        {/* Stats row — brass-framed */}
        <div
          className="inline-flex items-center justify-center gap-6 pt-2 px-6 py-3 rounded-xl"
          style={{
            border: `1px solid ${brassColor}15`,
            background: `${goldColor}04`,
          }}
        >
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: goldColor }}>{totalBodies}</div>
            <div className="text-xs" style={{ color: "rgba(205, 133, 63, 0.5)" }}>Bodies</div>
          </div>
          <div className="w-px h-8" style={{ backgroundColor: `${brassColor}15` }} />
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: brassColor }}>{totalConnections}</div>
            <div className="text-xs" style={{ color: "rgba(205, 133, 63, 0.5)" }}>Orbits</div>
          </div>
          <div className="w-px h-8" style={{ backgroundColor: `${brassColor}15` }} />
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: brassColor }}>{milestoneCount}</div>
            <div className="text-xs" style={{ color: "rgba(205, 133, 63, 0.5)" }}>Milestones</div>
          </div>
          <div className="w-px h-8" style={{ backgroundColor: `${brassColor}15` }} />
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: brassColor }}>{habitCount}</div>
            <div className="text-xs" style={{ color: "rgba(205, 133, 63, 0.5)" }}>Habits</div>
          </div>
        </div>

        {/* Tags */}
        <div className="flex items-center justify-center gap-4 pt-2">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
            style={{
              border: `1px solid ${goldColor}25`,
              background: `${goldColor}08`,
              color: goldColor,
            }}
          >
            <Star className="size-3" />
            {constellationName}
          </div>
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
            style={{
              border: `1px solid ${brassColor}25`,
              background: `${brassColor}08`,
              color: brassColor,
            }}
          >
            <Telescope className="size-3" />
            Brightest: {brightestStar}
          </div>
        </div>
      </div>

      {/* Mini orrery visualization */}
      <div
        className="relative rounded-2xl overflow-hidden max-w-xl mx-auto"
        style={{
          background: "radial-gradient(ellipse at center, #0d0d1f 0%, #080816 70%, #020208 100%)",
          border: `1px solid ${brassColor}15`,
          height: 200,
        }}
      >
        <svg viewBox="0 0 100 50" className="w-full h-full">
          <defs>
            <filter id="orrery-complete-glow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur" />
              <feFlood floodColor={goldColor} floodOpacity="0.5" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Decorative rings */}
          <circle cx="50" cy="25" r="10" fill="none" stroke={brassColor} strokeWidth="0.1" strokeOpacity="0.15" strokeDasharray="0.5,1" />
          <circle cx="50" cy="25" r="18" fill="none" stroke={brassColor} strokeWidth="0.08" strokeOpacity="0.1" strokeDasharray="0.5,1.5" />

          {/* Center star */}
          <circle cx={50} cy={25} r={3} fill={goldColor} fillOpacity={0.9} filter="url(#orrery-complete-glow)">
            <animate attributeName="r" values="2.5;3.5;2.5" dur="3s" repeatCount="indefinite" />
          </circle>

          {/* L2 stars in arc */}
          {selectedL2s.map((l2, i) => {
            const angle = (i / selectedL2s.length) * Math.PI * 2 - Math.PI / 2
            const x = 50 + Math.cos(angle) * 15
            const y = 25 + Math.sin(angle) * 10
            return (
              <g key={l2.id}>
                <line x1={50} y1={25} x2={x} y2={y} stroke={goldColor} strokeOpacity={0.2} strokeWidth={0.15} />
                <circle cx={x} cy={y} r={1.5} fill={brassColor} fillOpacity={0.7} />
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
                fill="#e8d5b0"
                fillOpacity={0.3}
              >
                <animate
                  attributeName="fill-opacity"
                  values="0.1;0.35;0.1"
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
        {/* Vision — brass frame */}
        <div
          className="relative rounded-xl p-4 flex items-center gap-3 overflow-hidden"
          style={{
            border: `2px solid ${goldColor}30`,
            backgroundColor: `${goldColor}05`,
            boxShadow: `0 0 15px ${goldColor}06`,
          }}
        >
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2" style={{ borderColor: `${brassColor}30` }} />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2" style={{ borderColor: `${brassColor}30` }} />

          <div className="rounded-lg p-2" style={{ backgroundColor: `${goldColor}15` }}>
            <Star className="size-5" style={{ color: goldColor }} />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(205, 133, 63, 0.5)" }}>Polar Star</div>
            <div className="font-bold" style={{ color: "rgba(255,255,255,0.9)" }}>{selectedL1.title}</div>
          </div>
        </div>

        {/* Achievements */}
        {l2Goals.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(205, 133, 63, 0.5)" }}>
              <Trophy className="size-3.5" style={{ color: goldColor }} />
              Inner Orbit
            </div>
            {l2Goals.map((g) => (
              <div
                key={g.templateId}
                className="flex items-center gap-3 rounded-lg p-3"
                style={{ border: `1px solid ${brassColor}08` }}
              >
                <div className="size-5 rounded-full flex items-center justify-center" style={{ backgroundColor: `${goldColor}15` }}>
                  <Star className="size-2.5" style={{ color: goldColor }} />
                </div>
                <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>{g.title}</span>
                {curveConfigs.has(g.templateId) && (
                  <span className="text-[10px] ml-auto px-2 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
                    plotted
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
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(205, 133, 63, 0.4)" }}>
                <Target className="size-3.5" style={{ color: "rgba(205, 133, 63, 0.35)" }} />
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
                      border: `1px solid rgba(205, 133, 63, 0.05)`,
                      backgroundColor: "rgba(205, 133, 63, 0.02)",
                    }}
                  >
                    <div className="size-5 rounded flex items-center justify-center" style={{ backgroundColor: "rgba(205, 133, 63, 0.06)" }}>
                      {isRamp
                        ? <Repeat className="size-3" style={{ color: "rgba(205, 133, 63, 0.4)" }} />
                        : <MilestoneIcon className="size-3" style={{ color: "rgba(205, 133, 63, 0.4)" }} />
                      }
                    </div>
                    <span className="text-sm flex-1" style={{ color: "rgba(255,255,255,0.7)" }}>{g.title}</span>
                    <span className="text-xs font-medium" style={{ color: "rgba(205, 133, 63, 0.5)" }}>
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
      <div className="relative text-center space-y-4 py-6" style={{ borderTop: `1px solid ${brassColor}10` }}>
        <div
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium"
          style={{ backgroundColor: `${goldColor}12`, color: goldColor, border: `1px solid ${goldColor}20` }}
        >
          <Sparkles className="size-4" />
          Orrery engaged
        </div>
        <p className="text-sm max-w-md mx-auto" style={{ color: "rgba(255,255,255,0.4)" }}>
          In the real app, this would create all {goals.length} goals and take you to your personalized dashboard. For this prototype, you can chart a new system.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            onClick={onStartOver}
            style={{
              borderColor: `${brassColor}20`,
              color: "rgba(205, 133, 63, 0.6)",
              backgroundColor: "transparent",
            }}
          >
            Chart a new system
          </Button>
          <Button
            disabled
            style={{ backgroundColor: goldColor, color: "#0a0a1a", opacity: 0.5 }}
          >
            Create {goals.length} Goals (Demo)
          </Button>
        </div>
      </div>
    </div>
  )
}
