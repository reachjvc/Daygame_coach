"use client"

/**
 * V9D: Cosmic Web / Gravitational Lensing
 *
 * Visual: Dark matter filaments, gravitational lensing, Einstein rings,
 * spacetime grid warping, gravitational wave ripples, Hawking radiation.
 * Functional: Identical to V8
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
// Cosmic Web Background (Canvas-based) — Multi-layer deep-space animation
// ============================================================================

interface FilamentNode {
  x: number
  y: number
  vx: number
  vy: number
  mass: number
  brightness: number
  isCluster: boolean
  // orbiting galaxies for cluster nodes
  orbiters: { angle: number; speed: number; dist: number; size: number; hue: number }[]
  // flow position along filament
  flowPhase: number
}

interface CosmicEvent {
  x: number
  y: number
  type: "grb" | "quasar" | "supernova"
  birth: number
  duration: number
  angle: number
  intensity: number
}

interface BackgroundStar {
  x: number
  y: number
  size: number
  brightness: number
  twinkleSpeed: number
  twinklePhase: number
  hue: number
}

function CosmicWebBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodesRef = useRef<FilamentNode[]>([])
  const animFrameRef = useRef<number>(0)
  const timeRef = useRef(0)
  const eventsRef = useRef<CosmicEvent[]>([])
  const starsRef = useRef<BackgroundStar[]>([])
  const scrollRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let W = window.innerWidth
    let H = window.innerHeight

    const resize = () => {
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = W
      canvas.height = H
    }
    resize()
    window.addEventListener("resize", resize)

    // Track scroll for parallax depth
    const onScroll = () => { scrollRef.current = window.scrollY }
    window.addEventListener("scroll", onScroll, { passive: true })

    // ---- Initialize background star field ----
    const STAR_COUNT = 350
    const stars: BackgroundStar[] = []
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * W * 1.5,
        y: Math.random() * H * 1.5,
        size: Math.random() * 1.2 + 0.2,
        brightness: 0.15 + Math.random() * 0.45,
        twinkleSpeed: 0.5 + Math.random() * 2,
        twinklePhase: Math.random() * Math.PI * 2,
        hue: Math.random() < 0.3 ? 200 + Math.random() * 60 : (Math.random() < 0.5 ? 30 + Math.random() * 30 : 0),
      })
    }
    starsRef.current = stars

    // ---- Initialize filament nodes ----
    const NODE_COUNT = 140
    const nodes: FilamentNode[] = []
    for (let i = 0; i < NODE_COUNT; i++) {
      const isCluster = i < 20
      const orbiters: FilamentNode["orbiters"] = []
      if (isCluster) {
        const orbCount = 2 + Math.floor(Math.random() * 4)
        for (let o = 0; o < orbCount; o++) {
          orbiters.push({
            angle: Math.random() * Math.PI * 2,
            speed: 0.3 + Math.random() * 0.8,
            dist: 6 + Math.random() * 10,
            size: 0.4 + Math.random() * 0.8,
            hue: Math.random() < 0.5 ? 200 : 40,
          })
        }
      }
      nodes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        mass: isCluster ? 2 + Math.random() * 3 : 0.5 + Math.random(),
        brightness: isCluster ? 0.6 + Math.random() * 0.4 : 0.1 + Math.random() * 0.3,
        isCluster,
        orbiters,
        flowPhase: Math.random() * Math.PI * 2,
      })
    }
    nodesRef.current = nodes

    // ---- Initialize cosmic events ----
    const events: CosmicEvent[] = []
    eventsRef.current = events

    const FILAMENT_DIST = 200
    const CLUSTER_DIST = 280

    // Pre-compute CMB texture once on an offscreen canvas
    const cmbCanvas = document.createElement("canvas")
    cmbCanvas.width = 256
    cmbCanvas.height = 256
    const cmbCtx = cmbCanvas.getContext("2d")!
    for (let px = 0; px < 256; px += 2) {
      for (let py = 0; py < 256; py += 2) {
        const v = Math.random()
        const r = 60 + v * 50
        const g = 40 + v * 35
        const b = 80 + v * 70
        cmbCtx.fillStyle = `rgba(${r},${g},${b},${0.015 + v * 0.008})`
        cmbCtx.fillRect(px, py, 2, 2)
      }
    }

    function spawnEvent() {
      if (events.length > 3) return
      const types: CosmicEvent["type"][] = ["grb", "quasar", "supernova"]
      events.push({
        x: Math.random() * W,
        y: Math.random() * H,
        type: types[Math.floor(Math.random() * types.length)],
        birth: timeRef.current,
        duration: 1.5 + Math.random() * 3,
        angle: Math.random() * Math.PI * 2,
        intensity: 0.5 + Math.random() * 0.5,
      })
    }

    function animate() {
      if (!ctx || !canvas) return
      const t = timeRef.current
      timeRef.current += 0.006

      // ---- Layer 0: Deep void ----
      ctx.fillStyle = "#020206"
      ctx.fillRect(0, 0, W, H)

      // ---- Layer 1: CMB radiation texture (subtle, slowly shifting) ----
      ctx.globalAlpha = 0.4
      const cmbShiftX = Math.sin(t * 0.05) * 20
      const cmbShiftY = Math.cos(t * 0.03) * 15
      // Tile CMB across viewport
      for (let tx = -256; tx < W + 256; tx += 256) {
        for (let ty = -256; ty < H + 256; ty += 256) {
          ctx.drawImage(cmbCanvas, tx + cmbShiftX, ty + cmbShiftY)
        }
      }
      ctx.globalAlpha = 1.0

      // ---- Layer 2: Distant cosmic fog / depth fog ----
      // Redshift gradient — blue near center, reddish at edges (cosmic expansion)
      const fogGrad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7)
      fogGrad.addColorStop(0, "rgba(40, 60, 120, 0.03)")
      fogGrad.addColorStop(0.3, "rgba(30, 20, 80, 0.02)")
      fogGrad.addColorStop(0.6, "rgba(60, 20, 40, 0.025)")
      fogGrad.addColorStop(1, "rgba(20, 5, 10, 0.04)")
      ctx.fillStyle = fogGrad
      ctx.fillRect(0, 0, W, H)

      // Expanding space effect — subtle radial drift rings
      for (let ring = 0; ring < 5; ring++) {
        const expandR = ((t * 8 + ring * 200) % 1000)
        const expandAlpha = Math.max(0, 0.012 * (1 - expandR / 1000))
        ctx.beginPath()
        ctx.arc(W / 2, H / 2, expandR, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(80, 40, 60, ${expandAlpha})`
        ctx.lineWidth = 0.8
        ctx.stroke()
      }

      // ---- Layer 3: Background star field with parallax ----
      const parallax = scrollRef.current * 0.02
      for (const star of stars) {
        const twinkle = 0.5 + 0.5 * Math.sin(t * star.twinkleSpeed + star.twinklePhase)
        const alpha = star.brightness * twinkle
        const sx = ((star.x - parallax * 0.3) % (W * 1.5) + W * 1.5) % (W * 1.5) - W * 0.25
        const sy = ((star.y + parallax * 0.15) % (H * 1.5) + H * 1.5) % (H * 1.5) - H * 0.25

        if (star.hue > 0) {
          ctx.fillStyle = `hsla(${star.hue}, 60%, 75%, ${alpha})`
        } else {
          ctx.fillStyle = `rgba(255,255,255,${alpha})`
        }
        ctx.beginPath()
        ctx.arc(sx, sy, star.size, 0, Math.PI * 2)
        ctx.fill()

        // Faint diffraction cross on brighter stars
        if (star.brightness > 0.4 && star.size > 0.8) {
          const crossLen = star.size * 3 * twinkle
          ctx.strokeStyle = `rgba(200,210,255,${alpha * 0.25})`
          ctx.lineWidth = 0.3
          ctx.beginPath()
          ctx.moveTo(sx - crossLen, sy)
          ctx.lineTo(sx + crossLen, sy)
          ctx.moveTo(sx, sy - crossLen)
          ctx.lineTo(sx, sy + crossLen)
          ctx.stroke()
        }
      }

      // ---- Layer 4: Dark energy void regions ----
      // Subtle dark vortex patches that slowly rotate
      for (let v = 0; v < 3; v++) {
        const vx = W * (0.2 + v * 0.3) + Math.sin(t * 0.1 + v * 2) * 50
        const vy = H * (0.3 + v * 0.2) + Math.cos(t * 0.08 + v * 3) * 40
        const voidGrad = ctx.createRadialGradient(vx, vy, 0, vx, vy, 120 + v * 30)
        voidGrad.addColorStop(0, "rgba(2, 2, 6, 0.15)")
        voidGrad.addColorStop(0.5, "rgba(5, 2, 15, 0.06)")
        voidGrad.addColorStop(1, "rgba(0, 0, 0, 0)")
        ctx.fillStyle = voidGrad
        ctx.beginPath()
        ctx.arc(vx, vy, 120 + v * 30, 0, Math.PI * 2)
        ctx.fill()

        // Swirl lines inside void
        ctx.save()
        ctx.translate(vx, vy)
        ctx.rotate(t * 0.02 * (v % 2 === 0 ? 1 : -1))
        ctx.strokeStyle = `rgba(60, 20, 80, 0.025)`
        ctx.lineWidth = 0.5
        for (let s = 0; s < 5; s++) {
          ctx.beginPath()
          const spiralAngle = s * 1.2 + t * 0.05
          for (let sr = 10; sr < 80; sr += 2) {
            const sa = spiralAngle + sr * 0.03
            ctx.lineTo(Math.cos(sa) * sr, Math.sin(sa) * sr)
          }
          ctx.stroke()
        }
        ctx.restore()
      }

      // ---- Update nodes ----
      for (const n of nodes) {
        n.x += n.vx
        n.y += n.vy
        if (n.x < -20) n.x = W + 20
        if (n.x > W + 20) n.x = -20
        if (n.y < -20) n.y = H + 20
        if (n.y > H + 20) n.y = -20
        n.vx *= 0.999
        n.vy *= 0.999
        n.flowPhase += 0.01
      }

      // ---- Layer 5: Dark matter filaments with matter flow ----
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const threshold = (nodes[i].isCluster || nodes[j].isCluster) ? CLUSTER_DIST : FILAMENT_DIST

          if (dist < threshold) {
            const alpha = (1 - dist / threshold) * 0.1
            const pulse = 0.6 + 0.4 * Math.sin(t * 1.2 + i * 0.1)
            const bothCluster = nodes[i].isCluster && nodes[j].isCluster

            // Main filament line — purple/blue gradient
            const grad = ctx.createLinearGradient(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y)
            grad.addColorStop(0, `rgba(124, 77, 255, ${alpha * pulse * nodes[i].brightness})`)
            grad.addColorStop(0.3, `rgba(100, 140, 255, ${alpha * pulse * 0.6})`)
            grad.addColorStop(0.5, `rgba(79, 195, 247, ${alpha * pulse * 0.5})`)
            grad.addColorStop(0.7, `rgba(100, 140, 255, ${alpha * pulse * 0.6})`)
            grad.addColorStop(1, `rgba(124, 77, 255, ${alpha * pulse * nodes[j].brightness})`)

            ctx.beginPath()
            // Curved filaments instead of straight lines for organic feel
            const midX = (nodes[i].x + nodes[j].x) / 2 + Math.sin(t + i + j) * 8
            const midY = (nodes[i].y + nodes[j].y) / 2 + Math.cos(t + i * 0.5) * 8
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.quadraticCurveTo(midX, midY, nodes[j].x, nodes[j].y)
            ctx.strokeStyle = grad
            ctx.lineWidth = bothCluster ? 2.0 : 0.8
            ctx.stroke()

            // Secondary glow filament (wider, dimmer)
            if (bothCluster || alpha > 0.05) {
              ctx.beginPath()
              ctx.moveTo(nodes[i].x, nodes[i].y)
              ctx.quadraticCurveTo(midX, midY, nodes[j].x, nodes[j].y)
              ctx.strokeStyle = `rgba(124, 77, 255, ${alpha * pulse * 0.15})`
              ctx.lineWidth = bothCluster ? 6 : 3
              ctx.stroke()
            }

            // Matter flow particles along filaments
            if (dist < threshold * 0.8) {
              const flowCount = bothCluster ? 4 : 2
              for (let f = 0; f < flowCount; f++) {
                const flowT = ((t * 0.5 + f * 0.25 + i * 0.1) % 1)
                const ft2 = flowT * flowT // quadratic for acceleration
                const fx = nodes[i].x + (nodes[j].x - nodes[i].x) * ft2
                const fy = nodes[i].y + (nodes[j].y - nodes[i].y) * ft2
                const pfx = fx + (midX - (nodes[i].x + nodes[j].x) / 2) * Math.sin(flowT * Math.PI) * 0.3
                const pfy = fy + (midY - (nodes[i].y + nodes[j].y) / 2) * Math.sin(flowT * Math.PI) * 0.3
                const flowAlpha = Math.sin(flowT * Math.PI) * alpha * 3

                ctx.fillStyle = `rgba(150, 200, 255, ${flowAlpha})`
                ctx.beginPath()
                ctx.arc(pfx, pfy, 0.8, 0, Math.PI * 2)
                ctx.fill()
              }
            }
          }
        }
      }

      // ---- Layer 6: Galaxy clusters with orbiting galaxies ----
      for (const n of nodes) {
        if (n.isCluster) {
          // Gravitational lensing ring around cluster
          const lensR = 12 + n.mass * 4
          const lensAlpha = 0.04 + 0.03 * Math.sin(t * 1.5 + n.x * 0.01)
          ctx.beginPath()
          ctx.arc(n.x, n.y, lensR, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(130, 200, 255, ${lensAlpha})`
          ctx.lineWidth = 1.5
          ctx.stroke()

          // Lensing arcs (partial rings at different angles)
          for (let arc = 0; arc < 3; arc++) {
            const arcAngle = t * 0.2 + arc * 2.1 + n.y * 0.005
            const arcR = lensR + 3 + arc * 3
            ctx.beginPath()
            ctx.arc(n.x, n.y, arcR, arcAngle, arcAngle + 0.8)
            ctx.strokeStyle = `rgba(100, 180, 255, ${lensAlpha * 0.5})`
            ctx.lineWidth = 0.6
            ctx.stroke()
          }

          // Diffraction spikes
          const spikeLen = 8 + n.mass * 3
          const spikeAlpha = 0.18 + 0.12 * Math.sin(t * 2 + n.x)
          ctx.lineWidth = 0.4
          for (let s = 0; s < 6; s++) {
            const angle = (s * Math.PI) / 3 + Math.PI / 6
            const grad = ctx.createLinearGradient(
              n.x - Math.cos(angle) * spikeLen, n.y - Math.sin(angle) * spikeLen,
              n.x + Math.cos(angle) * spikeLen, n.y + Math.sin(angle) * spikeLen
            )
            grad.addColorStop(0, "rgba(255,255,255,0)")
            grad.addColorStop(0.4, `rgba(255,255,255,${spikeAlpha})`)
            grad.addColorStop(0.5, `rgba(255,245,220,${spikeAlpha * 1.3})`)
            grad.addColorStop(0.6, `rgba(255,255,255,${spikeAlpha})`)
            grad.addColorStop(1, "rgba(255,255,255,0)")
            ctx.beginPath()
            ctx.moveTo(n.x - Math.cos(angle) * spikeLen, n.y - Math.sin(angle) * spikeLen)
            ctx.lineTo(n.x + Math.cos(angle) * spikeLen, n.y + Math.sin(angle) * spikeLen)
            ctx.strokeStyle = grad
            ctx.stroke()
          }

          // Cluster hot gas glow (larger, multi-layer)
          const cGrad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 14 + n.mass * 4)
          cGrad.addColorStop(0, `rgba(255, 250, 230, ${0.6 * n.brightness})`)
          cGrad.addColorStop(0.15, `rgba(255, 200, 150, ${0.3 * n.brightness})`)
          cGrad.addColorStop(0.4, `rgba(180, 140, 255, ${0.12 * n.brightness})`)
          cGrad.addColorStop(0.7, `rgba(80, 120, 255, ${0.04 * n.brightness})`)
          cGrad.addColorStop(1, "rgba(0, 0, 0, 0)")
          ctx.fillStyle = cGrad
          ctx.beginPath()
          ctx.arc(n.x, n.y, 14 + n.mass * 4, 0, Math.PI * 2)
          ctx.fill()

          // Bright core
          ctx.fillStyle = `rgba(255, 255, 255, ${0.7 * n.brightness})`
          ctx.beginPath()
          ctx.arc(n.x, n.y, 1.2, 0, Math.PI * 2)
          ctx.fill()

          // Orbiting galaxies around cluster
          for (const orb of n.orbiters) {
            orb.angle += orb.speed * 0.008
            const ox = n.x + Math.cos(orb.angle) * orb.dist
            const oy = n.y + Math.sin(orb.angle) * orb.dist
            ctx.fillStyle = `hsla(${orb.hue}, 50%, 70%, ${0.3 * n.brightness})`
            ctx.beginPath()
            ctx.arc(ox, oy, orb.size, 0, Math.PI * 2)
            ctx.fill()
          }
        } else {
          // Small dim matter particle with subtle glow
          const glowR = n.mass * 2
          const pGrad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowR)
          pGrad.addColorStop(0, `rgba(180, 160, 255, ${n.brightness * 0.6})`)
          pGrad.addColorStop(1, `rgba(180, 160, 255, 0)`)
          ctx.fillStyle = pGrad
          ctx.beginPath()
          ctx.arc(n.x, n.y, glowR, 0, Math.PI * 2)
          ctx.fill()

          ctx.fillStyle = `rgba(200, 190, 255, ${n.brightness * 0.7})`
          ctx.beginPath()
          ctx.arc(n.x, n.y, n.mass * 0.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // ---- Layer 7: Gravitational wave ripples from multiple sources ----
      const waveSources = [
        { x: W * 0.5, y: H * 0.5, speed: 25, count: 5, maxR: 600, color: "79, 195, 247" },
        { x: W * 0.2, y: H * 0.7, speed: 18, count: 3, maxR: 350, color: "124, 77, 255" },
        { x: W * 0.8, y: H * 0.3, speed: 20, count: 3, maxR: 400, color: "100, 150, 255" },
      ]
      for (const src of waveSources) {
        for (let r = 0; r < src.count; r++) {
          const waveRadius = ((t * src.speed + r * (src.maxR / src.count)) % src.maxR)
          const waveAlpha = Math.max(0, 0.03 * (1 - waveRadius / src.maxR))
          // Distorted circle (not perfect, simulating spacetime warping)
          ctx.beginPath()
          for (let a = 0; a <= 64; a++) {
            const angle = (a / 64) * Math.PI * 2
            const wobble = 1 + 0.02 * Math.sin(angle * 3 + t * 2 + r)
            const px = src.x + Math.cos(angle) * waveRadius * wobble
            const py = src.y + Math.sin(angle) * waveRadius * wobble
            if (a === 0) ctx.moveTo(px, py)
            else ctx.lineTo(px, py)
          }
          ctx.closePath()
          ctx.strokeStyle = `rgba(${src.color}, ${waveAlpha})`
          ctx.lineWidth = 1.2
          ctx.stroke()
        }
      }

      // ---- Layer 8: Cosmic transient events ----
      // Spawn events occasionally
      if (Math.random() < 0.003) spawnEvent()

      // Draw and cleanup events
      for (let ei = events.length - 1; ei >= 0; ei--) {
        const ev = events[ei]
        const age = t - ev.birth
        const progress = age / ev.duration
        if (progress > 1) {
          events.splice(ei, 1)
          continue
        }

        const fadeIn = Math.min(1, age * 4)
        const fadeOut = 1 - Math.pow(progress, 2)
        const alpha = fadeIn * fadeOut * ev.intensity

        if (ev.type === "grb") {
          // Gamma-ray burst: narrow jet beam
          ctx.save()
          ctx.translate(ev.x, ev.y)
          ctx.rotate(ev.angle)
          const jetLen = 60 + progress * 100
          const jetGrad = ctx.createLinearGradient(0, 0, jetLen, 0)
          jetGrad.addColorStop(0, `rgba(200, 255, 200, ${alpha * 0.6})`)
          jetGrad.addColorStop(0.3, `rgba(100, 255, 150, ${alpha * 0.3})`)
          jetGrad.addColorStop(1, `rgba(100, 255, 150, 0)`)
          ctx.fillStyle = jetGrad
          ctx.beginPath()
          ctx.moveTo(0, -2)
          ctx.lineTo(jetLen, -0.5)
          ctx.lineTo(jetLen, 0.5)
          ctx.lineTo(0, 2)
          ctx.closePath()
          ctx.fill()
          // Opposite jet
          ctx.rotate(Math.PI)
          ctx.fill()
          // Core flash
          ctx.restore()
          const coreGrad = ctx.createRadialGradient(ev.x, ev.y, 0, ev.x, ev.y, 8)
          coreGrad.addColorStop(0, `rgba(200, 255, 200, ${alpha * 0.8})`)
          coreGrad.addColorStop(1, `rgba(100, 255, 150, 0)`)
          ctx.fillStyle = coreGrad
          ctx.beginPath()
          ctx.arc(ev.x, ev.y, 8, 0, Math.PI * 2)
          ctx.fill()
        } else if (ev.type === "quasar") {
          // Quasar: bright core with accretion disk and jets
          const diskR = 5 + progress * 8
          // Accretion disk
          ctx.save()
          ctx.translate(ev.x, ev.y)
          ctx.rotate(ev.angle)
          ctx.scale(1, 0.3)
          const diskGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, diskR)
          diskGrad.addColorStop(0, `rgba(255, 230, 150, ${alpha * 0.9})`)
          diskGrad.addColorStop(0.5, `rgba(255, 150, 50, ${alpha * 0.4})`)
          diskGrad.addColorStop(1, `rgba(200, 100, 255, 0)`)
          ctx.fillStyle = diskGrad
          ctx.beginPath()
          ctx.arc(0, 0, diskR, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
          // Jets
          ctx.save()
          ctx.translate(ev.x, ev.y)
          ctx.rotate(ev.angle + Math.PI / 2)
          const qJetLen = 40 + progress * 60
          ctx.strokeStyle = `rgba(150, 180, 255, ${alpha * 0.4})`
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(0, -3)
          ctx.lineTo(0, -qJetLen)
          ctx.moveTo(0, 3)
          ctx.lineTo(0, qJetLen)
          ctx.stroke()
          ctx.restore()
        } else {
          // Supernova: expanding bright shell
          const sRadius = 3 + progress * 50
          const sGrad = ctx.createRadialGradient(ev.x, ev.y, 0, ev.x, ev.y, sRadius)
          sGrad.addColorStop(0, `rgba(255, 255, 240, ${alpha * 0.9})`)
          sGrad.addColorStop(0.2, `rgba(255, 200, 100, ${alpha * 0.5})`)
          sGrad.addColorStop(0.5, `rgba(255, 100, 50, ${alpha * 0.2})`)
          sGrad.addColorStop(1, `rgba(200, 50, 30, 0)`)
          ctx.fillStyle = sGrad
          ctx.beginPath()
          ctx.arc(ev.x, ev.y, sRadius, 0, Math.PI * 2)
          ctx.fill()
          // Expanding shockwave ring
          ctx.beginPath()
          ctx.arc(ev.x, ev.y, sRadius * 1.2, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(255, 180, 100, ${alpha * 0.3})`
          ctx.lineWidth = 0.8
          ctx.stroke()
        }
      }

      // ---- Layer 9: Redshift color gradient at edges ----
      // Edges of screen get redshifted to simulate expansion of observable universe
      const edgeGrad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.8)
      edgeGrad.addColorStop(0, "rgba(0,0,0,0)")
      edgeGrad.addColorStop(0.5, "rgba(0,0,0,0)")
      edgeGrad.addColorStop(0.7, "rgba(30,5,10,0.06)")
      edgeGrad.addColorStop(1, "rgba(40,8,15,0.12)")
      ctx.fillStyle = edgeGrad
      ctx.fillRect(0, 0, W, H)

      animFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", resize)
      window.removeEventListener("scroll", onScroll)
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[#020206]" />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: "none" }}
      />
      {/* Deep void gradient overlay — enhanced with vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 20%, rgba(2,2,6,0.3) 60%, rgba(2,2,6,0.7) 100%)",
        }}
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
// Spacetime Glass Card — with blue-shifted edges
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
        background: "rgba(8, 8, 24, 0.6)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: glowColor
          ? `1px solid ${glowColor}25`
          : "1px solid rgba(79, 195, 247, 0.08)",
        boxShadow: glowColor
          ? `0 0 20px ${glowColor}08, inset 0 1px 0 rgba(79,195,247,0.04), 0 0 1px rgba(79,195,247,0.1)`
          : "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(79,195,247,0.04), 0 0 1px rgba(79,195,247,0.08)",
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ============================================================================
// Bottom Bar — gravitational wave pulse animation
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
        background: "rgba(5, 5, 16, 0.9)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      {/* Gravitational wave pulse border */}
      <div className="relative h-px w-full overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: "rgba(79, 195, 247, 0.1)" }}
        />
        <div
          className="absolute h-full"
          style={{
            width: "200px",
            background: "linear-gradient(90deg, transparent, rgba(79, 195, 247, 0.5), rgba(124, 77, 255, 0.5), transparent)",
            animation: "v9dWavePulse 4s ease-in-out infinite",
          }}
        />
      </div>

      <div className="mx-auto max-w-3xl flex items-center justify-between px-6 pt-3 pb-2">
        <span className="text-xs text-cyan-300/40">{statusText}</span>
        <button
          onClick={onCta}
          disabled={ctaDisabled}
          className="px-5 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-30"
          style={{
            background: ctaDisabled
              ? "rgba(20, 20, 50, 0.5)"
              : "linear-gradient(135deg, #4FC3F7, #7C4DFF)",
            color: ctaDisabled ? "rgba(79,195,247,0.3)" : "white",
            boxShadow: ctaDisabled ? "none" : "0 0 16px rgba(124,77,255,0.3), 0 0 30px rgba(79,195,247,0.1)",
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
                    style={{ background: isDone ? "rgba(79,195,247,0.5)" : "rgba(79,195,247,0.08)" }}
                  />
                  {isDone && (
                    <div
                      className="absolute inset-0"
                      style={{
                        background: "linear-gradient(90deg, transparent, rgba(79,195,247,0.7), transparent)",
                        animation: "v9dLineShimmer 2s ease-in-out infinite",
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
                      ? "linear-gradient(135deg, #4FC3F7, #7C4DFF)"
                      : isActive
                        ? "rgba(124,77,255,0.25)"
                        : "rgba(20, 20, 50, 0.5)",
                    color: isDone || isActive ? "white" : "rgba(79,195,247,0.3)",
                    border: isActive
                      ? "2px solid rgba(124,77,255,0.5)"
                      : isDone
                        ? "none"
                        : "1px solid rgba(79,195,247,0.1)",
                    boxShadow: isActive
                      ? "0 0 16px rgba(124,77,255,0.3)"
                      : isDone
                        ? "0 0 8px rgba(79,195,247,0.2)"
                        : "none",
                    animation: isActive ? "v9dStepPulse 2s ease-in-out infinite" : "none",
                    cursor: isClickable ? "pointer" : "default",
                  }}
                >
                  {isDone ? <Check className="size-3" /> : i + 1}
                </button>
                <span
                  className="text-[9px] hidden sm:block"
                  style={{ color: isActive ? "#7C4DFF" : isDone ? "#4FC3F7" : "rgba(79,195,247,0.2)" }}
                >
                  {label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <style>{`
        @keyframes v9dStepPulse {
          0%, 100% { box-shadow: 0 0 12px rgba(124,77,255,0.3); }
          50% { box-shadow: 0 0 24px rgba(124,77,255,0.5), 0 0 40px rgba(79,195,247,0.15); }
        }
        @keyframes v9dLineShimmer {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes v9dWavePulse {
          0% { left: -200px; }
          100% { left: 100%; }
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
            <Sparkles className="size-8 text-cyan-400 opacity-60" />
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(79,195,247,0.2) 0%, transparent 70%)",
                animation: "v9dIconGlow 3s ease-in-out infinite",
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
                ? "rgba(124,77,255,0.1)"
                : "rgba(124,77,255,0.03)",
              backdropFilter: "blur(8px)",
              border: selectedPath === "fto"
                ? "1px solid rgba(124,77,255,0.35)"
                : "1px solid rgba(124,77,255,0.08)",
              boxShadow: selectedPath === "fto"
                ? "0 0 30px rgba(124,77,255,0.1), inset 0 1px 0 rgba(255,255,255,0.04)"
                : "none",
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="size-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(124,77,255,0.2)" }}
              >
                <Star className="size-5 text-violet-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">Find The One</h3>
                <p className="text-xs text-white/40">Connection & commitment</p>
              </div>
              {selectedPath === "fto" && (
                <div style={{ animation: "v9dCheckPop 0.3s ease-out" }}>
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
                ? "rgba(249,115,22,0.1)"
                : "rgba(249,115,22,0.03)",
              backdropFilter: "blur(8px)",
              border: selectedPath === "abundance"
                ? "1px solid rgba(249,115,22,0.35)"
                : "1px solid rgba(249,115,22,0.08)",
              boxShadow: selectedPath === "abundance"
                ? "0 0 30px rgba(249,115,22,0.1), inset 0 1px 0 rgba(255,255,255,0.04)"
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
                <div style={{ animation: "v9dCheckPop 0.3s ease-out" }}>
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
          <div className="flex-1 h-px" style={{ background: "rgba(79,195,247,0.06)" }} />
          <span className="text-xs uppercase tracking-wider text-cyan-300/20">Other Life Areas</span>
          <div className="flex-1 h-px" style={{ background: "rgba(79,195,247,0.06)" }} />
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
                  background: isSelected ? `${area.hex}0d` : "rgba(255,255,255,0.02)",
                  backdropFilter: "blur(8px)",
                  border: isSelected
                    ? `1px solid ${area.hex}35`
                    : "1px solid rgba(255,255,255,0.04)",
                  boxShadow: isSelected ? `0 0 20px ${area.hex}08` : "none",
                }}
              >
                <div
                  className="size-10 rounded-xl flex items-center justify-center transition-all duration-300"
                  style={{
                    background: isSelected ? `${area.hex}18` : "rgba(255,255,255,0.04)",
                    boxShadow: isSelected ? `0 0 12px ${area.hex}15` : "none",
                  }}
                >
                  <Icon
                    className="size-5"
                    style={{ color: isSelected ? area.hex : "rgba(255,255,255,0.35)" }}
                  />
                </div>
                <span
                  className={`text-xs font-medium text-center leading-tight ${isSelected ? "text-white" : "text-white/35"}`}
                >
                  {area.name}
                </span>
              </button>
            )
          })}
        </div>
      </div>
      <style>{`
        @keyframes v9dIconGlow {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.5); opacity: 1; }
        }
        @keyframes v9dCheckPop {
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
              const catColor = CATEGORY_COLORS[category] ?? "#4FC3F7"

              return (
                <div key={category} className="mb-3">
                  <button
                    onClick={() => toggleSection(sectionId)}
                    className="w-full flex items-center gap-3 rounded-lg px-4 py-2.5 transition-all duration-200"
                    style={{
                      background:
                        selectedCount > 0
                          ? `${catColor}0c`
                          : "rgba(255,255,255,0.02)",
                      backdropFilter: "blur(8px)",
                      border:
                        selectedCount > 0
                          ? `1px solid ${catColor}20`
                          : "1px solid rgba(255,255,255,0.04)",
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
                    <div className="ml-4 mt-1.5 space-y-1" style={{ animation: "v9dSlideDown 0.25s ease-out" }}>
                      {goals.map((l3) => {
                        const isOn = selectedGoals.has(l3.id)
                        const meta = getGoalMeta(l3)
                        return (
                          <div key={l3.id}>
                            <div
                              className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200"
                              style={{
                                background: isOn ? `${catColor}0c` : "transparent",
                                border: isOn
                                  ? `1px solid ${catColor}20`
                                  : "1px solid transparent",
                              }}
                            >
                              <button
                                onClick={() => onToggle(l3.id)}
                                className="size-4 rounded flex items-center justify-center shrink-0 transition-all duration-200"
                                style={{
                                  background: isOn ? catColor : "rgba(255,255,255,0.08)",
                                  border: isOn ? "none" : "1px solid rgba(255,255,255,0.15)",
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
                            background: `${catColor}0c`,
                            border: `1px solid ${catColor}20`,
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
                        style={{ border: "1px dashed rgba(255,255,255,0.06)" }}
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
                          ? "rgba(124,77,255,0.06)"
                          : "rgba(255,255,255,0.02)",
                      backdropFilter: "blur(8px)",
                      border:
                        catGoals.length > 0
                          ? "1px solid rgba(124,77,255,0.12)"
                          : "1px solid rgba(255,255,255,0.04)",
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
                    <div className="ml-4 mt-1.5 space-y-1" style={{ animation: "v9dSlideDown 0.25s ease-out" }}>
                      {catGoals.map((cg) => (
                        <div
                          key={cg.id}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                          style={{
                            background: "rgba(124,77,255,0.06)",
                            border: "1px solid rgba(124,77,255,0.12)",
                          }}
                        >
                          <div
                            className="size-4 rounded flex items-center justify-center shrink-0"
                            style={{ background: "#7C4DFF" }}
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
                        style={{ border: "1px dashed rgba(255,255,255,0.06)" }}
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
              style={{ border: "1px dashed rgba(124,77,255,0.15)" }}
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
                    border: `1px solid ${area.hex}12`,
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
                  <div className="ml-4 mt-1.5 space-y-1" style={{ animation: "v9dSlideDown 0.25s ease-out" }}>
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
                              ? `1px solid ${area.hex}12`
                              : "1px solid transparent",
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
                          border: `1px solid ${area.hex}12`,
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
                      style={{ border: "1px dashed rgba(255,255,255,0.06)" }}
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
        @keyframes v9dSlideDown {
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
        @keyframes v9d-pour-in {
          0% { opacity: 0; transform: translateY(-40px) scaleY(0.8); filter: blur(8px); }
          60% { opacity: 1; transform: translateY(4px) scaleY(1.02); filter: blur(0px); }
          80% { transform: translateY(-2px) scaleY(0.99); }
          100% { opacity: 1; transform: translateY(0px) scaleY(1); filter: blur(0px); }
        }
        .v9d-stagger-enter {
          animation: v9d-pour-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        @keyframes v9d-glow-pulse {
          0%, 100% { box-shadow: 0 0 15px var(--glow-color, rgba(79,195,247,0.1)), inset 0 1px 0 rgba(79,195,247,0.03); }
          50% { box-shadow: 0 0 25px var(--glow-color, rgba(79,195,247,0.2)), inset 0 1px 0 rgba(79,195,247,0.05); }
        }
      `}</style>

      <div className="mx-auto max-w-2xl">
        <div className="text-center mb-8 v9d-stagger-enter">
          <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
            System Ready
          </h2>
          <p className="text-white/30 text-sm">
            {totalGoals} goals across {totalAreas} life area{totalAreas > 1 ? "s" : ""}
            {path && ` \u00b7 ${path === "fto" ? "Find The One" : "Abundance"} path`}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: "Total Goals", value: String(totalGoals), color: "#4FC3F7" },
            { label: "Life Areas", value: String(totalAreas), color: "#7C4DFF" },
            { label: "Achievements", value: String(sortedBadges.length), color: "#f59e0b" },
          ].map((stat, i) => (
            <GlassCard key={stat.label} glowColor={stat.color} className="v9d-stagger-enter" style={{ animationDelay: `${50 + i * 60}ms` }}>
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
          <GlassCard className="mb-6 v9d-stagger-enter" glowColor="#f59e0b" style={{ animationDelay: "230ms" }}>
            <div
              className="px-5 py-3 flex items-center justify-between"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
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
          const catColor = CATEGORY_COLORS[category] ?? "#4FC3F7"
          return (
            <div key={category} className="mb-3 rounded-xl overflow-hidden v9d-stagger-enter"
              style={{
                animationDelay: `${280 + catIdx * 50}ms`,
                background: "rgba(255,255,255,0.02)",
                backdropFilter: "blur(12px)",
                borderTop: `2px solid ${catColor}35`,
                borderLeft: "1px solid rgba(79,195,247,0.05)",
                borderRight: "1px solid rgba(79,195,247,0.05)",
                borderBottom: "1px solid rgba(79,195,247,0.05)",
                "--glow-color": `${catColor}0d`,
                animation: "v9d-glow-pulse 5s ease-in-out infinite",
              } as React.CSSProperties}
            >
              <div className="px-5 py-3 flex items-center justify-between"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
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
          <div key={area.id} className="mb-3 rounded-xl overflow-hidden v9d-stagger-enter"
            style={{
              animationDelay: `${380 + areaIdx * 50}ms`,
              background: "rgba(255,255,255,0.02)",
              backdropFilter: "blur(12px)",
              borderTop: `2px solid ${area.hex}35`,
              borderLeft: "1px solid rgba(79,195,247,0.05)",
              borderRight: "1px solid rgba(79,195,247,0.05)",
              borderBottom: "1px solid rgba(79,195,247,0.05)",
              "--glow-color": `${area.hex}0d`,
              animation: "v9d-glow-pulse 5s ease-in-out infinite",
            } as React.CSSProperties}
          >
            <div className="px-5 py-3 flex items-center justify-between"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
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
              <div key={catId} className="mb-3 rounded-xl overflow-hidden v9d-stagger-enter"
                style={{
                  animationDelay: `${450 + cIdx * 50}ms`,
                  background: "rgba(255,255,255,0.02)",
                  backdropFilter: "blur(12px)",
                  borderTop: "2px solid rgba(124,77,255,0.25)",
                  borderLeft: "1px solid rgba(79,195,247,0.05)",
                  borderRight: "1px solid rgba(79,195,247,0.05)",
                  borderBottom: "1px solid rgba(79,195,247,0.05)",
                  "--glow-color": "rgba(124,77,255,0.0d)",
                  animation: "v9d-glow-pulse 5s ease-in-out infinite",
                } as React.CSSProperties}
              >
                <div className="px-5 py-3 flex items-center justify-between"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
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
                        style={{ background: "#7C4DFF", boxShadow: "0 0 4px rgba(124,77,255,0.4)" }}
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
// Step 4: Gravitational System (Orrery) — Enhanced with dramatic effects
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

function GravitationalSystemStep({
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

  // Generate lensed background stars around the sun
  const lensedStars = useMemo(() => {
    const stars: { angle: number; r: number; size: number; brightness: number }[] = []
    for (let i = 0; i < 60; i++) {
      stars.push({
        angle: Math.random() * Math.PI * 2,
        r: SUN_RADIUS * 1.2 + Math.random() * SUN_RADIUS * 2.5,
        size: 0.3 + Math.random() * 1.2,
        brightness: 0.2 + Math.random() * 0.5,
      })
    }
    return stars
  }, [])

  // Generate geodesic curve paths near masses
  const geodesicPaths = useMemo(() => {
    const paths: string[] = []
    for (let i = 0; i < 16; i++) {
      const startAngle = (i / 16) * Math.PI * 2
      let pathD = ""
      for (let step = 0; step < 30; step++) {
        const r = 50 + step * 10
        // Geodesic bending near sun — stronger warp closer to center
        const warpStrength = (SUN_RADIUS * 3) / (r + 30)
        const bendAngle = startAngle + warpStrength * 0.4 * Math.sign(Math.sin(startAngle))
        const x = CENTER + Math.cos(bendAngle) * r
        const y = CENTER + Math.sin(bendAngle) * r
        pathD += step === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`
      }
      paths.push(pathD)
    }
    return paths
  }, [])

  return (
    <div className="min-h-screen pt-8 pb-36 px-6">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
            Your System
          </h2>
          <p className="text-white/40 text-sm">
            {totalGoals} goals {"\u00b7"} {activeAreas.size} life areas
            {path && ` \u00b7 ${path === "fto" ? "Find The One" : "Abundance"}`}
          </p>
        </div>

        <div
          className="relative w-full mx-auto"
          style={{ maxWidth: 740, aspectRatio: "1/1" }}
        >
          <style>{`
            @keyframes v9dSunPulse {
              0%, 100% {
                filter: drop-shadow(0 0 25px rgba(255, 200, 100, 0.6))
                        drop-shadow(0 0 50px rgba(79, 195, 247, 0.25))
                        drop-shadow(0 0 80px rgba(255, 150, 50, 0.15));
              }
              50% {
                filter: drop-shadow(0 0 40px rgba(255, 200, 100, 0.9))
                        drop-shadow(0 0 80px rgba(79, 195, 247, 0.4))
                        drop-shadow(0 0 120px rgba(255, 150, 50, 0.25));
              }
            }
            @keyframes v9dSunCorona {
              0%, 100% { stroke-opacity: 0.06; stroke-dashoffset: 0; }
              50% { stroke-opacity: 0.12; stroke-dashoffset: 20; }
            }
            @keyframes v9dGravWave {
              0% { r: ${SUN_RADIUS + 8}; opacity: 0.2; stroke-width: 2; }
              50% { opacity: 0.08; stroke-width: 1.2; }
              100% { r: 340; opacity: 0; stroke-width: 0.3; }
            }
            @keyframes v9dGravWaveDistort {
              0% { r: ${SUN_RADIUS + 12}; opacity: 0.12; }
              100% { r: 330; opacity: 0; }
            }
            @keyframes v9dHawking {
              0% { opacity: 0; transform: translate(0, 0) scale(1); }
              15% { opacity: 1; }
              100% { opacity: 0; transform: translate(var(--hx), var(--hy)) scale(0); }
            }
            @keyframes v9dHawkingAnti {
              0% { opacity: 0; transform: translate(0, 0) scale(1); }
              15% { opacity: 0.7; }
              100% { opacity: 0; transform: translate(var(--ahx), var(--ahy)) scale(0); }
            }
            @keyframes v9dEinsteinRingPulse {
              0%, 100% { stroke-opacity: 0.15; }
              50% { stroke-opacity: 0.35; }
            }
            @keyframes v9dEinsteinRingRotate {
              from { stroke-dashoffset: 0; }
              to { stroke-dashoffset: 60; }
            }
            @keyframes v9dLensArc {
              0%, 100% { stroke-opacity: 0.08; stroke-width: 1; }
              50% { stroke-opacity: 0.2; stroke-width: 1.5; }
            }
            @keyframes v9dLensAmplify {
              0%, 100% { opacity: 0.15; r: 0.6; }
              50% { opacity: 0.5; r: 1.2; }
            }
            @keyframes v9dDarkMatterHalo {
              0%, 100% { opacity: 0.12; transform: scale(1); }
              50% { opacity: 0.22; transform: scale(1.08); }
            }
            @keyframes v9dDarkMatterRotation {
              from { stroke-dashoffset: 0; }
              to { stroke-dashoffset: 40; }
            }
            @keyframes v9dPlanetBreathe {
              0%, 100% { transform: scale(1); opacity: 0.25; }
              50% { transform: scale(1.08); opacity: 0.35; }
            }
            @keyframes v9dGridPulse {
              0%, 100% { stroke-opacity: 0.025; }
              50% { stroke-opacity: 0.055; }
            }
            @keyframes v9dFilamentPulse {
              0% { stroke-dashoffset: 0; stroke-opacity: 0.06; }
              50% { stroke-opacity: 0.15; }
              100% { stroke-dashoffset: -30; stroke-opacity: 0.06; }
            }
            @keyframes v9dFrameDrag {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes v9dRocheTidal {
              0%, 100% { stroke-opacity: 0.04; }
              50% { stroke-opacity: 0.1; }
            }
            @keyframes v9dAccretionDisk {
              from { stroke-dashoffset: 0; }
              to { stroke-dashoffset: -100; }
            }
            ${visibleAreas
              .map((area) => {
                const config = ORBIT_CONFIG[area.id]
                if (!config) return ""
                return `
                @keyframes v9dOrbit-${area.id} {
                  from { transform: rotate(${config.startAngle}deg); }
                  to { transform: rotate(${config.startAngle + 360}deg); }
                }
                @keyframes v9dCounterOrbit-${area.id} {
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
              <radialGradient id="v9d-sun-gradient" cx="35%" cy="35%">
                <stop offset="0%" stopColor="#fffef0" />
                <stop offset="10%" stopColor="#fff8c4" />
                <stop offset="25%" stopColor="#ffd54f" />
                <stop offset="45%" stopColor="#ff9800" />
                <stop offset="65%" stopColor="#f44336" />
                <stop offset="80%" stopColor="#e65100" />
                <stop offset="95%" stopColor="#bf360c" />
                <stop offset="100%" stopColor="#8d1a00" />
              </radialGradient>
              <radialGradient id="v9d-sun-glow">
                <stop offset="0%" stopColor="#ff9800" stopOpacity="0.5" />
                <stop offset="15%" stopColor="#ff6d00" stopOpacity="0.25" />
                <stop offset="35%" stopColor="#ff3d00" stopOpacity="0.08" />
                <stop offset="55%" stopColor="#4FC3F7" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#4FC3F7" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="v9d-sun-glow-outer">
                <stop offset="0%" stopColor="#ff9800" stopOpacity="0.12" />
                <stop offset="30%" stopColor="#7C4DFF" stopOpacity="0.04" />
                <stop offset="60%" stopColor="#4FC3F7" stopOpacity="0.02" />
                <stop offset="100%" stopColor="#4FC3F7" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="v9d-einstein-ring-glow">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="60%" stopColor="transparent" />
                <stop offset="75%" stopColor="#4FC3F7" stopOpacity="0.06" />
                <stop offset="85%" stopColor="#4FC3F7" stopOpacity="0.12" />
                <stop offset="92%" stopColor="#7C4DFF" stopOpacity="0.08" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
              <radialGradient id="v9d-dark-matter-halo">
                <stop offset="0%" stopColor="#7C4DFF" stopOpacity="0.15" />
                <stop offset="30%" stopColor="#7C4DFF" stopOpacity="0.08" />
                <stop offset="60%" stopColor="#4FC3F7" stopOpacity="0.03" />
                <stop offset="100%" stopColor="#7C4DFF" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="v9d-dark-matter-halo-2">
                <stop offset="0%" stopColor="#4FC3F7" stopOpacity="0.08" />
                <stop offset="50%" stopColor="#7C4DFF" stopOpacity="0.04" />
                <stop offset="100%" stopColor="#7C4DFF" stopOpacity="0" />
              </radialGradient>
              <filter id="v9d-planet-glow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="blur" />
                <feFlood floodOpacity="0.6" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="v9d-active-glow" x="-120%" y="-120%" width="340%" height="340%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="10" result="blur" />
                <feFlood floodOpacity="0.8" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="v9d-lens-distort" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                <feColorMatrix in="blur" type="matrix"
                  values="1.1 0 0 0 0.02  0 1.05 0 0 0.01  0 0 1 0 0  0 0 0 1.4 0"
                  result="bright" />
                <feMerge>
                  <feMergeNode in="bright" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="v9d-lensing-blur" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
              </filter>
            </defs>

            {/* ---- Layer 1: Geodesic curves (warped spacetime) ---- */}
            {geodesicPaths.map((d, i) => (
              <path
                key={`geodesic-${i}`}
                d={d}
                fill="none"
                stroke="#4FC3F7"
                strokeWidth="0.25"
                strokeOpacity="0.03"
                strokeDasharray="3,8"
                style={{ animation: `v9dGridPulse ${5 + i * 0.3}s ease-in-out infinite` }}
              />
            ))}

            {/* ---- Layer 2: Spacetime grid — warped concentric circles ---- */}
            {[50, 80, 110, 140, 170, 200, 230, 260, 290, 320].map((baseR, i) => {
              const warp = 1 + (SUN_RADIUS * 2) / (baseR + 15)
              const warpedR = baseR * warp * 0.72
              const alpha = 0.035 * (1 - baseR / 360)
              return (
                <circle
                  key={`grid-circle-${i}`}
                  cx={CENTER}
                  cy={CENTER}
                  r={warpedR}
                  fill="none"
                  stroke="#4FC3F7"
                  strokeWidth="0.35"
                  strokeOpacity={alpha}
                  strokeDasharray="2,5"
                  style={{ animation: `v9dGridPulse ${5 + i * 0.5}s ease-in-out infinite` }}
                />
              )
            })}

            {/* ---- Layer 3: Spacetime grid — radial lines (warped) ---- */}
            {Array.from({ length: 36 }).map((_, i) => {
              const angle = (i / 36) * 360
              const rad = (angle * Math.PI) / 180
              const innerR = 42
              const outerR = 345
              // Warp inner points more than outer
              const warpInner = 1 + (SUN_RADIUS * 1.5) / (innerR + 15)
              return (
                <line
                  key={`grid-line-${i}`}
                  x1={CENTER + Math.cos(rad) * (innerR * warpInner * 0.72)}
                  y1={CENTER + Math.sin(rad) * (innerR * warpInner * 0.72)}
                  x2={CENTER + Math.cos(rad) * outerR}
                  y2={CENTER + Math.sin(rad) * outerR}
                  stroke="#4FC3F7"
                  strokeWidth="0.2"
                  strokeOpacity="0.02"
                  strokeDasharray="1,6"
                />
              )
            })}

            {/* ---- Layer 4: Frame-dragging effect (rotating inner grid) ---- */}
            <g style={{
              transformOrigin: `${CENTER}px ${CENTER}px`,
              animation: "v9dFrameDrag 120s linear infinite",
            }}>
              {Array.from({ length: 8 }).map((_, i) => {
                const angle = (i / 8) * Math.PI * 2
                const r1 = SUN_RADIUS * 1.3
                const r2 = SUN_RADIUS * 2.8
                return (
                  <line
                    key={`frame-drag-${i}`}
                    x1={CENTER + Math.cos(angle) * r1}
                    y1={CENTER + Math.sin(angle) * r1}
                    x2={CENTER + Math.cos(angle + 0.3) * r2}
                    y2={CENTER + Math.sin(angle + 0.3) * r2}
                    stroke="#7C4DFF"
                    strokeWidth="0.4"
                    strokeOpacity="0.06"
                    strokeDasharray="2,4"
                  />
                )
              })}
            </g>

            {/* ---- Layer 5: Gravitational wave ripples — dramatic multi-ring ---- */}
            {[0, 1, 2, 3, 4].map((i) => (
              <circle
                key={`grav-wave-${i}`}
                cx={CENTER}
                cy={CENTER}
                r={SUN_RADIUS + 8}
                fill="none"
                stroke="#4FC3F7"
                strokeWidth="1.5"
                style={{
                  animation: `v9dGravWave 7s ease-out infinite`,
                  animationDelay: `${i * 1.4}s`,
                }}
              />
            ))}
            {/* Secondary distortion waves (violet, offset timing) */}
            {[0, 1, 2].map((i) => (
              <circle
                key={`grav-wave-distort-${i}`}
                cx={CENTER}
                cy={CENTER}
                r={SUN_RADIUS + 12}
                fill="none"
                stroke="#7C4DFF"
                strokeWidth="0.8"
                strokeDasharray="4,8"
                style={{
                  animation: `v9dGravWaveDistort 9s ease-out infinite`,
                  animationDelay: `${i * 3}s`,
                }}
              />
            ))}

            {/* ---- Layer 6: Dark matter filaments connecting active planets ---- */}
            {(() => {
              const activeAreasList = visibleAreas.filter(a => activeAreas.has(a.id) && ORBIT_CONFIG[a.id])
              const filaments: React.ReactNode[] = []
              for (let i = 0; i < activeAreasList.length; i++) {
                for (let j = i + 1; j < activeAreasList.length; j++) {
                  const a1 = ORBIT_CONFIG[activeAreasList[i].id]
                  const a2 = ORBIT_CONFIG[activeAreasList[j].id]
                  if (!a1 || !a2) continue
                  // Draw curved filament between orbit paths
                  const angle1 = (a1.startAngle * Math.PI) / 180
                  const angle2 = (a2.startAngle * Math.PI) / 180
                  filaments.push(
                    <path
                      key={`filament-${i}-${j}`}
                      d={`M ${CENTER + Math.cos(angle1) * a1.radius} ${CENTER + Math.sin(angle1) * a1.radius} Q ${CENTER} ${CENTER} ${CENTER + Math.cos(angle2) * a2.radius} ${CENTER + Math.sin(angle2) * a2.radius}`}
                      fill="none"
                      stroke="#7C4DFF"
                      strokeWidth="0.6"
                      strokeDasharray="3,6"
                      style={{
                        animation: `v9dFilamentPulse ${4 + i * 0.5}s ease-in-out infinite`,
                        animationDelay: `${j * 0.3}s`,
                      }}
                    />
                  )
                }
              }
              return filaments
            })()}

            {/* ---- Layer 7: Orbit paths with enhanced gravitational influence ---- */}
            {visibleAreas.map((area) => {
              const config = ORBIT_CONFIG[area.id]
              if (!config) return null
              const isActive = activeAreas.has(area.id)
              const isHovered = hoveredPlanet === area.id

              return (
                <g key={`orbit-${area.id}`}>
                  {/* Spacetime well depression (gradient thickness) */}
                  {isActive && (
                    <>
                      <circle
                        cx={CENTER}
                        cy={CENTER}
                        r={config.radius}
                        fill="none"
                        stroke={area.hex}
                        strokeWidth="6"
                        strokeOpacity="0.02"
                      />
                      <circle
                        cx={CENTER}
                        cy={CENTER}
                        r={config.radius}
                        fill="none"
                        stroke={area.hex}
                        strokeWidth="3"
                        strokeOpacity="0.04"
                      />
                    </>
                  )}
                  {/* Orbit ring */}
                  <circle
                    cx={CENTER}
                    cy={CENTER}
                    r={config.radius}
                    fill="none"
                    stroke={isActive ? area.hex : "rgba(79,195,247,0.06)"}
                    strokeWidth={isHovered ? 1.8 : isActive ? 1 : 0.3}
                    strokeOpacity={isActive ? 0.35 : 0.08}
                    strokeDasharray={isActive ? "none" : "3,9"}
                    className="transition-all duration-300"
                  />
                  {/* Roche limit ring (inner boundary) for active planets */}
                  {isActive && (
                    <circle
                      cx={CENTER}
                      cy={CENTER}
                      r={config.radius * 0.92}
                      fill="none"
                      stroke={area.hex}
                      strokeWidth="0.3"
                      strokeDasharray="1,6"
                      style={{ animation: `v9dRocheTidal 6s ease-in-out infinite` }}
                    />
                  )}
                </g>
              )
            })}

            {/* ---- Layer 8: Lensed background stars near sun ---- */}
            {lensedStars.map((star, i) => {
              const sx = CENTER + Math.cos(star.angle) * star.r
              const sy = CENTER + Math.sin(star.angle) * star.r
              // Stars closer to sun appear brighter (gravitational lensing amplification)
              const distFromSun = star.r
              const amplification = distFromSun < SUN_RADIUS * 2 ? 1.5 : 1
              return (
                <circle
                  key={`lens-star-${i}`}
                  cx={sx}
                  cy={sy}
                  r={star.size * amplification}
                  fill={`rgba(200, 220, 255, ${star.brightness * amplification})`}
                  style={{
                    animation: `v9dLensAmplify ${3 + (i % 5) * 0.7}s ease-in-out infinite`,
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              )
            })}

            {/* ---- Layer 9: Einstein ring — dramatic multi-layer lensing ---- */}
            {/* Outermost lensing halo */}
            <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS * 3} fill="url(#v9d-sun-glow-outer)" />
            {/* Main Einstein ring glow field */}
            <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS * 2.8} fill="url(#v9d-einstein-ring-glow)" />

            {/* Primary Einstein ring */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={SUN_RADIUS + 18}
              fill="none"
              stroke="#4FC3F7"
              strokeWidth="3"
              style={{ animation: "v9dEinsteinRingPulse 3.5s ease-in-out infinite" }}
            />
            {/* Secondary ring */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={SUN_RADIUS + 23}
              fill="none"
              stroke="#4FC3F7"
              strokeWidth="1.5"
              strokeDasharray="8,4"
              style={{
                animation: "v9dEinsteinRingPulse 3.5s ease-in-out infinite 0.5s, v9dEinsteinRingRotate 20s linear infinite",
              }}
            />
            {/* Tertiary ring — inner */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={SUN_RADIUS + 13}
              fill="none"
              stroke="#7C4DFF"
              strokeWidth="2"
              style={{ animation: "v9dEinsteinRingPulse 3.5s ease-in-out infinite 1s" }}
            />
            {/* Ghost ring — very faint outer */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={SUN_RADIUS + 30}
              fill="none"
              stroke="#4FC3F7"
              strokeWidth="0.6"
              strokeOpacity="0.06"
              strokeDasharray="2,10"
              style={{ animation: "v9dEinsteinRingRotate 30s linear infinite reverse" }}
            />

            {/* Multiple lensing arcs — simulating warped images of background galaxies */}
            {Array.from({ length: 8 }).map((_, i) => {
              const arcAngle = (i / 8) * Math.PI * 2
              const arcR = SUN_RADIUS + 16 + (i % 3) * 4
              const arcLen = 0.3 + (i % 4) * 0.15
              return (
                <path
                  key={`lens-arc-${i}`}
                  d={`M ${CENTER + Math.cos(arcAngle) * arcR} ${CENTER + Math.sin(arcAngle) * arcR} A ${arcR} ${arcR} 0 0 1 ${CENTER + Math.cos(arcAngle + arcLen) * arcR} ${CENTER + Math.sin(arcAngle + arcLen) * arcR}`}
                  fill="none"
                  stroke={i % 2 === 0 ? "#4FC3F7" : "#7C4DFF"}
                  strokeWidth={1 + (i % 3) * 0.5}
                  strokeLinecap="round"
                  style={{
                    animation: `v9dLensArc ${3 + i * 0.4}s ease-in-out infinite`,
                    animationDelay: `${i * 0.3}s`,
                  }}
                />
              )
            })}

            {/* ---- Layer 10: Accretion disk effect around sun ---- */}
            <ellipse
              cx={CENTER}
              cy={CENTER}
              rx={SUN_RADIUS + 8}
              ry={SUN_RADIUS * 0.25}
              fill="none"
              stroke="url(#v9d-sun-gradient)"
              strokeWidth="2"
              strokeOpacity="0.15"
              strokeDasharray="4,3"
              style={{ animation: "v9dAccretionDisk 8s linear infinite" }}
              transform={`rotate(-20, ${CENTER}, ${CENTER})`}
            />
            <ellipse
              cx={CENTER}
              cy={CENTER}
              rx={SUN_RADIUS + 12}
              ry={SUN_RADIUS * 0.3}
              fill="none"
              stroke="#ff9800"
              strokeWidth="1"
              strokeOpacity="0.08"
              strokeDasharray="2,5"
              style={{ animation: "v9dAccretionDisk 12s linear infinite reverse" }}
              transform={`rotate(-20, ${CENTER}, ${CENTER})`}
            />

            {/* Sun corona glow */}
            <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS * 2.2} fill="url(#v9d-sun-glow)" />

            {/* Sun body — enhanced with chromosphere layers */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={SUN_RADIUS + 3}
              fill="none"
              stroke="#ff6d00"
              strokeWidth="3"
              strokeOpacity="0.15"
              strokeDasharray="1,3"
              style={{ animation: "v9dSunCorona 6s ease-in-out infinite" }}
            />
            <circle
              cx={CENTER}
              cy={CENTER}
              r={SUN_RADIUS}
              fill="url(#v9d-sun-gradient)"
              style={{ animation: "v9dSunPulse 3.5s ease-in-out infinite" }}
              filter="url(#v9d-lens-distort)"
            />
            {/* Inner structure */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={SUN_RADIUS * 0.65}
              fill="none"
              stroke="#fffbe6"
              strokeWidth="0.5"
              strokeOpacity="0.25"
            />
            <circle
              cx={CENTER}
              cy={CENTER}
              r={SUN_RADIUS * 0.35}
              fill="none"
              stroke="#fff8c4"
              strokeWidth="0.3"
              strokeOpacity="0.15"
            />

            {/* ---- Layer 11: Hawking radiation — particle/antiparticle pairs ---- */}
            {Array.from({ length: 18 }).map((_, i) => {
              const angle = (i / 18) * 360
              const rad = (angle * Math.PI) / 180
              const px = CENTER + Math.cos(rad) * (SUN_RADIUS + 2)
              const py = CENTER + Math.sin(rad) * (SUN_RADIUS + 2)
              // Particle escapes outward
              const hx = Math.cos(rad) * 35
              const hy = Math.sin(rad) * 35
              // Antiparticle falls inward
              const ahx = -Math.cos(rad) * 12
              const ahy = -Math.sin(rad) * 12
              return (
                <g key={`hawking-pair-${i}`}>
                  {/* Escaping particle (cyan) */}
                  <circle
                    cx={px}
                    cy={py}
                    r={0.9}
                    fill="#4FC3F7"
                    style={{
                      "--hx": `${hx}px`,
                      "--hy": `${hy}px`,
                      animation: `v9dHawking ${2.5 + (i % 4) * 0.5}s ease-out infinite`,
                      animationDelay: `${i * 0.3}s`,
                    } as React.CSSProperties}
                  />
                  {/* Antiparticle falling in (dimmer, violet) */}
                  <circle
                    cx={px}
                    cy={py}
                    r={0.6}
                    fill="#7C4DFF"
                    style={{
                      "--ahx": `${ahx}px`,
                      "--ahy": `${ahy}px`,
                      animation: `v9dHawkingAnti ${2 + (i % 3) * 0.4}s ease-in infinite`,
                      animationDelay: `${i * 0.3 + 0.1}s`,
                    } as React.CSSProperties}
                  />
                </g>
              )
            })}

            {/* Sun label */}
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

            {/* ---- Layer 12: Planets with enhanced effects ---- */}
            {visibleAreas.map((area) => {
              const config = ORBIT_CONFIG[area.id]
              if (!config) return null
              const isActive = activeAreas.has(area.id)
              const isHovered = hoveredPlanet === area.id
              const count = goalCounts[area.id] ?? 0

              return (
                <g
                  key={`planet-${area.id}`}
                  style={{
                    transformOrigin: `${CENTER}px ${CENTER}px`,
                    animation: `v9dOrbit-${area.id} ${config.duration}s linear infinite`,
                  }}
                >
                  <g
                    style={{
                      transformOrigin: `${CENTER}px ${CENTER - config.radius}px`,
                      animation: `v9dCounterOrbit-${area.id} ${config.duration}s linear infinite`,
                    }}
                  >
                    {/* Dark matter halo — double layer with rotation curve */}
                    {isActive && (
                      <>
                        <circle
                          cx={CENTER}
                          cy={CENTER - config.radius}
                          r={config.planetSize * 3}
                          fill="url(#v9d-dark-matter-halo)"
                          style={{
                            transformOrigin: `${CENTER}px ${CENTER - config.radius}px`,
                            animation: "v9dDarkMatterHalo 4s ease-in-out infinite",
                          }}
                        />
                        {/* Rotation curve ring — visible dark matter influence */}
                        <circle
                          cx={CENTER}
                          cy={CENTER - config.radius}
                          r={config.planetSize * 2.2}
                          fill="none"
                          stroke="#7C4DFF"
                          strokeWidth="0.5"
                          strokeOpacity="0.1"
                          strokeDasharray="2,3"
                          style={{ animation: "v9dDarkMatterRotation 8s linear infinite" }}
                        />
                        <circle
                          cx={CENTER}
                          cy={CENTER - config.radius}
                          r={config.planetSize * 2.8}
                          fill="url(#v9d-dark-matter-halo-2)"
                          style={{
                            transformOrigin: `${CENTER}px ${CENTER - config.radius}px`,
                            animation: "v9dDarkMatterHalo 6s ease-in-out infinite 1s",
                          }}
                        />
                      </>
                    )}

                    {/* Tidal force visualization — gradient line to sun */}
                    {isActive && (
                      <>
                        <line
                          x1={CENTER}
                          y1={CENTER - config.radius + config.planetSize + 3}
                          x2={CENTER}
                          y2={CENTER - SUN_RADIUS - 5}
                          stroke="#7C4DFF"
                          strokeWidth="0.4"
                          strokeOpacity="0.08"
                          strokeDasharray="2,4"
                          style={{ animation: "v9dRocheTidal 5s ease-in-out infinite" }}
                        />
                        {/* Tidal bulge indicators on planet */}
                        <ellipse
                          cx={CENTER}
                          cy={CENTER - config.radius}
                          rx={config.planetSize * 0.5}
                          ry={config.planetSize * 1.15}
                          fill="none"
                          stroke={area.hex}
                          strokeWidth="0.3"
                          strokeOpacity="0.1"
                          strokeDasharray="1,3"
                        />
                      </>
                    )}

                    {/* Hover hit area */}
                    <circle
                      cx={CENTER}
                      cy={CENTER - config.radius}
                      r={config.planetSize + 15}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredPlanet(area.id)}
                      onMouseLeave={() => setHoveredPlanet(null)}
                    />

                    {/* Planet outer ring (gravitational influence boundary) */}
                    <circle
                      cx={CENTER}
                      cy={CENTER - config.radius}
                      r={config.planetSize + 6}
                      fill="none"
                      stroke={area.hex}
                      strokeWidth={isActive ? 1.2 : 0.4}
                      strokeOpacity={isActive ? 0.25 : 0.06}
                      strokeDasharray={isActive ? "2,3" : "1,4"}
                      className="transition-all duration-300"
                    />

                    {/* Planet atmosphere glow */}
                    {isActive && (
                      <circle
                        cx={CENTER}
                        cy={CENTER - config.radius}
                        r={config.planetSize + 2}
                        fill="none"
                        stroke={area.hex}
                        strokeWidth="1.5"
                        strokeOpacity="0.12"
                      />
                    )}

                    {/* Planet body */}
                    <circle
                      cx={CENTER}
                      cy={CENTER - config.radius}
                      r={config.planetSize}
                      fill={area.hex}
                      fillOpacity={isActive ? 0.92 : 0.2}
                      filter={
                        isActive
                          ? isHovered
                            ? "url(#v9d-active-glow)"
                            : "url(#v9d-planet-glow)"
                          : undefined
                      }
                      className="transition-all duration-300"
                      style={
                        !isActive
                          ? {
                              transformOrigin: `${CENTER}px ${CENTER - config.radius}px`,
                              animation: "v9dPlanetBreathe 4s ease-in-out infinite",
                            }
                          : undefined
                      }
                    />

                    {/* Specular highlight */}
                    <circle
                      cx={CENTER - config.planetSize * 0.25}
                      cy={CENTER - config.radius - config.planetSize * 0.25}
                      r={config.planetSize * 0.35}
                      fill="white"
                      fillOpacity={isActive ? 0.15 : 0.04}
                    />
                    {/* Secondary highlight */}
                    {isActive && (
                      <circle
                        cx={CENTER - config.planetSize * 0.1}
                        cy={CENTER - config.radius - config.planetSize * 0.4}
                        r={config.planetSize * 0.15}
                        fill="white"
                        fillOpacity={0.2}
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
                            : "rgba(255,255,255,0.75)"
                          : "rgba(255,255,255,0.15)"
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
                          fill="rgba(5,5,16,0.88)"
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
                          x={CENTER - 58}
                          y={CENTER - config.radius - config.planetSize - 32}
                          width={116}
                          height={24}
                          rx={6}
                          fill="rgba(5,5,16,0.94)"
                          stroke={area.hex}
                          strokeWidth="0.6"
                          strokeOpacity="0.5"
                        />
                        <text
                          x={CENTER}
                          y={CENTER - config.radius - config.planetSize - 17}
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
                            background: `${tierColor}10`,
                            boxShadow: `0 0 12px ${tierColor}12`,
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
              background: "linear-gradient(135deg, #4FC3F7, #7C4DFF)",
              color: "white",
              boxShadow:
                "0 0 20px rgba(124,77,255,0.3), 0 0 40px rgba(79,195,247,0.15)",
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

export default function V9D() {
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
          status: `${totalGoals} goals \u00b7 ${1 + selectedAreas.size} areas`,
        }
    }
  }, [step, path, selectedGoals.size, totalGoals, selectedAreas.size])

  return (
    <div className="relative">
      <CosmicWebBackground />

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
          <GravitationalSystemStep
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
