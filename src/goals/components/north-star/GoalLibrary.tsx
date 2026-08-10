"use client"

/**
 * Common goals for one area, and the templates that turn several on at once.
 *
 * Nothing here is new material. It reads the framework catalogue that
 * /test/new-goals already uses — 166 curated targets under 23 objectives, and
 * 26 templates with a Beginner / Intermediate / Advanced level — so a goal
 * picked here is the same goal that page would make, arriving with its numbers,
 * its shape and its checkpoints already filled in.
 *
 * Templates sit above the list on purpose. Somebody who knows they want
 * "Strength Focus" should not have to tick nine boxes to say so, and somebody
 * who does not can ignore the row and pick one goal at a time underneath.
 */

import { useState } from "react"
import { Check, ChevronDown, Plus } from "lucide-react"
import type { NsArea, NsPlan } from "@/src/goals/types"
import { LIBRARY_COPY, TEMPLATE_ADDED_COPY, TEMPLATE_PREVIEW_COPY } from "@/src/goals/data/northStar"
import { PILLARS, type FrameworkTarget, type Template } from "@/src/goals/data/newGoalFramework"
import {
  cumulativeUnit,
  libraryFor,
  libraryPillarForArea,
  shapeFromTarget,
  targetAlreadyAdded,
  targetsForTemplate,
  templatesFor,
} from "@/src/goals/northStarService"

const SHAPE_ICON: Record<string, string> = { milestone_ladder: "🎯", habit_ramp: "🔁", achievement: "🏁" }

const LEVEL_LABELS = ["Beginner", "Intermediate", "Advanced"]

/**
 * What one library row is, in a few characters.
 *
 * The unit runs through `cumulativeUnit` because three framework targets count a
 * running total while carrying a per-week unit: Build Hours is 1 → 500 with the
 * unit "hours/week", which read as "500 hours a week" and is 71 hours a day.
 */
function targetDetail(target: FrameworkTarget, valueOverride?: number): string {
  const shape = shapeFromTarget(target, valueOverride)
  if (shape.type === "milestone_ladder" && shape.ladder) {
    return `${shape.ladder.start} → ${shape.ladder.target} ${shape.unit}`.trim()
  }
  if (shape.type === "habit_ramp") return `${shape.daysPerWeek}×/wk`
  return shape.checkpointTitles.length > 0 ? `${shape.checkpointTitles.length} steps` : "done or not"
}

export function GoalLibrary({ area, plan, onAddTarget, onAddTemplate }: {
  area: NsArea
  plan: NsPlan
  onAddTarget: (areaId: string, targetId: string) => void
  onAddTemplate: (areaId: string, templateId: string, levelIndex: number) => void
}) {
  const seeded = libraryPillarForArea(area)
  // A user-added area has no library of its own, so it borrows one. Local state
  // rather than stored: which catalogue you browse is a choice about right now.
  const [picked, setPicked] = useState<string | null>(null)
  const pillarId = seeded ?? picked
  const [open, setOpen] = useState(false)
  const [openObjective, setOpenObjective] = useState<string | null>(null)
  const [level, setLevel] = useState(1)

  if (!pillarId) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <p className="text-[12px] text-zinc-300">{LIBRARY_COPY.title}</p>
        <p className="text-[11px] text-zinc-500 mt-0.5">{LIBRARY_COPY.pillarPrompt}</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {PILLARS.map((p) => (
            <button
              key={p.id}
              onClick={() => { setPicked(p.id); setOpen(true) }}
              className="text-[11px] px-2 py-0.5 rounded-full border border-white/15 text-zinc-300 hover:bg-white/10 hover:border-white/30 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const groups = libraryFor(pillarId).filter((g) => g.targets.length > 0)
  const templates = templatesFor(pillarId)
  const total = groups.reduce((n, g) => n + g.targets.length, 0)

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02]">
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="w-full flex items-center gap-2 px-3 py-2.5 text-left group">
        <ChevronDown className={`size-3.5 shrink-0 text-zinc-500 transition-transform ${open ? "" : "-rotate-90"}`} />
        <span className="text-[12.5px] text-zinc-200 group-hover:text-white transition-colors">{LIBRARY_COPY.title}</span>
        <span className="ml-auto text-[10.5px] text-zinc-500 tabular-nums shrink-0">
          {total} to choose from · {templates.length} sets
        </span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3">
          <p className="text-[11px] text-zinc-500 leading-relaxed">{LIBRARY_COPY.help}</p>

          {templates.length > 0 && (
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
              <p className="text-[12px] text-zinc-200">{LIBRARY_COPY.templateTitle}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{LIBRARY_COPY.templateHelp}</p>

              <div className="flex flex-wrap items-center gap-1.5 mt-2">
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
                <span className="text-[10px] text-zinc-600 basis-full">{LIBRARY_COPY.levelHelp}</span>
              </div>

              {/* A template used to be a title, a sentence, and "+ 9 goals",
                  with the actual nine hidden in a `title` attribute nobody sees
                  on a phone. Taking a set of nine goals sight unseen is the one
                  thing on this page that most needs to be a considered choice,
                  so what is in it is one click away and shows the numbers at the
                  level currently picked. */}
              <div className="grid gap-1.5 sm:grid-cols-2 mt-2">
                {templates.map((t) => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    plan={plan}
                    level={level}
                    color={area.color}
                    onAdd={() => onAddTemplate(area.id, t.id, level)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            {groups.map(({ objective, targets }) => {
              const isOpen = openObjective === objective.id
              const added = targets.filter((t) => targetAlreadyAdded(plan, t)).length
              return (
                <div key={objective.id} className="rounded-lg border border-white/10 bg-white/[0.02]">
                  <button
                    onClick={() => setOpenObjective(isOpen ? null : objective.id)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left group"
                  >
                    <ChevronDown className={`size-3 shrink-0 text-zinc-600 transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                    <span className="text-[12px] text-zinc-200 group-hover:text-white transition-colors">{objective.label}</span>
                    <span className="ml-auto text-[10px] text-zinc-600 tabular-nums shrink-0">
                      {added > 0 ? `${added}/${targets.length}` : targets.length}
                    </span>
                  </button>
                  {isOpen && (
                    <ul className="px-2.5 pb-2 space-y-0.5">
                      <li className="text-[10.5px] text-zinc-600 leading-relaxed pb-1">{objective.description}</li>
                      {targets.map((t) => {
                        const already = targetAlreadyAdded(plan, t)
                        const shape = shapeFromTarget(t)
                        const detail = targetDetail(t)
                        return (
                          <li key={t.id}>
                            <button
                              onClick={() => onAddTarget(area.id, t.id)}
                              disabled={already}
                              className={`w-full flex items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-colors ${
                                already ? "border-white/10 bg-white/[0.04] cursor-default" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/25"
                              }`}
                            >
                              <span
                                className="size-4 rounded border flex items-center justify-center shrink-0"
                                style={already ? { backgroundColor: area.color, borderColor: area.color } : { borderColor: "rgba(255,255,255,0.25)" }}
                              >
                                {already ? <Check className="size-2.5 text-zinc-950" /> : <Plus className="size-2.5 text-zinc-400" />}
                              </span>
                              <span className="text-[10px] shrink-0" aria-hidden>{SHAPE_ICON[shape.type]}</span>
                              <span className={`text-[12px] min-w-0 ${already ? "text-zinc-500" : "text-zinc-100"}`}>{t.label}</span>
                              <span className="ml-auto text-[10px] text-zinc-500 tabular-nums shrink-0">{already ? LIBRARY_COPY.added : detail}</span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * One template, with what is actually inside it.
 *
 * The preview is not decoration. A template turns on up to nine goals at once
 * with numbers already chosen, and "+ 9 goals" is not enough to decide on. Each
 * row shows the shape it will take and the number it will carry AT THE LEVEL
 * CURRENTLY PICKED, so switching Beginner to Advanced visibly changes the list
 * rather than changing something you have to take on faith.
 */
function TemplateCard({ template, plan, level, color, onAdd }: {
  template: Template
  plan: NsPlan
  level: number
  color: string
  onAdd: () => void
}) {
  const [open, setOpen] = useState(false)
  /**
   * How many arrived when this card was last used.
   *
   * Adding nine goals at once used to be silent: the button greyed out and the
   * nine appeared in a list further up the dialog, past the fold. The strip says
   * what happened and, more importantly, that every one of them already carries
   * a date and a shape you can change.
   */
  const [justAdded, setJustAdded] = useState(0)
  const targets = targetsForTemplate(template)
  const fresh = targets.filter((t) => !targetAlreadyAdded(plan, t))
  const levelValues = (template.levels[level] ?? template.levels[0])?.targetValues ?? {}

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
      <div className="flex items-baseline gap-2">
        <span className="text-[12px] font-medium text-zinc-100 min-w-0">{template.label}</span>
        <span className="ml-auto text-[10px] tabular-nums shrink-0" style={{ color }}>
          {fresh.length === 0 ? LIBRARY_COPY.added : `+ ${fresh.length} goals`}
        </span>
      </div>
      <p className="text-[10.5px] text-zinc-500 mt-0.5 leading-relaxed">{template.description}</p>

      {justAdded > 0 && (
        <div className="mt-1.5 rounded-md border border-emerald-400/25 bg-emerald-500/[0.06] px-2 py-1.5">
          <p className="text-[10.5px] font-medium text-emerald-100/90">
            {TEMPLATE_ADDED_COPY.title(justAdded, template.label)}
          </p>
          <p className="text-[10px] text-emerald-100/70 mt-0.5 leading-relaxed">{TEMPLATE_ADDED_COPY.help}</p>
          <button onClick={() => setJustAdded(0)} className="text-[10px] text-zinc-500 hover:text-zinc-300 mt-0.5 transition-colors">
            {TEMPLATE_ADDED_COPY.dismiss}
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mt-1.5">
        <button
          onClick={() => { setJustAdded(fresh.length); onAdd() }}
          disabled={fresh.length === 0}
          className="text-[11px] px-2 py-0.5 rounded-full border border-white/15 text-zinc-100 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {fresh.length === 0 ? LIBRARY_COPY.added : "Add this set"}
        </button>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="text-[10.5px] text-zinc-500 hover:text-zinc-200 transition-colors"
        >
          {open ? TEMPLATE_PREVIEW_COPY.hide : TEMPLATE_PREVIEW_COPY.show}
        </button>
      </div>

      {open && (
        <ul className="mt-2 space-y-0.5 border-t border-white/[0.07] pt-2">
          <li className="text-[9.5px] text-zinc-600">{TEMPLATE_PREVIEW_COPY.levelNote(LEVEL_LABELS[level] ?? LEVEL_LABELS[0])}</li>
          {targets.map((t) => {
            const already = targetAlreadyAdded(plan, t)
            return (
              <li key={t.id} className="flex items-baseline gap-1.5">
                <span className="text-[9px] shrink-0" aria-hidden>{SHAPE_ICON[shapeFromTarget(t).type]}</span>
                <span className={`text-[10.5px] min-w-0 ${already ? "text-zinc-600 line-through" : "text-zinc-300"}`}>{t.label}</span>
                <span className="ml-auto text-[9.5px] text-zinc-600 tabular-nums shrink-0">
                  {already ? LIBRARY_COPY.added : targetDetail(t, levelValues[t.id])}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
