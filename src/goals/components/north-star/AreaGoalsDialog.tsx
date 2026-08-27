"use client"

/**
 * The goals in one area, in a dialog, opened from the goals tab.
 *
 * The other half of AreaDialog. That one is the assessment: the 10, the rating,
 * the why, the values, the identity. This one is what you are going to do about
 * it. They were a single dialog, and the result was that the assessment work sat
 * above a goal editor tall enough to push it off the screen, so the rating was
 * the only part of it anyone finished.
 *
 * The 10 comes with the goals rather than being left behind on the other tab.
 * A goal written without the picture in front of you is a goal aimed at nothing,
 * and it is read-only here on purpose: this is not the screen for rewriting it,
 * and the link back is one click.
 */

import type { ReactNode } from "react"
import { ArrowLeft } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { NsArea, NsPlan, VisionGoalType } from "@/src/goals/types"
import {
  AREA_REVIEW_COPY,
  GOALS_INTRO,
  NS_FLOOR,
  SEASON_FOCUS_COPY,
  SERVES_COPY,
} from "@/src/goals/data/northStar"
import { areaCoverage, areaReach, areaReview, wheelRatings } from "@/src/goals/northStarService"
import { AreaGoals } from "./AreaGoals"
import { GoalLibrary } from "./GoalLibrary"
import type { GoalHandlers } from "./GoalCard"

const COVERAGE_COPY: Record<"covered" | "thin" | "none", { label: string; color: string; note: string }> = {
  covered: {
    label: "being worked on",
    color: "#34d399",
    note: "Something is aimed at this area and it has a reason under it.",
  },
  thin: {
    label: "thin",
    color: "#fbbf24",
    note: "Something is aimed here, but nothing has been thought through yet. Open a goal and write the reason under it.",
  },
  none: {
    label: "nothing here yet",
    color: "#71717a",
    note: "No goal and no routine reaches this area. For an area you are happy with, that is fine.",
  },
}

export function AreaGoalsDialog({
  area,
  plan,
  today,
  openGoalId,
  onOpenGoal,
  goalHandlers,
  onAddGoal,
  onAddTarget,
  onAddTemplate,
  onOpenRoutine,
  onSeasonFocus,
  onOpenArea,
  onGoToRating,
  banner,
  onClose,
}: {
  area: NsArea
  plan: NsPlan
  today: string
  openGoalId: string | null
  onOpenGoal: (id: string) => void
  goalHandlers: GoalHandlers
  onAddGoal: (areaId: string, title: string, type: VisionGoalType) => void
  onAddTarget: (areaId: string, targetId: string) => void
  onAddTemplate: (areaId: string, templateId: string, levelIndex: number) => void
  onOpenRoutine: (routineId: string) => void
  onSeasonFocus: (id: string) => void
  /** Move straight to another area without closing and re-finding it. */
  onOpenArea: (areaId: string) => void
  /** Back to the assessment for this same area, on the tab it lives on. */
  onGoToRating: (areaId: string) => void
  /**
   * SOMETHING THE FLOW WANTS SAID AT THE TOP OF THIS DIALOG.
   *
   * A slot rather than an errand prop: this dialog has no business knowing why
   * it was opened. It exists because a modal makes the page behind it inert,
   * so a "back to today" ribbon left out there would be a way back you can see
   * and cannot click.
   */
  banner?: ReactNode
  onClose: () => void
}) {
  const review = areaReview(plan, area.id)
  const reach = areaReach(plan, area.id)
  const goals = reach.goals
  const rating = wheelRatings(plan, today)[area.id] ?? null
  const coverage = COVERAGE_COPY[areaCoverage(plan, area.id)]
  const isFocus = plan.seasonFocusId === area.id
  const index = plan.areas.findIndex((a) => a.id === area.id)
  const nextArea = plan.areas.length > 1 ? plan.areas[(index + 1) % plan.areas.length] : null

  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent
        className="sm:max-w-2xl max-h-[86vh] overflow-y-auto bg-zinc-950 border-white/10 text-white"
        style={{ borderTopColor: area.color, borderTopWidth: 3 }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 pr-6">
            <span className="size-3 rounded-full shrink-0" style={{ backgroundColor: area.color }} />
            <span className="text-lg font-semibold text-white">{area.label}</span>
            <span className="ml-auto text-[11px] font-normal tabular-nums shrink-0">
              <span className={rating == null ? "text-zinc-600" : rating < NS_FLOOR ? "text-amber-300" : "text-zinc-300"}>
                {rating != null ? `${rating}/10` : "not rated"}
              </span>
              <span className="text-zinc-600"> · {goals.length} {goals.length === 1 ? "goal" : "goals"}</span>
            </span>
          </DialogTitle>
        </DialogHeader>

        {banner}

        <div className="space-y-5">
          {/* The picture the goals underneath are aimed at. */}
          <section className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
            <div className="flex items-baseline gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{AREA_REVIEW_COPY.fromGoals}</p>
              <button
                onClick={() => onGoToRating(area.id)}
                className="ml-auto inline-flex items-center gap-1 text-[10.5px] text-zinc-500 hover:text-zinc-200 transition-colors shrink-0"
              >
                <ArrowLeft className="size-3" />
                {AREA_REVIEW_COPY.fromGoalsEdit}
              </button>
            </div>
            {review.ten.trim() ? (
              <p className="text-[12.5px] text-zinc-300 mt-1 leading-relaxed whitespace-pre-wrap">{review.ten}</p>
            ) : (
              <p className="text-[11.5px] text-zinc-500 mt-1 leading-relaxed">{AREA_REVIEW_COPY.fromGoalsEmpty}</p>
            )}
            {review.purpose.trim() && (
              <p className="text-[11.5px] text-zinc-500 mt-1.5 leading-relaxed border-t border-white/[0.07] pt-1.5">{review.purpose}</p>
            )}
          </section>

          {/* Is anything actually working on this area, and is it thought
              through? A rating with nothing aimed at it is the finding. */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
            <span
              className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full border shrink-0"
              style={{ color: coverage.color, borderColor: `${coverage.color}55`, backgroundColor: `${coverage.color}14` }}
            >
              {coverage.label}
            </span>
            <span className="min-w-0 flex-1 text-[10.5px] text-zinc-500 leading-relaxed">{coverage.note}</span>
            <button
              onClick={() => onSeasonFocus(area.id)}
              aria-pressed={isFocus}
              className={`shrink-0 text-[10.5px] px-2 py-0.5 rounded-full border transition-colors ${
                isFocus
                  ? "border-violet-400/50 bg-violet-500/15 text-violet-100"
                  : "border-white/10 text-zinc-500 hover:text-zinc-200 hover:border-white/25"
              }`}
            >
              {isFocus ? SEASON_FOCUS_COPY.picked : SEASON_FOCUS_COPY.pick}
            </button>
          </div>

          <section>
            <AreaGoals
              area={area}
              plan={plan}
              today={today}
              openId={openGoalId}
              onOpen={onOpenGoal}
              handlers={goalHandlers}
              onAddGoal={onAddGoal}
              showHeading={false}
            />
            {goals.length === 0 && <p className="text-[11px] text-zinc-600 leading-relaxed mt-2">{GOALS_INTRO.shapes}</p>}
            <div className="mt-3">
              <GoalLibrary area={area} plan={plan} onAddTarget={onAddTarget} onAddTemplate={onAddTemplate} />
            </div>
          </section>

          {/* What else reaches this area. Routines that run here, and goals
              filed elsewhere that say they lift it. Without this, opening Money
              showed nothing about the work routine that is the entire reason
              the number is moving. */}
          <section className="pt-1 border-t border-white/10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 mt-3 mb-1.5">
              {SERVES_COPY.inArea}
            </p>
            {reach.routines.length + reach.borrowedRoutines.length + reach.borrowedGoals.length === 0 ? (
              <p className="text-[11px] text-zinc-600">{SERVES_COPY.none}</p>
            ) : (
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
                {reach.borrowedGoals.map((g) => (
                  <li key={g.id}>
                    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1.5">
                      <span className="text-[10px] shrink-0" aria-hidden>
                        {g.type === "habit_ramp" ? "🔁" : g.type === "milestone_ladder" ? "🎯" : "🏁"}
                      </span>
                      <span className="min-w-0 flex-1 text-[12px] text-zinc-200">{g.title}</span>
                      <span className="text-[10px] text-zinc-600 shrink-0">
                        filed under {plan.areas.find((a) => a.id === g.areaId)?.label ?? "another area"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

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
