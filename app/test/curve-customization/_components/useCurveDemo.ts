"use client"

import { useState, useMemo, useCallback } from "react"
import {
  generateMilestoneLadder,
  interpolateWithControlPoints,
  roundToNiceNumber,
} from "@/src/goals/milestoneService"
import type { MilestoneLadderConfig, CurveControlPoint } from "@/src/goals/types"

export interface CurvePreset {
  id: string
  label: string
  description: string
  steps: number
  curveTension: number
}

export const CURVE_PRESETS: CurvePreset[] = [
  { id: "quick-wins", label: "Quick Wins", description: "Many small steps", steps: 8, curveTension: 1.2 },
  { id: "balanced", label: "Balanced", description: "Steady climb", steps: 5, curveTension: 0 },
  { id: "ambitious", label: "Ambitious", description: "Few big leaps", steps: 3, curveTension: -1.5 },
]

const DEFAULT_CONFIG: MilestoneLadderConfig = {
  start: 1,
  target: 1000,
  steps: 8,
  curveTension: 1.2,
  controlPoints: [],
}

export function useCurveDemo(initialConfig?: Partial<MilestoneLadderConfig>) {
  const [config, setConfig] = useState<MilestoneLadderConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  })

  const milestones = useMemo(() => generateMilestoneLadder(config), [config])

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

  const activePresetId = useMemo(() => {
    const match = CURVE_PRESETS.find(
      (p) => p.steps === config.steps && Math.abs(p.curveTension - config.curveTension) < 0.05
    )
    return match?.id ?? null
  }, [config.steps, config.curveTension])

  const tensionDisplay = useMemo(() => {
    if (Math.abs(config.curveTension) < 0.05) return "Linear"
    if (config.curveTension >= 1.0) return "Front-loaded"
    if (config.curveTension > 0.05) return "Slight front"
    if (config.curveTension <= -1.0) return "Back-loaded"
    return "Slight back"
  }, [config.curveTension])

  const yLabels = useMemo(() =>
    [0, 0.25, 0.5, 0.75, 1].map((t) => ({
      value: t === 0
        ? config.start
        : t === 1
          ? config.target
          : roundToNiceNumber(config.start + (config.target - config.start) * t),
      t,
      isEndpoint: t === 0 || t === 1,
    })),
    [config.start, config.target]
  )

  const selectPreset = useCallback((preset: CurvePreset) => {
    setConfig((c) => ({ ...c, steps: preset.steps, curveTension: preset.curveTension, controlPoints: [] }))
  }, [])

  const setTension = useCallback((tension: number) => {
    setConfig((c) => ({ ...c, curveTension: tension }))
  }, [])

  const setSteps = useCallback((steps: number) => {
    setConfig((c) => ({ ...c, steps: Math.max(2, Math.min(20, steps)) }))
  }, [])

  const resetCurve = useCallback(() => {
    setConfig((c) => ({ ...c, steps: 5, curveTension: 0, controlPoints: [] }))
  }, [])

  const addControlPoint = useCallback(() => {
    setConfig((c) => {
      const cps = [...(c.controlPoints ?? [])]
      if (cps.length >= 3) return c
      cps.push({ x: 0.5, y: 0.5 })
      return { ...c, controlPoints: cps }
    })
  }, [])

  const removeControlPoint = useCallback((idx: number) => {
    setConfig((c) => {
      const cps = [...(c.controlPoints ?? [])]
      cps.splice(idx, 1)
      return { ...c, controlPoints: cps }
    })
  }, [])

  const updateControlPoint = useCallback((idx: number, point: CurveControlPoint) => {
    setConfig((c) => {
      const cps = [...(c.controlPoints ?? [])]
      cps[idx] = point
      return { ...c, controlPoints: cps }
    })
  }, [])

  return {
    config,
    setConfig,
    milestones,
    curvePoints,
    activePresetId,
    tensionDisplay,
    yLabels,
    selectPreset,
    setTension,
    setSteps,
    resetCurve,
    addControlPoint,
    removeControlPoint,
    updateControlPoint,
    presets: CURVE_PRESETS,
  }
}

export type CurveDemoReturn = ReturnType<typeof useCurveDemo>
