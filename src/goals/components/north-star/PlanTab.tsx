"use client"

/**
 * Tab 3 — the goals, and only the goals.
 *
 * The assessment (the rating, the 10, the why, the values, the identity) lives
 * one tab back. It used to live on the same screen as this, above a goal editor
 * tall enough to bury it, and the half that got skipped was always the half that
 * makes the goals mean anything.
 *
 * THE WHEEL IS HERE TOO, and it is the same wheel. That was the one thing worth
 * keeping from the merged version: it is the best navigator on the page and the
 * clearest picture of the whole life at once. What is NOT duplicated is the
 * work. On tab 2 a sector opens the assessment; here the same sector opens the
 * goals, and the sub-label under each area name counts goals rather than
 * repeating the rating.
 *
 * THE ROUTINES LIVE HERE, editable, beside the wheel. They were on the
 * assessment tab and they are not an assessment: a routine is the part of the
 * plan that runs whether or not you open the page, which makes it the other
 * half of this screen. Opening one expands the builder full width underneath.
 *
 * The order down the page is the cascade itself:
 *
 *   the chain, counted   → what the plan is, in one line of numbers
 *   the board            → everything on offer, every area at once, toggled on
 *   the wheel + routines → what you have, and the week it runs in
 *   area by area         → where a goal is actually written
 *   the timeline         → the year the whole thing adds up to
 *
 * The board is above the wheel on purpose. Arriving on a tab that offers you a
 * catalogue is a different experience from arriving on one that offers you a
 * blank area list, and the second one was what this page did for a year.
 */

import { useState } from "react"
import { Check, Pencil } from "lucide-react"
import type { NorthStarTabId, NsPlan } from "@/src/goals/types"
import { PLAN_INTRO, ROUTINE_BLUEPRINTS, ROUTINES_INTRO, SEASON_FOCUS_COPY } from "@/src/goals/data/northStar"
import { GUIDE_COPY } from "@/src/goals/data/northStarGuide"
import {
  areaReview,
  goalHasWhy,
  goalsInArea,
  planCascade,
  routineSummary,
  seasonFocus,
  weeklyLoad,
  wheelRatings,
} from "@/src/goals/northStarService"
import { AreaWheel } from "./AreaWheel"
import { BuildBoard, type BoardHandlers } from "./BuildBoard"
import { CascadeBar } from "./CascadeBar"
import { GuidedBuild, type GuideHandlers } from "./GuidedBuild"
import { GoalOverview } from "./GoalOverview"
import { MilestoneTimeline } from "./MilestoneTimeline"
import { RoutineCard, type RoutineHandlers } from "./RoutineCard"
import type { GoalHandlers } from "./GoalCard"

export function PlanTab({
  plan,
  today,
  openId,
  setOpenId,
  goalHandlers,
  routineHandlers,
  onAddRoutine,
  onOpenGoal,
  openRoutineId,
  setOpenRoutineId,
  onSeasonFocus,
  boardHandlers,
  guideHandlers,
  onGoToTab,
  onNext,
}: {
  plan: NsPlan
  today: string
  /** Lifted, because the dialog it drives is rendered by the shell. */
  openId: string | null
  setOpenId: (id: string | null) => void
  goalHandlers: GoalHandlers
  routineHandlers: RoutineHandlers
  onAddRoutine: (blueprintId: string) => void
  onOpenGoal: (areaId: string, goalId: string) => void
  /** Lifted, so opening a routine from inside an area dialog lands here. */
  openRoutineId: string | null
  setOpenRoutineId: (id: string | null) => void
  onSeasonFocus: (id: string) => void
  boardHandlers: BoardHandlers
  guideHandlers: GuideHandlers
  onGoToTab: (tab: NorthStarTabId) => void
  onNext: () => void
}) {
  const ratings = wheelRatings(plan, today)
  const goalCounts = Object.fromEntries(plan.areas.map((a) => [a.id, goalsInArea(plan, a.id).length]))
  const needWhy = plan.goals.filter((g) => !goalHasWhy(g)).length
  const focus = seasonFocus(plan)
  /**
   * The gap worth naming: an area you have PICTURED and then aimed nothing at.
   * An area you have not thought about yet is not a gap, and listing all eleven
   * empty ones is a wall rather than a finding.
   */
  const gaps = plan.areas.filter((a) => (goalCounts[a.id] ?? 0) === 0 && areaReview(plan, a.id).ten.trim().length > 0)
  /** Structural edits to the routines: rename one, remove one, add one. */
  const [editing, setEditing] = useState(false)
  const openRoutine = plan.routines.find((r) => r.id === openRoutineId) ?? null
  const cascade = planCascade(plan, today)
  const load = weeklyLoad(plan)

  /** The cascade line's jumps, to sections of this same tab. */
  const jump = (section: "board" | "timeline" | "routines") => {
    const id = section === "board" ? "ns-board" : section === "timeline" ? "ns-timeline" : "ns-routines"
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div className="space-y-5">
      <CascadeBar cascade={cascade} load={load} onGoToTab={onGoToTab} onJump={jump} />

      {/* The three-paragraph intro card that used to sit here is gone. It
          explained what the tab was for, directly above a three-step flow whose
          first step is a heading that explains what the tab is for. */}
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

      <GuidedBuild plan={plan} today={today} handlers={guideHandlers} />

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
        {/* The same wheel, doing the same job it does everywhere: the whole life
            at once, and the fastest way into one part of it. Here a sector opens
            the goals rather than the rating, and the sub-labels count goals. */}
        <div className="px-5 pt-5 pb-1 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px] items-start">
          <div className="min-w-0">
            <AreaWheel
              areas={plan.areas}
              ratings={ratings}
              goalCounts={goalCounts}
              activeId={openId}
              onPick={(id) => setOpenId(id === openId ? null : id)}
              subMode="goals"
              centreLabel="AREAS"
            />
            <p className="mt-1 text-center text-[12px] text-zinc-400">
              Click an area to write the goals in it
              {needWhy > 0 ? `. ${needWhy} ${needWhy === 1 ? "goal still needs" : "goals still need"} a why` : ""}.
            </p>
            <p className="mt-1 text-center text-[11.5px] text-zinc-500">
              The fill is still your rating. The line under each name is what you have aimed at it.
            </p>
          </div>

          <RoutineStack
            plan={plan}
            openRoutineId={openRoutineId}
            setOpenRoutineId={setOpenRoutineId}
            editing={editing}
            setEditing={setEditing}
            onAdd={onAddRoutine}
          />
        </div>

        {/* The one that is open, full width, under both columns. */}
        {openRoutine && (
          <div className="mx-5 mb-4 rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <RoutineCard
              routine={openRoutine}
              areas={plan.areas}
              editing={editing}
              open
              onToggleOpen={() => setOpenRoutineId(null)}
              handlers={routineHandlers}
            />
          </div>
        )}

        {/* The twelve areas as rows used to be here, under the wheel. That was
            the wheel again as text: same names, same numbers, same click, same
            dialog — which is exactly the argument that took the identical list
            off tab 2, and it applied here the moment the guide above became the
            place goals actually get written. */}

        {gaps.length > 0 && (
          <p className="px-5 py-2.5 text-[11.5px] text-zinc-500 border-t border-white/10">
            {PLAN_INTRO.gap(gaps.map((a) => a.label).join(", "))}
          </p>
        )}

        {/* Your whole plan in one order, once there is one. */}
        <GoalOverview
          plan={plan}
          today={today}
          emptyHint={PLAN_INTRO.empty}
          onOpenGoal={(goal) => onOpenGoal(goal.areaId, goal.id)}
          onSetPriority={goalHandlers.onSetPriority}
          onMovePriority={goalHandlers.onMovePriority}
        />
      </section>

      <MilestoneTimeline plan={plan} today={today} onOpenGoal={onOpenGoal} />

      {/* The catalogue, last and closed.
          It was the front page for one afternoon: every area, every set, every
          target, every practice, 329 controls and nine screens of scroll. It
          assumed the hard part was choosing, and the hard part is that almost
          nobody's real goals are in any catalogue. So it kept its job — a set
          arrives with numbers, rungs, a date and its routine — and lost its
          place. */}
      <details className="rounded-2xl border border-white/10 bg-white/[0.02] group">
        <summary className="px-5 py-3.5 cursor-pointer list-none flex items-baseline gap-2">
          <span className="text-sm font-semibold text-zinc-300 group-open:text-white transition-colors">{GUIDE_COPY.browseTitle}</span>
          <span className="text-[11px] text-zinc-600 min-w-0 flex-1">{GUIDE_COPY.browseHelp}</span>
          <span className="text-[11px] text-zinc-600 shrink-0 group-open:hidden">open</span>
        </summary>
        <BuildBoard plan={plan} today={today} handlers={boardHandlers} />
      </details>

      <div className="flex justify-end">
        <button
          onClick={onNext}
          className="text-sm font-medium px-4 py-2 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-100 hover:bg-violet-500/30 transition-colors"
        >
          {PLAN_INTRO.next}
        </button>
      </div>
    </div>
  )
}

/**
 * The four routines, beside the wheel on the goals tab.
 *
 * They live here rather than with the assessment because they ARE the plan: the
 * part of it that runs whether or not you looked at the page. Compact on
 * purpose — name, what it costs a week, the colour of the area it is filed
 * under — with the whole builder opening full width underneath, since it is two
 * columns wide and unreadable squeezed into a rail.
 */
function RoutineStack({
  plan,
  openRoutineId,
  setOpenRoutineId,
  editing,
  setEditing,
  onAdd,
}: {
  plan: NsPlan
  openRoutineId: string | null
  setOpenRoutineId: (id: string | null) => void
  editing: boolean
  setEditing: (next: boolean) => void
  onAdd: (blueprintId: string) => void
}) {
  return (
    <div id="ns-routines" className="min-w-0 scroll-mt-4">
      <div className="flex items-baseline gap-2">
        <h3 className="text-[13px] font-semibold text-zinc-200">{ROUTINES_INTRO.title}</h3>
        <span className="text-[10.5px] text-zinc-600 tabular-nums">{plan.routines.length}</span>
        {/* Structure only: rename one, remove one, add one. Opening a routine
            and changing what is in it is not editing, so it works either way. */}
        <button
          onClick={() => setEditing(!editing)}
          aria-pressed={editing}
          className={`ml-auto shrink-0 inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg border transition-colors ${
            editing
              ? "border-violet-500/40 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25"
              : "border-white/15 text-zinc-400 hover:text-white hover:border-white/30"
          }`}
        >
          {editing ? <Check className="size-3" /> : <Pencil className="size-3" />}
          {editing ? "Done" : "Edit"}
        </button>
      </div>
      <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
        {editing ? ROUTINES_INTRO.help : ROUTINES_INTRO.beside}
      </p>

      <ul className="mt-2.5 space-y-1.5">
        {plan.routines.map((routine) => {
          const area = plan.areas.find((a) => a.id === routine.areaId)
          const color = area?.color ?? "#a1a1aa"
          const open = routine.id === openRoutineId
          return (
            <li key={routine.id}>
              <button
                onClick={() => setOpenRoutineId(open ? null : routine.id)}
                aria-pressed={open}
                className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  open ? "border-white/30 bg-white/[0.06]" : "border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-[12.5px] font-medium text-zinc-100 min-w-0 truncate">{routine.label}</span>
                </span>
                <span className="block text-[10.5px] text-zinc-500 tabular-nums mt-0.5 pl-4">
                  {routineSummary(routine)}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {editing && <AddRoutine plan={plan} onAdd={onAdd} />}
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
        className="w-full mt-1.5 rounded-xl border border-dashed border-white/15 py-2 text-[11.5px] text-zinc-500 hover:text-zinc-200 hover:border-white/30 transition-colors"
      >
        + Add another routine
      </button>
    )
  }
  return (
    <div className="mt-1.5 rounded-xl border border-white/10 p-3">
      <div className="flex items-center gap-2">
        <p className="text-[11px] text-zinc-500">Which one?</p>
        <button onClick={() => setOpen(false)} className="ml-auto text-[10px] text-zinc-600 hover:text-zinc-400">cancel</button>
      </div>
      <div className="grid gap-2 mt-2">
        {ROUTINE_BLUEPRINTS.map((bp) => (
          <button
            key={bp.id}
            onClick={() => { onAdd(bp.id); setOpen(false) }}
            className="rounded-xl border border-white/10 bg-white/[0.02] p-2.5 text-left hover:border-white/25 transition-colors"
          >
            <span className="flex items-baseline gap-2">
              <span className="text-[12px] font-medium text-zinc-200">{bp.label}</span>
              {used.has(bp.id) && <span className="text-[10px] text-zinc-600">already in your stack</span>}
            </span>
            <span className="block text-[10.5px] text-zinc-500 mt-0.5 leading-relaxed">{bp.why}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
