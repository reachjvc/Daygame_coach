"use client"

import { Heart, Flame, ChevronRight, Star } from "lucide-react"
import { getCatalogGroups } from "@/src/goals/data/goalGraph"
import { LIFE_AREAS } from "@/src/goals/data/lifeAreas"
import { AuroraCanvas } from "./AuroraCanvas"

// Aurora-style colors per life area
const AURORA_BAND_COLORS: Record<string, { from: string; to: string; glow: string }> = {
  daygame: { from: "#4ade80", to: "#22d3ee", glow: "rgba(74, 222, 128, 0.15)" },
  health_fitness: { from: "#22d3ee", to: "#60a5fa", glow: "rgba(34, 211, 238, 0.1)" },
  career_business: { from: "#a78bfa", to: "#e879f9", glow: "rgba(167, 139, 250, 0.1)" },
  social: { from: "#60a5fa", to: "#818cf8", glow: "rgba(96, 165, 250, 0.1)" },
  personal_growth: { from: "#e879f9", to: "#f472b6", glow: "rgba(232, 121, 249, 0.1)" },
  lifestyle: { from: "#22d3ee", to: "#4ade80", glow: "rgba(34, 211, 238, 0.08)" },
}

interface AuroraLandingProps {
  onSelectPath: (path: "one_person" | "abundance") => void
}

export function AuroraLanding({ onSelectPath }: AuroraLandingProps) {
  const { onePerson, abundance } = getCatalogGroups()
  const visibleAreas = LIFE_AREAS.filter((a) => a.id !== "custom")

  return (
    <div className="relative">
      {/* Aurora sky section */}
      <AuroraCanvas
        intensity={1}
        showMountains={true}
        showStars={true}
        className="rounded-2xl"
      >
        <div className="px-6 py-12 min-h-[380px] flex flex-col items-center justify-center">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-light tracking-wider mb-4"
            style={{
              background: "rgba(74, 222, 128, 0.1)",
              color: "#4ade80",
              border: "1px solid rgba(74, 222, 128, 0.2)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div
              className="size-1.5 rounded-full"
              style={{
                backgroundColor: "#4ade80",
                boxShadow: "0 0 6px rgba(74, 222, 128, 0.6)",
                animation: "auroraDotPulse 2s ease-in-out infinite",
              }}
            />
            Northern Lights
          </div>

          {/* Hero text */}
          <h1
            className="text-3xl sm:text-4xl font-extralight tracking-tight text-center mb-3"
            style={{
              color: "rgba(255, 255, 255, 0.95)",
              textShadow: "0 0 40px rgba(74, 222, 128, 0.2)",
            }}
          >
            Illuminate your path
          </h1>
          <p
            className="text-sm font-light text-center max-w-md mx-auto leading-relaxed"
            style={{ color: "rgba(255, 255, 255, 0.5)", letterSpacing: "0.02em" }}
          >
            Like the aurora borealis, your goals form bands of light dancing across the sky.
            Each life area is a ribbon. Choose which bands burn brightest.
          </p>

          {/* Two bright intensity points within the daygame aurora band */}
          <div className="flex items-center gap-8 mt-8">
            <button
              onClick={() => onSelectPath("one_person")}
              className="group flex flex-col items-center gap-2 cursor-pointer transition-all duration-500"
            >
              <div
                className="relative size-14 rounded-full flex items-center justify-center transition-all duration-500 group-hover:scale-110"
                style={{
                  background: "radial-gradient(circle, rgba(74, 222, 128, 0.3) 0%, rgba(34, 211, 238, 0.15) 60%, transparent 100%)",
                  boxShadow: "0 0 30px rgba(74, 222, 128, 0.2), 0 0 60px rgba(34, 211, 238, 0.1)",
                }}
              >
                <Heart className="size-6" style={{ color: "#4ade80" }} />
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: "radial-gradient(circle, rgba(74, 222, 128, 0.15) 0%, transparent 70%)",
                    animation: "intensityPulse 3s ease-in-out infinite",
                  }}
                />
              </div>
              <span className="text-xs font-light tracking-wide" style={{ color: "rgba(74, 222, 128, 0.8)" }}>
                Find the One
              </span>
            </button>

            {/* Divider — aurora filament */}
            <div
              className="w-px h-16"
              style={{
                background: "linear-gradient(180deg, transparent, rgba(34, 211, 238, 0.3), transparent)",
              }}
            />

            <button
              onClick={() => onSelectPath("abundance")}
              className="group flex flex-col items-center gap-2 cursor-pointer transition-all duration-500"
            >
              <div
                className="relative size-14 rounded-full flex items-center justify-center transition-all duration-500 group-hover:scale-110"
                style={{
                  background: "radial-gradient(circle, rgba(232, 121, 249, 0.3) 0%, rgba(167, 139, 250, 0.15) 60%, transparent 100%)",
                  boxShadow: "0 0 30px rgba(232, 121, 249, 0.2), 0 0 60px rgba(167, 139, 250, 0.1)",
                }}
              >
                <Flame className="size-6" style={{ color: "#e879f9" }} />
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: "radial-gradient(circle, rgba(232, 121, 249, 0.15) 0%, transparent 70%)",
                    animation: "intensityPulse 3s ease-in-out 1s infinite",
                  }}
                />
              </div>
              <span className="text-xs font-light tracking-wide" style={{ color: "rgba(232, 121, 249, 0.8)" }}>
                Abundance
              </span>
            </button>
          </div>
        </div>
      </AuroraCanvas>

      {/* Path selection cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {/* Find The One */}
        <button
          onClick={() => onSelectPath("one_person")}
          className="group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-500 cursor-pointer"
          style={{
            border: "1px solid rgba(74, 222, 128, 0.15)",
            background: "linear-gradient(135deg, rgba(74, 222, 128, 0.03) 0%, rgba(34, 211, 238, 0.02) 100%)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(74, 222, 128, 0.4)"
            e.currentTarget.style.boxShadow = "0 0 40px rgba(74, 222, 128, 0.1), inset 0 1px 0 rgba(74, 222, 128, 0.1)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(74, 222, 128, 0.15)"
            e.currentTarget.style.boxShadow = "none"
          }}
        >
          {/* Aurora glow on hover */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
            style={{
              background: "radial-gradient(ellipse at 30% 20%, rgba(74, 222, 128, 0.08) 0%, transparent 60%)",
            }}
          />
          <div className="relative space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="rounded-xl p-3"
                style={{
                  background: "rgba(74, 222, 128, 0.08)",
                  boxShadow: "0 0 20px rgba(74, 222, 128, 0.06)",
                }}
              >
                <Heart className="size-6" style={{ color: "#4ade80" }} />
              </div>
              <div>
                <h2 className="text-lg font-light tracking-wide" style={{ color: "rgba(255, 255, 255, 0.9)" }}>
                  Find the One
                </h2>
                <p className="text-xs font-light" style={{ color: "rgba(255, 255, 255, 0.35)" }}>
                  Connection & commitment
                </p>
              </div>
            </div>
            <p className="text-sm font-light leading-relaxed" style={{ color: "rgba(255, 255, 255, 0.45)" }}>
              I want to find one special person and build something real.
            </p>
            <div className="space-y-1.5">
              {onePerson.slice(0, 3).map((g) => (
                <div key={g.id} className="flex items-center gap-2 text-xs" style={{ color: "rgba(255, 255, 255, 0.35)" }}>
                  <div className="size-1 rounded-full" style={{ backgroundColor: "#4ade80", opacity: 0.6 }} />
                  <span className="font-light">{g.title}</span>
                </div>
              ))}
              {onePerson.length > 3 && (
                <div className="text-xs pl-3 font-light" style={{ color: "rgba(74, 222, 128, 0.4)" }}>
                  +{onePerson.length - 3} more paths
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm font-light opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ color: "#4ade80" }}>
              Enter the light
              <ChevronRight className="size-4" />
            </div>
          </div>
        </button>

        {/* Abundance */}
        <button
          onClick={() => onSelectPath("abundance")}
          className="group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-500 cursor-pointer"
          style={{
            border: "1px solid rgba(232, 121, 249, 0.15)",
            background: "linear-gradient(135deg, rgba(232, 121, 249, 0.03) 0%, rgba(167, 139, 250, 0.02) 100%)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(232, 121, 249, 0.4)"
            e.currentTarget.style.boxShadow = "0 0 40px rgba(232, 121, 249, 0.1), inset 0 1px 0 rgba(232, 121, 249, 0.1)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(232, 121, 249, 0.15)"
            e.currentTarget.style.boxShadow = "none"
          }}
        >
          {/* Aurora glow on hover */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
            style={{
              background: "radial-gradient(ellipse at 30% 20%, rgba(232, 121, 249, 0.08) 0%, transparent 60%)",
            }}
          />
          <div className="relative space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="rounded-xl p-3"
                style={{
                  background: "rgba(232, 121, 249, 0.08)",
                  boxShadow: "0 0 20px rgba(232, 121, 249, 0.06)",
                }}
              >
                <Flame className="size-6" style={{ color: "#e879f9" }} />
              </div>
              <div>
                <h2 className="text-lg font-light tracking-wide" style={{ color: "rgba(255, 255, 255, 0.9)" }}>
                  Abundance
                </h2>
                <p className="text-xs font-light" style={{ color: "rgba(255, 255, 255, 0.35)" }}>
                  Freedom & experience
                </p>
              </div>
            </div>
            <p className="text-sm font-light leading-relaxed" style={{ color: "rgba(255, 255, 255, 0.45)" }}>
              I want to experience abundance and freedom in dating.
            </p>
            <div className="space-y-1.5">
              {abundance.slice(0, 3).map((g) => (
                <div key={g.id} className="flex items-center gap-2 text-xs" style={{ color: "rgba(255, 255, 255, 0.35)" }}>
                  <div className="size-1 rounded-full" style={{ backgroundColor: "#e879f9", opacity: 0.6 }} />
                  <span className="font-light">{g.title}</span>
                </div>
              ))}
              {abundance.length > 3 && (
                <div className="text-xs pl-3 font-light" style={{ color: "rgba(232, 121, 249, 0.4)" }}>
                  +{abundance.length - 3} more paths
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm font-light opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ color: "#e879f9" }}>
              Enter the light
              <ChevronRight className="size-4" />
            </div>
          </div>
        </button>
      </div>

      {/* Life area bands — translucent cards below */}
      <div className="mt-8 space-y-3">
        <div className="flex items-center gap-2 px-1">
          <div
            className="h-px flex-1"
            style={{ background: "linear-gradient(90deg, transparent, rgba(74, 222, 128, 0.15), rgba(167, 139, 250, 0.15), transparent)" }}
          />
          <span className="text-[10px] font-light tracking-widest uppercase" style={{ color: "rgba(255, 255, 255, 0.3)" }}>
            Aurora Bands
          </span>
          <div
            className="h-px flex-1"
            style={{ background: "linear-gradient(90deg, transparent, rgba(167, 139, 250, 0.15), rgba(74, 222, 128, 0.15), transparent)" }}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {visibleAreas.map((area) => {
            const colors = AURORA_BAND_COLORS[area.id] ?? { from: "#94a3b8", to: "#64748b", glow: "rgba(148, 163, 184, 0.08)" }
            const isDaygame = area.id === "daygame"
            return (
              <div
                key={area.id}
                className={`relative rounded-xl p-3 transition-all duration-300 ${isDaygame ? "col-span-2 sm:col-span-1" : ""}`}
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  border: `1px solid ${isDaygame ? colors.from + "30" : "rgba(255, 255, 255, 0.05)"}`,
                }}
              >
                {/* Aurora colored top border */}
                <div
                  className="absolute top-0 left-2 right-2 h-0.5 rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${colors.from}, ${colors.to})`,
                    opacity: isDaygame ? 0.8 : 0.4,
                    boxShadow: isDaygame ? `0 0 8px ${colors.glow}` : "none",
                  }}
                />
                {/* Band intensity indicator */}
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className="size-2 rounded-full"
                    style={{
                      background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
                      boxShadow: isDaygame ? `0 0 6px ${colors.from}60` : "none",
                      animation: isDaygame ? "auroraDotPulse 2s ease-in-out infinite" : "none",
                    }}
                  />
                  <span
                    className="text-[10px] font-light tracking-wide truncate"
                    style={{ color: isDaygame ? colors.from : "rgba(255, 255, 255, 0.45)" }}
                  >
                    {area.name}
                  </span>
                </div>
                {/* Intensity bar */}
                <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255, 255, 255, 0.04)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: isDaygame ? "90%" : `${30 + Math.random() * 40}%`,
                      background: `linear-gradient(90deg, ${colors.from}80, ${colors.to}60)`,
                      boxShadow: `0 0 4px ${colors.glow}`,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <style>{`
        @keyframes intensityPulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes auroraDotPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  )
}
