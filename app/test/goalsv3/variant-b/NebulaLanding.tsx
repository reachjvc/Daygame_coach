"use client"

import { useState, useEffect, useMemo } from "react"
import { ChevronRight, Sparkles, Lock } from "lucide-react"
import { LIFE_AREAS } from "@/src/goals/data/lifeAreas"
import { getCatalogGroups } from "@/src/goals/data/goalGraph"
import { NebulaCanvas } from "./NebulaCanvas"

interface NebulaLandingProps {
  onSelectPath: (path: "one_person" | "abundance") => void
}

/** Hex color to rgba with alpha */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

/**
 * Nebula Landing Page:
 * - Full viewport dark canvas with NebulaCanvas particle background
 * - Central "Daygame Nebula" — vivid gas cloud with two stellar cores
 * - Surrounding dimmer nebula regions for each other life area
 * - Life Area Grid below with breathing animation
 */
export function NebulaLanding({ onSelectPath }: NebulaLandingProps) {
  const { onePerson, abundance } = getCatalogGroups()
  const [hoveredArea, setHoveredArea] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Separate daygame from other areas
  const daygameArea = LIFE_AREAS.find((a) => a.id === "daygame")!
  const otherAreas = LIFE_AREAS.filter((a) => a.id !== "daygame" && a.id !== "custom")

  // Positions for surrounding nebula regions (arranged in a ring)
  const regionPositions = useMemo(() => {
    return otherAreas.map((area, i) => {
      const angle = (i / otherAreas.length) * Math.PI * 2 - Math.PI / 2
      const radiusX = 35
      const radiusY = 28
      return {
        area,
        x: 50 + Math.cos(angle) * radiusX,
        y: 48 + Math.sin(angle) * radiusY,
      }
    })
  }, [otherAreas])

  return (
    <div className="relative space-y-12">
      {/* Main nebula viewport */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: "#000005",
          minHeight: 520,
          border: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <NebulaCanvas
          particleCount={180}
          intensity={1.2}
          regions={[
            // Central daygame nebula - hot pink/orange gas cloud
            { x: 50, y: 45, rx: 35, ry: 30, color: "#f97316", opacity: 0.08, rotation: 0 },
            { x: 48, y: 42, rx: 28, ry: 25, color: "#ec4899", opacity: 0.06, rotation: 15 },
            { x: 52, y: 48, rx: 25, ry: 22, color: "#f59e0b", opacity: 0.05, rotation: -10 },
            // Surrounding life area nebulae
            ...regionPositions.map((rp) => ({
              x: rp.x,
              y: rp.y,
              rx: 15,
              ry: 12,
              color: rp.area.hex,
              opacity: 0.04,
              rotation: 0,
            })),
          ]}
        />

        {/* Central Daygame Nebula title */}
        <div
          className="absolute left-1/2 -translate-x-1/2 text-center z-10"
          style={{
            top: "6%",
            transition: "opacity 0.5s ease",
            opacity: mounted ? 1 : 0,
          }}
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-3"
            style={{
              background: "rgba(249,115,22,0.1)",
              color: "#fb923c",
              border: "1px solid rgba(249,115,22,0.2)",
              backdropFilter: "blur(8px)",
            }}
          >
            <Sparkles className="size-3.5" />
            Navigate the Nebula
          </div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{
              color: "rgba(255,255,255,0.95)",
              textShadow: "0 0 30px rgba(249,115,22,0.2), 0 0 60px rgba(236,72,153,0.1)",
            }}
          >
            Your Universe Awaits
          </h1>
          <p
            className="text-sm mt-2 max-w-md mx-auto"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            At the heart of this nebula, two stellar cores burn bright.
            Choose your path through the cosmos.
          </p>
        </div>

        {/* Two Stellar Cores — the clickable daygame paths */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
          style={{ width: "min(90%, 480px)" }}
        >
          <div className="flex gap-6 justify-center items-center">
            {/* Find the One — Pink Stellar Core */}
            <button
              onClick={() => onSelectPath("one_person")}
              className="group relative cursor-pointer transition-transform duration-500 hover:scale-105"
              style={{ width: 190 }}
            >
              {/* Outer glow ring */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: "radial-gradient(circle, rgba(236,72,153,0.15) 0%, rgba(236,72,153,0.05) 40%, transparent 70%)",
                  transform: "scale(2.2)",
                  animation: "nebulaBreathing 4s ease-in-out infinite",
                }}
              />
              {/* Core body */}
              <div
                className="relative rounded-2xl p-5 text-center overflow-hidden"
                style={{
                  background: "radial-gradient(ellipse at 50% 30%, rgba(236,72,153,0.15) 0%, rgba(236,72,153,0.04) 60%, transparent 100%)",
                  border: "1px solid rgba(236,72,153,0.2)",
                  backdropFilter: "blur(12px)",
                  boxShadow: "0 0 30px rgba(236,72,153,0.1), inset 0 0 30px rgba(236,72,153,0.05)",
                }}
              >
                {/* Lens flare effect */}
                <div
                  className="absolute -top-2 -right-2 w-8 h-8 opacity-60"
                  style={{
                    background: "radial-gradient(circle, rgba(236,72,153,0.4) 0%, transparent 70%)",
                    filter: "blur(3px)",
                  }}
                />
                <div
                  className="size-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                  style={{
                    background: "radial-gradient(circle, rgba(236,72,153,0.3) 0%, rgba(236,72,153,0.1) 60%)",
                    boxShadow: "0 0 20px rgba(236,72,153,0.3), 0 0 40px rgba(236,72,153,0.1)",
                  }}
                >
                  <div
                    className="size-4 rounded-full"
                    style={{
                      backgroundColor: "#ec4899",
                      boxShadow: "0 0 12px #ec4899, 0 0 24px rgba(236,72,153,0.5)",
                    }}
                  />
                </div>
                <h2
                  className="text-base font-bold mb-1"
                  style={{
                    color: "#f9a8d4",
                    textShadow: "0 0 12px rgba(236,72,153,0.4)",
                  }}
                >
                  Find the One
                </h2>
                <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Connection & commitment
                </p>
                <div className="space-y-1">
                  {onePerson.slice(0, 2).map((g) => (
                    <div key={g.id} className="text-[10px]" style={{ color: "rgba(236,72,153,0.5)" }}>
                      {g.title}
                    </div>
                  ))}
                  {onePerson.length > 2 && (
                    <div className="text-[10px]" style={{ color: "rgba(236,72,153,0.3)" }}>
                      +{onePerson.length - 2} more
                    </div>
                  )}
                </div>
                <div
                  className="mt-3 flex items-center justify-center gap-1 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "#ec4899" }}
                >
                  Enter <ChevronRight className="size-3" />
                </div>
              </div>
            </button>

            {/* Divider — gas stream between cores */}
            <div className="flex flex-col items-center gap-2 py-8">
              <div
                className="w-px h-16"
                style={{
                  background: "linear-gradient(180deg, rgba(236,72,153,0.3) 0%, rgba(255,255,255,0.1) 50%, rgba(249,115,22,0.3) 100%)",
                }}
              />
              <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.2)" }}>or</span>
              <div
                className="w-px h-16"
                style={{
                  background: "linear-gradient(180deg, rgba(249,115,22,0.3) 0%, rgba(255,255,255,0.1) 50%, rgba(236,72,153,0.3) 100%)",
                }}
              />
            </div>

            {/* Abundance — Orange Stellar Core */}
            <button
              onClick={() => onSelectPath("abundance")}
              className="group relative cursor-pointer transition-transform duration-500 hover:scale-105"
              style={{ width: 190 }}
            >
              {/* Outer glow ring */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: "radial-gradient(circle, rgba(249,115,22,0.15) 0%, rgba(249,115,22,0.05) 40%, transparent 70%)",
                  transform: "scale(2.2)",
                  animation: "nebulaBreathing 4s ease-in-out 1s infinite",
                }}
              />
              {/* Core body */}
              <div
                className="relative rounded-2xl p-5 text-center overflow-hidden"
                style={{
                  background: "radial-gradient(ellipse at 50% 30%, rgba(249,115,22,0.15) 0%, rgba(249,115,22,0.04) 60%, transparent 100%)",
                  border: "1px solid rgba(249,115,22,0.2)",
                  backdropFilter: "blur(12px)",
                  boxShadow: "0 0 30px rgba(249,115,22,0.1), inset 0 0 30px rgba(249,115,22,0.05)",
                }}
              >
                {/* Lens flare */}
                <div
                  className="absolute -top-2 -left-2 w-8 h-8 opacity-60"
                  style={{
                    background: "radial-gradient(circle, rgba(249,115,22,0.4) 0%, transparent 70%)",
                    filter: "blur(3px)",
                  }}
                />
                <div
                  className="size-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                  style={{
                    background: "radial-gradient(circle, rgba(249,115,22,0.3) 0%, rgba(249,115,22,0.1) 60%)",
                    boxShadow: "0 0 20px rgba(249,115,22,0.3), 0 0 40px rgba(249,115,22,0.1)",
                  }}
                >
                  <div
                    className="size-4 rounded-full"
                    style={{
                      backgroundColor: "#f97316",
                      boxShadow: "0 0 12px #f97316, 0 0 24px rgba(249,115,22,0.5)",
                    }}
                  />
                </div>
                <h2
                  className="text-base font-bold mb-1"
                  style={{
                    color: "#fdba74",
                    textShadow: "0 0 12px rgba(249,115,22,0.4)",
                  }}
                >
                  Abundance
                </h2>
                <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Freedom & experience
                </p>
                <div className="space-y-1">
                  {abundance.slice(0, 2).map((g) => (
                    <div key={g.id} className="text-[10px]" style={{ color: "rgba(249,115,22,0.5)" }}>
                      {g.title}
                    </div>
                  ))}
                  {abundance.length > 2 && (
                    <div className="text-[10px]" style={{ color: "rgba(249,115,22,0.3)" }}>
                      +{abundance.length - 2} more
                    </div>
                  )}
                </div>
                <div
                  className="mt-3 flex items-center justify-center gap-1 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "#f97316" }}
                >
                  Enter <ChevronRight className="size-3" />
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Surrounding life area nebula regions — positioned absolutely */}
        {regionPositions.map(({ area, x, y }) => {
          const Icon = area.icon
          const isHovered = hoveredArea === area.id
          return (
            <div
              key={area.id}
              className="absolute z-10 transition-all duration-500 cursor-default"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: `translate(-50%, -50%) scale(${isHovered ? 1.1 : 1})`,
              }}
              onMouseEnter={() => setHoveredArea(area.id)}
              onMouseLeave={() => setHoveredArea(null)}
            >
              {/* Nebula gas glow behind the icon */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  width: 60,
                  height: 60,
                  transform: "translate(-10px, -10px)",
                  background: `radial-gradient(circle, ${hexToRgba(area.hex, 0.15)} 0%, ${hexToRgba(area.hex, 0.03)} 50%, transparent 70%)`,
                  animation: `nebulaPulse ${3 + Math.random() * 2}s ease-in-out ${Math.random() * 2}s infinite`,
                }}
              />
              <div
                className="relative flex flex-col items-center gap-1"
                style={{ opacity: isHovered ? 1 : 0.6, transition: "opacity 0.3s" }}
              >
                <div
                  className="size-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: hexToRgba(area.hex, 0.12),
                    border: `1px solid ${hexToRgba(area.hex, 0.2)}`,
                    boxShadow: isHovered ? `0 0 16px ${hexToRgba(area.hex, 0.3)}` : "none",
                  }}
                >
                  <Icon className="size-4" style={{ color: area.hex }} />
                </div>
                <span
                  className="text-[9px] font-medium whitespace-nowrap"
                  style={{
                    color: hexToRgba(area.hex, 0.7),
                    textShadow: isHovered ? `0 0 8px ${hexToRgba(area.hex, 0.3)}` : "none",
                  }}
                >
                  {area.name}
                </span>
                {isHovered && (
                  <span
                    className="flex items-center gap-1 text-[8px] animate-in fade-in duration-200"
                    style={{ color: "rgba(255,255,255,0.3)" }}
                  >
                    <Lock className="size-2.5" />
                    Coming soon
                  </span>
                )}
              </div>
            </div>
          )
        })}

        {/* "Daygame Nebula" label at center bottom */}
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 text-center"
        >
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.2em]"
            style={{
              color: "rgba(249,115,22,0.4)",
              textShadow: "0 0 8px rgba(249,115,22,0.15)",
            }}
          >
            Dating & Daygame Nebula
          </span>
        </div>
      </div>

      {/* Life Area Grid — cards below the nebula */}
      <div>
        <h3
          className="text-sm font-semibold uppercase tracking-wider mb-4"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          Star-Forming Regions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {LIFE_AREAS.filter((a) => a.id !== "custom").map((area) => {
            const Icon = area.icon
            const isDaygame = area.id === "daygame"
            return (
              <div
                key={area.id}
                className="relative rounded-xl p-4 text-center overflow-hidden transition-transform duration-300 hover:scale-[1.03]"
                style={{
                  background: `radial-gradient(ellipse at 50% 30%, ${hexToRgba(area.hex, 0.12)} 0%, ${hexToRgba(area.hex, 0.03)} 60%, rgba(0,0,5,0.9) 100%)`,
                  border: `1px solid ${hexToRgba(area.hex, isDaygame ? 0.3 : 0.1)}`,
                  animation: `nebulaBreathing ${4 + Math.random() * 2}s ease-in-out ${Math.random() * 2}s infinite`,
                }}
              >
                {/* Active/Awaiting badge */}
                <div
                  className="absolute top-2 right-2 text-[8px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                  style={{
                    background: isDaygame ? hexToRgba(area.hex, 0.2) : "rgba(255,255,255,0.04)",
                    color: isDaygame ? area.hex : "rgba(255,255,255,0.2)",
                    border: `1px solid ${isDaygame ? hexToRgba(area.hex, 0.3) : "rgba(255,255,255,0.06)"}`,
                  }}
                >
                  {isDaygame ? "Active" : "Awaiting"}
                </div>

                <div
                  className="size-10 rounded-full mx-auto mb-2 flex items-center justify-center"
                  style={{
                    background: hexToRgba(area.hex, 0.1),
                    boxShadow: `0 0 12px ${hexToRgba(area.hex, 0.15)}`,
                  }}
                >
                  <Icon className="size-5" style={{ color: area.hex, opacity: isDaygame ? 1 : 0.6 }} />
                </div>
                <div
                  className="text-xs font-medium"
                  style={{
                    color: hexToRgba(area.hex, isDaygame ? 0.9 : 0.6),
                    textShadow: isDaygame ? `0 0 8px ${hexToRgba(area.hex, 0.2)}` : "none",
                  }}
                >
                  {area.name}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
