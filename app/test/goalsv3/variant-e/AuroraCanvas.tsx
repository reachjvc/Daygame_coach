"use client"

import { useState, useEffect, useMemo } from "react"
import { LIFE_AREAS } from "@/src/goals/data/lifeAreas"

/**
 * AuroraCanvas - Animated northern lights background with flowing ribbons.
 *
 * Each life area gets its own aurora band. Daygame is the widest/most vivid.
 * Bands sway, pulse, and shift using CSS @keyframes.
 * A mountain silhouette grounds the scene at the bottom.
 * Tiny stars twinkle between bands.
 */

// Aurora-mapped colors for each life area (remapped to aurora-natural palette)
const AURORA_COLORS: Record<string, { primary: string; secondary: string; glow: string }> = {
  daygame: { primary: "#4ade80", secondary: "#22d3ee", glow: "rgba(74, 222, 128, 0.3)" },
  health_fitness: { primary: "#22d3ee", secondary: "#60a5fa", glow: "rgba(34, 211, 238, 0.25)" },
  career_business: { primary: "#a78bfa", secondary: "#e879f9", glow: "rgba(167, 139, 250, 0.25)" },
  social: { primary: "#60a5fa", secondary: "#818cf8", glow: "rgba(96, 165, 250, 0.25)" },
  personal_growth: { primary: "#e879f9", secondary: "#f472b6", glow: "rgba(232, 121, 249, 0.25)" },
  lifestyle: { primary: "#22d3ee", secondary: "#4ade80", glow: "rgba(34, 211, 238, 0.2)" },
  custom: { primary: "#94a3b8", secondary: "#64748b", glow: "rgba(148, 163, 184, 0.15)" },
}

function getAuroraColor(id: string) {
  return AURORA_COLORS[id] ?? AURORA_COLORS.custom
}

/** Sky stars that twinkle between aurora bands */
function SkyStars({ count = 80 }: { count?: number }) {
  const [stars, setStars] = useState<
    { id: number; x: number; y: number; size: number; delay: number; duration: number; opacity: number }[]
  >([])

  useEffect(() => {
    setStars(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 75, // keep stars in upper 75% (above mountains)
        size: Math.random() * 1.8 + 0.4,
        delay: Math.random() * 8,
        duration: Math.random() * 4 + 2,
        opacity: Math.random() * 0.6 + 0.1,
      }))
    )
  }, [count])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 1 }}>
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            backgroundColor: "white",
            opacity: star.opacity,
            animation: `auroraTwinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

/** A single flowing aurora ribbon band */
function AuroraRibbon({
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
        top: "2%",
        width: `${width}%`,
        height: `${height}%`,
        background: `linear-gradient(180deg,
          transparent 0%,
          ${color}40 15%,
          ${secondaryColor}60 35%,
          ${color}50 55%,
          ${secondaryColor}30 75%,
          transparent 100%)`,
        filter: `blur(${blurAmount}px)`,
        opacity,
        transform: `skewX(${swayAmount}deg)`,
        animation: `auroraSway${zIndex} ${8 + delay * 2}s ease-in-out ${delay}s infinite,
                    auroraPulse ${6 + delay}s ease-in-out ${delay * 0.5}s infinite`,
        zIndex,
        borderRadius: "50% 50% 0 0",
        pointerEvents: "none" as const,
      }}
    >
      {/* Inner glow layer */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, ${glowColor} 0%, transparent 70%)`,
          animation: `auroraGlow ${5 + delay}s ease-in-out ${delay * 0.3}s infinite`,
        }}
      />
    </div>
  )
}

/** Dark mountain silhouette SVG at the bottom */
function MountainSilhouette() {
  return (
    <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ zIndex: 10 }}>
      <svg
        viewBox="0 0 1200 200"
        preserveAspectRatio="none"
        className="w-full"
        style={{ height: "15%", minHeight: 60, display: "block" }}
      >
        <defs>
          {/* Tree texture using small triangle shapes */}
          <linearGradient id="mountainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0a1520" />
            <stop offset="100%" stopColor="#020815" />
          </linearGradient>
        </defs>
        {/* Background mountain range */}
        <path
          d="M0,200 L0,140 L60,110 L120,130 L180,90 L240,120 L300,80 L360,100 L420,65 L480,95 L540,70 L600,55 L660,75 L720,60 L780,85 L840,50 L900,80 L960,95 L1020,75 L1080,100 L1140,90 L1200,120 L1200,200 Z"
          fill="#060d17"
        />
        {/* Foreground mountain range (closer, darker) */}
        <path
          d="M0,200 L0,160 L80,140 L160,155 L240,130 L320,150 L400,120 L480,145 L560,125 L640,140 L720,110 L800,135 L880,120 L960,145 L1040,130 L1120,150 L1200,140 L1200,200 Z"
          fill="#040b14"
        />
        {/* Tree line (small triangles at the ridge) */}
        <path
          d="M0,200 L0,170 L40,162 L50,155 L60,162 L80,158 L90,150 L100,158 L120,160 L140,152 L150,146 L160,152 L180,155 L200,148 L210,142 L220,148 L240,150 L270,145 L280,138 L290,145 L320,150 L350,143 L360,137 L370,143 L400,148 L430,140 L440,134 L450,140 L480,145 L500,140 L510,133 L520,140 L540,142 L560,135 L570,128 L580,135 L600,138 L630,132 L640,126 L650,132 L680,137 L710,130 L720,124 L730,130 L760,136 L790,128 L800,122 L810,128 L840,133 L860,127 L870,120 L880,127 L900,130 L930,125 L940,118 L950,125 L980,130 L1010,124 L1020,118 L1030,124 L1060,128 L1090,122 L1100,116 L1110,122 L1140,126 L1170,120 L1180,114 L1190,120 L1200,124 L1200,200 Z"
          fill="#030a12"
        />
        {/* Ground plane */}
        <rect x="0" y="180" width="1200" height="20" fill="#020815" />
      </svg>
    </div>
  )
}

interface AuroraCanvasProps {
  /** Which life areas to highlight (all shown by default) */
  highlightAreas?: string[]
  /** Intensity multiplier 0-1 */
  intensity?: number
  /** Show mountain silhouette */
  showMountains?: boolean
  /** Show sky stars */
  showStars?: boolean
  /** Height class override */
  className?: string
  children?: React.ReactNode
}

export function AuroraCanvas({
  highlightAreas,
  intensity = 1,
  showMountains = true,
  showStars = true,
  className = "",
  children,
}: AuroraCanvasProps) {
  // Generate ribbon configurations for each life area
  const ribbons = useMemo(() => {
    const areas = LIFE_AREAS.filter((a) => a.id !== "custom")
    const totalAreas = areas.length
    const baseWidth = 100 / totalAreas

    return areas.map((area, i) => {
      const colors = getAuroraColor(area.id)
      const isDaygame = area.id === "daygame"
      const isHighlighted = !highlightAreas || highlightAreas.includes(area.id)
      const areaIntensity = isHighlighted ? intensity : intensity * 0.3

      // Daygame gets center position and wider band
      const position = isDaygame
        ? 35
        : 10 + (i / (totalAreas - 1)) * 80

      return {
        id: area.id,
        color: colors.primary,
        secondaryColor: colors.secondary,
        glowColor: colors.glow,
        left: position - (isDaygame ? 15 : baseWidth / 2),
        width: isDaygame ? 30 : baseWidth * 1.2,
        height: isDaygame ? 75 : 55 + Math.random() * 15,
        delay: i * 0.7,
        swayAmount: isDaygame ? -3 : -8 + Math.random() * 16,
        opacity: (isDaygame ? 0.55 : 0.25 + Math.random() * 0.15) * areaIntensity,
        blurAmount: isDaygame ? 25 : 30 + Math.random() * 20,
        zIndex: isDaygame ? 5 : 2 + i,
      }
    })
  }, [highlightAreas, intensity])

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: "linear-gradient(180deg, #020815 0%, #030a18 30%, #041020 60%, #020815 100%)",
      }}
    >
      {/* Aurora ribbons */}
      <div className="absolute inset-0" style={{ zIndex: 2 }}>
        {ribbons.map((ribbon) => (
          <AuroraRibbon key={ribbon.id} {...ribbon} />
        ))}

        {/* Extra diffuse glow layers for depth */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 40% 25%, rgba(74, 222, 128, 0.08) 0%, transparent 50%),
                         radial-gradient(ellipse at 60% 35%, rgba(34, 211, 238, 0.06) 0%, transparent 50%),
                         radial-gradient(ellipse at 30% 45%, rgba(232, 121, 249, 0.04) 0%, transparent 50%)`,
            animation: "auroraShift 20s ease-in-out infinite",
            zIndex: 1,
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Stars */}
      {showStars && <SkyStars />}

      {/* Mountain silhouette */}
      {showMountains && <MountainSilhouette />}

      {/* Content layer */}
      <div className="relative" style={{ zIndex: 20 }}>
        {children}
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes auroraTwinkle {
          0%, 100% { opacity: 0.1; transform: scale(0.8); }
          50% { opacity: 0.8; transform: scale(1.3); }
        }

        @keyframes auroraSway2 {
          0%, 100% { transform: skewX(-5deg) translateX(0px); }
          25% { transform: skewX(-2deg) translateX(8px); }
          50% { transform: skewX(3deg) translateX(-5px); }
          75% { transform: skewX(-1deg) translateX(12px); }
        }

        @keyframes auroraSway3 {
          0%, 100% { transform: skewX(3deg) translateX(0px); }
          33% { transform: skewX(-4deg) translateX(-10px); }
          66% { transform: skewX(5deg) translateX(6px); }
        }

        @keyframes auroraSway4 {
          0%, 100% { transform: skewX(-2deg) translateX(5px); }
          50% { transform: skewX(4deg) translateX(-8px); }
        }

        @keyframes auroraSway5 {
          0%, 100% { transform: skewX(-3deg) translateX(0); }
          20% { transform: skewX(2deg) translateX(10px); }
          40% { transform: skewX(-5deg) translateX(-6px); }
          60% { transform: skewX(1deg) translateX(14px); }
          80% { transform: skewX(-4deg) translateX(-3px); }
        }

        @keyframes auroraSway6 {
          0%, 100% { transform: skewX(2deg) translateX(-3px); }
          30% { transform: skewX(-3deg) translateX(7px); }
          70% { transform: skewX(4deg) translateX(-9px); }
        }

        @keyframes auroraSway7 {
          0%, 100% { transform: skewX(-1deg) translateX(4px); }
          40% { transform: skewX(3deg) translateX(-7px); }
          80% { transform: skewX(-2deg) translateX(11px); }
        }

        @keyframes auroraPulse {
          0%, 100% { opacity: var(--aurora-base-opacity, 0.3); }
          50% { opacity: calc(var(--aurora-base-opacity, 0.3) * 1.4); }
        }

        @keyframes auroraGlow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }

        @keyframes auroraShift {
          0%, 100% {
            background-position: 0% 0%;
            transform: scale(1);
          }
          25% {
            background-position: 5% -3%;
            transform: scale(1.02);
          }
          50% {
            background-position: -3% 5%;
            transform: scale(0.98);
          }
          75% {
            background-position: 3% 2%;
            transform: scale(1.01);
          }
        }
      `}</style>
    </div>
  )
}
