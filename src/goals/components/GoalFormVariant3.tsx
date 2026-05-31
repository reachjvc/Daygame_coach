"use client"

import { useState, useEffect } from "react"
import { Lightbulb, ChevronDown, Minus, Plus, Loader2 } from "lucide-react"
import { LIFE_AREAS, getLifeAreaConfig } from "../data/lifeAreas"

// ─── Identity examples per life area ────────────────────────────────────────
const IDENTITY_EXAMPLES: Record<string, string[]> = {
  daygame: [
    "...the kind of man who walks up to anyone, anywhere, without hesitation.",
    "...someone who treats rejection as proof he's in the arena.",
    "...a man whose default is action, not deliberation.",
    "...someone women describe as bold and authentic.",
  ],
  health_fitness: [
    "...the kind of man who never misses a training day.",
    "...someone who treats his body like his most important asset.",
    "...a man who chooses discipline over comfort, every single morning.",
    "...someone who radiates vitality and physical confidence.",
  ],
  career_business: [
    "...the kind of man who ships work he's proud of, daily.",
    "...someone whose reputation is built on relentless execution.",
    "...a man who builds wealth through skill, not luck.",
    "...someone others seek out for his clarity and competence.",
  ],
  personal_growth: [
    "...the kind of man who reads, reflects, and evolves every day.",
    "...someone who confronts his blind spots instead of hiding from them.",
    "...a man whose inner world is as strong as his outer one.",
    "...someone who treats growth as a non-negotiable practice.",
  ],
  vices_elimination: [
    "...the kind of man who has mastered his impulses.",
    "...someone who chooses long-term freedom over short-term relief.",
    "...a man whose willpower is not a resource but an identity.",
    "...someone who broke the chain and never looked back.",
  ],
}

// ─── Placeholder per area ───────────────────────────────────────────────────
const AREA_PLACEHOLDERS: Record<string, string> = {
  daygame: "e.g. Do 10 approaches per week",
  health_fitness: "e.g. Go to gym 4x per week",
  career_business: "e.g. Deep work 4 hours daily",
  personal_growth: "e.g. Meditate 10 mins daily",
  vices_elimination: "e.g. Porn-free every day",
}

export function GoalFormVariant3({
  lifeArea,
  setLifeArea,
}: {
  lifeArea: string
  setLifeArea: (id: string) => void
}) {
  // ── State ───────────────────────────────────────────────────────────────
  const [identity, setIdentity] = useState("")
  const [motivation, setMotivation] = useState("")
  const [goalTitle, setGoalTitle] = useState("")
  const [target, setTarget] = useState(3)
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("weekly")
  const [nature, setNature] = useState<"input" | "outcome">("input")
  const [exampleIndex, setExampleIndex] = useState(0)
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null)

  const areaConfig = getLifeAreaConfig(lifeArea)
  const hex = areaConfig.hex

  // ── Rotating example effect ─────────────────────────────────────────────
  useEffect(() => {
    setExampleIndex(0)
    const examples = IDENTITY_EXAMPLES[lifeArea]
    if (!examples || examples.length === 0) return
    const interval = setInterval(() => {
      setExampleIndex((prev) => (prev + 1) % examples.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [lifeArea])

  // ── Reset form when area changes ────────────────────────────────────────
  useEffect(() => {
    setIdentity("")
    setMotivation("")
    setGoalTitle("")
    setTarget(3)
    setPeriod("weekly")
    setNature("input")
    setSelectedSuggestion(null)
  }, [lifeArea])

  // ── Phase visibility ───────────────────────────────────────────────────
  const showPhase1 = !!lifeArea
  const showPhase2 = identity.length >= 10
  const showPhase3 = motivation.length >= 5
  const showPhase4 = goalTitle.trim().length > 0

  const examples = IDENTITY_EXAMPLES[lifeArea] || IDENTITY_EXAMPLES.daygame
  const currentExample = examples[exampleIndex % examples.length]

  const featuredSuggestions = areaConfig.suggestions
    .filter((s) => s.featured)
    .slice(0, 5)

  const promptStarters = [
    "Because I refuse to...",
    "So that one day I...",
    "The pain of staying the same is...",
  ]

  // ── Period labels ──────────────────────────────────────────────────────
  const periodLabel =
    period === "daily" ? "day" : period === "weekly" ? "week" : "month"

  return (
    <div className="px-6 pt-6 pb-6 space-y-0">
      {/* ═══════════════════════════════════════════════════════════════════
          PHASE 0: Life Area Selection (always visible)
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="text-center mb-6">
        <p className="text-[13px] tracking-wide uppercase text-[#a1a1aa] mb-4 font-medium">
          Choose your arena
        </p>
        <div className="flex justify-center gap-3">
          {LIFE_AREAS.filter((a) => a.id !== "custom").map((area) => {
            const Icon = area.icon
            const isSelected = lifeArea === area.id
            return (
              <button
                key={area.id}
                type="button"
                onClick={() => setLifeArea(area.id)}
                className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ease-out ${
                  isSelected
                    ? "scale-110"
                    : "hover:scale-105 opacity-50 hover:opacity-80"
                }`}
                style={{
                  backgroundColor: isSelected ? area.hex : `${area.hex}15`,
                  border: `2px solid ${isSelected ? area.hex : `${area.hex}30`}`,
                  boxShadow: isSelected
                    ? `0 0 20px ${area.hex}40, 0 0 40px ${area.hex}15`
                    : "none",
                }}
              >
                {/* Ping animation on selected */}
                {isSelected && (
                  <span
                    className="absolute inset-0 rounded-full animate-ping opacity-20"
                    style={{ backgroundColor: area.hex }}
                  />
                )}
                <Icon
                  className="size-6 relative z-10"
                  style={{ color: isSelected ? "#fff" : area.hex }}
                />
              </button>
            )
          })}
        </div>
        {lifeArea && (
          <p
            className="mt-3 text-sm font-semibold tracking-wide transition-all duration-300"
            style={{ color: hex }}
          >
            {areaConfig.name}
          </p>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          PHASE 1: Identity Declaration
      ═══════════════════════════════════════════════════════════════════ */}
      <div
        className="overflow-hidden transition-all duration-500 ease-out"
        style={{
          maxHeight: showPhase1 ? "400px" : "0px",
          opacity: showPhase1 ? 1 : 0,
        }}
      >
        <div className="pt-4">
          <h2 className="text-xl font-bold text-[#f0f0f0] mb-1 text-center">
            Who are you becoming?
          </h2>
          <p className="text-[13px] text-[#71717a] mb-4 text-center">
            Not what you want to do. Who you want to{" "}
            <em className="text-[#a1a1aa] not-italic font-medium">be</em>.
          </p>

          {/* Textarea with left accent bar */}
          <div className="relative">
            <div
              className="absolute left-0 top-0 bottom-0 w-1 rounded-full"
              style={{ backgroundColor: hex }}
            />
            <textarea
              value={identity}
              onChange={(e) => setIdentity(e.target.value)}
              placeholder="I am becoming..."
              rows={3}
              className="w-full pl-5 pr-4 py-4 bg-[#1e1e2e] text-[#f0f0f0] text-base leading-relaxed rounded-lg border border-[#2a2a3e] placeholder:text-[#52525b] placeholder:italic focus:outline-none resize-none transition-all duration-200"
              style={{
                boxShadow:
                  identity.length > 0
                    ? `inset 0 0 0 1px ${hex}30`
                    : "none",
              }}
            />
          </div>

          {/* Rotating example */}
          <p
            className="mt-3 text-[12px] italic text-center transition-opacity duration-500"
            style={{ color: `${hex}e6` }}
          >
            &ldquo;I am becoming {currentExample}&rdquo;
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          PHASE 2: Emotional Anchor
      ═══════════════════════════════════════════════════════════════════ */}
      <div
        className="overflow-hidden transition-all duration-500 ease-out"
        style={{
          maxHeight: showPhase2 ? "500px" : "0px",
          opacity: showPhase2 ? 1 : 0,
        }}
      >
        <div className="pt-6">
          <div
            className="bg-[#16162a] rounded-xl p-5"
            style={{
              borderTop: `3px solid ${hex}`,
              background: `linear-gradient(180deg, ${hex}08 0%, #16162a 20%)`,
            }}
          >
            {/* Lightbulb icon */}
            <div className="flex items-start gap-3 mb-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${hex}20` }}
              >
                <Lightbulb className="size-4" style={{ color: hex }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#f0f0f0]">
                  What makes this identity worth fighting for?
                </p>
                <p className="text-[12px] text-[#71717a] mt-0.5">
                  This is your anchor. When motivation fades, these words pull
                  you back.
                </p>
              </div>
            </div>

            {/* Motivation textarea */}
            <textarea
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              placeholder="Write your anchor..."
              rows={3}
              className="w-full px-4 py-3 bg-[#1e1e2e] text-[#f0f0f0] text-sm leading-relaxed rounded-lg border border-[#2a2a3e] placeholder:text-[#52525b] placeholder:italic focus:outline-none resize-none transition-all duration-200"
              style={{
                boxShadow:
                  motivation.length > 0
                    ? `inset 0 0 0 1px ${hex}30`
                    : "none",
              }}
            />

            {/* Prompt starter pills */}
            <div className="flex flex-wrap gap-2 mt-3">
              {promptStarters.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => {
                    if (motivation.length === 0) {
                      setMotivation(starter)
                    }
                  }}
                  className="text-[11px] px-3 py-1.5 rounded-full border transition-all duration-200 hover:scale-105"
                  style={{
                    borderColor: `${hex}25`,
                    backgroundColor: `${hex}08`,
                    color: `${hex}cc`,
                  }}
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          PHASE 3: Evidence Behavior
      ═══════════════════════════════════════════════════════════════════ */}
      <div
        className="overflow-hidden transition-all duration-500 ease-out"
        style={{
          maxHeight: showPhase3 ? "800px" : "0px",
          opacity: showPhase3 ? 1 : 0,
        }}
      >
        <div className="pt-4">
          {/* Visual connector */}
          <div className="flex flex-col items-center gap-0">
            <div
              className="w-px h-6"
              style={{ backgroundColor: `${hex}66` }}
            />
            <div
              className="w-7 h-7 rounded-full border-2 flex items-center justify-center"
              style={{ borderColor: `${hex}66`, backgroundColor: `${hex}10` }}
            >
              <ChevronDown className="size-3.5" style={{ color: hex }} />
            </div>
            <p
              className="text-[12px] font-medium tracking-wide mt-1 mb-1"
              style={{ color: `${hex}cc` }}
            >
              So the evidence is...
            </p>
            <div
              className="w-px h-6"
              style={{ backgroundColor: `${hex}66` }}
            />
          </div>

          {/* Evidence card */}
          <div
            className="rounded-xl p-5 border"
            style={{
              borderColor: `${hex}25`,
              backgroundColor: `${hex}05`,
            }}
          >
            <p className="text-sm font-semibold text-[#f0f0f0] mb-1">
              What&apos;s one behavior that proves this identity?
            </p>
            <p className="text-[12px] text-[#71717a] mb-4">
              A man who is this person would consistently...
            </p>

            {/* Goal title input */}
            <input
              type="text"
              value={goalTitle}
              onChange={(e) => {
                setGoalTitle(e.target.value)
                setSelectedSuggestion(null)
              }}
              placeholder={
                AREA_PLACEHOLDERS[lifeArea] || "What will you do consistently?"
              }
              className="w-full px-4 py-3 bg-[#1e1e2e] text-[#f0f0f0] text-sm rounded-lg border border-[#2a2a3e] placeholder:text-[#52525b] focus:outline-none transition-all duration-200 mb-3"
              style={{
                boxShadow:
                  goalTitle.length > 0
                    ? `inset 0 0 0 1px ${hex}30`
                    : "none",
              }}
            />

            {/* Suggestion chips */}
            {featuredSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
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
                          setPeriod(s.defaultPeriod as "daily" | "weekly" | "monthly")
                        }
                      }}
                      className="text-[12px] px-3 py-1.5 rounded-full border transition-all duration-200"
                      style={{
                        backgroundColor: isActive ? hex : `${hex}10`,
                        borderColor: isActive ? hex : `${hex}30`,
                        color: isActive ? "#fff" : hex,
                      }}
                    >
                      {s.title}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Target + Period row */}
            <div className="flex items-center gap-4 mb-4">
              {/* How much: stepper */}
              <div className="flex items-center gap-0">
                <span className="text-[12px] text-[#71717a] mr-2 whitespace-nowrap">
                  How much:
                </span>
                <button
                  type="button"
                  onClick={() => setTarget((t) => Math.max(1, t - 1))}
                  className="w-9 h-9 rounded-l-lg border border-[#2a2a3e] flex items-center justify-center text-[#a1a1aa] hover:text-white hover:bg-[#2a2a3e] transition-colors"
                >
                  <Minus className="size-3.5" />
                </button>
                <div
                  className="w-12 h-9 border-y border-[#2a2a3e] flex items-center justify-center text-lg font-bold"
                  style={{ color: hex }}
                >
                  {target}
                </div>
                <button
                  type="button"
                  onClick={() => setTarget((t) => t + 1)}
                  className="w-9 h-9 rounded-r-lg border border-[#2a2a3e] flex items-center justify-center text-[#a1a1aa] hover:text-white hover:bg-[#2a2a3e] transition-colors"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>

              {/* How often: period buttons */}
              <div className="flex items-center gap-0">
                <span className="text-[12px] text-[#71717a] mr-2 whitespace-nowrap">
                  How often:
                </span>
                <div className="flex">
                  {(["daily", "weekly", "monthly"] as const).map((p, i) => {
                    const isActive = period === p
                    const roundedClass =
                      i === 0
                        ? "rounded-l-lg"
                        : i === 2
                          ? "rounded-r-lg"
                          : ""
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPeriod(p)}
                        className={`px-3 py-1.5 text-[12px] font-medium border border-[#2a2a3e] transition-all duration-200 capitalize ${roundedClass} ${
                          isActive ? "text-white" : "text-[#71717a] hover:text-[#a1a1aa]"
                        }`}
                        style={{
                          backgroundColor: isActive ? hex : "transparent",
                          borderColor: isActive ? hex : "#2a2a3e",
                        }}
                      >
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Nature toggle */}
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-[#71717a]">This is:</span>
              <button
                type="button"
                onClick={() => setNature("input")}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-all duration-200 ${
                  nature === "input"
                    ? "border-green-500/40 bg-green-500/15 text-green-400 font-medium"
                    : "border-[#2a2a3e] text-[#71717a] hover:text-[#a1a1aa]"
                }`}
              >
                An action I control
              </button>
              <button
                type="button"
                onClick={() => setNature("outcome")}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-all duration-200 ${
                  nature === "outcome"
                    ? "border-red-500/40 bg-red-500/15 text-red-400 font-medium"
                    : "border-[#2a2a3e] text-[#71717a] hover:text-[#a1a1aa]"
                }`}
              >
                A result I measure
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          PHASE 4: Commitment
      ═══════════════════════════════════════════════════════════════════ */}
      <div
        className="overflow-hidden transition-all duration-500 ease-out"
        style={{
          maxHeight: showPhase4 ? "400px" : "0px",
          opacity: showPhase4 ? 1 : 0,
        }}
      >
        <div className="pt-6">
          {/* Divider */}
          <div className="border-t border-[#2a2a3e] mb-6" />

          {/* Declaration summary card */}
          <div
            className="rounded-lg p-5 text-center mb-5"
            style={{ backgroundColor: `${hex}08` }}
          >
            <p
              className="text-[11px] uppercase tracking-widest mb-2 font-medium"
              style={{ color: `${hex}99` }}
            >
              Your declaration
            </p>
            <p
              className="text-base italic leading-relaxed mb-2"
              style={{ color: hex }}
            >
              &ldquo;{identity || "..."}&rdquo;
            </p>
            <p className="text-[13px] text-[#a1a1aa]">
              Proven by:{" "}
              <span className="text-[#f0f0f0] font-medium">{goalTitle}</span>
              {" "}·{" "}
              <span className="text-[#f0f0f0] font-medium">
                {target}x {periodLabel}
              </span>
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex-1 py-3 rounded-xl text-sm font-medium text-[#71717a] border border-[#2a2a3e] hover:border-[#3f3f50] hover:text-[#a1a1aa] transition-all duration-200"
            >
              Not yet
            </button>
            <button
              type="button"
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 active:scale-[0.98]"
              style={{
                backgroundColor: hex,
                boxShadow: `0 0 20px ${hex}40, 0 4px 14px ${hex}30`,
              }}
            >
              Commit to this identity
            </button>
          </div>

          {/* Micro-reassurance */}
          <p className="text-[11px] text-[#3f3f50] text-center mt-4">
            You can always adjust the specifics. The identity is what matters.
          </p>
        </div>
      </div>
    </div>
  )
}
