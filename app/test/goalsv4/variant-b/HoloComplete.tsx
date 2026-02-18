"use client"

import { useState, useMemo, useEffect } from "react"
import { Star, Scan, Trophy, Target, Repeat, Milestone as MilestoneIcon, Crosshair } from "lucide-react"
import { Button } from "@/components/ui/button"
import { generateMilestoneLadder } from "@/src/goals/milestoneService"
import type { GoalTemplate, MilestoneLadderConfig, GoalDisplayCategory } from "@/src/goals/types"
import type { GoalCustomization } from "./HoloCustomizer"

const CYAN = "#00f0ff"

const CATEGORY_LABELS: Partial<Record<GoalDisplayCategory, string>> = {
  field_work: "FIELD_WORK",
  results: "RESULTS",
  dirty_dog: "DIRTY_DOG",
  texting: "TEXTING",
  dates: "DATING",
  relationship: "RELATIONSHIP",
}

const CONSTELLATION_NAMES: Record<string, string> = {
  one_person: "SEEKER_ARRAY",
  abundance: "EXPLORER_ARRAY",
}

interface HoloCompleteProps {
  path: "one_person" | "abundance"
  selectedL1: GoalTemplate
  selectedL2s: GoalTemplate[]
  selectedL3s: GoalTemplate[]
  goals: GoalCustomization[]
  curveConfigs: Map<string, MilestoneLadderConfig>
  onStartOver: () => void
}

export function HoloComplete({
  path,
  selectedL1,
  selectedL2s,
  selectedL3s,
  goals,
  curveConfigs,
  onStartOver,
}: HoloCompleteProps) {
  const constellationName = CONSTELLATION_NAMES[path] || "VOYAGER_ARRAY"
  const [bgParticles, setBgParticles] = useState<
    { id: number; x: number; y: number; size: number; opacity: number; delay: number }[]
  >([])

  useEffect(() => {
    setBgParticles(
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 1.2 + 0.3,
        opacity: Math.random() * 0.15 + 0.02,
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
        const tmpl = [...selectedL2s, ...selectedL3s].find((t) => t.id === id)
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
            className="absolute"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.size,
              height: s.size,
              backgroundColor: CYAN,
              opacity: s.opacity,
              animation: `holoCompleteTwinkle ${2 + s.delay}s ease-in-out ${s.delay}s infinite`,
            }}
          />
        ))}
        <style>{`
          @keyframes holoCompleteTwinkle {
            0%, 100% { opacity: 0.02; }
            50% { opacity: 0.12; }
          }
        `}</style>
      </div>

      {/* Hero */}
      <div className="relative text-center space-y-4 py-6">
        <div
          className="inline-flex items-center justify-center size-16 mx-auto"
          style={{
            background: "rgba(0, 240, 255, 0.06)",
            boxShadow: `0 0 30px rgba(0, 240, 255, 0.08)`,
            border: "1px solid rgba(0, 240, 255, 0.15)",
            borderRadius: 4,
          }}
        >
          <Scan className="size-8" style={{ color: CYAN }} />
        </div>
        <div>
          <h1
            className="text-2xl font-bold"
            style={{
              color: "rgba(255,255,255,0.95)",
              fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
              letterSpacing: "0.05em",
            }}
          >
            SYSTEM DEPLOYED
          </h1>
          <p
            className="mt-1 max-w-md mx-auto text-sm"
            style={{
              color: "rgba(255,255,255,0.45)",
              fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
              fontSize: 12,
            }}
          >
            {constellationName} initialized with {goals.length} active nodes tracking progress toward &quot;{selectedL1.title}&quot;.
          </p>
        </div>

        {/* Stats */}
        <div
          className="inline-flex items-center justify-center gap-6 pt-2 px-6 py-3"
          style={{
            border: "1px solid rgba(0, 240, 255, 0.08)",
            background: "rgba(0, 240, 255, 0.02)",
            borderRadius: 4,
          }}
        >
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: CYAN, fontFamily: "var(--font-mono, 'Geist Mono', monospace)" }}>
              {totalBodies}
            </div>
            <div
              className="text-xs"
              style={{
                color: "rgba(0, 240, 255, 0.4)",
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                letterSpacing: "0.1em",
              }}
            >
              NODES
            </div>
          </div>
          <div className="w-px h-8" style={{ backgroundColor: "rgba(0, 240, 255, 0.08)" }} />
          <div className="text-center">
            <div
              className="text-2xl font-bold"
              style={{ color: "rgba(0, 240, 255, 0.7)", fontFamily: "var(--font-mono, 'Geist Mono', monospace)" }}
            >
              {totalConnections}
            </div>
            <div
              className="text-xs"
              style={{
                color: "rgba(0, 240, 255, 0.4)",
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                letterSpacing: "0.1em",
              }}
            >
              LINKS
            </div>
          </div>
          <div className="w-px h-8" style={{ backgroundColor: "rgba(0, 240, 255, 0.08)" }} />
          <div className="text-center">
            <div
              className="text-2xl font-bold"
              style={{ color: "rgba(0, 240, 255, 0.7)", fontFamily: "var(--font-mono, 'Geist Mono', monospace)" }}
            >
              {milestoneCount}
            </div>
            <div
              className="text-xs"
              style={{
                color: "rgba(0, 240, 255, 0.4)",
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                letterSpacing: "0.1em",
              }}
            >
              MILESTONES
            </div>
          </div>
          <div className="w-px h-8" style={{ backgroundColor: "rgba(0, 240, 255, 0.08)" }} />
          <div className="text-center">
            <div
              className="text-2xl font-bold"
              style={{ color: "rgba(0, 240, 255, 0.7)", fontFamily: "var(--font-mono, 'Geist Mono', monospace)" }}
            >
              {habitCount}
            </div>
            <div
              className="text-xs"
              style={{
                color: "rgba(0, 240, 255, 0.4)",
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                letterSpacing: "0.1em",
              }}
            >
              HABITS
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="flex items-center justify-center gap-4 pt-2">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold"
            style={{
              border: "1px solid rgba(0, 240, 255, 0.15)",
              background: "rgba(0, 240, 255, 0.04)",
              color: CYAN,
              borderRadius: 2,
              fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
              letterSpacing: "0.08em",
            }}
          >
            <Star className="size-3" />
            {constellationName}
          </div>
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs"
            style={{
              border: "1px solid rgba(0, 240, 255, 0.1)",
              background: "rgba(0, 240, 255, 0.02)",
              color: "rgba(0, 240, 255, 0.6)",
              borderRadius: 2,
              fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
              letterSpacing: "0.05em",
            }}
          >
            <Crosshair className="size-3" />
            MAX_TRAJECTORY: {brightestStar}
          </div>
        </div>
      </div>

      {/* Mini visualization */}
      <div
        className="relative overflow-hidden max-w-xl mx-auto"
        style={{
          background: "radial-gradient(ellipse at center, #041520 0%, #020c18 70%, #010610 100%)",
          border: "1px solid rgba(0, 240, 255, 0.06)",
          height: 200,
          borderRadius: 4,
        }}
      >
        <svg viewBox="0 0 100 50" className="w-full h-full">
          <defs>
            <filter id="holo-complete-glow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur" />
              <feFlood floodColor={CYAN} floodOpacity="0.5" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid rings */}
          <circle cx="50" cy="25" r="10" fill="none" stroke={CYAN} strokeWidth="0.08" strokeOpacity="0.1" strokeDasharray="0.5,1" />
          <circle cx="50" cy="25" r="18" fill="none" stroke={CYAN} strokeWidth="0.06" strokeOpacity="0.07" strokeDasharray="0.5,1.5" />

          {/* Center node */}
          <circle cx={50} cy={25} r={3} fill="none" stroke={CYAN} strokeWidth="0.5" strokeOpacity={0.6} filter="url(#holo-complete-glow)">
            <animate attributeName="r" values="2.5;3.5;2.5" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx={50} cy={25} r={1.5} fill={CYAN} fillOpacity={0.15} />

          {/* L2 nodes */}
          {selectedL2s.map((l2, i) => {
            const angle = (i / selectedL2s.length) * Math.PI * 2 - Math.PI / 2
            const x = 50 + Math.cos(angle) * 15
            const y = 25 + Math.sin(angle) * 10
            return (
              <g key={l2.id}>
                <line x1={50} y1={25} x2={x} y2={y} stroke={CYAN} strokeOpacity={0.15} strokeWidth={0.12} />
                <circle cx={x} cy={y} r={1.5} fill="none" stroke={CYAN} strokeWidth="0.3" strokeOpacity={0.5} />
                <circle cx={x} cy={y} r={0.8} fill={CYAN} fillOpacity={0.1} />
              </g>
            )
          })}

          {/* L3 nodes */}
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
                fill={CYAN}
                fillOpacity={0.2}
              >
                <animate
                  attributeName="fill-opacity"
                  values="0.05;0.25;0.05"
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
        {/* Primary target */}
        <div
          className="relative p-4 flex items-center gap-3 overflow-hidden"
          style={{
            border: "2px solid rgba(0, 240, 255, 0.2)",
            backgroundColor: "rgba(0, 240, 255, 0.03)",
            boxShadow: "0 0 15px rgba(0, 240, 255, 0.04)",
            borderRadius: 4,
          }}
        >
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2" style={{ borderColor: "rgba(0, 240, 255, 0.25)" }} />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2" style={{ borderColor: "rgba(0, 240, 255, 0.25)" }} />

          <div className="p-2" style={{ backgroundColor: "rgba(0, 240, 255, 0.08)", borderRadius: 2 }}>
            <Star className="size-5" style={{ color: CYAN }} />
          </div>
          <div>
            <div
              className="text-[10px] font-bold tracking-wider"
              style={{
                color: "rgba(0, 240, 255, 0.4)",
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                letterSpacing: "0.15em",
              }}
            >
              PRIMARY_TARGET
            </div>
            <div className="font-bold" style={{ color: "rgba(255,255,255,0.9)" }}>
              {selectedL1.title}
            </div>
          </div>
        </div>

        {/* Subsystems */}
        {l2Goals.length > 0 && (
          <div className="space-y-2">
            <div
              className="flex items-center gap-2 text-xs font-bold tracking-wider"
              style={{
                color: "rgba(0, 240, 255, 0.4)",
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                letterSpacing: "0.15em",
              }}
            >
              <Trophy className="size-3.5" style={{ color: CYAN }} />
              SUBSYSTEMS
            </div>
            {l2Goals.map((g) => (
              <div
                key={g.templateId}
                className="flex items-center gap-3 p-3"
                style={{ border: "1px solid rgba(0, 240, 255, 0.05)", borderRadius: 4 }}
              >
                <div
                  className="size-5 flex items-center justify-center"
                  style={{ backgroundColor: "rgba(0, 240, 255, 0.06)", borderRadius: 2 }}
                >
                  <Star className="size-2.5" style={{ color: CYAN }} />
                </div>
                <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>
                  {g.title}
                </span>
                {curveConfigs.has(g.templateId) && (
                  <span
                    className="text-[10px] ml-auto px-2 py-0.5"
                    style={{
                      background: "rgba(34,197,94,0.08)",
                      color: "#22c55e",
                      borderRadius: 2,
                      fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                    }}
                  >
                    PLOTTED
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Data nodes by category */}
        {(Object.entries(l3ByCategory) as [GoalDisplayCategory, GoalCustomization[]][]).map(([cat, catGoals]) => {
          if (!catGoals || catGoals.length === 0) return null
          return (
            <div key={cat} className="space-y-2">
              <div
                className="flex items-center gap-2 text-xs font-bold tracking-wider"
                style={{
                  color: "rgba(0, 240, 255, 0.3)",
                  fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                  letterSpacing: "0.15em",
                }}
              >
                <Target className="size-3.5" style={{ color: "rgba(0, 240, 255, 0.25)" }} />
                {CATEGORY_LABELS[cat] ?? cat.toUpperCase()}
              </div>
              {catGoals.map((g) => {
                const tmpl = selectedL3s.find((t) => t.id === g.templateId)
                const isRamp = tmpl?.templateType === "habit_ramp"
                return (
                  <div
                    key={g.templateId}
                    className="flex items-center gap-3 p-3"
                    style={{
                      border: "1px solid rgba(0, 240, 255, 0.03)",
                      backgroundColor: "rgba(0, 240, 255, 0.01)",
                      borderRadius: 4,
                    }}
                  >
                    <div
                      className="size-5 flex items-center justify-center"
                      style={{ backgroundColor: "rgba(0, 240, 255, 0.04)", borderRadius: 2 }}
                    >
                      {isRamp ? (
                        <Repeat className="size-3" style={{ color: "rgba(0, 240, 255, 0.3)" }} />
                      ) : (
                        <MilestoneIcon className="size-3" style={{ color: "rgba(0, 240, 255, 0.3)" }} />
                      )}
                    </div>
                    <span className="text-sm flex-1" style={{ color: "rgba(255,255,255,0.6)" }}>
                      {g.title}
                    </span>
                    <span
                      className="text-xs font-bold"
                      style={{
                        color: "rgba(0, 240, 255, 0.45)",
                        fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                      }}
                    >
                      {g.targetValue}
                      {isRamp ? "/WK" : ""}
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
        style={{ borderTop: "1px solid rgba(0, 240, 255, 0.06)" }}
      >
        <div
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold"
          style={{
            backgroundColor: "rgba(0, 240, 255, 0.06)",
            color: CYAN,
            border: "1px solid rgba(0, 240, 255, 0.12)",
            borderRadius: 2,
            fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
            letterSpacing: "0.1em",
          }}
        >
          <Scan className="size-4" />
          SYSTEM ONLINE
        </div>
        <p
          className="text-sm max-w-md mx-auto"
          style={{
            color: "rgba(255,255,255,0.35)",
            fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
            fontSize: 12,
          }}
        >
          In production, this would instantiate all {goals.length} goal trackers and route
          to the mission dashboard. For this prototype, you can reinitialize the system.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            onClick={onStartOver}
            style={{
              borderColor: "rgba(0, 240, 255, 0.12)",
              color: "rgba(0, 240, 255, 0.5)",
              backgroundColor: "transparent",
              borderRadius: 4,
              fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
            }}
          >
            REINITIALIZE
          </Button>
          <Button
            disabled
            style={{
              backgroundColor: CYAN,
              color: "#020a14",
              opacity: 0.5,
              borderRadius: 4,
              fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
            }}
          >
            CREATE {goals.length} GOALS [DEMO]
          </Button>
        </div>
      </div>
    </div>
  )
}
