"use client"

import { useState, useMemo, useCallback, useRef } from "react"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { RotateCcw } from "lucide-react"
import {
  generateMilestoneLadder,
  interpolateWithControlPoints,
} from "../milestoneService"
import type { MilestoneLadderConfig, CurveControlPoint, GeneratedMilestone } from "../types"

interface MilestoneCurveEditorProps {
  config: MilestoneLadderConfig
  onChange: (config: MilestoneLadderConfig) => void
  /** Allow editing individual milestone values in the list */
  allowDirectEdit?: boolean
  accentColor?: string
}

const SVG_W = 280
const SVG_H = 160
const PAD = { top: 12, right: 12, bottom: 28, left: 40 }
const PLOT_W = SVG_W - PAD.left - PAD.right
const PLOT_H = SVG_H - PAD.top - PAD.bottom

export function MilestoneCurveEditor({
  config,
  onChange,
  allowDirectEdit = false,
  accentColor = "#f97316",
}: MilestoneCurveEditorProps) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editValue, setEditValue] = useState("")
  const svgRef = useRef<SVGSVGElement>(null)
  const [draggingCp, setDraggingCp] = useState<number | null>(null)

  const milestones = useMemo(() => generateMilestoneLadder(config), [config])

  // Generate smooth curve points for drawing the line
  const curvePoints = useMemo(() => {
    const pts: { x: number; y: number }[] = []
    const steps = 60
    const cps = config.controlPoints ?? []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const y = interpolateWithControlPoints(t, cps, config.curveTension)
      pts.push({ x: t, y })
    }
    return pts
  }, [config.curveTension, config.controlPoints])

  // Map normalized coords to SVG
  const toSvg = useCallback(
    (nx: number, ny: number) => ({
      x: PAD.left + nx * PLOT_W,
      y: PAD.top + (1 - ny) * PLOT_H,
    }),
    []
  )

  // Map SVG coords to normalized
  const fromSvg = useCallback(
    (sx: number, sy: number) => ({
      x: Math.max(0.05, Math.min(0.95, (sx - PAD.left) / PLOT_W)),
      y: Math.max(0, Math.min(1, 1 - (sy - PAD.top) / PLOT_H)),
    }),
    []
  )

  const handleTensionChange = (values: number[]) => {
    onChange({ ...config, curveTension: values[0] })
  }

  const handleStepsChange = (steps: number) => {
    onChange({ ...config, steps: Math.max(2, Math.min(20, steps)) })
  }

  const handleResetCurve = () => {
    onChange({ ...config, curveTension: 2, controlPoints: [] })
  }

  // Control point drag handlers
  const handleCpPointerDown = (idx: number, e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDraggingCp(idx)
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggingCp === null || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const norm = fromSvg(sx, sy)
    const cps = [...(config.controlPoints ?? [])]
    cps[draggingCp] = norm
    onChange({ ...config, controlPoints: cps })
  }

  const handlePointerUp = () => {
    setDraggingCp(null)
  }

  // Add a new control point at the midpoint
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

  // Direct milestone value editing
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
    // For direct edits, we adjust the target or start based on which milestone
    if (idx === 0) {
      onChange({ ...config, start: parsed })
    } else if (idx === milestoneList.length - 1) {
      onChange({ ...config, target: parsed })
    }
    // For intermediate milestones, would need control points — skip for now
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
  const yLabels = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    label: Math.round(config.start + (config.target - config.start) * t),
    y: toSvg(0, t).y,
  }))

  return (
    <div className="space-y-3">
      {/* SVG Curve */}
      <div className="bg-muted/30 rounded-lg p-2 border border-border">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
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

          {/* Y-axis labels */}
          {yLabels.map((l, i) => (
            <text
              key={i}
              x={PAD.left - 4}
              y={l.y + 3}
              textAnchor="end"
              fontSize="8"
              fill="currentColor"
              fillOpacity={0.4}
            >
              {l.label}
            </text>
          ))}

          {/* X-axis label */}
          <text
            x={PAD.left + PLOT_W / 2}
            y={SVG_H - 2}
            textAnchor="middle"
            fontSize="8"
            fill="currentColor"
            fillOpacity={0.4}
          >
            Steps
          </text>

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

          {/* Curve line */}
          <path d={pathD} fill="none" stroke={accentColor} strokeWidth={2} strokeOpacity={0.6} />

          {/* Milestone dots */}
          {milestones.map((m) => {
            const t = config.steps <= 1 ? 1 : m.step / (config.steps - 1)
            const ny = (m.value - config.start) / (config.target - config.start || 1)
            const sv = toSvg(t, Math.max(0, Math.min(1, ny)))
            return (
              <circle
                key={m.step}
                cx={sv.x}
                cy={sv.y}
                r={3.5}
                fill={accentColor}
                stroke="white"
                strokeWidth={1.5}
              />
            )
          })}

          {/* Draggable control points */}
          {(config.controlPoints ?? []).map((cp, idx) => {
            const sv = toSvg(cp.x, cp.y)
            return (
              <g key={`cp-${idx}`}>
                {/* Connection lines to show where CP influences */}
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

      {/* Controls row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Tension slider */}
        <div className="space-y-1.5">
          <Label className="text-xs">
            Curve shape
          </Label>
          <Slider
            value={[config.curveTension]}
            onValueChange={handleTensionChange}
            min={-3}
            max={5}
            step={0.1}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Back-loaded</span>
            <span>Front-loaded</span>
          </div>
        </div>

        {/* Steps control */}
        <div className="space-y-1.5">
          <Label className="text-xs">Milestones</Label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleStepsChange(config.steps - 1)}
              disabled={config.steps <= 2}
            >
              -
            </Button>
            <span className="text-sm font-medium w-6 text-center">{config.steps}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleStepsChange(config.steps + 1)}
              disabled={config.steps >= 20}
            >
              +
            </Button>
          </div>
        </div>
      </div>

      {/* Control points management */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddControlPoint}
          disabled={(config.controlPoints ?? []).length >= 3}
          className="text-xs h-7"
        >
          + Control Point
        </Button>
        {(config.controlPoints ?? []).map((_, idx) => (
          <Button
            key={idx}
            variant="ghost"
            size="sm"
            onClick={() => handleRemoveControlPoint(idx)}
            className="text-xs h-7 text-muted-foreground"
          >
            Remove CP{idx + 1}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResetCurve}
          className="text-xs h-7 text-muted-foreground ml-auto"
        >
          <RotateCcw className="size-3 mr-1" />
          Reset
        </Button>
      </div>

      {/* Milestone values list */}
      <div className="space-y-1">
        <Label className="text-xs">Milestone values</Label>
        <div className="grid grid-cols-5 gap-1.5">
          {milestones.map((m, idx) => {
            const isFirst = idx === 0
            const isLast = idx === milestones.length - 1
            const isEditing = editingIdx === idx
            return (
              <div
                key={m.step}
                className="relative"
              >
                {isEditing && allowDirectEdit && (isFirst || isLast) ? (
                  <Input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => commitEdit(idx, milestones)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit(idx, milestones)
                      if (e.key === "Escape") setEditingIdx(null)
                    }}
                    className="h-7 text-xs text-center p-0"
                    autoFocus
                  />
                ) : (
                  <button
                    className="w-full h-7 rounded-md text-xs font-medium border border-border bg-card hover:bg-muted/50 transition-colors"
                    style={{
                      borderColor: isFirst || isLast ? accentColor : undefined,
                      borderWidth: isFirst || isLast ? 1.5 : undefined,
                    }}
                    onClick={() => {
                      if (allowDirectEdit && (isFirst || isLast)) {
                        startEdit(idx, m.value)
                      }
                    }}
                    title={`Step ${m.step + 1}: ${m.value} (raw: ${m.rawValue.toFixed(1)})`}
                  >
                    {m.value.toLocaleString()}
                  </button>
                )}
                {idx === 0 && (
                  <span className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 text-[9px] text-muted-foreground">
                    start
                  </span>
                )}
                {idx === milestones.length - 1 && (
                  <span className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 text-[9px] text-muted-foreground">
                    goal
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
