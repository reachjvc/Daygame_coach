"use client"

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { ArrowLeft, ChevronRight } from "lucide-react"
import { MilestoneCurveEditor } from "@/src/goals/components/MilestoneCurveEditor"
import { generateMilestoneLadder, interpolateWithControlPoints } from "@/src/goals/milestoneService"
import type { MilestoneLadderConfig, GoalDisplayCategory } from "@/src/goals/types"
import { useMomentumTheme, CornerBrackets } from "./MomentumThemeProvider"
import type { GoalCustomization } from "./MomentumCustomize"

const CATEGORY_LABELS: Record<string, string> = {
  field_work: "Field Work",
  results: "Results",
  dirty_dog: "Dirty Dog",
  texting: "Texting",
  dates: "Dating",
  relationship: "Relationship",
}

const CYBER_CATEGORY_LABELS: Record<string, string> = {
  field_work: "FIELD_OPS",
  results: "OUTPUT",
  dirty_dog: "CLASSIFIED",
  texting: "COMMS",
  dates: "MISSIONS",
  relationship: "BONDS",
}

interface MomentumForgeProps {
  goals: GoalCustomization[]
  pathColor: string
  onBack: () => void
  onConfirm: (config: MilestoneLadderConfig) => void
}

export function MomentumForge({ goals, pathColor, onBack, onConfirm }: MomentumForgeProps) {
  const { theme, themeId } = useMomentumTheme()
  const isCyber = themeId === "cyberpunk"

  // Curve config state
  const [curveConfig, setCurveConfig] = useState<MilestoneLadderConfig>({
    start: 0,
    target: 100,
    steps: 5,
    curveTension: 0,
    controlPoints: [],
  })

  // Particle animation
  const [particleProgress, setParticleProgress] = useState(0)
  const animRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)

  // Animate the particle
  useEffect(() => {
    startTimeRef.current = Date.now()
    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current
      const duration = 4000 // 4 second cycle
      const t = (elapsed % duration) / duration
      // Smooth easing for natural motion
      const eased = t < 0.5
        ? 2 * t * t
        : 1 - Math.pow(-2 * t + 2, 2) / 2
      setParticleProgress(eased)
      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  // Generate milestones from config
  const milestones = useMemo(() => generateMilestoneLadder(curveConfig), [curveConfig])

  // Compute particle position on the curve
  const getParticlePosition = useCallback((t: number) => {
    const curved = interpolateWithControlPoints(t, curveConfig.controlPoints ?? [], curveConfig.curveTension)
    return { x: t, y: Math.max(0, Math.min(1, curved)) }
  }, [curveConfig.curveTension, curveConfig.controlPoints])

  // Current particle speed (derivative approximation)
  const particleSpeed = useMemo(() => {
    const dt = 0.02
    const t1 = Math.max(0, particleProgress - dt)
    const t2 = Math.min(1, particleProgress + dt)
    const p1 = getParticlePosition(t1)
    const p2 = getParticlePosition(t2)
    const dy = p2.y - p1.y
    const dx = t2 - t1
    return Math.abs(dy / dx) * 100
  }, [particleProgress, getParticlePosition])

  // Goal categories for momentum channels
  const goalsByCategory = useMemo(() => {
    const grouped: Record<string, GoalCustomization[]> = {}
    for (const g of goals) {
      // Simple categorization based on goal titles
      const cat = g.level === 1 ? "vision" : g.level === 2 ? "achievement" : "metric"
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(g)
    }
    return grouped
  }, [goals])

  // Momentum score
  const momentumScore = useMemo(() => {
    const enabledGoals = goals.filter((g) => g.enabled)
    const baseScore = enabledGoals.length * 10
    const targetBonus = enabledGoals.reduce((sum, g) => sum + Math.min(g.targetValue, 50), 0)
    return Math.min(999, baseScore + Math.floor(targetBonus / 2))
  }, [goals])

  // SVG dimensions for particle visualization
  const SVG_W = 400
  const SVG_H = 120
  const PAD = { left: 20, right: 20, top: 20, bottom: 20 }
  const plotW = SVG_W - PAD.left - PAD.right
  const plotH = SVG_H - PAD.top - PAD.bottom

  // Generate curve path points for the visualization
  const curvePathPoints = useMemo(() => {
    const pts: string[] = []
    const numPts = 80
    for (let i = 0; i <= numPts; i++) {
      const t = i / numPts
      const pos = getParticlePosition(t)
      const x = PAD.left + pos.x * plotW
      const y = PAD.top + (1 - pos.y) * plotH
      pts.push(`${i === 0 ? "M" : "L"}${x},${y}`)
    }
    return pts.join(" ")
  }, [getParticlePosition, plotW, plotH])

  // Particle SVG position
  const particlePos = useMemo(() => {
    const pos = getParticlePosition(particleProgress)
    return {
      x: PAD.left + pos.x * plotW,
      y: PAD.top + (1 - pos.y) * plotH,
    }
  }, [particleProgress, getParticlePosition, plotW, plotH])

  // Trail points (last N positions)
  const trailPoints = useMemo(() => {
    const pts: { x: number; y: number; opacity: number }[] = []
    const trailLen = 12
    for (let i = 0; i < trailLen; i++) {
      const t = Math.max(0, particleProgress - (i * 0.015))
      const pos = getParticlePosition(t)
      pts.push({
        x: PAD.left + pos.x * plotW,
        y: PAD.top + (1 - pos.y) * plotH,
        opacity: 1 - (i / trailLen),
      })
    }
    return pts
  }, [particleProgress, getParticlePosition, plotW, plotH])

  const svgId = useRef(`mf-${Math.random().toString(36).slice(2, 8)}`).current

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          onClick={onBack}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            fontSize: 13, color: theme.textMuted,
            background: "none", border: "none", cursor: "pointer",
            fontFamily: theme.fontFamily, textTransform: theme.textTransform,
          }}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} />
          {isCyber ? "< BACK" : "Back"}
        </button>
      </div>

      <div>
        <h2 style={{ fontSize: isCyber ? 18 : 24, fontWeight: theme.headingWeight, fontFamily: theme.fontFamily, textTransform: theme.textTransform, letterSpacing: theme.letterSpacing }}>
          {isCyber ? "MOMENTUM_FORGE" : "Build Your Momentum"}
        </h2>
        <p style={{ fontSize: 13, color: theme.textMuted, marginTop: 4, fontFamily: theme.fontFamily, textTransform: isCyber ? "uppercase" : "none" }}>
          {isCyber
            ? "Configure acceleration curve. Particle trajectory = your growth vector."
            : "Shape your growth curve. Watch the momentum build as your milestones progress."
          }
        </p>
      </div>

      {/* Particle Visualization */}
      <div
        style={{
          position: "relative",
          borderRadius: theme.borderRadiusLg,
          border: `1px solid ${theme.border}`,
          background: isCyber ? "#080808" : theme.cardBg,
          padding: 16,
          overflow: "hidden",
        }}
      >
        {isCyber && <CornerBrackets />}
        {theme.scanlines && (
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10,
            background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,51,0.03) 2px, rgba(255,0,51,0.03) 4px)",
          }} />
        )}

        {/* Stats row */}
        <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 12, position: "relative", zIndex: 5 }}>
          <StatBox
            label={theme.vocab.starting}
            value={Math.round(particleSpeed * 0.3)}
            unit={isCyber ? "m/s" : ""}
          />
          <StatBox
            label={isCyber ? "CURRENT_V" : "Current Speed"}
            value={Math.round(particleSpeed)}
            unit={isCyber ? "m/s" : ""}
            highlight
          />
          <StatBox
            label={theme.vocab.target}
            value={Math.round(particleSpeed * 1.5 + 20)}
            unit={isCyber ? "m/s" : ""}
          />
        </div>

        {/* SVG Visualization */}
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          style={{ width: "100%", height: "auto", position: "relative", zIndex: 5 }}
        >
          <defs>
            {/* Particle glow */}
            <filter id={`${svgId}-glow`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation={isCyber ? 6 : 3} result="blur" />
              <feFlood floodColor={isCyber ? theme.accent : theme.accent} floodOpacity={isCyber ? 0.6 : 0.3} result="color" />
              <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Curve gradient */}
            <linearGradient id={`${svgId}-curve-grad`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={theme.accent} stopOpacity="0.2" />
              <stop offset={`${particleProgress * 100}%`} stopColor={theme.accent} stopOpacity="0.6" />
              <stop offset={`${Math.min(100, particleProgress * 100 + 5)}%`} stopColor={theme.accent} stopOpacity="0.1" />
              <stop offset="100%" stopColor={theme.accent} stopOpacity="0.05" />
            </linearGradient>

            {/* Area fill */}
            <linearGradient id={`${svgId}-area`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.accent} stopOpacity={isCyber ? "0.15" : "0.08"} />
              <stop offset="100%" stopColor={theme.accent} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid */}
          {[0.25, 0.5, 0.75].map((t) => (
            <line
              key={t}
              x1={PAD.left}
              y1={PAD.top + (1 - t) * plotH}
              x2={PAD.left + plotW}
              y2={PAD.top + (1 - t) * plotH}
              stroke={isCyber ? theme.accent : "#000"}
              strokeOpacity={0.05}
              strokeDasharray="3,6"
            />
          ))}

          {/* Area under curve */}
          <path
            d={`${curvePathPoints} L${PAD.left + plotW},${PAD.top + plotH} L${PAD.left},${PAD.top + plotH} Z`}
            fill={`url(#${svgId}-area)`}
          />

          {/* Curve path */}
          <path
            d={curvePathPoints}
            fill="none"
            stroke={`url(#${svgId}-curve-grad)`}
            strokeWidth={isCyber ? 2 : 2.5}
            strokeLinecap="round"
          />

          {/* Trail */}
          {trailPoints.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={isCyber ? 2 : 2.5}
              fill={theme.accent}
              fillOpacity={pt.opacity * (isCyber ? 0.5 : 0.3)}
            />
          ))}

          {/* Particle */}
          <circle
            cx={particlePos.x}
            cy={particlePos.y}
            r={isCyber ? 5 : 6}
            fill={theme.accent}
            filter={`url(#${svgId}-glow)`}
          />
          {/* Inner particle */}
          <circle
            cx={particlePos.x}
            cy={particlePos.y}
            r={isCyber ? 2 : 3}
            fill={isCyber ? "#fff" : theme.cardBg}
            fillOpacity={isCyber ? 0.8 : 0.9}
          />

          {/* Zen: water ripple ring */}
          {!isCyber && (
            <circle
              cx={particlePos.x}
              cy={particlePos.y}
              r={10 + (particleProgress * 3 % 3)}
              fill="none"
              stroke={theme.accent}
              strokeWidth={0.5}
              strokeOpacity={0.2}
            />
          )}

          {/* Cyberpunk: electric sparks */}
          {isCyber && Array.from({ length: 3 }, (_, i) => {
            const angle = (particleProgress * 360 + i * 120) * Math.PI / 180
            const dist = 8 + Math.sin(Date.now() / 200 + i) * 3
            return (
              <line
                key={`spark-${i}`}
                x1={particlePos.x}
                y1={particlePos.y}
                x2={particlePos.x + Math.cos(angle) * dist}
                y2={particlePos.y + Math.sin(angle) * dist}
                stroke={theme.accent}
                strokeWidth={1}
                strokeOpacity={0.4}
              />
            )
          })}
        </svg>

        {/* Speed indicator bar */}
        <div
          style={{
            marginTop: 8,
            height: 4,
            borderRadius: isCyber ? 0 : 999,
            background: `${theme.accent}15`,
            overflow: "hidden",
            position: "relative",
            zIndex: 5,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.min(100, particleSpeed)}%`,
              borderRadius: isCyber ? 0 : 999,
              background: theme.accent,
              boxShadow: isCyber ? `0 0 8px ${theme.accentGlow}` : "none",
              transition: "width 0.1s linear",
            }}
          />
        </div>
      </div>

      {/* Momentum Channels */}
      <div>
        <h3 style={{ fontSize: isCyber ? 12 : 16, fontWeight: theme.headingWeight, fontFamily: theme.fontFamily, textTransform: theme.textTransform, letterSpacing: theme.letterSpacing, marginBottom: 12 }}>
          {isCyber ? "MOMENTUM_CHANNELS" : "Momentum Channels"}
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {Object.entries(goalsByCategory).map(([cat, catGoals]) => {
            const enabledCount = catGoals.filter((g) => g.enabled).length
            const velocity = enabledCount * 15 + catGoals.reduce((s, g) => s + Math.min(g.targetValue, 20), 0)

            return (
              <div
                key={cat}
                style={{
                  position: "relative",
                  borderRadius: theme.borderRadius,
                  border: `1px solid ${theme.border}`,
                  background: theme.cardBg,
                  padding: 14,
                  overflow: "hidden",
                }}
              >
                {isCyber && <CornerBrackets />}
                <div style={{ position: "relative", zIndex: 5 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: theme.textMuted, fontFamily: theme.fontFamily, marginBottom: 4 }}>
                    {cat === "vision" ? (isCyber ? "PRIMARY" : "Vision") : cat === "achievement" ? (isCyber ? "SUBSYSTEMS" : "Achievements") : (isCyber ? "METRICS" : "Metrics")}
                  </div>
                  <div style={{ fontSize: isCyber ? 20 : 22, fontWeight: 800, color: theme.accent, fontFamily: theme.fontFamily }}>
                    {velocity}
                  </div>
                  <div style={{ fontSize: 10, color: theme.textMuted, fontFamily: theme.fontFamily, textTransform: theme.textTransform }}>
                    {isCyber ? `${enabledCount} ACTIVE` : `${enabledCount} active`}
                  </div>
                </div>
                {/* Background bar */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: `${theme.accent}15`,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, velocity / 2)}%`,
                      background: theme.accent,
                      boxShadow: isCyber ? `0 0 6px ${theme.accentGlow}` : "none",
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Momentum Score */}
      <div
        style={{
          position: "relative",
          borderRadius: theme.borderRadiusLg,
          border: `2px solid ${theme.accent}30`,
          background: isCyber ? "#080808" : `${theme.accent}04`,
          padding: 20,
          textAlign: "center",
          overflow: "hidden",
        }}
      >
        {isCyber && <CornerBrackets />}
        {theme.scanlines && (
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1,
            background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,51,0.02) 2px, rgba(255,0,51,0.02) 4px)",
          }} />
        )}
        <div style={{ position: "relative", zIndex: 5 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: theme.textMuted, fontFamily: theme.fontFamily, marginBottom: 4 }}>
            {theme.vocab.score}
          </div>
          <div style={{ fontSize: 48, fontWeight: 900, color: theme.accent, fontFamily: theme.fontFamily, lineHeight: 1, letterSpacing: isCyber ? "0.05em" : "-0.02em" }}>
            {momentumScore}
          </div>
          <div style={{ fontSize: 12, color: theme.textMuted, fontFamily: theme.fontFamily, textTransform: theme.textTransform, marginTop: 4 }}>
            {isCyber ? `${goals.filter(g => g.enabled).length} VECTORS // ${curveConfig.steps} MILESTONES`
              : `${goals.filter(g => g.enabled).length} goals across ${curveConfig.steps} milestones`
            }
          </div>
        </div>
      </div>

      {/* Curve Editor */}
      <div>
        <h3 style={{ fontSize: isCyber ? 12 : 16, fontWeight: theme.headingWeight, fontFamily: theme.fontFamily, textTransform: theme.textTransform, letterSpacing: theme.letterSpacing, marginBottom: 12 }}>
          {theme.vocab.accelerationCurve}
        </h3>
        <MilestoneCurveEditor
          config={curveConfig}
          onChange={setCurveConfig}
          allowDirectEdit
          themeId={themeId}
        />
      </div>

      {/* Confirm footer */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          background: `${theme.bg}ee`,
          backdropFilter: "blur(8px)",
          borderTop: `1px solid ${theme.border}`,
          margin: "0 -24px",
          padding: "16px 24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 13, color: theme.textMuted, fontFamily: theme.fontFamily, textTransform: theme.textTransform }}>
            {theme.vocab.score}: <span style={{ fontWeight: 700, color: theme.accent }}>{momentumScore}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={onBack}
              style={{
                padding: "10px 20px",
                borderRadius: isCyber ? 2 : 8,
                border: `1px solid ${theme.border}`,
                background: "transparent",
                color: theme.text,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: theme.fontFamily,
                textTransform: theme.textTransform,
              }}
            >
              {isCyber ? "< BACK" : "Back"}
            </button>
            <button
              onClick={() => onConfirm(curveConfig)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 24px",
                borderRadius: isCyber ? 2 : 8,
                border: isCyber ? `1px solid ${pathColor}` : "none",
                background: pathColor,
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: theme.fontFamily,
                textTransform: theme.textTransform,
                letterSpacing: theme.letterSpacing,
                boxShadow: isCyber ? `0 0 12px ${pathColor}40` : "none",
              }}
            >
              {theme.vocab.launch}
              <ChevronRight style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Stat Box
// ============================================================================

function StatBox({ label, value, unit, highlight }: { label: string; value: number; unit: string; highlight?: boolean }) {
  const { theme, themeId } = useMomentumTheme()
  const isCyber = themeId === "cyberpunk"

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: theme.textMuted, fontFamily: theme.fontFamily, marginBottom: 2 }}>
        {label}
      </div>
      <div style={{
        fontSize: highlight ? 24 : 18,
        fontWeight: 800,
        color: highlight ? theme.accent : theme.text,
        fontFamily: theme.fontFamily,
        letterSpacing: isCyber ? "0.05em" : "-0.02em",
        textShadow: highlight && isCyber ? `0 0 12px ${theme.accentGlow}` : "none",
      }}>
        {value}
        {unit && <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 2, opacity: 0.6 }}>{unit}</span>}
      </div>
    </div>
  )
}
