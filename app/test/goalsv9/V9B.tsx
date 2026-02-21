"use client"

/**
 * V9B: "Deep Ocean Bioluminescence"
 *
 * Visual redesign of V8. Functional logic is identical.
 * Background: dark ocean depths with bioluminescent particles, jellyfish, caustic ripples.
 * Orrery: bioluminescent core (anglerfish lure), current lines, glowing organisms.
 * Cards: deep water glassmorphism with caustic border patterns.
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

// ============================================================================
// Ocean Background (Canvas-based deep-sea ecosystem)
// ============================================================================

interface BioParticle {
  x: number; y: number; vx: number; vy: number
  size: number; opacity: number; hue: number
  pulseSpeed: number; pulsePhase: number
  layer: number // 0=far, 1=mid, 2=near for parallax
}

interface Jellyfish {
  x: number; y: number; vy: number; vx: number
  size: number; opacity: number; tentaclePhase: number; hue: number
  bellPulseSpeed: number; numTentacles: number
  oralArmPhase: number // for oral arm animation
}

interface DeepFish {
  x: number; y: number; vx: number; vy: number
  size: number; hue: number; opacity: number
  schoolId: number; tailPhase: number
}

interface DeepCreature {
  type: "anglerfish" | "siphonophore" | "shrimp"
  x: number; y: number; vx: number; vy: number
  size: number; opacity: number; phase: number; hue: number
}

interface LightRay {
  x: number; width: number; opacity: number; speed: number; phase: number
}

interface BioFlash {
  x: number; y: number; radius: number; opacity: number
  maxRadius: number; hue: number; life: number; maxLife: number
}

function OceanBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const timeRef = useRef(0)
  const mouseRef = useRef({ x: -1000, y: -1000 })
  const stateRef = useRef<{
    particles: BioParticle[]
    jellyfish: Jellyfish[]
    fish: DeepFish[]
    creatures: DeepCreature[]
    lightRays: LightRay[]
    flashes: BioFlash[]
  }>({ particles: [], jellyfish: [], fish: [], creatures: [], lightRays: [], flashes: [] })

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

    const W = () => canvas.width
    const H = () => canvas.height

    // Initialize bioluminescent particles (150 for richer feel)
    const PARTICLE_COUNT = 150
    const particles: BioParticle[] = []
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * W(), y: Math.random() * H(),
        vx: (Math.random() - 0.5) * 0.3,
        vy: -(Math.random() * 0.35 + 0.08),
        size: Math.random() * 2.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.1,
        hue: [180 + Math.random() * 20, 195 + Math.random() * 15, 40 + Math.random() * 15, 280 + Math.random() * 20][Math.floor(Math.random() * 4)],
        pulseSpeed: Math.random() * 2 + 1,
        pulsePhase: Math.random() * Math.PI * 2,
        layer: Math.floor(Math.random() * 3),
      })
    }

    // Initialize jellyfish (8 for richer population)
    const JELLYFISH_COUNT = 8
    const jellyfish: Jellyfish[] = []
    for (let i = 0; i < JELLYFISH_COUNT; i++) {
      jellyfish.push({
        x: Math.random() * W(), y: Math.random() * H(),
        vy: -(Math.random() * 0.18 + 0.04),
        vx: (Math.random() - 0.5) * 0.15,
        size: Math.random() * 25 + 12,
        opacity: Math.random() * 0.14 + 0.03,
        tentaclePhase: Math.random() * Math.PI * 2,
        hue: [190, 210, 270, 300, 170][Math.floor(Math.random() * 5)],
        bellPulseSpeed: 0.6 + Math.random() * 0.5,
        numTentacles: Math.floor(Math.random() * 4) + 6,
        oralArmPhase: Math.random() * Math.PI * 2,
      })
    }

    // Initialize schools of tiny fish
    const FISH_COUNT = 60
    const fish: DeepFish[] = []
    const schoolCount = 4
    for (let i = 0; i < FISH_COUNT; i++) {
      const sid = Math.floor(Math.random() * schoolCount)
      const cx = Math.random() * W()
      const cy = Math.random() * H()
      fish.push({
        x: cx + (Math.random() - 0.5) * 80,
        y: cy + (Math.random() - 0.5) * 50,
        vx: (Math.random() * 0.5 + 0.3) * (sid % 2 === 0 ? 1 : -1),
        vy: (Math.random() - 0.5) * 0.15,
        size: Math.random() * 2.5 + 1.5,
        hue: 185 + Math.random() * 30,
        opacity: Math.random() * 0.2 + 0.08,
        schoolId: sid,
        tailPhase: Math.random() * Math.PI * 2,
      })
    }

    // Initialize deep-sea creatures
    const creatures: DeepCreature[] = [
      // Anglerfish
      { type: "anglerfish", x: -50, y: H() * 0.7, vx: 0.12, vy: 0, size: 35, opacity: 0.1, phase: 0, hue: 200 },
      { type: "anglerfish", x: W() + 50, y: H() * 0.3, vx: -0.1, vy: 0, size: 28, opacity: 0.08, phase: 2, hue: 190 },
      // Siphonophores (chain creatures)
      { type: "siphonophore", x: W() * 0.2, y: -100, vx: 0.05, vy: 0.15, size: 60, opacity: 0.06, phase: 0, hue: 280 },
      { type: "siphonophore", x: W() * 0.7, y: -200, vx: -0.03, vy: 0.12, size: 50, opacity: 0.05, phase: 1.5, hue: 260 },
      // Translucent shrimp
      { type: "shrimp", x: W() * 0.5, y: H() * 0.6, vx: 0.3, vy: -0.1, size: 8, opacity: 0.12, phase: 0, hue: 190 },
      { type: "shrimp", x: W() * 0.8, y: H() * 0.4, vx: -0.25, vy: 0.08, size: 6, opacity: 0.1, phase: 1, hue: 200 },
    ]

    // Light rays from above
    const lightRays: LightRay[] = Array.from({ length: 5 }, (_, i) => ({
      x: Math.random() * W(),
      width: Math.random() * 60 + 30,
      opacity: Math.random() * 0.025 + 0.008,
      speed: Math.random() * 0.3 + 0.1,
      phase: Math.random() * Math.PI * 2,
    }))

    // Bioluminescent flashes (dynamic, spawned over time)
    const flashes: BioFlash[] = []

    stateRef.current = { particles, jellyfish, fish, creatures, lightRays, flashes }

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener("mousemove", handleMouseMove)

    const MOUSE_DIST = 160

    // --- Drawing functions ---

    function drawLightRays(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
      for (const ray of lightRays) {
        const sway = Math.sin(time * ray.speed + ray.phase) * 40
        const x = ray.x + sway
        const pulseOp = ray.opacity * (0.7 + Math.sin(time * 0.5 + ray.phase) * 0.3)
        const grad = ctx.createLinearGradient(x, 0, x, h * 0.7)
        grad.addColorStop(0, `rgba(120, 220, 255, ${pulseOp * 2})`)
        grad.addColorStop(0.3, `rgba(60, 180, 220, ${pulseOp})`)
        grad.addColorStop(0.7, `rgba(20, 80, 120, ${pulseOp * 0.3})`)
        grad.addColorStop(1, "transparent")
        ctx.save()
        ctx.globalAlpha = 1
        ctx.beginPath()
        ctx.moveTo(x - ray.width * 0.3, 0)
        ctx.lineTo(x + ray.width * 0.3, 0)
        ctx.lineTo(x + ray.width * 0.8 + sway * 0.3, h * 0.7)
        ctx.lineTo(x - ray.width * 0.2 + sway * 0.3, h * 0.7)
        ctx.closePath()
        ctx.fillStyle = grad
        ctx.fill()
        ctx.restore()
      }
    }

    function drawCaustics(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
      ctx.save()
      // Primary caustic network
      ctx.globalAlpha = 0.035
      for (let i = 0; i < 10; i++) {
        const x = (Math.sin(time * 0.25 + i * 1.3) * 0.5 + 0.5) * w
        const y = (Math.cos(time * 0.18 + i * 1.8) * 0.5 + 0.5) * h
        const r = 180 + Math.sin(time * 0.7 + i * 2.2) * 80
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
        grad.addColorStop(0, `rgba(0, 229, 255, ${0.25 + Math.sin(time + i) * 0.1})`)
        grad.addColorStop(0.3, "rgba(0, 180, 220, 0.1)")
        grad.addColorStop(0.6, "rgba(0, 100, 160, 0.03)")
        grad.addColorStop(1, "transparent")
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, w, h)
      }
      // Caustic web lines (moving light patterns on water surface projected down)
      ctx.globalAlpha = 0.015
      ctx.strokeStyle = "rgba(100, 230, 255, 0.4)"
      ctx.lineWidth = 0.8
      for (let i = 0; i < 8; i++) {
        ctx.beginPath()
        for (let t = 0; t < w; t += 20) {
          const yy = h * 0.15 + Math.sin(t * 0.008 + time * 0.4 + i * 0.7) * 30 + Math.sin(t * 0.015 + time * 0.2 + i * 1.3) * 15
          if (t === 0) ctx.moveTo(t, yy + i * (h * 0.1))
          else ctx.lineTo(t, yy + i * (h * 0.1))
        }
        ctx.stroke()
      }
      ctx.restore()
    }

    function drawJellyfish(ctx: CanvasRenderingContext2D, jf: Jellyfish, time: number) {
      const { x, y, size, opacity, tentaclePhase, hue, bellPulseSpeed, numTentacles, oralArmPhase } = jf
      const bellPulse = Math.sin(time * bellPulseSpeed + tentaclePhase)
      const bellW = size * (0.85 + bellPulse * 0.12)
      const bellH = size * (0.6 - bellPulse * 0.1)

      ctx.save()
      ctx.globalAlpha = opacity

      // Outer glow aura
      const auraGrad = ctx.createRadialGradient(x, y - size * 0.1, 0, x, y, size * 2)
      auraGrad.addColorStop(0, `hsla(${hue}, 80%, 65%, 0.15)`)
      auraGrad.addColorStop(0.4, `hsla(${hue}, 70%, 55%, 0.05)`)
      auraGrad.addColorStop(1, "transparent")
      ctx.fillStyle = auraGrad
      ctx.fillRect(x - size * 2, y - size * 2, size * 4, size * 4)

      // Bell (dome) with translucent layers
      ctx.beginPath()
      ctx.ellipse(x, y, bellW, bellH, 0, Math.PI, 0)
      const bellGrad = ctx.createRadialGradient(x, y - bellH * 0.5, 0, x, y, size * 1.1)
      bellGrad.addColorStop(0, `hsla(${hue}, 85%, 75%, 0.5)`)
      bellGrad.addColorStop(0.3, `hsla(${hue}, 75%, 60%, 0.3)`)
      bellGrad.addColorStop(0.6, `hsla(${hue}, 65%, 45%, 0.15)`)
      bellGrad.addColorStop(1, `hsla(${hue}, 55%, 35%, 0.03)`)
      ctx.fillStyle = bellGrad
      ctx.fill()

      // Bell edge highlight
      ctx.beginPath()
      ctx.ellipse(x, y, bellW, bellH, 0, Math.PI, 0)
      ctx.strokeStyle = `hsla(${hue}, 90%, 80%, ${0.2 + bellPulse * 0.1})`
      ctx.lineWidth = 0.8
      ctx.stroke()

      // Internal organs (radial canals)
      ctx.globalAlpha = opacity * 0.5
      for (let c = 0; c < 4; c++) {
        const angle = (c / 4) * Math.PI + time * 0.1
        ctx.beginPath()
        ctx.moveTo(x, y - bellH * 0.3)
        ctx.quadraticCurveTo(
          x + Math.cos(angle) * bellW * 0.5, y - bellH * 0.1,
          x + Math.cos(angle) * bellW * 0.3, y
        )
        ctx.strokeStyle = `hsla(${hue + 20}, 80%, 70%, 0.3)`
        ctx.lineWidth = 0.6
        ctx.stroke()
      }

      // Bioluminescent spots on bell
      ctx.globalAlpha = opacity * 0.8
      for (let s = 0; s < 6; s++) {
        const sx = x + Math.cos(s * 1.1 + tentaclePhase) * bellW * 0.5
        const sy = y - bellH * (0.2 + Math.sin(s * 0.8) * 0.2)
        const spotPulse = Math.sin(time * 2 + s * 1.5) * 0.3 + 0.7
        const spotR = size * 0.06 * spotPulse
        const spotGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, spotR * 3)
        spotGrad.addColorStop(0, `hsla(${hue}, 95%, 85%, ${0.5 * spotPulse})`)
        spotGrad.addColorStop(1, "transparent")
        ctx.fillStyle = spotGrad
        ctx.fillRect(sx - spotR * 3, sy - spotR * 3, spotR * 6, spotR * 6)
      }
      ctx.globalAlpha = opacity

      // Tentacles with multi-segment bezier curves
      for (let t = 0; t < numTentacles; t++) {
        const spread = (t - (numTentacles - 1) / 2) / ((numTentacles - 1) / 2)
        const tx = x + spread * bellW * 0.85
        const tentLen = size * (1.5 + Math.sin(time * 1.0 + tentaclePhase + t * 0.7) * 0.4)
        const waveAmp = size * 0.35
        ctx.beginPath()
        ctx.moveTo(tx, y)
        // 3-segment bezier for organic tentacle shape
        const cp1x = tx + Math.sin(time * 0.8 + t * 1.2) * waveAmp
        const cp1y = y + tentLen * 0.33
        const cp2x = tx + Math.sin(time * 0.6 + t * 1.8 + 1) * waveAmp * 0.8
        const cp2y = y + tentLen * 0.66
        const endx = tx + Math.sin(time * 0.4 + t * 2.2 + 2) * waveAmp * 0.5
        const endy = y + tentLen
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endx, endy)
        const tentAlpha = 0.12 - Math.abs(spread) * 0.03
        ctx.strokeStyle = `hsla(${hue}, 75%, 65%, ${tentAlpha})`
        ctx.lineWidth = 1.8 - Math.abs(spread) * 0.3
        ctx.stroke()

        // Tiny glowing nematocyst dots along tentacle
        if (t % 2 === 0) {
          for (let d = 0; d < 3; d++) {
            const frac = 0.3 + d * 0.25
            const dx = tx + Math.sin(time * 0.6 + t + d) * waveAmp * (1 - frac * 0.5) * frac
            const dy = y + tentLen * frac
            ctx.beginPath()
            ctx.arc(dx, dy, 0.8, 0, Math.PI * 2)
            ctx.fillStyle = `hsla(${hue}, 90%, 80%, ${0.3 * (1 - frac * 0.5)})`
            ctx.fill()
          }
        }
      }

      // Oral arms (thicker central tendrils)
      for (let a = 0; a < 3; a++) {
        const ax = x + (a - 1) * bellW * 0.2
        const armLen = size * 0.8
        ctx.beginPath()
        ctx.moveTo(ax, y)
        ctx.bezierCurveTo(
          ax + Math.sin(time * 0.9 + oralArmPhase + a) * size * 0.25, y + armLen * 0.4,
          ax + Math.sin(time * 0.7 + oralArmPhase + a + 1) * size * 0.15, y + armLen * 0.7,
          ax + Math.sin(time * 0.5 + oralArmPhase + a + 2) * size * 0.2, y + armLen
        )
        ctx.strokeStyle = `hsla(${hue + 10}, 70%, 60%, 0.08)`
        ctx.lineWidth = 2.5
        ctx.stroke()
      }

      ctx.restore()
    }

    function drawFish(ctx: CanvasRenderingContext2D, f: DeepFish, time: number) {
      ctx.save()
      ctx.globalAlpha = f.opacity
      const tailSwing = Math.sin(time * 6 + f.tailPhase) * f.size * 0.4
      const dir = f.vx > 0 ? 1 : -1

      // Body
      ctx.beginPath()
      ctx.ellipse(f.x, f.y, f.size, f.size * 0.4, 0, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${f.hue}, 60%, 55%, 0.6)`
      ctx.fill()

      // Bioluminescent belly line
      ctx.beginPath()
      ctx.moveTo(f.x - f.size * 0.7 * dir, f.y + f.size * 0.1)
      ctx.lineTo(f.x + f.size * 0.5 * dir, f.y + f.size * 0.1)
      ctx.strokeStyle = `hsla(${f.hue}, 90%, 80%, 0.4)`
      ctx.lineWidth = 0.5
      ctx.stroke()

      // Tail
      ctx.beginPath()
      ctx.moveTo(f.x - f.size * dir, f.y)
      ctx.lineTo(f.x - f.size * 1.4 * dir, f.y - f.size * 0.4 + tailSwing)
      ctx.lineTo(f.x - f.size * 1.4 * dir, f.y + f.size * 0.4 + tailSwing)
      ctx.closePath()
      ctx.fillStyle = `hsla(${f.hue}, 50%, 50%, 0.4)`
      ctx.fill()

      // Eye
      ctx.beginPath()
      ctx.arc(f.x + f.size * 0.5 * dir, f.y - f.size * 0.1, f.size * 0.15, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${f.hue}, 80%, 90%, 0.7)`
      ctx.fill()

      ctx.restore()
    }

    function drawAnglerfish(ctx: CanvasRenderingContext2D, c: DeepCreature, time: number) {
      ctx.save()
      ctx.globalAlpha = c.opacity
      const dir = c.vx > 0 ? 1 : -1

      // Body silhouette
      ctx.beginPath()
      ctx.ellipse(c.x, c.y, c.size, c.size * 0.7, 0, 0, Math.PI * 2)
      const bodyGrad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.size)
      bodyGrad.addColorStop(0, `hsla(${c.hue}, 30%, 15%, 0.8)`)
      bodyGrad.addColorStop(0.7, `hsla(${c.hue}, 25%, 10%, 0.5)`)
      bodyGrad.addColorStop(1, "transparent")
      ctx.fillStyle = bodyGrad
      ctx.fill()

      // Mouth
      ctx.beginPath()
      ctx.ellipse(c.x + c.size * 0.6 * dir, c.y + c.size * 0.1, c.size * 0.4, c.size * 0.25, dir > 0 ? 0 : Math.PI, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${c.hue}, 20%, 5%, 0.6)`
      ctx.fill()

      // Tiny teeth
      for (let t = 0; t < 5; t++) {
        const angle = (t / 5) * Math.PI - Math.PI * 0.5
        const tx = c.x + c.size * 0.6 * dir + Math.cos(angle) * c.size * 0.35 * dir
        const ty = c.y + c.size * 0.1 + Math.sin(angle) * c.size * 0.2
        ctx.beginPath()
        ctx.moveTo(tx, ty)
        ctx.lineTo(tx + dir * 2, ty + (angle < 0 ? -2 : 2))
        ctx.strokeStyle = `hsla(0, 0%, 70%, ${c.opacity * 3})`
        ctx.lineWidth = 0.5
        ctx.stroke()
      }

      // Bioluminescent lure (the famous dangling light!)
      const lureX = c.x + c.size * 0.3 * dir
      const lureY = c.y - c.size * 0.8
      const lurePulse = Math.sin(time * 3 + c.phase) * 0.4 + 0.6
      // Stalk
      ctx.beginPath()
      ctx.moveTo(c.x + c.size * 0.1 * dir, c.y - c.size * 0.5)
      ctx.quadraticCurveTo(
        lureX + Math.sin(time * 1.5 + c.phase) * 5, lureY + c.size * 0.3,
        lureX, lureY
      )
      ctx.strokeStyle = `hsla(${c.hue}, 40%, 30%, ${c.opacity * 4})`
      ctx.lineWidth = 1
      ctx.stroke()

      // Lure glow
      const lureGrad = ctx.createRadialGradient(lureX, lureY, 0, lureX, lureY, 15 * lurePulse)
      lureGrad.addColorStop(0, `hsla(185, 100%, 85%, ${0.8 * lurePulse})`)
      lureGrad.addColorStop(0.3, `hsla(185, 90%, 65%, ${0.4 * lurePulse})`)
      lureGrad.addColorStop(0.7, `hsla(185, 70%, 45%, ${0.1 * lurePulse})`)
      lureGrad.addColorStop(1, "transparent")
      ctx.fillStyle = lureGrad
      ctx.fillRect(lureX - 20, lureY - 20, 40, 40)

      // Lure core
      ctx.beginPath()
      ctx.arc(lureX, lureY, 3 * lurePulse, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(185, 100%, 90%, ${0.9 * lurePulse})`
      ctx.fill()

      // Eye
      ctx.beginPath()
      ctx.arc(c.x + c.size * 0.4 * dir, c.y - c.size * 0.15, c.size * 0.1, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(50, 80%, 60%, ${c.opacity * 4})`
      ctx.fill()

      ctx.restore()
    }

    function drawSiphonophore(ctx: CanvasRenderingContext2D, c: DeepCreature, time: number) {
      ctx.save()
      ctx.globalAlpha = c.opacity
      const segments = 12
      const segSpacing = c.size / segments

      for (let s = 0; s < segments; s++) {
        const frac = s / segments
        const sx = c.x + Math.sin(time * 0.5 + c.phase + s * 0.6) * 15 * (1 + frac * 0.5)
        const sy = c.y + s * segSpacing
        const segSize = (1 - frac * 0.4) * 5
        const pulse = Math.sin(time * 2 + c.phase + s * 0.8) * 0.3 + 0.7

        // Segment glow
        const segGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, segSize * 3)
        segGrad.addColorStop(0, `hsla(${c.hue + s * 5}, 80%, 70%, ${0.3 * pulse})`)
        segGrad.addColorStop(1, "transparent")
        ctx.fillStyle = segGrad
        ctx.fillRect(sx - segSize * 3, sy - segSize * 3, segSize * 6, segSize * 6)

        // Segment body
        ctx.beginPath()
        ctx.ellipse(sx, sy, segSize, segSize * 0.7, 0, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${c.hue + s * 5}, 75%, 65%, ${0.35 * pulse})`
        ctx.fill()

        // Connect to next segment
        if (s < segments - 1) {
          const nx = c.x + Math.sin(time * 0.5 + c.phase + (s + 1) * 0.6) * 15 * (1 + (frac + 1 / segments) * 0.5)
          const ny = c.y + (s + 1) * segSpacing
          ctx.beginPath()
          ctx.moveTo(sx, sy)
          ctx.lineTo(nx, ny)
          ctx.strokeStyle = `hsla(${c.hue + s * 5}, 60%, 55%, 0.15)`
          ctx.lineWidth = 0.8
          ctx.stroke()
        }

        // Mini tentacles from each segment
        if (s % 2 === 0) {
          ctx.beginPath()
          ctx.moveTo(sx, sy)
          ctx.quadraticCurveTo(
            sx + Math.sin(time * 1.2 + s) * 12, sy + segSpacing * 0.5,
            sx + Math.sin(time * 0.8 + s + 1) * 8, sy + segSpacing
          )
          ctx.strokeStyle = `hsla(${c.hue + s * 5}, 70%, 60%, 0.08)`
          ctx.lineWidth = 0.5
          ctx.stroke()
        }
      }
      ctx.restore()
    }

    function drawShrimp(ctx: CanvasRenderingContext2D, c: DeepCreature, time: number) {
      ctx.save()
      ctx.globalAlpha = c.opacity
      const dir = c.vx > 0 ? 1 : -1
      const wobble = Math.sin(time * 4 + c.phase) * 2

      // Translucent body
      ctx.beginPath()
      ctx.ellipse(c.x, c.y + wobble, c.size, c.size * 0.35, dir > 0 ? -0.2 : 0.2, 0, Math.PI * 2)
      const shrimpGrad = ctx.createRadialGradient(c.x, c.y + wobble, 0, c.x, c.y + wobble, c.size)
      shrimpGrad.addColorStop(0, `hsla(${c.hue}, 60%, 65%, 0.4)`)
      shrimpGrad.addColorStop(0.5, `hsla(${c.hue}, 50%, 55%, 0.2)`)
      shrimpGrad.addColorStop(1, "transparent")
      ctx.fillStyle = shrimpGrad
      ctx.fill()

      // Internal structure visible through translucent body
      ctx.beginPath()
      ctx.moveTo(c.x - c.size * 0.5 * dir, c.y + wobble)
      ctx.lineTo(c.x + c.size * 0.3 * dir, c.y + wobble)
      ctx.strokeStyle = `hsla(${c.hue + 30}, 70%, 60%, 0.25)`
      ctx.lineWidth = 1
      ctx.stroke()

      // Antennae
      for (let a = 0; a < 2; a++) {
        ctx.beginPath()
        ctx.moveTo(c.x + c.size * 0.8 * dir, c.y + wobble + (a - 0.5) * 2)
        ctx.quadraticCurveTo(
          c.x + c.size * 1.5 * dir, c.y + wobble + (a - 0.5) * 6 + Math.sin(time * 3 + a) * 3,
          c.x + c.size * 2 * dir, c.y + wobble + (a - 0.5) * 4 + Math.sin(time * 2 + a) * 4
        )
        ctx.strokeStyle = `hsla(${c.hue}, 60%, 60%, 0.15)`
        ctx.lineWidth = 0.4
        ctx.stroke()
      }

      // Bioluminescent flash spots
      const flashPulse = Math.sin(time * 5 + c.phase) * 0.5 + 0.5
      ctx.beginPath()
      ctx.arc(c.x + c.size * 0.2 * dir, c.y + wobble, 2 * flashPulse, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${c.hue}, 100%, 85%, ${0.5 * flashPulse})`
      ctx.fill()

      ctx.restore()
    }

    function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
      // Pressure-like vignette (dark edges simulating deep water pressure)
      const vGrad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75)
      vGrad.addColorStop(0, "transparent")
      vGrad.addColorStop(0.6, "rgba(1, 5, 12, 0.15)")
      vGrad.addColorStop(1, "rgba(1, 5, 12, 0.5)")
      ctx.fillStyle = vGrad
      ctx.fillRect(0, 0, w, h)
    }

    function drawWhaleSilhouette(ctx: CanvasRenderingContext2D, time: number, w: number, h: number) {
      // Very occasional, very distant whale silhouettes
      const whalePhase = Math.sin(time * 0.02) // very slow
      if (whalePhase < 0.85) return // only visible briefly
      const alpha = (whalePhase - 0.85) / 0.15 * 0.04
      const wx = (time * 3) % (w + 300) - 150
      const wy = h * 0.65

      ctx.save()
      ctx.globalAlpha = alpha
      ctx.fillStyle = "rgba(5, 15, 35, 1)"

      // Simple whale shape
      ctx.beginPath()
      ctx.ellipse(wx, wy, 80, 20, 0, 0, Math.PI * 2)
      ctx.fill()
      // Tail
      ctx.beginPath()
      ctx.moveTo(wx - 80, wy)
      ctx.quadraticCurveTo(wx - 100, wy - 15, wx - 115, wy - 25)
      ctx.quadraticCurveTo(wx - 100, wy + 5, wx - 80, wy)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(wx - 80, wy)
      ctx.quadraticCurveTo(wx - 100, wy + 15, wx - 115, wy + 25)
      ctx.quadraticCurveTo(wx - 100, wy - 5, wx - 80, wy)
      ctx.fill()

      ctx.restore()
    }

    function spawnFlash(w: number, h: number) {
      if (flashes.length < 5 && Math.random() < 0.008) {
        flashes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          radius: 0,
          opacity: 0.8,
          maxRadius: Math.random() * 80 + 30,
          hue: Math.random() > 0.5 ? 185 : 270,
          life: 0,
          maxLife: Math.random() * 60 + 40,
        })
      }
    }

    function drawFlashes(ctx: CanvasRenderingContext2D) {
      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i]
        f.life++
        const progress = f.life / f.maxLife
        f.radius = f.maxRadius * Math.sin(progress * Math.PI)
        f.opacity = (1 - progress) * 0.15

        if (f.life >= f.maxLife) {
          flashes.splice(i, 1)
          continue
        }

        const fGrad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius)
        fGrad.addColorStop(0, `hsla(${f.hue}, 90%, 80%, ${f.opacity})`)
        fGrad.addColorStop(0.4, `hsla(${f.hue}, 80%, 60%, ${f.opacity * 0.5})`)
        fGrad.addColorStop(1, "transparent")
        ctx.fillStyle = fGrad
        ctx.fillRect(f.x - f.radius, f.y - f.radius, f.radius * 2, f.radius * 2)
      }
    }

    function drawDeepMurk(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
      // Layered fog/murk patches that drift slowly
      ctx.save()
      for (let i = 0; i < 5; i++) {
        const mx = (Math.sin(time * 0.05 + i * 2.3) * 0.5 + 0.5) * w
        const my = (Math.cos(time * 0.04 + i * 1.7) * 0.5 + 0.5) * h
        const mr = 200 + Math.sin(time * 0.1 + i) * 60
        const murkGrad = ctx.createRadialGradient(mx, my, 0, mx, my, mr)
        murkGrad.addColorStop(0, `rgba(5, 20, 40, ${0.06 + Math.sin(time * 0.2 + i) * 0.02})`)
        murkGrad.addColorStop(0.5, "rgba(3, 12, 25, 0.03)")
        murkGrad.addColorStop(1, "transparent")
        ctx.fillStyle = murkGrad
        ctx.fillRect(0, 0, w, h)
      }
      ctx.restore()
    }

    // --- Main animation loop ---
    function animate() {
      if (!ctx || !canvas) return
      timeRef.current += 0.016
      const time = timeRef.current
      const w = W()
      const h = H()

      ctx.clearRect(0, 0, w, h)

      // Light rays from above
      drawLightRays(ctx, w, h, time)

      // Caustic light ripples (richer)
      drawCaustics(ctx, w, h, time)

      // Deep murk/fog layers
      drawDeepMurk(ctx, w, h, time)

      // Bioluminescent flashes
      spawnFlash(w, h)
      drawFlashes(ctx)

      // Distant whale silhouettes
      drawWhaleSilhouette(ctx, time, w, h)

      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      // Update & draw bioluminescent particles with parallax layers
      for (const p of particles) {
        const layerSpeed = 0.6 + p.layer * 0.25
        p.x += (p.vx + Math.sin(time * 0.5 + p.y * 0.005) * 0.2) * layerSpeed
        p.y += p.vy * layerSpeed

        if (p.x < -10) p.x = w + 10
        if (p.x > w + 10) p.x = -10
        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w }

        // Mouse interaction
        const dmx = mx - p.x; const dmy = my - p.y
        const distMouse = Math.sqrt(dmx * dmx + dmy * dmy)
        if (distMouse < MOUSE_DIST && distMouse > 0) {
          const force = (MOUSE_DIST - distMouse) / MOUSE_DIST * 0.012
          p.vx += (dmx / distMouse) * force
          p.vy += (dmy / distMouse) * force
        }
        p.vx *= 0.997
        p.vy = Math.min(p.vy, 0.12)

        const pulse = Math.sin(time * p.pulseSpeed + p.pulsePhase) * 0.35 + 0.65
        const drawOpacity = p.opacity * pulse * (0.7 + p.layer * 0.15)

        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4)
        grd.addColorStop(0, `hsla(${p.hue}, 90%, 70%, ${drawOpacity * 0.35})`)
        grd.addColorStop(1, `hsla(${p.hue}, 80%, 60%, 0)`)
        ctx.fillStyle = grd
        ctx.fillRect(p.x - p.size * 4, p.y - p.size * 4, p.size * 8, p.size * 8)

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * pulse, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue}, 85%, 75%, ${drawOpacity})`
        ctx.fill()
      }

      // Draw schools of fish
      for (const f of fish) {
        // Schooling behavior: steer toward school center, avoid collisions
        let cx = 0, cy = 0, count = 0
        for (const other of fish) {
          if (other.schoolId === f.schoolId && other !== f) {
            cx += other.x; cy += other.y; count++
          }
        }
        if (count > 0) {
          cx /= count; cy /= count
          f.vx += (cx - f.x) * 0.0003
          f.vy += (cy - f.y) * 0.0003
        }

        // Mouse avoidance
        const fdx = mx - f.x; const fdy = my - f.y
        const fdist = Math.sqrt(fdx * fdx + fdy * fdy)
        if (fdist < 120 && fdist > 0) {
          f.vx -= (fdx / fdist) * 0.05
          f.vy -= (fdy / fdist) * 0.05
        }

        f.x += f.vx
        f.y += f.vy + Math.sin(time * 0.5 + f.tailPhase) * 0.05
        f.vy *= 0.98

        // Speed limits
        const speed = Math.sqrt(f.vx * f.vx + f.vy * f.vy)
        if (speed > 1.2) { f.vx *= 1.2 / speed; f.vy *= 1.2 / speed }

        // Wrap
        if (f.x < -20) f.x = w + 20
        if (f.x > w + 20) f.x = -20
        if (f.y < -20) f.y = h + 20
        if (f.y > h + 20) f.y = -20

        drawFish(ctx, f, time)
      }

      // Draw jellyfish (more detailed)
      for (const jf of jellyfish) {
        jf.y += jf.vy + Math.sin(time * jf.bellPulseSpeed + jf.tentaclePhase) * 0.12
        jf.x += jf.vx + Math.sin(time * 0.25 + jf.tentaclePhase) * 0.25

        if (jf.y < -jf.size * 4) { jf.y = h + jf.size * 4; jf.x = Math.random() * w }
        if (jf.x < -jf.size * 2) jf.x = w + jf.size * 2
        if (jf.x > w + jf.size * 2) jf.x = -jf.size * 2

        drawJellyfish(ctx, jf, time)
      }

      // Draw deep-sea creatures
      for (const c of creatures) {
        c.x += c.vx
        c.y += c.vy + Math.sin(time * 0.3 + c.phase) * 0.1

        // Wrap creatures around
        if (c.type === "anglerfish") {
          if (c.vx > 0 && c.x > w + 100) { c.x = -100; c.y = Math.random() * h * 0.6 + h * 0.3 }
          if (c.vx < 0 && c.x < -100) { c.x = w + 100; c.y = Math.random() * h * 0.6 + h * 0.2 }
          drawAnglerfish(ctx, c, time)
        } else if (c.type === "siphonophore") {
          if (c.y > h + c.size + 50) { c.y = -c.size - 50; c.x = Math.random() * w }
          drawSiphonophore(ctx, c, time)
        } else if (c.type === "shrimp") {
          if (c.x > w + 30) { c.x = -30; c.y = Math.random() * h }
          if (c.x < -30) { c.x = w + 30; c.y = Math.random() * h }
          drawShrimp(ctx, c, time)
        }
      }

      // Particle connections (bioluminescent neural network effect)
      ctx.lineWidth = 0.4
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < Math.min(i + 20, particles.length); j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 70) {
            const alpha = (1 - dist / 70) * 0.05
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(0, 229, 255, ${alpha})`
            ctx.stroke()
          }
        }
      }

      // Vignette overlay
      drawVignette(ctx, w, h)

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
      {/* Deep ocean gradient — richer depth bands */}
      <div className="absolute inset-0" style={{
        background: "linear-gradient(180deg, #010810 0%, #031220 15%, #051A30 30%, #0A2840 45%, #082238 60%, #051828 80%, #020C1A 100%)"
      }} />
      {/* Deep water fog clouds */}
      <div className="absolute inset-0 opacity-20">
        <div className="v9b-fog v9b-fog-1" />
        <div className="v9b-fog v9b-fog-2" />
        <div className="v9b-fog v9b-fog-3" />
        <div className="v9b-fog v9b-fog-4" />
        <div className="v9b-fog v9b-fog-5" />
      </div>
      {/* Canvas particle layer */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: "none" }}
      />
      {/* Floating particles (CSS) for additional depth */}
      <div className="absolute inset-0" style={{ pointerEvents: "none" }}>
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 2.5 + 0.5,
              height: Math.random() * 2.5 + 0.5,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.25 + 0.05,
              background: `hsl(${[185, 200, 270, 45][Math.floor(Math.random() * 4)]}, 80%, 70%)`,
              boxShadow: `0 0 ${Math.random() * 8 + 3}px hsl(${[185, 200, 270, 45][Math.floor(Math.random() * 4)]}, 80%, 60%)`,
              animation: `v9bFloat ${Math.random() * 10 + 8}s ease-in-out infinite, v9bPulse ${Math.random() * 4 + 2}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 8}s`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes v9bFloat {
          0%, 100% { transform: translateY(0) translateX(0); }
          20% { transform: translateY(-12px) translateX(6px); }
          40% { transform: translateY(-28px) translateX(-4px); }
          60% { transform: translateY(-18px) translateX(10px); }
          80% { transform: translateY(-8px) translateX(-2px); }
        }
        @keyframes v9bPulse {
          0%, 100% { opacity: 0.08; }
          50% { opacity: 0.45; }
        }
        .v9b-fog {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
        }
        .v9b-fog-1 {
          width: 700px; height: 450px;
          top: 3%; left: 8%;
          background: radial-gradient(ellipse, rgba(0, 229, 255, 0.09) 0%, transparent 70%);
          animation: v9bFogFloat1 35s ease-in-out infinite;
        }
        .v9b-fog-2 {
          width: 550px; height: 380px;
          top: 40%; right: 3%;
          background: radial-gradient(ellipse, rgba(42, 0, 102, 0.12) 0%, transparent 70%);
          animation: v9bFogFloat2 40s ease-in-out infinite;
        }
        .v9b-fog-3 {
          width: 500px; height: 350px;
          bottom: 8%; left: 20%;
          background: radial-gradient(ellipse, rgba(0, 102, 255, 0.07) 0%, transparent 70%);
          animation: v9bFogFloat3 30s ease-in-out infinite;
        }
        .v9b-fog-4 {
          width: 400px; height: 300px;
          top: 25%; left: 50%;
          background: radial-gradient(ellipse, rgba(100, 0, 180, 0.06) 0%, transparent 70%);
          animation: v9bFogFloat1 45s ease-in-out infinite reverse;
        }
        .v9b-fog-5 {
          width: 600px; height: 250px;
          bottom: 30%; right: 15%;
          background: radial-gradient(ellipse, rgba(0, 180, 200, 0.05) 0%, transparent 70%);
          animation: v9bFogFloat2 50s ease-in-out infinite reverse;
        }
        @keyframes v9bFogFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 1; }
          25% { transform: translate(30px, -20px) scale(1.06); opacity: 0.8; }
          50% { transform: translate(-10px, 15px) scale(0.97); opacity: 1; }
          75% { transform: translate(-25px, -10px) scale(1.03); opacity: 0.9; }
        }
        @keyframes v9bFogFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-25px, 18px) scale(1.1); }
          66% { transform: translate(15px, -12px) scale(0.94); }
        }
        @keyframes v9bFogFloat3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, -15px) scale(1.05); }
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
// DeepWaterCard — Dark translucent card with caustic border patterns
// ============================================================================

function DeepWaterCard({
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
        background: "rgba(2, 11, 24, 0.65)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: glowColor
          ? `1px solid ${glowColor}25`
          : "1px solid rgba(0, 229, 255, 0.06)",
        boxShadow: glowColor
          ? `0 0 20px ${glowColor}08, 0 0 40px rgba(0, 229, 255, 0.03), inset 0 1px 0 rgba(0, 229, 255, 0.04)`
          : "0 4px 24px rgba(0,0,0,0.4), 0 0 30px rgba(0, 229, 255, 0.02), inset 0 1px 0 rgba(0, 229, 255, 0.04)",
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ============================================================================
// BottomBar — Ocean-themed with bioluminescent accents
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
        background: "rgba(2, 11, 24, 0.9)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderTop: "1px solid rgba(0, 229, 255, 0.08)",
      }}
    >
      <div className="mx-auto max-w-3xl flex items-center justify-between px-6 pt-3 pb-2">
        <span className="text-xs text-cyan-400/40">{statusText}</span>
        <button
          onClick={onCta}
          disabled={ctaDisabled}
          className="px-5 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-30"
          style={{
            background: ctaDisabled
              ? "rgba(2, 20, 40, 0.6)"
              : "linear-gradient(135deg, #00E5FF, #0066FF)",
            color: ctaDisabled ? "rgba(0, 229, 255, 0.3)" : "white",
            boxShadow: ctaDisabled ? "none" : "0 0 20px rgba(0, 229, 255, 0.25), 0 0 40px rgba(0, 102, 255, 0.1)",
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
                    style={{ background: isDone ? "rgba(0, 229, 255, 0.5)" : "rgba(0, 229, 255, 0.08)" }}
                  />
                  {isDone && (
                    <div
                      className="absolute inset-0"
                      style={{
                        background: "linear-gradient(90deg, transparent, rgba(0, 229, 255, 0.7), transparent)",
                        animation: "v9bLineShimmer 2s ease-in-out infinite",
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
                      ? "linear-gradient(135deg, #00E5FF, #0066FF)"
                      : isActive
                        ? "rgba(0, 229, 255, 0.15)"
                        : "rgba(2, 20, 40, 0.6)",
                    color: isDone || isActive ? "white" : "rgba(0, 229, 255, 0.3)",
                    border: isActive
                      ? "2px solid rgba(0, 229, 255, 0.5)"
                      : isDone
                        ? "none"
                        : "1px solid rgba(0, 229, 255, 0.1)",
                    boxShadow: isActive
                      ? "0 0 16px rgba(0, 229, 255, 0.25)"
                      : isDone
                        ? "0 0 8px rgba(0, 229, 255, 0.15)"
                        : "none",
                    animation: isActive ? "v9bStepPulse 2s ease-in-out infinite" : "none",
                    cursor: isClickable ? "pointer" : "default",
                  }}
                >
                  {isDone ? <Check className="size-3" /> : i + 1}
                </button>
                <span
                  className="text-[9px] hidden sm:block"
                  style={{ color: isActive ? "#00E5FF" : isDone ? "#0066FF" : "rgba(0, 229, 255, 0.2)" }}
                >
                  {label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <style>{`
        @keyframes v9bStepPulse {
          0%, 100% { box-shadow: 0 0 12px rgba(0, 229, 255, 0.25); }
          50% { box-shadow: 0 0 24px rgba(0, 229, 255, 0.4), 0 0 40px rgba(0, 229, 255, 0.1); }
        }
        @keyframes v9bLineShimmer {
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
                background: "radial-gradient(circle, rgba(0, 229, 255, 0.25) 0%, transparent 70%)",
                animation: "v9bIconGlow 3s ease-in-out infinite",
              }}
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Dive Into Your Journey</h1>
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
                ? "rgba(0, 102, 255, 0.12)"
                : "rgba(0, 102, 255, 0.04)",
              backdropFilter: "blur(8px)",
              border: selectedPath === "fto"
                ? "1px solid rgba(0, 102, 255, 0.4)"
                : "1px solid rgba(0, 102, 255, 0.1)",
              boxShadow: selectedPath === "fto"
                ? "0 0 30px rgba(0, 102, 255, 0.1), inset 0 1px 0 rgba(0, 229, 255, 0.05)"
                : "none",
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="size-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(0, 102, 255, 0.2)" }}
              >
                <Star className="size-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">Find The One</h3>
                <p className="text-xs text-white/40">Connection & commitment</p>
              </div>
              {selectedPath === "fto" && (
                <div style={{ animation: "v9bCheckPop 0.3s ease-out" }}>
                  <Check className="size-5 text-blue-400" />
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
                <span className="text-xs text-blue-400/60 pl-5">
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
                ? "rgba(255, 179, 0, 0.12)"
                : "rgba(255, 179, 0, 0.04)",
              backdropFilter: "blur(8px)",
              border: selectedPath === "abundance"
                ? "1px solid rgba(255, 179, 0, 0.4)"
                : "1px solid rgba(255, 179, 0, 0.1)",
              boxShadow: selectedPath === "abundance"
                ? "0 0 30px rgba(255, 179, 0, 0.1), inset 0 1px 0 rgba(255, 179, 0, 0.05)"
                : "none",
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="size-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255, 179, 0, 0.2)" }}
              >
                <Sparkles className="size-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">Abundance</h3>
                <p className="text-xs text-white/40">Freedom & experience</p>
              </div>
              {selectedPath === "abundance" && (
                <div style={{ animation: "v9bCheckPop 0.3s ease-out" }}>
                  <Check className="size-5 text-amber-400" />
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
                <span className="text-xs text-amber-400/60 pl-5">
                  +{abundanceL1s.length - 3} more paths
                </span>
              )}
            </div>
          </button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px" style={{ background: "rgba(0, 229, 255, 0.06)" }} />
          <span className="text-xs uppercase tracking-wider text-cyan-400/20">Other Life Areas</span>
          <div className="flex-1 h-px" style={{ background: "rgba(0, 229, 255, 0.06)" }} />
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
                    : "1px solid rgba(0, 229, 255, 0.04)",
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
        @keyframes v9bIconGlow {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.5); opacity: 1; }
        }
        @keyframes v9bCheckPop {
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
              const catColor = CATEGORY_COLORS[category] ?? "#00E5FF"

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
                          : "1px solid rgba(0, 229, 255, 0.04)",
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
                    <div className="ml-4 mt-1.5 space-y-1" style={{ animation: "v9bSlideDown 0.25s ease-out" }}>
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

                      {/* Custom goals in this category */}
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

                      {/* Add custom goal button */}
                      <button
                        onClick={() => onAddCustomGoal(category)}
                        className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/5"
                        style={{ border: "1px dashed rgba(0, 229, 255, 0.08)" }}
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
                          ? "rgba(0, 102, 255, 0.06)"
                          : "rgba(255,255,255,0.02)",
                      backdropFilter: "blur(8px)",
                      border:
                        catGoals.length > 0
                          ? "1px solid rgba(0, 102, 255, 0.15)"
                          : "1px solid rgba(0, 229, 255, 0.04)",
                    }}
                  >
                    <button onClick={() => toggleSection(sectionId)} className="shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="size-3.5 text-blue-400/60" />
                      ) : (
                        <ChevronRight className="size-3.5 text-blue-400/60" />
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
                    <div className="ml-4 mt-1.5 space-y-1" style={{ animation: "v9bSlideDown 0.25s ease-out" }}>
                      {catGoals.map((cg) => (
                        <div
                          key={cg.id}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                          style={{
                            background: "rgba(0, 102, 255, 0.06)",
                            border: "1px solid rgba(0, 102, 255, 0.15)",
                          }}
                        >
                          <div
                            className="size-4 rounded flex items-center justify-center shrink-0"
                            style={{ background: "#0066FF" }}
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
                        style={{ border: "1px dashed rgba(0, 229, 255, 0.08)" }}
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
              style={{ border: "1px dashed rgba(0, 102, 255, 0.2)" }}
            >
              <Plus className="size-3.5 text-blue-400/40" />
              <span className="text-sm text-blue-400/40">Add custom category</span>
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
                  <div className="ml-4 mt-1.5 space-y-1" style={{ animation: "v9bSlideDown 0.25s ease-out" }}>
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
                      style={{ border: "1px dashed rgba(0, 229, 255, 0.08)" }}
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
        @keyframes v9bSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

// ============================================================================
// Step 3: Summary (Deep water cards with bioluminescent accents)
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
    none: "#0066FF",
  }

  const sortedBadges = useMemo(
    () => [...badges].sort((a, b) => (TIER_ORDER[a.tier] ?? 4) - (TIER_ORDER[b.tier] ?? 4)),
    [badges]
  )

  return (
    <div className="min-h-screen pt-12 pb-36 px-6">
      <style>{`
        @keyframes v9b-rise-in {
          0% { opacity: 0; transform: translateY(30px) scale(0.95); filter: blur(6px); }
          60% { opacity: 1; transform: translateY(-3px) scale(1.01); filter: blur(0px); }
          80% { transform: translateY(2px) scale(0.995); }
          100% { opacity: 1; transform: translateY(0px) scale(1); filter: blur(0px); }
        }
        .v9b-stagger-enter {
          animation: v9b-rise-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        @keyframes v9b-glow-pulse {
          0%, 100% { box-shadow: 0 0 15px var(--glow-color, rgba(0, 229, 255, 0.1)), inset 0 1px 0 rgba(0, 229, 255, 0.03); }
          50% { box-shadow: 0 0 25px var(--glow-color, rgba(0, 229, 255, 0.2)), inset 0 1px 0 rgba(0, 229, 255, 0.05); }
        }
      `}</style>

      <div className="mx-auto max-w-2xl">
        <div className="text-center mb-8 v9b-stagger-enter">
          <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
            System Ready
          </h2>
          <p className="text-white/30 text-sm">
            {totalGoals} goals across {totalAreas} life area{totalAreas > 1 ? "s" : ""}
            {path && ` · ${path === "fto" ? "Find The One" : "Abundance"} path`}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: "Total Goals", value: String(totalGoals), color: "#00E5FF" },
            { label: "Life Areas", value: String(totalAreas), color: "#0066FF" },
            { label: "Achievements", value: String(sortedBadges.length), color: "#FFB300" },
          ].map((stat, i) => (
            <DeepWaterCard key={stat.label} glowColor={stat.color} className="v9b-stagger-enter" style={{ animationDelay: `${50 + i * 60}ms` }}>
              <div className="p-3 text-center">
                <div className="text-lg font-bold" style={{ color: stat.color }}>
                  {stat.value}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-white/30">
                  {stat.label}
                </div>
              </div>
            </DeepWaterCard>
          ))}
        </div>

        {/* Badges section — sorted by tier */}
        {sortedBadges.length > 0 && (
          <DeepWaterCard className="mb-6 v9b-stagger-enter" glowColor="#FFB300" style={{ animationDelay: "230ms" }}>
            <div
              className="px-5 py-3 flex items-center justify-between"
              style={{ borderBottom: "1px solid rgba(0, 229, 255, 0.04)" }}
            >
              <div className="flex items-center gap-2">
                <Trophy className="size-3.5" style={{ color: "#FFB300" }} />
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
          </DeepWaterCard>
        )}

        {/* Daygame goal groups — per-category colors */}
        {daygameGrouped.map(({ category, goals }, catIdx) => {
          const catColor = CATEGORY_COLORS[category] ?? "#00E5FF"
          return (
            <div key={category} className="mb-3 rounded-xl overflow-hidden v9b-stagger-enter"
              style={{
                animationDelay: `${280 + catIdx * 50}ms`,
                background: "rgba(2, 11, 24, 0.6)",
                backdropFilter: "blur(16px)",
                borderTop: `2px solid ${catColor}40`,
                borderLeft: "1px solid rgba(0, 229, 255, 0.04)",
                borderRight: "1px solid rgba(0, 229, 255, 0.04)",
                borderBottom: "1px solid rgba(0, 229, 255, 0.04)",
                "--glow-color": `${catColor}12`,
                animation: "v9b-glow-pulse 5s ease-in-out infinite",
              } as React.CSSProperties}
            >
              <div className="px-5 py-3 flex items-center justify-between"
                style={{ borderBottom: "1px solid rgba(0, 229, 255, 0.03)" }}
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
                        style={{ background: catColor, boxShadow: `0 0 6px ${catColor}60` }}
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

        {/* Other areas — per-area colors */}
        {otherAreaData.map(({ area, goals }, areaIdx) => (
          <div key={area.id} className="mb-3 rounded-xl overflow-hidden v9b-stagger-enter"
            style={{
              animationDelay: `${380 + areaIdx * 50}ms`,
              background: "rgba(2, 11, 24, 0.6)",
              backdropFilter: "blur(16px)",
              borderTop: `2px solid ${area.hex}40`,
              borderLeft: "1px solid rgba(0, 229, 255, 0.04)",
              borderRight: "1px solid rgba(0, 229, 255, 0.04)",
              borderBottom: "1px solid rgba(0, 229, 255, 0.04)",
              "--glow-color": `${area.hex}12`,
              animation: "v9b-glow-pulse 5s ease-in-out infinite",
            } as React.CSSProperties}
          >
            <div className="px-5 py-3 flex items-center justify-between"
              style={{ borderBottom: "1px solid rgba(0, 229, 255, 0.03)" }}
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
                    style={{ background: area.hex, boxShadow: `0 0 6px ${area.hex}60` }}
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
            const catLabel =
              customCategories.find((c) => c.id === catId)?.name ||
              CATEGORY_LABELS[catId as GoalDisplayCategory] ||
              catId
            return (
              <div key={catId} className="mb-3 rounded-xl overflow-hidden v9b-stagger-enter"
                style={{
                  animationDelay: `${450 + cIdx * 50}ms`,
                  background: "rgba(2, 11, 24, 0.6)",
                  backdropFilter: "blur(16px)",
                  borderTop: "2px solid rgba(0, 102, 255, 0.3)",
                  borderLeft: "1px solid rgba(0, 229, 255, 0.04)",
                  borderRight: "1px solid rgba(0, 229, 255, 0.04)",
                  borderBottom: "1px solid rgba(0, 229, 255, 0.04)",
                  "--glow-color": "rgba(0, 102, 255, 0.12)",
                  animation: "v9b-glow-pulse 5s ease-in-out infinite",
                } as React.CSSProperties}
              >
                <div className="px-5 py-3 flex items-center justify-between"
                  style={{ borderBottom: "1px solid rgba(0, 229, 255, 0.03)" }}
                >
                  <span className="text-sm font-semibold uppercase tracking-wider text-blue-400">
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
                        style={{ background: "#0066FF", boxShadow: "0 0 6px rgba(0, 102, 255, 0.6)" }}
                      />
                      <span className="text-sm text-white/70 flex-1">{g.title}</span>
                      <span className="text-xs font-medium text-blue-400">
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
// Step 4: AbyssalCoreStep — Dramatic bioluminescent orrery with deep-sea effects
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

const CORE_RADIUS = 42
const CENTER = 370
const LURE_TENDRILS = 16

// Orrery-local canvas for ambient deep-sea effects (thermal vents, chain reactions, pressure waves)
function OrreryAmbientCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const timeRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const parent = canvas.parentElement
    if (!parent) return

    const resize = () => {
      const rect = parent.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
    }
    resize()
    window.addEventListener("resize", resize)

    // Thermal vent positions (relative to canvas)
    const vents = [
      { x: 0.15, y: 0.85 },
      { x: 0.82, y: 0.88 },
      { x: 0.5, y: 0.92 },
    ]

    // Vent particles
    interface VentParticle { x: number; y: number; vy: number; vx: number; life: number; maxLife: number; size: number; hue: number }
    const ventParticles: VentParticle[] = []

    // Chain reaction flashes
    interface ChainFlash { x: number; y: number; r: number; maxR: number; life: number; hue: number }
    const chainFlashes: ChainFlash[] = []

    function animate() {
      if (!ctx || !canvas) return
      timeRef.current += 0.016
      const time = timeRef.current
      const w = canvas.width
      const h = canvas.height

      ctx.clearRect(0, 0, w, h)

      // Thermal vent emissions
      for (const vent of vents) {
        if (Math.random() < 0.15) {
          ventParticles.push({
            x: vent.x * w + (Math.random() - 0.5) * 10,
            y: vent.y * h,
            vy: -(Math.random() * 1.5 + 0.5),
            vx: (Math.random() - 0.5) * 0.3,
            life: 0,
            maxLife: Math.random() * 80 + 40,
            size: Math.random() * 3 + 1,
            hue: 180 + Math.random() * 30,
          })
        }

        // Vent base glow
        const vGrad = ctx.createRadialGradient(vent.x * w, vent.y * h, 0, vent.x * w, vent.y * h, 30)
        vGrad.addColorStop(0, `rgba(0, 229, 255, ${0.06 + Math.sin(time * 2) * 0.02})`)
        vGrad.addColorStop(0.5, "rgba(0, 100, 180, 0.02)")
        vGrad.addColorStop(1, "transparent")
        ctx.fillStyle = vGrad
        ctx.fillRect(vent.x * w - 30, vent.y * h - 30, 60, 60)
      }

      // Update vent particles
      for (let i = ventParticles.length - 1; i >= 0; i--) {
        const p = ventParticles[i]
        p.life++
        p.x += p.vx + Math.sin(time * 2 + p.y * 0.02) * 0.3
        p.y += p.vy
        p.vy *= 0.99

        if (p.life >= p.maxLife) { ventParticles.splice(i, 1); continue }

        const fade = 1 - p.life / p.maxLife
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3)
        grd.addColorStop(0, `hsla(${p.hue}, 80%, 70%, ${0.2 * fade})`)
        grd.addColorStop(1, "transparent")
        ctx.fillStyle = grd
        ctx.fillRect(p.x - p.size * 3, p.y - p.size * 3, p.size * 6, p.size * 6)

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * fade, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue}, 90%, 80%, ${0.4 * fade})`
        ctx.fill()
      }

      // Bioluminescent chain reactions (random)
      if (Math.random() < 0.005 && chainFlashes.length < 3) {
        const cx = Math.random() * w
        const cy = Math.random() * h * 0.7 + h * 0.1
        const numChain = Math.floor(Math.random() * 4) + 2
        for (let c = 0; c < numChain; c++) {
          chainFlashes.push({
            x: cx + (Math.random() - 0.5) * 60,
            y: cy + (Math.random() - 0.5) * 40,
            r: 0,
            maxR: Math.random() * 25 + 10,
            life: -c * 8, // staggered start
            hue: 185 + Math.random() * 40,
          })
        }
      }

      for (let i = chainFlashes.length - 1; i >= 0; i--) {
        const f = chainFlashes[i]
        f.life++
        if (f.life < 0) continue // waiting for stagger
        const progress = f.life / 40
        if (progress >= 1) { chainFlashes.splice(i, 1); continue }
        f.r = f.maxR * Math.sin(progress * Math.PI)
        const alpha = (1 - progress) * 0.12

        const fGrad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r)
        fGrad.addColorStop(0, `hsla(${f.hue}, 90%, 80%, ${alpha})`)
        fGrad.addColorStop(0.5, `hsla(${f.hue}, 80%, 60%, ${alpha * 0.4})`)
        fGrad.addColorStop(1, "transparent")
        ctx.fillStyle = fGrad
        ctx.fillRect(f.x - f.r, f.y - f.r, f.r * 2, f.r * 2)
      }

      // Pressure waves (subtle expanding rings from center)
      const wavePhase = time * 0.3
      for (let w2 = 0; w2 < 3; w2++) {
        const waveR = ((wavePhase + w2 * 2) % 6) / 6 * Math.min(w, h) * 0.5
        const waveAlpha = (1 - waveR / (Math.min(w, h) * 0.5)) * 0.015
        if (waveAlpha > 0) {
          ctx.beginPath()
          ctx.arc(w / 2, h / 2, waveR, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(0, 229, 255, ${waveAlpha})`
          ctx.lineWidth = 1.5
          ctx.stroke()
        }
      }

      // Keep vent particles bounded
      if (ventParticles.length > 100) ventParticles.splice(0, ventParticles.length - 100)

      animFrameRef.current = requestAnimationFrame(animate)
    }

    animate()
    return () => {
      window.removeEventListener("resize", resize)
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: "none" }}
    />
  )
}

function AbyssalCoreStep({
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
          <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
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
          {/* Ambient canvas for thermal vents, chain reactions, pressure waves */}
          <OrreryAmbientCanvas />

          <style>{`
            @keyframes v9bCorePulse {
              0%, 100% { filter: drop-shadow(0 0 25px rgba(0, 229, 255, 0.8)) drop-shadow(0 0 50px rgba(0, 229, 255, 0.35)) drop-shadow(0 0 80px rgba(0, 100, 200, 0.15)); }
              50% { filter: drop-shadow(0 0 40px rgba(0, 229, 255, 1)) drop-shadow(0 0 80px rgba(0, 229, 255, 0.6)) drop-shadow(0 0 120px rgba(0, 100, 200, 0.25)); }
            }
            @keyframes v9bCoreBreathe {
              0%, 100% { r: ${CORE_RADIUS}; }
              50% { r: ${CORE_RADIUS + 2}; }
            }
            @keyframes v9bTendrilRotate {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes v9bTendrilRotateReverse {
              from { transform: rotate(360deg); }
              to { transform: rotate(0deg); }
            }
            @keyframes v9bTendrilRotateSlow {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes v9bTendrilPulse {
              0%, 100% { opacity: 0.15; }
              50% { opacity: 0.6; }
            }
            @keyframes v9bTendrilWave {
              0%, 100% { opacity: 0.1; stroke-width: 0.8; }
              50% { opacity: 0.5; stroke-width: 1.5; }
            }
            @keyframes v9bOrganismBreathe {
              0%, 100% { transform: scale(1); opacity: 0.2; }
              50% { transform: scale(1.1); opacity: 0.35; }
            }
            @keyframes v9bOrganismPulse {
              0%, 100% { filter: drop-shadow(0 0 6px currentColor); }
              50% { filter: drop-shadow(0 0 14px currentColor); }
            }
            @keyframes v9bBubbleFloat {
              0% { opacity: 0.4; transform: translateY(0); }
              50% { opacity: 0.8; }
              100% { opacity: 0; transform: translateY(-12px); }
            }
            @keyframes v9bCurrentFlow {
              0% { stroke-dashoffset: 0; }
              100% { stroke-dashoffset: -60; }
            }
            @keyframes v9bCurrentFlowReverse {
              0% { stroke-dashoffset: 0; }
              100% { stroke-dashoffset: 60; }
            }
            @keyframes v9bRingPulse {
              0%, 100% { stroke-opacity: 0.04; }
              50% { stroke-opacity: 0.1; }
            }
            @keyframes v9bSporeFloat {
              0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
              25% { transform: translateY(-3px) translateX(1px); opacity: 0.6; }
              50% { transform: translateY(-1px) translateX(-2px); opacity: 0.4; }
              75% { transform: translateY(2px) translateX(1px); opacity: 0.5; }
            }
            ${visibleAreas
              .map((area) => {
                const config = ORBIT_CONFIG[area.id]
                if (!config) return ""
                return `
                @keyframes v9borbit-${area.id} {
                  from { transform: rotate(${config.startAngle}deg); }
                  to { transform: rotate(${config.startAngle + 360}deg); }
                }
                @keyframes v9bcounter-orbit-${area.id} {
                  from { transform: rotate(-${config.startAngle}deg); }
                  to { transform: rotate(-${config.startAngle + 360}deg); }
                }
              `
              })
              .join("\n")}
          `}</style>

          <svg
            viewBox={`0 0 ${viewSize} ${viewSize}`}
            className="w-full h-full relative"
            style={{ overflow: "visible" }}
          >
            <defs>
              {/* Enhanced core gradient with multiple luminous layers */}
              <radialGradient id="v9b-core-gradient" cx="40%" cy="38%">
                <stop offset="0%" stopColor="#f0ffff" />
                <stop offset="8%" stopColor="#b0f0ff" />
                <stop offset="18%" stopColor="#00E5FF" />
                <stop offset="35%" stopColor="#0099dd" />
                <stop offset="55%" stopColor="#005588" />
                <stop offset="80%" stopColor="#003355" />
                <stop offset="100%" stopColor="#001a33" />
              </radialGradient>
              <radialGradient id="v9b-core-glow">
                <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.7" />
                <stop offset="20%" stopColor="#0088dd" stopOpacity="0.35" />
                <stop offset="40%" stopColor="#0066FF" stopOpacity="0.15" />
                <stop offset="65%" stopColor="#003366" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#001a33" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="v9b-lure-glow">
                <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.45" />
                <stop offset="25%" stopColor="#0099cc" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#0066aa" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#003366" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="v9b-core-inner-glow">
                <stop offset="0%" stopColor="#e0ffff" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#80DEEA" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
              </radialGradient>
              {/* Organism (planet) gradients per area */}
              {visibleAreas.map((area) => (
                <radialGradient key={`grad-${area.id}`} id={`v9b-org-${area.id}`} cx="35%" cy="35%">
                  <stop offset="0%" stopColor="#e0ffff" stopOpacity="0.7" />
                  <stop offset="20%" stopColor={area.hex} stopOpacity="0.9" />
                  <stop offset="50%" stopColor={area.hex} stopOpacity="0.6" />
                  <stop offset="80%" stopColor={area.hex} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={area.hex} stopOpacity="0.1" />
                </radialGradient>
              ))}
              <filter id="v9b-organism-glow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="blur" />
                <feFlood floodOpacity="0.6" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="v9b-active-glow" x="-120%" y="-120%" width="340%" height="340%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="10" result="blur" />
                <feFlood floodOpacity="0.8" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="v9b-core-blur" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" />
              </filter>
            </defs>

            {/* Ambient floating spores / deep-sea snow */}
            {Array.from({ length: 20 }).map((_, i) => {
              const sx = 50 + Math.sin(i * 1.7) * 280 + Math.cos(i * 0.9) * 100
              const sy = 60 + Math.cos(i * 2.1) * 250 + Math.sin(i * 0.6) * 120
              return (
                <circle
                  key={`spore-${i}`}
                  cx={sx}
                  cy={sy}
                  r={0.8 + (i % 3) * 0.3}
                  fill="#80DEEA"
                  fillOpacity={0.15}
                  style={{
                    animation: `v9bSporeFloat ${4 + (i % 5) * 1.2}s ease-in-out infinite ${i * 0.7}s`,
                  }}
                />
              )
            })}

            {/* Ocean current orbit rings with flowing particle streams */}
            {visibleAreas.map((area) => {
              const config = ORBIT_CONFIG[area.id]
              if (!config) return null
              const isActive = activeAreas.has(area.id)
              const isHovered = hoveredPlanet === area.id
              const circumference = 2 * Math.PI * config.radius

              return (
                <g key={`orbit-${area.id}`}>
                  {/* Outer diffuse current glow */}
                  {isActive && (
                    <circle
                      cx={CENTER}
                      cy={CENTER}
                      r={config.radius}
                      fill="none"
                      stroke={area.hex}
                      strokeWidth="6"
                      strokeOpacity="0.02"
                      style={{ animation: "v9bRingPulse 5s ease-in-out infinite" }}
                    />
                  )}
                  {/* Main current line */}
                  <circle
                    cx={CENTER}
                    cy={CENTER}
                    r={config.radius}
                    fill="none"
                    stroke={isActive ? area.hex : "rgba(0, 229, 255, 0.04)"}
                    strokeWidth={isHovered ? 2 : isActive ? 1 : 0.3}
                    strokeOpacity={isActive ? 0.25 : 0.06}
                    strokeDasharray={isActive ? "none" : "3,10"}
                    className="transition-all duration-300"
                  />
                  {/* Animated flowing current dashes (visible water flow) */}
                  {isActive && (
                    <>
                      <circle
                        cx={CENTER}
                        cy={CENTER}
                        r={config.radius}
                        fill="none"
                        stroke={area.hex}
                        strokeWidth="1.5"
                        strokeOpacity="0.12"
                        strokeDasharray={`${circumference * 0.08},${circumference * 0.12}`}
                        style={{
                          animation: `v9bCurrentFlow ${config.duration * 0.5}s linear infinite`,
                        }}
                      />
                      {/* Second counter-flowing current layer */}
                      <circle
                        cx={CENTER}
                        cy={CENTER}
                        r={config.radius + 2}
                        fill="none"
                        stroke={area.hex}
                        strokeWidth="0.5"
                        strokeOpacity="0.06"
                        strokeDasharray={`${circumference * 0.04},${circumference * 0.2}`}
                        style={{
                          animation: `v9bCurrentFlowReverse ${config.duration * 0.8}s linear infinite`,
                        }}
                      />
                      {/* Flowing bioluminescent particles carried by current (12 per orbit) */}
                      {Array.from({ length: 12 }).map((_, pi) => {
                        const angle = (pi / 12) * 360
                        const rad = (angle * Math.PI) / 180
                        const px = CENTER + Math.cos(rad) * config.radius
                        const py = CENTER + Math.sin(rad) * config.radius
                        return (
                          <g key={`current-particle-${area.id}-${pi}`}>
                            <circle
                              cx={px}
                              cy={py}
                              r={1.2 + (pi % 3) * 0.3}
                              fill={area.hex}
                              fillOpacity={0.2 + (pi % 4) * 0.05}
                              style={{
                                transformOrigin: `${CENTER}px ${CENTER}px`,
                                animation: `v9borbit-${area.id} ${config.duration * (0.6 + (pi % 3) * 0.1)}s linear infinite`,
                              }}
                            />
                            {/* Glow trail behind particle */}
                            <circle
                              cx={px}
                              cy={py}
                              r={3 + (pi % 2) * 1.5}
                              fill={area.hex}
                              fillOpacity={0.04}
                              style={{
                                transformOrigin: `${CENTER}px ${CENTER}px`,
                                animation: `v9borbit-${area.id} ${config.duration * (0.6 + (pi % 3) * 0.1)}s linear infinite`,
                              }}
                            />
                          </g>
                        )
                      })}
                    </>
                  )}
                </g>
              )
            })}

            {/* Outer tendril layer — long sinuous bioluminescent filaments reaching outward */}
            <g
              style={{
                transformOrigin: `${CENTER}px ${CENTER}px`,
                animation: "v9bTendrilRotateSlow 120s linear infinite",
              }}
            >
              {Array.from({ length: 8 }).map((_, i) => {
                const angle = (i / 8) * 360
                const rad = (angle * Math.PI) / 180
                const innerR = CORE_RADIUS * 2
                const outerR = CORE_RADIUS * 2.5 + (i % 3) * 8
                const midR = (innerR + outerR) / 2
                const sway = ((i % 2 === 0 ? 1 : -1) * 8)
                const cp1x = CENTER + Math.cos(rad) * midR + Math.sin(rad) * sway
                const cp1y = CENTER + Math.sin(rad) * midR - Math.cos(rad) * sway
                return (
                  <path
                    key={`outer-tendril-${i}`}
                    d={`M ${CENTER + Math.cos(rad) * innerR} ${CENTER + Math.sin(rad) * innerR}
                        Q ${cp1x} ${cp1y}
                          ${CENTER + Math.cos(rad) * outerR} ${CENTER + Math.sin(rad) * outerR}`}
                    fill="none"
                    stroke="#00B8D4"
                    strokeWidth={0.6}
                    strokeLinecap="round"
                    style={{ animation: `v9bTendrilWave ${5 + (i % 3) * 1.5}s ease-in-out infinite ${i * 0.4}s` }}
                  />
                )
              })}
            </g>

            {/* Main tendril ring — rotating bioluminescent filaments with organic curves */}
            <g
              style={{
                transformOrigin: `${CENTER}px ${CENTER}px`,
                animation: "v9bTendrilRotate 55s linear infinite",
              }}
            >
              {Array.from({ length: LURE_TENDRILS }).map((_, i) => {
                const angle = (i / LURE_TENDRILS) * 360
                const rad = (angle * Math.PI) / 180
                const innerR = CORE_RADIUS + 4
                const outerR = CORE_RADIUS + 18 + (i % 4) * 8
                const midR = (innerR + outerR) * 0.55
                // Curved tendrils (bezier) instead of straight lines
                const sway = (i % 2 === 0 ? 1 : -1) * (5 + (i % 3) * 3)
                const cp1x = CENTER + Math.cos(rad) * midR + Math.sin(rad) * sway
                const cp1y = CENTER + Math.sin(rad) * midR - Math.cos(rad) * sway
                return (
                  <g key={`tendril-${i}`}>
                    <path
                      d={`M ${CENTER + Math.cos(rad) * innerR} ${CENTER + Math.sin(rad) * innerR}
                          Q ${cp1x} ${cp1y}
                            ${CENTER + Math.cos(rad) * outerR} ${CENTER + Math.sin(rad) * outerR}`}
                      fill="none"
                      stroke="#00E5FF"
                      strokeWidth={i % 3 === 0 ? 1.8 : i % 2 === 0 ? 1.2 : 0.6}
                      strokeLinecap="round"
                      style={{ animation: `v9bTendrilPulse ${2.5 + (i % 4) * 0.7}s ease-in-out infinite ${i * 0.25}s` }}
                    />
                    {/* Glowing tip at end of tendril */}
                    <circle
                      cx={CENTER + Math.cos(rad) * outerR}
                      cy={CENTER + Math.sin(rad) * outerR}
                      r={1.5 + (i % 2)}
                      fill="#80DEEA"
                      fillOpacity="0.4"
                      style={{ animation: `v9bTendrilPulse ${2 + (i % 3)}s ease-in-out infinite ${i * 0.3}s` }}
                    />
                  </g>
                )
              })}
            </g>

            {/* Counter-rotating inner tendril ring */}
            <g
              style={{
                transformOrigin: `${CENTER}px ${CENTER}px`,
                animation: "v9bTendrilRotateReverse 40s linear infinite",
              }}
            >
              {Array.from({ length: 10 }).map((_, i) => {
                const angle = (i / 10) * 360 + 18
                const rad = (angle * Math.PI) / 180
                const innerR = CORE_RADIUS + 2
                const outerR = CORE_RADIUS + 10 + (i % 3) * 4
                const sway = (i % 2 === 0 ? -1 : 1) * 4
                const midR = (innerR + outerR) / 2
                const cpx = CENTER + Math.cos(rad) * midR + Math.sin(rad) * sway
                const cpy = CENTER + Math.sin(rad) * midR - Math.cos(rad) * sway
                return (
                  <path
                    key={`tendril-inner-${i}`}
                    d={`M ${CENTER + Math.cos(rad) * innerR} ${CENTER + Math.sin(rad) * innerR}
                        Q ${cpx} ${cpy}
                          ${CENTER + Math.cos(rad) * outerR} ${CENTER + Math.sin(rad) * outerR}`}
                    fill="none"
                    stroke="#80DEEA"
                    strokeWidth={0.8 + (i % 2) * 0.4}
                    strokeLinecap="round"
                    style={{ animation: `v9bTendrilPulse ${3 + (i % 3)}s ease-in-out infinite ${i * 0.4}s` }}
                  />
                )
              })}
            </g>

            {/* Core glow layers — more dramatic with multiple radii */}
            <circle cx={CENTER} cy={CENTER} r={CORE_RADIUS * 4} fill="url(#v9b-lure-glow)" style={{ animation: "v9bRingPulse 6s ease-in-out infinite" }} />
            <circle cx={CENTER} cy={CENTER} r={CORE_RADIUS * 2.5} fill="url(#v9b-core-glow)" />
            <circle cx={CENTER} cy={CENTER} r={CORE_RADIUS * 1.6} fill="url(#v9b-core-inner-glow)" />

            {/* Bioluminescent wave rings emanating from core */}
            {[1.3, 1.7, 2.2].map((mult, wi) => (
              <circle
                key={`wave-ring-${wi}`}
                cx={CENTER}
                cy={CENTER}
                r={CORE_RADIUS * mult}
                fill="none"
                stroke="#00E5FF"
                strokeWidth="0.6"
                strokeOpacity="0.06"
                strokeDasharray="4,8"
                style={{
                  animation: `v9bRingPulse ${4 + wi * 1.5}s ease-in-out infinite ${wi * 0.8}s`,
                }}
              />
            ))}

            {/* Core body (bioluminescent orb) — dramatic multi-layer */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={CORE_RADIUS + 3}
              fill="none"
              stroke="#00E5FF"
              strokeWidth="1"
              strokeOpacity="0.15"
              filter="url(#v9b-core-blur)"
              style={{ animation: "v9bCorePulse 4s ease-in-out infinite" }}
            />
            <circle
              cx={CENTER}
              cy={CENTER}
              r={CORE_RADIUS}
              fill="url(#v9b-core-gradient)"
              style={{ animation: "v9bCorePulse 4s ease-in-out infinite" }}
            />
            {/* Internal structure rings (like deep-sea organism organelles) */}
            <circle cx={CENTER} cy={CENTER} r={CORE_RADIUS * 0.75} fill="none" stroke="#80DEEA" strokeWidth="0.5" strokeOpacity="0.25" strokeDasharray="3,5" style={{ animation: "v9bTendrilRotate 20s linear infinite", transformOrigin: `${CENTER}px ${CENTER}px` }} />
            <circle cx={CENTER} cy={CENTER} r={CORE_RADIUS * 0.5} fill="none" stroke="#B2EBF2" strokeWidth="0.4" strokeOpacity="0.2" strokeDasharray="2,4" style={{ animation: "v9bTendrilRotateReverse 15s linear infinite", transformOrigin: `${CENTER}px ${CENTER}px` }} />
            <circle cx={CENTER} cy={CENTER} r={CORE_RADIUS * 0.3} fill="none" stroke="#e0ffff" strokeWidth="0.3" strokeOpacity="0.15" />
            {/* Bright center spot (nucleus) */}
            <circle cx={CENTER - 4} cy={CENTER - 4} r={CORE_RADIUS * 0.18} fill="#e0ffff" fillOpacity="0.35" />
            <circle cx={CENTER - 2} cy={CENTER - 2} r={CORE_RADIUS * 0.08} fill="white" fillOpacity="0.5" />

            <text
              x={CENTER}
              y={CENTER + 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#e0ffff"
              fontSize="8"
              fontWeight="700"
              letterSpacing="0.8"
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              YOUR VISION
            </text>

            {/* Bioluminescent organisms (planets) — translucent deep-sea creatures */}
            {visibleAreas.map((area) => {
              const config = ORBIT_CONFIG[area.id]
              if (!config) return null
              const isActive = activeAreas.has(area.id)
              const isHovered = hoveredPlanet === area.id
              const count = goalCounts[area.id] ?? 0
              const ps = config.planetSize

              // Bubble trail geometry
              const trailGradId = `v9b-trail-${area.id}`
              const numBubbles = 7

              return (
                <g
                  key={`organism-${area.id}`}
                  style={{
                    transformOrigin: `${CENTER}px ${CENTER}px`,
                    animation: `v9borbit-${area.id} ${config.duration}s linear infinite`,
                  }}
                >
                  <g
                    style={{
                      transformOrigin: `${CENTER}px ${CENTER - config.radius}px`,
                      animation: `v9bcounter-orbit-${area.id} ${config.duration}s linear infinite`,
                    }}
                  >
                    {/* Bubble trail with physics (active only) */}
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
                          animation: `v9borbit-${area.id} ${config.duration}s linear infinite`,
                        }}>
                          {/* Wake trail */}
                          {(() => {
                            const trailPoints: string[] = []
                            for (let t = 0; t <= 50; t += 2) {
                              const ang = -(t * Math.PI) / 180
                              const tx = CENTER + Math.sin(ang) * config.radius
                              const ty = CENTER - Math.cos(ang) * config.radius
                              trailPoints.push(t === 0 ? `M${tx},${ty}` : `L${tx},${ty}`)
                            }
                            return (
                              <path
                                d={trailPoints.join(" ")}
                                fill="none"
                                stroke={`url(#${trailGradId})`}
                                strokeWidth={ps * 0.6}
                                strokeLinecap="round"
                                opacity={0.25}
                              />
                            )
                          })()}
                          {/* Detailed individual bubbles with varying sizes and wobble */}
                          {Array.from({ length: numBubbles }).map((_, bi) => {
                            const bAngle = -((bi * 8 + 4) * Math.PI) / 180
                            const wobbleX = (bi % 2 === 0 ? 1 : -1) * (2 + bi * 0.5)
                            const wobbleY = -(bi * 1.5)
                            const bx = CENTER + Math.sin(bAngle) * config.radius + wobbleX
                            const by = CENTER - Math.cos(bAngle) * config.radius + wobbleY
                            const br = 2 - bi * 0.2
                            return (
                              <g key={`bubble-${area.id}-${bi}`}>
                                {/* Bubble body */}
                                <circle
                                  cx={bx}
                                  cy={by}
                                  r={br}
                                  fill="none"
                                  stroke={area.hex}
                                  strokeWidth="0.6"
                                  strokeOpacity={0.35 - bi * 0.04}
                                  style={{
                                    animation: `v9bBubbleFloat ${2.5 + bi * 0.4}s ease-in-out infinite ${bi * 0.3}s`,
                                  }}
                                />
                                {/* Highlight on bubble */}
                                <circle
                                  cx={bx - br * 0.3}
                                  cy={by - br * 0.3}
                                  r={br * 0.3}
                                  fill="#e0ffff"
                                  fillOpacity={0.2 - bi * 0.02}
                                  style={{
                                    animation: `v9bBubbleFloat ${2.5 + bi * 0.4}s ease-in-out infinite ${bi * 0.3}s`,
                                  }}
                                />
                              </g>
                            )
                          })}
                        </g>
                      </>
                    )}

                    {/* Hover hit area */}
                    <circle
                      cx={CENTER}
                      cy={CENTER - config.radius}
                      r={ps + 14}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredPlanet(area.id)}
                      onMouseLeave={() => setHoveredPlanet(null)}
                    />

                    {/* Organism aura (translucent outer membrane) */}
                    {isActive && (
                      <circle
                        cx={CENTER}
                        cy={CENTER - config.radius}
                        r={ps + 8}
                        fill={area.hex}
                        fillOpacity="0.03"
                        stroke={area.hex}
                        strokeWidth="0.5"
                        strokeOpacity="0.08"
                        style={{
                          animation: `v9bOrganismPulse 3s ease-in-out infinite`,
                          color: area.hex,
                        }}
                      />
                    )}

                    {/* Organism glowing edge ring (cell membrane) */}
                    <circle
                      cx={CENTER}
                      cy={CENTER - config.radius}
                      r={ps + 4}
                      fill="none"
                      stroke={area.hex}
                      strokeWidth={isActive ? 1.5 : 0.4}
                      strokeOpacity={isActive ? 0.4 : 0.06}
                      strokeDasharray={isActive ? "none" : "2,4"}
                      className="transition-all duration-300"
                    />

                    {/* Organism body (translucent with internal gradient) */}
                    <circle
                      cx={CENTER}
                      cy={CENTER - config.radius}
                      r={ps}
                      fill={isActive ? `url(#v9b-org-${area.id})` : area.hex}
                      fillOpacity={isActive ? 1 : 0.12}
                      filter={
                        isActive
                          ? isHovered
                            ? "url(#v9b-active-glow)"
                            : "url(#v9b-organism-glow)"
                          : undefined
                      }
                      className="transition-all duration-300"
                      style={
                        !isActive
                          ? {
                              transformOrigin: `${CENTER}px ${CENTER - config.radius}px`,
                              animation: "v9bOrganismBreathe 4s ease-in-out infinite",
                            }
                          : undefined
                      }
                    />

                    {/* Internal structure visible through translucent body (organelles) */}
                    {isActive && (
                      <>
                        {/* Nucleus */}
                        <circle
                          cx={CENTER - ps * 0.12}
                          cy={CENTER - config.radius - ps * 0.08}
                          r={ps * 0.3}
                          fill={area.hex}
                          fillOpacity="0.3"
                          stroke="#e0ffff"
                          strokeWidth="0.4"
                          strokeOpacity="0.2"
                        />
                        {/* Internal membrane rings */}
                        <circle
                          cx={CENTER}
                          cy={CENTER - config.radius}
                          r={ps * 0.6}
                          fill="none"
                          stroke="#e0ffff"
                          strokeWidth="0.3"
                          strokeOpacity="0.1"
                          strokeDasharray="2,3"
                        />
                        {/* Bioluminescent spots (photophores) */}
                        {Array.from({ length: 4 }).map((_, si) => {
                          const sAngle = (si / 4) * Math.PI * 2
                          const sr = ps * 0.45
                          return (
                            <circle
                              key={`photophore-${area.id}-${si}`}
                              cx={CENTER + Math.cos(sAngle) * sr}
                              cy={CENTER - config.radius + Math.sin(sAngle) * sr}
                              r={1.5}
                              fill="#e0ffff"
                              fillOpacity="0.25"
                              style={{
                                animation: `v9bTendrilPulse ${2 + si * 0.5}s ease-in-out infinite ${si * 0.3}s`,
                              }}
                            />
                          )
                        })}
                      </>
                    )}

                    {/* Bioluminescent highlight (specular) */}
                    <circle
                      cx={CENTER - ps * 0.25}
                      cy={CENTER - config.radius - ps * 0.25}
                      r={ps * 0.25}
                      fill={isActive ? "#e0ffff" : area.hex}
                      fillOpacity={isActive ? 0.25 : 0.04}
                    />

                    {/* Label */}
                    <text
                      x={CENTER}
                      y={CENTER - config.radius + ps + 16}
                      textAnchor="middle"
                      fill={
                        isActive
                          ? isHovered
                            ? "#fff"
                            : "rgba(255,255,255,0.85)"
                          : "rgba(255,255,255,0.18)"
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
                          cx={CENTER + ps - 2}
                          cy={CENTER - config.radius - ps + 2}
                          r={7}
                          fill="rgba(2, 11, 24, 0.88)"
                          stroke={area.hex}
                          strokeWidth="0.8"
                        />
                        <text
                          x={CENTER + ps - 2}
                          y={CENTER - config.radius - ps + 2.5}
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
                          y={CENTER - config.radius - ps - 32}
                          width={110}
                          height={22}
                          rx={6}
                          fill="rgba(2, 11, 24, 0.93)"
                          stroke={area.hex}
                          strokeWidth="0.6"
                          strokeOpacity="0.5"
                        />
                        <text
                          x={CENTER}
                          y={CENTER - config.radius - ps - 18}
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

        {/* Badges grid — sorted by tier */}
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
                            : "#0066FF"

                  return (
                    <DeepWaterCard key={badge.badgeId} glowColor={tierColor}>
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
                    </DeepWaterCard>
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
              background: "linear-gradient(135deg, #00E5FF, #0066FF)",
              color: "white",
              boxShadow:
                "0 0 20px rgba(0, 229, 255, 0.3), 0 0 40px rgba(0, 102, 255, 0.15)",
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

export default function V9B() {
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
      <OceanBackground />

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
          <AbyssalCoreStep
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
