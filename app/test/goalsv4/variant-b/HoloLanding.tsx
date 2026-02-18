"use client"

import { useState, useEffect } from "react"
import { Heart, Flame, ChevronRight, Star, Lock, Scan } from "lucide-react"
import { LIFE_AREAS } from "@/src/goals/data/lifeAreas"
import { getCatalogGroups } from "@/src/goals/data/goalGraph"
import { HoloOrreryView } from "./HoloOrreryView"
import type { LifeAreaConfig } from "@/src/goals/types"

const CYAN = "#00f0ff"

interface HoloLandingProps {
  onSelectPath: (path: "one_person" | "abundance") => void
}

function DataParticles() {
  const [particles, setParticles] = useState<
    { id: number; x: number; y: number; size: number; delay: number; duration: number; opacity: number }[]
  >([])

  useEffect(() => {
    const generated = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 1.5 + 0.5,
      delay: Math.random() * 5,
      duration: Math.random() * 4 + 3,
      opacity: Math.random() * 0.12 + 0.03,
    }))
    setParticles(generated)
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: CYAN,
            opacity: p.opacity,
            animation: `holoDataFloat ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes holoDataFloat {
          0%, 100% { opacity: 0.03; transform: translateY(0) scale(0.8); }
          50% { opacity: 0.15; transform: translateY(-10px) scale(1.2); }
        }
      `}</style>
    </div>
  )
}

export function HoloLanding({ onSelectPath }: HoloLandingProps) {
  const { onePerson, abundance } = getCatalogGroups()
  const [showPathChoice, setShowPathChoice] = useState(false)
  const visibleAreas = LIFE_AREAS.filter((a) => a.id !== "custom")

  const handlePlanetClick = (area: LifeAreaConfig) => {
    if (area.id === "daygame") {
      setShowPathChoice(true)
    }
  }

  return (
    <div className="relative space-y-8">
      <DataParticles />

      {/* Hero */}
      <div className="relative text-center space-y-3 pt-4">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-bold"
          style={{
            background: "rgba(0, 240, 255, 0.06)",
            color: CYAN,
            border: `1px solid rgba(0, 240, 255, 0.2)`,
            borderRadius: 2,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
          }}
        >
          <Scan className="size-3.5" />
          HOLO ORRERY v2.0
        </div>
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{ color: "rgba(255, 255, 255, 0.95)" }}
        >
          Initialize System
        </h1>
        <p
          className="max-w-lg mx-auto text-sm"
          style={{ color: "rgba(255, 255, 255, 0.4)", fontFamily: "var(--font-mono, 'Geist Mono', monospace)", fontSize: 12 }}
        >
          Holographic planetary system detected. Select the DAYGAME node to begin
          trajectory analysis. Other systems are pending authorization.
        </p>
      </div>

      {/* Orrery visualization */}
      <div className="relative">
        <HoloOrreryView
          activePlanetId="daygame"
          onPlanetClick={handlePlanetClick}
          daygameMoons={[
            { label: "FIND THE ONE", id: "one_person" },
            { label: "ABUNDANCE", id: "abundance" },
          ]}
        />

        {/* CTA below orrery - alternative to clicking the planet */}
        {!showPathChoice && (
          <div className="text-center mt-4">
            <button
              onClick={() => setShowPathChoice(true)}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold transition-all duration-300 cursor-pointer group"
              data-testid="holo-scan-daygame"
              style={{
                border: `1px solid rgba(0, 240, 255, 0.2)`,
                background: "rgba(0, 240, 255, 0.04)",
                color: CYAN,
                borderRadius: 4,
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                letterSpacing: "0.1em",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(0, 240, 255, 0.5)"
                e.currentTarget.style.boxShadow = "0 0 20px rgba(0, 240, 255, 0.1)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(0, 240, 255, 0.2)"
                e.currentTarget.style.boxShadow = "none"
              }}
            >
              <Scan className="size-4" />
              SCAN DAYGAME SYSTEM
            </button>
          </div>
        )}
      </div>

      {/* Path selection overlay */}
      {showPathChoice && (
        <div className="relative space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center">
            <h2 className="text-xl font-bold" style={{ color: CYAN }}>
              SELECT TRAJECTORY
            </h2>
            <p
              className="text-xs mt-1"
              style={{ color: "rgba(0, 240, 255, 0.4)", fontFamily: "var(--font-mono, 'Geist Mono', monospace)" }}
            >
              Two flight paths detected. Choose your vector.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {/* Find The One */}
            <button
              onClick={() => onSelectPath("one_person")}
              className="group relative overflow-hidden p-6 text-left transition-all duration-300 cursor-pointer"
              style={{
                border: "1px solid rgba(236, 72, 153, 0.2)",
                background: "linear-gradient(135deg, rgba(236, 72, 153, 0.04) 0%, rgba(0, 240, 255, 0.02) 100%)",
                borderRadius: 4,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(236, 72, 153, 0.5)"
                e.currentTarget.style.boxShadow = "0 0 30px rgba(236, 72, 153, 0.1), inset 0 0 20px rgba(236, 72, 153, 0.02)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(236, 72, 153, 0.2)"
                e.currentTarget.style.boxShadow = "none"
              }}
            >
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t border-l" style={{ borderColor: "rgba(236, 72, 153, 0.3)" }} />
              <div className="absolute top-0 right-0 w-4 h-4 border-t border-r" style={{ borderColor: "rgba(236, 72, 153, 0.3)" }} />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l" style={{ borderColor: "rgba(236, 72, 153, 0.3)" }} />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r" style={{ borderColor: "rgba(236, 72, 153, 0.3)" }} />

              <div className="relative space-y-4">
                <div className="flex items-center gap-3">
                  <div
                    className="p-3"
                    style={{ backgroundColor: "rgba(236, 72, 153, 0.08)", borderRadius: 2 }}
                  >
                    <Heart className="size-6 text-pink-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: "rgba(255, 255, 255, 0.9)" }}>
                      Find the One
                    </h2>
                    <p
                      className="text-xs"
                      style={{
                        color: "rgba(236, 72, 153, 0.6)",
                        fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                      }}
                    >
                      CONNECTION PROTOCOL
                    </p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(255, 255, 255, 0.45)" }}>
                  I want to find one special person and build something real.
                </p>
                <div className="space-y-1.5">
                  {onePerson.slice(0, 3).map((g) => (
                    <div key={g.id} className="flex items-center gap-2 text-xs" style={{ color: "rgba(255, 255, 255, 0.35)" }}>
                      <Star className="size-2.5 text-pink-400/60" />
                      <span>{g.title}</span>
                    </div>
                  ))}
                  {onePerson.length > 3 && (
                    <div
                      className="text-xs pl-5"
                      style={{
                        color: "rgba(236, 72, 153, 0.4)",
                        fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                      }}
                    >
                      +{onePerson.length - 3} additional vectors
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-pink-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Initialize
                  <ChevronRight className="size-4" />
                </div>
              </div>
            </button>

            {/* Abundance */}
            <button
              onClick={() => onSelectPath("abundance")}
              className="group relative overflow-hidden p-6 text-left transition-all duration-300 cursor-pointer"
              style={{
                border: "1px solid rgba(249, 115, 22, 0.2)",
                background: "linear-gradient(135deg, rgba(249, 115, 22, 0.04) 0%, rgba(0, 240, 255, 0.02) 100%)",
                borderRadius: 4,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(249, 115, 22, 0.5)"
                e.currentTarget.style.boxShadow = "0 0 30px rgba(249, 115, 22, 0.1), inset 0 0 20px rgba(249, 115, 22, 0.02)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(249, 115, 22, 0.2)"
                e.currentTarget.style.boxShadow = "none"
              }}
            >
              <div className="absolute top-0 left-0 w-4 h-4 border-t border-l" style={{ borderColor: "rgba(249, 115, 22, 0.3)" }} />
              <div className="absolute top-0 right-0 w-4 h-4 border-t border-r" style={{ borderColor: "rgba(249, 115, 22, 0.3)" }} />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l" style={{ borderColor: "rgba(249, 115, 22, 0.3)" }} />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r" style={{ borderColor: "rgba(249, 115, 22, 0.3)" }} />

              <div className="relative space-y-4">
                <div className="flex items-center gap-3">
                  <div
                    className="p-3"
                    style={{ backgroundColor: "rgba(249, 115, 22, 0.08)", borderRadius: 2 }}
                  >
                    <Flame className="size-6 text-orange-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: "rgba(255, 255, 255, 0.9)" }}>
                      Abundance
                    </h2>
                    <p
                      className="text-xs"
                      style={{
                        color: "rgba(249, 115, 22, 0.6)",
                        fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                      }}
                    >
                      EXPANSION PROTOCOL
                    </p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(255, 255, 255, 0.45)" }}>
                  I want to experience abundance and freedom in dating.
                </p>
                <div className="space-y-1.5">
                  {abundance.slice(0, 3).map((g) => (
                    <div key={g.id} className="flex items-center gap-2 text-xs" style={{ color: "rgba(255, 255, 255, 0.35)" }}>
                      <Star className="size-2.5 text-orange-400/60" />
                      <span>{g.title}</span>
                    </div>
                  ))}
                  {abundance.length > 3 && (
                    <div
                      className="text-xs pl-5"
                      style={{
                        color: "rgba(249, 115, 22, 0.4)",
                        fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                      }}
                    >
                      +{abundance.length - 3} additional vectors
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Initialize
                  <ChevronRight className="size-4" />
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Life area grid */}
      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-px flex-1" style={{ backgroundColor: "rgba(0, 240, 255, 0.08)" }} />
          <span
            className="text-xs font-bold tracking-wider"
            style={{
              color: "rgba(0, 240, 255, 0.35)",
              fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            SYSTEM NODES
          </span>
          <div className="h-px flex-1" style={{ backgroundColor: "rgba(0, 240, 255, 0.08)" }} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {visibleAreas.map((area) => {
            const isDaygame = area.id === "daygame"
            const Icon = area.icon

            return (
              <div
                key={area.id}
                className="relative p-4 transition-all duration-200"
                style={{
                  border: isDaygame ? `1px solid ${CYAN}30` : "1px solid rgba(0, 240, 255, 0.05)",
                  backgroundColor: isDaygame ? "rgba(0, 240, 255, 0.03)" : "rgba(0, 240, 255, 0.01)",
                  borderRadius: 4,
                }}
              >
                <div className="absolute top-0 right-0 w-3 h-3 border-t border-r" style={{ borderColor: "rgba(0, 240, 255, 0.12)" }} />

                <div className="flex items-center gap-3">
                  <div className="p-2" style={{ backgroundColor: `${area.hex}10`, borderRadius: 2 }}>
                    <Icon className="size-4" style={{ color: isDaygame ? CYAN : area.hex }} />
                  </div>
                  <div className="min-w-0">
                    <div
                      className="text-sm font-medium truncate"
                      style={{ color: isDaygame ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)" }}
                    >
                      {area.name}
                    </div>
                    <div
                      className="text-[10px]"
                      style={{
                        color: isDaygame ? CYAN : "rgba(255,255,255,0.25)",
                        fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                      }}
                    >
                      {isDaygame ? "ONLINE" : "OFFLINE"}
                    </div>
                  </div>
                  {!isDaygame && <Lock className="size-3 ml-auto flex-shrink-0" style={{ color: "rgba(0, 240, 255, 0.12)" }} />}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
