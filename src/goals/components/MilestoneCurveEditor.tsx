"use client"

import { useState, useMemo, useCallback, useRef } from "react"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  generateMilestoneLadder,
  interpolateWithControlPoints,
  roundToNiceNumber,
} from "../milestoneService"
import type { MilestoneLadderConfig, GeneratedMilestone } from "../types"

interface MilestoneCurveEditorProps {
  config: MilestoneLadderConfig
  onChange: (config: MilestoneLadderConfig) => void
  /** Allow editing individual milestone values in the list */
  allowDirectEdit?: boolean
  accentColor?: string
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

export function MilestoneCurveEditor({
  config,
  onChange,
  allowDirectEdit = false,
  accentColor = "#f97316",
}: MilestoneCurveEditorProps) {
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

  // Build curve line in the SAME linear-value space as the dots.
  // The curve function outputs a 0–1 position in log-space, so we convert
  // it to an actual value, then normalize linearly to match the Y-axis.
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
      // Convert curve output to actual value, then normalize to 0–1 linear
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

  // Slider coordinate helpers
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
    // Scale to SVG viewBox coordinates
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

  // Y-axis labels — endpoints (start/target) get emphasized
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

  return (
    <div className="space-y-3">
      {/* ── Preset toggles ── */}
      <div className="flex rounded-lg border border-border/50 overflow-hidden">
        {CURVE_PRESETS.map((preset) => (
          <Button
            key={preset.id}
            variant="ghost"
            size="sm"
            onClick={() => handlePresetSelect(preset)}
            onPointerEnter={() => setHoveredPresetId(preset.id)}
            onPointerLeave={() => setHoveredPresetId(null)}
            className={cn(
              "rounded-none flex-1 flex flex-col items-center gap-0.5 h-auto py-2 px-2 relative",
              activePresetId === preset.id ? "bg-card text-foreground" : "text-muted-foreground"
            )}
          >
            {activePresetId === preset.id && (
              <div
                className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                style={{ backgroundColor: accentColor }}
              />
            )}
            <span className="text-xs font-semibold tracking-wide">{preset.label}</span>
            <span className="text-[10px] opacity-50 font-normal">{preset.description}</span>
          </Button>
        ))}
      </div>

      {/* ── SVG Curve ── */}
      <div className="bg-card/20 rounded-xl p-3 border border-border/40">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full"
          style={{ fontFamily: "var(--font-mono, 'Geist Mono', monospace)" }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <defs>
            {/* Glow filter for curve line */}
            <filter id={`${svgId}-glow`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
              <feFlood floodColor={accentColor} floodOpacity="0.35" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Area fill gradient */}
            <linearGradient id={`${svgId}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accentColor} stopOpacity="0.18" />
              <stop offset="60%" stopColor={accentColor} stopOpacity="0.06" />
              <stop offset="100%" stopColor={accentColor} stopOpacity="0.01" />
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
                stroke="currentColor"
                strokeOpacity={0.08}
                strokeDasharray="3,3"
              />
            )
          })}

          {/* Y-axis labels — endpoints are larger & bolder */}
          {yLabels.map((l, i) => (
            <text
              key={i}
              x={PAD.left - 6}
              y={l.y + (l.isEndpoint ? 4 : 3)}
              textAnchor="end"
              fontSize={l.isEndpoint ? "11" : "9"}
              fontWeight={l.isEndpoint ? 600 : 400}
              fill={l.isEndpoint ? accentColor : "currentColor"}
              fillOpacity={l.isEndpoint ? 0.85 : 0.4}
            >
              {formatAxisLabel(l.value)}
            </text>
          ))}

          {/* Axes */}
          <line
            x1={PAD.left}
            y1={PAD.top}
            x2={PAD.left}
            y2={PAD.top + PLOT_H}
            stroke="currentColor"
            strokeOpacity={0.15}
          />
          <line
            x1={PAD.left}
            y1={PAD.top + PLOT_H}
            x2={PAD.left + PLOT_W}
            y2={PAD.top + PLOT_H}
            stroke="currentColor"
            strokeOpacity={0.15}
          />

          {/* Linear reference line (faint diagonal) */}
          <line
            x1={PAD.left}
            y1={PAD.top + PLOT_H}
            x2={PAD.left + PLOT_W}
            y2={PAD.top}
            stroke="currentColor"
            strokeOpacity={0.06}
            strokeDasharray="4,4"
          />

          {/* Curve line with glow */}
          <path
            d={pathD}
            fill="none"
            stroke={accentColor}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#${svgId}-glow)`}
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
                {/* Vertical guide line from X-axis to curve */}
                <line
                  x1={curvePt.x} y1={xAxisY}
                  x2={curvePt.x} y2={curvePt.y}
                  stroke={accentColor}
                  strokeOpacity={isHovered ? 0.45 : 0.1}
                  strokeDasharray="2,3"
                  strokeWidth={isHovered ? 1.5 : 1}
                />

                {/* Small dot at curve intersection */}
                <circle
                  cx={curvePt.x} cy={curvePt.y}
                  r={isHovered ? 4.5 : 2.5}
                  fill={accentColor}
                  fillOpacity={isHovered ? 1 : 0.6}
                />

                {/* X-axis tick mark */}
                <line
                  x1={curvePt.x} y1={xAxisY - 3}
                  x2={curvePt.x} y2={xAxisY + 3}
                  stroke={accentColor}
                  strokeWidth={idx === 0 || idx === milestones.length - 1 ? 2 : 1.5}
                  strokeOpacity={isHovered ? 1 : 0.5}
                />

                {/* Invisible wider hit area for hover */}
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
                  rx={5}
                  fill="#1f2937"
                  stroke={accentColor}
                  strokeWidth={1}
                  strokeOpacity={0.6}
                  filter={`url(#${svgId}-tooltip-shadow)`}
                />
                <text
                  x={tooltipX} y={tooltipY + 4}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight={600}
                  fill={accentColor}
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
                {/* Track background */}
                <line
                  x1={PAD.left} y1={trackY}
                  x2={PAD.left + PLOT_W} y2={trackY}
                  stroke="currentColor"
                  strokeOpacity={0.12}
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                {/* Active range */}
                <line
                  x1={PAD.left} y1={trackY}
                  x2={handleX} y2={trackY}
                  stroke={accentColor}
                  strokeOpacity={0.3}
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                {/* Discrete step notches */}
                {Array.from({ length: 19 }, (_, i) => {
                  const s = i + 2
                  const x = stepsToX(s)
                  const isActive = s <= config.steps
                  return (
                    <line
                      key={s}
                      x1={x} y1={trackY - 2}
                      x2={x} y2={trackY + 2}
                      stroke={isActive ? accentColor : "currentColor"}
                      strokeOpacity={isActive ? 0.4 : 0.12}
                      strokeWidth={1}
                    />
                  )
                })}
                {/* Draggable handle */}
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
                {/* Step count label */}
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
                  {config.steps} milestones
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
          <div className={cn(
            "text-xs tabular-nums font-mono px-1 truncate transition-colors",
            previewMilestones ? "text-muted-foreground/50" : "text-muted-foreground/70"
          )}>
            {displayMilestones.map((m, i) => (
              <span key={m.step}>
                {i > 0 && <span className="text-muted-foreground/30 mx-0.5">→</span>}
                <span>{m.value.toLocaleString()}</span>
              </span>
            ))}
          </div>
        )
      })()}

      {/* ── Curve shape controls ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Curve shape</Label>
          <div className="flex items-center gap-2">
            <span
              className="text-xs tabular-nums font-mono px-2 py-1 rounded bg-card/60"
              style={{ color: accentColor }}
            >
              {tensionDisplay}
            </span>
            <span className="text-xs text-muted-foreground/60">
              {config.steps} milestones
            </span>
          </div>
        </div>
        <Slider
          value={[config.curveTension]}
          onValueChange={handleTensionChange}
          min={-2}
          max={2}
          step={0.1}
        />
        <div className="flex justify-between text-xs text-muted-foreground/60">
          <span>Fewer big leaps</span>
          <span>Many small wins</span>
        </div>
      </div>

      {/* ── Advanced controls toggle + reset ── */}
      <div className="border-t border-border/30 pt-2 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-muted-foreground h-8 px-3"
        >
          {showAdvanced ? "Hide advanced" : "Advanced"}
        </Button>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResetCurve}
          className="text-sm h-8 text-muted-foreground"
        >
          <RotateCcw className="size-3.5 mr-1.5" />
          Reset
        </Button>
      </div>

      {/* Control points management (advanced) */}
      {showAdvanced && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddControlPoint}
            disabled={(config.controlPoints ?? []).length >= 3}
            className="text-xs h-8"
          >
            + Control Point
          </Button>
          {(config.controlPoints ?? []).map((_, idx) => (
            <Button
              key={idx}
              variant="ghost"
              size="sm"
              onClick={() => handleRemoveControlPoint(idx)}
              className="text-xs h-8 text-muted-foreground"
            >
              Remove CP{idx + 1}
            </Button>
          ))}
          <span className="text-xs text-muted-foreground">
            Drag points on the chart to reshape the curve
          </span>
        </div>
      )}

      {/* ── Range display (preserves endpoint editing) ── */}
      <div className="flex items-center justify-between">
        <Label className="text-sm text-muted-foreground font-medium">Range</Label>
        <div className="flex items-center gap-1.5 text-sm tabular-nums font-mono">
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
              style={{ color: accentColor }}
              onClick={() => allowDirectEdit && startEdit(0, config.start)}
            >
              {config.start.toLocaleString()}
            </button>
          )}
          <span className="text-muted-foreground/40">→</span>
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
              style={{ color: accentColor }}
              onClick={() => allowDirectEdit && startEdit(milestones.length - 1, config.target)}
            >
              {config.target.toLocaleString()}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
