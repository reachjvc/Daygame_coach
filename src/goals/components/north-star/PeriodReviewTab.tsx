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
 * started this history: it was copied in as the first review. Since
 * 2026-11-05 Your 10s rates into this week's review here, and its wheel shows
 * the latest review's scores (`latestScores`).
 *
 * Any day works (N2). The page opens on the period holding today, says when
 * the last one of its kind was written, and steps back to earlier periods
 * with the arrows. Nothing is kept until something is written, so stepping
 * back to look leaves nothing behind.
 */

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react"
import type { NsGoal, NsPlan, NsReview, NsReviewVerdict } from "@/src/goals/types"
import { ACHIEVEMENT_COPY, READBACK_COPY, READINGS_COPY, REVIEW_PERIOD_COPY as COPY } from "@/src/goals/data/northStar"
import { ReadingInput, withUnit } from "./GoalReadings"
import { dateKeyLabel } from "@/src/shared/dateUtils"
import { goalsReadBack, previousOutcomes, routinesReadBack } from "@/src/goals/reviewReadBack"
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
import { AchievementList } from "./Achievements"
import { earnedBetween } from "@/src/goals/planAchievementsService"
import { NO_TRAINING_TICKS, type TrainingTicks } from "@/src/goals/dayTicks"

export interface PeriodReviewHandlers {
  onWrite: (period: ReviewPeriod, patch: ReviewPatch) => void
  onRemove: (id: string) => void
  /** Add lines to the end of Magic moments (`appendToReview`). */
  onAddMoments: (period: ReviewPeriod, lines: string[]) => void
  /** A number goal's reading on a day (`setGoalReading`). */
  onReading: (goalId: string, date: string, value: number | null) => void
}

/** How many number goals show before "N more". */
const NUMBERS_SHOWN = 6

/** How many reviews the scores-over-time table shows, newest kept. */
const OVER_TIME_COLUMNS = 8

export function PeriodReviewTab({ plan, today, ticks = NO_TRAINING_TICKS, handlers }: {
  plan: NsPlan
  today: string
  /** The finished workouts' ticks, so a step done by training counts toward what was earned. */
  ticks?: TrainingTicks
  handlers: PeriodReviewHandlers
}) {
  const [period, setPeriod] = useState<ReviewPeriod>(() => periodOf("week", today))
  const current = period.cadence === "fortnight" ? null : periodOf(period.cadence, today)
  const atNow = current !== null && current.start === period.start
  const review = reviewFor(plan, period)
  const noun = COPY.nouns[period.cadence]
  const last = lastReviewOf(plan, period.cadence)
  const before = lastScores(plan, period.start)
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

      {/* Celebrate first (Stefan: "What was the good? Celebrate first, always
          first"; the owner's item 32). What the stretch earned, worked out from
          what was logged and ticked in it. */}
      <EarnedInPeriod key={reviewIdFor(period)} plan={plan} period={period} today={today} ticks={ticks} review={review} onAdd={(lines) => handlers.onAddMoments(period, lines)} />

      {/* Then the period read back, as Stefan's weekly review goes over the
          goals: what the period before set out to bring, each goal against
          its number with an answer, and the routines. */}
      <ReadBack
        key={`readback-${reviewIdFor(period)}`}
        plan={plan}
        period={period}
        today={today}
        ticks={ticks}
        review={review}
        onVerdict={(goalId, value) => write({ verdict: { goalId, value } })}
        onReading={handlers.onReading}
      />

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
                {/* The old "Your 10s says N" line, shown when no review came
                    before, went with Your 10s rating into the reviews
                    (2026-11-05): a Your 10s score IS a review score now. */}
                {prior && (
                  <p className="text-[10.5px] text-zinc-600 mt-1">
                    {COPY.lastTime(prior.score, periodLabel(periodOfReview(prior.review)))}
                  </p>
                )}
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

/** "Earned in 2 – 8 Nov 2026": the period's achievements, and a way to keep them in Magic moments. */
function EarnedInPeriod({ plan, period, today, ticks, review, onAdd }: {
  plan: NsPlan
  period: ReviewPeriod
  today: string
  ticks: TrainingTicks
  review: NsReview | null
  onAdd: (lines: string[]) => void
}) {
  const earned = useMemo(() => earnedBetween(plan, period.start, period.end, today, ticks), [plan, period.start, period.end, today, ticks])
  const lines = earned.map((a) => `${a.partTitle}: ${a.label}`)
  const kept = new Set((review?.magicMoments ?? "").split("\n").map((l) => l.trim()))
  const allKept = lines.every((l) => kept.has(l))
  return (
    <section className="rounded-2xl border border-amber-300/15 bg-amber-400/[0.03] p-5" data-testid="review-earned">
      <h3 className="text-[13px] font-semibold text-zinc-200">{ACHIEVEMENT_COPY.reviewTitle(periodLabel(period))}</h3>
      <p className="text-[11px] text-zinc-500 mt-0.5">{earned.length > 0 ? ACHIEVEMENT_COPY.reviewHelp : ACHIEVEMENT_COPY.reviewNone}</p>
      {earned.length > 0 && (
        <div className="mt-3">
          <AchievementList items={earned} withPart label={ACHIEVEMENT_COPY.reviewTitle(periodLabel(period))} />
          <button
            onClick={() => onAdd(lines)}
            disabled={allKept}
            className="mt-3 text-[11.5px] px-3 py-1.5 rounded-lg border border-white/15 text-zinc-300 hover:text-white hover:border-white/30 disabled:opacity-40 disabled:hover:text-zinc-300 transition-colors"
          >
            {allKept ? ACHIEVEMENT_COPY.added : ACHIEVEMENT_COPY.addToMoments}
          </button>
        </div>
      )}
    </section>
  )
}

/** The period read back: last period's outcomes, the goals with an answer each, the routines. */
function ReadBack({ plan, period, today, ticks, review, onVerdict, onReading }: {
  plan: NsPlan
  period: ReviewPeriod
  today: string
  ticks: TrainingTicks
  review: NsReview | null
  onVerdict: (goalId: string, value: NsReviewVerdict | null) => void
  onReading: (goalId: string, date: string, value: number | null) => void
}) {
  const goals = useMemo(() => goalsReadBack(plan, period, today), [plan, period, today])
  const routines = useMemo(() => routinesReadBack(plan, period, today, ticks), [plan, period, today, ticks])
  const before = previousOutcomes(plan, period)
  const [restOpen, setRestOpen] = useState(false)
  const [numbersOpen, setNumbersOpen] = useState(false)
  // Today's reading can be written only in a review of a period that holds today.
  const holdsToday = period.start <= today && today <= period.end
  const shownNumbers = numbersOpen ? goals.numbers : goals.numbers.slice(0, NUMBERS_SHOWN)
  const verdictOf = (id: string) => review?.verdicts?.[id] ?? null
  const row = (goal: NsGoal, numbers: string | null) => (
    <li key={goal.id} className="py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] text-zinc-200">{goal.title}</span>
        {numbers && <span className="block text-[10.5px] text-zinc-500 tabular-nums">{numbers}</span>}
      </span>
      <VerdictRow title={goal.title} value={verdictOf(goal.id)} onPick={(v) => onVerdict(goal.id, verdictOf(goal.id) === v ? null : v)} />
    </li>
  )
  return (
    <>
      {before && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5" data-testid="review-previous-outcomes">
          <h3 className="text-[13px] font-semibold text-zinc-200">{READBACK_COPY.previousTitle(READBACK_COPY.units[period.cadence])}</h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">{READBACK_COPY.previousHelp(periodLabel(before.period))}</p>
          <p className="mt-2 text-[12.5px] text-zinc-300 whitespace-pre-line leading-relaxed">{before.text}</p>
        </section>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5" data-testid="review-goals">
        <h3 className="text-[13px] font-semibold text-zinc-200">{READBACK_COPY.goalsTitle(periodLabel(period))}</h3>
        <p className="text-[11px] text-zinc-500 mt-0.5">{READBACK_COPY.goalsHelp}</p>
        {goals.counted.length === 0 ? (
          <p className="text-[11px] text-zinc-600 mt-2">{READBACK_COPY.noCounted}</p>
        ) : (
          <ul className="mt-2 divide-y divide-white/[0.06]">
            {goals.counted.map((c) => row(c.goal, [
              c.target != null ? READBACK_COPY.countOf(c.count, c.target) : READBACK_COPY.countIn(c.count),
              c.target == null && c.weeks > 0 ? READBACK_COPY.weeksOn(c.weeksMet, c.weeks) : null,
            ].filter(Boolean).join(" · ")))}
          </ul>
        )}
        {goals.numbers.length > 0 && (
          <div className="mt-3" data-testid="review-numbers">
            <p className="text-[11px] text-zinc-500">{READBACK_COPY.numbersTitle}</p>
            <p className="text-[10.5px] text-zinc-600">{READBACK_COPY.numbersHelp}</p>
            <ul className="divide-y divide-white/[0.06]">
              {shownNumbers.map(({ goal, latest }) => (
                <li key={goal.id} className="py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] text-zinc-200">
                      {goal.title}
                      {goal.servesOneThing && <span className="ml-1.5 text-[10px] text-violet-300/70">{READBACK_COPY.seasonTag}</span>}
                    </span>
                    <span className="block text-[10.5px] text-zinc-500 tabular-nums">
                      {latest ? READINGS_COPY.latest(withUnit(goal, latest.value), dateKeyLabel(latest.date, { day: "numeric", month: "short" })) : READINGS_COPY.noneYet}
                    </span>
                  </span>
                  {holdsToday && (
                    <ReadingInput
                      goal={goal}
                      value={plan.numbers[today]?.[goal.id] ?? null}
                      onSet={(v) => onReading(goal.id, today, v)}
                      label={READINGS_COPY.todayAria(goal.title)}
                    />
                  )}
                  <VerdictRow title={goal.title} value={verdictOf(goal.id)} onPick={(v) => onVerdict(goal.id, verdictOf(goal.id) === v ? null : v)} />
                </li>
              ))}
            </ul>
            {goals.numbers.length > NUMBERS_SHOWN && (
              <button onClick={() => setNumbersOpen((v) => !v)} aria-expanded={numbersOpen} className="text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors">
                {numbersOpen ? ACHIEVEMENT_COPY.fewer : ACHIEVEMENT_COPY.more(goals.numbers.length - NUMBERS_SHOWN)}
              </button>
            )}
          </div>
        )}
        {goals.season.length > 0 && (
          <div className="mt-3">
            <p className="text-[11px] text-zinc-500">{READBACK_COPY.seasonTitle}</p>
            <ul className="divide-y divide-white/[0.06]">{goals.season.map((g) => row(g, null))}</ul>
          </div>
        )}
        {goals.rest.length > 0 && (
          <div className="mt-3">
            <button onClick={() => setRestOpen((v) => !v)} aria-expanded={restOpen} className="text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors">
              {READBACK_COPY.restTitle(goals.rest.length)}
            </button>
            {restOpen && <ul className="divide-y divide-white/[0.06]">{goals.rest.map((g) => row(g, null))}</ul>}
          </div>
        )}
      </section>

      {routines.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5" data-testid="review-routines">
          <h3 className="text-[13px] font-semibold text-zinc-200">{READBACK_COPY.routinesTitle}</h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">{READBACK_COPY.routinesHelp}</p>
          <ul className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {routines.map((r) => (
              <li key={r.routine.id} className="flex items-baseline justify-between gap-3 text-[12px]">
                <span className="text-zinc-300 min-w-0 truncate">{r.routine.label}</span>
                <span className="text-zinc-500 tabular-nums shrink-0">{READBACK_COPY.routineOf(r.done, r.planned)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

/** On track / Behind / Change the approach. The same answer again takes it back. */
function VerdictRow({ title, value, onPick }: { title: string; value: NsReviewVerdict | null; onPick: (v: NsReviewVerdict) => void }) {
  return (
    <span role="group" aria-label={`How ${title} is going`} className="inline-flex flex-wrap gap-1 shrink-0">
      {(Object.keys(READBACK_COPY.verdicts) as NsReviewVerdict[]).map((v) => (
        <button
          key={v}
          onClick={() => onPick(v)}
          aria-pressed={value === v}
          aria-label={READBACK_COPY.verdictAria(READBACK_COPY.verdicts[v], title)}
          className={`text-[10.5px] px-2 py-0.5 rounded-full border transition-colors ${
            value === v ? "border-white/40 bg-white/10 text-white" : "border-white/10 text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {READBACK_COPY.verdicts[v]}
        </button>
      ))}
    </span>
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
  const answered = Object.keys(review.verdicts ?? {}).length
  const firstLine =
    review.magicMoments.trim().split("\n")[0] || review.nextOutcomes.trim().split("\n")[0] || (answered > 0 ? COPY.answered(answered) : "")
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
