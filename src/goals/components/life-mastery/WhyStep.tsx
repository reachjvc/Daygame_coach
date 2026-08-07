"use client"

/**
 * Step 1 of /test/life-mastery — the ladder that ends in a vision and a why.
 *
 * v2. The first version was a wall of thirteen questions: the picture, the
 * reasons and the person all on one screen, opening with the most abstract one
 * in the set. Every box read as a fresh blank page.
 *
 * This is one question per screen, concrete first. Each screen shows the
 * sentence opener in front of the box, so finishing a sentence is the whole
 * task, and the finished sentences stack up in a panel underneath. By the time
 * the abstract question arrives ("take the limits off") there is a page of
 * material to react to, and the screen after that hands the user their own
 * paragraph to edit rather than a blank box.
 */

import { useEffect, useMemo, useState } from "react"
import { Check } from "lucide-react"
import type { LifeMasteryPlan } from "@/src/goals/types"
import { answerOf, assembleVision, isAnswered, rungSentences, visionFrame } from "@/src/goals/lifeMasteryService"
import {
  HORIZON_CHOICES,
  HORIZON_QUOTE,
  HORIZON_SCREEN,
  VISION_DRAFT_SCREEN,
  VISION_RUNGS,
  WHY_PROMPTS,
  type VisionRung,
  type WhyPrompt,
} from "@/src/goals/data/lifeMasteryWhy"

/** How far out, then the rungs, then the assembled draft, then the why. */
const FRAME_SCREEN = 0
const FIRST_RUNG = 1
const DRAFT_SCREEN = FIRST_RUNG + VISION_RUNGS.length
const WHY_SCREEN = DRAFT_SCREEN + 1
const SCREEN_COUNT = WHY_SCREEN + 1

export function WhyStep({ plan, onAnswer, onHorizon, onDone }: {
  plan: LifeMasteryPlan
  onAnswer: (questionId: string, text: string) => void
  onHorizon: (years: number) => void
  onDone: () => void
}) {
  // Come back to where the work stopped rather than to the top of the ladder.
  // Only a first run opens on the horizon screen; choosing it again on every
  // visit would be a toll gate in front of your own writing.
  const [screen, setScreen] = useState(() => {
    if (isAnswered(plan, "vision")) return WHY_SCREEN
    const firstOpen = VISION_RUNGS.findIndex((r) => !isAnswered(plan, r.id))
    if (firstOpen === -1) return DRAFT_SCREEN
    return firstOpen === 0 && plan.updatedAt === null ? FRAME_SCREEN : FIRST_RUNG + firstOpen
  })

  const assembled = useMemo(() => assembleVision(plan), [plan])
  const vision = answerOf(plan, "vision")

  // Arriving at the draft with nothing written hands over the assembled lines.
  // An edited paragraph is never overwritten; the rebuild button below is the
  // only way back to the raw assembly.
  useEffect(() => {
    if (screen === DRAFT_SCREEN && !vision.trim() && assembled) onAnswer("vision", assembled)
  }, [screen, vision, assembled, onAnswer])

  const back = () => setScreen((s) => Math.max(0, s - 1))
  const next = () => setScreen((s) => Math.min(SCREEN_COUNT - 1, s + 1))

  return (
    <div className="space-y-5">
      <Dots
        screen={screen}
        plan={plan}
        onGo={setScreen}
      />

      {screen === FRAME_SCREEN ? (
        <HorizonScreen horizonYears={plan.horizonYears} onHorizon={onHorizon} onNext={next} />
      ) : screen < DRAFT_SCREEN ? (
        <RungScreen
          key={VISION_RUNGS[screen - FIRST_RUNG].id}
          rung={VISION_RUNGS[screen - FIRST_RUNG]}
          horizonYears={plan.horizonYears}
          onHorizon={onHorizon}
          value={answerOf(plan, VISION_RUNGS[screen - FIRST_RUNG].id)}
          onChange={(text) => onAnswer(VISION_RUNGS[screen - FIRST_RUNG].id, text)}
          onBack={back}
          onNext={next}
          isLast={screen === DRAFT_SCREEN - 1}
        />
      ) : screen === DRAFT_SCREEN ? (
        <DraftScreen
          horizonYears={plan.horizonYears}
          value={vision}
          assembled={assembled}
          onChange={(text) => onAnswer("vision", text)}
          onBack={back}
          onNext={next}
        />
      ) : (
        <WhyScreen plan={plan} onAnswer={onAnswer} onBack={back} onDone={onDone} />
      )}

      {screen > FRAME_SCREEN && screen < DRAFT_SCREEN && <SoFar plan={plan} upTo={screen - FIRST_RUNG} />}
    </div>
  )
}

/** Where you are on the ladder, and a way back to any rung you have passed. */
function Dots({ screen, plan, onGo }: { screen: number; plan: LifeMasteryPlan; onGo: (screen: number) => void }) {
  const label = screen === FRAME_SCREEN
    ? "How far out"
    : screen < DRAFT_SCREEN
      ? `Question ${screen} of ${VISION_RUNGS.length}`
      : screen === DRAFT_SCREEN ? "Your vision" : "Your why"
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        {VISION_RUNGS.map((r, i) => (
          <button
            key={r.id}
            onClick={() => onGo(i + FIRST_RUNG)}
            title={r.question}
            aria-label={`Go to: ${r.question}`}
            className={`size-2 rounded-full transition-colors ${
              i + FIRST_RUNG === screen ? "bg-violet-300" : isAnswered(plan, r.id) ? "bg-emerald-400/70" : "bg-white/15 hover:bg-white/35"
            }`}
          />
        ))}
        <span className="w-2" />
        {[DRAFT_SCREEN, WHY_SCREEN].map((s) => (
          <button
            key={s}
            onClick={() => onGo(s)}
            title={s === DRAFT_SCREEN ? "Your vision" : "Your why"}
            aria-label={s === DRAFT_SCREEN ? "Go to your vision" : "Go to your why"}
            className={`size-2 rounded-sm rotate-45 transition-colors ${
              s === screen ? "bg-violet-300" : isAnswered(plan, s === DRAFT_SCREEN ? "vision" : "why") ? "bg-emerald-400/70" : "bg-white/15 hover:bg-white/35"
            }`}
          />
        ))}
      </div>
      <span className="text-[11px] text-zinc-500">{label}</span>
    </div>
  )
}

/**
 * The frame, and the one control on the ladder. His vision horizon is 10, 20,
 * 30 years and up, and the 5 / 10 / 20 range is his own, from the perfect-day
 * exercise. Ten is the default because it is the number he names most.
 */
function Frame({ horizonYears, onHorizon }: { horizonYears: number; onHorizon: (years: number) => void }) {
  const [showQuote, setShowQuote] = useState(false)
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-[11px] uppercase tracking-wide text-zinc-500">{visionFrame(horizonYears)}</p>
        <div className="flex items-center gap-1">
          {HORIZON_CHOICES.map((years) => (
            <button
              key={years}
              onClick={() => onHorizon(years)}
              aria-label={`Picture your life ${years} years from now`}
              aria-pressed={years === horizonYears}
              className={`text-[10px] tabular-nums px-1.5 py-0.5 rounded border transition-colors ${
                years === horizonYears
                  ? "border-violet-400/40 bg-violet-500/15 text-violet-100"
                  : "border-white/10 text-zinc-600 hover:text-zinc-300 hover:border-white/25"
              }`}
            >
              {years}y
            </button>
          ))}
          <button onClick={() => setShowQuote((q) => !q)} className="text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors ml-1">
            why these
          </button>
        </div>
      </div>
      {showQuote && (
        <blockquote className="mt-2 border-l-2 border-violet-400/30 pl-3 text-[12px] text-zinc-400 italic leading-relaxed">
          {HORIZON_QUOTE.text}
          <span className="not-italic text-zinc-600"> ({HORIZON_QUOTE.videoId})</span>
          <span className="not-italic block text-zinc-500 mt-1">
            His goals run a year or less. The vision sits far past that, and it is allowed to be unrealistic.
          </span>
        </blockquote>
      )}
    </div>
  )
}

/**
 * Screen one. The horizon decides what every question after it means, so it
 * gets asked plainly instead of sitting in the corner as a caption.
 */
function HorizonScreen({ horizonYears, onHorizon, onNext }: {
  horizonYears: number
  onHorizon: (years: number) => void
  onNext: () => void
}) {
  const [showQuote, setShowQuote] = useState(false)
  return (
    <div className="rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-500/[0.07] via-white/[0.03] to-transparent p-6">
      <h2 className="text-xl font-semibold text-white leading-snug">{HORIZON_SCREEN.question}</h2>
      <p className="text-[13px] text-zinc-400 mt-1.5 leading-relaxed">{HORIZON_SCREEN.help}</p>

      <div className="grid gap-2 sm:grid-cols-3 mt-5">
        {HORIZON_SCREEN.options.map((option) => {
          const picked = option.years === horizonYears
          return (
            <button
              key={option.years}
              onClick={() => onHorizon(option.years)}
              aria-pressed={picked}
              className={`rounded-xl border p-3 text-left transition-colors ${
                picked ? "border-violet-400/50 bg-violet-500/15" : "border-white/10 bg-white/[0.02] hover:border-white/25"
              }`}
            >
              <span className={`block text-sm font-medium ${picked ? "text-white" : "text-zinc-300"}`}>{option.label}</span>
              <span className="block text-[11px] text-zinc-500 mt-1 leading-relaxed">{option.note}</span>
            </button>
          )
        })}
      </div>

      <p className="text-[12px] text-zinc-400 mt-4 leading-relaxed">{HORIZON_SCREEN.note}</p>
      <button onClick={() => setShowQuote((q) => !q)} className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors mt-2">
        {showQuote ? "Hide his words" : "His words"}
      </button>
      {showQuote && (
        <blockquote className="mt-2 border-l-2 border-violet-400/30 pl-3 text-[12px] text-zinc-400 italic leading-relaxed">
          {HORIZON_SCREEN.quote}
          <span className="not-italic text-zinc-600"> ({HORIZON_SCREEN.quoteVideoId})</span>
        </blockquote>
      )}

      <div className="flex items-center justify-end mt-6">
        <button
          onClick={onNext}
          className="text-sm font-medium px-4 py-2 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-100 hover:bg-violet-500/30 transition-colors"
        >
          {HORIZON_SCREEN.start} →
        </button>
      </div>
    </div>
  )
}

function RungScreen({ rung, horizonYears, onHorizon, value, onChange, onBack, onNext, isLast }: {
  rung: VisionRung
  horizonYears: number
  onHorizon: (years: number) => void
  value: string
  onChange: (text: string) => void
  onBack: () => void
  onNext: () => void
  isLast: boolean
}) {
  const [showExample, setShowExample] = useState(false)
  const [showQuote, setShowQuote] = useState(false)

  return (
    <div className="rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-500/[0.07] via-white/[0.03] to-transparent p-6">
      <Frame horizonYears={horizonYears} onHorizon={onHorizon} />
      <h2 className="text-xl font-semibold text-white mt-2 leading-snug">{rung.question}</h2>
      <p className="text-[13px] text-zinc-400 mt-1.5 leading-relaxed">{rung.help}</p>

      <div className="mt-5">
        <label htmlFor={`rung-${rung.id}`} className="block text-[15px] text-violet-200">{rung.lead}</label>
        <textarea
          id={`rung-${rung.id}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onNext() }}
          placeholder={rung.placeholder}
          rows={3}
          autoFocus
          className="w-full mt-1.5 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-400/40 resize-y transition-colors"
        />
        <p className="text-[11px] text-zinc-600 mt-1">Short lines are fine. One line per thought.</p>
      </div>

      <Extras
        example={rung.example}
        exampleLead={rung.lead}
        quote={rung.quote}
        quoteVideoId={rung.quoteVideoId}
        showExample={showExample}
        showQuote={showQuote}
        onExample={() => setShowExample((s) => !s)}
        onQuote={() => setShowQuote((s) => !s)}
      />

      <div className="flex items-center justify-between gap-3 mt-6">
        <button onClick={onBack} className="text-xs text-zinc-500 hover:text-white transition-colors">← back</button>
        <div className="flex items-center gap-4">
          {!value.trim() && (
            <button onClick={onNext} className="text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors">skip this one</button>
          )}
          <button
            onClick={onNext}
            className="text-sm font-medium px-4 py-2 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-100 hover:bg-violet-500/30 transition-colors"
          >
            {isLast ? "See your vision →" : "next →"}
          </button>
        </div>
      </div>
    </div>
  )
}

/** The lines written so far, already reading as the vision they will become. */
function SoFar({ plan, upTo }: { plan: LifeMasteryPlan; upTo: number }) {
  const sentences = VISION_RUNGS.slice(0, upTo + 1).flatMap((r) => rungSentences(r.lead, answerOf(plan, r.id)))
  if (sentences.length === 0) return null
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <p className="text-[11px] text-zinc-500 mb-1.5">Your vision, so far</p>
      <p className="text-[13px] text-zinc-300 leading-relaxed">{sentences.join(" ")}</p>
    </div>
  )
}

function DraftScreen({ horizonYears, value, assembled, onChange, onBack, onNext }: {
  horizonYears: number
  value: string
  assembled: string
  onChange: (text: string) => void
  onBack: () => void
  onNext: () => void
}) {
  return (
    <div className="rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-500/[0.07] via-white/[0.03] to-transparent p-6">
      <p className="text-[11px] uppercase tracking-wide text-zinc-500">{visionFrame(horizonYears)}</p>
      <h2 className="text-xl font-semibold text-white mt-2 leading-snug">{VISION_DRAFT_SCREEN.question}</h2>
      <p className="text-[13px] text-zinc-400 mt-1.5 leading-relaxed">{VISION_DRAFT_SCREEN.help}</p>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={VISION_DRAFT_SCREEN.placeholder}
        rows={10}
        aria-label="Your vision"
        className="w-full mt-4 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-400/40 resize-y transition-colors leading-relaxed"
      />

      <div className="flex items-center justify-between gap-3 mt-4">
        <button onClick={onBack} className="text-xs text-zinc-500 hover:text-white transition-colors">← back</button>
        <div className="flex items-center gap-4">
          {assembled && assembled !== value && (
            <button
              onClick={() => onChange(assembled)}
              title="Replaces what is in the box with your seven answers, joined up"
              className="text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors"
            >
              rebuild from my answers
            </button>
          )}
          <button
            onClick={onNext}
            className="text-sm font-medium px-4 py-2 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-100 hover:bg-violet-500/30 transition-colors"
          >
            Now the why →
          </button>
        </div>
      </div>
    </div>
  )
}

function WhyScreen({ plan, onAnswer, onBack, onDone }: {
  plan: LifeMasteryPlan
  onAnswer: (questionId: string, text: string) => void
  onBack: () => void
  onDone: () => void
}) {
  const ready = isAnswered(plan, "why")
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-[11px] text-zinc-500 mb-1">Your vision</p>
        <p className="text-[13px] text-zinc-300 leading-relaxed whitespace-pre-line">
          {answerOf(plan, "vision").trim() || "Nothing written yet. Go back and the ladder will build it."}
        </p>
      </div>

      {WHY_PROMPTS.map((prompt) => (
        <WhyPromptCard
          key={prompt.id}
          prompt={prompt}
          value={answerOf(plan, prompt.id)}
          onChange={(text) => onAnswer(prompt.id, text)}
        />
      ))}

      <div className="flex items-center justify-between gap-3">
        <button onClick={onBack} className="text-xs text-zinc-500 hover:text-white transition-colors">← back</button>
        <div className="flex items-center gap-4">
          {/* Soft, on purpose. The step rail lets you go anywhere already, so a
              hard gate here would only be theatre. */}
          {!ready && <span className="text-[11px] text-zinc-500">The why is what this step is for. You can come back to it.</span>}
          <button
            onClick={onDone}
            className="text-sm font-medium px-4 py-2 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-100 hover:bg-violet-500/30 transition-colors"
          >
            Take me to my areas →
          </button>
        </div>
      </div>
    </div>
  )
}

function WhyPromptCard({ prompt, value, onChange }: {
  prompt: WhyPrompt
  value: string
  onChange: (text: string) => void
}) {
  const [showExample, setShowExample] = useState(false)
  const [showQuote, setShowQuote] = useState(false)
  const answered = value.trim().length > 0

  return (
    <div className={`rounded-2xl border p-5 transition-colors ${answered ? "border-emerald-400/20 bg-white/[0.03]" : "border-violet-400/25 bg-gradient-to-br from-violet-500/[0.07] via-white/[0.03] to-transparent"}`}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-medium text-white leading-snug">{prompt.question}</h2>
        {answered && <Check className="size-4 shrink-0 text-emerald-400 mt-0.5" />}
      </div>
      <p className="text-[13px] text-zinc-400 mt-1.5 leading-relaxed">{prompt.help}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={prompt.placeholder}
        rows={4}
        aria-label={prompt.question}
        className="w-full mt-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-400/40 resize-y transition-colors"
      />
      <Extras
        example={prompt.example}
        quote={prompt.quote}
        quoteVideoId={prompt.quoteVideoId}
        showExample={showExample}
        showQuote={showQuote}
        onExample={() => setShowExample((s) => !s)}
        onQuote={() => setShowQuote((s) => !s)}
      />
    </div>
  )
}

/** The two things every question can show on request: an answer, and his words. */
function Extras({ example, exampleLead, quote, quoteVideoId, showExample, showQuote, onExample, onQuote }: {
  example: string
  exampleLead?: string
  quote?: string
  quoteVideoId?: string
  showExample: boolean
  showQuote: boolean
  onExample: () => void
  onQuote: () => void
}) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mt-2">
        <button onClick={onExample} className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">
          {showExample ? "Hide the example" : "Show an example"}
        </button>
        {quote && (
          <button onClick={onQuote} className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">
            {showQuote ? "Hide his words" : "His words"}
          </button>
        )}
      </div>
      {showExample && (
        <p className="mt-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-[12px] text-zinc-400 leading-relaxed whitespace-pre-line">
          {exampleLead && <span className="text-zinc-600">{exampleLead} </span>}
          {example}
        </p>
      )}
      {showQuote && quote && (
        <blockquote className="mt-2 border-l-2 border-violet-400/30 pl-3 text-[12px] text-zinc-400 italic leading-relaxed">
          {quote}
          {quoteVideoId && <span className="not-italic text-zinc-600"> ({quoteVideoId})</span>}
        </blockquote>
      )}
    </>
  )
}
