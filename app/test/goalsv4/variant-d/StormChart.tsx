"use client"

import { useState, useMemo, useEffect } from "react"
import { X, ChevronRight, Zap, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MilestoneCurveEditor } from "@/src/goals/components/MilestoneCurveEditor"
import type { GoalTemplate, MilestoneLadderConfig } from "@/src/goals/types"
import type { GoalCustomization } from "./StormCustomizer"

const STORM_NAMES: Record<string, string> = {
  one_person: "Storm Solaris",
  abundance: "Storm Nebula",
}

// Storm path color schemes
const PATH_STORM = {
  one_person: {
    primary: "#ff4d4d",
    secondary: "#ff8c1a",
    gradient: "linear-gradient(135deg, #ff4d4d 0%, #ff8c1a 100%)",
    glow: "rgba(255, 77, 77, 0.15)",
    glowBright: "rgba(255, 77, 77, 0.45)",
  },
  abundance: {
    primary: "#d946ef",
    secondary: "#ec4899",
    gradient: "linear-gradient(135deg, #d946ef 0%, #ec4899 100%)",
    glow: "rgba(217, 70, 239, 0.15)",
    glowBright: "rgba(217, 70, 239, 0.45)",
  },
}

interface EnergyNode {
  x: number
  y: number
  id: string
  label: string
  level: number
  energy: number
  size: number
  template: GoalTemplate | null
  color: string
  glowColor: string
}

function computeEnergyNodes(
  path: "one_person" | "abundance",
  selectedL1: GoalTemplate,
  selectedL2s: GoalTemplate[],
  selectedL3s: GoalTemplate[],
): EnergyNode[] {
  const storm = PATH_STORM[path]
  const nodes: EnergyNode[] = []

  // L1 - the solar flare epicenter, top-center
  nodes.push({
    x: 50,
    y: 18,
    id: selectedL1.id,
    label: selectedL1.title,
    level: 1,
    energy: 1,
    size: 6,
    template: selectedL1,
    color: storm.primary,
    glowColor: storm.glowBright,
  })

  // L2 - magnetic field concentrations
  const l2YBase = 36
  selectedL2s.forEach((l2, i) => {
    const spread = Math.min(70, selectedL2s.length * 14)
    const xStart = 50 - spread / 2
    const x = xStart + (i / Math.max(1, selectedL2s.length - 1)) * spread
    const yJitter = Math.sin(i * 2.3) * 5
    nodes.push({
      x: selectedL2s.length === 1 ? 50 : x,
      y: l2YBase + yJitter,
      id: l2.id,
      label: l2.title,
      level: 2,
      energy: 0.75,
      size: 4,
      template: l2,
      color: storm.secondary,
      glowColor: storm.glow,
    })
  })

  // L3 - charged particles scattered in the storm
  const l3YBase = 56
  const totalL3 = selectedL3s.length
  selectedL3s.forEach((l3, i) => {
    const row = Math.floor(i / 8)
    const col = i % 8
    const xSpread = 80
    const xStart = 50 - xSpread / 2
    const xStep = xSpread / Math.min(8, totalL3)
    const x = xStart + col * xStep + (Math.sin(i * 3.7) * 3)
    const y = l3YBase + row * 10 + (Math.cos(i * 2.1) * 3)

    nodes.push({
      x: Math.max(8, Math.min(92, x)),
      y: Math.max(10, Math.min(88, y)),
      id: l3.id,
      label: l3.title,
      level: 3,
      energy: 0.35 + Math.random() * 0.15,
      size: 1.8,
      template: l3,
      color: i % 2 === 0 ? storm.primary : storm.secondary,
      glowColor: `${storm.primary}30`,
    })
  })

  return nodes
}

interface StormChartProps {
  path: "one_person" | "abundance"
  selectedL1: GoalTemplate
  selectedL2s: GoalTemplate[]
  selectedL3s: GoalTemplate[]
  goals: GoalCustomization[]
  onBack: () => void
  onConfirm: (curveConfigs: Map<string, MilestoneLadderConfig>) => void
}

export function StormChart({
  path,
  selectedL1,
  selectedL2s,
  selectedL3s,
  goals,
  onBack,
  onConfirm,
}: StormChartProps) {
  const storm = PATH_STORM[path]
  const stormName = STORM_NAMES[path] ?? "Storm Voyager"

  const [selectedNode, setSelectedNode] = useState<EnergyNode | null>(null)
  const [hoveredNode, setHoveredNode] = useState<EnergyNode | null>(null)
  const [curveConfigs, setCurveConfigs] = useState<Map<string, MilestoneLadderConfig>>(() => {
    const map = new Map<string, MilestoneLadderConfig>()
    for (const tmpl of [...selectedL2s, ...selectedL3s]) {
      if (tmpl.defaultMilestoneConfig) {
        map.set(tmpl.id, { ...tmpl.defaultMilestoneConfig })
      }
    }
    return map
  })
  const [configuredNodes, setConfiguredNodes] = useState<Set<string>>(new Set())
  const [animPhases, setAnimPhases] = useState<number[]>([])

  const energyNodes = useMemo(
    () => computeEnergyNodes(path, selectedL1, selectedL2s, selectedL3s),
    [path, selectedL1, selectedL2s, selectedL3s]
  )

  useEffect(() => {
    setAnimPhases(energyNodes.map(() => Math.random() * Math.PI * 2))
  }, [energyNodes.length])

  // Magnetic field connections (curved, fiery)
  const fieldConnections = useMemo(() => {
    const connections: { x1: number; y1: number; x2: number; y2: number; opacity: number; color1: string; color2: string }[] = []
    const l1Node = energyNodes.find((p) => p.level === 1)
    if (!l1Node) return connections

    // L1 to L2
    for (const p of energyNodes.filter((p) => p.level === 2)) {
      connections.push({
        x1: l1Node.x, y1: l1Node.y,
        x2: p.x, y2: p.y,
        opacity: 0.3,
        color1: storm.primary,
        color2: storm.secondary,
      })
    }

    // L2 to nearest L3
    const l2Nodes = energyNodes.filter((p) => p.level === 2)
    for (const l3 of energyNodes.filter((p) => p.level === 3)) {
      let closestL2 = l2Nodes[0]
      let minDist = Infinity
      for (const l2 of l2Nodes) {
        const dx = l3.x - l2.x
        const dy = l3.y - l2.y
        const dist = dx * dx + dy * dy
        if (dist < minDist) {
          minDist = dist
          closestL2 = l2
        }
      }
      if (closestL2) {
        connections.push({
          x1: closestL2.x, y1: closestL2.y,
          x2: l3.x, y2: l3.y,
          opacity: 0.08,
          color1: storm.secondary,
          color2: storm.primary,
        })
      }
    }

    return connections
  }, [energyNodes, storm])

  const handleCurveChange = (nodeId: string, config: MilestoneLadderConfig) => {
    setCurveConfigs((prev) => {
      const next = new Map(prev)
      next.set(nodeId, config)
      return next
    })
    setConfiguredNodes((prev) => new Set(prev).add(nodeId))
  }

  const configurableNodes = useMemo(() => {
    return energyNodes.filter((p) => p.template?.defaultMilestoneConfig)
  }, [energyNodes])

  const totalConfigurable = configurableNodes.length
  const totalConfigured = configuredNodes.size

  return (
    <div className="relative space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-sm transition-colors cursor-pointer font-light" style={{ color: "rgba(255,255,255,0.45)" }}>
          <ChevronRight className="size-4 rotate-180" />
          Back to calibrate
        </button>
        <div className="flex items-center gap-2">
          <Eye className="size-4" style={{ color: storm.primary }} />
          <span className="text-sm font-light tracking-wide" style={{ color: storm.primary }}>Storm Observatory</span>
        </div>
      </div>

      {/* Title area */}
      <div className="text-center space-y-1">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-light tracking-wider"
          style={{
            background: `${storm.primary}10`,
            color: storm.primary,
            border: `1px solid ${storm.primary}20`,
          }}
        >
          <Zap className="size-3" />
          {stormName}
        </div>
        <h2 className="text-xl font-light tracking-wide" style={{ color: "rgba(255,255,255,0.9)" }}>
          Your Solar Storm
        </h2>
        <p className="text-xs font-light" style={{ color: "rgba(255,255,255,0.35)" }}>
          Click any energy node to open the observation panel and shape its trajectory
        </p>
      </div>

      {/* Main storm visualization */}
      <div className="flex gap-4">
        <div
          className="flex-1 relative rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(180deg, #0a0408 0%, #120610 35%, #1a0a14 65%, #0a0408 100%)",
            border: `1px solid ${storm.primary}15`,
            minHeight: 480,
          }}
        >
          {/* Animated storm background */}
          <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
            {/* Main storm band */}
            <div
              className="absolute"
              style={{
                left: "10%",
                top: "3%",
                width: "80%",
                height: "75%",
                background: `linear-gradient(180deg,
                  transparent 0%,
                  ${storm.primary}18 15%,
                  ${storm.secondary}28 35%,
                  ${storm.primary}22 55%,
                  ${storm.secondary}12 75%,
                  transparent 100%)`,
                filter: "blur(35px)",
                animation: "chartStormSway 10s ease-in-out infinite",
                borderRadius: "40%",
              }}
            />
            {/* Secondary glow */}
            <div
              className="absolute"
              style={{
                left: "15%",
                top: "8%",
                width: "70%",
                height: "55%",
                background: `radial-gradient(ellipse at 50% 35%, ${storm.primary}12 0%, transparent 70%)`,
                animation: "chartStormPulse 6s ease-in-out infinite",
              }}
            />
            {/* Background particles */}
            <ChartParticles stormColor={storm.primary} />
          </div>

          {/* SVG overlay for energy nodes */}
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full"
            style={{ minHeight: 480, position: "relative", zIndex: 1 }}
          >
            <defs>
              <filter id="storm-glow-l1">
                <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur" />
                <feFlood floodColor={storm.primary} floodOpacity="0.8" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="storm-glow-l2">
                <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur" />
                <feFlood floodColor={storm.secondary} floodOpacity="0.6" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="storm-glow-l3">
                <feGaussianBlur in="SourceAlpha" stdDeviation="0.5" result="blur" />
                <feFlood floodColor={storm.primary} floodOpacity="0.4" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="storm-field-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={storm.primary} stopOpacity="0.35" />
                <stop offset="50%" stopColor={storm.secondary} stopOpacity="0.18" />
                <stop offset="100%" stopColor={storm.primary} stopOpacity="0.06" />
              </linearGradient>
            </defs>

            {/* Magnetic field connections (curved paths) */}
            {fieldConnections.map((conn, i) => {
              const midX = (conn.x1 + conn.x2) / 2
              const midY = (conn.y1 + conn.y2) / 2
              const cpOffsetX = (conn.x2 - conn.x1) * 0.12
              const cpOffsetY = Math.abs(conn.y2 - conn.y1) * 0.35
              const d = `M ${conn.x1} ${conn.y1} Q ${midX + cpOffsetX} ${midY - cpOffsetY} ${conn.x2} ${conn.y2}`

              return (
                <path
                  key={i}
                  d={d}
                  fill="none"
                  stroke="url(#storm-field-grad)"
                  strokeWidth={conn.opacity > 0.1 ? 0.45 : 0.15}
                  strokeOpacity={conn.opacity}
                />
              )
            })}

            {/* Energy nodes */}
            {energyNodes.map((node, idx) => {
              const isSelected = selectedNode?.id === node.id
              const isHovered = hoveredNode?.id === node.id
              const isConfigured = configuredNodes.has(node.id)
              const hasConfig = node.template?.defaultMilestoneConfig
              const phase = animPhases[idx] ?? 0

              return (
                <g key={node.id}>
                  {/* Pulsing outer ring for L1 and L2 */}
                  {node.level <= 2 && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.size * 2}
                      fill="none"
                      stroke={node.color}
                      strokeWidth={0.12}
                      strokeOpacity={0.25}
                    >
                      <animate
                        attributeName="r"
                        values={`${node.size * 1.5};${node.size * 2.8};${node.size * 1.5}`}
                        dur={`${2.5 + phase}s`}
                        begin={`${phase}s`}
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="stroke-opacity"
                        values="0.3;0.05;0.3"
                        dur={`${2.5 + phase}s`}
                        begin={`${phase}s`}
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}

                  {/* Configured indicator ring */}
                  {isConfigured && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.size + 1}
                      fill="none"
                      stroke="#ffd700"
                      strokeWidth={0.15}
                      strokeOpacity={0.6}
                      strokeDasharray="0.4,0.4"
                    />
                  )}

                  {/* Hover highlight ring */}
                  {isHovered && hasConfig && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.size * 1.8}
                      fill="none"
                      stroke={node.color}
                      strokeWidth={0.2}
                      strokeOpacity={0.5}
                    />
                  )}

                  {/* Node body */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isSelected || isHovered ? node.size * 1.3 : node.size}
                    fill={node.color}
                    fillOpacity={node.energy}
                    filter={
                      node.level === 1
                        ? "url(#storm-glow-l1)"
                        : node.level === 2
                          ? "url(#storm-glow-l2)"
                          : "url(#storm-glow-l3)"
                    }
                    className={hasConfig ? "cursor-pointer" : ""}
                    style={{ transition: "r 0.2s ease" }}
                    onClick={() => {
                      if (hasConfig) setSelectedNode(node)
                    }}
                    onMouseEnter={() => {
                      if (hasConfig) setHoveredNode(node)
                    }}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    {node.level === 3 && (
                      <animate
                        attributeName="fill-opacity"
                        values={`${node.energy * 0.4};${node.energy};${node.energy * 0.4}`}
                        dur={`${1.5 + (phase % 2)}s`}
                        begin={`${phase}s`}
                        repeatCount="indefinite"
                      />
                    )}
                  </circle>

                  {/* Labels for L1 and L2 */}
                  {node.level <= 2 && (
                    <text
                      x={node.x}
                      y={node.y + node.size + 2.5}
                      textAnchor="middle"
                      fill={node.color}
                      fillOpacity={0.7}
                      fontSize={node.level === 1 ? 2 : 1.4}
                      fontWeight={300}
                      style={{ fontFamily: "inherit" }}
                    >
                      {node.label.length > 28 ? node.label.slice(0, 26) + "..." : node.label}
                    </text>
                  )}

                  {/* Tooltip for hovered L3 */}
                  {isHovered && node.level === 3 && (
                    <g style={{ pointerEvents: "none" }}>
                      <rect
                        x={node.x - 12}
                        y={node.y - 7}
                        width={24}
                        height={4}
                        rx={1}
                        fill="rgba(0,0,0,0.8)"
                        stroke={node.color}
                        strokeWidth={0.1}
                        strokeOpacity={0.5}
                      />
                      <text
                        x={node.x}
                        y={node.y - 4}
                        textAnchor="middle"
                        fill="white"
                        fillOpacity={0.8}
                        fontSize={1.5}
                        fontWeight={300}
                        style={{ fontFamily: "inherit" }}
                      >
                        {node.label.length > 20 ? node.label.slice(0, 18) + "..." : node.label}
                      </text>
                    </g>
                  )}

                  {/* Larger click target */}
                  {hasConfig && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={Math.max(node.size * 2, 3.5)}
                      fill="transparent"
                      className="cursor-pointer"
                      onClick={() => setSelectedNode(node)}
                      onMouseEnter={() => setHoveredNode(node)}
                      onMouseLeave={() => setHoveredNode(null)}
                    />
                  )}
                </g>
              )
            })}
          </svg>

          {/* Legend overlay */}
          <div className="absolute bottom-3 left-3 space-y-1.5 z-10">
            <div className="flex items-center gap-2">
              <div
                className="size-3 rounded-full"
                style={{ background: storm.gradient, boxShadow: `0 0 6px ${storm.glowBright}` }}
              />
              <span className="text-[10px] font-light" style={{ color: "rgba(255,255,255,0.45)" }}>
                Solar Flare (L1)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="size-2.5 rounded-full"
                style={{ backgroundColor: storm.secondary, boxShadow: `0 0 4px ${storm.glow}` }}
              />
              <span className="text-[10px] font-light" style={{ color: "rgba(255,255,255,0.35)" }}>
                Field Lines (L2)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-1.5 rounded-full" style={{ backgroundColor: storm.primary, opacity: 0.4 }} />
              <span className="text-[10px] font-light" style={{ color: "rgba(255,255,255,0.25)" }}>
                Particles (L3)
              </span>
            </div>
          </div>

          {/* Stats overlay */}
          <div className="absolute top-3 right-3 text-right space-y-0.5 z-10">
            <div className="text-[10px] font-light" style={{ color: "rgba(255,255,255,0.25)" }}>
              {energyNodes.length} nodes
            </div>
            <div className="text-[10px] font-light" style={{ color: "rgba(255,255,255,0.25)" }}>
              {fieldConnections.length} field lines
            </div>
            {totalConfigurable > 0 && (
              <div
                className="text-[10px] font-light"
                style={{ color: totalConfigured > 0 ? "#ffd700" : "rgba(255,255,255,0.25)" }}
              >
                {totalConfigured}/{totalConfigurable} observed
              </div>
            )}
          </div>

          {/* Horizon at bottom of chart */}
          <div className="absolute bottom-0 left-0 right-0 z-[2]">
            <svg viewBox="0 0 400 40" preserveAspectRatio="none" className="w-full" style={{ height: 40, display: "block" }}>
              <path
                d="M0,40 L0,28 L30,22 L60,26 L90,18 L120,24 L150,14 L180,20 L210,12 L240,18 L270,10 L300,16 L330,20 L360,14 L390,22 L400,18 L400,40 Z"
                fill="#0a0408"
              />
            </svg>
          </div>
        </div>

        {/* Sidebar legend */}
        <div
          className="w-52 flex-shrink-0 rounded-xl p-3 space-y-3 hidden lg:block"
          style={{
            background: "rgba(255,255,255,0.015)",
            border: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <div className="text-xs font-light uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.35)" }}>
            Storm Legend
          </div>

          {/* L1 */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div
                className="size-2.5 rounded-full"
                style={{ background: storm.gradient, boxShadow: `0 0 4px ${storm.glowBright}` }}
              />
              <span className="text-[10px] font-light uppercase tracking-wider" style={{ color: storm.primary }}>
                Solar Flare
              </span>
            </div>
            <div className="text-xs pl-5 font-light" style={{ color: "rgba(255,255,255,0.55)" }}>
              {selectedL1.title}
            </div>
          </div>

          {/* L2 */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="size-2 rounded-full" style={{ backgroundColor: storm.secondary }} />
              <span className="text-[10px] font-light uppercase tracking-wider" style={{ color: storm.secondary }}>
                Field Lines
              </span>
            </div>
            <div className="space-y-0.5 pl-5">
              {selectedL2s.map((l2) => (
                <div key={l2.id} className="text-[10px] font-light" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {l2.title}
                </div>
              ))}
            </div>
          </div>

          {/* L3 count */}
          <div>
            <div className="flex items-center gap-2">
              <div className="size-1.5 rounded-full" style={{ backgroundColor: storm.primary, opacity: 0.5 }} />
              <span className="text-[10px] font-light" style={{ color: "rgba(255,255,255,0.3)" }}>
                {selectedL3s.length} charged particles
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Observation Panel (modal) */}
      {selectedNode && selectedNode.template?.defaultMilestoneConfig && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.88)" }}
          onClick={() => setSelectedNode(null)}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl p-6 space-y-4"
            style={{
              background: "linear-gradient(135deg, #0a0408 0%, #120610 50%, #0a0408 100%)",
              border: `1px solid ${storm.primary}25`,
              boxShadow: `0 0 60px ${storm.glow}, inset 0 0 40px rgba(0,0,0,0.5)`,
              backdropFilter: "blur(20px)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Frosted glass shimmer */}
            <div
              className="absolute inset-0 rounded-2xl opacity-25"
              style={{
                background: `radial-gradient(ellipse at 30% 20%, ${storm.primary}15 0%, transparent 60%)`,
                pointerEvents: "none",
              }}
            />

            {/* Close button */}
            <button
              onClick={() => setSelectedNode(null)}
              className="absolute top-3 right-3 size-8 rounded-full flex items-center justify-center cursor-pointer z-10"
              style={{
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <X className="size-4" style={{ color: "rgba(255,255,255,0.45)" }} />
            </button>

            {/* Header */}
            <div className="relative flex items-center gap-3">
              <div
                className="rounded-xl p-2.5"
                style={{
                  background: `${storm.primary}12`,
                  boxShadow: `0 0 12px ${storm.glow}`,
                }}
              >
                <Zap className="size-5" style={{ color: storm.primary }} />
              </div>
              <div>
                <div className="text-[10px] font-light uppercase tracking-[0.15em]" style={{ color: storm.primary }}>
                  Storm Observation
                </div>
                <h3 className="text-lg font-light tracking-wide" style={{ color: "rgba(255,255,255,0.9)" }}>
                  {selectedNode.label}
                </h3>
              </div>
            </div>

            <p className="text-xs font-light relative" style={{ color: "rgba(255,255,255,0.35)" }}>
              Shape the energy curve. Plot how this particle will intensify over time.
            </p>

            {/* Curve Editor */}
            <div className="relative" style={{ background: "rgba(0,0,0,0.3)", borderRadius: 12, padding: 4 }}>
              <MilestoneCurveEditor
                config={curveConfigs.get(selectedNode.id) || selectedNode.template.defaultMilestoneConfig}
                onChange={(config) => handleCurveChange(selectedNode.id, config)}
                themeId="cyberpunk"
                allowDirectEdit
              />
            </div>

            <Button
              onClick={() => setSelectedNode(null)}
              className="w-full relative font-light tracking-wide"
              style={{
                background: storm.gradient,
                boxShadow: `0 0 16px ${storm.glow}`,
              }}
            >
              Save Observation
            </Button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        className="sticky bottom-0 backdrop-blur-md py-4 -mx-6 px-6"
        style={{
          backgroundColor: "rgba(10, 4, 8, 0.92)",
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-light" style={{ color: "rgba(255,255,255,0.45)" }}>
            <span className="font-medium" style={{ color: storm.primary }}>{stormName}</span>
            {totalConfigurable > 0 && (
              <span className="text-xs ml-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                {totalConfigured}/{totalConfigurable} observations
              </span>
            )}
          </div>
          <Button
            onClick={() => onConfirm(curveConfigs)}
            className="font-light tracking-wide"
            style={{
              background: storm.gradient,
              boxShadow: `0 0 16px ${storm.glow}`,
            }}
          >
            Complete Storm
            <Zap className="size-4 ml-1" />
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes chartStormSway {
          0%, 100% { transform: skewX(-3deg) translateX(0); opacity: 0.7; }
          25% { transform: skewX(2deg) translateX(6px); opacity: 0.9; }
          50% { transform: skewX(-4deg) translateX(-4px); opacity: 0.6; }
          75% { transform: skewX(3deg) translateX(10px); opacity: 0.8; }
        }
        @keyframes chartStormPulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  )
}

/** Tiny background particles for the chart area */
function ChartParticles({ stormColor }: { stormColor: string }) {
  const [particles, setParticles] = useState<
    { id: number; x: number; y: number; size: number; opacity: number; delay: number }[]
  >([])

  useEffect(() => {
    setParticles(
      Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 1 + 0.3,
        opacity: Math.random() * 0.2 + 0.03,
        delay: Math.random() * 5,
      }))
    )
  }, [])

  return (
    <>
      {particles.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            backgroundColor: s.id % 3 === 0 ? stormColor : "#ffe4cc",
            opacity: s.opacity,
            animation: `chartStormTwinkle ${1.5 + s.delay}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes chartStormTwinkle {
          0%, 100% { opacity: 0.03; }
          50% { opacity: 0.2; }
        }
      `}</style>
    </>
  )
}
