"use client"

import { useState, useMemo, useEffect } from "react"
import { Telescope, X, Star, ChevronRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MilestoneCurveEditor } from "@/src/goals/components/MilestoneCurveEditor"
import type { GoalTemplate, MilestoneLadderConfig } from "@/src/goals/types"
import type { GoalCustomization } from "./StarCustomizer"

const CONSTELLATION_NAMES: Record<string, string> = {
  one_person: "The Seeker",
  abundance: "The Explorer",
}

const goldColor = "#daa520"
const brassColor = "#cd853f"
const darkBrass = "#b8860b"

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

interface OrreryChartProps {
  path: "one_person" | "abundance"
  selectedL1: GoalTemplate
  selectedL2s: GoalTemplate[]
  selectedL3s: GoalTemplate[]
  goals: GoalCustomization[]
  pathColor: string
  onBack: () => void
  onConfirm: (curveConfigs: Map<string, MilestoneLadderConfig>) => void
}

/** Compute star positions in a pleasing radial layout */
function computeStarPositions(
  selectedL1: GoalTemplate,
  selectedL2s: GoalTemplate[],
  selectedL3s: GoalTemplate[],
): StarPosition[] {
  const positions: StarPosition[] = []
  const centerX = 50
  const centerY = 50

  // L1 — the planet core
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

  // L2 stars in inner atmosphere
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

  // L3 stars in outer atmosphere
  const l3Radius = 38
  const totalL3 = selectedL3s.length
  selectedL3s.forEach((l3, i) => {
    const angle = (i / totalL3) * Math.PI * 2 - Math.PI / 2
    const jitterX = (Math.sin(i * 7.3) * 3)
    const jitterY = (Math.cos(i * 5.1) * 3)
    const x = centerX + Math.cos(angle) * l3Radius + jitterX
    const y = centerY + Math.sin(angle) * l3Radius + jitterY

    let closestL2 = selectedL2s[0]?.id || selectedL1.id
    let minDist = Infinity
    for (const l2Pos of positions.filter(p => p.level === 2)) {
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

export function OrreryChart({
  path,
  selectedL1,
  selectedL2s,
  selectedL3s,
  goals,
  pathColor,
  onBack,
  onConfirm,
}: OrreryChartProps) {
  const constellationName = CONSTELLATION_NAMES[path] || "The Voyager"

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
        const parent = starPositions.find(s => s.id === star.parentId)
        if (parent) {
          lines.push({
            x1: parent.x,
            y1: parent.y,
            x2: star.x,
            y2: star.y,
            opacity: star.level === 2 ? 0.3 : 0.12,
          })
        }
      }
    }
    return lines
  }, [starPositions])

  const handleCurveChange = (starId: string, config: MilestoneLadderConfig) => {
    setCurveConfigs(prev => {
      const next = new Map(prev)
      next.set(starId, config)
      return next
    })
    setConfiguredStars(prev => new Set(prev).add(starId))
  }

  const milestoneScoredStars = useMemo(() => {
    return starPositions.filter(s => s.template?.defaultMilestoneConfig)
  }, [starPositions])

  const handleConfirm = () => {
    onConfirm(curveConfigs)
  }

  const totalConfigurable = milestoneScoredStars.length
  const totalConfigured = configuredStars.size

  return (
    <div className="relative space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-sm transition-colors cursor-pointer" style={{ color: "rgba(205, 133, 63, 0.6)" }}>
          <ChevronRight className="size-4 rotate-180" />
          Back to calibration
        </button>
        <div className="flex items-center gap-2">
          <Telescope className="size-4" style={{ color: goldColor }} />
          <span className="text-sm font-medium" style={{ color: goldColor }}>Spyglass View</span>
        </div>
      </div>

      {/* Chart header */}
      <div className="text-center space-y-1">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
          style={{
            background: `${goldColor}12`,
            color: goldColor,
            border: `1px solid ${goldColor}25`,
          }}
        >
          <Sparkles className="size-3" />
          {constellationName}
        </div>
        <h2 className="text-xl font-bold" style={{ color: "rgba(255,255,255,0.9)" }}>
          Your Planetary System
        </h2>
        <p className="text-xs" style={{ color: "rgba(205, 133, 63, 0.5)" }}>
          Click any bright body to open the spyglass and plot its trajectory
        </p>
      </div>

      {/* Main content: star map + optional sidebar */}
      <div className="flex gap-4">
        {/* Star map */}
        <div
          className="flex-1 relative rounded-2xl overflow-hidden"
          style={{
            background: "radial-gradient(ellipse at center, #0d0d1f 0%, #080816 70%, #020208 100%)",
            border: `1px solid ${brassColor}20`,
            minHeight: 450,
            boxShadow: `inset 0 0 60px rgba(184, 134, 11, 0.03)`,
          }}
        >
          {/* Background stars with brass tint */}
          <BackgroundStars />

          <svg
            viewBox="0 0 100 100"
            className="w-full h-full"
            style={{ minHeight: 450, position: "relative", zIndex: 1 }}
          >
            <defs>
              {/* Brass glow filters */}
              <filter id="orrery-star-glow">
                <feGaussianBlur in="SourceAlpha" stdDeviation="0.8" result="blur" />
                <feFlood floodColor={goldColor} floodOpacity="0.5" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="orrery-star-glow-bright">
                <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur" />
                <feFlood floodColor={goldColor} floodOpacity="0.7" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="orrery-star-glow-dim">
                <feGaussianBlur in="SourceAlpha" stdDeviation="0.4" result="blur" />
                <feFlood floodColor={brassColor} floodOpacity="0.3" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Gear-like border pattern */}
              <pattern id="chart-gear-border" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="0.3" fill={brassColor} fillOpacity="0.15" />
              </pattern>
            </defs>

            {/* Decorative concentric rings (atmosphere layers) */}
            <circle cx="50" cy="50" r="15" fill="none" stroke={brassColor} strokeWidth="0.08" strokeOpacity="0.2" strokeDasharray="0.3,0.8" />
            <circle cx="50" cy="50" r="28" fill="none" stroke={brassColor} strokeWidth="0.06" strokeOpacity="0.12" strokeDasharray="0.3,1.2" />
            <circle cx="50" cy="50" r="42" fill="none" stroke={brassColor} strokeWidth="0.06" strokeOpacity="0.08" strokeDasharray="0.3,1.5" />

            {/* Compass cross */}
            <line x1="50" y1="2" x2="50" y2="98" stroke={brassColor} strokeWidth="0.03" strokeOpacity="0.06" />
            <line x1="2" y1="50" x2="98" y2="50" stroke={brassColor} strokeWidth="0.03" strokeOpacity="0.06" />

            {/* Tick marks at the chart border */}
            {Array.from({ length: 36 }, (_, i) => {
              const angle = (i / 36) * Math.PI * 2
              const isMajor = i % 9 === 0
              const innerR = isMajor ? 46 : 47.5
              const outerR = 48.5
              return (
                <line
                  key={`chart-tick-${i}`}
                  x1={50 + Math.cos(angle) * innerR}
                  y1={50 + Math.sin(angle) * innerR}
                  x2={50 + Math.cos(angle) * outerR}
                  y2={50 + Math.sin(angle) * outerR}
                  stroke={brassColor}
                  strokeWidth={isMajor ? 0.15 : 0.06}
                  strokeOpacity={isMajor ? 0.3 : 0.15}
                />
              )
            })}

            {/* Constellation lines — golden connections */}
            {constellationLines.map((line, i) => (
              <line
                key={i}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke={goldColor}
                strokeOpacity={line.opacity}
                strokeWidth={0.15}
                strokeDasharray={line.opacity < 0.2 ? "0.5,0.8" : "none"}
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
                  {/* Twinkle animation ring for L1 and L2 */}
                  {star.level <= 2 && (
                    <circle
                      cx={star.x}
                      cy={star.y}
                      r={star.size * 1.8}
                      fill="none"
                      stroke={star.level === 1 ? goldColor : brassColor}
                      strokeWidth={0.1}
                      strokeOpacity={0.3}
                    >
                      <animate
                        attributeName="r"
                        values={`${star.size * 1.2};${star.size * 2};${star.size * 1.2}`}
                        dur="3s"
                        begin={`${twinkleDelay}s`}
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="stroke-opacity"
                        values="0.3;0.05;0.3"
                        dur="3s"
                        begin={`${twinkleDelay}s`}
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}

                  {/* Configured indicator — gear-like ring */}
                  {isConfigured && (
                    <circle
                      cx={star.x}
                      cy={star.y}
                      r={star.size + 1}
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth={0.2}
                      strokeOpacity={0.5}
                      strokeDasharray="0.5,0.5"
                    />
                  )}

                  {/* Star body — warm brass tones */}
                  <circle
                    cx={star.x}
                    cy={star.y}
                    r={isSelected ? star.size * 1.3 : star.size}
                    fill={
                      star.level === 1
                        ? goldColor
                        : star.level === 2
                          ? brassColor
                          : "#e8d5b0"
                    }
                    fillOpacity={star.brightness}
                    filter={
                      star.level === 1
                        ? "url(#orrery-star-glow-bright)"
                        : star.level === 2
                          ? "url(#orrery-star-glow)"
                          : "url(#orrery-star-glow-dim)"
                    }
                    className={hasConfig ? "cursor-pointer" : ""}
                    onClick={() => {
                      if (hasConfig) setSelectedStar(star)
                    }}
                  >
                    {star.level === 3 && (
                      <animate
                        attributeName="fill-opacity"
                        values={`${star.brightness * 0.5};${star.brightness};${star.brightness * 0.5}`}
                        dur={`${2 + (twinkleDelay % 2)}s`}
                        begin={`${twinkleDelay}s`}
                        repeatCount="indefinite"
                      />
                    )}
                  </circle>

                  {/* Star label */}
                  {star.level <= 2 && (
                    <text
                      x={star.x}
                      y={star.y + star.size + 2.5}
                      textAnchor="middle"
                      fill={star.level === 1 ? goldColor : brassColor}
                      fillOpacity={0.7}
                      fontSize={star.level === 1 ? 2.2 : 1.6}
                      fontWeight={star.level === 1 ? 700 : 500}
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
              <div className="size-3 rounded-full" style={{ backgroundColor: goldColor, boxShadow: `0 0 6px ${goldColor}80` }} />
              <span className="text-[10px] font-medium" style={{ color: "rgba(205, 133, 63, 0.6)" }}>Planet Core (L1)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-2.5 rounded-full" style={{ backgroundColor: brassColor, boxShadow: `0 0 4px ${brassColor}50` }} />
              <span className="text-[10px]" style={{ color: "rgba(205, 133, 63, 0.5)" }}>Inner Atmosphere (L2)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-1.5 rounded-full" style={{ backgroundColor: "#e8d5b0", opacity: 0.5 }} />
              <span className="text-[10px]" style={{ color: "rgba(205, 133, 63, 0.4)" }}>Outer Atmosphere (L3)</span>
            </div>
          </div>

          {/* Stats overlay */}
          <div className="absolute top-3 right-3 text-right space-y-0.5 z-10">
            <div className="text-[10px]" style={{ color: "rgba(205, 133, 63, 0.35)" }}>
              {starPositions.length} bodies
            </div>
            <div className="text-[10px]" style={{ color: "rgba(205, 133, 63, 0.35)" }}>
              {constellationLines.length} connections
            </div>
            {totalConfigurable > 0 && (
              <div className="text-[10px]" style={{ color: totalConfigured > 0 ? "#22c55e" : "rgba(205, 133, 63, 0.35)" }}>
                {totalConfigured}/{totalConfigurable} plotted
              </div>
            )}
          </div>
        </div>

        {/* Sidebar legend */}
        <div
          className="w-52 flex-shrink-0 rounded-xl p-3 space-y-3 hidden lg:block"
          style={{
            background: "rgba(205, 133, 63, 0.03)",
            border: `1px solid ${brassColor}10`,
          }}
        >
          <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(205, 133, 63, 0.5)" }}>
            System Legend
          </div>

          {/* L1 */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Star className="size-3" style={{ color: goldColor }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: goldColor }}>Polar Star</span>
            </div>
            <div className="text-xs pl-5" style={{ color: "rgba(255,255,255,0.6)" }}>{selectedL1.title}</div>
          </div>

          {/* L2 */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Star className="size-2.5" style={{ color: brassColor }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: brassColor }}>Inner Bodies</span>
            </div>
            <div className="space-y-0.5 pl-5">
              {selectedL2s.map(l2 => (
                <div key={l2.id} className="text-[10px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {l2.title}
                </div>
              ))}
            </div>
          </div>

          {/* L3 count */}
          <div>
            <div className="flex items-center gap-2">
              <Star className="size-2" style={{ color: "rgba(232,213,176,0.5)" }} />
              <span className="text-[10px]" style={{ color: "rgba(205, 133, 63, 0.4)" }}>
                {selectedL3s.length} outer bodies
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Spyglass Modal (Telescope) */}
      {selectedStar && selectedStar.template?.defaultMilestoneConfig && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.88)" }}
          onClick={() => setSelectedStar(null)}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl p-6 space-y-4"
            style={{
              background: "linear-gradient(135deg, #0d0d1f 0%, #0a0a1a 50%, #0d0d1f 100%)",
              border: `1px solid ${goldColor}30`,
              boxShadow: `0 0 60px ${goldColor}10, inset 0 0 40px rgba(0,0,0,0.5)`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Brass corner accents */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 rounded-tl-2xl" style={{ borderColor: `${brassColor}40` }} />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 rounded-tr-2xl" style={{ borderColor: `${brassColor}40` }} />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 rounded-bl-2xl" style={{ borderColor: `${brassColor}40` }} />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 rounded-br-2xl" style={{ borderColor: `${brassColor}40` }} />

            {/* Close button */}
            <button
              onClick={() => setSelectedStar(null)}
              className="absolute top-3 right-3 size-8 rounded-full flex items-center justify-center cursor-pointer"
              style={{
                backgroundColor: "rgba(205, 133, 63, 0.08)",
                border: `1px solid ${brassColor}20`,
              }}
            >
              <X className="size-4" style={{ color: "rgba(205, 133, 63, 0.6)" }} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2.5" style={{ background: `${goldColor}15` }}>
                <Telescope className="size-5" style={{ color: goldColor }} />
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: goldColor }}>
                  Spyglass View
                </div>
                <h3 className="text-lg font-bold" style={{ color: "rgba(255,255,255,0.9)" }}>
                  {selectedStar.label}
                </h3>
              </div>
            </div>

            <p className="text-xs" style={{ color: "rgba(205, 133, 63, 0.5)" }}>
              Plot the orbital trajectory for this body. Shape how you will reach your target.
            </p>

            {/* Curve Editor */}
            <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 12, padding: 4 }}>
              <MilestoneCurveEditor
                config={curveConfigs.get(selectedStar.id) || selectedStar.template.defaultMilestoneConfig}
                onChange={(config) => handleCurveChange(selectedStar.id, config)}
                themeId="zen"
                allowDirectEdit
              />
            </div>

            <Button
              onClick={() => setSelectedStar(null)}
              className="w-full cursor-pointer"
              style={{
                backgroundColor: goldColor,
                color: "#0a0a1a",
                boxShadow: `0 0 12px ${goldColor}40`,
              }}
            >
              Lock Trajectory
            </Button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        className="sticky bottom-0 backdrop-blur-sm py-4 -mx-6 px-6"
        style={{
          backgroundColor: "rgba(10, 10, 26, 0.95)",
          borderTop: `1px solid ${brassColor}12`,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
            <span className="font-medium" style={{ color: goldColor }}>{constellationName}</span>
            {totalConfigurable > 0 && (
              <span className="text-xs ml-2" style={{ color: "rgba(205, 133, 63, 0.4)" }}>
                {totalConfigured}/{totalConfigurable} trajectories plotted
              </span>
            )}
          </div>
          <Button
            onClick={handleConfirm}
            className="cursor-pointer"
            style={{
              backgroundColor: goldColor,
              color: "#0a0a1a",
              boxShadow: `0 0 12px ${goldColor}40`,
            }}
          >
            Engage the Orrery
            <Sparkles className="size-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Tiny background stars with brass tint */
function BackgroundStars() {
  const [stars, setStars] = useState<{ id: number; x: number; y: number; size: number; opacity: number; delay: number }[]>([])

  useEffect(() => {
    setStars(
      Array.from({ length: 80 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 1.2 + 0.3,
        opacity: Math.random() * 0.2 + 0.03,
        delay: Math.random() * 4,
      }))
    )
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {stars.map((s) => (
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
            animation: `orreryBgTwinkle ${2 + s.delay}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes orreryBgTwinkle {
          0%, 100% { opacity: 0.03; }
          50% { opacity: 0.2; }
        }
      `}</style>
    </div>
  )
}
