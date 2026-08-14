"use client"

/**
 * The year, as things to hit.
 *
 * Every goal in this flow already has a climb inside it — a target has its
 * ladder rungs, a practice has its ramp phases, a finish line has its
 * checkpoints — and every one of those was only ever visible one goal at a
 * time, inside that goal's own card, three levels down. So a person could pick
 * eighteen goals carrying sixty milestones and never once see that their year
 * was full of things to reach.
 *
 * This is that, in one band. It is also the honest diagnostic: goals arrive
 * dated a year out, so a plan where every dot piles into the last column is
 * telling you nobody has set a real date yet.
 */

import { useState } from "react"
import type { NsPlan } from "@/src/goals/types"
import { TIMELINE_COPY } from "@/src/goals/data/northStarBuild"
import { formatTargetDate, planTimeline, seasonFocus, type NsMilestone } from "@/src/goals/northStarService"

/** How many dots one month column shows before it starts counting instead. */
const PER_MONTH = 4

export function MilestoneTimeline({ plan, today, onOpenGoal }: {
  plan: NsPlan
  today: string
  onOpenGoal: (areaId: string, goalId: string) => void
}) {
  const focus = seasonFocus(plan)
  const [focusOnly, setFocusOnly] = useState(false)
  const months = planTimeline(plan, today)
  const colorOf = (areaId: string) => plan.areas.find((a) => a.id === areaId)?.color ?? "#a1a1aa"

  const keep = (m: NsMilestone) => {
    if (!focusOnly || !focus) return true
    return focus.kind === "goal" ? m.goalId === focus.id : m.areaId === focus.areaId
  }
  const shown = months.map((m) => ({ ...m, milestones: m.milestones.filter(keep) }))
  const total = shown.reduce((n, m) => n + m.milestones.length, 0)

  return (
    <section id="ns-timeline" className="rounded-2xl border border-white/10 bg-white/[0.02] scroll-mt-4">
      <div className="px-5 pt-4 pb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-sm font-semibold text-zinc-200">{TIMELINE_COPY.title}</h2>
        <span className="text-[11px] text-zinc-500 tabular-nums">{total} {total === 1 ? "milestone" : "milestones"}</span>
        {focus && (
          <button
            onClick={() => setFocusOnly((v) => !v)}
            aria-pressed={focusOnly}
            className={`ml-auto shrink-0 text-[10.5px] px-2 py-0.5 rounded-full border transition-colors ${
              focusOnly ? "border-violet-400/50 bg-violet-500/15 text-violet-100" : "border-white/10 text-zinc-500 hover:text-zinc-200 hover:border-white/25"
            }`}
          >
            {focusOnly ? TIMELINE_COPY.all : TIMELINE_COPY.focusOnly}
          </button>
        )}
      </div>
      <p className="px-5 text-[11px] text-zinc-500 leading-relaxed">{TIMELINE_COPY.help}</p>

      {total === 0 ? (
        <p className="px-5 py-4 text-[12px] text-zinc-600">{TIMELINE_COPY.empty}</p>
      ) : (
        <div className="px-5 pt-3 pb-4 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {shown.map((month) => (
              <div key={month.key} className="w-[132px] shrink-0">
                <div className="flex items-baseline gap-1.5 border-b border-white/10 pb-1">
                  <span className="text-[10.5px] font-medium text-zinc-300">{month.label}</span>
                  <span className="text-[9.5px] text-zinc-600 tabular-nums ml-auto">{month.milestones.length || ""}</span>
                </div>
                <ul className="mt-1.5 space-y-1">
                  {month.milestones.slice(0, PER_MONTH).map((m) => (
                    <li key={m.id}>
                      <button
                        onClick={() => onOpenGoal(m.areaId, m.goalId)}
                        title={`${m.label} — ${formatTargetDate(m.date)}`}
                        className="w-full flex items-start gap-1.5 rounded-md border border-white/[0.07] bg-white/[0.02] px-1.5 py-1 text-left hover:border-white/25 hover:bg-white/[0.05] transition-colors"
                      >
                        <span
                          className={`mt-1 size-1.5 rounded-full shrink-0 ${m.kind === "finish" ? "" : "opacity-60"}`}
                          style={{ backgroundColor: colorOf(m.areaId) }}
                        />
                        <span className={`text-[10px] leading-snug line-clamp-2 ${m.done ? "text-zinc-600 line-through" : "text-zinc-300"}`}>
                          {m.label}
                        </span>
                      </button>
                    </li>
                  ))}
                  {month.milestones.length > PER_MONTH && (
                    <li className="text-[9.5px] text-zinc-600 pl-1.5">{TIMELINE_COPY.overflow(month.milestones.length - PER_MONTH)}</li>
                  )}
                  {month.milestones.length === 0 && (
                    <li className="text-[9.5px] text-zinc-700 pl-1.5">{TIMELINE_COPY.none}</li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
