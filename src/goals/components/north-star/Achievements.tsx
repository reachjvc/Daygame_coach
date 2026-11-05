"use client"

/**
 * ACHIEVEMENTS, as a goal card and the Review step show them
 * (`planAchievementsService`; Plans/life-plan-achievements.md).
 *
 * A list of what has been earned, newest first, with the day, and the next
 * one with how far off it is. Nothing here writes: every achievement is worked
 * out from the plan's own counts and ticks.
 */

import { useMemo, useState } from "react"
import type { NsGoal, NsPlan } from "@/src/goals/types"
import { ACHIEVEMENT_COPY as COPY } from "@/src/goals/data/northStar"
import { fedAchievements, goalAchievements, type PlanAchievement } from "@/src/goals/planAchievementsService"
import { isSystem } from "@/src/goals/northStarService"
import { dateKeyLabel } from "@/src/shared/dateUtils"
import { NO_TRAINING_TICKS, type TrainingTicks } from "@/src/goals/dayTicks"

/** How many show before "N more". */
const SHOWN = 6

const dayLabel = (key: string) => dateKeyLabel(key, { day: "numeric", month: "short" })

/** One earned achievement: its label, then the part it is on when the list mixes parts, then its day. */
export function AchievementChip({ a, withPart = false }: { a: PlanAchievement; withPart?: boolean }) {
  return (
    <li className="inline-flex items-baseline gap-1.5 rounded-full border border-amber-300/25 bg-amber-400/[0.07] px-2.5 py-0.5 text-[11px] text-amber-100/90">
      {withPart && <span className="text-amber-200/60">{a.partTitle}:</span>}
      <span>{a.label}</span>
      {a.earnedOn && <span className="text-amber-200/50 tabular-nums">{dayLabel(a.earnedOn)}</span>}
    </li>
  )
}

/** A list that folds after `SHOWN`. */
export function AchievementList({ items, withPart = false, label }: { items: PlanAchievement[]; withPart?: boolean; label: string }) {
  const [all, setAll] = useState(false)
  const shown = all ? items : items.slice(0, SHOWN)
  return (
    <>
      <ul className="flex flex-wrap gap-1.5" aria-label={label}>
        {shown.map((a) => <AchievementChip key={a.id} a={a} withPart={withPart} />)}
      </ul>
      {items.length > SHOWN && (
        <button onClick={() => setAll((v) => !v)} className="mt-1 text-[10.5px] text-zinc-500 hover:text-zinc-200 transition-colors">
          {all ? COPY.fewer : COPY.more(items.length - SHOWN)}
        </button>
      )}
    </>
  )
}

/**
 * On a goal card: the goal's own achievements when it is counted, and what
 * the goals and steps feeding it have earned (the owner's example: the goal is
 * a girlfriend, the system is approaching). Nothing at all on a goal that is
 * neither counted nor fed.
 */
export function GoalAchievements({ plan, goal, today, ticks = NO_TRAINING_TICKS }: { plan: NsPlan; goal: NsGoal; today: string; ticks?: TrainingTicks }) {
  const own = useMemo(() => (isSystem(goal) ? goalAchievements(plan, goal.id, today) : null), [plan, goal, today])
  const fed = useMemo(() => fedAchievements(plan, goal.id, today, ticks), [plan, goal.id, today, ticks])
  if (!own && fed.length === 0) return null
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] p-3" aria-labelledby={`achievements-${goal.id}`}>
      <h4 id={`achievements-${goal.id}`} className="text-[12.5px] text-zinc-200">{COPY.title}</h4>
      {own && (
        <div className="mt-1.5">
          {own.earned.length > 0
            ? <AchievementList items={own.earned} label={COPY.ownLabel(goal.title)} />
            : <p className="text-[11px] text-zinc-500">{COPY.none}</p>}
          {own.next && (
            <p className="mt-1.5 text-[11px] text-zinc-400" data-testid="achievement-next">
              {COPY.next(own.next.label, own.next.toGo)}
            </p>
          )}
        </div>
      )}
      {fed.length > 0 && (
        <div className="mt-2.5">
          <p className="text-[11px] text-zinc-500 mb-1">{COPY.fedTitle}</p>
          <AchievementList items={fed} withPart label={COPY.fedLabel(goal.title)} />
        </div>
      )}
    </section>
  )
}
