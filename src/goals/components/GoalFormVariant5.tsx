"use client"

import { useState } from "react"
import { Minus, Plus, ArrowRight, Check } from "lucide-react"
import { LIFE_AREAS, getLifeAreaConfig } from "../data/lifeAreas"

// ─── Constants ──────────────────────────────────────────────────────────────

const STEP_LABELS = ["ENVISION", "GROUND", "DESIGN", "COMMIT"] as const

const VISION_PLACEHOLDERS: Record<string, string> = {
  daygame:
    "I walk down the street and I'm not nervous anymore. I see a woman I find attractive and I just... go. The conversation flows...",
  health_fitness:
    "I catch my reflection and actually like what I see. My energy is consistent all day. People ask what changed...",
  career_business:
    "My work has momentum. I'm not grinding \u2014 I'm building. The financial stress is gone...",
  personal_growth:
    "I'm calmer. The inner chatter has quieted. I make decisions from clarity, not anxiety...",
  vices_elimination:
    "I wake up clear-headed every morning. The cravings don't run my day anymore...",
  custom:
    "Three months from now, things are different. I can feel it. Describe what you see...",
}

const VISION_PROMPTS: Record<string, string[]> = {
  daygame: [
    "I approach without hesitation and enjoy the interaction",
    "Women respond to my energy and I feel magnetic",
    "I have an active dating life with options and abundance",
  ],
  health_fitness: [
    "I feel strong and my body reflects my discipline",
    "My energy lasts all day and I sleep deeply at night",
    "People notice the change and ask what I'm doing differently",
  ],
  career_business: [
    "I wake up excited about the work ahead of me",
    "My income has grown and I feel financially secure",
    "I'm known for doing meaningful, high-impact work",
  ],
  personal_growth: [
    "I handle stress with calm clarity instead of reactivity",
    "I've built a morning routine that grounds my entire day",
    "I'm reading, learning, and becoming sharper every week",
  ],
  vices_elimination: [
    "I have complete control over my habits and impulses",
    "The time I used to waste is now invested in growth",
    "I feel clean, sharp, and proud of who I'm becoming",
  ],
  custom: [
    "I feel proud of the progress I've made",
    "I've built a habit that sticks and serves me",
    "Others notice the difference in me",
  ],
}

const OBSTACLE_PRESETS: Record<string, string[]> = {
  daygame: [
    "Approach anxiety",
    "I freeze when I see someone attractive",
    "I run out of things to say",
    "I don't go out enough",
    "I care too much what strangers think",
    "No accountability",
  ],
  health_fitness: [
    "I skip workouts when tired",
    "I eat badly when stressed",
    "Can't stay consistent past 2 weeks",
    "I don't have a plan",
    "I lose motivation after initial results",
    "I compare myself to others and quit",
  ],
  career_business: [
    "I procrastinate on important work",
    "I get distracted by low-value tasks",
    "I don't track my finances",
    "Fear of putting my work out there",
    "I stay in my comfort zone at work",
    "No clear direction or priorities",
  ],
  personal_growth: [
    "I know what to do but don't do it",
    "I start things but never finish them",
    "I consume content instead of taking action",
    "My phone steals my mornings",
    "I avoid silence and self-reflection",
    "I let emotions make my decisions",
  ],
  vices_elimination: [
    "I relapse when I'm bored or stressed",
    "I tell myself 'just this once' every time",
    "I don't have an alternative when cravings hit",
    "My environment triggers the habit",
    "I rationalize the behavior after the fact",
    "I lack a clear streak or accountability system",
  ],
  custom: [
    "I keep putting it off",
    "I don't have a system",
    "I lose motivation quickly",
    "No one holds me accountable",
    "I don't know where to start",
    "I overthink instead of acting",
  ],
}

const BEHAVIOR_SUGGESTIONS: Record<
  string,
  { title: string; subtitle: string; defaultTarget: number; defaultPeriod: string }[]
> = {
  daygame: [
    { title: "Do 3 approaches per session", subtitle: "3x weekly \u2014 input goal", defaultTarget: 3, defaultPeriod: "weekly" },
    { title: "Go on 1 solo daygame walk", subtitle: "3x weekly \u2014 input goal", defaultTarget: 3, defaultPeriod: "weekly" },
    { title: "Open within 3 seconds of spotting", subtitle: "Daily practice \u2014 input goal", defaultTarget: 1, defaultPeriod: "daily" },
    { title: "Record a voice note after each session", subtitle: "3x weekly \u2014 input goal", defaultTarget: 3, defaultPeriod: "weekly" },
  ],
  health_fitness: [
    { title: "Go to the gym", subtitle: "4x weekly \u2014 input goal", defaultTarget: 4, defaultPeriod: "weekly" },
    { title: "Meal prep on Sunday", subtitle: "1x weekly \u2014 input goal", defaultTarget: 1, defaultPeriod: "weekly" },
    { title: "Walk 10,000 steps", subtitle: "Daily practice \u2014 input goal", defaultTarget: 1, defaultPeriod: "daily" },
    { title: "Track calories in a food journal", subtitle: "Daily practice \u2014 input goal", defaultTarget: 1, defaultPeriod: "daily" },
  ],
  career_business: [
    { title: "4 hours of deep work", subtitle: "Daily practice \u2014 input goal", defaultTarget: 4, defaultPeriod: "daily" },
    { title: "Complete 3 high-priority tasks", subtitle: "Daily practice \u2014 input goal", defaultTarget: 3, defaultPeriod: "daily" },
    { title: "Review and plan tomorrow's tasks", subtitle: "Daily practice \u2014 input goal", defaultTarget: 1, defaultPeriod: "daily" },
    { title: "Work on side project", subtitle: "3x weekly \u2014 input goal", defaultTarget: 3, defaultPeriod: "weekly" },
  ],
  personal_growth: [
    { title: "Meditate for 10 minutes", subtitle: "Daily practice \u2014 input goal", defaultTarget: 1, defaultPeriod: "daily" },
    { title: "Journal every morning", subtitle: "Daily practice \u2014 input goal", defaultTarget: 1, defaultPeriod: "daily" },
    { title: "Read 20 pages", subtitle: "Daily practice \u2014 input goal", defaultTarget: 20, defaultPeriod: "daily" },
    { title: "1 comfort zone challenge", subtitle: "1x weekly \u2014 input goal", defaultTarget: 1, defaultPeriod: "weekly" },
  ],
  vices_elimination: [
    { title: "Replace urge with 5-min walk", subtitle: "Daily practice \u2014 input goal", defaultTarget: 1, defaultPeriod: "daily" },
    { title: "Log cravings in journal", subtitle: "Daily practice \u2014 input goal", defaultTarget: 1, defaultPeriod: "daily" },
    { title: "Remove triggers from environment", subtitle: "1x weekly \u2014 input goal", defaultTarget: 1, defaultPeriod: "weekly" },
    { title: "Check in with accountability partner", subtitle: "3x weekly \u2014 input goal", defaultTarget: 3, defaultPeriod: "weekly" },
  ],
  custom: [
    { title: "Practice the habit", subtitle: "Daily practice \u2014 input goal", defaultTarget: 1, defaultPeriod: "daily" },
    { title: "Review progress and adjust", subtitle: "1x weekly \u2014 input goal", defaultTarget: 1, defaultPeriod: "weekly" },
    { title: "Track completion in a log", subtitle: "Daily practice \u2014 input goal", defaultTarget: 1, defaultPeriod: "daily" },
  ],
}

/** Derive a short obstacle phrase for the if-then plan */
function deriveObstaclePhrase(obstacle: string): string {
  const lower = obstacle.toLowerCase().trim()
  if (lower.startsWith("i ")) return lower
  if (lower.startsWith("approach")) return "approach anxiety kicks in"
  if (lower.startsWith("no ")) return `I have ${lower}`
  if (lower.startsWith("can't")) return `I feel like I ${lower}`
  return `${lower} shows up`
}

const PERIODS = ["daily", "weekly", "monthly"] as const

// ─── Component ──────────────────────────────────────────────────────────────

export function GoalFormVariant5({
  lifeArea,
  setLifeArea,
}: {
  lifeArea: string
  setLifeArea: (id: string) => void
}) {
  const [step, setStep] = useState(1)

  // Step 1: Vision
  const [visionText, setVisionText] = useState("")

  // Step 2: Obstacle
  const [selectedObstaclePreset, setSelectedObstaclePreset] = useState<string | null>(null)
  const [obstacleText, setObstacleText] = useState("")

  // Step 3: Behavior
  const [selectedBehaviorIdx, setSelectedBehaviorIdx] = useState<number | null>(null)
  const [customBehavior, setCustomBehavior] = useState("")

  // Step 4: Goal config
  const [goalTitle, setGoalTitle] = useState("")
  const [targetValue, setTargetValue] = useState(3)
  const [period, setPeriod] = useState("weekly")
  const [nature, setNature] = useState<"input" | "outcome">("input")
  const [motivation, setMotivation] = useState("")

  // Derived
  const areaConfig = getLifeAreaConfig(lifeArea || "daygame")
  const hex = areaConfig.hex
  const areaKey = LIFE_AREAS.find((a) => a.id === lifeArea) ? lifeArea : "custom"

  // The active behavior title (from suggestion or custom)
  const activeBehaviorTitle =
    selectedBehaviorIdx !== null
      ? (BEHAVIOR_SUGGESTIONS[areaKey] ?? BEHAVIOR_SUGGESTIONS.custom)[selectedBehaviorIdx]?.title ?? ""
      : customBehavior

  // Active obstacle
  const activeObstacle = obstacleText || selectedObstaclePreset || ""

  // ─── Progress Indicator ──────────────────────────────────────────────────

  function renderProgress() {
    return (
      <div className="flex items-center gap-3 px-6 pt-5 pb-2">
        <div className="flex items-center gap-1.5">
          {STEP_LABELS.map((_, i) => {
            const stepNum = i + 1
            const isActive = stepNum === step
            const isCompleted = stepNum < step
            const isFuture = stepNum > step
            return (
              <div
                key={i}
                className="h-1 rounded-full transition-all duration-300"
                style={{
                  width: isActive || isCompleted ? 32 : 16,
                  backgroundColor: isActive
                    ? hex
                    : isCompleted
                      ? `${hex}80`
                      : "rgba(55, 65, 81, 0.4)",
                }}
              />
            )
          })}
        </div>
        <span className="text-[11px] font-mono uppercase tracking-widest text-[#9ca3af]">
          {STEP_LABELS[step - 1]}
        </span>
      </div>
    )
  }

  // ─── Step 1: ENVISION ────────────────────────────────────────────────────

  function renderStep1() {
    const placeholder = VISION_PLACEHOLDERS[areaKey] ?? VISION_PLACEHOLDERS.custom
    const prompts = VISION_PROMPTS[areaKey] ?? VISION_PROMPTS.custom

    return (
      <div className="px-6 pb-6 pt-2 relative">
        {/* Radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at center, ${hex}33 0%, transparent 70%)`,
            filter: "blur(60px)",
          }}
        />

        <div className="relative z-10">
          {/* Life area pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            {LIFE_AREAS.filter((a) => a.id !== "custom").map((area) => {
              const isSelected = lifeArea === area.id
              return (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => setLifeArea(area.id)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
                  style={{
                    backgroundColor: isSelected ? area.hex : "transparent",
                    color: isSelected ? "#fff" : "#9ca3af",
                    border: `1px solid ${isSelected ? area.hex : "#374151"}`,
                    boxShadow: isSelected ? `0 0 12px ${area.hex}40` : "none",
                  }}
                >
                  {area.name}
                </button>
              )
            })}
          </div>

          {/* Heading */}
          <p className="text-lg font-semibold text-[#e0e0e0] mb-1">
            Imagine it&apos;s 3 months from now.
          </p>
          <p className="text-sm text-[#9ca3af] mb-4">
            What&apos;s different about your life? Don&apos;t think metrics &mdash; paint
            the picture.
          </p>

          {/* Textarea */}
          <textarea
            value={visionText}
            onChange={(e) => setVisionText(e.target.value)}
            placeholder={placeholder}
            rows={4}
            className="w-full px-4 py-3 rounded-lg bg-[#1f2937] border border-[#374151] text-[#e0e0e0] text-sm placeholder:text-[#4b5563] focus:outline-none transition-all duration-200 resize-none"
            style={{
              borderColor: visionText ? hex : "#374151",
              boxShadow: visionText ? `0 0 0 1px ${hex}30` : "none",
            }}
          />

          {/* Prompt starter pills */}
          <div className="flex flex-wrap gap-2 mt-3">
            {prompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setVisionText(prompt)}
                className="text-xs px-3 py-1.5 rounded-full border border-[#374151] text-[#9ca3af] hover:border-[#4b5563] hover:text-[#e0e0e0] transition-all duration-200"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={() => {
              setMotivation(visionText)
              setStep(2)
            }}
            disabled={!visionText.trim()}
            className="w-full mt-6 py-3 rounded-xl text-white font-semibold text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: visionText.trim() ? hex : "#374151",
              boxShadow: visionText.trim() ? `0 0 20px ${hex}40` : "none",
            }}
          >
            Now ground it &rarr;
          </button>
        </div>
      </div>
    )
  }

  // ─── Step 2: GROUND ──────────────────────────────────────────────────────

  function renderStep2() {
    const presets = OBSTACLE_PRESETS[areaKey] ?? OBSTACLE_PRESETS.custom

    return (
      <div className="px-6 pb-6 pt-2">
        {/* Vision recap */}
        <div className="rounded-lg border border-[#374151] bg-[#1f2937]/60 p-3 mb-5">
          <p className="text-[10px] uppercase tracking-widest text-[#6b7280] mb-1">
            Your vision
          </p>
          <p className="text-sm text-[#9ca3af] italic line-clamp-2">
            &ldquo;{visionText}&rdquo;
          </p>
        </div>

        {/* Heading */}
        <p className="text-lg font-semibold text-[#e0e0e0] mb-1">
          What&apos;s actually stopping you?
        </p>
        <p className="text-sm text-[#9ca3af] mb-5">
          Not excuses. The real thing. The pattern you keep running into.
        </p>

        {/* Obstacle presets */}
        <div className="flex flex-wrap gap-2 mb-4">
          {presets.map((preset) => {
            const isSelected = selectedObstaclePreset === preset
            return (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    setSelectedObstaclePreset(null)
                    setObstacleText("")
                  } else {
                    setSelectedObstaclePreset(preset)
                    setObstacleText(preset)
                  }
                }}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
                style={{
                  backgroundColor: isSelected ? "#ef4444" : "transparent",
                  color: isSelected ? "#fff" : "#9ca3af",
                  border: `1px solid ${isSelected ? "#ef4444" : "#374151"}`,
                  boxShadow: isSelected ? "0 0 12px rgba(239,68,68,0.3)" : "none",
                }}
              >
                {preset}
              </button>
            )
          })}
        </div>

        {/* Custom obstacle */}
        <textarea
          value={obstacleText}
          onChange={(e) => {
            setObstacleText(e.target.value)
            setSelectedObstaclePreset(null)
          }}
          placeholder="Or describe it in your own words..."
          rows={3}
          className="w-full px-4 py-3 rounded-lg bg-[#1f2937] border border-[#374151] text-[#e0e0e0] text-sm placeholder:text-[#4b5563] focus:outline-none transition-all duration-200 resize-none"
        />

        {/* Navigation */}
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={() => setStep(1)}
            className="text-sm text-[#6b7280] hover:text-[#9ca3af] transition-colors duration-200"
          >
            &larr; Back
          </button>
          <button
            onClick={() => setStep(3)}
            disabled={!obstacleText.trim()}
            className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: obstacleText.trim() ? hex : "#374151",
              boxShadow: obstacleText.trim() ? `0 0 20px ${hex}40` : "none",
            }}
          >
            Design the behavior &rarr;
          </button>
        </div>
      </div>
    )
  }

  // ─── Step 3: DESIGN ──────────────────────────────────────────────────────

  function renderStep3() {
    const suggestions = BEHAVIOR_SUGGESTIONS[areaKey] ?? BEHAVIOR_SUGGESTIONS.custom

    return (
      <div className="px-6 pb-6 pt-2">
        {/* Bridge visualization */}
        <div className="flex items-center gap-3 mb-6">
          {/* NOW box */}
          <div className="flex-1 rounded-lg border border-[#374151] bg-[#1f2937] p-3 min-w-0">
            <p className="text-[10px] uppercase tracking-widest font-mono text-[#ef4444] mb-1">
              NOW
            </p>
            <p className="text-xs text-[#9ca3af] line-clamp-2">
              {activeObstacle || "Your obstacle"}
            </p>
          </div>

          {/* Arrow circle */}
          <div
            className="w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0"
            style={{ borderColor: hex }}
          >
            <ArrowRight className="w-4 h-4" style={{ color: hex }} />
          </div>

          {/* FUTURE box */}
          <div className="flex-1 rounded-lg border border-[#374151] bg-[#1f2937] p-3 min-w-0">
            <p
              className="text-[10px] uppercase tracking-widest font-mono mb-1"
              style={{ color: hex }}
            >
              3 MONTHS
            </p>
            <p className="text-xs text-[#9ca3af] italic line-clamp-2">
              {visionText || "Your vision"}
            </p>
          </div>
        </div>

        {/* Heading */}
        <p className="text-lg font-semibold text-[#e0e0e0] mb-1">
          What behavior bridges that gap?
        </p>
        <p className="text-sm text-[#9ca3af] mb-5">
          One specific, repeatable action that directly attacks your obstacle.
        </p>

        {/* Behavior suggestions */}
        <div className="flex flex-col gap-2 mb-4">
          {suggestions.map((sug, idx) => {
            const isSelected = selectedBehaviorIdx === idx
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    setSelectedBehaviorIdx(null)
                    setGoalTitle("")
                    setTargetValue(3)
                    setPeriod("weekly")
                  } else {
                    setSelectedBehaviorIdx(idx)
                    setCustomBehavior("")
                    setGoalTitle(sug.title)
                    setTargetValue(sug.defaultTarget)
                    setPeriod(sug.defaultPeriod)
                  }
                }}
                className="w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all duration-200"
                style={{
                  borderColor: isSelected ? hex : "#374151",
                  backgroundColor: isSelected ? `${hex}15` : "transparent",
                  boxShadow: isSelected ? `0 0 12px ${hex}20` : "none",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.borderColor = "#4b5563"
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.borderColor = "#374151"
                }}
              >
                <div className="min-w-0">
                  <p
                    className="text-sm font-medium"
                    style={{ color: isSelected ? hex : "#e0e0e0" }}
                  >
                    {sug.title}
                  </p>
                  <p className="text-xs text-[#6b7280] mt-0.5">{sug.subtitle}</p>
                </div>
                {isSelected && (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 ml-2"
                    style={{ backgroundColor: hex }}
                  >
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Custom behavior */}
        <div>
          <p className="text-xs text-[#6b7280] mb-1.5">Or define your own</p>
          <input
            type="text"
            value={customBehavior}
            onChange={(e) => {
              setCustomBehavior(e.target.value)
              setSelectedBehaviorIdx(null)
              setGoalTitle(e.target.value)
            }}
            placeholder="e.g. Practice eye contact with 5 strangers daily"
            className="w-full px-4 py-2.5 rounded-lg bg-[#1f2937] border border-[#374151] text-[#e0e0e0] text-sm placeholder:text-[#4b5563] focus:outline-none transition-all duration-200"
          />
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={() => setStep(2)}
            className="text-sm text-[#6b7280] hover:text-[#9ca3af] transition-colors duration-200"
          >
            &larr; Back
          </button>
          <button
            onClick={() => setStep(4)}
            disabled={!activeBehaviorTitle.trim()}
            className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: activeBehaviorTitle.trim() ? hex : "#374151",
              boxShadow: activeBehaviorTitle.trim() ? `0 0 20px ${hex}40` : "none",
            }}
          >
            Set the target &rarr;
          </button>
        </div>
      </div>
    )
  }

  // ─── Step 4: COMMIT ──────────────────────────────────────────────────────

  function renderStep4() {
    const obstacleTrigger = deriveObstaclePhrase(activeObstacle)

    return (
      <div className="px-6 pb-6 pt-2">
        {/* Strategy summary card */}
        <div className="rounded-lg border border-[#374151] bg-[#1f2937] p-4 mb-5">
          <p className="text-[10px] uppercase tracking-widest font-mono text-[#6b7280] mb-3">
            Your strategy
          </p>
          <div className="space-y-2.5">
            {/* Vision */}
            <div className="flex items-start gap-2.5">
              <div
                className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                style={{ backgroundColor: hex }}
              />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-[#6b7280]">Vision</p>
                <p className="text-xs text-[#9ca3af] line-clamp-1">{visionText}</p>
              </div>
            </div>
            {/* Obstacle */}
            <div className="flex items-start gap-2.5">
              <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-[#ef4444]" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-[#6b7280]">Obstacle</p>
                <p className="text-xs text-[#9ca3af] line-clamp-1">{activeObstacle}</p>
              </div>
            </div>
            {/* Behavior */}
            <div className="flex items-start gap-2.5">
              <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-[#22c55e]" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-[#6b7280]">Behavior</p>
                <p className="text-xs text-[#9ca3af] line-clamp-1">{activeBehaviorTitle}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Implementation intention banner */}
        <div
          className="rounded-lg p-4 mb-6"
          style={{
            backgroundColor: `${hex}14`,
            border: `1px solid ${hex}40`,
          }}
        >
          <p
            className="text-[10px] uppercase tracking-widest font-mono mb-2"
            style={{ color: `${hex}cc` }}
          >
            YOUR IF-THEN PLAN
          </p>
          <p className="text-sm text-[#e0e0e0] leading-relaxed">
            When I notice{" "}
            <span className="text-[#ef4444] font-medium">{obstacleTrigger}</span>
            , I will{" "}
            <span className="text-[#22c55e] font-medium">{goalTitle || activeBehaviorTitle}</span>
          </p>
        </div>

        {/* Goal configuration */}
        <div className="space-y-5">
          {/* Title */}
          <div>
            <label className="text-xs text-[#6b7280] uppercase tracking-wide mb-1.5 block">
              Goal title
            </label>
            <input
              type="text"
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-[#1f2937] border border-[#374151] text-[#e0e0e0] text-sm placeholder:text-[#4b5563] focus:outline-none transition-all duration-200"
              style={{
                borderColor: goalTitle ? hex : "#374151",
              }}
            />
          </div>

          {/* Target stepper + Period */}
          <div className="flex gap-4">
            {/* Target stepper */}
            <div className="flex-1">
              <label className="text-xs text-[#6b7280] uppercase tracking-wide mb-1.5 block">
                Target
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTargetValue(Math.max(1, targetValue - 1))}
                  className="w-9 h-9 rounded-lg bg-[#1f2937] border border-[#374151] text-[#9ca3af] hover:border-[#4b5563] hover:text-[#e0e0e0] transition-all duration-200 flex items-center justify-center"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-2xl font-bold text-[#e0e0e0] tabular-nums min-w-[2.5ch] text-center">
                  {targetValue}
                </span>
                <button
                  onClick={() => setTargetValue(targetValue + 1)}
                  className="w-9 h-9 rounded-lg bg-[#1f2937] border border-[#374151] text-[#9ca3af] hover:border-[#4b5563] hover:text-[#e0e0e0] transition-all duration-200 flex items-center justify-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Period buttons */}
            <div className="flex-1">
              <label className="text-xs text-[#6b7280] uppercase tracking-wide mb-1.5 block">
                Period
              </label>
              <div className="flex gap-1.5">
                {PERIODS.map((p) => {
                  const isActive = period === p
                  return (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className="flex-1 py-2 rounded-lg text-xs font-medium border transition-all duration-200"
                      style={{
                        borderColor: isActive ? hex : "#374151",
                        backgroundColor: isActive ? `${hex}20` : "transparent",
                        color: isActive ? hex : "#9ca3af",
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
          <div>
            <label className="text-xs text-[#6b7280] uppercase tracking-wide mb-1.5 block">
              Nature
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setNature("input")}
                className="py-2.5 rounded-lg text-sm font-medium border transition-all duration-200"
                style={{
                  borderColor: nature === "input" ? "#22c55e" : "#374151",
                  backgroundColor: nature === "input" ? "rgba(34,197,94,0.15)" : "transparent",
                  color: nature === "input" ? "#22c55e" : "#9ca3af",
                }}
              >
                Input
              </button>
              <button
                onClick={() => setNature("outcome")}
                className="py-2.5 rounded-lg text-sm font-medium border transition-all duration-200"
                style={{
                  borderColor: nature === "outcome" ? "#ef4444" : "#374151",
                  backgroundColor: nature === "outcome" ? "rgba(239,68,68,0.15)" : "transparent",
                  color: nature === "outcome" ? "#ef4444" : "#9ca3af",
                }}
              >
                Outcome
              </button>
            </div>
          </div>

          {/* Motivation */}
          <div>
            <label className="text-xs text-[#6b7280] uppercase tracking-wide mb-1.5 block">
              Motivation
            </label>
            <textarea
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              placeholder="Why does this matter to you?"
              rows={3}
              className="w-full px-4 py-3 rounded-lg bg-[#1f2937] border border-[#374151] text-[#e0e0e0] text-sm placeholder:text-[#4b5563] focus:outline-none transition-all duration-200 resize-none"
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={() => setStep(3)}
            className="text-sm text-[#6b7280] hover:text-[#9ca3af] transition-colors duration-200"
          >
            &larr; Back
          </button>
          <button
            className="py-3 px-6 rounded-xl border border-[#374151] text-[#6b7280] hover:text-[#9ca3af] hover:border-[#4b5563] text-sm font-medium transition-all duration-200"
          >
            Cancel
          </button>
          <button
            disabled={!goalTitle.trim()}
            className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: goalTitle.trim() ? hex : "#374151",
              boxShadow: goalTitle.trim() ? `0 0 20px ${hex}40` : "none",
            }}
          >
            Create Goal
          </button>
        </div>
      </div>
    )
  }

  // ─── Main Render ────────────────────────────────────────────────────────

  const stepRenderers: Record<number, () => React.JSX.Element> = {
    1: renderStep1,
    2: renderStep2,
    3: renderStep3,
    4: renderStep4,
  }

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{ backgroundColor: "#0d0d1a" }}
    >
      {renderProgress()}
      {stepRenderers[step]?.()}
    </div>
  )
}
