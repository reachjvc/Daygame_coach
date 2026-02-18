"use client"

import { Heart, Flame, ChevronRight, Zap } from "lucide-react"
import { getCatalogGroups } from "@/src/goals/data/goalGraph"
import { LIFE_AREAS } from "@/src/goals/data/lifeAreas"
import { SolarStormCanvas } from "./SolarStormCanvas"

// Storm-style colors per life area
const STORM_BAND_COLORS: Record<string, { from: string; to: string; glow: string }> = {
  daygame: { from: "#ff4d4d", to: "#ff8c1a", glow: "rgba(255, 77, 77, 0.15)" },
  health_fitness: { from: "#ff8c1a", to: "#ffd700", glow: "rgba(255, 140, 26, 0.1)" },
  career_business: { from: "#d946ef", to: "#ff4d4d", glow: "rgba(217, 70, 239, 0.1)" },
  social: { from: "#3b82f6", to: "#8b5cf6", glow: "rgba(59, 130, 246, 0.1)" },
  personal_growth: { from: "#f97316", to: "#ef4444", glow: "rgba(249, 115, 22, 0.1)" },
  lifestyle: { from: "#ec4899", to: "#d946ef", glow: "rgba(236, 72, 153, 0.08)" },
}

interface StormLandingProps {
  onSelectPath: (path: "one_person" | "abundance") => void
}

export function StormLanding({ onSelectPath }: StormLandingProps) {
  const { onePerson, abundance } = getCatalogGroups()
  const visibleAreas = LIFE_AREAS.filter((a) => a.id !== "custom")

  return (
    <div className="relative">
      {/* Solar storm sky section */}
      <SolarStormCanvas
        intensity={1}
        showHorizon={true}
        showParticles={true}
        className="rounded-2xl"
      >
        <div className="px-6 py-12 min-h-[380px] flex flex-col items-center justify-center">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-light tracking-wider mb-4"
            style={{
              background: "rgba(255, 77, 77, 0.1)",
              color: "#ff6b6b",
              border: "1px solid rgba(255, 77, 77, 0.25)",
              backdropFilter: "blur(8px)",
            }}
          >
            <Zap
              className="size-3"
              style={{
                color: "#ff8c1a",
                filter: "drop-shadow(0 0 4px rgba(255, 140, 26, 0.6))",
                animation: "stormIconPulse 1.5s ease-in-out infinite",
              }}
            />
            Solar Storm
          </div>

          {/* Hero text */}
          <h1
            className="text-3xl sm:text-4xl font-extralight tracking-tight text-center mb-3"
            style={{
              color: "rgba(255, 255, 255, 0.95)",
              textShadow: "0 0 40px rgba(255, 77, 77, 0.25)",
            }}
          >
            Ignite your trajectory
          </h1>
          <p
            className="text-sm font-light text-center max-w-md mx-auto leading-relaxed"
            style={{ color: "rgba(255, 255, 255, 0.5)", letterSpacing: "0.02em" }}
          >
            Like a coronal mass ejection, your ambition sends charged particles crashing
            through Earth&apos;s magnetosphere. Each goal is a burst of energy.
            Choose which frequencies burn brightest.
          </p>

          {/* Two path selection orbs */}
          <div className="flex items-center gap-8 mt-8">
            <button
              onClick={() => onSelectPath("one_person")}
              className="group flex flex-col items-center gap-2 cursor-pointer transition-all duration-500"
            >
              <div
                className="relative size-14 rounded-full flex items-center justify-center transition-all duration-500 group-hover:scale-110"
                style={{
                  background: "radial-gradient(circle, rgba(255, 77, 77, 0.35) 0%, rgba(255, 140, 26, 0.15) 60%, transparent 100%)",
                  boxShadow: "0 0 30px rgba(255, 77, 77, 0.25), 0 0 60px rgba(255, 140, 26, 0.12)",
                }}
              >
                <Heart className="size-6" style={{ color: "#ff6b6b" }} />
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: "radial-gradient(circle, rgba(255, 77, 77, 0.2) 0%, transparent 70%)",
                    animation: "stormOrbPulse 2.5s ease-in-out infinite",
                  }}
                />
              </div>
              <span className="text-xs font-light tracking-wide" style={{ color: "rgba(255, 107, 107, 0.85)" }}>
                Find the One
              </span>
            </button>

            {/* Divider - charged filament */}
            <div
              className="w-px h-16"
              style={{
                background: "linear-gradient(180deg, transparent, rgba(255, 140, 26, 0.4), transparent)",
              }}
            />

            <button
              onClick={() => onSelectPath("abundance")}
              className="group flex flex-col items-center gap-2 cursor-pointer transition-all duration-500"
            >
              <div
                className="relative size-14 rounded-full flex items-center justify-center transition-all duration-500 group-hover:scale-110"
                style={{
                  background: "radial-gradient(circle, rgba(217, 70, 239, 0.35) 0%, rgba(236, 72, 153, 0.15) 60%, transparent 100%)",
                  boxShadow: "0 0 30px rgba(217, 70, 239, 0.25), 0 0 60px rgba(236, 72, 153, 0.12)",
                }}
              >
                <Flame className="size-6" style={{ color: "#d946ef" }} />
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: "radial-gradient(circle, rgba(217, 70, 239, 0.2) 0%, transparent 70%)",
                    animation: "stormOrbPulse 2.5s ease-in-out 0.8s infinite",
                  }}
                />
              </div>
              <span className="text-xs font-light tracking-wide" style={{ color: "rgba(217, 70, 239, 0.85)" }}>
                Abundance
              </span>
            </button>
          </div>
        </div>
      </SolarStormCanvas>

      {/* Path selection cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {/* Find The One */}
        <button
          onClick={() => onSelectPath("one_person")}
          className="group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-500 cursor-pointer"
          style={{
            border: "1px solid rgba(255, 77, 77, 0.15)",
            background: "linear-gradient(135deg, rgba(255, 77, 77, 0.04) 0%, rgba(255, 140, 26, 0.02) 100%)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(255, 77, 77, 0.45)"
            e.currentTarget.style.boxShadow = "0 0 40px rgba(255, 77, 77, 0.12), inset 0 1px 0 rgba(255, 77, 77, 0.1)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255, 77, 77, 0.15)"
            e.currentTarget.style.boxShadow = "none"
          }}
        >
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
            style={{
              background: "radial-gradient(ellipse at 30% 20%, rgba(255, 77, 77, 0.08) 0%, transparent 60%)",
            }}
          />
          <div className="relative space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="rounded-xl p-3"
                style={{
                  background: "rgba(255, 77, 77, 0.08)",
                  boxShadow: "0 0 20px rgba(255, 77, 77, 0.06)",
                }}
              >
                <Heart className="size-6" style={{ color: "#ff6b6b" }} />
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
                  <div className="size-1 rounded-full" style={{ backgroundColor: "#ff6b6b", opacity: 0.6 }} />
                  <span className="font-light">{g.title}</span>
                </div>
              ))}
              {onePerson.length > 3 && (
                <div className="text-xs pl-3 font-light" style={{ color: "rgba(255, 77, 77, 0.4)" }}>
                  +{onePerson.length - 3} more paths
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm font-light opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ color: "#ff6b6b" }}>
              Enter the storm
              <ChevronRight className="size-4" />
            </div>
          </div>
        </button>

        {/* Abundance */}
        <button
          onClick={() => onSelectPath("abundance")}
          className="group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-500 cursor-pointer"
          style={{
            border: "1px solid rgba(217, 70, 239, 0.15)",
            background: "linear-gradient(135deg, rgba(217, 70, 239, 0.04) 0%, rgba(236, 72, 153, 0.02) 100%)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(217, 70, 239, 0.45)"
            e.currentTarget.style.boxShadow = "0 0 40px rgba(217, 70, 239, 0.12), inset 0 1px 0 rgba(217, 70, 239, 0.1)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(217, 70, 239, 0.15)"
            e.currentTarget.style.boxShadow = "none"
          }}
        >
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
            style={{
              background: "radial-gradient(ellipse at 30% 20%, rgba(217, 70, 239, 0.08) 0%, transparent 60%)",
            }}
          />
          <div className="relative space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="rounded-xl p-3"
                style={{
                  background: "rgba(217, 70, 239, 0.08)",
                  boxShadow: "0 0 20px rgba(217, 70, 239, 0.06)",
                }}
              >
                <Flame className="size-6" style={{ color: "#d946ef" }} />
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
                  <div className="size-1 rounded-full" style={{ backgroundColor: "#d946ef", opacity: 0.6 }} />
                  <span className="font-light">{g.title}</span>
                </div>
              ))}
              {abundance.length > 3 && (
                <div className="text-xs pl-3 font-light" style={{ color: "rgba(217, 70, 239, 0.4)" }}>
                  +{abundance.length - 3} more paths
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm font-light opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ color: "#d946ef" }}>
              Enter the storm
              <ChevronRight className="size-4" />
            </div>
          </div>
        </button>
      </div>

      {/* Life area frequency bands */}
      <div className="mt-8 space-y-3">
        <div className="flex items-center gap-2 px-1">
          <div
            className="h-px flex-1"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255, 77, 77, 0.2), rgba(217, 70, 239, 0.15), transparent)" }}
          />
          <span className="text-[10px] font-light tracking-widest uppercase" style={{ color: "rgba(255, 255, 255, 0.3)" }}>
            Frequency Bands
          </span>
          <div
            className="h-px flex-1"
            style={{ background: "linear-gradient(90deg, transparent, rgba(217, 70, 239, 0.15), rgba(255, 77, 77, 0.2), transparent)" }}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {visibleAreas.map((area) => {
            const colors = STORM_BAND_COLORS[area.id] ?? { from: "#94a3b8", to: "#64748b", glow: "rgba(148, 163, 184, 0.08)" }
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
                <div
                  className="absolute top-0 left-2 right-2 h-0.5 rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${colors.from}, ${colors.to})`,
                    opacity: isDaygame ? 0.9 : 0.45,
                    boxShadow: isDaygame ? `0 0 8px ${colors.glow}` : "none",
                  }}
                />
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className="size-2 rounded-full"
                    style={{
                      background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
                      boxShadow: isDaygame ? `0 0 6px ${colors.from}60` : "none",
                      animation: isDaygame ? "stormDotPulse 1.5s ease-in-out infinite" : "none",
                    }}
                  />
                  <span
                    className="text-[10px] font-light tracking-wide truncate"
                    style={{ color: isDaygame ? colors.from : "rgba(255, 255, 255, 0.45)" }}
                  >
                    {area.name}
                  </span>
                </div>
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
        @keyframes stormOrbPulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes stormDotPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        @keyframes stormIconPulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; filter: drop-shadow(0 0 6px rgba(255, 140, 26, 0.8)); }
        }
      `}</style>
    </div>
  )
}
