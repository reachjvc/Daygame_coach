"use client"

import { useState, useMemo, useEffect } from "react"
import { Crosshair, X, Star, ChevronRight, Scan } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MilestoneCurveEditor } from "@/src/goals/components/MilestoneCurveEditor"
import type { GoalTemplate, MilestoneLadderConfig } from "@/src/goals/types"
import type { GoalCustomization } from "./HoloCustomizer"

const CYAN = "#00f0ff"

const CONSTELLATION_NAMES: Record<string, string> = {
  one_person: "SEEKER_ARRAY",
  abundance: "EXPLORER_ARRAY",
}

interface StarPosition {
  x: number
  y: number
  id: string
  label: string
  level: number
  parentId?: string
  brightness: number
  size: number
  template: GoalTemplate | null
}

interface HoloChartProps {
  path: "one_person" | "abundance"
  selectedL1: GoalTemplate
  selectedL2s: GoalTemplate[]
  selectedL3s: GoalTemplate[]
  goals: GoalCustomization[]
  onBack: () => void
  onConfirm: (curveConfigs: Map<string, MilestoneLadderConfig>) => void
}

function computeStarPositions(
  selectedL1: GoalTemplate,
  selectedL2s: GoalTemplate[],
  selectedL3s: GoalTemplate[]
): StarPosition[] {
  const positions: StarPosition[] = []
  const centerX = 50
  const centerY = 50

  positions.push({
    x: centerX,
    y: centerY,
    id: selectedL1.id,
    label: selectedL1.title,
    level: 1,
    brightness: 1,
    size: 8,
    template: selectedL1,
  })

  const l2Radius = 22
  selectedL2s.forEach((l2, i) => {
    const angle = (i / selectedL2s.length) * Math.PI * 2 - Math.PI / 2
    const x = centerX + Math.cos(angle) * l2Radius
    const y = centerY + Math.sin(angle) * l2Radius
    positions.push({
      x,
      y,
      id: l2.id,
      label: l2.title,
      level: 2,
      parentId: selectedL1.id,
      brightness: 0.8,
      size: 5,
      template: l2,
    })
  })

  const l3Radius = 38
  selectedL3s.forEach((l3, i) => {
    const angle = (i / selectedL3s.length) * Math.PI * 2 - Math.PI / 2
    const jitterX = Math.sin(i * 7.3) * 3
    const jitterY = Math.cos(i * 5.1) * 3
    const x = centerX + Math.cos(angle) * l3Radius + jitterX
    const y = centerY + Math.sin(angle) * l3Radius + jitterY

    let closestL2 = selectedL2s[0]?.id || selectedL1.id
    let minDist = Infinity
    for (const l2Pos of positions.filter((p) => p.level === 2)) {
      const dx = x - l2Pos.x
      const dy = y - l2Pos.y
      const dist = dx * dx + dy * dy
      if (dist < minDist) {
        minDist = dist
        closestL2 = l2Pos.id
      }
    }

    positions.push({
      x: Math.max(5, Math.min(95, x)),
      y: Math.max(5, Math.min(95, y)),
      id: l3.id,
      label: l3.title,
      level: 3,
      parentId: closestL2,
      brightness: 0.4,
      size: 2.5,
      template: l3,
    })
  })

  return positions
}

export function HoloChart({
  path,
  selectedL1,
  selectedL2s,
  selectedL3s,
  goals,
  onBack,
  onConfirm,
}: HoloChartProps) {
  const constellationName = CONSTELLATION_NAMES[path] || "VOYAGER_ARRAY"

  const [selectedStar, setSelectedStar] = useState<StarPosition | null>(null)
  const [curveConfigs, setCurveConfigs] = useState<Map<string, MilestoneLadderConfig>>(() => {
    const map = new Map<string, MilestoneLadderConfig>()
    for (const tmpl of [...selectedL2s, ...selectedL3s]) {
      if (tmpl.defaultMilestoneConfig) {
        map.set(tmpl.id, { ...tmpl.defaultMilestoneConfig })
      }
    }
    return map
  })
  const [configuredStars, setConfiguredStars] = useState<Set<string>>(new Set())
  const [twinklePhases, setTwinklePhases] = useState<number[]>([])

  const starPositions = useMemo(
    () => computeStarPositions(selectedL1, selectedL2s, selectedL3s),
    [selectedL1, selectedL2s, selectedL3s]
  )

  useEffect(() => {
    setTwinklePhases(starPositions.map(() => Math.random() * Math.PI * 2))
  }, [starPositions.length])

  const constellationLines = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number; opacity: number }[] = []
    for (const star of starPositions) {
      if (star.parentId) {
        const parent = starPositions.find((s) => s.id === star.parentId)
        if (parent) {
          lines.push({
            x1: parent.x,
            y1: parent.y,
            x2: star.x,
            y2: star.y,
            opacity: star.level === 2 ? 0.25 : 0.08,
          })
        }
      }
    }
    return lines
  }, [starPositions])

  const handleCurveChange = (starId: string, config: MilestoneLadderConfig) => {
    setCurveConfigs((prev) => {
      const next = new Map(prev)
      next.set(starId, config)
      return next
    })
    setConfiguredStars((prev) => new Set(prev).add(starId))
  }

  const milestoneScoredStars = useMemo(
    () => starPositions.filter((s) => s.template?.defaultMilestoneConfig),
    [starPositions]
  )

  const handleConfirm = () => onConfirm(curveConfigs)

  const totalConfigurable = milestoneScoredStars.length
  const totalConfigured = configuredStars.size

  return (
    <div className="relative space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm transition-colors cursor-pointer"
          style={{ color: "rgba(0, 240, 255, 0.5)", fontFamily: "var(--font-mono, 'Geist Mono', monospace)" }}
        >
          <ChevronRight className="size-4 rotate-180" />
          BACK
        </button>
        <div className="flex items-center gap-2">
          <Crosshair className="size-4" style={{ color: CYAN }} />
          <span
            className="text-sm font-bold"
            style={{
              color: CYAN,
              fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
              letterSpacing: "0.1em",
            }}
          >
            TRAJECTORY PLOTTER
          </span>
        </div>
      </div>

      {/* Chart header */}
      <div className="text-center space-y-1">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 text-xs font-bold"
          style={{
            background: "rgba(0, 240, 255, 0.06)",
            color: CYAN,
            border: "1px solid rgba(0, 240, 255, 0.15)",
            borderRadius: 2,
            fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
            letterSpacing: "0.1em",
          }}
        >
          <Scan className="size-3" />
          {constellationName}
        </div>
        <h2
          className="text-xl font-bold"
          style={{
            color: "rgba(255,255,255,0.9)",
            fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
            letterSpacing: "0.05em",
          }}
        >
          HOLOGRAPHIC SYSTEM MAP
        </h2>
        <p
          className="text-xs"
          style={{
            color: "rgba(0, 240, 255, 0.4)",
            fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
          }}
        >
          Click any configurable node to open trajectory plotter and define the growth curve
        </p>
      </div>

      {/* Star map + sidebar */}
      <div className="flex gap-4">
        <div
          className="flex-1 relative overflow-hidden"
          style={{
            background: "radial-gradient(ellipse at center, #041520 0%, #020c18 70%, #010610 100%)",
            border: "1px solid rgba(0, 240, 255, 0.08)",
            minHeight: 450,
            boxShadow: "inset 0 0 60px rgba(0, 240, 255, 0.02)",
            borderRadius: 4,
          }}
        >
          <HoloBackgroundStars />

          <svg
            viewBox="0 0 100 100"
            className="w-full h-full"
            style={{ minHeight: 450, position: "relative", zIndex: 1 }}
          >
            <defs>
              <filter id="holo-star-glow">
                <feGaussianBlur in="SourceAlpha" stdDeviation="0.8" result="blur" />
                <feFlood floodColor={CYAN} floodOpacity="0.5" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="holo-star-glow-bright">
                <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur" />
                <feFlood floodColor={CYAN} floodOpacity="0.7" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="holo-star-glow-dim">
                <feGaussianBlur in="SourceAlpha" stdDeviation="0.4" result="blur" />
                <feFlood floodColor={CYAN} floodOpacity="0.3" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Grid rings */}
            <circle cx="50" cy="50" r="15" fill="none" stroke={CYAN} strokeWidth="0.06" strokeOpacity="0.12" strokeDasharray="0.5,1" />
            <circle cx="50" cy="50" r="28" fill="none" stroke={CYAN} strokeWidth="0.05" strokeOpacity="0.08" strokeDasharray="0.5,1.5" />
            <circle cx="50" cy="50" r="42" fill="none" stroke={CYAN} strokeWidth="0.04" strokeOpacity="0.06" strokeDasharray="0.5,2" />

            {/* Cross-hair */}
            <line x1="50" y1="2" x2="50" y2="98" stroke={CYAN} strokeWidth="0.03" strokeOpacity="0.05" />
            <line x1="2" y1="50" x2="98" y2="50" stroke={CYAN} strokeWidth="0.03" strokeOpacity="0.05" />

            {/* Constellation lines */}
            {constellationLines.map((line, i) => (
              <line
                key={i}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke={CYAN}
                strokeOpacity={line.opacity}
                strokeWidth={0.12}
                strokeDasharray={line.opacity < 0.15 ? "0.5,0.8" : "none"}
              />
            ))}

            {/* Stars */}
            {starPositions.map((star, idx) => {
              const isSelected = selectedStar?.id === star.id
              const isConfigured = configuredStars.has(star.id)
              const hasConfig = star.template?.defaultMilestoneConfig
              const twinkleDelay = twinklePhases[idx] || 0

              return (
                <g key={star.id}>
                  {/* Pulse ring for L1/L2 */}
                  {star.level <= 2 && (
                    <circle
                      cx={star.x}
                      cy={star.y}
                      r={star.size * 1.8}
                      fill="none"
                      stroke={CYAN}
                      strokeWidth={0.08}
                      strokeOpacity={0.2}
                      strokeDasharray="0.3,0.6"
                    >
                      <animate
                        attributeName="r"
                        values={`${star.size * 1.2};${star.size * 2.2};${star.size * 1.2}`}
                        dur="4s"
                        begin={`${twinkleDelay}s`}
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="stroke-opacity"
                        values="0.2;0.03;0.2"
                        dur="4s"
                        begin={`${twinkleDelay}s`}
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}

                  {/* Configured indicator */}
                  {isConfigured && (
                    <circle
                      cx={star.x}
                      cy={star.y}
                      r={star.size + 1}
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth={0.2}
                      strokeOpacity={0.5}
                      strokeDasharray="0.3,0.3"
                    />
                  )}

                  {/* Wireframe planet body */}
                  <circle
                    cx={star.x}
                    cy={star.y}
                    r={isSelected ? star.size * 1.3 : star.size}
                    fill={CYAN}
                    fillOpacity={star.level === 1 ? 0.15 : star.level === 2 ? 0.1 : 0.05}
                    stroke={CYAN}
                    strokeWidth={star.level === 1 ? 0.4 : star.level === 2 ? 0.25 : 0.12}
                    strokeOpacity={star.brightness}
                    filter={
                      star.level === 1
                        ? "url(#holo-star-glow-bright)"
                        : star.level === 2
                          ? "url(#holo-star-glow)"
                          : "url(#holo-star-glow-dim)"
                    }
                    className={hasConfig ? "cursor-pointer" : ""}
                    onClick={() => {
                      if (hasConfig) setSelectedStar(star)
                    }}
                  >
                    {star.level === 3 && (
                      <animate
                        attributeName="fill-opacity"
                        values={`${star.brightness * 0.3};${star.brightness * 0.8};${star.brightness * 0.3}`}
                        dur={`${2 + (twinkleDelay % 2)}s`}
                        begin={`${twinkleDelay}s`}
                        repeatCount="indefinite"
                      />
                    )}
                  </circle>

                  {/* Inner wireframe detail for bigger stars */}
                  {star.level <= 2 && (
                    <circle
                      cx={star.x}
                      cy={star.y}
                      r={star.size * 0.4}
                      fill="none"
                      stroke={CYAN}
                      strokeWidth="0.08"
                      strokeOpacity="0.3"
                      strokeDasharray="0.2,0.4"
                    />
                  )}

                  {/* Label */}
                  {star.level <= 2 && (
                    <text
                      x={star.x}
                      y={star.y + star.size + 2.5}
                      textAnchor="middle"
                      fill={CYAN}
                      fillOpacity={0.6}
                      fontSize={star.level === 1 ? 2.2 : 1.5}
                      fontWeight={star.level === 1 ? 700 : 500}
                      style={{ fontFamily: "var(--font-mono, 'Geist Mono', monospace)" }}
                    >
                      {star.label.length > 25 ? star.label.slice(0, 23) + "..." : star.label}
                    </text>
                  )}

                  {/* Hover target */}
                  {hasConfig && (
                    <circle
                      cx={star.x}
                      cy={star.y}
                      r={Math.max(star.size * 2, 4)}
                      fill="transparent"
                      className="cursor-pointer"
                      onClick={() => setSelectedStar(star)}
                    />
                  )}
                </g>
              )
            })}
          </svg>

          {/* Legend overlay */}
          <div className="absolute bottom-3 left-3 space-y-1.5 z-10">
            <div className="flex items-center gap-2">
              <div
                className="size-3"
                style={{
                  border: `1px solid ${CYAN}`,
                  backgroundColor: "rgba(0, 240, 255, 0.15)",
                  borderRadius: 1,
                  boxShadow: `0 0 4px rgba(0, 240, 255, 0.4)`,
                }}
              />
              <span
                className="text-[10px] font-bold"
                style={{
                  color: "rgba(0, 240, 255, 0.5)",
                  fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                  letterSpacing: "0.05em",
                }}
              >
                PRIMARY [L1]
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="size-2.5"
                style={{
                  border: `1px solid ${CYAN}`,
                  backgroundColor: "rgba(0, 240, 255, 0.1)",
                  borderRadius: 1,
                  boxShadow: `0 0 3px rgba(0, 240, 255, 0.3)`,
                }}
              />
              <span
                className="text-[10px]"
                style={{
                  color: "rgba(0, 240, 255, 0.4)",
                  fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                  letterSpacing: "0.05em",
                }}
              >
                SUBSYSTEM [L2]
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="size-1.5"
                style={{
                  border: `1px solid rgba(0, 240, 255, 0.4)`,
                  backgroundColor: "rgba(0, 240, 255, 0.05)",
                  borderRadius: 1,
                }}
              />
              <span
                className="text-[10px]"
                style={{
                  color: "rgba(0, 240, 255, 0.3)",
                  fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                  letterSpacing: "0.05em",
                }}
              >
                DATA NODE [L3]
              </span>
            </div>
          </div>

          {/* Stats overlay */}
          <div className="absolute top-3 right-3 text-right space-y-0.5 z-10">
            <div
              className="text-[10px]"
              style={{
                color: "rgba(0, 240, 255, 0.3)",
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
              }}
            >
              {starPositions.length} NODES
            </div>
            <div
              className="text-[10px]"
              style={{
                color: "rgba(0, 240, 255, 0.3)",
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
              }}
            >
              {constellationLines.length} LINKS
            </div>
            {totalConfigurable > 0 && (
              <div
                className="text-[10px]"
                style={{
                  color: totalConfigured > 0 ? "#22c55e" : "rgba(0, 240, 255, 0.3)",
                  fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                }}
              >
                {totalConfigured}/{totalConfigurable} PLOTTED
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div
          className="w-52 flex-shrink-0 p-3 space-y-3 hidden lg:block"
          style={{
            background: "rgba(0, 240, 255, 0.02)",
            border: "1px solid rgba(0, 240, 255, 0.05)",
            borderRadius: 4,
          }}
        >
          <div
            className="text-xs font-bold tracking-wider"
            style={{
              color: "rgba(0, 240, 255, 0.4)",
              fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
              letterSpacing: "0.15em",
            }}
          >
            SYS_LEGEND
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <Star className="size-3" style={{ color: CYAN }} />
              <span
                className="text-[10px] font-bold tracking-wider"
                style={{ color: CYAN, fontFamily: "var(--font-mono, 'Geist Mono', monospace)" }}
              >
                PRIMARY
              </span>
            </div>
            <div className="text-xs pl-5" style={{ color: "rgba(255,255,255,0.55)" }}>
              {selectedL1.title}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <Star className="size-2.5" style={{ color: "rgba(0, 240, 255, 0.6)" }} />
              <span
                className="text-[10px] font-bold tracking-wider"
                style={{
                  color: "rgba(0, 240, 255, 0.6)",
                  fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                }}
              >
                SUBSYSTEMS
              </span>
            </div>
            <div className="space-y-0.5 pl-5">
              {selectedL2s.map((l2) => (
                <div key={l2.id} className="text-[10px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {l2.title}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <Star className="size-2" style={{ color: "rgba(0, 240, 255, 0.35)" }} />
              <span
                className="text-[10px]"
                style={{
                  color: "rgba(0, 240, 255, 0.35)",
                  fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                }}
              >
                {selectedL3s.length} DATA NODES
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Trajectory Modal */}
      {selectedStar && selectedStar.template?.defaultMilestoneConfig && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.9)" }}
          onClick={() => setSelectedStar(null)}
        >
          <div
            className="relative w-full max-w-lg p-6 space-y-4"
            style={{
              background: "linear-gradient(135deg, #041520 0%, #020c18 50%, #041520 100%)",
              border: "1px solid rgba(0, 240, 255, 0.2)",
              boxShadow: "0 0 60px rgba(0, 240, 255, 0.08), inset 0 0 40px rgba(0,0,0,0.5)",
              borderRadius: 4,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2" style={{ borderColor: "rgba(0, 240, 255, 0.3)" }} />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2" style={{ borderColor: "rgba(0, 240, 255, 0.3)" }} />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2" style={{ borderColor: "rgba(0, 240, 255, 0.3)" }} />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2" style={{ borderColor: "rgba(0, 240, 255, 0.3)" }} />

            {/* Close */}
            <button
              onClick={() => setSelectedStar(null)}
              className="absolute top-3 right-3 size-8 flex items-center justify-center cursor-pointer"
              style={{
                backgroundColor: "rgba(0, 240, 255, 0.05)",
                border: "1px solid rgba(0, 240, 255, 0.15)",
                borderRadius: 2,
              }}
            >
              <X className="size-4" style={{ color: "rgba(0, 240, 255, 0.5)" }} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="p-2.5" style={{ background: "rgba(0, 240, 255, 0.08)", borderRadius: 2 }}>
                <Crosshair className="size-5" style={{ color: CYAN }} />
              </div>
              <div>
                <div
                  className="text-[10px] font-bold tracking-wider"
                  style={{
                    color: CYAN,
                    fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                    letterSpacing: "0.15em",
                  }}
                >
                  TRAJECTORY_PLOTTER
                </div>
                <h3 className="text-lg font-bold" style={{ color: "rgba(255,255,255,0.9)" }}>
                  {selectedStar.label}
                </h3>
              </div>
            </div>

            <p
              className="text-xs"
              style={{
                color: "rgba(0, 240, 255, 0.4)",
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
              }}
            >
              Define the growth curve for this node. Shape the progression trajectory.
            </p>

            {/* Curve Editor */}
            <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 4, padding: 4 }}>
              <MilestoneCurveEditor
                config={curveConfigs.get(selectedStar.id) || selectedStar.template.defaultMilestoneConfig}
                onChange={(config) => handleCurveChange(selectedStar.id, config)}
                themeId="cyberpunk"
                allowDirectEdit
              />
            </div>

            <Button
              onClick={() => setSelectedStar(null)}
              className="w-full cursor-pointer font-bold"
              style={{
                backgroundColor: CYAN,
                color: "#020a14",
                boxShadow: `0 0 12px rgba(0, 240, 255, 0.3)`,
                borderRadius: 4,
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                letterSpacing: "0.05em",
              }}
            >
              LOCK TRAJECTORY
            </Button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        className="sticky bottom-0 backdrop-blur-sm py-4 -mx-6 px-6"
        style={{
          backgroundColor: "rgba(2, 10, 20, 0.95)",
          borderTop: "1px solid rgba(0, 240, 255, 0.08)",
        }}
      >
        <div className="flex items-center justify-between">
          <div
            className="text-sm"
            style={{
              color: "rgba(255,255,255,0.45)",
              fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
            }}
          >
            <span className="font-bold" style={{ color: CYAN }}>
              {constellationName}
            </span>
            {totalConfigurable > 0 && (
              <span className="text-xs ml-2" style={{ color: "rgba(0, 240, 255, 0.3)" }}>
                [{totalConfigured}/{totalConfigurable} PLOTTED]
              </span>
            )}
          </div>
          <Button
            onClick={handleConfirm}
            className="cursor-pointer font-bold"
            style={{
              backgroundColor: CYAN,
              color: "#020a14",
              boxShadow: `0 0 12px rgba(0, 240, 255, 0.3)`,
              borderRadius: 4,
              fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
              letterSpacing: "0.05em",
            }}
          >
            DEPLOY SYSTEM
            <Scan className="size-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function HoloBackgroundStars() {
  const [stars, setStars] = useState<
    { id: number; x: number; y: number; size: number; opacity: number; delay: number }[]
  >([])

  useEffect(() => {
    setStars(
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 1 + 0.3,
        opacity: Math.random() * 0.15 + 0.02,
        delay: Math.random() * 4,
      }))
    )
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {stars.map((s) => (
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
            animation: `holoBgTwinkle ${2 + s.delay}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes holoBgTwinkle {
          0%, 100% { opacity: 0.02; }
          50% { opacity: 0.15; }
        }
      `}</style>
    </div>
  )
}
