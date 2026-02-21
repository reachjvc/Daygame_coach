"use client"

import { useMemo } from "react"
import { Trophy } from "lucide-react"
import { GlassCard } from "./GlassCard"
import { CATEGORY_COLORS, SETUP_TIER_ORDER } from "./setupConstants"
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/src/goals/config"
import type {
  GoalTemplate,
  LifeAreaConfig,
  GoalDisplayCategory,
  BadgeStatus,
  SetupCustomGoal,
  SetupCustomCategory,
  DaygamePath,
} from "@/src/goals/types"
import { getParents } from "@/src/goals/data/goalGraph"

export function SummaryStep({
  daygameL3Goals,
  lifeAreas,
  selectedAreas,
  selectedGoals,
  targets,
  path,
  customGoals,
  customCategories,
}: {
  daygameL3Goals: GoalTemplate[]
  lifeAreas: LifeAreaConfig[]
  selectedAreas: Set<string>
  selectedGoals: Set<string>
  targets: Record<string, number>
  path: DaygamePath | null
  customGoals: SetupCustomGoal[]
  customCategories: SetupCustomCategory[]
}) {
  const selectedDaygameL3s = daygameL3Goals.filter((g) => selectedGoals.has(g.id))

  const daygameGrouped = useMemo(() => {
    const groups: Record<string, GoalTemplate[]> = {}
    for (const g of selectedDaygameL3s) {
      const cat = g.displayCategory ?? "other"
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(g)
    }
    return CATEGORY_ORDER.filter((cat) => groups[cat] && groups[cat].length > 0).map((cat) => ({
      category: cat,
      goals: groups[cat],
    }))
  }, [selectedDaygameL3s])

  const otherAreaData = lifeAreas
    .filter((a) => selectedAreas.has(a.id) && a.id !== "daygame" && a.id !== "custom")
    .map((area) => ({
      area,
      goals: (area.suggestions ?? [])
        .map((s, i) => ({
          id: `${area.id}_s${i}`,
          title: s.title,
          defaultTarget: s.defaultTarget,
          period: s.defaultPeriod,
        }))
        .filter((s) => selectedGoals.has(s.id)),
    }))
    .filter((a) => a.goals.length > 0)

  const namedCustomGoals = customGoals.filter((g) => g.title.trim())
  const totalGoals =
    selectedDaygameL3s.length +
    otherAreaData.reduce((sum, a) => sum + a.goals.length, 0) +
    namedCustomGoals.length
  const totalAreas = 1 + otherAreaData.length

  // Compute L2 achievements preview from selected L3 goals
  const sortedBadges = useMemo(() => {
    const l2Map = new Map<string, GoalTemplate>()
    for (const g of selectedDaygameL3s) {
      const parents = getParents(g.id)
      for (const p of parents) {
        if (p.level === 2 && !l2Map.has(p.id)) {
          l2Map.set(p.id, p)
        }
      }
    }
    const badges: BadgeStatus[] = Array.from(l2Map.values()).map((l2) => ({
      badgeId: l2.id,
      title: l2.title,
      progress: 0,
      tier: "none" as const,
      unlocked: false,
    }))
    return badges.sort(
      (a, b) => (SETUP_TIER_ORDER[a.tier] ?? 4) - (SETUP_TIER_ORDER[b.tier] ?? 4)
    )
  }, [selectedDaygameL3s])

  const TIER_COLORS: Record<string, string> = {
    diamond: "#b9f2ff",
    gold: "#ffd700",
    silver: "#c0c0c0",
    bronze: "#cd7f32",
    none: "#6366f1",
  }

  return (
    <div className="min-h-screen pt-12 pb-36 px-6">
      <style>{`
        @keyframes v9c-pour-in {
          0% { opacity: 0; transform: translateY(-40px) scaleY(0.8); filter: blur(8px); }
          60% { opacity: 1; transform: translateY(4px) scaleY(1.02); filter: blur(0px); }
          80% { transform: translateY(-2px) scaleY(0.99); }
          100% { opacity: 1; transform: translateY(0px) scaleY(1); filter: blur(0px); }
        }
        .v9c-stagger-enter {
          animation: v9c-pour-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        @keyframes v9c-glow-pulse {
          0%, 100% { box-shadow: 0 0 15px var(--glow-color, rgba(0,230,118,0.15)), inset 0 1px 0 rgba(255,255,255,0.03); }
          50% { box-shadow: 0 0 25px var(--glow-color, rgba(0,230,118,0.25)), inset 0 1px 0 rgba(255,255,255,0.05); }
        }
      `}</style>

      <div className="mx-auto max-w-2xl">
        <div className="text-center mb-8 v9c-stagger-enter">
          <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-emerald-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
            System Ready
          </h2>
          <p className="text-white/30 text-sm">
            {totalGoals} goals across {totalAreas} life area{totalAreas > 1 ? "s" : ""}
            {path && ` \u00B7 ${path === "fto" ? "Find The One" : "Abundance"} path`}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: "Total Goals", value: String(totalGoals), color: "#00E676" },
            { label: "Life Areas", value: String(totalAreas), color: "#7C4DFF" },
            { label: "Achievements", value: String(sortedBadges.length), color: "#FF4081" },
          ].map((stat, i) => (
            <GlassCard key={stat.label} glowColor={stat.color} className="v9c-stagger-enter" style={{ animationDelay: `${50 + i * 60}ms` }}>
              <div className="p-3 text-center">
                <div className="text-lg font-bold" style={{ color: stat.color }}>
                  {stat.value}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-white/30">
                  {stat.label}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        {sortedBadges.length > 0 && (
          <GlassCard className="mb-6 v9c-stagger-enter" glowColor="#FF4081" style={{ animationDelay: "230ms" }}>
            <div
              className="px-5 py-3 flex items-center justify-between"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-center gap-2">
                <Trophy className="size-3.5" style={{ color: "#FF4081" }} />
                <span className="text-sm font-semibold uppercase tracking-wider text-pink-400/80">
                  Achievements You&apos;ll Unlock
                </span>
              </div>
              <span className="text-xs text-white/30">{sortedBadges.length} badges</span>
            </div>
            <div className="px-5 py-3 space-y-2.5">
              {sortedBadges.map((badge) => (
                <div key={badge.badgeId} className="flex items-center gap-3">
                  <div
                    className="size-6 rounded-full flex items-center justify-center"
                    style={{
                      background: `${TIER_COLORS[badge.tier]}12`,
                      border: `1px solid ${TIER_COLORS[badge.tier]}25`,
                      boxShadow: `0 0 8px ${TIER_COLORS[badge.tier]}10`,
                    }}
                  >
                    <Trophy className="size-3" style={{ color: TIER_COLORS[badge.tier] }} />
                  </div>
                  <span className="text-sm text-white/80 flex-1">{badge.title}</span>
                  <span
                    className="text-[10px] uppercase font-medium"
                    style={{ color: TIER_COLORS[badge.tier] }}
                  >
                    {badge.tier === "none" ? "locked" : badge.tier}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {daygameGrouped.map(({ category, goals }, catIdx) => {
          const catColor = CATEGORY_COLORS[category] ?? "#00E676"
          return (
            <div key={category} className="mb-3 rounded-xl overflow-hidden v9c-stagger-enter"
              style={{
                animationDelay: `${280 + catIdx * 50}ms`,
                background: "linear-gradient(135deg, rgba(0,255,127,0.02), rgba(124,77,255,0.02), rgba(255,255,255,0.03))",
                backdropFilter: "blur(12px)",
                borderTop: `2px solid ${catColor}40`,
                borderLeft: "1px solid rgba(0,255,127,0.06)",
                borderRight: "1px solid rgba(124,77,255,0.06)",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                "--glow-color": `${catColor}12`,
                animation: "v9c-glow-pulse 5s ease-in-out infinite",
              } as React.CSSProperties}
            >
              <div className="px-5 py-3 flex items-center justify-between"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
              >
                <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: `${catColor}` }}>
                  {CATEGORY_LABELS[category] ?? category.replace(/_/g, " ")}
                </span>
                <span className="text-xs text-white/25">{goals.length} goals</span>
              </div>
              <div className="px-5 py-3 space-y-2">
                {goals.map((g) => {
                  const target =
                    targets[g.id] ??
                    g.defaultMilestoneConfig?.target ??
                    g.defaultRampSteps?.[0]?.frequencyPerWeek ??
                    "\u2014"
                  return (
                    <div key={g.id} className="flex items-center gap-3">
                      <div
                        className="size-1.5 rounded-full"
                        style={{ background: catColor, boxShadow: `0 0 4px ${catColor}40` }}
                      />
                      <span className="text-sm text-white/70 flex-1">{g.title}</span>
                      <span className="text-xs font-medium" style={{ color: catColor }}>{target}</span>
                      <span className="text-[10px] uppercase text-white/20">
                        {g.templateType === "habit_ramp" ? "/wk" : "total"}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {otherAreaData.map(({ area, goals }, areaIdx) => (
          <div key={area.id} className="mb-3 rounded-xl overflow-hidden v9c-stagger-enter"
            style={{
              animationDelay: `${380 + areaIdx * 50}ms`,
              background: "linear-gradient(135deg, rgba(0,255,127,0.02), rgba(124,77,255,0.02), rgba(255,255,255,0.03))",
              backdropFilter: "blur(12px)",
              borderTop: `2px solid ${area.hex}40`,
              borderLeft: "1px solid rgba(0,255,127,0.06)",
              borderRight: "1px solid rgba(124,77,255,0.06)",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              "--glow-color": `${area.hex}12`,
              animation: "v9c-glow-pulse 5s ease-in-out infinite",
            } as React.CSSProperties}
          >
            <div className="px-5 py-3 flex items-center justify-between"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
            >
              <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: area.hex }}>
                {area.name}
              </span>
              <span className="text-xs text-white/25">{goals.length} goals</span>
            </div>
            <div className="px-5 py-3 space-y-2">
              {goals.map((g) => (
                <div key={g.id} className="flex items-center gap-3">
                  <div
                    className="size-1.5 rounded-full"
                    style={{ background: area.hex, boxShadow: `0 0 4px ${area.hex}40` }}
                  />
                  <span className="text-sm text-white/70 flex-1">{g.title}</span>
                  <span className="text-xs font-medium" style={{ color: area.hex }}>
                    {targets[g.id] ?? g.defaultTarget}
                  </span>
                  <span className="text-[10px] uppercase text-white/20">/{g.period}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {(() => {
          const byCat: Record<string, SetupCustomGoal[]> = {}
          for (const g of namedCustomGoals) {
            if (!byCat[g.categoryId]) byCat[g.categoryId] = []
            byCat[g.categoryId].push(g)
          }
          const entries = Object.entries(byCat)
          if (entries.length === 0) return null

          return entries.map(([catId, goals], cIdx) => {
            const catLabel =
              customCategories.find((c) => c.id === catId)?.name ||
              CATEGORY_LABELS[catId as GoalDisplayCategory] ||
              catId
            return (
              <div key={catId} className="mb-3 rounded-xl overflow-hidden v9c-stagger-enter"
                style={{
                  animationDelay: `${450 + cIdx * 50}ms`,
                  background: "linear-gradient(135deg, rgba(0,255,127,0.02), rgba(124,77,255,0.02), rgba(255,255,255,0.03))",
                  backdropFilter: "blur(12px)",
                  borderTop: "2px solid rgba(0,230,118,0.3)",
                  borderLeft: "1px solid rgba(0,255,127,0.06)",
                  borderRight: "1px solid rgba(124,77,255,0.06)",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  "--glow-color": "rgba(0,230,118,0.12)",
                  animation: "v9c-glow-pulse 5s ease-in-out infinite",
                } as React.CSSProperties}
              >
                <div className="px-5 py-3 flex items-center justify-between"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <span className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
                    {catLabel}{" "}
                    <span className="text-[10px] normal-case font-normal text-white/20">
                      (custom)
                    </span>
                  </span>
                  <span className="text-xs text-white/25">{goals.length} goals</span>
                </div>
                <div className="px-5 py-3 space-y-2">
                  {goals.map((g) => (
                    <div key={g.id} className="flex items-center gap-3">
                      <div
                        className="size-1.5 rounded-full"
                        style={{ background: "#00E676", boxShadow: "0 0 4px rgba(0,230,118,0.4)" }}
                      />
                      <span className="text-sm text-white/70 flex-1">{g.title}</span>
                      <span className="text-xs font-medium text-emerald-400">
                        {targets[g.id] ?? g.target}
                      </span>
                      <span className="text-[10px] uppercase text-white/20">total</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        })()}
      </div>
    </div>
  )
}
