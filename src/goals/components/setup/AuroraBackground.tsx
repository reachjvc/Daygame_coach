"use client"

import React, { useEffect, useRef } from "react"

export const AuroraBackground = React.memo(function AuroraBackground({ stepIndex }: { stepIndex: number }) {
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
})
