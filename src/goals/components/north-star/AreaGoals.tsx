"use client"

/**
 * The goals in one area, and the row that adds the next one.
 *
 * Writing one is a single gesture repeated: pick the shape, type the line,
 * press enter, type the next. The shape is picked before the title because it
 * decides which controls the row carries, and a goal typed as the wrong shape
 * can be flipped later without losing anything.
 *
 * A pasted list comes in whole. Most people arrive with their goals already in
 * Notes or a journal, and retyping them a line at a time is the reason they
 * never get in.
 */

import { useState, type ClipboardEvent } from "react"
import { Plus } from "lucide-react"
import type { NsArea, NsPlan, VisionGoalType } from "@/src/goals/types"
import { NS_GOAL_TYPES } from "@/src/goals/data/northStar"
import { areaGoalsByPriority, goalRank, subGoalsOf } from "@/src/goals/northStarService"
import { GoalCard, type GoalHandlers } from "./GoalCard"

export function AreaGoals({ area, plan, today, openId, onOpen, handlers, onAddGoal, showHeading = true }: {
  area: NsArea
  plan: NsPlan
  today: string
  openId: string | null
  onOpen: (id: string) => void
  handlers: GoalHandlers
  onAddGoal: (areaId: string, title: string, type: VisionGoalType) => void
  /** Off when the panel around this already names the area in its own header. */
  showHeading?: boolean
}) {
  // Priority order, not the order they happened to be typed in.
  const goals = areaGoalsByPriority(plan, area.id)
  const [draft, setDraft] = useState("")
  const [type, setType] = useState<VisionGoalType>("achievement")

  const addLines = (text: string) => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.replace(/^\s*(?:[-*•·–]|\d+[.)])\s+/, "").trim())
      .filter(Boolean)
    if (lines.length === 0) return
    for (const line of lines) onAddGoal(area.id, line, type)
    setDraft("")
  }

  /**
   * A single-line input drops the newlines out of a pasted list before React
   * ever sees the value, so a pasted list has to be read off the clipboard
   * event itself. Anything without a newline falls through and types normally.
   */
  const paste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text")
    if (!/\r?\n/.test(text)) return
    e.preventDefault()
    addLines(`${draft}\n${text}`)
  }

  return (
    <section className="space-y-2">
      {showHeading && (
        <div className="flex items-baseline gap-2">
          <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: area.color }} />
          <h3 className="text-[13px] font-semibold text-zinc-200">{area.label}</h3>
          <span className="text-[10.5px] text-zinc-600 tabular-nums">
            {goals.length === 0 ? "nothing here yet" : `${goals.length} ${goals.length === 1 ? "goal" : "goals"}`}
          </span>
        </div>
      )}

      {goals.map((goal) => (
        <GoalCard
          key={goal.id}
          goal={goal}
          area={area}
          areas={plan.areas}
          allGoals={plan.goals}
          subGoals={subGoalsOf(plan, goal.id)}
          rank={goalRank(plan, goal.id)}
          totalGoals={plan.goals.length}
          today={today}
          plan={plan}
          isFocus={plan.seasonFocusId === goal.id}
          open={openId === goal.id}
          onToggleOpen={() => onOpen(goal.id)}
          handlers={handlers}
        />
      ))}

      <div className="flex items-center gap-2 rounded-xl border border-dashed border-white/10 px-3 py-2">
        <span className="flex rounded-md border border-white/10 overflow-hidden shrink-0 text-[11px]">
          {NS_GOAL_TYPES.map((m) => (
            <button
              key={m.type}
              onClick={() => setType(m.type)}
              aria-pressed={type === m.type}
              aria-label={`New goal in ${area.label} as a ${m.label}`}
              title={`${m.label} — ${m.hint}`}
              className={`px-1.5 py-1 transition-colors ${type === m.type ? "bg-white/15 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              {m.icon}
            </button>
          ))}
        </span>
        <Plus className="size-3.5 text-zinc-600 shrink-0" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLines(draft) } }}
          onPaste={paste}
          onBlur={() => addLines(draft)}
          placeholder={goals.length === 0 ? `What do you want in ${area.label.toLowerCase()}?` : "Add another, or paste a whole list"}
          aria-label={`Add a goal in ${area.label}`}
          className="flex-1 min-w-0 bg-transparent border-b border-white/10 focus:border-violet-400/40 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none py-0.5 transition-colors"
        />
      </div>
    </section>
  )
}
