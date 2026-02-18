"use client"

import { useState, useEffect } from "react"
import { Heart, Flame, ChevronRight, Sparkles, Star, Lock } from "lucide-react"
import { LIFE_AREAS } from "@/src/goals/data/lifeAreas"
import { getCatalogGroups } from "@/src/goals/data/goalGraph"
import { OrreryView } from "./OrreryView"
import type { LifeAreaConfig } from "@/src/goals/types"

interface PlanetaryLandingProps {
  onSelectPath: (path: "one_person" | "abundance") => void
}

/** Floating dust particles for brass ambiance */
function DustParticles() {
  const [particles, setParticles] = useState<
    { id: number; x: number; y: number; size: number; delay: number; duration: number; opacity: number }[]
  >([])

  useEffect(() => {
    const generated = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 1.5 + 0.5,
      delay: Math.random() * 5,
      duration: Math.random() * 4 + 3,
      opacity: Math.random() * 0.15 + 0.05,
    }))
    setParticles(generated)
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: "#daa520",
            opacity: p.opacity,
            animation: `dustFloat ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes dustFloat {
          0%, 100% { opacity: 0.05; transform: translateY(0) scale(0.8); }
          50% { opacity: 0.2; transform: translateY(-8px) scale(1.1); }
        }
      `}</style>
    </div>
  )
}

export function PlanetaryLanding({ onSelectPath }: PlanetaryLandingProps) {
  const { onePerson, abundance } = getCatalogGroups()
  const [showPathChoice, setShowPathChoice] = useState(false)

  const visibleAreas = LIFE_AREAS.filter(a => a.id !== "custom")

  const handlePlanetClick = (area: LifeAreaConfig) => {
    if (area.id === "daygame") {
      setShowPathChoice(true)
    }
  }

  return (
    <div className="relative space-y-8">
      <DustParticles />

      {/* Hero */}
      <div className="relative text-center space-y-3 pt-4">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium"
          style={{
            background: "rgba(218, 165, 32, 0.12)",
            color: "#daa520",
            border: "1px solid rgba(218, 165, 32, 0.25)",
          }}
        >
          <Sparkles className="size-3.5" />
          The Orrery
        </div>
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{ color: "rgba(255, 255, 255, 0.95)" }}
        >
          Map Your Universe
        </h1>
        <p
          className="max-w-lg mx-auto text-sm"
          style={{ color: "rgba(255, 255, 255, 0.45)" }}
        >
          Each planet represents an area of your life. Click the Daygame planet to begin charting your goals.
          Other worlds will unlock as the system expands.
        </p>
      </div>

      {/* Orrery visualization */}
      <div className="relative">
        <OrreryView
          activePlanetId="daygame"
          onPlanetClick={handlePlanetClick}
          daygameMoons={[
            { label: "Find the One", id: "one_person" },
            { label: "Abundance", id: "abundance" },
          ]}
        />
      </div>

      {/* Path selection overlay — appears when daygame is clicked */}
      {showPathChoice && (
        <div className="relative space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center">
            <h2 className="text-xl font-bold" style={{ color: "#daa520" }}>
              Choose Your Orbit
            </h2>
            <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
              Two paths orbit the Daygame planet. Which resonates with you?
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {/* Find The One */}
            <button
              onClick={() => onSelectPath("one_person")}
              className="group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300 cursor-pointer"
              style={{
                border: "1px solid rgba(236, 72, 153, 0.25)",
                background: "linear-gradient(135deg, rgba(236, 72, 153, 0.06) 0%, rgba(218, 165, 32, 0.03) 100%)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(236, 72, 153, 0.5)"
                e.currentTarget.style.boxShadow = "0 0 40px rgba(236, 72, 153, 0.12), inset 0 0 30px rgba(218, 165, 32, 0.03)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(236, 72, 153, 0.25)"
                e.currentTarget.style.boxShadow = "none"
              }}
            >
              {/* Brass corner decorations */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 rounded-tl-lg" style={{ borderColor: "rgba(205, 133, 63, 0.3)" }} />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 rounded-tr-lg" style={{ borderColor: "rgba(205, 133, 63, 0.3)" }} />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 rounded-bl-lg" style={{ borderColor: "rgba(205, 133, 63, 0.3)" }} />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 rounded-br-lg" style={{ borderColor: "rgba(205, 133, 63, 0.3)" }} />

              <div className="relative space-y-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(236, 72, 153, 0.12)" }}>
                    <Heart className="size-6 text-pink-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: "rgba(255, 255, 255, 0.9)" }}>
                      Find the One
                    </h2>
                    <p className="text-xs" style={{ color: "rgba(255, 255, 255, 0.4)" }}>
                      Connection & commitment
                    </p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(255, 255, 255, 0.5)" }}>
                  I want to find one special person and build something real.
                </p>
                <div className="space-y-1.5">
                  {onePerson.slice(0, 3).map((g) => (
                    <div key={g.id} className="flex items-center gap-2 text-xs" style={{ color: "rgba(255, 255, 255, 0.4)" }}>
                      <Star className="size-2.5 text-pink-400/60" />
                      <span>{g.title}</span>
                    </div>
                  ))}
                  {onePerson.length > 3 && (
                    <div className="text-xs pl-5" style={{ color: "rgba(236, 72, 153, 0.5)" }}>
                      +{onePerson.length - 3} more paths
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-pink-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Enter orbit
                  <ChevronRight className="size-4" />
                </div>
              </div>
            </button>

            {/* Abundance */}
            <button
              onClick={() => onSelectPath("abundance")}
              className="group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300 cursor-pointer"
              style={{
                border: "1px solid rgba(249, 115, 22, 0.25)",
                background: "linear-gradient(135deg, rgba(249, 115, 22, 0.06) 0%, rgba(218, 165, 32, 0.03) 100%)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(249, 115, 22, 0.5)"
                e.currentTarget.style.boxShadow = "0 0 40px rgba(249, 115, 22, 0.12), inset 0 0 30px rgba(218, 165, 32, 0.03)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(249, 115, 22, 0.25)"
                e.currentTarget.style.boxShadow = "none"
              }}
            >
              {/* Brass corner decorations */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 rounded-tl-lg" style={{ borderColor: "rgba(205, 133, 63, 0.3)" }} />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 rounded-tr-lg" style={{ borderColor: "rgba(205, 133, 63, 0.3)" }} />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 rounded-bl-lg" style={{ borderColor: "rgba(205, 133, 63, 0.3)" }} />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 rounded-br-lg" style={{ borderColor: "rgba(205, 133, 63, 0.3)" }} />

              <div className="relative space-y-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(249, 115, 22, 0.12)" }}>
                    <Flame className="size-6 text-orange-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: "rgba(255, 255, 255, 0.9)" }}>
                      Abundance
                    </h2>
                    <p className="text-xs" style={{ color: "rgba(255, 255, 255, 0.4)" }}>
                      Freedom & experience
                    </p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(255, 255, 255, 0.5)" }}>
                  I want to experience abundance and freedom in dating.
                </p>
                <div className="space-y-1.5">
                  {abundance.slice(0, 3).map((g) => (
                    <div key={g.id} className="flex items-center gap-2 text-xs" style={{ color: "rgba(255, 255, 255, 0.4)" }}>
                      <Star className="size-2.5 text-orange-400/60" />
                      <span>{g.title}</span>
                    </div>
                  ))}
                  {abundance.length > 3 && (
                    <div className="text-xs pl-5" style={{ color: "rgba(249, 115, 22, 0.5)" }}>
                      +{abundance.length - 3} more paths
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Enter orbit
                  <ChevronRight className="size-4" />
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Life area grid — always visible below the orrery */}
      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-px flex-1" style={{ backgroundColor: "rgba(205, 133, 63, 0.15)" }} />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(205, 133, 63, 0.5)" }}>
            Planetary System
          </span>
          <div className="h-px flex-1" style={{ backgroundColor: "rgba(205, 133, 63, 0.15)" }} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {visibleAreas.map((area) => {
            const isDaygame = area.id === "daygame"
            const Icon = area.icon

            return (
              <div
                key={area.id}
                className="relative rounded-xl p-4 transition-all duration-200"
                style={{
                  border: isDaygame
                    ? `1px solid ${area.hex}40`
                    : "1px solid rgba(255,255,255,0.06)",
                  backgroundColor: isDaygame
                    ? `${area.hex}08`
                    : "rgba(255,255,255,0.02)",
                }}
              >
                {/* Brass corner accent */}
                <div className="absolute top-0 right-0 w-4 h-4 border-t border-r rounded-tr-xl" style={{ borderColor: "rgba(205, 133, 63, 0.2)" }} />

                <div className="flex items-center gap-3">
                  <div
                    className="rounded-lg p-2"
                    style={{ backgroundColor: `${area.hex}15` }}
                  >
                    <Icon className="size-4" style={{ color: area.hex }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: isDaygame ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.6)" }}>
                      {area.name}
                    </div>
                    <div className="text-[10px]" style={{ color: isDaygame ? area.hex : "rgba(255,255,255,0.3)" }}>
                      {isDaygame ? "Active" : "Coming soon"}
                    </div>
                  </div>
                  {!isDaygame && (
                    <Lock className="size-3 ml-auto flex-shrink-0" style={{ color: "rgba(255,255,255,0.15)" }} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
