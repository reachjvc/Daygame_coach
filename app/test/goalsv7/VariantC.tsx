"use client"

/**
 * V7 Variant C: "Liquid Void" — Deep Bioluminescent Dark Theme
 *
 * Theme: Deep ocean bioluminescence meets dark matter. Fluid blob animations,
 * liquid morphing transitions, micro-interactions everywhere.
 * Hierarchy: Flat (L1->L3) with L2s as badge achievements (same as V6)
 * Flow: 4-step linear wizard
 *
 * Step 1 (Direction): Animated gradient border path cards + ripple life area chips
 * Step 2 (Goals): Micro-interaction checkboxes, spring-expand categories
 * Step 3 (Summary): Deep glass cards with pulsing glow edges, radial progress rings
 * Step 4 (Your System): Gravity well with luminescent trails + gravitational lensing
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
const STEP_LABELS = ["Direction", "Goals", "Summary", "Your System"]

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

// Category color map for summary + gravity well
const CATEGORY_COLORS: Record<string, string> = {
  field_work: "#06b6d4",
  results: "#8b5cf6",
  dirty_dog: "#f97316",
  texting: "#10b981",
  dates: "#ec4899",
  relationship: "#f59e0b",
  mindfulness: "#a78bfa",
  resilience: "#ef4444",
  learning: "#3b82f6",
  reflection: "#14b8a6",
  discipline: "#f97316",
  social_activity: "#06b6d4",
  friendships: "#8b5cf6",
  hosting: "#ec4899",
  social_skills: "#10b981",
  network_expansion: "#3b82f6",
  mentorship: "#f59e0b",
  strength: "#ef4444",
  training: "#f97316",
  nutrition: "#10b981",
  body_comp: "#8b5cf6",
  flexibility: "#06b6d4",
  endurance: "#3b82f6",
  income: "#f59e0b",
  saving: "#10b981",
  investing: "#8b5cf6",
  career_growth: "#3b82f6",
  entrepreneurship: "#f97316",
  porn_freedom: "#ef4444",
  digital_discipline: "#06b6d4",
  substance_control: "#f97316",
  self_control: "#a78bfa",
  hobbies_skills: "#ec4899",
  cooking_domestic: "#f59e0b",
  adventure_travel: "#06b6d4",
  style_grooming: "#8b5cf6",
}

// ============================================================================
// Global CSS Animations (injected once)
// ============================================================================

function LiquidVoidStyles() {
  return (
    <style>{`
      /* Fluid blob drift */
      @keyframes lv-blob-drift-1 {
        0%, 100% { transform: translate(0%, 0%) scale(1); }
        25% { transform: translate(15%, -10%) scale(1.1); }
        50% { transform: translate(-5%, 15%) scale(0.9); }
        75% { transform: translate(-15%, -5%) scale(1.05); }
      }
      @keyframes lv-blob-drift-2 {
        0%, 100% { transform: translate(0%, 0%) scale(1); }
        25% { transform: translate(-20%, 10%) scale(0.95); }
        50% { transform: translate(10%, -15%) scale(1.08); }
        75% { transform: translate(15%, 10%) scale(0.92); }
      }
      @keyframes lv-blob-drift-3 {
        0%, 100% { transform: translate(0%, 0%) scale(1.05); }
        33% { transform: translate(20%, 15%) scale(0.9); }
        66% { transform: translate(-10%, -20%) scale(1.1); }
      }

      /* Grain noise overlay */
      @keyframes lv-grain {
        0%, 100% { transform: translate(0, 0); }
        10% { transform: translate(-5%, -10%); }
        20% { transform: translate(-15%, 5%); }
        30% { transform: translate(7%, -25%); }
        40% { transform: translate(-5%, 25%); }
        50% { transform: translate(-15%, 10%); }
        60% { transform: translate(15%, 0%); }
        70% { transform: translate(0%, 15%); }
        80% { transform: translate(3%, 35%); }
        90% { transform: translate(-10%, 10%); }
      }

      /* Liquid pour-in from top */
      @keyframes lv-pour-in {
        0% { opacity: 0; transform: translateY(-40px) scaleY(0.8); filter: blur(8px); }
        60% { opacity: 1; transform: translateY(4px) scaleY(1.02); filter: blur(0px); }
        80% { transform: translateY(-2px) scaleY(0.99); }
        100% { opacity: 1; transform: translateY(0px) scaleY(1); filter: blur(0px); }
      }

      /* Staggered entrance */
      .lv-stagger-enter {
        animation: lv-pour-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
      }

      /* Checkbox pop */
      @keyframes lv-check-pop {
        0% { transform: scale(1); }
        40% { transform: scale(1.4); }
        70% { transform: scale(0.9); }
        100% { transform: scale(1); }
      }

      /* Checkmark draw */
      @keyframes lv-check-draw {
        0% { stroke-dashoffset: 12; }
        100% { stroke-dashoffset: 0; }
      }

      /* Number glow pulse */
      @keyframes lv-num-pulse {
        0% { transform: scale(1); text-shadow: 0 0 0px transparent; }
        50% { transform: scale(1.2); text-shadow: 0 0 8px rgba(6, 182, 212, 0.6); }
        100% { transform: scale(1); text-shadow: 0 0 0px transparent; }
      }

      /* Ripple effect */
      @keyframes lv-ripple {
        0% { transform: scale(0); opacity: 0.6; }
        100% { transform: scale(2.5); opacity: 0; }
      }

      /* Gradient border flow */
      @keyframes lv-border-flow {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }

      /* Selection absorb */
      @keyframes lv-absorb {
        0% { transform: scale(1); }
        30% { transform: scale(0.96); }
        60% { transform: scale(1.02); }
        100% { transform: scale(1); }
      }

      /* Section spring expand */
      @keyframes lv-spring-expand {
        0% { max-height: 0; opacity: 0; transform: scaleY(0.8); }
        60% { opacity: 1; transform: scaleY(1.02); }
        100% { max-height: 2000px; opacity: 1; transform: scaleY(1); }
      }

      /* Glow pulse for summary cards */
      @keyframes lv-glow-pulse {
        0%, 100% { box-shadow: 0 0 15px var(--glow-color, rgba(6,182,212,0.15)), inset 0 1px 0 rgba(255,255,255,0.03); }
        50% { box-shadow: 0 0 25px var(--glow-color, rgba(6,182,212,0.25)), inset 0 1px 0 rgba(255,255,255,0.05); }
      }

      /* Radial progress ring */
      @keyframes lv-ring-fill {
        0% { stroke-dashoffset: var(--ring-circumference, 188); }
        100% { stroke-dashoffset: var(--ring-target, 0); }
      }

      /* Bottom bar dot morph */
      @keyframes lv-dot-active {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.15); }
      }

      /* CTA gradient flow */
      @keyframes lv-cta-gradient {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }

      /* Gravity well ring wave */
      @keyframes lv-gravity-wave {
        0% { r: var(--base-r); opacity: var(--base-opacity); }
        50% { r: calc(var(--base-r) + 3px); opacity: calc(var(--base-opacity) * 0.6); }
        100% { r: var(--base-r); opacity: var(--base-opacity); }
      }

      /* Planet orbit with trail */
      @keyframes lv-planet-blink {
        0%, 90%, 100% { opacity: 0.15; }
        95% { opacity: 0.5; }
      }

      /* Sun gravity distortion */
      @keyframes lv-sun-distort {
        0%, 100% { filter: drop-shadow(0 0 20px rgba(6,182,212,0.5)) drop-shadow(0 0 40px rgba(139,92,246,0.2)); }
        50% { filter: drop-shadow(0 0 30px rgba(6,182,212,0.7)) drop-shadow(0 0 60px rgba(139,92,246,0.4)); }
      }

      /* Trail fade */
      @keyframes lv-trail-glow {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
      }

      /* Floating pill bar */
      @keyframes lv-bar-float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-2px); }
      }
    `}</style>
  )
}

// ============================================================================
// Liquid Void Background
// ============================================================================

function LiquidVoidCanvas() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Deep void gradient */}
      <div className="absolute inset-0" style={{
        background: "linear-gradient(160deg, #030712 0%, #0a0e1a 30%, #080c18 60%, #020617 100%)",
      }} />

      {/* Fluid blobs - very low opacity, blend-mode: screen */}
      <div className="absolute" style={{
        width: "60vw", height: "60vw", left: "-10%", top: "-20%",
        background: "radial-gradient(ellipse, rgba(6,182,212,0.05) 0%, rgba(6,182,212,0.02) 40%, transparent 70%)",
        mixBlendMode: "screen",
        animation: "lv-blob-drift-1 25s ease-in-out infinite",
        borderRadius: "40% 60% 50% 50%",
      }} />
      <div className="absolute" style={{
        width: "50vw", height: "50vw", right: "-15%", top: "20%",
        background: "radial-gradient(ellipse, rgba(139,92,246,0.04) 0%, rgba(139,92,246,0.015) 40%, transparent 70%)",
        mixBlendMode: "screen",
        animation: "lv-blob-drift-2 30s ease-in-out infinite",
        borderRadius: "50% 40% 60% 45%",
      }} />
      <div className="absolute" style={{
        width: "45vw", height: "45vw", left: "20%", bottom: "-10%",
        background: "radial-gradient(ellipse, rgba(236,72,153,0.03) 0%, rgba(236,72,153,0.01) 40%, transparent 70%)",
        mixBlendMode: "screen",
        animation: "lv-blob-drift-3 35s ease-in-out infinite",
        borderRadius: "45% 55% 40% 60%",
      }} />
      <div className="absolute" style={{
        width: "35vw", height: "35vw", right: "10%", bottom: "15%",
        background: "radial-gradient(ellipse, rgba(16,185,129,0.03) 0%, rgba(16,185,129,0.01) 40%, transparent 70%)",
        mixBlendMode: "screen",
        animation: "lv-blob-drift-1 28s ease-in-out infinite reverse",
        borderRadius: "55% 45% 50% 50%",
      }} />

      {/* Grain/noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
        backgroundSize: "256px 256px",
        animation: "lv-grain 8s steps(10) infinite",
      }} />
    </div>
  )
}

// ============================================================================
// Animated Checkbox Component
// ============================================================================

function LiquidCheckbox({ checked, color = "#06b6d4", onToggle }: { checked: boolean; color?: string; onToggle: () => void }) {
  const [justChecked, setJustChecked] = useState(false)

  const handleClick = () => {
    if (!checked) setJustChecked(true)
    onToggle()
  }

  useEffect(() => {
    if (justChecked) {
      const t = setTimeout(() => setJustChecked(false), 400)
      return () => clearTimeout(t)
    }
  }, [justChecked])

  return (
    <button
      onClick={handleClick}
      className="size-[18px] rounded-[4px] flex items-center justify-center shrink-0 transition-all duration-200"
      style={{
        background: checked ? color : "rgba(255,255,255,0.06)",
        border: checked ? "none" : "1.5px solid rgba(255,255,255,0.15)",
        boxShadow: checked ? `0 0 8px ${color}40` : "none",
        animation: justChecked ? "lv-check-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)" : undefined,
      }}
    >
      {checked && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path
            d="M2 5.5L4 7.5L8 3"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: 12,
              animation: justChecked ? "lv-check-draw 0.3s ease-out forwards" : undefined,
              strokeDashoffset: justChecked ? undefined : 0,
            }}
          />
        </svg>
      )}
    </button>
  )
}

// ============================================================================
// Animated Number (pulses on change)
// ============================================================================

function AnimatedNumber({ value, className, style }: { value: number; className?: string; style?: React.CSSProperties }) {
  const [animate, setAnimate] = useState(false)
  const prevRef = useRef(value)

  useEffect(() => {
    if (value !== prevRef.current) {
      setAnimate(true)
      prevRef.current = value
      const t = setTimeout(() => setAnimate(false), 300)
      return () => clearTimeout(t)
    }
  }, [value])

  return (
    <span
      className={className}
      style={{
        ...style,
        display: "inline-block",
        animation: animate ? "lv-num-pulse 0.3s ease-out" : undefined,
      }}
    >
      {value}
    </span>
  )
}

// ============================================================================
// Ripple Button (for life area chips)
// ============================================================================

function RippleButton({ children, onClick, className, style }: {
  children: React.ReactNode
  onClick: () => void
  className?: string
  style?: React.CSSProperties
}) {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([])
  const nextId = useRef(0)

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = nextId.current++
    setRipples((prev) => [...prev, { id, x, y }])
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 600)
    onClick()
  }

  return (
    <button onClick={handleClick} className={`relative overflow-hidden ${className ?? ""}`} style={style}>
      {children}
      {ripples.map((r) => (
        <span
          key={r.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: r.x, top: r.y, width: 40, height: 40,
            marginLeft: -20, marginTop: -20,
            background: "rgba(255,255,255,0.15)",
            animation: "lv-ripple 0.6s ease-out forwards",
          }}
        />
      ))}
    </button>
  )
}

// ============================================================================
// Radial Progress Ring (for summary stats)
// ============================================================================

function RadialRing({ value, max, color, size = 56 }: { value: number; max: number; color: string; size?: number }) {
  const strokeWidth = 3
  const r = (size - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * r
  const pct = max > 0 ? Math.min(value / max, 1) : 0
  const offset = circumference * (1 - pct)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
      {/* Background ring */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth}
      />
      {/* Progress ring */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{
          transition: "stroke-dashoffset 1s cubic-bezier(0.34, 1.56, 0.64, 1)",
          filter: `drop-shadow(0 0 4px ${color}60)`,
        }}
      />
    </svg>
  )
}

// ============================================================================
// Bottom Bar — Floating pill with morphing dots
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
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
      <div className="rounded-full px-4 py-2 flex items-center gap-3"
        style={{
          background: "rgba(10, 14, 26, 0.85)",
          backdropFilter: "blur(20px) saturate(1.5)",
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)",
        }}
      >
        {/* Step dots */}
        <div className="flex items-center gap-1.5">
          {steps.map((label, i) => {
            const isActive = i === currentStep
            const isDone = i < currentStep
            const isClickable = isDone
            return (
              <button
                key={label}
                onClick={() => isClickable && onStepClick(i)}
                disabled={!isClickable}
                className="transition-all duration-300"
                title={label}
                style={{
                  width: isActive ? 24 : isDone ? 8 : 6,
                  height: isActive ? 8 : isDone ? 8 : 6,
                  borderRadius: isActive ? 4 : "50%",
                  background: isDone
                    ? "rgba(6, 182, 212, 0.8)"
                    : isActive
                    ? "linear-gradient(90deg, #06b6d4, #8b5cf6)"
                    : "rgba(255,255,255,0.12)",
                  cursor: isClickable ? "pointer" : "default",
                  animation: isActive ? "lv-dot-active 2s ease-in-out infinite" : undefined,
                  boxShadow: isDone ? "0 0 6px rgba(6,182,212,0.3)" : isActive ? "0 0 8px rgba(6,182,212,0.4)" : "none",
                }}
              />
            )
          })}
        </div>

        {/* Separator */}
        <div className="w-px h-4 bg-white/8" />

        {/* Status */}
        <span className="text-[10px] text-white/30 whitespace-nowrap hidden sm:block">{statusText}</span>

        {/* CTA */}
        <button
          onClick={onCta}
          disabled={ctaDisabled}
          className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap disabled:opacity-25"
          style={{
            background: ctaDisabled
              ? "rgba(255,255,255,0.05)"
              : "linear-gradient(135deg, #06b6d4, #8b5cf6, #06b6d4)",
            backgroundSize: "200% 200%",
            animation: ctaDisabled ? undefined : "lv-cta-gradient 3s ease-in-out infinite",
            color: ctaDisabled ? "rgba(255,255,255,0.2)" : "white",
            boxShadow: ctaDisabled ? "none" : "0 0 12px rgba(6,182,212,0.3), 0 0 4px rgba(139,92,246,0.2)",
          }}
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Step 1: Direction — Animated Gradient Border Cards
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
    <div className="min-h-screen pt-16 pb-28 px-6">
      <div className="mx-auto max-w-3xl">
        {/* Header - pour in animation */}
        <div className="text-center mb-10 lv-stagger-enter" style={{ animationDelay: "0ms" }}>
          <div className="size-10 mx-auto mb-3 rounded-full flex items-center justify-center"
            style={{
              background: "radial-gradient(circle, rgba(6,182,212,0.15), rgba(139,92,246,0.08))",
              boxShadow: "0 0 20px rgba(6,182,212,0.1)",
            }}
          >
            <Sparkles className="size-5 text-cyan-400/70" />
          </div>
          <h1 className="text-3xl font-bold text-white/90 mb-2 tracking-tight">Shape Your Path</h1>
          <p className="text-white/35 text-sm">
            Select your dating direction, then pick life areas to track.
          </p>
        </div>

        {/* Daygame area label */}
        {daygame && (() => {
          const DgIcon = daygame.icon
          return (
            <div className="flex items-center gap-3 mb-4 lv-stagger-enter" style={{ animationDelay: "50ms" }}>
              <div className="size-7 rounded-lg flex items-center justify-center"
                style={{ background: `${daygame.hex}15`, boxShadow: `0 0 8px ${daygame.hex}10` }}>
                <DgIcon className="size-4" style={{ color: daygame.hex }} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: `${daygame.hex}99` }}>
                {daygame.name}
              </span>
            </div>
          )
        })()}

        {/* Path cards with animated gradient borders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {([
            {
              path: "fto" as DaygamePath,
              title: "Find The One",
              subtitle: "Connection & commitment",
              desc: "I want to find one special person and build something real.",
              l1s: ftoL1s,
              gradient: "linear-gradient(135deg, #8b5cf6, #06b6d4, #8b5cf6, #ec4899)",
              innerGradient: "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(6,182,212,0.06))",
              iconColor: "#8b5cf6",
              icon: <Star className="size-5 text-violet-400" />,
            },
            {
              path: "abundance" as DaygamePath,
              title: "Abundance",
              subtitle: "Freedom & experience",
              desc: "I want to experience abundance and freedom in dating.",
              l1s: abundanceL1s,
              gradient: "linear-gradient(135deg, #f97316, #f59e0b, #f97316, #ec4899)",
              innerGradient: "linear-gradient(135deg, rgba(249,115,22,0.12), rgba(245,158,11,0.06))",
              iconColor: "#f97316",
              icon: <Sparkles className="size-5 text-orange-400" />,
            },
          ]).map((card, idx) => {
            const isSelected = selectedPath === card.path
            return (
              <div
                key={card.path}
                className="relative rounded-2xl lv-stagger-enter"
                style={{
                  animationDelay: `${100 + idx * 80}ms`,
                  padding: "1.5px",
                  background: isSelected ? card.gradient : "rgba(255,255,255,0.06)",
                  backgroundSize: "300% 300%",
                  animation: isSelected
                    ? `lv-border-flow 3s ease-in-out infinite, lv-absorb 0.35s ease-out`
                    : undefined,
                }}
              >
                <button
                  onClick={() => onSelectPath(card.path)}
                  className="w-full rounded-[14px] p-5 text-left transition-all"
                  style={{
                    background: isSelected
                      ? card.innerGradient
                      : "rgba(10, 14, 26, 0.9)",
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="size-10 rounded-xl flex items-center justify-center"
                      style={{
                        background: `${card.iconColor}18`,
                        boxShadow: isSelected ? `0 0 12px ${card.iconColor}20` : "none",
                      }}
                    >
                      {card.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white/90">{card.title}</h3>
                      <p className="text-xs text-white/30">{card.subtitle}</p>
                    </div>
                    {isSelected && (
                      <div className="size-6 rounded-full flex items-center justify-center"
                        style={{ background: card.iconColor, boxShadow: `0 0 10px ${card.iconColor}50` }}
                      >
                        <Check className="size-3.5 text-white" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-white/40 mb-3">{card.desc}</p>
                  <div className="space-y-1.5">
                    {card.l1s.slice(0, 3).map((l1) => (
                      <div key={l1.id} className="flex items-center gap-2 text-xs text-white/30">
                        <ChevronRight className="size-3" />
                        <span>{l1.title}</span>
                      </div>
                    ))}
                    {card.l1s.length > 3 && (
                      <span className="text-xs pl-5" style={{ color: `${card.iconColor}60` }}>
                        +{card.l1s.length - 3} more paths
                      </span>
                    )}
                  </div>
                </button>
              </div>
            )
          })}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-6 lv-stagger-enter" style={{ animationDelay: "260ms" }}>
          <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, transparent, rgba(255,255,255,0.06), transparent)" }} />
          <span className="text-[10px] uppercase tracking-widest text-white/20">Other Life Areas</span>
          <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, transparent, rgba(255,255,255,0.06), transparent)" }} />
        </div>

        {/* Life area chips with ripple effect */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {otherAreas.map((area, i) => {
            const Icon = area.icon
            const isSelected = selectedAreas.has(area.id)
            return (
              <RippleButton
                key={area.id}
                onClick={() => onToggleArea(area.id)}
                className="flex flex-col items-center gap-2.5 rounded-xl p-4 transition-all duration-300 lv-stagger-enter"
                style={{
                  animationDelay: `${300 + i * 50}ms`,
                  background: isSelected ? `${area.hex}0a` : "rgba(255,255,255,0.015)",
                  border: isSelected ? `1px solid ${area.hex}30` : "1px solid rgba(255,255,255,0.04)",
                  boxShadow: isSelected ? `0 0 15px ${area.hex}10` : "none",
                }}
              >
                <div className="size-10 rounded-xl flex items-center justify-center transition-all duration-300"
                  style={{
                    background: isSelected ? `${area.hex}18` : "rgba(255,255,255,0.03)",
                    boxShadow: isSelected ? `0 0 10px ${area.hex}15` : "none",
                  }}
                >
                  <Icon className="size-5 transition-colors duration-300"
                    style={{ color: isSelected ? area.hex : "rgba(255,255,255,0.25)" }}
                  />
                </div>
                <span className={`text-xs font-medium text-center leading-tight transition-colors duration-300 ${isSelected ? "text-white/80" : "text-white/30"}`}>
                  {area.name}
                </span>
              </RippleButton>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Step 2: Goals — Micro-interactions Everywhere
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

  return (
    <div className="min-h-screen pt-12 pb-28 px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 lv-stagger-enter">
          <h2 className="text-2xl font-bold text-white/90 mb-1 tracking-tight">Choose Your Goals</h2>
          <p className="text-white/30 text-sm">
            Toggle goals on or off and adjust targets. These are starting points.
          </p>
        </div>

        {/* Daygame goals by display category */}
        {daygameByCategory.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3 lv-stagger-enter" style={{ animationDelay: "50ms" }}>
              <span className="text-xs font-semibold uppercase tracking-widest text-cyan-400/60">
                Dating & Daygame
              </span>
              <span className="text-xs text-white/20">{daygameSelected} selected</span>
            </div>

            {daygameByCategory.map(({ category, goals }, catIdx) => {
              const sectionId = `dg_${category}`
              const isExpanded = expandedSections.has(sectionId)
              const selectedCount = goals.filter((g) => selectedGoals.has(g.id)).length
              const catColor = CATEGORY_COLORS[category] ?? "#06b6d4"

              return (
                <div key={category} className="mb-2 lv-stagger-enter" style={{ animationDelay: `${100 + catIdx * 40}ms` }}>
                  <button
                    onClick={() => toggleSection(sectionId)}
                    className="w-full flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all duration-300"
                    style={{
                      background: selectedCount > 0 ? `${catColor}08` : "rgba(255,255,255,0.015)",
                      border: selectedCount > 0 ? `1px solid ${catColor}18` : "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <div className="transition-transform duration-300" style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0)" }}>
                      <ChevronRight className="size-3.5" style={{ color: `${catColor}60` }} />
                    </div>
                    <span className="text-sm text-white/70 flex-1 text-left">
                      {CATEGORY_LABELS[category] ?? category.replace(/_/g, " ")}
                    </span>
                    {selectedCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${catColor}15`, color: `${catColor}90` }}>
                        {selectedCount}
                      </span>
                    )}
                    <span className="text-[10px] text-white/20">{goals.length}</span>
                  </button>

                  {isExpanded && (
                    <div className="ml-4 mt-1.5 space-y-1 origin-top"
                      style={{ animation: "lv-spring-expand 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards" }}
                    >
                      {goals.map((l3, goalIdx) => {
                        const isOn = selectedGoals.has(l3.id)
                        const meta = getGoalMeta(l3)
                        return (
                          <div key={l3.id} className="lv-stagger-enter" style={{ animationDelay: `${goalIdx * 30}ms` }}>
                            <div
                              className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200"
                              style={{
                                background: isOn ? `${catColor}06` : "transparent",
                                border: isOn ? `1px solid ${catColor}12` : "1px solid transparent",
                              }}
                            >
                              <LiquidCheckbox checked={isOn} color={catColor} onToggle={() => onToggle(l3.id)} />
                              <span className={`text-sm flex-1 min-w-0 transition-colors duration-200 ${isOn ? "text-white/85" : "text-white/40"}`}>
                                {l3.title}
                              </span>
                              {category === "dirty_dog" && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full text-orange-400/50 shrink-0"
                                  style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.12)" }}
                                >
                                  advanced
                                </span>
                              )}
                              {isOn && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {meta.hasCurve && (
                                    <button
                                      onClick={() => setExpandedCurve(expandedCurve === l3.id ? null : l3.id)}
                                      className="size-6 rounded-md flex items-center justify-center transition-all duration-200 hover:bg-white/5"
                                      style={{
                                        border: expandedCurve === l3.id ? `1px solid ${catColor}40` : "1px solid rgba(255,255,255,0.06)",
                                        background: expandedCurve === l3.id ? `${catColor}10` : "transparent",
                                      }}
                                    >
                                      <SlidersHorizontal className="size-2.5" style={{ color: expandedCurve === l3.id ? catColor : "rgba(255,255,255,0.35)" }} />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => onUpdateTarget(l3.id, Math.max(1, meta.target - 1))}
                                    className="size-6 rounded-md flex items-center justify-center transition-all duration-200 hover:bg-white/5"
                                    style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                                  >
                                    <Minus className="size-2.5 text-white/35" />
                                  </button>
                                  <AnimatedNumber value={meta.target} className="text-xs font-semibold text-white w-6 text-center" />
                                  <button
                                    onClick={() => onUpdateTarget(l3.id, meta.target + 1)}
                                    className="size-6 rounded-md flex items-center justify-center transition-all duration-200 hover:bg-white/5"
                                    style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                                  >
                                    <Plus className="size-2.5 text-white/35" />
                                  </button>
                                  <span className="text-[9px] text-white/20 w-10 text-right">{meta.period}</span>
                                </div>
                              )}
                            </div>
                            {isOn && meta.hasCurve && expandedCurve === l3.id && meta.defaultCurve && (
                              <div className="mt-1 ml-7 mr-2 mb-2" style={{ animation: "lv-spring-expand 0.3s ease-out forwards" }}>
                                <MilestoneCurveEditor
                                  config={curveConfigs[l3.id] ?? meta.defaultCurve}
                                  onChange={(config) => onUpdateCurve(l3.id, config)}
                                  allowDirectEdit
                                />
                                <button
                                  onClick={() => setExpandedCurve(null)}
                                  className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-all duration-200"
                                  style={{
                                    background: `${catColor}08`,
                                    border: `1px solid ${catColor}20`,
                                    color: catColor,
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
                          style={{ background: `${catColor}06`, border: `1px solid ${catColor}12` }}
                        >
                          <LiquidCheckbox checked={true} color={catColor} onToggle={() => {}} />
                          <input
                            type="text"
                            value={cg.title}
                            onChange={(e) => onUpdateCustomGoalTitle(cg.id, e.target.value)}
                            placeholder="Goal name..."
                            className="text-sm flex-1 min-w-0 bg-transparent text-white/85 outline-none placeholder:text-white/20"
                            autoFocus={!cg.title}
                          />
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => onUpdateTarget(cg.id, Math.max(1, (targets[cg.id] ?? cg.target) - 1))}
                              className="size-6 rounded-md flex items-center justify-center transition-all hover:bg-white/5"
                              style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                            >
                              <Minus className="size-2.5 text-white/35" />
                            </button>
                            <AnimatedNumber
                              value={targets[cg.id] ?? cg.target}
                              className="text-xs font-semibold text-white w-6 text-center"
                            />
                            <button
                              onClick={() => onUpdateTarget(cg.id, (targets[cg.id] ?? cg.target) + 1)}
                              className="size-6 rounded-md flex items-center justify-center transition-all hover:bg-white/5"
                              style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                            >
                              <Plus className="size-2.5 text-white/35" />
                            </button>
                            <button
                              onClick={() => onRemoveCustomGoal(cg.id)}
                              className="size-6 rounded-md flex items-center justify-center transition-all hover:bg-red-500/15"
                              style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                            >
                              <X className="size-2.5 text-white/30" />
                            </button>
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={() => onAddCustomGoal(category)}
                        className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-all hover:bg-white/[0.02]"
                        style={{ border: "1px dashed rgba(255,255,255,0.06)" }}
                      >
                        <Plus className="size-3.5 text-white/15" />
                        <span className="text-sm text-white/15">Add custom goal</span>
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Custom categories */}
            {customCategories.map((cat) => {
              const sectionId = `custom_${cat.id}`
              const isExpanded = expandedSections.has(sectionId)
              const catGoals = customGoalsForCategory(cat.id)

              return (
                <div key={cat.id} className="mb-2">
                  <div className="w-full flex items-center gap-3 rounded-xl px-4 py-2.5"
                    style={{
                      background: catGoals.length > 0 ? "rgba(139,92,246,0.06)" : "rgba(255,255,255,0.015)",
                      border: catGoals.length > 0 ? "1px solid rgba(139,92,246,0.15)" : "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <button onClick={() => toggleSection(sectionId)} className="shrink-0 transition-transform duration-300"
                      style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0)" }}
                    >
                      <ChevronRight className="size-3.5 text-violet-400/50" />
                    </button>
                    <input
                      type="text"
                      value={cat.name}
                      onChange={(e) => onRenameCustomCategory(cat.id, e.target.value)}
                      placeholder="Category name..."
                      className="text-sm text-white/70 flex-1 bg-transparent outline-none placeholder:text-white/20"
                      onClick={() => { if (!isExpanded) toggleSection(sectionId) }}
                      autoFocus={!cat.name}
                    />
                    <span className="text-[10px] text-white/20 shrink-0">{catGoals.length}</span>
                    <button
                      onClick={() => onRemoveCustomCategory(cat.id)}
                      className="size-5 rounded flex items-center justify-center transition-all hover:bg-red-500/15 shrink-0"
                    >
                      <X className="size-3 text-white/25" />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="ml-4 mt-1.5 space-y-1 origin-top"
                      style={{ animation: "lv-spring-expand 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards" }}
                    >
                      {catGoals.map((cg) => (
                        <div key={cg.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                          style={{ background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.1)" }}
                        >
                          <LiquidCheckbox checked={true} color="#8b5cf6" onToggle={() => {}} />
                          <input
                            type="text"
                            value={cg.title}
                            onChange={(e) => onUpdateCustomGoalTitle(cg.id, e.target.value)}
                            placeholder="Goal name..."
                            className="text-sm flex-1 min-w-0 bg-transparent text-white/85 outline-none placeholder:text-white/20"
                            autoFocus={!cg.title}
                          />
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => onUpdateTarget(cg.id, Math.max(1, (targets[cg.id] ?? cg.target) - 1))}
                              className="size-6 rounded-md flex items-center justify-center transition-all hover:bg-white/5"
                              style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                            >
                              <Minus className="size-2.5 text-white/35" />
                            </button>
                            <AnimatedNumber value={targets[cg.id] ?? cg.target} className="text-xs font-semibold text-white w-6 text-center" />
                            <button
                              onClick={() => onUpdateTarget(cg.id, (targets[cg.id] ?? cg.target) + 1)}
                              className="size-6 rounded-md flex items-center justify-center transition-all hover:bg-white/5"
                              style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                            >
                              <Plus className="size-2.5 text-white/35" />
                            </button>
                            <button
                              onClick={() => onRemoveCustomGoal(cg.id)}
                              className="size-6 rounded-md flex items-center justify-center transition-all hover:bg-red-500/15"
                              style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                            >
                              <X className="size-2.5 text-white/30" />
                            </button>
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={() => onAddCustomGoal(cat.id)}
                        className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-all hover:bg-white/[0.02]"
                        style={{ border: "1px dashed rgba(255,255,255,0.06)" }}
                      >
                        <Plus className="size-3.5 text-white/15" />
                        <span className="text-sm text-white/15">Add custom goal</span>
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            <button
              onClick={onAddCustomCategory}
              className="w-full flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all hover:bg-white/[0.02] mb-3"
              style={{ border: "1px dashed rgba(139,92,246,0.15)" }}
            >
              <Plus className="size-3.5 text-violet-400/30" />
              <span className="text-sm text-violet-400/30">Add custom category</span>
            </button>
          </div>
        )}

        {/* Other selected life areas */}
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
              <div key={area.id} className="mb-3">
                <button
                  onClick={() => toggleSection(area.id)}
                  className="w-full flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all duration-300"
                  style={{
                    background: `${area.hex}06`,
                    border: `1px solid ${area.hex}12`,
                  }}
                >
                  <div className="transition-transform duration-300" style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0)" }}>
                    <ChevronRight className="size-3.5" style={{ color: `${area.hex}60` }} />
                  </div>
                  <Icon className="size-3.5" style={{ color: area.hex }} />
                  <span className="text-sm text-white/70 flex-1 text-left">{area.name}</span>
                  {areaSelected > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${area.hex}15`, color: `${area.hex}90` }}>
                      {areaSelected}
                    </span>
                  )}
                  <span className="text-[10px] text-white/20">{suggestions.length}</span>
                </button>

                {isExpanded && (
                  <div className="ml-4 mt-1.5 space-y-1 origin-top"
                    style={{ animation: "lv-spring-expand 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards" }}
                  >
                    {suggestions.map((s, i) => {
                      const id = `${area.id}_s${i}`
                      const isOn = selectedGoals.has(id)
                      const target = targets[id] ?? s.defaultTarget
                      return (
                        <div
                          key={id}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200"
                          style={{
                            background: isOn ? `${area.hex}06` : "transparent",
                            border: isOn ? `1px solid ${area.hex}12` : "1px solid transparent",
                          }}
                        >
                          <LiquidCheckbox checked={isOn} color={area.hex} onToggle={() => onToggle(id)} />
                          <span className={`text-sm flex-1 transition-colors duration-200 ${isOn ? "text-white/85" : "text-white/40"}`}>
                            {s.title}
                          </span>
                          {isOn && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => onUpdateTarget(id, Math.max(1, target - 1))}
                                className="size-6 rounded-md flex items-center justify-center transition-all hover:bg-white/5"
                                style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                              >
                                <Minus className="size-2.5 text-white/35" />
                              </button>
                              <AnimatedNumber value={target} className="text-xs font-semibold text-white w-6 text-center" />
                              <button
                                onClick={() => onUpdateTarget(id, target + 1)}
                                className="size-6 rounded-md flex items-center justify-center transition-all hover:bg-white/5"
                                style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                              >
                                <Plus className="size-2.5 text-white/35" />
                              </button>
                              <span className="text-[9px] text-white/20 w-10 text-right">{s.defaultPeriod}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Custom goals in this area */}
                    {customGoalsForCategory(area.id).map((cg) => (
                      <div key={cg.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                        style={{ background: `${area.hex}06`, border: `1px solid ${area.hex}12` }}
                      >
                        <LiquidCheckbox checked={true} color={area.hex} onToggle={() => {}} />
                        <input
                          type="text"
                          value={cg.title}
                          onChange={(e) => onUpdateCustomGoalTitle(cg.id, e.target.value)}
                          placeholder="Goal name..."
                          className="text-sm flex-1 min-w-0 bg-transparent text-white/85 outline-none placeholder:text-white/20"
                          autoFocus={!cg.title}
                        />
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => onUpdateTarget(cg.id, Math.max(1, (targets[cg.id] ?? cg.target) - 1))}
                            className="size-6 rounded-md flex items-center justify-center transition-all hover:bg-white/5"
                            style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                          >
                            <Minus className="size-2.5 text-white/35" />
                          </button>
                          <AnimatedNumber value={targets[cg.id] ?? cg.target} className="text-xs font-semibold text-white w-6 text-center" />
                          <button
                            onClick={() => onUpdateTarget(cg.id, (targets[cg.id] ?? cg.target) + 1)}
                            className="size-6 rounded-md flex items-center justify-center transition-all hover:bg-white/5"
                            style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                          >
                            <Plus className="size-2.5 text-white/35" />
                          </button>
                          <button
                            onClick={() => onRemoveCustomGoal(cg.id)}
                            className="size-6 rounded-md flex items-center justify-center transition-all hover:bg-red-500/15"
                            style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                          >
                            <X className="size-2.5 text-white/30" />
                          </button>
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={() => onAddCustomGoal(area.id)}
                      className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-all hover:bg-white/[0.02]"
                      style={{ border: "1px dashed rgba(255,255,255,0.06)" }}
                    >
                      <Plus className="size-3.5 text-white/15" />
                      <span className="text-sm text-white/15">Add custom goal</span>
                    </button>
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
// Step 3: Summary — Deep Glass Cards with Pulsing Glow Edges
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
    none: "#ffffff20",
  }

  return (
    <div className="min-h-screen pt-12 pb-28 px-6">
      <div className="mx-auto max-w-2xl">
        <div className="text-center mb-8 lv-stagger-enter">
          <h2 className="text-2xl font-bold mb-2 text-white/90 tracking-tight">System Ready</h2>
          <p className="text-white/30 text-sm">
            {totalGoals} goals across {totalAreas} life area{totalAreas > 1 ? "s" : ""}
            {path && ` \u00b7 ${path === "fto" ? "Find The One" : "Abundance"} path`}
          </p>
        </div>

        {/* Stats with radial progress rings */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: "Total Goals", value: totalGoals, max: 30, color: "#06b6d4" },
            { label: "Life Areas", value: totalAreas, max: 6, color: "#8b5cf6" },
            { label: "Achievements", value: badges.length, max: 20, color: "#f59e0b" },
          ].map((stat, i) => (
            <div key={stat.label} className="rounded-xl p-3 flex flex-col items-center lv-stagger-enter"
              style={{
                animationDelay: `${50 + i * 60}ms`,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.04)",
                boxShadow: `0 0 20px ${stat.color}08`,
              }}
            >
              <div className="relative mb-1">
                <RadialRing value={stat.value} max={stat.max} color={stat.color} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-white/90 rotate-0">{stat.value}</span>
                </div>
              </div>
              <div className="text-[10px] uppercase tracking-wider text-white/25">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="mb-6 rounded-xl overflow-hidden lv-stagger-enter"
            style={{
              animationDelay: "230ms",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.04)",
              "--glow-color": "rgba(245,158,11,0.08)",
              animation: "lv-glow-pulse 4s ease-in-out infinite",
            } as React.CSSProperties}
          >
            <div className="px-5 py-3 flex items-center justify-between"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
            >
              <div className="flex items-center gap-2">
                <Trophy className="size-3.5 text-amber-400/60" />
                <span className="text-sm font-semibold uppercase tracking-wider text-white/50">
                  Achievements You&apos;ll Unlock
                </span>
              </div>
              <span className="text-xs text-white/20">{badges.length} badges</span>
            </div>
            <div className="px-5 py-3 space-y-2.5">
              {badges.map((badge) => (
                <div key={badge.badgeId} className="flex items-center gap-3">
                  <div className="size-6 rounded-full flex items-center justify-center"
                    style={{
                      background: `${TIER_COLORS[badge.tier]}10`,
                      border: `1px solid ${TIER_COLORS[badge.tier]}25`,
                      boxShadow: `0 0 6px ${TIER_COLORS[badge.tier]}15`,
                    }}
                  >
                    <Trophy className="size-3" style={{ color: TIER_COLORS[badge.tier] }} />
                  </div>
                  <span className="text-sm text-white/60 flex-1">{badge.title}</span>
                  <span className="text-[10px] uppercase font-medium" style={{ color: TIER_COLORS[badge.tier] }}>
                    {badge.tier === "none" ? "locked" : badge.tier}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Daygame category cards with glowing edges */}
        {daygameGrouped.map(({ category, goals }, catIdx) => {
          const catColor = CATEGORY_COLORS[category] ?? "#06b6d4"
          return (
            <div key={category} className="mb-3 rounded-xl overflow-hidden lv-stagger-enter"
              style={{
                animationDelay: `${280 + catIdx * 50}ms`,
                background: "rgba(255,255,255,0.02)",
                borderTop: `2px solid ${catColor}40`,
                borderLeft: "1px solid rgba(255,255,255,0.04)",
                borderRight: "1px solid rgba(255,255,255,0.04)",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                "--glow-color": `${catColor}12`,
                animation: "lv-glow-pulse 5s ease-in-out infinite",
              } as React.CSSProperties}
            >
              <div className="px-5 py-3 flex items-center justify-between"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
              >
                <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: `${catColor}90` }}>
                  {CATEGORY_LABELS[category] ?? category.replace(/_/g, " ")}
                </span>
                <span className="text-xs text-white/20">{goals.length} goals</span>
              </div>
              <div className="px-5 py-3 space-y-2">
                {goals.map((g) => {
                  const target = targets[g.id]
                    ?? g.defaultMilestoneConfig?.target
                    ?? g.defaultRampSteps?.[0]?.frequencyPerWeek
                    ?? "\u2014"
                  return (
                    <div key={g.id} className="flex items-center gap-3">
                      <div className="size-1.5 rounded-full" style={{ background: catColor, boxShadow: `0 0 4px ${catColor}40` }} />
                      <span className="text-sm text-white/65 flex-1">{g.title}</span>
                      <span className="text-xs font-medium" style={{ color: `${catColor}90` }}>{target}</span>
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

        {/* Other area cards */}
        {otherAreaData.map(({ area, goals }, areaIdx) => (
          <div key={area.id} className="mb-3 rounded-xl overflow-hidden lv-stagger-enter"
            style={{
              animationDelay: `${380 + areaIdx * 50}ms`,
              background: "rgba(255,255,255,0.02)",
              borderTop: `2px solid ${area.hex}40`,
              borderLeft: "1px solid rgba(255,255,255,0.04)",
              borderRight: "1px solid rgba(255,255,255,0.04)",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              "--glow-color": `${area.hex}12`,
              animation: "lv-glow-pulse 5s ease-in-out infinite",
            } as React.CSSProperties}
          >
            <div className="px-5 py-3 flex items-center justify-between"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
            >
              <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: `${area.hex}90` }}>
                {area.name}
              </span>
              <span className="text-xs text-white/20">{goals.length} goals</span>
            </div>
            <div className="px-5 py-3 space-y-2">
              {goals.map((g) => (
                <div key={g.id} className="flex items-center gap-3">
                  <div className="size-1.5 rounded-full" style={{ background: area.hex, boxShadow: `0 0 4px ${area.hex}40` }} />
                  <span className="text-sm text-white/65 flex-1">{g.title}</span>
                  <span className="text-xs font-medium" style={{ color: `${area.hex}90` }}>
                    {targets[g.id] ?? g.defaultTarget}
                  </span>
                  <span className="text-[10px] uppercase text-white/20">/{g.period}</span>
                </div>
              ))}
            </div>
          </div>
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

          return entries.map(([catId, goals]) => {
            const catLabel = customCategories.find((c) => c.id === catId)?.name
              || CATEGORY_LABELS[catId as GoalDisplayCategory]
              || catId
            return (
              <div key={catId} className="mb-3 rounded-xl overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  borderTop: "2px solid rgba(139,92,246,0.3)",
                  borderLeft: "1px solid rgba(255,255,255,0.04)",
                  borderRight: "1px solid rgba(255,255,255,0.04)",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <div className="px-5 py-3 flex items-center justify-between"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                >
                  <span className="text-sm font-semibold uppercase tracking-wider text-violet-400/70">
                    {catLabel} <span className="text-[10px] normal-case font-normal text-white/20">(custom)</span>
                  </span>
                  <span className="text-xs text-white/20">{goals.length} goals</span>
                </div>
                <div className="px-5 py-3 space-y-2">
                  {goals.map((g) => (
                    <div key={g.id} className="flex items-center gap-3">
                      <div className="size-1.5 rounded-full" style={{ background: "#8b5cf6", boxShadow: "0 0 4px rgba(139,92,246,0.4)" }} />
                      <span className="text-sm text-white/65 flex-1">{g.title}</span>
                      <span className="text-xs font-medium text-violet-400/70">
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

// ============================================================================
// Step 4: Gravity Well — Life Area Visualization
// ============================================================================

const ORBIT_CONFIG: Record<
  string,
  { radius: number; duration: number; startAngle: number; planetSize: number; trailColor: string }
> = {
  daygame: { radius: 100, duration: 50, startAngle: 0, planetSize: 20, trailColor: "#f97316" },
  health_fitness: { radius: 155, duration: 65, startAngle: 45, planetSize: 14, trailColor: "#10b981" },
  career_business: { radius: 200, duration: 85, startAngle: 120, planetSize: 14, trailColor: "#f59e0b" },
  social: { radius: 240, duration: 105, startAngle: 200, planetSize: 13, trailColor: "#8b5cf6" },
  personal_growth: { radius: 275, duration: 125, startAngle: 300, planetSize: 13, trailColor: "#06b6d4" },
  lifestyle: { radius: 305, duration: 145, startAngle: 160, planetSize: 12, trailColor: "#ec4899" },
}

const GW_CENTER = 370
const GW_SUN_R = 32

function GravityWellStep({
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
  const viewSize = GW_CENTER * 2

  return (
    <div className="min-h-screen pt-8 pb-28 px-6">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-6 lv-stagger-enter">
          <h2 className="text-2xl font-bold mb-2 text-white/90 tracking-tight">Your System</h2>
          <p className="text-white/30 text-sm">
            {totalGoals} goals \u00b7 {activeAreas.size} life areas
            {path && ` \u00b7 ${path === "fto" ? "Find The One" : "Abundance"}`}
          </p>
        </div>

        <div className="relative w-full mx-auto lv-stagger-enter" style={{ maxWidth: 740, aspectRatio: "1/1", animationDelay: "100ms" }}>
          <style>{`
            /* Gravity well concentric wave rings */
            ${[1, 2, 3, 4, 5].map((i) => `
              @keyframes lv-wave-${i} {
                0%, 100% { opacity: ${0.08 - i * 0.012}; }
                50% { opacity: ${0.04 - i * 0.005}; }
              }
            `).join("")}

            /* Orbit animations */
            ${visibleAreas.map((area) => {
              const config = ORBIT_CONFIG[area.id]
              if (!config) return ""
              return `
                @keyframes lv-orbit-${area.id} {
                  from { transform: rotate(${config.startAngle}deg); }
                  to { transform: rotate(${config.startAngle + 360}deg); }
                }
                @keyframes lv-counter-orbit-${area.id} {
                  from { transform: rotate(-${config.startAngle}deg); }
                  to { transform: rotate(-${config.startAngle + 360}deg); }
                }
              `
            }).join("\n")}

            /* Sun core glow */
            @keyframes lv-sun-core {
              0%, 100% {
                filter: drop-shadow(0 0 15px rgba(6,182,212,0.5)) drop-shadow(0 0 30px rgba(139,92,246,0.25));
              }
              50% {
                filter: drop-shadow(0 0 25px rgba(6,182,212,0.7)) drop-shadow(0 0 50px rgba(139,92,246,0.4));
              }
            }
          `}</style>

          <svg viewBox={`0 0 ${viewSize} ${viewSize}`} className="w-full h-full" style={{ overflow: "visible" }}>
            <defs>
              {/* Sun gradient - void core with bioluminescent edge */}
              <radialGradient id="lv-sun-grad" cx="45%" cy="45%">
                <stop offset="0%" stopColor="#0f172a" />
                <stop offset="50%" stopColor="#0a1628" />
                <stop offset="75%" stopColor="#06b6d4" stopOpacity="0.3" />
                <stop offset="90%" stopColor="#8b5cf6" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="lv-sun-glow">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.15" />
                <stop offset="30%" stopColor="#8b5cf6" stopOpacity="0.08" />
                <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.03" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>

              {/* Planet glow filter */}
              <filter id="lv-planet-glow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
                <feFlood floodColor="#06b6d4" floodOpacity="0.5" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>

              {/* Active planet glow */}
              <filter id="lv-active-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="blur" />
                <feFlood floodColor="#06b6d4" floodOpacity="0.7" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>

              {/* Gravitational lensing distortion */}
              <filter id="lv-lens" x="-20%" y="-20%" width="140%" height="140%">
                <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
              </filter>

              {/* Trail gradient for each area */}
              {visibleAreas.map((area) => {
                const config = ORBIT_CONFIG[area.id]
                if (!config) return null
                return (
                  <linearGradient key={`trail-${area.id}`} id={`lv-trail-${area.id}`}>
                    <stop offset="0%" stopColor={config.trailColor} stopOpacity="0" />
                    <stop offset="50%" stopColor={config.trailColor} stopOpacity="0.4" />
                    <stop offset="100%" stopColor={config.trailColor} stopOpacity="0" />
                  </linearGradient>
                )
              })}
            </defs>

            {/* Concentric gravity well rings that wave */}
            {[50, 80, 120, 170, 230, 290, 340].map((r, i) => (
              <circle key={`gw-ring-${i}`}
                cx={GW_CENTER} cy={GW_CENTER} r={r}
                fill="none"
                stroke="rgba(6,182,212,0.08)"
                strokeWidth="0.5"
                style={{
                  animation: `lv-wave-${(i % 5) + 1} ${6 + i * 0.8}s ease-in-out infinite`,
                  animationDelay: `${i * 0.3}s`,
                }}
              />
            ))}

            {/* Sun glow */}
            <circle cx={GW_CENTER} cy={GW_CENTER} r={GW_SUN_R * 3} fill="url(#lv-sun-glow)" />

            {/* Sun core - dark void with bioluminescent rim */}
            <circle cx={GW_CENTER} cy={GW_CENTER} r={GW_SUN_R}
              fill="url(#lv-sun-grad)"
              stroke="rgba(6,182,212,0.3)"
              strokeWidth="1"
              style={{ animation: "lv-sun-core 4s ease-in-out infinite" }}
            />
            {/* Inner rim glow */}
            <circle cx={GW_CENTER} cy={GW_CENTER} r={GW_SUN_R - 3}
              fill="none" stroke="rgba(139,92,246,0.15)" strokeWidth="0.5"
            />
            <circle cx={GW_CENTER} cy={GW_CENTER} r={GW_SUN_R - 8}
              fill="none" stroke="rgba(6,182,212,0.1)" strokeWidth="0.3"
            />

            {/* Center label */}
            <text x={GW_CENTER} y={GW_CENTER - 2} textAnchor="middle" dominantBaseline="middle"
              fill="rgba(6,182,212,0.6)" fontSize="7" fontWeight="600" letterSpacing="1.5"
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              YOUR
            </text>
            <text x={GW_CENTER} y={GW_CENTER + 8} textAnchor="middle" dominantBaseline="middle"
              fill="rgba(6,182,212,0.6)" fontSize="7" fontWeight="600" letterSpacing="1.5"
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              VISION
            </text>

            {/* Orbit paths + luminescent trails */}
            {visibleAreas.map((area) => {
              const config = ORBIT_CONFIG[area.id]
              if (!config) return null
              const isActive = activeAreas.has(area.id)
              const isHovered = hoveredPlanet === area.id

              return (
                <g key={`orbit-${area.id}`}>
                  {/* Orbit ring */}
                  <circle cx={GW_CENTER} cy={GW_CENTER} r={config.radius}
                    fill="none"
                    stroke={isActive ? `${area.hex}20` : "rgba(255,255,255,0.02)"}
                    strokeWidth={isHovered ? 1.5 : 0.5}
                    strokeDasharray={isActive ? "none" : "2,6"}
                    className="transition-all duration-500"
                  />
                  {/* Luminescent trail arc (only for active planets) */}
                  {isActive && (
                    <circle cx={GW_CENTER} cy={GW_CENTER} r={config.radius}
                      fill="none"
                      stroke={`url(#lv-trail-${area.id})`}
                      strokeWidth="3"
                      strokeDasharray={`${config.radius * 0.8} ${config.radius * Math.PI * 2 - config.radius * 0.8}`}
                      style={{
                        transformOrigin: `${GW_CENTER}px ${GW_CENTER}px`,
                        animation: `lv-orbit-${area.id} ${config.duration}s linear infinite`,
                        filter: `drop-shadow(0 0 3px ${config.trailColor}40)`,
                      }}
                    />
                  )}
                </g>
              )
            })}

            {/* Planets */}
            {visibleAreas.map((area) => {
              const config = ORBIT_CONFIG[area.id]
              if (!config) return null
              const isActive = activeAreas.has(area.id)
              const isHovered = hoveredPlanet === area.id
              const count = goalCounts[area.id] ?? 0

              return (
                <g key={`planet-${area.id}`}
                  style={{
                    transformOrigin: `${GW_CENTER}px ${GW_CENTER}px`,
                    animation: `lv-orbit-${area.id} ${config.duration}s linear infinite`,
                  }}
                >
                  <g style={{
                    transformOrigin: `${GW_CENTER}px ${GW_CENTER - config.radius}px`,
                    animation: `lv-counter-orbit-${area.id} ${config.duration}s linear infinite`,
                  }}>
                    {/* Hit area */}
                    <circle cx={GW_CENTER} cy={GW_CENTER - config.radius} r={config.planetSize + 10}
                      fill="transparent" className="cursor-pointer"
                      onMouseEnter={() => setHoveredPlanet(area.id)}
                      onMouseLeave={() => setHoveredPlanet(null)}
                    />

                    {/* Gravitational lensing on hover */}
                    {isHovered && isActive && (
                      <circle cx={GW_CENTER} cy={GW_CENTER - config.radius} r={config.planetSize + 15}
                        fill="none" stroke={`${area.hex}15`} strokeWidth="8"
                        filter="lv-lens"
                        style={{ opacity: 0.5 }}
                      />
                    )}

                    {/* Planet body */}
                    <circle cx={GW_CENTER} cy={GW_CENTER - config.radius} r={config.planetSize}
                      fill={area.hex}
                      fillOpacity={isActive ? 0.85 : 0.1}
                      filter={isActive ? (isHovered ? "url(#lv-active-glow)" : "url(#lv-planet-glow)") : undefined}
                      className="transition-all duration-300"
                      style={{
                        animation: !isActive ? "lv-planet-blink 8s ease-in-out infinite" : undefined,
                        animationDelay: `${Math.random() * 5}s`,
                      }}
                    />

                    {/* Specular highlight */}
                    <circle
                      cx={GW_CENTER - config.planetSize * 0.25}
                      cy={GW_CENTER - config.radius - config.planetSize * 0.25}
                      r={config.planetSize * 0.3}
                      fill="white" fillOpacity={isActive ? 0.12 : 0.03}
                    />

                    {/* Label */}
                    <text x={GW_CENTER} y={GW_CENTER - config.radius + config.planetSize + 14}
                      textAnchor="middle"
                      fill={isActive ? (isHovered ? area.hex : "rgba(255,255,255,0.6)") : "rgba(255,255,255,0.15)"}
                      fontSize={area.id === "daygame" ? "9" : "7.5"}
                      fontWeight={area.id === "daygame" ? "700" : "500"}
                      letterSpacing="0.3"
                      className="transition-all duration-300"
                      style={{ fontFamily: "system-ui, sans-serif" }}
                    >
                      {area.name}
                    </text>

                    {/* Goal count badge */}
                    {isActive && count > 0 && (
                      <g>
                        <circle cx={GW_CENTER + config.planetSize - 2} cy={GW_CENTER - config.radius - config.planetSize + 2}
                          r={7} fill="rgba(10,14,26,0.9)" stroke={`${area.hex}60`} strokeWidth="0.8"
                        />
                        <text x={GW_CENTER + config.planetSize - 2} y={GW_CENTER - config.radius - config.planetSize + 2.5}
                          textAnchor="middle" dominantBaseline="middle" fill={area.hex}
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
          </svg>
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="mt-6 lv-stagger-enter" style={{ animationDelay: "200ms" }}>
            <div className="flex items-center gap-2 mb-4 justify-center">
              <Trophy className="size-4 text-amber-400/50" />
              <span className="text-sm font-semibold uppercase tracking-wider text-white/40">
                Achievements to Earn
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {badges.map((badge, i) => {
                const tierColor = badge.tier === "diamond" ? "#b9f2ff"
                  : badge.tier === "gold" ? "#ffd700"
                  : badge.tier === "silver" ? "#c0c0c0"
                  : badge.tier === "bronze" ? "#cd7f32"
                  : "rgba(255,255,255,0.15)"

                return (
                  <div key={badge.badgeId}
                    className="rounded-xl p-3 text-center lv-stagger-enter"
                    style={{
                      animationDelay: `${250 + i * 40}ms`,
                      background: "rgba(255,255,255,0.02)",
                      border: `1px solid ${tierColor}20`,
                      boxShadow: `0 0 10px ${tierColor}08`,
                    }}
                  >
                    <Trophy className="size-5 mx-auto mb-1.5" style={{ color: tierColor }} />
                    <div className="text-xs text-white/55 leading-tight">{badge.title}</div>
                    <div className="text-[10px] uppercase font-medium mt-1" style={{ color: tierColor }}>
                      {badge.tier === "none" ? "Locked" : badge.tier}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="mt-8 text-center lv-stagger-enter" style={{ animationDelay: "400ms" }}>
          <button
            className="px-8 py-3 rounded-xl font-semibold text-sm transition-all text-white"
            style={{
              background: "linear-gradient(135deg, #06b6d4, #8b5cf6, #06b6d4)",
              backgroundSize: "200% 200%",
              animation: "lv-cta-gradient 3s ease-in-out infinite",
              boxShadow: "0 0 20px rgba(6,182,212,0.3), 0 0 8px rgba(139,92,246,0.2)",
            }}
          >
            Create Goals
          </button>
          <p className="text-xs text-white/15 mt-2">This will create {totalGoals} goals in your dashboard</p>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export default function VariantC() {
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
        return { label: "Choose Goals", disabled: !path, status: path ? `${path === "fto" ? "Find The One" : "Abundance"} selected` : "Select a path" }
      case "goals":
        return { label: "View Summary", disabled: selectedGoals.size === 0, status: `${selectedGoals.size} goals selected` }
      case "summary":
        return { label: "View System", disabled: false, status: `${totalGoals} goals ready` }
      case "orrery":
        return { label: "Create Goals", disabled: false, status: `${totalGoals} goals \u00b7 ${1 + selectedAreas.size} areas` }
    }
  }, [step, path, selectedGoals.size, totalGoals, selectedAreas.size])

  return (
    <div className="relative">
      <LiquidVoidStyles />
      <LiquidVoidCanvas />

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
        <GravityWellStep
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
