"use client"

import { useState, useEffect } from "react"
import { Heart, Flame, ChevronRight, Waves } from "lucide-react"
import { getCatalogGroups } from "@/src/goals/data/goalGraph"
import { LIFE_AREAS } from "@/src/goals/data/lifeAreas"

interface DeepSeaLandingProps {
  onSelectPath: (path: "one_person" | "abundance") => void
}

/** A single bioluminescent organism floating in the deep */
function Organism({
  name,
  hex,
  Icon,
  size,
  delay,
  x,
  y,
  shape,
}: {
  name: string
  hex: string
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  size: "sm" | "md"
  delay: number
  x: number
  y: number
  shape: "jellyfish" | "coral" | "anemone"
}) {
  const sizeClass = size === "md" ? "size-14" : "size-10"
  const iconSize = size === "md" ? "size-5" : "size-4"

  const shapeStyles: React.CSSProperties =
    shape === "jellyfish"
      ? { borderRadius: "50% 50% 40% 40%" }
      : shape === "coral"
        ? { borderRadius: "30% 70% 50% 50%" }
        : { borderRadius: "50%" }

  return (
    <div
      className="absolute flex flex-col items-center gap-1"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
        animation: `bioFloat ${4 + delay * 0.5}s ease-in-out ${delay}s infinite`,
      }}
    >
      <div
        className={`${sizeClass} flex items-center justify-center transition-all duration-500`}
        style={{
          ...shapeStyles,
          background: `radial-gradient(circle at 40% 35%, ${hex}35, ${hex}10 60%, transparent 80%)`,
          border: `1px solid ${hex}30`,
          boxShadow: `0 0 15px ${hex}25, 0 0 30px ${hex}10, inset 0 0 10px ${hex}10`,
          animation: `bioPulseGlow ${3 + delay * 0.3}s ease-in-out ${delay}s infinite`,
          ["--glow-color" as string]: `${hex}30`,
        }}
      >
        <Icon className={iconSize} style={{ color: hex, filter: `drop-shadow(0 0 4px ${hex}80)` }} />
      </div>

      {/* Tentacles for jellyfish shape */}
      {shape === "jellyfish" && (
        <div className="flex gap-0.5 -mt-1">
          {[0, 1, 2].map((t) => (
            <div
              key={t}
              className="w-px rounded-full"
              style={{
                height: size === "md" ? 12 : 8,
                background: `linear-gradient(to bottom, ${hex}40, transparent)`,
                animation: `tentacleSway ${2 + t * 0.3}s ease-in-out ${delay + t * 0.2}s infinite`,
                transformOrigin: "top center",
              }}
            />
          ))}
        </div>
      )}

      <span
        className="text-[9px] font-medium whitespace-nowrap"
        style={{
          color: `${hex}90`,
          textShadow: `0 0 6px ${hex}40`,
        }}
      >
        {name}
      </span>
    </div>
  )
}

/** Central jellyfish representing Daygame */
function CentralJellyfish() {
  return (
    <div
      className="relative flex flex-col items-center"
      style={{ animation: "bioFloat 6s ease-in-out infinite" }}
    >
      {/* Main bell */}
      <div
        className="relative size-28 md:size-36 flex items-center justify-center"
        style={{
          borderRadius: "50% 50% 35% 35%",
          background: `
            radial-gradient(ellipse at 40% 30%,
              rgba(0, 255, 255, 0.15) 0%,
              rgba(0, 102, 255, 0.08) 40%,
              rgba(255, 0, 255, 0.05) 70%,
              transparent 100%
            )
          `,
          border: "1px solid rgba(0, 255, 255, 0.15)",
          boxShadow: `
            0 0 30px rgba(0, 255, 255, 0.15),
            0 0 60px rgba(0, 102, 255, 0.08),
            inset 0 0 30px rgba(0, 255, 255, 0.08)
          `,
          animation: "bioPulseGlow 4s ease-in-out infinite",
          ["--glow-color" as string]: "rgba(0, 255, 255, 0.2)",
        }}
      >
        {/* Inner glow */}
        <div
          className="absolute inset-4 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(0, 255, 255, 0.12) 0%, transparent 70%)",
            animation: "bioPulse 3s ease-in-out 0.5s infinite",
          }}
        />
        <Waves className="size-10 md:size-12" style={{ color: "#00ffff", filter: "drop-shadow(0 0 8px rgba(0,255,255,0.6))" }} />
      </div>

      {/* Tentacle clusters */}
      <div className="flex gap-6 md:gap-10 -mt-2">
        {/* Left cluster — Find the One (cyan) */}
        <div className="flex flex-col items-center gap-0.5">
          {[0, 1, 2, 3, 4].map((t) => (
            <div
              key={`l-${t}`}
              className="rounded-full"
              style={{
                width: 1 + (4 - t) * 0.3,
                height: 8 + t * 3,
                background: `linear-gradient(to bottom, rgba(0, 255, 255, ${0.35 - t * 0.06}), transparent)`,
                animation: `tentacleSway ${2.5 + t * 0.4}s ease-in-out ${t * 0.15}s infinite`,
                transformOrigin: "top center",
                marginLeft: (t - 2) * 3,
              }}
            />
          ))}
          <span
            className="text-[10px] font-semibold mt-1"
            style={{ color: "#00ffff", textShadow: "0 0 8px rgba(0,255,255,0.5)" }}
          >
            Find the One
          </span>
        </div>

        {/* Right cluster — Abundance (magenta) */}
        <div className="flex flex-col items-center gap-0.5">
          {[0, 1, 2, 3, 4].map((t) => (
            <div
              key={`r-${t}`}
              className="rounded-full"
              style={{
                width: 1 + (4 - t) * 0.3,
                height: 8 + t * 3,
                background: `linear-gradient(to bottom, rgba(255, 0, 255, ${0.35 - t * 0.06}), transparent)`,
                animation: `tentacleSway ${2.5 + t * 0.4}s ease-in-out ${t * 0.15 + 0.3}s infinite`,
                transformOrigin: "top center",
                marginLeft: (t - 2) * 3,
              }}
            />
          ))}
          <span
            className="text-[10px] font-semibold mt-1"
            style={{ color: "#ff00ff", textShadow: "0 0 8px rgba(255,0,255,0.5)" }}
          >
            Abundance
          </span>
        </div>
      </div>
    </div>
  )
}

export function DeepSeaLanding({ onSelectPath }: DeepSeaLandingProps) {
  const { onePerson, abundance } = getCatalogGroups()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Life areas as organisms positioned around the central jellyfish
  const lifeAreaOrganisms = LIFE_AREAS.filter((a) => a.id !== "custom").map((area, i) => {
    const shapes: ("jellyfish" | "coral" | "anemone")[] = ["jellyfish", "coral", "anemone", "jellyfish", "coral", "anemone"]
    const positions = [
      // daygame is central, skip
      { x: 15, y: 25 },  // health
      { x: 85, y: 25 },  // career
      { x: 10, y: 60 },  // social
      { x: 88, y: 58 },  // personal growth
      { x: 50, y: 85 },  // lifestyle
      { x: 50, y: 12 },  // custom fallback
    ]
    return {
      area,
      shape: shapes[i] ?? "coral",
      position: positions[i] ?? { x: 50, y: 50 },
    }
  })

  return (
    <div className="relative space-y-8" style={{ opacity: mounted ? 1 : 0, transition: "opacity 1s ease-in" }}>
      {/* Hero text */}
      <div className="relative text-center space-y-3 pt-4">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium"
          style={{
            background: "rgba(0, 255, 255, 0.06)",
            color: "#00ffff",
            border: "1px solid rgba(0, 255, 255, 0.15)",
            boxShadow: "0 0 15px rgba(0, 255, 255, 0.08)",
          }}
        >
          <Waves className="size-3.5" />
          Explore the deep
        </div>
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{
            color: "rgba(255, 255, 255, 0.95)",
            textShadow: "0 0 30px rgba(0, 255, 255, 0.15)",
          }}
        >
          What creatures will you cultivate?
        </h1>
        <p className="max-w-lg mx-auto text-sm" style={{ color: "rgba(255, 255, 255, 0.4)" }}>
          In the deep ocean of growth, every goal is a living organism.
          Choose your path and watch your colony come alive.
        </p>
      </div>

      {/* Central jellyfish scene with surrounding organisms */}
      <div className="relative mx-auto" style={{ height: 340, maxWidth: 500 }}>
        {/* Central jellyfish */}
        <div className="absolute left-1/2 top-1/2" style={{ transform: "translate(-50%, -55%)" }}>
          <CentralJellyfish />
        </div>

        {/* Surrounding life area organisms */}
        {lifeAreaOrganisms.filter((o) => o.area.id !== "daygame").map((org, i) => (
          <Organism
            key={org.area.id}
            name={org.area.name}
            hex={org.area.hex}
            Icon={org.area.icon}
            size="sm"
            delay={i * 0.8}
            x={org.position.x}
            y={org.position.y}
            shape={org.shape}
          />
        ))}
      </div>

      {/* Two main path buttons */}
      <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
        {/* Find The One */}
        <button
          onClick={() => onSelectPath("one_person")}
          className="group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-500 cursor-pointer"
          style={{
            border: "1px solid rgba(0, 255, 255, 0.12)",
            background: "rgba(0, 255, 255, 0.02)",
            borderRadius: "24px 24px 16px 16px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(0, 255, 255, 0.35)"
            e.currentTarget.style.boxShadow = "0 0 40px rgba(0, 255, 255, 0.1), inset 0 0 30px rgba(0, 255, 255, 0.03)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(0, 255, 255, 0.12)"
            e.currentTarget.style.boxShadow = "none"
          }}
        >
          {/* Bioluminescent hover glow */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
            style={{
              background: "radial-gradient(ellipse at 30% 30%, rgba(0, 255, 255, 0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 70%, rgba(0, 102, 255, 0.05) 0%, transparent 60%)",
            }}
          />
          <div className="relative space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="rounded-full p-3"
                style={{
                  backgroundColor: "rgba(0, 255, 255, 0.08)",
                  boxShadow: "0 0 15px rgba(0, 255, 255, 0.15)",
                }}
              >
                <Heart className="size-6" style={{ color: "#00ffff", filter: "drop-shadow(0 0 4px rgba(0,255,255,0.6))" }} />
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ color: "rgba(255, 255, 255, 0.9)" }}>
                  Find the One
                </h2>
                <p className="text-xs" style={{ color: "rgba(0, 255, 255, 0.5)" }}>
                  Deep connection
                </p>
              </div>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(255, 255, 255, 0.4)" }}>
              I want to find one special person and build something real.
            </p>
            <div className="space-y-1.5">
              {onePerson.slice(0, 3).map((g) => (
                <div key={g.id} className="flex items-center gap-2 text-xs" style={{ color: "rgba(255, 255, 255, 0.35)" }}>
                  <div className="size-1.5 rounded-full" style={{ backgroundColor: "#00ffff", boxShadow: "0 0 4px rgba(0,255,255,0.5)" }} />
                  <span>{g.title}</span>
                </div>
              ))}
              {onePerson.length > 3 && (
                <div className="text-xs pl-4" style={{ color: "rgba(0, 255, 255, 0.35)" }}>
                  +{onePerson.length - 3} more organisms
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#00ffff" }}>
              Dive deeper
              <ChevronRight className="size-4" />
            </div>
          </div>
        </button>

        {/* Abundance */}
        <button
          onClick={() => onSelectPath("abundance")}
          className="group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-500 cursor-pointer"
          style={{
            border: "1px solid rgba(255, 0, 255, 0.12)",
            background: "rgba(255, 0, 255, 0.02)",
            borderRadius: "24px 24px 16px 16px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(255, 0, 255, 0.35)"
            e.currentTarget.style.boxShadow = "0 0 40px rgba(255, 0, 255, 0.1), inset 0 0 30px rgba(255, 0, 255, 0.03)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255, 0, 255, 0.12)"
            e.currentTarget.style.boxShadow = "none"
          }}
        >
          {/* Bioluminescent hover glow */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
            style={{
              background: "radial-gradient(ellipse at 30% 30%, rgba(255, 0, 255, 0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 70%, rgba(255, 0, 128, 0.05) 0%, transparent 60%)",
            }}
          />
          <div className="relative space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="rounded-full p-3"
                style={{
                  backgroundColor: "rgba(255, 0, 255, 0.08)",
                  boxShadow: "0 0 15px rgba(255, 0, 255, 0.15)",
                }}
              >
                <Flame className="size-6" style={{ color: "#ff00ff", filter: "drop-shadow(0 0 4px rgba(255,0,255,0.6))" }} />
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ color: "rgba(255, 255, 255, 0.9)" }}>
                  Abundance
                </h2>
                <p className="text-xs" style={{ color: "rgba(255, 0, 255, 0.5)" }}>
                  Freedom & variety
                </p>
              </div>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(255, 255, 255, 0.4)" }}>
              I want to experience abundance and freedom in dating.
            </p>
            <div className="space-y-1.5">
              {abundance.slice(0, 3).map((g) => (
                <div key={g.id} className="flex items-center gap-2 text-xs" style={{ color: "rgba(255, 255, 255, 0.35)" }}>
                  <div className="size-1.5 rounded-full" style={{ backgroundColor: "#ff00ff", boxShadow: "0 0 4px rgba(255,0,255,0.5)" }} />
                  <span>{g.title}</span>
                </div>
              ))}
              {abundance.length > 3 && (
                <div className="text-xs pl-4" style={{ color: "rgba(255, 0, 255, 0.35)" }}>
                  +{abundance.length - 3} more organisms
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#ff00ff" }}>
              Dive deeper
              <ChevronRight className="size-4" />
            </div>
          </div>
        </button>
      </div>

      {/* Life area ecosystem grid */}
      <div className="max-w-3xl mx-auto space-y-3">
        <h3
          className="text-xs font-semibold uppercase tracking-wider text-center"
          style={{ color: "rgba(255, 255, 255, 0.25)" }}
        >
          Your ecosystem
        </h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {LIFE_AREAS.filter((a) => a.id !== "custom").map((area) => {
            const AreaIcon = area.icon
            return (
              <div
                key={area.id}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-300"
                style={{
                  background: `rgba(${hexToRgb(area.hex)}, 0.03)`,
                  border: `1px solid rgba(${hexToRgb(area.hex)}, 0.1)`,
                }}
              >
                <div
                  className="size-8 rounded-full flex items-center justify-center"
                  style={{
                    background: `rgba(${hexToRgb(area.hex)}, 0.1)`,
                    boxShadow: `0 0 10px rgba(${hexToRgb(area.hex)}, 0.15)`,
                  }}
                >
                  <AreaIcon
                    className="size-4"
                    style={{
                      color: area.hex,
                      filter: `drop-shadow(0 0 3px ${area.hex}80)`,
                    }}
                  />
                </div>
                <span
                  className="text-[9px] font-medium text-center leading-tight"
                  style={{ color: `${area.hex}90` }}
                >
                  {area.name}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** Convert hex color to RGB string */
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}
