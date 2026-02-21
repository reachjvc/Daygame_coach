"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { Trophy, Loader2 } from "lucide-react"
import { GlassCard } from "./GlassCard"
import {
  ORBIT_CONFIG,
  SUN_RADIUS,
  CENTER,
  AURORA_HALO_COLORS,
  SETUP_TIER_ORDER,
} from "./setupConstants"
import type { LifeAreaConfig, BadgeStatus, DaygamePath } from "@/src/goals/types"
import { getParents, GOAL_TEMPLATE_MAP } from "@/src/goals/data/goalGraph"

// ============================================================================
// Props
// ============================================================================

interface AuroraOrreryStepProps {
  lifeAreas: LifeAreaConfig[]
  selectedAreas: Set<string>
  selectedGoals: Set<string>
  totalGoals: number
  path: DaygamePath | null
  onCreateGoals: () => void
  isCreating: boolean
}

// ============================================================================
// Component
// ============================================================================

export function AuroraOrreryStep({
  lifeAreas,
  selectedAreas,
  selectedGoals,
  totalGoals,
  path,
  onCreateGoals,
  isCreating,
}: AuroraOrreryStepProps) {
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null)
  const timeRef = useRef(0)
  const animFrameRef = useRef<number>(0)
  const [, setTick] = useState(0)

  const visibleAreas = useMemo(
    () => lifeAreas.filter((a) => a.id !== "custom"),
    [lifeAreas]
  )

  const goalCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    counts["daygame"] = Array.from(selectedGoals).filter((id) => id.startsWith("l3_")).length
    for (const area of lifeAreas) {
      if (area.id === "daygame" || area.id === "custom") continue
      const count = Array.from(selectedGoals).filter((id) =>
        id.startsWith(`${area.id}_s`)
      ).length
      if (count > 0) counts[area.id] = count
    }
    return counts
  }, [selectedGoals, lifeAreas])

  // Compute L2 achievements from selected L3 goals (same pattern as SummaryStep)
  const badges: BadgeStatus[] = useMemo(() => {
    const l2Set = new Set<string>()
    for (const goalId of selectedGoals) {
      const parents = getParents(goalId)
      for (const parent of parents) {
        if (parent.level === 2) {
          l2Set.add(parent.id)
        }
      }
    }
    return Array.from(l2Set).map((l2Id) => {
      const tmpl = GOAL_TEMPLATE_MAP[l2Id]
      return {
        badgeId: l2Id,
        title: tmpl?.title ?? l2Id,
        progress: 0,
        tier: "none" as const,
        unlocked: false,
      }
    })
  }, [selectedGoals])

  // Animate aurora ribbon wobble
  useEffect(() => {
    function tick() {
      timeRef.current += 0.02
      setTick((t) => t + 1)
      animFrameRef.current = requestAnimationFrame(tick)
    }
    animFrameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [])

  const activeAreas = new Set(["daygame", ...selectedAreas])
  const viewSize = CENTER * 2
  const t = timeRef.current

  // Generate aurora ribbon path for an orbit with more undulation
  function auroraOrbitPath(radius: number, offset: number = 0): string {
    const points: string[] = []
    const segments = 180
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      const wobble = Math.sin(angle * 8 + t * 2.5 + radius * 0.01 + offset) * 4 +
                     Math.sin(angle * 4 + t * 1.8 + offset * 2) * 3 +
                     Math.sin(angle * 12 + t * 3 + radius * 0.02) * 1.5
      const r = radius + wobble
      const x = CENTER + Math.cos(angle) * r
      const y = CENTER + Math.sin(angle) * r
      points.push(i === 0 ? `M${x},${y}` : `L${x},${y}`)
    }
    points.push("Z")
    return points.join(" ")
  }

  // Generate sun aurora tendrils — longer, more dramatic
  function sunTendrilPath(index: number, total: number): string {
    const baseAngle = (index / total) * Math.PI * 2
    const points: string[] = []
    const length = 80 + Math.sin(t * 0.8 + index * 1.2) * 30
    const segments = 40
    for (let i = 0; i <= segments; i++) {
      const frac = i / segments
      const dist = SUN_RADIUS * 0.9 + frac * length
      const curve = Math.sin(frac * Math.PI * 4 + t * 2.5 + index * 1.5) * (10 + frac * 20) +
                    Math.cos(frac * Math.PI * 2 + t * 1.8 + index) * (5 + frac * 8)
      const angle = baseAngle + (curve / dist)
      const x = CENTER + Math.cos(angle) * dist
      const y = CENTER + Math.sin(angle) * dist
      points.push(i === 0 ? `M${x},${y}` : `L${x},${y}`)
    }
    return points.join(" ")
  }

  // Plasma eruption arcs from sun surface
  function plasmaEruptionPath(index: number): string {
    const baseAngle = (index / 6) * Math.PI * 2 + t * 0.3
    const eruptHeight = 35 + Math.sin(t * 0.6 + index * 2.1) * 20
    const points: string[] = []
    const segments = 30
    for (let i = 0; i <= segments; i++) {
      const frac = i / segments
      const arcAngle = (frac - 0.5) * 0.8
      const dist = SUN_RADIUS + Math.sin(frac * Math.PI) * eruptHeight
      const angle = baseAngle + arcAngle
      const x = CENTER + Math.cos(angle) * dist
      const y = CENTER + Math.sin(angle) * dist
      points.push(i === 0 ? `M${x},${y}` : `L${x},${y}`)
    }
    return points.join(" ")
  }

  // Magnetic field lines connecting planets to sun — curved arcs
  function magneticFieldPath(radius: number, startAngle: number, curveDir: number = 1): string {
    const points: string[] = []
    const segments = 50
    for (let i = 0; i <= segments; i++) {
      const frac = i / segments
      const dist = SUN_RADIUS * 1.3 + frac * (radius - SUN_RADIUS * 1.3)
      const curve = Math.sin(frac * Math.PI) * (35 + 15 * Math.sin(t * 0.4 + startAngle)) * curveDir
      const angle = (startAngle * Math.PI / 180) + (curve / dist) * 0.3 +
                    Math.sin(frac * Math.PI * 2 + t * 0.8) * 0.03
      const x = CENTER + Math.cos(angle) * dist
      const y = CENTER + Math.sin(angle) * dist
      points.push(i === 0 ? `M${x},${y}` : `L${x},${y}`)
    }
    return points.join(" ")
  }

  // Solar wind particle stream — spiraling outward
  function solarWindPath(index: number): string {
    const baseAngle = (index / 16) * Math.PI * 2 + t * 0.15
    const points: string[] = []
    const segments = 60
    for (let i = 0; i <= segments; i++) {
      const frac = i / segments
      const dist = SUN_RADIUS * 1.2 + frac * (CENTER * 0.85)
      const spiral = frac * 0.8 + Math.sin(frac * Math.PI * 3 + t * 1.5 + index) * 0.15
      const angle = baseAngle + spiral
      const x = CENTER + Math.cos(angle) * dist
      const y = CENTER + Math.sin(angle) * dist
      points.push(i === 0 ? `M${x},${y}` : `L${x},${y}`)
    }
    return points.join(" ")
  }

  // Charged particle stream between two radii
  function chargedParticleDots(radius: number, count: number, areaId: string): { cx: number; cy: number; r: number; opacity: number }[] {
    const dots: { cx: number; cy: number; r: number; opacity: number }[] = []
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + t * (0.8 + radius * 0.002)
      const wobble = Math.sin(angle * 6 + t * 3 + i) * 5
      const dist = radius + wobble
      const opacity = 0.15 + 0.15 * Math.sin(t * 2 + i * 1.7 + radius * 0.05)
      dots.push({
        cx: CENTER + Math.cos(angle) * dist,
        cy: CENTER + Math.sin(angle) * dist,
        r: 1 + Math.sin(t * 1.5 + i) * 0.5,
        opacity,
      })
    }
    return dots
  }

  return (
    <div className="min-h-screen pt-8 pb-36 px-6">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-emerald-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
            Your System
          </h2>
          <p className="text-white/40 text-sm">
            {totalGoals} goals {"\u00B7"} {activeAreas.size} life areas
            {path && ` \u00B7 ${path === "fto" ? "Find The One" : "Abundance"}`}
          </p>
        </div>

        <div
          className="relative w-full mx-auto"
          style={{ maxWidth: 740, aspectRatio: "1/1" }}
        >
          <style>{`
            @keyframes v9c-SunPulse {
              0%, 100% { filter: drop-shadow(0 0 25px rgba(0, 230, 118, 0.6)) drop-shadow(0 0 50px rgba(124, 77, 255, 0.35)) drop-shadow(0 0 80px rgba(255, 64, 129, 0.15)); }
              50% { filter: drop-shadow(0 0 40px rgba(0, 230, 118, 0.9)) drop-shadow(0 0 80px rgba(124, 77, 255, 0.55)) drop-shadow(0 0 120px rgba(255, 64, 129, 0.25)); }
            }
            @keyframes v9c-SunCorona {
              0%, 100% { opacity: 0.3; transform: scale(1) rotate(0deg); }
              25% { opacity: 0.45; transform: scale(1.05) rotate(3deg); }
              50% { opacity: 0.35; transform: scale(1.02) rotate(-2deg); }
              75% { opacity: 0.5; transform: scale(1.08) rotate(1deg); }
            }
            @keyframes v9c-PlanetBreathe {
              0%, 100% { transform: scale(1); opacity: 0.25; }
              50% { transform: scale(1.08); opacity: 0.35; }
            }
            @keyframes v9c-particleDrift {
              0% { opacity: 0; }
              20% { opacity: 1; }
              80% { opacity: 1; }
              100% { opacity: 0; }
            }
            @keyframes v9c-auroraOrbitGlow {
              0%, 100% { stroke-opacity: 0.2; }
              50% { stroke-opacity: 0.4; }
            }
            ${visibleAreas
              .map((area) => {
                const config = ORBIT_CONFIG[area.id]
                if (!config) return ""
                return `
                @keyframes v9c-orbit-${area.id} {
                  from { transform: rotate(${config.startAngle}deg); }
                  to { transform: rotate(${config.startAngle + 360}deg); }
                }
                @keyframes v9c-counter-orbit-${area.id} {
                  from { transform: rotate(-${config.startAngle}deg); }
                  to { transform: rotate(-${config.startAngle + 360}deg); }
                }
              `
              })
              .join("\n")}
          `}</style>

          <svg
            viewBox={`0 0 ${viewSize} ${viewSize}`}
            className="w-full h-full"
            style={{ overflow: "visible" }}
          >
            <defs>
              {/* Sun gradient with aurora colors */}
              <radialGradient id="v9c-sun-gradient" cx="35%" cy="35%">
                <stop offset="0%" stopColor="#f0fff0" />
                <stop offset="15%" stopColor="#b9f6ca" />
                <stop offset="35%" stopColor="#69F0AE" />
                <stop offset="55%" stopColor="#00E676" />
                <stop offset="75%" stopColor="#00C853" />
                <stop offset="90%" stopColor="#00796B" />
                <stop offset="100%" stopColor="#004D40" />
              </radialGradient>
              <radialGradient id="v9c-sun-glow">
                <stop offset="0%" stopColor="#00E676" stopOpacity="0.5" />
                <stop offset="20%" stopColor="#69F0AE" stopOpacity="0.25" />
                <stop offset="40%" stopColor="#7C4DFF" stopOpacity="0.12" />
                <stop offset="60%" stopColor="#FF4081" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#000" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="v9c-corona-glow">
                <stop offset="0%" stopColor="#69F0AE" stopOpacity="0.35" />
                <stop offset="25%" stopColor="#00E676" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#7C4DFF" stopOpacity="0.1" />
                <stop offset="75%" stopColor="#FF4081" stopOpacity="0.04" />
                <stop offset="100%" stopColor="#7C4DFF" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="v9c-corona-outer">
                <stop offset="0%" stopColor="#00E676" stopOpacity="0.1" />
                <stop offset="30%" stopColor="#7C4DFF" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#000" stopOpacity="0" />
              </radialGradient>
              {/* Planet gradients for each life area */}
              {visibleAreas.map((area) => {
                const haloColors = AURORA_HALO_COLORS[area.id] ?? ["#00E676", "#7C4DFF", "#FF4081", "#69F0AE"]
                return (
                  <radialGradient key={`pg-${area.id}`} id={`v9c-planet-${area.id}`} cx="35%" cy="35%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
                    <stop offset="30%" stopColor={haloColors[0]} stopOpacity="0.9" />
                    <stop offset="70%" stopColor={area.hex} stopOpacity="1" />
                    <stop offset="100%" stopColor={haloColors[3] ?? haloColors[0]} stopOpacity="0.8" />
                  </radialGradient>
                )
              })}
              <filter id="v9c-planet-glow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="blur" />
                <feFlood floodOpacity="0.6" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="v9c-active-glow" x="-120%" y="-120%" width="340%" height="340%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="10" result="blur" />
                <feFlood floodOpacity="0.8" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="v9c-aurora-blur">
                <feGaussianBlur stdDeviation="2.5" />
              </filter>
              <filter id="v9c-soft-blur">
                <feGaussianBlur stdDeviation="4" />
              </filter>
              <filter id="v9c-wide-blur">
                <feGaussianBlur stdDeviation="8" />
              </filter>
            </defs>

            {/* === Solar wind streams (background, spiraling outward) === */}
            {Array.from({ length: 16 }).map((_, i) => {
              const windColors = ["#00E676", "#7C4DFF", "#FF4081", "#00E5FF", "#69F0AE", "#B388FF", "#FF80AB", "#84FFFF"]
              return (
                <path
                  key={`wind-${i}`}
                  d={solarWindPath(i)}
                  fill="none"
                  stroke={windColors[i % windColors.length]}
                  strokeWidth="0.6"
                  strokeOpacity={0.04 + Math.sin(t * 0.5 + i * 0.7) * 0.02}
                  strokeDasharray="2,12"
                />
              )
            })}

            {/* === Ambient geomagnetic field lines (large curved arcs) === */}
            {[0, 60, 120, 180, 240, 300].map((angle, i) => (
              <g key={`geo-${i}`}>
                <path
                  d={magneticFieldPath(CENTER * 0.9, angle, 1)}
                  fill="none"
                  stroke="#00E676"
                  strokeWidth="0.4"
                  strokeOpacity={0.04 + Math.sin(t * 0.3 + i) * 0.02}
                  strokeDasharray="3,10"
                  filter="url(#v9c-soft-blur)"
                />
                <path
                  d={magneticFieldPath(CENTER * 0.9, angle, -1)}
                  fill="none"
                  stroke="#7C4DFF"
                  strokeWidth="0.4"
                  strokeOpacity={0.03 + Math.sin(t * 0.35 + i * 1.2) * 0.02}
                  strokeDasharray="3,10"
                  filter="url(#v9c-soft-blur)"
                />
              </g>
            ))}

            {/* === Magnetic field lines from sun to each active planet === */}
            {visibleAreas.map((area) => {
              const config = ORBIT_CONFIG[area.id]
              if (!config) return null
              const isActive = activeAreas.has(area.id)
              if (!isActive) return null
              const haloColors = AURORA_HALO_COLORS[area.id] ?? ["#00E676"]
              return (
                <g key={`field-${area.id}`}>
                  <path
                    d={magneticFieldPath(config.radius, config.startAngle, 1)}
                    fill="none"
                    stroke={haloColors[0]}
                    strokeWidth="0.8"
                    strokeOpacity={0.08 + Math.sin(t * 0.5 + config.startAngle) * 0.04}
                    strokeDasharray="4,8"
                    filter="url(#v9c-aurora-blur)"
                  />
                  <path
                    d={magneticFieldPath(config.radius, config.startAngle, -1)}
                    fill="none"
                    stroke={haloColors[1] ?? haloColors[0]}
                    strokeWidth="0.6"
                    strokeOpacity={0.06 + Math.sin(t * 0.6 + config.startAngle * 1.5) * 0.03}
                    strokeDasharray="3,10"
                    filter="url(#v9c-aurora-blur)"
                  />
                </g>
              )
            })}

            {/* === Aurora ribbon orbit paths (triple-layered, flowing) === */}
            {visibleAreas.map((area) => {
              const config = ORBIT_CONFIG[area.id]
              if (!config) return null
              const isActive = activeAreas.has(area.id)
              const isHovered = hoveredPlanet === area.id
              const haloColors = AURORA_HALO_COLORS[area.id] ?? ["#00E676", "#7C4DFF", "#FF4081", "#69F0AE"]

              return (
                <g key={`orbit-${area.id}`}>
                  {/* Outer diffuse aurora glow */}
                  {isActive && (
                    <path
                      d={auroraOrbitPath(config.radius, 3)}
                      fill="none"
                      stroke={haloColors[2] ?? haloColors[0]}
                      strokeWidth={isHovered ? 6 : 4}
                      strokeOpacity={isHovered ? 0.12 : 0.06}
                      filter="url(#v9c-wide-blur)"
                    />
                  )}
                  {/* Main aurora ribbon */}
                  <path
                    d={auroraOrbitPath(config.radius)}
                    fill="none"
                    stroke={isActive ? haloColors[0] : "rgba(100,120,255,0.06)"}
                    strokeWidth={isHovered ? 3 : isActive ? 2 : 0.4}
                    strokeOpacity={isActive ? (isHovered ? 0.45 : 0.3) : 0.08}
                    strokeDasharray={isActive ? "none" : "4,8"}
                    filter={isActive ? "url(#v9c-aurora-blur)" : undefined}
                  />
                  {/* Second ribbon layer offset */}
                  {isActive && (
                    <path
                      d={auroraOrbitPath(config.radius + 2, 1.5)}
                      fill="none"
                      stroke={haloColors[1]}
                      strokeWidth={isHovered ? 2 : 1.2}
                      strokeOpacity={isHovered ? 0.2 : 0.1}
                      filter="url(#v9c-aurora-blur)"
                    />
                  )}
                  {/* Third ribbon — inner edge */}
                  {isActive && (
                    <path
                      d={auroraOrbitPath(config.radius - 2, 2.5)}
                      fill="none"
                      stroke={haloColors[3] ?? haloColors[0]}
                      strokeWidth="0.8"
                      strokeOpacity={0.08}
                      filter="url(#v9c-aurora-blur)"
                    />
                  )}
                  {/* Charged particles along orbit */}
                  {isActive && chargedParticleDots(config.radius, 24, area.id).map((dot, di) => (
                    <circle
                      key={`particle-${area.id}-${di}`}
                      cx={dot.cx}
                      cy={dot.cy}
                      r={dot.r}
                      fill={haloColors[di % haloColors.length]}
                      fillOpacity={dot.opacity}
                    />
                  ))}
                </g>
              )
            })}

            {/* === Sun plasma eruptions (arcs from surface) === */}
            {Array.from({ length: 6 }).map((_, i) => {
              const eruptColors = ["#00E676", "#69F0AE", "#7C4DFF", "#FF4081", "#00E5FF", "#B388FF"]
              return (
                <path
                  key={`eruption-${i}`}
                  d={plasmaEruptionPath(i)}
                  fill="none"
                  stroke={eruptColors[i]}
                  strokeWidth={2.5 + Math.sin(t * 0.8 + i * 1.1) * 1}
                  strokeOpacity={0.2 + Math.sin(t * 0.6 + i * 2) * 0.1}
                  strokeLinecap="round"
                  filter="url(#v9c-aurora-blur)"
                />
              )
            })}

            {/* === Sun aurora tendrils (16, longer, more dramatic) === */}
            {Array.from({ length: 16 }).map((_, i) => {
              const colors = ["#00E676", "#7C4DFF", "#FF4081", "#69F0AE", "#536DFE", "#00E5FF", "#B388FF", "#FF80AB"]
              const color = colors[i % colors.length]
              return (
                <path
                  key={`tendril-${i}`}
                  d={sunTendrilPath(i, 16)}
                  fill="none"
                  stroke={color}
                  strokeWidth={2.5 + Math.sin(t * 1.2 + i * 0.8) * 1}
                  strokeOpacity={0.18 + Math.sin(t * 0.7 + i * 0.9) * 0.12}
                  strokeLinecap="round"
                  filter="url(#v9c-aurora-blur)"
                />
              )
            })}

            {/* === Sun glow layers (more layers, broader) === */}
            <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS * 4.5} fill="url(#v9c-corona-outer)"
              style={{ transformOrigin: `${CENTER}px ${CENTER}px`, animation: "v9c-SunCorona 8s ease-in-out infinite" }} />
            <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS * 3} fill="url(#v9c-corona-glow)"
              style={{ transformOrigin: `${CENTER}px ${CENTER}px`, animation: "v9c-SunCorona 6s ease-in-out infinite reverse" }} />
            <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS * 2} fill="url(#v9c-sun-glow)" />

            {/* === Sun body with surface detail === */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={SUN_RADIUS}
              fill="url(#v9c-sun-gradient)"
              style={{ animation: "v9c-SunPulse 4s ease-in-out infinite" }}
            />
            {/* Sun surface rings (magnetic field lines on surface) */}
            <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS * 0.8} fill="none"
              stroke="#b9f6ca" strokeWidth="0.5" strokeOpacity="0.2" strokeDasharray="2,4" />
            <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS * 0.6} fill="none"
              stroke="#e8ffe8" strokeWidth="0.4" strokeOpacity="0.25" />
            <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS * 0.4} fill="none"
              stroke="#e8ffe8" strokeWidth="0.3" strokeOpacity="0.15" />
            {/* Sun hot spot */}
            <circle cx={CENTER - SUN_RADIUS * 0.15} cy={CENTER - SUN_RADIUS * 0.15}
              r={SUN_RADIUS * 0.25} fill="rgba(255,255,255,0.12)" />
            <text
              x={CENTER}
              y={CENTER + 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#e8ffe8"
              fontSize="8"
              fontWeight="700"
              letterSpacing="0.8"
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              YOUR VISION
            </text>

            {/* === Planets === */}
            {visibleAreas.map((area) => {
              const config = ORBIT_CONFIG[area.id]
              if (!config) return null
              const isActive = activeAreas.has(area.id)
              const isHovered = hoveredPlanet === area.id
              const count = goalCounts[area.id] ?? 0
              const haloColors = AURORA_HALO_COLORS[area.id] ?? ["#00E676", "#7C4DFF", "#FF4081", "#69F0AE"]

              // Planet aurora halo: 5 rings that dance
              const haloRings = isActive ? [
                { dr: 5, color: haloColors[0], opacity: isHovered ? 0.4 : 0.25, width: isHovered ? 3.5 : 2.5 },
                { dr: 9, color: haloColors[1], opacity: isHovered ? 0.3 : 0.15, width: isHovered ? 3 : 2 },
                { dr: 13, color: haloColors[2], opacity: isHovered ? 0.2 : 0.1, width: isHovered ? 2 : 1.2 },
                { dr: 18, color: haloColors[3] ?? haloColors[0], opacity: isHovered ? 0.12 : 0.05, width: 0.8 },
                { dr: 23, color: haloColors[0], opacity: isHovered ? 0.06 : 0.02, width: 0.5 },
              ] : []

              return (
                <g
                  key={`planet-${area.id}`}
                  style={{
                    transformOrigin: `${CENTER}px ${CENTER}px`,
                    animation: `v9c-orbit-${area.id} ${config.duration}s linear infinite`,
                  }}
                >
                  <g
                    style={{
                      transformOrigin: `${CENTER}px ${CENTER - config.radius}px`,
                      animation: `v9c-counter-orbit-${area.id} ${config.duration}s linear infinite`,
                    }}
                  >
                    {/* Hover hit area */}
                    <circle
                      cx={CENTER}
                      cy={CENTER - config.radius}
                      r={config.planetSize + 20}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredPlanet(area.id)}
                      onMouseLeave={() => setHoveredPlanet(null)}
                    />

                    {/* Planet diffuse aurora glow (outermost) */}
                    {isActive && (
                      <circle
                        cx={CENTER}
                        cy={CENTER - config.radius}
                        r={config.planetSize + 28 + Math.sin(t * 0.8 + config.startAngle) * 4}
                        fill="none"
                        stroke={haloColors[0]}
                        strokeWidth="1"
                        strokeOpacity={0.03 + Math.sin(t * 0.5) * 0.015}
                        filter="url(#v9c-wide-blur)"
                      />
                    )}

                    {/* Planet aurora halo rings (5 layers) */}
                    {haloRings.map((ring, ri) => {
                      const wobble = Math.sin(t * 1.5 + ri * 2 + config.startAngle) * 2 +
                                     Math.cos(t * 1.2 + ri * 1.5) * 1
                      return (
                        <circle
                          key={`halo-${ri}`}
                          cx={CENTER}
                          cy={CENTER - config.radius}
                          r={config.planetSize + ring.dr + wobble}
                          fill="none"
                          stroke={ring.color}
                          strokeWidth={ring.width}
                          strokeOpacity={ring.opacity + Math.sin(t * 1.8 + ri) * ring.opacity * 0.3}
                          filter="url(#v9c-aurora-blur)"
                        />
                      )
                    })}

                    {/* Planet body with gradient */}
                    <circle
                      cx={CENTER}
                      cy={CENTER - config.radius}
                      r={config.planetSize}
                      fill={isActive ? `url(#v9c-planet-${area.id})` : area.hex}
                      fillOpacity={isActive ? 1 : 0.2}
                      filter={
                        isActive
                          ? isHovered
                            ? "url(#v9c-active-glow)"
                            : "url(#v9c-planet-glow)"
                          : undefined
                      }
                      className="transition-all duration-300"
                      style={
                        !isActive
                          ? {
                              transformOrigin: `${CENTER}px ${CENTER - config.radius}px`,
                              animation: "v9c-PlanetBreathe 4s ease-in-out infinite",
                            }
                          : undefined
                      }
                    />

                    {/* Planet surface band (equator line) */}
                    {isActive && (
                      <ellipse
                        cx={CENTER}
                        cy={CENTER - config.radius}
                        rx={config.planetSize}
                        ry={config.planetSize * 0.25}
                        fill="none"
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="0.5"
                      />
                    )}

                    {/* Highlight (specular) */}
                    <circle
                      cx={CENTER - config.planetSize * 0.25}
                      cy={CENTER - config.radius - config.planetSize * 0.25}
                      r={config.planetSize * 0.35}
                      fill="white"
                      fillOpacity={isActive ? 0.18 : 0.05}
                    />
                    {/* Secondary highlight */}
                    {isActive && (
                      <circle
                        cx={CENTER - config.planetSize * 0.1}
                        cy={CENTER - config.radius - config.planetSize * 0.35}
                        r={config.planetSize * 0.15}
                        fill="white"
                        fillOpacity={0.25}
                      />
                    )}

                    {/* Label */}
                    <text
                      x={CENTER}
                      y={CENTER - config.radius + config.planetSize + 16}
                      textAnchor="middle"
                      fill={
                        isActive
                          ? isHovered
                            ? "#fff"
                            : "rgba(255,255,255,0.8)"
                          : "rgba(255,255,255,0.2)"
                      }
                      fontSize={area.id === "daygame" ? "9" : "7.5"}
                      fontWeight={area.id === "daygame" ? "700" : "500"}
                      letterSpacing="0.3"
                      className="transition-colors duration-300"
                      style={{ fontFamily: "system-ui, sans-serif" }}
                    >
                      {area.name}
                    </text>

                    {/* Goal count badge */}
                    {isActive && count > 0 && (
                      <g>
                        <circle
                          cx={CENTER + config.planetSize - 2}
                          cy={CENTER - config.radius - config.planetSize + 2}
                          r={7}
                          fill="rgba(5,8,16,0.85)"
                          stroke={haloColors[0]}
                          strokeWidth="1"
                          strokeOpacity="0.6"
                        />
                        <text
                          x={CENTER + config.planetSize - 2}
                          y={CENTER - config.radius - config.planetSize + 2.5}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill={haloColors[0]}
                          fontSize="6"
                          fontWeight="700"
                          style={{ fontFamily: "system-ui, sans-serif" }}
                        >
                          {count}
                        </text>
                      </g>
                    )}

                    {/* Tooltip on hover */}
                    {isHovered && isActive && (
                      <g>
                        <rect
                          x={CENTER - 55}
                          y={CENTER - config.radius - config.planetSize - 32}
                          width={110}
                          height={24}
                          rx={8}
                          fill="rgba(5,8,16,0.92)"
                          stroke={haloColors[0]}
                          strokeWidth="0.8"
                          strokeOpacity="0.6"
                        />
                        <text
                          x={CENTER}
                          y={CENTER - config.radius - config.planetSize - 17}
                          textAnchor="middle"
                          fill="white"
                          fontSize="7.5"
                          fontWeight="500"
                          style={{ fontFamily: "system-ui, sans-serif" }}
                        >
                          {count} goal{count !== 1 ? "s" : ""} active
                        </text>
                      </g>
                    )}
                  </g>
                </g>
              )
            })}
          </svg>
        </div>

        {/* Badges grid */}
        {badges.length > 0 && (() => {
          const sorted = [...badges].sort((a, b) => (SETUP_TIER_ORDER[a.tier] ?? 4) - (SETUP_TIER_ORDER[b.tier] ?? 4))
          return (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-4 justify-center">
                <Trophy className="size-4 text-pink-400" />
                <span className="text-sm font-semibold uppercase tracking-wider text-pink-400/80">
                  Achievements to Earn
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {sorted.map((badge) => {
                  const tierColor =
                    badge.tier === "diamond"
                      ? "#b9f2ff"
                      : badge.tier === "gold"
                        ? "#ffd700"
                        : badge.tier === "silver"
                          ? "#c0c0c0"
                          : badge.tier === "bronze"
                            ? "#cd7f32"
                            : "#6366f1"

                  return (
                    <GlassCard key={badge.badgeId} glowColor={tierColor}>
                      <div className="p-3 text-center">
                        <div
                          className="size-8 rounded-full flex items-center justify-center mx-auto mb-1.5"
                          style={{
                            background: `${tierColor}12`,
                            boxShadow: `0 0 12px ${tierColor}15`,
                          }}
                        >
                          <Trophy className="size-4" style={{ color: tierColor }} />
                        </div>
                        <div className="text-xs text-white/70 leading-tight">{badge.title}</div>
                        <div
                          className="text-[10px] uppercase font-medium mt-1"
                          style={{ color: tierColor }}
                        >
                          {badge.tier === "none" ? "Locked" : badge.tier}
                        </div>
                      </div>
                    </GlassCard>
                  )
                })}
              </div>
            </div>
          )
        })()}

        <div className="mt-8 text-center">
          <button
            onClick={onCreateGoals}
            disabled={isCreating}
            className="px-8 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #00E676, #7C4DFF, #FF4081)",
              color: "white",
              boxShadow:
                "0 0 20px rgba(0,230,118,0.3), 0 0 40px rgba(124,77,255,0.15), 0 0 60px rgba(255,64,129,0.1)",
            }}
          >
            {isCreating ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Creating Goals...
              </span>
            ) : (
              "Create Goals"
            )}
          </button>
          <p className="text-xs text-white/20 mt-2">
            This will create {totalGoals} goals in your dashboard
          </p>
        </div>
      </div>
    </div>
  )
}
