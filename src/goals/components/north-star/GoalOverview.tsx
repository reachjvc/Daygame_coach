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

import { ChevronRight } from "lucide-react"
import type { NsArea, NsGoal, NsPlan } from "@/src/goals/types"
import { HORIZON_META, formatCountdown } from "@/src/goals/horizonService"
import { goalHorizon, goalIsQualified, goalNeedsAction, goalRank, goalsByPriority } from "@/src/goals/northStarService"
import { PriorityBadge } from "./GoalCard"

const TYPE_ICON: Record<string, string> = { milestone_ladder: "🎯", habit_ramp: "🔁", achievement: "🏁" }

export function GoalOverview({ plan, today, onOpenGoal, onSetPriority, onMovePriority, emptyHint }: {
  plan: NsPlan
  today: string
  /** Opens the goal's area and expands the goal inside it. */
  onOpenGoal: (goal: NsGoal) => void
  onSetPriority: (goalId: string, rank: number) => void
  onMovePriority: (goalId: string, dir: -1 | 1) => void
  /** What to click when there is nothing here, in the words of the surface. */
  emptyHint?: string
}) {
  const goals = goalsByPriority(plan)
  const areaById = new Map(plan.areas.map((a) => [a.id, a]))
  const qualified = goals.filter(goalIsQualified).length

  if (goals.length === 0) {
    return (
      <div className="border-t border-white/10 px-5 py-4">
        <p className="text-[12px] text-zinc-500">
          {emptyHint ?? "No goals yet. Click an area on the wheel above to write the first one."}
        </p>
      </div>
    )
  }

  return (
    <div className="border-t border-white/10">
      <div className="flex items-baseline gap-2 px-5 py-3">
        <h3 className="text-[13px] font-semibold text-zinc-200">Your goals</h3>
        <p className="text-[11px] text-zinc-500">in priority order</p>
        <span className="ml-auto text-[11px] text-zinc-500 tabular-nums shrink-0">
          {goals.length} · {qualified} qualified
        </span>
      </div>
      <ul className="border-t border-white/[0.07]">
        {goals.map((goal) => (
          <GoalRow
            key={goal.id}
            goal={goal}
            area={areaById.get(goal.areaId)}
            rank={goalRank(plan, goal.id) ?? 0}
            total={goals.length}
            today={today}
            onOpen={() => onOpenGoal(goal)}
            onSetPriority={onSetPriority}
            onMovePriority={onMovePriority}
          />
        ))}
      </ul>
    </div>
  )
}

function GoalRow({ goal, area, rank, total, today, onOpen, onSetPriority, onMovePriority }: {
  goal: NsGoal
  area: NsArea | undefined
  rank: number
  total: number
  today: string
  onOpen: () => void
  onSetPriority: (goalId: string, rank: number) => void
  onMovePriority: (goalId: string, dir: -1 | 1) => void
}) {
  const color = area?.color ?? "#a1a1aa"
  const showHorizon = goal.type === "habit_ramp" || !!goal.targetDate
  const meta = HORIZON_META[goalHorizon(goal, today)]
  const countdown = goal.targetDate ? formatCountdown(goal.targetDate, new Date(`${today}T00:00:00`)) : null
  const needsAction = goalNeedsAction(goal)
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
      {qualified ? (
        <span className="shrink-0 text-[10px] text-emerald-300">qualified</span>
      ) : needsAction ? (
        <span className="shrink-0 text-[10px] text-amber-300/80">needs an action</span>
      ) : (
        <span className="shrink-0 text-[10px] text-zinc-600">needs work</span>
      )}
      <button onClick={onOpen} aria-label={`Open ${goal.title}`} className="shrink-0 text-zinc-600 hover:text-white transition-colors">
        <ChevronRight className="size-4" />
      </button>
    </li>
  )
}
