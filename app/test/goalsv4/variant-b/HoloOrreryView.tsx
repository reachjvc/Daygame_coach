"use client"

import { useState, useEffect, useMemo } from "react"
import { LIFE_AREAS } from "@/src/goals/data/lifeAreas"
import type { LifeAreaConfig } from "@/src/goals/types"

interface HoloOrreryViewProps {
  activePlanetId: string | null
  onPlanetClick: (area: LifeAreaConfig) => void
  daygameMoons?: { label: string; id: string }[]
}

const ORBIT_CONFIG: Record<string, { radius: number; duration: number; startAngle: number; planetSize: number }> = {
  daygame:         { radius: 100, duration: 50, startAngle: 0,   planetSize: 18 },
  health_fitness:  { radius: 150, duration: 65, startAngle: 45,  planetSize: 14 },
  career_business: { radius: 195, duration: 85, startAngle: 120, planetSize: 14 },
  social:          { radius: 235, duration: 105, startAngle: 200, planetSize: 13 },
  personal_growth: { radius: 270, duration: 125, startAngle: 300, planetSize: 13 },
  lifestyle:       { radius: 300, duration: 145, startAngle: 160, planetSize: 12 },
  custom:          { radius: 330, duration: 165, startAngle: 60,  planetSize: 10 },
}

const CENTER = 370
const SUN_RADIUS = 35
const CYAN = "#00f0ff"
const CYAN_DIM = "rgba(0, 240, 255, 0.15)"

export function HoloOrreryView({ activePlanetId, onPlanetClick, daygameMoons }: HoloOrreryViewProps) {
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null)
  const [comingSoonPlanet, setComingSoonPlanet] = useState<string | null>(null)

  useEffect(() => {
    if (!comingSoonPlanet) return
    const timer = setTimeout(() => setComingSoonPlanet(null), 2000)
    return () => clearTimeout(timer)
  }, [comingSoonPlanet])

  const visibleAreas = useMemo(() => LIFE_AREAS.filter((a) => a.id !== "custom"), [])

  return (
    <div className="relative w-full max-w-[740px] mx-auto" style={{ aspectRatio: "1/1" }}>
      <style>{`
        @keyframes holoSunPulse {
          0%, 100% { filter: drop-shadow(0 0 20px rgba(0, 240, 255, 0.5)) drop-shadow(0 0 40px rgba(0, 240, 255, 0.2)); }
          50% { filter: drop-shadow(0 0 35px rgba(0, 240, 255, 0.7)) drop-shadow(0 0 60px rgba(0, 240, 255, 0.4)); }
        }
        @keyframes holoDataScan {
          0% { stroke-dashoffset: 100; }
          100% { stroke-dashoffset: 0; }
        }
        ${visibleAreas.map((area) => {
          const config = ORBIT_CONFIG[area.id]
          if (!config) return ""
          return `
            @keyframes holo-orbit-${area.id} {
              from { transform: rotate(${config.startAngle}deg); }
              to { transform: rotate(${config.startAngle + 360}deg); }
            }
            @keyframes holo-counter-${area.id} {
              from { transform: rotate(-${config.startAngle}deg); }
              to { transform: rotate(-${config.startAngle + 360}deg); }
            }
          `
        }).join("\n")}
      `}</style>

      <svg viewBox={`0 0 ${CENTER * 2} ${CENTER * 2}`} className="w-full h-full" style={{ overflow: "visible" }}>
        <defs>
          {/* Holographic sun gradient */}
          <radialGradient id="holo-sun-gradient" cx="40%" cy="40%">
            <stop offset="0%" stopColor="#e0ffff" />
            <stop offset="30%" stopColor={CYAN} />
            <stop offset="60%" stopColor="#0088aa" />
            <stop offset="100%" stopColor="#004466" />
          </radialGradient>

          <radialGradient id="holo-sun-glow">
            <stop offset="0%" stopColor={CYAN} stopOpacity="0.3" />
            <stop offset="50%" stopColor={CYAN} stopOpacity="0.08" />
            <stop offset="100%" stopColor={CYAN} stopOpacity="0" />
          </radialGradient>

          <filter id="holo-planet-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
            <feFlood floodColor={CYAN} floodOpacity="0.5" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="holo-active-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="blur" />
            <feFlood floodColor={CYAN} floodOpacity="0.7" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Projection grid circles */}
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <circle
            key={`grid-${t}`}
            cx={CENTER}
            cy={CENTER}
            r={340 * t}
            fill="none"
            stroke={CYAN}
            strokeWidth="0.3"
            strokeOpacity="0.04"
            strokeDasharray="4,8"
          />
        ))}

        {/* Cross-hair lines */}
        {[0, 45, 90, 135].map((angle) => {
          const rad = (angle * Math.PI) / 180
          return (
            <line
              key={`cross-${angle}`}
              x1={CENTER + Math.cos(rad) * 30}
              y1={CENTER + Math.sin(rad) * 30}
              x2={CENTER + Math.cos(rad) * 355}
              y2={CENTER + Math.sin(rad) * 355}
              stroke={CYAN}
              strokeWidth="0.3"
              strokeOpacity="0.04"
            />
          )
        })}
        {[0, 45, 90, 135].map((angle) => {
          const rad = ((angle + 180) * Math.PI) / 180
          return (
            <line
              key={`cross2-${angle}`}
              x1={CENTER + Math.cos(rad) * 30}
              y1={CENTER + Math.sin(rad) * 30}
              x2={CENTER + Math.cos(rad) * 355}
              y2={CENTER + Math.sin(rad) * 355}
              stroke={CYAN}
              strokeWidth="0.3"
              strokeOpacity="0.04"
            />
          )
        })}

        {/* Orbit rings — wireframe style */}
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
                stroke={CYAN}
                strokeWidth={isHovered || isActive ? 1 : 0.5}
                strokeOpacity={isHovered || isActive ? 0.25 : 0.08}
                strokeDasharray={area.id === "daygame" ? "none" : "3,6"}
                className="transition-all duration-300"
              />
              {/* Data tick marks */}
              {Array.from({ length: 24 }, (_, i) => {
                const angle = (i / 24) * 360
                const rad = (angle * Math.PI) / 180
                const innerR = config.radius - 2
                const outerR = config.radius + 2
                return (
                  <line
                    key={`htick-${area.id}-${i}`}
                    x1={CENTER + Math.cos(rad) * innerR}
                    y1={CENTER + Math.sin(rad) * innerR}
                    x2={CENTER + Math.cos(rad) * outerR}
                    y2={CENTER + Math.sin(rad) * outerR}
                    stroke={CYAN}
                    strokeWidth={i % 6 === 0 ? 0.6 : 0.2}
                    strokeOpacity={i % 6 === 0 ? 0.15 : 0.06}
                  />
                )
              })}
            </g>
          )
        })}

        {/* Sun glow */}
        <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS * 2.5} fill="url(#holo-sun-glow)" />

        {/* Sun — wireframe hexagonal core */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={SUN_RADIUS}
          fill="none"
          stroke={CYAN}
          strokeWidth="1.5"
          strokeOpacity="0.6"
          style={{ animation: "holoSunPulse 4s ease-in-out infinite" }}
        />
        <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS * 0.7} fill="none" stroke={CYAN} strokeWidth="0.5" strokeOpacity="0.25" />
        <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS * 0.35} fill={CYAN} fillOpacity="0.15" />

        {/* Inner hexagonal wireframe on sun */}
        {(() => {
          const hexR = SUN_RADIUS * 0.85
          const pts = Array.from({ length: 6 }, (_, i) => {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 2
            return `${CENTER + Math.cos(a) * hexR},${CENTER + Math.sin(a) * hexR}`
          })
          return (
            <polygon
              points={pts.join(" ")}
              fill="none"
              stroke={CYAN}
              strokeWidth="0.6"
              strokeOpacity="0.2"
            />
          )
        })()}

        <text
          x={CENTER}
          y={CENTER + 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={CYAN}
          fontSize="7.5"
          fontWeight="700"
          letterSpacing="2"
          style={{ fontFamily: "var(--font-mono, 'Geist Mono', monospace)" }}
        >
          NEXUS
        </text>

        {/* Planets on orbits */}
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
                animation: `holo-orbit-${area.id} ${config.duration}s linear infinite`,
              }}
            >
              <g
                style={{
                  transformOrigin: `${CENTER}px ${CENTER - config.radius}px`,
                  animation: `holo-counter-${area.id} ${config.duration}s linear infinite`,
                }}
              >
                {/* Hit area */}
                <circle
                  cx={CENTER}
                  cy={CENTER - config.radius}
                  r={config.planetSize + 8}
                  fill="transparent"
                  className="cursor-pointer"
                  data-testid={`holo-planet-${area.id}`}
                  onClick={() => {
                    if (!isDaygame) setComingSoonPlanet(area.id)
                    onPlanetClick(area)
                  }}
                  onMouseEnter={() => setHoveredPlanet(area.id)}
                  onMouseLeave={() => setHoveredPlanet(null)}
                />

                {/* Wireframe planet ring */}
                <circle
                  cx={CENTER}
                  cy={CENTER - config.radius}
                  r={config.planetSize + 3}
                  fill="none"
                  stroke={isDaygame ? CYAN : area.hex}
                  strokeWidth={isDaygame ? 1 : 0.5}
                  strokeOpacity={isHovered || isActive ? 0.6 : 0.2}
                  strokeDasharray={isDaygame ? "none" : "2,3"}
                  className="transition-all duration-300"
                />

                {/* Planet body — wireframe with fill */}
                <circle
                  cx={CENTER}
                  cy={CENTER - config.radius}
                  r={config.planetSize}
                  fill={isDaygame ? CYAN : area.hex}
                  fillOpacity={isDaygame || isActive ? 0.15 : 0.08}
                  stroke={isDaygame ? CYAN : area.hex}
                  strokeWidth={isDaygame ? 1.5 : 0.8}
                  strokeOpacity={isHovered || isActive ? 0.8 : isDaygame ? 0.6 : 0.3}
                  filter={isActive || isHovered ? "url(#holo-active-glow)" : isDaygame ? "url(#holo-planet-glow)" : undefined}
                  className="transition-all duration-300"
                />

                {/* Inner wireframe detail */}
                <circle
                  cx={CENTER}
                  cy={CENTER - config.radius}
                  r={config.planetSize * 0.5}
                  fill="none"
                  stroke={isDaygame ? CYAN : area.hex}
                  strokeWidth="0.4"
                  strokeOpacity="0.2"
                  strokeDasharray="1,2"
                />

                {/* Planet label */}
                <text
                  x={CENTER}
                  y={CENTER - config.radius + config.planetSize + 14}
                  textAnchor="middle"
                  fill={isHovered || isActive ? CYAN : "rgba(255,255,255,0.5)"}
                  fontSize={isDaygame ? "8" : "7"}
                  fontWeight={isDaygame ? "700" : "500"}
                  letterSpacing="1"
                  className="transition-colors duration-300"
                  style={{ fontFamily: "var(--font-mono, 'Geist Mono', monospace)", textTransform: "uppercase" as const }}
                >
                  {area.name}
                </text>

                {/* Daygame moons */}
                {isDaygame && daygameMoons && daygameMoons.map((moon, idx) => {
                  const moonAngle = (idx / daygameMoons.length) * 360 + 90
                  const moonRadius = config.planetSize + 22
                  const moonRad = (moonAngle * Math.PI) / 180
                  const moonX = CENTER + Math.cos(moonRad) * moonRadius
                  const moonY = (CENTER - config.radius) + Math.sin(moonRad) * moonRadius

                  return (
                    <g key={moon.id}>
                      <circle
                        cx={CENTER}
                        cy={CENTER - config.radius}
                        r={moonRadius}
                        fill="none"
                        stroke={CYAN}
                        strokeWidth="0.3"
                        strokeOpacity="0.12"
                        strokeDasharray="1,4"
                      />
                      <circle
                        cx={moonX}
                        cy={moonY}
                        r={5}
                        fill={idx === 0 ? "#ec4899" : "#f97316"}
                        fillOpacity="0.2"
                        stroke={idx === 0 ? "#ec4899" : "#f97316"}
                        strokeWidth="0.8"
                        strokeOpacity="0.6"
                      />
                      <text
                        x={moonX}
                        y={moonY + 10}
                        textAnchor="middle"
                        fill={idx === 0 ? "#ec4899" : "#f97316"}
                        fontSize="4.5"
                        fontWeight="600"
                        fillOpacity="0.7"
                        style={{ fontFamily: "var(--font-mono, 'Geist Mono', monospace)" }}
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
                      x={CENTER - 40}
                      y={CENTER - config.radius - config.planetSize - 28}
                      width="80"
                      height="18"
                      rx="2"
                      fill="rgba(0, 15, 25, 0.9)"
                      stroke={CYAN}
                      strokeWidth="0.5"
                      strokeOpacity="0.4"
                    />
                    <text
                      x={CENTER}
                      y={CENTER - config.radius - config.planetSize - 16}
                      textAnchor="middle"
                      fill={CYAN}
                      fontSize="7"
                      fontWeight="600"
                      letterSpacing="1"
                      style={{ fontFamily: "var(--font-mono, 'Geist Mono', monospace)" }}
                    >
                      LOCKED
                    </text>
                  </g>
                )}
              </g>
            </g>
          )
        })}

        {/* Outer data ring markers */}
        {Array.from({ length: 36 }, (_, i) => {
          const angle = (i / 36) * Math.PI * 2
          const r1 = 350
          const r2 = 358
          const isMajor = i % 9 === 0
          return (
            <line
              key={`outer-${i}`}
              x1={CENTER + Math.cos(angle) * r1}
              y1={CENTER + Math.sin(angle) * r1}
              x2={CENTER + Math.cos(angle) * r2}
              y2={CENTER + Math.sin(angle) * r2}
              stroke={CYAN}
              strokeWidth={isMajor ? 1 : 0.4}
              strokeOpacity={isMajor ? 0.2 : 0.08}
            />
          )
        })}
      </svg>
    </div>
  )
}
