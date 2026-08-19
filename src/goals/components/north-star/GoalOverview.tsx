"use client"

/**
 * Every goal you have, in priority order, at rest.
 *
 * This exists because the previous pass over-corrected. The build before it laid
 * every area's blank input on the page at once; the fix hid goals behind the
 * wheel entirely, and then page 2 opened on a circle and three routine rows with
 * nothing about goals on it at all. Three clicks to reach the thing the page is
 * for.
 *
 * Clicking is how you ADD a goal. It is not how you find out whether you have
 * any. So the plan is visible from the moment you land, one compact row per
 * goal, and a row opens straight into that goal's editor inside its area.
 */

import { useState } from "react"
import { ChevronRight, X } from "lucide-react"
import type { NsArea, NsGoal, NsPlan } from "@/src/goals/types"
import { HORIZON_META, formatCountdown } from "@/src/goals/horizonService"
import { OVERVIEW_COPY } from "@/src/goals/data/northStar"
import { goalHorizon, goalIsQualified, goalNeedsAction, goalRank, goalRateLabel, goalsByPriority, isMilestone, milestoneHasSystem } from "@/src/goals/northStarService"
import { PriorityBadge } from "./GoalCard"

const TYPE_ICON: Record<string, string> = { milestone_ladder: "🎯", habit_ramp: "🔁", achievement: "🏁" }

export function GoalOverview({ plan, today, onOpenGoal, onSetPriority, onMovePriority, onRemoveGoal, onOpenRoutine, emptyHint }: {
  plan: NsPlan
  today: string
  /** Opens the goal's area and expands the goal inside it. */
  onOpenGoal: (goal: NsGoal) => void
  onSetPriority: (goalId: string, rank: number) => void
  onMovePriority: (goalId: string, dir: -1 | 1) => void
  /**
   * Dropping one from here.
   *
   * Reading the whole plan back in one list is exactly when somebody notices
   * the line they do not want — and the only way to act on it was to click
   * through to the area, find the row again and delete it there. Two screens to
   * undo one line.
   */
  onRemoveGoal?: (goalId: string) => void
  /** Opens the routine a step belongs to, where a step is actually edited. */
  onOpenRoutine?: (routineId: string) => void
  /** What to click when there is nothing here, in the words of the surface. */
  emptyHint?: string
}) {
  const goals = goalsByPriority(plan)
  const areaById = new Map(plan.areas.map((a) => [a.id, a]))
  /**
   * TWO LISTS, BECAUSE THEY ARE TWO DIFFERENT THINGS.
   *
   * It was one list called "your goals", which put "See the northern lights"
   * and "Train four times a week" in the same column under the same word. They
   * do opposite jobs: the first is there to be recognised and to pull — its
   * only question is whether anything you run will actually get you there —
   * and the second is what runs. Ordering them together asks which of a wish
   * and a rate comes first, which is not a question.
   */
  const wanted = goals.filter(isMilestone)
  const driving = goals.filter((g) => !isMilestone(g))
  /**
   * AND THE ROUTINE STEPS, WHICH ARE MOST OF WHAT ACTUALLY RUNS.
   *
   * Reported from the page: "where has deep work gone? i dont see it as a
   * driver, even tho ive chosen the business routine." It had gone nowhere —
   * this list was built from `plan.goals`, and ninety minutes of deep work is a
   * step inside a routine, which is not a goal. So a list headed "the rates you
   * hold and the things you do on an ordinary week" was showing a fraction of
   * them, and the fraction it hid is the half most people actually run.
   */
  const routines = plan.routines
    .filter((r) => r.steps.length > 0)
    .map((r) => ({
      id: r.id,
      label: r.label,
      daysPerWeek: r.daysPerWeek,
      kind: r.kind,
      color: plan.areas.find((a) => a.id === r.areaId)?.color ?? "#a1a1aa",
      area: plan.areas.find((a) => a.id === r.areaId)?.label ?? null,
      steps: r.steps,
    }))
  const steps = routines.flatMap((r) => r.steps)
  const carried = wanted.filter((g) => milestoneHasSystem(plan, g)).length


  const list = (rows: NsGoal[]) => (
    <ul className="border-t border-white/[0.07]">
      {rows.map((goal) => (
        <GoalRow
          key={goal.id}
          plan={plan}
          goal={goal}
          area={areaById.get(goal.areaId)}
          rank={goalRank(plan, goal.id) ?? 0}
          total={goals.length}
          today={today}
          onOpen={() => onOpenGoal(goal)}
          onSetPriority={onSetPriority}
          onMovePriority={onMovePriority}
          onRemove={onRemoveGoal ? () => onRemoveGoal(goal.id) : undefined}
        />
      ))}
    </ul>
  )

  /**
   * DRIVERS FIRST, AND THE WANTING FOLDED AWAY.
   *
   * This step is about what happens next, and what happens next is the rates —
   * the order they go in is the only thing on this page you can act on today.
   * The list of what you want is the reference you check them against, not the
   * work: it is the longest list in the plan and it pushed the short actionable
   * one off the screen. So it opens shut, with its heading still saying how
   * much is in it and how much of it has anything running at it, which is the
   * number that would make somebody open it.
   */
  const [wantedOpen, setWantedOpen] = useState(false)

  /**
   * Empty means NOTHING RUNS AND NOTHING IS WANTED, not "no goals".
   *
   * It was `goals.length === 0`, which printed "nothing written yet" over a
   * business routine running five days a week — the same blind spot that hid
   * deep work from the drivers list one function below.
   */
  if (goals.length === 0 && steps.length === 0) {
    return (
      <div className="border-t border-white/10 px-5 py-4">
        <p className="text-[12px] text-zinc-500">
          {emptyHint ?? "Nothing written yet. Click an area on the wheel above to write the first one."}
        </p>
      </div>
    )
  }

  return (
    <div className="border-t border-white/10">
      {(driving.length > 0 || steps.length > 0) && (
        <>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-5 py-3">
            <h3 className="text-[13px] font-semibold text-zinc-200">{OVERVIEW_COPY.drivingTitle}</h3>
            <span className="ml-auto text-[11px] text-zinc-500 tabular-nums shrink-0">
              {OVERVIEW_COPY.drivingCount(driving.length + steps.length)}
            </span>
            <p className="basis-full text-[11px] text-zinc-500 leading-relaxed">{OVERVIEW_COPY.drivingHelp}</p>
          </div>
          {list(driving)}
          {/* The steps, under the goal-shaped drivers and marked as what they
              are: they belong to a routine, so they are edited there rather
              than ranked here. */}
          {routines.length > 0 && routines.map((routine) => (
            <div key={routine.id}>
              {/* A HEADER PER ROUTINE, rather than "in your business routine"
                  repeated under every step. The routine is the thing you
                  picked; its steps are what that costs your week, so they read
                  as a block with a name and a rate on it. */}
              <button
                onClick={() => onOpenRoutine?.(routine.id)}
                disabled={!onOpenRoutine}
                className="w-full flex items-center gap-2 px-5 py-2 border-t border-white/[0.07] bg-white/[0.02] text-left hover:bg-white/[0.04] disabled:cursor-default transition-colors"
              >
                <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: routine.color }} />
                <span className="text-[11.5px] font-medium text-zinc-200 min-w-0 truncate">{routine.label}</span>
                <span className="text-[10px] text-zinc-500 tabular-nums shrink-0">
                  {OVERVIEW_COPY.routineRate(routine.steps.length, routine.kind === "sequence" ? routine.daysPerWeek : null)}
                </span>
                {onOpenRoutine && <ChevronRight className="ml-auto size-3.5 shrink-0 text-zinc-600" />}
              </button>
              <ul>
                {routine.steps.map((step) => (
                  <li key={`${routine.id}:${step.id}`} className="flex items-center gap-2.5 pl-9 pr-5 py-1.5 border-t border-white/[0.05]">
                    <span className="min-w-0 flex-1 text-[12.5px] text-zinc-300 truncate">{step.title}</span>
                    <span className="shrink-0 text-[10px] text-zinc-600 tabular-nums">{step.daysPerWeek}×/wk</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
      {wanted.length > 0 && (
        <>
          <button
            onClick={() => setWantedOpen(!wantedOpen)}
            aria-expanded={wantedOpen}
            className={`w-full flex flex-wrap items-baseline gap-x-2 gap-y-1 px-5 py-3 text-left hover:bg-white/[0.02] transition-colors ${driving.length + steps.length > 0 ? "border-t border-white/10" : ""}`}
          >
            <ChevronRight className={`size-3.5 shrink-0 text-zinc-500 transition-transform ${wantedOpen ? "rotate-90" : ""}`} />
            <h3 className="text-[13px] font-semibold text-zinc-200">{OVERVIEW_COPY.wantedTitle}</h3>
            <span className="ml-auto text-[11px] text-zinc-500 tabular-nums shrink-0">
              {OVERVIEW_COPY.wantedCount(wanted.length, carried)}
            </span>
            <p className="basis-full text-[11px] text-zinc-500 leading-relaxed">
              {wantedOpen ? OVERVIEW_COPY.wantedHelp : OVERVIEW_COPY.wantedClosed(wanted.length - carried)}
            </p>
          </button>
          {wantedOpen && list(wanted)}
        </>
      )}
    </div>
  )
}

/** One row's delete: an × at rest, "delete / keep" once pressed. */
function RemoveRow({ title, onRemove }: { title: string; onRemove: () => void }) {
  const [confirming, setConfirming] = useState(false)
  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        aria-label={`Remove ${title}`}
        title={`Remove ${title}`}
        className="shrink-0 text-zinc-700 hover:text-rose-300 transition-colors"
      >
        <X className="size-3.5" />
      </button>
    )
  }
  return (
    <span className="shrink-0 inline-flex items-center gap-1.5 text-[10.5px]">
      <button onClick={onRemove} className="text-rose-300 hover:text-rose-200 transition-colors">delete</button>
      <button onClick={() => setConfirming(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">keep</button>
    </span>
  )
}

function GoalRow({ plan, goal, area, rank, total, today, onOpen, onSetPriority, onMovePriority, onRemove }: {
  /** Needed because "is anything moving this?" is a question about the plan. */
  plan: NsPlan
  goal: NsGoal
  area: NsArea | undefined
  rank: number
  total: number
  today: string
  onOpen: () => void
  onSetPriority: (goalId: string, rank: number) => void
  onMovePriority: (goalId: string, dir: -1 | 1) => void
  onRemove?: () => void
}) {
  const color = area?.color ?? "#a1a1aa"
  const showHorizon = goal.type === "habit_ramp" || !!goal.targetDate
  const meta = HORIZON_META[goalHorizon(goal, today)]
  const countdown = goal.targetDate ? formatCountdown(goal.targetDate, new Date(`${today}T00:00:00`)) : null
  /**
   * A MILESTONE IS NEVER SHORT OF AN ACTION OF ITS OWN.
   *
   * Five bench, squat and muscle-up goals share one gym habit; the old rule
   * asked each of them separately and put "needs an action" beside all five.
   * What a milestone can be short of is anything moving it AT ALL, and one
   * link fixes that for as many milestones as share the system.
   */
  const needsAction = isMilestone(goal) ? false : goalNeedsAction(goal)
  const unserved = isMilestone(goal) && !milestoneHasSystem(plan, goal)
  const qualified = goalIsQualified(goal)

  return (
    <li className="flex items-center gap-2.5 px-5 py-2.5 border-b border-white/[0.07] last:border-b-0 hover:bg-white/[0.02] transition-colors">
      {/* The badge stays a live control here. Seeing every goal ranked together
          is the moment you actually want to change the order. */}
      <PriorityBadge
        rank={rank}
        total={total}
        color={color}
        title={goal.title}
        onSet={(r) => onSetPriority(goal.id, r)}
        onMove={(d) => onMovePriority(goal.id, d)}
      />
      <span className="text-[11px] shrink-0" aria-hidden>{TYPE_ICON[goal.type]}</span>
      <button onClick={onOpen} className="min-w-0 flex-1 text-left group">
        <span className="block text-[13px] text-zinc-100 group-hover:text-white transition-colors truncate">
          {goal.sentence.trim() || goal.title}
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-zinc-600">
          <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
          {area?.label ?? ""}
          {goal.type === "habit_ramp" && <span>· {goalRateLabel(goal)}</span>}
          {goal.habits.length > 0 && <span>· {goal.habits.length} {goal.habits.length === 1 ? "action" : "actions"}</span>}
          {goal.reasonsList.length > 0 && <span>· {goal.reasonsList.length} reasons</span>}
        </span>
      </button>

      {showHorizon && (
        <span
          className="shrink-0 text-[10px] px-2 py-0.5 rounded-full border tabular-nums"
          style={{ color: meta.color, borderColor: `${meta.color}59`, backgroundColor: `${meta.color}1a` }}
          title={`${meta.label} horizon — ${meta.sublabel}`}
        >
          {meta.label}
          {countdown && <span className="opacity-75"> · {countdown}</span>}
        </span>
      )}
      {/* THESE ARE BUTTONS. "needs an action" is the page naming the next
          thing to do, and it was inert text — somebody clicked it, nothing
          happened, and the only working control was a chevron two inches to
          the right. A prompt you cannot press is a prompt that reads as a
          broken button. */}
      {qualified ? (
        <span className="shrink-0 text-[10px] text-emerald-300">qualified</span>
      ) : (
        <button
          onClick={onOpen}
          className={`shrink-0 text-[10px] underline decoration-dotted underline-offset-2 transition-colors ${
            needsAction || unserved ? "text-amber-300/80 hover:text-amber-200" : "text-zinc-600 hover:text-zinc-300"
          }`}
        >
          {needsAction ? "needs an action" : unserved ? "nothing running at it" : "needs work"}
        </button>
      )}
      <button onClick={onOpen} aria-label={`Open ${goal.title}`} className="shrink-0 text-zinc-600 hover:text-white transition-colors">
        <ChevronRight className="size-4" />
      </button>
      {/* Visible at rest rather than on hover: a control that appears when the
          mouse is already on the row is a control nobody finds on a phone, and
          this list is where deleting is decided. Confirmed once, in place. */}
      {onRemove && <RemoveRow title={goal.title} onRemove={onRemove} />}
    </li>
  )
}
