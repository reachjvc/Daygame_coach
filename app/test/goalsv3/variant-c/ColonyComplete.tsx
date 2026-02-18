"use client"

import { useState, useMemo, useEffect } from "react"
import { Star, Waves, Trophy, Target, Repeat, Milestone as MilestoneIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { generateMilestoneLadder } from "@/src/goals/milestoneService"
import type { GoalTemplate, MilestoneLadderConfig, GoalDisplayCategory } from "@/src/goals/types"
import type { GoalCustomization } from "./OrganismCustomizer"

const CATEGORY_LABELS: Partial<Record<GoalDisplayCategory, string>> = {
  field_work: "Field Work",
  results: "Results",
  dirty_dog: "Dirty Dog",
  texting: "Texting Game",
  dates: "Dating",
  relationship: "Relationship",
}

const COLONY_NAMES: Record<string, string> = {
  one_person: "The Angler",
  abundance: "The Swarm",
}

interface ColonyCompleteProps {
  path: "one_person" | "abundance"
  selectedL1: GoalTemplate
  selectedL2s: GoalTemplate[]
  selectedL3s: GoalTemplate[]
  goals: GoalCustomization[]
  curveConfigs: Map<string, MilestoneLadderConfig>
  pathColor: string
  onStartOver: () => void
}

export function ColonyComplete({
  path,
  selectedL1,
  selectedL2s,
  selectedL3s,
  goals,
  curveConfigs,
  pathColor,
  onStartOver,
}: ColonyCompleteProps) {
  const colonyName = COLONY_NAMES[path] ?? "The Colony"
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

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

  const brightestOrganism = useMemo(() => {
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

  const totalOrganisms = 1 + l2Goals.length + l3Goals.length
  const totalTendrils = l2Goals.length + l3Goals.length

  const cyanGlow = "#00ffff"
  const greenGlow = "#00ff88"

  return (
    <div
      className="relative space-y-8"
      style={{ opacity: mounted ? 1 : 0, transition: "opacity 0.8s ease-in" }}
    >
      {/* Hero summary */}
      <div className="relative text-center space-y-4 py-6">
        <div
          className="inline-flex items-center justify-center size-16 rounded-full mx-auto"
          style={{
            background: `radial-gradient(circle, ${pathColor}15 0%, ${pathColor}05 60%, transparent 100%)`,
            border: `1px solid ${pathColor}20`,
            boxShadow: `0 0 40px ${pathColor}12, 0 0 80px ${pathColor}06`,
            animation: "bioPulseGlow 4s ease-in-out infinite",
            ["--glow-color" as string]: `${pathColor}25`,
          }}
        >
          <Waves className="size-8" style={{ color: pathColor, filter: `drop-shadow(0 0 6px ${pathColor}80)` }} />
        </div>
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "rgba(255,255,255,0.95)", textShadow: `0 0 30px ${pathColor}15` }}
          >
            Colony Cultivated
          </h1>
          <p className="mt-1 max-w-md mx-auto text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Your &ldquo;{colonyName}&rdquo; colony is alive with {goals.length} organisms, all working toward &ldquo;{selectedL1.title}&rdquo;.
          </p>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-center gap-6 pt-2">
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: pathColor, textShadow: `0 0 8px ${pathColor}50` }}>{totalOrganisms}</div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Organisms</div>
          </div>
          <div className="w-px h-8" style={{ backgroundColor: `${pathColor}15` }} />
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: cyanGlow, textShadow: `0 0 8px ${cyanGlow}40` }}>{totalTendrils}</div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Tendrils</div>
          </div>
          <div className="w-px h-8" style={{ backgroundColor: `${pathColor}15` }} />
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: greenGlow, textShadow: `0 0 8px ${greenGlow}40` }}>{milestoneCount}</div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Milestones</div>
          </div>
          <div className="w-px h-8" style={{ backgroundColor: `${pathColor}15` }} />
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: "#0066ff", textShadow: "0 0 8px rgba(0,102,255,0.4)" }}>{habitCount}</div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Habits</div>
          </div>
        </div>

        {/* Colony name + brightest organism */}
        <div className="flex items-center justify-center gap-4 pt-2 flex-wrap">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
            style={{
              border: `1px solid ${pathColor}20`,
              background: `${pathColor}06`,
              color: pathColor,
              boxShadow: `0 0 8px ${pathColor}08`,
            }}
          >
            <Waves className="size-3" />
            {colonyName}
          </div>
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
            style={{
              border: `1px solid ${greenGlow}20`,
              background: `${greenGlow}06`,
              color: greenGlow,
            }}
          >
            <Star className="size-3" />
            Brightest: {brightestOrganism}
          </div>
        </div>
      </div>

      {/* Mini colony visualization */}
      <div
        className="relative rounded-2xl overflow-hidden max-w-xl mx-auto"
        style={{
          background: `radial-gradient(ellipse at center, rgba(0,8,16,0.9) 0%, #000810 60%, #000000 100%)`,
          border: `1px solid ${pathColor}10`,
          height: 200,
        }}
      >
        <svg viewBox="0 0 100 50" className="w-full h-full">
          <defs>
            <filter id="complete-bio-glow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" result="blur" />
              <feFlood floodColor={pathColor} floodOpacity="0.5" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Central organism */}
          <circle cx={50} cy={25} r={3} fill={pathColor} fillOpacity={0.8} filter="url(#complete-bio-glow)">
            <animate attributeName="r" values="2.5;3.5;2.5" dur="4s" repeatCount="indefinite" />
            <animate attributeName="fill-opacity" values="0.6;1;0.6" dur="4s" repeatCount="indefinite" />
          </circle>

          {/* L2 nodes */}
          {selectedL2s.map((l2, i) => {
            const angle = (i / selectedL2s.length) * Math.PI * 2 - Math.PI / 2
            const x = 50 + Math.cos(angle) * 15
            const y = 25 + Math.sin(angle) * 10
            return (
              <g key={l2.id}>
                <path
                  d={`M 50 25 Q ${50 + (x - 50) * 0.5 + (Math.random() - 0.5) * 5} ${25 + (y - 25) * 0.5 + (Math.random() - 0.5) * 3} ${x} ${y}`}
                  fill="none"
                  stroke={cyanGlow}
                  strokeOpacity={0.2}
                  strokeWidth={0.15}
                />
                <circle cx={x} cy={y} r={1.5} fill={cyanGlow} fillOpacity={0.6}>
                  <animate
                    attributeName="fill-opacity"
                    values="0.4;0.8;0.4"
                    dur={`${3 + i * 0.5}s`}
                    begin={`${i * 0.3}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              </g>
            )
          })}

          {/* L3 satellites */}
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
                fill={greenGlow}
                fillOpacity={0.3}
              >
                <animate
                  attributeName="fill-opacity"
                  values="0.1;0.5;0.1"
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
        {/* Central organism */}
        <div
          className="rounded-2xl p-4 flex items-center gap-3"
          style={{
            border: `1.5px solid ${pathColor}20`,
            backgroundColor: `${pathColor}03`,
            boxShadow: `0 0 20px ${pathColor}06`,
          }}
        >
          <div
            className="rounded-full p-2"
            style={{
              backgroundColor: `${pathColor}10`,
              boxShadow: `0 0 10px ${pathColor}15`,
            }}
          >
            <Star className="size-5" style={{ color: pathColor, filter: `drop-shadow(0 0 3px ${pathColor})` }} />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>Central Organism</div>
            <div className="font-bold" style={{ color: "rgba(255,255,255,0.9)" }}>{selectedL1.title}</div>
          </div>
        </div>

        {/* Colony nodes */}
        {l2Goals.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: `${cyanGlow}60` }}>
              <Trophy className="size-3.5" style={{ color: `${cyanGlow}80` }} />
              Colony Nodes
            </div>
            {l2Goals.map((g) => (
              <div
                key={g.templateId}
                className="flex items-center gap-3 rounded-xl p-3"
                style={{ border: "1px solid rgba(255,255,255,0.04)" }}
              >
                <div
                  className="size-5 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: `${cyanGlow}10`,
                    boxShadow: `0 0 6px ${cyanGlow}15`,
                  }}
                >
                  <Star className="size-2.5" style={{ color: cyanGlow }} />
                </div>
                <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>{g.title}</span>
                {curveConfigs.has(g.templateId) && (
                  <span
                    className="text-[10px] ml-auto px-2 py-0.5 rounded-full"
                    style={{
                      background: `${greenGlow}10`,
                      color: greenGlow,
                      border: `1px solid ${greenGlow}20`,
                    }}
                  >
                    analyzed
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
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>
                <Target className="size-3.5" style={{ color: `${greenGlow}50` }} />
                {CATEGORY_LABELS[cat] ?? cat}
              </div>
              {catGoals.map((g) => {
                const tmpl = selectedL3s.find((t) => t.id === g.templateId)
                const isRamp = tmpl?.templateType === "habit_ramp"
                return (
                  <div
                    key={g.templateId}
                    className="flex items-center gap-3 rounded-xl p-3"
                    style={{
                      border: "1px solid rgba(255,255,255,0.03)",
                      backgroundColor: "rgba(255,255,255,0.01)",
                    }}
                  >
                    <div className="size-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
                      {isRamp
                        ? <Repeat className="size-3" style={{ color: "rgba(255,255,255,0.3)" }} />
                        : <MilestoneIcon className="size-3" style={{ color: "rgba(255,255,255,0.3)" }} />
                      }
                    </div>
                    <span className="text-sm flex-1" style={{ color: "rgba(255,255,255,0.6)" }}>{g.title}</span>
                    <span className="text-xs font-medium" style={{ color: `${pathColor}80` }}>
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
      <div className="relative text-center space-y-4 py-6" style={{ borderTop: `1px solid ${pathColor}08` }}>
        <div
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium"
          style={{
            backgroundColor: `${pathColor}08`,
            color: pathColor,
            border: `1px solid ${pathColor}20`,
            boxShadow: `0 0 15px ${pathColor}10`,
          }}
        >
          <Waves className="size-4" />
          Colony cultivated
        </div>
        <p className="text-sm max-w-md mx-auto" style={{ color: "rgba(255,255,255,0.35)" }}>
          In the real app, this would create all {goals.length} goals and take you to your personalized dashboard. For this prototype, you can grow a new colony.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            onClick={onStartOver}
            style={{
              borderColor: `${pathColor}15`,
              color: "rgba(255,255,255,0.5)",
              backgroundColor: "transparent",
            }}
          >
            Grow a new colony
          </Button>
          <Button
            disabled
            style={{
              backgroundColor: `${pathColor}15`,
              color: `${pathColor}60`,
              border: `1px solid ${pathColor}20`,
              opacity: 0.6,
            }}
          >
            Create {goals.length} Goals (Demo)
          </Button>
        </div>
      </div>
    </div>
  )
}
