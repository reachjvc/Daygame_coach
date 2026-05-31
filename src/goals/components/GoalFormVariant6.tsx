"use client"

import { useState, useEffect, useMemo } from "react"
import {
  ArrowUp,
  Search,
  X,
  Minus,
  Plus,
  CalendarDays,
  ChevronDown,
  Lightbulb,
  RefreshCw,
  Flag,
  TrendingUp,
} from "lucide-react"
import { LIFE_AREAS, getLifeAreaConfig } from "../data/lifeAreas"
import type { GoalWithProgress, GoalPeriod, GoalType, GoalNature, GoalTrackingType } from "../types"

// ─── Identity examples per life area ────────────────────────────────────────
const IDENTITY_EXAMPLES: Record<string, string[]> = {
  daygame: [
    "...the kind of man who walks up to anyone, anywhere, without hesitation.",
    "...someone who treats rejection as proof he's in the arena.",
    "...a man whose default is action, not deliberation.",
  ],
  health_fitness: [
    "...the kind of man who never misses a training day.",
    "...someone who treats his body like his most important asset.",
    "...a man who chooses discipline over comfort, every single morning.",
  ],
  career_business: [
    "...the kind of man who ships work he's proud of, daily.",
    "...someone whose reputation is built on relentless execution.",
    "...a man who builds wealth through skill, not luck.",
  ],
  personal_growth: [
    "...the kind of man who reads, reflects, and evolves every day.",
    "...someone who confronts his blind spots instead of hiding from them.",
    "...a man whose inner world is as strong as his outer one.",
  ],
  vices_elimination: [
    "...the kind of man who has mastered his impulses.",
    "...someone who chooses long-term freedom over short-term relief.",
    "...a man whose willpower is not a resource but an identity.",
  ],
}

const PERIODS: { value: GoalPeriod; label: string; periodLabel: string }[] = [
  { value: "daily", label: "Daily", periodLabel: "day" },
  { value: "weekly", label: "Weekly", periodLabel: "week" },
  { value: "monthly", label: "Monthly", periodLabel: "month" },
  { value: "quarterly", label: "Quarterly", periodLabel: "quarter" },
  { value: "yearly", label: "Yearly", periodLabel: "year" },
]

const GOAL_TYPES: { value: GoalType; label: string; desc: string; icon: React.ElementType }[] = [
  { value: "recurring", label: "Recurring", desc: "Resets each period", icon: RefreshCw },
  { value: "milestone", label: "Milestone", desc: "One-time target", icon: Flag },
  { value: "habit_ramp", label: "Habit Ramp", desc: "Ramps up over time", icon: TrendingUp },
]

const MOTIVATION_STARTERS = [
  "Because I refuse to...",
  "So that one day I...",
  "The pain of staying the same is...",
]

export interface GoalFormVariant6Props {
  // ── Controlled state from parent modal ────────────────────────────────
  lifeArea: string
  setLifeArea: (id: string) => void
  parentGoals?: GoalWithProgress[]
  parentGoalId: string | null
  setParentGoalId: (id: string | null) => void
  goalType: GoalType
  setGoalType: (t: GoalType) => void
  title: string
  setTitle: (t: string) => void
  description: string
  setDescription: (d: string) => void
  goalNature: GoalNature
  setGoalNature: (n: GoalNature) => void
  motivationNote: string
  setMotivationNote: (m: string) => void
  selectedSuggestion: string | null
  setSelectedSuggestion: (s: string | null) => void
  trackingType: GoalTrackingType
  setTrackingType: (t: GoalTrackingType) => void
  targetValue: number
  setTargetValue: (v: number | ((prev: number) => number)) => void
  period: GoalPeriod
  setPeriod: (p: GoalPeriod) => void
  targetDate: string
  setTargetDate: (d: string) => void
  startingValue: number
  setStartingValue: (v: number) => void
  startingStreak: number
  setStartingStreak: (v: number) => void
  isEditing?: boolean
}

export function GoalFormVariant6({
  lifeArea,
  setLifeArea,
  parentGoals = [],
  parentGoalId,
  setParentGoalId,
  goalType,
  setGoalType,
  title: goalTitle,
  setTitle: setGoalTitle,
  description,
  setDescription,
  goalNature,
  setGoalNature,
  motivationNote: motivation,
  setMotivationNote: setMotivation,
  selectedSuggestion,
  setSelectedSuggestion,
  trackingType,
  setTrackingType,
  targetValue: target,
  setTargetValue: setTarget,
  period,
  setPeriod,
  targetDate,
  setTargetDate,
  startingValue,
  setStartingValue,
  startingStreak,
  setStartingStreak,
  isEditing = false,
}: GoalFormVariant6Props) {
  // ── Local UI state only ────────────────────────────────────────────────
  const [parentExpanded, setParentExpanded] = useState(false)
  const [parentSearch, setParentSearch] = useState("")
  const [showDescription, setShowDescription] = useState(!!description)
  const [showBackfill, setShowBackfill] = useState(startingValue > 0 || startingStreak > 0)
  const [exampleIndex, setExampleIndex] = useState(0)

  const areaConfig = getLifeAreaConfig(lifeArea)
  const hex = areaConfig.hex

  // ── Rotating identity example ──────────────────────────────────────────
  useEffect(() => {
    setExampleIndex(0)
    const examples = IDENTITY_EXAMPLES[lifeArea]
    if (!examples || examples.length === 0) return
    const interval = setInterval(() => {
      setExampleIndex((prev) => (prev + 1) % examples.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [lifeArea])

  // ── Derived ────────────────────────────────────────────────────────────
  const filteredParents = useMemo(() => {
    let eligible = parentGoals
    if (lifeArea) {
      const areaFiltered = eligible.filter((g) => g.life_area === lifeArea)
      if (areaFiltered.length > 0) eligible = areaFiltered
    }
    if (parentSearch.trim()) {
      const q = parentSearch.toLowerCase()
      eligible = eligible.filter((g) => g.title.toLowerCase().includes(q))
    }
    return eligible
  }, [parentGoals, lifeArea, parentSearch])

  const selectedParent = parentGoalId
    ? parentGoals.find((g) => g.id === parentGoalId)
    : null

  const featuredSuggestions = areaConfig.suggestions
    .filter((s) => s.featured)
    .slice(0, 6)

  const examples = IDENTITY_EXAMPLES[lifeArea] || IDENTITY_EXAMPLES.daygame
  const currentExample = examples[exampleIndex % examples.length]

  const periodInfo = PERIODS.find((p) => p.value === period) || PERIODS[1]
  const isMilestone = goalType === "milestone"

  return (
    <div className="px-5 pt-3 pb-4 space-y-3">
      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 1: Area + Goal Type (compact row)
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex items-start gap-4">
        {/* Area icons */}
        <div className="flex-1">
          <label className="text-[11px] text-[#71717a] font-medium block mb-1.5">
            Area
          </label>
          <div className="flex gap-2">
            {LIFE_AREAS.filter((a) => a.id !== "custom").map((area) => {
              const Icon = area.icon
              const isSelected = lifeArea === area.id
              return (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => setLifeArea(area.id)}
                  className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                    isSelected
                      ? "scale-105"
                      : "opacity-40 hover:opacity-70"
                  }`}
                  style={{
                    backgroundColor: isSelected ? area.hex : `${area.hex}15`,
                    border: `2px solid ${isSelected ? area.hex : `${area.hex}30`}`,
                    boxShadow: isSelected
                      ? `0 0 12px ${area.hex}40`
                      : "none",
                  }}
                  title={area.name}
                >
                  <Icon
                    className="size-4 relative z-10"
                    style={{ color: isSelected ? "#fff" : area.hex }}
                  />
                </button>
              )
            })}
          </div>
          {lifeArea && (
            <p
              className="mt-1 text-[11px] font-semibold"
              style={{ color: hex }}
            >
              {areaConfig.name}
            </p>
          )}
        </div>

        {/* Goal type pills */}
        <div>
          <label className="text-[11px] text-[#71717a] font-medium block mb-1.5">
            Type
          </label>
          <div className="flex gap-1">
            {GOAL_TYPES.map(({ value, label, icon: Icon }) => {
              const isActive = goalType === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setGoalType(value)
                    if (value === "milestone") setTrackingType("counter")
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-[11px] font-medium transition-all duration-200 ${
                    isActive
                      ? ""
                      : "border-[#2a2a3e] text-[#52525b] hover:text-[#71717a] hover:border-[#3f3f50]"
                  }`}
                  style={
                    isActive
                      ? { backgroundColor: `${hex}20`, borderColor: `${hex}50`, color: hex }
                      : undefined
                  }
                >
                  <Icon className="size-3" />
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 2: Goal Title + Suggestions
      ═══════════════════════════════════════════════════════════════════ */}
      <div
        className="space-y-2 overflow-hidden transition-all duration-300"
        style={{
          maxHeight: lifeArea ? "2000px" : "0px",
          opacity: lifeArea ? 1 : 0,
        }}
      >
        <div>
          <div className="relative">
            <div
              className="absolute left-0 top-0 bottom-0 w-1 rounded-full"
              style={{ backgroundColor: hex }}
            />
            <input
              type="text"
              value={goalTitle}
              onChange={(e) => {
                setGoalTitle(e.target.value)
                setSelectedSuggestion(null)
              }}
              placeholder={
                areaConfig.suggestions[0]
                  ? `e.g. ${areaConfig.suggestions[0].title}`
                  : "What will you do consistently?"
              }
              className="w-full pl-4 pr-4 py-2.5 bg-[#1e1e2e] text-[#f0f0f0] text-sm rounded-lg border border-[#2a2a3e] placeholder:text-[#52525b] focus:outline-none transition-all duration-200"
              style={{
                boxShadow:
                  goalTitle.length > 0
                    ? `inset 0 0 0 1px ${hex}30`
                    : "none",
              }}
            />
          </div>

          {/* Suggestions inline */}
          {featuredSuggestions.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {featuredSuggestions.map((s) => {
                const isActive = selectedSuggestion === s.title
                return (
                  <button
                    key={s.title}
                    type="button"
                    onClick={() => {
                      if (isActive) {
                        setSelectedSuggestion(null)
                        setGoalTitle("")
                        setTarget(3)
                        setPeriod("weekly")
                      } else {
                        setSelectedSuggestion(s.title)
                        setGoalTitle(s.title)
                        setTarget(s.defaultTarget)
                        setPeriod(s.defaultPeriod as GoalPeriod)
                      }
                    }}
                    className="text-[10px] px-2 py-1 rounded-full border transition-all duration-200"
                    style={{
                      backgroundColor: isActive ? hex : `${hex}10`,
                      borderColor: isActive ? hex : `${hex}25`,
                      color: isActive ? "#fff" : hex,
                    }}
                  >
                    {s.title}
                  </button>
                )
              })}
            </div>
          )}

          {/* Description toggle */}
          {!showDescription ? (
            <button
              type="button"
              onClick={() => setShowDescription(true)}
              className="text-[10px] text-[#3f3f50] hover:text-[#52525b] mt-1 transition-colors"
            >
              + description
            </button>
          ) : (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Context or details..."
              rows={2}
              className="w-full mt-1.5 px-3 py-2 bg-[#1e1e2e] text-[#f0f0f0] text-xs leading-relaxed rounded-lg border border-[#2a2a3e] placeholder:text-[#52525b] focus:outline-none resize-none"
            />
          )}
        </div>

        {/* ═════════════════════════════════════════════════════════════════
            SECTION 3: Tracking + Nature (side by side)
        ═════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-[#71717a] font-medium block mb-1.5">
              Tracking
            </label>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setTrackingType("counter")}
                className={`flex-1 py-1.5 rounded-md border text-[10px] font-medium transition-all duration-200 ${
                  trackingType === "counter"
                    ? ""
                    : "border-[#2a2a3e] text-[#52525b] hover:text-[#71717a]"
                }`}
                style={
                  trackingType === "counter"
                    ? { backgroundColor: `${hex}20`, borderColor: `${hex}50`, color: hex }
                    : undefined
                }
              >
                Counter
              </button>
              <button
                type="button"
                onClick={() => {
                  setTrackingType("boolean")
                  setTarget(1)
                }}
                className={`flex-1 py-1.5 rounded-md border text-[10px] font-medium transition-all duration-200 ${
                  trackingType === "boolean"
                    ? ""
                    : "border-[#2a2a3e] text-[#52525b] hover:text-[#71717a]"
                }`}
                style={
                  trackingType === "boolean"
                    ? { backgroundColor: `${hex}20`, borderColor: `${hex}50`, color: hex }
                    : undefined
                }
              >
                Yes / No
              </button>
            </div>
          </div>
          <div>
            <label className="text-[11px] text-[#71717a] font-medium block mb-1.5">
              Nature
            </label>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setGoalNature("input")}
                className={`flex-1 py-1.5 rounded-md border text-[10px] font-medium transition-all duration-200 ${
                  goalNature === "input"
                    ? "border-green-500/40 bg-green-500/15 text-green-400"
                    : "border-[#2a2a3e] text-[#52525b] hover:text-[#71717a]"
                }`}
              >
                Action
              </button>
              <button
                type="button"
                onClick={() => setGoalNature("outcome")}
                className={`flex-1 py-1.5 rounded-md border text-[10px] font-medium transition-all duration-200 ${
                  goalNature === "outcome"
                    ? "border-amber-500/40 bg-amber-500/15 text-amber-400"
                    : "border-[#2a2a3e] text-[#52525b] hover:text-[#71717a]"
                }`}
              >
                Result
              </button>
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════
            SECTION 4: Target + Period (side by side)
        ═════════════════════════════════════════════════════════════════ */}
        <div className="flex items-end gap-3">
          {/* Target stepper */}
          {trackingType === "counter" && (
            <div>
              <label className="text-[11px] text-[#71717a] font-medium block mb-1.5">
                Target
              </label>
              <div className="flex items-center gap-0">
                <button
                  type="button"
                  onClick={() => setTarget((t) => Math.max(1, t - 1))}
                  className="w-8 h-8 rounded-l-md border border-[#2a2a3e] flex items-center justify-center text-[#52525b] hover:text-white hover:bg-[#2a2a3e] transition-colors"
                >
                  <Minus className="size-3" />
                </button>
                <div
                  className="w-12 h-8 border-y border-[#2a2a3e] flex items-center justify-center text-base font-bold bg-[#1e1e2e]"
                  style={{ color: hex }}
                >
                  {target}
                </div>
                <button
                  type="button"
                  onClick={() => setTarget((t) => t + 1)}
                  className="w-8 h-8 rounded-r-md border border-[#2a2a3e] flex items-center justify-center text-[#52525b] hover:text-white hover:bg-[#2a2a3e] transition-colors"
                >
                  <Plus className="size-3" />
                </button>
              </div>
            </div>
          )}

          {/* Period buttons */}
          {!isMilestone && (
            <div className="flex-1">
              <label className="text-[11px] text-[#71717a] font-medium block mb-1.5">
                {trackingType === "counter" ? "per" : "Every"}
              </label>
              <div className="flex gap-0.5">
                {PERIODS.map((p, i) => {
                  const isActive = period === p.value
                  const roundedClass =
                    i === 0
                      ? "rounded-l-md"
                      : i === PERIODS.length - 1
                        ? "rounded-r-md"
                        : ""
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPeriod(p.value)}
                      className={`flex-1 py-1.5 text-[10px] font-medium border transition-all duration-200 ${roundedClass} ${
                        isActive
                          ? "text-white"
                          : "border-[#2a2a3e] text-[#3f3f50] hover:text-[#52525b]"
                      }`}
                      style={
                        isActive
                          ? { backgroundColor: hex, borderColor: hex }
                          : undefined
                      }
                    >
                      {p.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Target date */}
          {isMilestone && (
            <div className="flex-1">
              <label className="text-[11px] text-[#71717a] font-medium block mb-1.5">
                <CalendarDays className="size-3 inline mr-0.5 -mt-0.5" />
                By when
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full h-8 px-2.5 bg-[#1e1e2e] text-[#e0e0e0] text-xs rounded-md border border-[#2a2a3e] focus:outline-none"
                style={{ colorScheme: "dark" }}
              />
            </div>
          )}
        </div>

        {/* Target date for non-milestone (optional, compact) */}
        {!isMilestone && (
          <div className="flex items-center gap-2">
            <CalendarDays className="size-3 text-[#3f3f50]" />
            <label className="text-[10px] text-[#3f3f50]">Target date</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="h-7 px-2 bg-[#1e1e2e] text-[#e0e0e0] text-[10px] rounded-md border border-[#2a2a3e] focus:outline-none flex-1"
              style={{ colorScheme: "dark" }}
            />
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════
            SECTION 5: Motivation (compact)
        ═════════════════════════════════════════════════════════════════ */}
        <div
          className="rounded-lg p-3"
          style={{
            borderTop: `2px solid ${hex}40`,
            background: `linear-gradient(180deg, ${hex}06 0%, transparent 40%)`,
          }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Lightbulb className="size-3" style={{ color: `${hex}99` }} />
            <span className="text-[11px] font-medium text-[#a1a1aa]">
              Your anchor
            </span>
            <span className="text-[10px] text-[#3f3f50]">
              — surfaces when motivation dips
            </span>
          </div>
          <textarea
            value={motivation}
            onChange={(e) => setMotivation(e.target.value)}
            placeholder="What makes this worth fighting for?"
            rows={1}
            className="w-full px-3 py-2 bg-[#1e1e2e] text-[#f0f0f0] text-xs rounded-md border border-[#2a2a3e] placeholder:text-[#3f3f50] placeholder:italic focus:outline-none resize-none"
            style={{
              boxShadow: motivation.length > 0 ? `inset 0 0 0 1px ${hex}25` : "none",
            }}
          />
          {motivation.length === 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {MOTIVATION_STARTERS.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => setMotivation(starter)}
                  className="text-[9px] px-2 py-0.5 rounded-full border transition-colors"
                  style={{
                    borderColor: `${hex}20`,
                    color: `${hex}aa`,
                  }}
                >
                  {starter}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ═════════════════════════════════════════════════════════════════
            SECTION 6: Advanced (parent goal + backfill, collapsed)
        ═════════════════════════════════════════════════════════════════ */}
        <div className="space-y-2">
          {/* Parent goal */}
          {parentGoals.length > 0 && (
            <div>
              {selectedParent && !parentExpanded ? (
                <div className="flex items-center gap-2 p-2 rounded-md bg-[#1e1e2e] border border-[#2a2a3e]">
                  <ArrowUp className="size-3 text-[#52525b] flex-shrink-0" />
                  <span
                    className="size-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getLifeAreaConfig(selectedParent.life_area).hex }}
                  />
                  <span className="text-[11px] text-[#a1a1aa] truncate flex-1">
                    {selectedParent.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => setParentExpanded(true)}
                    className="text-[10px] text-[#52525b] hover:text-[#71717a] transition-colors"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={() => { setParentGoalId(null); setParentExpanded(false) }}
                    className="text-[#52525b] hover:text-[#71717a] transition-colors"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ) : !parentExpanded ? (
                <button
                  type="button"
                  onClick={() => setParentExpanded(true)}
                  className="w-full flex items-center gap-2 p-2 rounded-md border border-dashed border-[#2a2a3e] hover:border-[#3f3f50] transition-all text-left"
                >
                  <ArrowUp className="size-3 text-[#3f3f50]" />
                  <span className="text-[10px] text-[#52525b]">
                    Part of a bigger goal?
                  </span>
                </button>
              ) : (
                <div className="rounded-md border border-[#2a2a3e] bg-[#1e1e2e] p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[#71717a]">
                      Connect to a bigger goal
                    </span>
                    <button
                      type="button"
                      onClick={() => { setParentExpanded(false); setParentSearch("") }}
                      className="text-[#52525b] hover:text-[#71717a] transition-colors"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                  {filteredParents.length > 5 && (
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-[#3f3f50]" />
                      <input
                        type="text"
                        placeholder="Search..."
                        value={parentSearch}
                        onChange={(e) => setParentSearch(e.target.value)}
                        className="w-full h-6 text-[10px] pl-6 pr-2 bg-[#16162a] border border-[#2a2a3e] rounded text-[#e0e0e0] placeholder:text-[#3f3f50] focus:outline-none"
                      />
                    </div>
                  )}
                  <div className="max-h-28 overflow-y-auto space-y-0.5">
                    {filteredParents.length === 0 ? (
                      <p className="text-[10px] text-[#3f3f50] p-1.5 text-center">
                        No eligible parent goals
                      </p>
                    ) : (
                      filteredParents.map((g) => {
                        const ac = getLifeAreaConfig(g.life_area)
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => {
                              setParentGoalId(g.id)
                              setParentExpanded(false)
                              setParentSearch("")
                            }}
                            className={`w-full flex items-center gap-1.5 p-1 rounded text-left transition-colors ${
                              g.id === parentGoalId ? "bg-[#2a2a3e]" : "hover:bg-[#1a1a2e]"
                            }`}
                          >
                            <span
                              className="size-1.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: ac.hex }}
                            />
                            <span className="text-[11px] text-[#e0e0e0] truncate flex-1">
                              {g.title}
                            </span>
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Backfill */}
          {!isEditing && (
            <div>
              {!showBackfill ? (
                <button
                  type="button"
                  onClick={() => setShowBackfill(true)}
                  className="w-full flex items-center gap-2 p-2 rounded-md border border-dashed border-[#2a2a3e] hover:border-[#3f3f50] transition-all text-left"
                >
                  <ChevronDown className="size-3 text-[#3f3f50]" />
                  <span className="text-[10px] text-[#52525b]">
                    Already tracking this?
                  </span>
                </button>
              ) : (
                <div className="rounded-md border border-[#2a2a3e] bg-[#1e1e2e] p-2.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-medium text-[#71717a] uppercase tracking-wide">
                      Starting progress
                    </span>
                    <button
                      type="button"
                      onClick={() => { setShowBackfill(false); setStartingValue(0); setStartingStreak(0) }}
                      className="text-[#3f3f50] hover:text-[#52525b] transition-colors"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-[#52525b] block mb-0.5">Value</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={startingValue || ""}
                        onChange={(e) => setStartingValue(Math.max(0, parseInt(e.target.value) || 0))}
                        placeholder="0"
                        className="w-full h-7 px-2 text-[11px] bg-[#16162a] border border-[#2a2a3e] rounded text-[#e0e0e0] placeholder:text-[#3f3f50] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#52525b] block mb-0.5">Streak</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={startingStreak || ""}
                        onChange={(e) => setStartingStreak(Math.max(0, parseInt(e.target.value) || 0))}
                        placeholder="0"
                        className="w-full h-7 px-2 text-[11px] bg-[#16162a] border border-[#2a2a3e] rounded text-[#e0e0e0] placeholder:text-[#3f3f50] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          Identity micro-prompt (rotating)
      ═══════════════════════════════════════════════════════════════════ */}
      {lifeArea && (
        <p
          className="text-[10px] italic text-center transition-opacity duration-500"
          style={{ color: `${hex}66` }}
        >
          I am becoming {currentExample}
        </p>
      )}
    </div>
  )
}
