"use client"

/**
 * Tab 4 — where you actually are, and whether the plan points at it.
 *
 * The order matters and it is not the order people expect. The 10 is written
 * BEFORE the rating, because a number with no picture behind it is a mood, and
 * because somebody else's 10 in your health is not yours. Only then does the
 * rating mean anything, and only then can the question "do your goals actually
 * aim at that" be asked with a straight face.
 *
 * The daily strip exists so the two-week number has something to disagree with.
 * A remembered fortnight and a lived one are different things and the gap is
 * the interesting part.
 */

import { useState } from "react"
import { Check, ChevronDown } from "lucide-react"
import type { NsArea, NsPlan } from "@/src/goals/types"
import {
  AREA_REVIEW_COPY,
  GAP_WARNING,
  NS_FLOOR,
  NS_VALUE_SUGGESTIONS,
  REVIEW_INTRO,
  REVIEW_PROMPTS,
} from "@/src/goals/data/northStar"
import {
  answerOf,
  areaReview,
  areasWithoutValueSupport,
  dailyAverage,
  dailyCount,
  goalsInArea,
  wheelRatings,
} from "@/src/goals/northStarService"
import { AreaWheel } from "./AreaWheel"
import { ValuesWork, type ValuesHandlers } from "./ValuesWork"

export interface ReviewHandlers {
  onAreaReview: (areaId: string, patch: Partial<import("@/src/goals/types").NsAreaReview>) => void
  onDailyRating: (date: string, areaId: string, score: number) => void
  onAnswer: (promptId: string, text: string) => void
  onGoToGoals: () => void
  onGoToNow: () => void
}

export function ReviewTab({ plan, today, handlers, valuesHandlers }: {
  plan: NsPlan
  today: string
  handlers: ReviewHandlers
  valuesHandlers: ValuesHandlers
}) {
  // Nothing open to begin with. Defaulting to the first area meant the wheel's
  // first sector arrived already expanded, so clicking the most obvious thing on
  // the screen CLOSED it — the wheel is a toggle, and it was pre-toggled.
  const [openId, setOpenId] = useState<string | null>(null)
  const ratings = wheelRatings(plan, today)
  const goalCounts = Object.fromEntries(plan.areas.map((a) => [a.id, goalsInArea(plan, a.id).length]))
  const underFloor = plan.areas.filter((a) => ratings[a.id] != null && ratings[a.id] < NS_FLOOR)
  /**
   * His client wanted to change his health and had never written health on his
   * values list: "no wonder you're not creating long-term change here". This is
   * that check, and it is the one thing the values list can tell you that a
   * rating cannot.
   */
  const unsupported = areasWithoutValueSupport(plan, today)

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-sm font-semibold text-zinc-200">{REVIEW_INTRO.title}</h2>
        <p className="text-[12px] text-zinc-500 mt-1 leading-relaxed">{REVIEW_INTRO.help}</p>
        <p className="text-[12px] text-zinc-500 mt-1.5 leading-relaxed">{REVIEW_INTRO.dailyNote}</p>
        <p className="text-[11.5px] text-zinc-600 mt-1.5 leading-relaxed">{REVIEW_INTRO.floorNote}</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <AreaWheel areas={plan.areas} ratings={ratings} goalCounts={goalCounts} activeId={openId} onPick={(id) => setOpenId(id === openId ? null : id)} />
        {underFloor.length > 0 && (
          <p className="text-[11.5px] text-amber-300/80 text-center mt-2">
            Under a seven right now: {underFloor.map((a) => a.label).join(", ")}.
          </p>
        )}
        {unsupported.length > 0 && (
          <p className="text-[11.5px] text-zinc-500 text-center mt-1.5 leading-relaxed">
            And nothing in your values list points at{" "}
            <span className="text-zinc-300">{unsupported.map((a) => a.label).join(", ")}</span>. That is usually the
            reason an area stays where it is. Somebody who is fit has fitness high on their list.
          </p>
        )}
      </div>

      <div className="space-y-2">
        {plan.areas.map((area) => (
          <AreaReviewCard
            key={area.id}
            area={area}
            plan={plan}
            today={today}
            open={openId === area.id}
            onToggle={() => setOpenId(openId === area.id ? null : area.id)}
            handlers={handlers}
          />
        ))}
      </div>

      {/* Ordering the values happens HERE, not on the opening screen.
          On the north star tab you have written one paragraph, so a ranked list
          is guesswork. By now you have rated twelve areas, written what a 10
          looks like in each, said what each one asks of you and set goals, so
          the pool is your whole plan and the order means something. */}
      <ValuesWork plan={plan} handlers={valuesHandlers} mode="order" />

      {/* Whole-life. The per-area answers roll up into these. */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-sm font-semibold text-zinc-200">And across the whole of it</h2>
        <p className="text-[12px] text-zinc-500 mt-1 leading-relaxed">
          You have answered these one area at a time. Now answer them for the person, because the person is what the areas have in common.
        </p>

        <div className="mt-5 space-y-3">
          {REVIEW_PROMPTS.map((p) => (
            <div key={p.id}>
              <label className="block text-[12.5px] text-zinc-200" htmlFor={`prompt-${p.id}`}>{p.question}</label>
              <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{p.help}</p>
              <textarea
                id={`prompt-${p.id}`}
                value={answerOf(plan, p.id)}
                onChange={(e) => handlers.onAnswer(p.id, e.target.value)}
                placeholder={p.placeholder}
                rows={p.list ? 4 : 3}
                aria-label={p.question}
                className="w-full mt-1.5 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-400/40 resize-y transition-colors"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AreaReviewCard({ area, plan, today, open, onToggle, handlers }: {
  area: NsArea
  plan: NsPlan
  today: string
  open: boolean
  onToggle: () => void
  handlers: ReviewHandlers
}) {
  const review = areaReview(plan, area.id)
  const goals = goalsInArea(plan, area.id)
  const avg = dailyAverage(plan, area.id, today)
  const days = dailyCount(plan, area.id, today)
  const hasTen = review.ten.trim().length > 0
  const answered = hasTen && review.fortnight != null

  return (
    <div className={`rounded-2xl border transition-colors ${answered ? "border-white/15 bg-white/[0.03]" : "border-white/10 bg-white/[0.02]"}`}>
      <button onClick={onToggle} aria-expanded={open} className="w-full flex items-center gap-2.5 p-4 text-left group">
        <ChevronDown className={`size-4 shrink-0 text-zinc-500 transition-transform ${open ? "" : "-rotate-90"}`} />
        <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: area.color }} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-zinc-100 group-hover:text-white transition-colors">{area.label}</span>
          <span className="block text-[10.5px] text-zinc-600 truncate">
            {hasTen ? review.ten.trim() : "no picture of a 10 yet"}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className={`block text-[13px] tabular-nums ${review.fortnight == null ? "text-zinc-600" : review.fortnight < NS_FLOOR ? "text-amber-300" : "text-zinc-200"}`}>
            {review.fortnight != null ? `${review.fortnight}/10` : "–/10"}
          </span>
          {avg != null && <span className="block text-[9.5px] text-zinc-600 tabular-nums">daily {avg}</span>}
        </span>
        {answered && <Check className="size-4 shrink-0 text-emerald-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          {/* The 10 and the rating are written on the "Where you are" tab, which
              now comes before the plan. Repeating the inputs here would be two
              places to change one number, so this recaps them and points back. */}
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-[11px] text-zinc-400">Your 10 here</span>
              <span className={`text-[11px] tabular-nums ${review.fortnight == null ? "text-zinc-600" : review.fortnight < NS_FLOOR ? "text-amber-300" : "text-zinc-300"}`}>
                {review.fortnight != null ? `you rated it ${review.fortnight}/10` : "not rated yet"}
                {avg != null && <span className="text-zinc-600"> · daily average {avg} over {days} {days === 1 ? "day" : "days"}</span>}
              </span>
              <button onClick={handlers.onGoToNow} className="ml-auto text-[10.5px] text-zinc-500 hover:text-zinc-200 underline decoration-dotted transition-colors shrink-0">
                change it
              </button>
            </div>
            <p className="text-[12px] mt-1 leading-relaxed" style={{ color: hasTen ? "#d4d4d8" : "#71717a" }}>
              {hasTen ? review.ten.trim() : "You have not written what a 10 looks like here yet."}
            </p>
          </div>

          {/* 3. Do the goals aim at the 10? */}
          <div>
            <p className="text-[13px] text-zinc-200">{AREA_REVIEW_COPY.goalsAim.question}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{AREA_REVIEW_COPY.goalsAim.help}</p>
            {goals.length === 0 ? (
              <div className="mt-1.5 rounded-lg border border-amber-400/25 bg-amber-500/[0.06] px-3 py-2">
                <p className="text-[11.5px] text-amber-100/90">{GAP_WARNING}</p>
                <button onClick={handlers.onGoToGoals} className="mt-1 text-[11px] text-zinc-300 underline decoration-dotted hover:text-white transition-colors">
                  Add one on the goals tab
                </button>
              </div>
            ) : (
              <>
                <ul className="mt-1.5 space-y-0.5">
                  {goals.map((g) => (
                    <li key={g.id} className="flex items-baseline gap-2 text-[12px] text-zinc-300">
                      <span className="text-[10px] shrink-0" aria-hidden>{g.type === "habit_ramp" ? "🔁" : g.type === "milestone_ladder" ? "🎯" : "🏁"}</span>
                      <span className="min-w-0">{g.sentence.trim() || g.title}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {(["yes", "no"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => handlers.onAreaReview(area.id, { goalsAim: review.goalsAim === v ? null : v })}
                      aria-pressed={review.goalsAim === v}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                        review.goalsAim === v ? "border-white/40 bg-white/10 text-white" : "border-white/10 text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {v === "yes" ? "Yes, they aim at it" : "No, they do not"}
                    </button>
                  ))}
                  {review.goalsAim === "no" && (
                    <button onClick={handlers.onGoToGoals} className="text-[11px] text-zinc-300 underline decoration-dotted hover:text-white transition-colors">
                      Go and change them
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* 4. The rest of the area's answers, read back.
              The purpose, the values it asks of you, who you are in it and what
              might stop you are all written inside the area itself now, one
              click from its rating. Repeating the inputs here would be two
              places to change one answer, which is the rule the 10 and the
              rating already follow. */}
          {(review.purpose.trim() || review.values.length > 0 || review.identity.trim() || review.blockers.trim()) && (
            <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 space-y-1.5">
              {review.purpose.trim() && (
                <p className="text-[11.5px] text-zinc-300 leading-relaxed">
                  <span className="text-zinc-500">Why it matters: </span>{review.purpose.trim()}
                </p>
              )}
              {review.values.length > 0 && (
                <p className="text-[11.5px] text-zinc-300">
                  <span className="text-zinc-500">Asks you to value: </span>{review.values.join(" · ")}
                </p>
              )}
              {review.identity.trim() && (
                <p className="text-[11.5px] text-zinc-300">
                  <span className="text-zinc-500">Who you are here: </span>{review.identity.trim()}
                </p>
              )}
              {review.blockers.trim() && (
                <p className="text-[11.5px] text-zinc-300 leading-relaxed">
                  <span className="text-zinc-500">What might stop you: </span>{review.blockers.trim()}
                </p>
              )}
              <button onClick={handlers.onGoToNow} className="text-[10.5px] text-zinc-500 hover:text-zinc-200 underline decoration-dotted transition-colors">
                change these in {area.label}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
