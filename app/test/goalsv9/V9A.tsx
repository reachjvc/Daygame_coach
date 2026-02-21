"use client"

/**
 * V9A: "Living Nebula"
 *
 * Visual redesign of V8. Functional logic is identical.
 * Background: flowing canvas nebula clouds (Hubble-style).
 * Orrery: plasma sun with solar flares, nebula ribbons on orbits, detailed planets.
 * Cards: nebula-tinted glassmorphism.
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
import { useFlatModelData, useLifeAreas, getDaygamePathL1, type DaygamePath } from "../goalsv7/useGoalData"
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/src/goals/config"
import { MilestoneCurveEditor } from "@/src/goals/components/MilestoneCurveEditor"
import type { GoalTemplate, LifeAreaConfig, MilestoneLadderConfig, GoalDisplayCategory, BadgeStatus } from "@/src/goals/types"

// ============================================================================
// Types & Constants (identical to V8)
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

const TIER_ORDER: Record<string, number> = {
  bronze: 0,
  silver: 1,
  gold: 2,
  diamond: 3,
  none: 4,
}

let _customIdCounter = 0
function nextCustomId(prefix: string) {
  return `${prefix}_${++_customIdCounter}_${Date.now()}`
}

// Step-specific nebula color palettes
const STEP_PALETTES: Record<FlowStep, { primary: string; secondary: string; accent: string }> = {
  direction: { primary: "160, 60, 220", secondary: "60, 120, 220", accent: "220, 60, 180" },
  goals: { primary: "40, 160, 200", secondary: "100, 60, 220", accent: "60, 200, 160" },
  summary: { primary: "180, 60, 200", secondary: "60, 80, 220", accent: "200, 100, 220" },
  orrery: { primary: "120, 40, 200", secondary: "200, 60, 140", accent: "40, 100, 240" },
}

// ============================================================================
// Living Nebula Background (Canvas-based) — Deep Space Hubble-Style
// ============================================================================

// Step-specific flow direction and speed multipliers
const STEP_FLOW: Record<FlowStep, { dirX: number; dirY: number; turbulence: number; speed: number }> = {
  direction: { dirX: 0.3, dirY: -0.2, turbulence: 0.6, speed: 1.0 },
  goals: { dirX: -0.1, dirY: -0.4, turbulence: 0.8, speed: 1.2 },
  summary: { dirX: 0.0, dirY: 0.1, turbulence: 0.4, speed: 0.8 },
  orrery: { dirX: 0.0, dirY: 0.0, turbulence: 1.2, speed: 1.5 },
}

function NebulaBackground({ currentStep }: { currentStep: FlowStep }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const timeRef = useRef(0)
  const paletteRef = useRef(STEP_PALETTES.direction)
  const targetPaletteRef = useRef(STEP_PALETTES.direction)
  const transitionRef = useRef(1)
  const flowRef = useRef(STEP_FLOW.direction)
  const targetFlowRef = useRef(STEP_FLOW.direction)

  useEffect(() => {
    targetPaletteRef.current = STEP_PALETTES[currentStep]
    targetFlowRef.current = STEP_FLOW[currentStep]
    transitionRef.current = 0
  }, [currentStep])

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

    // === LAYER 1: Deep nebula gas clouds (large, slow morphing) ===
    interface NebulaCloud {
      x: number; y: number; rx: number; ry: number
      angle: number; speed: number; drift: number; driftSpeed: number
      colorIdx: number; opacity: number; phase: number
      warpFreq: number; warpAmp: number
    }

    const clouds: NebulaCloud[] = []
    for (let i = 0; i < 18; i++) {
      clouds.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        rx: 200 + Math.random() * 400,
        ry: 120 + Math.random() * 280,
        angle: Math.random() * Math.PI * 2,
        speed: (Math.random() - 0.5) * 0.0004,
        drift: Math.random() * Math.PI * 2,
        driftSpeed: 0.0001 + Math.random() * 0.0004,
        colorIdx: i % 3,
        opacity: 0.015 + Math.random() * 0.04,
        phase: Math.random() * Math.PI * 2,
        warpFreq: 0.5 + Math.random() * 1.5,
        warpAmp: 0.03 + Math.random() * 0.08,
      })
    }

    // === LAYER 2: Flowing gas tendrils (elongated, animated filaments) ===
    interface GasTendril {
      x: number; y: number; length: number; thickness: number
      angle: number; speed: number; drift: number
      colorIdx: number; opacity: number; segments: number
      waveSpeed: number; waveAmp: number; phase: number
    }

    const tendrils: GasTendril[] = []
    for (let i = 0; i < 8; i++) {
      tendrils.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        length: 300 + Math.random() * 500,
        thickness: 40 + Math.random() * 80,
        angle: Math.random() * Math.PI * 2,
        speed: 0.0001 + Math.random() * 0.0003,
        drift: Math.random() * Math.PI * 2,
        colorIdx: (i + 1) % 3,
        opacity: 0.02 + Math.random() * 0.03,
        segments: 20,
        waveSpeed: 0.002 + Math.random() * 0.004,
        waveAmp: 20 + Math.random() * 40,
        phase: Math.random() * Math.PI * 2,
      })
    }

    // === LAYER 3: Background stars (multiple brightness tiers) ===
    interface BgStar {
      x: number; y: number; size: number
      twinkleSpeed: number; twinkleOffset: number
      brightness: number; hue: number; layer: number
    }

    const stars: BgStar[] = []
    // Distant dim stars (layer 0)
    for (let i = 0; i < 300; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 0.8 + 0.2,
        twinkleSpeed: 0.0005 + Math.random() * 0.002,
        twinkleOffset: Math.random() * Math.PI * 2,
        brightness: 0.15 + Math.random() * 0.35,
        hue: Math.random() > 0.7 ? 220 + Math.random() * 40 : 40 + Math.random() * 20,
        layer: 0,
      })
    }
    // Mid-field stars (layer 1)
    for (let i = 0; i < 120; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.5 + 0.5,
        twinkleSpeed: 0.001 + Math.random() * 0.004,
        twinkleOffset: Math.random() * Math.PI * 2,
        brightness: 0.4 + Math.random() * 0.5,
        hue: Math.random() > 0.5 ? 200 + Math.random() * 60 : 30 + Math.random() * 30,
        layer: 1,
      })
    }
    // Bright foreground stars (layer 2) with cross-spike
    for (let i = 0; i < 25; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2.0 + 1.2,
        twinkleSpeed: 0.002 + Math.random() * 0.006,
        twinkleOffset: Math.random() * Math.PI * 2,
        brightness: 0.7 + Math.random() * 0.3,
        hue: Math.random() > 0.6 ? 210 + Math.random() * 50 : 20 + Math.random() * 40,
        layer: 2,
      })
    }

    // === LAYER 4: Stellar wind particles (flowing streams) ===
    interface WindParticle {
      x: number; y: number; vx: number; vy: number
      size: number; opacity: number; hue: number; life: number; maxLife: number
    }

    const windParticles: WindParticle[] = []
    for (let i = 0; i < 80; i++) {
      windParticles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.8 + 0.3,
        opacity: Math.random() * 0.5 + 0.1,
        hue: Math.random() > 0.5 ? 270 + Math.random() * 40 : 190 + Math.random() * 30,
        life: Math.random() * 600,
        maxLife: 400 + Math.random() * 400,
      })
    }

    // === LAYER 5: Interacting particle pairs (gravitational wisps) ===
    interface ParticlePair {
      ax: number; ay: number; bx: number; by: number
      cx: number; cy: number
      phase: number; speed: number; radius: number
      hue: number; opacity: number
    }

    const pairs: ParticlePair[] = []
    for (let i = 0; i < 12; i++) {
      const cx = Math.random() * canvas.width
      const cy = Math.random() * canvas.height
      pairs.push({
        ax: cx, ay: cy, bx: cx, by: cy,
        cx, cy,
        phase: Math.random() * Math.PI * 2,
        speed: 0.003 + Math.random() * 0.006,
        radius: 30 + Math.random() * 60,
        hue: 250 + Math.random() * 80,
        opacity: 0.2 + Math.random() * 0.3,
      })
    }

    // === LAYER 6: Color-shifting nebula bloom spots ===
    interface NebulaBloom {
      x: number; y: number; radius: number
      hueBase: number; hueShift: number; hueSpeed: number
      opacity: number; pulseSpeed: number; phase: number
    }

    const blooms: NebulaBloom[] = []
    for (let i = 0; i < 6; i++) {
      blooms.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: 100 + Math.random() * 250,
        hueBase: 220 + Math.random() * 100,
        hueShift: 30 + Math.random() * 60,
        hueSpeed: 0.0003 + Math.random() * 0.0008,
        opacity: 0.01 + Math.random() * 0.025,
        pulseSpeed: 0.001 + Math.random() * 0.003,
        phase: Math.random() * Math.PI * 2,
      })
    }

    function lerpColor(a: string, b: string, t: number): string {
      const ap = a.split(",").map(Number)
      const bp = b.split(",").map(Number)
      return ap.map((v, i) => Math.round(v + (bp[i] - v) * t)).join(", ")
    }

    function lerpNum(a: number, b: number, t: number): number {
      return a + (b - a) * t
    }

    function animate() {
      if (!ctx || !canvas) return
      const t = timeRef.current++
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Palette and flow transition
      if (transitionRef.current < 1) {
        transitionRef.current = Math.min(1, transitionRef.current + 0.004)
        const tt = transitionRef.current
        const eased = tt * tt * (3 - 2 * tt) // smoothstep
        paletteRef.current = {
          primary: lerpColor(paletteRef.current.primary, targetPaletteRef.current.primary, eased * 0.03),
          secondary: lerpColor(paletteRef.current.secondary, targetPaletteRef.current.secondary, eased * 0.03),
          accent: lerpColor(paletteRef.current.accent, targetPaletteRef.current.accent, eased * 0.03),
        }
        flowRef.current = {
          dirX: lerpNum(flowRef.current.dirX, targetFlowRef.current.dirX, eased * 0.02),
          dirY: lerpNum(flowRef.current.dirY, targetFlowRef.current.dirY, eased * 0.02),
          turbulence: lerpNum(flowRef.current.turbulence, targetFlowRef.current.turbulence, eased * 0.02),
          speed: lerpNum(flowRef.current.speed, targetFlowRef.current.speed, eased * 0.02),
        }
      }

      const pal = paletteRef.current
      const flow = flowRef.current
      const colors = [pal.primary, pal.secondary, pal.accent]
      const W = canvas.width
      const H = canvas.height

      // --- Draw color-shifting nebula blooms (deepest layer) ---
      for (const bloom of blooms) {
        const hue = bloom.hueBase + Math.sin(t * bloom.hueSpeed + bloom.phase) * bloom.hueShift
        const pulse = 1 + Math.sin(t * bloom.pulseSpeed + bloom.phase) * 0.3
        const r = bloom.radius * pulse

        const grad = ctx.createRadialGradient(bloom.x, bloom.y, 0, bloom.x, bloom.y, r)
        grad.addColorStop(0, `hsla(${hue}, 80%, 40%, ${bloom.opacity * 1.5})`)
        grad.addColorStop(0.3, `hsla(${hue + 20}, 70%, 35%, ${bloom.opacity})`)
        grad.addColorStop(0.6, `hsla(${hue + 40}, 60%, 25%, ${bloom.opacity * 0.4})`)
        grad.addColorStop(1, `hsla(${hue}, 50%, 20%, 0)`)

        ctx.beginPath()
        ctx.arc(bloom.x, bloom.y, r, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
      }

      // --- Draw nebula clouds (morphing, warping gas) ---
      for (const cloud of clouds) {
        cloud.angle += cloud.speed * flow.speed
        cloud.drift += cloud.driftSpeed * flow.speed

        const cx = cloud.x + Math.sin(cloud.drift) * 50 * flow.turbulence + flow.dirX * t * 0.02
        const cy = cloud.y + Math.cos(cloud.drift * 0.7) * 35 * flow.turbulence + flow.dirY * t * 0.02
        // Morphing: scale and squash oscillate
        const breatheX = 1 + Math.sin(t * 0.003 + cloud.phase) * 0.15 * flow.turbulence
        const breatheY = 1 + Math.cos(t * 0.004 + cloud.phase * 1.3) * 0.12 * flow.turbulence
        // Warp the cloud shape over time
        const warpAngle = cloud.angle + Math.sin(t * 0.001 * cloud.warpFreq) * cloud.warpAmp

        ctx.save()
        ctx.translate(cx % W, cy % H)
        ctx.rotate(warpAngle)
        ctx.scale(breatheX, breatheY)

        const maxR = Math.max(cloud.rx, cloud.ry)
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, maxR)
        const col = colors[cloud.colorIdx]
        grad.addColorStop(0, `rgba(${col}, ${cloud.opacity * 2})`)
        grad.addColorStop(0.25, `rgba(${col}, ${cloud.opacity * 1.3})`)
        grad.addColorStop(0.5, `rgba(${col}, ${cloud.opacity * 0.6})`)
        grad.addColorStop(0.75, `rgba(${col}, ${cloud.opacity * 0.2})`)
        grad.addColorStop(1, `rgba(${col}, 0)`)

        ctx.beginPath()
        ctx.ellipse(0, 0, cloud.rx, cloud.ry, 0, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
        ctx.restore()
      }

      // --- Draw gas tendrils (flowing filaments) ---
      for (const tendril of tendrils) {
        tendril.drift += tendril.speed * flow.speed
        const baseAngle = tendril.angle + Math.sin(tendril.drift) * 0.3

        const col = colors[tendril.colorIdx]
        ctx.save()
        ctx.globalAlpha = tendril.opacity * flow.speed

        for (let seg = 0; seg < tendril.segments; seg++) {
          const progress = seg / tendril.segments
          const segLen = tendril.length / tendril.segments
          const wave = Math.sin(t * tendril.waveSpeed + progress * 4 + tendril.phase) * tendril.waveAmp * flow.turbulence
          const x = tendril.x + Math.cos(baseAngle) * progress * tendril.length + Math.cos(baseAngle + Math.PI / 2) * wave + flow.dirX * t * 0.015
          const y = tendril.y + Math.sin(baseAngle) * progress * tendril.length + Math.sin(baseAngle + Math.PI / 2) * wave + flow.dirY * t * 0.015

          const thickness = tendril.thickness * (1 - progress * 0.7) * (0.5 + Math.sin(t * 0.002 + progress * 2) * 0.5)
          const segAlpha = (1 - progress * 0.8)

          const grad = ctx.createRadialGradient(x % W, y % H, 0, x % W, y % H, thickness)
          grad.addColorStop(0, `rgba(${col}, ${0.03 * segAlpha})`)
          grad.addColorStop(0.5, `rgba(${col}, ${0.015 * segAlpha})`)
          grad.addColorStop(1, `rgba(${col}, 0)`)

          ctx.beginPath()
          ctx.arc(x % W, y % H, thickness, 0, Math.PI * 2)
          ctx.fillStyle = grad
          ctx.fill()
        }
        ctx.restore()
      }

      // --- Draw background stars (3 depth layers) ---
      for (const star of stars) {
        const twinkleBase = Math.sin(t * star.twinkleSpeed + star.twinkleOffset)
        // Brighter stars have sharper twinkle
        const twinkle = star.layer === 2
          ? 0.5 + twinkleBase * 0.5
          : star.layer === 1
            ? 0.4 + twinkleBase * 0.35 + 0.25
            : 0.6 + twinkleBase * 0.2 + 0.2
        const alpha = star.brightness * twinkle

        // Parallax drift based on layer
        const parallax = star.layer === 0 ? 0.003 : star.layer === 1 ? 0.008 : 0.015
        const sx = (star.x + flow.dirX * t * parallax) % W
        const sy = (star.y + flow.dirY * t * parallax) % H

        // Warm or cool star color
        const r = star.hue < 100 ? 255 : 200 + Math.floor(star.hue * 0.2)
        const g = star.hue < 100 ? 220 + Math.floor(star.hue * 0.3) : 210 + Math.floor(star.hue * 0.1)
        const b = star.hue < 100 ? 180 : 255

        ctx.beginPath()
        ctx.arc(sx, sy, star.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
        ctx.fill()

        // Bright foreground stars get cross-spikes
        if (star.layer === 2 && alpha > 0.5) {
          const spikeLen = star.size * 4 * alpha
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.25})`
          ctx.lineWidth = 0.5
          ctx.beginPath()
          ctx.moveTo(sx - spikeLen, sy)
          ctx.lineTo(sx + spikeLen, sy)
          ctx.moveTo(sx, sy - spikeLen)
          ctx.lineTo(sx, sy + spikeLen)
          ctx.stroke()
          // Faint diagonal spikes
          const dLen = spikeLen * 0.5
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.12})`
          ctx.beginPath()
          ctx.moveTo(sx - dLen, sy - dLen)
          ctx.lineTo(sx + dLen, sy + dLen)
          ctx.moveTo(sx + dLen, sy - dLen)
          ctx.lineTo(sx - dLen, sy + dLen)
          ctx.stroke()
        }
      }

      // --- Draw stellar wind particles (flowing with step direction) ---
      for (const p of windParticles) {
        p.life++
        if (p.life > p.maxLife) {
          // Respawn
          p.x = Math.random() * W
          p.y = Math.random() * H
          p.life = 0
          p.maxLife = 400 + Math.random() * 400
        }

        // Flow influenced by step direction and turbulence
        p.vx += (flow.dirX * 0.002 + (Math.random() - 0.5) * 0.01 * flow.turbulence) * flow.speed
        p.vy += (flow.dirY * 0.002 + (Math.random() - 0.5) * 0.01 * flow.turbulence) * flow.speed
        // Damping
        p.vx *= 0.995
        p.vy *= 0.995

        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x += W
        if (p.x > W) p.x -= W
        if (p.y < 0) p.y += H
        if (p.y > H) p.y -= H

        const lifeRatio = p.life / p.maxLife
        const fadeIn = Math.min(lifeRatio * 5, 1)
        const fadeOut = Math.max(1 - (lifeRatio - 0.7) / 0.3, 0)
        const pulse = 0.6 + Math.sin(t * 0.012 + p.hue) * 0.4
        const alpha = p.opacity * pulse * fadeIn * (lifeRatio > 0.7 ? fadeOut : 1)

        // Draw with soft glow
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3)
        grad.addColorStop(0, `hsla(${p.hue}, 80%, 75%, ${alpha})`)
        grad.addColorStop(0.4, `hsla(${p.hue}, 70%, 60%, ${alpha * 0.4})`)
        grad.addColorStop(1, `hsla(${p.hue}, 60%, 50%, 0)`)

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()

        // Core dot
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue}, 80%, 85%, ${alpha * 0.8})`
        ctx.fill()
      }

      // --- Draw interacting particle pairs (orbiting wisps) ---
      for (const pair of pairs) {
        pair.phase += pair.speed * flow.speed
        pair.ax = pair.cx + Math.cos(pair.phase) * pair.radius
        pair.ay = pair.cy + Math.sin(pair.phase) * pair.radius
        pair.bx = pair.cx + Math.cos(pair.phase + Math.PI) * pair.radius
        pair.by = pair.cy + Math.sin(pair.phase + Math.PI) * pair.radius

        // Draw connecting arc
        ctx.strokeStyle = `hsla(${pair.hue}, 60%, 60%, ${pair.opacity * 0.15})`
        ctx.lineWidth = 0.5
        ctx.beginPath()
        ctx.moveTo(pair.ax, pair.ay)
        ctx.quadraticCurveTo(
          pair.cx + Math.sin(t * 0.005) * 20 * flow.turbulence,
          pair.cy + Math.cos(t * 0.005) * 20 * flow.turbulence,
          pair.bx, pair.by
        )
        ctx.stroke()

        // Particle A
        const gA = ctx.createRadialGradient(pair.ax, pair.ay, 0, pair.ax, pair.ay, 6)
        gA.addColorStop(0, `hsla(${pair.hue}, 80%, 75%, ${pair.opacity * 0.6})`)
        gA.addColorStop(1, `hsla(${pair.hue}, 60%, 50%, 0)`)
        ctx.beginPath()
        ctx.arc(pair.ax, pair.ay, 6, 0, Math.PI * 2)
        ctx.fillStyle = gA
        ctx.fill()

        // Particle B
        const gB = ctx.createRadialGradient(pair.bx, pair.by, 0, pair.bx, pair.by, 5)
        gB.addColorStop(0, `hsla(${pair.hue + 40}, 80%, 75%, ${pair.opacity * 0.5})`)
        gB.addColorStop(1, `hsla(${pair.hue + 40}, 60%, 50%, 0)`)
        ctx.beginPath()
        ctx.arc(pair.bx, pair.by, 5, 0, Math.PI * 2)
        ctx.fillStyle = gB
        ctx.fill()
      }

      animFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", resize)
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#02010c] via-[#08041e] to-[#050218]" />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: "none" }}
      />
    </div>
  )
}

// ============================================================================
// Animated Step Wrapper
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
// Nebula Glass Card
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
        background: "rgba(10, 5, 30, 0.5)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: glowColor
          ? `1px solid ${glowColor}30`
          : "1px solid rgba(180, 140, 255, 0.08)",
        boxShadow: glowColor
          ? `0 0 24px ${glowColor}10, inset 0 1px 0 rgba(200,160,255,0.06)`
          : "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(200,160,255,0.05)",
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ============================================================================
// Bottom Bar — Nebula themed
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
        background: "rgba(5, 2, 15, 0.88)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderTop: "1px solid rgba(160, 100, 255, 0.12)",
      }}
    >
      <div className="mx-auto max-w-3xl flex items-center justify-between px-6 pt-3 pb-2">
        <span className="text-xs text-purple-300/50">{statusText}</span>
        <button
          onClick={onCta}
          disabled={ctaDisabled}
          className="px-5 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-30"
          style={{
            background: ctaDisabled
              ? "rgba(20, 10, 40, 0.5)"
              : "linear-gradient(135deg, #c026d3, #7c3aed, #2563eb)",
            color: ctaDisabled ? "rgba(160,120,255,0.4)" : "white",
            boxShadow: ctaDisabled ? "none" : "0 0 20px rgba(192,38,211,0.3), 0 0 40px rgba(124,58,237,0.15)",
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
                    style={{ background: isDone ? "rgba(192,38,211,0.6)" : "rgba(160,100,255,0.12)" }}
                  />
                  {isDone && (
                    <div
                      className="absolute inset-0"
                      style={{
                        background: "linear-gradient(90deg, transparent, rgba(192,38,211,0.8), transparent)",
                        animation: "v9aLineShimmer 2s ease-in-out infinite",
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
                      ? "linear-gradient(135deg, #c026d3, #7c3aed)"
                      : isActive
                        ? "rgba(124,58,237,0.3)"
                        : "rgba(20, 10, 40, 0.5)",
                    color: isDone || isActive ? "white" : "rgba(160,120,255,0.4)",
                    border: isActive
                      ? "2px solid rgba(192,38,211,0.6)"
                      : isDone
                        ? "none"
                        : "1px solid rgba(160,100,255,0.15)",
                    boxShadow: isActive
                      ? "0 0 16px rgba(192,38,211,0.3)"
                      : isDone
                        ? "0 0 8px rgba(192,38,211,0.2)"
                        : "none",
                    animation: isActive ? "v9aStepPulse 2s ease-in-out infinite" : "none",
                    cursor: isClickable ? "pointer" : "default",
                  }}
                >
                  {isDone ? <Check className="size-3" /> : i + 1}
                </button>
                <span
                  className="text-[9px] hidden sm:block"
                  style={{ color: isActive ? "#c084fc" : isDone ? "#c026d3" : "rgba(160,100,255,0.3)" }}
                >
                  {label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <style>{`
        @keyframes v9aStepPulse {
          0%, 100% { box-shadow: 0 0 12px rgba(192,38,211,0.3); }
          50% { box-shadow: 0 0 24px rgba(192,38,211,0.5), 0 0 40px rgba(124,58,237,0.15); }
        }
        @keyframes v9aLineShimmer {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ============================================================================
// Step 1: Direction (identical logic, nebula visuals)
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
            <Sparkles className="size-8 text-purple-400 opacity-60" />
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(192,38,211,0.2) 0%, transparent 70%)",
                animation: "v9aIconGlow 3s ease-in-out infinite",
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
                <div style={{ animation: "v9aCheckPop 0.3s ease-out" }}>
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
                <div style={{ animation: "v9aCheckPop 0.3s ease-out" }}>
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
          <div className="flex-1 h-px" style={{ background: "rgba(160,100,255,0.08)" }} />
          <span className="text-xs uppercase tracking-wider text-purple-300/25">Other Life Areas</span>
          <div className="flex-1 h-px" style={{ background: "rgba(160,100,255,0.08)" }} />
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
        @keyframes v9aIconGlow {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.5); opacity: 1; }
        }
        @keyframes v9aCheckPop {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ============================================================================
// Step 2: Goals (identical logic, nebula visuals)
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
              const catColor = CATEGORY_COLORS[category] ?? "#06b6d4"

              return (
                <div key={category} className="mb-3">
                  <button
                    onClick={() => toggleSection(sectionId)}
                    className="w-full flex items-center gap-3 rounded-lg px-4 py-2.5 transition-all duration-200"
                    style={{
                      background:
                        selectedCount > 0
                          ? `${catColor}0f`
                          : "rgba(255,255,255,0.02)",
                      backdropFilter: "blur(8px)",
                      border:
                        selectedCount > 0
                          ? `1px solid ${catColor}25`
                          : "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    {isExpanded ? (
                      <ChevronDown className="size-3.5" style={{ color: `${catColor}99` }} />
                    ) : (
                      <ChevronRight className="size-3.5" style={{ color: `${catColor}99` }} />
                    )}
                    <span className="text-sm text-white/80 flex-1 text-left">
                      {CATEGORY_LABELS[category] ?? category.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-white/30">
                      {selectedCount}/{goals.length}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="ml-4 mt-1.5 space-y-1" style={{ animation: "v9aSlideDown 0.25s ease-out" }}>
                      {goals.map((l3) => {
                        const isOn = selectedGoals.has(l3.id)
                        const meta = getGoalMeta(l3)
                        return (
                          <div key={l3.id}>
                            <div
                              className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200"
                              style={{
                                background: isOn ? `${catColor}0f` : "transparent",
                                border: isOn
                                  ? `1px solid ${catColor}25`
                                  : "1px solid transparent",
                              }}
                            >
                              <button
                                onClick={() => onToggle(l3.id)}
                                className="size-4 rounded flex items-center justify-center shrink-0 transition-all duration-200"
                                style={{
                                  background: isOn ? catColor : "rgba(255,255,255,0.1)",
                                  border: isOn ? "none" : "1px solid rgba(255,255,255,0.2)",
                                  boxShadow: isOn ? `0 0 8px ${catColor}4d` : "none",
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
                                            ? `1px solid ${catColor}66`
                                            : "1px solid rgba(255,255,255,0.1)",
                                        background:
                                          expandedCurve === l3.id
                                            ? `${catColor}1a`
                                            : "transparent",
                                      }}
                                      title="Customize milestone curve"
                                    >
                                      <SlidersHorizontal
                                        className="size-2.5"
                                        style={{
                                          color:
                                            expandedCurve === l3.id
                                              ? catColor
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
                                    className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors"
                                    style={{
                                      background: `${catColor}14`,
                                      border: `1px solid ${catColor}40`,
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

                      {customGoalsForCategory(category).map((cg) => (
                        <div
                          key={cg.id}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                          style={{
                            background: `${catColor}0f`,
                            border: `1px solid ${catColor}25`,
                          }}
                        >
                          <div
                            className="size-4 rounded flex items-center justify-center shrink-0"
                            style={{ background: catColor }}
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
                    <div className="ml-4 mt-1.5 space-y-1" style={{ animation: "v9aSlideDown 0.25s ease-out" }}>
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
                  <div className="ml-4 mt-1.5 space-y-1" style={{ animation: "v9aSlideDown 0.25s ease-out" }}>
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
        @keyframes v9aSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

// ============================================================================
// Step 3: Summary (identical logic, nebula visuals)
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

  const sortedBadges = useMemo(
    () => [...badges].sort((a, b) => (TIER_ORDER[a.tier] ?? 4) - (TIER_ORDER[b.tier] ?? 4)),
    [badges]
  )

  return (
    <div className="min-h-screen pt-12 pb-36 px-6">
      <style>{`
        @keyframes v9a-pour-in {
          0% { opacity: 0; transform: translateY(-40px) scaleY(0.8); filter: blur(8px); }
          60% { opacity: 1; transform: translateY(4px) scaleY(1.02); filter: blur(0px); }
          80% { transform: translateY(-2px) scaleY(0.99); }
          100% { opacity: 1; transform: translateY(0px) scaleY(1); filter: blur(0px); }
        }
        .v9a-stagger-enter {
          animation: v9a-pour-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        @keyframes v9a-glow-pulse {
          0%, 100% { box-shadow: 0 0 15px var(--glow-color, rgba(192,38,211,0.15)), inset 0 1px 0 rgba(255,255,255,0.03); }
          50% { box-shadow: 0 0 25px var(--glow-color, rgba(192,38,211,0.25)), inset 0 1px 0 rgba(255,255,255,0.05); }
        }
      `}</style>

      <div className="mx-auto max-w-2xl">
        <div className="text-center mb-8 v9a-stagger-enter">
          <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-purple-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
            System Ready
          </h2>
          <p className="text-white/30 text-sm">
            {totalGoals} goals across {totalAreas} life area{totalAreas > 1 ? "s" : ""}
            {path && ` \u00B7 ${path === "fto" ? "Find The One" : "Abundance"} path`}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: "Total Goals", value: String(totalGoals), color: "#c026d3" },
            { label: "Life Areas", value: String(totalAreas), color: "#7c3aed" },
            { label: "Achievements", value: String(sortedBadges.length), color: "#f59e0b" },
          ].map((stat, i) => (
            <GlassCard key={stat.label} glowColor={stat.color} className="v9a-stagger-enter" style={{ animationDelay: `${50 + i * 60}ms` }}>
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
          <GlassCard className="mb-6 v9a-stagger-enter" glowColor="#f59e0b" style={{ animationDelay: "230ms" }}>
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
          const catColor = CATEGORY_COLORS[category] ?? "#06b6d4"
          return (
            <div key={category} className="mb-3 rounded-xl overflow-hidden v9a-stagger-enter"
              style={{
                animationDelay: `${280 + catIdx * 50}ms`,
                background: "rgba(255,255,255,0.03)",
                backdropFilter: "blur(12px)",
                borderTop: `2px solid ${catColor}40`,
                borderLeft: "1px solid rgba(255,255,255,0.06)",
                borderRight: "1px solid rgba(255,255,255,0.06)",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                "--glow-color": `${catColor}12`,
                animation: "v9a-glow-pulse 5s ease-in-out infinite",
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
          <div key={area.id} className="mb-3 rounded-xl overflow-hidden v9a-stagger-enter"
            style={{
              animationDelay: `${380 + areaIdx * 50}ms`,
              background: "rgba(255,255,255,0.03)",
              backdropFilter: "blur(12px)",
              borderTop: `2px solid ${area.hex}40`,
              borderLeft: "1px solid rgba(255,255,255,0.06)",
              borderRight: "1px solid rgba(255,255,255,0.06)",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              "--glow-color": `${area.hex}12`,
              animation: "v9a-glow-pulse 5s ease-in-out infinite",
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
          const byCat: Record<string, CustomGoal[]> = {}
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
              <div key={catId} className="mb-3 rounded-xl overflow-hidden v9a-stagger-enter"
                style={{
                  animationDelay: `${450 + cIdx * 50}ms`,
                  background: "rgba(255,255,255,0.03)",
                  backdropFilter: "blur(12px)",
                  borderTop: "2px solid rgba(139,92,246,0.3)",
                  borderLeft: "1px solid rgba(255,255,255,0.06)",
                  borderRight: "1px solid rgba(255,255,255,0.06)",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  "--glow-color": "rgba(139,92,246,0.12)",
                  animation: "v9a-glow-pulse 5s ease-in-out infinite",
                } as React.CSSProperties}
              >
                <div className="px-5 py-3 flex items-center justify-between"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <span className="text-sm font-semibold uppercase tracking-wider text-violet-400">
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
                        style={{ background: "#8b5cf6", boxShadow: "0 0 4px rgba(139,92,246,0.4)" }}
                      />
                      <span className="text-sm text-white/70 flex-1">{g.title}</span>
                      <span className="text-xs font-medium text-violet-400">
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
// Step 4: Orrery — Dramatic Plasma Sun, Particle Orbit Streams, Detailed Planets
// ============================================================================

const ORBIT_CONFIG: Record<
  string,
  { radius: number; duration: number; startAngle: number; planetSize: number; hasRing?: boolean }
> = {
  daygame: { radius: 100, duration: 45, startAngle: 0, planetSize: 20 },
  health_fitness: { radius: 155, duration: 60, startAngle: 45, planetSize: 14, hasRing: true },
  career_business: { radius: 200, duration: 80, startAngle: 120, planetSize: 14 },
  social: { radius: 240, duration: 100, startAngle: 200, planetSize: 13 },
  personal_growth: { radius: 275, duration: 120, startAngle: 300, planetSize: 13, hasRing: true },
  lifestyle: { radius: 305, duration: 140, startAngle: 160, planetSize: 12 },
}

const SUN_RADIUS = 38
const CENTER = 370

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
  const sunCanvasRef = useRef<HTMLCanvasElement>(null)
  const sunAnimRef = useRef<number>(0)
  const ambientCanvasRef = useRef<HTMLCanvasElement>(null)
  const ambientAnimRef = useRef<number>(0)

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

  // Animated plasma sun on canvas — dramatically improved
  useEffect(() => {
    const canvas = sunCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const size = 300
    canvas.width = size
    canvas.height = size
    const cx = size / 2
    const cy = size / 2
    const r = 52
    let frame = 0

    // Prominence arcs that loop back to the surface
    interface Prominence {
      baseAngle: number; height: number; width: number
      speed: number; phase: number; opacity: number
    }
    const prominences: Prominence[] = []
    for (let i = 0; i < 4; i++) {
      prominences.push({
        baseAngle: (i / 4) * Math.PI * 2 + Math.random() * 0.5,
        height: r * (0.5 + Math.random() * 0.8),
        width: 0.3 + Math.random() * 0.4,
        speed: 0.0005 + Math.random() * 0.001,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.12 + Math.random() * 0.15,
      })
    }

    // Coronal mass ejection particles
    interface CMEParticle {
      angle: number; dist: number; speed: number
      size: number; opacity: number; life: number; maxLife: number
    }
    const cmeParticles: CMEParticle[] = []
    for (let i = 0; i < 60; i++) {
      cmeParticles.push({
        angle: Math.random() * Math.PI * 2,
        dist: r + Math.random() * r * 2,
        speed: 0.3 + Math.random() * 0.8,
        size: 0.5 + Math.random() * 1.5,
        opacity: 0.1 + Math.random() * 0.4,
        life: Math.random() * 200,
        maxLife: 150 + Math.random() * 200,
      })
    }

    function drawSun() {
      if (!ctx) return
      ctx.clearRect(0, 0, size, size)
      frame++

      // === Outermost corona — deep purple/magenta halo ===
      const deepCorona = ctx.createRadialGradient(cx, cy, r * 1.5, cx, cy, r * 3.2)
      deepCorona.addColorStop(0, "rgba(200, 50, 180, 0.08)")
      deepCorona.addColorStop(0.4, "rgba(120, 40, 200, 0.04)")
      deepCorona.addColorStop(0.7, "rgba(60, 20, 180, 0.02)")
      deepCorona.addColorStop(1, "rgba(30, 10, 120, 0)")
      ctx.beginPath()
      ctx.arc(cx, cy, r * 3.2, 0, Math.PI * 2)
      ctx.fillStyle = deepCorona
      ctx.fill()

      // === Pulsing corona glow ===
      const coronaPulse = 1 + Math.sin(frame * 0.015) * 0.15
      const coronaGrad = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 2.5 * coronaPulse)
      coronaGrad.addColorStop(0, "rgba(255, 180, 50, 0.3)")
      coronaGrad.addColorStop(0.2, "rgba(255, 120, 30, 0.15)")
      coronaGrad.addColorStop(0.4, "rgba(255, 80, 20, 0.06)")
      coronaGrad.addColorStop(0.7, "rgba(200, 50, 180, 0.03)")
      coronaGrad.addColorStop(1, "rgba(120, 40, 200, 0)")
      ctx.beginPath()
      ctx.arc(cx, cy, r * 2.5 * coronaPulse, 0, Math.PI * 2)
      ctx.fillStyle = coronaGrad
      ctx.fill()

      // === Solar prominences (looping arcs) ===
      for (const prom of prominences) {
        prom.phase += prom.speed
        const a = prom.baseAngle + Math.sin(frame * 0.002 + prom.phase) * 0.2
        const h = prom.height * (0.7 + Math.sin(frame * 0.008 + prom.phase) * 0.3)
        const halfW = prom.width

        // Start and end points on the surface
        const x1 = cx + Math.cos(a - halfW) * r
        const y1 = cy + Math.sin(a - halfW) * r
        const x2 = cx + Math.cos(a + halfW) * r
        const y2 = cy + Math.sin(a + halfW) * r

        // Control point arching outward
        const cpx = cx + Math.cos(a) * (r + h)
        const cpy = cy + Math.sin(a) * (r + h)

        // Draw the prominence as a thick glowing arc
        for (let layer = 3; layer >= 0; layer--) {
          const alpha = prom.opacity * (0.3 + layer * 0.15)
          const lw = (4 - layer) * 2 + 1
          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.quadraticCurveTo(cpx, cpy, x2, y2)

          const hue = layer > 1 ? "255, 160, 40" : "255, 100, 200"
          ctx.strokeStyle = `rgba(${hue}, ${alpha})`
          ctx.lineWidth = lw
          ctx.lineCap = "round"
          ctx.stroke()
        }
      }

      // === Solar flares (elongated spikes) ===
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + frame * 0.002 + Math.sin(frame * 0.005 + i * 1.3) * 0.15
        const flareLen = r * (0.4 + Math.sin(frame * 0.018 + i * 2.1) * 0.5 + Math.sin(frame * 0.007 + i * 0.9) * 0.3)
        const curveAmt = Math.sin(frame * 0.012 + i * 2.7) * 20

        const x1 = cx + Math.cos(angle) * (r - 2)
        const y1 = cy + Math.sin(angle) * (r - 2)
        const x2 = cx + Math.cos(angle) * (r + flareLen)
        const y2 = cy + Math.sin(angle) * (r + flareLen)
        const cpx = (x1 + x2) / 2 + Math.cos(angle + Math.PI / 2) * curveAmt
        const cpy = (y1 + y2) / 2 + Math.sin(angle + Math.PI / 2) * curveAmt

        // Multi-layer glow flare
        for (let layer = 2; layer >= 0; layer--) {
          const alpha = (0.08 + Math.sin(frame * 0.025 + i) * 0.06) * (1 + layer * 0.3)
          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.quadraticCurveTo(cpx, cpy, x2, y2)
          const hue = layer === 0 ? "255, 240, 180" : layer === 1 ? "255, 180, 60" : "255, 120, 30"
          ctx.strokeStyle = `rgba(${hue}, ${alpha})`
          ctx.lineWidth = 3 - layer
          ctx.lineCap = "round"
          ctx.stroke()
        }
      }

      // === CME Particles (coronal mass ejection) ===
      for (const p of cmeParticles) {
        p.life++
        p.dist += p.speed
        p.angle += (Math.random() - 0.5) * 0.01

        if (p.life > p.maxLife || p.dist > r * 3) {
          // Respawn at sun surface
          p.angle = Math.random() * Math.PI * 2
          p.dist = r + Math.random() * 5
          p.life = 0
          p.maxLife = 150 + Math.random() * 200
          p.speed = 0.3 + Math.random() * 0.8
        }

        const progress = (p.dist - r) / (r * 2)
        const fadeIn = Math.min(p.life / 20, 1)
        const fadeOut = 1 - Math.min(Math.max(progress, 0), 1)
        const alpha = p.opacity * fadeIn * fadeOut

        const px = cx + Math.cos(p.angle) * p.dist
        const py = cy + Math.sin(p.angle) * p.dist

        if (alpha > 0.01) {
          const hue = progress < 0.3 ? "255, 200, 80" : progress < 0.6 ? "255, 150, 100" : "200, 100, 180"
          ctx.beginPath()
          ctx.arc(px, py, p.size * (1 - progress * 0.5), 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${hue}, ${alpha})`
          ctx.fill()
        }
      }

      // === Sun body — multi-layer plasma sphere ===
      // Outer turbulent shell
      const shellGrad = ctx.createRadialGradient(cx, cy, r * 0.85, cx, cy, r * 1.05)
      shellGrad.addColorStop(0, "rgba(255, 100, 0, 0)")
      shellGrad.addColorStop(0.5, `rgba(255, 60, 0, ${0.15 + Math.sin(frame * 0.02) * 0.05})`)
      shellGrad.addColorStop(1, "rgba(180, 30, 0, 0)")
      ctx.beginPath()
      ctx.arc(cx, cy, r * 1.05, 0, Math.PI * 2)
      ctx.fillStyle = shellGrad
      ctx.fill()

      // Main sun body
      const sunGrad = ctx.createRadialGradient(cx - r * 0.15, cy - r * 0.15, 0, cx, cy, r)
      sunGrad.addColorStop(0, "#fffff0")
      sunGrad.addColorStop(0.1, "#fffbe6")
      sunGrad.addColorStop(0.25, "#ffd54f")
      sunGrad.addColorStop(0.45, "#ff9800")
      sunGrad.addColorStop(0.65, "#e65100")
      sunGrad.addColorStop(0.85, "#bf360c")
      sunGrad.addColorStop(1, "#8a1c0a")
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fillStyle = sunGrad
      ctx.fill()

      // === Convection cells (granulation pattern) ===
      for (let ring = 0; ring < 3; ring++) {
        const cellCount = 6 + ring * 4
        for (let i = 0; i < cellCount; i++) {
          const cellAngle = (i / cellCount) * Math.PI * 2 + frame * (0.0008 + ring * 0.0003) + ring * 0.5
          const dist = r * (0.15 + ring * 0.22)
          const cellX = cx + Math.cos(cellAngle) * dist
          const cellY = cy + Math.sin(cellAngle) * dist
          const cellR = (3.5 - ring * 0.5) + Math.sin(frame * 0.025 + i * 0.8 + ring * 2) * 1.5
          const cellAlpha = (0.08 - ring * 0.015) + Math.sin(frame * 0.03 + i * 1.2) * 0.04

          const cellGrad = ctx.createRadialGradient(cellX, cellY, 0, cellX, cellY, cellR)
          cellGrad.addColorStop(0, `rgba(255, 255, 240, ${cellAlpha})`)
          cellGrad.addColorStop(1, `rgba(255, 200, 100, 0)`)
          ctx.beginPath()
          ctx.arc(cellX, cellY, cellR, 0, Math.PI * 2)
          ctx.fillStyle = cellGrad
          ctx.fill()
        }
      }

      // === Specular highlight ===
      const specGrad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx - r * 0.2, cy - r * 0.2, r * 0.5)
      specGrad.addColorStop(0, "rgba(255, 255, 255, 0.15)")
      specGrad.addColorStop(0.5, "rgba(255, 255, 240, 0.05)")
      specGrad.addColorStop(1, "rgba(255, 255, 200, 0)")
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fillStyle = specGrad
      ctx.fill()

      // === Stellar wind streams (flowing outward with curves) ===
      for (let i = 0; i < 30; i++) {
        const windAngle = (i / 30) * Math.PI * 2 + frame * 0.003 + Math.sin(frame * 0.001 + i) * 0.1
        const progress = ((frame * 0.4 + i * 30) % (r * 2.8)) / (r * 2.8)
        const dist = r * 1.02 + progress * r * 2.2
        const drift = Math.sin(frame * 0.006 + i * 1.5) * 3 * progress

        const windX = cx + Math.cos(windAngle) * dist + Math.cos(windAngle + Math.PI / 2) * drift
        const windY = cy + Math.sin(windAngle) * dist + Math.sin(windAngle + Math.PI / 2) * drift
        const windAlpha = (1 - progress) * (0.25 + Math.sin(frame * 0.02 + i * 0.7) * 0.1)
        const windSize = (1.2 - progress * 0.8) * (0.5 + Math.sin(frame * 0.015 + i) * 0.3)

        if (windAlpha > 0.01) {
          const hue = progress < 0.4 ? "255, 210, 80" : "220, 160, 255"
          ctx.beginPath()
          ctx.arc(windX, windY, Math.max(windSize, 0.3), 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${hue}, ${windAlpha})`
          ctx.fill()
        }
      }

      sunAnimRef.current = requestAnimationFrame(drawSun)
    }

    drawSun()
    return () => cancelAnimationFrame(sunAnimRef.current)
  }, [])

  // Ambient effects canvas — nebula wisps and energy arcs behind orrery
  useEffect(() => {
    const canvas = ambientCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const size = 740
    canvas.width = size
    canvas.height = size
    const c = size / 2
    let frame = 0

    // Nebula wisps
    interface Wisp {
      angle: number; dist: number; length: number
      width: number; hue: number; opacity: number
      speed: number; waveAmp: number; waveFreq: number
    }
    const wisps: Wisp[] = []
    for (let i = 0; i < 12; i++) {
      wisps.push({
        angle: Math.random() * Math.PI * 2,
        dist: 60 + Math.random() * 280,
        length: 80 + Math.random() * 200,
        width: 15 + Math.random() * 40,
        hue: 240 + Math.random() * 80,
        opacity: 0.02 + Math.random() * 0.04,
        speed: 0.0002 + Math.random() * 0.0005,
        waveAmp: 10 + Math.random() * 30,
        waveFreq: 0.02 + Math.random() * 0.04,
      })
    }

    // Energy arc particles flowing along orbits
    interface OrbitParticle {
      orbitRadius: number; angle: number; speed: number
      size: number; opacity: number; hue: number; trail: number
    }
    const orbitParticles: OrbitParticle[] = []
    const orbitRadii = [100, 155, 200, 240, 275, 305]
    const orbitHues = [280, 160, 330, 200, 270, 190]
    for (let oi = 0; oi < orbitRadii.length; oi++) {
      const numParticles = 8 + Math.floor(Math.random() * 6)
      for (let i = 0; i < numParticles; i++) {
        orbitParticles.push({
          orbitRadius: orbitRadii[oi] * (size / 740),
          angle: Math.random() * Math.PI * 2,
          speed: (0.005 + Math.random() * 0.01) * (oi % 2 === 0 ? 1 : -1),
          size: 0.8 + Math.random() * 1.5,
          opacity: 0.15 + Math.random() * 0.3,
          hue: orbitHues[oi] + Math.random() * 40 - 20,
          trail: 3 + Math.floor(Math.random() * 5),
        })
      }
    }

    // Gravitational lensing light points near center
    interface LensPoint {
      angle: number; dist: number; speed: number
      brightness: number; size: number
    }
    const lensPoints: LensPoint[] = []
    for (let i = 0; i < 20; i++) {
      lensPoints.push({
        angle: Math.random() * Math.PI * 2,
        dist: 30 + Math.random() * 50,
        speed: 0.005 + Math.random() * 0.01,
        brightness: 0.05 + Math.random() * 0.15,
        size: 1 + Math.random() * 2,
      })
    }

    function drawAmbient() {
      if (!ctx) return
      ctx.clearRect(0, 0, size, size)
      frame++

      // === Nebula wisps ===
      for (const wisp of wisps) {
        wisp.angle += wisp.speed
        const baseX = c + Math.cos(wisp.angle) * wisp.dist
        const baseY = c + Math.sin(wisp.angle) * wisp.dist

        const segments = 15
        for (let s = 0; s < segments; s++) {
          const progress = s / segments
          const wave = Math.sin(frame * wisp.waveFreq + progress * 4 + wisp.angle) * wisp.waveAmp
          const segAngle = wisp.angle + progress * 1.5
          const x = baseX + Math.cos(segAngle) * progress * wisp.length + Math.cos(segAngle + Math.PI / 2) * wave
          const y = baseY + Math.sin(segAngle) * progress * wisp.length + Math.sin(segAngle + Math.PI / 2) * wave
          const segWidth = wisp.width * (1 - progress * 0.6) * (0.5 + Math.sin(frame * 0.003 + progress * 2) * 0.5)
          const alpha = wisp.opacity * (1 - progress * 0.7)

          const grad = ctx.createRadialGradient(x, y, 0, x, y, segWidth)
          grad.addColorStop(0, `hsla(${wisp.hue + progress * 30}, 60%, 40%, ${alpha})`)
          grad.addColorStop(0.5, `hsla(${wisp.hue + progress * 30}, 50%, 30%, ${alpha * 0.4})`)
          grad.addColorStop(1, `hsla(${wisp.hue}, 40%, 20%, 0)`)
          ctx.beginPath()
          ctx.arc(x, y, segWidth, 0, Math.PI * 2)
          ctx.fillStyle = grad
          ctx.fill()
        }
      }

      // === Orbit stream particles ===
      for (const p of orbitParticles) {
        p.angle += p.speed

        // Draw trail
        for (let t = p.trail; t >= 0; t--) {
          const trailAngle = p.angle - p.speed * t * 3
          const px = c + Math.cos(trailAngle) * p.orbitRadius
          const py = c + Math.sin(trailAngle) * p.orbitRadius
          const trailAlpha = p.opacity * (1 - t / (p.trail + 1))
          const trailSize = p.size * (1 - t / (p.trail + 1) * 0.5)

          ctx.beginPath()
          ctx.arc(px, py, trailSize, 0, Math.PI * 2)
          ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${trailAlpha})`
          ctx.fill()
        }

        // Head particle with glow
        const px = c + Math.cos(p.angle) * p.orbitRadius
        const py = c + Math.sin(p.angle) * p.orbitRadius

        const glow = ctx.createRadialGradient(px, py, 0, px, py, p.size * 4)
        glow.addColorStop(0, `hsla(${p.hue}, 90%, 80%, ${p.opacity * 0.5})`)
        glow.addColorStop(0.5, `hsla(${p.hue}, 70%, 60%, ${p.opacity * 0.15})`)
        glow.addColorStop(1, `hsla(${p.hue}, 60%, 50%, 0)`)
        ctx.beginPath()
        ctx.arc(px, py, p.size * 4, 0, Math.PI * 2)
        ctx.fillStyle = glow
        ctx.fill()
      }

      // === Gravitational lensing points near center ===
      for (const lp of lensPoints) {
        lp.angle += lp.speed
        const px = c + Math.cos(lp.angle) * lp.dist
        const py = c + Math.sin(lp.angle) * lp.dist
        const pulse = 0.5 + Math.sin(frame * 0.02 + lp.angle) * 0.5
        const alpha = lp.brightness * pulse

        const grad = ctx.createRadialGradient(px, py, 0, px, py, lp.size * 3)
        grad.addColorStop(0, `rgba(255, 200, 100, ${alpha})`)
        grad.addColorStop(0.5, `rgba(255, 150, 80, ${alpha * 0.3})`)
        grad.addColorStop(1, `rgba(200, 100, 180, 0)`)
        ctx.beginPath()
        ctx.arc(px, py, lp.size * 3, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
      }

      // === Energy arcs between sun and inner orbits ===
      for (let i = 0; i < 3; i++) {
        const arcAngle = frame * 0.003 + (i / 3) * Math.PI * 2
        const arcLen = 60 + Math.sin(frame * 0.01 + i * 2) * 30
        const x1 = c + Math.cos(arcAngle) * 40
        const y1 = c + Math.sin(arcAngle) * 40
        const x2 = c + Math.cos(arcAngle + 0.3) * (40 + arcLen)
        const y2 = c + Math.sin(arcAngle + 0.3) * (40 + arcLen)
        const cpDist = 30 + Math.sin(frame * 0.015 + i) * 15
        const cpAngle = arcAngle + Math.PI / 4
        const cpx = (x1 + x2) / 2 + Math.cos(cpAngle) * cpDist
        const cpy = (y1 + y2) / 2 + Math.sin(cpAngle) * cpDist

        const alpha = 0.06 + Math.sin(frame * 0.02 + i * 1.5) * 0.04
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.quadraticCurveTo(cpx, cpy, x2, y2)
        ctx.strokeStyle = `rgba(255, 180, 80, ${alpha})`
        ctx.lineWidth = 1
        ctx.lineCap = "round"
        ctx.stroke()

        // Thinner brighter core
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.quadraticCurveTo(cpx, cpy, x2, y2)
        ctx.strokeStyle = `rgba(255, 230, 150, ${alpha * 0.6})`
        ctx.lineWidth = 0.5
        ctx.stroke()
      }

      ambientAnimRef.current = requestAnimationFrame(drawAmbient)
    }

    drawAmbient()
    return () => cancelAnimationFrame(ambientAnimRef.current)
  }, [])

  return (
    <div className="min-h-screen pt-8 pb-36 px-6">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-purple-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
            Your System
          </h2>
          <p className="text-white/40 text-sm">
            {totalGoals} goals {"\u00B7"} {activeAreas.size} life areas
            {path && ` \u00B7 ${path === "fto" ? "Find The One" : "Abundance"}`}
          </p>
        </div>

        <div
          className="relative w-full mx-auto"
          style={{ maxWidth: 740, aspectRatio: "1/1" }}
        >
          <style>{`
            @keyframes v9aSunPulse {
              0%, 100% { filter: drop-shadow(0 0 25px rgba(255, 180, 50, 0.7)) drop-shadow(0 0 50px rgba(200, 50, 180, 0.3)) drop-shadow(0 0 80px rgba(120, 40, 200, 0.1)); }
              50% { filter: drop-shadow(0 0 40px rgba(255, 180, 50, 1.0)) drop-shadow(0 0 80px rgba(200, 50, 180, 0.5)) drop-shadow(0 0 120px rgba(120, 40, 200, 0.2)); }
            }
            @keyframes v9aPlanetBreathe {
              0%, 100% { transform: scale(1); opacity: 0.25; }
              50% { transform: scale(1.08); opacity: 0.35; }
            }
            @keyframes v9aNebulaRibbonPulse {
              0%, 100% { opacity: 0.08; }
              50% { opacity: 0.25; }
            }
            @keyframes v9aOrbitGlowPulse {
              0%, 100% { opacity: 0.03; }
              50% { opacity: 0.12; }
            }
            @keyframes v9aWindFlow {
              0% { stroke-dashoffset: 20; }
              100% { stroke-dashoffset: 0; }
            }
            @keyframes v9aRingRotate {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes v9aAtmoGlow {
              0%, 100% { opacity: 0.2; r: calc(var(--base-r) + 6); }
              50% { opacity: 0.4; r: calc(var(--base-r) + 9); }
            }
            ${visibleAreas
              .map((area) => {
                const config = ORBIT_CONFIG[area.id]
                if (!config) return ""
                return `
                @keyframes v9aOrbit-${area.id} {
                  from { transform: rotate(${config.startAngle}deg); }
                  to { transform: rotate(${config.startAngle + 360}deg); }
                }
                @keyframes v9aCounterOrbit-${area.id} {
                  from { transform: rotate(-${config.startAngle}deg); }
                  to { transform: rotate(-${config.startAngle + 360}deg); }
                }
              `
              })
              .join("\n")}
          `}</style>

          {/* Ambient effects canvas (behind SVG) */}
          <canvas
            ref={ambientCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ opacity: 0.8 }}
          />

          <svg
            viewBox={`0 0 ${viewSize} ${viewSize}`}
            className="w-full h-full relative"
            style={{ overflow: "visible" }}
          >
            <defs>
              <radialGradient id="v9a-sun-gradient" cx="35%" cy="35%">
                <stop offset="0%" stopColor="#fffff0" />
                <stop offset="10%" stopColor="#fffbe6" />
                <stop offset="25%" stopColor="#ffd54f" />
                <stop offset="50%" stopColor="#ff9800" />
                <stop offset="75%" stopColor="#e65100" />
                <stop offset="90%" stopColor="#bf360c" />
                <stop offset="100%" stopColor="#8a1c0a" />
              </radialGradient>
              <radialGradient id="v9a-sun-glow">
                <stop offset="0%" stopColor="#ff9800" stopOpacity="0.5" />
                <stop offset="20%" stopColor="#ff6d00" stopOpacity="0.2" />
                <stop offset="40%" stopColor="#c026d3" stopOpacity="0.08" />
                <stop offset="70%" stopColor="#7c3aed" stopOpacity="0.03" />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="v9a-corona-glow">
                <stop offset="0%" stopColor="#ffab40" stopOpacity="0.35" />
                <stop offset="25%" stopColor="#ff6d00" stopOpacity="0.15" />
                <stop offset="50%" stopColor="#c026d3" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
              </radialGradient>
              <filter id="v9a-planet-glow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="blur" />
                <feFlood floodOpacity="0.6" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="v9a-active-glow" x="-120%" y="-120%" width="340%" height="340%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="10" result="blur" />
                <feFlood floodOpacity="0.8" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="v9a-nebula-blur">
                <feGaussianBlur stdDeviation="8" />
              </filter>
              <filter id="v9a-soft-blur">
                <feGaussianBlur stdDeviation="3" />
              </filter>
            </defs>

            {/* Deep nebula wisps behind orbits */}
            {visibleAreas.map((area) => {
              const config = ORBIT_CONFIG[area.id]
              if (!config) return null
              const isActive = activeAreas.has(area.id)
              if (!isActive) return null

              return (
                <g key={`nebula-ribbon-${area.id}`}>
                  {/* Outer diffuse glow */}
                  <circle
                    cx={CENTER}
                    cy={CENTER}
                    r={config.radius}
                    fill="none"
                    stroke={area.hex}
                    strokeWidth={config.planetSize * 3}
                    strokeOpacity="0.02"
                    filter="url(#v9a-nebula-blur)"
                    style={{ animation: "v9aNebulaRibbonPulse 8s ease-in-out infinite" }}
                  />
                  {/* Inner focused glow */}
                  <circle
                    cx={CENTER}
                    cy={CENTER}
                    r={config.radius}
                    fill="none"
                    stroke={area.hex}
                    strokeWidth={config.planetSize * 1.2}
                    strokeOpacity="0.04"
                    filter="url(#v9a-soft-blur)"
                    style={{ animation: "v9aOrbitGlowPulse 5s ease-in-out infinite" }}
                  />
                </g>
              )
            })}

            {/* Orbit rings — double-line with glow */}
            {visibleAreas.map((area) => {
              const config = ORBIT_CONFIG[area.id]
              if (!config) return null
              const isActive = activeAreas.has(area.id)
              const isHovered = hoveredPlanet === area.id

              return (
                <g key={`orbit-${area.id}`}>
                  {/* Outermost dim glow ring */}
                  {isActive && (
                    <circle
                      cx={CENTER}
                      cy={CENTER}
                      r={config.radius}
                      fill="none"
                      stroke={area.hex}
                      strokeWidth="6"
                      strokeOpacity="0.03"
                      className="transition-all duration-500"
                    />
                  )}
                  {/* Main orbit line */}
                  <circle
                    cx={CENTER}
                    cy={CENTER}
                    r={config.radius}
                    fill="none"
                    stroke={isActive ? area.hex : "rgba(160,100,255,0.08)"}
                    strokeWidth={isHovered ? 1.8 : isActive ? 0.9 : 0.4}
                    strokeOpacity={isHovered ? 0.6 : isActive ? 0.35 : 0.1}
                    strokeDasharray={isActive ? "none" : "4,8"}
                    className="transition-all duration-300"
                  />
                  {/* Inner bright accent line */}
                  {isActive && (
                    <circle
                      cx={CENTER}
                      cy={CENTER}
                      r={config.radius}
                      fill="none"
                      stroke={area.hex}
                      strokeWidth="0.4"
                      strokeOpacity="0.5"
                      className="transition-all duration-300"
                    />
                  )}
                </g>
              )
            })}

            {/* Sun glow layers — expanded and more dramatic */}
            <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS * 4.5} fill="url(#v9a-corona-glow)" opacity="0.6" />
            <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS * 3.0} fill="url(#v9a-corona-glow)" />
            <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS * 2.2} fill="url(#v9a-sun-glow)" />

            {/* Sun body */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={SUN_RADIUS}
              fill="url(#v9a-sun-gradient)"
              style={{ animation: "v9aSunPulse 4s ease-in-out infinite" }}
            />
            {/* Inner rings suggesting convection zones */}
            <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS * 0.75} fill="none" stroke="#fffbe6" strokeWidth="0.4" strokeOpacity="0.15" />
            <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS * 0.5} fill="none" stroke="#fffbe6" strokeWidth="0.3" strokeOpacity="0.1" />
            <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS * 0.3} fill="none" stroke="#fffbe6" strokeWidth="0.2" strokeOpacity="0.08" />

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

            {/* Stellar wind rays — more numerous with varied styles */}
            {Array.from({ length: 24 }).map((_, i) => {
              const angle = (i / 24) * Math.PI * 2
              const innerR = SUN_RADIUS + 3
              const outerR = SUN_RADIUS + 15 + (i % 5) * 8
              const isLong = i % 4 === 0
              return (
                <line
                  key={`wind-${i}`}
                  x1={CENTER + Math.cos(angle) * innerR}
                  y1={CENTER + Math.sin(angle) * innerR}
                  x2={CENTER + Math.cos(angle) * (isLong ? outerR * 1.3 : outerR)}
                  y2={CENTER + Math.sin(angle) * (isLong ? outerR * 1.3 : outerR)}
                  stroke={isLong ? "#ffcc80" : "#ffab40"}
                  strokeWidth={isLong ? 1.2 : 0.6}
                  strokeOpacity={0.1 + (isLong ? 0.1 : 0) + Math.sin(i * 0.9) * 0.05}
                  strokeLinecap="round"
                  strokeDasharray={isLong ? "2,3" : "1.5,4"}
                  style={{ animation: `v9aWindFlow ${1.5 + (i % 4) * 0.5}s linear infinite` }}
                />
              )
            })}

            {/* Planets with enhanced atmospheric effects, rings, and surface detail */}
            {visibleAreas.map((area) => {
              const config = ORBIT_CONFIG[area.id]
              if (!config) return null
              const isActive = activeAreas.has(area.id)
              const isHovered = hoveredPlanet === area.id
              const count = goalCounts[area.id] ?? 0
              const pY = CENTER - config.radius

              return (
                <g
                  key={`planet-${area.id}`}
                  style={{
                    transformOrigin: `${CENTER}px ${CENTER}px`,
                    animation: `v9aOrbit-${area.id} ${config.duration}s linear infinite`,
                  }}
                >
                  <g
                    style={{
                      transformOrigin: `${CENTER}px ${pY}px`,
                      animation: `v9aCounterOrbit-${area.id} ${config.duration}s linear infinite`,
                    }}
                  >
                    {/* Multi-layer atmospheric halo */}
                    {isActive && (
                      <>
                        {/* Outer atmosphere */}
                        <circle
                          cx={CENTER} cy={pY}
                          r={config.planetSize + 10}
                          fill="none" stroke={area.hex}
                          strokeWidth="1" strokeOpacity="0.06"
                          style={{ filter: "blur(3px)" }}
                        />
                        {/* Mid atmosphere */}
                        <circle
                          cx={CENTER} cy={pY}
                          r={config.planetSize + 6}
                          fill="none" stroke={area.hex}
                          strokeWidth="2" strokeOpacity="0.12"
                          style={{ filter: "blur(2px)" }}
                        />
                        {/* Inner glow */}
                        <circle
                          cx={CENTER} cy={pY}
                          r={config.planetSize + 3}
                          fill="none" stroke={area.hex}
                          strokeWidth="1.5" strokeOpacity="0.2"
                          style={{ filter: "blur(1px)" }}
                        />
                      </>
                    )}

                    {/* Planetary ring system for selected planets */}
                    {isActive && config.hasRing && (
                      <g style={{ transformOrigin: `${CENTER}px ${pY}px` }}>
                        <ellipse
                          cx={CENTER} cy={pY}
                          rx={config.planetSize * 1.8}
                          ry={config.planetSize * 0.35}
                          fill="none" stroke={area.hex}
                          strokeWidth="1.5" strokeOpacity="0.25"
                        />
                        <ellipse
                          cx={CENTER} cy={pY}
                          rx={config.planetSize * 2.1}
                          ry={config.planetSize * 0.42}
                          fill="none" stroke={area.hex}
                          strokeWidth="0.8" strokeOpacity="0.12"
                        />
                        <ellipse
                          cx={CENTER} cy={pY}
                          rx={config.planetSize * 1.5}
                          ry={config.planetSize * 0.28}
                          fill="none" stroke={area.hex}
                          strokeWidth="2.5" strokeOpacity="0.08"
                          strokeDasharray="3,2"
                        />
                      </g>
                    )}

                    {/* Hover hit area */}
                    <circle
                      cx={CENTER} cy={pY}
                      r={config.planetSize + 14}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredPlanet(area.id)}
                      onMouseLeave={() => setHoveredPlanet(null)}
                    />

                    {/* Planet body with gradient */}
                    <circle
                      cx={CENTER} cy={pY}
                      r={config.planetSize}
                      fill={area.hex}
                      fillOpacity={isActive ? 0.9 : 0.2}
                      filter={
                        isActive
                          ? isHovered ? "url(#v9a-active-glow)" : "url(#v9a-planet-glow)"
                          : undefined
                      }
                      className="transition-all duration-300"
                      style={
                        !isActive
                          ? { transformOrigin: `${CENTER}px ${pY}px`, animation: "v9aPlanetBreathe 4s ease-in-out infinite" }
                          : undefined
                      }
                    />

                    {/* Surface detail — atmospheric bands */}
                    {isActive && (
                      <>
                        <ellipse
                          cx={CENTER}
                          cy={pY - config.planetSize * 0.2}
                          rx={config.planetSize * 0.85}
                          ry={config.planetSize * 0.12}
                          fill="none"
                          stroke="rgba(255,255,255,0.1)"
                          strokeWidth="0.6"
                        />
                        <ellipse
                          cx={CENTER}
                          cy={pY + config.planetSize * 0.05}
                          rx={config.planetSize * 0.9}
                          ry={config.planetSize * 0.1}
                          fill="none"
                          stroke="rgba(255,255,255,0.07)"
                          strokeWidth="0.5"
                        />
                        <ellipse
                          cx={CENTER}
                          cy={pY + config.planetSize * 0.3}
                          rx={config.planetSize * 0.75}
                          ry={config.planetSize * 0.08}
                          fill="none"
                          stroke="rgba(255,255,255,0.05)"
                          strokeWidth="0.4"
                        />
                        {/* Polar cap */}
                        <circle
                          cx={CENTER}
                          cy={pY - config.planetSize * 0.6}
                          r={config.planetSize * 0.35}
                          fill="rgba(255,255,255,0.04)"
                        />
                      </>
                    )}

                    {/* Specular highlight */}
                    <circle
                      cx={CENTER - config.planetSize * 0.25}
                      cy={pY - config.planetSize * 0.3}
                      r={config.planetSize * 0.3}
                      fill="white"
                      fillOpacity={isActive ? 0.18 : 0.05}
                    />
                    {/* Secondary highlight */}
                    {isActive && (
                      <circle
                        cx={CENTER - config.planetSize * 0.1}
                        cy={pY - config.planetSize * 0.15}
                        r={config.planetSize * 0.12}
                        fill="white"
                        fillOpacity={0.1}
                      />
                    )}

                    {/* Shadow crescent (terminator line) */}
                    {isActive && (
                      <circle
                        cx={CENTER + config.planetSize * 0.3}
                        cy={pY + config.planetSize * 0.15}
                        r={config.planetSize * 0.9}
                        fill="rgba(0,0,0,0.2)"
                        clipPath={`circle(${config.planetSize}px at ${CENTER}px ${pY}px)`}
                      />
                    )}

                    {/* Label with backdrop */}
                    <text
                      x={CENTER}
                      y={pY + config.planetSize + 16}
                      textAnchor="middle"
                      fill={
                        isActive
                          ? isHovered ? "#fff" : "rgba(255,255,255,0.85)"
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
                          cy={pY - config.planetSize + 2}
                          r={7}
                          fill="rgba(5,2,15,0.85)"
                          stroke={area.hex}
                          strokeWidth="0.8"
                        />
                        <text
                          x={CENTER + config.planetSize - 2}
                          y={pY - config.planetSize + 2.5}
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
                          y={pY - config.planetSize - 32}
                          width={110}
                          height={22}
                          rx={6}
                          fill="rgba(5,2,15,0.92)"
                          stroke={area.hex}
                          strokeWidth="0.6"
                          strokeOpacity="0.6"
                        />
                        <text
                          x={CENTER}
                          y={pY - config.planetSize - 18}
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

          {/* Canvas overlay for animated plasma sun */}
          <canvas
            ref={sunCanvasRef}
            className="absolute pointer-events-none"
            style={{
              width: "40%",
              height: "40%",
              left: "30%",
              top: "30%",
              mixBlendMode: "screen",
              opacity: 0.85,
            }}
          />
        </div>

        {/* Badges grid */}
        {badges.length > 0 && (() => {
          const sorted = [...badges].sort((a, b) => (TIER_ORDER[a.tier] ?? 4) - (TIER_ORDER[b.tier] ?? 4))
          return (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-4 justify-center">
                <Trophy className="size-4 text-amber-400" />
                <span className="text-sm font-semibold uppercase tracking-wider text-amber-400/80">
                  Achievements to Earn
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {sorted.map((badge) => {
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
          )
        })()}

        <div className="mt-8 text-center">
          <button
            className="px-8 py-3 rounded-xl font-semibold text-sm transition-all"
            style={{
              background: "linear-gradient(135deg, #c026d3, #7c3aed, #2563eb)",
              color: "white",
              boxShadow:
                "0 0 20px rgba(192,38,211,0.3), 0 0 40px rgba(124,58,237,0.15)",
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
// Main Component (identical state management to V8)
// ============================================================================

export default function V9A() {
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
          status: `${totalGoals} goals \u00B7 ${1 + selectedAreas.size} areas`,
        }
    }
  }, [step, path, selectedGoals.size, totalGoals, selectedAreas.size])

  return (
    <div className="relative">
      <NebulaBackground currentStep={step} />

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
