"use client"

/**
 * Variant D: "Living Dashboard" — Non-Linear Explorer
 *
 * Theme: Aurora + ghost data that becomes real
 * Hierarchy: Flat (L1→L3 only, no L2 in tree)
 * Flow: Non-linear — landing IS the dashboard with ghost/placeholder data
 * Fork: Area-First, Fork Inside (daygame area has FTO/Abundance sub-choice)
 *
 * Key concept: No wizard steps. User sees a dashboard preview with ghost data.
 * Tapping a life area drills into a mini-flow: pick L1 → toggle L3s → set targets.
 * Ghost data becomes real progressively. "Done" when user says done.
 */

import { useState, useCallback } from "react"
import {
  ChevronRight,
  Check,
  X,
  Zap,
} from "lucide-react"
import { useFlatModelData, useLifeAreas, type DaygamePath } from "./useGoalData"
import type { GoalTemplate, LifeAreaConfig } from "@/src/goals/types"

// ============================================================================
// Types
// ============================================================================

interface AreaState {
  configured: boolean
  selectedGoals: Set<string>
  path?: DaygamePath
}

// ============================================================================
// Ghost Data Dashboard
// ============================================================================

function GhostMetricCard({ label, value, isReal }: { label: string; value: string; isReal: boolean }) {
  return (
    <div
      className="rounded-xl p-4 transition-all"
      style={{
        background: isReal
          ? "rgba(6,182,212,0.08)"
          : "rgba(255,255,255,0.02)",
        border: isReal
          ? "1px solid rgba(6,182,212,0.2)"
          : "1px solid rgba(255,255,255,0.05)",
        opacity: isReal ? 1 : 0.4,
      }}
    >
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-xs text-white/40">{label}</div>
      {!isReal && (
        <div className="mt-2 text-[10px] text-white/20 italic">configure to activate</div>
      )}
    </div>
  )
}

function AreaWeatherCard({
  area,
  state,
  onClick,
}: {
  area: LifeAreaConfig
  state: AreaState | undefined
  onClick: () => void
}) {
  const isConfigured = state?.configured ?? false
  const goalCount = state?.selectedGoals.size ?? 0
  // Pulse intensity based on goal count
  const pulseOpacity = isConfigured ? Math.min(0.15 + goalCount * 0.03, 0.4) : 0.04

  return (
    <button
      onClick={onClick}
      className="group relative rounded-2xl p-5 text-left transition-all hover:scale-[1.01]"
      style={{
        background: `linear-gradient(135deg, ${area.hex}${isConfigured ? "18" : "08"}, transparent)`,
        border: `1px solid ${area.hex}${isConfigured ? "40" : "15"}`,
      }}
    >
      {/* Pulse indicator */}
      <div
        className="absolute top-3 right-3 size-3 rounded-full"
        style={{
          background: area.hex,
          opacity: pulseOpacity,
          boxShadow: isConfigured ? `0 0 12px ${area.hex}60` : "none",
          animation: isConfigured ? "pulse 2s ease-in-out infinite" : "none",
        }}
      />

      <div className="flex items-center gap-3 mb-3">
        <area.icon className="size-5" style={{ color: area.hex }} />
        <h3 className={`font-semibold ${isConfigured ? "text-white" : "text-white/50"}`}>
          {area.name}
        </h3>
      </div>

      {isConfigured ? (
        <div className="flex items-center gap-2">
          <Check className="size-3.5 text-green-400" />
          <span className="text-sm text-green-400/80">{goalCount} goals active</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <ChevronRight className="size-3.5 text-white/20 group-hover:text-white/40 transition-colors" />
          <span className="text-sm text-white/30 group-hover:text-white/50 transition-colors">
            Tap to configure
          </span>
        </div>
      )}
    </button>
  )
}

// ============================================================================
// Area Drill-In Panel
// ============================================================================

function AreaDrillIn({
  area,
  goals,
  state,
  onSave,
  onClose,
}: {
  area: LifeAreaConfig
  goals: GoalTemplate[]
  state: AreaState
  onSave: (state: AreaState) => void
  onClose: () => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(state.selectedGoals))
  const [path, setPath] = useState<DaygamePath | undefined>(state.path)
  const isDaygame = area.id === "daygame"

  const l3Goals = goals.filter((g) => g.level === 3)

  // Group by category
  const grouped: Record<string, GoalTemplate[]> = {}
  for (const g of l3Goals) {
    const cat = g.displayCategory ?? "general"
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(g)
  }

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSave = () => {
    onSave({ configured: selected.size > 0, selectedGoals: selected, path })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 pb-8 px-4 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)" }}
    >
      <div className="w-full max-w-xl rounded-2xl overflow-hidden"
        style={{ background: "#0d1117", border: `1px solid ${area.hex}30` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: `1px solid ${area.hex}20` }}
        >
          <div className="flex items-center gap-3">
            <area.icon className="size-5" style={{ color: area.hex }} />
            <h2 className="text-lg font-semibold text-white">{area.name}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
            <X className="size-5 text-white/50" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Daygame path fork */}
          {isDaygame && (
            <div>
              <p className="text-sm text-white/50 mb-3">Your direction:</p>
              <div className="grid grid-cols-2 gap-3">
                {(["fto", "abundance"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPath(p)}
                    className="rounded-xl p-3 text-left transition-all"
                    style={{
                      background: path === p ? `${area.hex}15` : "rgba(255,255,255,0.03)",
                      border: path === p ? `1px solid ${area.hex}40` : "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <span className="text-sm font-medium text-white">
                      {p === "fto" ? "💜 Find The One" : "🔥 Abundance"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* L3 goal toggles by category */}
          {Object.entries(grouped).map(([cat, catGoals]) => (
            <div key={cat}>
              <h3 className="text-xs uppercase tracking-wider text-white/30 mb-2">
                {cat.replace(/_/g, " ")}
              </h3>
              <div className="space-y-1.5">
                {catGoals.map((g) => {
                  const isOn = selected.has(g.id)
                  return (
                    <button
                      key={g.id}
                      onClick={() => toggle(g.id)}
                      className="w-full flex items-center gap-3 rounded-lg px-4 py-2.5 text-left transition-all"
                      style={{
                        background: isOn ? `${area.hex}10` : "rgba(255,255,255,0.02)",
                        border: isOn ? `1px solid ${area.hex}30` : "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <div
                        className="size-5 rounded flex items-center justify-center shrink-0"
                        style={{
                          background: isOn ? area.hex : "rgba(255,255,255,0.08)",
                        }}
                      >
                        {isOn && <Check className="size-3 text-white" />}
                      </div>
                      <span className={`text-sm ${isOn ? "text-white" : "text-white/50"}`}>
                        {g.title}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ borderTop: `1px solid ${area.hex}15` }}
        >
          <span className="text-sm text-white/40">{selected.size} goals selected</span>
          <button
            onClick={handleSave}
            className="px-6 py-2 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: area.hex }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export default function VariantD() {
  const data = useFlatModelData()
  const lifeAreas = useLifeAreas()
  const [areaStates, setAreaStates] = useState<Record<string, AreaState>>({})
  const [drillArea, setDrillArea] = useState<string | null>(null)

  const configuredCount = Object.values(areaStates).filter((s) => s.configured).length
  const totalGoals = Object.values(areaStates).reduce((sum, s) => sum + s.selectedGoals.size, 0)

  const handleSave = useCallback((areaId: string, state: AreaState) => {
    setAreaStates((prev) => ({ ...prev, [areaId]: state }))
    setDrillArea(null)
  }, [])

  const drillAreaConfig = drillArea ? lifeAreas.find((a) => a.id === drillArea) : null
  const drillAreaData = drillArea ? data.areas.find((a) => a.lifeArea.id === drillArea) : null

  return (
    <div className="min-h-screen" style={{ background: "#0a0a1a" }}>
      {/* Aurora ambient background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a2e] via-[#0d1117] to-[#0a0a1a]" />
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #06b6d4, transparent)", filter: "blur(80px)" }} />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #8b5cf6, transparent)", filter: "blur(60px)" }} />
      </div>

      {/* Dashboard header */}
      <div className="pt-20 px-6">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="size-6 text-cyan-400" />
            <h1 className="text-2xl font-bold text-white">Your Dashboard</h1>
          </div>
          <p className="text-white/40 mb-8">
            Configure each life area. Ghost data becomes real as you activate goals.
          </p>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            <GhostMetricCard label="Areas Active" value={`${configuredCount}/7`} isReal={configuredCount > 0} />
            <GhostMetricCard label="Total Goals" value={String(totalGoals)} isReal={totalGoals > 0} />
            <GhostMetricCard label="Weekly Actions" value={totalGoals > 0 ? String(Math.round(totalGoals * 0.7)) : "—"} isReal={totalGoals > 0} />
          </div>

          {/* Life area grid */}
          <h2 className="text-sm uppercase tracking-wider text-white/30 mb-4">Life Areas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-12">
            {lifeAreas.map((area) => (
              <AreaWeatherCard
                key={area.id}
                area={area}
                state={areaStates[area.id]}
                onClick={() => setDrillArea(area.id)}
              />
            ))}
          </div>

          {/* Badge preview (from flat model) */}
          {data.badges.length > 0 && totalGoals > 0 && (
            <div className="mt-8 pb-12">
              <h2 className="text-sm uppercase tracking-wider text-white/30 mb-4">Achievement Badges</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {data.badges.slice(0, 8).map((badge) => (
                  <div key={badge.badgeId} className="rounded-xl p-3 text-center"
                    style={{
                      background: badge.unlocked ? "rgba(212,168,67,0.08)" : "rgba(255,255,255,0.02)",
                      border: badge.unlocked ? "1px solid rgba(212,168,67,0.3)" : "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <div className="text-lg mb-1">
                      {badge.tier === "diamond" ? "💎" : badge.tier === "gold" ? "🥇" : badge.tier === "silver" ? "🥈" : badge.tier === "bronze" ? "🥉" : "⬜"}
                    </div>
                    <div className="text-xs text-white/60 mb-1 line-clamp-1">{badge.title}</div>
                    <div className="text-[10px] text-white/30">{Math.round(badge.progress * 100)}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Drill-in overlay */}
      {drillArea && drillAreaConfig && drillAreaData && (
        <AreaDrillIn
          area={drillAreaConfig}
          goals={[...drillAreaData.l1Goals, ...drillAreaData.l3Goals]}
          state={areaStates[drillArea] ?? { configured: false, selectedGoals: new Set() }}
          onSave={(state) => handleSave(drillArea, state)}
          onClose={() => setDrillArea(null)}
        />
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  )
}
