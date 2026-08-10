"use client"

/**
 * Tab 2 — your life: where you are in it, and the plan under it.
 *
 * This is the merge of what used to be two tabs. "Where you are" and "Areas,
 * routines & goals" rendered the SAME twelve-sector wheel, opening the SAME
 * area dialog; the second one additionally listed the goals and the routines.
 * There was no answer to "what is the difference", because the honest answer was
 * "this one, plus more of it", and paying for that with a tab meant the ratings
 * and the goals they are supposed to justify were never on screen together.
 *
 * One surface, top to bottom: the wheel, the twelve rows under it, every goal in
 * priority order, then the routines. Clicking an area anywhere opens the one
 * dialog where its 10, its rating, its goals and everything else reaching it all
 * live.
 *
 * Inside an area the order still matters and it is still the reverse of what
 * people expect: the 10 is written first, because a rating with nothing behind
 * it is a mood and somebody else's 10 in your health is not yours.
 */

import { useState } from "react"
import { Check, Pencil, Plus } from "lucide-react"
import type { NsArea, NsAreaReview, NsPlan, VisionGoalType } from "@/src/goals/types"
import {
  AREA_SUGGESTIONS,
  AREAS_INTRO,
  FLOOR_LINE,
  NOW_INTRO,
  NS_FLOOR,
  ROUTINE_BLUEPRINTS,
  ROUTINES_INTRO,
  SEASON_FOCUS_COPY,
} from "@/src/goals/data/northStar"
import {
  areaCoverage,
  areaReview,
  dailyAverage,
  goalHasWhy,
  goalsInArea,
  seasonFocus,
  wheelRatings,
} from "@/src/goals/northStarService"
import { AreaWheel } from "./AreaWheel"
import { GoalOverview } from "./GoalOverview"
import { RoutineCard, type RoutineHandlers } from "./RoutineCard"
import type { GoalHandlers } from "./GoalCard"

export interface AreaHandlers {
  onUpdateArea: (areaId: string, patch: Partial<Omit<NsArea, "id" | "custom">>) => void
  onAddArea: (label: string) => void
  onRemoveArea: (areaId: string) => void
  onAddRoutine: (blueprintId: string) => void
}

/** The dot beside an area row: is anything actually working on it? */
const COVERAGE_DOT: Record<"covered" | "thin" | "none", { color: string; title: string }> = {
  covered: { color: "#34d399", title: "Something with a reason under it is aimed at this area" },
  thin: { color: "#fbbf24", title: "Something is aimed here but has not been thought through" },
  none: { color: "transparent", title: "Nothing reaches this area yet" },
}

export function NowTab({
  plan,
  today,
  openId,
  setOpenId,
  areaHandlers,
  routineHandlers,
  goalHandlers,
  openRoutineId,
  setOpenRoutineId,
  onOpenGoal,
  onSeasonFocus,
  onNext,
}: {
  plan: NsPlan
  today: string
  /** Lifted, because the dialog it drives is rendered by the shell. */
  openId: string | null
  setOpenId: (id: string | null) => void
  areaHandlers: AreaHandlers
  routineHandlers: RoutineHandlers
  goalHandlers: GoalHandlers
  openRoutineId: string | null
  setOpenRoutineId: (id: string | null) => void
  onOpenGoal: (areaId: string, goalId: string) => void
  onSeasonFocus: (id: string) => void
  onNext: () => void
}) {
  const [editing, setEditing] = useState(false)

  const ratings = wheelRatings(plan, today)
  const goalCounts = Object.fromEntries(plan.areas.map((a) => [a.id, goalsInArea(plan, a.id).length]))
  const rated = plan.areas.filter((a) => areaReview(plan, a.id).fortnight != null).length
  /**
   * Only once every area has a number.
   *
   * It used to appear the moment ONE area was rated, so rating Emotions first
   * produced "Under the floor right now: Emotions. That is where the attention
   * goes this season" off a single data point and eleven blanks. You cannot know
   * what is lowest until you have looked at all of them, and choosing where the
   * season goes is the user's decision, not a line of ours.
   */
  const allRated = rated === plan.areas.length && plan.areas.length > 0
  const underFloor = plan.areas.filter((a) => ratings[a.id] != null && ratings[a.id] < NS_FLOOR)
  const needWhy = plan.goals.filter((g) => !goalHasWhy(g)).length
  const focus = seasonFocus(plan)

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-200">{NOW_INTRO.title}</h2>
          <span className="text-[11px] text-zinc-500 tabular-nums shrink-0">{rated} of {plan.areas.length} rated</span>
        </div>
        <p className="text-[12px] text-zinc-500 mt-1 leading-relaxed">{NOW_INTRO.help}</p>
        <p className="text-[12px] text-zinc-500 mt-1.5 leading-relaxed">{NOW_INTRO.order}</p>
        <p className="text-[11.5px] text-zinc-600 mt-1.5 leading-relaxed">{NOW_INTRO.optional}</p>
      </div>

      {/* The one thing, when there is one. Above the wheel, because it is the
          answer to "what do I look at first" and the wheel is twelve answers. */}
      {focus && (
        <div className="rounded-2xl border border-violet-400/30 bg-violet-500/[0.07] px-5 py-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[13px] font-medium text-violet-100">{SEASON_FOCUS_COPY.banner(focus.label)}</span>
          <span className="text-[11px] text-zinc-400 min-w-0 flex-1">{SEASON_FOCUS_COPY.bannerNote}</span>
          <button
            onClick={() => onSeasonFocus(focus.id)}
            className="text-[10.5px] text-zinc-500 hover:text-zinc-200 transition-colors shrink-0"
          >
            {SEASON_FOCUS_COPY.clear}
          </button>
        </div>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-zinc-200">{AREAS_INTRO.title}</h2>
            <p className="text-[12px] text-zinc-500 mt-1 leading-relaxed">
              {editing ? AREAS_INTRO.help : AREAS_INTRO.resting}
            </p>
          </div>
          <button
            onClick={() => setEditing((v) => !v)}
            aria-pressed={editing}
            className={`shrink-0 inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border transition-colors ${
              editing
                ? "border-violet-500/40 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25"
                : "border-white/15 text-zinc-300 hover:text-white hover:border-white/30"
            }`}
          >
            {editing ? <Check className="size-3.5" /> : <Pencil className="size-3.5" />}
            {editing ? "Done" : "Edit"}
          </button>
        </div>

        <div className="px-5 pt-2 pb-1">
          <AreaWheel
            areas={plan.areas}
            ratings={ratings}
            goalCounts={goalCounts}
            activeId={openId}
            onPick={(id) => setOpenId(id === openId ? null : id)}
          />
        </div>

        <p className="px-5 pb-2 text-center text-[12px] text-zinc-400">
          Click an area to rate it, write your 10, and add goals to it
          {needWhy > 0 ? `. ${needWhy} ${needWhy === 1 ? "goal still needs" : "goals still need"} a why` : ""}.
        </p>

        {/* Nothing is claimed about which area is lowest until every area has a
            number to be lowest against. */}
        <p className="px-5 pb-3 text-center text-[11.5px] text-zinc-500">
          {!allRated ? (
            FLOOR_LINE.waiting(rated, plan.areas.length)
          ) : underFloor.length === 0 ? (
            FLOOR_LINE.none
          ) : (
            <>
              <span className="text-amber-300/85">{FLOOR_LINE.under(underFloor.map((a) => a.label).join(", "))}</span>
              <span className="block text-[11px] text-zinc-600 mt-0.5">{FLOOR_LINE.note}</span>
            </>
          )}
        </p>

        {editing && (
          <div className="px-5 pb-4">
            <AddArea plan={plan} onAdd={areaHandlers.onAddArea} />
          </div>
        )}

        {/* A compact read of all twelve. Rows open the same dialog the wheel
            does, so there is one way to work on an area, not two. */}
        <div className="border-t border-white/10">
          {plan.areas.map((area) => {
            const r = areaReview(plan, area.id)
            const avg = dailyAverage(plan, area.id, today)
            const dot = COVERAGE_DOT[areaCoverage(plan, area.id)]
            const isFocus = plan.seasonFocusId === area.id
            return (
              <button
                key={area.id}
                onClick={() => setOpenId(area.id)}
                className="w-full flex items-center gap-2.5 px-5 py-2.5 text-left border-b border-white/[0.07] last:border-b-0 hover:bg-white/[0.03] transition-colors"
              >
                <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: area.color }} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="text-[13px] text-zinc-100">{area.label}</span>
                    {isFocus && (
                      <span className="text-[9px] px-1.5 py-px rounded-full border border-violet-400/40 bg-violet-500/15 text-violet-100 shrink-0">
                        this season
                      </span>
                    )}
                  </span>
                  <span className="block text-[10.5px] text-zinc-600 truncate">
                    {r.ten.trim() || area.sublabel}
                  </span>
                </span>
                {/* Is anything working on it? A rating with nothing aimed at it
                    is the finding, and it was invisible from this list. */}
                <span
                  className="size-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: dot.color }}
                  title={dot.title}
                  aria-label={dot.title}
                />
                <span className="text-[10px] text-zinc-600 tabular-nums shrink-0 w-10 text-right">
                  {(goalCounts[area.id] ?? 0) > 0 ? `${goalCounts[area.id]} goal${goalCounts[area.id] === 1 ? "" : "s"}` : ""}
                </span>
                <span className="shrink-0 text-right w-12">
                  <span className={`block text-[13px] tabular-nums ${r.fortnight == null ? "text-zinc-600" : r.fortnight < NS_FLOOR ? "text-amber-300" : "text-zinc-200"}`}>
                    {r.fortnight != null ? `${r.fortnight}/10` : "–/10"}
                  </span>
                  {avg != null && <span className="block text-[9.5px] text-zinc-600 tabular-nums">daily {avg}</span>}
                </span>
                {r.ten.trim() && r.fortnight != null && <Check className="size-4 shrink-0 text-emerald-400" />}
              </button>
            )
          })}
        </div>

        {/* Your whole plan, always. The area you click opens in a dialog over
            the top, because a wheel that is the navigator has to answer a click
            where you are looking. */}
        <GoalOverview
          plan={plan}
          today={today}
          onOpenGoal={(goal) => onOpenGoal(goal.areaId, goal.id)}
          onSetPriority={goalHandlers.onSetPriority}
          onMovePriority={goalHandlers.onMovePriority}
        />

        {/* Routines are ALWAYS here. They are the part of the plan that runs
            whether or not you are looking at an area. */}
        <div className="border-t border-white/10">
          <div className="flex items-baseline gap-2 px-5 py-3">
            <h3 className="text-[13px] font-semibold text-zinc-200">{ROUTINES_INTRO.title}</h3>
            <p className="text-[11px] text-zinc-500 min-w-0 truncate">{editing ? ROUTINES_INTRO.help : ROUTINES_INTRO.resting}</p>
          </div>
          <div className="border-t border-white/[0.07]">
            {plan.routines.map((routine) => (
              <RoutineCard
                key={routine.id}
                routine={routine}
                areas={plan.areas}
                editing={editing}
                open={openRoutineId === routine.id}
                onToggleOpen={() => setOpenRoutineId(openRoutineId === routine.id ? null : routine.id)}
                handlers={routineHandlers}
              />
            ))}
          </div>
          {editing && <AddRoutine plan={plan} onAdd={areaHandlers.onAddRoutine} />}
        </div>
      </section>

      {/* Always available, whatever is unfinished. */}
      <div className="flex justify-end">
        <button
          onClick={onNext}
          className="text-sm font-medium px-4 py-2 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-100 hover:bg-violet-500/30 transition-colors"
        >
          {NOW_INTRO.next}
        </button>
      </div>
    </div>
  )
}

function AddArea({ plan, onAdd }: { plan: NsPlan; onAdd: (label: string) => void }) {
  const [draft, setDraft] = useState("")
  const add = (label: string) => {
    if (!label.trim()) return
    onAdd(label)
    setDraft("")
  }
  return (
    <div>
      <div className="flex items-center gap-2">
        <Plus className="size-3.5 text-zinc-600 shrink-0" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add(draft) }}
          placeholder="Name another area of your life"
          aria-label="Name another area of your life"
          className="flex-1 min-w-0 bg-transparent border-b border-white/10 focus:border-violet-400/40 text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none py-0.5 transition-colors"
        />
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {AREA_SUGGESTIONS.filter((s) => !plan.areas.some((a) => a.label.toLowerCase() === s.toLowerCase())).map((s) => (
          <button
            key={s}
            onClick={() => add(s)}
            className="text-[10.5px] px-2 py-0.5 rounded-full border border-white/10 text-zinc-500 hover:text-zinc-200 hover:border-white/25 transition-colors"
          >
            + {s}
          </button>
        ))}
      </div>
    </div>
  )
}

function AddRoutine({ plan, onAdd }: { plan: NsPlan; onAdd: (blueprintId: string) => void }) {
  const [open, setOpen] = useState(false)
  const used = new Set(plan.routines.map((r) => r.blueprintId))
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full border-t border-white/[0.07] py-3 text-[12px] text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.02] transition-colors"
      >
        + Add another routine
      </button>
    )
  }
  return (
    <div className="border-t border-white/[0.07] p-4">
      <div className="flex items-center gap-2">
        <p className="text-[11px] text-zinc-500">Which one?</p>
        <button onClick={() => setOpen(false)} className="ml-auto text-[10px] text-zinc-600 hover:text-zinc-400">cancel</button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 mt-2">
        {ROUTINE_BLUEPRINTS.map((bp) => (
          <button
            key={bp.id}
            onClick={() => { onAdd(bp.id); setOpen(false) }}
            className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-left hover:border-white/25 transition-colors"
          >
            <span className="flex items-baseline gap-2">
              <span className="text-[12.5px] font-medium text-zinc-200">{bp.label}</span>
              {used.has(bp.id) && <span className="text-[10px] text-zinc-600">already in your stack</span>}
            </span>
            <span className="block text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{bp.why}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
