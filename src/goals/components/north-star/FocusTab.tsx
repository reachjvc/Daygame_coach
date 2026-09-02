"use client"

/**
 * Tab 3 — Focus. The tab that says no.
 *
 * Everything before this widens: twelve areas, a rating on each, a 10 written
 * for any of them you care about. Everything after it is work you do inside a
 * few. Without a step in between, the goals tab opens on the whole wheel with a
 * catalogue underneath, which is not a page asking you to write goals — it is a
 * page asking you to hold your entire life in your head and then start
 * somewhere. The first person through it said so: too much preselected, too
 * much on screen.
 *
 * Three questions, in the order they can be answered:
 *
 *   which areas   — two or three, ordered. Everything downstream narrows to
 *                   these, so this is the one that does the most work.
 *   the one thing — not the most important goal. The one that, if it happened,
 *                   would make several of the others easier or unnecessary.
 *   what order    — once there are goals, which of them goes first.
 *
 * None of it is gated, and the area picker is the same `seasonAreaIds` the
 * guide's first step used to own — moved here rather than duplicated, so there
 * is one place the season is decided.
 */

import { useState } from "react"
import { Plus, X } from "lucide-react"
import type { NorthStarTabId, NsPlan } from "@/src/goals/types"
import { FOCUS_COPY, NS_FLOOR } from "@/src/goals/data/northStar"
import { SEASON_AREA_LIMIT } from "@/src/goals/data/northStarGuide"
import { areaReview, wheelRatings } from "@/src/goals/northStarService"
import { AreaWheel } from "./AreaWheel"
import { GoalOverview } from "./GoalOverview"
import { OneThingEcho } from "./OneThingEcho"

export interface FocusHandlers {
  onToggleArea: (areaId: string) => void
  onAddArea: (label: string) => void
  onSeasonFocus: (id: string) => void
  onAnswer: (key: string, text: string) => void
  onSetPriority: (goalId: string, rank: number) => void
  onMovePriority: (goalId: string, dir: -1 | 1) => void
  /** Dropping a line from the read-back, where you noticed you did not want it. */
  onRemoveGoal: (goalId: string) => void
  /** Opens a routine on the Systems step, where its steps are edited. */
  onOpenRoutine: (routineId: string) => void
  onGoToTab: (tab: NorthStarTabId) => void
}

export function FocusTab({
  plan,
  today,
  handlers,
  onOpenGoal,
  onNext,
}: {
  plan: NsPlan
  today: string
  handlers: FocusHandlers
  onOpenGoal: (areaId: string, goalId: string) => void
  onNext: () => void
}) {
  const [adding, setAdding] = useState("")
  const ratings = wheelRatings(plan, today)
  const picked = plan.seasonAreaIds
  const goalCounts = Object.fromEntries(plan.areas.map((a) => [a.id, plan.goals.filter((g) => g.areaId === a.id).length]))

  return (
    <div className="space-y-5">
      <p className="text-[12.5px] text-zinc-400 leading-relaxed">{FOCUS_COPY.intro}</p>

      {/* ------------------------------------------------------ the areas */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4">
        <h2 className="text-sm font-semibold text-zinc-200">{FOCUS_COPY.areasTitle}</h2>
        <p className="text-[11.5px] text-zinc-400 mt-1 leading-relaxed">{FOCUS_COPY.areasHelp}</p>

        {/* THE PICTURE, NOT TWELVE CARDS.
            It was a grid of twelve — the same names, the same numbers and the
            same click as the wheel two steps back, which is the wheel again as
            a list. Choosing a season is choosing parts of ONE picture, so the
            picture is what you choose in: a sector lights when it is picked and
            its sub-label becomes the rank, and the picked ones are listed under
            it with what you said a 10 looks like there. */}
        <div className="mt-3 max-w-lg mx-auto">
          <AreaWheel
            areas={plan.areas}
            ratings={ratings}
            goalCounts={goalCounts}
            activeId={null}
            selectedIds={picked}
            onPick={handlers.onToggleArea}
            subMode="season"
            centreLabel="SEASON"
          />
          <p className="mt-1 text-center text-[12px] text-zinc-400">{FOCUS_COPY.wheelHint}</p>
        </div>

        {/* What you picked, in order, with the reason you picked it: the first
            line of your own 10 for that area. The cards carried this and the
            wheel cannot, so it lives here — for three areas rather than for
            twelve. */}
        {picked.length > 0 && (
          <ol className="mt-3 space-y-1.5">
            {picked.map((id, i) => {
              const area = plan.areas.find((a) => a.id === id)
              if (!area) return null
              const ten = areaReview(plan, area.id).ten.split("\n")[0].trim()
              const rating = ratings[area.id] ?? null
              return (
                <li key={id} className="flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/[0.07] px-3 py-2">
                  <span className="inline-flex items-center justify-center size-5 rounded-full text-[10px] tabular-nums shrink-0 bg-violet-500/30 text-violet-50">
                    {i + 1}
                  </span>
                  <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: area.color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] text-white truncate">{area.label}</span>
                    <span className="block text-[10px] text-zinc-500 truncate" title={ten || area.sublabel}>{ten || area.sublabel}</span>
                  </span>
                  <span className={`text-[10.5px] tabular-nums shrink-0 ${
                    rating == null ? "text-zinc-700" : rating < NS_FLOOR ? "text-amber-300/80" : "text-zinc-500"
                  }`}>
                    {rating != null ? `${rating}/10` : "–"}
                  </span>
                  <button
                    onClick={() => handlers.onToggleArea(area.id)}
                    aria-label={`Drop ${area.label} from this season`}
                    className="shrink-0 text-zinc-600 hover:text-rose-300 transition-colors"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              )
            })}
          </ol>
        )}

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <input
            value={adding}
            onChange={(e) => setAdding(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || !adding.trim()) return
              e.preventDefault()
              handlers.onAddArea(adding)
              setAdding("")
            }}
            placeholder={FOCUS_COPY.areasAddPlaceholder}
            aria-label={FOCUS_COPY.areasAdd}
            className="min-w-0 flex-1 bg-transparent border-b border-white/10 focus:border-white/30 text-[12.5px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none py-1 transition-colors"
          />
          <button
            onClick={() => { if (adding.trim()) { handlers.onAddArea(adding); setAdding("") } }}
            disabled={!adding.trim()}
            className="shrink-0 inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border border-white/15 text-zinc-300 hover:bg-white/10 disabled:opacity-30 transition-colors"
          >
            <Plus className="size-3" />
            {FOCUS_COPY.areasAdd}
          </button>
        </div>

        {picked.length > SEASON_AREA_LIMIT && (
          <p className="text-[11px] text-amber-200/80 mt-2.5 leading-relaxed">{FOCUS_COPY.areasTooMany}</p>
        )}
        <p className="text-[11px] text-zinc-500 mt-2.5">
          {picked.length === 0 ? FOCUS_COPY.areasNone : FOCUS_COPY.areasPicked(picked.length)}
        </p>
      </section>

      {/* THE ONE THING IS NOT HERE ANY MORE.
          It has step 3 to itself, with the why, the identity, the values and
          what has to happen for it — asked before the goals rather than after
          them. What is left here is the season: which areas, and in what
          order. The sentence is shown so this page still reads as being about
          something, and it is read-only: one place to write it. */}
      <OneThingEcho
        label={FOCUS_COPY.oneEcho}
        editLabel={FOCUS_COPY.oneEchoEdit}
        onEdit={() => handlers.onGoToTab("one")}
      />

      {/* ------------------------------------------------------- the order */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="px-5 pt-4">
          <h2 className="text-sm font-semibold text-zinc-200">{FOCUS_COPY.orderTitle}</h2>
          <p className="text-[11.5px] text-zinc-400 mt-1 leading-relaxed">{FOCUS_COPY.orderHelp}</p>
        </div>
        {/* Steps count as something written, not just goals: a plan whose only
            content is a routine is a plan, and this page saying "nothing yet"
            over a business routine that runs five days a week is the same bug
            that hid deep work from the drivers list. */}
        {plan.goals.length === 0 && !plan.routines.some((r) => r.steps.length > 0) ? (
          <div className="px-5 py-4">
            <p className="text-[12px] text-zinc-500">{FOCUS_COPY.orderEmpty}</p>
            <button
              onClick={() => handlers.onGoToTab("milestones")}
              className="mt-2 text-[12px] font-medium px-3 py-1.5 rounded-lg border border-white/15 text-zinc-100 hover:bg-white/10 transition-colors"
            >
              {FOCUS_COPY.orderGo}
            </button>
          </div>
        ) : (
          <GoalOverview
            plan={plan}
            today={today}
            emptyHint={FOCUS_COPY.orderEmpty}
            onOpenGoal={(goal) => onOpenGoal(goal.areaId, goal.id)}
            onSetPriority={handlers.onSetPriority}
            onMovePriority={handlers.onMovePriority}
            onRemoveGoal={handlers.onRemoveGoal}
            onOpenRoutine={handlers.onOpenRoutine}
          />
        )}
      </section>

      <div className="flex justify-end">
        <button
          onClick={onNext}
          className="text-sm font-medium px-4 py-2 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-100 hover:bg-violet-500/30 transition-colors"
        >
          {FOCUS_COPY.next}
        </button>
      </div>
    </div>
  )
}
