"use client"

/**
 * V7 Variant A: "Cosmic Particles" — Flat + Badges (Streamlined)
 *
 * Theme: Particle field background with constellation connections,
 *        glassmorphism cards, enhanced orrery with comet trails
 * Hierarchy: Flat (L1->L3) with L2s as badge achievements
 * Flow: 4-step linear wizard with animated step transitions
 *
 * Step 1 (Direction): Life area + FTO/Abundance selection
 * Step 2 (Goals): Select/deselect L3 goals with inline target controls
 * Step 3 (Summary): Glassmorphism cards with particle field visible through
 * Step 4 (Your System): Enhanced orrery with comet trails + corona sun
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

// ============================================================================
// Particle Field Background (Canvas-based)
// ============================================================================

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  hue: number
}

function ParticleFieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animFrameRef = useRef<number>(0)
  const mouseRef = useRef({ x: -1000, y: -1000 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener("resize", resize)

    // Initialize particles
    const PARTICLE_COUNT = 80
    const particles: Particle[] = []
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.5 + 0.1,
        hue: Math.random() > 0.5 ? 190 + Math.random() * 30 : 270 + Math.random() * 30,
      })
    }
    particlesRef.current = particles

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener("mousemove", handleMouseMove)

    const CONNECTION_DIST = 120
    const MOUSE_DIST = 180

    function animate() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      // Update & draw particles
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy

        // Wrap around
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        // Slight repulsion from mouse
        const dmx = p.x - mx
        const dmy = p.y - my
        const distMouse = Math.sqrt(dmx * dmx + dmy * dmy)
        if (distMouse < MOUSE_DIST && distMouse > 0) {
          const force = (MOUSE_DIST - distMouse) / MOUSE_DIST * 0.02
          p.vx += (dmx / distMouse) * force
          p.vy += (dmy / distMouse) * force
        }

        // Damping
        p.vx *= 0.999
        p.vy *= 0.999

        // Draw particle
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.opacity})`
        ctx.fill()
      }

      // Draw connections (constellation lines)
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < CONNECTION_DIST) {
            const alpha = (1 - dist / CONNECTION_DIST) * 0.12
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(140, 160, 255, ${alpha})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", resize)
      window.removeEventListener("mousemove", handleMouseMove)
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Deep space gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050510] via-[#0a0a24] to-[#0d0d1a]" />
      {/* Nebula clouds */}
      <div className="absolute inset-0 opacity-20">
        <div className="v7-nebula v7-nebula-1" />
        <div className="v7-nebula v7-nebula-2" />
        <div className="v7-nebula v7-nebula-3" />
      </div>
      {/* Canvas particle layer */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: "none" }}
      />
      {/* Static stars layer */}
      <div className="absolute inset-0" style={{ pointerEvents: "none" }}>
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 1.5 + 0.5,
              height: Math.random() * 1.5 + 0.5,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.4 + 0.1,
              animation: `v7twinkle ${Math.random() * 4 + 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes v7twinkle {
          0%, 100% { opacity: 0.1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.3); }
        }
        .v7-nebula {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
        }
        .v7-nebula-1 {
          width: 600px; height: 400px;
          top: 5%; left: 10%;
          background: radial-gradient(ellipse, rgba(80, 60, 200, 0.15) 0%, transparent 70%);
          animation: v7nebulaFloat1 25s ease-in-out infinite;
        }
        .v7-nebula-2 {
          width: 500px; height: 350px;
          top: 40%; right: 5%;
          background: radial-gradient(ellipse, rgba(20, 180, 200, 0.1) 0%, transparent 70%);
          animation: v7nebulaFloat2 30s ease-in-out infinite;
        }
        .v7-nebula-3 {
          width: 400px; height: 300px;
          bottom: 10%; left: 30%;
          background: radial-gradient(ellipse, rgba(200, 60, 150, 0.08) 0%, transparent 70%);
          animation: v7nebulaFloat3 20s ease-in-out infinite;
        }
        @keyframes v7nebulaFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-20px, 15px) scale(0.95); }
        }
        @keyframes v7nebulaFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-25px, 20px) scale(1.08); }
        }
        @keyframes v7nebulaFloat3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, -15px) scale(1.03); }
        }
      `}</style>
    </div>
  )
}

// ============================================================================
// Animated Step Wrapper (slide + fade transitions)
// ============================================================================

function AnimatedStep({ children, stepKey }: { children: React.ReactNode; stepKey: string }) {
  const [visible, setVisible] = useState(false)
  const prevKey = useRef(stepKey)

  useEffect(() => {
    if (stepKey !== prevKey.current) {
      setVisible(false)
      const timer = setTimeout(() => {
        prevKey.current = stepKey
        setVisible(true)
      }, 50)
      return () => clearTimeout(timer)
    } else {
      const timer = setTimeout(() => setVisible(true), 50)
      return () => clearTimeout(timer)
    }
  }, [stepKey])

  return (
    <div
      className="transition-all duration-500 ease-out"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
      }}
    >
      {children}
    </div>
  )
}

// ============================================================================
// Glassmorphism Card Component
// ============================================================================

function GlassCard({
  children,
  className = "",
  glowColor,
  style,
}: {
  children: React.ReactNode
  className?: string
  glowColor?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      className={`rounded-2xl overflow-hidden ${className}`}
      style={{
        background: "rgba(15, 15, 35, 0.55)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: glowColor
          ? `1px solid ${glowColor}30`
          : "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: glowColor
          ? `0 0 20px ${glowColor}10, inset 0 1px 0 rgba(255,255,255,0.05)`
          : "0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ============================================================================
// Sticky Bottom Bar (Cosmic variant with pulsing progress)
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
    <div
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{
        background: "rgba(8, 8, 20, 0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(100, 120, 255, 0.12)",
      }}
    >
      <div className="mx-auto max-w-3xl flex items-center justify-between px-6 pt-3 pb-2">
        <span className="text-xs text-blue-300/50">{statusText}</span>
        <button
          onClick={onCta}
          disabled={ctaDisabled}
          className="px-5 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-30"
          style={{
            background: ctaDisabled
              ? "rgba(30, 30, 60, 0.5)"
              : "linear-gradient(135deg, #06b6d4, #8b5cf6)",
            color: ctaDisabled ? "rgba(100,120,255,0.4)" : "white",
            boxShadow: ctaDisabled ? "none" : "0 0 16px rgba(139,92,246,0.3)",
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
          return (
            <div key={label} className="flex items-center gap-1">
              {i > 0 && (
                <div className="relative w-6 sm:w-10 h-px">
                  <div
                    className="absolute inset-0"
                    style={{ background: isDone ? "rgba(6,182,212,0.6)" : "rgba(100,120,255,0.12)" }}
                  />
                  {isDone && (
                    <div
                      className="absolute inset-0"
                      style={{
                        background: "linear-gradient(90deg, transparent, rgba(6,182,212,0.8), transparent)",
                        animation: "v7lineShimmer 2s ease-in-out infinite",
                      }}
                    />
                  )}
                </div>
              )}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={() => isClickable && onStepClick(i)}
                  disabled={!isClickable}
                  className="flex items-center justify-center rounded-full text-xs font-bold transition-all"
                  style={{
                    width: isActive ? 30 : 24,
                    height: isActive ? 30 : 24,
                    background: isDone
                      ? "linear-gradient(135deg, #06b6d4, #8b5cf6)"
                      : isActive
                        ? "rgba(139,92,246,0.3)"
                        : "rgba(30, 30, 60, 0.5)",
                    color: isDone || isActive ? "white" : "rgba(100,120,255,0.4)",
                    border: isActive
                      ? "2px solid rgba(139,92,246,0.6)"
                      : isDone
                        ? "none"
                        : "1px solid rgba(100,120,255,0.15)",
                    boxShadow: isActive
                      ? "0 0 16px rgba(139,92,246,0.3)"
                      : isDone
                        ? "0 0 8px rgba(6,182,212,0.2)"
                        : "none",
                    animation: isActive ? "v7stepPulse 2s ease-in-out infinite" : "none",
                    cursor: isClickable ? "pointer" : "default",
                  }}
                >
                  {isDone ? <Check className="size-3" /> : i + 1}
                </button>
                <span
                  className="text-[9px] hidden sm:block"
                  style={{ color: isActive ? "#a78bfa" : isDone ? "#06b6d4" : "rgba(100,120,255,0.3)" }}
                >
                  {label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <style>{`
        @keyframes v7stepPulse {
          0%, 100% { box-shadow: 0 0 12px rgba(139,92,246,0.3); }
          50% { box-shadow: 0 0 24px rgba(139,92,246,0.5), 0 0 40px rgba(139,92,246,0.15); }
        }
        @keyframes v7lineShimmer {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
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
        <div className="text-center mb-10">
          <div className="relative inline-block mb-3">
            <Sparkles className="size-8 text-cyan-400 opacity-60" />
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(6,182,212,0.2) 0%, transparent 70%)",
                animation: "v7iconGlow 3s ease-in-out infinite",
              }}
            />
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
              <div
                className="size-7 rounded-lg flex items-center justify-center"
                style={{ background: `${daygame.hex}20` }}
              >
                <DgIcon className="size-4" style={{ color: daygame.hex }} />
              </div>
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: daygame.hex }}
              >
                {daygame.name}
              </span>
            </div>
          )
        })()}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {/* FTO Card */}
          <button
            onClick={() => onSelectPath("fto")}
            className="rounded-2xl p-5 text-left transition-all duration-300"
            style={{
              background: selectedPath === "fto"
                ? "rgba(139,92,246,0.12)"
                : "rgba(139,92,246,0.04)",
              backdropFilter: "blur(8px)",
              border: selectedPath === "fto"
                ? "1px solid rgba(139,92,246,0.4)"
                : "1px solid rgba(139,92,246,0.1)",
              boxShadow: selectedPath === "fto"
                ? "0 0 30px rgba(139,92,246,0.1), inset 0 1px 0 rgba(255,255,255,0.05)"
                : "none",
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="size-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(139,92,246,0.2)" }}
              >
                <Star className="size-5 text-violet-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">Find The One</h3>
                <p className="text-xs text-white/40">Connection & commitment</p>
              </div>
              {selectedPath === "fto" && (
                <div style={{ animation: "v7checkPop 0.3s ease-out" }}>
                  <Check className="size-5 text-violet-400" />
                </div>
              )}
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
            className="rounded-2xl p-5 text-left transition-all duration-300"
            style={{
              background: selectedPath === "abundance"
                ? "rgba(249,115,22,0.12)"
                : "rgba(249,115,22,0.04)",
              backdropFilter: "blur(8px)",
              border: selectedPath === "abundance"
                ? "1px solid rgba(249,115,22,0.4)"
                : "1px solid rgba(249,115,22,0.1)",
              boxShadow: selectedPath === "abundance"
                ? "0 0 30px rgba(249,115,22,0.1), inset 0 1px 0 rgba(255,255,255,0.05)"
                : "none",
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="size-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(249,115,22,0.2)" }}
              >
                <Sparkles className="size-5 text-orange-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">Abundance</h3>
                <p className="text-xs text-white/40">Freedom & experience</p>
              </div>
              {selectedPath === "abundance" && (
                <div style={{ animation: "v7checkPop 0.3s ease-out" }}>
                  <Check className="size-5 text-orange-400" />
                </div>
              )}
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
          <div className="flex-1 h-px" style={{ background: "rgba(100,120,255,0.08)" }} />
          <span className="text-xs uppercase tracking-wider text-blue-300/25">Other Life Areas</span>
          <div className="flex-1 h-px" style={{ background: "rgba(100,120,255,0.08)" }} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {otherAreas.map((area) => {
            const Icon = area.icon
            const isSelected = selectedAreas.has(area.id)
            return (
              <button
                key={area.id}
                onClick={() => onToggleArea(area.id)}
                className="flex flex-col items-center gap-2.5 rounded-xl p-4 transition-all duration-300"
                style={{
                  background: isSelected ? `${area.hex}10` : "rgba(255,255,255,0.02)",
                  backdropFilter: "blur(8px)",
                  border: isSelected
                    ? `1px solid ${area.hex}40`
                    : "1px solid rgba(255,255,255,0.05)",
                  boxShadow: isSelected ? `0 0 20px ${area.hex}10` : "none",
                }}
              >
                <div
                  className="size-10 rounded-xl flex items-center justify-center transition-all duration-300"
                  style={{
                    background: isSelected ? `${area.hex}20` : "rgba(255,255,255,0.05)",
                    boxShadow: isSelected ? `0 0 12px ${area.hex}20` : "none",
                  }}
                >
                  <Icon
                    className="size-5"
                    style={{ color: isSelected ? area.hex : "rgba(255,255,255,0.4)" }}
                  />
                </div>
                <span
                  className={`text-xs font-medium text-center leading-tight ${isSelected ? "text-white" : "text-white/40"}`}
                >
                  {area.name}
                </span>
              </button>
            )
          })}
        </div>
      </div>
      <style>{`
        @keyframes v7iconGlow {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.5); opacity: 1; }
        }
        @keyframes v7checkPop {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
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

  // Auto-expand first daygame category on mount
  useEffect(() => {
    if (daygameArea && daygameArea.l3Goals.length > 0) {
      const firstCat = daygameArea.l3Goals[0]?.displayCategory ?? "field_work"
      setExpandedSections((prev) => {
        if (prev.size === 0) return new Set([`dg_${firstCat}`])
        return prev
      })
    }
  }, [daygameArea])

  // Auto-expand newly created custom categories
  useEffect(() => {
    if (customCategories.length > prevCustomCatCount.current) {
      const newest = customCategories[customCategories.length - 1]
      setExpandedSections((prev) => new Set([...prev, `custom_${newest.id}`]))
    }
    prevCustomCatCount.current = customCategories.length
  }, [customCategories])

  // Group daygame L3s by display category
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
    const defaultTarget =
      g.defaultMilestoneConfig?.target ?? g.defaultRampSteps?.[0]?.frequencyPerWeek ?? 5
    return {
      type: (g.templateType === "habit_ramp" ? "habit" : "milestone") as "habit" | "milestone",
      target: targets[g.id] ?? defaultTarget,
      period: g.templateType === "habit_ramp" ? "per week" : "total",
      hasCurve:
        g.templateType === "milestone_ladder" && g.defaultMilestoneConfig != null,
      defaultCurve: g.defaultMilestoneConfig,
    }
  }

  return (
    <div className="min-h-screen pt-12 pb-36 px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-1">Choose Your Goals</h2>
          <p className="text-white/40 text-sm">
            Toggle goals on or off and adjust targets. These are starting points — you can change
            them later.
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
                    className="w-full flex items-center gap-3 rounded-lg px-4 py-2.5 transition-all duration-200"
                    style={{
                      background:
                        selectedCount > 0
                          ? "rgba(6,182,212,0.06)"
                          : "rgba(255,255,255,0.02)",
                      backdropFilter: "blur(8px)",
                      border:
                        selectedCount > 0
                          ? "1px solid rgba(6,182,212,0.15)"
                          : "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    {isExpanded ? (
                      <ChevronDown className="size-3.5 text-cyan-400/60" />
                    ) : (
                      <ChevronRight className="size-3.5 text-cyan-400/60" />
                    )}
                    <span className="text-sm text-white/80 flex-1 text-left">
                      {CATEGORY_LABELS[category] ?? category.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-white/30">
                      {selectedCount}/{goals.length}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="ml-4 mt-1.5 space-y-1" style={{ animation: "v7slideDown 0.25s ease-out" }}>
                      {goals.map((l3) => {
                        const isOn = selectedGoals.has(l3.id)
                        const meta = getGoalMeta(l3)
                        return (
                          <div key={l3.id}>
                            <div
                              className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200"
                              style={{
                                background: isOn ? "rgba(6,182,212,0.06)" : "transparent",
                                border: isOn
                                  ? "1px solid rgba(6,182,212,0.15)"
                                  : "1px solid transparent",
                              }}
                            >
                              <button
                                onClick={() => onToggle(l3.id)}
                                className="size-4 rounded flex items-center justify-center shrink-0 transition-all duration-200"
                                style={{
                                  background: isOn ? "#06b6d4" : "rgba(255,255,255,0.1)",
                                  border: isOn ? "none" : "1px solid rgba(255,255,255,0.2)",
                                  boxShadow: isOn ? "0 0 8px rgba(6,182,212,0.3)" : "none",
                                }}
                              >
                                {isOn && <Check className="size-2.5 text-white" />}
                              </button>
                              <span
                                className={`text-sm flex-1 min-w-0 ${isOn ? "text-white" : "text-white/50"}`}
                              >
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
                                      onClick={() =>
                                        setExpandedCurve(
                                          expandedCurve === l3.id ? null : l3.id
                                        )
                                      }
                                      className="size-6 rounded flex items-center justify-center transition-colors hover:bg-white/10"
                                      style={{
                                        border:
                                          expandedCurve === l3.id
                                            ? "1px solid rgba(6,182,212,0.4)"
                                            : "1px solid rgba(255,255,255,0.1)",
                                        background:
                                          expandedCurve === l3.id
                                            ? "rgba(6,182,212,0.1)"
                                            : "transparent",
                                      }}
                                      title="Customize milestone curve"
                                    >
                                      <SlidersHorizontal
                                        className="size-2.5"
                                        style={{
                                          color:
                                            expandedCurve === l3.id
                                              ? "#06b6d4"
                                              : "rgba(255,255,255,0.5)",
                                        }}
                                      />
                                    </button>
                                  )}
                                  <button
                                    onClick={() =>
                                      onUpdateTarget(l3.id, Math.max(1, meta.target - 1))
                                    }
                                    className="size-6 rounded flex items-center justify-center transition-colors hover:bg-white/10"
                                    style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                                  >
                                    <Minus className="size-2.5 text-white/50" />
                                  </button>
                                  <span className="text-xs font-semibold text-white w-6 text-center">
                                    {meta.target}
                                  </span>
                                  <button
                                    onClick={() => onUpdateTarget(l3.id, meta.target + 1)}
                                    className="size-6 rounded flex items-center justify-center transition-colors hover:bg-white/10"
                                    style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                                  >
                                    <Plus className="size-2.5 text-white/50" />
                                  </button>
                                  <span className="text-[9px] text-white/25 w-10 text-right">
                                    {meta.period}
                                  </span>
                                </div>
                              )}
                            </div>
                            {isOn &&
                              meta.hasCurve &&
                              expandedCurve === l3.id &&
                              meta.defaultCurve && (
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
                                      background: "rgba(6,182,212,0.08)",
                                      border: "1px solid rgba(6,182,212,0.25)",
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
                        <div
                          key={cg.id}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                          style={{
                            background: "rgba(6,182,212,0.06)",
                            border: "1px solid rgba(6,182,212,0.15)",
                          }}
                        >
                          <div
                            className="size-4 rounded flex items-center justify-center shrink-0"
                            style={{ background: "#06b6d4" }}
                          >
                            <Check className="size-2.5 text-white" />
                          </div>
                          <input
                            type="text"
                            value={cg.title}
                            onChange={(e) => onUpdateCustomGoalTitle(cg.id, e.target.value)}
                            placeholder="Goal name..."
                            className="text-sm flex-1 min-w-0 bg-transparent text-white outline-none placeholder:text-white/25"
                            autoFocus={!cg.title}
                          />
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() =>
                                onUpdateTarget(
                                  cg.id,
                                  Math.max(1, (targets[cg.id] ?? cg.target) - 1)
                                )
                              }
                              className="size-6 rounded flex items-center justify-center transition-colors hover:bg-white/10"
                              style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                            >
                              <Minus className="size-2.5 text-white/50" />
                            </button>
                            <span className="text-xs font-semibold text-white w-6 text-center">
                              {targets[cg.id] ?? cg.target}
                            </span>
                            <button
                              onClick={() =>
                                onUpdateTarget(cg.id, (targets[cg.id] ?? cg.target) + 1)
                              }
                              className="size-6 rounded flex items-center justify-center transition-colors hover:bg-white/10"
                              style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                            >
                              <Plus className="size-2.5 text-white/50" />
                            </button>
                            <button
                              onClick={() => onRemoveCustomGoal(cg.id)}
                              className="size-6 rounded flex items-center justify-center transition-colors hover:bg-red-500/20"
                              style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                              title="Remove"
                            >
                              <X className="size-2.5 text-white/40" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Add custom goal button */}
                      <button
                        onClick={() => onAddCustomGoal(category)}
                        className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/5"
                        style={{ border: "1px dashed rgba(255,255,255,0.08)" }}
                      >
                        <Plus className="size-3.5 text-white/25" />
                        <span className="text-sm text-white/25">Add custom goal</span>
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
                  <div
                    className="w-full flex items-center gap-3 rounded-lg px-4 py-2.5"
                    style={{
                      background:
                        catGoals.length > 0
                          ? "rgba(139,92,246,0.06)"
                          : "rgba(255,255,255,0.02)",
                      backdropFilter: "blur(8px)",
                      border:
                        catGoals.length > 0
                          ? "1px solid rgba(139,92,246,0.15)"
                          : "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <button onClick={() => toggleSection(sectionId)} className="shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="size-3.5 text-violet-400/60" />
                      ) : (
                        <ChevronRight className="size-3.5 text-violet-400/60" />
                      )}
                    </button>
                    <input
                      type="text"
                      value={cat.name}
                      onChange={(e) => onRenameCustomCategory(cat.id, e.target.value)}
                      placeholder="Category name..."
                      className="text-sm text-white/80 flex-1 bg-transparent outline-none placeholder:text-white/25"
                      onClick={() => {
                        if (!isExpanded) toggleSection(sectionId)
                      }}
                      autoFocus={!cat.name}
                    />
                    <span className="text-[10px] text-white/30 shrink-0">{catGoals.length}</span>
                    <button
                      onClick={() => onRemoveCustomCategory(cat.id)}
                      className="size-5 rounded flex items-center justify-center transition-colors hover:bg-red-500/20 shrink-0"
                      title="Remove category"
                    >
                      <X className="size-3 text-white/30" />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="ml-4 mt-1.5 space-y-1" style={{ animation: "v7slideDown 0.25s ease-out" }}>
                      {catGoals.map((cg) => (
                        <div
                          key={cg.id}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                          style={{
                            background: "rgba(139,92,246,0.06)",
                            border: "1px solid rgba(139,92,246,0.15)",
                          }}
                        >
                          <div
                            className="size-4 rounded flex items-center justify-center shrink-0"
                            style={{ background: "#8b5cf6" }}
                          >
                            <Check className="size-2.5 text-white" />
                          </div>
                          <input
                            type="text"
                            value={cg.title}
                            onChange={(e) => onUpdateCustomGoalTitle(cg.id, e.target.value)}
                            placeholder="Goal name..."
                            className="text-sm flex-1 min-w-0 bg-transparent text-white outline-none placeholder:text-white/25"
                            autoFocus={!cg.title}
                          />
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() =>
                                onUpdateTarget(
                                  cg.id,
                                  Math.max(1, (targets[cg.id] ?? cg.target) - 1)
                                )
                              }
                              className="size-6 rounded flex items-center justify-center transition-colors hover:bg-white/10"
                              style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                            >
                              <Minus className="size-2.5 text-white/50" />
                            </button>
                            <span className="text-xs font-semibold text-white w-6 text-center">
                              {targets[cg.id] ?? cg.target}
                            </span>
                            <button
                              onClick={() =>
                                onUpdateTarget(cg.id, (targets[cg.id] ?? cg.target) + 1)
                              }
                              className="size-6 rounded flex items-center justify-center transition-colors hover:bg-white/10"
                              style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                            >
                              <Plus className="size-2.5 text-white/50" />
                            </button>
                            <button
                              onClick={() => onRemoveCustomGoal(cg.id)}
                              className="size-6 rounded flex items-center justify-center transition-colors hover:bg-red-500/20"
                              style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                              title="Remove"
                            >
                              <X className="size-2.5 text-white/40" />
                            </button>
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={() => onAddCustomGoal(cat.id)}
                        className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/5"
                        style={{ border: "1px dashed rgba(255,255,255,0.08)" }}
                      >
                        <Plus className="size-3.5 text-white/25" />
                        <span className="text-sm text-white/25">Add custom goal</span>
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Add custom category button */}
            <button
              onClick={onAddCustomCategory}
              className="w-full flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors hover:bg-white/5 mb-3"
              style={{ border: "1px dashed rgba(139,92,246,0.2)" }}
            >
              <Plus className="size-3.5 text-violet-400/40" />
              <span className="text-sm text-violet-400/40">Add custom category</span>
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
                  className="w-full flex items-center gap-3 rounded-lg px-4 py-2.5 transition-all duration-200"
                  style={{
                    background: `${area.hex}06`,
                    backdropFilter: "blur(8px)",
                    border: `1px solid ${area.hex}15`,
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown className="size-3.5" style={{ color: `${area.hex}80` }} />
                  ) : (
                    <ChevronRight className="size-3.5" style={{ color: `${area.hex}80` }} />
                  )}
                  <Icon className="size-3.5" style={{ color: area.hex }} />
                  <span className="text-sm text-white/80 flex-1 text-left">{area.name}</span>
                  <span className="text-[10px] text-white/30">
                    {areaSelected}/{suggestions.length}
                  </span>
                </button>

                {isExpanded && (
                  <div className="ml-4 mt-1.5 space-y-1" style={{ animation: "v7slideDown 0.25s ease-out" }}>
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
                            border: isOn
                              ? `1px solid ${area.hex}15`
                              : "1px solid transparent",
                          }}
                        >
                          <button
                            onClick={() => onToggle(id)}
                            className="size-4 rounded flex items-center justify-center shrink-0 transition-all duration-200"
                            style={{
                              background: isOn ? area.hex : "rgba(255,255,255,0.1)",
                              border: isOn ? "none" : "1px solid rgba(255,255,255,0.2)",
                              boxShadow: isOn ? `0 0 8px ${area.hex}30` : "none",
                            }}
                          >
                            {isOn && <Check className="size-2.5 text-white" />}
                          </button>
                          <span
                            className={`text-sm flex-1 ${isOn ? "text-white" : "text-white/50"}`}
                          >
                            {s.title}
                          </span>

                          {isOn && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => onUpdateTarget(id, Math.max(1, target - 1))}
                                className="size-6 rounded flex items-center justify-center transition-colors hover:bg-white/10"
                                style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                              >
                                <Minus className="size-2.5 text-white/50" />
                              </button>
                              <span className="text-xs font-semibold text-white w-6 text-center">
                                {target}
                              </span>
                              <button
                                onClick={() => onUpdateTarget(id, target + 1)}
                                className="size-6 rounded flex items-center justify-center transition-colors hover:bg-white/10"
                                style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                              >
                                <Plus className="size-2.5 text-white/50" />
                              </button>
                              <span className="text-[9px] text-white/25 w-10 text-right">
                                {s.defaultPeriod}
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Custom goals in this area */}
                    {customGoalsForCategory(area.id).map((cg) => (
                      <div
                        key={cg.id}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                        style={{
                          background: `${area.hex}06`,
                          border: `1px solid ${area.hex}15`,
                        }}
                      >
                        <div
                          className="size-4 rounded flex items-center justify-center shrink-0"
                          style={{ background: area.hex }}
                        >
                          <Check className="size-2.5 text-white" />
                        </div>
                        <input
                          type="text"
                          value={cg.title}
                          onChange={(e) => onUpdateCustomGoalTitle(cg.id, e.target.value)}
                          placeholder="Goal name..."
                          className="text-sm flex-1 min-w-0 bg-transparent text-white outline-none placeholder:text-white/25"
                          autoFocus={!cg.title}
                        />
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() =>
                              onUpdateTarget(
                                cg.id,
                                Math.max(1, (targets[cg.id] ?? cg.target) - 1)
                              )
                            }
                            className="size-6 rounded flex items-center justify-center transition-colors hover:bg-white/10"
                            style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                          >
                            <Minus className="size-2.5 text-white/50" />
                          </button>
                          <span className="text-xs font-semibold text-white w-6 text-center">
                            {targets[cg.id] ?? cg.target}
                          </span>
                          <button
                            onClick={() =>
                              onUpdateTarget(cg.id, (targets[cg.id] ?? cg.target) + 1)
                            }
                            className="size-6 rounded flex items-center justify-center transition-colors hover:bg-white/10"
                            style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                          >
                            <Plus className="size-2.5 text-white/50" />
                          </button>
                          <button
                            onClick={() => onRemoveCustomGoal(cg.id)}
                            className="size-6 rounded flex items-center justify-center transition-colors hover:bg-red-500/20"
                            style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                            title="Remove"
                          >
                            <X className="size-2.5 text-white/40" />
                          </button>
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={() => onAddCustomGoal(area.id)}
                      className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/5"
                      style={{ border: "1px dashed rgba(255,255,255,0.08)" }}
                    >
                      <Plus className="size-3.5 text-white/25" />
                      <span className="text-sm text-white/25">Add custom goal</span>
                    </button>
                  </div>
                )}
              </div>
            )
          })}
      </div>
      <style>{`
        @keyframes v7slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

// ============================================================================
// Step 3: Summary (Glassmorphism cards with particle field visible through)
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

  const TIER_COLORS: Record<string, string> = {
    diamond: "#b9f2ff",
    gold: "#ffd700",
    silver: "#c0c0c0",
    bronze: "#cd7f32",
    none: "#6366f1",
  }

  return (
    <div className="min-h-screen pt-12 pb-36 px-6">
      <div className="mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
            System Ready
          </h2>
          <p className="text-white/40 text-sm">
            {totalGoals} goals across {totalAreas} life area{totalAreas > 1 ? "s" : ""}
            {path && ` · ${path === "fto" ? "Find The One" : "Abundance"} path`}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: "Total Goals", value: String(totalGoals), color: "#06b6d4" },
            { label: "Life Areas", value: String(totalAreas), color: "#8b5cf6" },
            { label: "Achievements", value: String(badges.length), color: "#f59e0b" },
          ].map((stat) => (
            <GlassCard key={stat.label} glowColor={stat.color}>
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

        {/* Badges section */}
        {badges.length > 0 && (
          <GlassCard className="mb-6" glowColor="#f59e0b">
            <div
              className="px-5 py-3 flex items-center justify-between"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-center gap-2">
                <Trophy className="size-3.5" style={{ color: "#f59e0b" }} />
                <span className="text-sm font-semibold uppercase tracking-wider text-amber-400/80">
                  Achievements You&apos;ll Unlock
                </span>
              </div>
              <span className="text-xs text-white/30">{badges.length} badges</span>
            </div>
            <div className="px-5 py-3 space-y-2.5">
              {badges.map((badge) => (
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

        {/* Daygame goal groups */}
        {daygameGrouped.map(({ category, goals }) => (
          <GlassCard key={category} className="mb-4" glowColor="#06b6d4">
            <div
              className="px-5 py-3 flex items-center justify-between"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <span className="text-sm font-semibold uppercase tracking-wider text-cyan-400/80">
                {CATEGORY_LABELS[category] ?? category.replace(/_/g, " ")}
              </span>
              <span className="text-xs text-white/30">{goals.length} goals</span>
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
                      className="size-2 rounded-full"
                      style={{
                        background: "#06b6d4",
                        boxShadow: "0 0 6px rgba(6,182,212,0.4)",
                      }}
                    />
                    <span className="text-sm text-white/80 flex-1">{g.title}</span>
                    <span className="text-xs font-medium text-cyan-400">{target}</span>
                    <span className="text-[10px] uppercase text-white/25">
                      {g.templateType === "habit_ramp" ? "/wk" : "total"}
                    </span>
                  </div>
                )
              })}
            </div>
          </GlassCard>
        ))}

        {/* Other areas */}
        {otherAreaData.map(({ area, goals }) => (
          <GlassCard key={area.id} className="mb-4" glowColor={area.hex}>
            <div
              className="px-5 py-3 flex items-center justify-between"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <span
                className="text-sm font-semibold uppercase tracking-wider"
                style={{ color: `${area.hex}cc` }}
              >
                {area.name}
              </span>
              <span className="text-xs text-white/30">{goals.length} goals</span>
            </div>
            <div className="px-5 py-3 space-y-2">
              {goals.map((g) => (
                <div key={g.id} className="flex items-center gap-3">
                  <div
                    className="size-2 rounded-full"
                    style={{ background: area.hex, boxShadow: `0 0 6px ${area.hex}40` }}
                  />
                  <span className="text-sm text-white/80 flex-1">{g.title}</span>
                  <span className="text-xs font-medium" style={{ color: area.hex }}>
                    {targets[g.id] ?? g.defaultTarget}
                  </span>
                  <span className="text-[10px] uppercase text-white/25">/{g.period}</span>
                </div>
              ))}
            </div>
          </GlassCard>
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
            const catLabel =
              customCategories.find((c) => c.id === catId)?.name ||
              CATEGORY_LABELS[catId as GoalDisplayCategory] ||
              catId
            return (
              <GlassCard key={catId} className="mb-4" glowColor="#8b5cf6">
                <div
                  className="px-5 py-3 flex items-center justify-between"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <span className="text-sm font-semibold uppercase tracking-wider text-violet-400/80">
                    {catLabel}{" "}
                    <span className="text-[10px] normal-case font-normal text-white/25">
                      (custom)
                    </span>
                  </span>
                  <span className="text-xs text-white/30">{goals.length} goals</span>
                </div>
                <div className="px-5 py-3 space-y-2">
                  {goals.map((g) => (
                    <div key={g.id} className="flex items-center gap-3">
                      <div
                        className="size-2 rounded-full"
                        style={{
                          background: "#8b5cf6",
                          boxShadow: "0 0 6px rgba(139,92,246,0.4)",
                        }}
                      />
                      <span className="text-sm text-white/80 flex-1">{g.title}</span>
                      <span className="text-xs font-medium text-violet-400">
                        {targets[g.id] ?? g.target}
                      </span>
                      <span className="text-[10px] uppercase text-white/25">total</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )
          })
        })()}
      </div>
    </div>
  )
}

// ============================================================================
// Step 4: Orrery — Enhanced with Comet Trails + Corona Sun
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
const CORONA_RAYS = 12

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
      const count = Array.from(selectedGoals).filter((id) =>
        id.startsWith(`${area.id}_s`)
      ).length
      if (count > 0) counts[area.id] = count
    }
    return counts
  }, [selectedGoals, lifeAreas])

  const activeAreas = new Set(["daygame", ...selectedAreas])
  const viewSize = CENTER * 2

  return (
    <div className="min-h-screen pt-8 pb-36 px-6">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
            Your System
          </h2>
          <p className="text-white/40 text-sm">
            {totalGoals} goals · {activeAreas.size} life areas
            {path && ` · ${path === "fto" ? "Find The One" : "Abundance"}`}
          </p>
        </div>

        <div
          className="relative w-full mx-auto"
          style={{ maxWidth: 740, aspectRatio: "1/1" }}
        >
          <style>{`
            @keyframes v7SunPulse {
              0%, 100% { filter: drop-shadow(0 0 20px rgba(255, 180, 50, 0.6)) drop-shadow(0 0 40px rgba(255, 140, 20, 0.3)); }
              50% { filter: drop-shadow(0 0 35px rgba(255, 180, 50, 0.9)) drop-shadow(0 0 70px rgba(255, 140, 20, 0.5)); }
            }
            @keyframes v7CoronaRotate {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes v7CoronaRotateReverse {
              from { transform: rotate(360deg); }
              to { transform: rotate(0deg); }
            }
            @keyframes v7CoronaPulse {
              0%, 100% { opacity: 0.3; }
              50% { opacity: 0.7; }
            }
            @keyframes v7PlanetBreathe {
              0%, 100% { transform: scale(1); opacity: 0.25; }
              50% { transform: scale(1.08); opacity: 0.35; }
            }
            @keyframes v7CometFlash {
              0%, 100% { opacity: 0.6; }
              50% { opacity: 1; }
            }
            ${visibleAreas
              .map((area) => {
                const config = ORBIT_CONFIG[area.id]
                if (!config) return ""
                return `
                @keyframes v7orbit-${area.id} {
                  from { transform: rotate(${config.startAngle}deg); }
                  to { transform: rotate(${config.startAngle + 360}deg); }
                }
                @keyframes v7counter-orbit-${area.id} {
                  from { transform: rotate(-${config.startAngle}deg); }
                  to { transform: rotate(-${config.startAngle + 360}deg); }
                }
              `
              })
              .join("\n")}
          `}</style>

          <svg
            viewBox={`0 0 ${viewSize} ${viewSize}`}
            className="w-full h-full"
            style={{ overflow: "visible" }}
          >
            <defs>
              <radialGradient id="v7-sun-gradient" cx="35%" cy="35%">
                <stop offset="0%" stopColor="#fffbe6" />
                <stop offset="20%" stopColor="#ffd54f" />
                <stop offset="50%" stopColor="#ff9800" />
                <stop offset="80%" stopColor="#e65100" />
                <stop offset="100%" stopColor="#bf360c" />
              </radialGradient>
              <radialGradient id="v7-sun-glow">
                <stop offset="0%" stopColor="#ff9800" stopOpacity="0.5" />
                <stop offset="40%" stopColor="#ff6d00" stopOpacity="0.15" />
                <stop offset="70%" stopColor="#e65100" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#bf360c" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="v7-corona-glow">
                <stop offset="0%" stopColor="#ffab40" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#ff6d00" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#ff6d00" stopOpacity="0" />
              </radialGradient>
              <filter id="v7-planet-glow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
                <feFlood floodOpacity="0.5" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="v7-active-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="8" result="blur" />
                <feFlood floodOpacity="0.7" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Comet trail gradient template */}
              <linearGradient id="v7-comet-trail" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="white" stopOpacity="0" />
                <stop offset="100%" stopColor="white" stopOpacity="0.6" />
              </linearGradient>
            </defs>

            {/* Orbit rings */}
            {visibleAreas.map((area) => {
              const config = ORBIT_CONFIG[area.id]
              if (!config) return null
              const isActive = activeAreas.has(area.id)
              const isHovered = hoveredPlanet === area.id

              return (
                <g key={`orbit-${area.id}`}>
                  {/* Orbit ring */}
                  <circle
                    cx={CENTER}
                    cy={CENTER}
                    r={config.radius}
                    fill="none"
                    stroke={isActive ? area.hex : "rgba(100,120,255,0.08)"}
                    strokeWidth={isHovered ? 1.5 : isActive ? 0.8 : 0.4}
                    strokeOpacity={isActive ? 0.25 : 0.1}
                    strokeDasharray={isActive ? "none" : "4,8"}
                    className="transition-all duration-300"
                  />
                  {/* Orbit glow for active */}
                  {isActive && (
                    <circle
                      cx={CENTER}
                      cy={CENTER}
                      r={config.radius}
                      fill="none"
                      stroke={area.hex}
                      strokeWidth="3"
                      strokeOpacity="0.04"
                      className="transition-all duration-300"
                    />
                  )}
                </g>
              )
            })}

            {/* Sun corona - animated rays */}
            <g
              style={{
                transformOrigin: `${CENTER}px ${CENTER}px`,
                animation: "v7CoronaRotate 60s linear infinite",
              }}
            >
              {Array.from({ length: CORONA_RAYS }).map((_, i) => {
                const angle = (i / CORONA_RAYS) * 360
                const rad = (angle * Math.PI) / 180
                const innerR = SUN_RADIUS + 5
                const outerR = SUN_RADIUS + 25 + (i % 3) * 8
                return (
                  <line
                    key={`corona-${i}`}
                    x1={CENTER + Math.cos(rad) * innerR}
                    y1={CENTER + Math.sin(rad) * innerR}
                    x2={CENTER + Math.cos(rad) * outerR}
                    y2={CENTER + Math.sin(rad) * outerR}
                    stroke="#ffab40"
                    strokeWidth={i % 2 === 0 ? 2 : 1}
                    strokeOpacity="0.3"
                    strokeLinecap="round"
                    style={{ animation: `v7CoronaPulse ${2 + (i % 3)}s ease-in-out infinite ${(i * 0.3)}s` }}
                  />
                )
              })}
            </g>
            {/* Counter-rotating inner corona */}
            <g
              style={{
                transformOrigin: `${CENTER}px ${CENTER}px`,
                animation: "v7CoronaRotateReverse 45s linear infinite",
              }}
            >
              {Array.from({ length: 8 }).map((_, i) => {
                const angle = (i / 8) * 360 + 22.5
                const rad = (angle * Math.PI) / 180
                const innerR = SUN_RADIUS + 2
                const outerR = SUN_RADIUS + 15
                return (
                  <line
                    key={`corona-inner-${i}`}
                    x1={CENTER + Math.cos(rad) * innerR}
                    y1={CENTER + Math.sin(rad) * innerR}
                    x2={CENTER + Math.cos(rad) * outerR}
                    y2={CENTER + Math.sin(rad) * outerR}
                    stroke="#ffe082"
                    strokeWidth="1.5"
                    strokeOpacity="0.2"
                    strokeLinecap="round"
                    style={{ animation: `v7CoronaPulse ${3 + (i % 2)}s ease-in-out infinite ${(i * 0.5)}s` }}
                  />
                )
              })}
            </g>

            {/* Sun glow layers */}
            <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS * 3} fill="url(#v7-corona-glow)" />
            <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS * 2} fill="url(#v7-sun-glow)" />

            {/* Sun body */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={SUN_RADIUS}
              fill="url(#v7-sun-gradient)"
              style={{ animation: "v7SunPulse 4s ease-in-out infinite" }}
            />
            {/* Sun surface details */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={SUN_RADIUS * 0.65}
              fill="none"
              stroke="#fffbe6"
              strokeWidth="0.4"
              strokeOpacity="0.25"
            />
            <circle
              cx={CENTER}
              cy={CENTER}
              r={SUN_RADIUS * 0.35}
              fill="none"
              stroke="#fffbe6"
              strokeWidth="0.3"
              strokeOpacity="0.15"
            />
            <text
              x={CENTER}
              y={CENTER + 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#fffbe6"
              fontSize="8"
              fontWeight="700"
              letterSpacing="0.8"
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              YOUR VISION
            </text>

            {/* Planets with comet trails */}
            {visibleAreas.map((area) => {
              const config = ORBIT_CONFIG[area.id]
              if (!config) return null
              const isActive = activeAreas.has(area.id)
              const isHovered = hoveredPlanet === area.id
              const count = goalCounts[area.id] ?? 0

              // Comet trail: arc path behind planet
              const trailLength = 40 // degrees of trail
              const trailPoints: string[] = []
              for (let t = 0; t <= trailLength; t += 2) {
                const angle = -(t * Math.PI) / 180
                const x = CENTER + Math.sin(angle) * config.radius
                const y = CENTER - Math.cos(angle) * config.radius
                trailPoints.push(t === 0 ? `M${x},${y}` : `L${x},${y}`)
              }
              const trailPath = trailPoints.join(" ")

              // Generate a unique gradient for this trail
              const trailGradId = `v7-trail-${area.id}`

              return (
                <g
                  key={`planet-${area.id}`}
                  style={{
                    transformOrigin: `${CENTER}px ${CENTER}px`,
                    animation: `v7orbit-${area.id} ${config.duration}s linear infinite`,
                  }}
                >
                  <g
                    style={{
                      transformOrigin: `${CENTER}px ${CENTER - config.radius}px`,
                      animation: `v7counter-orbit-${area.id} ${config.duration}s linear infinite`,
                    }}
                  >
                    {/* Comet trail (only for active planets) */}
                    {isActive && (
                      <>
                        <defs>
                          <linearGradient id={trailGradId} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={area.hex} stopOpacity="0.5" />
                            <stop offset="100%" stopColor={area.hex} stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <g style={{
                          transformOrigin: `${CENTER}px ${CENTER}px`,
                          animation: `v7orbit-${area.id} ${config.duration}s linear infinite`,
                        }}>
                          <path
                            d={trailPath}
                            fill="none"
                            stroke={`url(#${trailGradId})`}
                            strokeWidth={config.planetSize * 0.6}
                            strokeLinecap="round"
                            opacity={0.4}
                            style={{ animation: "v7CometFlash 3s ease-in-out infinite" }}
                          />
                        </g>
                      </>
                    )}

                    {/* Hover hit area */}
                    <circle
                      cx={CENTER}
                      cy={CENTER - config.radius}
                      r={config.planetSize + 12}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredPlanet(area.id)}
                      onMouseLeave={() => setHoveredPlanet(null)}
                    />

                    {/* Planet outer ring */}
                    <circle
                      cx={CENTER}
                      cy={CENTER - config.radius}
                      r={config.planetSize + 4}
                      fill="none"
                      stroke={area.hex}
                      strokeWidth={isActive ? 1.2 : 0.5}
                      strokeOpacity={isActive ? 0.4 : 0.1}
                      strokeDasharray={isActive ? "none" : "2,3"}
                      className="transition-all duration-300"
                    />

                    {/* Planet body */}
                    <circle
                      cx={CENTER}
                      cy={CENTER - config.radius}
                      r={config.planetSize}
                      fill={area.hex}
                      fillOpacity={isActive ? 0.9 : 0.2}
                      filter={
                        isActive
                          ? isHovered
                            ? "url(#v7-active-glow)"
                            : "url(#v7-planet-glow)"
                          : undefined
                      }
                      className="transition-all duration-300"
                      style={
                        !isActive
                          ? {
                              transformOrigin: `${CENTER}px ${CENTER - config.radius}px`,
                              animation: "v7PlanetBreathe 4s ease-in-out infinite",
                            }
                          : undefined
                      }
                    />

                    {/* Highlight */}
                    <circle
                      cx={CENTER - config.planetSize * 0.25}
                      cy={CENTER - config.radius - config.planetSize * 0.25}
                      r={config.planetSize * 0.35}
                      fill="white"
                      fillOpacity={isActive ? 0.15 : 0.05}
                    />

                    {/* Label */}
                    <text
                      x={CENTER}
                      y={CENTER - config.radius + config.planetSize + 16}
                      textAnchor="middle"
                      fill={
                        isActive
                          ? isHovered
                            ? "#fff"
                            : "rgba(255,255,255,0.8)"
                          : "rgba(255,255,255,0.2)"
                      }
                      fontSize={area.id === "daygame" ? "9" : "7.5"}
                      fontWeight={area.id === "daygame" ? "700" : "500"}
                      letterSpacing="0.3"
                      className="transition-colors duration-300"
                      style={{ fontFamily: "system-ui, sans-serif" }}
                    >
                      {area.name}
                    </text>

                    {/* Goal count badge */}
                    {isActive && count > 0 && (
                      <g>
                        <circle
                          cx={CENTER + config.planetSize - 2}
                          cy={CENTER - config.radius - config.planetSize + 2}
                          r={7}
                          fill="rgba(10,10,30,0.8)"
                          stroke={area.hex}
                          strokeWidth="0.8"
                        />
                        <text
                          x={CENTER + config.planetSize - 2}
                          y={CENTER - config.radius - config.planetSize + 2.5}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill={area.hex}
                          fontSize="6"
                          fontWeight="700"
                          style={{ fontFamily: "system-ui, sans-serif" }}
                        >
                          {count}
                        </text>
                      </g>
                    )}

                    {/* Tooltip on hover */}
                    {isHovered && isActive && (
                      <g>
                        <rect
                          x={CENTER - 55}
                          y={CENTER - config.radius - config.planetSize - 30}
                          width={110}
                          height={22}
                          rx={6}
                          fill="rgba(10,10,30,0.9)"
                          stroke={area.hex}
                          strokeWidth="0.5"
                          strokeOpacity="0.5"
                        />
                        <text
                          x={CENTER}
                          y={CENTER - config.radius - config.planetSize - 16}
                          textAnchor="middle"
                          fill="white"
                          fontSize="7"
                          style={{ fontFamily: "system-ui, sans-serif" }}
                        >
                          {count} goal{count !== 1 ? "s" : ""} active
                        </text>
                      </g>
                    )}
                  </g>
                </g>
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
              {badges.map((badge) => {
                const tierColor =
                  badge.tier === "diamond"
                    ? "#b9f2ff"
                    : badge.tier === "gold"
                      ? "#ffd700"
                      : badge.tier === "silver"
                        ? "#c0c0c0"
                        : badge.tier === "bronze"
                          ? "#cd7f32"
                          : "#6366f1"

                return (
                  <GlassCard key={badge.badgeId} glowColor={tierColor}>
                    <div className="p-3 text-center">
                      <div
                        className="size-8 rounded-full flex items-center justify-center mx-auto mb-1.5"
                        style={{
                          background: `${tierColor}12`,
                          boxShadow: `0 0 12px ${tierColor}15`,
                        }}
                      >
                        <Trophy className="size-4" style={{ color: tierColor }} />
                      </div>
                      <div className="text-xs text-white/70 leading-tight">{badge.title}</div>
                      <div
                        className="text-[10px] uppercase font-medium mt-1"
                        style={{ color: tierColor }}
                      >
                        {badge.tier === "none" ? "Locked" : badge.tier}
                      </div>
                    </div>
                  </GlassCard>
                )
              })}
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            className="px-8 py-3 rounded-xl font-semibold text-sm transition-all"
            style={{
              background: "linear-gradient(135deg, #06b6d4, #8b5cf6)",
              color: "white",
              boxShadow:
                "0 0 20px rgba(139,92,246,0.3), 0 0 40px rgba(6,182,212,0.15)",
            }}
          >
            Create Goals
          </button>
          <p className="text-xs text-white/20 mt-2">
            This will create {totalGoals} goals in your dashboard
          </p>
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
  const [customGoals, setCustomGoals] = useState<CustomGoal[]>([])
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([])

  const stepIndex = STEPS.indexOf(step)

  const handleSelectPath = useCallback(
    (p: DaygamePath) => {

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
    },
    [flatData.areas]
  )

  const handleToggleArea = useCallback(
    (areaId: string) => {
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
    },
    [lifeAreas, selectedAreas]
  )

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
    setCustomGoals((prev) => prev.map((g) => (g.id === goalId ? { ...g, title } : g)))
  }, [])

  const addCustomCategory = useCallback(() => {
    const id = nextCustomId("cc")
    setCustomCategories((prev) => [...prev, { id, name: "" }])
  }, [])

  const renameCustomCategory = useCallback((catId: string, name: string) => {
    setCustomCategories((prev) => prev.map((c) => (c.id === catId ? { ...c, name } : c)))
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

  const goToStep = useCallback(
    (i: number) => {
      if (i < stepIndex && i >= 0) setStep(STEPS[i])
    },
    [stepIndex]
  )

  const daygameArea = flatData.areas.find((a) => a.lifeArea.id === "daygame")
  const selectedDaygameCount =
    daygameArea?.l3Goals.filter((g) => selectedGoals.has(g.id)).length ?? 0
  const otherGoalCount = lifeAreas
    .filter((a) => selectedAreas.has(a.id) && a.id !== "daygame" && a.id !== "custom")
    .reduce((sum, area) => {
      return (
        sum +
        (area.suggestions ?? []).filter((_, i) => selectedGoals.has(`${area.id}_s${i}`)).length
      )
    }, 0)
  const customGoalCount = customGoals.filter((g) => g.title.trim()).length
  const totalGoals = selectedDaygameCount + otherGoalCount + customGoalCount

  const ctaConfig = useMemo(() => {
    switch (step) {
      case "direction":
        return {
          label: "Choose Goals \u2192",
          disabled: !path,
          status: path
            ? `${path === "fto" ? "Find The One" : "Abundance"} selected`
            : "Select a path to continue",
        }
      case "goals":
        return {
          label: "View Summary \u2192",
          disabled: selectedGoals.size === 0,
          status: `${selectedGoals.size} goals selected`,
        }
      case "summary":
        return {
          label: "View Your System \u2192",
          disabled: false,
          status: `${totalGoals} goals ready`,
        }
      case "orrery":
        return {
          label: "Create Goals",
          disabled: false,
          status: `${totalGoals} goals · ${1 + selectedAreas.size} areas`,
        }
    }
  }, [step, path, selectedGoals.size, totalGoals, selectedAreas.size])


  return (
    <div className="relative">
      <ParticleFieldCanvas />

      <AnimatedStep stepKey={step}>
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
      </AnimatedStep>

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
