"use client"

import { useState, useMemo, useEffect } from "react"
import { X, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MilestoneCurveEditor } from "@/src/goals/components/MilestoneCurveEditor"
import type { GoalTemplate, MilestoneLadderConfig } from "@/src/goals/types"
import type { GoalCustomization } from "./NodeCustomizer"

interface NodePosition {
  x: number
  y: number
  id: string
  label: string
  level: number
  parentId?: string
  size: number
  template: GoalTemplate | null
}

interface NetworkChartProps {
  path: "one_person" | "abundance"
  selectedL1: GoalTemplate
  selectedL2s: GoalTemplate[]
  selectedL3s: GoalTemplate[]
  goals: GoalCustomization[]
  pathColor: string
  onBack: () => void
  onConfirm: (curveConfigs: Map<string, MilestoneLadderConfig>) => void
}

/** Compute node positions in a hierarchical circuit layout */
function computeNodePositions(
  selectedL1: GoalTemplate,
  selectedL2s: GoalTemplate[],
  selectedL3s: GoalTemplate[],
): NodePosition[] {
  const positions: NodePosition[] = []
  const centerX = 50
  const centerY = 45

  // L1: Main processor (center)
  positions.push({
    x: centerX,
    y: centerY,
    id: selectedL1.id,
    label: selectedL1.title,
    level: 1,
    size: 10,
    template: selectedL1,
  })

  // L2: Sub-modules arranged in a horizontal row below L1
  const l2Y = centerY + 20
  const l2Spacing = Math.min(20, 80 / Math.max(selectedL2s.length, 1))
  const l2StartX = centerX - ((selectedL2s.length - 1) * l2Spacing) / 2

  selectedL2s.forEach((l2, i) => {
    const x = l2StartX + i * l2Spacing
    positions.push({
      x: Math.max(8, Math.min(92, x)),
      y: l2Y,
      id: l2.id,
      label: l2.title,
      level: 2,
      parentId: selectedL1.id,
      size: 6,
      template: l2,
    })
  })

  // L3: I/O pins arranged in outer rows, connected to nearest L2
  const l3Y = centerY + 40
  const totalL3 = selectedL3s.length
  const l3Spacing = Math.min(8, 90 / Math.max(totalL3, 1))
  const l3StartX = centerX - ((totalL3 - 1) * l3Spacing) / 2

  selectedL3s.forEach((l3, i) => {
    const x = l3StartX + i * l3Spacing
    const yJitter = (Math.sin(i * 2.7) * 4)
    const finalY = l3Y + yJitter

    // Find closest L2
    let closestL2 = selectedL2s[0]?.id || selectedL1.id
    let minDist = Infinity
    for (const l2Pos of positions.filter(p => p.level === 2)) {
      const dx = x - l2Pos.x
      const dist = Math.abs(dx)
      if (dist < minDist) {
        minDist = dist
        closestL2 = l2Pos.id
      }
    }

    positions.push({
      x: Math.max(4, Math.min(96, x)),
      y: Math.max(35, Math.min(95, finalY)),
      id: l3.id,
      label: l3.title,
      level: 3,
      parentId: closestL2,
      size: 3,
      template: l3,
    })
  })

  return positions
}

export function NetworkChart({
  path,
  selectedL1,
  selectedL2s,
  selectedL3s,
  goals,
  pathColor,
  onBack,
  onConfirm,
}: NetworkChartProps) {
  const mono = "var(--font-mono, 'Geist Mono', monospace)"
  const systemName = path === "one_person" ? "SEEKR-NET" : "ABND-NET"

  const [selectedNode, setSelectedNode] = useState<NodePosition | null>(null)
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
  const [pulsePhases, setPulsePhases] = useState<number[]>([])

  const nodePositions = useMemo(
    () => computeNodePositions(selectedL1, selectedL2s, selectedL3s),
    [selectedL1, selectedL2s, selectedL3s]
  )

  useEffect(() => {
    setPulsePhases(nodePositions.map(() => Math.random() * 6))
  }, [nodePositions.length])

  // Connection traces
  const traces = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number; opacity: number; level: number; id: string }[] = []
    for (const node of nodePositions) {
      if (node.parentId) {
        const parent = nodePositions.find(s => s.id === node.parentId)
        if (parent) {
          lines.push({
            x1: parent.x,
            y1: parent.y,
            x2: node.x,
            y2: node.y,
            opacity: node.level === 2 ? 0.35 : 0.12,
            level: node.level,
            id: `${parent.id}-${node.id}`,
          })
        }
      }
    }
    return lines
  }, [nodePositions])

  const handleCurveChange = (nodeId: string, config: MilestoneLadderConfig) => {
    setCurveConfigs(prev => {
      const next = new Map(prev)
      next.set(nodeId, config)
      return next
    })
    setConfiguredNodes(prev => new Set(prev).add(nodeId))
  }

  const milestoneScoredNodes = useMemo(() => {
    return nodePositions.filter(s => s.template?.defaultMilestoneConfig)
  }, [nodePositions])

  const totalConfigurable = milestoneScoredNodes.length
  const totalConfigured = configuredNodes.size

  return (
    <div className="relative space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs transition-colors cursor-pointer"
          style={{ color: "rgba(0, 255, 65, 0.4)", fontFamily: mono }}
        >
          <ChevronRight className="size-3.5 rotate-180" />
          &lt; BACK
        </button>
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: "#00ff41", boxShadow: "0 0 4px #00ff41" }}
          />
          <span
            className="text-[10px] font-bold tracking-wider"
            style={{ fontFamily: mono, color: "#00ff41" }}
          >
            NETWORK_VIEW
          </span>
        </div>
      </div>

      {/* System info + legend */}
      <div className="text-center space-y-1">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 text-[10px] font-bold tracking-widest"
          style={{
            fontFamily: mono,
            background: "rgba(0, 255, 65, 0.06)",
            color: "#00ff41",
            border: "1px solid rgba(0, 255, 65, 0.15)",
            borderRadius: 2,
          }}
        >
          {systemName}
        </div>
        <h2
          className="text-lg font-bold tracking-wider"
          style={{ fontFamily: mono, color: "#00ff41" }}
        >
          NETWORK TOPOLOGY
        </h2>
        <p
          className="text-[10px]"
          style={{ fontFamily: mono, color: "rgba(0, 255, 65, 0.3)" }}
        >
          Click configurable nodes to open signal analyzer. Shape milestone trajectories.
        </p>
      </div>

      {/* Main network diagram */}
      <div className="flex gap-4">
        <div
          className="flex-1 relative overflow-hidden"
          style={{
            background: "radial-gradient(ellipse at center, rgba(0, 255, 65, 0.02) 0%, #0a0a0a 70%)",
            border: "1px solid rgba(0, 255, 65, 0.12)",
            borderRadius: 3,
            minHeight: 450,
          }}
        >
          {/* Grid overlay */}
          <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
            <defs>
              <pattern id="network-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#00ff41" strokeWidth="0.3" strokeOpacity="0.04" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#network-grid)" />
          </svg>

          <svg
            viewBox="0 0 100 100"
            className="w-full h-full"
            style={{ minHeight: 450, position: "relative", zIndex: 1 }}
          >
            <defs>
              <filter id="node-glow-green">
                <feGaussianBlur in="SourceAlpha" stdDeviation="0.6" result="blur" />
                <feFlood floodColor="#00ff41" floodOpacity="0.5" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="node-glow-cyan">
                <feGaussianBlur in="SourceAlpha" stdDeviation="0.8" result="blur" />
                <feFlood floodColor="#00e5ff" floodOpacity="0.5" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="node-glow-path">
                <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur" />
                <feFlood floodColor={pathColor} floodOpacity="0.5" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Circuit traces — 90-degree routed paths */}
            {traces.map((trace) => {
              // Route with 90-degree angles: go down from parent, then horizontal, then down to child
              const midY = (trace.y1 + trace.y2) / 2
              return (
                <g key={trace.id}>
                  {/* Vertical down from parent */}
                  <line
                    x1={trace.x1} y1={trace.y1 + 1}
                    x2={trace.x1} y2={midY}
                    stroke="#00ff41"
                    strokeOpacity={trace.opacity}
                    strokeWidth={trace.level === 2 ? 0.25 : 0.12}
                  />
                  {/* Horizontal */}
                  <line
                    x1={trace.x1} y1={midY}
                    x2={trace.x2} y2={midY}
                    stroke="#00ff41"
                    strokeOpacity={trace.opacity}
                    strokeWidth={trace.level === 2 ? 0.25 : 0.12}
                  />
                  {/* Vertical down to child */}
                  <line
                    x1={trace.x2} y1={midY}
                    x2={trace.x2} y2={trace.y2 - 1}
                    stroke="#00ff41"
                    strokeOpacity={trace.opacity}
                    strokeWidth={trace.level === 2 ? 0.25 : 0.12}
                  />
                  {/* Via/solder point at corner */}
                  <circle
                    cx={trace.x1} cy={midY}
                    r={0.3}
                    fill="#00ff41"
                    fillOpacity={trace.opacity * 0.8}
                  />
                  <circle
                    cx={trace.x2} cy={midY}
                    r={0.3}
                    fill="#00ff41"
                    fillOpacity={trace.opacity * 0.8}
                  />

                  {/* Animated data pulse */}
                  {trace.level === 2 && (
                    <circle r="0.5" fill="#00ff41" fillOpacity="0.8" filter="url(#node-glow-green)">
                      <animateMotion
                        dur="3s"
                        repeatCount="indefinite"
                        path={`M${trace.x1},${trace.y1 + 1} L${trace.x1},${midY} L${trace.x2},${midY} L${trace.x2},${trace.y2 - 1}`}
                      />
                      <animate attributeName="fillOpacity" values="0;0.8;0.8;0" dur="3s" repeatCount="indefinite" />
                    </circle>
                  )}
                </g>
              )
            })}

            {/* Nodes */}
            {nodePositions.map((node, idx) => {
              const isSelected = selectedNode?.id === node.id
              const isConfigured = configuredNodes.has(node.id)
              const hasConfig = node.template?.defaultMilestoneConfig
              const pulseDelay = pulsePhases[idx] || 0

              const nodeColor = node.level === 1 ? pathColor : node.level === 2 ? "#00e5ff" : "#00ff41"
              const glowFilter = node.level === 1 ? "url(#node-glow-path)" : node.level === 2 ? "url(#node-glow-cyan)" : "url(#node-glow-green)"

              return (
                <g key={node.id}>
                  {/* Chip outline for L1 and L2 */}
                  {node.level <= 2 && (
                    <rect
                      x={node.x - node.size * 1.2}
                      y={node.y - node.size * 0.8}
                      width={node.size * 2.4}
                      height={node.size * 1.6}
                      rx={0.5}
                      fill={`${nodeColor}08`}
                      stroke={nodeColor}
                      strokeWidth={isSelected ? 0.4 : 0.2}
                      strokeOpacity={isSelected ? 0.8 : 0.4}
                    />
                  )}

                  {/* Configured indicator ring */}
                  {isConfigured && (
                    <rect
                      x={node.x - node.size * 1.5}
                      y={node.y - node.size * 1.1}
                      width={node.size * 3}
                      height={node.size * 2.2}
                      rx={1}
                      fill="none"
                      stroke="#00ff41"
                      strokeWidth={0.15}
                      strokeOpacity={0.4}
                      strokeDasharray="0.5,0.5"
                    />
                  )}

                  {/* Node LED indicator */}
                  <circle
                    cx={node.level <= 2 ? node.x - node.size * 1 : node.x}
                    cy={node.level <= 2 ? node.y - node.size * 0.5 : node.y}
                    r={node.level === 1 ? 1.2 : node.level === 2 ? 0.8 : 0.5}
                    fill={nodeColor}
                    fillOpacity={0.8}
                    filter={glowFilter}
                  >
                    {/* Blink animation */}
                    <animate
                      attributeName="fillOpacity"
                      values="0.5;1;0.5"
                      dur={`${2 + (pulseDelay % 2)}s`}
                      begin={`${pulseDelay}s`}
                      repeatCount="indefinite"
                    />
                  </circle>

                  {/* Pin markings for L3 nodes */}
                  {node.level === 3 && (
                    <>
                      <line
                        x1={node.x} y1={node.y - 1.5}
                        x2={node.x} y2={node.y - 0.8}
                        stroke="#00ff41"
                        strokeWidth={0.1}
                        strokeOpacity={0.3}
                      />
                    </>
                  )}

                  {/* Node label */}
                  {node.level <= 2 && (
                    <text
                      x={node.x}
                      y={node.y + (node.level === 1 ? 0.5 : 0.3)}
                      textAnchor="middle"
                      fill={nodeColor}
                      fillOpacity={0.8}
                      fontSize={node.level === 1 ? 1.8 : 1.3}
                      fontWeight={700}
                      fontFamily="monospace"
                    >
                      {node.label.length > 20 ? node.label.slice(0, 18) + ".." : node.label}
                    </text>
                  )}

                  {/* Register value for L2 */}
                  {node.level === 2 && (
                    <text
                      x={node.x + node.size * 0.8}
                      y={node.y - node.size * 0.35}
                      textAnchor="end"
                      fill={nodeColor}
                      fillOpacity={0.3}
                      fontSize="0.9"
                      fontFamily="monospace"
                    >
                      {hasConfig ? "CFG" : "---"}
                    </text>
                  )}

                  {/* Invisible clickable area */}
                  {hasConfig && (
                    <rect
                      x={node.x - Math.max(node.size * 2, 4)}
                      y={node.y - Math.max(node.size * 1.5, 3)}
                      width={Math.max(node.size * 4, 8)}
                      height={Math.max(node.size * 3, 6)}
                      fill="transparent"
                      className="cursor-pointer"
                      onClick={() => setSelectedNode(node)}
                    />
                  )}
                </g>
              )
            })}
          </svg>

          {/* Legend overlay */}
          <div className="absolute bottom-3 left-3 space-y-1 z-10">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-2"
                style={{
                  backgroundColor: `${pathColor}20`,
                  border: `1px solid ${pathColor}60`,
                  borderRadius: 1,
                }}
              />
              <span className="text-[9px] font-bold" style={{ fontFamily: mono, color: "rgba(0, 255, 65, 0.4)" }}>
                ROOT [L1]
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-2"
                style={{
                  backgroundColor: "rgba(0, 229, 255, 0.08)",
                  border: "1px solid rgba(0, 229, 255, 0.3)",
                  borderRadius: 1,
                }}
              />
              <span className="text-[9px]" style={{ fontFamily: mono, color: "rgba(0, 255, 65, 0.3)" }}>
                MODULES [L2]
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: "#00ff41", opacity: 0.5 }}
              />
              <span className="text-[9px]" style={{ fontFamily: mono, color: "rgba(0, 255, 65, 0.25)" }}>
                I/O PINS [L3]
              </span>
            </div>
          </div>

          {/* Stats overlay */}
          <div className="absolute top-3 right-3 text-right space-y-0.5 z-10">
            <div className="text-[9px]" style={{ fontFamily: mono, color: "rgba(0, 255, 65, 0.3)" }}>
              {nodePositions.length} NODES
            </div>
            <div className="text-[9px]" style={{ fontFamily: mono, color: "rgba(0, 255, 65, 0.3)" }}>
              {traces.length} TRACES
            </div>
            {totalConfigurable > 0 && (
              <div
                className="text-[9px]"
                style={{
                  fontFamily: mono,
                  color: totalConfigured > 0 ? "#00ff41" : "rgba(0, 255, 65, 0.3)",
                }}
              >
                {totalConfigured}/{totalConfigurable} ANALYZED
              </div>
            )}
          </div>
        </div>

        {/* Sidebar — node list */}
        <div
          className="w-48 flex-shrink-0 p-3 space-y-3 hidden lg:block"
          style={{
            background: "rgba(0, 255, 65, 0.01)",
            border: "1px solid rgba(0, 255, 65, 0.08)",
            borderRadius: 2,
          }}
        >
          <div
            className="text-[9px] font-bold tracking-wider"
            style={{ fontFamily: mono, color: "rgba(0, 255, 65, 0.35)" }}
          >
            // NODE_REGISTRY
          </div>

          {/* L1 */}
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pathColor }} />
              <span className="text-[9px] font-bold" style={{ fontFamily: mono, color: pathColor }}>
                ROOT
              </span>
            </div>
            <div className="text-[10px] pl-3" style={{ fontFamily: mono, color: "rgba(255,255,255,0.5)" }}>
              {selectedL1.title}
            </div>
          </div>

          {/* L2 */}
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#00e5ff" }} />
              <span className="text-[9px] font-bold" style={{ fontFamily: mono, color: "#00e5ff" }}>
                MODULES
              </span>
            </div>
            <div className="space-y-0.5 pl-3">
              {selectedL2s.map(l2 => (
                <div key={l2.id} className="text-[9px]" style={{ fontFamily: mono, color: "rgba(255,255,255,0.4)" }}>
                  {l2.title}
                </div>
              ))}
            </div>
          </div>

          {/* L3 count */}
          <div className="flex items-center gap-1.5">
            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: "#00ff41", opacity: 0.5 }} />
            <span className="text-[9px]" style={{ fontFamily: mono, color: "rgba(0, 255, 65, 0.3)" }}>
              {selectedL3s.length} I/O PINS
            </span>
          </div>
        </div>
      </div>

      {/* Signal Analyzer Modal (Oscilloscope) */}
      {selectedNode && selectedNode.template?.defaultMilestoneConfig && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.9)" }}
          onClick={() => setSelectedNode(null)}
        >
          <div
            className="relative w-full max-w-lg p-5 space-y-4"
            style={{
              background: "#050505",
              border: "1px solid rgba(0, 255, 65, 0.25)",
              borderRadius: 3,
              boxShadow: "0 0 40px rgba(0, 255, 65, 0.08), inset 0 0 30px rgba(0, 0, 0, 0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* CRT scanline overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 65, 0.02) 2px, rgba(0, 255, 65, 0.02) 4px)",
                borderRadius: 3,
                zIndex: 10,
              }}
            />

            {/* Corner brackets */}
            <div style={{ position: "absolute", top: 0, left: 0, width: 10, height: 10, borderTop: "2px solid #00ff41", borderLeft: "2px solid #00ff41", zIndex: 11, opacity: 0.5 }} />
            <div style={{ position: "absolute", top: 0, right: 0, width: 10, height: 10, borderTop: "2px solid #00ff41", borderRight: "2px solid #00ff41", zIndex: 11, opacity: 0.5 }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, width: 10, height: 10, borderBottom: "2px solid #00ff41", borderLeft: "2px solid #00ff41", zIndex: 11, opacity: 0.5 }} />
            <div style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderBottom: "2px solid #00ff41", borderRight: "2px solid #00ff41", zIndex: 11, opacity: 0.5 }} />

            <div className="relative" style={{ zIndex: 5 }}>
              {/* Close button */}
              <button
                onClick={() => setSelectedNode(null)}
                className="absolute top-0 right-0 w-7 h-7 flex items-center justify-center cursor-pointer"
                style={{
                  backgroundColor: "rgba(0, 255, 65, 0.05)",
                  border: "1px solid rgba(0, 255, 65, 0.15)",
                  borderRadius: 2,
                }}
              >
                <X className="size-3.5" style={{ color: "rgba(0, 255, 65, 0.5)" }} />
              </button>

              {/* Header */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-8 h-8 flex items-center justify-center"
                  style={{
                    background: "rgba(0, 255, 65, 0.08)",
                    border: "1px solid rgba(0, 255, 65, 0.2)",
                    borderRadius: 2,
                  }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#00ff41" strokeWidth="2">
                    <path d="M2 12 Q6 4, 8 12 Q10 20, 12 12 Q14 4, 16 12 Q18 20, 22 12" />
                  </svg>
                </div>
                <div>
                  <div
                    className="text-[9px] font-bold tracking-wider"
                    style={{ fontFamily: mono, color: "#00ff41", textTransform: "uppercase" }}
                  >
                    SIGNAL_ANALYZER
                  </div>
                  <h3
                    className="text-sm font-bold"
                    style={{ fontFamily: mono, color: "rgba(255,255,255,0.9)" }}
                  >
                    {selectedNode.label}
                  </h3>
                </div>
              </div>

              <p
                className="text-[10px] mb-3"
                style={{ fontFamily: mono, color: "rgba(0, 255, 65, 0.3)" }}
              >
                // Configure signal trajectory. Shape the milestone waveform.
              </p>

              {/* Curve Editor — cyberpunk theme fits perfectly */}
              <div
                style={{
                  background: "rgba(0, 0, 0, 0.3)",
                  borderRadius: 3,
                  padding: 4,
                }}
              >
                <MilestoneCurveEditor
                  config={curveConfigs.get(selectedNode.id) || selectedNode.template.defaultMilestoneConfig}
                  onChange={(config) => handleCurveChange(selectedNode.id, config)}
                  themeId="cyberpunk"
                  allowDirectEdit
                />
              </div>

              <Button
                onClick={() => setSelectedNode(null)}
                className="w-full text-xs font-bold tracking-wider mt-3"
                style={{
                  fontFamily: mono,
                  backgroundColor: "#00ff41",
                  color: "#000",
                  borderRadius: 3,
                  boxShadow: "0 0 12px rgba(0, 255, 65, 0.3)",
                  textTransform: "uppercase",
                }}
              >
                SAVE TRAJECTORY
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        className="sticky bottom-0 backdrop-blur-sm py-4 -mx-6 px-6"
        style={{
          backgroundColor: "rgba(10, 10, 10, 0.95)",
          borderTop: "1px solid rgba(0, 255, 65, 0.1)",
        }}
      >
        <div className="flex items-center justify-between">
          <div style={{ fontFamily: mono }}>
            <span className="text-xs font-bold" style={{ color: "#00ff41" }}>{systemName}</span>
            {totalConfigurable > 0 && (
              <span className="text-[10px] ml-2" style={{ color: "rgba(0, 255, 65, 0.3)" }}>
                {totalConfigured}/{totalConfigurable} SIGNALS ANALYZED
              </span>
            )}
          </div>
          <Button
            onClick={() => onConfirm(curveConfigs)}
            className="text-xs font-bold tracking-wider"
            style={{
              fontFamily: mono,
              backgroundColor: pathColor,
              borderRadius: 3,
              boxShadow: `0 0 12px ${pathColor}40`,
              textTransform: "uppercase",
            }}
          >
            DEPLOY NETWORK &gt;&gt;
          </Button>
        </div>
      </div>
    </div>
  )
}
