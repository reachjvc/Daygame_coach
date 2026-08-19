"use client"

/**
 * Where you stand in one area, in a dialog, opened by clicking it on the wheel.
 *
 * Before this, clicking a sector expanded a row somewhere down the page. On the
 * rating tab that row is one of twelve: clicking Spirituality put its editor at
 * y=1536 with the page unscrolled, so on an ordinary screen the click appeared
 * to do nothing at all. A wheel that is the navigator has to answer a click
 * where you are looking.
 *
 * THIS DIALOG IS THE ASSESSMENT AND NOTHING ELSE. It used to carry the goals,
 * the goal library and the whole reach of the area as well, which put the 10,
 * the rating, the why, the values and the identity above a goal editor that
 * pushed them off the screen. The goals moved to their own tab and their own
 * dialog (AreaGoalsDialog); this one links straight to it.
 *
 * The order inside is his: what a 10 looks like, where you are against it, what
 * that 4 actually felt like, why the area matters, what it asks you to value,
 * who you are when it is handled, and what has ended it for you before.
 */

import { useState } from "react"
import { ArrowRight, ChevronDown } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { NsArea, NsAreaReview, NsPlan } from "@/src/goals/types"
import {
  AREA_REVIEW_COPY,
  AREA_TEN_EXAMPLES,
  NS_DAILY_WINDOW,
  NS_FLOOR,
  RATING_VARIANCE_NOTE,
  SEASON_FOCUS_COPY,
  SERVES_COPY,
} from "@/src/goals/data/northStar"
import { LIFE_MASTERY_AREA_MAP } from "@/src/goals/data/lifeMasteryAreas"
import { areaReach, areaReview, areaValueSuggestions, dailyAverage, dailyCount, wheelRatings } from "@/src/goals/northStarService"
import { ScoreRow } from "./ScoreRow"
import { TagList } from "./GoalCard"
import { ValueBrowser } from "./ValueBrowser"
import { SentenceBox } from "./SentenceBox"

export function AreaDialog({
  area,
  plan,
  today,
  onAreaReview,
  onDailyRating,
  onUpdateArea,
  onRemoveArea,
  onOpenRoutine,
  onSeasonFocus,
  onOpenArea,
  onGoToGoals,
  onClose,
}: {
  area: NsArea
  plan: NsPlan
  today: string
  onAreaReview: (areaId: string, patch: Partial<NsAreaReview>) => void
  onDailyRating: (date: string, areaId: string, score: number) => void
  onUpdateArea: (areaId: string, patch: Partial<Omit<NsArea, "id" | "custom">>) => void
  onRemoveArea: (areaId: string) => void
  onOpenRoutine: (routineId: string) => void
  onSeasonFocus: (id: string) => void
  /** Move straight to another area without closing and re-finding it. */
  onOpenArea: (areaId: string) => void
  /** Straight to this area's goals, on the tab where the goals live. */
  onGoToGoals: (areaId: string) => void
  onClose: () => void
}) {
  const review = areaReview(plan, area.id)
  const reach = areaReach(plan, area.id)
  const areaValues = areaValueSuggestions(plan, area.id)
  const rating = wheelRatings(plan, today)[area.id] ?? null
  const avg = dailyAverage(plan, area.id, today)
  const days = dailyCount(plan, area.id, today)
  const todayScore = plan.daily[today]?.[area.id] ?? null
  const hasTen = review.ten.trim().length > 0
  const example = AREA_TEN_EXAMPLES[area.id] ?? null
  const blueprint = LIFE_MASTERY_AREA_MAP.get(area.id)
  const fallback = plan.areas.find((a) => a.id !== area.id)
  const last = plan.areas.length <= 1
  const isFocus = plan.seasonFocusId === area.id
  const goalCount = reach.goals.length
  // The wheel's own order, wrapping, so twelve areas can be walked in twelve
  // clicks. Null on the last one only when there is nothing else to go to.
  const index = plan.areas.findIndex((a) => a.id === area.id)
  const nextArea = plan.areas.length > 1 ? plan.areas[(index + 1) % plan.areas.length] : null
  const [renaming, setRenaming] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [confirmExample, setConfirmExample] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)

  const useExample = () => {
    if (!example) return
    if (hasTen && !confirmExample) {
      setConfirmExample(true)
      return
    }
    onAreaReview(area.id, { ten: example })
    setConfirmExample(false)
  }

  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent
        className="sm:max-w-2xl max-h-[86vh] overflow-y-auto bg-zinc-950 border-white/10 text-white"
        style={{ borderTopColor: area.color, borderTopWidth: 3 }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 pr-6">
            <span className="size-3 rounded-full shrink-0" style={{ backgroundColor: area.color }} />
            {renaming ? (
              <input
                autoFocus
                value={area.label}
                onChange={(e) => onUpdateArea(area.id, { label: e.target.value })}
                onBlur={() => setRenaming(false)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setRenaming(false) }}
                aria-label={`Name for the ${area.label} area`}
                className="min-w-0 flex-1 bg-transparent text-lg font-semibold text-white border-b border-white/30 focus:outline-none focus:border-white/60 py-0.5"
              />
            ) : (
              <button onClick={() => setRenaming(true)} title="Click to rename" className="text-lg font-semibold text-white text-left">
                {area.label}
              </button>
            )}
            <span className="ml-auto text-[11px] font-normal tabular-nums shrink-0">
              <span className={rating == null ? "text-zinc-600" : rating < NS_FLOOR ? "text-amber-300" : "text-zinc-300"}>
                {rating != null ? `${rating}/10` : "not rated"}
              </span>
            </span>
          </DialogTitle>
          {/* What this area actually covers. The sub-label alone ("Energy,
              Vitality, Well-Being") is three nouns; his own weekly-evaluation
              question for the area says what it is asking about. */}
          {area.sublabel && <p className="text-[11.5px] text-zinc-500 -mt-1">{area.sublabel}</p>}
          {blueprint && <p className="text-[11.5px] text-zinc-400 -mt-0.5">{blueprint.prompt}</p>}
        </DialogHeader>

        <div className="space-y-5">
          {/* 1. The 10 first. A rating with nothing behind it is a mood. */}
          <section>
            <p className="text-[13px] text-zinc-200">{AREA_REVIEW_COPY.ten.question}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{AREA_REVIEW_COPY.ten.help}</p>

            {/* What a 10 is, and the fact that it moves. Closed by default so it
                never competes with the box, open in one click because it is the
                question everybody has here. */}
            <button
              onClick={() => setGuideOpen((v) => !v)}
              aria-expanded={guideOpen}
              className="inline-flex items-center gap-1 mt-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <ChevronDown className={`size-3 transition-transform ${guideOpen ? "" : "-rotate-90"}`} />
              {AREA_REVIEW_COPY.tenGuideTitle}
            </button>
            {guideOpen && (
              <ul className="mt-1.5 space-y-1 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
                {AREA_REVIEW_COPY.tenGuide.map((line) => (
                  <li key={line} className="text-[11.5px] text-zinc-400 leading-relaxed">{line}</li>
                ))}
              </ul>
            )}

            <textarea
              value={review.ten}
              onChange={(e) => onAreaReview(area.id, { ten: e.target.value })}
              placeholder={example ?? AREA_REVIEW_COPY.ten.placeholder}
              rows={3}
              aria-label={`What a 10 looks like in ${area.label}`}
              className="w-full mt-1.5 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-400/40 resize-y transition-colors"
            />
            {/* The example is the placeholder AND a button, because a placeholder
                you cannot keep is a paragraph you have to retype. It never
                overwrites without asking. */}
            {example && (
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-[10.5px] text-zinc-600 min-w-0">{AREA_REVIEW_COPY.tenExample}</span>
                <button onClick={useExample} className="ml-auto text-[10.5px] text-zinc-400 hover:text-zinc-100 underline decoration-dotted underline-offset-2 transition-colors shrink-0">
                  {confirmExample ? AREA_REVIEW_COPY.tenReplace : AREA_REVIEW_COPY.tenUse}
                </button>
                {confirmExample && (
                  <button onClick={() => setConfirmExample(false)} className="text-[10.5px] text-zinc-600 hover:text-zinc-300 transition-colors shrink-0">
                    {AREA_REVIEW_COPY.tenKeep}
                  </button>
                )}
              </div>
            )}
          </section>

          <section className={hasTen ? "" : "opacity-60"}>
            <p className="text-[13px] text-zinc-200">{AREA_REVIEW_COPY.rating.question}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">{AREA_REVIEW_COPY.rating.help}</p>

            {/* Both score rows live in the same bordered box at the same inset.
                The fortnight row used to sit on the bare section and the daily
                row inside a padded card, so the two rows of eleven buttons were
                offset from each other by the card's own padding. */}
            <div className="mt-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 space-y-2.5">
              <ScoreRow
                label="The last two weeks"
                value={review.fortnight}
                color={area.color}
                ariaLabel={(n) => `Rate ${area.label} ${n} out of 10 for the last two weeks`}
                onPick={(n) => onAreaReview(area.id, { fortnight: review.fortnight === n ? null : n })}
              />
              <div className="pt-2.5 border-t border-white/[0.07]">
                <ScoreRow
                  label="And today"
                  value={todayScore}
                  color={area.color}
                  ariaLabel={(n) => `Rate ${area.label} ${n} out of 10 today`}
                  onPick={(n) => onDailyRating(today, area.id, n)}
                />
                <p className="text-[10.5px] text-zinc-600 mt-1">
                  {days > 0
                    ? `${days} ${days === 1 ? "day" : "days"} rated in the last ${NS_DAILY_WINDOW}, averaging ${avg}`
                    : "Rate a few days and an average appears here alongside your fortnight number"}
                </p>
              </div>
              {/* Information, not a verdict. The two numbers are made in
                  different ways and are supposed to differ; nothing in the
                  material says a mismatch means one of them is wrong. */}
              {review.fortnight != null && avg != null && Math.abs(review.fortnight - avg) >= RATING_VARIANCE_NOTE.gap && (
                <p className="text-[10.5px] text-zinc-500 leading-relaxed pt-1.5 border-t border-white/[0.07]">
                  {review.fortnight > avg ? RATING_VARIANCE_NOTE.above : RATING_VARIANCE_NOTE.below}
                </p>
              )}
            </div>
          </section>

          {/* The snapshot. Optional, and the thing you will actually want in
              six months, because the number does not remember what a 4 felt
              like. */}
          <section>
            <p className="text-[13px] text-zinc-200">{AREA_REVIEW_COPY.snapshot.question}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{AREA_REVIEW_COPY.snapshot.help}</p>
            <SentenceBox
              value={review.snapshot}
              onChange={(text) => onAreaReview(area.id, { snapshot: text })}
              placeholder={AREA_REVIEW_COPY.snapshot.placeholder}
              label={`Where you are right now in ${area.label}`}
              className="w-full mt-1.5 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-400/40 resize-y transition-colors"
            />
          </section>

          {/* The purpose, per area. His own structure and the piece we did not
              have: "I've got my vision here, I've got my purpose for my
              relationship, and then I've got my goals... So I do that for each
              area of my life" (Rw2qaMltFcY). */}
          <section>
            <p className="text-[13px] text-zinc-200">{AREA_REVIEW_COPY.purpose.question}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{AREA_REVIEW_COPY.purpose.help}</p>
            <SentenceBox
              value={review.purpose}
              onChange={(text) => onAreaReview(area.id, { purpose: text })}
              placeholder={AREA_REVIEW_COPY.purpose.placeholder}
              label={`Why ${area.label} matters to you`}
              className="w-full mt-1.5 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-400/40 resize-y transition-colors"
            />
          </section>

          {/* What this area asks of you, and who you are when it is handled.
              These used to live on the review tab, one screen away from the area
              they belong to, so they were only ever answered by somebody who
              went looking. The values written here are the pool the whole-life
              list is ordered from, which is the other reason they belong beside
              the rating. */}
          <section className="pt-1 border-t border-white/10">
            <div className="mt-3">
              <TagList
                label={AREA_REVIEW_COPY.values.question}
                hint={AREA_REVIEW_COPY.values.help}
                placeholder="Type one and press enter"
                color={area.color}
                items={review.values}
                onChange={(values) => onAreaReview(area.id, { values })}
              />
              {/* Read off their own 10 and north star first, then what this
                  area usually asks for. Money offering Adventure and Faith and
                  leaving out Security was the generic row doing its worst. */}
              <ValueBrowser
                items={review.values}
                label={AREA_REVIEW_COPY.values.question}
                lead={{ label: AREA_REVIEW_COPY.valuesLead(area.label), values: areaValues, color: area.color }}
                onAdd={(value) => {
                  if (review.values.some((v) => v.trim().toLowerCase() === value.trim().toLowerCase())) return
                  onAreaReview(area.id, { values: [...review.values, value] })
                }}
              />
            </div>
            <div className="mt-4">
              <p className="text-[12.5px] text-zinc-200">{AREA_REVIEW_COPY.identity.question}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">{AREA_REVIEW_COPY.identity.help}</p>
              <input
                value={review.identity}
                onChange={(e) => onAreaReview(area.id, { identity: e.target.value })}
                placeholder="I am…"
                aria-label={`Who you are in ${area.label}`}
                className="w-full mt-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>
            <div className="mt-4">
              <p className="text-[12.5px] text-zinc-200">{AREA_REVIEW_COPY.blockers.question}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{AREA_REVIEW_COPY.blockers.help}</p>
              <SentenceBox
                value={review.blockers}
                onChange={(text) => onAreaReview(area.id, { blockers: text })}
                placeholder="What has ended this for you before"
                label={`What might stop you in ${area.label}`}
                className="w-full mt-1.5 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-400/40 resize-y transition-colors"
              />
            </div>
          </section>

          {/* What already runs here. Without this, opening Money said nothing
              about the work routine that is the entire reason the number is
              moving. The goals filed here are the next tab's business. */}
          {reach.routines.length + reach.borrowedRoutines.length > 0 && (
            <section className="pt-1 border-t border-white/10">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 mt-3 mb-1.5">
                {SERVES_COPY.inArea}
              </p>
              <ul className="space-y-1">
                {[...reach.routines, ...reach.borrowedRoutines].map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() => { onOpenRoutine(r.id); onClose() }}
                      className="w-full flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1.5 text-left hover:border-white/25 transition-colors"
                    >
                      <span className="text-[10px] shrink-0" aria-hidden>🔁</span>
                      <span className="min-w-0 flex-1 text-[12px] text-zinc-200">{r.label}</span>
                      <span className="text-[10px] text-zinc-600 tabular-nums shrink-0">
                        {r.steps.length} {r.steps.length === 1 ? "step" : "steps"}
                        {r.areaId !== area.id && " · from elsewhere"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* The other half of this area, one tab across. */}
          <section className="pt-1 border-t border-white/10">
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block text-[11.5px] text-zinc-400 leading-relaxed">{AREA_REVIEW_COPY.toGoalsHelp}</span>
                <span className="block text-[10.5px] text-zinc-600 tabular-nums mt-0.5">
                  {goalCount > 0 ? `${goalCount} ${goalCount === 1 ? "goal" : "goals"} here so far` : "Nothing written here yet"}
                </span>
              </span>
              <button
                onClick={() => onGoToGoals(area.id)}
                className="shrink-0 inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border border-violet-500/40 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25 transition-colors"
              >
                {AREA_REVIEW_COPY.toGoals(area.label)}
                <ArrowRight className="size-3.5" />
              </button>
            </div>
            <button
              onClick={() => onSeasonFocus(area.id)}
              aria-pressed={isFocus}
              className={`mt-2 text-[10.5px] px-2 py-0.5 rounded-full border transition-colors ${
                isFocus
                  ? "border-violet-400/50 bg-violet-500/15 text-violet-100"
                  : "border-white/10 text-zinc-500 hover:text-zinc-200 hover:border-white/25"
              }`}
            >
              {isFocus ? "my one thing this season" : SEASON_FOCUS_COPY.pick}
            </button>
          </section>

          {!last && (
            <section className="pt-1 border-t border-white/10">
              {confirmRemove ? (
                <p className="text-[11px] text-zinc-400 mt-3">
                  {goalCount > 0
                    ? `Its ${goalCount} ${goalCount === 1 ? "goal moves" : "goals move"} to ${fallback?.label}. Nothing is deleted. `
                    : "Nothing else goes with it. "}
                  <button onClick={() => { onRemoveArea(area.id); onClose() }} className="text-rose-300 hover:text-rose-200">remove {area.label}</button>
                  <button onClick={() => setConfirmRemove(false)} className="ml-2 text-zinc-500 hover:text-zinc-300">keep it</button>
                </p>
              ) : (
                <button onClick={() => setConfirmRemove(true)} className="text-[11px] text-zinc-600 hover:text-rose-300 transition-colors mt-3">
                  remove this area
                </button>
              )}
            </section>
          )}

          {/* Somewhere to go when you have finished.
              Everything saves as you type, so the only thing missing was a way
              OUT that was not "click the empty space behind the dialog" or hunt
              for the small × in the corner. Done closes it; the second button
              moves straight to the next area in the wheel's own order, which is
              how you get through twelve of these without going back to the list
              every time. */}
          <section className="sticky bottom-0 -mx-6 px-6 pt-3 pb-1 bg-zinc-950 border-t border-white/10 flex flex-wrap items-center gap-2">
            <span className="text-[10.5px] text-zinc-600 min-w-0 flex-1">{AREA_REVIEW_COPY.autosave}</span>
            <button
              onClick={onClose}
              className="shrink-0 text-[12px] px-3 py-1.5 rounded-lg border border-white/15 text-zinc-200 hover:bg-white/10 transition-colors"
            >
              {AREA_REVIEW_COPY.done}
            </button>
            {nextArea && (
              <button
                onClick={() => onOpenArea(nextArea.id)}
                className="shrink-0 text-[12px] px-3 py-1.5 rounded-lg border border-violet-500/40 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25 transition-colors"
              >
                {AREA_REVIEW_COPY.next(nextArea.label)}
              </button>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
