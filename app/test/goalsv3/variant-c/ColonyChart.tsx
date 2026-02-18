"use client"

import { useState, useMemo, useEffect } from "react"
import { Waves, X, Star, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MilestoneCurveEditor } from "@/src/goals/components/MilestoneCurveEditor"
import type { GoalTemplate, MilestoneLadderConfig } from "@/src/goals/types"
import type { GoalCustomization } from "./OrganismCustomizer"

const COLONY_NAMES: Record<string, string> = {
  one_person: "The Angler",
  abundance: "The Swarm",
}

interface OrganismPosition {
  x: number
  y: number
  id: string
  label: string
  level: number
  parentId?: string
  size: number
  glowIntensity: number
  template: GoalTemplate | null
  pulseDelay: number
}

interface ColonyChartProps {
  path: "one_person" | "abundance"
  selectedL1: GoalTemplate
  selectedL2s: GoalTemplate[]
  selectedL3s: GoalTemplate[]
  goals: GoalCustomization[]
  pathColor: string
  onBack: () => void
  onConfirm: (curveConfigs: Map<string, MilestoneLadderConfig>) => void
}

/** Compute organism positions in a colony-like radial layout */
function computeColonyPositions(
  selectedL1: GoalTemplate,
  selectedL2s: GoalTemplate[],
  selectedL3s: GoalTemplate[],
): OrganismPosition[] {
  const positions: OrganismPosition[] = []
  const cx = 50
  const cy = 50

  // Central organism (L1)
  positions.push({
    x: cx, y: cy,
    id: selectedL1.id,
    label: selectedL1.title,
    level: 1,
    size: 8,
    glowIntensity: 1,
    template: selectedL1,
    pulseDelay: 0,
  })

  // Colony nodes (L2) in inner ring
  const l2Radius = 20
  selectedL2s.forEach((l2, i) => {
    const angle = (i / selectedL2s.length) * Math.PI * 2 - Math.PI / 2
    const x = cx + Math.cos(angle) * l2Radius
    const y = cy + Math.sin(angle) * l2Radius
    positions.push({
      x, y,
      id: l2.id,
      label: l2.title,
      level: 2,
      parentId: selectedL1.id,
      size: 5,
      glowIntensity: 0.7,
      template: l2,
      pulseDelay: i * 0.4,
    })
  })

  // Satellite organisms (L3) in outer ring
  const l3Radius = 38
  selectedL3s.forEach((l3, i) => {
    const angle = (i / selectedL3s.length) * Math.PI * 2 - Math.PI / 2
    const jitterX = Math.sin(i * 7.3) * 3
    const jitterY = Math.cos(i * 5.1) * 3
    const x = cx + Math.cos(angle) * l3Radius + jitterX
    const y = cy + Math.sin(angle) * l3Radius + jitterY

    // Find closest L2
    let closestL2 = selectedL2s[0]?.id || selectedL1.id
    let minDist = Infinity
    for (const l2Pos of positions.filter((p) => p.level === 2)) {
      const dx = x - l2Pos.x
      const dy = y - l2Pos.y
      const dist = dx * dx + dy * dy
      if (dist < minDist) {
        minDist = dist
        closestL2 = l2Pos.id
      }
    }

    positions.push({
      x: Math.max(5, Math.min(95, x)),
      y: Math.max(5, Math.min(95, y)),
      id: l3.id,
      label: l3.title,
      level: 3,
      parentId: closestL2,
      size: 2.2,
      glowIntensity: 0.35,
      template: l3,
      pulseDelay: i * 0.15,
    })
  })

  return positions
}

/** Generate a curved SVG path between two points (tendril-like) */
function tendrilPath(x1: number, y1: number, x2: number, y2: number, curviness: number = 0.3): string {
  const dx = x2 - x1
  const dy = y2 - y1
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  // Perpendicular offset for curve
  const nx = -dy * curviness
  const ny = dx * curviness
  const cpx = mx + nx
  const cpy = my + ny
  return `M ${x1} ${y1} Q ${cpx} ${cpy} ${x2} ${y2}`
}

export function ColonyChart({
  path,
  selectedL1,
  selectedL2s,
  selectedL3s,
  goals,
  pathColor,
  onBack,
  onConfirm,
}: ColonyChartProps) {
  const colonyName = COLONY_NAMES[path] ?? "The Colony"

  const [selectedOrganism, setSelectedOrganism] = useState<OrganismPosition | null>(null)
  const [curveConfigs, setCurveConfigs] = useState<Map<string, MilestoneLadderConfig>>(() => {
    const map = new Map<string, MilestoneLadderConfig>()
    for (const tmpl of [...selectedL2s, ...selectedL3s]) {
      if (tmpl.defaultMilestoneConfig) {
        map.set(tmpl.id, { ...tmpl.defaultMilestoneConfig })
      }
    }
    return map
  })
  const [configuredOrganisms, setConfiguredOrganisms] = useState<Set<string>>(new Set())
  const [phases, setPhases] = useState<number[]>([])

  const organismPositions = useMemo(
    () => computeColonyPositions(selectedL1, selectedL2s, selectedL3s),
    [selectedL1, selectedL2s, selectedL3s],
  )

  useEffect(() => {
    setPhases(organismPositions.map(() => Math.random() * Math.PI * 2))
  }, [organismPositions.length])

  // Tendril connections
  const tendrils = useMemo(() => {
    const lines: { path: string; x1: number; y1: number; x2: number; y2: number; opacity: number; level: number }[] = []
    for (const org of organismPositions) {
      if (org.parentId) {
        const parent = organismPositions.find((p) => p.id === org.parentId)
        if (parent) {
          const curviness = org.level === 2 ? 0.15 : 0.25 + Math.random() * 0.1
          lines.push({
            path: tendrilPath(parent.x, parent.y, org.x, org.y, curviness),
            x1: parent.x, y1: parent.y,
            x2: org.x, y2: org.y,
            opacity: org.level === 2 ? 0.35 : 0.1,
            level: org.level,
          })
        }
      }
    }
    return lines
  }, [organismPositions])

  const handleCurveChange = (orgId: string, config: MilestoneLadderConfig) => {
    setCurveConfigs((prev) => {
      const next = new Map(prev)
      next.set(orgId, config)
      return next
    })
    setConfiguredOrganisms((prev) => new Set(prev).add(orgId))
  }

  const milestoneScoredOrganisms = useMemo(() => {
    return organismPositions.filter((o) => o.template?.defaultMilestoneConfig)
  }, [organismPositions])

  const totalConfigurable = milestoneScoredOrganisms.length
  const totalConfigured = configuredOrganisms.size

  // Colors for the bioluminescent palette
  const cyanGlow = "#00ffff"
  const magentaGlow = "#ff00ff"
  const blueGlow = "#0066ff"
  const greenGlow = "#00ff88"

  return (
    <div className="relative space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-sm transition-colors cursor-pointer" style={{ color: "rgba(255,255,255,0.4)" }}>
          <ChevronRight className="size-4 rotate-180" />
          Back to customize
        </button>
        <div className="flex items-center gap-2">
          <Waves className="size-4" style={{ color: pathColor, filter: `drop-shadow(0 0 4px ${pathColor}80)` }} />
          <span className="text-sm font-medium" style={{ color: pathColor, textShadow: `0 0 8px ${pathColor}40` }}>Colony View</span>
        </div>
      </div>

      {/* Colony name + legend */}
      <div className="text-center space-y-1">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
          style={{
            background: `${pathColor}08`,
            color: pathColor,
            border: `1px solid ${pathColor}20`,
            boxShadow: `0 0 10px ${pathColor}10`,
          }}
        >
          <Waves className="size-3" />
          {colonyName}
        </div>
        <h2
          className="text-xl font-bold"
          style={{ color: "rgba(255,255,255,0.9)", textShadow: `0 0 20px ${pathColor}10` }}
        >
          Your Bioluminescent Colony
        </h2>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
          Click any glowing organism to open the analysis panel and shape its growth trajectory
        </p>
      </div>

      {/* Main content: colony map + sidebar */}
      <div className="flex gap-4">
        {/* Colony map */}
        <div
          className="flex-1 relative rounded-2xl overflow-hidden"
          style={{
            background: `radial-gradient(ellipse at center, rgba(0,8,16,0.9) 0%, #000810 60%, #000000 100%)`,
            border: `1px solid ${pathColor}12`,
            minHeight: 450,
            boxShadow: `inset 0 0 60px rgba(0,8,16,0.5)`,
          }}
        >
          {/* Ambient glow in center */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 40% 40% at 50% 50%, ${pathColor}06, transparent 70%)`,
              animation: "colonyPulse 6s ease-in-out infinite",
            }}
          />

          <svg
            viewBox="0 0 100 100"
            className="w-full h-full"
            style={{ minHeight: 450, position: "relative", zIndex: 1 }}
          >
            <defs>
              {/* Glow filters for different organism levels */}
              <filter id="bio-glow-l1">
                <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
                <feFlood floodColor={pathColor} floodOpacity="0.6" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="bio-glow-l2">
                <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" result="blur" />
                <feFlood floodColor={cyanGlow} floodOpacity="0.5" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="bio-glow-l3">
                <feGaussianBlur in="SourceAlpha" stdDeviation="0.6" result="blur" />
                <feFlood floodColor={greenGlow} floodOpacity="0.3" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Tendril glow */}
              <filter id="tendril-glow">
                <feGaussianBlur in="SourceGraphic" stdDeviation="0.3" />
              </filter>
            </defs>

            {/* Bioluminescent tendrils */}
            {tendrils.map((tendril, i) => (
              <g key={i}>
                {/* Outer glow layer */}
                <path
                  d={tendril.path}
                  fill="none"
                  stroke={tendril.level === 2 ? cyanGlow : greenGlow}
                  strokeWidth={tendril.level === 2 ? 0.4 : 0.2}
                  strokeOpacity={tendril.opacity * 0.3}
                  filter="url(#tendril-glow)"
                />
                {/* Main tendril */}
                <path
                  d={tendril.path}
                  fill="none"
                  stroke={tendril.level === 2 ? cyanGlow : greenGlow}
                  strokeWidth={tendril.level === 2 ? 0.2 : 0.1}
                  strokeOpacity={tendril.opacity}
                  strokeDasharray={tendril.level === 3 ? "0.8,0.5" : "none"}
                >
                  <animate
                    attributeName="stroke-opacity"
                    values={`${tendril.opacity * 0.6};${tendril.opacity};${tendril.opacity * 0.6}`}
                    dur={`${4 + (i % 3)}s`}
                    begin={`${(i * 0.2) % 3}s`}
                    repeatCount="indefinite"
                  />
                </path>
              </g>
            ))}

            {/* Organisms */}
            {organismPositions.map((org, idx) => {
              const isSelected = selectedOrganism?.id === org.id
              const isConfigured = configuredOrganisms.has(org.id)
              const hasConfig = org.template?.defaultMilestoneConfig
              const phase = phases[idx] ?? 0

              const orgColor = org.level === 1
                ? pathColor
                : org.level === 2
                  ? cyanGlow
                  : greenGlow

              return (
                <g key={org.id}>
                  {/* Outer glow ring - pulsing */}
                  {org.level <= 2 && (
                    <circle
                      cx={org.x}
                      cy={org.y}
                      r={org.size * 2}
                      fill="none"
                      stroke={orgColor}
                      strokeWidth={0.08}
                      strokeOpacity={0.15}
                    >
                      <animate
                        attributeName="r"
                        values={`${org.size * 1.5};${org.size * 2.5};${org.size * 1.5}`}
                        dur={`${4 + phase}s`}
                        begin={`${phase}s`}
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="stroke-opacity"
                        values="0.2;0.05;0.2"
                        dur={`${4 + phase}s`}
                        begin={`${phase}s`}
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}

                  {/* Configured indicator ring */}
                  {isConfigured && (
                    <circle
                      cx={org.x}
                      cy={org.y}
                      r={org.size + 1.2}
                      fill="none"
                      stroke={greenGlow}
                      strokeWidth={0.15}
                      strokeOpacity={0.5}
                      strokeDasharray="0.4,0.4"
                    >
                      <animate
                        attributeName="stroke-opacity"
                        values="0.3;0.6;0.3"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}

                  {/* Inner glow (radial) */}
                  <circle
                    cx={org.x}
                    cy={org.y}
                    r={org.size * 1.5}
                    fill={orgColor}
                    fillOpacity={0.03}
                  >
                    <animate
                      attributeName="fill-opacity"
                      values="0.02;0.06;0.02"
                      dur={`${3 + phase % 2}s`}
                      begin={`${phase}s`}
                      repeatCount="indefinite"
                    />
                  </circle>

                  {/* Organism body */}
                  <circle
                    cx={org.x}
                    cy={org.y}
                    r={isSelected ? org.size * 1.3 : org.size}
                    fill={orgColor}
                    fillOpacity={org.glowIntensity}
                    filter={
                      org.level === 1
                        ? "url(#bio-glow-l1)"
                        : org.level === 2
                          ? "url(#bio-glow-l2)"
                          : "url(#bio-glow-l3)"
                    }
                    className={hasConfig ? "cursor-pointer" : ""}
                    onClick={() => {
                      if (hasConfig) setSelectedOrganism(org)
                    }}
                  >
                    {/* Pulse animation */}
                    <animate
                      attributeName="fill-opacity"
                      values={`${org.glowIntensity * 0.6};${org.glowIntensity};${org.glowIntensity * 0.6}`}
                      dur={`${3 + (phase % 2)}s`}
                      begin={`${org.pulseDelay}s`}
                      repeatCount="indefinite"
                    />
                    {org.level === 1 && (
                      <animate
                        attributeName="r"
                        values={`${org.size * 0.95};${org.size * 1.05};${org.size * 0.95}`}
                        dur="4s"
                        repeatCount="indefinite"
                      />
                    )}
                  </circle>

                  {/* Labels for L1 and L2 */}
                  {org.level <= 2 && (
                    <text
                      x={org.x}
                      y={org.y + org.size + 2.5}
                      textAnchor="middle"
                      fill={orgColor}
                      fillOpacity={0.6}
                      fontSize={org.level === 1 ? 2 : 1.4}
                      fontWeight={org.level === 1 ? 700 : 500}
                      style={{ filter: `drop-shadow(0 0 2px ${orgColor})` }}
                    >
                      {org.label.length > 22 ? org.label.slice(0, 20) + "..." : org.label}
                    </text>
                  )}

                  {/* Larger click target */}
                  {hasConfig && (
                    <circle
                      cx={org.x}
                      cy={org.y}
                      r={Math.max(org.size * 2, 4)}
                      fill="transparent"
                      className="cursor-pointer"
                      onClick={() => setSelectedOrganism(org)}
                    />
                  )}
                </g>
              )
            })}
          </svg>

          {/* Legend overlay */}
          <div className="absolute bottom-3 left-3 space-y-1.5 z-10">
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full" style={{ backgroundColor: pathColor, boxShadow: `0 0 8px ${pathColor}60` }} />
              <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>Central Organism (L1)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-2.5 rounded-full" style={{ backgroundColor: cyanGlow, boxShadow: `0 0 6px ${cyanGlow}50` }} />
              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>Colony Nodes (L2)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-1.5 rounded-full" style={{ backgroundColor: greenGlow, boxShadow: `0 0 4px ${greenGlow}40` }} />
              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>Satellites (L3)</span>
            </div>
          </div>

          {/* Stats overlay */}
          <div className="absolute top-3 right-3 text-right space-y-0.5 z-10">
            <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
              {organismPositions.length} organisms
            </div>
            <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
              {tendrils.length} tendrils
            </div>
            {totalConfigurable > 0 && (
              <div className="text-[10px]" style={{ color: totalConfigured > 0 ? greenGlow : "rgba(255,255,255,0.25)" }}>
                {totalConfigured}/{totalConfigurable} analyzed
              </div>
            )}
          </div>
        </div>

        {/* Sidebar legend */}
        <div
          className="w-52 flex-shrink-0 rounded-xl p-3 space-y-3 hidden lg:block"
          style={{
            background: "rgba(0,8,16,0.6)",
            border: `1px solid ${pathColor}08`,
          }}
        >
          <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>
            Colony Legend
          </div>

          {/* L1 */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Star className="size-3" style={{ color: pathColor, filter: `drop-shadow(0 0 3px ${pathColor})` }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: pathColor }}>Central</span>
            </div>
            <div className="text-xs pl-5" style={{ color: "rgba(255,255,255,0.5)" }}>{selectedL1.title}</div>
          </div>

          {/* L2 */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="size-2.5 rounded-full" style={{ backgroundColor: cyanGlow, boxShadow: `0 0 4px ${cyanGlow}50` }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: cyanGlow }}>Nodes</span>
            </div>
            <div className="space-y-0.5 pl-5">
              {selectedL2s.map((l2) => (
                <div key={l2.id} className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {l2.title}
                </div>
              ))}
            </div>
          </div>

          {/* L3 count */}
          <div>
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full" style={{ backgroundColor: greenGlow, boxShadow: `0 0 3px ${greenGlow}40` }} />
              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                {selectedL3s.length} satellite organisms
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Modal (submarine HUD style) */}
      {selectedOrganism && selectedOrganism.template?.defaultMilestoneConfig && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,4,8,0.9)" }}
          onClick={() => setSelectedOrganism(null)}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl p-6 space-y-4"
            style={{
              background: "linear-gradient(135deg, #000810 0%, #001020 50%, #000810 100%)",
              border: `1px solid ${pathColor}25`,
              boxShadow: `0 0 60px ${pathColor}10, inset 0 0 30px rgba(0,8,16,0.8)`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* HUD corner brackets */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t border-l" style={{ borderColor: `${pathColor}30` }} />
            <div className="absolute top-0 right-0 w-4 h-4 border-t border-r" style={{ borderColor: `${pathColor}30` }} />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l" style={{ borderColor: `${pathColor}30` }} />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r" style={{ borderColor: `${pathColor}30` }} />

            {/* Close button */}
            <button
              onClick={() => setSelectedOrganism(null)}
              className="absolute top-3 right-3 size-8 rounded-full flex items-center justify-center cursor-pointer"
              style={{
                backgroundColor: "rgba(255,255,255,0.03)",
                border: `1px solid ${pathColor}15`,
              }}
            >
              <X className="size-4" style={{ color: "rgba(255,255,255,0.4)" }} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div
                className="rounded-full p-2.5"
                style={{
                  background: `${pathColor}12`,
                  boxShadow: `0 0 12px ${pathColor}20`,
                }}
              >
                <Waves className="size-5" style={{ color: pathColor, filter: `drop-shadow(0 0 3px ${pathColor})` }} />
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: pathColor }}>
                  Analysis Panel
                </div>
                <h3 className="text-lg font-bold" style={{ color: "rgba(255,255,255,0.9)" }}>
                  {selectedOrganism.label}
                </h3>
              </div>
            </div>

            <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
              Shape this organism&apos;s growth trajectory. Drag the curve to control how it evolves.
            </p>

            {/* Curve Editor */}
            <div style={{ background: "rgba(0,4,8,0.5)", borderRadius: 12, padding: 4 }}>
              <MilestoneCurveEditor
                config={curveConfigs.get(selectedOrganism.id) || selectedOrganism.template.defaultMilestoneConfig}
                onChange={(config) => handleCurveChange(selectedOrganism.id, config)}
                themeId="zen"
                allowDirectEdit
              />
            </div>

            <Button
              onClick={() => setSelectedOrganism(null)}
              className="w-full"
              style={{
                backgroundColor: `${pathColor}20`,
                color: pathColor,
                border: `1px solid ${pathColor}40`,
                boxShadow: `0 0 15px ${pathColor}15`,
              }}
            >
              Save Analysis
            </Button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        className="sticky bottom-0 backdrop-blur-md py-4 -mx-6 px-6"
        style={{
          backgroundColor: "rgba(0, 8, 16, 0.92)",
          borderTop: `1px solid ${pathColor}10`,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            <span className="font-medium" style={{ color: pathColor, textShadow: `0 0 6px ${pathColor}40` }}>{colonyName}</span>
            {totalConfigurable > 0 && (
              <span className="text-xs ml-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                {totalConfigured}/{totalConfigurable} trajectories shaped
              </span>
            )}
          </div>
          <Button
            onClick={() => onConfirm(curveConfigs)}
            style={{
              backgroundColor: `${pathColor}20`,
              color: pathColor,
              border: `1px solid ${pathColor}40`,
              boxShadow: `0 0 15px ${pathColor}15`,
            }}
          >
            Complete Colony
            <Waves className="size-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  )
}
