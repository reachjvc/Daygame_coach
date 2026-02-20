"use client"

/**
 * Variant G: "Neural Pathways" — Network Graph
 *
 * Theme: Abstract neural network — nodes, synapses, activation
 * Hierarchy: Network graph (goals can connect to multiple parents)
 * Flow: Network Activator (see full network → activate nodes → customize → summary)
 * Fork: Exploration (no explicit fork — user activates what they want)
 *
 * Key concept: Goals are neurons. Selecting them lights up pathways.
 * Cross-area connections visible: meditation → both PG and Daygame.
 * L2 achievements show as "neural clusters" that activate when enough connected L3s fire.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { Check, Brain, Zap } from "lucide-react"
import { useTreeModelData, useLifeAreas } from "./useGoalData"
import type { GoalTemplate, LifeAreaConfig } from "@/src/goals/types"

// ============================================================================
// Types
// ============================================================================

interface NeuronNode {
  id: string
  title: string
  level: number
  lifeArea: string
  category: string | null
  x: number
  y: number
  radius: number
  color: string
}

type FlowStep = "explore" | "customize" | "summary"

// ============================================================================
// Node Layout Engine
// ============================================================================

function layoutNodes(areas: { lifeArea: LifeAreaConfig; l3Goals: GoalTemplate[] }[]): NeuronNode[] {
  const nodes: NeuronNode[] = []
  const centerX = 600
  const centerY = 400
  const areaRadius = 280

  areas.forEach((area, areaIndex) => {
    const angle = (areaIndex / areas.length) * Math.PI * 2 - Math.PI / 2
    const areaX = centerX + Math.cos(angle) * areaRadius
    const areaY = centerY + Math.sin(angle) * areaRadius

    area.l3Goals.forEach((goal, goalIndex) => {
      const goalAngle = angle + ((goalIndex - area.l3Goals.length / 2) * 0.15)
      const goalRadius = 80 + Math.random() * 60
      nodes.push({
        id: goal.id,
        title: goal.title,
        level: goal.level,
        lifeArea: area.lifeArea.id,
        category: goal.displayCategory,
        x: areaX + Math.cos(goalAngle) * goalRadius,
        y: areaY + Math.sin(goalAngle) * goalRadius,
        radius: 6,
        color: area.lifeArea.hex,
      })
    })
  })

  return nodes
}

// ============================================================================
// Neural Canvas (SVG)
// ============================================================================

function NeuralCanvas({
  nodes,
  selected,
  onToggle,
  areaColors,
}: {
  nodes: NeuronNode[]
  selected: Set<string>
  onToggle: (id: string) => void
  areaColors: Record<string, string>
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [viewBox, setViewBox] = useState("0 0 1200 800")

  // Generate synapse connections (nearby nodes in same area)
  const synapses = useMemo(() => {
    const connections: { from: NeuronNode; to: NeuronNode }[] = []
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]
        const b = nodes[j]
        const dist = Math.hypot(a.x - b.x, a.y - b.y)
        // Connect nearby nodes in same area, or across areas if close enough
        if ((a.lifeArea === b.lifeArea && dist < 150) || dist < 80) {
          connections.push({ from: a, to: b })
        }
      }
    }
    return connections
  }, [nodes])

  // Responsive viewBox
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth
      if (w < 768) setViewBox("100 100 1000 600")
      else setViewBox("0 0 1200 800")
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <svg ref={svgRef} viewBox={viewBox} className="w-full h-full" style={{ minHeight: "70vh" }}>
      <defs>
        <filter id="neuralGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="synapsePulse">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
      </defs>

      {/* Background grid */}
      <pattern id="neuralGrid" width="40" height="40" patternUnits="userSpaceOnUse">
        <circle cx="20" cy="20" r="0.5" fill="rgba(255,255,255,0.05)" />
      </pattern>
      <rect width="1200" height="800" fill="url(#neuralGrid)" />

      {/* Area labels */}
      {Object.entries(areaColors).map(([areaId, color], i) => {
        const areaNodes = nodes.filter((n) => n.lifeArea === areaId)
        if (areaNodes.length === 0) return null
        const avgX = areaNodes.reduce((s, n) => s + n.x, 0) / areaNodes.length
        const avgY = areaNodes.reduce((s, n) => s + n.y, 0) / areaNodes.length
        return (
          <text key={areaId} x={avgX} y={avgY - 80}
            textAnchor="middle" fill={color} opacity={0.3}
            fontSize="11" fontWeight="600" letterSpacing="2">
            {areaId.replace(/_/g, " ").toUpperCase()}
          </text>
        )
      })}

      {/* Synapses */}
      {synapses.map(({ from, to }, i) => {
        const bothSelected = selected.has(from.id) && selected.has(to.id)
        const oneSelected = selected.has(from.id) || selected.has(to.id)
        return (
          <line key={i}
            x1={from.x} y1={from.y} x2={to.x} y2={to.y}
            stroke={bothSelected ? from.color : "rgba(255,255,255,0.06)"}
            strokeWidth={bothSelected ? 1.5 : 0.5}
            opacity={bothSelected ? 0.6 : oneSelected ? 0.15 : 0.08}
            filter={bothSelected ? "url(#synapsePulse)" : undefined}
          />
        )
      })}

      {/* Neuron nodes */}
      {nodes.map((node) => {
        const isSelected = selected.has(node.id)
        const isHovered = hoveredNode === node.id
        return (
          <g key={node.id}
            onClick={() => onToggle(node.id)}
            onMouseEnter={() => setHoveredNode(node.id)}
            onMouseLeave={() => setHoveredNode(null)}
            className="cursor-pointer"
          >
            {/* Glow ring */}
            {isSelected && (
              <circle cx={node.x} cy={node.y} r={node.radius + 6}
                fill="none" stroke={node.color} strokeWidth="1" opacity="0.3"
                filter="url(#neuralGlow)">
                <animate attributeName="r" values={`${node.radius + 4};${node.radius + 8};${node.radius + 4}`}
                  dur="2s" repeatCount="indefinite" />
              </circle>
            )}

            {/* Core */}
            <circle cx={node.x} cy={node.y} r={isHovered ? node.radius + 2 : node.radius}
              fill={isSelected ? node.color : "rgba(255,255,255,0.08)"}
              stroke={isSelected ? node.color : "rgba(255,255,255,0.15)"}
              strokeWidth={isSelected ? 2 : 1}
              opacity={isSelected ? 1 : isHovered ? 0.8 : 0.5}
            />

            {/* Check mark for selected */}
            {isSelected && (
              <text x={node.x} y={node.y + 1.5} textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">
                ✓
              </text>
            )}

            {/* Tooltip */}
            {isHovered && (
              <g>
                <rect x={node.x - 60} y={node.y - 30} width="120" height="20" rx="4"
                  fill="rgba(0,0,0,0.85)" stroke="rgba(255,255,255,0.1)" />
                <text x={node.x} y={node.y - 17} textAnchor="middle"
                  fill="white" fontSize="8" fontWeight="500">
                  {node.title.length > 22 ? node.title.slice(0, 22) + "…" : node.title}
                </text>
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ============================================================================
// Summary View
// ============================================================================

function NeuralSummary({ nodes, selected }: { nodes: NeuronNode[]; selected: Set<string> }) {
  const activeNodes = nodes.filter((n) => selected.has(n.id))
  const byArea: Record<string, NeuronNode[]> = {}
  for (const n of activeNodes) {
    if (!byArea[n.lifeArea]) byArea[n.lifeArea] = []
    byArea[n.lifeArea].push(n)
  }

  return (
    <div className="min-h-screen pt-16 pb-12 px-6" style={{ background: "#050510" }}>
      <div className="mx-auto max-w-2xl text-center mb-10">
        <Brain className="size-12 mx-auto mb-4 text-emerald-400" />
        <h2 className="text-3xl font-bold text-white mb-2">Neural Network Activated</h2>
        <p className="text-white/40">{activeNodes.length} neurons firing across {Object.keys(byArea).length} regions.</p>
      </div>

      <div className="mx-auto max-w-2xl space-y-4">
        {Object.entries(byArea).map(([areaId, areaNodes]) => (
          <div key={areaId} className="rounded-xl p-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h3 className="text-sm uppercase tracking-wider text-white/30 mb-3">{areaId.replace(/_/g, " ")}</h3>
            <div className="space-y-1.5">
              {areaNodes.map((n) => (
                <div key={n.id} className="flex items-center gap-2">
                  <div className="size-2 rounded-full" style={{ background: n.color }} />
                  <span className="text-sm text-white/70">{n.title}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export default function VariantG() {
  const data = useTreeModelData()
  const lifeAreas = useLifeAreas()
  const [step, setStep] = useState<FlowStep>("explore")
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const nodes = useMemo(() => layoutNodes(data.areas), [data.areas])

  const areaColors = useMemo(() => {
    const colors: Record<string, string> = {}
    for (const area of lifeAreas) colors[area.id] = area.hex
    return colors
  }, [lifeAreas])

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  return (
    <div className="relative min-h-screen" style={{ background: "#050510" }}>
      {/* Ambient */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, #10b981, transparent)", filter: "blur(120px)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, #06b6d4, transparent)", filter: "blur(80px)" }} />
      </div>

      {step === "explore" && (
        <div className="pt-16 px-6">
          <div className="mx-auto max-w-5xl">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Brain className="size-6 text-emerald-400" />
                <h1 className="text-2xl font-bold text-white">Neural Pathways</h1>
              </div>
              <p className="text-white/40 text-sm">Click neurons to activate them. Connections light up between related goals.</p>
            </div>

            {/* Canvas */}
            <NeuralCanvas nodes={nodes} selected={selected} onToggle={toggle} areaColors={areaColors} />

            {/* Bottom bar */}
            <div className="fixed bottom-0 left-0 right-0 z-40 px-6 py-4 flex items-center justify-between"
              style={{ background: "linear-gradient(to top, #050510, transparent)" }}>
              <span className="text-sm text-white/40">
                <Zap className="size-4 inline mr-1 text-emerald-400" />
                {selected.size} neurons active
              </span>
              <button
                onClick={() => setStep("summary")}
                disabled={selected.size === 0}
                className="px-6 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-30"
                style={{ background: selected.size > 0 ? "#10b981" : "rgba(255,255,255,0.1)" }}
              >
                View Summary →
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "summary" && <NeuralSummary nodes={nodes} selected={selected} />}
    </div>
  )
}
