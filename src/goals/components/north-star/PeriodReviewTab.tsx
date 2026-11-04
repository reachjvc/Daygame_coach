"use client"

/**
 * THE REVIEW STEP: a week, month, quarter or year, looked back on.
 *
 * Stefan's weekly review (Plans/life-plan-rebuild.md, Phase 5; Q7): score
 * every area 0 to 10, write the magic moments and the lessons, and set the
 * outcomes for the next one. Then the same each month, quarter and year.
 *
 * Not to be confused with `ReviewTab`, which is the areas' own review on Your
 * 10s: what a 10 looks like, and the one "last two weeks" number. That number
 * started this history: it was copied in as the first review.
 *
 * Any day works (N2). The page opens on the period holding today, says when
 * the last one of its kind was written, and steps back to earlier periods
 * with the arrows. Nothing is kept until something is written, so stepping
 * back to look leaves nothing behind.
 */

import { useState } from "react"
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react"
import type { NsPlan, NsReview } from "@/src/goals/types"
import { REVIEW_PERIOD_COPY as COPY } from "@/src/goals/data/northStar"
import {
  REVIEW_CADENCES,
  REVIEW_LIMITS,
  agoLabel,
  averageScore,
  lastReviewOf,
  lastScores,
  periodLabel,
  periodOf,
  periodOfReview,
  periodShortLabel,
  reviewFor,
  reviewIdFor,
  reviewsOf,
  scoredReviews,
  shiftPeriod,
  type OfferedCadence,
  type ReviewPatch,
  type ReviewPeriod,
} from "@/src/goals/reviewService"
import { ScoreRow } from "./ScoreRow"

export interface PeriodReviewHandlers {
  onWrite: (period: ReviewPeriod, patch: ReviewPatch) => void
  onRemove: (id: string) => void
}

/** How many reviews the scores-over-time table shows, newest kept. */
const OVER_TIME_COLUMNS = 8

export function PeriodReviewTab({ plan, today, handlers }: {
  plan: NsPlan
  today: string
  handlers: PeriodReviewHandlers
}) {
  const [period, setPeriod] = useState<ReviewPeriod>(() => periodOf("week", today))
  const current = period.cadence === "fortnight" ? null : periodOf(period.cadence, today)
  const atNow = current !== null && current.start === period.start
  const review = reviewFor(plan, period)
  const noun = COPY.nouns[period.cadence]
  const last = lastReviewOf(plan, period.cadence)
  const before = lastScores(plan, period.start)
  const tens = Object.keys(before).length === 0
    ? Object.fromEntries(plan.areas.map((a) => [a.id, plan.review[a.id]?.fortnight ?? null]))
    : null
  const scoredCount = review ? plan.areas.filter((a) => typeof review.scores[a.id] === "number").length : 0
  const earlier = reviewsOf(plan, period.cadence).filter((r) => r.id !== reviewIdFor(period))
  const write = (patch: ReviewPatch) => handlers.onWrite(period, patch)

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-sm font-semibold text-zinc-200">{COPY.title}</h2>
        <p className="text-[12px] text-zinc-500 mt-1 leading-relaxed">{COPY.help}</p>
        <p className="text-[12px] text-zinc-500 mt-1.5 leading-relaxed">{COPY.anyDay}</p>
        <p className="text-[12px] text-zinc-300 mt-3" data-testid="review-last">
          {last ? COPY.last(noun, agoLabel(last.writtenOn, today), periodLabel(periodOfReview(last))) : COPY.never(noun)}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="How often" className="inline-flex rounded-lg border border-white/10 p-0.5">
          {REVIEW_CADENCES.map((c: OfferedCadence) => (
            <button
              key={c}
              onClick={() => setPeriod(periodOf(c, today))}
              aria-pressed={period.cadence === c}
              className={`px-3 py-1 rounded-md text-[12px] transition-colors ${
                period.cadence === c ? "bg-white/10 text-zinc-100" : "text-zinc-500 hover:text-zinc-200"
              }`}
            >
              {COPY.cadences[c]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPeriod(shiftPeriod(period, -1))}
            aria-label={COPY.earlierPeriod}
            title={COPY.earlierPeriod}
            disabled={period.cadence === "fortnight"}
            className="p-1 rounded-md text-zinc-500 hover:text-zinc-100 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-[13px] text-zinc-200 tabular-nums min-w-[9rem] text-center" data-testid="review-period">
            {periodLabel(period)}
            {period.cadence === "fortnight" && <span className="text-zinc-500"> · {COPY.fromTens}</span>}
          </span>
          <button
            onClick={() => setPeriod(shiftPeriod(period, 1))}
            aria-label={COPY.laterPeriod}
            title={COPY.laterPeriod}
            disabled={atNow || period.cadence === "fortnight"}
            className="p-1 rounded-md text-zinc-500 hover:text-zinc-100 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="size-4" />
          </button>
          {!atNow && (
            <button
              onClick={() => setPeriod(periodOf(period.cadence === "fortnight" ? "week" : period.cadence, today))}
              className="ml-1 text-[11px] text-zinc-500 hover:text-zinc-200 transition-colors"
            >
              {COPY.backToNow}
            </button>
          )}
        </div>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex items-baseline gap-2">
          <h3 className="text-[13px] font-semibold text-zinc-200">{COPY.scoresTitle}</h3>
          <span className="text-[11px] text-zinc-600 tabular-nums">{COPY.scored(scoredCount, plan.areas.length)}</span>
        </div>
        <p className="text-[11px] text-zinc-500 mt-0.5">{COPY.scoresHelp}</p>
        <ul className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {plan.areas.map((area) => {
            const value = review?.scores[area.id] ?? null
            const prior = before[area.id]
            return (
              <li key={area.id}>
                <p className="flex items-center gap-1.5 text-[12px] text-zinc-200">
                  <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: area.color }} />
                  {area.label}
                </p>
                <ScoreRow
                  label=""
                  value={value}
                  color={area.color}
                  ariaLabel={(n) => `Score ${area.label} ${n} out of 10 for ${periodLabel(period)}`}
                  onPick={(n) => write({ score: { areaId: area.id, value: value === n ? null : n } })}
                />
                {prior ? (
                  <p className="text-[10.5px] text-zinc-600 mt-1">
                    {COPY.lastTime(prior.score, periodLabel(periodOfReview(prior.review)))}
                  </p>
                ) : tens != null && tens[area.id] != null ? (
                  // No review before this one: the Your 10s number is the one to compare with.
                  <p className="text-[10.5px] text-zinc-600 mt-1">{COPY.tensSays(tens[area.id]!)}</p>
                ) : null}
              </li>
            )
          })}
        </ul>
      </section>

      {COPY.boxes.map((box) => (
        <ReviewText
          // A new period is a new box: the draft of the last one must not follow.
          key={`${reviewIdFor(period)}:${box.field}`}
          id={`review-${box.field}`}
          label={box.label}
          help={box.help}
          placeholder={box.placeholder}
          value={review?.[box.field] ?? ""}
          onCommit={(text) => write({ [box.field]: text } as ReviewPatch)}
        />
      ))}

      {review && (
        <RemoveReview key={review.id} onRemove={() => handlers.onRemove(review.id)} />
      )}

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h3 className="text-[13px] font-semibold text-zinc-200">{COPY.earlierTitle(noun)}</h3>
        {earlier.length === 0 ? (
          <p className="text-[11px] text-zinc-500 mt-1">{COPY.earlierEmpty}</p>
        ) : (
          <ul className="mt-2 divide-y divide-white/[0.06]">
            {earlier.map((r) => (
              <EarlierRow key={r.id} review={r} onOpen={() => setPeriod(periodOfReview(r))} />
            ))}
          </ul>
        )}
      </section>

      <ScoresOverTime plan={plan} openId={review?.id ?? null} onOpen={(r) => setPeriod(periodOfReview(r))} />
    </div>
  )
}

/**
 * One of the three texts. Held locally and committed on blur, as every box on
 * this flow is: a save re-renders the page around it, and typing through that
 * is typing into a page that moves.
 *
 * THE DRAFT EXISTS ONLY WHILE SOMEBODY TYPES. Otherwise the box shows the
 * plan's own text, so the account's copy arriving a moment after the page
 * opens fills the box, and a blur with nothing typed can never write an old
 * empty draft over it.
 */
function ReviewText({ id, label, help, placeholder, value, onCommit }: {
  id: string
  label: string
  help: string
  placeholder: string
  value: string
  onCommit: (text: string) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <label htmlFor={id} className="block text-[13px] font-semibold text-zinc-200">{label}</label>
      <p className="text-[11px] text-zinc-500 mt-0.5">{help}</p>
      <textarea
        id={id}
        value={draft ?? value}
        maxLength={REVIEW_LIMITS.text}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== null && draft !== value) onCommit(draft)
          setDraft(null)
        }}
        placeholder={placeholder}
        rows={4}
        className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/30 leading-relaxed"
      />
    </section>
  )
}

function RemoveReview({ onRemove }: { onRemove: () => void }) {
  const [asking, setAsking] = useState(false)
  if (!asking) {
    return (
      <button onClick={() => setAsking(true)} className="inline-flex items-center gap-1.5 text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors">
        <Trash2 className="size-3.5" /> {COPY.remove}
      </button>
    )
  }
  return (
    <p className="text-[11px] text-zinc-400 flex items-center gap-3">
      {COPY.removeConfirm}
      <button onClick={onRemove} className="text-rose-300 hover:text-rose-200">Delete</button>
      <button onClick={() => setAsking(false)} className="text-zinc-500 hover:text-zinc-200">Keep it</button>
    </p>
  )
}

function EarlierRow({ review, onOpen }: { review: NsReview; onOpen: () => void }) {
  const avg = averageScore(review)
  const firstLine = review.magicMoments.trim().split("\n")[0] || review.nextOutcomes.trim().split("\n")[0] || ""
  return (
    <li className="flex items-center gap-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-[12px] text-zinc-200 tabular-nums">
          {periodLabel(periodOfReview(review))}
          {avg != null && <span className="ml-2 text-zinc-500">{COPY.average(avg)}</span>}
        </p>
        {firstLine && <p className="text-[11px] text-zinc-500 truncate">{firstLine}</p>}
      </div>
      <button onClick={onOpen} className="text-[11px] text-zinc-400 hover:text-zinc-100 shrink-0 transition-colors">{COPY.open}</button>
    </li>
  )
}

/**
 * Areas down, reviews across, newest on the right. Any kind of review, so the
 * first one copied from Your 10s starts the line. Numbers, not a chart: twelve
 * areas of eight points each read better as a table, and nothing is drawn
 * that the person did not type.
 */
function ScoresOverTime({ plan, openId, onOpen }: { plan: NsPlan; openId: string | null; onOpen: (r: NsReview) => void }) {
  const columns = scoredReviews(plan).slice(-OVER_TIME_COLUMNS)
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <h3 className="text-[13px] font-semibold text-zinc-200">{COPY.overTimeTitle}</h3>
      <p className="text-[11px] text-zinc-500 mt-0.5">{COPY.overTimeHelp}</p>
      {columns.length === 0 ? (
        <p className="text-[11px] text-zinc-500 mt-2">{COPY.overTimeEmpty}</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="text-[11px] tabular-nums" data-testid="review-over-time">
            <thead>
              <tr>
                <th className="text-left font-normal text-zinc-600 pr-3 pb-1.5" />
                {columns.map((r) => (
                  <th key={r.id} className="font-normal pb-1.5 px-1">
                    <button
                      onClick={() => onOpen(r)}
                      title={`${COPY.nouns[r.cadence]} review, ${periodLabel(periodOfReview(r))}`}
                      className={`whitespace-nowrap hover:text-zinc-100 transition-colors ${r.id === openId ? "text-zinc-100" : "text-zinc-500"}`}
                    >
                      {periodShortLabel(r)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plan.areas.map((area) => (
                <tr key={area.id}>
                  <th scope="row" className="text-left font-normal text-zinc-400 pr-3 py-0.5 whitespace-nowrap">{area.label}</th>
                  {columns.map((r) => {
                    const score = r.scores[area.id]
                    return (
                      <td key={r.id} className="px-1 py-0.5 text-center">
                        {typeof score === "number" ? (
                          <span
                            className="inline-block w-6 rounded text-zinc-100"
                            style={{ backgroundColor: `color-mix(in srgb, ${area.color} ${15 + score * 6}%, transparent)` }}
                          >
                            {score}
                          </span>
                        ) : (
                          <span className="text-zinc-700">·</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
