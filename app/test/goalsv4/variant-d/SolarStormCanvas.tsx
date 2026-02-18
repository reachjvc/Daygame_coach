"use client"

import { useState, useEffect, useMemo } from "react"
import { LIFE_AREAS } from "@/src/goals/data/lifeAreas"

/**
 * SolarStormCanvas - Animated geomagnetic storm background.
 *
 * Unlike the classic green aurora, this depicts a severe solar storm (Kp7+)
 * with intense reds, oranges, magentas, and electric blues.
 * Charged particles streak across a dark sky with magnetic field distortions.
 */

const STORM_COLORS: Record<string, { primary: string; secondary: string; glow: string }> = {
  daygame: { primary: "#ff4d4d", secondary: "#ff8c1a", glow: "rgba(255, 77, 77, 0.3)" },
  health_fitness: { primary: "#ff8c1a", secondary: "#ffd700", glow: "rgba(255, 140, 26, 0.25)" },
  career_business: { primary: "#d946ef", secondary: "#ff4d4d", glow: "rgba(217, 70, 239, 0.25)" },
  social: { primary: "#3b82f6", secondary: "#8b5cf6", glow: "rgba(59, 130, 246, 0.25)" },
  personal_growth: { primary: "#f97316", secondary: "#ef4444", glow: "rgba(249, 115, 22, 0.25)" },
  lifestyle: { primary: "#ec4899", secondary: "#d946ef", glow: "rgba(236, 72, 153, 0.2)" },
  custom: { primary: "#94a3b8", secondary: "#64748b", glow: "rgba(148, 163, 184, 0.15)" },
}

function getStormColor(id: string) {
  return STORM_COLORS[id] ?? STORM_COLORS.custom
}

/** Particle streaks representing charged solar particles */
function ParticleStreaks({ count = 40 }: { count?: number }) {
  const [particles, setParticles] = useState<
    { id: number; x: number; y: number; length: number; angle: number; delay: number; duration: number; opacity: number; color: string }[]
  >([])

  useEffect(() => {
    const colors = ["#ff4d4d", "#ff8c1a", "#ffd700", "#d946ef", "#ec4899", "#3b82f6"]
    setParticles(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 80,
        length: Math.random() * 2 + 0.5,
        angle: -15 + Math.random() * 30,
        delay: Math.random() * 10,
        duration: Math.random() * 3 + 2,
        opacity: Math.random() * 0.4 + 0.05,
        color: colors[Math.floor(Math.random() * colors.length)],
      }))
    )
  }, [count])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 1 }}>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.length,
            height: p.length * 4,
            backgroundColor: p.color,
            opacity: p.opacity,
            transform: `rotate(${p.angle}deg)`,
            borderRadius: "50%",
            filter: `blur(${p.length > 1 ? 1 : 0}px)`,
            animation: `stormParticleFloat ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

/** A single storm ribbon - more intense and turbulent than regular aurora */
function StormRibbon({
  color,
  secondaryColor,
  glowColor,
  left,
  width,
  height,
  delay,
  swayAmount,
  opacity,
  blurAmount,
  zIndex,
}: {
  color: string
  secondaryColor: string
  glowColor: string
  left: number
  width: number
  height: number
  delay: number
  swayAmount: number
  opacity: number
  blurAmount: number
  zIndex: number
}) {
  return (
    <div
      className="absolute"
      style={{
        left: `${left}%`,
        top: "0%",
        width: `${width}%`,
        height: `${height}%`,
        background: `linear-gradient(180deg,
          transparent 0%,
          ${color}50 10%,
          ${secondaryColor}70 25%,
          ${color}60 45%,
          ${secondaryColor}40 65%,
          ${color}20 85%,
          transparent 100%)`,
        filter: `blur(${blurAmount}px)`,
        opacity,
        transform: `skewX(${swayAmount}deg)`,
        animation: `stormSway${zIndex} ${5 + delay * 1.5}s ease-in-out ${delay}s infinite,
                    stormPulse ${4 + delay}s ease-in-out ${delay * 0.5}s infinite`,
        zIndex,
        borderRadius: "40% 40% 0 0",
        pointerEvents: "none" as const,
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 20%, ${glowColor} 0%, transparent 70%)`,
          animation: `stormGlow ${3 + delay}s ease-in-out ${delay * 0.3}s infinite`,
        }}
      />
    </div>
  )
}

/** Horizon line with magnetic distortion effect */
function MagneticHorizon() {
  return (
    <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ zIndex: 10 }}>
      <svg
        viewBox="0 0 1200 160"
        preserveAspectRatio="none"
        className="w-full"
        style={{ height: "12%", minHeight: 48, display: "block" }}
      >
        <defs>
          <linearGradient id="storm-horizon-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1a0a14" />
            <stop offset="100%" stopColor="#0a0408" />
          </linearGradient>
        </defs>
        {/* Distant horizon */}
        <path
          d="M0,160 L0,100 L100,90 L200,95 L300,80 L400,88 L500,72 L600,85 L700,78 L800,92 L900,75 L1000,88 L1100,82 L1200,90 L1200,160 Z"
          fill="#0d0610"
        />
        {/* Closer terrain */}
        <path
          d="M0,160 L0,120 L120,110 L240,118 L360,105 L480,115 L600,100 L720,112 L840,106 L960,116 L1080,108 L1200,115 L1200,160 Z"
          fill="#0a0408"
        />
        {/* Ground */}
        <rect x="0" y="145" width="1200" height="15" fill="#080306" />
      </svg>
    </div>
  )
}

interface SolarStormCanvasProps {
  highlightAreas?: string[]
  intensity?: number
  showHorizon?: boolean
  showParticles?: boolean
  className?: string
  children?: React.ReactNode
}

export function SolarStormCanvas({
  highlightAreas,
  intensity = 1,
  showHorizon = true,
  showParticles = true,
  className = "",
  children,
}: SolarStormCanvasProps) {
  const ribbons = useMemo(() => {
    const areas = LIFE_AREAS.filter((a) => a.id !== "custom")
    const totalAreas = areas.length
    const baseWidth = 100 / totalAreas

    return areas.map((area, i) => {
      const colors = getStormColor(area.id)
      const isDaygame = area.id === "daygame"
      const isHighlighted = !highlightAreas || highlightAreas.includes(area.id)
      const areaIntensity = isHighlighted ? intensity : intensity * 0.25

      const position = isDaygame
        ? 35
        : 10 + (i / (totalAreas - 1)) * 80

      return {
        id: area.id,
        color: colors.primary,
        secondaryColor: colors.secondary,
        glowColor: colors.glow,
        left: position - (isDaygame ? 18 : baseWidth / 2),
        width: isDaygame ? 36 : baseWidth * 1.3,
        height: isDaygame ? 85 : 60 + Math.random() * 18,
        delay: i * 0.6,
        swayAmount: isDaygame ? -4 : -10 + Math.random() * 20,
        opacity: (isDaygame ? 0.6 : 0.3 + Math.random() * 0.15) * areaIntensity,
        blurAmount: isDaygame ? 20 : 25 + Math.random() * 20,
        zIndex: isDaygame ? 5 : 2 + i,
      }
    })
  }, [highlightAreas, intensity])

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: "linear-gradient(180deg, #0a0408 0%, #120610 25%, #1a0a14 50%, #0d0610 75%, #0a0408 100%)",
      }}
    >
      {/* Storm ribbons */}
      <div className="absolute inset-0" style={{ zIndex: 2 }}>
        {ribbons.map((ribbon) => (
          <StormRibbon key={ribbon.id} {...ribbon} />
        ))}

        {/* Magnetic field distortion layers */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 40% 20%, rgba(255, 77, 77, 0.1) 0%, transparent 50%),
                         radial-gradient(ellipse at 60% 30%, rgba(255, 140, 26, 0.08) 0%, transparent 50%),
                         radial-gradient(ellipse at 30% 40%, rgba(217, 70, 239, 0.06) 0%, transparent 50%)`,
            animation: "stormFieldShift 15s ease-in-out infinite",
            zIndex: 1,
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Particle streaks */}
      {showParticles && <ParticleStreaks />}

      {/* Magnetic horizon */}
      {showHorizon && <MagneticHorizon />}

      {/* Content layer */}
      <div className="relative" style={{ zIndex: 20 }}>
        {children}
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes stormParticleFloat {
          0%, 100% { opacity: 0.05; transform: translateY(0) rotate(var(--angle, 0deg)); }
          30% { opacity: var(--peak-opacity, 0.3); }
          50% { transform: translateY(-8px) rotate(var(--angle, 0deg)); opacity: 0.05; }
        }

        @keyframes stormSway2 {
          0%, 100% { transform: skewX(-6deg) translateX(0px); }
          25% { transform: skewX(-2deg) translateX(10px); }
          50% { transform: skewX(5deg) translateX(-8px); }
          75% { transform: skewX(-3deg) translateX(14px); }
        }

        @keyframes stormSway3 {
          0%, 100% { transform: skewX(4deg) translateX(0px); }
          33% { transform: skewX(-5deg) translateX(-12px); }
          66% { transform: skewX(6deg) translateX(8px); }
        }

        @keyframes stormSway4 {
          0%, 100% { transform: skewX(-3deg) translateX(6px); }
          50% { transform: skewX(5deg) translateX(-10px); }
        }

        @keyframes stormSway5 {
          0%, 100% { transform: skewX(-4deg) translateX(0); }
          20% { transform: skewX(3deg) translateX(12px); }
          40% { transform: skewX(-6deg) translateX(-8px); }
          60% { transform: skewX(2deg) translateX(16px); }
          80% { transform: skewX(-5deg) translateX(-4px); }
        }

        @keyframes stormSway6 {
          0%, 100% { transform: skewX(3deg) translateX(-4px); }
          30% { transform: skewX(-4deg) translateX(9px); }
          70% { transform: skewX(5deg) translateX(-11px); }
        }

        @keyframes stormSway7 {
          0%, 100% { transform: skewX(-2deg) translateX(5px); }
          40% { transform: skewX(4deg) translateX(-9px); }
          80% { transform: skewX(-3deg) translateX(13px); }
        }

        @keyframes stormPulse {
          0%, 100% { opacity: var(--storm-base-opacity, 0.35); }
          50% { opacity: calc(var(--storm-base-opacity, 0.35) * 1.6); }
        }

        @keyframes stormGlow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        @keyframes stormFieldShift {
          0%, 100% {
            background-position: 0% 0%;
            transform: scale(1);
          }
          25% {
            background-position: 6% -4%;
            transform: scale(1.03);
          }
          50% {
            background-position: -4% 6%;
            transform: scale(0.97);
          }
          75% {
            background-position: 4% 3%;
            transform: scale(1.02);
          }
        }
      `}</style>
    </div>
  )
}
