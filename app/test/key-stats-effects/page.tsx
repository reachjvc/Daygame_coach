"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { ArrowLeft, ChevronDown, Brain } from "lucide-react"
import { Button } from "@/components/ui/button"

// ============================================================================
// EFFECT 1: Constellation Sparkles (Current Production)
// Static dots distributed around corners, subtle glow on expand
// ============================================================================
function ConstellationEffect({
  width,
  height,
  isExpanded,
}: {
  width: number
  height: number
  isExpanded: boolean
}) {
  if (!isExpanded) return null

  return (
    <g className="animate-in fade-in duration-500">
      {/* Top-right cluster */}
      <circle cx={width - 25} cy={20} r="3" className="fill-primary" filter="url(#glow)" />
      <circle cx={width - 45} cy={12} r="2" className="fill-accent/70" />
      <circle cx={width - 15} cy={35} r="1.5" className="fill-primary/50" />

      {/* Top-left accent */}
      <circle cx={30} cy={25} r="2.5" className="fill-accent" filter="url(#glow)" />
      <circle cx={18} cy={40} r="1.5" className="fill-primary/60" />

      {/* Bottom-left cluster */}
      <circle cx={20} cy={height - 30} r="2" className="fill-primary/70" />
      <circle cx={35} cy={height - 18} r="2.5" className="fill-accent" filter="url(#glow)" />
      <circle cx={50} cy={height - 35} r="1.5" className="fill-primary/40" />

      {/* Bottom-right sparkle */}
      <circle cx={width - 35} cy={height - 25} r="2" className="fill-primary" filter="url(#glow)" />
      <circle cx={width - 20} cy={height - 40} r="1.5" className="fill-accent/60" />

      {/* Pulsing border */}
      <rect
        x="2"
        y="2"
        width={width - 4}
        height={height - 4}
        rx="14"
        ry="14"
        fill="none"
        className="stroke-primary/30 animate-pulse"
        strokeWidth="1"
      />
    </g>
  )
}

// ============================================================================
// EFFECT 2: Particle Burst
// Particles explode outward from center, then orbit the border
// ============================================================================
function ParticleBurstEffect({
  width,
  height,
  isExpanded,
}: {
  width: number
  height: number
  isExpanded: boolean
}) {
  const [particles, setParticles] = useState<{ x: number; y: number; size: number; delay: number }[]>([])

  useEffect(() => {
    if (isExpanded) {
      // Generate 12 particles in a circle
      const newParticles = Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2
        const distance = Math.min(width, height) * 0.4
        return {
          x: width / 2 + Math.cos(angle) * distance,
          y: height / 2 + Math.sin(angle) * distance,
          size: 2 + Math.random() * 2,
          delay: i * 0.05,
        }
      })
      setParticles(newParticles)
    } else {
      setParticles([])
    }
  }, [isExpanded, width, height])

  if (!isExpanded) return null

  return (
    <g>
      {/* Central glow that fades */}
      <circle
        cx={width / 2}
        cy={height / 2}
        r="40"
        className="fill-primary/20 animate-ping"
        style={{ animationDuration: "1s", animationIterationCount: 1 }}
      />

      {/* Particles bursting outward */}
      {particles.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={p.size}
          className="fill-primary"
          filter="url(#glow)"
          style={{
            animation: `particleBurst 0.6s ease-out ${p.delay}s both`,
            transformOrigin: `${width / 2}px ${height / 2}px`,
          }}
        />
      ))}

      {/* Orbiting ring */}
      <circle
        cx={width / 2}
        cy={height / 2}
        r={Math.min(width, height) * 0.35}
        fill="none"
        className="stroke-primary/20"
        strokeWidth="1"
        strokeDasharray="4 8"
        style={{ animation: "spin 8s linear infinite" }}
      />

      <style>{`
        @keyframes particleBurst {
          0% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1.5); }
          100% { opacity: 0.8; transform: scale(1); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </g>
  )
}

// ============================================================================
// EFFECT 3: Ripple Waves
// Concentric rings pulsing outward from center
// ============================================================================
function RippleWavesEffect({
  width,
  height,
  isExpanded,
}: {
  width: number
  height: number
  isExpanded: boolean
}) {
  if (!isExpanded) return null

  const centerX = width / 2
  const centerY = height / 2
  const maxRadius = Math.max(width, height) * 0.6

  return (
    <g className="animate-in fade-in duration-300">
      {/* Multiple ripple rings with staggered delays */}
      {[0, 1, 2, 3].map((i) => (
        <circle
          key={i}
          cx={centerX}
          cy={centerY}
          r={maxRadius * 0.3}
          fill="none"
          className="stroke-primary"
          strokeWidth="2"
          style={{
            animation: `ripple 2s ease-out ${i * 0.4}s infinite`,
            transformOrigin: `${centerX}px ${centerY}px`,
          }}
        />
      ))}

      {/* Static center glow */}
      <circle
        cx={centerX}
        cy={centerY}
        r="8"
        className="fill-primary"
        filter="url(#glow)"
      />

      {/* Corner accents that pulse with ripples */}
      <circle cx={20} cy={20} r="3" className="fill-accent animate-pulse" />
      <circle cx={width - 20} cy={20} r="3" className="fill-accent animate-pulse" style={{ animationDelay: "0.5s" }} />
      <circle cx={20} cy={height - 20} r="3" className="fill-accent animate-pulse" style={{ animationDelay: "1s" }} />
      <circle cx={width - 20} cy={height - 20} r="3" className="fill-accent animate-pulse" style={{ animationDelay: "1.5s" }} />

      <style>{`
        @keyframes ripple {
          0% {
            r: ${maxRadius * 0.1};
            opacity: 0.8;
            stroke-width: 3px;
          }
          100% {
            r: ${maxRadius};
            opacity: 0;
            stroke-width: 0.5px;
          }
        }
      `}</style>
    </g>
  )
}

// ============================================================================
// EFFECT 4: Aurora Flow
// Animated gradient flowing along the border like northern lights
// ============================================================================
function AuroraFlowEffect({
  width,
  height,
  isExpanded,
}: {
  width: number
  height: number
  isExpanded: boolean
}) {
  if (!isExpanded) return null

  const perimeter = 2 * (width + height)

  return (
    <g className="animate-in fade-in duration-300">
      <defs>
        {/* Animated gradient for aurora effect */}
        <linearGradient id="auroraGradient" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0">
            <animate attributeName="offset" values="0;1;0" dur="3s" repeatCount="indefinite" />
          </stop>
          <stop offset="20%" stopColor="hsl(var(--primary))" stopOpacity="0.8">
            <animate attributeName="offset" values="0.2;1.2;0.2" dur="3s" repeatCount="indefinite" />
          </stop>
          <stop offset="40%" stopColor="hsl(var(--accent))" stopOpacity="1">
            <animate attributeName="offset" values="0.4;1.4;0.4" dur="3s" repeatCount="indefinite" />
          </stop>
          <stop offset="60%" stopColor="hsl(var(--primary))" stopOpacity="0.8">
            <animate attributeName="offset" values="0.6;1.6;0.6" dur="3s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0">
            <animate attributeName="offset" values="1;2;1" dur="3s" repeatCount="indefinite" />
          </stop>
        </linearGradient>
      </defs>

      {/* Main aurora border */}
      <rect
        x="2"
        y="2"
        width={width - 4}
        height={height - 4}
        rx="14"
        ry="14"
        fill="none"
        stroke="url(#auroraGradient)"
        strokeWidth="3"
        strokeDasharray={`${perimeter * 0.3} ${perimeter * 0.7}`}
        style={{
          animation: "auroraDash 4s linear infinite",
        }}
      />

      {/* Secondary aurora layer (offset) */}
      <rect
        x="2"
        y="2"
        width={width - 4}
        height={height - 4}
        rx="14"
        ry="14"
        fill="none"
        stroke="url(#auroraGradient)"
        strokeWidth="2"
        strokeDasharray={`${perimeter * 0.2} ${perimeter * 0.8}`}
        strokeOpacity="0.5"
        style={{
          animation: "auroraDash 4s linear infinite reverse",
          animationDelay: "-2s",
        }}
      />

      {/* Glow spots along border */}
      <circle cx={width / 2} cy={4} r="4" className="fill-primary/60" filter="url(#glow)">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx={4} cy={height / 2} r="4" className="fill-accent/60" filter="url(#glow)">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" begin="0.5s" />
      </circle>
      <circle cx={width / 2} cy={height - 4} r="4" className="fill-primary/60" filter="url(#glow)">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" begin="1s" />
      </circle>
      <circle cx={width - 4} cy={height / 2} r="4" className="fill-accent/60" filter="url(#glow)">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" begin="1.5s" />
      </circle>

      <style>{`
        @keyframes auroraDash {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: ${perimeter}; }
        }
      `}</style>
    </g>
  )
}

// ============================================================================
// EFFECT 5: Firefly Dance
// Multiple small dots moving in different directions at varied speeds
// ============================================================================
function FireflyDanceEffect({
  width,
  height,
  isExpanded,
}: {
  width: number
  height: number
  isExpanded: boolean
}) {
  if (!isExpanded) return null

  // Define firefly paths with different speeds and directions
  const fireflies = [
    { duration: 4, direction: 1, offset: 0, size: 3, opacity: 1 },
    { duration: 6, direction: -1, offset: 0.3, size: 2.5, opacity: 0.8 },
    { duration: 5, direction: 1, offset: 0.6, size: 2, opacity: 0.9 },
    { duration: 7, direction: -1, offset: 0.15, size: 3.5, opacity: 0.7 },
    { duration: 4.5, direction: 1, offset: 0.8, size: 2, opacity: 0.85 },
    { duration: 5.5, direction: -1, offset: 0.45, size: 2.5, opacity: 0.75 },
  ]

  // Create path along border
  const pathD = `
    M ${width / 2} ${height - 2}
    L 2 ${height - 2}
    L 2 2
    L ${width - 2} 2
    L ${width - 2} ${height - 2}
    L ${width / 2} ${height - 2}
  `

  return (
    <g className="animate-in fade-in duration-500">
      <defs>
        <path id="fireflyPath" d={pathD} fill="none" />
      </defs>

      {/* Fireflies moving along the path */}
      {fireflies.map((f, i) => (
        <g key={i}>
          {/* Glow trail */}
          <circle r={f.size * 2} className="fill-primary/20" filter="url(#glow)">
            <animateMotion
              dur={`${f.duration}s`}
              repeatCount="indefinite"
              keyPoints={f.direction === 1 ? "0;1" : "1;0"}
              keyTimes="0;1"
              calcMode="linear"
            >
              <mpath href="#fireflyPath" />
            </animateMotion>
          </circle>
          {/* Main firefly */}
          <circle r={f.size} className="fill-primary" filter="url(#glow)" opacity={f.opacity}>
            <animateMotion
              dur={`${f.duration}s`}
              repeatCount="indefinite"
              begin={`${f.offset * f.duration}s`}
              keyPoints={f.direction === 1 ? "0;1" : "1;0"}
              keyTimes="0;1"
              calcMode="linear"
            >
              <mpath href="#fireflyPath" />
            </animateMotion>
            {/* Twinkle effect */}
            <animate attributeName="opacity" values={`${f.opacity};${f.opacity * 0.3};${f.opacity}`} dur="0.8s" repeatCount="indefinite" />
          </circle>
        </g>
      ))}

      {/* Static ambient glow at corners */}
      <circle cx={15} cy={15} r="2" className="fill-accent/40 animate-pulse" />
      <circle cx={width - 15} cy={15} r="2" className="fill-accent/40 animate-pulse" style={{ animationDelay: "0.25s" }} />
      <circle cx={15} cy={height - 15} r="2" className="fill-accent/40 animate-pulse" style={{ animationDelay: "0.5s" }} />
      <circle cx={width - 15} cy={height - 15} r="2" className="fill-accent/40 animate-pulse" style={{ animationDelay: "0.75s" }} />
    </g>
  )
}

// ============================================================================
// ROUND 2: More subtle, content-focused effects
// These stay on edges/outside, use different colors, don't distract from reading
// ============================================================================

// ============================================================================
// EFFECT 6: Warm Glow Frame
// Soft amber/gold gradient at outer edges only - like candlelight framing content
// ============================================================================
function WarmGlowFrameEffect({
  width,
  height,
  isExpanded,
}: {
  width: number
  height: number
  isExpanded: boolean
}) {
  if (!isExpanded) return null

  return (
    <g className="animate-in fade-in duration-700">
      <defs>
        {/* Warm radial gradients for corners */}
        <radialGradient id="warmCornerTL" cx="0%" cy="0%" r="100%">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.4" />
          <stop offset="40%" stopColor="#F59E0B" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="warmCornerTR" cx="100%" cy="0%" r="100%">
          <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.35" />
          <stop offset="40%" stopColor="#FBBF24" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#FBBF24" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="warmCornerBL" cx="0%" cy="100%" r="100%">
          <stop offset="0%" stopColor="#D97706" stopOpacity="0.3" />
          <stop offset="40%" stopColor="#D97706" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#D97706" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="warmCornerBR" cx="100%" cy="100%" r="100%">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.35" />
          <stop offset="40%" stopColor="#F59E0B" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Corner glows - positioned OUTSIDE content area */}
      <ellipse cx={-10} cy={-10} rx="80" ry="60" fill="url(#warmCornerTL)" />
      <ellipse cx={width + 10} cy={-10} rx="80" ry="60" fill="url(#warmCornerTR)" />
      <ellipse cx={-10} cy={height + 10} rx="80" ry="60" fill="url(#warmCornerBL)" />
      <ellipse cx={width + 10} cy={height + 10} rx="80" ry="60" fill="url(#warmCornerBR)" />

      {/* Subtle warm border */}
      <rect
        x="1"
        y="1"
        width={width - 2}
        height={height - 2}
        rx="11"
        ry="11"
        fill="none"
        stroke="#F59E0B"
        strokeOpacity="0.25"
        strokeWidth="1"
      />
    </g>
  )
}

// ============================================================================
// EFFECT 7: Shadow Elevation
// No border animation - card lifts with layered colored shadows underneath
// ============================================================================
function ShadowElevationEffect({
  width,
  height,
  isExpanded,
}: {
  width: number
  height: number
  isExpanded: boolean
}) {
  if (!isExpanded) return null

  return (
    <g className="animate-in fade-in duration-500">
      <defs>
        <filter id="shadowBlur1" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <filter id="shadowBlur2" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="15" />
        </filter>
        <filter id="shadowBlur3" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="25" />
        </filter>
      </defs>

      {/* Layered shadows - furthest/largest first */}
      <rect
        x="8"
        y="20"
        width={width - 16}
        height={height - 16}
        rx="14"
        ry="14"
        fill="#7C3AED"
        opacity="0.15"
        filter="url(#shadowBlur3)"
      />
      <rect
        x="6"
        y="14"
        width={width - 12}
        height={height - 12}
        rx="12"
        ry="12"
        fill="#06B6D4"
        opacity="0.2"
        filter="url(#shadowBlur2)"
      />
      <rect
        x="4"
        y="8"
        width={width - 8}
        height={height - 8}
        rx="11"
        ry="11"
        fill="#8B5CF6"
        opacity="0.25"
        filter="url(#shadowBlur1)"
      />
    </g>
  )
}

// ============================================================================
// EFFECT 8: Gradient Border Morph
// Border slowly shifts through teal → purple → rose → teal (10s cycle)
// ============================================================================
function GradientBorderMorphEffect({
  width,
  height,
  isExpanded,
}: {
  width: number
  height: number
  isExpanded: boolean
}) {
  if (!isExpanded) return null

  return (
    <g className="animate-in fade-in duration-500">
      <defs>
        <linearGradient id="morphGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%">
            <animate
              attributeName="stop-color"
              values="#14B8A6;#8B5CF6;#F43F5E;#14B8A6"
              dur="10s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="50%">
            <animate
              attributeName="stop-color"
              values="#8B5CF6;#F43F5E;#14B8A6;#8B5CF6"
              dur="10s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="100%">
            <animate
              attributeName="stop-color"
              values="#F43F5E;#14B8A6;#8B5CF6;#F43F5E"
              dur="10s"
              repeatCount="indefinite"
            />
          </stop>
        </linearGradient>
      </defs>

      {/* Single morphing gradient border */}
      <rect
        x="1"
        y="1"
        width={width - 2}
        height={height - 2}
        rx="11"
        ry="11"
        fill="none"
        stroke="url(#morphGradient)"
        strokeWidth="2"
        strokeOpacity="0.6"
      />
    </g>
  )
}

// ============================================================================
// EFFECT 9: Corner Gems
// 4 jewel-toned dots in corners (emerald, ruby, sapphire, amber) - static with slow breathe
// ============================================================================
function CornerGemsEffect({
  width,
  height,
  isExpanded,
}: {
  width: number
  height: number
  isExpanded: boolean
}) {
  if (!isExpanded) return null

  const gems = [
    { cx: 12, cy: 12, color: "#10B981", name: "emerald" },      // Top-left: emerald
    { cx: width - 12, cy: 12, color: "#EF4444", name: "ruby" }, // Top-right: ruby
    { cx: 12, cy: height - 12, color: "#3B82F6", name: "sapphire" }, // Bottom-left: sapphire
    { cx: width - 12, cy: height - 12, color: "#F59E0B", name: "amber" }, // Bottom-right: amber
  ]

  return (
    <g className="animate-in fade-in duration-500">
      <defs>
        {gems.map((gem) => (
          <filter key={gem.name} id={`gemGlow-${gem.name}`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        ))}
      </defs>

      {/* Gem dots with slow breathe */}
      {gems.map((gem, i) => (
        <g key={gem.name}>
          {/* Outer glow */}
          <circle
            cx={gem.cx}
            cy={gem.cy}
            r="6"
            fill={gem.color}
            opacity="0.3"
            filter={`url(#gemGlow-${gem.name})`}
          >
            <animate
              attributeName="opacity"
              values="0.2;0.4;0.2"
              dur="4s"
              begin={`${i * 0.8}s`}
              repeatCount="indefinite"
            />
          </circle>
          {/* Core gem */}
          <circle
            cx={gem.cx}
            cy={gem.cy}
            r="3"
            fill={gem.color}
            filter={`url(#gemGlow-${gem.name})`}
          >
            <animate
              attributeName="r"
              values="3;3.5;3"
              dur="4s"
              begin={`${i * 0.8}s`}
              repeatCount="indefinite"
            />
          </circle>
        </g>
      ))}

      {/* Very subtle connecting lines between gems */}
      <line x1={12} y1={12} x2={width - 12} y2={12} stroke="#94A3B8" strokeWidth="0.5" strokeOpacity="0.15" />
      <line x1={12} y1={height - 12} x2={width - 12} y2={height - 12} stroke="#94A3B8" strokeWidth="0.5" strokeOpacity="0.15" />
      <line x1={12} y1={12} x2={12} y2={height - 12} stroke="#94A3B8" strokeWidth="0.5" strokeOpacity="0.15" />
      <line x1={width - 12} y1={12} x2={width - 12} y2={height - 12} stroke="#94A3B8" strokeWidth="0.5" strokeOpacity="0.15" />
    </g>
  )
}

// ============================================================================
// EFFECT 10: Neon Underline
// Single glowing line at bottom - clean, minimal, like a neon sign
// ============================================================================
function NeonUnderlineEffect({
  width,
  height,
  isExpanded,
}: {
  width: number
  height: number
  isExpanded: boolean
}) {
  if (!isExpanded) return null

  const lineY = height - 3
  const lineStartX = 20
  const lineEndX = width - 20

  return (
    <g className="animate-in fade-in duration-300">
      <defs>
        <filter id="neonGlow" x="-50%" y="-200%" width="200%" height="500%">
          <feGaussianBlur stdDeviation="4" result="blur1" />
          <feGaussianBlur stdDeviation="8" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06B6D4" stopOpacity="0" />
          <stop offset="15%" stopColor="#06B6D4" stopOpacity="1" />
          <stop offset="50%" stopColor="#22D3EE" stopOpacity="1" />
          <stop offset="85%" stopColor="#06B6D4" stopOpacity="1" />
          <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* The neon line */}
      <line
        x1={lineStartX}
        y1={lineY}
        x2={lineEndX}
        y2={lineY}
        stroke="url(#neonGradient)"
        strokeWidth="2"
        strokeLinecap="round"
        filter="url(#neonGlow)"
        style={{
          animation: "neonFlicker 3s ease-in-out infinite",
        }}
      />

      {/* Subtle reflection/ambient light on bottom edge */}
      <rect
        x={lineStartX}
        y={lineY + 2}
        width={lineEndX - lineStartX}
        height="8"
        fill="url(#neonGradient)"
        opacity="0.1"
        filter="url(#neonGlow)"
      />

      <style>{`
        @keyframes neonFlicker {
          0%, 100% { opacity: 1; }
          92% { opacity: 1; }
          93% { opacity: 0.8; }
          94% { opacity: 1; }
          96% { opacity: 0.9; }
          97% { opacity: 1; }
        }
      `}</style>
    </g>
  )
}

// ============================================================================
// Demo Card Component - Shows one effect variation
// ============================================================================
interface EffectVariation {
  id: string
  name: string
  description: string
  strategy: string
  component: React.FC<{ width: number; height: number; isExpanded: boolean }>
}

const EFFECT_VARIATIONS_ROUND1: EffectVariation[] = [
  {
    id: "constellation",
    name: "Constellation Sparkles",
    description: "Static dots at corners with subtle glow",
    strategy: "Minimal, elegant - lets content shine",
    component: ConstellationEffect,
  },
  {
    id: "particle-burst",
    name: "Particle Burst",
    description: "Dots explode from center on expand",
    strategy: "Energetic, celebratory - rewards the click",
    component: ParticleBurstEffect,
  },
  {
    id: "ripple-waves",
    name: "Ripple Waves",
    description: "Concentric rings pulsing outward",
    strategy: "Calm, meditative - emphasizes reveal",
    component: RippleWavesEffect,
  },
  {
    id: "aurora-flow",
    name: "Aurora Flow",
    description: "Animated gradient along the border",
    strategy: "Premium, continuous - feels alive",
    component: AuroraFlowEffect,
  },
  {
    id: "firefly-dance",
    name: "Firefly Dance",
    description: "Multiple dots moving at different speeds",
    strategy: "Playful, organic - creates curiosity",
    component: FireflyDanceEffect,
  },
]

const EFFECT_VARIATIONS_ROUND2: EffectVariation[] = [
  {
    id: "warm-glow",
    name: "Warm Glow Frame",
    description: "Soft amber glow at outer edges only",
    strategy: "Cozy, inviting - like candlelight framing content",
    component: WarmGlowFrameEffect,
  },
  {
    id: "shadow-elevation",
    name: "Shadow Elevation",
    description: "Card lifts with layered teal/purple shadows",
    strategy: "Premium depth - effect is UNDER, not around",
    component: ShadowElevationEffect,
  },
  {
    id: "gradient-morph",
    name: "Gradient Border Morph",
    description: "Border shifts teal → purple → rose (10s cycle)",
    strategy: "Subtle, continuous - barely noticeable but alive",
    component: GradientBorderMorphEffect,
  },
  {
    id: "corner-gems",
    name: "Corner Gems",
    description: "4 jewel dots: emerald, ruby, sapphire, amber",
    strategy: "Elegant accents - color variety without chaos",
    component: CornerGemsEffect,
  },
  {
    id: "neon-underline",
    name: "Neon Underline",
    description: "Single glowing cyan line at bottom",
    strategy: "Minimal, clean - one element, maximum impact",
    component: NeonUnderlineEffect,
  },
]

function DemoCard({ variation }: { variation: EffectVariation }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const measure = () => {
      if (cardRef.current) {
        const { width, height } = cardRef.current.getBoundingClientRect()
        setDimensions({ width, height })
      }
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [isExpanded])

  const EffectComponent = variation.component

  return (
    <div className="space-y-3">
      {/* Label */}
      <div>
        <h3 className="font-semibold text-foreground">{variation.name}</h3>
        <p className="text-xs text-muted-foreground">{variation.description}</p>
      </div>

      {/* Card */}
      <div
        ref={cardRef}
        className="relative rounded-xl cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* SVG Effects Layer */}
        {dimensions.width > 0 && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
            viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            preserveAspectRatio="none"
          >
            <defs>
              <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Base border */}
            <rect
              x="2"
              y="2"
              width={dimensions.width - 4}
              height={dimensions.height - 4}
              rx="10"
              ry="10"
              fill="none"
              className={`transition-all duration-300 ${isExpanded ? "stroke-primary/30" : "stroke-primary/10"}`}
              strokeWidth="1.5"
            />

            {/* Effect */}
            <EffectComponent width={dimensions.width} height={dimensions.height} isExpanded={isExpanded} />
          </svg>
        )}

        {/* Card Content */}
        <div
          className={`relative p-4 rounded-xl bg-gradient-to-br from-primary/10 to-accent/5 border-2 border-transparent transition-all duration-300 ${
            isExpanded ? "shadow-[0_0_30px_-8px] shadow-primary/30" : "shadow-md"
          }`}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary text-primary-foreground">
              <Brain className="size-4" />
            </div>
            <div>
              <span className="text-2xl font-bold text-primary">3x</span>
              <span className="text-sm text-foreground ml-1">Success Rate</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mb-2">Writing specific plans triples follow-through.</p>

          {/* Expand trigger */}
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-primary/70 hover:text-primary transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
          >
            <span>See research</span>
            <ChevronDown className={`size-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
          </button>

          {/* Expanded content */}
          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-primary/20 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-xs font-medium text-primary">Primary Study</p>
                <p className="text-xs text-foreground/80 mt-1">
                  Gollwitzer & Sheeran meta-analysis (94 studies, n=8,000+)
                </p>
              </div>
              <div className="mt-2 p-2 rounded-lg bg-muted/50 border-l-2 border-primary/30">
                <p className="text-xs text-foreground/70 italic">
                  &ldquo;Implementation intentions had a positive effect of medium-to-large magnitude&rdquo;
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Strategy note */}
      <div className="px-2 py-1.5 rounded-md bg-muted/50 border border-border">
        <p className="text-[10px] text-muted-foreground">
          <span className="font-semibold text-primary">Strategy:</span> {variation.strategy}
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// Main Test Page
// ============================================================================
export default function KeyStatsEffectsTestPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 md:px-8 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8">
          <Button asChild variant="ghost" size="sm" className="mb-4">
            <Link href="/test">
              <ArrowLeft className="size-4 mr-2" />
              Back to Test Pages
            </Link>
          </Button>
          <h1 className="text-3xl font-bold mb-2">Expand Effect Variations</h1>
          <p className="text-muted-foreground">
            Click each card to expand and compare the 5 different visual effects.
            Each uses a different strategy to make the expand feel rewarding.
          </p>
        </div>

        {/* Instructions */}
        <div className="mb-8 p-4 rounded-xl border border-primary/20 bg-primary/5">
          <h2 className="text-sm font-semibold text-primary mb-2">How to Compare</h2>
          <ul className="text-sm text-foreground/80 space-y-1">
            <li>• Click each card to toggle expand/collapse</li>
            <li>• Notice how each effect feels different emotionally</li>
            <li>• Consider: which makes you want to click more?</li>
            <li>• Think about consistency with the app&apos;s tone</li>
          </ul>
        </div>

        {/* ROUND 2 - Content-focused, subtle effects */}
        <div className="mb-12">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 text-xs font-semibold">ROUND 2</span>
              <h2 className="text-xl font-semibold">Content-Focused Effects</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Subtler approaches: effects stay on edges, different color palettes,
              designed to frame content without distracting from reading.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {EFFECT_VARIATIONS_ROUND2.map((variation) => (
              <DemoCard key={variation.id} variation={variation} />
            ))}
          </div>
        </div>

        {/* ROUND 1 - Original effects */}
        <div className="mb-12">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-semibold">ROUND 1</span>
              <h2 className="text-xl font-semibold">Original Effects</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              More animated approaches - busier, more attention-grabbing.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {EFFECT_VARIATIONS_ROUND1.map((variation) => (
              <DemoCard key={variation.id} variation={variation} />
            ))}
          </div>
        </div>

        {/* Comparison notes */}
        <div className="p-6 rounded-xl border border-border bg-card">
          <h3 className="text-lg font-semibold mb-4">Round 2 - Detailed Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Effect</th>
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Colors</th>
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Animation</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Reading Distraction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="py-3 pr-4 font-medium">Warm Glow Frame</td>
                  <td className="py-3 pr-4 text-amber-500">Amber / Gold</td>
                  <td className="py-3 pr-4 text-muted-foreground">None (static)</td>
                  <td className="py-3 text-green-600">Very Low</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium">Shadow Elevation</td>
                  <td className="py-3 pr-4 text-violet-500">Teal / Purple</td>
                  <td className="py-3 pr-4 text-muted-foreground">None (static)</td>
                  <td className="py-3 text-green-600">None - under card</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium">Gradient Border Morph</td>
                  <td className="py-3 pr-4 text-teal-500">Teal → Purple → Rose</td>
                  <td className="py-3 pr-4 text-muted-foreground">Very slow (10s)</td>
                  <td className="py-3 text-green-600">Very Low</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium">Corner Gems</td>
                  <td className="py-3 pr-4">
                    <span className="text-emerald-500">Em</span>
                    <span className="text-red-500">Ru</span>
                    <span className="text-blue-500">Sa</span>
                    <span className="text-amber-500">Am</span>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">Slow breathe (4s)</td>
                  <td className="py-3 text-green-600">Low - corners only</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium">Neon Underline</td>
                  <td className="py-3 pr-4 text-cyan-500">Cyan</td>
                  <td className="py-3 pr-4 text-muted-foreground">Subtle flicker</td>
                  <td className="py-3 text-green-600">Very Low - bottom only</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Key insight */}
        <div className="mt-6 p-6 rounded-xl border-2 border-emerald-500/30 bg-emerald-500/5">
          <h3 className="text-lg font-semibold mb-3 text-emerald-600">Key Insight: Content First</h3>
          <div className="space-y-2 text-sm text-foreground/80">
            <p>
              <strong>Round 1 problem:</strong> Effects competed with content for attention.
              Ripples over text, particles in the middle, etc.
            </p>
            <p>
              <strong>Round 2 fix:</strong> Effects stay on edges/outside. User expands to <em>read</em>,
              so the effect should frame the content like a picture frame, not overlay it.
            </p>
            <p>
              <strong>Best candidates for reading-focused expand:</strong> Shadow Elevation (effect is underneath),
              Neon Underline (single line at bottom), or Gradient Border Morph (slow, peripheral).
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
