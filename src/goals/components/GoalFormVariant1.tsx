"use client"

import { useState } from "react"
import { Compass, Check, ArrowLeft, Loader2 } from "lucide-react"
import { LIFE_AREAS, getLifeAreaConfig } from "../data/lifeAreas"

// ─── Constants ──────────────────────────────────────────────────────────────

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6 | "success"

const PLACEHOLDER_BY_AREA: Record<string, string> = {
  daygame: "Do 3 cold approaches every day",
  health_fitness: "Hit the gym 4 times a week",
  career_business: "Deep work for 4 hours daily",
  personal_growth: "Meditate for 10 minutes every morning",
  vices_elimination: "No social media before noon",
  custom: "Describe your goal here",
}

const MOTIVATION_PLACEHOLDER_BY_AREA: Record<string, string> = {
  daygame: "Because I'm tired of wondering 'what if' every time I see someone I'm attracted to...",
  health_fitness: "Because I want to feel strong, confident, and in control of my body...",
  career_business: "Because I know I'm capable of more and I'm done settling...",
  personal_growth: "Because the person I want to become requires daily discipline...",
  vices_elimination: "Because these habits are stealing my energy and holding me back...",
  custom: "Because this matters to me and I'm ready to commit...",
}

const MOTIVATION_PROMPTS_BY_AREA: Record<string, string[]> = {
  daygame: [
    "I want to stop being invisible",
    "I deserve to choose, not settle",
    "Fear has controlled me long enough",
  ],
  health_fitness: [
    "I want to feel powerful in my own skin",
    "Energy and vitality over comfort",
    "My body deserves better fuel",
  ],
  career_business: [
    "I refuse to waste my potential",
    "Financial freedom is real freedom",
    "I want work that excites me",
  ],
  personal_growth: [
    "I want to master my own mind",
    "Growth is the only direction",
    "I'm building the best version of me",
  ],
  vices_elimination: [
    "These habits don't serve who I'm becoming",
    "I want control back",
    "Short-term pleasure isn't worth long-term regret",
  ],
  custom: [
    "This is important to me",
    "I'm done waiting to start",
    "Small steps, big changes",
  ],
}

const SUCCESS_MESSAGES = [
  "Locked in.",
  "That's a commitment.",
  "Your future self just thanked you.",
  "No turning back now.",
  "The hardest part is over. You decided.",
]

const PERIODS = ["day", "week", "month"] as const
type Period = (typeof PERIODS)[number]

// ─── Component ──────────────────────────────────────────────────────────────

export function GoalFormVariant1({
  lifeArea,
  setLifeArea,
}: {
  lifeArea: string
  setLifeArea: (id: string) => void
}) {
  // Step state machine
  const [step, setStep] = useState<Step>(0)

  // Form state
  const [goalType, setGoalType] = useState<"recurring" | "milestone" | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [showDescription, setShowDescription] = useState(false)
  const [trackingType, setTrackingType] = useState<"count" | "boolean">("count")
  const [targetValue, setTargetValue] = useState(5)
  const [period, setPeriod] = useState<Period>("day")
  const [motivation, setMotivation] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  // Derived
  const areaConfig = getLifeAreaConfig(lifeArea || "daygame")
  const progressPercent = typeof step === "number" ? (step / 6) * 100 : 100
  const [successMsg] = useState(
    () => SUCCESS_MESSAGES[Math.floor(Math.random() * SUCCESS_MESSAGES.length)]
  )

  // Navigation helpers
  function goBack() {
    if (step === "success") { setStep(6); return }
    if (typeof step === "number" && step > 0) setStep((step - 1) as Step)
  }

  function handleCreate() {
    setIsCreating(true)
    // Simulate creation delay
    setTimeout(() => {
      setIsCreating(false)
      setStep("success")
    }, 1200)
  }

  // ─── Render helpers ─────────────────────────────────────────────────────

  const backLink = (
    <button
      onClick={goBack}
      className="flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-[#9ca3af] transition-colors duration-200 mt-6"
    >
      <ArrowLeft className="w-4 h-4" />
      Back
    </button>
  )

  // ─── Step 0: Motivation Prime ───────────────────────────────────────────

  function renderStep0() {
    return (
      <div className="flex flex-col items-center px-6 py-10 text-center">
        {/* Glowing compass icon */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
          style={{
            background:
              "linear-gradient(135deg, rgba(249,115,22,0.25), rgba(249,115,22,0.05))",
            boxShadow: "0 0 40px rgba(249,115,22,0.2), 0 0 80px rgba(249,115,22,0.08)",
            border: "1px solid rgba(249,115,22,0.3)",
          }}
        >
          <Compass className="w-9 h-9 text-[#f97316]" />
        </div>

        <h2 className="text-2xl font-semibold text-[#f0f0f0] mb-3 tracking-tight">
          What do you want to change?
        </h2>

        <p className="text-[15px] text-[#9ca3af] leading-relaxed max-w-[340px] mb-8">
          Every transformation starts with a single decision. Let&apos;s turn yours into
          a plan you&apos;ll actually follow.
        </p>

        <button
          onClick={() => setStep(1)}
          className="w-full max-w-[280px] py-3.5 rounded-xl text-white font-semibold text-[15px] tracking-wide transition-all duration-200 active:scale-[0.98] hover:brightness-110"
          style={{
            background: "linear-gradient(to right, #f97316, #ea580c)",
            boxShadow: "0 0 24px rgba(249,115,22,0.3)",
          }}
        >
          Let&apos;s build it &rarr;
        </button>

        <p className="text-xs text-[#4b5563] mt-4">Takes about 60 seconds</p>
      </div>
    )
  }

  // ─── Step 1: Life Area Selection ────────────────────────────────────────

  function renderStep1() {
    const hintText: Record<string, string> = {
      daygame: "Approaches, dates, social confidence",
      health_fitness: "Gym, nutrition, sleep, appearance",
      career_business: "Deep work, income, side projects",
      personal_growth: "Mindset, reading, meditation",
      vices_elimination: "Quit bad habits, build discipline",
      custom: "Something else entirely",
    }

    return (
      <div className="px-6 py-6">
        <h2 className="text-xl font-semibold text-[#f0f0f0] mb-1">
          Which area of your life?
        </h2>
        <p className="text-sm text-[#9ca3af] mb-6">
          Pick the one that feels most important right now.
        </p>

        <div className="grid grid-cols-2 gap-3">
          {LIFE_AREAS.map((area) => {
            const Icon = area.icon
            const isSelected = lifeArea === area.id
            return (
              <button
                key={area.id}
                type="button"
                onClick={() => {
                  setLifeArea(area.id)
                  // Auto-advance after a brief flash
                  setTimeout(() => setStep(2), 200)
                }}
                className="flex flex-col items-start p-4 rounded-xl border transition-all duration-200 text-left"
                style={{
                  borderColor: isSelected ? area.hex : "#2a2a3e",
                  backgroundColor: isSelected ? `${area.hex}15` : "#1e1e32",
                  boxShadow: isSelected ? `0 0 20px ${area.hex}20` : "none",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = "#3a3a52"
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = "#2a2a3e"
                  }
                }}
              >
                <Icon
                  className="w-6 h-6 mb-2"
                  style={{ color: isSelected ? area.hex : "#9ca3af" }}
                />
                <span
                  className="text-sm font-medium"
                  style={{ color: isSelected ? area.hex : "#f0f0f0" }}
                >
                  {area.name}
                </span>
                <span className="text-xs text-[#6b7280] mt-0.5">
                  {hintText[area.id] || "Define your own path"}
                </span>
              </button>
            )
          })}
        </div>

        {backLink}
      </div>
    )
  }

  // ─── Step 2: Goal Type ──────────────────────────────────────────────────

  function renderStep2() {
    const types = [
      {
        id: "recurring" as const,
        emoji: "\uD83D\uDD04", // 🔄
        label: "Daily Practice",
        desc: "Something you do regularly",
        accentColor: "#22c55e",
      },
      {
        id: "milestone" as const,
        emoji: "\uD83C\uDFC6", // 🏆
        label: "Milestone",
        desc: "A specific result you're working toward",
        accentColor: "#f97316",
      },
    ]

    return (
      <div className="px-6 py-6">
        <h2 className="text-xl font-semibold text-[#f0f0f0] mb-1">
          What kind of goal is this?
        </h2>
        <p className="text-sm text-[#9ca3af] mb-6">
          This helps us track it the right way.
        </p>

        <div className="flex flex-col gap-3">
          {types.map((t) => {
            const isSelected = goalType === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setGoalType(t.id)
                  setTimeout(() => setStep(3), 200)
                }}
                className="flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left w-full"
                style={{
                  borderColor: isSelected ? t.accentColor : "#2a2a3e",
                  backgroundColor: isSelected ? `${t.accentColor}15` : "#1e1e32",
                  boxShadow: isSelected ? `0 0 20px ${t.accentColor}20` : "none",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.borderColor = "#3a3a52"
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.borderColor = "#2a2a3e"
                }}
              >
                <span className="text-2xl">{t.emoji}</span>
                <div>
                  <span
                    className="text-sm font-semibold block"
                    style={{ color: isSelected ? t.accentColor : "#f0f0f0" }}
                  >
                    {t.label}
                  </span>
                  <span className="text-xs text-[#6b7280]">{t.desc}</span>
                </div>
              </button>
            )
          })}
        </div>

        {backLink}
      </div>
    )
  }

  // ─── Step 3: Title ──────────────────────────────────────────────────────

  function renderStep3() {
    const placeholder = PLACEHOLDER_BY_AREA[lifeArea] || PLACEHOLDER_BY_AREA.custom

    return (
      <div className="px-6 py-6">
        <h2 className="text-xl font-semibold text-[#f0f0f0] mb-1">
          Say it in your own words
        </h2>
        <p className="text-sm text-[#9ca3af] mb-6">
          Name your goal like you&apos;d tell a friend.
        </p>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3 rounded-lg bg-[#1e1e32] border border-[#2a2a3e] text-[#f0f0f0] text-sm placeholder:text-[#4b5563] focus:outline-none focus:border-[#f97316]/50 focus:ring-1 focus:ring-[#f97316]/20 transition-all duration-200"
        />

        {/* Optional description toggle */}
        {!showDescription ? (
          <button
            onClick={() => setShowDescription(true)}
            className="text-sm text-[#6b7280] hover:text-[#9ca3af] mt-3 transition-colors duration-200"
          >
            + Add details (optional)
          </button>
        ) : (
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Any extra context or details..."
            rows={3}
            className="w-full mt-3 px-4 py-3 rounded-lg bg-[#1e1e32] border border-[#2a2a3e] text-[#f0f0f0] text-sm placeholder:text-[#4b5563] focus:outline-none focus:border-[#f97316]/50 focus:ring-1 focus:ring-[#f97316]/20 transition-all duration-200 resize-none"
          />
        )}

        <button
          onClick={() => setStep(4)}
          disabled={!title.trim()}
          className="w-full mt-6 py-3 rounded-xl text-white font-semibold text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: title.trim()
              ? "linear-gradient(to right, #f97316, #ea580c)"
              : "#2a2a3e",
          }}
        >
          Continue
        </button>

        {backLink}
      </div>
    )
  }

  // ─── Step 4: Tracking Setup ─────────────────────────────────────────────

  function renderStep4() {
    const summaryParts = []
    if (trackingType === "count") {
      summaryParts.push(`Do ${targetValue} ${title || "actions"} per ${period}`)
    } else {
      summaryParts.push(`${title || "Complete action"} every ${period}`)
    }

    return (
      <div className="px-6 py-6">
        <h2 className="text-xl font-semibold text-[#f0f0f0] mb-1">
          Make it measurable
        </h2>
        <p className="text-sm text-[#9ca3af] mb-6">
          How will you know if you&apos;re on track?
        </p>

        {/* Tracking type toggle */}
        <div className="flex rounded-xl bg-[#1e1e32] border border-[#2a2a3e] p-1 mb-5">
          {(["count", "boolean"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setTrackingType(type)}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                backgroundColor: trackingType === type ? "#f97316" : "transparent",
                color: trackingType === type ? "#fff" : "#6b7280",
              }}
            >
              {type === "count" ? "Count" : "Yes / No"}
            </button>
          ))}
        </div>

        {/* Count-specific controls */}
        {trackingType === "count" && (
          <div className="space-y-4">
            {/* Target value stepper */}
            <div>
              <label className="text-xs text-[#6b7280] uppercase tracking-wide mb-2 block">
                Target
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setTargetValue(Math.max(1, targetValue - 1))}
                  className="w-10 h-10 rounded-xl bg-[#1e1e32] border border-[#2a2a3e] text-[#9ca3af] hover:border-[#3a3a52] hover:text-[#f0f0f0] transition-all duration-200 flex items-center justify-center text-lg font-bold"
                >
                  -
                </button>
                <span className="text-3xl font-bold text-[#f0f0f0] tabular-nums min-w-[3ch] text-center">
                  {targetValue}
                </span>
                <button
                  onClick={() => setTargetValue(targetValue + 1)}
                  className="w-10 h-10 rounded-xl bg-[#1e1e32] border border-[#2a2a3e] text-[#9ca3af] hover:border-[#3a3a52] hover:text-[#f0f0f0] transition-all duration-200 flex items-center justify-center text-lg font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Period buttons */}
            <div>
              <label className="text-xs text-[#6b7280] uppercase tracking-wide mb-2 block">
                Per
              </label>
              <div className="flex gap-2">
                {PERIODS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200"
                    style={{
                      borderColor: period === p ? "#f97316" : "#2a2a3e",
                      backgroundColor: period === p ? "rgba(249,115,22,0.15)" : "#1e1e32",
                      color: period === p ? "#f97316" : "#9ca3af",
                    }}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Live summary */}
        <div className="mt-5 p-3 rounded-lg bg-[#0d0d1a] border border-[#2a2a3e]">
          <p className="text-xs text-[#6b7280] mb-1">You&apos;re tracking:</p>
          <p className="text-sm text-[#f0f0f0] font-medium">{summaryParts[0]}</p>
        </div>

        <button
          onClick={() => setStep(5)}
          className="w-full mt-6 py-3 rounded-xl text-white font-semibold text-sm transition-all duration-200 active:scale-[0.98]"
          style={{
            background: "linear-gradient(to right, #f97316, #ea580c)",
          }}
        >
          Continue
        </button>

        {backLink}
      </div>
    )
  }

  // ─── Step 5: Motivation Note ────────────────────────────────────────────

  function renderStep5() {
    const placeholder =
      MOTIVATION_PLACEHOLDER_BY_AREA[lifeArea] || MOTIVATION_PLACEHOLDER_BY_AREA.custom
    const prompts =
      MOTIVATION_PROMPTS_BY_AREA[lifeArea] || MOTIVATION_PROMPTS_BY_AREA.custom

    return (
      <div className="px-6 py-6">
        <h2 className="text-xl font-semibold text-[#f0f0f0] mb-1">
          Why does this matter to you?
        </h2>
        <p className="text-sm text-[#9ca3af] mb-6">
          When motivation dips &mdash; and it will &mdash; these words will pull you
          back.
        </p>

        <textarea
          value={motivation}
          onChange={(e) => setMotivation(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className="w-full px-4 py-3 rounded-lg bg-[#1e1e32] border border-[#2a2a3e] text-[#f0f0f0] text-sm placeholder:text-[#4b5563] focus:outline-none focus:border-[#f97316]/50 focus:ring-1 focus:ring-[#f97316]/20 transition-all duration-200 resize-none"
        />

        {/* Prompt chips */}
        <div className="flex flex-wrap gap-2 mt-3">
          {prompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => setMotivation(prompt)}
              className="text-xs px-3 py-1.5 rounded-lg border border-[#2a2a3e] text-[#9ca3af] hover:border-[#3a3a52] hover:text-[#f0f0f0] transition-all duration-200 bg-[#1e1e32]"
            >
              &ldquo;{prompt}&rdquo;
            </button>
          ))}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setStep(6)}
            className="flex-1 py-3 rounded-xl text-[#6b7280] font-medium text-sm border border-[#2a2a3e] hover:border-[#3a3a52] hover:text-[#9ca3af] transition-all duration-200"
          >
            Skip for now
          </button>
          <button
            onClick={() => setStep(6)}
            className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-all duration-200 active:scale-[0.98]"
            style={{
              background: "linear-gradient(to right, #f97316, #ea580c)",
            }}
          >
            Continue
          </button>
        </div>

        {backLink}
      </div>
    )
  }

  // ─── Step 6: Review & Commit ────────────────────────────────────────────

  function renderStep6() {
    const AreaIcon = areaConfig.icon
    const trackingSummary =
      trackingType === "count"
        ? `${targetValue} per ${period}`
        : `Yes/No per ${period}`

    return (
      <div className="px-6 py-6">
        <h2 className="text-xl font-semibold text-[#f0f0f0] mb-1">Almost there</h2>
        <p className="text-sm text-[#9ca3af] mb-6">
          Review your goal before locking it in.
        </p>

        {/* Summary card */}
        <div className="rounded-xl border border-[#2a2a3e] bg-[#1e1e32] p-5 space-y-4">
          {/* Life area + title */}
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{
                backgroundColor: `${areaConfig.hex}20`,
                border: `1px solid ${areaConfig.hex}40`,
              }}
            >
              <AreaIcon className="w-5 h-5" style={{ color: areaConfig.hex }} />
            </div>
            <div>
              <p className="text-base font-semibold text-[#f0f0f0]">
                {title || "Untitled goal"}
              </p>
              <p className="text-xs mt-0.5" style={{ color: areaConfig.hex }}>
                {areaConfig.name}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-[#2a2a3e]" />

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[#6b7280] text-xs mb-0.5">Type</p>
              <p className="text-[#f0f0f0]">
                {goalType === "recurring" ? "\uD83D\uDD04 Daily Practice" : "\uD83C\uDFC6 Milestone"}
              </p>
            </div>
            <div>
              <p className="text-[#6b7280] text-xs mb-0.5">Tracking</p>
              <p className="text-[#f0f0f0]">{trackingSummary}</p>
            </div>
          </div>

          {/* Motivation quote */}
          {motivation && (
            <>
              <div className="h-px bg-[#2a2a3e]" />
              <div>
                <p className="text-[#6b7280] text-xs mb-1">Why it matters</p>
                <p className="text-sm text-[#9ca3af] italic">
                  &ldquo;{motivation}&rdquo;
                </p>
              </div>
            </>
          )}
        </div>

        {/* Create button */}
        <button
          onClick={handleCreate}
          disabled={isCreating}
          className="w-full mt-6 py-3.5 rounded-xl text-white font-semibold text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
          style={{
            background: "linear-gradient(to right, #22c55e, #16a34a)",
            boxShadow: "0 0 24px rgba(34,197,94,0.25)",
          }}
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Goal"
          )}
        </button>

        {backLink}
      </div>
    )
  }

  // ─── Success State ──────────────────────────────────────────────────────

  function renderSuccess() {
    return (
      <div className="flex flex-col items-center px-6 py-12 text-center">
        {/* Green checkmark circle */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-6 animate-pulse"
          style={{
            background:
              "linear-gradient(135deg, rgba(34,197,94,0.25), rgba(34,197,94,0.05))",
            boxShadow: "0 0 40px rgba(34,197,94,0.2), 0 0 80px rgba(34,197,94,0.08)",
            border: "1px solid rgba(34,197,94,0.3)",
          }}
        >
          <Check className="w-9 h-9 text-[#22c55e]" />
        </div>

        <h2 className="text-2xl font-semibold text-[#f0f0f0] mb-2 tracking-tight">
          {successMsg}
        </h2>

        <p className="text-sm text-[#9ca3af] mb-8 max-w-[280px]">
          Your goal is live. Now show up and put in the reps.
        </p>

        <div className="flex gap-3 w-full max-w-[320px]">
          <button
            onClick={() => {
              // Reset everything
              setStep(0)
              setGoalType(null)
              setTitle("")
              setDescription("")
              setShowDescription(false)
              setTrackingType("count")
              setTargetValue(5)
              setPeriod("day")
              setMotivation("")
            }}
            className="flex-1 py-3 rounded-xl text-[#9ca3af] font-medium text-sm border border-[#2a2a3e] hover:border-[#3a3a52] hover:text-[#f0f0f0] transition-all duration-200"
          >
            Done
          </button>
          <button
            className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-all duration-200 active:scale-[0.98]"
            style={{
              background: "linear-gradient(to right, #f97316, #ea580c)",
              boxShadow: "0 0 20px rgba(249,115,22,0.25)",
            }}
          >
            Track now
          </button>
        </div>
      </div>
    )
  }

  // ─── Main Render ────────────────────────────────────────────────────────

  const stepRenderers: Record<string, () => React.JSX.Element> = {
    "0": renderStep0,
    "1": renderStep1,
    "2": renderStep2,
    "3": renderStep3,
    "4": renderStep4,
    "5": renderStep5,
    "6": renderStep6,
    success: renderSuccess,
  }

  return (
    <div className="relative rounded-2xl overflow-hidden" style={{ backgroundColor: "#0d0d1a" }}>
      {/* Progress bar */}
      {step !== "success" && typeof step === "number" && step > 0 && (
        <div className="h-1 w-full bg-[#1e1e32]">
          <div
            className="h-full transition-all duration-500 ease-out rounded-r-full"
            style={{
              width: `${progressPercent}%`,
              background: "linear-gradient(to right, #f97316, #ea580c)",
            }}
          />
        </div>
      )}

      {/* Step content */}
      <div className="transition-all duration-200">
        {stepRenderers[String(step)]?.()}
      </div>
    </div>
  )
}
