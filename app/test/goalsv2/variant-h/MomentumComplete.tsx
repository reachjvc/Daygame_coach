"use client"

import { useMemo, useEffect, useRef, useState, useCallback } from "react"
import { interpolateWithControlPoints, generateMilestoneLadder } from "@/src/goals/milestoneService"
import type { MilestoneLadderConfig } from "@/src/goals/types"
import { useMomentumTheme, CornerBrackets } from "./MomentumThemeProvider"
import type { GoalCustomization } from "./MomentumCustomize"

interface MomentumCompleteProps {
  goals: GoalCustomization[]
  curveConfig: MilestoneLadderConfig
  pathColor: string
  onStartOver: () => void
}

export function MomentumComplete({ goals, curveConfig, pathColor, onStartOver }: MomentumCompleteProps) {
  const { theme, themeId } = useMomentumTheme()
  const isCyber = themeId === "cyberpunk"

  // Particle animation
  const [particleProgress, setParticleProgress] = useState(0)
  const animRef = useRef<number>(0)
  const startTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    startTimeRef.current = Date.now()
    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current
      const duration = 5000
      const t = (elapsed % duration) / duration
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      setParticleProgress(eased)
      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  const milestones = useMemo(() => generateMilestoneLadder(curveConfig), [curveConfig])

  const getParticlePosition = useCallback((t: number) => {
    const curved = interpolateWithControlPoints(t, curveConfig.controlPoints ?? [], curveConfig.curveTension)
    return { x: t, y: Math.max(0, Math.min(1, curved)) }
  }, [curveConfig.curveTension, curveConfig.controlPoints])

  // Compute stats
  const enabledGoals = goals.filter((g) => g.enabled)
  const momentumScore = useMemo(() => {
    const baseScore = enabledGoals.length * 10
    const targetBonus = enabledGoals.reduce((sum, g) => sum + Math.min(g.targetValue, 50), 0)
    return Math.min(999, baseScore + Math.floor(targetBonus / 2))
  }, [enabledGoals])

  const peakVelocity = useMemo(() => {
    let maxSpeed = 0
    const dt = 0.02
    for (let t = dt; t <= 1; t += dt) {
      const p1 = getParticlePosition(t - dt)
      const p2 = getParticlePosition(t)
      const speed = Math.abs(p2.y - p1.y) / dt
      if (speed > maxSpeed) maxSpeed = speed
    }
    return Math.round(maxSpeed * 100)
  }, [getParticlePosition])

  // SVG
  const SVG_W = 500
  const SVG_H = 160
  const PAD = { left: 20, right: 20, top: 20, bottom: 20 }
  const plotW = SVG_W - PAD.left - PAD.right
  const plotH = SVG_H - PAD.top - PAD.bottom

  const curvePathPoints = useMemo(() => {
    const pts: string[] = []
    const numPts = 100
    for (let i = 0; i <= numPts; i++) {
      const t = i / numPts
      const pos = getParticlePosition(t)
      const x = PAD.left + pos.x * plotW
      const y = PAD.top + (1 - pos.y) * plotH
      pts.push(`${i === 0 ? "M" : "L"}${x},${y}`)
    }
    return pts.join(" ")
  }, [getParticlePosition, plotW, plotH])

  const particlePos = useMemo(() => {
    const pos = getParticlePosition(particleProgress)
    return {
      x: PAD.left + pos.x * plotW,
      y: PAD.top + (1 - pos.y) * plotH,
    }
  }, [particleProgress, getParticlePosition, plotW, plotH])

  const trailPoints = useMemo(() => {
    const pts: { x: number; y: number; opacity: number }[] = []
    const trailLen = 15
    for (let i = 0; i < trailLen; i++) {
      const t = Math.max(0, particleProgress - (i * 0.012))
      const pos = getParticlePosition(t)
      pts.push({
        x: PAD.left + pos.x * plotW,
        y: PAD.top + (1 - pos.y) * plotH,
        opacity: 1 - (i / trailLen),
      })
    }
    return pts
  }, [particleProgress, getParticlePosition, plotW, plotH])

  const svgId = useRef(`mc-${Math.random().toString(36).slice(2, 8)}`).current

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, textAlign: "center" }}>
      {/* Status badge */}
      <div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 20px",
            borderRadius: isCyber ? 2 : 999,
            background: `${theme.accent}15`,
            color: theme.accent,
            fontSize: 13,
            fontWeight: 700,
            fontFamily: theme.fontFamily,
            textTransform: theme.textTransform,
            letterSpacing: theme.letterSpacing,
            border: isCyber ? `1px solid ${theme.accent}40` : "none",
            boxShadow: isCyber ? `0 0 20px ${theme.accentGlow}` : "none",
          }}
        >
          {isCyber ? "// " : ""}{theme.vocab.complete}
        </div>
      </div>

      {/* Title */}
      <div>
        <h2 style={{
          fontSize: isCyber ? 22 : 28,
          fontWeight: theme.headingWeight,
          fontFamily: theme.fontFamily,
          textTransform: theme.textTransform,
          letterSpacing: theme.letterSpacing,
        }}>
          {theme.vocab.profile}
        </h2>
        <p style={{ fontSize: 14, color: theme.textMuted, marginTop: 8, fontFamily: theme.fontFamily, textTransform: isCyber ? "uppercase" : "none" }}>
          {isCyber
            ? "All systems calibrated. Review momentum trajectory."
            : "Your growth curve is set. Here's your momentum profile."
          }
        </p>
      </div>

      {/* Main visualization */}
      <div
        style={{
          position: "relative",
          borderRadius: theme.borderRadiusLg,
          border: `2px solid ${theme.accent}30`,
          background: isCyber ? "#080808" : theme.cardBg,
          padding: 24,
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

        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          style={{ width: "100%", height: "auto", position: "relative", zIndex: 5 }}
        >
          <defs>
            <filter id={`${svgId}-glow`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation={isCyber ? 8 : 4} result="blur" />
              <feFlood floodColor={theme.accent} floodOpacity={isCyber ? 0.7 : 0.4} result="color" />
              <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id={`${svgId}-area`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.accent} stopOpacity={isCyber ? "0.2" : "0.1"} />
              <stop offset="100%" stopColor={theme.accent} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid */}
          {[0.25, 0.5, 0.75].map((t) => (
            <line
              key={t}
              x1={PAD.left} y1={PAD.top + (1 - t) * plotH}
              x2={PAD.left + plotW} y2={PAD.top + (1 - t) * plotH}
              stroke={isCyber ? theme.accent : "#000"} strokeOpacity={0.04} strokeDasharray="3,6"
            />
          ))}

          {/* Area fill */}
          <path
            d={`${curvePathPoints} L${PAD.left + plotW},${PAD.top + plotH} L${PAD.left},${PAD.top + plotH} Z`}
            fill={`url(#${svgId}-area)`}
          />

          {/* Curve */}
          <path
            d={curvePathPoints}
            fill="none"
            stroke={theme.accent}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeOpacity={0.7}
          />

          {/* Milestone markers */}
          {milestones.map((m, idx) => {
            const t = curveConfig.steps <= 1 ? 1 : m.step / (curveConfig.steps - 1)
            const ny = (m.value - curveConfig.start) / (curveConfig.target - curveConfig.start || 1)
            const x = PAD.left + t * plotW
            const y = PAD.top + (1 - Math.max(0, Math.min(1, ny))) * plotH
            return (
              <g key={idx}>
                <line
                  x1={x} y1={PAD.top + plotH}
                  x2={x} y2={y}
                  stroke={theme.accent} strokeOpacity={0.15} strokeDasharray="2,3"
                />
                <circle
                  cx={x} cy={y} r={3}
                  fill={theme.accent} fillOpacity={0.5}
                />
              </g>
            )
          })}

          {/* Trail */}
          {trailPoints.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x} cy={pt.y}
              r={isCyber ? 2.5 : 3}
              fill={theme.accent}
              fillOpacity={pt.opacity * (isCyber ? 0.5 : 0.3)}
            />
          ))}

          {/* Particle */}
          <circle
            cx={particlePos.x} cy={particlePos.y}
            r={isCyber ? 6 : 7}
            fill={theme.accent}
            filter={`url(#${svgId}-glow)`}
          />
          <circle
            cx={particlePos.x} cy={particlePos.y}
            r={isCyber ? 2.5 : 3.5}
            fill={isCyber ? "#fff" : theme.cardBg}
            fillOpacity={isCyber ? 0.8 : 0.9}
          />

          {/* Zen ripples */}
          {!isCyber && [1, 2].map((ring) => (
            <circle
              key={ring}
              cx={particlePos.x} cy={particlePos.y}
              r={8 + ring * 6 + (particleProgress * 4 % 4)}
              fill="none"
              stroke={theme.accent}
              strokeWidth={0.5}
              strokeOpacity={0.15 / ring}
            />
          ))}

          {/* Cyberpunk sparks */}
          {isCyber && Array.from({ length: 4 }, (_, i) => {
            const angle = (particleProgress * 360 + i * 90) * Math.PI / 180
            const dist = 10 + Math.sin(Date.now() / 150 + i * 1.5) * 4
            return (
              <line
                key={`spark-${i}`}
                x1={particlePos.x} y1={particlePos.y}
                x2={particlePos.x + Math.cos(angle) * dist}
                y2={particlePos.y + Math.sin(angle) * dist}
                stroke={theme.accent} strokeWidth={1.5} strokeOpacity={0.5}
              />
            )
          })}
        </svg>

        {/* Milestone summary */}
        <div
          style={{
            marginTop: 12,
            fontSize: isCyber ? 11 : 12,
            fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
            color: theme.textMuted,
            opacity: 0.6,
            position: "relative",
            zIndex: 5,
          }}
        >
          {milestones.map((m) => m.value.toLocaleString()).join(isCyber ? " > " : " \u2192 ")}
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <StatCard
          label={theme.vocab.totalMomentum}
          value={momentumScore.toString()}
          subtitle={`${enabledGoals.length} ${isCyber ? "VECTORS" : "goals"}`}
          pathColor={pathColor}
        />
        <StatCard
          label={theme.vocab.peakVelocity}
          value={peakVelocity.toString()}
          subtitle={isCyber ? "m/s MAX" : "peak rate"}
          pathColor={pathColor}
        />
        <StatCard
          label={theme.vocab.accelerationCurve}
          value={curveConfig.steps.toString()}
          subtitle={isCyber ? "CHECKPOINTS" : "milestones"}
          pathColor={pathColor}
        />
      </div>

      {/* Goal breakdown */}
      <div
        style={{
          position: "relative",
          borderRadius: theme.borderRadiusLg,
          border: `1px solid ${theme.border}`,
          background: theme.cardBg,
          padding: 20,
          textAlign: "left",
          overflow: "hidden",
        }}
      >
        {isCyber && <CornerBrackets />}
        <h3 style={{
          fontSize: isCyber ? 12 : 15,
          fontWeight: theme.headingWeight,
          fontFamily: theme.fontFamily,
          textTransform: theme.textTransform,
          letterSpacing: theme.letterSpacing,
          marginBottom: 12,
          position: "relative",
          zIndex: 5,
        }}>
          {isCyber ? "ACTIVE_VECTORS" : "Active Goals"}
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, position: "relative", zIndex: 5 }}>
          {enabledGoals.map((g) => (
            <div
              key={g.templateId}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderRadius: isCyber ? 2 : 6,
                background: isCyber ? "#0a0a0a" : theme.bgSecondary,
                border: `1px solid ${theme.border}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 6, height: 6,
                    borderRadius: isCyber ? 1 : "50%",
                    background: g.level === 1 ? pathColor : g.level === 2 ? theme.accent : `${theme.accent}80`,
                  }}
                />
                <span style={{ fontSize: 13, fontFamily: theme.fontFamily, textTransform: theme.textTransform }}>
                  {g.title}
                </span>
              </div>
              <span style={{ fontSize: 12, color: theme.textMuted, fontFamily: theme.fontFamily }}>
                {g.level === 1 ? (isCyber ? "L1" : "Vision") : g.level === 2 ? (isCyber ? "L2" : "Achievement") : `${isCyber ? "TGT:" : "Target:"} ${g.targetValue}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Start over button */}
      <div style={{ paddingBottom: 32 }}>
        <button
          onClick={onStartOver}
          style={{
            padding: "12px 32px",
            borderRadius: isCyber ? 2 : 8,
            border: `1px solid ${theme.border}`,
            background: "transparent",
            color: theme.textMuted,
            fontSize: 13,
            cursor: "pointer",
            fontFamily: theme.fontFamily,
            textTransform: theme.textTransform,
            letterSpacing: theme.letterSpacing,
          }}
        >
          {theme.vocab.startOver}
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Stat Card
// ============================================================================

function StatCard({ label, value, subtitle, pathColor }: { label: string; value: string; subtitle: string; pathColor: string }) {
  const { theme, themeId } = useMomentumTheme()
  const isCyber = themeId === "cyberpunk"

  return (
    <div
      style={{
        position: "relative",
        borderRadius: theme.borderRadius,
        border: `1px solid ${theme.border}`,
        background: theme.cardBg,
        padding: 16,
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      {isCyber && <CornerBrackets />}
      <div style={{ position: "relative", zIndex: 5 }}>
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: theme.textMuted, fontFamily: theme.fontFamily, marginBottom: 6 }}>
          {label}
        </div>
        <div style={{ fontSize: 28, fontWeight: 900, color: theme.accent, fontFamily: theme.fontFamily, lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: 11, color: theme.textMuted, fontFamily: theme.fontFamily, textTransform: theme.textTransform, marginTop: 4 }}>
          {subtitle}
        </div>
      </div>
    </div>
  )
}
