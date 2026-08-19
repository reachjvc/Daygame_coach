"use client"

/**
 * Tab 1 — your north star.
 *
 * One question, one big box. That is the whole screen, because the thing being
 * asked for is a paragraph and every extra control on the page is a reason not
 * to write it.
 *
 * Under the box sits the work the paragraph is worthless without: why it
 * matters, who you would have to become, the values that person lives by, your
 * identity and your affirmations. They are here rather than in the review
 * because they belong to the vision, and because the reason is the thing you
 * re-read on a day you do not feel like any of it.
 *
 * The ladder underneath is the escape hatch for anyone who cannot start from a
 * blank paragraph: seven short questions whose answers assemble into a draft
 * they can then rewrite. It stays closed by default so it never competes with
 * the box, and the assembled draft never overwrites what is already written
 * without saying so first.
 */

import { useState } from "react"
// Only utility icons here on purpose. Every semantic icon in this project
// already carries a meaning somewhere else, and reusing one in a new context
// needs sign-off, so the buttons on this page say what they do in words.
import { ChevronDown } from "lucide-react"
import type { NsPlan, NsReviewPrompt } from "@/src/goals/types"
import { HORIZON_CHOICES, HORIZON_SCREEN, VISION_RUNGS } from "@/src/goals/data/lifeMasteryWhy"
import {
  LADDER_INTRO,
  NORTH_STAR_REREAD,
  NORTH_STAR_SCREEN,
  STAR_PROMPTS,
  STAR_WHY_ID,
  STAR_WORK_INTRO,
} from "@/src/goals/data/northStar"
import {
  answerOf,
  assembleFromRungs,
  rungAnswer,
  rungsAnswered,
  starWorkAnswered,
  starWorkTotal,
} from "@/src/goals/northStarService"
import { ValuesWork, type ValuesHandlers } from "./ValuesWork"
import { SentenceBox } from "./SentenceBox"

/**
 * The prompts are laid out by hand rather than mapped, because the values list
 * sits between two of them. Looking one up by id keeps the copy in the data
 * file and fails loudly if a prompt is ever renamed out from under this file.
 */
function starPrompt(id: string): NsReviewPrompt {
  const prompt = STAR_PROMPTS.find((p) => p.id === id)
  if (!prompt) throw new Error(`Unknown star prompt "${id}"`)
  return prompt
}

function StarQuestion({ prompt, plan, onAnswer }: {
  prompt: NsReviewPrompt
  plan: NsPlan
  onAnswer: (promptId: string, text: string) => void
}) {
  return (
    <div>
      <label className="block text-[13px] text-zinc-200" htmlFor={`star-${prompt.id}`}>{prompt.question}</label>
      <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{prompt.help}</p>
      <textarea
        id={`star-${prompt.id}`}
        value={answerOf(plan, prompt.id)}
        onChange={(e) => onAnswer(prompt.id, e.target.value)}
        placeholder={prompt.placeholder}
        rows={prompt.list ? 4 : 3}
        aria-label={prompt.question}
        className="w-full mt-1.5 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-400/40 resize-y transition-colors"
      />
      {/* His own answer, a few words of it. Carried by the two prompts that
          read as the same question until you see them side by side. */}
      {prompt.example && (
        <p className="text-[10.5px] text-zinc-600 mt-1 leading-relaxed">{prompt.example}</p>
      )}
    </div>
  )
}

export function StarTab({
  plan,
  onStar,
  onHorizon,
  onRung,
  onAnswer,
  valuesHandlers,
  onNext,
}: {
  plan: NsPlan
  onStar: (text: string) => void
  onHorizon: (years: number) => void
  onRung: (rungId: string, text: string) => void
  onAnswer: (promptId: string, text: string) => void
  valuesHandlers: ValuesHandlers
  onNext: () => void
}) {
  const [ladderOpen, setLadderOpen] = useState(false)
  const [showExample, setShowExample] = useState(false)
  const [confirmOverwrite, setConfirmOverwrite] = useState(false)
  const written = plan.northStar.trim().length > 0
  const draft = assembleFromRungs(plan)
  const answered = rungsAnswered(plan)

  const useDraft = () => {
    if (written && !confirmOverwrite) {
      setConfirmOverwrite(true)
      return
    }
    onStar(draft)
    setConfirmOverwrite(false)
  }

  return (
    <div className="space-y-5">
      {/* The horizon decides what the whole paragraph means, so it is a choice
          on the page rather than a caption above it. */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-[12px] text-zinc-400">{HORIZON_SCREEN.question}</p>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {HORIZON_CHOICES.map((years) => {
            const option = HORIZON_SCREEN.options.find((o) => o.years === years)
            const active = plan.horizonYears === years
            return (
              <button
                key={years}
                onClick={() => onHorizon(years)}
                aria-pressed={active}
                title={option?.note}
                className={`text-[12px] px-3 py-1.5 rounded-lg border transition-colors ${
                  active ? "border-violet-400/50 bg-violet-500/15 text-violet-100" : "border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/25"
                }`}
              >
                {option?.label ?? `${years} years`}
              </button>
            )
          })}
          <span className="text-[11px] text-zinc-600">{HORIZON_SCREEN.note}</span>
        </div>
      </div>

      <div className="rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-500/[0.07] via-white/[0.03] to-transparent p-5">
        <h2 className="text-lg font-semibold text-white">{NORTH_STAR_SCREEN.question}</h2>
        <p className="text-[12.5px] text-zinc-400 mt-1.5 leading-relaxed">{NORTH_STAR_SCREEN.hint}</p>
        <p className="text-[12px] text-zinc-500 mt-2 leading-relaxed">{NORTH_STAR_SCREEN.help}</p>

        <textarea
          value={plan.northStar}
          onChange={(e) => onStar(e.target.value)}
          placeholder={NORTH_STAR_SCREEN.placeholder}
          rows={12}
          aria-label="Your north star"
          className="w-full mt-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-[15px] leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-400/40 resize-y transition-colors"
        />

        <div className="flex flex-wrap items-center justify-between gap-3 mt-2">
          <button onClick={() => setShowExample((v) => !v)} className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">
            {showExample ? "hide the example" : "show me an example"}
          </button>
          <span className="text-[11px] text-zinc-600 tabular-nums">
            {written ? `${plan.northStar.trim().split(/\s+/).length} words` : "nothing written yet"}
          </span>
        </div>
        {showExample && (
          <p className="mt-2 rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-3 text-[12.5px] text-zinc-500 leading-relaxed">
            {NORTH_STAR_SCREEN.example}
          </p>
        )}
        {written && <p className="text-[11px] text-zinc-500 mt-3 leading-relaxed">{NORTH_STAR_REREAD}</p>}
      </div>

      {/* The why sits on its own, directly under the paragraph. It is the one
          answer that decides whether any of the rest survives February. */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <StarQuestion prompt={starPrompt(STAR_WHY_ID)} plan={plan} onAnswer={onAnswer} />
      </div>

      {/* The values, between the purpose and the identity, because they are
          derived from the paragraph ("once you know your vision you make the
          list: what are the values I need to have to create that life") and
          because the identity below is written out of them.
          ONLY THE NOTICING HALF. Ordering them is on the review, once you have
          rated your areas and written what each one asks of you: on this screen
          you have a paragraph and nothing else, and ranking a list you are still
          discovering is guessing. */}
      <ValuesWork plan={plan} handlers={valuesHandlers} mode="elicit" />

      {/* Who you are, how you show up, and only then the gap.
          The order and the reason for it are in STAR_PROMPTS' own comment: the
          first two are declarations you condition, the third is what is missing
          between here and the paragraph, and running them together made them
          read as one question asked twice. */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-200">{STAR_WORK_INTRO.title}</h2>
          <span className="text-[11px] text-zinc-600 tabular-nums shrink-0">
            {starWorkAnswered(plan)} of {starWorkTotal()} answered
          </span>
        </div>
        <p className="text-[12px] text-zinc-500 mt-1 leading-relaxed">{STAR_WORK_INTRO.help}</p>

        <div className="mt-4 space-y-5">
          <StarQuestion prompt={starPrompt("identity_total")} plan={plan} onAnswer={onAnswer} />
          <StarQuestion prompt={starPrompt("conduct")} plan={plan} onAnswer={onAnswer} />
          <div className="pt-4 border-t border-white/10">
            <StarQuestion prompt={starPrompt("become")} plan={plan} onAnswer={onAnswer} />
          </div>
          <StarQuestion prompt={starPrompt("affirmations")} plan={plan} onAnswer={onAnswer} />
        </div>
      </div>

      {/* The ladder. Closed until asked for. */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
        <button
          onClick={() => setLadderOpen((v) => !v)}
          aria-expanded={ladderOpen}
          className="w-full flex items-center gap-2.5 px-5 py-4 text-left group"
        >
          <ChevronDown className={`size-4 shrink-0 text-zinc-500 transition-transform ${ladderOpen ? "" : "-rotate-90"}`} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">{LADDER_INTRO.title}</span>
            <span className="block text-[11.5px] text-zinc-500 mt-0.5">{LADDER_INTRO.help}</span>
          </span>
          {answered > 0 && <span className="text-[11px] text-zinc-500 tabular-nums shrink-0">{answered} of {VISION_RUNGS.length}</span>}
        </button>

        {ladderOpen && (
          <div className="px-5 pb-5 space-y-3">
            {VISION_RUNGS.map((rung) => (
              <div key={rung.id}>
                <label className="block text-[12.5px] text-zinc-300" htmlFor={`rung-${rung.id}`}>
                  {rung.question}
                </label>
                <p className="text-[11px] text-zinc-500 mt-0.5">{rung.help}</p>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="text-[12px] text-zinc-500 shrink-0 pt-1.5">{rung.lead}</span>
                  {/* Wrapped, because the box now carries a hint line under it
                      and this row is a flex. */}
                  <div className="flex-1 min-w-0">
                    <SentenceBox
                      id={`rung-${rung.id}`}
                      value={rungAnswer(plan, rung.id)}
                      onChange={(text) => onRung(rung.id, text)}
                      placeholder={rung.placeholder}
                      label={rung.question}
                      className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-400/40 resize-y transition-colors"
                    />
                  </div>
                </div>
              </div>
            ))}

            {draft.trim() && (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Your lines, assembled</p>
                <p className="text-[12.5px] text-zinc-400 leading-relaxed mt-1.5">{draft}</p>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <button
                    onClick={useDraft}
                    className="text-[12px] px-3 py-1.5 rounded-lg border border-violet-500/40 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25 transition-colors"
                  >
                    {confirmOverwrite ? "Replace what I wrote above?" : LADDER_INTRO.assemble}
                  </button>
                  {confirmOverwrite && (
                    <button onClick={() => setConfirmOverwrite(false)} className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">
                      keep what I wrote
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Always available. Gating this on the paragraph being written meant
          somebody who arrived wanting to jot three goals down had to write an
          essay first, and they do not; they leave. What is unfinished is listed
          in the "still to fill in" panel the shell renders under every tab. */}
      <div className="flex justify-end">
        <button
          onClick={onNext}
          className="text-sm font-medium px-4 py-2 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-100 hover:bg-violet-500/30 transition-colors"
        >
          Now break it into areas →
        </button>
      </div>
    </div>
  )
}
