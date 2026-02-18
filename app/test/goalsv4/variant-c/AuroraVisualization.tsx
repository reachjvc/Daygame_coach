"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { X, ChevronRight, Sparkles, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MilestoneCurveEditor } from "@/src/goals/components/MilestoneCurveEditor"
import type { GoalTemplate, MilestoneLadderConfig } from "@/src/goals/types"
import type { GoalCustomization } from "../VariantC"

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

interface IntensityPoint {
  x: number
  y: number
  id: string
  label: string
  level: number
  brightness: number
  size: number
  template: GoalTemplate | null
  color: string
  glowColor: string
}

function computeIntensityPoints(
  path: "one_person" | "abundance",
  selectedL1: GoalTemplate,
  selectedL2s: GoalTemplate[],
  selectedL3s: GoalTemplate[],
): IntensityPoint[] {
  const aurora = PATH_AURORA[path]
  const points: IntensityPoint[] = []

  // L1 at top center
  points.push({
    x: 50,
    y: 20,
    id: selectedL1.id,
    label: selectedL1.title,
    level: 1,
    brightness: 1,
    size: 5.5,
    template: selectedL1,
    color: aurora.primary,
    glowColor: aurora.glowBright,
  })

  // L2 points along arc
  const l2YBase = 36
  selectedL2s.forEach((l2, i) => {
    const spread = Math.min(72, selectedL2s.length * 14)
    const xStart = 50 - spread / 2
    const x = selectedL2s.length === 1 ? 50 : xStart + (i / Math.max(1, selectedL2s.length - 1)) * spread
    const yJitter = Math.sin(i * 2.3) * 4
    points.push({
      x,
      y: l2YBase + yJitter,
      id: l2.id,
      label: l2.title,
      level: 2,
      brightness: 0.7,
      size: 3.5,
      template: l2,
      color: aurora.secondary,
      glowColor: aurora.glow,
    })
  })

  // L3 scattered nodes
  const l3YBase = 56
  selectedL3s.forEach((l3, i) => {
    const row = Math.floor(i / 8)
    const col = i % 8
    const xSpread = 82
    const xStart = 50 - xSpread / 2
    const xStep = xSpread / Math.min(8, selectedL3s.length || 1)
    const x = xStart + col * xStep + (Math.sin(i * 3.7) * 3)
    const y = l3YBase + row * 9 + (Math.cos(i * 2.1) * 3)

    points.push({
      x: Math.max(6, Math.min(94, x)),
      y: Math.max(10, Math.min(88, y)),
      id: l3.id,
      label: l3.title,
      level: 3,
      brightness: 0.3 + Math.random() * 0.2,
      size: 1.6,
      template: l3,
      color: i % 2 === 0 ? aurora.primary : aurora.secondary,
      glowColor: `${aurora.primary}25`,
    })
  })

  return points
}

interface AuroraVisualizationProps {
  path: "one_person" | "abundance"
  selectedL1: GoalTemplate
  selectedL2s: GoalTemplate[]
  selectedL3s: GoalTemplate[]
  goals: GoalCustomization[]
  onBack: () => void
  onConfirm: (curveConfigs: Map<string, MilestoneLadderConfig>) => void
}

export function AuroraVisualization({
  path,
  selectedL1,
  selectedL2s,
  selectedL3s,
  goals,
  onBack,
  onConfirm,
}: AuroraVisualizationProps) {
  const aurora = PATH_AURORA[path]
  const auroraName = AURORA_NAMES[path] ?? "Aurora Voyager"

  const [selectedPoint, setSelectedPoint] = useState<IntensityPoint | null>(null)
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null)
  const [curveConfigs, setCurveConfigs] = useState<Map<string, MilestoneLadderConfig>>(() => {
    const map = new Map<string, MilestoneLadderConfig>()
    for (const tmpl of [...selectedL2s, ...selectedL3s]) {
      if (tmpl.defaultMilestoneConfig) {
        map.set(tmpl.id, { ...tmpl.defaultMilestoneConfig })
      }
    }
    return map
  })
  const [configuredPoints, setConfiguredPoints] = useState<Set<string>>(new Set())
  const [animPhases, setAnimPhases] = useState<number[]>([])

  const intensityPoints = useMemo(
    () => computeIntensityPoints(path, selectedL1, selectedL2s, selectedL3s),
    [path, selectedL1, selectedL2s, selectedL3s]
  )

  useEffect(() => {
    setAnimPhases(intensityPoints.map(() => Math.random() * Math.PI * 2))
  }, [intensityPoints.length])

  // Aurora ribbon connections
  const auroraConnections = useMemo(() => {
    const connections: { x1: number; y1: number; x2: number; y2: number; opacity: number; color1: string; color2: string }[] = []
    const l1Point = intensityPoints.find((p) => p.level === 1)
    if (!l1Point) return connections

    for (const p of intensityPoints.filter((p) => p.level === 2)) {
      connections.push({
        x1: l1Point.x,
        y1: l1Point.y,
        x2: p.x,
        y2: p.y,
        opacity: 0.2,
        color1: aurora.primary,
        color2: aurora.secondary,
      })
    }

    const l2Points = intensityPoints.filter((p) => p.level === 2)
    for (const l3 of intensityPoints.filter((p) => p.level === 3)) {
      let closestL2 = l2Points[0]
      let minDist = Infinity
      for (const l2 of l2Points) {
        const dx = l3.x - l2.x
        const dy = l3.y - l2.y
        const dist = dx * dx + dy * dy
        if (dist < minDist) {
          minDist = dist
          closestL2 = l2
        }
      }
      if (closestL2) {
        connections.push({
          x1: closestL2.x,
          y1: closestL2.y,
          x2: l3.x,
          y2: l3.y,
          opacity: 0.06,
          color1: aurora.secondary,
          color2: aurora.primary,
        })
      }
    }

    return connections
  }, [intensityPoints, aurora])

  const handleCurveChange = useCallback((pointId: string, config: MilestoneLadderConfig) => {
    setCurveConfigs((prev) => {
      const next = new Map(prev)
      next.set(pointId, config)
      return next
    })
    setConfiguredPoints((prev) => new Set(prev).add(pointId))
  }, [])

  const milestoneScoredPoints = useMemo(() => {
    return intensityPoints.filter((p) => p.template?.defaultMilestoneConfig)
  }, [intensityPoints])

  const totalConfigurable = milestoneScoredPoints.length
  const totalConfigured = configuredPoints.size

  // Tooltip for hovered L3 points
  const hoveredPointData = hoveredPoint ? intensityPoints.find((p) => p.id === hoveredPoint) : null

  return (
    <div className="relative space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-sm transition-colors cursor-pointer font-light" style={{ color: "rgba(255,255,255,0.45)" }}>
          <ChevronRight className="size-4 rotate-180" />
          Back to customize
        </button>
        <div className="flex items-center gap-2">
          <Eye className="size-4" style={{ color: aurora.primary }} />
          <span className="text-sm font-light tracking-wide" style={{ color: aurora.primary }}>Magnetosphere</span>
        </div>
      </div>

      {/* Title */}
      <div className="text-center space-y-1">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-light tracking-wider"
          style={{
            background: `${aurora.primary}08`,
            color: aurora.primary,
            border: `1px solid ${aurora.primary}18`,
          }}
        >
          <Sparkles className="size-3" />
          {auroraName}
        </div>
        <h2 className="text-xl font-light tracking-wide" style={{ color: "rgba(255,255,255,0.9)" }}>
          Your Aurora
        </h2>
        <p className="text-xs font-light" style={{ color: "rgba(255,255,255,0.3)" }}>
          Click any bright point to shape its growth trajectory. Hover for details.
        </p>
      </div>

      {/* Main visualization */}
      <div className="flex gap-4">
        <div
          className="flex-1 relative rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(180deg, #020815 0%, #030a18 40%, #041020 70%, #020815 100%)",
            border: `1px solid ${aurora.primary}12`,
            minHeight: 480,
          }}
        >
          {/* Aurora background */}
          <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
            <div
              className="absolute"
              style={{
                left: "8%",
                top: "3%",
                width: "84%",
                height: "72%",
                background: `linear-gradient(180deg,
                  transparent 0%,
                  ${aurora.primary}12 18%,
                  ${aurora.secondary}22 38%,
                  ${aurora.primary}18 58%,
                  ${aurora.secondary}08 78%,
                  transparent 100%)`,
                filter: "blur(45px)",
                animation: "vizAuroraSway 14s ease-in-out infinite",
                borderRadius: "50%",
              }}
            />
            <div
              className="absolute"
              style={{
                left: "18%",
                top: "8%",
                width: "64%",
                height: "55%",
                background: `radial-gradient(ellipse at 50% 40%, ${aurora.primary}08 0%, transparent 70%)`,
                animation: "vizAuroraPulse 10s ease-in-out infinite",
              }}
            />
            <VizStars />
          </div>

          {/* SVG overlay */}
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full"
            style={{ minHeight: 480, position: "relative", zIndex: 1 }}
          >
            <defs>
              <filter id="viz-glow-l1">
                <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" result="blur" />
                <feFlood floodColor={aurora.primary} floodOpacity="0.7" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="viz-glow-l2">
                <feGaussianBlur in="SourceAlpha" stdDeviation="0.8" result="blur" />
                <feFlood floodColor={aurora.secondary} floodOpacity="0.5" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="viz-glow-l3">
                <feGaussianBlur in="SourceAlpha" stdDeviation="0.4" result="blur" />
                <feFlood floodColor={aurora.primary} floodOpacity="0.3" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="viz-ribbon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={aurora.primary} stopOpacity="0.25" />
                <stop offset="50%" stopColor={aurora.secondary} stopOpacity="0.12" />
                <stop offset="100%" stopColor={aurora.primary} stopOpacity="0.04" />
              </linearGradient>
            </defs>

            {/* Connections */}
            {auroraConnections.map((conn, i) => {
              const midX = (conn.x1 + conn.x2) / 2
              const midY = (conn.y1 + conn.y2) / 2
              const cpOffsetX = (conn.x2 - conn.x1) * 0.1
              const cpOffsetY = Math.abs(conn.y2 - conn.y1) * 0.3
              const d = `M ${conn.x1} ${conn.y1} Q ${midX + cpOffsetX} ${midY - cpOffsetY} ${conn.x2} ${conn.y2}`

              return (
                <path
                  key={i}
                  d={d}
                  fill="none"
                  stroke="url(#viz-ribbon-grad)"
                  strokeWidth={conn.opacity > 0.1 ? 0.35 : 0.12}
                  strokeOpacity={conn.opacity}
                />
              )
            })}

            {/* Points */}
            {intensityPoints.map((point, idx) => {
              const isSelected = selectedPoint?.id === point.id
              const isHovered = hoveredPoint === point.id
              const isConfigured = configuredPoints.has(point.id)
              const hasConfig = point.template?.defaultMilestoneConfig
              const phase = animPhases[idx] ?? 0

              return (
                <g key={point.id}>
                  {/* Pulse ring for L1/L2 */}
                  {point.level <= 2 && (
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={point.size * 2}
                      fill="none"
                      stroke={point.color}
                      strokeWidth={0.1}
                      strokeOpacity={0.15}
                    >
                      <animate
                        attributeName="r"
                        values={`${point.size * 1.5};${point.size * 2.5};${point.size * 1.5}`}
                        dur={`${3 + phase}s`}
                        begin={`${phase}s`}
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="stroke-opacity"
                        values="0.2;0.04;0.2"
                        dur={`${3 + phase}s`}
                        begin={`${phase}s`}
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}

                  {/* Configured ring */}
                  {isConfigured && (
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={point.size + 1}
                      fill="none"
                      stroke="#4ade80"
                      strokeWidth={0.15}
                      strokeOpacity={0.45}
                      strokeDasharray="0.4,0.4"
                    />
                  )}

                  {/* Hover highlight ring */}
                  {isHovered && (
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={point.size * 1.8}
                      fill="none"
                      stroke={point.color}
                      strokeWidth={0.12}
                      strokeOpacity={0.5}
                    />
                  )}

                  {/* Point body */}
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={isSelected || isHovered ? point.size * 1.3 : point.size}
                    fill={point.color}
                    fillOpacity={point.brightness}
                    filter={
                      point.level === 1
                        ? "url(#viz-glow-l1)"
                        : point.level === 2
                          ? "url(#viz-glow-l2)"
                          : "url(#viz-glow-l3)"
                    }
                    className={hasConfig ? "cursor-pointer" : ""}
                    style={{ transition: "r 0.2s ease" }}
                    onClick={() => {
                      if (hasConfig) setSelectedPoint(point)
                    }}
                    onMouseEnter={() => setHoveredPoint(point.id)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    {point.level === 3 && (
                      <animate
                        attributeName="fill-opacity"
                        values={`${point.brightness * 0.4};${point.brightness};${point.brightness * 0.4}`}
                        dur={`${2 + (phase % 2)}s`}
                        begin={`${phase}s`}
                        repeatCount="indefinite"
                      />
                    )}
                  </circle>

                  {/* Labels for L1/L2 */}
                  {point.level <= 2 && (
                    <text
                      x={point.x}
                      y={point.y + point.size + 2.5}
                      textAnchor="middle"
                      fill={point.color}
                      fillOpacity={0.55}
                      fontSize={point.level === 1 ? 2 : 1.3}
                      fontWeight={300}
                      style={{ fontFamily: "inherit" }}
                    >
                      {point.label.length > 30 ? point.label.slice(0, 28) + "..." : point.label}
                    </text>
                  )}

                  {/* Hit area for clicks */}
                  {hasConfig && (
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={Math.max(point.size * 2, 3.5)}
                      fill="transparent"
                      className="cursor-pointer"
                      onClick={() => setSelectedPoint(point)}
                      onMouseEnter={() => setHoveredPoint(point.id)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  )}
                  {/* Hit area for hover on L3 without config */}
                  {!hasConfig && point.level === 3 && (
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={Math.max(point.size * 2.5, 2.5)}
                      fill="transparent"
                      onMouseEnter={() => setHoveredPoint(point.id)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  )}
                </g>
              )
            })}
          </svg>

          {/* Hover tooltip */}
          {hoveredPointData && hoveredPointData.level === 3 && (
            <div
              className="absolute z-20 pointer-events-none px-3 py-2 rounded-lg"
              style={{
                left: `${hoveredPointData.x}%`,
                top: `${hoveredPointData.y - 6}%`,
                transform: "translate(-50%, -100%)",
                background: "rgba(2, 8, 21, 0.95)",
                border: `1px solid ${aurora.primary}25`,
                boxShadow: `0 0 15px ${aurora.glow}`,
                backdropFilter: "blur(8px)",
              }}
            >
              <div className="text-xs font-light" style={{ color: "rgba(255,255,255,0.85)" }}>
                {hoveredPointData.label}
              </div>
              <div className="text-[10px] font-light mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                {hoveredPointData.template?.defaultMilestoneConfig ? "Click to shape curve" : "Habit tracker"}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="absolute bottom-3 left-3 space-y-1.5 z-10">
            <div className="flex items-center gap-2">
              <div
                className="size-3 rounded-full"
                style={{ background: aurora.gradient, boxShadow: `0 0 6px ${aurora.glowBright}` }}
              />
              <span className="text-[10px] font-light" style={{ color: "rgba(255,255,255,0.4)" }}>
                Brightest Band (L1)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="size-2.5 rounded-full"
                style={{ backgroundColor: aurora.secondary, boxShadow: `0 0 4px ${aurora.glow}` }}
              />
              <span className="text-[10px] font-light" style={{ color: "rgba(255,255,255,0.3)" }}>
                Intensity Points (L2)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-1.5 rounded-full" style={{ backgroundColor: aurora.primary, opacity: 0.4 }} />
              <span className="text-[10px] font-light" style={{ color: "rgba(255,255,255,0.22)" }}>
                Glowing Nodes (L3)
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="absolute top-3 right-3 text-right space-y-0.5 z-10">
            <div className="text-[10px] font-light" style={{ color: "rgba(255,255,255,0.22)" }}>
              {intensityPoints.length} lights
            </div>
            <div className="text-[10px] font-light" style={{ color: "rgba(255,255,255,0.22)" }}>
              {auroraConnections.length} ribbons
            </div>
            {totalConfigurable > 0 && (
              <div
                className="text-[10px] font-light"
                style={{ color: totalConfigured > 0 ? "#4ade80" : "rgba(255,255,255,0.22)" }}
              >
                {totalConfigured}/{totalConfigurable} observed
              </div>
            )}
          </div>

          {/* Mountains at bottom */}
          <div className="absolute bottom-0 left-0 right-0 z-[2]">
            <svg viewBox="0 0 400 40" preserveAspectRatio="none" className="w-full" style={{ height: 40, display: "block" }}>
              <path
                d="M0,40 L0,28 L30,22 L60,26 L90,18 L120,24 L150,14 L180,20 L210,12 L240,18 L270,10 L300,16 L330,20 L360,14 L390,22 L400,18 L400,40 Z"
                fill="#020815"
              />
            </svg>
          </div>
        </div>

        {/* Sidebar legend */}
        <div
          className="w-52 flex-shrink-0 rounded-xl p-3 space-y-3 hidden lg:block"
          style={{
            background: "rgba(255,255,255,0.012)",
            border: "1px solid rgba(255,255,255,0.03)",
          }}
        >
          <div className="text-xs font-light uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.3)" }}>
            Aurora Legend
          </div>

          {/* L1 */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div
                className="size-2.5 rounded-full"
                style={{ background: aurora.gradient, boxShadow: `0 0 4px ${aurora.glowBright}` }}
              />
              <span className="text-[10px] font-light uppercase tracking-wider" style={{ color: aurora.primary }}>
                Brightest Band
              </span>
            </div>
            <div className="text-xs pl-5 font-light" style={{ color: "rgba(255,255,255,0.5)" }}>
              {selectedL1.title}
            </div>
          </div>

          {/* L2 */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="size-2 rounded-full" style={{ backgroundColor: aurora.secondary }} />
              <span className="text-[10px] font-light uppercase tracking-wider" style={{ color: aurora.secondary }}>
                Bright Points
              </span>
            </div>
            <div className="space-y-0.5 pl-5">
              {selectedL2s.map((l2) => (
                <div key={l2.id} className="text-[10px] font-light" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {l2.title}
                </div>
              ))}
            </div>
          </div>

          {/* L3 */}
          <div>
            <div className="flex items-center gap-2">
              <div className="size-1.5 rounded-full" style={{ backgroundColor: aurora.primary, opacity: 0.5 }} />
              <span className="text-[10px] font-light" style={{ color: "rgba(255,255,255,0.25)" }}>
                {selectedL3s.length} glowing nodes
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Curve Editor Modal */}
      {selectedPoint && selectedPoint.template?.defaultMilestoneConfig && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
          onClick={() => setSelectedPoint(null)}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl p-6 space-y-4"
            style={{
              background: "linear-gradient(135deg, #030a18 0%, #041020 50%, #030a18 100%)",
              border: `1px solid ${aurora.primary}25`,
              boxShadow: `0 0 60px ${aurora.glow}, inset 0 0 40px rgba(0,0,0,0.5)`,
              backdropFilter: "blur(20px)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="absolute inset-0 rounded-2xl opacity-20"
              style={{
                background: `radial-gradient(ellipse at 30% 20%, ${aurora.primary}12 0%, transparent 60%)`,
                pointerEvents: "none",
              }}
            />

            <button
              onClick={() => setSelectedPoint(null)}
              className="absolute top-3 right-3 size-8 rounded-full flex items-center justify-center cursor-pointer z-10"
              style={{
                backgroundColor: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <X className="size-4" style={{ color: "rgba(255,255,255,0.4)" }} />
            </button>

            <div className="relative flex items-center gap-3">
              <div
                className="rounded-xl p-2.5"
                style={{
                  background: `${aurora.primary}10`,
                  boxShadow: `0 0 12px ${aurora.glow}`,
                }}
              >
                <Eye className="size-5" style={{ color: aurora.primary }} />
              </div>
              <div>
                <div className="text-[10px] font-light uppercase tracking-[0.15em]" style={{ color: aurora.primary }}>
                  Polar Observation
                </div>
                <h3 className="text-lg font-light tracking-wide" style={{ color: "rgba(255,255,255,0.9)" }}>
                  {selectedPoint.label}
                </h3>
              </div>
            </div>

            <p className="text-xs font-light relative" style={{ color: "rgba(255,255,255,0.3)" }}>
              Shape the intensity curve. Plot how this light will grow over time.
            </p>

            <div className="relative" style={{ background: "rgba(0,0,0,0.25)", borderRadius: 12, padding: 4 }}>
              <MilestoneCurveEditor
                config={curveConfigs.get(selectedPoint.id) || selectedPoint.template.defaultMilestoneConfig}
                onChange={(config) => handleCurveChange(selectedPoint.id, config)}
                themeId="zen"
                allowDirectEdit
              />
            </div>

            <Button
              onClick={() => setSelectedPoint(null)}
              className="w-full relative font-light tracking-wide"
              style={{
                background: aurora.gradient,
                boxShadow: `0 0 16px ${aurora.glow}`,
              }}
            >
              Save Observation
            </Button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        className="sticky bottom-0 backdrop-blur-md py-4 -mx-6 px-6"
        style={{
          backgroundColor: "rgba(2, 8, 21, 0.92)",
          borderTop: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-light" style={{ color: "rgba(255,255,255,0.4)" }}>
            <span className="font-medium" style={{ color: aurora.primary }}>{auroraName}</span>
            {totalConfigurable > 0 && (
              <span className="text-xs ml-2" style={{ color: "rgba(255,255,255,0.25)" }}>
                {totalConfigured}/{totalConfigurable} observations
              </span>
            )}
          </div>
          <Button
            onClick={() => onConfirm(curveConfigs)}
            className="font-light tracking-wide"
            style={{
              background: aurora.gradient,
              boxShadow: `0 0 16px ${aurora.glow}`,
            }}
          >
            Complete Aurora
            <Sparkles className="size-4 ml-1" />
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes vizAuroraSway {
          0%, 100% { transform: skewX(-2deg) translateX(0); opacity: 0.55; }
          25% { transform: skewX(1deg) translateX(5px); opacity: 0.75; }
          50% { transform: skewX(-3deg) translateX(-3px); opacity: 0.45; }
          75% { transform: skewX(2deg) translateX(8px); opacity: 0.65; }
        }
        @keyframes vizAuroraPulse {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 0.55; }
        }
      `}</style>
    </div>
  )
}

function VizStars() {
  const [stars, setStars] = useState<
    { id: number; x: number; y: number; size: number; opacity: number; delay: number }[]
  >([])

  useEffect(() => {
    setStars(
      Array.from({ length: 70 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 1 + 0.3,
        opacity: Math.random() * 0.2 + 0.03,
        delay: Math.random() * 5,
      }))
    )
  }, [])

  return (
    <>
      {stars.map((s) => (
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
            animation: `vizTwinkle ${2 + s.delay}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes vizTwinkle {
          0%, 100% { opacity: 0.03; }
          50% { opacity: 0.18; }
        }
      `}</style>
    </>
  )
}
