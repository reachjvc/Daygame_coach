"use client"

/**
 * V7 Variant B: "Northern Lights Reimagined"
 *
 * Theme: Aurora constrained to top/bottom edges, clean dark center with star twinkles,
 * morphing card borders, holographic shimmer, animated orrery with particle trails.
 *
 * Hierarchy: Flat (L1->L3) with L2s as badge achievements
 * Flow: 4-step linear wizard
 *
 * Step 1 (Direction): Floating path cards with traveling light borders
 * Step 2 (Goals): Select/deselect L3 goals with inline target controls
 * Step 3 (Summary): Holographic shimmer cards with animated number counters
 * Step 4 (Your System): Enhanced orrery with particle trails, pulse rings, shooting stars
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
  Compass,
  Target,
  Zap,
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

const STEP_COLORS: Record<FlowStep, string> = {
  direction: "#06b6d4",  // cyan
  goals: "#8b5cf6",      // violet
  summary: "#f59e0b",    // gold/amber
  orrery: "#e8a849",     // warm gold
}

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

// ============================================================================
// Global Keyframe Styles
// ============================================================================

function GlobalStyles({ currentStep }: { currentStep: FlowStep }) {
  const glowColor = STEP_COLORS[currentStep]
  return (
    <style>{`
      @keyframes v7twinkle {
        0%, 100% { opacity: 0.15; transform: scale(1); }
        50% { opacity: 0.85; transform: scale(1.3); }
      }
      @keyframes v7auroraWave {
        0% { transform: translateX(-30%) scaleY(1); opacity: 0.5; }
        25% { transform: translateX(-15%) scaleY(1.2); opacity: 0.7; }
        50% { transform: translateX(0%) scaleY(0.9); opacity: 0.5; }
        75% { transform: translateX(15%) scaleY(1.15); opacity: 0.65; }
        100% { transform: translateX(30%) scaleY(1); opacity: 0.5; }
      }
      @keyframes v7auroraWaveReverse {
        0% { transform: translateX(20%) scaleY(1); opacity: 0.4; }
        50% { transform: translateX(-20%) scaleY(1.15); opacity: 0.6; }
        100% { transform: translateX(20%) scaleY(1); opacity: 0.4; }
      }
      @keyframes v7nebulaFloat1 {
        0% { transform: translate(0, 0) scale(1); opacity: 0.06; }
        33% { transform: translate(40px, -20px) scale(1.1); opacity: 0.08; }
        66% { transform: translate(-30px, 15px) scale(0.95); opacity: 0.05; }
        100% { transform: translate(0, 0) scale(1); opacity: 0.06; }
      }
      @keyframes v7nebulaFloat2 {
        0% { transform: translate(0, 0) scale(1); opacity: 0.05; }
        50% { transform: translate(-50px, 25px) scale(1.15); opacity: 0.07; }
        100% { transform: translate(0, 0) scale(1); opacity: 0.05; }
      }
      @keyframes v7floatUp {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }
      @keyframes v7floatUpSlow {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-4px); }
      }
      @keyframes v7borderTravel {
        0% { background-position: 0% 50%; }
        100% { background-position: 300% 50%; }
      }
      /* v7conicSpin removed — CSS Houdini syntax unsupported by styled-jsx */
      @keyframes v7holoShimmer {
        0% { filter: hue-rotate(0deg); background-position: -200% 0; }
        100% { filter: hue-rotate(30deg); background-position: 200% 0; }
      }
      @keyframes v7numberPop {
        0% { transform: scale(0.6); opacity: 0; }
        60% { transform: scale(1.15); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes v7stepIn {
        0% { opacity: 0; transform: scale(0.96) translateY(12px); }
        100% { opacity: 1; transform: scale(1) translateY(0); }
      }
      @keyframes v7cardReveal {
        0% { opacity: 0; transform: translateY(20px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      @keyframes v7pulseRing {
        0% { transform: scale(1); opacity: 0.6; stroke-width: 2; }
        100% { transform: scale(3.15); opacity: 0; stroke-width: 0.5; }
      }
      @keyframes v7shootingStar {
        0% { opacity: 0; transform: translate(0, 0); }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { opacity: 0; transform: translate(300px, 200px); }
      }
      @keyframes v7trailFade {
        0% { opacity: 0.6; }
        100% { opacity: 0; }
      }
      @keyframes v7barFill {
        0% { width: 0%; }
        100% { width: 100%; }
      }
      @keyframes v7glowPulse {
        0%, 100% { box-shadow: 0 0 20px ${glowColor}30, 0 0 40px ${glowColor}10; }
        50% { box-shadow: 0 0 30px ${glowColor}50, 0 0 60px ${glowColor}20; }
      }
      @keyframes v7sunPulse {
        0%, 100% { filter: drop-shadow(0 0 20px rgba(232,168,73,0.6)) drop-shadow(0 0 40px rgba(232,168,73,0.3)); }
        50% { filter: drop-shadow(0 0 35px rgba(232,168,73,0.8)) drop-shadow(0 0 65px rgba(232,168,73,0.5)); }
      }
      @keyframes v7gearSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes v7gearSpinReverse { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
      @keyframes v7orbitSpeedup {
        0% { animation-duration: inherit; }
        50% { animation-duration: 5s; }
        100% { animation-duration: inherit; }
      }
      @keyframes v7badgeFloat {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        25% { transform: translateY(-3px) rotate(1deg); }
        75% { transform: translateY(2px) rotate(-1deg); }
      }
      .v7-step-enter {
        animation: v7stepIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
      }
      .v7-card-reveal {
        animation: v7cardReveal 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
      }
    `}</style>
  )
}

// ============================================================================
// Background: Aurora Edge + Clean Center + Star Twinkles + Nebula
// ============================================================================

function NorthernLightsBackground() {
  const starsRef = useRef<Array<{ x: number; y: number; size: number; delay: number; duration: number }>>([])

  if (starsRef.current.length === 0) {
    starsRef.current = Array.from({ length: 80 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 1.8 + 0.5,
      delay: Math.random() * 5,
      duration: Math.random() * 4 + 2,
    }))
  }

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base dark gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#070b1a] via-[#0a0e1f] to-[#080c18]" />

      {/* Top aurora band - constrained to top 15% */}
      <div className="absolute top-0 left-0 right-0 h-[18%] overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(6,182,212,0.3) 20%, rgba(139,92,246,0.4) 40%, rgba(236,72,153,0.3) 60%, rgba(16,185,129,0.25) 80%, transparent)",
            filter: "blur(30px)",
            animation: "v7auroraWave 12s ease-in-out infinite",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(90deg, transparent 10%, rgba(16,185,129,0.2) 30%, rgba(6,182,212,0.35) 50%, rgba(139,92,246,0.2) 70%, transparent 90%)",
            filter: "blur(40px)",
            animation: "v7auroraWaveReverse 16s ease-in-out infinite",
          }}
        />
        {/* Fade out at bottom of aurora band */}
        <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-[#070b1a] to-transparent" />
      </div>

      {/* Bottom aurora reflection - constrained to bottom 10% */}
      <div className="absolute bottom-0 left-0 right-0 h-[12%] overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(6,182,212,0.15) 25%, rgba(139,92,246,0.2) 50%, rgba(16,185,129,0.15) 75%, transparent)",
            filter: "blur(35px)",
            animation: "v7auroraWave 15s ease-in-out infinite reverse",
          }}
        />
        {/* Fade out at top of bottom aurora */}
        <div className="absolute top-0 left-0 right-0 h-2/3 bg-gradient-to-b from-[#080c18] to-transparent" />
      </div>

      {/* Nebula clouds - very subtle, slow-moving */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "25%",
          left: "10%",
          width: "40%",
          height: "30%",
          background: "radial-gradient(ellipse, rgba(6,182,212,0.06) 0%, transparent 70%)",
          animation: "v7nebulaFloat1 45s ease-in-out infinite",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          top: "45%",
          right: "5%",
          width: "35%",
          height: "25%",
          background: "radial-gradient(ellipse, rgba(139,92,246,0.05) 0%, transparent 70%)",
          animation: "v7nebulaFloat2 55s ease-in-out infinite",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: "20%",
          left: "25%",
          width: "30%",
          height: "20%",
          background: "radial-gradient(ellipse, rgba(16,185,129,0.04) 0%, transparent 70%)",
          animation: "v7nebulaFloat1 60s ease-in-out infinite reverse",
        }}
      />

      {/* Star twinkles */}
      {starsRef.current.map((star, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            width: star.size,
            height: star.size,
            left: `${star.x}%`,
            top: `${star.y}%`,
            animation: `v7twinkle ${star.duration}s ease-in-out infinite`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

// ============================================================================
// Morphing Card Container — step-colored glowing border
// ============================================================================

function MorphingCard({
  step,
  children,
  className = "",
}: {
  step: FlowStep
  children: React.ReactNode
  className?: string
}) {
  const color = STEP_COLORS[step]
  return (
    <div
      className={`relative rounded-2xl ${className}`}
      style={{
        background: `linear-gradient(135deg, rgba(12,16,30,0.95), rgba(15,20,35,0.9))`,
        border: `1px solid ${color}25`,
        animation: "v7glowPulse 4s ease-in-out infinite",
      }}
    >
      {/* Animated border glow line */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}15, transparent) padding-box, linear-gradient(90deg, transparent, ${color}40, ${color}60, ${color}40, transparent) border-box`,
          border: "1px solid transparent",
          borderRadius: "1rem",
          mask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
          WebkitMask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
          maskComposite: "xor",
          WebkitMaskComposite: "xor" as string,
        }}
      />
      {children}
    </div>
  )
}

// ============================================================================
// Frosted Glass Bottom Bar with charging connectors
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
  const stepKey = STEPS[currentStep] ?? "direction"
  const accentColor = STEP_COLORS[stepKey]

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{
        background: "rgba(8,12,24,0.75)",
        backdropFilter: "blur(24px) saturate(1.5)",
        WebkitBackdropFilter: "blur(24px) saturate(1.5)",
        borderTop: `1px solid ${accentColor}20`,
      }}
    >
      <div className="mx-auto max-w-3xl flex items-center justify-between px-6 pt-3 pb-2">
        <span className="text-xs" style={{ color: `${accentColor}90` }}>{statusText}</span>
        <button
          onClick={onCta}
          disabled={ctaDisabled}
          className="px-5 py-2 rounded-lg text-xs font-semibold transition-all duration-300 disabled:opacity-30"
          style={{
            background: ctaDisabled
              ? "rgba(255,255,255,0.05)"
              : `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
            color: ctaDisabled ? "rgba(255,255,255,0.3)" : "white",
            boxShadow: ctaDisabled ? "none" : `0 0 20px ${accentColor}30`,
          }}
        >
          {ctaLabel}
        </button>
      </div>
      <div className="mx-auto max-w-3xl flex items-center justify-center px-6 pb-3 gap-1">
        {steps.map((label, i) => {
          const isActive = i === currentStep
          const isDone = i < currentStep
          const isClickable = isDone
          const dotColor = STEP_COLORS[STEPS[i]]
          return (
            <div key={label} className="flex items-center gap-1">
              {i > 0 && (
                <div className="w-6 sm:w-10 h-0.5 rounded-full relative overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  {/* Charging fill animation */}
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                    style={{
                      width: isDone ? "100%" : isActive ? "50%" : "0%",
                      background: `linear-gradient(90deg, ${STEP_COLORS[STEPS[i - 1]]}, ${dotColor})`,
                    }}
                  />
                </div>
              )}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={() => isClickable && onStepClick(i)}
                  disabled={!isClickable}
                  className="flex items-center justify-center rounded-full text-xs font-bold transition-all duration-300"
                  style={{
                    width: isActive ? 30 : 24,
                    height: isActive ? 30 : 24,
                    background: isDone
                      ? dotColor
                      : isActive
                        ? `${dotColor}30`
                        : "rgba(255,255,255,0.05)",
                    color: isDone ? "white" : isActive ? dotColor : "rgba(255,255,255,0.3)",
                    border: isActive ? `2px solid ${dotColor}` : `1px solid ${isDone ? dotColor : "rgba(255,255,255,0.1)"}`,
                    boxShadow: isActive ? `0 0 15px ${dotColor}40` : "none",
                    cursor: isClickable ? "pointer" : "default",
                  }}
                >
                  {isDone ? <Check className="size-3" /> : i + 1}
                </button>
                <span className="text-[9px] hidden sm:block transition-colors duration-300"
                  style={{ color: isActive ? dotColor : isDone ? `${dotColor}90` : "rgba(255,255,255,0.2)" }}
                >
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
// Step 1: Direction — Floating cards with traveling light borders
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
    <div className="min-h-screen pt-16 pb-36 px-6 v7-step-enter">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-10">
          <div className="relative inline-block mb-3">
            <Compass className="size-8 text-cyan-400 opacity-70" />
            <div className="absolute inset-0 rounded-full" style={{
              background: "radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)",
              filter: "blur(8px)",
            }} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Shape Your Path to Mastery</h1>
          <p className="text-white/40 text-sm">
            Select your dating direction, then pick additional life areas to track.
          </p>
        </div>

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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
          {/* FTO Card */}
          <button
            onClick={() => onSelectPath("fto")}
            className="relative rounded-2xl p-5 text-left transition-all duration-500 group"
            style={{
              animation: "v7floatUp 6s ease-in-out infinite",
              animationDelay: "0s",
              background: selectedPath === "fto"
                ? "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(6,182,212,0.08))"
                : "linear-gradient(135deg, rgba(139,92,246,0.05), rgba(6,182,212,0.02))",
              border: selectedPath === "fto"
                ? "none"
                : "1px solid rgba(139,92,246,0.12)",
            }}
          >
            {/* Traveling light border when selected */}
            {selectedPath === "fto" && (
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                  background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.5), rgba(6,182,212,0.5), rgba(139,92,246,0.5), transparent) border-box",
                  border: "2px solid transparent",
                  backgroundSize: "300% 100%",
                  animation: "v7borderTravel 3s linear infinite",
                  mask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
                  WebkitMask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
                  maskComposite: "xor",
                  WebkitMaskComposite: "xor" as string,
                }}
              />
            )}
            <div className="flex items-center gap-3 mb-3">
              <div className="size-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
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

          {/* Abundance Card */}
          <button
            onClick={() => onSelectPath("abundance")}
            className="relative rounded-2xl p-5 text-left transition-all duration-500 group"
            style={{
              animation: "v7floatUp 6s ease-in-out infinite",
              animationDelay: "1.5s",
              background: selectedPath === "abundance"
                ? "linear-gradient(135deg, rgba(249,115,22,0.15), rgba(234,179,8,0.08))"
                : "linear-gradient(135deg, rgba(249,115,22,0.05), rgba(234,179,8,0.02))",
              border: selectedPath === "abundance"
                ? "none"
                : "1px solid rgba(249,115,22,0.12)",
            }}
          >
            {selectedPath === "abundance" && (
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                  background: "linear-gradient(90deg, transparent, rgba(249,115,22,0.5), rgba(234,179,8,0.5), rgba(249,115,22,0.5), transparent) border-box",
                  border: "2px solid transparent",
                  backgroundSize: "300% 100%",
                  animation: "v7borderTravel 3s linear infinite",
                  mask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
                  WebkitMask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
                  maskComposite: "xor",
                  WebkitMaskComposite: "xor" as string,
                }}
              />
            )}
            <div className="flex items-center gap-3 mb-3">
              <div className="size-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
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

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          <span className="text-xs uppercase tracking-wider text-white/20">Other Life Areas</span>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {otherAreas.map((area, idx) => {
            const Icon = area.icon
            const isSelected = selectedAreas.has(area.id)
            return (
              <button
                key={area.id}
                onClick={() => onToggleArea(area.id)}
                className="flex flex-col items-center gap-2.5 rounded-xl p-4 transition-all duration-300 group"
                style={{
                  animation: `v7floatUpSlow 5s ease-in-out infinite`,
                  animationDelay: `${idx * 0.4}s`,
                  background: isSelected ? `${area.hex}10` : "rgba(255,255,255,0.015)",
                  border: isSelected ? `1px solid ${area.hex}35` : "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div className="size-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                  style={{ background: isSelected ? `${area.hex}20` : "rgba(255,255,255,0.04)" }}>
                  <Icon className="size-5 transition-colors duration-300"
                    style={{ color: isSelected ? area.hex : "rgba(255,255,255,0.35)" }} />
                </div>
                <span className={`text-xs font-medium text-center leading-tight transition-colors duration-300 ${isSelected ? "text-white" : "text-white/35"}`}>
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
// Step 2: Goals — Select/deselect with inline target controls
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
    <div className="min-h-screen pt-12 pb-36 px-6 v7-step-enter">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <Target className="size-5 text-violet-400 opacity-70" />
            <h2 className="text-2xl font-bold text-white">Choose Your Goals</h2>
          </div>
          <p className="text-white/35 text-sm ml-8">
            Toggle goals on or off and adjust targets. These are starting points.
          </p>
        </div>

        {/* Daygame goals by display category */}
        {daygameByCategory.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-orange-400">
                Dating & Daygame
              </span>
              <span className="text-xs text-white/25">{daygameSelected} selected</span>
            </div>

            {daygameByCategory.map(({ category, goals }) => {
              const sectionId = `dg_${category}`
              const isExpanded = expandedSections.has(sectionId)
              const selectedCount = goals.filter((g) => selectedGoals.has(g.id)).length

              return (
                <div key={category} className="mb-3 v7-card-reveal">
                  <button
                    onClick={() => toggleSection(sectionId)}
                    className="w-full flex items-center gap-3 rounded-lg px-4 py-2.5 transition-all duration-300"
                    style={{
                      background: selectedCount > 0 ? "rgba(139,92,246,0.06)" : "rgba(255,255,255,0.015)",
                      border: selectedCount > 0 ? "1px solid rgba(139,92,246,0.15)" : "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    {isExpanded
                      ? <ChevronDown className="size-3.5 text-violet-400/60 transition-transform duration-300" />
                      : <ChevronRight className="size-3.5 text-violet-400/60 transition-transform duration-300" />
                    }
                    <span className="text-sm text-white/80 flex-1 text-left">
                      {CATEGORY_LABELS[category] ?? category.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-white/25">{selectedCount}/{goals.length}</span>
                  </button>

                  {isExpanded && (
                    <div className="ml-4 mt-1.5 space-y-1">
                      {goals.map((l3) => {
                        const isOn = selectedGoals.has(l3.id)
                        const meta = getGoalMeta(l3)
                        return (
                          <div key={l3.id}>
                            <div
                              className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200"
                              style={{
                                background: isOn ? "rgba(6,182,212,0.05)" : "transparent",
                                border: isOn ? "1px solid rgba(6,182,212,0.12)" : "1px solid transparent",
                              }}
                            >
                              <button
                                onClick={() => onToggle(l3.id)}
                                className="size-4 rounded flex items-center justify-center shrink-0 transition-all duration-200"
                                style={{
                                  background: isOn ? "#06b6d4" : "rgba(255,255,255,0.08)",
                                  border: isOn ? "none" : "1px solid rgba(255,255,255,0.15)",
                                  boxShadow: isOn ? "0 0 8px rgba(6,182,212,0.3)" : "none",
                                }}
                              >
                                {isOn && <Check className="size-2.5 text-white" />}
                              </button>
                              <span className={`text-sm flex-1 min-w-0 transition-colors duration-200 ${isOn ? "text-white" : "text-white/45"}`}>
                                {l3.title}
                              </span>
                              {category === "dirty_dog" && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded text-orange-400/60 bg-orange-400/10 shrink-0">
                                  advanced
                                </span>
                              )}
                              {isOn && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {meta.hasCurve && (
                                    <button
                                      onClick={() => setExpandedCurve(expandedCurve === l3.id ? null : l3.id)}
                                      className="size-6 rounded flex items-center justify-center transition-colors hover:bg-white/10"
                                      style={{
                                        border: expandedCurve === l3.id ? "1px solid rgba(6,182,212,0.4)" : "1px solid rgba(255,255,255,0.08)",
                                        background: expandedCurve === l3.id ? "rgba(6,182,212,0.1)" : "transparent",
                                      }}
                                      title="Customize milestone curve"
                                    >
                                      <SlidersHorizontal className="size-2.5" style={{ color: expandedCurve === l3.id ? "#06b6d4" : "rgba(255,255,255,0.4)" }} />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => onUpdateTarget(l3.id, Math.max(1, meta.target - 1))}
                                    className="size-6 rounded flex items-center justify-center transition-colors hover:bg-white/10"
                                    style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                                  >
                                    <Minus className="size-2.5 text-white/40" />
                                  </button>
                                  <span className="text-xs font-semibold text-white w-6 text-center">{meta.target}</span>
                                  <button
                                    onClick={() => onUpdateTarget(l3.id, meta.target + 1)}
                                    className="size-6 rounded flex items-center justify-center transition-colors hover:bg-white/10"
                                    style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                                  >
                                    <Plus className="size-2.5 text-white/40" />
                                  </button>
                                  <span className="text-[9px] text-white/20 w-10 text-right">{meta.period}</span>
                                </div>
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
                                  className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors hover:bg-cyan-400/15"
                                  style={{
                                    background: "rgba(6,182,212,0.06)",
                                    border: "1px solid rgba(6,182,212,0.2)",
                                    color: "#06b6d4",
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
                          style={{ background: "rgba(6,182,212,0.05)", border: "1px solid rgba(6,182,212,0.12)" }}
                        >
                          <div className="size-4 rounded flex items-center justify-center shrink-0"
                            style={{ background: "#06b6d4" }}
                          >
                            <Check className="size-2.5 text-white" />
                          </div>
                          <input
                            type="text"
                            value={cg.title}
                            onChange={(e) => onUpdateCustomGoalTitle(cg.id, e.target.value)}
                            placeholder="Goal name..."
                            className="text-sm flex-1 min-w-0 bg-transparent text-white outline-none placeholder:text-white/20"
                            autoFocus={!cg.title}
                          />
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => onUpdateTarget(cg.id, Math.max(1, (targets[cg.id] ?? cg.target) - 1))}
                              className="size-6 rounded flex items-center justify-center transition-colors hover:bg-white/10"
                              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                            >
                              <Minus className="size-2.5 text-white/40" />
                            </button>
                            <span className="text-xs font-semibold text-white w-6 text-center">
                              {targets[cg.id] ?? cg.target}
                            </span>
                            <button
                              onClick={() => onUpdateTarget(cg.id, (targets[cg.id] ?? cg.target) + 1)}
                              className="size-6 rounded flex items-center justify-center transition-colors hover:bg-white/10"
                              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                            >
                              <Plus className="size-2.5 text-white/40" />
                            </button>
                            <button
                              onClick={() => onRemoveCustomGoal(cg.id)}
                              className="size-6 rounded flex items-center justify-center transition-colors hover:bg-red-500/20"
                              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                              title="Remove"
                            >
                              <X className="size-2.5 text-white/35" />
                            </button>
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={() => onAddCustomGoal(category)}
                        className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/[0.03]"
                        style={{ border: "1px dashed rgba(255,255,255,0.08)" }}
                      >
                        <Plus className="size-3.5 text-white/20" />
                        <span className="text-sm text-white/20">Add custom goal</span>
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
                <div key={cat.id} className="mb-3">
                  <div className="w-full flex items-center gap-3 rounded-lg px-4 py-2.5"
                    style={{
                      background: catGoals.length > 0 ? "rgba(139,92,246,0.06)" : "rgba(255,255,255,0.015)",
                      border: catGoals.length > 0 ? "1px solid rgba(139,92,246,0.15)" : "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <button onClick={() => toggleSection(sectionId)} className="shrink-0">
                      {isExpanded
                        ? <ChevronDown className="size-3.5 text-violet-400/60" />
                        : <ChevronRight className="size-3.5 text-violet-400/60" />
                      }
                    </button>
                    <input
                      type="text"
                      value={cat.name}
                      onChange={(e) => onRenameCustomCategory(cat.id, e.target.value)}
                      placeholder="Category name..."
                      className="text-sm text-white/80 flex-1 bg-transparent outline-none placeholder:text-white/20"
                      onClick={() => { if (!isExpanded) toggleSection(sectionId) }}
                      autoFocus={!cat.name}
                    />
                    <span className="text-[10px] text-white/25 shrink-0">{catGoals.length}</span>
                    <button
                      onClick={() => onRemoveCustomCategory(cat.id)}
                      className="size-5 rounded flex items-center justify-center transition-colors hover:bg-red-500/20 shrink-0"
                      title="Remove category"
                    >
                      <X className="size-3 text-white/25" />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="ml-4 mt-1.5 space-y-1">
                      {catGoals.map((cg) => (
                        <div key={cg.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                          style={{ background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.12)" }}
                        >
                          <div className="size-4 rounded flex items-center justify-center shrink-0"
                            style={{ background: "#8b5cf6" }}
                          >
                            <Check className="size-2.5 text-white" />
                          </div>
                          <input
                            type="text"
                            value={cg.title}
                            onChange={(e) => onUpdateCustomGoalTitle(cg.id, e.target.value)}
                            placeholder="Goal name..."
                            className="text-sm flex-1 min-w-0 bg-transparent text-white outline-none placeholder:text-white/20"
                            autoFocus={!cg.title}
                          />
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => onUpdateTarget(cg.id, Math.max(1, (targets[cg.id] ?? cg.target) - 1))}
                              className="size-6 rounded flex items-center justify-center transition-colors hover:bg-white/10"
                              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                            >
                              <Minus className="size-2.5 text-white/40" />
                            </button>
                            <span className="text-xs font-semibold text-white w-6 text-center">
                              {targets[cg.id] ?? cg.target}
                            </span>
                            <button
                              onClick={() => onUpdateTarget(cg.id, (targets[cg.id] ?? cg.target) + 1)}
                              className="size-6 rounded flex items-center justify-center transition-colors hover:bg-white/10"
                              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                            >
                              <Plus className="size-2.5 text-white/40" />
                            </button>
                            <button
                              onClick={() => onRemoveCustomGoal(cg.id)}
                              className="size-6 rounded flex items-center justify-center transition-colors hover:bg-red-500/20"
                              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                              title="Remove"
                            >
                              <X className="size-2.5 text-white/35" />
                            </button>
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={() => onAddCustomGoal(cat.id)}
                        className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/[0.03]"
                        style={{ border: "1px dashed rgba(255,255,255,0.08)" }}
                      >
                        <Plus className="size-3.5 text-white/20" />
                        <span className="text-sm text-white/20">Add custom goal</span>
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            <button
              onClick={onAddCustomCategory}
              className="w-full flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors hover:bg-white/[0.03] mb-3"
              style={{ border: "1px dashed rgba(139,92,246,0.2)" }}
            >
              <Plus className="size-3.5 text-violet-400/35" />
              <span className="text-sm text-violet-400/35">Add custom category</span>
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
              <div key={area.id} className="mb-4">
                <button
                  onClick={() => toggleSection(area.id)}
                  className="w-full flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors"
                  style={{
                    background: `${area.hex}06`,
                    border: `1px solid ${area.hex}15`,
                  }}
                >
                  {isExpanded
                    ? <ChevronDown className="size-3.5" style={{ color: `${area.hex}80` }} />
                    : <ChevronRight className="size-3.5" style={{ color: `${area.hex}80` }} />
                  }
                  <Icon className="size-3.5" style={{ color: area.hex }} />
                  <span className="text-sm text-white/80 flex-1 text-left">{area.name}</span>
                  <span className="text-[10px] text-white/25">{areaSelected}/{suggestions.length}</span>
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
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200"
                          style={{
                            background: isOn ? `${area.hex}05` : "transparent",
                            border: isOn ? `1px solid ${area.hex}12` : "1px solid transparent",
                          }}
                        >
                          <button
                            onClick={() => onToggle(id)}
                            className="size-4 rounded flex items-center justify-center shrink-0 transition-all duration-200"
                            style={{
                              background: isOn ? area.hex : "rgba(255,255,255,0.08)",
                              border: isOn ? "none" : "1px solid rgba(255,255,255,0.15)",
                              boxShadow: isOn ? `0 0 8px ${area.hex}30` : "none",
                            }}
                          >
                            {isOn && <Check className="size-2.5 text-white" />}
                          </button>
                          <span className={`text-sm flex-1 transition-colors duration-200 ${isOn ? "text-white" : "text-white/45"}`}>
                            {s.title}
                          </span>

                          {isOn && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => onUpdateTarget(id, Math.max(1, target - 1))}
                                className="size-6 rounded flex items-center justify-center transition-colors hover:bg-white/10"
                                style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                              >
                                <Minus className="size-2.5 text-white/40" />
                              </button>
                              <span className="text-xs font-semibold text-white w-6 text-center">{target}</span>
                              <button
                                onClick={() => onUpdateTarget(id, target + 1)}
                                className="size-6 rounded flex items-center justify-center transition-colors hover:bg-white/10"
                                style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                              >
                                <Plus className="size-2.5 text-white/40" />
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
                        style={{ background: `${area.hex}05`, border: `1px solid ${area.hex}12` }}
                      >
                        <div className="size-4 rounded flex items-center justify-center shrink-0"
                          style={{ background: area.hex }}
                        >
                          <Check className="size-2.5 text-white" />
                        </div>
                        <input
                          type="text"
                          value={cg.title}
                          onChange={(e) => onUpdateCustomGoalTitle(cg.id, e.target.value)}
                          placeholder="Goal name..."
                          className="text-sm flex-1 min-w-0 bg-transparent text-white outline-none placeholder:text-white/20"
                          autoFocus={!cg.title}
                        />
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => onUpdateTarget(cg.id, Math.max(1, (targets[cg.id] ?? cg.target) - 1))}
                            className="size-6 rounded flex items-center justify-center transition-colors hover:bg-white/10"
                            style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                          >
                            <Minus className="size-2.5 text-white/40" />
                          </button>
                          <span className="text-xs font-semibold text-white w-6 text-center">
                            {targets[cg.id] ?? cg.target}
                          </span>
                          <button
                            onClick={() => onUpdateTarget(cg.id, (targets[cg.id] ?? cg.target) + 1)}
                            className="size-6 rounded flex items-center justify-center transition-colors hover:bg-white/10"
                            style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                          >
                            <Plus className="size-2.5 text-white/40" />
                          </button>
                          <button
                            onClick={() => onRemoveCustomGoal(cg.id)}
                            className="size-6 rounded flex items-center justify-center transition-colors hover:bg-red-500/20"
                            style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                            title="Remove"
                          >
                            <X className="size-2.5 text-white/35" />
                          </button>
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={() => onAddCustomGoal(area.id)}
                      className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/[0.03]"
                      style={{ border: "1px dashed rgba(255,255,255,0.08)" }}
                    >
                      <Plus className="size-3.5 text-white/20" />
                      <span className="text-sm text-white/20">Add custom goal</span>
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
// Animated Number Counter
// ============================================================================

function AnimatedNumber({ value, color }: { value: number; color: string }) {
  const [displayed, setDisplayed] = useState(0)
  const ref = useRef<number | null>(null)

  useEffect(() => {
    const start = displayed
    const diff = value - start
    if (diff === 0) return
    const duration = 600
    const startTime = performance.now()

    function animate(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setDisplayed(Math.round(start + diff * eased))
      if (progress < 1) {
        ref.current = requestAnimationFrame(animate)
      }
    }
    ref.current = requestAnimationFrame(animate)
    return () => {
      if (ref.current) cancelAnimationFrame(ref.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <span
      className="text-2xl font-bold tabular-nums"
      style={{ color, animation: "v7numberPop 0.4s ease-out" }}
    >
      {displayed}
    </span>
  )
}

// ============================================================================
// Holographic Shimmer Card
// ============================================================================

function HoloCard({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  return (
    <div
      className={`relative rounded-xl overflow-hidden ${className}`}
      style={{
        background: "linear-gradient(135deg, rgba(15,20,35,0.9), rgba(10,15,28,0.95))",
        border: "1px solid rgba(255,255,255,0.06)",
        animation: `v7cardReveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s both`,
      }}
    >
      {/* Holographic shimmer overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{
          background: "linear-gradient(105deg, transparent 20%, rgba(6,182,212,0.4) 30%, rgba(139,92,246,0.4) 40%, rgba(236,72,153,0.3) 50%, rgba(245,158,11,0.3) 60%, transparent 70%)",
          backgroundSize: "200% 100%",
          animation: "v7holoShimmer 6s ease-in-out infinite",
        }}
      />
      {children}
    </div>
  )
}

// ============================================================================
// Step 3: Summary (Holographic shimmer cards + animated counters)
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
    none: "#4a4a6a",
  }

  return (
    <div className="min-h-screen pt-12 pb-36 px-6 v7-step-enter">
      <div className="mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <Zap className="size-6 mx-auto mb-2 text-amber-400 opacity-70" />
          <h2 className="text-2xl font-bold mb-2 text-white">System Ready</h2>
          <p className="text-white/35 text-sm">
            {totalGoals} goals across {totalAreas} life area{totalAreas > 1 ? "s" : ""}
            {path && ` \u00b7 ${path === "fto" ? "Find The One" : "Abundance"} path`}
          </p>
        </div>

        {/* Animated stat counters */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: "Total Goals", value: totalGoals, color: "#06b6d4" },
            { label: "Life Areas", value: totalAreas, color: "#8b5cf6" },
            { label: "Achievements", value: badges.length, color: "#f59e0b" },
          ].map((stat, i) => (
            <HoloCard key={stat.label} className="p-4 text-center" delay={i * 0.1}>
              <AnimatedNumber value={stat.value} color={stat.color} />
              <div className="text-[10px] uppercase tracking-wider text-white/30 mt-1">{stat.label}</div>
            </HoloCard>
          ))}
        </div>

        {/* Badges section */}
        {badges.length > 0 && (
          <HoloCard className="mb-6" delay={0.3}>
            <div className="px-5 py-3 flex items-center justify-between"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
            >
              <div className="flex items-center gap-2">
                <Trophy className="size-3.5 text-amber-400" />
                <span className="text-sm font-semibold uppercase tracking-wider text-amber-400/90">
                  Achievements You&apos;ll Unlock
                </span>
              </div>
              <span className="text-xs text-white/25">{badges.length} badges</span>
            </div>
            <div className="px-5 py-3 space-y-2.5">
              {badges.map((badge, i) => (
                <div key={badge.badgeId}
                  className="flex items-center gap-3"
                  style={{ animation: `v7badgeFloat ${3 + i * 0.5}s ease-in-out infinite`, animationDelay: `${i * 0.2}s` }}
                >
                  <div className="size-6 rounded-full flex items-center justify-center"
                    style={{
                      background: `${TIER_COLORS[badge.tier]}12`,
                      border: `1px solid ${TIER_COLORS[badge.tier]}25`,
                      boxShadow: badge.tier !== "none" ? `0 0 8px ${TIER_COLORS[badge.tier]}15` : "none",
                    }}
                  >
                    <Trophy className="size-3" style={{ color: TIER_COLORS[badge.tier] }} />
                  </div>
                  <span className="text-sm text-white/75 flex-1">{badge.title}</span>
                  <span className="text-[10px] uppercase font-medium" style={{ color: TIER_COLORS[badge.tier] }}>
                    {badge.tier === "none" ? "locked" : badge.tier}
                  </span>
                </div>
              ))}
            </div>
          </HoloCard>
        )}

        {/* Daygame goal groups */}
        {daygameGrouped.map(({ category, goals }, gi) => (
          <HoloCard key={category} className="mb-4" delay={0.4 + gi * 0.1}>
            <div className="px-5 py-3 flex items-center justify-between"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
            >
              <span className="text-sm font-semibold uppercase tracking-wider text-cyan-400/80">
                {CATEGORY_LABELS[category] ?? category.replace(/_/g, " ")}
              </span>
              <span className="text-xs text-white/25">{goals.length} goals</span>
            </div>
            <div className="px-5 py-3 space-y-2">
              {goals.map((g) => {
                const target = targets[g.id]
                  ?? g.defaultMilestoneConfig?.target
                  ?? g.defaultRampSteps?.[0]?.frequencyPerWeek
                  ?? "\u2014"
                return (
                  <div key={g.id} className="flex items-center gap-3">
                    <div className="size-2 rounded-full" style={{ background: "#06b6d4", boxShadow: "0 0 4px rgba(6,182,212,0.4)" }} />
                    <span className="text-sm text-white/75 flex-1">{g.title}</span>
                    <span className="text-xs font-medium text-cyan-400/80">{target}</span>
                    <span className="text-[10px] uppercase text-white/20">
                      {g.templateType === "habit_ramp" ? "/wk" : "total"}
                    </span>
                  </div>
                )
              })}
            </div>
          </HoloCard>
        ))}

        {/* Other area groups */}
        {otherAreaData.map(({ area, goals }, ai) => (
          <HoloCard key={area.id} className="mb-4" delay={0.5 + ai * 0.1}>
            <div className="px-5 py-3 flex items-center justify-between"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
            >
              <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: `${area.hex}cc` }}>
                {area.name}
              </span>
              <span className="text-xs text-white/25">{goals.length} goals</span>
            </div>
            <div className="px-5 py-3 space-y-2">
              {goals.map((g) => (
                <div key={g.id} className="flex items-center gap-3">
                  <div className="size-2 rounded-full" style={{ background: area.hex, boxShadow: `0 0 4px ${area.hex}40` }} />
                  <span className="text-sm text-white/75 flex-1">{g.title}</span>
                  <span className="text-xs font-medium" style={{ color: `${area.hex}cc` }}>
                    {targets[g.id] ?? g.defaultTarget}
                  </span>
                  <span className="text-[10px] uppercase text-white/20">/{g.period}</span>
                </div>
              ))}
            </div>
          </HoloCard>
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

          return entries.map(([catId, goals], ci) => {
            const catLabel = customCategories.find((c) => c.id === catId)?.name
              || CATEGORY_LABELS[catId as GoalDisplayCategory]
              || catId
            return (
              <HoloCard key={catId} className="mb-4" delay={0.6 + ci * 0.1}>
                <div className="px-5 py-3 flex items-center justify-between"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <span className="text-sm font-semibold uppercase tracking-wider text-violet-400/80">
                    {catLabel} <span className="text-[10px] normal-case font-normal text-white/20">(custom)</span>
                  </span>
                  <span className="text-xs text-white/25">{goals.length} goals</span>
                </div>
                <div className="px-5 py-3 space-y-2">
                  {goals.map((g) => (
                    <div key={g.id} className="flex items-center gap-3">
                      <div className="size-2 rounded-full" style={{ background: "#8b5cf6", boxShadow: "0 0 4px rgba(139,92,246,0.4)" }} />
                      <span className="text-sm text-white/75 flex-1">{g.title}</span>
                      <span className="text-xs font-medium text-violet-400/80">
                        {targets[g.id] ?? g.target}
                      </span>
                      <span className="text-[10px] uppercase text-white/20">total</span>
                    </div>
                  ))}
                </div>
              </HoloCard>
            )
          })
        })()}
      </div>
    </div>
  )
}

// ============================================================================
// Step 4: Enhanced Orrery with particle trails, pulse rings, shooting stars
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

/** Generate static trail dots for an orbit */
function generateTrailDots(
  radius: number,
  startAngle: number,
  count: number
): Array<{ angle: number; opacity: number; size: number }> {
  const dots: Array<{ angle: number; opacity: number; size: number }> = []
  for (let i = 0; i < count; i++) {
    const angleOffset = -(i * 8) // spread behind the planet
    dots.push({
      angle: startAngle + angleOffset,
      opacity: Math.max(0.05, 0.5 - i * (0.5 / count)),
      size: Math.max(0.8, 2.5 - i * (2 / count)),
    })
  }
  return dots
}

/** Generate shooting star paths */
function generateShootingStars(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    startX: 50 + Math.random() * 300,
    startY: 20 + Math.random() * 200,
    delay: Math.random() * 20 + i * 7,
    duration: 1.5 + Math.random() * 1,
    angle: 25 + Math.random() * 20,
  }))
}

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

  const shootingStarsData = useMemo(() => generateShootingStars(4), [])

  const trailsData = useMemo(() => {
    const trails: Record<string, Array<{ angle: number; opacity: number; size: number }>> = {}
    for (const area of visibleAreas) {
      const config = ORBIT_CONFIG[area.id]
      if (!config) continue
      trails[area.id] = generateTrailDots(config.radius, config.startAngle, 12)
    }
    return trails
  }, [visibleAreas])

  return (
    <div className="min-h-screen pt-8 pb-36 px-6 v7-step-enter">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2 text-white">Your System</h2>
          <p className="text-white/35 text-sm">
            {totalGoals} goals \u00b7 {activeAreas.size} life areas
            {path && ` \u00b7 ${path === "fto" ? "Find The One" : "Abundance"}`}
          </p>
        </div>

        <div className="relative w-full mx-auto" style={{ maxWidth: 740, aspectRatio: "1/1" }}>
          <style>{`
            ${visibleAreas.map((area) => {
              const config = ORBIT_CONFIG[area.id]
              if (!config) return ""
              const isHovered = hoveredPlanet === area.id
              const speed = isHovered ? config.duration * 0.3 : config.duration
              return `
                @keyframes v7orbit-${area.id} {
                  from { transform: rotate(${config.startAngle}deg); }
                  to { transform: rotate(${config.startAngle + 360}deg); }
                }
                @keyframes v7counter-orbit-${area.id} {
                  from { transform: rotate(-${config.startAngle}deg); }
                  to { transform: rotate(-${config.startAngle + 360}deg); }
                }
                .v7-orbit-${area.id} {
                  animation: v7orbit-${area.id} ${speed}s linear infinite;
                  transition: animation-duration 0.5s;
                }
                .v7-counter-orbit-${area.id} {
                  animation: v7counter-orbit-${area.id} ${speed}s linear infinite;
                  transition: animation-duration 0.5s;
                }
              `
            }).join("\n")}
          `}</style>

          <svg viewBox={`0 0 ${viewSize} ${viewSize}`} className="w-full h-full" style={{ overflow: "visible" }}>
            <defs>
              <radialGradient id="v7-sun-gradient" cx="40%" cy="40%">
                <stop offset="0%" stopColor="#fff8e0" />
                <stop offset="25%" stopColor="#ffd666" />
                <stop offset="55%" stopColor="#e8a849" />
                <stop offset="100%" stopColor="#c47f17" />
              </radialGradient>
              <radialGradient id="v7-sun-glow">
                <stop offset="0%" stopColor="#e8a849" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#e8a849" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#e8a849" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="v7-brass-ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.2" />
              </linearGradient>
              <filter id="v7-planet-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
                <feFlood floodColor="#06b6d4" floodOpacity="0.5" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="v7-active-glow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="7" result="blur" />
                <feFlood floodColor="#ffd700" floodOpacity="0.7" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Subtle background pattern */}
            <circle cx={CENTER} cy={CENTER} r={350}
              fill="none" stroke="rgba(6,182,212,0.03)" strokeWidth="0.5" strokeDasharray="2,6"
            />

            {/* Compass lines */}
            {[0, 90, 180, 270].map((angle) => (
              <line key={`compass-${angle}`}
                x1={CENTER} y1={CENTER - SUN_RADIUS - 15} x2={CENTER} y2={20}
                stroke="rgba(6,182,212,0.04)" strokeWidth="0.5"
                transform={`rotate(${angle} ${CENTER} ${CENTER})`}
              />
            ))}

            {/* Decorative rings around sun */}
            <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS + 15}
              fill="none" stroke="rgba(6,182,212,0.08)" strokeWidth="0.6" strokeDasharray="3,5"
              style={{ transformOrigin: `${CENTER}px ${CENTER}px`, animation: "v7gearSpin 120s linear infinite" }}
            />
            <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS + 25}
              fill="none" stroke="rgba(139,92,246,0.05)" strokeWidth="0.4" strokeDasharray="2,8"
              style={{ transformOrigin: `${CENTER}px ${CENTER}px`, animation: "v7gearSpinReverse 90s linear infinite" }}
            />

            {/* Orbit rings with tick marks */}
            {visibleAreas.map((area) => {
              const config = ORBIT_CONFIG[area.id]
              if (!config) return null
              const isActive = activeAreas.has(area.id)
              const isHovered = hoveredPlanet === area.id

              return (
                <g key={`orbit-${area.id}`}>
                  {/* Orbit ring */}
                  <circle cx={CENTER} cy={CENTER} r={config.radius}
                    fill="none" stroke="url(#v7-brass-ring)"
                    strokeWidth={isHovered ? 1.8 : isActive ? 1 : 0.6}
                    opacity={isActive ? 0.6 : 0.12}
                    className="transition-all duration-500"
                  />
                  {/* Tick marks */}
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
                        stroke={isActive ? "rgba(6,182,212,0.15)" : "rgba(255,255,255,0.04)"}
                        strokeWidth={isMajor ? 0.8 : 0.3}
                        strokeOpacity={isActive ? (isMajor ? 0.3 : 0.15) : (isMajor ? 0.06 : 0.03)}
                      />
                    )
                  })}
                </g>
              )
            })}

            {/* Pulse rings expanding from sun */}
            {[0, 1, 2].map((i) => (
              <circle
                key={`pulse-${i}`}
                cx={CENTER} cy={CENTER}
                r={38}
                fill="none"
                stroke="rgba(232,168,73,0.3)"
                style={{
                  animation: `v7pulseRing 4s ease-out infinite`,
                  animationDelay: `${i * 1.33}s`,
                  transformOrigin: `${CENTER}px ${CENTER}px`,
                }}
              />
            ))}

            {/* Shooting stars */}
            {shootingStarsData.map((star) => (
              <g key={`shoot-${star.id}`}
                style={{
                  animation: `v7shootingStar ${star.duration}s linear infinite`,
                  animationDelay: `${star.delay}s`,
                  transformOrigin: `${star.startX}px ${star.startY}px`,
                }}
              >
                <line
                  x1={star.startX} y1={star.startY}
                  x2={star.startX - 15} y2={star.startY - 10}
                  stroke="white" strokeWidth="0.8"
                  strokeLinecap="round"
                  opacity="0.6"
                />
                <circle cx={star.startX} cy={star.startY} r="1.2" fill="white" opacity="0.8" />
              </g>
            ))}

            {/* Sun glow */}
            <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS * 2.5} fill="url(#v7-sun-glow)" />

            {/* Sun body */}
            <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS} fill="url(#v7-sun-gradient)"
              style={{ animation: "v7sunPulse 4s ease-in-out infinite" }}
            />
            <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS * 0.6} fill="none" stroke="#fff8dc" strokeWidth="0.5" strokeOpacity="0.25" />
            <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS * 0.3} fill="none" stroke="#fff8dc" strokeWidth="0.3" strokeOpacity="0.15" />
            <text x={CENTER} y={CENTER + 2} textAnchor="middle" dominantBaseline="middle"
              fill="#0a0a1a" fontSize="9" fontWeight="700" letterSpacing="0.5"
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              YOUR VISION
            </text>

            {/* Planets with particle trails */}
            {visibleAreas.map((area) => {
              const config = ORBIT_CONFIG[area.id]
              if (!config) return null
              const isActive = activeAreas.has(area.id)
              const isHovered = hoveredPlanet === area.id
              const count = goalCounts[area.id] ?? 0
              const trails = trailsData[area.id] ?? []

              return (
                <g key={`planet-${area.id}`}>
                  {/* Particle trail dots - orbit with the planet */}
                  <g
                    style={{
                      transformOrigin: `${CENTER}px ${CENTER}px`,
                      animation: `v7orbit-${area.id} ${isHovered ? config.duration * 0.3 : config.duration}s linear infinite`,
                    }}
                  >
                    {isActive && trails.map((dot, di) => {
                      const rad = (dot.angle * Math.PI) / 180
                      return (
                        <circle
                          key={`trail-${area.id}-${di}`}
                          cx={CENTER + Math.cos(rad) * config.radius}
                          cy={CENTER + Math.sin(rad) * config.radius}
                          r={dot.size}
                          fill={area.hex}
                          opacity={dot.opacity}
                        />
                      )
                    })}
                  </g>

                  {/* Planet group */}
                  <g
                    className={`v7-orbit-${area.id}`}
                    style={{
                      transformOrigin: `${CENTER}px ${CENTER}px`,
                    }}
                  >
                    <g
                      className={`v7-counter-orbit-${area.id}`}
                      style={{
                        transformOrigin: `${CENTER}px ${CENTER - config.radius}px`,
                      }}
                    >
                      {/* Hit area */}
                      <circle cx={CENTER} cy={CENTER - config.radius} r={config.planetSize + 8}
                        fill="transparent" className="cursor-pointer"
                        onMouseEnter={() => setHoveredPlanet(area.id)}
                        onMouseLeave={() => setHoveredPlanet(null)}
                      />
                      {/* Outer ring */}
                      <circle cx={CENTER} cy={CENTER - config.radius} r={config.planetSize + 3}
                        fill="none" stroke={area.hex}
                        strokeWidth={isActive ? 1.2 : 0.6}
                        strokeOpacity={isActive ? (isHovered ? 0.7 : 0.35) : 0.1}
                        strokeDasharray={isActive ? "none" : "2,3"}
                        className="transition-all duration-500"
                      />
                      {/* Planet body */}
                      <circle cx={CENTER} cy={CENTER - config.radius} r={config.planetSize}
                        fill={area.hex}
                        fillOpacity={isActive ? 0.9 : 0.2}
                        filter={isActive ? (isHovered ? "url(#v7-active-glow)" : "url(#v7-planet-glow)") : undefined}
                        className="transition-all duration-500"
                      />
                      {/* Highlight */}
                      <circle
                        cx={CENTER - config.planetSize * 0.25}
                        cy={CENTER - config.radius - config.planetSize * 0.25}
                        r={config.planetSize * 0.35} fill="white" fillOpacity={isActive ? 0.15 : 0.05}
                      />
                      {/* Label */}
                      <text x={CENTER} y={CENTER - config.radius + config.planetSize + 14}
                        textAnchor="middle"
                        fill={isActive ? (isHovered ? "#ffd700" : "rgba(255,255,255,0.8)") : "rgba(255,255,255,0.2)"}
                        fontSize={area.id === "daygame" ? "9" : "7.5"}
                        fontWeight={area.id === "daygame" ? "700" : "500"}
                        letterSpacing="0.3" className="transition-colors duration-300"
                        style={{ fontFamily: "system-ui, sans-serif" }}
                      >
                        {area.name}
                      </text>
                      {/* Goal count badge */}
                      {isActive && count > 0 && (
                        <g>
                          <circle cx={CENTER + config.planetSize - 2} cy={CENTER - config.radius - config.planetSize + 2}
                            r={7} fill="#0a0e1f" stroke={area.hex} strokeWidth="0.8"
                          />
                          <text x={CENTER + config.planetSize - 2} y={CENTER - config.radius - config.planetSize + 2.5}
                            textAnchor="middle" dominantBaseline="middle" fill={area.hex}
                            fontSize="6" fontWeight="700" style={{ fontFamily: "system-ui, sans-serif" }}
                          >
                            {count}
                          </text>
                        </g>
                      )}
                    </g>
                  </g>
                </g>
              )
            })}

            {/* Outer tick marks */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
              const rad = (angle * Math.PI) / 180
              const isMajor = angle % 90 === 0
              return (
                <line key={`outer-${angle}`}
                  x1={CENTER + Math.cos(rad) * 340} y1={CENTER + Math.sin(rad) * 340}
                  x2={CENTER + Math.cos(rad) * 350} y2={CENTER + Math.sin(rad) * 350}
                  stroke="rgba(6,182,212,0.2)" strokeWidth={isMajor ? 1.5 : 0.8}
                  strokeOpacity={isMajor ? 0.3 : 0.15}
                />
              )
            })}
          </svg>
        </div>

        {/* Badges grid */}
        {badges.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-4 justify-center">
              <Trophy className="size-4 text-amber-400" />
              <span className="text-sm font-semibold uppercase tracking-wider text-amber-400/80">
                Achievements to Earn
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {badges.map((badge, i) => {
                const tierColor = badge.tier === "diamond" ? "#b9f2ff"
                  : badge.tier === "gold" ? "#ffd700"
                  : badge.tier === "silver" ? "#c0c0c0"
                  : badge.tier === "bronze" ? "#cd7f32"
                  : "#4a4a6a"

                return (
                  <HoloCard key={badge.badgeId} className="p-3 text-center" delay={i * 0.08}>
                    <div style={{ animation: `v7badgeFloat ${3 + i * 0.3}s ease-in-out infinite` }}>
                      <Trophy className="size-5 mx-auto mb-1.5" style={{ color: tierColor }} />
                      <div className="text-xs text-white/65 leading-tight">{badge.title}</div>
                      <div className="text-[10px] uppercase font-medium mt-1" style={{ color: tierColor }}>
                        {badge.tier === "none" ? "Locked" : badge.tier}
                      </div>
                    </div>
                  </HoloCard>
                )
              })}
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            className="relative px-8 py-3 rounded-xl font-semibold text-sm transition-all overflow-hidden group"
            style={{
              background: "linear-gradient(135deg, #e8a849, #f59e0b)",
              color: "#0a0e1f",
              boxShadow: "0 0 30px rgba(232,168,73,0.3)",
            }}
          >
            <span className="relative z-10">Create Goals</span>
            {/* Shimmer sweep on hover */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%)",
                backgroundSize: "200% 100%",
                animation: "v7holoShimmer 2s ease-in-out infinite",
              }}
            />
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

export default function VariantB() {
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
        return { label: "Choose Goals \u2192", disabled: !path, status: path ? `${path === "fto" ? "Find The One" : "Abundance"} selected` : "Select a path to continue" }
      case "goals":
        return { label: "View Summary \u2192", disabled: selectedGoals.size === 0, status: `${selectedGoals.size} goals selected` }
      case "summary":
        return { label: "View Your System \u2192", disabled: false, status: `${totalGoals} goals ready` }
      case "orrery":
        return { label: "Create Goals", disabled: false, status: `${totalGoals} goals \u00b7 ${1 + selectedAreas.size} areas` }
    }
  }, [step, path, selectedGoals.size, totalGoals, selectedAreas.size])

  return (
    <div className="relative">
      <GlobalStyles currentStep={step} />
      <NorthernLightsBackground />

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
