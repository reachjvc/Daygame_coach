"use client"

import { useState, useEffect } from "react"
import { Heart, Flame, ChevronRight, Sparkles, Star } from "lucide-react"
import { getCatalogGroups } from "@/src/goals/data/goalGraph"

interface StarfieldLandingProps {
  onSelectPath: (path: "one_person" | "abundance") => void
}

/** Floating star background particle */
function StarParticles() {
  const [stars, setStars] = useState<
    { id: number; x: number; y: number; size: number; delay: number; duration: number; opacity: number }[]
  >([])

  useEffect(() => {
    const generated = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      delay: Math.random() * 5,
      duration: Math.random() * 3 + 2,
      opacity: Math.random() * 0.5 + 0.1,
    }))
    setStars(generated)
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
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
            animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.1; transform: scale(0.8); }
          50% { opacity: 0.7; transform: scale(1.2); }
        }
      `}</style>
    </div>
  )
}

export function StarfieldLanding({ onSelectPath }: StarfieldLandingProps) {
  const { onePerson, abundance } = getCatalogGroups()

  return (
    <div className="relative space-y-10">
      <StarParticles />

      {/* Hero */}
      <div className="relative text-center space-y-3 pt-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium"
          style={{
            background: "rgba(124, 58, 237, 0.15)",
            color: "#a78bfa",
            border: "1px solid rgba(124, 58, 237, 0.2)",
          }}
        >
          <Sparkles className="size-3.5" />
          Chart your constellation
        </div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "rgba(255, 255, 255, 0.95)" }}>
          What stars will you reach for?
        </h1>
        <p className="max-w-lg mx-auto text-sm" style={{ color: "rgba(255, 255, 255, 0.5)" }}>
          Every great journey begins with a vision. Choose your path and we will map the stars to guide you there.
        </p>
      </div>

      {/* Two Main Paths */}
      <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
        {/* Find The One */}
        <button
          onClick={() => onSelectPath("one_person")}
          className="group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300 cursor-pointer"
          style={{
            border: "1px solid rgba(236, 72, 153, 0.2)",
            background: "rgba(236, 72, 153, 0.04)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(236, 72, 153, 0.5)"
            e.currentTarget.style.boxShadow = "0 0 40px rgba(236, 72, 153, 0.15), inset 0 0 40px rgba(236, 72, 153, 0.05)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(236, 72, 153, 0.2)"
            e.currentTarget.style.boxShadow = "none"
          }}
        >
          {/* Nebula gradient on hover */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: "radial-gradient(ellipse at 30% 20%, rgba(236, 72, 153, 0.1) 0%, transparent 70%), radial-gradient(ellipse at 70% 80%, rgba(168, 85, 247, 0.08) 0%, transparent 70%)",
            }}
          />
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
              Explore this path
              <ChevronRight className="size-4" />
            </div>
          </div>
        </button>

        {/* Abundance */}
        <button
          onClick={() => onSelectPath("abundance")}
          className="group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300 cursor-pointer"
          style={{
            border: "1px solid rgba(249, 115, 22, 0.2)",
            background: "rgba(249, 115, 22, 0.04)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(249, 115, 22, 0.5)"
            e.currentTarget.style.boxShadow = "0 0 40px rgba(249, 115, 22, 0.15), inset 0 0 40px rgba(249, 115, 22, 0.05)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(249, 115, 22, 0.2)"
            e.currentTarget.style.boxShadow = "none"
          }}
        >
          {/* Nebula gradient on hover */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: "radial-gradient(ellipse at 30% 20%, rgba(249, 115, 22, 0.1) 0%, transparent 70%), radial-gradient(ellipse at 70% 80%, rgba(234, 179, 8, 0.08) 0%, transparent 70%)",
            }}
          />
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
              Explore this path
              <ChevronRight className="size-4" />
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
