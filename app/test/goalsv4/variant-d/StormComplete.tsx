"use client"

import { useState, useMemo, useEffect } from "react"
import { Zap, Trophy, Target, Repeat, Milestone as MilestoneIcon, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { generateMilestoneLadder } from "@/src/goals/milestoneService"
import type { GoalTemplate, MilestoneLadderConfig, GoalDisplayCategory } from "@/src/goals/types"
import type { GoalCustomization } from "./StormCustomizer"

const CATEGORY_LABELS: Partial<Record<GoalDisplayCategory, string>> = {
  field_work: "Field Work",
  results: "Results",
  dirty_dog: "Dirty Dog",
  texting: "Texting Game",
  dates: "Dating",
  relationship: "Relationship",
}

const STORM_NAMES: Record<string, string> = {
  one_person: "Storm Solaris",
  abundance: "Storm Nebula",
}

const PATH_STORM = {
  one_person: {
    primary: "#ff4d4d",
    secondary: "#ff8c1a",
    gradient: "linear-gradient(135deg, #ff4d4d 0%, #ff8c1a 100%)",
    glow: "rgba(255, 77, 77, 0.15)",
    glowBright: "rgba(255, 77, 77, 0.45)",
  },
  abundance: {
    primary: "#d946ef",
    secondary: "#ec4899",
    gradient: "linear-gradient(135deg, #d946ef 0%, #ec4899 100%)",
    glow: "rgba(217, 70, 239, 0.15)",
    glowBright: "rgba(217, 70, 239, 0.45)",
  },
}

interface StormCompleteProps {
  path: "one_person" | "abundance"
  selectedL1: GoalTemplate
  selectedL2s: GoalTemplate[]
  selectedL3s: GoalTemplate[]
  goals: GoalCustomization[]
  curveConfigs: Map<string, MilestoneLadderConfig>
  onStartOver: () => void
}

export function StormComplete({
  path,
  selectedL1,
  selectedL2s,
  selectedL3s,
  goals,
  curveConfigs,
  onStartOver,
}: StormCompleteProps) {
  const storm = PATH_STORM[path]
  const stormName = STORM_NAMES[path] ?? "Storm Voyager"
  const [bgParticles, setBgParticles] = useState<{ id: number; x: number; y: number; size: number; opacity: number; delay: number }[]>([])

  useEffect(() => {
    setBgParticles(
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

  const hottest = useMemo(() => {
    let maxSteps = 0
    let brightest = ""
    for (const [id, config] of curveConfigs) {
      const milestones = generateMilestoneLadder(config)
      if (milestones.length > maxSteps) {
        maxSteps = milestones.length
        const tmpl = [...selectedL2s, ...selectedL3s].find((t) => t.id === id)
        brightest = tmpl?.title ?? id
      }
    }
    return brightest || selectedL1.title
  }, [curveConfigs, selectedL1, selectedL2s, selectedL3s])

  const totalNodes = 1 + l2Goals.length + l3Goals.length
  const totalFields = l2Goals.length + l3Goals.length

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
              backgroundColor: s.id % 3 === 0 ? storm.primary : "#ffe4cc",
              opacity: s.opacity,
              animation: `completeTwinkleStorm ${2 + s.delay}s ease-in-out ${s.delay}s infinite`,
            }}
          />
        ))}
        <style>{`
          @keyframes completeTwinkleStorm {
            0%, 100% { opacity: 0.05; }
            50% { opacity: 0.25; }
          }
        `}</style>
      </div>

      {/* Hero summary */}
      <div className="relative text-center space-y-4 py-6">
        {/* Storm glow icon */}
        <div
          className="inline-flex items-center justify-center size-16 rounded-2xl mx-auto"
          style={{
            background: `linear-gradient(135deg, ${storm.primary}20 0%, ${storm.secondary}18 100%)`,
            boxShadow: `0 0 40px ${storm.glow}, 0 0 80px ${storm.glow}`,
          }}
        >
          <Zap className="size-8" style={{ color: storm.primary }} />
        </div>

        <div>
          <h1 className="text-2xl font-extralight tracking-wide" style={{ color: "rgba(255,255,255,0.95)" }}>
            Storm Activated
          </h1>
          <p
            className="mt-2 max-w-md mx-auto text-sm font-light leading-relaxed"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            Your &ldquo;{stormName}&rdquo; is charged with {goals.length} energy nodes tracking your journey toward &ldquo;{selectedL1.title}&rdquo;.
          </p>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-center gap-6 pt-2">
          <div className="text-center">
            <div className="text-2xl font-extralight" style={{ color: storm.primary }}>{totalNodes}</div>
            <div className="text-xs font-light" style={{ color: "rgba(255,255,255,0.35)" }}>Nodes</div>
          </div>
          <div className="w-px h-8" style={{ background: `linear-gradient(180deg, transparent, ${storm.primary}25, transparent)` }} />
          <div className="text-center">
            <div className="text-2xl font-extralight" style={{ color: storm.secondary }}>{totalFields}</div>
            <div className="text-xs font-light" style={{ color: "rgba(255,255,255,0.35)" }}>Fields</div>
          </div>
          <div className="w-px h-8" style={{ background: `linear-gradient(180deg, transparent, ${storm.primary}25, transparent)` }} />
          <div className="text-center">
            <div className="text-2xl font-extralight" style={{ color: storm.secondary }}>{milestoneCount}</div>
            <div className="text-xs font-light" style={{ color: "rgba(255,255,255,0.35)" }}>Milestones</div>
          </div>
          <div className="w-px h-8" style={{ background: `linear-gradient(180deg, transparent, ${storm.primary}25, transparent)` }} />
          <div className="text-center">
            <div className="text-2xl font-extralight" style={{ color: storm.secondary }}>{habitCount}</div>
            <div className="text-xs font-light" style={{ color: "rgba(255,255,255,0.35)" }}>Habits</div>
          </div>
        </div>

        {/* Storm name + hottest node */}
        <div className="flex items-center justify-center gap-4 pt-2 flex-wrap">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-light"
            style={{
              border: `1px solid ${storm.primary}25`,
              background: `${storm.primary}08`,
              color: storm.primary,
            }}
          >
            <Zap className="size-3" />
            {stormName}
          </div>
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-light"
            style={{
              border: `1px solid ${storm.secondary}25`,
              background: `${storm.secondary}08`,
              color: storm.secondary,
            }}
          >
            <Eye className="size-3" />
            Hottest: {hottest}
          </div>
        </div>
      </div>

      {/* Mini storm visualization */}
      <div
        className="relative rounded-2xl overflow-hidden max-w-xl mx-auto"
        style={{
          background: "linear-gradient(180deg, #0a0408 0%, #120610 50%, #0a0408 100%)",
          border: `1px solid ${storm.primary}15`,
          height: 180,
        }}
      >
        {/* Storm glow */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 50% 30%, ${storm.primary}14 0%, transparent 60%)`,
            animation: "completeMiniStormGlow 5s ease-in-out infinite",
          }}
        />

        <svg viewBox="0 0 100 45" className="w-full h-full relative" style={{ zIndex: 1 }}>
          <defs>
            <filter id="complete-storm-glow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="0.9" result="blur" />
              <feFlood floodColor={storm.primary} floodOpacity="0.6" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Center bright node (L1) */}
          <circle cx={50} cy={18} r={2.5} fill={storm.primary} fillOpacity={0.95} filter="url(#complete-storm-glow)">
            <animate attributeName="r" values="2;3.2;2" dur="3s" repeatCount="indefinite" />
          </circle>

          {/* L2 nodes in arc */}
          {selectedL2s.map((l2, i) => {
            const angle = (i / Math.max(1, selectedL2s.length - 1)) * Math.PI - Math.PI * 0.5
            const x = 50 + Math.cos(angle + Math.PI / 2) * 15
            const y = 18 + Math.sin(angle + Math.PI / 2) * 8
            return (
              <g key={l2.id}>
                <line x1={50} y1={18} x2={x} y2={y} stroke={storm.secondary} strokeOpacity={0.18} strokeWidth={0.12} />
                <circle cx={x} cy={y} r={1.2} fill={storm.secondary} fillOpacity={0.7}>
                  <animate
                    attributeName="fill-opacity"
                    values="0.5;0.85;0.5"
                    dur={`${2.5 + i * 0.5}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              </g>
            )
          })}

          {/* L3 scattered particles */}
          {selectedL3s.slice(0, 25).map((l3, i) => {
            const angle = (i / Math.min(selectedL3s.length, 25)) * Math.PI * 2
            const r = 18 + Math.sin(i * 2.7) * 5
            const x = 50 + Math.cos(angle) * r
            const y = 22 + Math.sin(angle) * (r * 0.45)
            return (
              <circle
                key={l3.id}
                cx={Math.max(4, Math.min(96, x))}
                cy={Math.max(4, Math.min(42, y))}
                r={0.5}
                fill={i % 2 === 0 ? storm.primary : storm.secondary}
                fillOpacity={0.3}
              >
                <animate
                  attributeName="fill-opacity"
                  values="0.1;0.4;0.1"
                  dur={`${1.5 + (i % 3)}s`}
                  begin={`${(i * 0.2) % 2}s`}
                  repeatCount="indefinite"
                />
              </circle>
            )
          })}

          {/* Horizon silhouette */}
          <path
            d="M0,45 L0,38 L10,35 L20,37 L30,33 L40,36 L50,30 L60,34 L70,31 L80,35 L90,32 L100,36 L100,45 Z"
            fill="#0a0408"
          />
        </svg>

        <style>{`
          @keyframes completeMiniStormGlow {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 0.85; }
          }
        `}</style>
      </div>

      {/* Goal breakdown */}
      <div className="relative space-y-4 max-w-xl mx-auto">
        {/* Vision / solar flare */}
        <div
          className="rounded-xl p-4 flex items-center gap-3 relative overflow-hidden"
          style={{
            border: `1px solid ${storm.primary}25`,
            background: `${storm.primary}04`,
            boxShadow: `0 0 20px ${storm.glow}`,
          }}
        >
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background: `linear-gradient(135deg, ${storm.primary}08 0%, transparent 60%)`,
            }}
          />
          <div className="relative rounded-lg p-2" style={{ background: `${storm.primary}12` }}>
            <div
              className="size-5 rounded-full"
              style={{ background: storm.gradient, boxShadow: `0 0 8px ${storm.glowBright}` }}
            />
          </div>
          <div className="relative">
            <div className="text-[10px] font-light uppercase tracking-[0.15em]" style={{ color: "rgba(255,255,255,0.35)" }}>
              Solar Flare
            </div>
            <div className="font-light tracking-wide" style={{ color: "rgba(255,255,255,0.9)" }}>
              {selectedL1.title}
            </div>
          </div>
        </div>

        {/* Achievements */}
        {l2Goals.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-light uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.35)" }}>
              <Trophy className="size-3.5 text-amber-400/60" />
              Field Lines
            </div>
            {l2Goals.map((g) => (
              <div
                key={g.templateId}
                className="flex items-center gap-3 rounded-lg p-3"
                style={{ border: "1px solid rgba(255,255,255,0.04)" }}
              >
                <div
                  className="size-5 rounded-full flex items-center justify-center"
                  style={{ background: `${storm.secondary}15` }}
                >
                  <div className="size-2 rounded-full" style={{ backgroundColor: storm.secondary }} />
                </div>
                <span className="text-sm font-light" style={{ color: "rgba(255,255,255,0.75)" }}>{g.title}</span>
                {curveConfigs.has(g.templateId) && (
                  <span
                    className="text-[10px] ml-auto px-2 py-0.5 rounded-full font-light"
                    style={{ background: "rgba(255, 215, 0, 0.08)", color: "#ffd700" }}
                  >
                    observed
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
              <div className="flex items-center gap-2 text-xs font-light uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.3)" }}>
                <Target className="size-3.5" style={{ color: "rgba(255,255,255,0.25)" }} />
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
                      background: "rgba(255,255,255,0.01)",
                    }}
                  >
                    <div className="size-5 rounded flex items-center justify-center" style={{ background: "rgba(255,255,255,0.03)" }}>
                      {isRamp
                        ? <Repeat className="size-3" style={{ color: "rgba(255,255,255,0.3)" }} />
                        : <MilestoneIcon className="size-3" style={{ color: "rgba(255,255,255,0.3)" }} />
                      }
                    </div>
                    <span className="text-sm flex-1 font-light" style={{ color: "rgba(255,255,255,0.65)" }}>{g.title}</span>
                    <span className="text-xs font-light" style={{ color: "rgba(255,255,255,0.35)" }}>
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
        style={{ borderTop: `1px solid rgba(255,255,255,0.04)` }}
      >
        <div
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-light tracking-wide"
          style={{ background: `${storm.primary}10`, color: storm.primary }}
        >
          <Zap className="size-4" />
          Storm activated
        </div>
        <p className="text-sm max-w-md mx-auto font-light" style={{ color: "rgba(255,255,255,0.35)" }}>
          In the real app, this would create all {goals.length} goals and take you to your personalized dashboard. For this prototype, you can ignite a new storm.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            onClick={onStartOver}
            className="font-light"
            style={{
              borderColor: "rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.5)",
              backgroundColor: "transparent",
            }}
          >
            Ignite a new storm
          </Button>
          <Button
            disabled
            className="font-light"
            style={{ background: storm.gradient, opacity: 0.5 }}
          >
            Create {goals.length} Goals (Demo)
          </Button>
        </div>
      </div>
    </div>
  )
}
