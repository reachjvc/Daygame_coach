"use client"

import { useState, useMemo, useCallback, useRef } from "react"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  generateMilestoneLadder,
  interpolateWithControlPoints,
  roundToNiceNumber,
} from "../milestoneService"
import { getCurveTheme } from "../curveThemes"
import type { MilestoneLadderConfig, GeneratedMilestone, CurveThemeId } from "../types"

interface MilestoneCurveEditorProps {
  config: MilestoneLadderConfig
  onChange: (config: MilestoneLadderConfig) => void
  /** Allow editing individual milestone values in the list */
  allowDirectEdit?: boolean
  /** Visual theme for the editor */
  themeId?: CurveThemeId
  /** Called when user switches theme (for persistence) */
  onThemeChange?: (id: CurveThemeId) => void
}

/* ── SVG layout ── */
const SVG_W = 280
const SVG_H = 174
const PAD = { top: 14, right: 12, bottom: 34, left: 44 }
const PLOT_W = SVG_W - PAD.left - PAD.right
const PLOT_H = SVG_H - PAD.top - PAD.bottom

/** Format axis labels — use toLocaleString for comma separators */
function formatAxisLabel(n: number): string {
  return n.toLocaleString()
}

/* ── Curve presets ── */
interface CurvePreset {
  id: string
  label: string
  description: string
  steps: number
  curveTension: number
}

const CURVE_PRESETS: CurvePreset[] = [
  { id: "quick-wins", label: "Quick Wins", description: "Many small steps", steps: 8, curveTension: 1.2 },
  { id: "balanced", label: "Balanced", description: "Steady climb", steps: 5, curveTension: 0 },
  { id: "ambitious", label: "Ambitious", description: "Few big leaps", steps: 3, curveTension: -1.5 },
]

const CYBER_DESCRIPTIONS: Record<string, string> = {
  "Many small steps": "INCREMENTAL",
  "Steady climb": "LINEAR",
  "Few big leaps": "EXPONENTIAL",
}

export function MilestoneCurveEditor({
  config,
  onChange,
  allowDirectEdit = false,
  themeId = "zen",
  onThemeChange,
}: MilestoneCurveEditorProps) {
  const theme = getCurveTheme(themeId)
  const isCyber = themeId === "cyberpunk"

  // Stable unique ID for SVG defs (avoids collisions with multiple instances)
  const svgId = useRef(`mce-${Math.random().toString(36).slice(2, 8)}`).current

  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editValue, setEditValue] = useState("")
  const svgRef = useRef<SVGSVGElement>(null)
  const [draggingCp, setDraggingCp] = useState<number | null>(null)
  const [draggingSlider, setDraggingSlider] = useState(false)
  const [hoveredMilestoneIdx, setHoveredMilestoneIdx] = useState<number | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [hoveredPresetId, setHoveredPresetId] = useState<string | null>(null)

  const milestones = useMemo(() => generateMilestoneLadder(config), [config])

  // Preview milestones for hovered preset
  const previewMilestones = useMemo(() => {
    if (!hoveredPresetId) return null
    const preset = CURVE_PRESETS.find((p) => p.id === hoveredPresetId)
    if (!preset) return null
    return generateMilestoneLadder({
      ...config,
      steps: preset.steps,
      curveTension: preset.curveTension,
      controlPoints: [],
    })
  }, [hoveredPresetId, config.start, config.target])

  const activePresetId = useMemo(() => {
    const match = CURVE_PRESETS.find(
      (p) => p.steps === config.steps && Math.abs(p.curveTension - config.curveTension) < 0.05
    )
    return match?.id ?? null
  }, [config.steps, config.curveTension])

  const curvePoints = useMemo(() => {
    const pts: { x: number; y: number }[] = []
    const numPts = 60
    const cps = config.controlPoints ?? []
    const effStart = Math.max(config.start, 1)
    const effTarget = Math.max(config.target, effStart + 1)
    const range = config.target - config.start || 1
    const useLog = effStart > 0 && effTarget / effStart >= 10

    for (let i = 0; i <= numPts; i++) {
      const t = i / numPts
      const curved = interpolateWithControlPoints(t, cps, config.curveTension)
      const actualValue = useLog
        ? effStart * Math.pow(effTarget / effStart, curved)
        : config.start + range * curved
      const y = (actualValue - config.start) / range
      pts.push({ x: t, y: Math.max(0, Math.min(1, y)) })
    }
    return pts
  }, [config.curveTension, config.controlPoints, config.start, config.target])

  const toSvg = useCallback(
    (nx: number, ny: number) => ({
      x: PAD.left + nx * PLOT_W,
      y: PAD.top + (1 - ny) * PLOT_H,
    }),
    []
  )

  const fromSvg = useCallback(
    (sx: number, sy: number) => ({
      x: Math.max(0.05, Math.min(0.95, (sx - PAD.left) / PLOT_W)),
      y: Math.max(0, Math.min(1, 1 - (sy - PAD.top) / PLOT_H)),
    }),
    []
  )

  const handlePresetSelect = (preset: CurvePreset) => {
    onChange({ ...config, steps: preset.steps, curveTension: preset.curveTension, controlPoints: [] })
  }

  const handleTensionChange = (values: number[]) => {
    onChange({ ...config, curveTension: values[0] })
  }

  const handleStepsChange = (steps: number) => {
    onChange({ ...config, steps: Math.max(2, Math.min(20, steps)) })
  }

  const handleResetCurve = () => {
    onChange({ ...config, steps: 5, curveTension: 0, controlPoints: [] })
  }

  const stepsToX = useCallback((steps: number): number => {
    return PAD.left + ((steps - 2) / 18) * PLOT_W
  }, [])

  const handleCpPointerDown = (idx: number, e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDraggingCp(idx)
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  const handleSliderPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDraggingSlider(true)
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!svgRef.current) return
    if (draggingCp === null && !draggingSlider) return
    const rect = svgRef.current.getBoundingClientRect()
    const sx = (e.clientX - rect.left) * (SVG_W / rect.width)
    const sy = (e.clientY - rect.top) * (SVG_H / rect.height)

    if (draggingSlider) {
      const normalized = (sx - PAD.left) / PLOT_W
      const clamped = Math.max(0, Math.min(1, normalized))
      const newSteps = Math.round(clamped * 18 + 2)
      if (newSteps !== config.steps) {
        handleStepsChange(newSteps)
      }
      return
    }

    if (draggingCp !== null) {
      const norm = fromSvg(sx, sy)
      const cps = [...(config.controlPoints ?? [])]
      cps[draggingCp] = norm
      onChange({ ...config, controlPoints: cps })
    }
  }

  const handlePointerUp = () => {
    setDraggingCp(null)
    setDraggingSlider(false)
  }

  const handleAddControlPoint = () => {
    const cps = [...(config.controlPoints ?? [])]
    if (cps.length >= 3) return
    cps.push({ x: 0.5, y: 0.5 })
    onChange({ ...config, controlPoints: cps })
  }

  const handleRemoveControlPoint = (idx: number) => {
    const cps = [...(config.controlPoints ?? [])]
    cps.splice(idx, 1)
    onChange({ ...config, controlPoints: cps })
  }

  const startEdit = (idx: number, value: number) => {
    setEditingIdx(idx)
    setEditValue(String(value))
  }

  const commitEdit = (idx: number, milestoneList: GeneratedMilestone[]) => {
    const parsed = parseInt(editValue)
    if (isNaN(parsed) || parsed < 0) {
      setEditingIdx(null)
      return
    }
    if (idx === 0) {
      onChange({ ...config, start: parsed })
    } else if (idx === milestoneList.length - 1) {
      onChange({ ...config, target: parsed })
    }
    setEditingIdx(null)
  }

  // Build curve path
  const pathD = curvePoints
    .map((p, i) => {
      const sv = toSvg(p.x, p.y)
      return `${i === 0 ? "M" : "L"}${sv.x},${sv.y}`
    })
    .join(" ")

  // Y-axis labels
  const yLabels = useMemo(
    () =>
      [0, 0.25, 0.5, 0.75, 1].map((t) => ({
        value:
          t === 0
            ? config.start
            : t === 1
              ? config.target
              : roundToNiceNumber(config.start + (config.target - config.start) * t),
        y: toSvg(0, t).y,
        isEndpoint: t === 0 || t === 1,
      })),
    [config.start, config.target, toSvg]
  )

  // Human-readable tension label
  const tensionDisplay =
    Math.abs(config.curveTension) < 0.05
      ? "Linear"
      : config.curveTension >= 1.0
        ? "Front-loaded"
        : config.curveTension > 0.05
          ? "Slight front"
          : config.curveTension <= -1.0
            ? "Back-loaded"
            : "Slight back"

  const displayTension = isCyber ? tensionDisplay.toUpperCase() : tensionDisplay

  // Helper for themed text
  const themedLabel = (text: string) =>
    theme.textTransform === "uppercase" ? text.toUpperCase() : text

  const accentColor = theme.accent
  const sc = theme.svgColors

  return (
    <div
      className="space-y-3 transition-colors duration-200"
      style={{
        background: theme.bg,
        borderRadius: theme.borderRadius,
        border: `1px solid ${theme.border}`,
        padding: 16,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ── Cyberpunk decorative overlay ── */}
      {theme.scanlines && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 10,
            background:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,51,0.03) 2px, rgba(255,0,51,0.03) 4px)",
          }}
        />
      )}
      {theme.cornerBrackets && (
        <>
          <div style={{ position: "absolute", top: 0, left: 0, width: 12, height: 12, borderTop: `2px solid ${accentColor}`, borderLeft: `2px solid ${accentColor}`, zIndex: 11 }} />
          <div style={{ position: "absolute", top: 0, right: 0, width: 12, height: 12, borderTop: `2px solid ${accentColor}`, borderRight: `2px solid ${accentColor}`, zIndex: 11 }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, width: 12, height: 12, borderBottom: `2px solid ${accentColor}`, borderLeft: `2px solid ${accentColor}`, zIndex: 11 }} />
          <div style={{ position: "absolute", bottom: 0, right: 0, width: 12, height: 12, borderBottom: `2px solid ${accentColor}`, borderRight: `2px solid ${accentColor}`, zIndex: 11 }} />
        </>
      )}

      <div style={{ position: "relative", zIndex: 5 }}>
        {/* ── Preset toggles ── */}
        <div
          style={{
            display: "flex",
            borderRadius: isCyber ? 2 : 8,
            border: `1px solid ${theme.border}`,
            overflow: "hidden",
          }}
        >
          {CURVE_PRESETS.map((preset, idx) => {
            const isActive = activePresetId === preset.id
            return (
              <button
                key={preset.id}
                onClick={() => handlePresetSelect(preset)}
                onPointerEnter={() => setHoveredPresetId(preset.id)}
                onPointerLeave={() => setHoveredPresetId(null)}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  background: isActive ? theme.accentFaded : "transparent",
                  border: "none",
                  borderRight: idx < CURVE_PRESETS.length - 1 ? `1px solid ${theme.border}` : "none",
                  cursor: "pointer",
                  position: "relative",
                  textAlign: isCyber ? "left" : "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isCyber ? "flex-start" : "center",
                  gap: 2,
                }}
              >
                {isActive && (
                  <div
                    style={{
                      position: "absolute",
                      [isCyber ? "top" : "bottom"]: 0,
                      left: isCyber ? 0 : 8,
                      right: isCyber ? 0 : 8,
                      height: 2,
                      background: accentColor,
                      borderRadius: isCyber ? 0 : 999,
                      boxShadow: isCyber ? `0 0 8px ${accentColor}80` : "none",
                    }}
                  />
                )}
                <span
                  style={{
                    fontSize: isCyber ? 11 : 12,
                    fontWeight: isCyber ? 700 : 600,
                    letterSpacing: isCyber ? "0.08em" : "0.02em",
                    textTransform: theme.textTransform,
                    color: isActive ? (isCyber ? accentColor : theme.text) : (isCyber ? theme.text : theme.muted),
                    fontFamily: isCyber ? "var(--font-mono, 'Geist Mono', monospace)" : "inherit",
                  }}
                >
                  {preset.label}
                </span>
                <span
                  style={{
                    fontSize: isCyber ? 9 : 10,
                    opacity: isCyber ? 0.35 : 0.5,
                    color: isCyber ? theme.text : theme.muted,
                    textTransform: theme.textTransform,
                    letterSpacing: isCyber ? "0.05em" : undefined,
                    fontFamily: isCyber ? "var(--font-mono, 'Geist Mono', monospace)" : "inherit",
                  }}
                >
                  {isCyber ? (CYBER_DESCRIPTIONS[preset.description] ?? preset.description) : preset.description}
                </span>
              </button>
            )
          })}
        </div>

        {/* ── SVG Curve ── */}
        <div
          style={{
            borderRadius: isCyber ? 2 : 12,
            padding: 12,
            marginTop: 12,
            border: isCyber ? `1px solid rgba(255,0,51,0.15)` : `1px solid ${theme.subtleBorder}`,
            background: isCyber ? "#080808" : `${theme.cardBg}33`,
          }}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className="w-full"
            style={{
              fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
              cursor: theme.svgCursor,
            }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <defs>
              {/* Glow filter for curve line */}
              {theme.glowIntensity > 0 && (
                <filter id={`${svgId}-glow`} x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation={theme.glowIntensity} result="blur" />
                  <feFlood floodColor={accentColor} floodOpacity={theme.glowOpacity} result="color" />
                  <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              )}

              {/* Area fill gradient */}
              <linearGradient id={`${svgId}-fill`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={sc.areaTop} stopOpacity="1" />
                <stop offset="60%" stopColor={sc.areaBottom} stopOpacity="0.5" />
                <stop offset="100%" stopColor={sc.areaBottom} stopOpacity="0" />
              </linearGradient>

              {/* Tooltip background filter */}
              <filter id={`${svgId}-tooltip-shadow`} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.4" />
              </filter>
            </defs>

            {/* Grid lines */}
            {[0.25, 0.5, 0.75].map((t) => {
              const sv = toSvg(0, t)
              return (
                <line
                  key={`h-${t}`}
                  x1={PAD.left}
                  y1={sv.y}
                  x2={PAD.left + PLOT_W}
                  y2={sv.y}
                  stroke={sc.grid}
                  strokeOpacity={0.08}
                  strokeDasharray="3,3"
                />
              )
            })}

            {/* Y-axis labels */}
            {yLabels.map((l, i) => (
              <text
                key={i}
                x={PAD.left - 6}
                y={l.y + (l.isEndpoint ? 4 : 3)}
                textAnchor="end"
                fontSize={l.isEndpoint ? "11" : "9"}
                fontWeight={l.isEndpoint ? 600 : 400}
                fill={l.isEndpoint ? sc.endpointColor : sc.labelColor}
                fillOpacity={l.isEndpoint ? 0.85 : 0.4}
              >
                {formatAxisLabel(l.value)}
              </text>
            ))}

            {/* Axes */}
            <line
              x1={PAD.left} y1={PAD.top}
              x2={PAD.left} y2={PAD.top + PLOT_H}
              stroke={sc.axis} strokeOpacity={0.15}
            />
            <line
              x1={PAD.left} y1={PAD.top + PLOT_H}
              x2={PAD.left + PLOT_W} y2={PAD.top + PLOT_H}
              stroke={sc.axis} strokeOpacity={0.15}
            />

            {/* Linear reference line (faint diagonal) */}
            <line
              x1={PAD.left} y1={PAD.top + PLOT_H}
              x2={PAD.left + PLOT_W} y2={PAD.top}
              stroke={sc.axis} strokeOpacity={0.06} strokeDasharray="4,4"
            />

            {/* Curve line with glow */}
            <path
              d={pathD}
              fill="none"
              stroke={accentColor}
              strokeWidth={theme.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={theme.glowIntensity > 0 ? `url(#${svgId}-glow)` : undefined}
            />

            {/* Area fill under curve */}
            <path
              d={`${pathD} L${PAD.left + PLOT_W},${PAD.top + PLOT_H} L${PAD.left},${PAD.top + PLOT_H} Z`}
              fill={`url(#${svgId}-fill)`}
            />

            {/* Milestone X-axis ticks + vertical guide lines + curve intersection dots */}
            {milestones.map((m, idx) => {
              const t = config.steps <= 1 ? 1 : m.step / (config.steps - 1)
              const ny = (m.value - config.start) / (config.target - config.start || 1)
              const curvePt = toSvg(t, Math.max(0, Math.min(1, ny)))
              const xAxisY = PAD.top + PLOT_H
              const isHovered = hoveredMilestoneIdx === idx && !draggingSlider && draggingCp === null

              return (
                <g key={m.step}>
                  <line
                    x1={curvePt.x} y1={xAxisY}
                    x2={curvePt.x} y2={curvePt.y}
                    stroke={accentColor}
                    strokeOpacity={isHovered ? 0.45 : 0.1}
                    strokeDasharray="2,3"
                    strokeWidth={isHovered ? 1.5 : 1}
                  />
                  <circle
                    cx={curvePt.x} cy={curvePt.y}
                    r={isHovered ? 4.5 : 2.5}
                    fill={accentColor}
                    fillOpacity={isHovered ? 1 : 0.6}
                  />
                  <line
                    x1={curvePt.x} y1={xAxisY - 3}
                    x2={curvePt.x} y2={xAxisY + 3}
                    stroke={accentColor}
                    strokeWidth={idx === 0 || idx === milestones.length - 1 ? 2 : 1.5}
                    strokeOpacity={isHovered ? 1 : 0.5}
                  />
                  <rect
                    x={curvePt.x - 10} y={PAD.top}
                    width={20} height={PLOT_H + 8}
                    fill="transparent"
                    className="cursor-pointer"
                    onPointerEnter={() => {
                      if (!draggingSlider && draggingCp === null) setHoveredMilestoneIdx(idx)
                    }}
                    onPointerLeave={() => setHoveredMilestoneIdx(null)}
                  />
                </g>
              )
            })}

            {/* Hover tooltip */}
            {hoveredMilestoneIdx !== null && !draggingSlider && draggingCp === null && (() => {
              const m = milestones[hoveredMilestoneIdx]
              if (!m) return null
              const t = config.steps <= 1 ? 1 : m.step / (config.steps - 1)
              const ny = (m.value - config.start) / (config.target - config.start || 1)
              const curvePt = toSvg(t, Math.max(0, Math.min(1, ny)))
              const label = m.value.toLocaleString()
              const labelWidth = Math.max(label.length * 7.5 + 14, 36)
              const tooltipY = curvePt.y > PAD.top + 26 ? curvePt.y - 20 : curvePt.y + 24
              const tooltipX = Math.max(
                PAD.left + labelWidth / 2,
                Math.min(SVG_W - PAD.right - labelWidth / 2, curvePt.x)
              )
              return (
                <g style={{ pointerEvents: "none" }}>
                  <rect
                    x={tooltipX - labelWidth / 2} y={tooltipY - 11}
                    width={labelWidth} height={22}
                    rx={isCyber ? 2 : 5}
                    fill={sc.tooltipBg}
                    stroke={sc.tooltipBorder}
                    strokeWidth={1}
                    strokeOpacity={0.6}
                    filter={`url(#${svgId}-tooltip-shadow)`}
                  />
                  <text
                    x={tooltipX} y={tooltipY + 4}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight={600}
                    fill={sc.tooltipText}
                  >
                    {label}
                  </text>
                </g>
              )
            })()}

            {/* Milestone count slider track */}
            {(() => {
              const trackY = PAD.top + PLOT_H + 14
              const handleX = stepsToX(config.steps)
              return (
                <g>
                  <line
                    x1={PAD.left} y1={trackY}
                    x2={PAD.left + PLOT_W} y2={trackY}
                    stroke={sc.axis}
                    strokeOpacity={0.12}
                    strokeWidth={3}
                    strokeLinecap="round"
                  />
                  <line
                    x1={PAD.left} y1={trackY}
                    x2={handleX} y2={trackY}
                    stroke={accentColor}
                    strokeOpacity={0.3}
                    strokeWidth={3}
                    strokeLinecap="round"
                  />
                  {Array.from({ length: 19 }, (_, i) => {
                    const s = i + 2
                    const x = stepsToX(s)
                    const isActive = s <= config.steps
                    return (
                      <line
                        key={s}
                        x1={x} y1={trackY - 2}
                        x2={x} y2={trackY + 2}
                        stroke={isActive ? accentColor : sc.axis}
                        strokeOpacity={isActive ? 0.4 : 0.12}
                        strokeWidth={1}
                      />
                    )
                  })}
                  <circle
                    cx={handleX} cy={trackY}
                    r={7}
                    fill={accentColor}
                    fillOpacity={draggingSlider ? 0.4 : 0.2}
                    stroke={accentColor}
                    strokeWidth={2}
                    className="cursor-grab active:cursor-grabbing"
                    onPointerDown={handleSliderPointerDown}
                  />
                  <text
                    x={handleX < PAD.left + PLOT_W * 0.15
                      ? PAD.left
                      : handleX > PAD.left + PLOT_W * 0.85
                        ? PAD.left + PLOT_W
                        : handleX}
                    y={trackY + 14}
                    textAnchor={handleX < PAD.left + PLOT_W * 0.15
                      ? "start"
                      : handleX > PAD.left + PLOT_W * 0.85
                        ? "end"
                        : "middle"}
                    fontSize="8"
                    fill={accentColor}
                    fillOpacity={0.6}
                    fontWeight={600}
                  >
                    {config.steps} {themedLabel("milestones")}
                  </text>
                </g>
              )
            })()}

            {/* Draggable control points */}
            {(config.controlPoints ?? []).map((cp, idx) => {
              const sv = toSvg(cp.x, cp.y)
              return (
                <g key={`cp-${idx}`}>
                  <line
                    x1={sv.x}
                    y1={PAD.top + PLOT_H}
                    x2={sv.x}
                    y2={sv.y}
                    stroke={accentColor}
                    strokeOpacity={0.2}
                    strokeDasharray="2,2"
                  />
                  <circle
                    cx={sv.x}
                    cy={sv.y}
                    r={6}
                    fill={accentColor}
                    fillOpacity={0.3}
                    stroke={accentColor}
                    strokeWidth={2}
                    className="cursor-grab active:cursor-grabbing"
                    onPointerDown={(e) => handleCpPointerDown(idx, e)}
                  />
                </g>
              )
            })}
          </svg>
        </div>

        {/* ── Milestone ladder summary ── */}
        {(() => {
          const displayMilestones = previewMilestones ?? milestones
          return (
            <div
              className="truncate transition-colors"
              style={{
                fontSize: isCyber ? 11 : 12,
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                color: theme.muted,
                marginTop: 12,
                opacity: previewMilestones ? 0.5 : 0.7,
              }}
            >
              {displayMilestones
                .map((m) => m.value.toLocaleString())
                .join(isCyber ? " > " : " \u2192 ")}
            </div>
          )
        })()}

        {/* ── Curve shape controls ── */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span
              style={{
                fontSize: isCyber ? 12 : 14,
                fontWeight: isCyber ? 600 : 500,
                color: theme.text,
                textTransform: theme.textTransform,
                letterSpacing: isCyber ? "0.06em" : undefined,
                fontFamily: isCyber ? "var(--font-mono, 'Geist Mono', monospace)" : "inherit",
              }}
            >
              {isCyber ? "CURVE_SHAPE" : "Curve shape"}
            </span>
            <div className="flex items-center gap-2">
              <span
                style={{
                  fontSize: isCyber ? 11 : 12,
                  fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                  color: isCyber ? "#ffcc00" : accentColor,
                  background: isCyber ? "rgba(255,204,0,0.08)" : theme.accentFaded,
                  borderRadius: isCyber ? 2 : 6,
                  padding: "2px 6px",
                }}
              >
                {displayTension}
              </span>
              <span
                style={{
                  fontSize: isCyber ? 10 : 12,
                  color: theme.muted,
                  textTransform: theme.textTransform,
                  fontFamily: isCyber ? "var(--font-mono, 'Geist Mono', monospace)" : "inherit",
                }}
              >
                {config.steps} {themedLabel("milestones")}
              </span>
            </div>
          </div>
          <Slider
            value={[config.curveTension]}
            onValueChange={handleTensionChange}
            min={-2}
            max={2}
            step={0.1}
            className={theme.sliderClasses}
          />
          <div
            className="flex justify-between mt-1.5"
            style={{
              fontSize: isCyber ? 10 : 12,
              color: theme.muted,
              textTransform: theme.textTransform,
              letterSpacing: isCyber ? "0.04em" : undefined,
              fontFamily: isCyber ? "var(--font-mono, 'Geist Mono', monospace)" : "inherit",
            }}
          >
            <span>{themedLabel("Fewer big leaps")}</span>
            <span>{themedLabel("Many small wins")}</span>
          </div>
        </div>

        {/* ── Advanced controls toggle + reset + theme switcher ── */}
        <div
          className="pt-2 mt-3 flex items-center gap-2"
          style={{ borderTop: `1px solid ${theme.subtleBorder}` }}
        >
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              fontSize: isCyber ? 11 : 13,
              color: isCyber ? theme.muted : undefined,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: isCyber ? 0 : "4px 12px",
              textTransform: theme.textTransform,
              fontFamily: isCyber ? "var(--font-mono, 'Geist Mono', monospace)" : "inherit",
            }}
            className={isCyber ? "" : "text-muted-foreground text-xs h-8"}
          >
            {isCyber
              ? (showAdvanced ? "HIDE ADV." : "ADV.CONFIG")
              : (showAdvanced ? "Hide advanced" : "Advanced")}
          </button>

          <div className="flex-1" />

          <button
            onClick={handleResetCurve}
            className={cn(
              "flex items-center gap-1",
              !isCyber && "text-sm text-muted-foreground"
            )}
            style={{
              fontSize: isCyber ? 11 : 13,
              color: isCyber ? theme.muted : undefined,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: isCyber ? 0 : "4px 8px",
              textTransform: theme.textTransform,
              fontFamily: isCyber ? "var(--font-mono, 'Geist Mono', monospace)" : "inherit",
            }}
          >
            <RotateCcw size={isCyber ? 12 : 14} />
            {isCyber ? "SYS.RESET" : "Reset"}
          </button>
        </div>

        {/* Control points management (advanced) */}
        {showAdvanced && (
          <div className="mt-3 space-y-2">
            {isCyber ? (
              <>
                {(config.controlPoints ?? []).length > 0 && (
                  <div className="space-y-1">
                    {(config.controlPoints ?? []).map((_, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between"
                        style={{
                          fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                          fontSize: 10,
                          color: theme.muted,
                        }}
                      >
                        <span>MILESTONE_{idx + 1}:</span>
                        <button
                          onClick={() => handleRemoveControlPoint(idx)}
                          style={{
                            color: accentColor,
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                            fontSize: 10,
                            textTransform: "uppercase",
                          }}
                        >
                          [DEL]
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={handleAddControlPoint}
                  disabled={(config.controlPoints ?? []).length >= 3}
                  style={{
                    fontSize: 11,
                    fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                    textTransform: "uppercase",
                    color: accentColor,
                    background: "transparent",
                    border: `1px solid ${accentColor}40`,
                    borderRadius: 2,
                    padding: "4px 10px",
                    cursor: (config.controlPoints ?? []).length >= 3 ? "not-allowed" : "pointer",
                    opacity: (config.controlPoints ?? []).length >= 3 ? 0.4 : 1,
                  }}
                >
                  + ADD_CP
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleAddControlPoint}
                  disabled={(config.controlPoints ?? []).length >= 3}
                  style={{
                    fontSize: 12,
                    color: accentColor,
                    background: "transparent",
                    border: `1px solid ${accentColor}4d`,
                    borderRadius: 8,
                    padding: "6px 14px",
                    cursor: (config.controlPoints ?? []).length >= 3 ? "not-allowed" : "pointer",
                    opacity: (config.controlPoints ?? []).length >= 3 ? 0.4 : 1,
                  }}
                >
                  + Add Control Point
                </button>
                {(config.controlPoints ?? []).map((cp, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2"
                    style={{ fontSize: 12, color: theme.muted }}
                  >
                    <span style={{ fontFamily: "var(--font-mono, 'Geist Mono', monospace)" }}>
                      Milestone {idx + 1}: ({cp.x.toFixed(2)}, {cp.y.toFixed(2)})
                    </span>
                    <button
                      onClick={() => handleRemoveControlPoint(idx)}
                      style={{
                        fontSize: 11,
                        color: "#ef4444",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "0 4px",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <span style={{ fontSize: 11, color: theme.muted }}>
                  Drag points on the chart to reshape the curve
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Range display (preserves endpoint editing) ── */}
        <div className="flex items-center justify-between mt-4">
          <span
            style={{
              fontSize: isCyber ? 10 : 14,
              color: isCyber ? theme.muted : undefined,
              textTransform: theme.textTransform,
              fontFamily: isCyber ? "var(--font-mono, 'Geist Mono', monospace)" : "inherit",
            }}
            className={isCyber ? "" : "text-sm text-muted-foreground font-medium"}
          >
            {isCyber ? "START > GOAL" : "Range"}
          </span>
          <div
            className="flex items-center gap-1.5"
            style={{
              fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
              fontSize: isCyber ? 13 : 14,
            }}
          >
            {allowDirectEdit && editingIdx === 0 ? (
              <Input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => commitEdit(0, milestones)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitEdit(0, milestones)
                  if (e.key === "Escape") setEditingIdx(null)
                }}
                className="h-7 w-20 text-sm text-center p-0"
                autoFocus
              />
            ) : (
              <button
                className={cn(
                  "px-2 py-1 rounded transition-colors",
                  allowDirectEdit ? "hover:bg-card/80 cursor-pointer" : "cursor-default"
                )}
                style={{ color: accentColor, borderRadius: isCyber ? 2 : undefined }}
                onClick={() => allowDirectEdit && startEdit(0, config.start)}
              >
                {config.start.toLocaleString()}
              </button>
            )}
            <span style={{ color: theme.muted, opacity: 0.4 }}>{isCyber ? ">" : "\u2192"}</span>
            {allowDirectEdit && editingIdx === milestones.length - 1 ? (
              <Input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => commitEdit(milestones.length - 1, milestones)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitEdit(milestones.length - 1, milestones)
                  if (e.key === "Escape") setEditingIdx(null)
                }}
                className="h-7 w-20 text-sm text-center p-0"
                autoFocus
              />
            ) : (
              <button
                className={cn(
                  "px-2 py-1 rounded transition-colors",
                  allowDirectEdit ? "hover:bg-card/80 cursor-pointer" : "cursor-default"
                )}
                style={{ color: accentColor, borderRadius: isCyber ? 2 : undefined }}
                onClick={() => allowDirectEdit && startEdit(milestones.length - 1, config.target)}
              >
                {config.target.toLocaleString()}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
