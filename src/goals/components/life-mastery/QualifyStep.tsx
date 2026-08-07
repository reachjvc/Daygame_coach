"use client"

/**
 * Step 3 of /test/life-mastery — a why under every goal, then the rest.
 *
 * The order is his: goal first, reasons written directly underneath it. The
 * why box asks a QUESTION rather than showing the word "why", because nobody
 * answers a blank box, and the question changes every time you ask for another
 * angle. Everything below the why (the cost, the date, the two ratings, the
 * sentence) is the qualification pass, and it is optional per goal.
 */

import { useEffect, useState } from "react"
import { Check, ChevronDown, RotateCcw } from "lucide-react"
import type { LifeMasteryPlan, SimpleGoal } from "@/src/goals/types"
import {
  answerOf,
  goalHasWhy,
  goalIsQualified,
  planProgress,
  qualifyWarnings,
  resolveAreas,
  suggestSentence,
} from "@/src/goals/lifeMasteryService"
import { GOAL_WHY_ANGLES, IDENTITY_PROMPTS, PAIN_WHY_QUESTION } from "@/src/goals/data/lifeMasteryWhy"

export function QualifyStep({ plan, onUpdateGoal, onAnswer, onBackToAreas }: {
  plan: LifeMasteryPlan
  onUpdateGoal: (goalId: string, patch: Partial<Omit<SimpleGoal, "id">>) => void
  onAnswer: (questionId: string, text: string) => void
  onBackToAreas: () => void
}) {
  const areas = resolveAreas(plan)
  const areaOf = new Map(areas.map((a) => [a.id, a]))
  const progress = planProgress(plan)
  const [openId, setOpenId] = useState<string | null>(null)
  const [angles, setAngles] = useState<Record<string, number>>({})

  // Open the first goal that still has no why, once, on arrival. After that the
  // card the user is typing in stays open no matter what they type.
  useEffect(() => {
    if (openId !== null || plan.goals.length === 0) return
    setOpenId((plan.goals.find((g) => !goalHasWhy(g)) ?? plan.goals[0]).id)
  }, [openId, plan.goals])

  if (plan.goals.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
        <p className="text-sm text-zinc-300">No goals yet.</p>
        <p className="text-[12px] text-zinc-500 mt-1">Write a few on the areas screen and they show up here, one at a time.</p>
        <button
          onClick={onBackToAreas}
          className="mt-4 text-[12px] px-3.5 py-1.5 rounded-lg border border-violet-500/40 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25 transition-colors"
        >
          Go to your areas
        </button>
      </div>
    )
  }

  const nextWithoutWhy = (afterId: string) => {
    const rest = plan.goals.slice(plan.goals.findIndex((g) => g.id === afterId) + 1)
    return (rest.find((g) => !goalHasWhy(g)) ?? plan.goals.find((g) => !goalHasWhy(g)))?.id ?? null
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-200">Now say why each one matters</h2>
          <span className="text-[11px] text-zinc-500 tabular-nums shrink-0">{progress.goalsWithWhy} of {progress.goals} have a why</span>
        </div>
        <p className="text-[12px] text-zinc-500 mt-1 leading-relaxed">
          Your reasons are the fuel. On a day you do not feel like it, the reason is the thing you re-read.
          Write one real sentence per goal. The rest of each card is optional, and it makes the goal harder to wriggle out of.
        </p>
      </div>

      <div className="space-y-2">
        {plan.goals.map((goal) => {
          const area = areaOf.get(goal.areaId)
          const open = openId === goal.id
          return (
            <GoalCard
              key={goal.id}
              goal={goal}
              areaLabel={area?.label ?? ""}
              areaColor={area?.color ?? "#a1a1aa"}
              open={open}
              onToggle={() => setOpenId(open ? null : goal.id)}
              angle={angles[goal.id] ?? 0}
              onAngle={(next) => setAngles((prev) => ({ ...prev, [goal.id]: next }))}
              onUpdate={(patch) => onUpdateGoal(goal.id, patch)}
              onNext={() => setOpenId(nextWithoutWhy(goal.id))}
            />
          )
        })}
      </div>

      <IdentityBlock plan={plan} onAnswer={onAnswer} />
      <PlanReadBack plan={plan} />
    </div>
  )
}

/**
 * Moved here from step 1. Who you are is a different question from where you
 * are going, and asking both on one screen was why that screen read as a pile.
 * It sits next to the goals because that is what a declared identity changes.
 */
function IdentityBlock({ plan, onAnswer }: { plan: LifeMasteryPlan; onAnswer: (questionId: string, text: string) => void }) {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="text-sm font-semibold text-zinc-200">Who you are being</h2>
      <p className="text-[12px] text-zinc-500 mt-1 leading-relaxed">
        Optional, and worth the ten minutes. You will not outperform who you believe you are, so decide the person and the behaviour reorganises around the decision.
      </p>
      <div className="mt-3 space-y-2">
        {IDENTITY_PROMPTS.map((prompt) => {
          const value = answerOf(plan, prompt.id)
          const answered = value.trim().length > 0
          const open = openId === prompt.id
          return (
            <div key={prompt.id} className={`rounded-xl border p-3 ${answered ? "border-emerald-400/20 bg-white/[0.02]" : "border-white/10 bg-white/[0.02]"}`}>
              <button onClick={() => setOpenId(open ? null : prompt.id)} className="w-full flex items-start gap-2.5 text-left group">
                <ChevronDown className={`size-4 mt-0.5 shrink-0 text-zinc-500 transition-transform ${open ? "" : "-rotate-90"}`} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-zinc-200 group-hover:text-white transition-colors">{prompt.question}</span>
                  {!open && answered && <span className="block text-[11px] text-zinc-500 truncate mt-0.5">{value.trim().split("\n")[0]}</span>}
                </span>
                {answered && <Check className="size-4 shrink-0 text-emerald-400" />}
              </button>
              {open && (
                <div className="mt-2 ml-6.5">
                  <p className="text-[12px] text-zinc-400 leading-relaxed">{prompt.help}</p>
                  <textarea
                    value={value}
                    onChange={(e) => onAnswer(prompt.id, e.target.value)}
                    placeholder={prompt.placeholder}
                    rows={4}
                    aria-label={prompt.question}
                    className="w-full mt-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-400/40 resize-y transition-colors"
                  />
                  <p className="mt-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-[12px] text-zinc-500 leading-relaxed whitespace-pre-line">
                    {prompt.example}
                  </p>
                  {prompt.quote && (
                    <blockquote className="mt-2 border-l-2 border-violet-400/30 pl-3 text-[12px] text-zinc-500 italic leading-relaxed">
                      {prompt.quote}
                      {prompt.quoteVideoId && <span className="not-italic text-zinc-600"> ({prompt.quoteVideoId})</span>}
                    </blockquote>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function GoalCard({ goal, areaLabel, areaColor, open, onToggle, angle, onAngle, onUpdate, onNext }: {
  goal: SimpleGoal
  areaLabel: string
  areaColor: string
  open: boolean
  onToggle: () => void
  angle: number
  onAngle: (next: number) => void
  onUpdate: (patch: Partial<Omit<SimpleGoal, "id">>) => void
  onNext: () => void
}) {
  const hasWhy = goalHasWhy(goal)
  const qualified = goalIsQualified(goal)
  const warnings = qualifyWarnings(goal)
  const currentAngle = GOAL_WHY_ANGLES[angle % GOAL_WHY_ANGLES.length]
  const suggestion = suggestSentence(goal)

  return (
    <div className={`rounded-2xl border transition-colors ${
      qualified ? "border-emerald-400/25 bg-emerald-500/[0.04]" : hasWhy ? "border-white/15 bg-white/[0.03]" : "border-white/10 bg-white/[0.02]"
    }`}>
      <button onClick={onToggle} className="w-full flex items-center gap-2.5 p-4 text-left group">
        <ChevronDown className={`size-4 shrink-0 text-zinc-500 transition-transform ${open ? "" : "-rotate-90"}`} />
        <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: areaColor }} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-zinc-100 group-hover:text-white transition-colors truncate">{goal.title}</span>
          <span className="block text-[10px] text-zinc-600 truncate">
            {areaLabel}
            {hasWhy && !open && ` · ${goal.why.trim().split("\n")[0]}`}
          </span>
        </span>
        {hasWhy ? (
          <span className={`inline-flex items-center gap-1 text-[10px] shrink-0 ${qualified ? "text-emerald-300" : "text-zinc-500"}`}>
            <Check className="size-3.5" />
            {qualified ? "qualified" : "why written"}
          </span>
        ) : (
          <span className="text-[10px] text-amber-300/80 shrink-0">no why yet</span>
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          {/* The why. One question at a time, changeable when it runs dry. */}
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[13px] text-zinc-200">{currentAngle.question}</p>
              <button
                onClick={() => onAngle(angle + 1)}
                className="inline-flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
              >
                <RotateCcw className="size-3" />
                another angle
              </button>
            </div>
            <textarea
              value={goal.why}
              onChange={(e) => onUpdate({ why: e.target.value })}
              placeholder="Write it the way you would say it out loud"
              rows={3}
              aria-label={`Why you want: ${goal.title}`}
              className="w-full mt-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-400/40 resize-y transition-colors"
            />
            <div className="flex flex-wrap gap-1 mt-1.5">
              {GOAL_WHY_ANGLES.map((a, i) => (
                <button
                  key={a.id}
                  onClick={() => onAngle(i)}
                  title={a.question}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                    i === angle % GOAL_WHY_ANGLES.length
                      ? "border-violet-400/40 bg-violet-500/15 text-violet-100"
                      : "border-white/10 text-zinc-500 hover:text-zinc-300 hover:border-white/25"
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* The cost of not doing it. His second flavour of reason. */}
          <div>
            <p className="text-[13px] text-zinc-200">{PAIN_WHY_QUESTION}</p>
            <textarea
              value={goal.painWhy}
              onChange={(e) => onUpdate({ painWhy: e.target.value })}
              placeholder="What it takes from you if this year looks like the last one"
              rows={2}
              aria-label={`What it costs you to skip: ${goal.title}`}
              className="w-full mt-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-400/40 resize-y transition-colors"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1.5" htmlFor={`date-${goal.id}`}>By when?</label>
              <input
                id={`date-${goal.id}`}
                type="date"
                value={goal.targetDate ?? ""}
                onChange={(e) => onUpdate({ targetDate: e.target.value || null })}
                className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-violet-400/40 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <Rating
                label="Do you believe you can do it?"
                value={goal.beliefLevel}
                color={areaColor}
                onChange={(v) => onUpdate({ beliefLevel: v })}
                ariaLabel={`Belief that you can do ${goal.title}, 0 to 10`}
              />
              <Rating
                label="How much do you want it?"
                value={goal.desireLevel}
                color={areaColor}
                onChange={(v) => onUpdate({ desireLevel: v })}
                ariaLabel={`How much you want ${goal.title}, 0 to 10`}
              />
            </div>
          </div>

          {warnings.map((w) => (
            <p key={w} className="text-[11px] text-amber-300/90 leading-relaxed">{w}</p>
          ))}

          {/* The sentence. "I" takes responsibility, "will" makes it a
              decision, and "easily" changes how it feels to say. */}
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <label className="text-[11px] text-zinc-400" htmlFor={`sentence-${goal.id}`}>The goal as one sentence</label>
              {suggestion && suggestion !== goal.sentence && (
                <button
                  onClick={() => onUpdate({ sentence: suggestion })}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
                >
                  {goal.sentence.trim() ? "rewrite from the title" : "write it for me"}
                </button>
              )}
            </div>
            <input
              id={`sentence-${goal.id}`}
              value={goal.sentence}
              onChange={(e) => onUpdate({ sentence: e.target.value })}
              placeholder="I will easily…"
              className="w-full mt-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-400/40 transition-colors"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={onNext}
              className="text-[12px] px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-zinc-300 hover:text-white hover:border-white/25 transition-colors"
            >
              Next goal without a why
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * The slider shows 5 while the value is unset, so the readout says "–/10" and
 * the track is dimmed. Dragging to exactly 5 fires no change event, so the
 * readout doubles as a button that confirms the value under the thumb.
 */
function Rating({ label, value, color, onChange, ariaLabel }: {
  label: string
  value: number | null
  color: string
  onChange: (value: number) => void
  ariaLabel: string
}) {
  return (
    <div>
      <p className="text-[11px] text-zinc-400 mb-1">{label}</p>
      <div className="flex items-center gap-2.5">
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={value ?? 5}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={ariaLabel}
          className={`flex-1 min-w-0 ${value == null ? "opacity-40" : ""}`}
          style={{ accentColor: value == null ? "#52525b" : color }}
        />
        <button
          onClick={() => onChange(value ?? 5)}
          // The visible text is "–/10", which names nothing on its own.
          aria-label={value == null ? `Set “${label}” to 5` : `“${label}” is ${value} out of 10`}
          title={value == null ? "Click to set 5, or drag to rate" : undefined}
          className={`text-[11px] tabular-nums w-11 text-right shrink-0 ${value == null ? "text-zinc-500 underline decoration-dotted hover:text-white" : "text-zinc-300"}`}
        >
          {value != null ? `${value}/10` : "–/10"}
        </button>
      </div>
    </div>
  )
}

/** The plan read back as plain text, which is the form you can actually re-read. */
function PlanReadBack({ plan }: { plan: LifeMasteryPlan }) {
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle")
  const areas = new Map(resolveAreas(plan).map((a) => [a.id, a]))
  const vision = answerOf(plan, "vision").trim()
  const why = answerOf(plan, "why").trim()
  const cost = answerOf(plan, "cost").trim()
  const beings = IDENTITY_PROMPTS
    .map((p) => ({ p, value: answerOf(plan, p.id).trim() }))
    .filter((x) => x.value)

  const text = [
    vision && `MY VISION\n${vision}`,
    why && `WHY I WANT IT\n${why}`,
    cost && `WHAT IT COSTS ME IF NOTHING CHANGES\n${cost}`,
    beings.length > 0 && `WHO I AM BEING\n${beings.map((x) => `${x.p.question}\n${x.value}`).join("\n\n")}`,
    plan.goals.length > 0 && `MY GOALS\n${plan.goals.map((g) => {
      const lines = [`${areas.get(g.areaId)?.label ?? ""}: ${g.sentence.trim() || g.title}`]
      if (g.why.trim()) lines.push(`  Why: ${g.why.trim()}`)
      if (g.painWhy.trim()) lines.push(`  Cost of not: ${g.painWhy.trim()}`)
      return lines.join("\n")
    }).join("\n\n")}`,
  ].filter(Boolean).join("\n\n")

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied("done")
    } catch {
      setCopied("failed")
    }
  }

  return (
    <div className="rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-500/[0.07] via-white/[0.03] to-transparent p-5">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h2 className="text-sm font-semibold text-zinc-200">Your plan, read back</h2>
        <button onClick={copy} className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors shrink-0">
          {copied === "done" ? "copied" : copied === "failed" ? "your browser blocked the copy" : "copy as text"}
        </button>
      </div>
      {text ? (
        <pre className="text-[12px] text-zinc-400 leading-relaxed whitespace-pre-wrap font-sans">{text}</pre>
      ) : (
        <p className="text-[12px] text-zinc-500">Write your vision and a goal or two and they appear here.</p>
      )}
    </div>
  )
}
