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

function computeCurvePoints(cfg: MilestoneLadderConfig): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = []
  const numPts = 60
  const cps = cfg.controlPoints ?? []
  const effStart = Math.max(cfg.start, 1)
  const effTarget = Math.max(cfg.target, effStart + 1)
  const range = cfg.target - cfg.start || 1
  const useLog = effStart > 0 && effTarget / effStart >= 10

  for (let i = 0; i <= numPts; i++) {
    const t = i / numPts
    const curved = interpolateWithControlPoints(t, cps, cfg.curveTension)
    const actualValue = useLog
      ? effStart * Math.pow(effTarget / effStart, curved)
      : cfg.start + range * curved
    const y = (actualValue - cfg.start) / range
    pts.push({ x: t, y: Math.max(0, Math.min(1, y)) })
  }
  return pts
}

function computeYLabels(cfg: MilestoneLadderConfig) {
  return [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    value: t === 0
      ? cfg.start
      : t === 1
        ? cfg.target
        : roundToNiceNumber(cfg.start + (cfg.target - cfg.start) * t),
    t,
    isEndpoint: t === 0 || t === 1,
  }))
}

function computeTensionDisplay(tension: number): string {
  if (Math.abs(tension) < 0.05) return "Even pace"
  if (tension >= 1.0) return "Early momentum"
  if (tension > 0.05) return "Gentle start"
  if (tension <= -1.0) return "Slow build"
  return "Gradual build"
}

export function useCurveDemo(initialConfig?: Partial<MilestoneLadderConfig>) {
  const [config, setConfig] = useState<MilestoneLadderConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  })

  const [previewPresetId, setPreviewPresetId] = useState<string | null>(null)

  const milestones = useMemo(() => generateMilestoneLadder(config), [config])
  const curvePoints = useMemo(() => computeCurvePoints(config), [config])
  const yLabels = useMemo(() => computeYLabels(config), [config.start, config.target])

  const previewData = useMemo(() => {
    if (!previewPresetId) return null
    const preset = CURVE_PRESETS.find((p) => p.id === previewPresetId)
    if (!preset) return null
    const previewConfig: MilestoneLadderConfig = {
      ...config,
      steps: preset.steps,
      curveTension: preset.curveTension,
      controlPoints: [],
    }
    return {
      milestones: generateMilestoneLadder(previewConfig),
      curvePoints: computeCurvePoints(previewConfig),
      yLabels: computeYLabels(previewConfig),
      config: previewConfig,
      tensionDisplay: computeTensionDisplay(preset.curveTension),
    }
  }, [previewPresetId, config])

  const displayMilestones = previewData?.milestones ?? milestones
  const displayCurvePoints = previewData?.curvePoints ?? curvePoints
  const displayYLabels = previewData?.yLabels ?? yLabels
  const displayConfig = previewData?.config ?? config

  const activePresetId = useMemo(() => {
    const match = CURVE_PRESETS.find(
      (p) => p.steps === config.steps && Math.abs(p.curveTension - config.curveTension) < 0.05
    )
    return match?.id ?? null
  }, [config.steps, config.curveTension])

  const isCustom = activePresetId === null

  const tensionDisplay = useMemo(() => computeTensionDisplay(config.curveTension), [config.curveTension])
  const displayTensionDisplay = previewData?.tensionDisplay ?? tensionDisplay

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

  const hoverPreset = useCallback((presetId: string) => {
    setPreviewPresetId(presetId)
  }, [])

  const unhoverPreset = useCallback(() => {
    setPreviewPresetId(null)
  }, [])

  return {
    config,
    setConfig,
    milestones,
    curvePoints,
    activePresetId,
    tensionDisplay,
    yLabels,
    displayMilestones,
    displayCurvePoints,
    displayYLabels,
    displayConfig,
    displayTensionDisplay,
    isPreview: previewPresetId !== null,
    isCustom,
    hoverPreset,
    unhoverPreset,
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
