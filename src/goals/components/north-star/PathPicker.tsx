"use client"

/**
 * Step 4: the fork after the one thing.
 *
 * Everything before this is one order because it is one argument — the life,
 * the areas under it, the single change the year is for. After that the order
 * stops being an argument. Wanting first and systems first are two different
 * people, and a third is only here because of one habit, for whom twelve areas
 * of milestones is the screen they close.
 *
 * So this page picks, and it picks with the whole card rather than with a
 * radio: each door says what it is, who it is for, and what you leave with, in
 * that order, because "which of these am I" is answerable and "which of these
 * is correct" is not.
 *
 * NOTHING IS CLOSED BY CHOOSING. All three doors write into the same plan, the
 * rail keeps this page one click away, and the two you did not take are still
 * here with whatever the one you took has already put in them. The third door
 * shows its four choices open, unhidden — a door that needs a click to reveal
 * that it is four doors is the reason nobody found the routines.
 */

import Link from "next/link"
import { ArrowRight, ArrowUpRight } from "lucide-react"
import type { NsPlan } from "@/src/goals/types"
import { PATHS_COPY, ROUTINE_DOORS, START_PATHS, type StartPathId } from "@/src/goals/data/northStarStart"
import { milestoneGoals, systemGoals } from "@/src/goals/northStarService"

export function PathPicker({
  plan,
  onPick,
  onPickRoutine,
}: {
  plan: NsPlan
  onPick: (id: StartPathId) => void
  /** Opens that routine on the milestones step, already expanded. */
  onPickRoutine: (routineId: string) => void
}) {
  const milestones = milestoneGoals(plan).length
  const systems = systemGoals(plan).length + plan.routines.reduce((sum, r) => sum + r.steps.length, 0)

  /** What each door already has in it, so a second visit is not a blank fork. */
  const already: Record<StartPathId, string | null> = {
    want: milestones > 0 ? `${milestones} written` : null,
    systems: systems > 0 ? `${systems} ${systems === 1 ? "system" : "systems"} running` : null,
    routine: null,
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4">
        <h2 className="text-sm font-semibold text-zinc-200">{PATHS_COPY.title}</h2>
        <p className="text-[11.5px] text-zinc-400 mt-1 leading-relaxed max-w-3xl">{PATHS_COPY.help}</p>

        <div className="grid gap-3 lg:grid-cols-3 mt-4">
          {START_PATHS.map((path) => {
            const body = (
              <>
                <span className="flex items-center gap-1.5">
                  <span className="text-[13px] font-medium text-zinc-100">{path.label}</span>
                  <ArrowRight className="size-3.5 text-zinc-700 group-hover/p:text-zinc-300 transition-colors" />
                </span>
                <span className="block text-[11.5px] text-zinc-400 mt-1.5 leading-relaxed">{path.blurb}</span>
                <span className="block text-[11px] text-zinc-500 mt-2 leading-relaxed">{path.when}</span>
                {/* What you leave with — or what is already there, on a second
                    visit. Pinned to the bottom so the three cards, which are
                    stretched to one height by the grid, do not each end in a
                    different amount of nothing. */}
                <span className="block text-[10.5px] text-zinc-600 mt-auto pt-3">
                  {already[path.id] ?? path.makes}
                </span>
              </>
            )

            /* The third door is four doors, and they are on the card rather
               than behind it: morning, evening, business, and the one that is
               not a routine at all. */
            if (path.id === "routine") {
              return (
                <div
                  key={path.id}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left flex flex-col"
                >
                  {body}
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600 mt-3.5">{PATHS_COPY.routineTitle}</p>
                  <div className="grid gap-1.5 mt-1.5">
                    {ROUTINE_DOORS.map((door) => {
                      const routine = plan.routines.find((r) => r.blueprintId === door.routineId)
                      if (!routine) return null
                      return (
                        <button
                          key={door.routineId}
                          onClick={() => onPickRoutine(routine.id)}
                          className="rounded-lg border border-white/10 px-3 py-2 text-left hover:border-white/30 hover:bg-white/[0.04] transition-colors group/d"
                        >
                          <span className="flex items-center gap-1.5">
                            <span className="text-[12px] font-medium text-zinc-100">{door.label}</span>
                            <ArrowRight className="size-3 text-zinc-700 group-hover/d:text-zinc-300 transition-colors" />
                            <span className="ml-auto text-[10px] text-zinc-600 tabular-nums shrink-0">
                              {routine.steps.length > 0 ? PATHS_COPY.routineSteps(routine.steps.length) : PATHS_COPY.routineEmpty}
                            </span>
                          </span>
                          <span className="block text-[10.5px] text-zinc-500 mt-0.5 leading-relaxed">{door.blurb}</span>
                        </button>
                      )
                    })}
                    {/* NOT A ROUTINE. Quitting is its own piece of work, with
                        its own research under it, and it lives on its own page
                        — so the link says so by leaving. */}
                    <Link
                      href={PATHS_COPY.viceHref}
                      className="rounded-lg border border-white/10 px-3 py-2 text-left hover:border-white/30 hover:bg-white/[0.04] transition-colors group/d"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="text-[12px] font-medium text-zinc-100">{PATHS_COPY.viceLabel}</span>
                        <ArrowUpRight className="size-3 text-zinc-700 group-hover/d:text-zinc-300 transition-colors" />
                      </span>
                      <span className="block text-[10.5px] text-zinc-500 mt-0.5 leading-relaxed">{PATHS_COPY.viceBlurb}</span>
                    </Link>
                  </div>
                </div>
              )
            }

            return (
              <button
                key={path.id}
                onClick={() => onPick(path.id)}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left flex flex-col hover:border-white/30 hover:bg-white/[0.04] transition-colors group/p"
              >
                {body}
              </button>
            )
          })}
        </div>

        <p className="text-[11px] text-zinc-500 mt-4 leading-relaxed">{PATHS_COPY.note}</p>
      </section>
    </div>
  )
}
