"use client"

/**
 * Variant A: "Aurora-Orrery Hybrid" — Flat + Badges
 *
 * Theme: Aurora sky + brass orrery instruments
 * Hierarchy: Flat (L1→L3) with L2s as badge achievements
 * Flow: 5-step linear wizard
 *
 * Step 1 (Direction): Life area + FTO/Abundance selection
 * Step 2 (Goals): L3 goals grouped by display category (no L2 in tree)
 * Step 3 (Customize): Target editor with +/- controls & curve editor
 * Step 4 (Summary): Brass panel overview with targets & badge preview
 * Step 5 (Your System): Orrery visualization — life areas as orbiting planets
 */

import { useState, useCallback, useMemo } from "react"
import {
  ChevronRight,
  ChevronDown,
  Check,
  Star,
  Minus,
  Plus,
  Sparkles,
  SlidersHorizontal,
  Trophy,
} from "lucide-react"
import { useFlatModelData, useLifeAreas, getDaygamePathL1, type DaygamePath } from "./useGoalData"
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/src/goals/config"
import { MilestoneCurveEditor } from "@/src/goals/components/MilestoneCurveEditor"
import type { GoalTemplate, LifeAreaConfig, MilestoneLadderConfig, GoalDisplayCategory, BadgeStatus } from "@/src/goals/types"

// ============================================================================
// Types & Constants
// ============================================================================

type FlowStep = "direction" | "goals" | "customize" | "summary" | "orrery"
const STEPS: FlowStep[] = ["direction", "goals", "customize", "summary", "orrery"]
const STEP_LABELS = ["Direction", "Goals", "Customize", "Summary", "Your System"]

// ============================================================================
// Aurora Sky Canvas (Background)
// ============================================================================

function AuroraSkyCanvas() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a2e] via-[#1a1a4e] to-[#0d1117]" />
      <svg className="absolute inset-0 w-full h-full opacity-40" viewBox="0 0 1200 800" preserveAspectRatio="none">
        <defs>
          <linearGradient id="aurora1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
            <stop offset="30%" stopColor="#06b6d4" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#ec4899" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="aurora2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
            <stop offset="40%" stopColor="#10b981" stopOpacity="0.4" />
            <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </linearGradient>
          <filter id="auroraBlur">
            <feGaussianBlur stdDeviation="20" />
          </filter>
        </defs>
        <path
          d="M0,300 C200,250 400,350 600,280 C800,210 1000,320 1200,260"
          fill="none" stroke="url(#aurora1)" strokeWidth="80" filter="url(#auroraBlur)"
        >
          <animate attributeName="d" dur="8s" repeatCount="indefinite" values="
            M0,300 C200,250 400,350 600,280 C800,210 1000,320 1200,260;
            M0,280 C200,320 400,240 600,310 C800,260 1000,290 1200,240;
            M0,300 C200,250 400,350 600,280 C800,210 1000,320 1200,260
          "/>
        </path>
        <path
          d="M0,400 C300,350 500,420 700,370 C900,320 1100,380 1200,350"
          fill="none" stroke="url(#aurora2)" strokeWidth="60" filter="url(#auroraBlur)"
        >
          <animate attributeName="d" dur="10s" repeatCount="indefinite" values="
            M0,400 C300,350 500,420 700,370 C900,320 1100,380 1200,350;
            M0,380 C300,410 500,360 700,400 C900,350 1100,370 1200,380;
            M0,400 C300,350 500,420 700,370 C900,320 1100,380 1200,350
          "/>
        </path>
      </svg>
      <div className="absolute inset-0">
        {Array.from({ length: 60 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 2 + 1,
              height: Math.random() * 2 + 1,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 60}%`,
              opacity: Math.random() * 0.6 + 0.2,
              animation: `twinkle ${Math.random() * 3 + 2}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>
      <svg className="absolute bottom-0 w-full" viewBox="0 0 1200 200" preserveAspectRatio="none">
        <path d="M0,200 L0,140 L150,80 L300,120 L450,50 L600,100 L750,30 L900,90 L1050,60 L1200,110 L1200,200 Z"
          fill="#0d1117" opacity="0.9" />
        <path d="M0,200 L0,160 L200,110 L400,140 L600,90 L800,130 L1000,100 L1200,150 L1200,200 Z"
          fill="#0d1117" />
      </svg>
      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}

// ============================================================================
// Sticky Bottom Bar (Step gauge + CTA)
// ============================================================================

function BottomBar({
  currentStep,
  steps,
  statusText,
  ctaLabel,
  ctaDisabled,
  onCta,
  onStepClick,
}: {
  currentStep: number
  steps: string[]
  statusText: string
  ctaLabel: string
  ctaDisabled?: boolean
  onCta: () => void
  onStepClick: (stepIndex: number) => void
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t"
      style={{ background: "linear-gradient(to bottom, #2a1f0e, #1a1508)", borderColor: "#8b7540" }}
    >
      {/* Info + CTA row */}
      <div className="mx-auto max-w-3xl flex items-center justify-between px-6 pt-3 pb-2">
        <span className="text-xs" style={{ color: "#8b7540" }}>{statusText}</span>
        <button
          onClick={onCta}
          disabled={ctaDisabled}
          className="px-5 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-30"
          style={{
            background: ctaDisabled ? "#3a2f1a" : "linear-gradient(135deg, #06b6d4, #8b5cf6)",
            color: ctaDisabled ? "#8b7540" : "white",
          }}
        >
          {ctaLabel}
        </button>
      </div>
      {/* Step gauge row */}
      <div className="mx-auto max-w-3xl flex items-center justify-center px-6 pb-3 gap-1">
        {steps.map((label, i) => {
          const isActive = i === currentStep
          const isDone = i < currentStep
          const isClickable = isDone
          return (
            <div key={label} className="flex items-center gap-1">
              {i > 0 && (
                <div className="w-4 sm:w-8 h-px" style={{ background: isDone ? "#d4a843" : "#5a4a2a" }} />
              )}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={() => isClickable && onStepClick(i)}
                  disabled={!isClickable}
                  className="flex items-center justify-center rounded-full text-xs font-bold transition-all"
                  style={{
                    width: isActive ? 28 : 22,
                    height: isActive ? 28 : 22,
                    background: isDone ? "#d4a843" : isActive ? "#8b7540" : "#3a2f1a",
                    color: isDone || isActive ? "#1a1508" : "#8b7540",
                    border: isActive ? "2px solid #d4a843" : "1px solid #5a4a2a",
                    boxShadow: isActive ? "0 0 12px rgba(212,168,67,0.3)" : "none",
                    cursor: isClickable ? "pointer" : "default",
                  }}
                >
                  {isDone ? <Check className="size-3" /> : i + 1}
                </button>
                <span className="text-[9px] hidden sm:block" style={{ color: isActive ? "#d4a843" : "#8b7540" }}>
                  {label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// Step 1: Direction — Life Area + Path Selection
// ============================================================================

function DirectionStep({
  lifeAreas,
  selectedPath,
  selectedAreas,
  onSelectPath,
  onToggleArea,
}: {
  lifeAreas: LifeAreaConfig[]
  selectedPath: DaygamePath | null
  selectedAreas: Set<string>
  onSelectPath: (path: DaygamePath) => void
  onToggleArea: (areaId: string) => void
}) {
  const ftoL1s = getDaygamePathL1("fto")
  const abundanceL1s = getDaygamePathL1("abundance")
  const daygame = lifeAreas.find((a) => a.id === "daygame")
  const otherAreas = lifeAreas.filter((a) => a.id !== "daygame" && a.id !== "custom")

  return (
    <div className="min-h-screen pt-16 pb-36 px-6">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="text-center mb-10">
          <Sparkles className="size-8 mx-auto mb-3 text-cyan-400 opacity-60" />
          <h1 className="text-3xl font-bold text-white mb-2">Shape Your Path to Mastery</h1>
          <p className="text-white/50 text-sm">
            Select your dating direction, then pick additional life areas to track.
          </p>
        </div>

        {/* Dating section label */}
        {daygame && (() => {
          const DgIcon = daygame.icon
          return (
            <div className="flex items-center gap-3 mb-4">
              <div className="size-7 rounded-lg flex items-center justify-center"
                style={{ background: `${daygame.hex}20` }}>
                <DgIcon className="size-4" style={{ color: daygame.hex }} />
              </div>
              <span className="text-sm font-semibold uppercase tracking-wider"
                style={{ color: daygame.hex }}>
                {daygame.name}
              </span>
            </div>
          )
        })()}

        {/* FTO / Abundance cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {/* FTO */}
          <button
            onClick={() => onSelectPath("fto")}
            className="rounded-2xl p-5 text-left transition-all"
            style={{
              background: selectedPath === "fto"
                ? "linear-gradient(135deg, rgba(139,92,246,0.18), rgba(6,182,212,0.08))"
                : "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(6,182,212,0.04))",
              border: selectedPath === "fto"
                ? "2px solid rgba(139,92,246,0.5)"
                : "1px solid rgba(139,92,246,0.15)",
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="size-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(139,92,246,0.2)" }}>
                <Star className="size-5 text-violet-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">Find The One</h3>
                <p className="text-xs text-white/40">Connection & commitment</p>
              </div>
              {selectedPath === "fto" && <Check className="size-5 text-violet-400" />}
            </div>
            <p className="text-sm text-white/50 mb-3">
              I want to find one special person and build something real.
            </p>
            <div className="space-y-1.5">
              {ftoL1s.slice(0, 3).map((l1) => (
                <div key={l1.id} className="flex items-center gap-2 text-xs text-white/40">
                  <ChevronRight className="size-3" />
                  <span>{l1.title}</span>
                </div>
              ))}
              {ftoL1s.length > 3 && (
                <span className="text-xs text-violet-400/60 pl-5">
                  +{ftoL1s.length - 3} more paths
                </span>
              )}
            </div>
          </button>

          {/* Abundance */}
          <button
            onClick={() => onSelectPath("abundance")}
            className="rounded-2xl p-5 text-left transition-all"
            style={{
              background: selectedPath === "abundance"
                ? "linear-gradient(135deg, rgba(249,115,22,0.18), rgba(234,179,8,0.08))"
                : "linear-gradient(135deg, rgba(249,115,22,0.08), rgba(234,179,8,0.04))",
              border: selectedPath === "abundance"
                ? "2px solid rgba(249,115,22,0.5)"
                : "1px solid rgba(249,115,22,0.15)",
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="size-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(249,115,22,0.2)" }}>
                <Sparkles className="size-5 text-orange-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">Abundance</h3>
                <p className="text-xs text-white/40">Freedom & experience</p>
              </div>
              {selectedPath === "abundance" && <Check className="size-5 text-orange-400" />}
            </div>
            <p className="text-sm text-white/50 mb-3">
              I want to experience abundance and freedom in dating.
            </p>
            <div className="space-y-1.5">
              {abundanceL1s.slice(0, 3).map((l1) => (
                <div key={l1.id} className="flex items-center gap-2 text-xs text-white/40">
                  <ChevronRight className="size-3" />
                  <span>{l1.title}</span>
                </div>
              ))}
              {abundanceL1s.length > 3 && (
                <span className="text-xs text-orange-400/60 pl-5">
                  +{abundanceL1s.length - 3} more paths
                </span>
              )}
            </div>
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
          <span className="text-xs uppercase tracking-wider text-white/25">Other Life Areas</span>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
        </div>

        {/* Other life areas grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {otherAreas.map((area) => {
            const Icon = area.icon
            const isSelected = selectedAreas.has(area.id)
            return (
              <button
                key={area.id}
                onClick={() => onToggleArea(area.id)}
                className="flex flex-col items-center gap-2.5 rounded-xl p-4 transition-all"
                style={{
                  background: isSelected ? `${area.hex}12` : "rgba(255,255,255,0.02)",
                  border: isSelected ? `1px solid ${area.hex}40` : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className="size-10 rounded-xl flex items-center justify-center"
                  style={{ background: isSelected ? `${area.hex}20` : "rgba(255,255,255,0.05)" }}>
                  <Icon className="size-5" style={{ color: isSelected ? area.hex : "rgba(255,255,255,0.4)" }} />
                </div>
                <span className={`text-xs font-medium text-center leading-tight ${isSelected ? "text-white" : "text-white/40"}`}>
                  {area.name}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Step 2: Goals — Flat L3 picker grouped by display category
// ============================================================================

function GoalsStep({
  flatData,
  lifeAreas,
  selectedAreas,
  selectedGoals,
  onToggle,
}: {
  flatData: ReturnType<typeof useFlatModelData>
  lifeAreas: LifeAreaConfig[]
  selectedAreas: Set<string>
  selectedGoals: Set<string>
  onToggle: (id: string) => void
}) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set())
  const daygameArea = flatData.areas.find((a) => a.lifeArea.id === "daygame")

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Group daygame L3s by display category
  const daygameByCategory = useMemo(() => {
    if (!daygameArea) return []
    const grouped: Record<string, GoalTemplate[]> = {}
    for (const g of daygameArea.l3Goals) {
      const cat = g.displayCategory ?? "field_work"
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(g)
    }
    // Return in CATEGORY_ORDER
    return CATEGORY_ORDER
      .filter((cat) => grouped[cat] && grouped[cat].length > 0)
      .map((cat) => ({ category: cat, goals: grouped[cat] }))
  }, [daygameArea])

  const daygameSelected = daygameArea?.l3Goals.filter((g) => selectedGoals.has(g.id)).length ?? 0

  return (
    <div className="min-h-screen pt-12 pb-36 px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-1">Choose Your Goals</h2>
          <p className="text-white/40 text-sm">
            We&apos;ve pre-selected goals based on your path. Toggle any on or off.
          </p>
        </div>

        {/* Daygame goals by display category */}
        {daygameByCategory.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-orange-400">
                Dating & Daygame
              </span>
              <span className="text-xs text-white/30">{daygameSelected} selected</span>
            </div>

            {daygameByCategory.map(({ category, goals }) => {
              const sectionId = `dg_${category}`
              const isExpanded = expandedSections.has(sectionId)
              const selectedCount = goals.filter((g) => selectedGoals.has(g.id)).length

              return (
                <div key={category} className="mb-3">
                  <button
                    onClick={() => toggleSection(sectionId)}
                    className="w-full flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors"
                    style={{
                      background: selectedCount > 0 ? "rgba(212,168,67,0.08)" : "rgba(255,255,255,0.02)",
                      border: selectedCount > 0 ? "1px solid rgba(212,168,67,0.2)" : "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    {isExpanded
                      ? <ChevronDown className="size-3.5 text-amber-400/60" />
                      : <ChevronRight className="size-3.5 text-amber-400/60" />
                    }
                    <span className="text-sm text-white/80 flex-1 text-left">
                      {CATEGORY_LABELS[category] ?? category.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-white/30">{selectedCount}/{goals.length}</span>
                  </button>

                  {isExpanded && (
                    <div className="ml-7 mt-1.5 space-y-1">
                      {goals.map((l3) => {
                        const isOn = selectedGoals.has(l3.id)
                        return (
                          <button
                            key={l3.id}
                            onClick={() => onToggle(l3.id)}
                            className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-all"
                            style={{
                              background: isOn ? "rgba(6,182,212,0.08)" : "transparent",
                              border: isOn ? "1px solid rgba(6,182,212,0.2)" : "1px solid transparent",
                            }}
                          >
                            <div
                              className="size-4 rounded flex items-center justify-center shrink-0"
                              style={{
                                background: isOn ? "#06b6d4" : "rgba(255,255,255,0.1)",
                                border: isOn ? "none" : "1px solid rgba(255,255,255,0.2)",
                              }}
                            >
                              {isOn && <Check className="size-2.5 text-white" />}
                            </div>
                            <span className={`text-sm flex-1 ${isOn ? "text-white" : "text-white/50"}`}>
                              {l3.title}
                            </span>
                            {category === "dirty_dog" && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded text-orange-400/60 bg-orange-400/10">
                                advanced
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Other selected areas */}
        {lifeAreas
          .filter((a) => selectedAreas.has(a.id) && a.id !== "daygame" && a.id !== "custom")
          .map((area) => {
            const Icon = area.icon
            const suggestions = area.suggestions
            if (!suggestions || suggestions.length === 0) return null
            const isExpanded = expandedSections.has(area.id)
            const areaSelected = suggestions.filter((_, i) =>
              selectedGoals.has(`${area.id}_s${i}`)
            ).length

            return (
              <div key={area.id} className="mb-4">
                <button
                  onClick={() => toggleSection(area.id)}
                  className="w-full flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors"
                  style={{
                    background: `${area.hex}08`,
                    border: `1px solid ${area.hex}20`,
                  }}
                >
                  {isExpanded
                    ? <ChevronDown className="size-3.5" style={{ color: `${area.hex}80` }} />
                    : <ChevronRight className="size-3.5" style={{ color: `${area.hex}80` }} />
                  }
                  <Icon className="size-3.5" style={{ color: area.hex }} />
                  <span className="text-sm text-white/80 flex-1 text-left">{area.name}</span>
                  <span className="text-[10px] text-white/30">{areaSelected}/{suggestions.length}</span>
                </button>

                {isExpanded && (
                  <div className="ml-7 mt-1.5 space-y-1">
                    {suggestions.map((s, i) => {
                      const id = `${area.id}_s${i}`
                      const isOn = selectedGoals.has(id)
                      return (
                        <button
                          key={id}
                          onClick={() => onToggle(id)}
                          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-all"
                          style={{
                            background: isOn ? `${area.hex}08` : "transparent",
                            border: isOn ? `1px solid ${area.hex}20` : "1px solid transparent",
                          }}
                        >
                          <div
                            className="size-4 rounded flex items-center justify-center shrink-0"
                            style={{
                              background: isOn ? area.hex : "rgba(255,255,255,0.1)",
                              border: isOn ? "none" : "1px solid rgba(255,255,255,0.2)",
                            }}
                          >
                            {isOn && <Check className="size-2.5 text-white" />}
                          </div>
                          <span className={`text-sm ${isOn ? "text-white" : "text-white/50"}`}>
                            {s.title}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
      </div>
    </div>
  )
}

// ============================================================================
// Step 3: Customize — Target Editor
// ============================================================================

function CustomizeStep({
  flatData,
  lifeAreas,
  selectedAreas,
  selectedGoals,
  targets,
  curveConfigs,
  onUpdateTarget,
  onUpdateCurve,
}: {
  flatData: ReturnType<typeof useFlatModelData>
  lifeAreas: LifeAreaConfig[]
  selectedAreas: Set<string>
  selectedGoals: Set<string>
  targets: Record<string, number>
  curveConfigs: Record<string, MilestoneLadderConfig>
  onUpdateTarget: (id: string, value: number) => void
  onUpdateCurve: (id: string, config: MilestoneLadderConfig) => void
}) {
  const daygameArea = flatData.areas.find((a) => a.lifeArea.id === "daygame")
  const [expandedCurve, setExpandedCurve] = useState<string | null>(null)

  const daygameGoals = useMemo(() => {
    if (!daygameArea) return []
    return daygameArea.l3Goals
      .filter((g) => selectedGoals.has(g.id))
      .map((g) => {
        const defaultTarget = g.defaultMilestoneConfig?.target
          ?? g.defaultRampSteps?.[0]?.frequencyPerWeek
          ?? 5
        return {
          id: g.id,
          title: g.title,
          category: (g.displayCategory ?? "general") as GoalDisplayCategory,
          type: (g.templateType === "habit_ramp" ? "habit" : "milestone") as "habit" | "milestone",
          target: targets[g.id] ?? defaultTarget,
          period: g.templateType === "habit_ramp" ? "per week" : "total",
          hasCurve: g.templateType === "milestone_ladder" && g.defaultMilestoneConfig != null,
          defaultCurve: g.defaultMilestoneConfig,
        }
      })
  }, [daygameArea, selectedGoals, targets])

  const daygameGrouped = useMemo(() => {
    const groups: Partial<Record<GoalDisplayCategory, typeof daygameGoals>> = {}
    for (const g of daygameGoals) {
      if (!groups[g.category]) groups[g.category] = []
      groups[g.category]!.push(g)
    }
    return CATEGORY_ORDER
      .filter((cat) => groups[cat] && groups[cat]!.length > 0)
      .map((cat) => ({ category: cat, goals: groups[cat]! }))
  }, [daygameGoals])

  const otherAreaGoals = useMemo(() => {
    return lifeAreas
      .filter((a) => selectedAreas.has(a.id) && a.id !== "daygame" && a.id !== "custom")
      .map((area) => ({
        area,
        goals: (area.suggestions ?? [])
          .map((s, i) => ({ id: `${area.id}_s${i}`, title: s.title, defaultTarget: s.defaultTarget, period: s.defaultPeriod }))
          .filter((s) => selectedGoals.has(s.id))
          .map((s) => ({
            ...s,
            target: targets[s.id] ?? s.defaultTarget,
          })),
      }))
      .filter((a) => a.goals.length > 0)
  }, [lifeAreas, selectedAreas, selectedGoals, targets])

  return (
    <div className="min-h-screen pt-12 pb-36 px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-1">Customize Targets</h2>
          <p className="text-white/40 text-sm">
            Adjust targets for each goal. These are starting points — you can change them later.
          </p>
        </div>

        {/* Daygame goals by category */}
        {daygameGrouped.map(({ category, goals }) => (
          <div key={category} className="mb-6">
            <h3 className="text-xs uppercase tracking-wider text-orange-400/60 mb-3 pl-1">
              {CATEGORY_LABELS[category] ?? category.replace(/_/g, " ")}
            </h3>
            <div className="space-y-2">
              {goals.map((g) => (
                <div key={g.id}>
                  <div className="flex items-center gap-3 rounded-lg px-4 py-3"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-white/80">{g.title}</span>
                      <span className="ml-2 text-[10px] text-white/25 uppercase">{g.type}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {g.hasCurve && (
                        <button
                          onClick={() => setExpandedCurve(expandedCurve === g.id ? null : g.id)}
                          className="size-7 rounded-md flex items-center justify-center transition-colors hover:bg-white/10"
                          style={{
                            border: expandedCurve === g.id ? "1px solid rgba(6,182,212,0.4)" : "1px solid rgba(255,255,255,0.1)",
                            background: expandedCurve === g.id ? "rgba(6,182,212,0.1)" : "transparent",
                          }}
                          title="Customize milestone curve"
                        >
                          <SlidersHorizontal className="size-3" style={{ color: expandedCurve === g.id ? "#06b6d4" : "rgba(255,255,255,0.5)" }} />
                        </button>
                      )}
                      <button
                        onClick={() => onUpdateTarget(g.id, Math.max(1, g.target - 1))}
                        className="size-7 rounded-md flex items-center justify-center transition-colors hover:bg-white/10"
                        style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                      >
                        <Minus className="size-3 text-white/50" />
                      </button>
                      <span className="text-sm font-semibold text-white w-8 text-center">{g.target}</span>
                      <button
                        onClick={() => onUpdateTarget(g.id, g.target + 1)}
                        className="size-7 rounded-md flex items-center justify-center transition-colors hover:bg-white/10"
                        style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                      >
                        <Plus className="size-3 text-white/50" />
                      </button>
                      <span className="text-[10px] text-white/30 w-14 text-right">{g.period}</span>
                    </div>
                  </div>
                  {/* Curve editor (expanded) */}
                  {g.hasCurve && expandedCurve === g.id && g.defaultCurve && (
                    <div className="mt-2 ml-2 mr-2 mb-3">
                      <MilestoneCurveEditor
                        config={curveConfigs[g.id] ?? g.defaultCurve}
                        onChange={(config) => onUpdateCurve(g.id, config)}
                        allowDirectEdit
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Other area goals */}
        {otherAreaGoals.map(({ area, goals }) => {
          const Icon = area.icon
          return (
            <div key={area.id} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Icon className="size-3.5" style={{ color: area.hex }} />
                <h3 className="text-xs uppercase tracking-wider" style={{ color: `${area.hex}80` }}>
                  {area.name}
                </h3>
              </div>
              <div className="space-y-2">
                {goals.map((g) => (
                  <div key={g.id} className="flex items-center gap-3 rounded-lg px-4 py-3"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-white/80">{g.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onUpdateTarget(g.id, Math.max(1, g.target - 1))}
                        className="size-7 rounded-md flex items-center justify-center transition-colors hover:bg-white/10"
                        style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                      >
                        <Minus className="size-3 text-white/50" />
                      </button>
                      <span className="text-sm font-semibold text-white w-8 text-center">{g.target}</span>
                      <button
                        onClick={() => onUpdateTarget(g.id, g.target + 1)}
                        className="size-7 rounded-md flex items-center justify-center transition-colors hover:bg-white/10"
                        style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                      >
                        <Plus className="size-3 text-white/50" />
                      </button>
                      <span className="text-[10px] text-white/30 w-14 text-right">{g.period}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// Step 4: Summary (Brass panels + badge preview)
// ============================================================================

function SummaryStep({
  flatData,
  lifeAreas,
  selectedAreas,
  selectedGoals,
  targets,
  path,
  badges,
}: {
  flatData: ReturnType<typeof useFlatModelData>
  lifeAreas: LifeAreaConfig[]
  selectedAreas: Set<string>
  selectedGoals: Set<string>
  targets: Record<string, number>
  path: DaygamePath | null
  badges: BadgeStatus[]
}) {
  const daygame = flatData.areas.find((a) => a.lifeArea.id === "daygame")
  const selectedDaygameL3s = daygame?.l3Goals.filter((g) => selectedGoals.has(g.id)) ?? []

  const daygameGrouped = useMemo(() => {
    const groups: Record<string, GoalTemplate[]> = {}
    for (const g of selectedDaygameL3s) {
      const cat = g.displayCategory ?? "other"
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(g)
    }
    return CATEGORY_ORDER
      .filter((cat) => groups[cat] && groups[cat].length > 0)
      .map((cat) => ({ category: cat, goals: groups[cat] }))
  }, [selectedDaygameL3s])

  const otherAreaData = lifeAreas
    .filter((a) => selectedAreas.has(a.id) && a.id !== "daygame" && a.id !== "custom")
    .map((area) => ({
      area,
      goals: (area.suggestions ?? [])
        .map((s, i) => ({ id: `${area.id}_s${i}`, title: s.title, defaultTarget: s.defaultTarget, period: s.defaultPeriod }))
        .filter((s) => selectedGoals.has(s.id)),
    }))
    .filter((a) => a.goals.length > 0)

  const totalGoals = selectedDaygameL3s.length + otherAreaData.reduce((sum, a) => sum + a.goals.length, 0)
  const totalAreas = 1 + otherAreaData.length

  const TIER_COLORS: Record<string, string> = {
    diamond: "#b9f2ff",
    gold: "#ffd700",
    silver: "#c0c0c0",
    bronze: "#cd7f32",
    none: "#8b7540",
  }

  return (
    <div className="min-h-screen pt-12 pb-36 px-6">
      <div className="mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2" style={{ color: "#d4a843" }}>System Ready</h2>
          <p className="text-white/40 text-sm">
            {totalGoals} goals across {totalAreas} life area{totalAreas > 1 ? "s" : ""}
            {path && ` · ${path === "fto" ? "Find The One" : "Abundance"} path`}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: "Total Goals", value: String(totalGoals) },
            { label: "Life Areas", value: String(totalAreas) },
            { label: "Achievements", value: String(badges.length) },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl p-3 text-center"
              style={{
                background: "linear-gradient(135deg, rgba(42,31,14,0.6), rgba(26,21,8,0.8))",
                border: "1px solid rgba(139,117,64,0.2)",
              }}
            >
              <div className="text-lg font-bold" style={{ color: "#d4a843" }}>{stat.value}</div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: "#8b7540" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Achievements preview */}
        {badges.length > 0 && (
          <div className="mb-6 rounded-xl overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(42,31,14,0.8), rgba(26,21,8,0.9))",
              border: "1px solid rgba(139,117,64,0.3)",
            }}
          >
            <div className="px-5 py-3 flex items-center justify-between"
              style={{ borderBottom: "1px solid rgba(139,117,64,0.15)" }}
            >
              <div className="flex items-center gap-2">
                <Trophy className="size-3.5" style={{ color: "#d4a843" }} />
                <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#d4a843" }}>
                  Achievements You&apos;ll Unlock
                </span>
              </div>
              <span className="text-xs" style={{ color: "#8b7540" }}>{badges.length} badges</span>
            </div>
            <div className="px-5 py-3 space-y-2.5">
              {badges.map((badge) => (
                <div key={badge.badgeId} className="flex items-center gap-3">
                  <div className="size-6 rounded-full flex items-center justify-center"
                    style={{ background: `${TIER_COLORS[badge.tier]}15`, border: `1px solid ${TIER_COLORS[badge.tier]}30` }}
                  >
                    <Trophy className="size-3" style={{ color: TIER_COLORS[badge.tier] }} />
                  </div>
                  <span className="text-sm text-white/80 flex-1">{badge.title}</span>
                  <span className="text-[10px] uppercase font-medium" style={{ color: TIER_COLORS[badge.tier] }}>
                    {badge.tier === "none" ? "locked" : badge.tier}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Daygame categories */}
        {daygameGrouped.map(({ category, goals }) => (
          <div key={category} className="mb-4 rounded-xl overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(42,31,14,0.8), rgba(26,21,8,0.9))",
              border: "1px solid rgba(139,117,64,0.3)",
            }}
          >
            <div className="px-5 py-3 flex items-center justify-between"
              style={{ borderBottom: "1px solid rgba(139,117,64,0.15)" }}
            >
              <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#d4a843" }}>
                {CATEGORY_LABELS[category] ?? category.replace(/_/g, " ")}
              </span>
              <span className="text-xs" style={{ color: "#8b7540" }}>{goals.length} goals</span>
            </div>
            <div className="px-5 py-3 space-y-2">
              {goals.map((g) => {
                const target = targets[g.id]
                  ?? g.defaultMilestoneConfig?.target
                  ?? g.defaultRampSteps?.[0]?.frequencyPerWeek
                  ?? "—"
                return (
                  <div key={g.id} className="flex items-center gap-3">
                    <div className="size-2 rounded-full" style={{ background: "#d4a843" }} />
                    <span className="text-sm text-white/80 flex-1">{g.title}</span>
                    <span className="text-xs font-medium" style={{ color: "#d4a843" }}>{target}</span>
                    <span className="text-[10px] uppercase" style={{ color: "#8b7540" }}>
                      {g.templateType === "habit_ramp" ? "/wk" : "total"}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* Other areas */}
        {otherAreaData.map(({ area, goals }) => (
          <div key={area.id} className="mb-4 rounded-xl overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(42,31,14,0.8), rgba(26,21,8,0.9))",
              border: "1px solid rgba(139,117,64,0.3)",
            }}
          >
            <div className="px-5 py-3 flex items-center justify-between"
              style={{ borderBottom: "1px solid rgba(139,117,64,0.15)" }}
            >
              <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#d4a843" }}>
                {area.name}
              </span>
              <span className="text-xs" style={{ color: "#8b7540" }}>{goals.length} goals</span>
            </div>
            <div className="px-5 py-3 space-y-2">
              {goals.map((g) => (
                <div key={g.id} className="flex items-center gap-3">
                  <div className="size-2 rounded-full" style={{ background: "#d4a843" }} />
                  <span className="text-sm text-white/80 flex-1">{g.title}</span>
                  <span className="text-xs font-medium" style={{ color: "#d4a843" }}>
                    {targets[g.id] ?? g.defaultTarget}
                  </span>
                  <span className="text-[10px] uppercase" style={{ color: "#8b7540" }}>/{g.period}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Step 5: Orrery — Life Area Solar System Visualization
// ============================================================================

const ORBIT_CONFIG: Record<
  string,
  { radius: number; duration: number; startAngle: number; planetSize: number }
> = {
  daygame: { radius: 100, duration: 45, startAngle: 0, planetSize: 20 },
  health_fitness: { radius: 155, duration: 60, startAngle: 45, planetSize: 14 },
  career_business: { radius: 200, duration: 80, startAngle: 120, planetSize: 14 },
  social: { radius: 240, duration: 100, startAngle: 200, planetSize: 13 },
  personal_growth: { radius: 275, duration: 120, startAngle: 300, planetSize: 13 },
  lifestyle: { radius: 305, duration: 140, startAngle: 160, planetSize: 12 },
}

const SUN_RADIUS = 38
const CENTER = 370
const TICK_COUNT = 60

function OrreryStep({
  lifeAreas,
  selectedAreas,
  selectedGoals,
  totalGoals,
  badges,
  path,
}: {
  lifeAreas: LifeAreaConfig[]
  selectedAreas: Set<string>
  selectedGoals: Set<string>
  totalGoals: number
  badges: BadgeStatus[]
  path: DaygamePath | null
}) {
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null)

  const visibleAreas = useMemo(
    () => lifeAreas.filter((a) => a.id !== "custom"),
    [lifeAreas]
  )

  // Count goals per area
  const goalCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    counts["daygame"] = Array.from(selectedGoals).filter((id) => id.startsWith("l3_")).length
    for (const area of lifeAreas) {
      if (area.id === "daygame" || area.id === "custom") continue
      const count = Array.from(selectedGoals).filter((id) => id.startsWith(`${area.id}_s`)).length
      if (count > 0) counts[area.id] = count
    }
    return counts
  }, [selectedGoals, lifeAreas])

  const activeAreas = new Set(["daygame", ...selectedAreas])
  const viewSize = CENTER * 2

  return (
    <div className="min-h-screen pt-8 pb-36 px-6">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2" style={{ color: "#d4a843" }}>Your System</h2>
          <p className="text-white/40 text-sm">
            {totalGoals} goals · {activeAreas.size} life areas
            {path && ` · ${path === "fto" ? "Find The One" : "Abundance"}`}
          </p>
        </div>

        {/* Orrery SVG */}
        <div className="relative w-full mx-auto" style={{ maxWidth: 740, aspectRatio: "1/1" }}>
          <style>{`
            @keyframes v5SunPulse {
              0%, 100% { filter: drop-shadow(0 0 20px rgba(218, 165, 32, 0.6)) drop-shadow(0 0 40px rgba(218, 165, 32, 0.3)); }
              50% { filter: drop-shadow(0 0 30px rgba(218, 165, 32, 0.8)) drop-shadow(0 0 60px rgba(218, 165, 32, 0.5)); }
            }
            @keyframes v5GearSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes v5GearSpinReverse { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
            ${visibleAreas.map((area) => {
              const config = ORBIT_CONFIG[area.id]
              if (!config) return ""
              return `
                @keyframes v5orbit-${area.id} {
                  from { transform: rotate(${config.startAngle}deg); }
                  to { transform: rotate(${config.startAngle + 360}deg); }
                }
                @keyframes v5counter-orbit-${area.id} {
                  from { transform: rotate(-${config.startAngle}deg); }
                  to { transform: rotate(-${config.startAngle + 360}deg); }
                }
              `
            }).join("\n")}
          `}</style>

          <svg viewBox={`0 0 ${viewSize} ${viewSize}`} className="w-full h-full" style={{ overflow: "visible" }}>
            <defs>
              <radialGradient id="v5-sun-gradient" cx="40%" cy="40%">
                <stop offset="0%" stopColor="#fff8dc" />
                <stop offset="30%" stopColor="#ffd700" />
                <stop offset="60%" stopColor="#daa520" />
                <stop offset="100%" stopColor="#b8860b" />
              </radialGradient>
              <radialGradient id="v5-sun-glow">
                <stop offset="0%" stopColor="#daa520" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#daa520" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#daa520" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="v5-brass-ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#cd853f" stopOpacity="0.25" />
                <stop offset="50%" stopColor="#daa520" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#b8860b" stopOpacity="0.25" />
              </linearGradient>
              <filter id="v5-planet-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
                <feFlood floodColor="#daa520" floodOpacity="0.5" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="v5-active-glow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="blur" />
                <feFlood floodColor="#ffd700" floodOpacity="0.7" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <pattern id="v5-gear-pattern" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
                <circle cx="40" cy="40" r="15" fill="none" stroke="#1a1a2e" strokeWidth="0.5" strokeDasharray="2,4" />
                <circle cx="40" cy="40" r="2" fill="#1a1a2e" fillOpacity="0.3" />
              </pattern>
            </defs>

            {/* Background gear texture */}
            <rect x="0" y="0" width={viewSize} height={viewSize} fill="url(#v5-gear-pattern)" opacity="0.12" />

            {/* Compass lines */}
            {[0, 90, 180, 270].map((angle) => (
              <line key={`compass-${angle}`}
                x1={CENTER} y1={CENTER - SUN_RADIUS - 15} x2={CENTER} y2={20}
                stroke="#cd853f" strokeWidth="0.5" strokeOpacity="0.06"
                transform={`rotate(${angle} ${CENTER} ${CENTER})`}
              />
            ))}

            {/* Decorative gear rings */}
            <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS + 15}
              fill="none" stroke="#cd853f" strokeWidth="0.6" strokeOpacity="0.12" strokeDasharray="3,5"
              style={{ transformOrigin: `${CENTER}px ${CENTER}px`, animation: "v5GearSpin 120s linear infinite" }}
            />
            <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS + 25}
              fill="none" stroke="#b8860b" strokeWidth="0.4" strokeOpacity="0.08" strokeDasharray="2,8"
              style={{ transformOrigin: `${CENTER}px ${CENTER}px`, animation: "v5GearSpinReverse 90s linear infinite" }}
            />

            {/* Orbit rings with tick marks */}
            {visibleAreas.map((area) => {
              const config = ORBIT_CONFIG[area.id]
              if (!config) return null
              const isActive = activeAreas.has(area.id)
              const isHovered = hoveredPlanet === area.id

              return (
                <g key={`orbit-${area.id}`}>
                  <circle cx={CENTER} cy={CENTER} r={config.radius}
                    fill="none" stroke="url(#v5-brass-ring)"
                    strokeWidth={isHovered || isActive ? 1.5 : 0.8}
                    opacity={isActive ? 0.5 : 0.15}
                    className="transition-all duration-300"
                  />
                  {Array.from({ length: TICK_COUNT }, (_, i) => {
                    const angle = (i / TICK_COUNT) * 360
                    const isMajor = i % 15 === 0
                    const tickLength = isMajor ? 6 : 3
                    const innerR = config.radius - tickLength / 2
                    const outerR = config.radius + tickLength / 2
                    const rad = (angle * Math.PI) / 180
                    return (
                      <line key={`tick-${area.id}-${i}`}
                        x1={CENTER + Math.cos(rad) * innerR} y1={CENTER + Math.sin(rad) * innerR}
                        x2={CENTER + Math.cos(rad) * outerR} y2={CENTER + Math.sin(rad) * outerR}
                        stroke="#cd853f" strokeWidth={isMajor ? 0.8 : 0.3}
                        strokeOpacity={isActive ? (isMajor ? 0.25 : 0.12) : (isMajor ? 0.08 : 0.04)}
                      />
                    )
                  })}
                </g>
              )
            })}

            {/* Sun glow + body */}
            <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS * 2.5} fill="url(#v5-sun-glow)" />
            <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS} fill="url(#v5-sun-gradient)"
              style={{ animation: "v5SunPulse 4s ease-in-out infinite" }}
            />
            <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS * 0.6} fill="none" stroke="#fff8dc" strokeWidth="0.5" strokeOpacity="0.3" />
            <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS * 0.3} fill="none" stroke="#fff8dc" strokeWidth="0.3" strokeOpacity="0.2" />
            <text x={CENTER} y={CENTER + 2} textAnchor="middle" dominantBaseline="middle"
              fill="#0a0a1a" fontSize="9" fontWeight="700" letterSpacing="0.5"
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              YOUR VISION
            </text>

            {/* Planets on orbits */}
            {visibleAreas.map((area) => {
              const config = ORBIT_CONFIG[area.id]
              if (!config) return null
              const isActive = activeAreas.has(area.id)
              const isHovered = hoveredPlanet === area.id
              const count = goalCounts[area.id] ?? 0

              return (
                <g key={`planet-${area.id}`}
                  style={{
                    transformOrigin: `${CENTER}px ${CENTER}px`,
                    animation: `v5orbit-${area.id} ${config.duration}s linear infinite`,
                  }}
                >
                  <g style={{
                    transformOrigin: `${CENTER}px ${CENTER - config.radius}px`,
                    animation: `v5counter-orbit-${area.id} ${config.duration}s linear infinite`,
                  }}>
                    {/* Hit area */}
                    <circle cx={CENTER} cy={CENTER - config.radius} r={config.planetSize + 8}
                      fill="transparent" className="cursor-pointer"
                      onMouseEnter={() => setHoveredPlanet(area.id)}
                      onMouseLeave={() => setHoveredPlanet(null)}
                    />

                    {/* Planet ring */}
                    <circle cx={CENTER} cy={CENTER - config.radius} r={config.planetSize + 3}
                      fill="none" stroke="#cd853f"
                      strokeWidth={isActive ? 1.5 : 0.8}
                      strokeOpacity={isActive ? 0.5 : 0.15}
                      strokeDasharray={isActive ? "none" : "2,3"}
                      className="transition-all duration-300"
                    />

                    {/* Planet body */}
                    <circle cx={CENTER} cy={CENTER - config.radius} r={config.planetSize}
                      fill={area.hex}
                      fillOpacity={isActive ? 0.9 : 0.25}
                      filter={isActive ? (isHovered ? "url(#v5-active-glow)" : "url(#v5-planet-glow)") : undefined}
                      className="transition-all duration-300"
                    />

                    {/* Inner highlight */}
                    <circle
                      cx={CENTER - config.planetSize * 0.25}
                      cy={CENTER - config.radius - config.planetSize * 0.25}
                      r={config.planetSize * 0.35} fill="white" fillOpacity={isActive ? 0.15 : 0.05}
                    />

                    {/* Label */}
                    <text x={CENTER} y={CENTER - config.radius + config.planetSize + 14}
                      textAnchor="middle"
                      fill={isActive ? (isHovered ? "#daa520" : "rgba(255,255,255,0.8)") : "rgba(255,255,255,0.25)"}
                      fontSize={area.id === "daygame" ? "9" : "7.5"}
                      fontWeight={area.id === "daygame" ? "700" : "500"}
                      letterSpacing="0.3" className="transition-colors duration-300"
                      style={{ fontFamily: "system-ui, sans-serif" }}
                    >
                      {area.name}
                    </text>

                    {/* Goal count badge (active areas only) */}
                    {isActive && count > 0 && (
                      <g>
                        <circle cx={CENTER + config.planetSize - 2} cy={CENTER - config.radius - config.planetSize + 2}
                          r={7} fill="#0d1117" stroke="#d4a843" strokeWidth="0.8"
                        />
                        <text x={CENTER + config.planetSize - 2} y={CENTER - config.radius - config.planetSize + 2.5}
                          textAnchor="middle" dominantBaseline="middle" fill="#d4a843"
                          fontSize="6" fontWeight="700" style={{ fontFamily: "system-ui, sans-serif" }}
                        >
                          {count}
                        </text>
                      </g>
                    )}
                  </g>
                </g>
              )
            })}

            {/* Outer compass marks */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
              const rad = (angle * Math.PI) / 180
              const isMajor = angle % 90 === 0
              return (
                <line key={`outer-${angle}`}
                  x1={CENTER + Math.cos(rad) * 340} y1={CENTER + Math.sin(rad) * 340}
                  x2={CENTER + Math.cos(rad) * 350} y2={CENTER + Math.sin(rad) * 350}
                  stroke="#cd853f" strokeWidth={isMajor ? 1.5 : 0.8}
                  strokeOpacity={isMajor ? 0.3 : 0.15}
                />
              )
            })}
          </svg>
        </div>

        {/* Badges below orrery */}
        {badges.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-4 justify-center">
              <Trophy className="size-4" style={{ color: "#d4a843" }} />
              <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#d4a843" }}>
                Achievements to Earn
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {badges.map((badge) => {
                const tierColor = badge.tier === "diamond" ? "#b9f2ff"
                  : badge.tier === "gold" ? "#ffd700"
                  : badge.tier === "silver" ? "#c0c0c0"
                  : badge.tier === "bronze" ? "#cd7f32"
                  : "#8b7540"

                return (
                  <div key={badge.badgeId} className="rounded-xl p-3 text-center"
                    style={{
                      background: "linear-gradient(135deg, rgba(42,31,14,0.6), rgba(26,21,8,0.8))",
                      border: `1px solid ${tierColor}30`,
                    }}
                  >
                    <Trophy className="size-5 mx-auto mb-1.5" style={{ color: tierColor }} />
                    <div className="text-xs text-white/70 leading-tight">{badge.title}</div>
                    <div className="text-[10px] uppercase font-medium mt-1" style={{ color: tierColor }}>
                      {badge.tier === "none" ? "Locked" : badge.tier}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-8 text-center">
          <button
            className="px-8 py-3 rounded-xl font-semibold text-sm transition-all"
            style={{ background: "#d4a843", color: "#1a1508" }}
          >
            Create Goals
          </button>
          <p className="text-xs text-white/20 mt-2">This will create {totalGoals} goals in your dashboard</p>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export default function VariantA() {
  const flatData = useFlatModelData()
  const lifeAreas = useLifeAreas()

  const [step, setStep] = useState<FlowStep>("direction")
  const [path, setPath] = useState<DaygamePath | null>(null)
  const [selectedAreas, setSelectedAreas] = useState<Set<string>>(new Set())
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set())
  const [targets, setTargets] = useState<Record<string, number>>({})
  const [curveConfigs, setCurveConfigs] = useState<Record<string, MilestoneLadderConfig>>({})

  const stepIndex = STEPS.indexOf(step)

  const handleSelectPath = useCallback((p: DaygamePath) => {
    setPath(p)
    // Auto-select all non-dirty-dog daygame L3s
    const daygameArea = flatData.areas.find((a) => a.lifeArea.id === "daygame")
    if (daygameArea) {
      setSelectedGoals((prev) => {
        const next = new Set<string>()
        // Keep non-daygame selections
        for (const id of prev) {
          if (!id.startsWith("l3_") && !id.startsWith("l2_")) next.add(id)
        }
        // Add all non-dirty-dog L3s
        for (const g of daygameArea.l3Goals) {
          if (g.displayCategory !== "dirty_dog") next.add(g.id)
        }
        return next
      })
    }
    // Auto-advance to goals step
    setStep("goals")
  }, [flatData.areas])

  const handleToggleArea = useCallback((areaId: string) => {
    const wasSelected = selectedAreas.has(areaId)
    setSelectedAreas((prev) => {
      const next = new Set(prev)
      next.has(areaId) ? next.delete(areaId) : next.add(areaId)
      return next
    })
    setSelectedGoals((prev) => {
      const next = new Set(prev)
      if (wasSelected) {
        for (const id of prev) {
          if (id.startsWith(`${areaId}_s`)) next.delete(id)
        }
      } else {
        const area = lifeAreas.find((a) => a.id === areaId)
        if (area?.suggestions) {
          area.suggestions.forEach((_, i) => next.add(`${areaId}_s${i}`))
        }
      }
      return next
    })
  }, [lifeAreas, selectedAreas])

  const toggleGoal = useCallback((id: string) => {
    setSelectedGoals((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const updateTarget = useCallback((id: string, value: number) => {
    setTargets((prev) => ({ ...prev, [id]: value }))
  }, [])

  const updateCurveConfig = useCallback((id: string, config: MilestoneLadderConfig) => {
    setCurveConfigs((prev) => ({ ...prev, [id]: config }))
    setTargets((prev) => ({ ...prev, [id]: config.target }))
  }, [])

  const goNext = useCallback(() => {
    const nextIndex = stepIndex + 1
    if (nextIndex < STEPS.length) setStep(STEPS[nextIndex])
  }, [stepIndex])

  const goToStep = useCallback((i: number) => {
    if (i < stepIndex && i >= 0) setStep(STEPS[i])
  }, [stepIndex])

  // Total goals count
  const daygameArea = flatData.areas.find((a) => a.lifeArea.id === "daygame")
  const selectedDaygameCount = daygameArea?.l3Goals.filter((g) => selectedGoals.has(g.id)).length ?? 0
  const otherGoalCount = lifeAreas
    .filter((a) => selectedAreas.has(a.id) && a.id !== "daygame" && a.id !== "custom")
    .reduce((sum, area) => {
      return sum + (area.suggestions ?? []).filter((_, i) => selectedGoals.has(`${area.id}_s${i}`)).length
    }, 0)
  const totalGoals = selectedDaygameCount + otherGoalCount

  // Step-specific CTA and status
  const ctaConfig = useMemo(() => {
    switch (step) {
      case "direction":
        return { label: "Choose Goals →", disabled: !path, status: path ? `${path === "fto" ? "Find The One" : "Abundance"} selected` : "Select a path to continue" }
      case "goals":
        return { label: `Customize ${selectedGoals.size} Goals →`, disabled: selectedGoals.size === 0, status: `${selectedGoals.size} goals selected` }
      case "customize":
        return { label: "View Summary →", disabled: false, status: `${selectedGoals.size} goals configured` }
      case "summary":
        return { label: "View Your System →", disabled: false, status: `${totalGoals} goals ready` }
      case "orrery":
        return { label: "Create Goals", disabled: false, status: `${totalGoals} goals · ${1 + selectedAreas.size} areas` }
    }
  }, [step, path, selectedGoals.size, totalGoals, selectedAreas.size])

  return (
    <div className="relative">
      <AuroraSkyCanvas />

      {step === "direction" && (
        <DirectionStep
          lifeAreas={lifeAreas}
          selectedPath={path}
          selectedAreas={selectedAreas}
          onSelectPath={handleSelectPath}
          onToggleArea={handleToggleArea}
        />
      )}
      {step === "goals" && (
        <GoalsStep
          flatData={flatData}
          lifeAreas={lifeAreas}
          selectedAreas={selectedAreas}
          selectedGoals={selectedGoals}
          onToggle={toggleGoal}
        />
      )}
      {step === "customize" && (
        <CustomizeStep
          flatData={flatData}
          lifeAreas={lifeAreas}
          selectedAreas={selectedAreas}
          selectedGoals={selectedGoals}
          targets={targets}
          curveConfigs={curveConfigs}
          onUpdateTarget={updateTarget}
          onUpdateCurve={updateCurveConfig}
        />
      )}
      {step === "summary" && (
        <SummaryStep
          flatData={flatData}
          lifeAreas={lifeAreas}
          selectedAreas={selectedAreas}
          selectedGoals={selectedGoals}
          targets={targets}
          path={path}
          badges={flatData.badges}
        />
      )}
      {step === "orrery" && (
        <OrreryStep
          lifeAreas={lifeAreas}
          selectedAreas={selectedAreas}
          selectedGoals={selectedGoals}
          totalGoals={totalGoals}
          badges={flatData.badges}
          path={path}
        />
      )}

      <BottomBar
        currentStep={stepIndex}
        steps={STEP_LABELS}
        statusText={ctaConfig.status}
        ctaLabel={ctaConfig.label}
        ctaDisabled={ctaConfig.disabled}
        onCta={goNext}
        onStepClick={goToStep}
      />
    </div>
  )
}
