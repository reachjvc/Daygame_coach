"use client"

/**
 * The board: everything on offer, every area at once.
 *
 * The library it draws on is not new — it is the same 23 objectives and ~166
 * targets the area dialog already had. What was new was never seeing it. The
 * library lived one area at a time, inside a dialog, behind two collapsed
 * fades, so finding out what this app could hand you meant opening twelve
 * dialogs and expanding twenty-four disclosures. Nobody does that, and the
 * result was a page that felt like a blank form when it was actually holding a
 * catalogue.
 *
 * Three kinds of offer, and the difference between them is the cascade:
 *
 *   a goal set  — several goals at once, arriving with numbers, dates, shapes
 *                 AND the routine they are kept by, which is the whole point
 *   a goal      — one of them, on its own
 *   a practice  — not a goal at all. A step that goes straight into a routine,
 *                 adding the routine to the stack if it is not there yet.
 *
 * Practices exist because four of the twelve areas have nothing in the goal
 * catalogue and pretending otherwise was worse than saying so. Family does not
 * want a target; it wants a phone call every week.
 */

import { useState } from "react"
import { Check, Plus } from "lucide-react"
import type { NsArea, NsPlan } from "@/src/goals/types"
import { NS_FLOOR, ROUTINE_BLUEPRINT_MAP, SEASON_FOCUS_COPY, TEMPLATE_ADDED_COPY } from "@/src/goals/data/northStar"
import { BOARD_COPY, LOAD_CEILING, type RoutineNeed } from "@/src/goals/data/northStarBuild"
import type { Template } from "@/src/goals/data/newGoalFramework"
import {
  areaObjectives,
  areaOfferNote,
  areaPractices,
  areaReview,
  areaTemplates,
  practiceIsOn,
  routineNeedState,
  routineNeedsForTemplate,
  shapeFromTarget,
  targetAlreadyAdded,
  targetsForTemplate,
  unmetRoutineNeeds,
  weeklyLoad,
  wheelRatings,
} from "@/src/goals/northStarService"
import { Peek } from "./Peek"

const SHAPE_ICON: Record<string, string> = { milestone_ladder: "🎯", habit_ramp: "🔁", achievement: "🏁" }
const LEVEL_LABELS = ["Beginner", "Intermediate", "Advanced"]

export interface BoardHandlers {
  onAddTemplate: (areaId: string, templateId: string, level: number) => void
  onAddTarget: (areaId: string, targetId: string) => void
  onApplyNeed: (need: RoutineNeed) => void
  onTogglePractice: (blueprintId: string, stepId: string, on: boolean) => void
  onSeasonFocus: (areaId: string) => void
  onOpenArea: (areaId: string) => void
}

export function BuildBoard({ plan, today, handlers }: {
  plan: NsPlan
  today: string
  handlers: BoardHandlers
}) {
  /**
   * Level is one choice for the whole board rather than one per card. Somebody
   * setting up their year is one person with one honest answer about where they
   * are starting, and asking it once per card is asking it twelve times.
   */
  const [level, setLevel] = useState(1)
  const [showAll, setShowAll] = useState(false)

  const ratings = wheelRatings(plan, today)
  const pictured = plan.areas.filter((a) => areaReview(plan, a.id).ten.trim().length > 0)
  const shown = showAll || pictured.length === 0 ? plan.areas : pictured
  const load = weeklyLoad(plan)

  return (
    <section id="ns-catalogue" className="border-t border-white/10">
      <div className="px-5 pt-4 pb-3 border-b border-white/10">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-sm font-semibold text-zinc-200">{BOARD_COPY.title}</h2>
          {/* Only worth offering once there is a difference between the two.
              Before any area has a 10 written the board is already showing all
              twelve, and a filter that changes nothing is a filter that makes
              people doubt the one next to it. */}
          {pictured.length > 0 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="ml-auto shrink-0 text-[11px] text-zinc-500 hover:text-zinc-200 transition-colors"
            >
              {showAll ? BOARD_COPY.showPictured : BOARD_COPY.showAll}
            </button>
          )}
        </div>
        <p className="text-[11.5px] text-zinc-400 mt-1 leading-relaxed">{BOARD_COPY.help}</p>

        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
          <span className="text-[10.5px] text-zinc-500">Level</span>
          {LEVEL_LABELS.map((label, i) => (
            <button
              key={label}
              onClick={() => setLevel(i)}
              aria-pressed={level === i}
              className={`text-[10.5px] px-2 py-0.5 rounded-full border transition-colors ${
                level === i ? "border-white/40 bg-white/10 text-white" : "border-white/10 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {label}
            </button>
          ))}
          <span className="text-[10px] text-zinc-600">Sets the numbers every goal arrives with. Editable after.</span>
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="px-5 py-4 text-[12px] text-zinc-500">{BOARD_COPY.empty}</p>
      ) : (
        <div>
          {shown.map((area) => (
            <AreaRow
              key={area.id}
              area={area}
              plan={plan}
              level={level}
              rating={ratings[area.id] ?? null}
              handlers={handlers}
            />
          ))}
        </div>
      )}

      <LoadMeter load={load} />
    </section>
  )
}

/**
 * What the plan costs in an ordinary week, at the bottom of the board.
 *
 * The counterweight. A board that puts eighteen goals one click away needs a
 * number that pushes back, or the "spread out for me" feeling becomes the
 * January feeling. It never blocks — nothing on this page does — it just says
 * the thing out loud and points at the season focus, which is the way out.
 */
function LoadMeter({ load }: { load: { minutes: number; actions: number; over: boolean } }) {
  const hours = Math.round(load.minutes / 6) / 10
  const ceilingHours = Math.round(LOAD_CEILING.minutesPerWeek / 60)
  const pct = Math.min(100, Math.round((load.minutes / LOAD_CEILING.minutesPerWeek) * 100))
  return (
    <div className={`px-5 py-3 border-t ${load.over ? "border-amber-400/25 bg-amber-500/[0.05]" : "border-white/10"}`}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[12px] font-medium text-zinc-200">{BOARD_COPY.loadTitle}</span>
        <span className={`text-[12px] tabular-nums ${load.over ? "text-amber-200" : "text-zinc-300"}`}>
          {hours} h of routines · {load.actions} actions a week
        </span>
      </div>
      <div className="h-1 rounded-full bg-white/[0.07] mt-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${load.over ? "bg-amber-400/70" : "bg-emerald-400/60"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`text-[10.5px] mt-1.5 leading-relaxed ${load.over ? "text-amber-100/80" : "text-zinc-600"}`}>
        {load.over ? BOARD_COPY.loadOver : `${BOARD_COPY.loadFine} The line is about ${ceilingHours} hours and ${LOAD_CEILING.actionsPerWeek} actions.`}
      </p>
    </div>
  )
}

function AreaRow({ area, plan, level, rating, handlers }: {
  area: NsArea
  plan: NsPlan
  level: number
  rating: number | null
  handlers: BoardHandlers
}) {
  const templates = areaTemplates(area)
  const objectives = areaObjectives(area)
  const practices = areaPractices(area)
  const goalCount = plan.goals.filter((g) => g.areaId === area.id).length
  const practiceCount = practices.filter((p) => practiceIsOn(plan, p.blueprintId, p.stepId)).length
  const unmet = unmetRoutineNeeds(plan, area.id)
  const isFocus = plan.seasonFocusId === area.id
  // Said only where the catalogue genuinely has nothing: Family, Friends, Fun,
  // Contribution. Naming the hole beats filling it with the neighbouring
  // pillar's goals, which is what the page did before.
  const note = areaOfferNote(area)

  return (
    <div className="px-5 py-4 border-b border-white/[0.07] last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: area.color }} />
        <button onClick={() => handlers.onOpenArea(area.id)} className="text-[13px] font-medium text-zinc-100 hover:text-white transition-colors">
          {area.label}
        </button>
        {isFocus && (
          <span className="text-[9px] px-1.5 py-px rounded-full border border-violet-400/40 bg-violet-500/15 text-violet-100 shrink-0">
            this season
          </span>
        )}
        <span className={`text-[10.5px] tabular-nums shrink-0 ${rating == null ? "text-zinc-700" : rating < NS_FLOOR ? "text-amber-300/80" : "text-zinc-500"}`}>
          {rating != null ? `${rating}/10` : "not rated"}
        </span>
        <span className="ml-auto shrink-0 flex items-center gap-2">
          <span className="text-[10.5px] text-zinc-500 tabular-nums">
            {goalCount} {goalCount === 1 ? "goal" : "goals"}
            {practiceCount > 0 && ` · ${practiceCount} ${practiceCount === 1 ? "practice" : "practices"}`}
          </span>
          <button
            onClick={() => handlers.onSeasonFocus(area.id)}
            aria-pressed={isFocus}
            className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
              isFocus ? "border-violet-400/50 bg-violet-500/15 text-violet-100" : "border-white/10 text-zinc-600 hover:text-zinc-200 hover:border-white/25"
            }`}
          >
            {isFocus ? "focus" : SEASON_FOCUS_COPY.pick}
          </button>
        </span>
      </div>

      {note && <p className="text-[10.5px] text-zinc-500 mt-1 leading-relaxed">{note}</p>}

      {templates.length > 0 && (
        <div className="mt-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">{BOARD_COPY.goalsLabel}</p>
          {/* Fitness offers nine sets. Nine cards, each repeating that it comes
              with the training week, is a wall rather than a menu, so the same
              fade the goals below use holds them at two rows until asked. */}
          <div className="mt-1.5">
            <Peek more={`Show all ${templates.length} sets in ${area.label}`} collapsedHeight={templates.length > 4 ? 210 : 400}>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {templates.map((t) => (
                  <SetCard key={t.id} template={t} plan={plan} area={area} level={level} handlers={handlers} />
                ))}
              </div>
            </Peek>
          </div>
        </div>
      )}

      {objectives.length > 0 && (
        <div className="mt-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">{BOARD_COPY.targetsLabel}</p>
          <div className="mt-1.5">
            <Peek more={`Show all ${objectives.reduce((n, g) => n + g.targets.length, 0)} goals in ${area.label}`} collapsedHeight={104}>
              <div className="space-y-2">
                {objectives.map(({ objective, targets }) => (
                  <div key={objective.id}>
                    <p className="text-[10.5px] text-zinc-500">{objective.label}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {targets.map((t) => {
                        const already = targetAlreadyAdded(plan, t)
                        return (
                          <button
                            key={t.id}
                            onClick={() => handlers.onAddTarget(area.id, t.id)}
                            disabled={already}
                            className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                              already
                                ? "border-white/10 bg-white/[0.06] text-zinc-500 cursor-default"
                                : "border-white/10 text-zinc-200 hover:bg-white/10 hover:border-white/30"
                            }`}
                          >
                            {already ? <Check className="size-2.5" /> : <Plus className="size-2.5 text-zinc-500" />}
                            <span aria-hidden>{SHAPE_ICON[shapeFromTarget(t).type]}</span>
                            {t.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </Peek>
          </div>
        </div>
      )}

      {/* What the goals already in this area are asking for and have not got.
          A set offers its routine on the card; a goal picked one chip at a time
          never passed a card, and it arrives carrying an action with nowhere
          for that action to happen. */}
      {unmet.length > 0 && (
        <div className="mt-2.5 rounded-lg border border-amber-400/20 bg-amber-500/[0.05] px-2.5 py-2">
          <p className="text-[11px] text-amber-100/90">
            {BOARD_COPY.unmetTitle(unmet.map(routineLabel).join(" and "))}
          </p>
          <p className="text-[10px] text-amber-100/60 mt-0.5 leading-relaxed">{unmet[0].why}</p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {unmet.map((need) => (
              <button
                key={need.blueprintId}
                onClick={() => handlers.onApplyNeed(need)}
                className="text-[10.5px] px-2 py-0.5 rounded-full border border-amber-400/30 text-amber-100 hover:bg-amber-500/15 transition-colors"
              >
                {BOARD_COPY.unmetAdd(routineLabel(need))}
              </button>
            ))}
          </div>
        </div>
      )}

      {practices.length > 0 && (
        <div className="mt-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">{BOARD_COPY.practicesLabel}</p>
          <p className="text-[10.5px] text-zinc-600 mt-0.5 leading-relaxed">{BOARD_COPY.practiceHelp}</p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {practices.map((p) => {
              const on = practiceIsOn(plan, p.blueprintId, p.stepId)
              return (
                <button
                  key={`${p.blueprintId}-${p.stepId}`}
                  onClick={() => handlers.onTogglePractice(p.blueprintId, p.stepId, !on)}
                  aria-pressed={on}
                  title={`${p.routine} · ${p.daysPerWeek}×/wk`}
                  className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                    on
                      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                      : "border-white/10 text-zinc-300 hover:bg-white/10 hover:border-white/30"
                  }`}
                >
                  {on ? <Check className="size-2.5" /> : <Plus className="size-2.5 text-zinc-500" />}
                  {p.title}
                  <span className="text-[9.5px] text-zinc-500 tabular-nums">{p.daysPerWeek}×</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {templates.length === 0 && objectives.length === 0 && practices.length === 0 && (
        <p className="text-[11px] text-zinc-600 mt-1.5">
          Nothing curated for this area.{" "}
          <button onClick={() => handlers.onOpenArea(area.id)} className="text-zinc-400 hover:text-white underline underline-offset-2 transition-colors">
            Open it and write your own
          </button>
          .
        </p>
      )}
    </div>
  )
}

/**
 * One goal set, and the routine it comes with.
 *
 * The routine is a checkbox that starts ticked rather than something that
 * happens quietly on the way past. Adding a training week to somebody's stack
 * is a real change to their week and they should see it coming — but leaving it
 * off by default reproduces exactly the split this whole change is closing,
 * where the goals live here and the thing that achieves them lives over there.
 */
function SetCard({ template, plan, area, level, handlers }: {
  template: Template
  plan: NsPlan
  area: NsArea
  level: number
  handlers: BoardHandlers
}) {
  const [open, setOpen] = useState(false)
  const [withRoutines, setWithRoutines] = useState(true)
  /**
   * What arrived when this card was last used.
   *
   * One click here can write nine goals and put a whole training week into
   * somebody's stack, and both of those land somewhere else on the page — the
   * goals in a list further down, the routine in a rail beside the wheel. An
   * action that big happening silently is the same as it happening by accident,
   * so the card says what it did and where it went.
   */
  const [justAdded, setJustAdded] = useState<{ goals: number; added: string[]; extended: string[] } | null>(null)
  const targets = targetsForTemplate(template)
  const fresh = targets.filter((t) => !targetAlreadyAdded(plan, t))
  const needs = routineNeedsForTemplate(template)
  const unmet = needs.filter((n) => routineNeedState(plan, n) !== "met")
  const levelValues = (template.levels[level] ?? template.levels[0])?.targetValues ?? {}

  const add = () => {
    const applied = withRoutines ? unmet : []
    handlers.onAddTemplate(area.id, template.id, level)
    for (const need of applied) handlers.onApplyNeed(need)
    // A routine that was already in the stack and only gained a step did not
    // "arrive". Saying it did would have somebody hunting a new card that is
    // not there, and hide the step that actually changed.
    setJustAdded({
      goals: fresh.length,
      added: applied.filter((n) => routineNeedState(plan, n) === "missing").map(routineLabel),
      extended: applied.filter((n) => routineNeedState(plan, n) === "partial").map(routineLabel),
    })
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
      <div className="flex items-baseline gap-2">
        <span className="text-[12px] font-medium text-zinc-100 min-w-0">{template.label}</span>
        <span className="ml-auto text-[10px] tabular-nums shrink-0" style={{ color: area.color }}>
          {fresh.length === 0 ? "added" : `+ ${fresh.length} goals`}
        </span>
      </div>
      <p className="text-[10.5px] text-zinc-500 mt-0.5 leading-relaxed">{template.description}</p>

      {needs.length > 0 && (
        <div className="mt-1.5 rounded-md border border-white/10 bg-white/[0.02] px-2 py-1.5">
          <label className="flex items-start gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={withRoutines}
              onChange={(e) => setWithRoutines(e.target.checked)}
              className="mt-0.5 accent-violet-400 shrink-0"
            />
            <span className="min-w-0">
              <span className="block text-[10.5px] text-zinc-300">
                {BOARD_COPY.needsLabel}: {needs.map((n) => routineLabel(n)).join(" · ")}
              </span>
              {/* The reason is the teaching moment, and it is worth saying once.
                  Nine sets in one area all needing the training week would
                  otherwise print the same sentence nine times down the column,
                  so it goes quiet the moment the routine is actually there. */}
              {unmet.length > 0 ? (
                <span className="block text-[10px] text-zinc-600 leading-relaxed">{needs[0].why}</span>
              ) : (
                <span className="block text-[10px] text-emerald-300/60">Already in your stack.</span>
              )}
            </span>
          </label>
        </div>
      )}

      {justAdded && (
        <div className="mt-1.5 rounded-md border border-emerald-400/25 bg-emerald-500/[0.06] px-2 py-1.5">
          <p className="text-[10.5px] font-medium text-emerald-100/90">
            {TEMPLATE_ADDED_COPY.title(justAdded.goals, template.label)}
            {justAdded.added.length > 0 && `. ${BOARD_COPY.addedRoutine(justAdded.added.join(" and "))}`}
            {justAdded.extended.length > 0 && `. ${BOARD_COPY.extendedRoutine(justAdded.extended.join(" and "))}`}.
          </p>
          <p className="text-[10px] text-emerald-100/70 mt-0.5 leading-relaxed">{TEMPLATE_ADDED_COPY.help}</p>
          <button onClick={() => setJustAdded(null)} className="text-[10px] text-zinc-500 hover:text-zinc-300 mt-0.5 transition-colors">
            {TEMPLATE_ADDED_COPY.dismiss}
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mt-1.5">
        <button
          onClick={add}
          disabled={fresh.length === 0 && unmet.length === 0}
          className="text-[11px] px-2 py-0.5 rounded-full border border-white/15 text-zinc-100 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {fresh.length === 0 ? (unmet.length === 0 ? "added" : "add the routine") : "Add this set"}
        </button>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="text-[10.5px] text-zinc-500 hover:text-zinc-200 transition-colors"
        >
          {open ? "hide what is in it" : "see what is in it"}
        </button>
      </div>

      {open && (
        <ul className="mt-2 space-y-0.5 border-t border-white/[0.07] pt-2">
          {targets.map((t) => {
            const already = targetAlreadyAdded(plan, t)
            const shape = shapeFromTarget(t, levelValues[t.id])
            const detail =
              shape.type === "milestone_ladder" && shape.ladder
                ? `${shape.ladder.start} → ${shape.ladder.target} ${shape.unit}`.trim()
                : shape.type === "habit_ramp"
                  ? `${shape.daysPerWeek}×/wk`
                  : shape.checkpointTitles.length > 0
                    ? `${shape.checkpointTitles.length} steps`
                    : "done or not"
            return (
              <li key={t.id} className="flex items-baseline gap-1.5">
                <span className="text-[9px] shrink-0" aria-hidden>{SHAPE_ICON[shape.type]}</span>
                <span className={`text-[10.5px] min-w-0 ${already ? "text-zinc-600 line-through" : "text-zinc-300"}`}>{t.label}</span>
                <span className="ml-auto text-[9.5px] text-zinc-600 tabular-nums shrink-0">{already ? "added" : detail}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/** The routine a need points at, by its own name. */
function routineLabel(need: RoutineNeed): string {
  return ROUTINE_BLUEPRINT_MAP.get(need.blueprintId)?.label ?? need.blueprintId
}
