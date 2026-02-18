"use client"

import {
  Heart,
  Flame,
  ChevronRight,
  Sprout,
  Sun,
  Leaf,
  Snowflake,
  TreePine,
} from "lucide-react"
import { LIFE_AREAS } from "@/src/goals/data/lifeAreas"
import { getCatalogGroups } from "@/src/goals/data/goalGraph"

interface SeasonLandingProps {
  onSelectPath: (path: "one_person" | "abundance") => void
  onSelectLifeArea: (areaId: string) => void
}

const SEASONS_PREVIEW = [
  { icon: Sprout, label: "Spring", color: "#86efac", subtitle: "Plant seeds" },
  { icon: Sun, label: "Summer", color: "#fbbf24", subtitle: "Grow strong" },
  { icon: Leaf, label: "Fall", color: "#f97316", subtitle: "Harvest" },
  {
    icon: Snowflake,
    label: "Winter",
    color: "#93c5fd",
    subtitle: "Reflect",
  },
]

export function SeasonLanding({
  onSelectPath,
  onSelectLifeArea,
}: SeasonLandingProps) {
  const { onePerson, abundance } = getCatalogGroups()
  const visibleAreas = LIFE_AREAS.filter(
    (a) => a.id !== "custom" && a.id !== "daygame"
  )

  return (
    <div className="space-y-10">
      {/* Hero with seasonal decorative strip */}
      <div className="text-center space-y-4 pt-4">
        {/* Seasonal icon strip */}
        <div className="flex items-center justify-center gap-6 mb-3">
          {SEASONS_PREVIEW.map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1">
              <div
                className="rounded-full p-2"
                style={{ backgroundColor: `${s.color}18` }}
              >
                <s.icon className="size-4" style={{ color: s.color }} />
              </div>
              <span
                className="text-[10px] font-medium"
                style={{ color: s.color }}
              >
                {s.subtitle}
              </span>
            </div>
          ))}
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-green-500/10 via-amber-500/10 to-blue-500/10 text-sm font-medium">
          <TreePine className="size-3.5 text-green-600" />
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(to right, #86efac, #fbbf24, #f97316, #93c5fd)",
            }}
          >
            Season Planner
          </span>
        </div>

        <h1 className="text-3xl font-bold tracking-tight">
          Plan Your Growth Year
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto text-sm leading-relaxed">
          Nature doesn't rush, and neither should you. Map your goals across
          four seasons -- from planting first seeds in spring to harvesting
          results by fall.
        </p>
      </div>

      {/* Two Main Paths -- garden bed cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
        {/* Find The One */}
        <button
          onClick={() => onSelectPath("one_person")}
          className="group relative overflow-hidden rounded-2xl border-2 border-border p-6 text-left transition-all duration-300 hover:border-pink-400/50 hover:shadow-[0_0_30px_rgba(236,72,153,0.08)] cursor-pointer"
        >
          {/* Nature-inspired gradient bg */}
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 via-green-500/3 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          {/* Subtle leaf decoration */}
          <div className="absolute -bottom-3 -right-3 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity">
            <Sprout className="size-24 text-pink-400" />
          </div>

          <div className="relative space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-pink-500/10 p-3">
                <Heart className="size-6 text-pink-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Find the One</h2>
                <p className="text-xs text-muted-foreground">
                  Nurture a deep connection
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              I want to find one special person and build something real.
            </p>
            <div className="space-y-1.5">
              {onePerson.slice(0, 3).map((g) => (
                <div
                  key={g.id}
                  className="flex items-center gap-2 text-xs text-muted-foreground/80"
                >
                  <Sprout className="size-3 text-pink-400/60" />
                  <span>{g.title}</span>
                </div>
              ))}
              {onePerson.length > 3 && (
                <div className="text-xs text-pink-400/60 pl-5">
                  +{onePerson.length - 3} more paths
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity">
              Plant this seed
              <ChevronRight className="size-4" />
            </div>
          </div>
        </button>

        {/* Abundance */}
        <button
          onClick={() => onSelectPath("abundance")}
          className="group relative overflow-hidden rounded-2xl border-2 border-border p-6 text-left transition-all duration-300 hover:border-orange-400/50 hover:shadow-[0_0_30px_rgba(249,115,22,0.08)] cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-amber-500/3 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute -bottom-3 -right-3 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity">
            <Sun className="size-24 text-orange-400" />
          </div>

          <div className="relative space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-orange-500/10 p-3">
                <Flame className="size-6 text-orange-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Abundance</h2>
                <p className="text-xs text-muted-foreground">
                  Grow a rich garden
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              I want to experience abundance and freedom in dating.
            </p>
            <div className="space-y-1.5">
              {abundance.slice(0, 3).map((g) => (
                <div
                  key={g.id}
                  className="flex items-center gap-2 text-xs text-muted-foreground/80"
                >
                  <Sun className="size-3 text-orange-400/60" />
                  <span>{g.title}</span>
                </div>
              ))}
              {abundance.length > 3 && (
                <div className="text-xs text-orange-400/60 pl-5">
                  +{abundance.length - 3} more paths
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity">
              Plant this seed
              <ChevronRight className="size-4" />
            </div>
          </div>
        </button>
      </div>

      {/* Season preview strip */}
      <div className="max-w-3xl mx-auto rounded-xl border border-border/50 overflow-hidden">
        <div className="grid grid-cols-4">
          {SEASONS_PREVIEW.map((s, i) => (
            <div
              key={s.label}
              className="flex flex-col items-center gap-1.5 py-4 px-2 text-center"
              style={{
                backgroundColor: `${s.color}06`,
                borderRight:
                  i < 3 ? "1px solid var(--border)" : undefined,
              }}
            >
              <s.icon className="size-5" style={{ color: s.color }} />
              <span
                className="text-xs font-semibold"
                style={{ color: s.color }}
              >
                {s.label}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {s.subtitle}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 max-w-3xl mx-auto">
        <div className="flex-1 border-t border-border/40" />
        <span className="text-xs text-muted-foreground/50 uppercase tracking-widest font-medium">
          Other life areas
        </span>
        <div className="flex-1 border-t border-border/40" />
      </div>

      {/* Other Life Areas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 max-w-3xl mx-auto">
        {visibleAreas.map((area) => {
          const Icon = area.icon
          return (
            <button
              key={area.id}
              onClick={() => onSelectLifeArea(area.id)}
              className="group flex flex-col items-center gap-2.5 rounded-xl border border-border/50 p-4 transition-all duration-200 hover:border-border hover:bg-muted/30 cursor-pointer"
            >
              <div
                className="rounded-lg p-2.5 transition-colors"
                style={{ backgroundColor: `${area.hex}12` }}
              >
                <Icon className="size-5" style={{ color: area.hex }} />
              </div>
              <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center">
                {area.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
