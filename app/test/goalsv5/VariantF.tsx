"use client"

/**
 * Variant F: "Trophy Room" — Achievement Extraction Test
 *
 * Theme: Aurora landing + simplified flat picker + trophy wall
 * Hierarchy: Flat (L1→L3 only) + separate badge/trophy wall
 * Flow: Linear Wizard (3 steps: pick goals → review → trophy wall)
 * Fork: Fork-First (FTO vs Abundance in step 1)
 *
 * Key question: Does removing L2 from the tree feel cleaner?
 * After setup, shows Achievement Wall — all L2 badges in trophy case layout.
 * Each badge: weighted progress bar, contributing L3s listed, % contribution.
 */

import { useState, useCallback } from "react"
import {
  Check,
  Trophy,
  ChevronRight,
  Mountain,
  Award,
} from "lucide-react"
import { useFlatModelData, useLifeAreas, type DaygamePath } from "./useGoalData"
import type { GoalTemplate, BadgeStatus } from "@/src/goals/types"

// ============================================================================
// Types
// ============================================================================

type FlowStep = "path" | "goals" | "trophies"

// ============================================================================
// Step 1: Path Selection (reused aurora style)
// ============================================================================

function PathStep({ onSelect }: { onSelect: (path: DaygamePath) => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-2xl w-full text-center">
        <Mountain className="size-12 mx-auto mb-6 text-amber-400 opacity-80" />
        <h1 className="text-4xl font-bold text-white mb-3">Choose your path</h1>
        <p className="text-lg text-white/50 mb-12">This shapes your default goal recommendations.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <button onClick={() => onSelect("fto")}
            className="rounded-2xl p-6 text-left transition-all hover:scale-[1.02]"
            style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)" }}>
            <div className="text-3xl mb-3">💜</div>
            <h3 className="text-xl font-semibold text-white mb-2">Find The One</h3>
            <p className="text-sm text-white/50">Deep connection. Quality focus.</p>
          </button>
          <button onClick={() => onSelect("abundance")}
            className="rounded-2xl p-6 text-left transition-all hover:scale-[1.02]"
            style={{ background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.3)" }}>
            <div className="text-3xl mb-3">🔥</div>
            <h3 className="text-xl font-semibold text-white mb-2">Abundance</h3>
            <p className="text-sm text-white/50">Maximum experience. Volume focus.</p>
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Step 2: Flat Goal Picker (No L2 in selection — key differentiator)
// ============================================================================

function FlatGoalPicker({
  goals,
  selected,
  onToggle,
  onNext,
}: {
  goals: GoalTemplate[]
  selected: Set<string>
  onToggle: (id: string) => void
  onNext: () => void
}) {
  const l3Goals = goals.filter((g) => g.level === 3)

  // Group by category
  const grouped: Record<string, GoalTemplate[]> = {}
  for (const g of l3Goals) {
    const cat = g.displayCategory ?? "general"
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(g)
  }

  return (
    <div className="min-h-screen pt-16 pb-24 px-6">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-2xl font-bold text-white mb-2">Pick your goals</h2>
        <p className="text-white/40 mb-1">No achievement layers — just the goals you&apos;ll actually track.</p>
        <p className="text-xs text-amber-400/50 mb-8">Achievements unlock automatically based on your progress (see trophy wall after).</p>

        {Object.entries(grouped).map(([cat, catGoals]) => (
          <div key={cat} className="mb-6">
            <h3 className="text-xs uppercase tracking-wider text-white/30 mb-3 pl-1">
              {cat.replace(/_/g, " ")}
            </h3>
            <div className="space-y-1.5">
              {catGoals.map((g) => {
                const isOn = selected.has(g.id)
                return (
                  <button
                    key={g.id}
                    onClick={() => onToggle(g.id)}
                    className="w-full flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-all"
                    style={{
                      background: isOn ? "rgba(212,168,67,0.08)" : "rgba(255,255,255,0.02)",
                      border: isOn ? "1px solid rgba(212,168,67,0.25)" : "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div className="size-5 rounded flex items-center justify-center shrink-0"
                      style={{ background: isOn ? "#d4a843" : "rgba(255,255,255,0.08)" }}>
                      {isOn && <Check className="size-3 text-black" />}
                    </div>
                    <div className="flex-1">
                      <span className={`text-sm ${isOn ? "text-white" : "text-white/60"}`}>{g.title}</span>
                    </div>
                    <span className="text-[10px] text-white/20 uppercase">
                      {g.templateType === "habit_ramp" ? "habit" : "milestone"}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        {/* Other life areas placeholder */}
        {["health_fitness", "personal_growth", "social", "career_business", "lifestyle", "vices"].map((area) => (
          <div key={area} className="mb-3">
            <div className="flex items-center gap-3 rounded-lg px-4 py-3 opacity-40"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="text-sm text-white/50">{area.replace(/_/g, " ")}</span>
              <span className="ml-auto text-[10px] text-white/20 uppercase">coming soon</span>
            </div>
          </div>
        ))}

        <div className="mt-8 text-center">
          <button onClick={onNext} disabled={selected.size === 0}
            className="px-8 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-30"
            style={{ background: selected.size > 0 ? "#d4a843" : "rgba(255,255,255,0.1)", color: selected.size > 0 ? "#1a1508" : "white" }}>
            See Trophy Wall ({selected.size} goals) →
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Step 3: Trophy Room / Achievement Badge Wall
// ============================================================================

function BadgeCard({ badge }: { badge: BadgeStatus }) {
  const tierColors: Record<string, { bg: string; border: string; glow: string }> = {
    diamond: { bg: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.4)", glow: "0 0 20px rgba(56,189,248,0.2)" },
    gold: { bg: "rgba(212,168,67,0.12)", border: "rgba(212,168,67,0.4)", glow: "0 0 16px rgba(212,168,67,0.2)" },
    silver: { bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.3)", glow: "0 0 12px rgba(148,163,184,0.15)" },
    bronze: { bg: "rgba(180,130,60,0.1)", border: "rgba(180,130,60,0.3)", glow: "0 0 10px rgba(180,130,60,0.15)" },
    none: { bg: "rgba(255,255,255,0.02)", border: "rgba(255,255,255,0.08)", glow: "none" },
  }
  const tierEmoji: Record<string, string> = {
    diamond: "💎",
    gold: "🏆",
    silver: "🥈",
    bronze: "🥉",
    none: "🔒",
  }
  const colors = tierColors[badge.tier]
  const pct = Math.round(badge.progress * 100)

  return (
    <div className="rounded-2xl p-5 transition-all"
      style={{ background: colors.bg, border: `1px solid ${colors.border}`, boxShadow: colors.glow }}>
      <div className="text-3xl mb-3 text-center">{tierEmoji[badge.tier]}</div>
      <h3 className="text-sm font-semibold text-white text-center mb-2 line-clamp-2">{badge.title}</h3>

      {/* Progress bar */}
      <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden mb-2">
        <div className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: badge.tier === "none"
              ? "rgba(255,255,255,0.15)"
              : `linear-gradient(90deg, ${colors.border}, ${colors.border}88)`,
          }} />
      </div>
      <div className="text-center text-xs text-white/40">{pct}%</div>

      {/* Tier label */}
      <div className="mt-3 text-center">
        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{ background: `${colors.border}20`, color: colors.border }}>
          {badge.tier === "none" ? "locked" : badge.tier}
        </span>
      </div>
    </div>
  )
}

function TrophyRoom({ badges }: { badges: BadgeStatus[] }) {
  const unlocked = badges.filter((b) => b.unlocked)
  const locked = badges.filter((b) => !b.unlocked)

  return (
    <div className="min-h-screen pt-16 pb-12 px-6">
      <div className="mx-auto max-w-4xl">
        <div className="text-center mb-10">
          <Trophy className="size-12 mx-auto mb-4 text-amber-400" />
          <h2 className="text-3xl font-bold text-white mb-2">Trophy Room</h2>
          <p className="text-white/40 max-w-md mx-auto">
            These achievements unlock automatically as you make progress on your goals.
            No need to track them — just focus on your daily actions.
          </p>
        </div>

        {/* Unlocked */}
        {unlocked.length > 0 && (
          <div className="mb-10">
            <h3 className="text-sm uppercase tracking-wider text-amber-400/60 mb-4 flex items-center gap-2">
              <Award className="size-4" /> Unlocked ({unlocked.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {unlocked.map((b) => <BadgeCard key={b.badgeId} badge={b} />)}
            </div>
          </div>
        )}

        {/* Locked / In Progress */}
        {locked.length > 0 && (
          <div>
            <h3 className="text-sm uppercase tracking-wider text-white/30 mb-4 flex items-center gap-2">
              <ChevronRight className="size-4" /> In Progress ({locked.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {locked.map((b) => <BadgeCard key={b.badgeId} badge={b} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export default function VariantF() {
  const data = useFlatModelData()
  const [step, setStep] = useState<FlowStep>("path")
  const [, setPath] = useState<DaygamePath | null>(null)
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set())

  const daygameArea = data.areas.find((a) => a.lifeArea.id === "daygame")
  const daygameGoals = daygameArea ? [...daygameArea.l1Goals, ...daygameArea.l3Goals] : []

  const handleSelectPath = useCallback((p: DaygamePath) => {
    setPath(p)
    setStep("goals")
  }, [])

  const toggleGoal = useCallback((id: string) => {
    setSelectedGoals((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  return (
    <div className="relative">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a2e] via-[#1a1508] to-[#0d1117]" />
        <div className="absolute top-0 left-1/3 w-96 h-96 rounded-full opacity-8"
          style={{ background: "radial-gradient(circle, #d4a843, transparent)", filter: "blur(100px)" }} />
      </div>

      {step === "path" && <PathStep onSelect={handleSelectPath} />}
      {step === "goals" && (
        <FlatGoalPicker
          goals={daygameGoals}
          selected={selectedGoals}
          onToggle={toggleGoal}
          onNext={() => setStep("trophies")}
        />
      )}
      {step === "trophies" && <TrophyRoom badges={data.badges} />}
    </div>
  )
}
