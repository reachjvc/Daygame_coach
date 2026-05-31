"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { LIFE_AREAS, getLifeAreaConfig } from "../data/lifeAreas"

// ─── Smart Text Detection ──────────────────────────────────────────────────────

interface InferredValues {
  lifeArea: string | null
  period: string
  targetValue: number
  trackingType: "counter" | "boolean"
  goalType: string
}

function inferFromTitle(text: string): InferredValues {
  const lower = text.toLowerCase()
  const result: InferredValues = {
    lifeArea: null,
    period: "weekly",
    targetValue: 1,
    trackingType: "boolean",
    goalType: "recurring",
  }

  // Frequency: "3x per week", "3 per day", etc
  const freqMatch = lower.match(
    /(\d+)\s*(?:x\s*(?:per|\/|a)\s*|times?\s*(?:per|\/|a)\s*|per\s*)(day|daily|week|weekly|month|monthly)/i
  )
  if (freqMatch) {
    result.targetValue = parseInt(freqMatch[1])
    result.trackingType = "counter"
    if (/day|daily/.test(freqMatch[2])) result.period = "daily"
    else if (/month|monthly/.test(freqMatch[2])) result.period = "monthly"
  }

  // Life area keywords
  if (/approach|session|open|instadate|date|text|flirt/.test(lower))
    result.lifeArea = "daygame"
  else if (/gym|workout|run|lift|protein|sleep|steps|skincare/.test(lower))
    result.lifeArea = "health_fitness"
  else if (/deep work|network|save|budget|side project/.test(lower))
    result.lifeArea = "career_business"
  else if (/read|meditat|journal|gratitude|study/.test(lower))
    result.lifeArea = "personal_growth"
  else if (/porn|screen time|alcohol|no junk|scrolling/.test(lower))
    result.lifeArea = "vices_elimination"

  // Milestone detection
  if (
    /\bby\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4}|end of)\b/i.test(
      lower
    )
  )
    result.goalType = "milestone"

  return result
}

// ─── Period label helper ────────────────────────────────────────────────────────

function periodLabel(period: string): string {
  if (period === "daily") return "/day"
  if (period === "monthly") return "/mo"
  return "/wk"
}

function periodFull(period: string): string {
  if (period === "daily") return "day"
  if (period === "monthly") return "month"
  return "week"
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export function GoalFormVariant2({
  lifeArea,
  setLifeArea,
}: {
  lifeArea: string
  setLifeArea: (id: string) => void
}) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [title, setTitle] = useState("")
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [successTitle, setSuccessTitle] = useState<string | null>(null)

  // Overrides (user explicitly set via details or dismissed a chip)
  const [overrideLifeArea, setOverrideLifeArea] = useState<string | null>(null)
  const [overrideGoalType, setOverrideGoalType] = useState<string | null>(null)
  const [overrideNature, setOverrideNature] = useState<"input" | "outcome">("input")
  const [overrideTrackingType, setOverrideTrackingType] = useState<"counter" | "boolean" | null>(null)
  const [overrideTargetValue, setOverrideTargetValue] = useState<number | null>(null)
  const [overridePeriod, setOverridePeriod] = useState<string | null>(null)
  const [motivation, setMotivation] = useState("")

  // Dismissed chip keys
  const [dismissedChips, setDismissedChips] = useState<Set<string>>(new Set())

  // Details panel ref for height animation
  const detailsRef = useRef<HTMLDivElement>(null)
  const [detailsHeight, setDetailsHeight] = useState(0)

  // ── Inference ──────────────────────────────────────────────────────────────
  const inferred = useMemo(() => inferFromTitle(title), [title])

  // Effective values (override > inference > default)
  const effectiveLifeArea = overrideLifeArea ?? inferred.lifeArea ?? lifeArea
  const effectiveGoalType = overrideGoalType ?? inferred.goalType
  const effectiveTrackingType = overrideTrackingType ?? inferred.trackingType
  const effectiveTargetValue = overrideTargetValue ?? inferred.targetValue
  const effectivePeriod = overridePeriod ?? inferred.period

  const areaConfig = getLifeAreaConfig(effectiveLifeArea)

  // Sync life area up to parent when it changes from inference
  useEffect(() => {
    if (inferred.lifeArea && !overrideLifeArea) {
      setLifeArea(inferred.lifeArea)
    }
  }, [inferred.lifeArea, overrideLifeArea, setLifeArea])

  // Measure details panel height for animation
  useEffect(() => {
    if (detailsRef.current) {
      setDetailsHeight(detailsRef.current.scrollHeight)
    }
  }, [detailsOpen, effectiveTrackingType])

  // ── Chip logic ─────────────────────────────────────────────────────────────
  const dismissChip = (key: string) => {
    setDismissedChips((prev) => new Set(prev).add(key))
  }

  // Reset dismissed chips when title changes significantly
  useEffect(() => {
    if (title.length === 0) {
      setDismissedChips(new Set())
    }
  }, [title])

  // Build visible chips
  const chips: { key: string; label: string; type: "area" | "meta" }[] = []

  if (inferred.lifeArea && !dismissedChips.has("lifeArea") && !overrideLifeArea) {
    const areaName = getLifeAreaConfig(inferred.lifeArea).name
    chips.push({ key: "lifeArea", label: areaName, type: "area" })
  }

  if (
    inferred.trackingType === "counter" &&
    !dismissedChips.has("frequency") &&
    !overrideTrackingType
  ) {
    chips.push({
      key: "frequency",
      label: `${inferred.targetValue}${periodLabel(inferred.period)}`,
      type: "meta",
    })
  }

  if (inferred.goalType === "milestone" && !dismissedChips.has("goalType")) {
    chips.push({ key: "goalType", label: "Milestone", type: "meta" })
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleCreate = () => {
    if (!title.trim()) return
    setSuccessTitle(title.trim())
    setTitle("")
    setDetailsOpen(false)
    setOverrideLifeArea(null)
    setOverrideGoalType(null)
    setOverrideTrackingType(null)
    setOverrideTargetValue(null)
    setOverridePeriod(null)
    setMotivation("")
    setDismissedChips(new Set())
    // Clear success after 4 seconds
    setTimeout(() => setSuccessTitle(null), 4000)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && title.trim()) {
      e.preventDefault()
      handleCreate()
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="px-6 pt-6 pb-5">
      {/* Title label */}
      <p className="text-[15px] text-white/50 font-medium mb-4">
        What&apos;s the goal?
      </p>

      {/* Text input */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="e.g. Run 5km 3x per week"
        className="w-full bg-transparent text-[17px] text-white placeholder:text-white/20 border-b border-white/[0.08] focus:border-orange-500/50 pb-3 outline-none transition-colors duration-200 caret-orange-500"
      />

      {/* Inferred chips */}
      {chips.length > 0 && (
        <div className="pt-3 flex flex-wrap gap-2">
          {chips.map((chip) => {
            if (chip.type === "area") {
              const chipArea = getLifeAreaConfig(inferred.lifeArea!)
              return (
                <span
                  key={chip.key}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-200"
                  style={{
                    backgroundColor: `${chipArea.hex}15`,
                    color: chipArea.hex,
                    borderColor: `${chipArea.hex}30`,
                  }}
                >
                  {chip.label}
                  <button
                    type="button"
                    onClick={() => dismissChip(chip.key)}
                    className="opacity-40 hover:opacity-100 text-[10px] transition-opacity"
                  >
                    &times;
                  </button>
                </span>
              )
            }
            return (
              <span
                key={chip.key}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/[0.06] text-white/40 border border-white/[0.06] transition-all duration-200"
              >
                {chip.label}
                <button
                  type="button"
                  onClick={() => dismissChip(chip.key)}
                  className="opacity-40 hover:opacity-100 text-[10px] transition-opacity"
                >
                  &times;
                </button>
              </span>
            )
          })}
        </div>
      )}

      {/* Divider */}
      <div className="h-px bg-white/[0.06] mt-5" />

      {/* Details expanded section */}
      <div
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{ maxHeight: detailsOpen ? `${detailsHeight + 32}px` : "0px" }}
      >
        <div ref={detailsRef} className="pt-5 space-y-5">
          {/* Life Area */}
          <div>
            <p className="text-[11px] uppercase tracking-widest text-white/25 font-medium mb-2.5">
              Life area
            </p>
            <div className="flex flex-wrap gap-1.5">
              {LIFE_AREAS.filter((a) => a.id !== "custom").map((area) => {
                const isSelected = effectiveLifeArea === area.id
                return (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => {
                      setOverrideLifeArea(area.id)
                      setLifeArea(area.id)
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
                      isSelected
                        ? "text-white border-transparent"
                        : "border-white/[0.06] text-white/30 hover:text-white/50 hover:border-white/[0.12]"
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
                    {area.name}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Goal Type */}
          <div>
            <p className="text-[11px] uppercase tracking-widest text-white/25 font-medium mb-2.5">
              Goal type
            </p>
            <div className="inline-flex rounded-lg border border-white/[0.06] overflow-hidden">
              {(["recurring", "milestone", "ramp"] as const).map((type) => {
                const isSelected = effectiveGoalType === type
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setOverrideGoalType(type)}
                    className={`px-4 py-1.5 text-xs font-medium transition-all duration-150 ${
                      isSelected
                        ? "bg-white/[0.1] text-white"
                        : "text-white/30 hover:text-white/50"
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Nature */}
          <div>
            <p className="text-[11px] uppercase tracking-widest text-white/25 font-medium mb-2.5">
              Nature
            </p>
            <div className="inline-flex rounded-lg border border-white/[0.06] overflow-hidden">
              {(["input", "outcome"] as const).map((nature) => {
                const isSelected = overrideNature === nature
                const activeColor =
                  nature === "input" ? "text-green-400" : "text-red-400"
                const activeBg =
                  nature === "input"
                    ? "bg-green-500/[0.12]"
                    : "bg-red-500/[0.12]"
                return (
                  <button
                    key={nature}
                    type="button"
                    onClick={() => setOverrideNature(nature)}
                    className={`px-4 py-1.5 text-xs font-medium transition-all duration-150 ${
                      isSelected
                        ? `${activeBg} ${activeColor}`
                        : "text-white/30 hover:text-white/50"
                    }`}
                  >
                    {nature.charAt(0).toUpperCase() + nature.slice(1)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tracking */}
          <div>
            <p className="text-[11px] uppercase tracking-widest text-white/25 font-medium mb-2.5">
              Tracking
            </p>
            <div className="inline-flex rounded-lg border border-white/[0.06] overflow-hidden">
              {(["counter", "boolean"] as const).map((tt) => {
                const isSelected = effectiveTrackingType === tt
                const label = tt === "counter" ? "Counter" : "Yes / No"
                return (
                  <button
                    key={tt}
                    type="button"
                    onClick={() => setOverrideTrackingType(tt)}
                    className={`px-4 py-1.5 text-xs font-medium transition-all duration-150 ${
                      isSelected
                        ? "bg-white/[0.1] text-white"
                        : "text-white/30 hover:text-white/50"
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            {/* Counter target stepper + period */}
            {effectiveTrackingType === "counter" && (
              <div className="mt-3 flex items-center gap-3">
                {/* Stepper */}
                <div className="inline-flex items-center rounded-lg border border-white/[0.06] overflow-hidden">
                  <button
                    type="button"
                    onClick={() =>
                      setOverrideTargetValue(Math.max(1, effectiveTargetValue - 1))
                    }
                    className="px-3 py-1.5 text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all text-sm"
                  >
                    &minus;
                  </button>
                  <span className="px-4 py-1.5 text-sm font-medium text-white tabular-nums min-w-[3rem] text-center border-x border-white/[0.06]">
                    {effectiveTargetValue}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setOverrideTargetValue(effectiveTargetValue + 1)
                    }
                    className="px-3 py-1.5 text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all text-sm"
                  >
                    +
                  </button>
                </div>

                {/* Period select */}
                <span className="text-white/25 text-xs">per</span>
                <div className="inline-flex rounded-lg border border-white/[0.06] overflow-hidden">
                  {(["daily", "weekly", "monthly"] as const).map((p) => {
                    const isSelected = effectivePeriod === p
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setOverridePeriod(p)}
                        className={`px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                          isSelected
                            ? "bg-white/[0.1] text-white"
                            : "text-white/30 hover:text-white/50"
                        }`}
                      >
                        {periodFull(p)}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Motivation */}
          <div>
            <p className="text-[11px] uppercase tracking-widest text-white/25 font-medium mb-2.5">
              Motivation{" "}
              <span className="text-white/15 normal-case tracking-normal">
                optional
              </span>
            </p>
            <textarea
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              placeholder="Remind future-you why this matters"
              rows={2}
              className="w-full bg-white/[0.03] text-sm text-white placeholder:text-white/20 border border-white/[0.06] rounded-lg px-3 py-2.5 outline-none focus:border-white/[0.12] transition-colors duration-200 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="pt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setDetailsOpen(!detailsOpen)}
          className="text-[13px] text-white/30 hover:text-white/50 transition-colors duration-150"
        >
          {detailsOpen ? "- Details" : "+ Details"}
        </button>
        <button
          type="button"
          disabled={!title.trim()}
          onClick={handleCreate}
          className="px-5 py-2 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-400 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Create goal
        </button>
      </div>

      {/* Success message */}
      {successTitle && (
        <div className="mt-4 flex items-center gap-2">
          <div className="size-2 rounded-full bg-green-400 shrink-0" />
          <p className="text-xs text-green-400/70">
            Goal created &mdash; {successTitle}
          </p>
        </div>
      )}
    </div>
  )
}
