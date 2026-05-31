"use client"

import { useState, useMemo } from "react"
import { LIFE_AREAS, getLifeAreaConfig } from "../data/lifeAreas"

// ─── Types ──────────────────────────────────────────────────────────────────

type GoalType = "recurring" | "milestone" | "habit_ramp"
type GoalNature = "input" | "outcome"
type TrackingType = "quantified" | "boolean"
type Period = "daily" | "weekly" | "monthly" | "quarterly" | "yearly"

// ─── Helpers ────────────────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <div className="h-px flex-1 bg-[#2a2a40]" />
      <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#6b7280] shrink-0">
        {label}
      </span>
      <div className="h-px flex-1 bg-[#2a2a40]" />
    </div>
  )
}

function CornerBracket({ color = "#f97316" }: { color?: string }) {
  return (
    <div className="absolute top-0 left-0 w-3 h-3">
      <div
        className="absolute top-0 left-0 w-full h-[2px]"
        style={{ backgroundColor: color }}
      />
      <div
        className="absolute top-0 left-0 w-[2px] h-full"
        style={{ backgroundColor: color }}
      />
    </div>
  )
}

const PERIOD_MULTIPLIER: Record<Period, number> = {
  daily: 30,
  weekly: 4.3,
  monthly: 1,
  quarterly: 0.33,
  yearly: 0.083,
}

function getDifficulty(target: number, period: Period) {
  const monthly = target * PERIOD_MULTIPLIER[period]
  if (monthly <= 4) return { level: 1, label: "Light", color: "#22c55e" }
  if (monthly <= 12) return { level: 2, label: "Moderate", color: "#84cc16" }
  if (monthly <= 25) return { level: 3, label: "Challenging", color: "#eab308" }
  if (monthly <= 60) return { level: 4, label: "Hard", color: "#f97316" }
  return { level: 5, label: "Extreme", color: "#ef4444" }
}

const GOAL_TYPE_OPTIONS: {
  value: GoalType
  label: string
  desc: string
  icon: string
}[] = [
  {
    value: "recurring",
    label: "Recurring Op",
    desc: "Repeating cadence",
    icon: "↻",
  },
  {
    value: "milestone",
    label: "Campaign",
    desc: "One-time target",
    icon: "◆",
  },
  {
    value: "habit_ramp",
    label: "Escalation",
    desc: "Ramps over time",
    icon: "▲",
  },
]

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
]

// ─── Component ──────────────────────────────────────────────────────────────

export function GoalFormVariant4({
  lifeArea,
  setLifeArea,
}: {
  lifeArea: string
  setLifeArea: (id: string) => void
}) {
  const areaConfig = getLifeAreaConfig(lifeArea)

  // Form state
  const [title, setTitle] = useState("")
  const [goalType, setGoalType] = useState<GoalType>("recurring")
  const [goalNature, setGoalNature] = useState<GoalNature>("input")
  const [trackingType, setTrackingType] = useState<TrackingType>("quantified")
  const [target, setTarget] = useState(3)
  const [period, setPeriod] = useState<Period>("weekly")
  const [description, setDescription] = useState("")
  const [motivation, setMotivation] = useState("")
  const [selectedSuggestion, setSelectedSuggestion] = useState<number | null>(
    null
  )

  const difficulty = useMemo(
    () => getDifficulty(target, period),
    [target, period]
  )

  const suggestions = useMemo(() => {
    const area = LIFE_AREAS.find((a) => a.id === lifeArea)
    return area?.suggestions.slice(0, 6) ?? []
  }, [lifeArea])

  const dateStamp = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
    })
  }, [])

  function handleSuggestionClick(index: number) {
    const suggestion = suggestions[index]
    if (!suggestion) return

    if (selectedSuggestion === index) {
      // Deselect
      setSelectedSuggestion(null)
      setTitle("")
      setTarget(3)
      setPeriod("weekly")
      return
    }

    setSelectedSuggestion(index)
    setTitle(suggestion.title)
    setTarget(suggestion.defaultTarget)
    setPeriod(suggestion.defaultPeriod as Period)
  }

  return (
    <div className="relative min-h-screen" style={{ backgroundColor: "#0d0d1a" }}>
      {/* Grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#f97316 1px, transparent 1px), linear-gradient(90deg, #f97316 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Scrollable content */}
      <div className="relative z-10 pb-28">
        {/* ── Header Area ──────────────────────────────────────────────── */}
        <div className="px-5 pt-5 pb-4 border-b border-[#2a2a40]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-[#f97316] animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#6b7280]">
                New Mission Briefing
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#4b5563]">
              {dateStamp}
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#6b7280]">
              Mission Objective
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setSelectedSuggestion(null)
              }}
              placeholder="Define your objective..."
              className="w-full bg-[#1a1a2e] border border-[#2a2a40] rounded px-3 py-2.5 text-[#e0e0e0] text-sm placeholder:text-[#4b5563] focus:border-[#f97316]/40 focus:ring-1 focus:ring-[#f97316]/20 focus:outline-none transition-colors font-medium"
            />
          </div>
        </div>

        {/* ── Theatre of Operations (Life Area) ────────────────────────── */}
        <div className="px-5 pt-4 pb-2">
          <SectionDivider label="Theatre of Operations" />

          <div className="flex flex-wrap gap-1.5">
            {LIFE_AREAS.filter((a) => a.id !== "custom").map((area) => {
              const Icon = area.icon
              const isSelected = lifeArea === area.id
              return (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => {
                    setLifeArea(area.id)
                    setSelectedSuggestion(null)
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
                    isSelected
                      ? "text-white border-transparent"
                      : "text-[#9ca3af] border-[#2a2a40] hover:border-[#4b5563] bg-[#141422]"
                  }`}
                  style={
                    isSelected
                      ? {
                          backgroundColor: area.hex,
                          boxShadow: `0 0 12px ${area.hex}30`,
                        }
                      : undefined
                  }
                >
                  <Icon className="size-3" />
                  {area.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Mission Parameters (Goal Type + Nature) ──────────────────── */}
        <div className="px-5 pt-3 pb-2">
          <SectionDivider label="Mission Parameters" />

          {/* Goal Type: 3-column grid */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {GOAL_TYPE_OPTIONS.map(({ value, label, desc, icon }) => {
              const isSelected = goalType === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setGoalType(value)}
                  className={`relative py-2.5 px-2 rounded border text-left transition-all duration-150 ${
                    isSelected
                      ? "border-[#f97316]/40 bg-[#f97316]/[0.08]"
                      : "border-[#2a2a40] bg-[#141422] hover:border-[#4b5563]"
                  }`}
                >
                  {isSelected && <CornerBracket />}
                  <span className="text-[11px] font-mono text-[#6b7280] block mb-0.5">
                    {icon}
                  </span>
                  <span
                    className={`text-xs font-medium block ${
                      isSelected ? "text-[#f97316]" : "text-[#e0e0e0]"
                    }`}
                  >
                    {label}
                  </span>
                  <span className="text-[10px] text-[#6b7280] block">
                    {desc}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Goal Nature: 2-column grid */}
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                {
                  value: "input" as GoalNature,
                  label: "Direct Action",
                  badge: "INPUT",
                  badgeColor: "#22c55e",
                  desc: "What you do",
                },
                {
                  value: "outcome" as GoalNature,
                  label: "Target Outcome",
                  badge: "OUTCOME",
                  badgeColor: "#ef4444",
                  desc: "What you achieve",
                },
              ] as const
            ).map(({ value, label, badge, badgeColor, desc }) => {
              const isSelected = goalNature === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setGoalNature(value)}
                  className={`relative py-2.5 px-3 rounded border text-left transition-all duration-150 ${
                    isSelected
                      ? `bg-opacity-[0.08]`
                      : "border-[#2a2a40] bg-[#141422] hover:border-[#4b5563]"
                  }`}
                  style={
                    isSelected
                      ? {
                          borderColor: `${badgeColor}66`,
                          backgroundColor: `${badgeColor}14`,
                        }
                      : undefined
                  }
                >
                  {isSelected && <CornerBracket color={badgeColor} />}
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: `${badgeColor}20`,
                        color: badgeColor,
                      }}
                    >
                      {badge}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-medium block ${
                      isSelected ? "" : "text-[#e0e0e0]"
                    }`}
                    style={isSelected ? { color: badgeColor } : undefined}
                  >
                    {label}
                  </span>
                  <span className="text-[10px] text-[#6b7280] block">
                    {desc}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Difficulty Assessment ─────────────────────────────────────── */}
        <div className="px-5 pt-3 pb-2">
          <SectionDivider label="Difficulty Assessment" />

          {/* Tracking toggle: segmented control */}
          <div className="flex rounded border border-[#2a2a40] overflow-hidden mb-4">
            {(
              [
                { value: "quantified" as TrackingType, label: "Quantified" },
                { value: "boolean" as TrackingType, label: "Pass / Fail" },
              ] as const
            ).map(({ value, label }) => {
              const isActive = trackingType === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTrackingType(value)}
                  className={`flex-1 py-2 text-[10px] font-mono uppercase tracking-[0.15em] transition-all duration-150 ${
                    isActive
                      ? "bg-[#f97316] text-[#0d0d1a] font-bold"
                      : "bg-[#141422] text-[#6b7280] hover:text-[#9ca3af]"
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {/* Target + Difficulty readout panel */}
          <div className="flex items-stretch gap-0 p-0 rounded border border-[#2a2a40] bg-[#141422] overflow-hidden mb-4">
            {/* Left: Target */}
            <div className="flex-1 p-3">
              <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-[#6b7280] block mb-1">
                Target
              </span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-mono font-bold text-[#f97316] tabular-nums">
                  {trackingType === "boolean" ? "1" : target}
                </span>
                {trackingType === "quantified" && (
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => setTarget((t) => t + 1)}
                      className="w-6 h-5 flex items-center justify-center rounded border border-[#2a2a40] bg-[#1a1a2e] text-[#9ca3af] hover:text-[#f97316] hover:border-[#f97316]/40 transition-colors text-xs font-mono"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => setTarget((t) => Math.max(1, t - 1))}
                      className="w-6 h-5 flex items-center justify-center rounded border border-[#2a2a40] bg-[#1a1a2e] text-[#9ca3af] hover:text-[#f97316] hover:border-[#f97316]/40 transition-colors text-xs font-mono"
                    >
                      -
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="w-px bg-[#2a2a40]" />

            {/* Right: Difficulty */}
            <div className="flex-1 p-3">
              <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-[#6b7280] block mb-1">
                Difficulty
              </span>
              <div className="flex gap-1 mb-1.5">
                {[1, 2, 3, 4, 5].map((l) => (
                  <div
                    key={l}
                    className="h-1.5 flex-1 rounded-full transition-all duration-300"
                    style={{
                      backgroundColor:
                        l <= difficulty.level ? difficulty.color : "#2a2a40",
                    }}
                  />
                ))}
              </div>
              <span
                className="text-[10px] font-mono uppercase tracking-wide"
                style={{ color: difficulty.color }}
              >
                {difficulty.label}
              </span>
            </div>
          </div>

          {/* Mission Cadence: period buttons */}
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#6b7280] block mb-2">
              Mission Cadence
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PERIOD_OPTIONS.map(({ value, label }) => {
                const isSelected = period === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPeriod(value)}
                    className={`px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider border transition-all duration-150 ${
                      isSelected
                        ? "bg-[#f97316] text-[#0d0d1a] border-[#f97316] font-bold"
                        : "border-[#2a2a40] bg-[#141422] text-[#6b7280] hover:border-[#4b5563] hover:text-[#9ca3af]"
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Intel (Description + Motivation) ─────────────────────────── */}
        <div className="px-5 pt-3 pb-2">
          <SectionDivider label="Intel" />

          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#6b7280] block mb-1.5">
                Situation Report
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Current conditions, context, relevant background..."
                className="w-full bg-[#1a1a2e] border border-[#2a2a40] rounded px-3 py-2.5 text-[#e0e0e0] text-sm placeholder:text-[#4b5563] focus:border-[#f97316]/40 focus:ring-1 focus:ring-[#f97316]/20 focus:outline-none transition-colors resize-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#6b7280] block mb-1.5">
                Motivation Intel{" "}
                <span className="text-[#4b5563] normal-case tracking-normal">
                  (surfaces when resolve weakens)
                </span>
              </label>
              <textarea
                value={motivation}
                onChange={(e) => setMotivation(e.target.value)}
                rows={3}
                placeholder="Why this matters. What's at stake. What you're fighting for..."
                className="w-full bg-[#1a1a2e] border border-[#2a2a40] rounded px-3 py-2.5 text-[#e0e0e0] text-sm placeholder:text-[#4b5563] focus:border-[#f97316]/40 focus:ring-1 focus:ring-[#f97316]/20 focus:outline-none transition-colors resize-none"
              />
            </div>
          </div>
        </div>

        {/* ── Recommended Objectives ───────────────────────────────────── */}
        {suggestions.length > 0 && (
          <div className="px-5 pt-3 pb-4">
            <SectionDivider label="Recommended Objectives" />

            <div className="grid grid-cols-2 gap-2">
              {suggestions.map((suggestion, i) => {
                const isSelected = selectedSuggestion === i
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSuggestionClick(i)}
                    className={`text-left px-3 py-2.5 rounded border text-xs transition-all duration-150 ${
                      isSelected
                        ? "text-white font-medium"
                        : "border-[#2a2a40] bg-[#141422] text-[#9ca3af] hover:border-[#4b5563] hover:text-[#c0c0c0]"
                    }`}
                    style={
                      isSelected
                        ? {
                            backgroundColor: areaConfig.hex,
                            borderColor: "transparent",
                            boxShadow: `0 0 16px ${areaConfig.hex}40`,
                          }
                        : undefined
                    }
                  >
                    {suggestion.title}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Sticky Footer ────────────────────────────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#2a2a40]"
        style={{ backgroundColor: "#0a0a18" }}
      >
        {/* Mission summary (when title has content) */}
        {title.trim() && (
          <div className="px-5 pt-3 pb-2 border-b border-[#2a2a40]">
            <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#6b7280] block mb-1">
              Mission Summary
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#f97316]">
                {trackingType === "quantified" ? target : 1}x {period}
              </span>
              <span className="text-[10px] text-[#4b5563]">/</span>
              <span className="text-xs text-[#e0e0e0] font-medium truncate">
                {title}
              </span>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="px-5 py-3 flex justify-between items-center">
          <button
            type="button"
            className="px-3 py-2 text-[11px] font-mono uppercase tracking-wide text-[#6b7280] border border-[#2a2a40] rounded hover:text-[#9ca3af] hover:border-[#4b5563] transition-colors"
          >
            Abort
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-4 py-2 text-[11px] font-mono uppercase tracking-wide text-[#f97316] border border-[#f97316]/30 rounded hover:bg-[#f97316]/10 transition-colors"
            >
              Accept &amp; Continue
            </button>
            <button
              type="button"
              className="px-5 py-2 rounded text-sm font-semibold transition-all duration-200"
              style={{
                backgroundColor: "#f97316",
                color: "#0d0d1a",
                boxShadow: "0 0 20px #f9731630, inset 0 1px 0 #ffffff20",
              }}
            >
              Accept Mission
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
