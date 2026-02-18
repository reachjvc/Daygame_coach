"use client"

import { useState, useMemo, useEffect } from "react"
import { X, ChevronRight, Sparkles, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MilestoneCurveEditor } from "@/src/goals/components/MilestoneCurveEditor"
import type { GoalTemplate, MilestoneLadderConfig } from "@/src/goals/types"
import type { GoalCustomization } from "./AuroraCustomizer"

const AURORA_NAMES: Record<string, string> = {
  one_person: "Aurora Seekaris",
  abundance: "Aurora Abundantia",
}

// Aurora path color schemes
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

  // L1 — the solar flare, brightest point at top-center of the aurora
  points.push({
    x: 50,
    y: 22,
    id: selectedL1.id,
    label: selectedL1.title,
    level: 1,
    brightness: 1,
    size: 6,
    template: selectedL1,
    color: aurora.primary,
    glowColor: aurora.glowBright,
  })

  // L2 — secondary bright points along the main band
  const l2YBase = 38
  selectedL2s.forEach((l2, i) => {
    const spread = Math.min(70, selectedL2s.length * 14)
    const xStart = 50 - spread / 2
    const x = xStart + (i / Math.max(1, selectedL2s.length - 1)) * spread
    const yJitter = Math.sin(i * 2.3) * 5
    points.push({
      x: selectedL2s.length === 1 ? 50 : x,
      y: l2YBase + yJitter,
      id: l2.id,
      label: l2.title,
      level: 2,
      brightness: 0.75,
      size: 4,
      template: l2,
      color: aurora.secondary,
      glowColor: aurora.glow,
    })
  })

  // L3 — smaller glowing nodes scattered along the band's edges
  const l3YBase = 58
  const totalL3 = selectedL3s.length
  selectedL3s.forEach((l3, i) => {
    const row = Math.floor(i / 8)
    const col = i % 8
    const xSpread = 80
    const xStart = 50 - xSpread / 2
    const xStep = xSpread / Math.min(8, totalL3)
    const x = xStart + col * xStep + (Math.sin(i * 3.7) * 3)
    const y = l3YBase + row * 10 + (Math.cos(i * 2.1) * 3)

    points.push({
      x: Math.max(8, Math.min(92, x)),
      y: Math.max(10, Math.min(88, y)),
      id: l3.id,
      label: l3.title,
      level: 3,
      brightness: 0.35 + Math.random() * 0.15,
      size: 1.8,
      template: l3,
      color: i % 2 === 0 ? aurora.primary : aurora.secondary,
      glowColor: `${aurora.primary}30`,
    })
  })

  return points
}

interface AuroraChartProps {
  path: "one_person" | "abundance"
  selectedL1: GoalTemplate
  selectedL2s: GoalTemplate[]
  selectedL3s: GoalTemplate[]
  goals: GoalCustomization[]
  onBack: () => void
  onConfirm: (curveConfigs: Map<string, MilestoneLadderConfig>) => void
}

export function AuroraChart({
  path,
  selectedL1,
  selectedL2s,
  selectedL3s,
  goals,
  onBack,
  onConfirm,
}: AuroraChartProps) {
  const aurora = PATH_AURORA[path]
  const auroraName = AURORA_NAMES[path] ?? "Aurora Voyager"

  const [selectedPoint, setSelectedPoint] = useState<IntensityPoint | null>(null)
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

  // Aurora ribbon connections (curved, gradient, semi-transparent)
  const auroraConnections = useMemo(() => {
    const connections: { x1: number; y1: number; x2: number; y2: number; opacity: number; color1: string; color2: string }[] = []
    const l1Point = intensityPoints.find((p) => p.level === 1)
    if (!l1Point) return connections

    // L1 to L2 connections
    for (const p of intensityPoints.filter((p) => p.level === 2)) {
      connections.push({
        x1: l1Point.x,
        y1: l1Point.y,
        x2: p.x,
        y2: p.y,
        opacity: 0.25,
        color1: aurora.primary,
        color2: aurora.secondary,
      })
    }

    // L2 to nearest L3 connections (thin aurora ribbons)
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
          opacity: 0.08,
          color1: aurora.secondary,
          color2: aurora.primary,
        })
      }
    }

    return connections
  }, [intensityPoints, aurora])

  const handleCurveChange = (pointId: string, config: MilestoneLadderConfig) => {
    setCurveConfigs((prev) => {
      const next = new Map(prev)
      next.set(pointId, config)
      return next
    })
    setConfiguredPoints((prev) => new Set(prev).add(pointId))
  }

  const milestoneScoredPoints = useMemo(() => {
    return intensityPoints.filter((p) => p.template?.defaultMilestoneConfig)
  }, [intensityPoints])

  const totalConfigurable = milestoneScoredPoints.length
  const totalConfigured = configuredPoints.size

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
          <span className="text-sm font-light tracking-wide" style={{ color: aurora.primary }}>Observation Deck</span>
        </div>
      </div>

      {/* Title area */}
      <div className="text-center space-y-1">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-light tracking-wider"
          style={{
            background: `${aurora.primary}10`,
            color: aurora.primary,
            border: `1px solid ${aurora.primary}20`,
          }}
        >
          <Sparkles className="size-3" />
          {auroraName}
        </div>
        <h2 className="text-xl font-light tracking-wide" style={{ color: "rgba(255,255,255,0.9)" }}>
          Your Aurora
        </h2>
        <p className="text-xs font-light" style={{ color: "rgba(255,255,255,0.35)" }}>
          Click any bright point to open the polar observation panel and shape its trajectory
        </p>
      </div>

      {/* Main aurora visualization */}
      <div className="flex gap-4">
        <div
          className="flex-1 relative rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(180deg, #020815 0%, #030a18 40%, #041020 70%, #020815 100%)",
            border: `1px solid ${aurora.primary}15`,
            minHeight: 480,
          }}
        >
          {/* Animated aurora background within the chart */}
          <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
            {/* Main aurora band */}
            <div
              className="absolute"
              style={{
                left: "10%",
                top: "5%",
                width: "80%",
                height: "70%",
                background: `linear-gradient(180deg,
                  transparent 0%,
                  ${aurora.primary}15 20%,
                  ${aurora.secondary}25 40%,
                  ${aurora.primary}20 60%,
                  ${aurora.secondary}10 80%,
                  transparent 100%)`,
                filter: "blur(40px)",
                animation: "chartAuroraSway 12s ease-in-out infinite",
                borderRadius: "50%",
              }}
            />
            {/* Secondary glow */}
            <div
              className="absolute"
              style={{
                left: "20%",
                top: "10%",
                width: "60%",
                height: "50%",
                background: `radial-gradient(ellipse at 50% 40%, ${aurora.primary}10 0%, transparent 70%)`,
                animation: "chartAuroraPulse 8s ease-in-out infinite",
              }}
            />
            {/* Background stars */}
            <ChartStars />
          </div>

          {/* SVG overlay for intensity points */}
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full"
            style={{ minHeight: 480, position: "relative", zIndex: 1 }}
          >
            <defs>
              {/* Glow filters */}
              <filter id="aurora-glow-l1">
                <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" result="blur" />
                <feFlood floodColor={aurora.primary} floodOpacity="0.7" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="aurora-glow-l2">
                <feGaussianBlur in="SourceAlpha" stdDeviation="0.8" result="blur" />
                <feFlood floodColor={aurora.secondary} floodOpacity="0.5" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="aurora-glow-l3">
                <feGaussianBlur in="SourceAlpha" stdDeviation="0.4" result="blur" />
                <feFlood floodColor={aurora.primary} floodOpacity="0.3" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Aurora ribbon gradient for connections */}
              <linearGradient id="aurora-ribbon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={aurora.primary} stopOpacity="0.3" />
                <stop offset="50%" stopColor={aurora.secondary} stopOpacity="0.15" />
                <stop offset="100%" stopColor={aurora.primary} stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Aurora ribbon connections (curved paths) */}
            {auroraConnections.map((conn, i) => {
              // Create curved path via bezier
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
                  stroke="url(#aurora-ribbon-grad)"
                  strokeWidth={conn.opacity > 0.1 ? 0.4 : 0.15}
                  strokeOpacity={conn.opacity}
                />
              )
            })}

            {/* Intensity points */}
            {intensityPoints.map((point, idx) => {
              const isSelected = selectedPoint?.id === point.id
              const isConfigured = configuredPoints.has(point.id)
              const hasConfig = point.template?.defaultMilestoneConfig
              const phase = animPhases[idx] ?? 0

              return (
                <g key={point.id}>
                  {/* Pulsing outer ring for L1 and L2 */}
                  {point.level <= 2 && (
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={point.size * 2}
                      fill="none"
                      stroke={point.color}
                      strokeWidth={0.1}
                      strokeOpacity={0.2}
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
                        values="0.25;0.05;0.25"
                        dur={`${3 + phase}s`}
                        begin={`${phase}s`}
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}

                  {/* Configured indicator ring */}
                  {isConfigured && (
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={point.size + 1}
                      fill="none"
                      stroke="#4ade80"
                      strokeWidth={0.15}
                      strokeOpacity={0.5}
                      strokeDasharray="0.4,0.4"
                    />
                  )}

                  {/* Point body */}
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={isSelected ? point.size * 1.3 : point.size}
                    fill={point.color}
                    fillOpacity={point.brightness}
                    filter={
                      point.level === 1
                        ? "url(#aurora-glow-l1)"
                        : point.level === 2
                          ? "url(#aurora-glow-l2)"
                          : "url(#aurora-glow-l3)"
                    }
                    className={hasConfig ? "cursor-pointer" : ""}
                    onClick={() => {
                      if (hasConfig) setSelectedPoint(point)
                    }}
                  >
                    {/* Twinkle for L3 */}
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

                  {/* Labels for L1 and L2 */}
                  {point.level <= 2 && (
                    <text
                      x={point.x}
                      y={point.y + point.size + 2.5}
                      textAnchor="middle"
                      fill={point.color}
                      fillOpacity={0.6}
                      fontSize={point.level === 1 ? 2 : 1.4}
                      fontWeight={point.level === 1 ? 300 : 300}
                      style={{ fontFamily: "inherit" }}
                    >
                      {point.label.length > 28 ? point.label.slice(0, 26) + "..." : point.label}
                    </text>
                  )}

                  {/* Larger click target */}
                  {hasConfig && (
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={Math.max(point.size * 2, 3.5)}
                      fill="transparent"
                      className="cursor-pointer"
                      onClick={() => setSelectedPoint(point)}
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
                style={{ background: aurora.gradient, boxShadow: `0 0 6px ${aurora.glowBright}` }}
              />
              <span className="text-[10px] font-light" style={{ color: "rgba(255,255,255,0.45)" }}>
                Brightest Band (L1)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="size-2.5 rounded-full"
                style={{ backgroundColor: aurora.secondary, boxShadow: `0 0 4px ${aurora.glow}` }}
              />
              <span className="text-[10px] font-light" style={{ color: "rgba(255,255,255,0.35)" }}>
                Intensity Points (L2)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-1.5 rounded-full" style={{ backgroundColor: aurora.primary, opacity: 0.4 }} />
              <span className="text-[10px] font-light" style={{ color: "rgba(255,255,255,0.25)" }}>
                Glowing Nodes (L3)
              </span>
            </div>
          </div>

          {/* Stats overlay */}
          <div className="absolute top-3 right-3 text-right space-y-0.5 z-10">
            <div className="text-[10px] font-light" style={{ color: "rgba(255,255,255,0.25)" }}>
              {intensityPoints.length} lights
            </div>
            <div className="text-[10px] font-light" style={{ color: "rgba(255,255,255,0.25)" }}>
              {auroraConnections.length} ribbons
            </div>
            {totalConfigurable > 0 && (
              <div
                className="text-[10px] font-light"
                style={{ color: totalConfigured > 0 ? "#4ade80" : "rgba(255,255,255,0.25)" }}
              >
                {totalConfigured}/{totalConfigurable} observed
              </div>
            )}
          </div>

          {/* Mountain silhouette at bottom of chart */}
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
            background: "rgba(255,255,255,0.015)",
            border: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <div className="text-xs font-light uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.35)" }}>
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
            <div className="text-xs pl-5 font-light" style={{ color: "rgba(255,255,255,0.55)" }}>
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
                <div key={l2.id} className="text-[10px] font-light" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {l2.title}
                </div>
              ))}
            </div>
          </div>

          {/* L3 count */}
          <div>
            <div className="flex items-center gap-2">
              <div className="size-1.5 rounded-full" style={{ backgroundColor: aurora.primary, opacity: 0.5 }} />
              <span className="text-[10px] font-light" style={{ color: "rgba(255,255,255,0.3)" }}>
                {selectedL3s.length} glowing nodes
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Polar Observation Panel (modal) */}
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
            {/* Frosted glass shimmer */}
            <div
              className="absolute inset-0 rounded-2xl opacity-20"
              style={{
                background: `radial-gradient(ellipse at 30% 20%, ${aurora.primary}15 0%, transparent 60%)`,
                pointerEvents: "none",
              }}
            />

            {/* Close button */}
            <button
              onClick={() => setSelectedPoint(null)}
              className="absolute top-3 right-3 size-8 rounded-full flex items-center justify-center cursor-pointer z-10"
              style={{
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <X className="size-4" style={{ color: "rgba(255,255,255,0.45)" }} />
            </button>

            {/* Header */}
            <div className="relative flex items-center gap-3">
              <div
                className="rounded-xl p-2.5"
                style={{
                  background: `${aurora.primary}12`,
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

            <p className="text-xs font-light relative" style={{ color: "rgba(255,255,255,0.35)" }}>
              Shape the intensity curve. Plot how this light will grow over time.
            </p>

            {/* Curve Editor */}
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
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-light" style={{ color: "rgba(255,255,255,0.45)" }}>
            <span className="font-medium" style={{ color: aurora.primary }}>{auroraName}</span>
            {totalConfigurable > 0 && (
              <span className="text-xs ml-2" style={{ color: "rgba(255,255,255,0.3)" }}>
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
        @keyframes chartAuroraSway {
          0%, 100% { transform: skewX(-2deg) translateX(0); opacity: 0.6; }
          25% { transform: skewX(1deg) translateX(5px); opacity: 0.8; }
          50% { transform: skewX(-3deg) translateX(-3px); opacity: 0.5; }
          75% { transform: skewX(2deg) translateX(8px); opacity: 0.7; }
        }
        @keyframes chartAuroraPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  )
}

/** Tiny background stars for the chart area */
function ChartStars() {
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
        opacity: Math.random() * 0.25 + 0.03,
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
            animation: `chartTwinkle ${2 + s.delay}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes chartTwinkle {
          0%, 100% { opacity: 0.03; }
          50% { opacity: 0.2; }
        }
      `}</style>
    </>
  )
}
