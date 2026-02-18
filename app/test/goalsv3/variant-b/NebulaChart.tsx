"use client"

import { useState, useMemo, useEffect } from "react"
import { Telescope, X, Star, ChevronRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MilestoneCurveEditor } from "@/src/goals/components/MilestoneCurveEditor"
import type { GoalTemplate, MilestoneLadderConfig } from "@/src/goals/types"
import type { GoalCustomization } from "./NebulaCustomizer"
import { NebulaCanvas } from "./NebulaCanvas"

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

interface NebulaChartProps {
  path: "one_person" | "abundance"
  selectedL1: GoalTemplate
  selectedL2s: GoalTemplate[]
  selectedL3s: GoalTemplate[]
  goals: GoalCustomization[]
  pathColor: string
  onBack: () => void
  onConfirm: (curveConfigs: Map<string, MilestoneLadderConfig>) => void
}

/** Compute star positions in a radial layout with nebula-influenced jitter */
function computeStarPositions(
  selectedL1: GoalTemplate,
  selectedL2s: GoalTemplate[],
  selectedL3s: GoalTemplate[],
): StarPosition[] {
  const positions: StarPosition[] = []
  const centerX = 50
  const centerY = 50

  // Supergiant (L1) at center
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

  // L2 stars in an inner ring
  const l2Radius = 20
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
      size: 4.5,
      template: l2,
    })
  })

  // L3 stars in an outer ring with jitter
  const l3Radius = 36
  const totalL3 = selectedL3s.length
  selectedL3s.forEach((l3, i) => {
    const angle = (i / totalL3) * Math.PI * 2 - Math.PI / 2
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
      size: 2,
      template: l3,
    })
  })

  return positions
}

export function NebulaChart({
  path,
  selectedL1,
  selectedL2s,
  selectedL3s,
  goals,
  pathColor,
  onBack,
  onConfirm,
}: NebulaChartProps) {
  const nebulaName = NEBULA_NAMES[path] ?? "Orion Nebula"

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
    const lines: { x1: number; y1: number; x2: number; y2: number; opacity: number; level: number }[] = []
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
            level: star.level,
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

  const milestoneScoredStars = useMemo(() => {
    return starPositions.filter((s) => s.template?.defaultMilestoneConfig)
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
        <button onClick={onBack} className="flex items-center gap-2 text-sm transition-colors cursor-pointer" style={{ color: "rgba(255,255,255,0.4)" }}>
          <ChevronRight className="size-4 rotate-180" />
          Back to calibrate
        </button>
        <div
          className="flex items-center gap-2 px-3 py-1 rounded-full"
          style={{
            background: hexToRgba(pathColor, 0.08),
            border: `1px solid ${hexToRgba(pathColor, 0.2)}`,
          }}
        >
          <Telescope className="size-3.5" style={{ color: pathColor }} />
          <span className="text-xs font-medium" style={{ color: pathColor }}>Deep Scan</span>
        </div>
      </div>

      {/* Nebula name + instruction */}
      <div className="text-center space-y-1">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
          style={{
            background: hexToRgba(pathColor, 0.08),
            color: pathColor,
            border: `1px solid ${hexToRgba(pathColor, 0.2)}`,
            textShadow: `0 0 8px ${hexToRgba(pathColor, 0.3)}`,
          }}
        >
          <Sparkles className="size-3" />
          {nebulaName}
        </div>
        <h2
          className="text-xl font-bold"
          style={{
            color: "rgba(255,255,255,0.9)",
            textShadow: `0 0 20px ${hexToRgba(pathColor, 0.15)}`,
          }}
        >
          Stars Emerging from the Nebula
        </h2>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
          Click any bright star to deep-scan its trajectory with the telescope
        </p>
      </div>

      {/* Star map with nebula background */}
      <div className="flex gap-4">
        <div
          className="flex-1 relative rounded-2xl overflow-hidden"
          style={{
            background: "#000005",
            border: `1px solid ${hexToRgba(pathColor, 0.1)}`,
            minHeight: 480,
          }}
        >
          {/* Nebula gas background within the star map */}
          <NebulaCanvas
            particleCount={120}
            intensity={0.8}
            regions={[
              // Central nebula gas around the supergiant
              { x: 50, y: 50, rx: 30, ry: 25, color: pathColor, opacity: 0.06, rotation: 0 },
              { x: 45, y: 45, rx: 20, ry: 18, color: pathColor, opacity: 0.04, rotation: 20 },
              // Outer gas wisps
              { x: 25, y: 30, rx: 18, ry: 15, color: "#6366f1", opacity: 0.03, rotation: -15 },
              { x: 75, y: 35, rx: 15, ry: 12, color: "#a855f7", opacity: 0.03, rotation: 10 },
              { x: 30, y: 70, rx: 16, ry: 14, color: "#3b82f6", opacity: 0.025, rotation: -5 },
              { x: 70, y: 70, rx: 14, ry: 12, color: "#14b8a6", opacity: 0.025, rotation: 8 },
            ]}
          />

          <svg
            viewBox="0 0 100 100"
            className="w-full h-full relative"
            style={{ minHeight: 480, zIndex: 1 }}
          >
            <defs>
              {/* Supergiant glow with lens flare */}
              <filter id="nebula-supergiant-glow">
                <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
                <feFlood floodColor={pathColor} floodOpacity="0.7" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Main sequence glow */}
              <filter id="nebula-main-glow">
                <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur" />
                <feFlood floodColor={pathColor} floodOpacity="0.5" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Young star glow */}
              <filter id="nebula-young-glow">
                <feGaussianBlur in="SourceAlpha" stdDeviation="0.5" result="blur" />
                <feFlood floodColor="#e0e7ff" floodOpacity="0.3" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Plasma gradient for connection lines */}
              <linearGradient id="plasma-line" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={pathColor} stopOpacity="0.3" />
                <stop offset="50%" stopColor={pathColor} stopOpacity="0.15" />
                <stop offset="100%" stopColor={pathColor} stopOpacity="0.3" />
              </linearGradient>
            </defs>

            {/* Gas/Plasma connection lines */}
            {constellationLines.map((line, i) => (
              <g key={i}>
                {/* Main line */}
                <line
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke={pathColor}
                  strokeOpacity={line.opacity}
                  strokeWidth={line.level === 2 ? 0.2 : 0.1}
                />
                {/* Glow line (wider, more transparent) */}
                {line.level === 2 && (
                  <line
                    x1={line.x1}
                    y1={line.y1}
                    x2={line.x2}
                    y2={line.y2}
                    stroke={pathColor}
                    strokeOpacity={0.06}
                    strokeWidth={1}
                  />
                )}
              </g>
            ))}

            {/* Stars */}
            {starPositions.map((star, idx) => {
              const isSelected = selectedStar?.id === star.id
              const isConfigured = configuredStars.has(star.id)
              const hasConfig = star.template?.defaultMilestoneConfig
              const twinkleDelay = twinklePhases[idx] || 0

              return (
                <g key={star.id}>
                  {/* Supergiant lens flare (L1 only) */}
                  {star.level === 1 && (
                    <>
                      {/* Horizontal lens flare ray */}
                      <line
                        x1={star.x - 12}
                        y1={star.y}
                        x2={star.x + 12}
                        y2={star.y}
                        stroke={pathColor}
                        strokeOpacity={0.15}
                        strokeWidth={0.1}
                      />
                      {/* Vertical lens flare ray */}
                      <line
                        x1={star.x}
                        y1={star.y - 12}
                        x2={star.x}
                        y2={star.y + 12}
                        stroke={pathColor}
                        strokeOpacity={0.12}
                        strokeWidth={0.1}
                      />
                      {/* Diagonal rays */}
                      <line
                        x1={star.x - 8}
                        y1={star.y - 8}
                        x2={star.x + 8}
                        y2={star.y + 8}
                        stroke={pathColor}
                        strokeOpacity={0.08}
                        strokeWidth={0.08}
                      />
                      <line
                        x1={star.x + 8}
                        y1={star.y - 8}
                        x2={star.x - 8}
                        y2={star.y + 8}
                        stroke={pathColor}
                        strokeOpacity={0.08}
                        strokeWidth={0.08}
                      />
                      {/* Corona glow rings */}
                      <circle
                        cx={star.x}
                        cy={star.y}
                        r={star.size * 2.5}
                        fill="none"
                        stroke={pathColor}
                        strokeWidth={0.08}
                        strokeOpacity={0.15}
                      >
                        <animate
                          attributeName="r"
                          values={`${star.size * 2};${star.size * 3};${star.size * 2}`}
                          dur="4s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="stroke-opacity"
                          values="0.15;0.03;0.15"
                          dur="4s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    </>
                  )}

                  {/* Corona glow for L2 stars */}
                  {star.level === 2 && (
                    <circle
                      cx={star.x}
                      cy={star.y}
                      r={star.size * 2}
                      fill="none"
                      stroke={pathColor}
                      strokeWidth={0.06}
                      strokeOpacity={0.2}
                    >
                      <animate
                        attributeName="r"
                        values={`${star.size * 1.5};${star.size * 2.2};${star.size * 1.5}`}
                        dur="3s"
                        begin={`${twinkleDelay}s`}
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="stroke-opacity"
                        values="0.2;0.05;0.2"
                        dur="3s"
                        begin={`${twinkleDelay}s`}
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}

                  {/* Configured indicator ring */}
                  {isConfigured && (
                    <circle
                      cx={star.x}
                      cy={star.y}
                      r={star.size + 1.2}
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth={0.15}
                      strokeOpacity={0.5}
                      strokeDasharray="0.5,0.5"
                    >
                      <animate
                        attributeName="stroke-opacity"
                        values="0.3;0.6;0.3"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}

                  {/* Star body */}
                  <circle
                    cx={star.x}
                    cy={star.y}
                    r={isSelected ? star.size * 1.4 : star.size}
                    fill={
                      star.level === 1
                        ? pathColor
                        : star.level === 2
                          ? pathColor
                          : "#c7d2fe"
                    }
                    fillOpacity={star.brightness}
                    filter={
                      star.level === 1
                        ? "url(#nebula-supergiant-glow)"
                        : star.level === 2
                          ? "url(#nebula-main-glow)"
                          : "url(#nebula-young-glow)"
                    }
                    className={hasConfig ? "cursor-pointer" : ""}
                    onClick={() => {
                      if (hasConfig) setSelectedStar(star)
                    }}
                  >
                    {star.level === 3 && (
                      <animate
                        attributeName="fill-opacity"
                        values={`${star.brightness * 0.4};${star.brightness};${star.brightness * 0.4}`}
                        dur={`${2 + (twinkleDelay % 2)}s`}
                        begin={`${twinkleDelay}s`}
                        repeatCount="indefinite"
                      />
                    )}
                  </circle>

                  {/* Star labels (L1 and L2 only) */}
                  {star.level <= 2 && (
                    <text
                      x={star.x}
                      y={star.y + star.size + 2.8}
                      textAnchor="middle"
                      fill={pathColor}
                      fillOpacity={star.level === 1 ? 0.8 : 0.5}
                      fontSize={star.level === 1 ? 2.2 : 1.5}
                      fontWeight={star.level === 1 ? 700 : 500}
                      style={{ textShadow: `0 0 4px ${hexToRgba(pathColor, 0.3)}` } as React.CSSProperties}
                    >
                      {star.label.length > 25 ? star.label.slice(0, 23) + "..." : star.label}
                    </text>
                  )}

                  {/* Invisible hit area for clickable stars */}
                  {hasConfig && (
                    <circle
                      cx={star.x}
                      cy={star.y}
                      r={Math.max(star.size * 2.5, 4)}
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
                className="size-3 rounded-full"
                style={{
                  backgroundColor: pathColor,
                  boxShadow: `0 0 8px ${pathColor}, 0 0 16px ${hexToRgba(pathColor, 0.5)}`,
                }}
              />
              <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
                Supergiant (L1)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="size-2.5 rounded-full"
                style={{
                  backgroundColor: pathColor,
                  boxShadow: `0 0 4px ${hexToRgba(pathColor, 0.5)}`,
                }}
              />
              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                Main Sequence (L2)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-1.5 rounded-full" style={{ backgroundColor: "#c7d2fe", opacity: 0.5 }} />
              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                Young Stars (L3)
              </span>
            </div>
          </div>

          {/* Stats overlay */}
          <div className="absolute top-3 right-3 text-right space-y-0.5 z-10">
            <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
              {starPositions.length} stars
            </div>
            <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
              {constellationLines.length} gas streams
            </div>
            {totalConfigurable > 0 && (
              <div
                className="text-[10px]"
                style={{ color: totalConfigured > 0 ? "#22c55e" : "rgba(255,255,255,0.25)" }}
              >
                {totalConfigured}/{totalConfigurable} scanned
              </div>
            )}
          </div>
        </div>

        {/* Sidebar legend */}
        <div
          className="w-52 flex-shrink-0 rounded-xl p-3 space-y-3 hidden lg:block"
          style={{
            background: "rgba(255,255,255,0.01)",
            border: "1px solid rgba(255,255,255,0.04)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: hexToRgba(pathColor, 0.6) }}
          >
            Nebula Catalog
          </div>

          {/* Supergiant */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Star className="size-3" style={{ color: pathColor, filter: `drop-shadow(0 0 3px ${pathColor})` }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: pathColor }}>
                Supergiant
              </span>
            </div>
            <div className="text-xs pl-5" style={{ color: "rgba(255,255,255,0.55)" }}>
              {selectedL1.title}
            </div>
          </div>

          {/* Main Sequence */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Star className="size-2.5" style={{ color: hexToRgba(pathColor, 0.7) }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: hexToRgba(pathColor, 0.7) }}>
                Main Sequence
              </span>
            </div>
            <div className="space-y-0.5 pl-5">
              {selectedL2s.map((l2) => (
                <div key={l2.id} className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {l2.title}
                </div>
              ))}
            </div>
          </div>

          {/* Young stars */}
          <div>
            <div className="flex items-center gap-2">
              <Star className="size-2" style={{ color: "rgba(199,210,254,0.5)" }} />
              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                {selectedL3s.length} young stars
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Deep Scan Modal (Telescope / MilestoneCurveEditor) */}
      {selectedStar && selectedStar.template?.defaultMilestoneConfig && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,5,0.92)" }}
          onClick={() => setSelectedStar(null)}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl p-6 space-y-4"
            style={{
              background: `radial-gradient(ellipse at 30% 20%, ${hexToRgba(pathColor, 0.06)} 0%, #000008 50%, #000005 100%)`,
              border: `1px solid ${hexToRgba(pathColor, 0.2)}`,
              boxShadow: `0 0 60px ${hexToRgba(pathColor, 0.1)}, inset 0 0 40px rgba(0,0,0,0.5), 0 0 120px ${hexToRgba(pathColor, 0.05)}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setSelectedStar(null)}
              className="absolute top-3 right-3 size-8 rounded-full flex items-center justify-center cursor-pointer"
              style={{
                backgroundColor: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <X className="size-4" style={{ color: "rgba(255,255,255,0.4)" }} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div
                className="rounded-xl p-2.5"
                style={{
                  background: hexToRgba(pathColor, 0.1),
                  boxShadow: `0 0 16px ${hexToRgba(pathColor, 0.15)}`,
                }}
              >
                <Telescope className="size-5" style={{ color: pathColor }} />
              </div>
              <div>
                <div
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: pathColor, textShadow: `0 0 6px ${hexToRgba(pathColor, 0.3)}` }}
                >
                  Deep Scan
                </div>
                <h3 className="text-lg font-bold" style={{ color: "rgba(255,255,255,0.9)" }}>
                  {selectedStar.label}
                </h3>
              </div>
            </div>

            <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
              Plot the emission spectrum of this star. Shape how you will reach your target.
            </p>

            {/* Curve Editor */}
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: "rgba(0,0,0,0.4)",
                border: `1px solid ${hexToRgba(pathColor, 0.08)}`,
                padding: 4,
              }}
            >
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
                backgroundColor: pathColor,
                boxShadow: `0 0 16px ${hexToRgba(pathColor, 0.3)}, 0 0 32px ${hexToRgba(pathColor, 0.1)}`,
              }}
            >
              Save Scan Data
            </Button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        className="sticky bottom-0 backdrop-blur-md py-4 -mx-6 px-6"
        style={{
          backgroundColor: "rgba(0, 0, 5, 0.92)",
          borderTop: `1px solid ${hexToRgba(pathColor, 0.1)}`,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            <span
              className="font-medium"
              style={{ color: pathColor, textShadow: `0 0 8px ${hexToRgba(pathColor, 0.3)}` }}
            >
              {nebulaName}
            </span>
            {totalConfigurable > 0 && (
              <span className="text-xs ml-2" style={{ color: "rgba(255,255,255,0.25)" }}>
                {totalConfigured}/{totalConfigurable} trajectories plotted
              </span>
            )}
          </div>
          <Button
            onClick={handleConfirm}
            className="cursor-pointer"
            style={{
              backgroundColor: pathColor,
              boxShadow: `0 0 16px ${hexToRgba(pathColor, 0.3)}, 0 0 32px ${hexToRgba(pathColor, 0.1)}`,
            }}
          >
            Complete Nebula
            <Sparkles className="size-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  )
}
