"use client"

import { useState, useRef, useCallback } from "react"
import type { MilestoneLadderConfig, GeneratedMilestone } from "@/src/goals/types"

/* ── SVG layout ── */
const SVG_W = 280
const SVG_H = 174
const PAD = { top: 14, right: 12, bottom: 34, left: 44 }
const PLOT_W = SVG_W - PAD.left - PAD.right
const PLOT_H = SVG_H - PAD.top - PAD.bottom

function formatAxisLabel(n: number): string {
  return n.toLocaleString()
}

export interface CurveSVGColors {
  accent: string
  grid: string
  axis: string
  tooltipBg: string
  tooltipBorder: string
  tooltipText?: string
  areaTop: string
  areaBottom: string
  labelColor: string
  endpointColor: string
}

interface CurveSVGProps {
  milestones: GeneratedMilestone[]
  curvePoints: { x: number; y: number }[]
  config: MilestoneLadderConfig
  colors: CurveSVGColors
  yLabels: { value: number; t: number; isEndpoint: boolean }[]
  glowIntensity?: number // stdDeviation, 0 = no glow
  glowOpacity?: number
  strokeWidth?: number
  className?: string
  cursor?: string
  onStepsChange?: (steps: number) => void
}

export function CurveSVG({
  milestones,
  curvePoints,
  config,
  colors,
  yLabels,
  glowIntensity = 3,
  glowOpacity = 0.35,
  strokeWidth = 2.5,
  className,
  cursor,
  onStepsChange,
}: CurveSVGProps) {
  const svgId = useRef(`csv-${Math.random().toString(36).slice(2, 8)}`).current
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [draggingSlider, setDraggingSlider] = useState(false)

  const toSvg = useCallback((nx: number, ny: number) => ({
    x: PAD.left + nx * PLOT_W,
    y: PAD.top + (1 - ny) * PLOT_H,
  }), [])

  const stepsToX = useCallback((steps: number): number => {
    return PAD.left + ((steps - 2) / 18) * PLOT_W
  }, [])

  const pathD = curvePoints
    .map((p, i) => {
      const sv = toSvg(p.x, p.y)
      return `${i === 0 ? "M" : "L"}${sv.x},${sv.y}`
    })
    .join(" ")

  const handleSliderPointerDown = (e: React.PointerEvent) => {
    if (!onStepsChange) return
    e.preventDefault()
    e.stopPropagation()
    setDraggingSlider(true)
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingSlider || !svgRef.current || !onStepsChange) return
    const rect = svgRef.current.getBoundingClientRect()
    const sx = (e.clientX - rect.left) * (SVG_W / rect.width)
    const normalized = (sx - PAD.left) / PLOT_W
    const clamped = Math.max(0, Math.min(1, normalized))
    const newSteps = Math.round(clamped * 18 + 2)
    if (newSteps !== config.steps) onStepsChange(newSteps)
  }

  const handlePointerUp = () => setDraggingSlider(false)

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className={className ?? "w-full"}
      style={{ fontFamily: "var(--font-mono, 'Geist Mono', monospace)", cursor }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <defs>
        {glowIntensity > 0 && (
          <filter id={`${svgId}-glow`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceAlpha" stdDeviation={glowIntensity} result="blur" />
            <feFlood floodColor={colors.accent} floodOpacity={glowOpacity} result="color" />
            <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
        <linearGradient id={`${svgId}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors.areaTop} stopOpacity="1" />
          <stop offset="60%" stopColor={colors.areaBottom} stopOpacity="0.5" />
          <stop offset="100%" stopColor={colors.areaBottom} stopOpacity="0" />
        </linearGradient>
        <filter id={`${svgId}-tooltip-shadow`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map((t) => {
        const sv = toSvg(0, t)
        return (
          <line key={`h-${t}`}
            x1={PAD.left} y1={sv.y} x2={PAD.left + PLOT_W} y2={sv.y}
            stroke={colors.grid} strokeOpacity={0.08} strokeDasharray="3,3"
          />
        )
      })}

      {/* Y-axis labels */}
      {yLabels.map((l, i) => {
        const sv = toSvg(0, l.t)
        return (
          <text key={i}
            x={PAD.left - 6} y={sv.y + (l.isEndpoint ? 4 : 3)}
            textAnchor="end"
            fontSize={l.isEndpoint ? "11" : "9"}
            fontWeight={l.isEndpoint ? 600 : 400}
            fill={l.isEndpoint ? colors.endpointColor : colors.labelColor}
            fillOpacity={l.isEndpoint ? 0.85 : 0.4}
          >
            {formatAxisLabel(l.value)}
          </text>
        )
      })}

      {/* Axes */}
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + PLOT_H}
        stroke={colors.axis} strokeOpacity={0.15}
      />
      <line x1={PAD.left} y1={PAD.top + PLOT_H} x2={PAD.left + PLOT_W} y2={PAD.top + PLOT_H}
        stroke={colors.axis} strokeOpacity={0.15}
      />

      {/* Linear reference */}
      <line x1={PAD.left} y1={PAD.top + PLOT_H} x2={PAD.left + PLOT_W} y2={PAD.top}
        stroke={colors.axis} strokeOpacity={0.06} strokeDasharray="4,4"
      />

      {/* Curve line */}
      <path d={pathD} fill="none" stroke={colors.accent}
        strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
        filter={glowIntensity > 0 ? `url(#${svgId}-glow)` : undefined}
      />

      {/* Area fill */}
      <path
        d={`${pathD} L${PAD.left + PLOT_W},${PAD.top + PLOT_H} L${PAD.left},${PAD.top + PLOT_H} Z`}
        fill={`url(#${svgId}-fill)`}
      />

      {/* Milestone dots + ticks */}
      {milestones.map((m, idx) => {
        const t = config.steps <= 1 ? 1 : m.step / (config.steps - 1)
        const ny = (m.value - config.start) / (config.target - config.start || 1)
        const curvePt = toSvg(t, Math.max(0, Math.min(1, ny)))
        const xAxisY = PAD.top + PLOT_H
        const isHovered = hoveredIdx === idx && !draggingSlider

        return (
          <g key={m.step}>
            <line x1={curvePt.x} y1={xAxisY} x2={curvePt.x} y2={curvePt.y}
              stroke={colors.accent} strokeOpacity={isHovered ? 0.45 : 0.1}
              strokeDasharray="2,3" strokeWidth={isHovered ? 1.5 : 1}
            />
            <circle cx={curvePt.x} cy={curvePt.y}
              r={isHovered ? 4.5 : 2.5}
              fill={colors.accent} fillOpacity={isHovered ? 1 : 0.6}
            />
            <line x1={curvePt.x} y1={xAxisY - 3} x2={curvePt.x} y2={xAxisY + 3}
              stroke={colors.accent}
              strokeWidth={idx === 0 || idx === milestones.length - 1 ? 2 : 1.5}
              strokeOpacity={isHovered ? 1 : 0.5}
            />
            <rect x={curvePt.x - 10} y={PAD.top} width={20} height={PLOT_H + 8}
              fill="transparent" className="cursor-pointer"
              onPointerEnter={() => { if (!draggingSlider) setHoveredIdx(idx) }}
              onPointerLeave={() => setHoveredIdx(null)}
            />
          </g>
        )
      })}

      {/* Hover tooltip */}
      {hoveredIdx !== null && !draggingSlider && (() => {
        const m = milestones[hoveredIdx]
        if (!m) return null
        const t = config.steps <= 1 ? 1 : m.step / (config.steps - 1)
        const ny = (m.value - config.start) / (config.target - config.start || 1)
        const curvePt = toSvg(t, Math.max(0, Math.min(1, ny)))
        const label = m.value.toLocaleString()
        const labelWidth = Math.max(label.length * 7.5 + 14, 36)
        const tooltipY = curvePt.y > PAD.top + 26 ? curvePt.y - 20 : curvePt.y + 24
        const tooltipX = Math.max(PAD.left + labelWidth / 2, Math.min(SVG_W - PAD.right - labelWidth / 2, curvePt.x))
        return (
          <g style={{ pointerEvents: "none" }}>
            <rect x={tooltipX - labelWidth / 2} y={tooltipY - 11}
              width={labelWidth} height={22} rx={5}
              fill={colors.tooltipBg} stroke={colors.tooltipBorder}
              strokeWidth={1} strokeOpacity={0.6}
              filter={`url(#${svgId}-tooltip-shadow)`}
            />
            <text x={tooltipX} y={tooltipY + 4}
              textAnchor="middle" fontSize="11" fontWeight={600}
              fill={colors.tooltipText ?? colors.accent}
            >
              {label}
            </text>
          </g>
        )
      })()}

      {/* Milestone count slider track */}
      {onStepsChange && (() => {
        const trackY = PAD.top + PLOT_H + 14
        const handleX = stepsToX(config.steps)
        return (
          <g>
            <line x1={PAD.left} y1={trackY} x2={PAD.left + PLOT_W} y2={trackY}
              stroke={colors.axis} strokeOpacity={0.12} strokeWidth={3} strokeLinecap="round"
            />
            <line x1={PAD.left} y1={trackY} x2={handleX} y2={trackY}
              stroke={colors.accent} strokeOpacity={0.3} strokeWidth={3} strokeLinecap="round"
            />
            {Array.from({ length: 19 }, (_, i) => {
              const s = i + 2
              const x = stepsToX(s)
              const isActive = s <= config.steps
              return (
                <line key={s} x1={x} y1={trackY - 2} x2={x} y2={trackY + 2}
                  stroke={isActive ? colors.accent : colors.axis}
                  strokeOpacity={isActive ? 0.4 : 0.12} strokeWidth={1}
                />
              )
            })}
            <circle cx={handleX} cy={trackY} r={7}
              fill={colors.accent} fillOpacity={draggingSlider ? 0.4 : 0.2}
              stroke={colors.accent} strokeWidth={2}
              className="cursor-grab active:cursor-grabbing"
              onPointerDown={handleSliderPointerDown}
            />
            <text
              x={handleX < PAD.left + PLOT_W * 0.15 ? PAD.left : handleX > PAD.left + PLOT_W * 0.85 ? PAD.left + PLOT_W : handleX}
              y={trackY + 14}
              textAnchor={handleX < PAD.left + PLOT_W * 0.15 ? "start" : handleX > PAD.left + PLOT_W * 0.85 ? "end" : "middle"}
              fontSize="8" fill={colors.accent} fillOpacity={0.6} fontWeight={600}
            >
              {config.steps} milestones
            </text>
          </g>
        )
      })()}
    </svg>
  )
}
