"use client"

import { useState, useEffect, useMemo } from "react"

interface NebulaRegion {
  x: number
  y: number
  rx: number
  ry: number
  color: string
  opacity: number
  rotation: number
}

interface StarParticle {
  id: number
  x: number
  y: number
  size: number
  delay: number
  duration: number
  opacity: number
  drift: number
  driftDuration: number
}

/**
 * Full-viewport nebula background with:
 * - Multi-layered radial-gradient gas clouds
 * - 150+ animated star particles that drift across the screen
 * - Twinkling keyframe animations with randomized delays
 * - Optional nebula regions positioned around the canvas
 */
export function NebulaCanvas({
  regions = [],
  intensity = 1,
  particleCount = 150,
}: {
  regions?: NebulaRegion[]
  intensity?: number
  particleCount?: number
}) {
  const [particles, setParticles] = useState<StarParticle[]>([])

  useEffect(() => {
    const generated: StarParticle[] = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.3,
      delay: Math.random() * 8,
      duration: Math.random() * 4 + 2,
      opacity: Math.random() * 0.6 + 0.05,
      drift: (Math.random() - 0.5) * 20,
      driftDuration: Math.random() * 40 + 60,
    }))
    setParticles(generated)
  }, [particleCount])

  // Build the base nebula gradient layers
  const nebulaGradient = useMemo(() => {
    const layers = [
      // Deep space base
      "radial-gradient(ellipse at 50% 50%, #000010 0%, #000005 100%)",
      // Faint blue haze
      `radial-gradient(ellipse at 30% 40%, rgba(59,130,246,${0.04 * intensity}) 0%, transparent 60%)`,
      // Faint purple haze
      `radial-gradient(ellipse at 70% 30%, rgba(168,85,247,${0.03 * intensity}) 0%, transparent 55%)`,
      // Warm core region (daygame colors)
      `radial-gradient(ellipse at 50% 55%, rgba(249,115,22,${0.025 * intensity}) 0%, transparent 50%)`,
      // Deep blue dust lane
      `radial-gradient(ellipse at 20% 70%, rgba(30,58,138,${0.04 * intensity}) 0%, transparent 45%)`,
      // Teal wisps
      `radial-gradient(ellipse at 80% 75%, rgba(20,184,166,${0.02 * intensity}) 0%, transparent 40%)`,
    ]

    // Add custom regions
    for (const r of regions) {
      layers.push(
        `radial-gradient(ellipse at ${r.x}% ${r.y}%, ${r.color}${Math.round(r.opacity * 255).toString(16).padStart(2, "0")} 0%, transparent ${Math.max(r.rx, r.ry)}%)`
      )
    }

    return layers.join(", ")
  }, [regions, intensity])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* Nebula gas cloud background */}
      <div
        className="absolute inset-0"
        style={{ background: nebulaGradient }}
      />

      {/* Star particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.size > 1.5 ? "#e0e7ff" : p.size > 1 ? "#c7d2fe" : "#ffffff",
            opacity: p.opacity,
            animation: `nebulaTwinkle ${p.duration}s ease-in-out ${p.delay}s infinite, nebulaDrift ${p.driftDuration}s ease-in-out ${p.delay}s infinite`,
            // Larger stars get a faint glow
            boxShadow: p.size > 1.5
              ? `0 0 ${p.size * 2}px rgba(224,231,255,${p.opacity * 0.5})`
              : "none",
          }}
        />
      ))}

      {/* Keyframe animations */}
      <style>{`
        @keyframes nebulaTwinkle {
          0%, 100% { opacity: 0.05; transform: scale(0.8); }
          50% { opacity: 0.8; transform: scale(1.3); }
        }
        @keyframes nebulaDrift {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(3px, -2px); }
          50% { transform: translate(-2px, 4px); }
          75% { transform: translate(4px, 1px); }
        }
        @keyframes nebulaBreathing {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
        @keyframes nebulaPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        @keyframes lensFlareSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes nebulaGlowPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(249,115,22,0.15), 0 0 40px rgba(249,115,22,0.08); }
          50% { box-shadow: 0 0 30px rgba(249,115,22,0.25), 0 0 60px rgba(249,115,22,0.12); }
        }
      `}</style>
    </div>
  )
}
