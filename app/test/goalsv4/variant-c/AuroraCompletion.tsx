"use client"

import { useState, useMemo, useEffect } from "react"
import { Sparkles, Trophy, Target, Repeat, Milestone as MilestoneIcon, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { generateMilestoneLadder } from "@/src/goals/milestoneService"
import type { GoalTemplate, MilestoneLadderConfig, GoalDisplayCategory } from "@/src/goals/types"
import type { GoalCustomization } from "../VariantC"

const CATEGORY_LABELS: Partial<Record<GoalDisplayCategory, string>> = {
  field_work: "Field Work",
  results: "Results",
  dirty_dog: "Dirty Dog",
  texting: "Texting Game",
  dates: "Dating",
  relationship: "Relationship",
}

const AURORA_NAMES: Record<string, string> = {
  one_person: "Aurora Seekaris",
  abundance: "Aurora Abundantia",
}

const PATH_AURORA = {
  one_person: {
    primary: "#4ade80",
    secondary: "#22d3ee",
    gradient: "linear-gradient(135deg, #4ade80 0%, #22d3ee 100%)",
    glow: "rgba(74, 222, 128, 0.15)",
    glowBright: "rgba(74, 222, 128, 0.4)",
  },
  abundance: {
    primary: "#e879f9",
    secondary: "#a78bfa",
    gradient: "linear-gradient(135deg, #e879f9 0%, #a78bfa 100%)",
    glow: "rgba(232, 121, 249, 0.15)",
    glowBright: "rgba(232, 121, 249, 0.4)",
  },
}

interface AuroraCompletionProps {
  path: "one_person" | "abundance"
  selectedL1: GoalTemplate
  selectedL2s: GoalTemplate[]
  selectedL3s: GoalTemplate[]
  goals: GoalCustomization[]
  curveConfigs: Map<string, MilestoneLadderConfig>
  onStartOver: () => void
}

export function AuroraCompletion({
  path,
  selectedL1,
  selectedL2s,
  selectedL3s,
  goals,
  curveConfigs,
  onStartOver,
}: AuroraCompletionProps) {
  const aurora = PATH_AURORA[path]
  const auroraName = AURORA_NAMES[path] ?? "Aurora Voyager"
  const [bgStars, setBgStars] = useState<{ id: number; x: number; y: number; size: number; opacity: number; delay: number }[]>([])

  useEffect(() => {
    setBgStars(
      Array.from({ length: 55 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.25 + 0.05,
        delay: Math.random() * 4,
      }))
    )
  }, [])

  const l2Goals = goals.filter((g) => g.level === 2)
  const l3Goals = goals.filter((g) => g.level === 3)

  const l3ByCategory = useMemo(() => {
    const grouped: Record<string, GoalCustomization[]> = {}
    for (const g of l3Goals) {
      const cat = g.displayCategory || "field_work"
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(g)
    }
    return grouped as Partial<Record<GoalDisplayCategory, GoalCustomization[]>>
  }, [l3Goals])

  const milestoneCount = l3Goals.filter((g) => g.templateType === "milestone_ladder").length
  const habitCount = l3Goals.filter((g) => g.templateType === "habit_ramp").length

  const brightestLight = useMemo(() => {
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

  const totalLights = 1 + l2Goals.length + l3Goals.length
  const totalRibbons = l2Goals.length + l3Goals.length

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
            50% { opacity: 0.22; }
          }
        `}</style>
      </div>

      {/* Hero */}
      <div className="relative text-center space-y-4 py-6">
        {/* Glow icon */}
        <div
          className="inline-flex items-center justify-center size-16 rounded-2xl mx-auto"
          style={{
            background: `linear-gradient(135deg, ${aurora.primary}15 0%, ${aurora.secondary}15 100%)`,
            boxShadow: `0 0 40px ${aurora.glow}, 0 0 80px ${aurora.glow}`,
          }}
        >
          <Sparkles className="size-8" style={{ color: aurora.primary }} />
        </div>

        <div>
          <h1 className="text-2xl font-extralight tracking-wide" style={{ color: "rgba(255,255,255,0.95)" }}>
            Aurora Illuminated
          </h1>
          <p
            className="mt-2 max-w-md mx-auto text-sm font-light leading-relaxed"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            Your &ldquo;{auroraName}&rdquo; is set with {goals.length} lights tracking your journey toward &ldquo;{selectedL1.title}&rdquo;.
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-6 pt-2">
          <div className="text-center">
            <div className="text-2xl font-extralight" style={{ color: aurora.primary }}>{totalLights}</div>
            <div className="text-xs font-light" style={{ color: "rgba(255,255,255,0.3)" }}>Lights</div>
          </div>
          <div className="w-px h-8" style={{ background: `linear-gradient(180deg, transparent, ${aurora.primary}18, transparent)` }} />
          <div className="text-center">
            <div className="text-2xl font-extralight" style={{ color: aurora.secondary }}>{totalRibbons}</div>
            <div className="text-xs font-light" style={{ color: "rgba(255,255,255,0.3)" }}>Ribbons</div>
          </div>
          <div className="w-px h-8" style={{ background: `linear-gradient(180deg, transparent, ${aurora.primary}18, transparent)` }} />
          <div className="text-center">
            <div className="text-2xl font-extralight" style={{ color: aurora.secondary }}>{milestoneCount}</div>
            <div className="text-xs font-light" style={{ color: "rgba(255,255,255,0.3)" }}>Milestones</div>
          </div>
          <div className="w-px h-8" style={{ background: `linear-gradient(180deg, transparent, ${aurora.primary}18, transparent)` }} />
          <div className="text-center">
            <div className="text-2xl font-extralight" style={{ color: aurora.secondary }}>{habitCount}</div>
            <div className="text-xs font-light" style={{ color: "rgba(255,255,255,0.3)" }}>Habits</div>
          </div>
        </div>

        {/* Tags */}
        <div className="flex items-center justify-center gap-4 pt-2 flex-wrap">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-light"
            style={{
              border: `1px solid ${aurora.primary}18`,
              background: `${aurora.primary}06`,
              color: aurora.primary,
            }}
          >
            <Sparkles className="size-3" />
            {auroraName}
          </div>
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-light"
            style={{
              border: `1px solid ${aurora.secondary}18`,
              background: `${aurora.secondary}06`,
              color: aurora.secondary,
            }}
          >
            <Eye className="size-3" />
            Brightest: {brightestLight}
          </div>
        </div>
      </div>

      {/* Mini aurora visualization */}
      <div
        className="relative rounded-2xl overflow-hidden max-w-xl mx-auto"
        style={{
          background: "linear-gradient(180deg, #020815 0%, #030a18 50%, #020815 100%)",
          border: `1px solid ${aurora.primary}10`,
          height: 180,
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 50% 30%, ${aurora.primary}10 0%, transparent 60%)`,
            animation: "completeMiniGlow 6s ease-in-out infinite",
          }}
        />

        <svg viewBox="0 0 100 45" className="w-full h-full relative" style={{ zIndex: 1 }}>
          <defs>
            <filter id="complete-glow-v4c">
              <feGaussianBlur in="SourceAlpha" stdDeviation="0.8" result="blur" />
              <feFlood floodColor={aurora.primary} floodOpacity="0.5" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Center (L1) */}
          <circle cx={50} cy={18} r={2.5} fill={aurora.primary} fillOpacity={0.9} filter="url(#complete-glow-v4c)">
            <animate attributeName="r" values="2;3;2" dur="4s" repeatCount="indefinite" />
          </circle>

          {/* L2 arc */}
          {selectedL2s.map((l2, i) => {
            const angle = (i / Math.max(1, selectedL2s.length - 1)) * Math.PI - Math.PI * 0.5
            const x = 50 + Math.cos(angle + Math.PI / 2) * 15
            const y = 18 + Math.sin(angle + Math.PI / 2) * 8
            return (
              <g key={l2.id}>
                <line x1={50} y1={18} x2={x} y2={y} stroke={aurora.secondary} strokeOpacity={0.12} strokeWidth={0.1} />
                <circle cx={x} cy={y} r={1.2} fill={aurora.secondary} fillOpacity={0.6}>
                  <animate
                    attributeName="fill-opacity"
                    values="0.4;0.7;0.4"
                    dur={`${3 + i * 0.5}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              </g>
            )
          })}

          {/* L3 glow points */}
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
                fill={i % 2 === 0 ? aurora.primary : aurora.secondary}
                fillOpacity={0.2}
              >
                <animate
                  attributeName="fill-opacity"
                  values="0.08;0.3;0.08"
                  dur={`${2 + (i % 3)}s`}
                  begin={`${(i * 0.2) % 2}s`}
                  repeatCount="indefinite"
                />
              </circle>
            )
          })}

          {/* Mountains */}
          <path
            d="M0,45 L0,38 L10,35 L20,37 L30,33 L40,36 L50,30 L60,34 L70,31 L80,35 L90,32 L100,36 L100,45 Z"
            fill="#020815"
          />
        </svg>

        <style>{`
          @keyframes completeMiniGlow {
            0%, 100% { opacity: 0.45; }
            50% { opacity: 0.75; }
          }
        `}</style>
      </div>

      {/* Goal breakdown */}
      <div className="relative space-y-4 max-w-xl mx-auto">
        {/* Brightest band */}
        <div
          className="rounded-xl p-4 flex items-center gap-3 relative overflow-hidden"
          style={{
            border: `1px solid ${aurora.primary}20`,
            background: `${aurora.primary}03`,
            boxShadow: `0 0 20px ${aurora.glow}`,
          }}
        >
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background: `linear-gradient(135deg, ${aurora.primary}06 0%, transparent 60%)`,
            }}
          />
          <div className="relative rounded-lg p-2" style={{ background: `${aurora.primary}10` }}>
            <div
              className="size-5 rounded-full"
              style={{ background: aurora.gradient, boxShadow: `0 0 8px ${aurora.glowBright}` }}
            />
          </div>
          <div className="relative">
            <div className="text-[10px] font-light uppercase tracking-[0.15em]" style={{ color: "rgba(255,255,255,0.3)" }}>
              Brightest Band
            </div>
            <div className="font-light tracking-wide" style={{ color: "rgba(255,255,255,0.9)" }}>
              {selectedL1.title}
            </div>
          </div>
        </div>

        {/* Achievements */}
        {l2Goals.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-light uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.3)" }}>
              <Trophy className="size-3.5 text-amber-400/60" />
              Intensity Points
            </div>
            {l2Goals.map((g) => (
              <div
                key={g.templateId}
                className="flex items-center gap-3 rounded-lg p-3"
                style={{ border: "1px solid rgba(255,255,255,0.03)" }}
              >
                <div
                  className="size-5 rounded-full flex items-center justify-center"
                  style={{ background: `${aurora.secondary}12` }}
                >
                  <div className="size-2 rounded-full" style={{ backgroundColor: aurora.secondary }} />
                </div>
                <span className="text-sm font-light" style={{ color: "rgba(255,255,255,0.7)" }}>{g.title}</span>
                {curveConfigs.has(g.templateId) && (
                  <span
                    className="text-[10px] ml-auto px-2 py-0.5 rounded-full font-light"
                    style={{ background: "rgba(74, 222, 128, 0.06)", color: "#4ade80" }}
                  >
                    observed
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* L3 by category */}
        {(Object.entries(l3ByCategory) as [GoalDisplayCategory, GoalCustomization[]][]).map(([cat, catGoals]) => {
          if (!catGoals || catGoals.length === 0) return null
          return (
            <div key={cat} className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-light uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.25)" }}>
                <Target className="size-3.5" style={{ color: "rgba(255,255,255,0.2)" }} />
                {CATEGORY_LABELS[cat] ?? cat}
              </div>
              {catGoals.map((g) => {
                const isRamp = g.templateType === "habit_ramp"
                return (
                  <div
                    key={g.templateId}
                    className="flex items-center gap-3 rounded-lg p-3"
                    style={{
                      border: "1px solid rgba(255,255,255,0.02)",
                      background: "rgba(255,255,255,0.008)",
                    }}
                  >
                    <div className="size-5 rounded flex items-center justify-center" style={{ background: "rgba(255,255,255,0.02)" }}>
                      {isRamp
                        ? <Repeat className="size-3" style={{ color: "rgba(255,255,255,0.25)" }} />
                        : <MilestoneIcon className="size-3" style={{ color: "rgba(255,255,255,0.25)" }} />
                      }
                    </div>
                    <span className="text-sm flex-1 font-light" style={{ color: "rgba(255,255,255,0.6)" }}>{g.title}</span>
                    <span className="text-xs font-light" style={{ color: "rgba(255,255,255,0.3)" }}>
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
        style={{ borderTop: `1px solid rgba(255,255,255,0.03)` }}
      >
        <div
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-light tracking-wide"
          style={{ background: `${aurora.primary}08`, color: aurora.primary }}
        >
          <Sparkles className="size-4" />
          Aurora illuminated
        </div>
        <p className="text-sm max-w-md mx-auto font-light" style={{ color: "rgba(255,255,255,0.3)" }}>
          In the real app, this would create all {goals.length} goals and take you to your personalized dashboard. For this prototype, you can light a new aurora.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            onClick={onStartOver}
            className="font-light"
            style={{
              borderColor: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.45)",
              backgroundColor: "transparent",
            }}
          >
            Light a new aurora
          </Button>
          <Button
            disabled
            className="font-light"
            style={{ background: aurora.gradient, opacity: 0.5 }}
          >
            Create {goals.length} Goals (Demo)
          </Button>
        </div>
      </div>
    </div>
  )
}
