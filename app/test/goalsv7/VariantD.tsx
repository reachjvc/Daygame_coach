"use client"

/**
 * V7 Variant D: "Ember Forge" — Warm forge/fire aesthetic
 *
 * Theme: Dwarven forge meets luxury watchmaker. Warm blacks, deep oranges,
 * ember particle effects, hammered metal textures, burnished copper cards,
 * mechanical astrolabe visualization.
 *
 * Step 1 (Direction): Hammered metal path cards + medallion life area chips
 * Step 2 (Goals): Brass plate category headers + amber glow selections
 * Step 3 (Summary): Burnished copper cards forging in with warm glow
 * Step 4 (Your System): Brass astrolabe with interlocking gears + gemstone planets
 */

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
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
  X,
  Flame,
  Compass,
} from "lucide-react"
import { useFlatModelData, useLifeAreas, getDaygamePathL1, type DaygamePath } from "./useGoalData"
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/src/goals/config"
import { MilestoneCurveEditor } from "@/src/goals/components/MilestoneCurveEditor"
import type { GoalTemplate, LifeAreaConfig, MilestoneLadderConfig, GoalDisplayCategory, BadgeStatus } from "@/src/goals/types"

// ============================================================================
// Types & Constants
// ============================================================================

type FlowStep = "direction" | "goals" | "summary" | "orrery"
const STEPS: FlowStep[] = ["direction", "goals", "summary", "orrery"]
const STEP_LABELS = ["Direction", "Goals", "Summary", "Astrolabe"]

interface CustomGoal {
  id: string
  title: string
  categoryId: string
  target: number
  period: string
}

interface CustomCategory {
  id: string
  name: string
}

let _customIdCounter = 0
function nextCustomId(prefix: string) {
  return `${prefix}_${++_customIdCounter}_${Date.now()}`
}

// Forge color palette
const FORGE = {
  bg: "#0f0c08",
  bgCard: "#1a1510",
  bgCardHover: "#231d14",
  border: "#3d2e1a",
  borderGlow: "#c4781e",
  brass: "#c9a84c",
  brassLight: "#e4c76b",
  brassDark: "#8b7540",
  copper: "#b87333",
  copperDark: "#8b5e3c",
  ember: "#e8651a",
  emberLight: "#ff8c42",
  emberDim: "#6b3410",
  amber: "#d4943a",
  amberGlow: "rgba(212,148,58,0.15)",
  gold: "#d4a843",
  warmWhite: "#f5e6d0",
  warmWhite80: "rgba(245,230,208,0.8)",
  warmWhite50: "rgba(245,230,208,0.5)",
  warmWhite30: "rgba(245,230,208,0.3)",
  warmWhite15: "rgba(245,230,208,0.15)",
  warmWhite08: "rgba(245,230,208,0.08)",
  warmWhite04: "rgba(245,230,208,0.04)",
} as const

// ============================================================================
// Ember Particle Background
// ============================================================================

function EmberForgeBackground() {
  const embers = useMemo(() =>
    Array.from({ length: 28 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 8,
      duration: 6 + Math.random() * 6,
      size: 1.5 + Math.random() * 2.5,
      opacity: 0.3 + Math.random() * 0.5,
      drift: -20 + Math.random() * 40,
    })), [])

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Deep charcoal base */}
      <div className="absolute inset-0" style={{
        background: `radial-gradient(ellipse at 50% 80%, #1a120a 0%, ${FORGE.bg} 60%, #080604 100%)`,
      }} />

      {/* Warm vignette at edges */}
      <div className="absolute inset-0" style={{
        background: `radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(30,15,5,0.6) 80%, rgba(10,5,2,0.9) 100%)`,
      }} />

      {/* Subtle heat haze at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-48" style={{
        background: `linear-gradient(to top, rgba(200,100,20,0.04) 0%, transparent 100%)`,
      }} />

      {/* Ember particles */}
      {embers.map((e) => (
        <div
          key={e.id}
          className="absolute rounded-full"
          style={{
            width: e.size,
            height: e.size,
            left: `${e.left}%`,
            bottom: `-${e.size}px`,
            background: `radial-gradient(circle, ${FORGE.emberLight} 0%, ${FORGE.ember} 60%, transparent 100%)`,
            boxShadow: `0 0 ${e.size * 2}px ${FORGE.ember}`,
            animation: `emberRise ${e.duration}s ease-out infinite`,
            animationDelay: `${e.delay}s`,
            opacity: 0,
          }}
        />
      ))}

      {/* Faint forge glow at bottom center */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px]" style={{
        background: `radial-gradient(ellipse at 50% 100%, rgba(200,100,20,0.06) 0%, transparent 70%)`,
        animation: "forgeBreath 6s ease-in-out infinite",
      }} />

      <style>{`
        @keyframes emberRise {
          0% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 0;
          }
          10% {
            opacity: var(--ember-opacity, 0.6);
          }
          60% {
            opacity: var(--ember-opacity, 0.4);
          }
          100% {
            transform: translateY(-100vh) translateX(var(--drift, 20px)) scale(0.3);
            opacity: 0;
          }
        }
        @keyframes forgeBreath {
          0%, 100% { opacity: 0.5; transform: translateX(-50%) scaleY(1); }
          50% { opacity: 1; transform: translateX(-50%) scaleY(1.2); }
        }
      `}</style>
    </div>
  )
}

// ============================================================================
// Forge Reveal Animation Wrapper
// ============================================================================

function ForgeReveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div
      className="forge-reveal"
      style={{
        animation: `forgeRevealIn 0.6s ease-out ${delay}s both`,
      }}
    >
      {children}
    </div>
  )
}

// ============================================================================
// Sticky Bottom Bar — Brass Instrument Panel
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
    <div className="fixed bottom-0 left-0 right-0 z-40"
      style={{
        background: `linear-gradient(to bottom, ${FORGE.bgCard}, ${FORGE.bg})`,
        borderTop: `1px solid ${FORGE.border}`,
        boxShadow: `0 -4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(201,168,76,0.08)`,
      }}
    >
      {/* Top decorative rivet line */}
      <div className="mx-auto max-w-3xl px-6 relative">
        <div className="absolute top-0 left-6 right-6 h-px" style={{
          background: `linear-gradient(90deg, transparent 0%, ${FORGE.brassDark} 20%, ${FORGE.brass} 50%, ${FORGE.brassDark} 80%, transparent 100%)`,
          opacity: 0.3,
        }} />
      </div>

      <div className="mx-auto max-w-3xl flex items-center justify-between px-6 pt-3 pb-2">
        <span className="text-xs font-medium tracking-wide" style={{ color: FORGE.brassDark }}>{statusText}</span>
        <button
          onClick={onCta}
          disabled={ctaDisabled}
          className="px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
          style={{
            background: ctaDisabled
              ? FORGE.bgCard
              : `linear-gradient(135deg, ${FORGE.ember} 0%, ${FORGE.copper} 50%, ${FORGE.ember} 100%)`,
            color: ctaDisabled ? FORGE.brassDark : FORGE.bg,
            border: ctaDisabled ? `1px solid ${FORGE.border}` : `1px solid ${FORGE.emberLight}`,
            boxShadow: ctaDisabled ? "none" : `0 0 20px rgba(232,101,26,0.3), inset 0 1px 0 rgba(255,255,255,0.15)`,
            opacity: ctaDisabled ? 0.4 : 1,
          }}
        >
          {ctaLabel}
        </button>
      </div>

      {/* Mechanical step counter */}
      <div className="mx-auto max-w-3xl flex items-center justify-center px-6 pb-3 gap-1">
        {steps.map((label, i) => {
          const isActive = i === currentStep
          const isDone = i < currentStep
          const isClickable = isDone
          return (
            <div key={label} className="flex items-center gap-1">
              {i > 0 && (
                <div className="w-6 sm:w-10 h-px" style={{
                  background: isDone
                    ? `linear-gradient(90deg, ${FORGE.brass}, ${FORGE.copper})`
                    : FORGE.border,
                }} />
              )}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={() => isClickable && onStepClick(i)}
                  disabled={!isClickable}
                  className="flex items-center justify-center rounded-full text-xs font-bold transition-all"
                  style={{
                    width: isActive ? 32 : 26,
                    height: isActive ? 32 : 26,
                    background: isDone
                      ? `linear-gradient(135deg, ${FORGE.brass}, ${FORGE.copper})`
                      : isActive
                        ? `linear-gradient(135deg, ${FORGE.ember}, ${FORGE.copper})`
                        : FORGE.bgCard,
                    color: isDone || isActive ? FORGE.bg : FORGE.brassDark,
                    border: isActive
                      ? `2px solid ${FORGE.ember}`
                      : isDone
                        ? `1px solid ${FORGE.brass}`
                        : `1px solid ${FORGE.border}`,
                    boxShadow: isActive
                      ? `0 0 16px rgba(232,101,26,0.4), inset 0 1px 0 rgba(255,255,255,0.2)`
                      : isDone
                        ? `0 0 8px rgba(201,168,76,0.2)`
                        : "none",
                    cursor: isClickable ? "pointer" : "default",
                  }}
                >
                  {isDone ? <Check className="size-3" /> : i + 1}
                </button>
                <span className="text-[9px] hidden sm:block tracking-wider uppercase" style={{
                  color: isActive ? FORGE.ember : isDone ? FORGE.brass : FORGE.brassDark,
                }}>
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
// Step 1: Direction — Hammered Metal Path Cards + Medallion Chips
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
        <ForgeReveal>
          <div className="text-center mb-10">
            <Flame className="size-8 mx-auto mb-3" style={{ color: FORGE.ember, filter: `drop-shadow(0 0 8px ${FORGE.ember})` }} />
            <h1 className="text-3xl font-bold mb-2" style={{ color: FORGE.warmWhite }}>
              Forge Your Path
            </h1>
            <p className="text-sm" style={{ color: FORGE.warmWhite30 }}>
              Choose your direction, then select additional life areas to temper.
            </p>
          </div>
        </ForgeReveal>

        {daygame && (() => {
          const DgIcon = daygame.icon
          return (
            <ForgeReveal delay={0.1}>
              <div className="flex items-center gap-3 mb-4">
                <div className="size-7 rounded-lg flex items-center justify-center"
                  style={{ background: `${FORGE.ember}20`, border: `1px solid ${FORGE.ember}30` }}>
                  <DgIcon className="size-4" style={{ color: FORGE.ember }} />
                </div>
                <span className="text-xs font-bold uppercase tracking-[0.15em]"
                  style={{ color: FORGE.ember }}>
                  {daygame.name}
                </span>
              </div>
            </ForgeReveal>
          )
        })()}

        {/* Hammered metal path cards */}
        <ForgeReveal delay={0.15}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {/* Find The One */}
            <button
              onClick={() => onSelectPath("fto")}
              className="rounded-2xl p-5 text-left transition-all group"
              style={{
                background: selectedPath === "fto"
                  ? `linear-gradient(145deg, rgba(139,92,246,0.12), ${FORGE.bgCard})`
                  : `linear-gradient(145deg, ${FORGE.bgCard}, ${FORGE.bg})`,
                border: selectedPath === "fto"
                  ? `2px solid rgba(139,92,246,0.5)`
                  : `1px solid ${FORGE.border}`,
                boxShadow: selectedPath === "fto"
                  ? `0 0 24px rgba(139,92,246,0.15), inset 0 1px 0 rgba(139,92,246,0.1)`
                  : `inset 0 1px 0 rgba(255,255,255,0.03)`,
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="size-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: selectedPath === "fto" ? "rgba(139,92,246,0.2)" : `${FORGE.warmWhite04}`,
                    border: `1px solid ${selectedPath === "fto" ? "rgba(139,92,246,0.3)" : FORGE.border}`,
                    boxShadow: selectedPath === "fto" ? "0 0 12px rgba(139,92,246,0.2)" : "none",
                  }}>
                  <Star className="size-5" style={{ color: selectedPath === "fto" ? "#a78bfa" : FORGE.warmWhite30 }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold" style={{ color: FORGE.warmWhite }}>Find The One</h3>
                  <p className="text-xs" style={{ color: FORGE.warmWhite30 }}>Connection & commitment</p>
                </div>
                {selectedPath === "fto" && (
                  <div className="size-6 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(139,92,246,0.3)", border: "1px solid rgba(139,92,246,0.5)" }}>
                    <Check className="size-3 text-violet-300" />
                  </div>
                )}
              </div>
              <p className="text-sm mb-3" style={{ color: FORGE.warmWhite30 }}>
                I want to find one special person and build something real.
              </p>
              <div className="space-y-1.5">
                {ftoL1s.slice(0, 3).map((l1) => (
                  <div key={l1.id} className="flex items-center gap-2 text-xs" style={{ color: FORGE.warmWhite15 }}>
                    <ChevronRight className="size-3" />
                    <span>{l1.title}</span>
                  </div>
                ))}
                {ftoL1s.length > 3 && (
                  <span className="text-xs pl-5" style={{ color: "rgba(139,92,246,0.4)" }}>
                    +{ftoL1s.length - 3} more paths
                  </span>
                )}
              </div>
            </button>

            {/* Abundance */}
            <button
              onClick={() => onSelectPath("abundance")}
              className="rounded-2xl p-5 text-left transition-all group"
              style={{
                background: selectedPath === "abundance"
                  ? `linear-gradient(145deg, rgba(232,101,26,0.12), ${FORGE.bgCard})`
                  : `linear-gradient(145deg, ${FORGE.bgCard}, ${FORGE.bg})`,
                border: selectedPath === "abundance"
                  ? `2px solid ${FORGE.ember}80`
                  : `1px solid ${FORGE.border}`,
                boxShadow: selectedPath === "abundance"
                  ? `0 0 24px rgba(232,101,26,0.15), inset 0 1px 0 rgba(232,101,26,0.1)`
                  : `inset 0 1px 0 rgba(255,255,255,0.03)`,
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="size-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: selectedPath === "abundance" ? `${FORGE.ember}20` : `${FORGE.warmWhite04}`,
                    border: `1px solid ${selectedPath === "abundance" ? `${FORGE.ember}40` : FORGE.border}`,
                    boxShadow: selectedPath === "abundance" ? `0 0 12px ${FORGE.ember}30` : "none",
                  }}>
                  <Flame className="size-5" style={{ color: selectedPath === "abundance" ? FORGE.emberLight : FORGE.warmWhite30 }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold" style={{ color: FORGE.warmWhite }}>Abundance</h3>
                  <p className="text-xs" style={{ color: FORGE.warmWhite30 }}>Freedom & experience</p>
                </div>
                {selectedPath === "abundance" && (
                  <div className="size-6 rounded-full flex items-center justify-center"
                    style={{ background: `${FORGE.ember}30`, border: `1px solid ${FORGE.ember}60` }}>
                    <Check className="size-3" style={{ color: FORGE.emberLight }} />
                  </div>
                )}
              </div>
              <p className="text-sm mb-3" style={{ color: FORGE.warmWhite30 }}>
                I want to experience abundance and freedom in dating.
              </p>
              <div className="space-y-1.5">
                {abundanceL1s.slice(0, 3).map((l1) => (
                  <div key={l1.id} className="flex items-center gap-2 text-xs" style={{ color: FORGE.warmWhite15 }}>
                    <ChevronRight className="size-3" />
                    <span>{l1.title}</span>
                  </div>
                ))}
                {abundanceL1s.length > 3 && (
                  <span className="text-xs pl-5" style={{ color: `${FORGE.ember}60` }}>
                    +{abundanceL1s.length - 3} more paths
                  </span>
                )}
              </div>
            </button>
          </div>
        </ForgeReveal>

        {/* Divider with decorative forge line */}
        <ForgeReveal delay={0.2}>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px" style={{
              background: `linear-gradient(90deg, transparent, ${FORGE.border}, transparent)`,
            }} />
            <span className="text-xs uppercase tracking-[0.2em] font-medium" style={{ color: FORGE.brassDark }}>
              Other Life Areas
            </span>
            <div className="flex-1 h-px" style={{
              background: `linear-gradient(90deg, transparent, ${FORGE.border}, transparent)`,
            }} />
          </div>
        </ForgeReveal>

        {/* Medallion life area chips */}
        <ForgeReveal delay={0.25}>
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
                    background: isSelected
                      ? `linear-gradient(145deg, ${area.hex}10, ${FORGE.bgCard})`
                      : `linear-gradient(145deg, ${FORGE.bgCard}, ${FORGE.bg})`,
                    border: isSelected ? `1px solid ${area.hex}40` : `1px solid ${FORGE.border}`,
                    boxShadow: isSelected
                      ? `0 0 16px ${area.hex}15, inset 0 1px 0 ${area.hex}10`
                      : `inset 0 1px 0 rgba(255,255,255,0.02)`,
                  }}
                >
                  <div className="size-10 rounded-full flex items-center justify-center"
                    style={{
                      background: isSelected ? `${area.hex}18` : FORGE.warmWhite04,
                      border: isSelected ? `2px solid ${area.hex}40` : `1px solid ${FORGE.border}`,
                      boxShadow: isSelected ? `0 0 10px ${area.hex}20` : "none",
                    }}>
                    <Icon className="size-5" style={{ color: isSelected ? area.hex : FORGE.warmWhite30 }} />
                  </div>
                  <span className="text-xs font-medium text-center leading-tight"
                    style={{ color: isSelected ? FORGE.warmWhite80 : FORGE.warmWhite30 }}>
                    {area.name}
                  </span>
                </button>
              )
            })}
          </div>
        </ForgeReveal>
      </div>

      <style>{`
        @keyframes forgeRevealIn {
          0% {
            opacity: 0;
            transform: scale(0.97) skewX(-0.5deg);
            filter: brightness(1.3);
          }
          40% {
            filter: brightness(1.1);
          }
          100% {
            opacity: 1;
            transform: scale(1) skewX(0deg);
            filter: brightness(1);
          }
        }
      `}</style>
    </div>
  )
}

// ============================================================================
// Step 2: Goals — Brass Plate Headers + Amber Glow Selections
// ============================================================================

function GoalsStep({
  flatData,
  lifeAreas,
  selectedAreas,
  selectedGoals,
  targets,
  curveConfigs,
  customGoals,
  customCategories,
  onToggle,
  onUpdateTarget,
  onUpdateCurve,
  onAddCustomGoal,
  onRemoveCustomGoal,
  onUpdateCustomGoalTitle,
  onAddCustomCategory,
  onRenameCustomCategory,
  onRemoveCustomCategory,
}: {
  flatData: ReturnType<typeof useFlatModelData>
  lifeAreas: LifeAreaConfig[]
  selectedAreas: Set<string>
  selectedGoals: Set<string>
  targets: Record<string, number>
  curveConfigs: Record<string, MilestoneLadderConfig>
  customGoals: CustomGoal[]
  customCategories: CustomCategory[]
  onToggle: (id: string) => void
  onUpdateTarget: (id: string, value: number) => void
  onUpdateCurve: (id: string, config: MilestoneLadderConfig) => void
  onAddCustomGoal: (categoryId: string) => void
  onRemoveCustomGoal: (goalId: string) => void
  onUpdateCustomGoalTitle: (goalId: string, title: string) => void
  onAddCustomCategory: () => void
  onRenameCustomCategory: (catId: string, name: string) => void
  onRemoveCustomCategory: (catId: string) => void
}) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set())
  const [expandedCurve, setExpandedCurve] = useState<string | null>(null)
  const daygameArea = flatData.areas.find((a) => a.lifeArea.id === "daygame")
  const prevCustomCatCount = useRef(customCategories.length)

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  useEffect(() => {
    if (daygameArea && daygameArea.l3Goals.length > 0) {
      const firstCat = daygameArea.l3Goals[0]?.displayCategory ?? "field_work"
      setExpandedSections((prev) => {
        if (prev.size === 0) return new Set([`dg_${firstCat}`])
        return prev
      })
    }
  }, [daygameArea])

  useEffect(() => {
    if (customCategories.length > prevCustomCatCount.current) {
      const newest = customCategories[customCategories.length - 1]
      setExpandedSections((prev) => new Set([...prev, `custom_${newest.id}`]))
    }
    prevCustomCatCount.current = customCategories.length
  }, [customCategories])

  const daygameByCategory = useMemo(() => {
    if (!daygameArea) return []
    const grouped: Record<string, GoalTemplate[]> = {}
    for (const g of daygameArea.l3Goals) {
      const cat = g.displayCategory ?? "field_work"
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(g)
    }
    const order: GoalDisplayCategory[] = [...CATEGORY_ORDER.filter((c) => c !== "dirty_dog"), "dirty_dog"]
    return order
      .filter((cat) => grouped[cat] && grouped[cat].length > 0)
      .map((cat) => ({ category: cat, goals: grouped[cat] }))
  }, [daygameArea])

  const customGoalsForCategory = useCallback(
    (catId: string) => customGoals.filter((g) => g.categoryId === catId),
    [customGoals]
  )

  const daygameSelected = daygameArea?.l3Goals.filter((g) => selectedGoals.has(g.id)).length ?? 0

  const getGoalMeta = (g: GoalTemplate) => {
    const defaultTarget = g.defaultMilestoneConfig?.target
      ?? g.defaultRampSteps?.[0]?.frequencyPerWeek
      ?? 5
    return {
      type: (g.templateType === "habit_ramp" ? "habit" : "milestone") as "habit" | "milestone",
      target: targets[g.id] ?? defaultTarget,
      period: g.templateType === "habit_ramp" ? "per week" : "total",
      hasCurve: g.templateType === "milestone_ladder" && g.defaultMilestoneConfig != null,
      defaultCurve: g.defaultMilestoneConfig,
    }
  }

  /** Forge-styled +/- controls */
  const ForgeTargetControls = ({ goalId, target, period, hasCurve, defaultCurve, curveConfig }: {
    goalId: string; target: number; period: string;
    hasCurve?: boolean; defaultCurve?: MilestoneLadderConfig | null; curveConfig?: MilestoneLadderConfig
  }) => (
    <div className="flex items-center gap-1.5 shrink-0">
      {hasCurve && (
        <button
          onClick={() => setExpandedCurve(expandedCurve === goalId ? null : goalId)}
          className="size-7 rounded-md flex items-center justify-center transition-all"
          style={{
            border: expandedCurve === goalId ? `1px solid ${FORGE.ember}60` : `1px solid ${FORGE.border}`,
            background: expandedCurve === goalId ? `${FORGE.ember}15` : "transparent",
            boxShadow: expandedCurve === goalId ? `0 0 8px ${FORGE.ember}20` : "none",
          }}
          title="Customize milestone curve"
        >
          <SlidersHorizontal className="size-3" style={{
            color: expandedCurve === goalId ? FORGE.ember : FORGE.warmWhite30,
          }} />
        </button>
      )}
      <button
        onClick={() => onUpdateTarget(goalId, Math.max(1, target - 1))}
        className="size-7 rounded-md flex items-center justify-center transition-all hover:brightness-125"
        style={{
          background: `linear-gradient(145deg, ${FORGE.bgCardHover}, ${FORGE.bgCard})`,
          border: `1px solid ${FORGE.border}`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04)`,
        }}
      >
        <Minus className="size-3" style={{ color: FORGE.warmWhite30 }} />
      </button>
      <span className="text-xs font-bold w-7 text-center" style={{ color: FORGE.brassLight }}>
        {target}
      </span>
      <button
        onClick={() => onUpdateTarget(goalId, target + 1)}
        className="size-7 rounded-md flex items-center justify-center transition-all hover:brightness-125"
        style={{
          background: `linear-gradient(145deg, ${FORGE.bgCardHover}, ${FORGE.bgCard})`,
          border: `1px solid ${FORGE.border}`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04)`,
        }}
      >
        <Plus className="size-3" style={{ color: FORGE.warmWhite30 }} />
      </button>
      <span className="text-[9px] w-10 text-right" style={{ color: FORGE.brassDark }}>{period}</span>
    </div>
  )

  return (
    <div className="min-h-screen pt-12 pb-36 px-6">
      <div className="mx-auto max-w-2xl">
        <ForgeReveal>
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-1" style={{ color: FORGE.warmWhite }}>
              Select Your Goals
            </h2>
            <p className="text-sm" style={{ color: FORGE.warmWhite30 }}>
              Toggle goals and set targets. Every piece is forged to your specification.
            </p>
          </div>
        </ForgeReveal>

        {/* Daygame goals by display category */}
        {daygameByCategory.length > 0 && (
          <div className="mb-8">
            <ForgeReveal delay={0.05}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: FORGE.ember }}>
                  Dating & Daygame
                </span>
                <span className="text-xs" style={{ color: FORGE.brassDark }}>{daygameSelected} selected</span>
              </div>
            </ForgeReveal>

            {daygameByCategory.map(({ category, goals }, catIdx) => {
              const sectionId = `dg_${category}`
              const isExpanded = expandedSections.has(sectionId)
              const selectedCount = goals.filter((g) => selectedGoals.has(g.id)).length

              return (
                <ForgeReveal key={category} delay={0.08 + catIdx * 0.03}>
                  <div className="mb-3">
                    {/* Brass plate category header */}
                    <button
                      onClick={() => toggleSection(sectionId)}
                      className="w-full flex items-center gap-3 rounded-lg px-4 py-2.5 transition-all"
                      style={{
                        background: selectedCount > 0
                          ? `linear-gradient(135deg, ${FORGE.bgCardHover}, ${FORGE.bgCard})`
                          : `linear-gradient(135deg, ${FORGE.bgCard}, ${FORGE.bg})`,
                        border: selectedCount > 0
                          ? `1px solid ${FORGE.brass}30`
                          : `1px solid ${FORGE.border}`,
                        boxShadow: selectedCount > 0
                          ? `inset 0 1px 0 ${FORGE.brass}10`
                          : `inset 0 1px 0 rgba(255,255,255,0.02)`,
                      }}
                    >
                      {isExpanded
                        ? <ChevronDown className="size-3.5" style={{ color: FORGE.brass }} />
                        : <ChevronRight className="size-3.5" style={{ color: FORGE.brass }} />
                      }
                      <span className="text-sm flex-1 text-left font-semibold tracking-wide" style={{ color: FORGE.brass }}>
                        {CATEGORY_LABELS[category] ?? category.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px]" style={{ color: FORGE.brassDark }}>
                        {selectedCount}/{goals.length}
                      </span>
                    </button>

                    {/* Decorative line under header */}
                    {isExpanded && (
                      <div className="mx-4 h-px" style={{
                        background: `linear-gradient(90deg, transparent, ${FORGE.brass}20, transparent)`,
                      }} />
                    )}

                    {isExpanded && (
                      <div className="ml-4 mt-1.5 space-y-1">
                        {goals.map((l3) => {
                          const isOn = selectedGoals.has(l3.id)
                          const meta = getGoalMeta(l3)
                          return (
                            <div key={l3.id}>
                              <div
                                className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all"
                                style={{
                                  background: isOn ? `${FORGE.amber}08` : "transparent",
                                  border: isOn ? `1px solid ${FORGE.amber}20` : "1px solid transparent",
                                  boxShadow: isOn ? `0 0 12px ${FORGE.amber}06` : "none",
                                }}
                              >
                                <button
                                  onClick={() => onToggle(l3.id)}
                                  className="size-4 rounded flex items-center justify-center shrink-0 transition-all"
                                  style={{
                                    background: isOn
                                      ? `linear-gradient(135deg, ${FORGE.ember}, ${FORGE.copper})`
                                      : FORGE.warmWhite08,
                                    border: isOn ? "none" : `1px solid ${FORGE.warmWhite15}`,
                                    boxShadow: isOn ? `0 0 6px ${FORGE.ember}40` : "none",
                                  }}
                                >
                                  {isOn && <Check className="size-2.5" style={{ color: FORGE.bg }} />}
                                </button>
                                <span className="text-sm flex-1 min-w-0" style={{
                                  color: isOn ? FORGE.warmWhite80 : FORGE.warmWhite30,
                                }}>
                                  {l3.title}
                                </span>
                                {category === "dirty_dog" && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded shrink-0"
                                    style={{
                                      color: `${FORGE.ember}90`,
                                      background: `${FORGE.ember}12`,
                                      border: `1px solid ${FORGE.ember}20`,
                                    }}>
                                    advanced
                                  </span>
                                )}
                                {isOn && (
                                  <ForgeTargetControls
                                    goalId={l3.id}
                                    target={meta.target}
                                    period={meta.period}
                                    hasCurve={meta.hasCurve}
                                    defaultCurve={meta.defaultCurve}
                                  />
                                )}
                              </div>
                              {isOn && meta.hasCurve && expandedCurve === l3.id && meta.defaultCurve && (
                                <div className="mt-1 ml-7 mr-2 mb-2">
                                  <MilestoneCurveEditor
                                    config={curveConfigs[l3.id] ?? meta.defaultCurve}
                                    onChange={(config) => onUpdateCurve(l3.id, config)}
                                    allowDirectEdit
                                  />
                                  <button
                                    onClick={() => setExpandedCurve(null)}
                                    className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-all"
                                    style={{
                                      background: `${FORGE.ember}10`,
                                      border: `1px solid ${FORGE.ember}30`,
                                      color: FORGE.ember,
                                    }}
                                  >
                                    <Check className="size-3" />
                                    Accept Curve
                                  </button>
                                </div>
                              )}
                            </div>
                          )
                        })}

                        {/* Custom goals in this category */}
                        {customGoalsForCategory(category).map((cg) => (
                          <div key={cg.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                            style={{
                              background: `${FORGE.amber}08`,
                              border: `1px solid ${FORGE.amber}20`,
                            }}
                          >
                            <div className="size-4 rounded flex items-center justify-center shrink-0"
                              style={{
                                background: `linear-gradient(135deg, ${FORGE.ember}, ${FORGE.copper})`,
                                boxShadow: `0 0 6px ${FORGE.ember}40`,
                              }}
                            >
                              <Check className="size-2.5" style={{ color: FORGE.bg }} />
                            </div>
                            <input
                              type="text"
                              value={cg.title}
                              onChange={(e) => onUpdateCustomGoalTitle(cg.id, e.target.value)}
                              placeholder="Goal name..."
                              className="text-sm flex-1 min-w-0 bg-transparent outline-none"
                              style={{ color: FORGE.warmWhite80, caretColor: FORGE.ember }}
                              autoFocus={!cg.title}
                            />
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => onUpdateTarget(cg.id, Math.max(1, (targets[cg.id] ?? cg.target) - 1))}
                                className="size-7 rounded-md flex items-center justify-center transition-all"
                                style={{
                                  background: `linear-gradient(145deg, ${FORGE.bgCardHover}, ${FORGE.bgCard})`,
                                  border: `1px solid ${FORGE.border}`,
                                }}
                              >
                                <Minus className="size-3" style={{ color: FORGE.warmWhite30 }} />
                              </button>
                              <span className="text-xs font-bold w-7 text-center" style={{ color: FORGE.brassLight }}>
                                {targets[cg.id] ?? cg.target}
                              </span>
                              <button
                                onClick={() => onUpdateTarget(cg.id, (targets[cg.id] ?? cg.target) + 1)}
                                className="size-7 rounded-md flex items-center justify-center transition-all"
                                style={{
                                  background: `linear-gradient(145deg, ${FORGE.bgCardHover}, ${FORGE.bgCard})`,
                                  border: `1px solid ${FORGE.border}`,
                                }}
                              >
                                <Plus className="size-3" style={{ color: FORGE.warmWhite30 }} />
                              </button>
                              <button
                                onClick={() => onRemoveCustomGoal(cg.id)}
                                className="size-7 rounded-md flex items-center justify-center transition-all hover:bg-red-500/10"
                                style={{ border: `1px solid ${FORGE.border}` }}
                                title="Remove"
                              >
                                <X className="size-3" style={{ color: FORGE.warmWhite30 }} />
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Add custom goal button */}
                        <button
                          onClick={() => onAddCustomGoal(category)}
                          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-all"
                          style={{
                            border: `1px dashed ${FORGE.border}`,
                          }}
                        >
                          <Plus className="size-3.5" style={{ color: FORGE.brassDark }} />
                          <span className="text-sm" style={{ color: FORGE.brassDark }}>Add custom goal</span>
                        </button>
                      </div>
                    )}
                  </div>
                </ForgeReveal>
              )
            })}

            {/* Custom categories */}
            {customCategories.map((cat) => {
              const sectionId = `custom_${cat.id}`
              const isExpanded = expandedSections.has(sectionId)
              const catGoals = customGoalsForCategory(cat.id)

              return (
                <div key={cat.id} className="mb-3">
                  <div className="w-full flex items-center gap-3 rounded-lg px-4 py-2.5"
                    style={{
                      background: catGoals.length > 0
                        ? `linear-gradient(135deg, ${FORGE.bgCardHover}, ${FORGE.bgCard})`
                        : `linear-gradient(135deg, ${FORGE.bgCard}, ${FORGE.bg})`,
                      border: catGoals.length > 0
                        ? `1px solid ${FORGE.copper}30`
                        : `1px solid ${FORGE.border}`,
                    }}
                  >
                    <button onClick={() => toggleSection(sectionId)} className="shrink-0">
                      {isExpanded
                        ? <ChevronDown className="size-3.5" style={{ color: FORGE.copper }} />
                        : <ChevronRight className="size-3.5" style={{ color: FORGE.copper }} />
                      }
                    </button>
                    <input
                      type="text"
                      value={cat.name}
                      onChange={(e) => onRenameCustomCategory(cat.id, e.target.value)}
                      placeholder="Category name..."
                      className="text-sm flex-1 bg-transparent outline-none font-semibold tracking-wide"
                      style={{ color: FORGE.copper, caretColor: FORGE.ember }}
                      onClick={() => { if (!isExpanded) toggleSection(sectionId) }}
                      autoFocus={!cat.name}
                    />
                    <span className="text-[10px] shrink-0" style={{ color: FORGE.brassDark }}>{catGoals.length}</span>
                    <button
                      onClick={() => onRemoveCustomCategory(cat.id)}
                      className="size-5 rounded flex items-center justify-center transition-colors hover:bg-red-500/15 shrink-0"
                      title="Remove category"
                    >
                      <X className="size-3" style={{ color: FORGE.warmWhite30 }} />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="ml-4 mt-1.5 space-y-1">
                      {catGoals.map((cg) => (
                        <div key={cg.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                          style={{
                            background: `${FORGE.copper}08`,
                            border: `1px solid ${FORGE.copper}15`,
                          }}
                        >
                          <div className="size-4 rounded flex items-center justify-center shrink-0"
                            style={{
                              background: `linear-gradient(135deg, ${FORGE.copper}, ${FORGE.copperDark})`,
                            }}
                          >
                            <Check className="size-2.5" style={{ color: FORGE.bg }} />
                          </div>
                          <input
                            type="text"
                            value={cg.title}
                            onChange={(e) => onUpdateCustomGoalTitle(cg.id, e.target.value)}
                            placeholder="Goal name..."
                            className="text-sm flex-1 min-w-0 bg-transparent outline-none"
                            style={{ color: FORGE.warmWhite80, caretColor: FORGE.ember }}
                            autoFocus={!cg.title}
                          />
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => onUpdateTarget(cg.id, Math.max(1, (targets[cg.id] ?? cg.target) - 1))}
                              className="size-7 rounded-md flex items-center justify-center"
                              style={{
                                background: `linear-gradient(145deg, ${FORGE.bgCardHover}, ${FORGE.bgCard})`,
                                border: `1px solid ${FORGE.border}`,
                              }}
                            >
                              <Minus className="size-3" style={{ color: FORGE.warmWhite30 }} />
                            </button>
                            <span className="text-xs font-bold w-7 text-center" style={{ color: FORGE.brassLight }}>
                              {targets[cg.id] ?? cg.target}
                            </span>
                            <button
                              onClick={() => onUpdateTarget(cg.id, (targets[cg.id] ?? cg.target) + 1)}
                              className="size-7 rounded-md flex items-center justify-center"
                              style={{
                                background: `linear-gradient(145deg, ${FORGE.bgCardHover}, ${FORGE.bgCard})`,
                                border: `1px solid ${FORGE.border}`,
                              }}
                            >
                              <Plus className="size-3" style={{ color: FORGE.warmWhite30 }} />
                            </button>
                            <button
                              onClick={() => onRemoveCustomGoal(cg.id)}
                              className="size-7 rounded-md flex items-center justify-center hover:bg-red-500/10"
                              style={{ border: `1px solid ${FORGE.border}` }}
                              title="Remove"
                            >
                              <X className="size-3" style={{ color: FORGE.warmWhite30 }} />
                            </button>
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={() => onAddCustomGoal(cat.id)}
                        className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-all"
                        style={{ border: `1px dashed ${FORGE.border}` }}
                      >
                        <Plus className="size-3.5" style={{ color: FORGE.brassDark }} />
                        <span className="text-sm" style={{ color: FORGE.brassDark }}>Add custom goal</span>
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Add custom category button */}
            <button
              onClick={onAddCustomCategory}
              className="w-full flex items-center gap-3 rounded-lg px-4 py-2.5 transition-all mb-3"
              style={{
                border: `1px dashed ${FORGE.copper}30`,
              }}
            >
              <Plus className="size-3.5" style={{ color: `${FORGE.copper}60` }} />
              <span className="text-sm" style={{ color: `${FORGE.copper}60` }}>Add custom category</span>
            </button>
          </div>
        )}

        {/* Other selected life areas */}
        {lifeAreas
          .filter((a) => selectedAreas.has(a.id) && a.id !== "daygame" && a.id !== "custom")
          .map((area, areaIdx) => {
            const Icon = area.icon
            const suggestions = area.suggestions
            if (!suggestions || suggestions.length === 0) return null
            const isExpanded = expandedSections.has(area.id)
            const areaSelected = suggestions.filter((_, i) =>
              selectedGoals.has(`${area.id}_s${i}`)
            ).length

            return (
              <ForgeReveal key={area.id} delay={0.1 + areaIdx * 0.03}>
                <div className="mb-4">
                  <button
                    onClick={() => toggleSection(area.id)}
                    className="w-full flex items-center gap-3 rounded-lg px-4 py-2.5 transition-all"
                    style={{
                      background: `linear-gradient(135deg, ${area.hex}08, ${FORGE.bgCard})`,
                      border: `1px solid ${area.hex}20`,
                    }}
                  >
                    {isExpanded
                      ? <ChevronDown className="size-3.5" style={{ color: `${area.hex}80` }} />
                      : <ChevronRight className="size-3.5" style={{ color: `${area.hex}80` }} />
                    }
                    <Icon className="size-3.5" style={{ color: area.hex }} />
                    <span className="text-sm flex-1 text-left font-semibold tracking-wide" style={{ color: FORGE.brass }}>
                      {area.name}
                    </span>
                    <span className="text-[10px]" style={{ color: FORGE.brassDark }}>{areaSelected}/{suggestions.length}</span>
                  </button>

                  {isExpanded && (
                    <div className="ml-4 mt-1.5 space-y-1">
                      {suggestions.map((s, i) => {
                        const id = `${area.id}_s${i}`
                        const isOn = selectedGoals.has(id)
                        const target = targets[id] ?? s.defaultTarget
                        return (
                          <div
                            key={id}
                            className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all"
                            style={{
                              background: isOn ? `${area.hex}08` : "transparent",
                              border: isOn ? `1px solid ${area.hex}15` : "1px solid transparent",
                            }}
                          >
                            <button
                              onClick={() => onToggle(id)}
                              className="size-4 rounded flex items-center justify-center shrink-0 transition-all"
                              style={{
                                background: isOn
                                  ? `linear-gradient(135deg, ${area.hex}, ${area.hex}cc)`
                                  : FORGE.warmWhite08,
                                border: isOn ? "none" : `1px solid ${FORGE.warmWhite15}`,
                                boxShadow: isOn ? `0 0 6px ${area.hex}40` : "none",
                              }}
                            >
                              {isOn && <Check className="size-2.5" style={{ color: FORGE.bg }} />}
                            </button>
                            <span className="text-sm flex-1" style={{
                              color: isOn ? FORGE.warmWhite80 : FORGE.warmWhite30,
                            }}>
                              {s.title}
                            </span>

                            {isOn && (
                              <ForgeTargetControls
                                goalId={id}
                                target={target}
                                period={s.defaultPeriod}
                              />
                            )}
                          </div>
                        )
                      })}

                      {/* Custom goals in this area */}
                      {customGoalsForCategory(area.id).map((cg) => (
                        <div key={cg.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                          style={{
                            background: `${area.hex}08`,
                            border: `1px solid ${area.hex}15`,
                          }}
                        >
                          <div className="size-4 rounded flex items-center justify-center shrink-0"
                            style={{ background: area.hex }}
                          >
                            <Check className="size-2.5" style={{ color: FORGE.bg }} />
                          </div>
                          <input
                            type="text"
                            value={cg.title}
                            onChange={(e) => onUpdateCustomGoalTitle(cg.id, e.target.value)}
                            placeholder="Goal name..."
                            className="text-sm flex-1 min-w-0 bg-transparent outline-none"
                            style={{ color: FORGE.warmWhite80, caretColor: FORGE.ember }}
                            autoFocus={!cg.title}
                          />
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => onUpdateTarget(cg.id, Math.max(1, (targets[cg.id] ?? cg.target) - 1))}
                              className="size-7 rounded-md flex items-center justify-center"
                              style={{
                                background: `linear-gradient(145deg, ${FORGE.bgCardHover}, ${FORGE.bgCard})`,
                                border: `1px solid ${FORGE.border}`,
                              }}
                            >
                              <Minus className="size-3" style={{ color: FORGE.warmWhite30 }} />
                            </button>
                            <span className="text-xs font-bold w-7 text-center" style={{ color: FORGE.brassLight }}>
                              {targets[cg.id] ?? cg.target}
                            </span>
                            <button
                              onClick={() => onUpdateTarget(cg.id, (targets[cg.id] ?? cg.target) + 1)}
                              className="size-7 rounded-md flex items-center justify-center"
                              style={{
                                background: `linear-gradient(145deg, ${FORGE.bgCardHover}, ${FORGE.bgCard})`,
                                border: `1px solid ${FORGE.border}`,
                              }}
                            >
                              <Plus className="size-3" style={{ color: FORGE.warmWhite30 }} />
                            </button>
                            <button
                              onClick={() => onRemoveCustomGoal(cg.id)}
                              className="size-7 rounded-md flex items-center justify-center hover:bg-red-500/10"
                              style={{ border: `1px solid ${FORGE.border}` }}
                              title="Remove"
                            >
                              <X className="size-3" style={{ color: FORGE.warmWhite30 }} />
                            </button>
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={() => onAddCustomGoal(area.id)}
                        className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-all"
                        style={{ border: `1px dashed ${FORGE.border}` }}
                      >
                        <Plus className="size-3.5" style={{ color: FORGE.brassDark }} />
                        <span className="text-sm" style={{ color: FORGE.brassDark }}>Add custom goal</span>
                      </button>
                    </div>
                  )}
                </div>
              </ForgeReveal>
            )
          })}
      </div>

      <style>{`
        @keyframes forgeRevealIn {
          0% {
            opacity: 0;
            transform: scale(0.97) skewX(-0.5deg);
            filter: brightness(1.3);
          }
          40% {
            filter: brightness(1.1);
          }
          100% {
            opacity: 1;
            transform: scale(1) skewX(0deg);
            filter: brightness(1);
          }
        }
      `}</style>
    </div>
  )
}

// ============================================================================
// Step 3: Summary — Burnished Copper Cards
// ============================================================================

function SummaryStep({
  flatData,
  lifeAreas,
  selectedAreas,
  selectedGoals,
  targets,
  path,
  badges,
  customGoals,
  customCategories,
}: {
  flatData: ReturnType<typeof useFlatModelData>
  lifeAreas: LifeAreaConfig[]
  selectedAreas: Set<string>
  selectedGoals: Set<string>
  targets: Record<string, number>
  path: DaygamePath | null
  badges: BadgeStatus[]
  customGoals: CustomGoal[]
  customCategories: CustomCategory[]
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

  const namedCustomGoals = customGoals.filter((g) => g.title.trim())
  const totalGoals = selectedDaygameL3s.length + otherAreaData.reduce((sum, a) => sum + a.goals.length, 0) + namedCustomGoals.length
  const totalAreas = 1 + otherAreaData.length

  const TIER_COLORS: Record<string, string> = {
    diamond: "#b9f2ff",
    gold: "#ffd700",
    silver: "#c0c0c0",
    bronze: "#cd7f32",
    none: FORGE.brassDark,
  }

  return (
    <div className="min-h-screen pt-12 pb-36 px-6">
      <div className="mx-auto max-w-2xl">
        <ForgeReveal>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2" style={{ color: FORGE.brassLight }}>Forged & Ready</h2>
            <p className="text-sm" style={{ color: FORGE.warmWhite30 }}>
              {totalGoals} goals across {totalAreas} life area{totalAreas > 1 ? "s" : ""}
              {path && ` \u00B7 ${path === "fto" ? "Find The One" : "Abundance"} path`}
            </p>
          </div>
        </ForgeReveal>

        {/* Stats with illuminated numbers */}
        <ForgeReveal delay={0.1}>
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { label: "Total Goals", value: String(totalGoals) },
              { label: "Life Areas", value: String(totalAreas) },
              { label: "Achievements", value: String(badges.length) },
            ].map((stat, i) => (
              <div key={stat.label} className="rounded-xl p-4 text-center"
                style={{
                  background: `linear-gradient(145deg, ${FORGE.bgCardHover}, ${FORGE.bgCard})`,
                  border: `1px solid ${FORGE.border}`,
                  boxShadow: `inset 0 1px 0 ${FORGE.brass}08`,
                  animation: `forgeCardIn 0.5s ease-out ${0.15 + i * 0.08}s both`,
                }}
              >
                <div className="text-2xl font-black mb-0.5" style={{
                  color: FORGE.brassLight,
                  textShadow: `0 0 20px ${FORGE.brass}40, 0 0 40px ${FORGE.brass}20`,
                }}>
                  {stat.value}
                </div>
                <div className="text-[10px] uppercase tracking-[0.15em] font-medium" style={{ color: FORGE.brassDark }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </ForgeReveal>

        {/* Badges / Achievements */}
        {badges.length > 0 && (
          <ForgeReveal delay={0.2}>
            <div className="mb-6 rounded-xl overflow-hidden"
              style={{
                background: `linear-gradient(145deg, ${FORGE.bgCardHover}, ${FORGE.bgCard})`,
                border: `1px solid ${FORGE.border}`,
                boxShadow: `inset 0 1px 0 ${FORGE.brass}06`,
              }}
            >
              <div className="px-5 py-3 flex items-center justify-between"
                style={{ borderBottom: `1px solid ${FORGE.border}` }}
              >
                <div className="flex items-center gap-2">
                  <Trophy className="size-3.5" style={{ color: FORGE.brass }} />
                  <span className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: FORGE.brass }}>
                    Achievements You&apos;ll Unlock
                  </span>
                </div>
                <span className="text-xs" style={{ color: FORGE.brassDark }}>{badges.length} badges</span>
              </div>
              <div className="px-5 py-3 space-y-2.5">
                {badges.map((badge, bIdx) => (
                  <div key={badge.badgeId} className="flex items-center gap-3"
                    style={{ animation: `forgeCardIn 0.4s ease-out ${0.3 + bIdx * 0.05}s both` }}
                  >
                    <div className="size-7 rounded-full flex items-center justify-center"
                      style={{
                        background: `${TIER_COLORS[badge.tier]}12`,
                        border: `1px solid ${TIER_COLORS[badge.tier]}30`,
                        boxShadow: badge.tier !== "none" ? `0 0 8px ${TIER_COLORS[badge.tier]}15` : "none",
                      }}
                    >
                      <Trophy className="size-3" style={{ color: TIER_COLORS[badge.tier] }} />
                    </div>
                    <span className="text-sm flex-1" style={{ color: FORGE.warmWhite80 }}>{badge.title}</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: TIER_COLORS[badge.tier] }}>
                      {badge.tier === "none" ? "locked" : badge.tier}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </ForgeReveal>
        )}

        {/* Daygame goal categories */}
        {daygameGrouped.map(({ category, goals }, gIdx) => (
          <ForgeReveal key={category} delay={0.25 + gIdx * 0.06}>
            <div className="mb-4 rounded-xl overflow-hidden"
              style={{
                background: `linear-gradient(145deg, ${FORGE.bgCardHover}, ${FORGE.bgCard})`,
                border: `1px solid ${FORGE.border}`,
                boxShadow: `inset 0 1px 0 ${FORGE.brass}06`,
              }}
            >
              <div className="px-5 py-3 flex items-center justify-between"
                style={{ borderBottom: `1px solid ${FORGE.border}` }}
              >
                <span className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: FORGE.brass }}>
                  {CATEGORY_LABELS[category] ?? category.replace(/_/g, " ")}
                </span>
                <span className="text-xs" style={{ color: FORGE.brassDark }}>{goals.length} goals</span>
              </div>
              <div className="px-5 py-3 space-y-2">
                {goals.map((g) => {
                  const target = targets[g.id]
                    ?? g.defaultMilestoneConfig?.target
                    ?? g.defaultRampSteps?.[0]?.frequencyPerWeek
                    ?? "\u2014"
                  return (
                    <div key={g.id} className="flex items-center gap-3">
                      <div className="size-2 rounded-full" style={{
                        background: FORGE.ember,
                        boxShadow: `0 0 4px ${FORGE.ember}60`,
                      }} />
                      <span className="text-sm flex-1" style={{ color: FORGE.warmWhite80 }}>{g.title}</span>
                      <span className="text-xs font-bold" style={{ color: FORGE.brassLight }}>{target}</span>
                      <span className="text-[10px] uppercase" style={{ color: FORGE.brassDark }}>
                        {g.templateType === "habit_ramp" ? "/wk" : "total"}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </ForgeReveal>
        ))}

        {/* Other area goals */}
        {otherAreaData.map(({ area, goals }, oIdx) => (
          <ForgeReveal key={area.id} delay={0.3 + oIdx * 0.06}>
            <div className="mb-4 rounded-xl overflow-hidden"
              style={{
                background: `linear-gradient(145deg, ${FORGE.bgCardHover}, ${FORGE.bgCard})`,
                border: `1px solid ${FORGE.border}`,
                boxShadow: `inset 0 1px 0 ${FORGE.brass}06`,
              }}
            >
              <div className="px-5 py-3 flex items-center justify-between"
                style={{ borderBottom: `1px solid ${FORGE.border}` }}
              >
                <span className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: FORGE.brass }}>
                  {area.name}
                </span>
                <span className="text-xs" style={{ color: FORGE.brassDark }}>{goals.length} goals</span>
              </div>
              <div className="px-5 py-3 space-y-2">
                {goals.map((g) => (
                  <div key={g.id} className="flex items-center gap-3">
                    <div className="size-2 rounded-full" style={{
                      background: area.hex,
                      boxShadow: `0 0 4px ${area.hex}60`,
                    }} />
                    <span className="text-sm flex-1" style={{ color: FORGE.warmWhite80 }}>{g.title}</span>
                    <span className="text-xs font-bold" style={{ color: FORGE.brassLight }}>
                      {targets[g.id] ?? g.defaultTarget}
                    </span>
                    <span className="text-[10px] uppercase" style={{ color: FORGE.brassDark }}>/{g.period}</span>
                  </div>
                ))}
              </div>
            </div>
          </ForgeReveal>
        ))}

        {/* Custom goals grouped by category */}
        {(() => {
          const byCat: Record<string, CustomGoal[]> = {}
          for (const g of namedCustomGoals) {
            if (!byCat[g.categoryId]) byCat[g.categoryId] = []
            byCat[g.categoryId].push(g)
          }
          const entries = Object.entries(byCat)
          if (entries.length === 0) return null

          return entries.map(([catId, goals], cIdx) => {
            const catLabel = customCategories.find((c) => c.id === catId)?.name
              || CATEGORY_LABELS[catId as GoalDisplayCategory]
              || catId
            return (
              <ForgeReveal key={catId} delay={0.35 + cIdx * 0.06}>
                <div className="mb-4 rounded-xl overflow-hidden"
                  style={{
                    background: `linear-gradient(145deg, ${FORGE.bgCardHover}, ${FORGE.bgCard})`,
                    border: `1px solid ${FORGE.border}`,
                    boxShadow: `inset 0 1px 0 ${FORGE.brass}06`,
                  }}
                >
                  <div className="px-5 py-3 flex items-center justify-between"
                    style={{ borderBottom: `1px solid ${FORGE.border}` }}
                  >
                    <span className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: FORGE.brass }}>
                      {catLabel} <span className="text-[10px] normal-case font-normal" style={{ color: FORGE.brassDark }}>(custom)</span>
                    </span>
                    <span className="text-xs" style={{ color: FORGE.brassDark }}>{goals.length} goals</span>
                  </div>
                  <div className="px-5 py-3 space-y-2">
                    {goals.map((g) => (
                      <div key={g.id} className="flex items-center gap-3">
                        <div className="size-2 rounded-full" style={{
                          background: FORGE.copper,
                          boxShadow: `0 0 4px ${FORGE.copper}60`,
                        }} />
                        <span className="text-sm flex-1" style={{ color: FORGE.warmWhite80 }}>{g.title}</span>
                        <span className="text-xs font-bold" style={{ color: FORGE.brassLight }}>
                          {targets[g.id] ?? g.target}
                        </span>
                        <span className="text-[10px] uppercase" style={{ color: FORGE.brassDark }}>total</span>
                      </div>
                    ))}
                  </div>
                </div>
              </ForgeReveal>
            )
          })
        })()}
      </div>

      <style>{`
        @keyframes forgeRevealIn {
          0% { opacity: 0; transform: scale(0.97) skewX(-0.5deg); filter: brightness(1.3); }
          40% { filter: brightness(1.1); }
          100% { opacity: 1; transform: scale(1) skewX(0deg); filter: brightness(1); }
        }
        @keyframes forgeCardIn {
          0% { opacity: 0; transform: translateY(8px) scale(0.98); filter: brightness(1.4) saturate(1.5); }
          50% { filter: brightness(1.15) saturate(1.2); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: brightness(1) saturate(1); }
        }
      `}</style>
    </div>
  )
}

// ============================================================================
// Step 4: Astrolabe — Mechanical Brass Instrument Visualization
// ============================================================================

const ORBIT_CONFIG: Record<
  string,
  { radius: number; duration: number; startAngle: number; planetSize: number; gemColor: string }
> = {
  daygame: { radius: 100, duration: 50, startAngle: 0, planetSize: 18, gemColor: "#e8651a" },
  health_fitness: { radius: 152, duration: 65, startAngle: 45, gemColor: "#22c55e", planetSize: 14 },
  career_business: { radius: 196, duration: 85, startAngle: 120, gemColor: "#3b82f6", planetSize: 14 },
  social: { radius: 234, duration: 105, startAngle: 200, gemColor: "#a855f7", planetSize: 13 },
  personal_growth: { radius: 268, duration: 125, startAngle: 300, gemColor: "#eab308", planetSize: 13 },
  lifestyle: { radius: 298, duration: 145, startAngle: 160, gemColor: "#ec4899", planetSize: 12 },
}

const CENTER = 370
const COMPASS_RADIUS = 36
const GEAR_TEETH = 24

function AstrolabeStep({
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

  // Generate gear teeth path for a given radius
  const gearTeethPath = (cx: number, cy: number, r: number, teeth: number, toothDepth: number) => {
    const points: string[] = []
    for (let i = 0; i < teeth; i++) {
      const angle1 = (i / teeth) * Math.PI * 2
      const angle2 = ((i + 0.3) / teeth) * Math.PI * 2
      const angle3 = ((i + 0.5) / teeth) * Math.PI * 2
      const angle4 = ((i + 0.8) / teeth) * Math.PI * 2
      points.push(
        `${cx + Math.cos(angle1) * r},${cy + Math.sin(angle1) * r}`,
        `${cx + Math.cos(angle2) * (r + toothDepth)},${cy + Math.sin(angle2) * (r + toothDepth)}`,
        `${cx + Math.cos(angle3) * (r + toothDepth)},${cy + Math.sin(angle3) * (r + toothDepth)}`,
        `${cx + Math.cos(angle4) * r},${cy + Math.sin(angle4) * r}`,
      )
    }
    return `M${points.join(" L")} Z`
  }

  // Compass rose points
  const compassRosePoints = (cx: number, cy: number, outerR: number, innerR: number, points: number) => {
    const coords: string[] = []
    for (let i = 0; i < points * 2; i++) {
      const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2
      const r = i % 2 === 0 ? outerR : innerR
      coords.push(`${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`)
    }
    return `M${coords.join(" L")} Z`
  }

  return (
    <div className="min-h-screen pt-8 pb-36 px-6">
      <div className="mx-auto max-w-3xl">
        <ForgeReveal>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2" style={{ color: FORGE.brassLight }}>Your Astrolabe</h2>
            <p className="text-sm" style={{ color: FORGE.warmWhite30 }}>
              {totalGoals} goals \u00B7 {activeAreas.size} life areas
              {path && ` \u00B7 ${path === "fto" ? "Find The One" : "Abundance"}`}
            </p>
          </div>
        </ForgeReveal>

        <div className="relative w-full mx-auto" style={{ maxWidth: 740, aspectRatio: "1/1" }}>
          <style>{`
            @keyframes astroGearSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes astroGearReverse { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
            @keyframes astroEmberPulse {
              0%, 100% { filter: drop-shadow(0 0 3px ${FORGE.ember}40); }
              50% { filter: drop-shadow(0 0 8px ${FORGE.ember}80); }
            }
            @keyframes astroCompassPulse {
              0%, 100% { filter: drop-shadow(0 0 12px ${FORGE.brass}40) drop-shadow(0 0 24px ${FORGE.ember}20); }
              50% { filter: drop-shadow(0 0 18px ${FORGE.brass}60) drop-shadow(0 0 36px ${FORGE.ember}30); }
            }
            @keyframes astroRingShimmer {
              0% { stroke-dashoffset: 0; }
              100% { stroke-dashoffset: 200; }
            }
            ${visibleAreas.map((area) => {
              const config = ORBIT_CONFIG[area.id]
              if (!config) return ""
              return `
                @keyframes astroOrbit-${area.id} {
                  from { transform: rotate(${config.startAngle}deg); }
                  to { transform: rotate(${config.startAngle + 360}deg); }
                }
                @keyframes astroCounterOrbit-${area.id} {
                  from { transform: rotate(-${config.startAngle}deg); }
                  to { transform: rotate(-${config.startAngle + 360}deg); }
                }
              `
            }).join("\n")}
          `}</style>

          <svg viewBox={`0 0 ${viewSize} ${viewSize}`} className="w-full h-full" style={{ overflow: "visible" }}>
            <defs>
              {/* Brass gradient for rings */}
              <linearGradient id="fd-brass-ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={FORGE.copperDark} stopOpacity="0.3" />
                <stop offset="30%" stopColor={FORGE.brass} stopOpacity="0.2" />
                <stop offset="70%" stopColor={FORGE.copper} stopOpacity="0.25" />
                <stop offset="100%" stopColor={FORGE.brassDark} stopOpacity="0.3" />
              </linearGradient>

              {/* Compass rose gradient */}
              <radialGradient id="fd-compass-gradient" cx="40%" cy="35%">
                <stop offset="0%" stopColor={FORGE.brassLight} />
                <stop offset="40%" stopColor={FORGE.brass} />
                <stop offset="70%" stopColor={FORGE.copper} />
                <stop offset="100%" stopColor={FORGE.copperDark} />
              </radialGradient>

              {/* Warm glow for center */}
              <radialGradient id="fd-center-glow">
                <stop offset="0%" stopColor={FORGE.ember} stopOpacity="0.3" />
                <stop offset="40%" stopColor={FORGE.copper} stopOpacity="0.1" />
                <stop offset="100%" stopColor={FORGE.copper} stopOpacity="0" />
              </radialGradient>

              {/* Gemstone gradients per area */}
              {visibleAreas.map((area) => {
                const config = ORBIT_CONFIG[area.id]
                if (!config) return null
                return (
                  <radialGradient key={`gem-${area.id}`} id={`fd-gem-${area.id}`} cx="35%" cy="30%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
                    <stop offset="25%" stopColor={config.gemColor} stopOpacity="0.9" />
                    <stop offset="70%" stopColor={config.gemColor} />
                    <stop offset="100%" stopColor={config.gemColor} stopOpacity="0.7" />
                  </radialGradient>
                )
              })}

              {/* Planet glow filter */}
              <filter id="fd-gem-glow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
                <feFlood floodColor={FORGE.ember} floodOpacity="0.4" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="fd-gem-hover" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="7" result="blur" />
                <feFlood floodColor={FORGE.brassLight} floodOpacity="0.6" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>

              {/* Engraving pattern */}
              <pattern id="fd-engrave" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                <circle cx="30" cy="30" r="12" fill="none" stroke={FORGE.border} strokeWidth="0.3" strokeDasharray="1,3" />
                <circle cx="30" cy="30" r="2" fill={FORGE.border} fillOpacity="0.2" />
              </pattern>
            </defs>

            {/* Background engraving texture */}
            <rect x="0" y="0" width={viewSize} height={viewSize} fill="url(#fd-engrave)" opacity="0.15" />

            {/* Outer decorative gear ring */}
            <path
              d={gearTeethPath(CENTER, CENTER, 340, GEAR_TEETH * 2, 5)}
              fill="none" stroke={FORGE.brassDark} strokeWidth="0.6" opacity="0.15"
              style={{ transformOrigin: `${CENTER}px ${CENTER}px`, animation: "astroGearSpin 180s linear infinite" }}
            />

            {/* Inner decorative gear ring (counter-rotating) */}
            <path
              d={gearTeethPath(CENTER, CENTER, COMPASS_RADIUS + 20, GEAR_TEETH, 4)}
              fill="none" stroke={FORGE.copper} strokeWidth="0.5" opacity="0.2"
              style={{ transformOrigin: `${CENTER}px ${CENTER}px`, animation: "astroGearReverse 90s linear infinite" }}
            />

            {/* Decorative engraved rings with symbols */}
            <circle cx={CENTER} cy={CENTER} r={COMPASS_RADIUS + 30}
              fill="none" stroke={FORGE.copper} strokeWidth="0.4" strokeOpacity="0.12"
              strokeDasharray="4,6,2,6"
              style={{ transformOrigin: `${CENTER}px ${CENTER}px`, animation: "astroGearSpin 120s linear infinite" }}
            />
            <circle cx={CENTER} cy={CENTER} r={COMPASS_RADIUS + 38}
              fill="none" stroke={FORGE.brassDark} strokeWidth="0.3" strokeOpacity="0.08"
              strokeDasharray="8,4,1,4"
              style={{ transformOrigin: `${CENTER}px ${CENTER}px`, animation: "astroGearReverse 150s linear infinite" }}
            />

            {/* Cardinal direction lines */}
            {[0, 90, 180, 270].map((angle) => (
              <line key={`cardinal-${angle}`}
                x1={CENTER} y1={CENTER - COMPASS_RADIUS - 18} x2={CENTER} y2={25}
                stroke={FORGE.brass} strokeWidth="0.4" strokeOpacity="0.06"
                transform={`rotate(${angle} ${CENTER} ${CENTER})`}
              />
            ))}

            {/* Orbit rings with tick marks and interlocking gear teeth */}
            {visibleAreas.map((area) => {
              const config = ORBIT_CONFIG[area.id]
              if (!config) return null
              const isActive = activeAreas.has(area.id)
              const isHovered = hoveredPlanet === area.id

              return (
                <g key={`orbit-${area.id}`}>
                  {/* Main orbit ring - engraved brass */}
                  <circle cx={CENTER} cy={CENTER} r={config.radius}
                    fill="none" stroke="url(#fd-brass-ring)"
                    strokeWidth={isHovered || isActive ? 2 : 1}
                    opacity={isActive ? 0.6 : 0.12}
                    className="transition-all duration-300"
                  />

                  {/* Shimmer ring overlay for active */}
                  {isActive && (
                    <circle cx={CENTER} cy={CENTER} r={config.radius}
                      fill="none" stroke={FORGE.ember} strokeWidth="0.5" strokeOpacity="0.15"
                      strokeDasharray="3,12"
                      style={{
                        transformOrigin: `${CENTER}px ${CENTER}px`,
                        animation: `astroRingShimmer ${30 + config.radius * 0.2}s linear infinite`,
                      }}
                    />
                  )}

                  {/* Tick marks (degree markers) */}
                  {Array.from({ length: 72 }, (_, i) => {
                    const angle = (i / 72) * 360
                    const isMajor = i % 18 === 0
                    const isMid = i % 6 === 0
                    const tickLen = isMajor ? 8 : isMid ? 5 : 2.5
                    const innerR = config.radius - tickLen / 2
                    const outerR = config.radius + tickLen / 2
                    const rad = (angle * Math.PI) / 180
                    return (
                      <line key={`tick-${area.id}-${i}`}
                        x1={CENTER + Math.cos(rad) * innerR} y1={CENTER + Math.sin(rad) * innerR}
                        x2={CENTER + Math.cos(rad) * outerR} y2={CENTER + Math.sin(rad) * outerR}
                        stroke={FORGE.brass}
                        strokeWidth={isMajor ? 1 : isMid ? 0.5 : 0.25}
                        strokeOpacity={isActive ? (isMajor ? 0.35 : isMid ? 0.2 : 0.1) : (isMajor ? 0.08 : 0.03)}
                      />
                    )
                  })}

                  {/* Small gear teeth on outer edge of ring (mechanical interlocking feel) */}
                  {isActive && (
                    <path
                      d={gearTeethPath(CENTER, CENTER, config.radius + 4, Math.round(config.radius * 0.2), 2.5)}
                      fill="none" stroke={FORGE.brass} strokeWidth="0.3" opacity="0.15"
                      style={{
                        transformOrigin: `${CENTER}px ${CENTER}px`,
                        animation: `astroGear${config.startAngle % 2 === 0 ? "Spin" : "Reverse"} ${config.duration * 2}s linear infinite`,
                      }}
                    />
                  )}
                </g>
              )
            })}

            {/* Center warm glow */}
            <circle cx={CENTER} cy={CENTER} r={COMPASS_RADIUS * 2.5} fill="url(#fd-center-glow)" />

            {/* Compass rose center */}
            <path
              d={compassRosePoints(CENTER, CENTER, COMPASS_RADIUS, COMPASS_RADIUS * 0.4, 8)}
              fill="url(#fd-compass-gradient)"
              style={{ animation: "astroCompassPulse 5s ease-in-out infinite" }}
            />
            {/* Inner compass detail */}
            <path
              d={compassRosePoints(CENTER, CENTER, COMPASS_RADIUS * 0.55, COMPASS_RADIUS * 0.25, 4)}
              fill={FORGE.bg} fillOpacity="0.4"
            />
            <circle cx={CENTER} cy={CENTER} r={COMPASS_RADIUS * 0.18}
              fill={FORGE.ember}
              style={{ filter: `drop-shadow(0 0 4px ${FORGE.ember})` }}
            />
            {/* Cardinal letters */}
            {[
              { letter: "N", angle: -90 },
              { letter: "E", angle: 0 },
              { letter: "S", angle: 90 },
              { letter: "W", angle: 180 },
            ].map(({ letter, angle }) => {
              const rad = (angle * Math.PI) / 180
              const r = COMPASS_RADIUS + 12
              return (
                <text key={letter}
                  x={CENTER + Math.cos(rad) * r}
                  y={CENTER + Math.sin(rad) * r + 1}
                  textAnchor="middle" dominantBaseline="middle"
                  fill={FORGE.brass} fontSize="6" fontWeight="600" letterSpacing="0.5" opacity="0.4"
                  style={{ fontFamily: "system-ui, sans-serif" }}
                >
                  {letter}
                </text>
              )
            })}

            {/* Planets — gemstones in brass bezels */}
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
                    animation: `astroOrbit-${area.id} ${config.duration}s linear infinite`,
                  }}
                >
                  <g style={{
                    transformOrigin: `${CENTER}px ${CENTER - config.radius}px`,
                    animation: `astroCounterOrbit-${area.id} ${config.duration}s linear infinite`,
                  }}>
                    {/* Hover target area */}
                    <circle cx={CENTER} cy={CENTER - config.radius} r={config.planetSize + 10}
                      fill="transparent" className="cursor-pointer"
                      onMouseEnter={() => setHoveredPlanet(area.id)}
                      onMouseLeave={() => setHoveredPlanet(null)}
                    />

                    {/* Brass bezel (outer ring) */}
                    <circle cx={CENTER} cy={CENTER - config.radius} r={config.planetSize + 4}
                      fill="none"
                      stroke={isActive ? FORGE.brass : FORGE.border}
                      strokeWidth={isActive ? 2 : 0.8}
                      strokeOpacity={isActive ? 0.6 : 0.2}
                      className="transition-all duration-300"
                    />
                    {/* Bezel detail ring */}
                    {isActive && (
                      <circle cx={CENTER} cy={CENTER - config.radius} r={config.planetSize + 6}
                        fill="none"
                        stroke={FORGE.brass}
                        strokeWidth="0.4"
                        strokeOpacity="0.25"
                        strokeDasharray="2,3"
                      />
                    )}

                    {/* Gemstone */}
                    <circle cx={CENTER} cy={CENTER - config.radius} r={config.planetSize}
                      fill={`url(#fd-gem-${area.id})`}
                      fillOpacity={isActive ? 1 : 0.2}
                      filter={isActive ? (isHovered ? "url(#fd-gem-hover)" : "url(#fd-gem-glow)") : undefined}
                      className="transition-all duration-300"
                    />
                    {/* Gemstone facet highlight */}
                    <circle
                      cx={CENTER - config.planetSize * 0.3}
                      cy={CENTER - config.radius - config.planetSize * 0.3}
                      r={config.planetSize * 0.3}
                      fill="white" fillOpacity={isActive ? 0.2 : 0.05}
                    />

                    {/* Label */}
                    <text x={CENTER} y={CENTER - config.radius + config.planetSize + 16}
                      textAnchor="middle"
                      fill={isActive ? (isHovered ? FORGE.brassLight : FORGE.warmWhite80) : FORGE.warmWhite15}
                      fontSize={area.id === "daygame" ? "9" : "7.5"}
                      fontWeight={area.id === "daygame" ? "700" : "500"}
                      letterSpacing="0.5" className="transition-colors duration-300"
                      style={{ fontFamily: "system-ui, sans-serif" }}
                    >
                      {area.name}
                    </text>

                    {/* Goal count badge */}
                    {isActive && count > 0 && (
                      <g>
                        <circle cx={CENTER + config.planetSize - 1} cy={CENTER - config.radius - config.planetSize + 1}
                          r={8} fill={FORGE.bg} stroke={FORGE.brass} strokeWidth="1"
                        />
                        <text x={CENTER + config.planetSize - 1} y={CENTER - config.radius - config.planetSize + 1.5}
                          textAnchor="middle" dominantBaseline="middle" fill={FORGE.brassLight}
                          fontSize="6.5" fontWeight="800" style={{ fontFamily: "system-ui, sans-serif" }}
                        >
                          {count}
                        </text>
                      </g>
                    )}
                  </g>
                </g>
              )
            })}

            {/* Outer cardinal tick marks */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
              const rad = (angle * Math.PI) / 180
              const isMajor = angle % 90 === 0
              return (
                <line key={`outer-${angle}`}
                  x1={CENTER + Math.cos(rad) * 332} y1={CENTER + Math.sin(rad) * 332}
                  x2={CENTER + Math.cos(rad) * 345} y2={CENTER + Math.sin(rad) * 345}
                  stroke={FORGE.brass}
                  strokeWidth={isMajor ? 2 : 1}
                  strokeOpacity={isMajor ? 0.35 : 0.15}
                />
              )
            })}

            {/* Decorative degree numbers at outer rim */}
            {[0, 90, 180, 270].map((angle) => {
              const rad = ((angle - 90) * Math.PI) / 180
              const r = 354
              return (
                <text key={`deg-${angle}`}
                  x={CENTER + Math.cos(rad) * r}
                  y={CENTER + Math.sin(rad) * r + 1}
                  textAnchor="middle" dominantBaseline="middle"
                  fill={FORGE.brassDark} fontSize="5" fontWeight="600" opacity="0.3"
                  style={{ fontFamily: "system-ui, sans-serif" }}
                >
                  {angle}\u00B0
                </text>
              )
            })}
          </svg>
        </div>

        {/* Badges section */}
        {badges.length > 0 && (
          <ForgeReveal delay={0.2}>
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-4 justify-center">
                <Trophy className="size-4" style={{ color: FORGE.brass }} />
                <span className="text-sm font-bold uppercase tracking-[0.15em]" style={{ color: FORGE.brass }}>
                  Achievements to Earn
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {badges.map((badge, bIdx) => {
                  const tierColor = badge.tier === "diamond" ? "#b9f2ff"
                    : badge.tier === "gold" ? "#ffd700"
                    : badge.tier === "silver" ? "#c0c0c0"
                    : badge.tier === "bronze" ? "#cd7f32"
                    : FORGE.brassDark

                  return (
                    <div key={badge.badgeId} className="rounded-xl p-3 text-center"
                      style={{
                        background: `linear-gradient(145deg, ${FORGE.bgCardHover}, ${FORGE.bgCard})`,
                        border: `1px solid ${tierColor}25`,
                        boxShadow: badge.tier !== "none" ? `0 0 12px ${tierColor}08` : "none",
                        animation: `forgeCardIn 0.4s ease-out ${0.3 + bIdx * 0.06}s both`,
                      }}
                    >
                      <Trophy className="size-5 mx-auto mb-1.5" style={{ color: tierColor }} />
                      <div className="text-xs leading-tight" style={{ color: FORGE.warmWhite80 }}>{badge.title}</div>
                      <div className="text-[10px] uppercase font-bold tracking-wider mt-1" style={{ color: tierColor }}>
                        {badge.tier === "none" ? "Locked" : badge.tier}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </ForgeReveal>
        )}

        <ForgeReveal delay={0.35}>
          <div className="mt-8 text-center">
            <button
              className="px-8 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all"
              style={{
                background: `linear-gradient(135deg, ${FORGE.ember} 0%, ${FORGE.copper} 50%, ${FORGE.ember} 100%)`,
                color: FORGE.bg,
                border: `1px solid ${FORGE.emberLight}`,
                boxShadow: `0 0 24px ${FORGE.ember}30, inset 0 1px 0 rgba(255,255,255,0.15)`,
              }}
            >
              Create Goals
            </button>
            <p className="text-xs mt-2" style={{ color: FORGE.brassDark }}>
              This will create {totalGoals} goals in your dashboard
            </p>
          </div>
        </ForgeReveal>
      </div>

      <style>{`
        @keyframes forgeRevealIn {
          0% { opacity: 0; transform: scale(0.97) skewX(-0.5deg); filter: brightness(1.3); }
          40% { filter: brightness(1.1); }
          100% { opacity: 1; transform: scale(1) skewX(0deg); filter: brightness(1); }
        }
        @keyframes forgeCardIn {
          0% { opacity: 0; transform: translateY(8px) scale(0.98); filter: brightness(1.4) saturate(1.5); }
          50% { filter: brightness(1.15) saturate(1.2); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: brightness(1) saturate(1); }
        }
      `}</style>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export default function VariantD() {
  const flatData = useFlatModelData()
  const lifeAreas = useLifeAreas()

  const [step, setStep] = useState<FlowStep>("direction")
  const [path, setPath] = useState<DaygamePath | null>(null)
  const [selectedAreas, setSelectedAreas] = useState<Set<string>>(new Set())
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set())
  const [targets, setTargets] = useState<Record<string, number>>({})
  const [curveConfigs, setCurveConfigs] = useState<Record<string, MilestoneLadderConfig>>({})
  const [customGoals, setCustomGoals] = useState<CustomGoal[]>([])
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([])

  const stepIndex = STEPS.indexOf(step)

  const handleSelectPath = useCallback((p: DaygamePath) => {
    setPath(p)
    const daygameArea = flatData.areas.find((a) => a.lifeArea.id === "daygame")
    if (daygameArea) {
      setSelectedGoals((prev) => {
        const next = new Set<string>()
        for (const id of prev) {
          if (!id.startsWith("l3_") && !id.startsWith("l2_")) next.add(id)
        }
        for (const g of daygameArea.l3Goals) {
          if (g.displayCategory !== "dirty_dog") next.add(g.id)
        }
        return next
      })
    }
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

  const addCustomGoal = useCallback((categoryId: string) => {
    const id = nextCustomId("cg")
    const goal: CustomGoal = { id, title: "", categoryId, target: 1, period: "total" }
    setCustomGoals((prev) => [...prev, goal])
    setSelectedGoals((prev) => new Set([...prev, id]))
  }, [])

  const removeCustomGoal = useCallback((goalId: string) => {
    setCustomGoals((prev) => prev.filter((g) => g.id !== goalId))
    setSelectedGoals((prev) => {
      const next = new Set(prev)
      next.delete(goalId)
      return next
    })
  }, [])

  const updateCustomGoalTitle = useCallback((goalId: string, title: string) => {
    setCustomGoals((prev) => prev.map((g) => g.id === goalId ? { ...g, title } : g))
  }, [])

  const addCustomCategory = useCallback(() => {
    const id = nextCustomId("cc")
    setCustomCategories((prev) => [...prev, { id, name: "" }])
  }, [])

  const renameCustomCategory = useCallback((catId: string, name: string) => {
    setCustomCategories((prev) => prev.map((c) => c.id === catId ? { ...c, name } : c))
  }, [])

  const removeCustomCategory = useCallback((catId: string) => {
    setCustomGoals((prev) => {
      const removed = prev.filter((g) => g.categoryId === catId)
      setSelectedGoals((sel) => {
        const next = new Set(sel)
        for (const g of removed) next.delete(g.id)
        return next
      })
      return prev.filter((g) => g.categoryId !== catId)
    })
    setCustomCategories((prev) => prev.filter((c) => c.id !== catId))
  }, [])

  const goNext = useCallback(() => {
    const nextIndex = stepIndex + 1
    if (nextIndex < STEPS.length) setStep(STEPS[nextIndex])
  }, [stepIndex])

  const goToStep = useCallback((i: number) => {
    if (i < stepIndex && i >= 0) setStep(STEPS[i])
  }, [stepIndex])

  const daygameArea = flatData.areas.find((a) => a.lifeArea.id === "daygame")
  const selectedDaygameCount = daygameArea?.l3Goals.filter((g) => selectedGoals.has(g.id)).length ?? 0
  const otherGoalCount = lifeAreas
    .filter((a) => selectedAreas.has(a.id) && a.id !== "daygame" && a.id !== "custom")
    .reduce((sum, area) => {
      return sum + (area.suggestions ?? []).filter((_, i) => selectedGoals.has(`${area.id}_s${i}`)).length
    }, 0)
  const customGoalCount = customGoals.filter((g) => g.title.trim()).length
  const totalGoals = selectedDaygameCount + otherGoalCount + customGoalCount

  const ctaConfig = useMemo(() => {
    switch (step) {
      case "direction":
        return { label: "Choose Goals", disabled: !path, status: path ? `${path === "fto" ? "Find The One" : "Abundance"} selected` : "Select a path to begin forging" }
      case "goals":
        return { label: "View Summary", disabled: selectedGoals.size === 0, status: `${selectedGoals.size} goals selected` }
      case "summary":
        return { label: "View Astrolabe", disabled: false, status: `${totalGoals} goals forged` }
      case "orrery":
        return { label: "Create Goals", disabled: false, status: `${totalGoals} goals \u00B7 ${1 + selectedAreas.size} areas` }
    }
  }, [step, path, selectedGoals.size, totalGoals, selectedAreas.size])

  return (
    <div className="relative">
      <EmberForgeBackground />

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
          targets={targets}
          curveConfigs={curveConfigs}
          customGoals={customGoals}
          customCategories={customCategories}
          onToggle={toggleGoal}
          onUpdateTarget={updateTarget}
          onUpdateCurve={updateCurveConfig}
          onAddCustomGoal={addCustomGoal}
          onRemoveCustomGoal={removeCustomGoal}
          onUpdateCustomGoalTitle={updateCustomGoalTitle}
          onAddCustomCategory={addCustomCategory}
          onRenameCustomCategory={renameCustomCategory}
          onRemoveCustomCategory={removeCustomCategory}
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
          customGoals={customGoals}
          customCategories={customCategories}
        />
      )}
      {step === "orrery" && (
        <AstrolabeStep
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
