"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { generateMilestoneLadder } from "@/src/goals/milestoneService"
import type { GoalTemplate, MilestoneLadderConfig, GoalDisplayCategory } from "@/src/goals/types"
import type { GoalCustomization } from "./NodeCustomizer"

const CATEGORY_LABELS: Partial<Record<GoalDisplayCategory, string>> = {
  field_work: "FIELD_OPS",
  results: "OUTPUT_METRICS",
  dirty_dog: "RESTRICTED_IO",
  texting: "MSG_PROTOCOL",
  dates: "DATE_HANDLER",
  relationship: "REL_STATE",
}

const SYSTEM_NAMES: Record<string, string> = {
  one_person: "SEEKR-NET",
  abundance: "ABND-NET",
}

interface CircuitCompleteProps {
  path: "one_person" | "abundance"
  selectedL1: GoalTemplate
  selectedL2s: GoalTemplate[]
  selectedL3s: GoalTemplate[]
  goals: GoalCustomization[]
  curveConfigs: Map<string, MilestoneLadderConfig>
  pathColor: string
  onStartOver: () => void
}

export function CircuitComplete({
  path,
  selectedL1,
  selectedL2s,
  selectedL3s,
  goals,
  curveConfigs,
  pathColor,
  onStartOver,
}: CircuitCompleteProps) {
  const mono = "var(--font-mono, 'Geist Mono', monospace)"
  const systemName = SYSTEM_NAMES[path] || "SYS-NET"

  const [bootLines, setBootLines] = useState<string[]>([])
  const [bootComplete, setBootComplete] = useState(false)

  const l2Goals = goals.filter((g) => g.level === 2)
  const l3Goals = goals.filter((g) => g.level === 3)

  const l3ByCategory = useMemo(() => {
    const grouped: Record<string, GoalCustomization[]> = {}
    for (const g of l3Goals) {
      const template = selectedL3s.find((t) => t.id === g.templateId)
      const cat = template?.displayCategory || "field_work"
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(g)
    }
    return grouped as Partial<Record<GoalDisplayCategory, GoalCustomization[]>>
  }, [l3Goals, selectedL3s])

  const milestoneCount = l3Goals.filter((g) => {
    const tmpl = selectedL3s.find((t) => t.id === g.templateId)
    return tmpl?.templateType === "milestone_ladder"
  }).length

  const habitCount = l3Goals.filter((g) => {
    const tmpl = selectedL3s.find((t) => t.id === g.templateId)
    return tmpl?.templateType === "habit_ramp"
  }).length

  const topNode = useMemo(() => {
    let maxSteps = 0
    let brightest = ""
    for (const [id, config] of curveConfigs) {
      const milestones = generateMilestoneLadder(config)
      if (milestones.length > maxSteps) {
        maxSteps = milestones.length
        const tmpl = [...selectedL2s, ...selectedL3s].find(t => t.id === id)
        brightest = tmpl?.title || id
      }
    }
    return brightest || selectedL1.title
  }, [curveConfigs, selectedL1, selectedL2s, selectedL3s])

  const totalNodes = 1 + l2Goals.length + l3Goals.length
  const totalTraces = l2Goals.length + l3Goals.length

  // Boot sequence animation
  useEffect(() => {
    const lines = [
      `[INIT] ${systemName} v2.0 booting...`,
      `[LOAD] Root directive: ${selectedL1.title}`,
      `[LOAD] ${l2Goals.length} sub-modules registered`,
      `[LOAD] ${l3Goals.length} I/O pins configured`,
      `[SCAN] ${totalTraces} circuit traces mapped`,
      `[CALC] ${curveConfigs.size} signal trajectories computed`,
      `[VRFY] All nodes responding... OK`,
      `[BOOT] System ${systemName} is ONLINE`,
    ]

    let i = 0
    const interval = setInterval(() => {
      if (i < lines.length) {
        setBootLines((prev) => [...prev, lines[i]])
        i++
      } else {
        setBootComplete(true)
        clearInterval(interval)
      }
    }, 200)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative space-y-8">
      {/* Boot sequence terminal */}
      <div
        className="p-4 overflow-hidden"
        style={{
          background: "#020202",
          border: "1px solid rgba(0, 255, 65, 0.15)",
          borderRadius: 3,
          minHeight: 180,
        }}
      >
        {/* Scanline overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 65, 0.01) 2px, rgba(0, 255, 65, 0.01) 4px)",
          }}
        />
        <div className="space-y-1">
          {bootLines.map((line, i) => (
            <div
              key={i}
              className="text-[11px] animate-in fade-in slide-in-from-left-2 duration-200"
              style={{
                fontFamily: mono,
                color: line.includes("ONLINE") ? "#00ff41" : line.includes("OK") ? "#00e5ff" : "rgba(0, 255, 65, 0.5)",
                textShadow: line.includes("ONLINE") ? "0 0 8px rgba(0, 255, 65, 0.5)" : "none",
              }}
            >
              {line}
            </div>
          ))}
          {!bootComplete && (
            <span
              className="inline-block w-2 h-3 animate-pulse"
              style={{ backgroundColor: "#00ff41" }}
            />
          )}
        </div>
      </div>

      {/* System online status */}
      {bootComplete && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header */}
          <div className="relative text-center space-y-4 py-4">
            <div
              className="inline-flex items-center justify-center w-14 h-14 mx-auto"
              style={{
                background: "rgba(0, 255, 65, 0.06)",
                border: "1.5px solid rgba(0, 255, 65, 0.3)",
                borderRadius: 4,
                boxShadow: "0 0 30px rgba(0, 255, 65, 0.1)",
              }}
            >
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#00ff41" strokeWidth="2">
                <path d="M5 12l5 5L20 7" />
              </svg>
            </div>
            <div>
              <h1
                className="text-xl font-bold tracking-wider"
                style={{
                  fontFamily: mono,
                  color: "#00ff41",
                  textShadow: "0 0 20px rgba(0, 255, 65, 0.3)",
                }}
              >
                SYSTEM ONLINE
              </h1>
              <p
                className="mt-1 max-w-md mx-auto text-[11px]"
                style={{ fontFamily: mono, color: "rgba(0, 255, 65, 0.4)" }}
              >
                Network &quot;{systemName}&quot; deployed with {goals.length} active nodes tracking progress toward &quot;{selectedL1.title}&quot;.
              </p>
            </div>

            {/* Stats row */}
            <div className="flex items-center justify-center gap-6 pt-2">
              {[
                { value: totalNodes, label: "NODES", color: "#00ff41" },
                { value: totalTraces, label: "TRACES", color: "#00e5ff" },
                { value: milestoneCount, label: "LADDERS", color: "#00e5ff" },
                { value: habitCount, label: "RAMPS", color: "#ffab00" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div
                    className="text-xl font-bold"
                    style={{ fontFamily: mono, color: stat.color }}
                  >
                    {stat.value}
                  </div>
                  <div
                    className="text-[9px] tracking-wider"
                    style={{ fontFamily: mono, color: "rgba(0, 255, 65, 0.3)" }}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* System tags */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold tracking-wider"
                style={{
                  fontFamily: mono,
                  border: "1px solid rgba(0, 255, 65, 0.15)",
                  background: "rgba(0, 255, 65, 0.04)",
                  color: "#00ff41",
                  borderRadius: 2,
                }}
              >
                <span className="w-1 h-1 rounded-full bg-green-400" style={{ boxShadow: "0 0 3px #00ff41" }} />
                {systemName}
              </div>
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold tracking-wider"
                style={{
                  fontFamily: mono,
                  border: `1px solid ${pathColor}25`,
                  background: `${pathColor}06`,
                  color: pathColor,
                  borderRadius: 2,
                }}
              >
                TOP: {topNode.length > 25 ? topNode.slice(0, 23) + ".." : topNode}
              </div>
            </div>
          </div>

          {/* Mini network visualization */}
          <div
            className="relative overflow-hidden max-w-xl mx-auto mb-6"
            style={{
              background: "radial-gradient(ellipse at center, rgba(0, 255, 65, 0.02) 0%, #0a0a0a 70%)",
              border: "1px solid rgba(0, 255, 65, 0.1)",
              borderRadius: 3,
              height: 160,
            }}
          >
            <svg viewBox="0 0 100 40" className="w-full h-full">
              {/* Center node */}
              <rect x="44" y="8" width="12" height="8" rx="1" fill={`${pathColor}15`} stroke={pathColor} strokeWidth="0.3" strokeOpacity="0.6" />
              <circle cx="46" cy="10" r="0.8" fill={pathColor} fillOpacity="0.8">
                <animate attributeName="fillOpacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
              </circle>

              {/* L2 nodes */}
              {selectedL2s.map((l2, i) => {
                const spacing = 80 / Math.max(selectedL2s.length, 1)
                const x = 10 + i * spacing
                const y = 22
                return (
                  <g key={l2.id}>
                    <line x1={50} y1={16} x2={x + 4} y2={y} stroke="#00e5ff" strokeWidth="0.2" strokeOpacity="0.3" />
                    <rect x={x} y={y} width="8" height="5" rx="0.5" fill="rgba(0, 229, 255, 0.06)" stroke="#00e5ff" strokeWidth="0.2" strokeOpacity="0.4" />
                    <circle cx={x + 1} cy={y + 1} r="0.4" fill="#00e5ff" fillOpacity="0.7">
                      <animate attributeName="fillOpacity" values="0.3;0.8;0.3" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
                    </circle>
                  </g>
                )
              })}

              {/* L3 nodes scattered */}
              {selectedL3s.slice(0, 25).map((l3, i) => {
                const x = 3 + (i / Math.min(selectedL3s.length, 25)) * 94
                const y = 32 + Math.sin(i * 2.1) * 3
                return (
                  <circle
                    key={l3.id}
                    cx={Math.max(2, Math.min(98, x))}
                    cy={Math.max(28, Math.min(38, y))}
                    r="0.4"
                    fill="#00ff41"
                    fillOpacity="0.3"
                  >
                    <animate
                      attributeName="fillOpacity"
                      values="0.1;0.5;0.1"
                      dur={`${2 + (i % 3)}s`}
                      begin={`${(i * 0.2) % 2}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                )
              })}
            </svg>
          </div>

          {/* Goal breakdown */}
          <div className="relative space-y-4 max-w-xl mx-auto">
            {/* Root directive */}
            <div
              className="p-3 flex items-center gap-3"
              style={{
                border: `1.5px solid ${pathColor}30`,
                backgroundColor: `${pathColor}04`,
                borderRadius: 3,
              }}
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: pathColor, boxShadow: `0 0 6px ${pathColor}` }}
              />
              <div>
                <div
                  className="text-[9px] font-bold tracking-wider"
                  style={{ fontFamily: mono, color: "rgba(0, 255, 65, 0.4)" }}
                >
                  ROOT_DIRECTIVE
                </div>
                <div className="text-sm font-bold" style={{ fontFamily: mono, color: "rgba(255,255,255,0.9)" }}>
                  {selectedL1.title}
                </div>
              </div>
            </div>

            {/* Modules */}
            {l2Goals.length > 0 && (
              <div className="space-y-1.5">
                <div
                  className="flex items-center gap-2 text-[9px] font-bold tracking-wider"
                  style={{ fontFamily: mono, color: "rgba(0, 229, 255, 0.5)" }}
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#00e5ff" }} />
                  SUB-MODULES [{l2Goals.length}]
                </div>
                {l2Goals.map((g) => (
                  <div
                    key={g.templateId}
                    className="flex items-center gap-3 p-2.5"
                    style={{
                      border: "1px solid rgba(0, 255, 65, 0.06)",
                      borderRadius: 2,
                    }}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: "#00e5ff", boxShadow: "0 0 3px #00e5ff" }}
                    />
                    <span
                      className="text-[11px] font-medium flex-1"
                      style={{ fontFamily: mono, color: "rgba(255,255,255,0.7)" }}
                    >
                      {g.title}
                    </span>
                    {curveConfigs.has(g.templateId) && (
                      <span
                        className="text-[8px] font-bold px-1.5 py-0.5"
                        style={{
                          fontFamily: mono,
                          background: "rgba(0, 255, 65, 0.06)",
                          color: "#00ff41",
                          borderRadius: 2,
                        }}
                      >
                        ANALYZED
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* I/O pins by category */}
            {(Object.entries(l3ByCategory) as [GoalDisplayCategory, GoalCustomization[]][]).map(([cat, catGoals]) => {
              if (!catGoals || catGoals.length === 0) return null
              return (
                <div key={cat} className="space-y-1.5">
                  <div
                    className="flex items-center gap-2 text-[9px] font-bold tracking-wider"
                    style={{ fontFamily: mono, color: "rgba(0, 255, 65, 0.3)" }}
                  >
                    {CATEGORY_LABELS[cat] ?? cat.toUpperCase()} [{catGoals.length}]
                  </div>
                  {catGoals.map((g) => {
                    const tmpl = selectedL3s.find((t) => t.id === g.templateId)
                    const isRamp = tmpl?.templateType === "habit_ramp"
                    return (
                      <div
                        key={g.templateId}
                        className="flex items-center gap-3 p-2"
                        style={{
                          border: "1px solid rgba(0, 255, 65, 0.03)",
                          backgroundColor: "rgba(0, 255, 65, 0.01)",
                          borderRadius: 2,
                        }}
                      >
                        <div
                          className="w-1 h-1 rounded-full flex-shrink-0"
                          style={{ backgroundColor: "#00ff41", opacity: 0.5 }}
                        />
                        <span
                          className="text-[10px] flex-1"
                          style={{ fontFamily: mono, color: "rgba(255,255,255,0.55)" }}
                        >
                          {g.title}
                        </span>
                        <span
                          className="text-[10px] font-medium"
                          style={{ fontFamily: mono, color: "rgba(0, 255, 65, 0.4)" }}
                        >
                          {g.targetValue}{isRamp ? "/wk" : ""}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="relative text-center space-y-4 py-6 mt-6" style={{ borderTop: "1px solid rgba(0, 255, 65, 0.08)" }}>
            <div
              className="inline-flex items-center gap-2 px-4 py-2 text-[11px] font-bold tracking-wider"
              style={{
                fontFamily: mono,
                backgroundColor: "rgba(0, 255, 65, 0.06)",
                color: "#00ff41",
                border: "1px solid rgba(0, 255, 65, 0.15)",
                borderRadius: 2,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" style={{ boxShadow: "0 0 4px #00ff41" }} />
              SYSTEM ONLINE
            </div>
            <p
              className="text-[11px] max-w-md mx-auto"
              style={{ fontFamily: mono, color: "rgba(0, 255, 65, 0.3)" }}
            >
              // In production, this deploys {goals.length} goal nodes to your dashboard. Prototype mode: reinitialize system.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                onClick={onStartOver}
                className="text-[10px] font-bold tracking-wider"
                style={{
                  fontFamily: mono,
                  borderColor: "rgba(0, 255, 65, 0.15)",
                  color: "rgba(0, 255, 65, 0.5)",
                  backgroundColor: "transparent",
                  borderRadius: 3,
                  textTransform: "uppercase",
                }}
              >
                REINITIALIZE SYSTEM
              </Button>
              <Button
                disabled
                className="text-[10px] font-bold tracking-wider"
                style={{
                  fontFamily: mono,
                  backgroundColor: pathColor,
                  opacity: 0.5,
                  borderRadius: 3,
                  textTransform: "uppercase",
                }}
              >
                DEPLOY {goals.length} NODES (DEMO)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
