"use client"

import { useRef, useEffect, useCallback, useState } from "react"
import type { TreeLayout, TreeLayoutNode, TreeLayoutRoot } from "../../types"

interface TreeOfLifeCanvasProps {
  layout: TreeLayout
  soilDensity: number
  onNodeClick: (nodeId: string) => void
  onRootClick: (valueId: string) => void
  onEmptyClick: (x: number, y: number) => void
}

/** Hit-test radius for click detection */
const HIT_RADIUS = 24

export function TreeOfLifeCanvas({
  layout,
  soilDensity,
  onNodeClick,
  onRootClick,
  onEmptyClick,
}: TreeOfLifeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animFrameRef = useRef<number>(0)
  const timeRef = useRef(0)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  // Responsive canvas sizing
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setDimensions({ width, height })
    })
    obs.observe(container)
    return () => obs.disconnect()
  }, [])

  // Scale factor to map layout coordinates to canvas pixels
  const scale = dimensions.width > 0
    ? Math.min(dimensions.width / layout.bounds.width, dimensions.height / layout.bounds.height)
    : 1

  // Hit-test: find which node is at screen position
  const hitTest = useCallback(
    (screenX: number, screenY: number): { type: "node"; id: string } | { type: "root"; valueId: string } | null => {
      const canvas = canvasRef.current
      if (!canvas) return null
      const rect = canvas.getBoundingClientRect()
      const x = (screenX - rect.left) / scale
      const y = (screenY - rect.top) / scale

      // Check leaf/branch nodes first (on top visually)
      for (const node of layout.nodes) {
        if (node.type === "trunk") continue
        const dx = x - node.x
        const dy = y - node.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < HIT_RADIUS / scale + (node.type === "branch" ? 10 : 0)) {
          return { type: "node", id: node.id }
        }
      }

      // Check roots
      for (const root of layout.roots) {
        const dx = x - root.x
        const dy = y - root.y
        if (Math.abs(dx) < 30 && Math.abs(dy) < 15) {
          return { type: "root", valueId: root.valueId }
        }
      }

      return null
    },
    [layout, scale]
  )

  // Click handler
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const hit = hitTest(e.clientX, e.clientY)
      if (!hit) {
        const rect = canvasRef.current!.getBoundingClientRect()
        onEmptyClick((e.clientX - rect.left) / scale, (e.clientY - rect.top) / scale)
      } else if (hit.type === "node") {
        onNodeClick(hit.id)
      } else {
        onRootClick(hit.valueId)
      }
    },
    [hitTest, onNodeClick, onRootClick, onEmptyClick, scale]
  )

  // Hover handler
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const hit = hitTest(e.clientX, e.clientY)
      const newHovered = hit?.type === "node" ? hit.id : hit?.type === "root" ? `root-${hit.valueId}` : null
      setHoveredNode(newHovered)
      const canvas = canvasRef.current
      if (canvas) canvas.style.cursor = hit ? "pointer" : "default"
    },
    [hitTest]
  )

  // Main draw loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || dimensions.width === 0) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = dimensions.width * window.devicePixelRatio
    canvas.height = dimensions.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    function draw() {
      if (!ctx || !canvas) return
      const w = dimensions.width
      const h = dimensions.height
      timeRef.current += 1
      const t = timeRef.current

      ctx.clearRect(0, 0, w, h)
      ctx.save()
      ctx.scale(scale, scale)

      const groundY = layout.groundY

      // --- Sky gradient ---
      const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY)
      skyGrad.addColorStop(0, "#0a1628")
      skyGrad.addColorStop(0.5, "#121e36")
      skyGrad.addColorStop(0.8, "#1a2844")
      skyGrad.addColorStop(1, "#1e3a2a")
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, layout.bounds.width, groundY)

      // --- Ground / soil ---
      const soilGrad = ctx.createLinearGradient(0, groundY, 0, layout.bounds.height)
      const soilAlpha = 0.4 + soilDensity * 0.6
      soilGrad.addColorStop(0, `rgba(60, 40, 20, ${soilAlpha})`)
      soilGrad.addColorStop(0.3, `rgba(45, 30, 15, ${soilAlpha * 0.9})`)
      soilGrad.addColorStop(1, `rgba(30, 20, 10, ${soilAlpha * 0.7})`)
      ctx.fillStyle = soilGrad
      ctx.fillRect(0, groundY, layout.bounds.width, layout.bounds.height - groundY)

      // Ground line
      ctx.beginPath()
      ctx.moveTo(0, groundY)
      ctx.lineTo(layout.bounds.width, groundY)
      ctx.strokeStyle = "rgba(80, 160, 80, 0.3)"
      ctx.lineWidth = 2
      ctx.stroke()

      // Grass blades along ground
      for (let i = 0; i < layout.bounds.width; i += 8) {
        const bladeHeight = 6 + Math.sin(i * 0.3 + t * 0.02) * 3
        ctx.beginPath()
        ctx.moveTo(i, groundY)
        ctx.quadraticCurveTo(i + 2, groundY - bladeHeight, i + 4, groundY)
        ctx.strokeStyle = `rgba(60, 140, 60, ${0.2 + Math.sin(i * 0.1) * 0.1})`
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // --- Draw roots (underground) ---
      drawRoots(ctx, layout.roots, groundY, t, hoveredNode)

      // --- Draw root→branch connections ---
      drawRootConnections(ctx, layout.roots, layout.nodes, groundY, t)

      // --- Draw trunk ---
      drawTrunk(ctx, layout.nodes, groundY, t)

      // --- Draw branches and leaves ---
      const branches = layout.nodes.filter((n) => n.type === "branch")
      const leaves = layout.nodes.filter((n) => n.type === "leaf")

      // Draw branch connections (lines from trunk to branch)
      for (const branch of branches) {
        drawBranchConnection(ctx, branch, groundY, t)
      }

      // Draw branch nodes
      for (const branch of branches) {
        drawBranch(ctx, branch, t, hoveredNode === branch.id)
      }

      // Draw leaf connections (lines from branch to leaf)
      for (const leaf of leaves) {
        const parent = layout.nodes.find((n) => n.id === leaf.parentId)
        if (parent) {
          drawLeafConnection(ctx, leaf, parent)
        }
      }

      // Draw leaf nodes
      for (const leaf of leaves) {
        drawLeaf(ctx, leaf, t, hoveredNode === leaf.id)
      }

      // --- Crown glow (top of tree) ---
      const crownY = Math.min(...layout.nodes.filter((n) => n.type !== "trunk").map((n) => n.y), layout.bounds.height)
      if (crownY < groundY) {
        const glowAlpha = 0.05 + Math.sin(t * 0.01) * 0.02
        const crownGlow = ctx.createRadialGradient(
          layout.bounds.width / 2, crownY - 30, 10,
          layout.bounds.width / 2, crownY - 30, 200
        )
        crownGlow.addColorStop(0, `rgba(255, 220, 100, ${glowAlpha})`)
        crownGlow.addColorStop(1, "rgba(255, 220, 100, 0)")
        ctx.fillStyle = crownGlow
        ctx.fillRect(0, 0, layout.bounds.width, groundY)
      }

      ctx.restore()
      animFrameRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [dimensions, layout, soilDensity, scale, hoveredNode])

  return (
    <div ref={containerRef} className="w-full h-full min-h-[500px] relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: "block" }}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
      />
    </div>
  )
}

// ─── Drawing Helpers ──────────────────────────────────────────────────────────

function drawTrunk(ctx: CanvasRenderingContext2D, nodes: TreeLayoutNode[], groundY: number, t: number) {
  const trunk = nodes.find((n) => n.type === "trunk")
  if (!trunk) return

  const x = trunk.x
  const topY = groundY - trunk.height
  const width = trunk.width

  // Trunk body with bark texture
  const trunkGrad = ctx.createLinearGradient(x - width / 2, topY, x + width / 2, topY)
  trunkGrad.addColorStop(0, "#4a3520")
  trunkGrad.addColorStop(0.3, "#6b4c30")
  trunkGrad.addColorStop(0.5, "#7a5535")
  trunkGrad.addColorStop(0.7, "#6b4c30")
  trunkGrad.addColorStop(1, "#4a3520")

  ctx.beginPath()
  // Slightly tapered trunk
  ctx.moveTo(x - width / 2, groundY)
  ctx.quadraticCurveTo(x - width / 2 - 5, groundY - trunk.height * 0.5, x - width / 3, topY)
  ctx.lineTo(x + width / 3, topY)
  ctx.quadraticCurveTo(x + width / 2 + 5, groundY - trunk.height * 0.5, x + width / 2, groundY)
  ctx.closePath()
  ctx.fillStyle = trunkGrad
  ctx.fill()

  // Bark lines
  for (let i = 0; i < 8; i++) {
    const lineY = topY + (trunk.height * (i + 1)) / 9
    const wobble = Math.sin(i * 2.5 + t * 0.005) * 2
    ctx.beginPath()
    ctx.moveTo(x - width / 3 + wobble, lineY)
    ctx.quadraticCurveTo(x, lineY + 3, x + width / 3 + wobble, lineY)
    ctx.strokeStyle = "rgba(30, 20, 10, 0.3)"
    ctx.lineWidth = 1
    ctx.stroke()
  }
}

function drawBranchConnection(ctx: CanvasRenderingContext2D, branch: TreeLayoutNode, groundY: number, t: number) {
  const trunkX = 600 // TRUNK_X
  const branchStartY = branch.y + (groundY - branch.y) * 0.6

  ctx.beginPath()
  ctx.moveTo(trunkX, branchStartY)
  ctx.quadraticCurveTo(
    (trunkX + branch.x) / 2,
    (branchStartY + branch.y) / 2 - 20,
    branch.x,
    branch.y
  )
  ctx.strokeStyle = branch.color + "80"
  ctx.lineWidth = branch.width * 0.6
  ctx.lineCap = "round"
  ctx.stroke()
}

function drawBranch(ctx: CanvasRenderingContext2D, branch: TreeLayoutNode, t: number, isHovered: boolean) {
  const { x, y, color, progress, isComplete, streak } = branch
  const radius = 12 + progress * 0.08

  // Branch node circle
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fillStyle = isComplete ? color : color + "60"
  ctx.fill()

  // Outer ring
  ctx.beginPath()
  ctx.arc(x, y, radius + 3, 0, Math.PI * 2)
  ctx.strokeStyle = isHovered ? "#ffffff" : color
  ctx.lineWidth = isHovered ? 3 : 2
  ctx.stroke()

  // Progress arc
  if (progress > 0 && progress < 100) {
    ctx.beginPath()
    ctx.arc(x, y, radius + 3, -Math.PI / 2, -Math.PI / 2 + (progress / 100) * Math.PI * 2)
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.stroke()
  }

  // Streak flame
  if (streak > 0) {
    const flameHeight = Math.min(streak * 1.5, 20)
    const flicker = Math.sin(t * 0.1) * 2
    ctx.beginPath()
    ctx.moveTo(x - 4, y - radius - 2)
    ctx.quadraticCurveTo(x, y - radius - flameHeight - flicker, x + 4, y - radius - 2)
    ctx.fillStyle = `rgba(255, ${150 - streak * 3}, 0, ${0.5 + Math.sin(t * 0.15) * 0.2})`
    ctx.fill()
  }

  // Label
  ctx.font = "11px system-ui, sans-serif"
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
  ctx.textAlign = "center"
  ctx.textBaseline = "top"
  const labelText = branch.label.length > 18 ? branch.label.slice(0, 16) + "..." : branch.label
  ctx.fillText(labelText, x, y + radius + 8)
}

function drawLeafConnection(ctx: CanvasRenderingContext2D, leaf: TreeLayoutNode, parent: TreeLayoutNode) {
  ctx.beginPath()
  ctx.moveTo(parent.x, parent.y)
  ctx.quadraticCurveTo(
    (parent.x + leaf.x) / 2,
    (parent.y + leaf.y) / 2 - 10,
    leaf.x,
    leaf.y
  )
  ctx.strokeStyle = leaf.color + "40"
  ctx.lineWidth = 2
  ctx.lineCap = "round"
  ctx.stroke()
}

function drawLeaf(ctx: CanvasRenderingContext2D, leaf: TreeLayoutNode, t: number, isHovered: boolean) {
  const { x, y, color, progress, isComplete, phase } = leaf
  const baseRadius = 8

  // Leaf shape (slightly pointed oval)
  ctx.save()
  ctx.translate(x, y)

  // Phase determines leaf color modulation
  let leafColor = color
  if (phase === "consolidation") leafColor = shiftColor(color, 20, -10, 0)
  if (phase === "graduated" || isComplete) leafColor = shiftColor(color, -20, 20, -20)

  // Leaf body
  ctx.beginPath()
  ctx.ellipse(0, 0, baseRadius, baseRadius * 1.3, 0, 0, Math.PI * 2)
  const fillAlpha = isComplete ? "cc" : progress > 0 ? "90" : "40"
  ctx.fillStyle = leafColor + fillAlpha
  ctx.fill()

  // Hover glow
  if (isHovered) {
    ctx.beginPath()
    ctx.ellipse(0, 0, baseRadius + 4, (baseRadius + 4) * 1.3, 0, 0, Math.PI * 2)
    ctx.strokeStyle = "#ffffff80"
    ctx.lineWidth = 2
    ctx.stroke()
  }

  // Progress fill (partial leaf coloring)
  if (progress > 0 && !isComplete) {
    ctx.beginPath()
    ctx.ellipse(0, 0, baseRadius, baseRadius * 1.3, 0, -Math.PI / 2, -Math.PI / 2 + (progress / 100) * Math.PI * 2)
    ctx.lineTo(0, 0)
    ctx.closePath()
    ctx.fillStyle = leafColor + "dd"
    ctx.fill()
  }

  // Completed sparkle
  if (isComplete) {
    const sparkle = Math.sin(t * 0.05) * 0.5 + 0.5
    ctx.beginPath()
    ctx.arc(baseRadius * 0.5, -baseRadius * 0.5, 2, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255, 255, 200, ${sparkle * 0.6})`
    ctx.fill()
  }

  ctx.restore()
}

function drawRoots(
  ctx: CanvasRenderingContext2D,
  roots: TreeLayoutRoot[],
  groundY: number,
  t: number,
  hoveredNode: string | null
) {
  for (const root of roots) {
    const isHovered = hoveredNode === `root-${root.valueId}`
    const waviness = Math.sin(t * 0.008 + root.rank) * 5

    // Root tendril from trunk base downward
    ctx.beginPath()
    ctx.moveTo(600, groundY) // trunk base
    ctx.bezierCurveTo(
      600 + (root.x - 600) * 0.3, groundY + 30,
      root.x - (root.x - 600) * 0.2 + waviness, root.y - 30,
      root.x, root.y
    )
    ctx.strokeStyle = isHovered ? "rgba(200, 180, 140, 0.8)" : `rgba(160, 130, 80, ${0.3 + (8 - root.rank) * 0.06})`
    ctx.lineWidth = root.thickness
    ctx.lineCap = "round"
    ctx.stroke()

    // Root label
    ctx.font = `${isHovered ? "bold " : ""}10px system-ui, sans-serif`
    ctx.fillStyle = isHovered ? "rgba(255, 255, 255, 0.9)" : "rgba(200, 180, 140, 0.6)"
    ctx.textAlign = "center"
    ctx.textBaseline = "top"
    const label = root.valueId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    ctx.fillText(label, root.x, root.y + 8)
  }
}

function drawRootConnections(
  ctx: CanvasRenderingContext2D,
  roots: TreeLayoutRoot[],
  nodes: TreeLayoutNode[],
  groundY: number,
  t: number
) {
  for (const root of roots) {
    for (const branchId of root.connectedBranches) {
      const branch = nodes.find((n) => n.id === branchId)
      if (!branch) continue

      // Subtle dotted line from root to branch
      ctx.save()
      ctx.setLineDash([4, 6])
      ctx.beginPath()
      ctx.moveTo(root.x, root.y)
      ctx.bezierCurveTo(
        root.x, groundY - 20,
        branch.x, groundY + 20,
        branch.x, branch.y
      )
      ctx.strokeStyle = `rgba(160, 130, 80, ${0.15 + Math.sin(t * 0.01) * 0.05})`
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.restore()
    }
  }
}

/** Shift a hex color's RGB channels */
function shiftColor(hex: string, dr: number, dg: number, db: number): string {
  const r = Math.min(255, Math.max(0, parseInt(hex.slice(1, 3), 16) + dr))
  const g = Math.min(255, Math.max(0, parseInt(hex.slice(3, 5), 16) + dg))
  const b = Math.min(255, Math.max(0, parseInt(hex.slice(5, 7), 16) + db))
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
}
