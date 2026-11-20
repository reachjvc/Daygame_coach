"use client"

import type { NorthStarTabId, NsPlan } from "@/src/goals/types"
import { TODO_COPY } from "@/src/goals/data/northStar"
import * as ns from "@/src/goals/northStarService"

/**
 * "STILL TO FILL IN": what is missing, in one place, with a chip that opens the step it belongs to.
 *
 * Moved out of `NorthStarFlow` unchanged (Plans/plan-new-from-real.md, Phase 4); the list and its gate come from the
 * plan here, so both pages show the same thing.
 */
export function PlanTodos({ plan, tab, loaded, today, onGo, todos: given }: {
  plan: NsPlan
  tab: NorthStarTabId
  loaded: boolean
  today: string | null
  onGo: (tab: NorthStarTabId, section?: string) => void
  /** The chips, when one rule elsewhere decides them (`/plan/new`); absent = the real tool's own list, as `/plan` has it. */
  todos?: Array<{ id: string; text: string; tab: NorthStarTabId; section?: string }>
}) {
  const todos: Array<{ id: string; text: string; tab: NorthStarTabId; section?: string }> = loaded && today ? given ?? ns.planTodos(plan) : []
  return (
    <>
    {/* What is still missing, in one place, instead of gates on the way
        through. Nothing here blocks anything; a goal with no date still
        saves and every tab is always reachable. That only works if the
        outstanding work is visible somewhere, which is here. */}
    {loaded && today && tab !== "milestones" && tab !== "systems" && todos.length > 0 && !ns.planIsUntouched(plan) && (
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4">
        <div className="flex items-baseline gap-2">
          <h2 className="text-[13px] font-semibold text-zinc-200">{TODO_COPY.title}</h2>
          <span className="text-[11px] text-zinc-600 tabular-nums">{todos.length}</span>
        </div>
        <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{TODO_COPY.help}</p>
        <ul className="flex flex-wrap gap-1.5 mt-2.5">
          {todos.map((todo) => (
            <li key={todo.id}>
              <button
                onClick={() => onGo(todo.tab, todo.section)}
                className="text-[11px] px-2.5 py-1 rounded-full border border-white/10 text-zinc-400 hover:text-zinc-100 hover:border-white/30 transition-colors"
              >
                {todo.text}
              </button>
            </li>
          ))}
        </ul>
      </div>
    )}
    </>
  )
}
