"use client"

/**
 * The last step, and it is an act rather than a form.
 *
 * Everything before this is writing: the star, the 10s, the goals, the season,
 * the values. A plan that ends when the last box is filled ends without anybody
 * ever saying yes to it — and the difference between a document and a decision
 * is that somebody signed the second one.
 *
 * So it does three things, in this order:
 *
 *   1. reads the plan back, whole, in plain text — the thing being committed to
 *   2. asks what could go wrong, because a commitment made without naming that
 *      is the one that dies in March
 *   3. takes the commitment in the person's own words, and dates it
 *
 * The "do your goals aim at your 10" check and the whole-plan review prompts
 * live here too. They used to be a tab of their own called Review, which is a
 * strange thing to put after a plan and before nothing.
 */

import { useState } from "react"
import { Check } from "lucide-react"
import type { NsPlan } from "@/src/goals/types"
import { COMMIT_COPY } from "@/src/goals/data/northStar"
import { COMMIT_DATE_KEY, COMMIT_KEY } from "@/src/goals/data/northStarStart"
import { answerOf, formatTargetDate, planAsText, planCascade, weeklyLoad } from "@/src/goals/northStarService"

export interface CommitHandlers {
  onAnswer: (key: string, text: string) => void
}

export function CommitTab({
  plan,
  today,
  handlers,
  children,
  tools,
}: {
  plan: NsPlan
  today: string
  handlers: CommitHandlers
  /** The review work — what could stop you, and whether the goals aim at the 10. */
  children?: React.ReactNode
  /**
   * THE PLAN, EDITABLE, ON THE PAGE THAT ASKS YOU TO SIGN IT.
   *
   * Reading it back whole is when somebody sees the goal they no longer want,
   * the one they forgot to write, and the driver pointed at nothing — and until
   * now the only thing this page could do about any of that was send them four
   * steps back. Committing to a plan you cannot correct at the moment you are
   * reading it is how a plan gets signed and quietly abandoned instead.
   */
  tools?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const commitment = answerOf(plan, COMMIT_KEY)
  const committedOn = answerOf(plan, COMMIT_DATE_KEY)
  const cascade = planCascade(plan, today)
  const load = weeklyLoad(plan)
  const text = planAsText(plan, today)

  return (
    <div className="space-y-5">
      {/* What is being committed to, counted, then in full. */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4">
        <h2 className="text-sm font-semibold text-zinc-200">{COMMIT_COPY.title}</h2>
        <p className="text-[11.5px] text-zinc-400 mt-1 leading-relaxed">{COMMIT_COPY.help}</p>
        <p className="text-[12.5px] text-zinc-300 mt-3 tabular-nums">
          {COMMIT_COPY.summary(cascade.goals, cascade.milestones, Math.round(load.minutes / 6) / 10)}
        </p>
        {text.trim() && (
          <>
            <button
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              className="mt-2 text-[11.5px] text-zinc-500 hover:text-zinc-200 transition-colors"
            >
              {open ? COMMIT_COPY.hide : COMMIT_COPY.read}
            </button>
            {open && (
              <pre className="mt-2 text-[11.5px] text-zinc-400 leading-relaxed whitespace-pre-wrap font-sans max-h-96 overflow-y-auto border-l-2 border-white/10 pl-3">
                {text}
              </pre>
            )}
          </>
        )}
      </section>

      {/* Fix it here, while you are reading it. */}
      {tools}

      {/* What could go wrong, and whether the goals aim at the 10. */}
      {children}

      {/* The commitment itself. */}
      <section className="rounded-2xl border border-violet-400/25 bg-violet-500/[0.05] px-5 py-4">
        <h2 className="text-sm font-semibold text-violet-100">{COMMIT_COPY.commitTitle}</h2>
        <p className="text-[11.5px] text-zinc-400 mt-1 leading-relaxed">{COMMIT_COPY.commitHelp}</p>
        <textarea
          value={commitment}
          onChange={(e) => handlers.onAnswer(COMMIT_KEY, e.target.value)}
          rows={3}
          placeholder={COMMIT_COPY.commitPlaceholder}
          aria-label={COMMIT_COPY.commitTitle}
          className="w-full mt-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-[13px] text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-white/30 transition-colors leading-relaxed resize-y"
        />
        <div className="flex flex-wrap items-center gap-3 mt-2.5">
          {committedOn ? (
            <span className="inline-flex items-center gap-1.5 text-[11.5px] text-emerald-300/90">
              <Check className="size-3.5" />
              {COMMIT_COPY.committed(formatTargetDate(committedOn))}
            </span>
          ) : (
            <span className="text-[11px] text-zinc-500">{COMMIT_COPY.notYet}</span>
          )}
          <button
            onClick={() => handlers.onAnswer(COMMIT_DATE_KEY, committedOn ? "" : today)}
            disabled={!commitment.trim()}
            className={`ml-auto text-[12.5px] font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              committedOn
                ? "border-white/15 text-zinc-300 hover:bg-white/10"
                : "bg-violet-500/20 border-violet-500/40 text-violet-100 hover:bg-violet-500/30"
            }`}
          >
            {committedOn ? COMMIT_COPY.uncommit : COMMIT_COPY.commit}
          </button>
        </div>
      </section>
    </div>
  )
}
