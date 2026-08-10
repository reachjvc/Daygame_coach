"use client"

/**
 * Tab 2 — your life, and the plan under it.
 *
 * THE WHEEL IS THE NAVIGATOR. One surface: the circle, then the plan under it.
 * Nothing selected, you see every goal in priority order. Click a sector and
 * that area takes its place, which is where goals get written. The routines sit
 * under both and are never hidden.
 *
 * The build before this got it backwards. The wheel already said "Health · 1
 * goal", and clicking it did nothing unless you were in edit mode, while every
 * area laid a permanent "what do you want here?" box on the page below. Four
 * areas meant four blank inputs and three separate blocks of prose explaining
 * goal types before you had typed a word, and one opened goal card took the page
 * past 3500px. The obvious thing to click was inert and the page was a wall.
 *
 * An earlier pass had the routines share that slot too, so clicking an area
 * made the entire morning routine vanish. Only the two views of the same goals
 * swap; nothing else on the surface moves.
 *
 * Edit stays a toggle, and it now means only what it says: the structural
 * controls (rename an area, remove one, add one, change a routine). Opening an
 * area is not editing, so it works in both modes.
 */

import { useState } from "react"
import { Check, Pencil, Plus } from "lucide-react"
import type { NsArea, NsPlan, VisionGoalType } from "@/src/goals/types"
import { AREA_SUGGESTIONS, AREAS_INTRO, ROUTINE_BLUEPRINTS, ROUTINES_INTRO } from "@/src/goals/data/northStar"
import { areaReview, goalHasWhy, goalsInArea, wheelRatings } from "@/src/goals/northStarService"
import { AreaWheel } from "./AreaWheel"
import { GoalOverview } from "./GoalOverview"
import { AreaDialog } from "./AreaDialog"
import { RoutineCard, type RoutineHandlers } from "./RoutineCard"
import type { GoalHandlers } from "./GoalCard"

export interface AreaHandlers {
  onUpdateArea: (areaId: string, patch: Partial<Omit<NsArea, "id" | "custom">>) => void
  onAddArea: (label: string) => void
  onRemoveArea: (areaId: string) => void
  onAddRoutine: (blueprintId: string) => void
}

export function PlanTab({ plan, today, areaHandlers, routineHandlers, goalHandlers, onAddGoal, onAddTarget, onAddTemplate, onAreaReview, onDailyRating, onNext }: {
  plan: NsPlan
  today: string
  areaHandlers: AreaHandlers
  routineHandlers: RoutineHandlers
  goalHandlers: GoalHandlers
  onAddGoal: (areaId: string, title: string, type: VisionGoalType) => void
  onAddTarget: (areaId: string, targetId: string) => void
  onAddTemplate: (areaId: string, templateId: string, levelIndex: number) => void
  onAreaReview: (areaId: string, patch: Partial<import("@/src/goals/types").NsAreaReview>) => void
  onDailyRating: (date: string, areaId: string, score: number) => void
  onNext: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [openRoutineId, setOpenRoutineId] = useState<string | null>(null)
  const [openGoalId, setOpenGoalId] = useState<string | null>(null)

  const ratings = wheelRatings(plan, today)
  const goalCounts = Object.fromEntries(plan.areas.map((a) => [a.id, goalsInArea(plan, a.id).length]))
  const active = plan.areas.find((a) => a.id === activeId) ?? null
  /**
   * The gap worth naming: an area you have PICTURED and then aimed nothing at.
   * Listing every empty area was fine at four and is a wall of eleven names at
   * twelve, and an area you have not thought about yet is not a gap.
   */
  const withoutGoals = plan.areas.filter(
    (a) => (goalCounts[a.id] ?? 0) === 0 && areaReview(plan, a.id).ten.trim().length > 0,
  )
  const needWhy = plan.goals.filter((g) => !goalHasWhy(g)).length

  /** Opening a routine from inside the dialog closes it and expands the row. */
  const openRoutine = (routineId: string) => setOpenRoutineId(routineId)

  return (
    <div className="space-y-5">
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
            activeId={activeId}
            onPick={(id) => setActiveId(id === activeId ? null : id)}
          />
        </div>

        {/* What the wheel is for, said once. */}
        {!active && (
          <p className="px-5 pb-3 text-center text-[12px] text-zinc-400">
            Click an area to add goals to it{needWhy > 0 ? `. ${needWhy} ${needWhy === 1 ? "goal still needs" : "goals still need"} a why` : ""}.
          </p>
        )}

        {editing && (
          <div className="px-5 pb-4">
            <AddArea plan={plan} onAdd={areaHandlers.onAddArea} />
          </div>
        )}

        {/* Your whole plan, always. The area you click opens in a dialog over
            the top, because a wheel that is the navigator has to answer a click
            where you are looking, and an expanding panel below it does not. */}
        <GoalOverview
          plan={plan}
          today={today}
          onOpenGoal={(goal) => { setActiveId(goal.areaId); setOpenGoalId(goal.id) }}
          onSetPriority={goalHandlers.onSetPriority}
          onMovePriority={goalHandlers.onMovePriority}
        />

        {/* Routines are ALWAYS here. They used to share the slot above, so
            opening an area made your whole morning disappear. They are the part
            of the plan that runs whether or not you are looking at an area. */}
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

      {active && (
        <AreaDialog
          area={active}
          plan={plan}
          today={today}
          openGoalId={openGoalId}
          onOpenGoal={(id) => setOpenGoalId(openGoalId === id ? null : id)}
          goalHandlers={goalHandlers}
          onAddGoal={onAddGoal}
          onAddTarget={onAddTarget}
          onAddTemplate={onAddTemplate}
          onAreaReview={onAreaReview}
          onDailyRating={onDailyRating}
          onUpdateArea={areaHandlers.onUpdateArea}
          onRemoveArea={areaHandlers.onRemoveArea}
          onOpenRoutine={openRoutine}
          onClose={() => { setActiveId(null); setOpenGoalId(null) }}
        />
      )}

      {/* The gap worth naming, in one line, instead of an empty input per area. */}
      {plan.goals.length > 0 && withoutGoals.length > 0 && (
        <p className="text-[12px] text-zinc-500">
          You wrote a 10 but no goal in{" "}
          {withoutGoals.map((a, i) => (
            <span key={a.id}>
              {i > 0 && <span className="text-zinc-700">, </span>}
              <button
                onClick={() => setActiveId(a.id)}
                className="underline decoration-dotted underline-offset-2 hover:text-zinc-200 transition-colors"
                style={{ color: a.color }}
              >
                {a.label}
              </button>
            </span>
          ))}
. Two or three areas carry most years, so that is allowed.
        </p>
      )}

      {plan.goals.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={onNext}
            className="text-sm font-medium px-4 py-2 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-100 hover:bg-violet-500/30 transition-colors"
          >
            Now check them against where you are →
          </button>
        </div>
      )}
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
