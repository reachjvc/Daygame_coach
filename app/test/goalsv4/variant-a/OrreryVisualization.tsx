"use client"

import { useState, useEffect, useMemo } from "react"
import { LIFE_AREAS } from "@/src/goals/data/lifeAreas"
import type { LifeAreaConfig } from "@/src/goals/types"

interface OrreryVisualizationProps {
  activePlanetId: string | null
  onPlanetClick: (area: LifeAreaConfig) => void
  daygameMoons?: { label: string; id: string; color: string }[]
  selectedGoalLabels?: string[]
  showComingSoon?: boolean
  compact?: boolean
}

const ORBIT_CONFIG: Record<
  string,
  { radius: number; duration: number; startAngle: number; planetSize: number }
> = {
  daygame: { radius: 100, duration: 45, startAngle: 0, planetSize: 20 },
  health_fitness: { radius: 155, duration: 60, startAngle: 45, planetSize: 14 },
  career_business: { radius: 200, duration: 80, startAngle: 120, planetSize: 14 },
  social: { radius: 240, duration: 100, startAngle: 200, planetSize: 13 },
  personal_growth: { radius: 275, duration: 120, startAngle: 300, planetSize: 13 },
  lifestyle: { radius: 305, duration: 140, startAngle: 160, planetSize: 12 },
}

const SUN_RADIUS = 38
const CENTER = 370
const TICK_COUNT = 60

export function OrreryVisualization({
  activePlanetId,
  onPlanetClick,
  daygameMoons,
  showComingSoon = true,
  compact = false,
}: OrreryVisualizationProps) {
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null)
  const [comingSoonPlanet, setComingSoonPlanet] = useState<string | null>(null)

  useEffect(() => {
    if (!comingSoonPlanet) return
    const timer = setTimeout(() => setComingSoonPlanet(null), 2000)
    return () => clearTimeout(timer)
  }, [comingSoonPlanet])

  const visibleAreas = useMemo(
    () => LIFE_AREAS.filter((a) => a.id !== "custom"),
    []
  )

  const viewSize = compact ? CENTER * 1.6 : CENTER * 2

  return (
    <div
      className="relative w-full mx-auto"
      style={{
        maxWidth: compact ? 500 : 740,
        aspectRatio: "1/1",
      }}
    >
      <style>{`
        @keyframes v4SunPulse {
          0%, 100% { filter: drop-shadow(0 0 20px rgba(218, 165, 32, 0.6)) drop-shadow(0 0 40px rgba(218, 165, 32, 0.3)); }
          50% { filter: drop-shadow(0 0 30px rgba(218, 165, 32, 0.8)) drop-shadow(0 0 60px rgba(218, 165, 32, 0.5)); }
        }
        @keyframes v4GearSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes v4GearSpinReverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        ${visibleAreas
          .map((area) => {
            const config = ORBIT_CONFIG[area.id]
            if (!config) return ""
            return `
            @keyframes v4orbit-${area.id} {
              from { transform: rotate(${config.startAngle}deg); }
              to { transform: rotate(${config.startAngle + 360}deg); }
            }
            @keyframes v4counter-orbit-${area.id} {
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
          <radialGradient id="v4-sun-gradient" cx="40%" cy="40%">
            <stop offset="0%" stopColor="#fff8dc" />
            <stop offset="30%" stopColor="#ffd700" />
            <stop offset="60%" stopColor="#daa520" />
            <stop offset="100%" stopColor="#b8860b" />
          </radialGradient>

          <radialGradient id="v4-sun-glow">
            <stop offset="0%" stopColor="#daa520" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#daa520" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#daa520" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="v4-brass-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#cd853f" stopOpacity="0.25" />
            <stop offset="50%" stopColor="#daa520" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#b8860b" stopOpacity="0.25" />
          </linearGradient>

          <filter
            id="v4-planet-glow"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
            <feFlood floodColor="#daa520" floodOpacity="0.5" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter
            id="v4-active-planet-glow"
            x="-80%"
            y="-80%"
            width="260%"
            height="260%"
          >
            <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="blur" />
            <feFlood floodColor="#ffd700" floodOpacity="0.7" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <pattern
            id="v4-gear-pattern"
            x="0"
            y="0"
            width="80"
            height="80"
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx="40"
              cy="40"
              r="15"
              fill="none"
              stroke="#1a1a2e"
              strokeWidth="0.5"
              strokeDasharray="2,4"
            />
            <circle cx="40" cy="40" r="2" fill="#1a1a2e" fillOpacity="0.3" />
          </pattern>
        </defs>

        {/* Background gear texture */}
        <rect
          x="0"
          y="0"
          width={viewSize}
          height={viewSize}
          fill="url(#v4-gear-pattern)"
          opacity="0.12"
        />

        {/* Compass rose lines (N, S, E, W) */}
        {[0, 90, 180, 270].map((angle) => (
          <line
            key={`compass-line-${angle}`}
            x1={CENTER}
            y1={CENTER - SUN_RADIUS - 15}
            x2={CENTER}
            y2={20}
            stroke="#cd853f"
            strokeWidth="0.5"
            strokeOpacity="0.06"
            transform={`rotate(${angle} ${CENTER} ${CENTER})`}
          />
        ))}

        {/* Decorative gear rings near the sun */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={SUN_RADIUS + 15}
          fill="none"
          stroke="#cd853f"
          strokeWidth="0.6"
          strokeOpacity="0.12"
          strokeDasharray="3,5"
          style={{
            transformOrigin: `${CENTER}px ${CENTER}px`,
            animation: "v4GearSpin 120s linear infinite",
          }}
        />
        <circle
          cx={CENTER}
          cy={CENTER}
          r={SUN_RADIUS + 25}
          fill="none"
          stroke="#b8860b"
          strokeWidth="0.4"
          strokeOpacity="0.08"
          strokeDasharray="2,8"
          style={{
            transformOrigin: `${CENTER}px ${CENTER}px`,
            animation: "v4GearSpinReverse 90s linear infinite",
          }}
        />

        {/* Orbit rings with tick marks */}
        {visibleAreas.map((area) => {
          const config = ORBIT_CONFIG[area.id]
          if (!config) return null
          const isHovered = hoveredPlanet === area.id
          const isActive = activePlanetId === area.id

          return (
            <g key={`orbit-${area.id}`}>
              <circle
                cx={CENTER}
                cy={CENTER}
                r={config.radius}
                fill="none"
                stroke="url(#v4-brass-ring)"
                strokeWidth={isHovered || isActive ? 1.5 : 0.8}
                opacity={isHovered || isActive ? 0.6 : 0.3}
                className="transition-all duration-300"
              />

              {Array.from({ length: TICK_COUNT }, (_, i) => {
                const angle = (i / TICK_COUNT) * 360
                const isMajor = i % 15 === 0
                const tickLength = isMajor ? 6 : 3
                const innerR = config.radius - tickLength / 2
                const outerR = config.radius + tickLength / 2
                const rad = (angle * Math.PI) / 180
                return (
                  <line
                    key={`tick-${area.id}-${i}`}
                    x1={CENTER + Math.cos(rad) * innerR}
                    y1={CENTER + Math.sin(rad) * innerR}
                    x2={CENTER + Math.cos(rad) * outerR}
                    y2={CENTER + Math.sin(rad) * outerR}
                    stroke="#cd853f"
                    strokeWidth={isMajor ? 0.8 : 0.3}
                    strokeOpacity={isMajor ? 0.25 : 0.12}
                  />
                )
              })}
            </g>
          )
        })}

        {/* Sun glow */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={SUN_RADIUS * 2.5}
          fill="url(#v4-sun-glow)"
        />

        {/* Sun body */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={SUN_RADIUS}
          fill="url(#v4-sun-gradient)"
          style={{ animation: "v4SunPulse 4s ease-in-out infinite" }}
        />

        {/* Sun inner detail */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={SUN_RADIUS * 0.6}
          fill="none"
          stroke="#fff8dc"
          strokeWidth="0.5"
          strokeOpacity="0.3"
        />
        <circle
          cx={CENTER}
          cy={CENTER}
          r={SUN_RADIUS * 0.3}
          fill="none"
          stroke="#fff8dc"
          strokeWidth="0.3"
          strokeOpacity="0.2"
        />

        {/* Sun label */}
        <text
          x={CENTER}
          y={CENTER + 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#0a0a1a"
          fontSize="9"
          fontWeight="700"
          letterSpacing="0.5"
          style={{ fontFamily: "system-ui, sans-serif" }}
        >
          YOUR VISION
        </text>

        {/* Planets on their orbits */}
        {visibleAreas.map((area) => {
          const config = ORBIT_CONFIG[area.id]
          if (!config) return null
          const isHovered = hoveredPlanet === area.id
          const isActive = activePlanetId === area.id
          const isDaygame = area.id === "daygame"

          return (
            <g
              key={`planet-${area.id}`}
              style={{
                transformOrigin: `${CENTER}px ${CENTER}px`,
                animation: `v4orbit-${area.id} ${config.duration}s linear infinite`,
              }}
            >
              <g
                style={{
                  transformOrigin: `${CENTER}px ${CENTER - config.radius}px`,
                  animation: `v4counter-orbit-${area.id} ${config.duration}s linear infinite`,
                }}
              >
                {/* Clickable area */}
                <circle
                  cx={CENTER}
                  cy={CENTER - config.radius}
                  r={config.planetSize + 8}
                  fill="transparent"
                  className="cursor-pointer"
                  data-testid={`planet-${area.id}`}
                  onClick={() => {
                    if (!isDaygame && showComingSoon) {
                      setComingSoonPlanet(area.id)
                    }
                    onPlanetClick(area)
                  }}
                  onMouseEnter={() => setHoveredPlanet(area.id)}
                  onMouseLeave={() => setHoveredPlanet(null)}
                />

                {/* Planet outer ring */}
                <circle
                  cx={CENTER}
                  cy={CENTER - config.radius}
                  r={config.planetSize + 3}
                  fill="none"
                  stroke="#cd853f"
                  strokeWidth={isDaygame ? 1.5 : 0.8}
                  strokeOpacity={isHovered || isActive ? 0.6 : 0.2}
                  strokeDasharray={isDaygame ? "none" : "2,3"}
                  className="transition-all duration-300"
                />

                {/* Planet body */}
                <circle
                  cx={CENTER}
                  cy={CENTER - config.radius}
                  r={config.planetSize}
                  fill={area.hex}
                  fillOpacity={isDaygame || isActive ? 0.9 : 0.7}
                  filter={
                    isActive || isHovered
                      ? "url(#v4-active-planet-glow)"
                      : isDaygame
                        ? "url(#v4-planet-glow)"
                        : undefined
                  }
                  className="transition-all duration-300"
                />

                {/* Planet inner highlight */}
                <circle
                  cx={CENTER - config.planetSize * 0.25}
                  cy={
                    CENTER - config.radius - config.planetSize * 0.25
                  }
                  r={config.planetSize * 0.35}
                  fill="white"
                  fillOpacity="0.15"
                />

                {/* Planet label */}
                <text
                  x={CENTER}
                  y={CENTER - config.radius + config.planetSize + 14}
                  textAnchor="middle"
                  fill={
                    isHovered || isActive
                      ? "#daa520"
                      : "rgba(255,255,255,0.6)"
                  }
                  fontSize={isDaygame ? "9" : "7.5"}
                  fontWeight={isDaygame ? "700" : "500"}
                  letterSpacing="0.3"
                  className="transition-colors duration-300"
                  style={{ fontFamily: "system-ui, sans-serif" }}
                >
                  {area.name}
                </text>

                {/* Daygame moons */}
                {isDaygame &&
                  daygameMoons &&
                  daygameMoons.map((moon, i) => {
                    const moonAngle =
                      (i / daygameMoons.length) * 360 + 90
                    const moonRadius = config.planetSize + 22
                    const moonRad = (moonAngle * Math.PI) / 180
                    const moonX =
                      CENTER + Math.cos(moonRad) * moonRadius
                    const moonY =
                      CENTER -
                      config.radius +
                      Math.sin(moonRad) * moonRadius

                    return (
                      <g key={moon.id}>
                        <circle
                          cx={CENTER}
                          cy={CENTER - config.radius}
                          r={moonRadius}
                          fill="none"
                          stroke="#cd853f"
                          strokeWidth="0.4"
                          strokeOpacity="0.15"
                          strokeDasharray="1,3"
                        />
                        <circle
                          cx={moonX}
                          cy={moonY}
                          r={5}
                          fill={moon.color}
                          fillOpacity="0.8"
                        />
                        <text
                          x={moonX}
                          y={moonY + 10}
                          textAnchor="middle"
                          fill={moon.color}
                          fontSize="5"
                          fontWeight="500"
                          fillOpacity="0.7"
                          style={{
                            fontFamily: "system-ui, sans-serif",
                          }}
                        >
                          {moon.label}
                        </text>
                      </g>
                    )
                  })}

                {/* Coming Soon tooltip */}
                {comingSoonPlanet === area.id && !isDaygame && (
                  <g>
                    <rect
                      x={CENTER - 35}
                      y={
                        CENTER -
                        config.radius -
                        config.planetSize -
                        28
                      }
                      width="70"
                      height="18"
                      rx="4"
                      fill="#1a1a2e"
                      stroke="#cd853f"
                      strokeWidth="0.5"
                      strokeOpacity="0.4"
                    />
                    <text
                      x={CENTER}
                      y={
                        CENTER -
                        config.radius -
                        config.planetSize -
                        16
                      }
                      textAnchor="middle"
                      fill="#daa520"
                      fontSize="7"
                      fontWeight="500"
                      style={{
                        fontFamily: "system-ui, sans-serif",
                      }}
                    >
                      Coming Soon
                    </text>
                  </g>
                )}
              </g>
            </g>
          )
        })}

        {/* Outer decorative compass marks */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
          const rad = (angle * Math.PI) / 180
          const r1 = compact ? 280 : 340
          const r2 = compact ? 288 : 350
          const isMajor = angle % 90 === 0
          return (
            <line
              key={`outer-${angle}`}
              x1={CENTER + Math.cos(rad) * r1}
              y1={CENTER + Math.sin(rad) * r1}
              x2={CENTER + Math.cos(rad) * r2}
              y2={CENTER + Math.sin(rad) * r2}
              stroke="#cd853f"
              strokeWidth={isMajor ? 1.5 : 0.8}
              strokeOpacity={isMajor ? 0.3 : 0.15}
            />
          )
        })}
      </svg>
    </div>
  )
}
