"use client"

import { Heart, Flame, ChevronRight, Anvil } from "lucide-react"
import { LIFE_AREAS } from "@/src/goals/data/lifeAreas"
import { getCatalogGroups } from "@/src/goals/data/goalGraph"

interface ForgeLandingProps {
  onSelectPath: (path: "one_person" | "abundance") => void
  onSelectLifeArea: (areaId: string) => void
}

export function ForgeLanding({ onSelectPath, onSelectLifeArea }: ForgeLandingProps) {
  const { onePerson, abundance } = getCatalogGroups()
  const visibleAreas = LIFE_AREAS.filter((a) => a.id !== "custom" && a.id !== "daygame")

  return (
    <div className="space-y-10">
      {/* Hero — Forge themed */}
      <div className="text-center space-y-3 pt-4">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium"
          style={{ backgroundColor: "rgba(234, 88, 12, 0.1)", color: "#ea580c" }}
        >
          <Anvil className="size-3.5" />
          Enter The Forge
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Shape Your Path to Mastery
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto text-sm">
          In The Forge, you will select your goals, customize them, and then hammer out the
          shape of your growth curve for each category. What kind of man do you want to become?
        </p>
      </div>

      {/* Two Main Paths */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
        {/* Find The One */}
        <button
          onClick={() => onSelectPath("one_person")}
          className="group relative overflow-hidden rounded-2xl border-2 border-border p-6 text-left transition-all duration-300 hover:border-pink-500/50 hover:shadow-[0_0_30px_rgba(236,72,153,0.1)] cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 via-transparent to-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-pink-500/10 p-3">
                <Heart className="size-6 text-pink-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Find the One</h2>
                <p className="text-xs text-muted-foreground">Connection & commitment</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              I want to find one special person and build something real.
            </p>
            <div className="space-y-1.5">
              {onePerson.slice(0, 3).map((g) => (
                <div key={g.id} className="flex items-center gap-2 text-xs text-muted-foreground/80">
                  <ChevronRight className="size-3 text-pink-400/60" />
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
              Forge this path
              <ChevronRight className="size-4" />
            </div>
          </div>
        </button>

        {/* Abundance */}
        <button
          onClick={() => onSelectPath("abundance")}
          className="group relative overflow-hidden rounded-2xl border-2 border-border p-6 text-left transition-all duration-300 hover:border-orange-500/50 hover:shadow-[0_0_30px_rgba(249,115,22,0.1)] cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-orange-500/10 p-3">
                <Flame className="size-6 text-orange-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Abundance</h2>
                <p className="text-xs text-muted-foreground">Freedom & experience</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              I want to experience abundance and freedom in dating.
            </p>
            <div className="space-y-1.5">
              {abundance.slice(0, 3).map((g) => (
                <div key={g.id} className="flex items-center gap-2 text-xs text-muted-foreground/80">
                  <ChevronRight className="size-3 text-orange-400/60" />
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
              Forge this path
              <ChevronRight className="size-4" />
            </div>
          </div>
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 max-w-3xl mx-auto">
        <div className="flex-1 border-t border-border/40" />
        <span className="text-xs text-muted-foreground/50 uppercase tracking-widest font-medium">Other life areas</span>
        <div className="flex-1 border-t border-border/40" />
      </div>

      {/* Other Life Areas Grid */}
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
