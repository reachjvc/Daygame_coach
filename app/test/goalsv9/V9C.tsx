"use client"

/**
 * V9C: Aurora Borealis — Visual Redesign of V8
 *
 * Visual: Canvas-based aurora simulation, aurora-ribbon orbits,
 * atmospheric planet halos, aurora-tinted glassmorphism.
 * Functional logic: identical to V8.
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
// Aurora Background (Canvas-based aurora borealis simulation)
// ============================================================================

function AuroraBackground({ stepIndex }: { stepIndex: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const timeRef = useRef(0)
  const stepRef = useRef(stepIndex)

  useEffect(() => {
    stepRef.current = stepIndex
  }, [stepIndex])

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

    // --- Stars with color variety ---
    const stars: { x: number; y: number; size: number; twinkleSpeed: number; phase: number; r: number; g: number; b: number }[] = []
    for (let i = 0; i < 350; i++) {
      // Star color variety: mostly white-blue, some warm
      const temp = Math.random()
      let r = 200, g = 220, b = 255
      if (temp < 0.1) { r = 255; g = 220; b = 180 } // warm yellow
      else if (temp < 0.15) { r = 255; g = 180; b = 180 } // reddish
      else if (temp < 0.3) { r = 180; g = 200; b = 255 } // blue
      stars.push({
        x: Math.random(),
        y: Math.random() * 0.78,
        size: Math.random() < 0.05 ? Math.random() * 2.5 + 1.5 : Math.random() * 1.5 + 0.2,
        twinkleSpeed: Math.random() * 0.03 + 0.005,
        phase: Math.random() * Math.PI * 2,
        r, g, b,
      })
    }

    // --- Shooting stars / meteors ---
    interface ShootingStar { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; brightness: number }
    const shootingStars: ShootingStar[] = []
    let nextShootingTime = 120

    // --- Frost particles floating in air ---
    const frostParticles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number; phase: number }[] = []
    for (let i = 0; i < 60; i++) {
      frostParticles.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.0002,
        vy: -Math.random() * 0.0001 - 0.00005,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.3 + 0.05,
        phase: Math.random() * Math.PI * 2,
      })
    }

    // --- Aurora curtain parameters (8 curtains, wider, more colorful) ---
    const curtains = [
      { baseX: 0.05, color1: [0, 255, 127], color2: [0, 230, 118], color3: [100, 255, 200], width: 0.35, speed: 0.0004, waveAmp: 80, waveFreq: 0.003, vertShift: 0 },
      { baseX: 0.20, color1: [80, 255, 160], color2: [0, 200, 100], color3: [150, 255, 220], width: 0.30, speed: 0.00035, waveAmp: 70, waveFreq: 0.0035, vertShift: 0.02 },
      { baseX: 0.35, color1: [124, 77, 255], color2: [83, 109, 254], color3: [180, 140, 255], width: 0.28, speed: 0.0003, waveAmp: 65, waveFreq: 0.004, vertShift: 0.01 },
      { baseX: 0.48, color1: [200, 80, 255], color2: [160, 50, 220], color3: [230, 150, 255], width: 0.25, speed: 0.00045, waveAmp: 55, waveFreq: 0.0045, vertShift: 0.03 },
      { baseX: 0.58, color1: [255, 64, 129], color2: [245, 0, 87], color3: [255, 130, 180], width: 0.30, speed: 0.00038, waveAmp: 75, waveFreq: 0.003, vertShift: 0.01 },
      { baseX: 0.72, color1: [0, 200, 255], color2: [0, 150, 220], color3: [100, 220, 255], width: 0.26, speed: 0.0005, waveAmp: 60, waveFreq: 0.005, vertShift: 0.02 },
      { baseX: 0.82, color1: [0, 200, 83], color2: [105, 240, 174], color3: [50, 255, 130], width: 0.22, speed: 0.00042, waveAmp: 50, waveFreq: 0.006, vertShift: 0 },
      { baseX: 0.93, color1: [180, 100, 255], color2: [120, 60, 200], color3: [210, 170, 255], width: 0.20, speed: 0.0006, waveAmp: 45, waveFreq: 0.005, vertShift: 0.015 },
    ]

    // --- Mountain profile points (smoother, more peaks) ---
    const mountainProfile = [
      0, 0.88,  0.03, 0.86,  0.06, 0.83,  0.09, 0.85,  0.12, 0.81,
      0.16, 0.84,  0.20, 0.79,  0.24, 0.82,  0.28, 0.77,  0.32, 0.80,
      0.36, 0.83,  0.40, 0.78,  0.44, 0.81,  0.48, 0.76,  0.52, 0.80,
      0.56, 0.82,  0.60, 0.79,  0.64, 0.83,  0.68, 0.78,  0.72, 0.81,
      0.76, 0.77,  0.80, 0.80,  0.84, 0.82,  0.88, 0.79,  0.92, 0.84,
      0.96, 0.81,  1.0, 0.83,
    ]

    // Pre-compute tree positions (stable, no Math.random in draw loop)
    const treeData: { x: number; baseY: number; heights: number[] }[] = []
    for (let i = 0; i < 25; i++) {
      const tx = i / 24
      // Interpolate mountain y at tx
      let baseY = 0.82
      for (let p = 0; p < mountainProfile.length - 2; p += 2) {
        const px = mountainProfile[p], py = mountainProfile[p + 1]
        const nx = mountainProfile[p + 2], ny = mountainProfile[p + 3]
        if (tx >= px && tx <= nx) {
          const frac = (tx - px) / (nx - px)
          baseY = py + (ny - py) * frac
          break
        }
      }
      const heights: number[] = []
      for (let j = 0; j < 4; j++) {
        heights.push(14 + Math.sin(tx * 37 + j * 7.3) * 6)
      }
      treeData.push({ x: tx, baseY, heights })
    }

    // Simple 2D noise function
    function noise(x: number, y: number): number {
      const xi = Math.floor(x) & 255
      const yi = Math.floor(y) & 255
      const xf = x - Math.floor(x)
      const yf = y - Math.floor(y)
      const u = xf * xf * (3 - 2 * xf)
      const v = yf * yf * (3 - 2 * yf)
      const a = Math.sin(xi * 174.3 + yi * 281.7) * 43758.5453 % 1
      const b = Math.sin((xi + 1) * 174.3 + yi * 281.7) * 43758.5453 % 1
      const c = Math.sin(xi * 174.3 + (yi + 1) * 281.7) * 43758.5453 % 1
      const d = Math.sin((xi + 1) * 174.3 + (yi + 1) * 281.7) * 43758.5453 % 1
      return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v
    }

    // Layered noise for richer aurora patterns
    function fbm(x: number, y: number): number {
      return noise(x, y) * 0.5 + noise(x * 2.1, y * 2.1) * 0.3 + noise(x * 4.3, y * 4.3) * 0.2
    }

    function animate() {
      if (!ctx || !canvas) return
      const w = canvas.width
      const h = canvas.height
      timeRef.current += 1

      const t = timeRef.current

      // Dark sky gradient — deeper night
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h)
      skyGrad.addColorStop(0, "#010510")
      skyGrad.addColorStop(0.25, "#020a18")
      skyGrad.addColorStop(0.5, "#050d1a")
      skyGrad.addColorStop(0.7, "#060e16")
      skyGrad.addColorStop(0.85, "#0a1218")
      skyGrad.addColorStop(1, "#080c12")
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, w, h)

      // --- Moon ---
      const moonX = w * 0.82
      const moonY = h * 0.12
      const moonR = 18
      // Moon glow
      const moonGlow = ctx.createRadialGradient(moonX, moonY, moonR * 0.5, moonX, moonY, moonR * 6)
      moonGlow.addColorStop(0, "rgba(200, 220, 255, 0.08)")
      moonGlow.addColorStop(0.3, "rgba(180, 200, 240, 0.04)")
      moonGlow.addColorStop(1, "rgba(180, 200, 240, 0)")
      ctx.fillStyle = moonGlow
      ctx.fillRect(moonX - moonR * 6, moonY - moonR * 6, moonR * 12, moonR * 12)
      // Moon body
      ctx.beginPath()
      ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2)
      ctx.fillStyle = "rgba(220, 230, 245, 0.85)"
      ctx.fill()
      // Moon craters (subtle)
      ctx.beginPath()
      ctx.arc(moonX - 5, moonY - 3, 4, 0, Math.PI * 2)
      ctx.fillStyle = "rgba(190, 200, 220, 0.5)"
      ctx.fill()
      ctx.beginPath()
      ctx.arc(moonX + 4, moonY + 5, 3, 0, Math.PI * 2)
      ctx.fillStyle = "rgba(190, 200, 220, 0.4)"
      ctx.fill()
      ctx.beginPath()
      ctx.arc(moonX - 2, moonY + 7, 2.5, 0, Math.PI * 2)
      ctx.fillStyle = "rgba(190, 200, 220, 0.35)"
      ctx.fill()

      // --- Stars with proper twinkling ---
      for (const star of stars) {
        const flicker = Math.sin(t * star.twinkleSpeed + star.phase) *
                        Math.sin(t * star.twinkleSpeed * 0.7 + star.phase * 1.3)
        const brightness = 0.2 + 0.8 * Math.abs(flicker)
        const sx = star.x * w
        const sy = star.y * h
        // Bright stars get a subtle cross-spike glow
        if (star.size > 1.5) {
          ctx.globalAlpha = brightness * 0.15
          ctx.strokeStyle = `rgb(${star.r}, ${star.g}, ${star.b})`
          ctx.lineWidth = 0.5
          ctx.beginPath()
          ctx.moveTo(sx - star.size * 3, sy)
          ctx.lineTo(sx + star.size * 3, sy)
          ctx.moveTo(sx, sy - star.size * 3)
          ctx.lineTo(sx, sy + star.size * 3)
          ctx.stroke()
          ctx.globalAlpha = 1
        }
        ctx.beginPath()
        ctx.arc(sx, sy, star.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${star.r}, ${star.g}, ${star.b}, ${brightness * 0.7})`
        ctx.fill()
      }

      // --- Shooting stars ---
      nextShootingTime--
      if (nextShootingTime <= 0) {
        const angle = Math.PI * 0.15 + Math.random() * Math.PI * 0.3
        shootingStars.push({
          x: Math.random() * w * 0.8 + w * 0.1,
          y: Math.random() * h * 0.3,
          vx: Math.cos(angle) * (3 + Math.random() * 4),
          vy: Math.sin(angle) * (3 + Math.random() * 4),
          life: 0,
          maxLife: 30 + Math.random() * 40,
          size: 1 + Math.random() * 1.5,
          brightness: 0.6 + Math.random() * 0.4,
        })
        nextShootingTime = 180 + Math.random() * 300
      }
      for (let si = shootingStars.length - 1; si >= 0; si--) {
        const ss = shootingStars[si]
        ss.x += ss.vx
        ss.y += ss.vy
        ss.life++
        const lifeFrac = ss.life / ss.maxLife
        const alpha = lifeFrac < 0.1 ? lifeFrac * 10 : lifeFrac > 0.7 ? (1 - lifeFrac) / 0.3 : 1
        // Trail
        const trailLen = 8
        ctx.beginPath()
        ctx.moveTo(ss.x, ss.y)
        ctx.lineTo(ss.x - ss.vx * trailLen, ss.y - ss.vy * trailLen)
        const trailGrad = ctx.createLinearGradient(ss.x, ss.y, ss.x - ss.vx * trailLen, ss.y - ss.vy * trailLen)
        trailGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha * ss.brightness * 0.8})`)
        trailGrad.addColorStop(0.3, `rgba(200, 230, 255, ${alpha * ss.brightness * 0.4})`)
        trailGrad.addColorStop(1, `rgba(100, 200, 255, 0)`)
        ctx.strokeStyle = trailGrad
        ctx.lineWidth = ss.size
        ctx.stroke()
        // Head glow
        ctx.beginPath()
        ctx.arc(ss.x, ss.y, ss.size * 1.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * ss.brightness * 0.6})`
        ctx.fill()
        if (ss.life >= ss.maxLife) shootingStars.splice(si, 1)
      }

      // --- Aurora intensity varies by step (stronger on later steps) ---
      const stepIntensity = 0.45 + stepRef.current * 0.18

      // --- Draw aurora curtains (8 curtains, wider, faster, layered) ---
      // Draw step at 3px for performance but use more curtains
      for (const curtain of curtains) {
        const baseX = curtain.baseX * w
        const curtainWidth = curtain.width * w
        const topOffset = curtain.vertShift * h

        for (let y = topOffset; y < h * 0.78; y += 3) {
          const yNorm = (y - topOffset) / (h * 0.78 - topOffset)
          // Vertical falloff: bell-shaped, strongest in upper-mid sky
          const verticalFade = Math.pow(Math.sin(yNorm * Math.PI), 0.8) * Math.pow(1 - yNorm, 0.6)

          // Multi-octave noise for richer horizontal distortion
          const n = fbm(y * curtain.waveFreq, t * curtain.speed)
          const displacement = Math.sin(y * 0.008 + t * 0.012 * curtain.speed * 100) * curtain.waveAmp * n +
                               Math.sin(y * 0.003 + t * 0.007) * 30

          const x = baseX + displacement

          // Color interpolation with 3rd color for variety
          const colorCycle = (Math.sin(t * 0.001 + y * 0.005) + 1) * 0.5
          const colorMix = fbm(y * 0.008, t * 0.0008)
          let r: number, g: number, bVal: number
          if (colorCycle < 0.5) {
            const f = colorCycle * 2
            r = curtain.color1[0] * (1 - f) + curtain.color2[0] * f
            g = curtain.color1[1] * (1 - f) + curtain.color2[1] * f
            bVal = curtain.color1[2] * (1 - f) + curtain.color2[2] * f
          } else {
            const f = (colorCycle - 0.5) * 2
            r = curtain.color2[0] * (1 - f) + curtain.color3[0] * f
            g = curtain.color2[1] * (1 - f) + curtain.color3[1] * f
            bVal = curtain.color2[2] * (1 - f) + curtain.color3[2] * f
          }
          // Blend with noise-based color shift
          r = r * (0.7 + 0.3 * colorMix)
          g = g * (0.7 + 0.3 * colorMix)
          bVal = bVal * (0.7 + 0.3 * colorMix)

          const alpha = verticalFade * stepIntensity * 0.16 * (0.5 + 0.5 * fbm(y * 0.015, t * 0.0015))

          const grad = ctx.createLinearGradient(x - curtainWidth / 2, y, x + curtainWidth / 2, y)
          grad.addColorStop(0, `rgba(${r}, ${g}, ${bVal}, 0)`)
          grad.addColorStop(0.2, `rgba(${r}, ${g}, ${bVal}, ${alpha * 0.3})`)
          grad.addColorStop(0.4, `rgba(${r}, ${g}, ${bVal}, ${alpha * 0.7})`)
          grad.addColorStop(0.5, `rgba(${r}, ${g}, ${bVal}, ${alpha})`)
          grad.addColorStop(0.6, `rgba(${r}, ${g}, ${bVal}, ${alpha * 0.7})`)
          grad.addColorStop(0.8, `rgba(${r}, ${g}, ${bVal}, ${alpha * 0.3})`)
          grad.addColorStop(1, `rgba(${r}, ${g}, ${bVal}, 0)`)

          ctx.fillStyle = grad
          ctx.fillRect(x - curtainWidth / 2, y, curtainWidth, 4)
        }
      }

      // --- Large diffuse aurora glow patches (low frequency, adds depth) ---
      const glowPatches = [
        { cx: 0.2, cy: 0.25, r: 0.3, color: [0, 255, 127], phaseOff: 0 },
        { cx: 0.5, cy: 0.2, r: 0.35, color: [124, 77, 255], phaseOff: 1.5 },
        { cx: 0.75, cy: 0.3, r: 0.25, color: [255, 64, 129], phaseOff: 3.0 },
        { cx: 0.35, cy: 0.15, r: 0.2, color: [0, 200, 255], phaseOff: 4.5 },
      ]
      for (const gp of glowPatches) {
        const drift = Math.sin(t * 0.002 + gp.phaseOff) * w * 0.05
        const gpx = gp.cx * w + drift
        const gpy = gp.cy * h
        const gpr = gp.r * Math.min(w, h)
        const gpAlpha = (0.02 + 0.02 * Math.sin(t * 0.003 + gp.phaseOff)) * stepIntensity
        const glowGrad = ctx.createRadialGradient(gpx, gpy, 0, gpx, gpy, gpr)
        glowGrad.addColorStop(0, `rgba(${gp.color[0]}, ${gp.color[1]}, ${gp.color[2]}, ${gpAlpha})`)
        glowGrad.addColorStop(0.6, `rgba(${gp.color[0]}, ${gp.color[1]}, ${gp.color[2]}, ${gpAlpha * 0.3})`)
        glowGrad.addColorStop(1, `rgba(${gp.color[0]}, ${gp.color[1]}, ${gp.color[2]}, 0)`)
        ctx.fillStyle = glowGrad
        ctx.fillRect(gpx - gpr, gpy - gpr, gpr * 2, gpr * 2)
      }

      // --- Horizon glow (aurora light reflecting on atmosphere near ground) ---
      const horizonY = h * 0.75
      const horizGrad = ctx.createLinearGradient(0, horizonY - h * 0.08, 0, horizonY + h * 0.05)
      const horizAlpha = 0.04 * stepIntensity
      horizGrad.addColorStop(0, "rgba(0, 0, 0, 0)")
      horizGrad.addColorStop(0.3, `rgba(0, 230, 118, ${horizAlpha * 0.5})`)
      horizGrad.addColorStop(0.5, `rgba(100, 200, 120, ${horizAlpha})`)
      horizGrad.addColorStop(0.7, `rgba(180, 140, 255, ${horizAlpha * 0.6})`)
      horizGrad.addColorStop(1, "rgba(0, 0, 0, 0)")
      ctx.fillStyle = horizGrad
      ctx.fillRect(0, horizonY - h * 0.08, w, h * 0.13)

      // --- Snow-covered mountain silhouette ---
      ctx.beginPath()
      ctx.moveTo(0, h)
      for (let i = 0; i < mountainProfile.length; i += 2) {
        const mx = mountainProfile[i] * w
        const my = mountainProfile[i + 1] * h
        if (i === 0) ctx.lineTo(mx, my)
        else ctx.lineTo(mx, my)
      }
      ctx.lineTo(w, h)
      ctx.closePath()
      ctx.fillStyle = "#060b10"
      ctx.fill()

      // Snow caps on mountain peaks (lighter strip along the top of mountains)
      ctx.beginPath()
      for (let i = 0; i < mountainProfile.length - 2; i += 2) {
        const mx = mountainProfile[i] * w
        const my = mountainProfile[i + 1] * h
        const nx = mountainProfile[i + 2] * w
        const ny = mountainProfile[i + 3] * h
        if (i === 0) ctx.moveTo(mx, my)
        ctx.lineTo(nx, ny)
      }
      // Stroke back with offset for snow effect
      for (let i = mountainProfile.length - 2; i >= 0; i -= 2) {
        const mx = mountainProfile[i] * w
        const my = mountainProfile[i + 1] * h + 3
        ctx.lineTo(mx, my)
      }
      ctx.closePath()
      ctx.fillStyle = "rgba(200, 220, 240, 0.07)"
      ctx.fill()

      // --- Tree silhouettes (spruce forest) ---
      ctx.fillStyle = "#040709"
      for (const tree of treeData) {
        const treeBaseY = tree.baseY * h
        for (let j = 0; j < tree.heights.length; j++) {
          const treeX = tree.x * w + (j - 1.5) * 10
          const treeH = tree.heights[j]
          ctx.beginPath()
          ctx.moveTo(treeX, treeBaseY)
          ctx.lineTo(treeX - 4, treeBaseY)
          ctx.lineTo(treeX - 2, treeBaseY - treeH * 0.4)
          ctx.lineTo(treeX, treeBaseY - treeH)
          ctx.lineTo(treeX + 2, treeBaseY - treeH * 0.4)
          ctx.lineTo(treeX + 4, treeBaseY)
          ctx.closePath()
          ctx.fill()
        }
      }

      // --- Aurora reflection on frozen lake/ice (bottom portion) ---
      const lakeTop = h * 0.88
      const lakeBottom = h
      const lakeGrad = ctx.createLinearGradient(0, lakeTop, 0, lakeBottom)
      lakeGrad.addColorStop(0, "rgba(10, 20, 30, 0.6)")
      lakeGrad.addColorStop(1, "rgba(5, 10, 15, 0.8)")
      ctx.fillStyle = lakeGrad
      ctx.fillRect(w * 0.15, lakeTop, w * 0.7, lakeBottom - lakeTop)

      // Reflected aurora light on lake surface
      for (const curtain of curtains) {
        const reflBaseX = curtain.baseX * w
        const reflWidth = curtain.width * w * 0.6
        const reflAlpha = 0.015 * stepIntensity
        const reflGrad = ctx.createLinearGradient(reflBaseX - reflWidth / 2, lakeTop, reflBaseX + reflWidth / 2, lakeTop)
        const colorCycle2 = (Math.sin(t * 0.001) + 1) * 0.5
        const rc = curtain.color1[0] * (1 - colorCycle2) + curtain.color2[0] * colorCycle2
        const gc = curtain.color1[1] * (1 - colorCycle2) + curtain.color2[1] * colorCycle2
        const bc = curtain.color1[2] * (1 - colorCycle2) + curtain.color2[2] * colorCycle2
        reflGrad.addColorStop(0, `rgba(${rc}, ${gc}, ${bc}, 0)`)
        reflGrad.addColorStop(0.5, `rgba(${rc}, ${gc}, ${bc}, ${reflAlpha})`)
        reflGrad.addColorStop(1, `rgba(${rc}, ${gc}, ${bc}, 0)`)
        ctx.fillStyle = reflGrad
        const yShimmer = Math.sin(t * 0.01 + curtain.baseX * 10) * 3
        ctx.fillRect(reflBaseX - reflWidth / 2, lakeTop + yShimmer, reflWidth, (lakeBottom - lakeTop) * 0.6)
      }

      // --- Frost particles drifting upward ---
      for (const fp of frostParticles) {
        fp.x += fp.vx + Math.sin(t * 0.01 + fp.phase) * 0.0001
        fp.y += fp.vy
        if (fp.y < 0) { fp.y = 1; fp.x = Math.random() }
        if (fp.x < 0) fp.x = 1
        if (fp.x > 1) fp.x = 0
        const flicker = 0.5 + 0.5 * Math.sin(t * 0.02 + fp.phase)
        ctx.beginPath()
        ctx.arc(fp.x * w, fp.y * h, fp.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(200, 225, 255, ${fp.alpha * flicker * stepIntensity})`
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
// Aurora-Tinted Glass Card
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
        background: "linear-gradient(135deg, rgba(0, 255, 127, 0.03), rgba(124, 77, 255, 0.04), rgba(15, 15, 35, 0.55))",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: glowColor
          ? `1px solid ${glowColor}30`
          : "1px solid rgba(0, 255, 127, 0.08)",
        boxShadow: glowColor
          ? `0 0 20px ${glowColor}10, inset 0 1px 0 rgba(0,255,127,0.05)`
          : "0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(0,255,127,0.04), inset 0 0 30px rgba(124,77,255,0.02)",
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ============================================================================
// Aurora Bottom Bar
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
        background: "rgba(5, 8, 16, 0.88)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      {/* Aurora gradient accent line on top */}
      <div
        className="h-px w-full"
        style={{
          background: "linear-gradient(90deg, rgba(0,255,127,0.4), rgba(124,77,255,0.5), rgba(255,64,129,0.4), rgba(0,255,127,0.3))",
          backgroundSize: "200% 100%",
          animation: "v9c-shimmer 4s linear infinite",
        }}
      />

      <div className="mx-auto max-w-3xl flex items-center justify-between px-6 pt-3 pb-2">
        <span className="text-xs text-emerald-300/50">{statusText}</span>
        <button
          onClick={onCta}
          disabled={ctaDisabled}
          className="px-5 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-30"
          style={{
            background: ctaDisabled
              ? "rgba(20, 30, 40, 0.5)"
              : "linear-gradient(135deg, #00E676, #7C4DFF)",
            color: ctaDisabled ? "rgba(0,255,127,0.3)" : "white",
            boxShadow: ctaDisabled ? "none" : "0 0 16px rgba(0,230,118,0.3), 0 0 32px rgba(124,77,255,0.15)",
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
                    style={{ background: isDone ? "rgba(0,230,118,0.5)" : "rgba(0,255,127,0.08)" }}
                  />
                  {isDone && (
                    <div
                      className="absolute inset-0"
                      style={{
                        background: "linear-gradient(90deg, transparent, rgba(0,230,118,0.8), transparent)",
                        animation: "v9c-lineShimmer 2s ease-in-out infinite",
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
                      ? "linear-gradient(135deg, #00E676, #7C4DFF)"
                      : isActive
                        ? "rgba(0,230,118,0.2)"
                        : "rgba(20, 30, 40, 0.5)",
                    color: isDone || isActive ? "white" : "rgba(0,255,127,0.3)",
                    border: isActive
                      ? "2px solid rgba(0,230,118,0.5)"
                      : isDone
                        ? "none"
                        : "1px solid rgba(0,255,127,0.1)",
                    boxShadow: isActive
                      ? "0 0 16px rgba(0,230,118,0.3)"
                      : isDone
                        ? "0 0 8px rgba(0,230,118,0.15)"
                        : "none",
                    animation: isActive ? "v9c-stepPulse 2s ease-in-out infinite" : "none",
                    cursor: isClickable ? "pointer" : "default",
                  }}
                >
                  {isDone ? <Check className="size-3" /> : i + 1}
                </button>
                <span
                  className="text-[9px] hidden sm:block"
                  style={{ color: isActive ? "#00E676" : isDone ? "#7C4DFF" : "rgba(0,255,127,0.2)" }}
                >
                  {label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <style>{`
        @keyframes v9c-stepPulse {
          0%, 100% { box-shadow: 0 0 12px rgba(0,230,118,0.3); }
          50% { box-shadow: 0 0 24px rgba(0,230,118,0.5), 0 0 40px rgba(124,77,255,0.15); }
        }
        @keyframes v9c-lineShimmer {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes v9c-shimmer {
          0% { background-position: 0% 0%; }
          100% { background-position: 200% 0%; }
        }
      `}</style>
    </div>
  )
}

// ============================================================================
// Step 1: Direction
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
            <Sparkles className="size-8 text-emerald-400 opacity-60" />
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(0,230,118,0.2) 0%, transparent 70%)",
                animation: "v9c-iconGlow 3s ease-in-out infinite",
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
                ? "rgba(0,230,118,0.08)"
                : "rgba(0,230,118,0.02)",
              backdropFilter: "blur(8px)",
              border: selectedPath === "fto"
                ? "1px solid rgba(0,230,118,0.3)"
                : "1px solid rgba(0,230,118,0.08)",
              boxShadow: selectedPath === "fto"
                ? "0 0 30px rgba(0,230,118,0.08), inset 0 1px 0 rgba(255,255,255,0.05)"
                : "none",
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="size-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(0,230,118,0.15)" }}
              >
                <Star className="size-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">Find The One</h3>
                <p className="text-xs text-white/40">Connection & commitment</p>
              </div>
              {selectedPath === "fto" && (
                <div style={{ animation: "v9c-checkPop 0.3s ease-out" }}>
                  <Check className="size-5 text-emerald-400" />
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
                <span className="text-xs text-emerald-400/60 pl-5">
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
                ? "rgba(255,64,129,0.08)"
                : "rgba(255,64,129,0.02)",
              backdropFilter: "blur(8px)",
              border: selectedPath === "abundance"
                ? "1px solid rgba(255,64,129,0.3)"
                : "1px solid rgba(255,64,129,0.08)",
              boxShadow: selectedPath === "abundance"
                ? "0 0 30px rgba(255,64,129,0.08), inset 0 1px 0 rgba(255,255,255,0.05)"
                : "none",
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="size-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,64,129,0.15)" }}
              >
                <Sparkles className="size-5 text-pink-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">Abundance</h3>
                <p className="text-xs text-white/40">Freedom & experience</p>
              </div>
              {selectedPath === "abundance" && (
                <div style={{ animation: "v9c-checkPop 0.3s ease-out" }}>
                  <Check className="size-5 text-pink-400" />
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
                <span className="text-xs text-pink-400/60 pl-5">
                  +{abundanceL1s.length - 3} more paths
                </span>
              )}
            </div>
          </button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px" style={{ background: "rgba(0,255,127,0.06)" }} />
          <span className="text-xs uppercase tracking-wider text-emerald-300/25">Other Life Areas</span>
          <div className="flex-1 h-px" style={{ background: "rgba(0,255,127,0.06)" }} />
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
        @keyframes v9c-iconGlow {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.5); opacity: 1; }
        }
        @keyframes v9c-checkPop {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ============================================================================
// Step 2: Goals
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
              const catColor = CATEGORY_COLORS[category] ?? "#00E676"

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
                    <div className="ml-4 mt-1.5 space-y-1" style={{ animation: "v9c-slideDown 0.25s ease-out" }}>
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
                          ? "rgba(0,230,118,0.04)"
                          : "rgba(255,255,255,0.02)",
                      backdropFilter: "blur(8px)",
                      border:
                        catGoals.length > 0
                          ? "1px solid rgba(0,230,118,0.12)"
                          : "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <button onClick={() => toggleSection(sectionId)} className="shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="size-3.5 text-emerald-400/60" />
                      ) : (
                        <ChevronRight className="size-3.5 text-emerald-400/60" />
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
                    <div className="ml-4 mt-1.5 space-y-1" style={{ animation: "v9c-slideDown 0.25s ease-out" }}>
                      {catGoals.map((cg) => (
                        <div
                          key={cg.id}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                          style={{
                            background: "rgba(0,230,118,0.04)",
                            border: "1px solid rgba(0,230,118,0.12)",
                          }}
                        >
                          <div
                            className="size-4 rounded flex items-center justify-center shrink-0"
                            style={{ background: "#00E676" }}
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
              style={{ border: "1px dashed rgba(0,230,118,0.15)" }}
            >
              <Plus className="size-3.5 text-emerald-400/40" />
              <span className="text-sm text-emerald-400/40">Add custom category</span>
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
                  <div className="ml-4 mt-1.5 space-y-1" style={{ animation: "v9c-slideDown 0.25s ease-out" }}>
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
        @keyframes v9c-slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

// ============================================================================
// Step 3: Summary
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

// ============================================================================
// Step 4: Aurora Orrery
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

// Aurora halo colors per life area (green/violet/pink aurora tones)
const AURORA_HALO_COLORS: Record<string, string[]> = {
  daygame: ["#00E676", "#00FF7F", "#69F0AE", "#00C853"],
  health_fitness: ["#FF4081", "#F50057", "#FF80AB", "#E91E63"],
  career_business: ["#7C4DFF", "#536DFE", "#B388FF", "#651FFF"],
  social: ["#00E5FF", "#00B8D4", "#84FFFF", "#18FFFF"],
  personal_growth: ["#FFAB40", "#FF6D00", "#FFD180", "#FF9100"],
  lifestyle: ["#69F0AE", "#00C853", "#B9F6CA", "#00E676"],
}

function AuroraOrreryStep({
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
  const timeRef = useRef(0)
  const animFrameRef = useRef<number>(0)
  const [, setTick] = useState(0)

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

  // Animate aurora ribbon wobble
  useEffect(() => {
    function tick() {
      timeRef.current += 0.02
      setTick((t) => t + 1)
      animFrameRef.current = requestAnimationFrame(tick)
    }
    animFrameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [])

  const activeAreas = new Set(["daygame", ...selectedAreas])
  const viewSize = CENTER * 2
  const t = timeRef.current

  // Generate aurora ribbon path for an orbit with more undulation
  function auroraOrbitPath(radius: number, offset: number = 0): string {
    const points: string[] = []
    const segments = 180
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      const wobble = Math.sin(angle * 8 + t * 2.5 + radius * 0.01 + offset) * 4 +
                     Math.sin(angle * 4 + t * 1.8 + offset * 2) * 3 +
                     Math.sin(angle * 12 + t * 3 + radius * 0.02) * 1.5
      const r = radius + wobble
      const x = CENTER + Math.cos(angle) * r
      const y = CENTER + Math.sin(angle) * r
      points.push(i === 0 ? `M${x},${y}` : `L${x},${y}`)
    }
    points.push("Z")
    return points.join(" ")
  }

  // Generate sun aurora tendrils — longer, more dramatic
  function sunTendrilPath(index: number, total: number): string {
    const baseAngle = (index / total) * Math.PI * 2
    const points: string[] = []
    const length = 80 + Math.sin(t * 0.8 + index * 1.2) * 30
    const segments = 40
    for (let i = 0; i <= segments; i++) {
      const frac = i / segments
      const dist = SUN_RADIUS * 0.9 + frac * length
      const curve = Math.sin(frac * Math.PI * 4 + t * 2.5 + index * 1.5) * (10 + frac * 20) +
                    Math.cos(frac * Math.PI * 2 + t * 1.8 + index) * (5 + frac * 8)
      const angle = baseAngle + (curve / dist)
      const x = CENTER + Math.cos(angle) * dist
      const y = CENTER + Math.sin(angle) * dist
      points.push(i === 0 ? `M${x},${y}` : `L${x},${y}`)
    }
    return points.join(" ")
  }

  // Plasma eruption arcs from sun surface
  function plasmaEruptionPath(index: number): string {
    const baseAngle = (index / 6) * Math.PI * 2 + t * 0.3
    const eruptHeight = 35 + Math.sin(t * 0.6 + index * 2.1) * 20
    const points: string[] = []
    const segments = 30
    for (let i = 0; i <= segments; i++) {
      const frac = i / segments
      const arcAngle = (frac - 0.5) * 0.8
      const dist = SUN_RADIUS + Math.sin(frac * Math.PI) * eruptHeight
      const angle = baseAngle + arcAngle
      const x = CENTER + Math.cos(angle) * dist
      const y = CENTER + Math.sin(angle) * dist
      points.push(i === 0 ? `M${x},${y}` : `L${x},${y}`)
    }
    return points.join(" ")
  }

  // Magnetic field lines connecting planets to sun — curved arcs
  function magneticFieldPath(radius: number, startAngle: number, curveDir: number = 1): string {
    const points: string[] = []
    const segments = 50
    for (let i = 0; i <= segments; i++) {
      const frac = i / segments
      const dist = SUN_RADIUS * 1.3 + frac * (radius - SUN_RADIUS * 1.3)
      const curve = Math.sin(frac * Math.PI) * (35 + 15 * Math.sin(t * 0.4 + startAngle)) * curveDir
      const angle = (startAngle * Math.PI / 180) + (curve / dist) * 0.3 +
                    Math.sin(frac * Math.PI * 2 + t * 0.8) * 0.03
      const x = CENTER + Math.cos(angle) * dist
      const y = CENTER + Math.sin(angle) * dist
      points.push(i === 0 ? `M${x},${y}` : `L${x},${y}`)
    }
    return points.join(" ")
  }

  // Solar wind particle stream — spiraling outward
  function solarWindPath(index: number): string {
    const baseAngle = (index / 16) * Math.PI * 2 + t * 0.15
    const points: string[] = []
    const segments = 60
    for (let i = 0; i <= segments; i++) {
      const frac = i / segments
      const dist = SUN_RADIUS * 1.2 + frac * (CENTER * 0.85)
      const spiral = frac * 0.8 + Math.sin(frac * Math.PI * 3 + t * 1.5 + index) * 0.15
      const angle = baseAngle + spiral
      const x = CENTER + Math.cos(angle) * dist
      const y = CENTER + Math.sin(angle) * dist
      points.push(i === 0 ? `M${x},${y}` : `L${x},${y}`)
    }
    return points.join(" ")
  }

  // Charged particle stream between two radii
  function chargedParticleDots(radius: number, count: number, areaId: string): { cx: number; cy: number; r: number; opacity: number }[] {
    const dots: { cx: number; cy: number; r: number; opacity: number }[] = []
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + t * (0.8 + radius * 0.002)
      const wobble = Math.sin(angle * 6 + t * 3 + i) * 5
      const dist = radius + wobble
      const opacity = 0.15 + 0.15 * Math.sin(t * 2 + i * 1.7 + radius * 0.05)
      dots.push({
        cx: CENTER + Math.cos(angle) * dist,
        cy: CENTER + Math.sin(angle) * dist,
        r: 1 + Math.sin(t * 1.5 + i) * 0.5,
        opacity,
      })
    }
    return dots
  }

  return (
    <div className="min-h-screen pt-8 pb-36 px-6">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-emerald-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
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
            @keyframes v9c-SunPulse {
              0%, 100% { filter: drop-shadow(0 0 25px rgba(0, 230, 118, 0.6)) drop-shadow(0 0 50px rgba(124, 77, 255, 0.35)) drop-shadow(0 0 80px rgba(255, 64, 129, 0.15)); }
              50% { filter: drop-shadow(0 0 40px rgba(0, 230, 118, 0.9)) drop-shadow(0 0 80px rgba(124, 77, 255, 0.55)) drop-shadow(0 0 120px rgba(255, 64, 129, 0.25)); }
            }
            @keyframes v9c-SunCorona {
              0%, 100% { opacity: 0.3; transform: scale(1) rotate(0deg); }
              25% { opacity: 0.45; transform: scale(1.05) rotate(3deg); }
              50% { opacity: 0.35; transform: scale(1.02) rotate(-2deg); }
              75% { opacity: 0.5; transform: scale(1.08) rotate(1deg); }
            }
            @keyframes v9c-PlanetBreathe {
              0%, 100% { transform: scale(1); opacity: 0.25; }
              50% { transform: scale(1.08); opacity: 0.35; }
            }
            @keyframes v9c-particleDrift {
              0% { opacity: 0; }
              20% { opacity: 1; }
              80% { opacity: 1; }
              100% { opacity: 0; }
            }
            @keyframes v9c-auroraOrbitGlow {
              0%, 100% { stroke-opacity: 0.2; }
              50% { stroke-opacity: 0.4; }
            }
            ${visibleAreas
              .map((area) => {
                const config = ORBIT_CONFIG[area.id]
                if (!config) return ""
                return `
                @keyframes v9c-orbit-${area.id} {
                  from { transform: rotate(${config.startAngle}deg); }
                  to { transform: rotate(${config.startAngle + 360}deg); }
                }
                @keyframes v9c-counter-orbit-${area.id} {
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
              {/* Sun gradient with aurora colors */}
              <radialGradient id="v9c-sun-gradient" cx="35%" cy="35%">
                <stop offset="0%" stopColor="#f0fff0" />
                <stop offset="15%" stopColor="#b9f6ca" />
                <stop offset="35%" stopColor="#69F0AE" />
                <stop offset="55%" stopColor="#00E676" />
                <stop offset="75%" stopColor="#00C853" />
                <stop offset="90%" stopColor="#00796B" />
                <stop offset="100%" stopColor="#004D40" />
              </radialGradient>
              <radialGradient id="v9c-sun-glow">
                <stop offset="0%" stopColor="#00E676" stopOpacity="0.5" />
                <stop offset="20%" stopColor="#69F0AE" stopOpacity="0.25" />
                <stop offset="40%" stopColor="#7C4DFF" stopOpacity="0.12" />
                <stop offset="60%" stopColor="#FF4081" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#000" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="v9c-corona-glow">
                <stop offset="0%" stopColor="#69F0AE" stopOpacity="0.35" />
                <stop offset="25%" stopColor="#00E676" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#7C4DFF" stopOpacity="0.1" />
                <stop offset="75%" stopColor="#FF4081" stopOpacity="0.04" />
                <stop offset="100%" stopColor="#7C4DFF" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="v9c-corona-outer">
                <stop offset="0%" stopColor="#00E676" stopOpacity="0.1" />
                <stop offset="30%" stopColor="#7C4DFF" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#000" stopOpacity="0" />
              </radialGradient>
              {/* Planet gradients for each life area */}
              {visibleAreas.map((area) => {
                const haloColors = AURORA_HALO_COLORS[area.id] ?? ["#00E676", "#7C4DFF", "#FF4081", "#69F0AE"]
                return (
                  <radialGradient key={`pg-${area.id}`} id={`v9c-planet-${area.id}`} cx="35%" cy="35%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
                    <stop offset="30%" stopColor={haloColors[0]} stopOpacity="0.9" />
                    <stop offset="70%" stopColor={area.hex} stopOpacity="1" />
                    <stop offset="100%" stopColor={haloColors[3] ?? haloColors[0]} stopOpacity="0.8" />
                  </radialGradient>
                )
              })}
              <filter id="v9c-planet-glow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="blur" />
                <feFlood floodOpacity="0.6" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="v9c-active-glow" x="-120%" y="-120%" width="340%" height="340%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="10" result="blur" />
                <feFlood floodOpacity="0.8" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="v9c-aurora-blur">
                <feGaussianBlur stdDeviation="2.5" />
              </filter>
              <filter id="v9c-soft-blur">
                <feGaussianBlur stdDeviation="4" />
              </filter>
              <filter id="v9c-wide-blur">
                <feGaussianBlur stdDeviation="8" />
              </filter>
            </defs>

            {/* === Solar wind streams (background, spiraling outward) === */}
            {Array.from({ length: 16 }).map((_, i) => {
              const windColors = ["#00E676", "#7C4DFF", "#FF4081", "#00E5FF", "#69F0AE", "#B388FF", "#FF80AB", "#84FFFF"]
              return (
                <path
                  key={`wind-${i}`}
                  d={solarWindPath(i)}
                  fill="none"
                  stroke={windColors[i % windColors.length]}
                  strokeWidth="0.6"
                  strokeOpacity={0.04 + Math.sin(t * 0.5 + i * 0.7) * 0.02}
                  strokeDasharray="2,12"
                />
              )
            })}

            {/* === Ambient geomagnetic field lines (large curved arcs) === */}
            {[0, 60, 120, 180, 240, 300].map((angle, i) => (
              <g key={`geo-${i}`}>
                <path
                  d={magneticFieldPath(CENTER * 0.9, angle, 1)}
                  fill="none"
                  stroke="#00E676"
                  strokeWidth="0.4"
                  strokeOpacity={0.04 + Math.sin(t * 0.3 + i) * 0.02}
                  strokeDasharray="3,10"
                  filter="url(#v9c-soft-blur)"
                />
                <path
                  d={magneticFieldPath(CENTER * 0.9, angle, -1)}
                  fill="none"
                  stroke="#7C4DFF"
                  strokeWidth="0.4"
                  strokeOpacity={0.03 + Math.sin(t * 0.35 + i * 1.2) * 0.02}
                  strokeDasharray="3,10"
                  filter="url(#v9c-soft-blur)"
                />
              </g>
            ))}

            {/* === Magnetic field lines from sun to each active planet === */}
            {visibleAreas.map((area) => {
              const config = ORBIT_CONFIG[area.id]
              if (!config) return null
              const isActive = activeAreas.has(area.id)
              if (!isActive) return null
              const haloColors = AURORA_HALO_COLORS[area.id] ?? ["#00E676"]
              return (
                <g key={`field-${area.id}`}>
                  <path
                    d={magneticFieldPath(config.radius, config.startAngle, 1)}
                    fill="none"
                    stroke={haloColors[0]}
                    strokeWidth="0.8"
                    strokeOpacity={0.08 + Math.sin(t * 0.5 + config.startAngle) * 0.04}
                    strokeDasharray="4,8"
                    filter="url(#v9c-aurora-blur)"
                  />
                  <path
                    d={magneticFieldPath(config.radius, config.startAngle, -1)}
                    fill="none"
                    stroke={haloColors[1] ?? haloColors[0]}
                    strokeWidth="0.6"
                    strokeOpacity={0.06 + Math.sin(t * 0.6 + config.startAngle * 1.5) * 0.03}
                    strokeDasharray="3,10"
                    filter="url(#v9c-aurora-blur)"
                  />
                </g>
              )
            })}

            {/* === Aurora ribbon orbit paths (triple-layered, flowing) === */}
            {visibleAreas.map((area) => {
              const config = ORBIT_CONFIG[area.id]
              if (!config) return null
              const isActive = activeAreas.has(area.id)
              const isHovered = hoveredPlanet === area.id
              const haloColors = AURORA_HALO_COLORS[area.id] ?? ["#00E676", "#7C4DFF", "#FF4081", "#69F0AE"]

              return (
                <g key={`orbit-${area.id}`}>
                  {/* Outer diffuse aurora glow */}
                  {isActive && (
                    <path
                      d={auroraOrbitPath(config.radius, 3)}
                      fill="none"
                      stroke={haloColors[2] ?? haloColors[0]}
                      strokeWidth={isHovered ? 6 : 4}
                      strokeOpacity={isHovered ? 0.12 : 0.06}
                      filter="url(#v9c-wide-blur)"
                    />
                  )}
                  {/* Main aurora ribbon */}
                  <path
                    d={auroraOrbitPath(config.radius)}
                    fill="none"
                    stroke={isActive ? haloColors[0] : "rgba(100,120,255,0.06)"}
                    strokeWidth={isHovered ? 3 : isActive ? 2 : 0.4}
                    strokeOpacity={isActive ? (isHovered ? 0.45 : 0.3) : 0.08}
                    strokeDasharray={isActive ? "none" : "4,8"}
                    filter={isActive ? "url(#v9c-aurora-blur)" : undefined}
                  />
                  {/* Second ribbon layer offset */}
                  {isActive && (
                    <path
                      d={auroraOrbitPath(config.radius + 2, 1.5)}
                      fill="none"
                      stroke={haloColors[1]}
                      strokeWidth={isHovered ? 2 : 1.2}
                      strokeOpacity={isHovered ? 0.2 : 0.1}
                      filter="url(#v9c-aurora-blur)"
                    />
                  )}
                  {/* Third ribbon — inner edge */}
                  {isActive && (
                    <path
                      d={auroraOrbitPath(config.radius - 2, 2.5)}
                      fill="none"
                      stroke={haloColors[3] ?? haloColors[0]}
                      strokeWidth="0.8"
                      strokeOpacity={0.08}
                      filter="url(#v9c-aurora-blur)"
                    />
                  )}
                  {/* Charged particles along orbit */}
                  {isActive && chargedParticleDots(config.radius, 24, area.id).map((dot, di) => (
                    <circle
                      key={`particle-${area.id}-${di}`}
                      cx={dot.cx}
                      cy={dot.cy}
                      r={dot.r}
                      fill={haloColors[di % haloColors.length]}
                      fillOpacity={dot.opacity}
                    />
                  ))}
                </g>
              )
            })}

            {/* === Sun plasma eruptions (arcs from surface) === */}
            {Array.from({ length: 6 }).map((_, i) => {
              const eruptColors = ["#00E676", "#69F0AE", "#7C4DFF", "#FF4081", "#00E5FF", "#B388FF"]
              return (
                <path
                  key={`eruption-${i}`}
                  d={plasmaEruptionPath(i)}
                  fill="none"
                  stroke={eruptColors[i]}
                  strokeWidth={2.5 + Math.sin(t * 0.8 + i * 1.1) * 1}
                  strokeOpacity={0.2 + Math.sin(t * 0.6 + i * 2) * 0.1}
                  strokeLinecap="round"
                  filter="url(#v9c-aurora-blur)"
                />
              )
            })}

            {/* === Sun aurora tendrils (16, longer, more dramatic) === */}
            {Array.from({ length: 16 }).map((_, i) => {
              const colors = ["#00E676", "#7C4DFF", "#FF4081", "#69F0AE", "#536DFE", "#00E5FF", "#B388FF", "#FF80AB"]
              const color = colors[i % colors.length]
              return (
                <path
                  key={`tendril-${i}`}
                  d={sunTendrilPath(i, 16)}
                  fill="none"
                  stroke={color}
                  strokeWidth={2.5 + Math.sin(t * 1.2 + i * 0.8) * 1}
                  strokeOpacity={0.18 + Math.sin(t * 0.7 + i * 0.9) * 0.12}
                  strokeLinecap="round"
                  filter="url(#v9c-aurora-blur)"
                />
              )
            })}

            {/* === Sun glow layers (more layers, broader) === */}
            <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS * 4.5} fill="url(#v9c-corona-outer)"
              style={{ transformOrigin: `${CENTER}px ${CENTER}px`, animation: "v9c-SunCorona 8s ease-in-out infinite" }} />
            <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS * 3} fill="url(#v9c-corona-glow)"
              style={{ transformOrigin: `${CENTER}px ${CENTER}px`, animation: "v9c-SunCorona 6s ease-in-out infinite reverse" }} />
            <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS * 2} fill="url(#v9c-sun-glow)" />

            {/* === Sun body with surface detail === */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={SUN_RADIUS}
              fill="url(#v9c-sun-gradient)"
              style={{ animation: "v9c-SunPulse 4s ease-in-out infinite" }}
            />
            {/* Sun surface rings (magnetic field lines on surface) */}
            <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS * 0.8} fill="none"
              stroke="#b9f6ca" strokeWidth="0.5" strokeOpacity="0.2" strokeDasharray="2,4" />
            <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS * 0.6} fill="none"
              stroke="#e8ffe8" strokeWidth="0.4" strokeOpacity="0.25" />
            <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS * 0.4} fill="none"
              stroke="#e8ffe8" strokeWidth="0.3" strokeOpacity="0.15" />
            {/* Sun hot spot */}
            <circle cx={CENTER - SUN_RADIUS * 0.15} cy={CENTER - SUN_RADIUS * 0.15}
              r={SUN_RADIUS * 0.25} fill="rgba(255,255,255,0.12)" />
            <text
              x={CENTER}
              y={CENTER + 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#e8ffe8"
              fontSize="8"
              fontWeight="700"
              letterSpacing="0.8"
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              YOUR VISION
            </text>

            {/* === Planets === */}
            {visibleAreas.map((area) => {
              const config = ORBIT_CONFIG[area.id]
              if (!config) return null
              const isActive = activeAreas.has(area.id)
              const isHovered = hoveredPlanet === area.id
              const count = goalCounts[area.id] ?? 0
              const haloColors = AURORA_HALO_COLORS[area.id] ?? ["#00E676", "#7C4DFF", "#FF4081", "#69F0AE"]

              // Planet aurora halo: 5 rings that dance
              const haloRings = isActive ? [
                { dr: 5, color: haloColors[0], opacity: isHovered ? 0.4 : 0.25, width: isHovered ? 3.5 : 2.5 },
                { dr: 9, color: haloColors[1], opacity: isHovered ? 0.3 : 0.15, width: isHovered ? 3 : 2 },
                { dr: 13, color: haloColors[2], opacity: isHovered ? 0.2 : 0.1, width: isHovered ? 2 : 1.2 },
                { dr: 18, color: haloColors[3] ?? haloColors[0], opacity: isHovered ? 0.12 : 0.05, width: 0.8 },
                { dr: 23, color: haloColors[0], opacity: isHovered ? 0.06 : 0.02, width: 0.5 },
              ] : []

              return (
                <g
                  key={`planet-${area.id}`}
                  style={{
                    transformOrigin: `${CENTER}px ${CENTER}px`,
                    animation: `v9c-orbit-${area.id} ${config.duration}s linear infinite`,
                  }}
                >
                  <g
                    style={{
                      transformOrigin: `${CENTER}px ${CENTER - config.radius}px`,
                      animation: `v9c-counter-orbit-${area.id} ${config.duration}s linear infinite`,
                    }}
                  >
                    {/* Hover hit area */}
                    <circle
                      cx={CENTER}
                      cy={CENTER - config.radius}
                      r={config.planetSize + 20}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredPlanet(area.id)}
                      onMouseLeave={() => setHoveredPlanet(null)}
                    />

                    {/* Planet diffuse aurora glow (outermost) */}
                    {isActive && (
                      <circle
                        cx={CENTER}
                        cy={CENTER - config.radius}
                        r={config.planetSize + 28 + Math.sin(t * 0.8 + config.startAngle) * 4}
                        fill="none"
                        stroke={haloColors[0]}
                        strokeWidth="1"
                        strokeOpacity={0.03 + Math.sin(t * 0.5) * 0.015}
                        filter="url(#v9c-wide-blur)"
                      />
                    )}

                    {/* Planet aurora halo rings (5 layers) */}
                    {haloRings.map((ring, ri) => {
                      const wobble = Math.sin(t * 1.5 + ri * 2 + config.startAngle) * 2 +
                                     Math.cos(t * 1.2 + ri * 1.5) * 1
                      return (
                        <circle
                          key={`halo-${ri}`}
                          cx={CENTER}
                          cy={CENTER - config.radius}
                          r={config.planetSize + ring.dr + wobble}
                          fill="none"
                          stroke={ring.color}
                          strokeWidth={ring.width}
                          strokeOpacity={ring.opacity + Math.sin(t * 1.8 + ri) * ring.opacity * 0.3}
                          filter="url(#v9c-aurora-blur)"
                        />
                      )
                    })}

                    {/* Planet body with gradient */}
                    <circle
                      cx={CENTER}
                      cy={CENTER - config.radius}
                      r={config.planetSize}
                      fill={isActive ? `url(#v9c-planet-${area.id})` : area.hex}
                      fillOpacity={isActive ? 1 : 0.2}
                      filter={
                        isActive
                          ? isHovered
                            ? "url(#v9c-active-glow)"
                            : "url(#v9c-planet-glow)"
                          : undefined
                      }
                      className="transition-all duration-300"
                      style={
                        !isActive
                          ? {
                              transformOrigin: `${CENTER}px ${CENTER - config.radius}px`,
                              animation: "v9c-PlanetBreathe 4s ease-in-out infinite",
                            }
                          : undefined
                      }
                    />

                    {/* Planet surface band (equator line) */}
                    {isActive && (
                      <ellipse
                        cx={CENTER}
                        cy={CENTER - config.radius}
                        rx={config.planetSize}
                        ry={config.planetSize * 0.25}
                        fill="none"
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="0.5"
                      />
                    )}

                    {/* Highlight (specular) */}
                    <circle
                      cx={CENTER - config.planetSize * 0.25}
                      cy={CENTER - config.radius - config.planetSize * 0.25}
                      r={config.planetSize * 0.35}
                      fill="white"
                      fillOpacity={isActive ? 0.18 : 0.05}
                    />
                    {/* Secondary highlight */}
                    {isActive && (
                      <circle
                        cx={CENTER - config.planetSize * 0.1}
                        cy={CENTER - config.radius - config.planetSize * 0.35}
                        r={config.planetSize * 0.15}
                        fill="white"
                        fillOpacity={0.25}
                      />
                    )}

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
                          fill="rgba(5,8,16,0.85)"
                          stroke={haloColors[0]}
                          strokeWidth="1"
                          strokeOpacity="0.6"
                        />
                        <text
                          x={CENTER + config.planetSize - 2}
                          y={CENTER - config.radius - config.planetSize + 2.5}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill={haloColors[0]}
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
                          y={CENTER - config.radius - config.planetSize - 32}
                          width={110}
                          height={24}
                          rx={8}
                          fill="rgba(5,8,16,0.92)"
                          stroke={haloColors[0]}
                          strokeWidth="0.8"
                          strokeOpacity="0.6"
                        />
                        <text
                          x={CENTER}
                          y={CENTER - config.radius - config.planetSize - 17}
                          textAnchor="middle"
                          fill="white"
                          fontSize="7.5"
                          fontWeight="500"
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
        {badges.length > 0 && (() => {
          const sorted = [...badges].sort((a, b) => (TIER_ORDER[a.tier] ?? 4) - (TIER_ORDER[b.tier] ?? 4))
          return (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-4 justify-center">
                <Trophy className="size-4 text-pink-400" />
                <span className="text-sm font-semibold uppercase tracking-wider text-pink-400/80">
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
              background: "linear-gradient(135deg, #00E676, #7C4DFF, #FF4081)",
              color: "white",
              boxShadow:
                "0 0 20px rgba(0,230,118,0.3), 0 0 40px rgba(124,77,255,0.15), 0 0 60px rgba(255,64,129,0.1)",
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

export default function V9C() {
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
      <AuroraBackground stepIndex={stepIndex} />

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
          <AuroraOrreryStep
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
