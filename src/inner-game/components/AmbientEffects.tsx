"use client"

import { useRef, useEffect, useState } from "react"
import type { EffectIntensities } from "@/src/inner-game/types"

// =============================================================================
// AGREED EFFECT SETTINGS (2026-02-15)
// Spotlight Sweep: MED (2)  |  Warm Flicker: MED (2)  |  Embers: MED (2)
// Breathing Pulse: OFF (0)  |  Vignette: HIGH (3)     |  Rim Light: LOW (1)
//
// Modal ("large") mode boosts: embers 8/16/28, spotlight/flicker/rimLight 1.4x
// =============================================================================

export const AGREED_DEFAULTS: EffectIntensities = {
  spotlight: 2,
  flicker: 2,
  embers: 2,
  breathing: 0,
  vignette: 3,
  rimLight: 1,
}

// Per-effect intensity configs
export const spotlightOpacity = [0, 0.06, 0.12, 0.22]
export const flickerOpacity = [0, 0.04, 0.08, 0.14]
export const emberCounts = [0, 4, 8, 14]
export const emberSizes = [0, 2, 3, 5]
export const emberGlow = [0, 3, 4, 8]
export const breathingScale = [1.0, 1.006, 1.012, 1.025]
export const vignetteOpacity = [0, 0.3, 0.6, 0.85]
export const rimOpacity = [0, 0.08, 0.15, 0.25]

/** Hook to detect if an element is visible in the viewport */
export function useIsVisible(rootMargin = "100px") {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [rootMargin])

  return { ref, isVisible }
}

/** Ambient CSS effects overlay — pass large=true for modal-sized containers */
export function AmbientEffects({
  large = false,
  fx = AGREED_DEFAULTS,
}: {
  large?: boolean
  fx?: EffectIntensities
}) {
  const boost = large ? 1.4 : 1
  const particleCount = large ? [0, 8, 16, 28] : emberCounts
  const floatDistance = large ? 320 : 200

  return (
    <>
      {fx.spotlight > 0 && (
        <div
          className="ambient-spotlight"
          style={{
            background: `radial-gradient(ellipse at 30% 20%, rgba(255, 180, 60, ${Math.min(spotlightOpacity[fx.spotlight] * boost, 0.35)}) 0%, transparent 60%)`,
          }}
        />
      )}
      {fx.flicker > 0 && (
        <div
          className="ambient-flicker"
          style={{
            background: `radial-gradient(ellipse at 70% 30%, rgba(255, 140, 20, ${Math.min(flickerOpacity[fx.flicker] * boost, 0.25)}) 0%, transparent 50%)`,
          }}
        />
      )}
      {fx.embers > 0 && (
        <div className="ambient-embers">
          {[...Array(particleCount[fx.embers])].map((_, i) => (
            <span key={i} className="ambient-ember" style={{
              left: `${10 + (i * 7) % 80}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3 + (i % 3)}s`,
              width: emberSizes[fx.embers],
              height: emberSizes[fx.embers],
              boxShadow: `0 0 ${emberGlow[fx.embers]}px rgba(255, 140, 20, 0.6)`,
            }} />
          ))}
        </div>
      )}
      {fx.vignette > 0 && (
        <div
          className="ambient-vignette"
          style={{
            background: `radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, ${vignetteOpacity[fx.vignette]}) 100%)`,
          }}
        />
      )}
      {fx.rimLight > 0 && (
        <div
          className="ambient-rim-light"
          style={{
            background: `linear-gradient(90deg, rgba(255, 160, 60, ${rimOpacity[fx.rimLight] * boost}) 0%, transparent 15%, transparent 85%, rgba(255, 120, 40, ${rimOpacity[fx.rimLight] * boost * 0.5}) 100%)`,
          }}
        />
      )}
      <style jsx>{`
        .ambient-spotlight {
          position: absolute;
          inset: 0;
          animation: ambientSpotlight 8s ease-in-out infinite;
          pointer-events: none;
          z-index: 5;
        }
        @keyframes ambientSpotlight {
          0% { transform: translate(0, 0); }
          25% { transform: translate(8%, 5%); }
          50% { transform: translate(3%, -3%); }
          75% { transform: translate(-5%, 4%); }
          100% { transform: translate(0, 0); }
        }
        .ambient-flicker {
          position: absolute;
          inset: 0;
          animation: ambientFlicker 4s ease-in-out infinite alternate;
          pointer-events: none;
          z-index: 5;
        }
        @keyframes ambientFlicker {
          0% { opacity: 0.3; }
          30% { opacity: 0.8; }
          60% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        .ambient-embers {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 6;
        }
        .ambient-ember {
          position: absolute;
          bottom: 20%;
          border-radius: 50%;
          background: rgba(255, 160, 40, 0.8);
          animation: ambientFloat linear infinite;
          opacity: 0;
        }
        @keyframes ambientFloat {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 0.8; }
          50% { opacity: 0.5; }
          90% { opacity: 0.2; }
          100% { transform: translateY(-${floatDistance}px) translateX(20px); opacity: 0; }
        }
        .ambient-vignette {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 5;
        }
        .ambient-rim-light {
          position: absolute;
          inset: 0;
          animation: ambientRim 5s ease-in-out infinite alternate;
          pointer-events: none;
          z-index: 5;
        }
        @keyframes ambientRim {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.7; }
        }
      `}</style>
    </>
  )
}
