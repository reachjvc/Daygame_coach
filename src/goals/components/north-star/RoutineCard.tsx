"use client"

/**
 * One routine in the stack.
 *
 * Collapsed it is a single line: what it is, how long it takes, how often it
 * runs. OPEN IT AND YOU CAN EDIT IT — presets, the step library, reordering,
 * all of it. A previous pass put the builder behind the surface's Edit toggle
 * and showed a read-only list instead, so opening the morning routine looked
 * like a routine that could not be changed and had no presets. Opening a
 * routine is the act of working on it; there is nothing else you would open it
 * for.
 *
 * The Edit toggle above still governs STRUCTURE: renaming a routine, removing
 * one, adding one. Not what is inside.
 *
 * Two kinds, and they behave differently on purpose:
 *   sequence — an ordered stack sized in minutes (morning, night, manifestation)
 *   weekly   — a set of habits, each with its own days per week (training, work)
 */

import { useState } from "react"
import { Check, ChevronDown, Minus, Plus, X } from "lucide-react"
import type { NsArea, NsRoutine } from "@/src/goals/types"
import { NS_SPLITS, ROUTINE_BLUEPRINT_MAP, SERVES_COPY } from "@/src/goals/data/northStar"
import { routineCoverage, routineIsUntouched, routineMinutes, routineSummary, splitPreview } from "@/src/goals/northStarService"
import { Peek } from "./Peek"

const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export interface RoutineHandlers {
  onRename: (routineId: string, label: string) => void
  onArea: (routineId: string, areaId: string | null) => void
  /** The other areas this routine lifts, beyond the one it is filed under. */
  onServes: (routineId: string, areaIds: string[]) => void
  onToggleStep: (routineId: string, stepId: string) => void
  onAddCustomStep: (routineId: string, title: string, minutes: number, daysPerWeek: number) => void
  onRemoveStep: (routineId: string, stepId: string) => void
  onStepDays: (routineId: string, stepId: string, daysPerWeek: number) => void
  onMoveStep: (routineId: string, index: number, dir: -1 | 1) => void
  onPreset: (routineId: string, presetId: string) => void
  onClearSteps: (routineId: string) => void
  onDays: (routineId: string, daysPerWeek: number) => void
  onRemoveRoutine: (routineId: string) => void
  onApplySplit: (routineId: string, splitId: string) => void
  onAddSplitDay: (routineId: string) => void
  onRenameSplitDay: (routineId: string, dayId: string, name: string) => void
  onMoveSplitDay: (routineId: string, index: number, dir: -1 | 1) => void
  onRemoveSplitDay: (routineId: string, dayId: string) => void
  onClearSplit: (routineId: string) => void
}

export function RoutineCard({
  routine,
  areas,
  editing,
  open,
  onToggleOpen,
  handlers,
}: {
  routine: NsRoutine
  areas: NsArea[]
  /** Follows the one Edit toggle on the surface above. */
  editing: boolean
  open: boolean
  onToggleOpen: () => void
  handlers: RoutineHandlers
}) {
  const bp = ROUTINE_BLUEPRINT_MAP.get(routine.blueprintId)
  const area = areas.find((a) => a.id === routine.areaId)
  const color = area?.color ?? "#a1a1aa"
  const inStack = new Set(routine.steps.map((s) => s.id))
  const coverage = routineCoverage(routine)
  const untouched = routineIsUntouched(routine)
  const sequence = routine.kind === "sequence"
  const presets = bp?.presets ?? []
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [draft, setDraft] = useState("")
  const [draftMinutes, setDraftMinutes] = useState(5)
  const [draftDays, setDraftDays] = useState(5)

  const addCustom = () => {
    if (!draft.trim()) return
    handlers.onAddCustomStep(routine.id, draft, draftMinutes, draftDays)
    setDraft("")
  }

  return (
    <div className="border-b border-white/[0.07] last:border-b-0">
      <div className="flex items-center gap-2.5 px-5 py-3">
        <button onClick={onToggleOpen} aria-expanded={open} aria-label={`${open ? "Close" : "Open"} ${routine.label}`} className="shrink-0 text-zinc-500 hover:text-zinc-200 transition-colors">
          <ChevronDown className={`size-4 transition-transform ${open ? "" : "-rotate-90"}`} />
        </button>
        <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="min-w-0 flex-1">
          {editing ? (
            <input
              value={routine.label}
              onChange={(e) => handlers.onRename(routine.id, e.target.value)}
              aria-label={`Name for the ${routine.label} routine`}
              className="w-full bg-transparent text-sm font-medium text-zinc-100 focus:outline-none border-b border-transparent focus:border-white/25 py-0.5"
            />
          ) : (
            <span className="block text-sm font-medium text-zinc-100 py-0.5">{routine.label}</span>
          )}
          <span className="block text-[11px] text-zinc-500 tabular-nums">
            {routineSummary(routine)}
            {/* Say whose stack this is. A default the user never chose, shown
                without a word, reads back later as a decision they made. */}
            {untouched && <span className="ml-1.5 text-zinc-600">· our starting stack, edit it</span>}
          </span>
        </span>
        {editing && (confirmRemove ? (
          <span className="flex items-center gap-2 shrink-0 text-[11px]">
            <button onClick={() => handlers.onRemoveRoutine(routine.id)} className="text-rose-300 hover:text-rose-200">remove?</button>
            <button onClick={() => setConfirmRemove(false)} className="text-zinc-500 hover:text-zinc-300">keep</button>
          </span>
        ) : (
          <button
            onClick={() => setConfirmRemove(true)}
            aria-label={`Remove the ${routine.label} routine`}
            className="shrink-0 text-zinc-700 hover:text-rose-300 transition-colors"
          >
            <X className="size-3.5" />
          </button>
        ))}
      </div>

      {open && (
        <div className="px-5 pb-4 space-y-3">
          {bp && <p className="text-[11.5px] text-zinc-500 leading-relaxed">{bp.why}</p>}

          {/* Which areas this routine actually carries.
              A morning routine is not a health routine. It holds up mind,
              emotions, health and spirituality at once, and filing it under one
              of them, or under none, meant opening Emotions showed nothing even
              though something runs there every single day. Ticked here, it
              appears inside each of those areas. */}
          <div>
            <p className="text-[11.5px] text-zinc-300">{SERVES_COPY.routine.label}</p>
            <p className="text-[10.5px] text-zinc-600 mt-0.5 leading-relaxed">{SERVES_COPY.routine.help}</p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {areas.filter((a) => a.id !== routine.areaId).map((a) => {
                const on = routine.serves.includes(a.id)
                return (
                  <button
                    key={a.id}
                    onClick={() =>
                      handlers.onServes(routine.id, on ? routine.serves.filter((id) => id !== a.id) : [...routine.serves, a.id])
                    }
                    aria-pressed={on}
                    className="text-[10.5px] px-2 py-0.5 rounded-full border transition-colors"
                    style={
                      on
                        ? { borderColor: `${a.color}88`, backgroundColor: `${a.color}1f`, color: "#f4f4f5" }
                        : { borderColor: "rgba(255,255,255,0.1)", color: "#71717a" }
                    }
                  >
                    {a.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[11px] text-zinc-500" htmlFor={`area-${routine.id}`}>Filed under</label>
            <select
              id={`area-${routine.id}`}
              value={routine.areaId ?? ""}
              onChange={(e) => handlers.onArea(routine.id, e.target.value || null)}
              className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-[11px] text-zinc-200 focus:outline-none focus:border-white/25"
            >
              <option value="" className="bg-zinc-900">every area</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id} className="bg-zinc-900">{a.label}</option>
              ))}
            </select>

            <span className="ml-auto flex items-center gap-1.5">
              <span className="text-[11px] text-zinc-500">{sequence ? "runs" : "training days"}</span>
              <button
                onClick={() => handlers.onDays(routine.id, Math.max(1, routine.daysPerWeek - 1))}
                disabled={routine.daysPerWeek <= 1}
                aria-label={`Fewer days for ${routine.label}`}
                className="size-5 rounded border border-white/15 text-zinc-400 hover:bg-white/10 disabled:opacity-30 flex items-center justify-center"
              ><Minus className="size-3" /></button>
              <span className="text-[11px] text-zinc-300 tabular-nums w-12 text-center">{routine.daysPerWeek}×/wk</span>
              <button
                onClick={() => handlers.onDays(routine.id, Math.min(7, routine.daysPerWeek + 1))}
                disabled={routine.daysPerWeek >= 7}
                aria-label={`More days for ${routine.label}`}
                className="size-5 rounded border border-white/15 text-zinc-400 hover:bg-white/10 disabled:opacity-30 flex items-center justify-center"
              ><Plus className="size-3" /></button>
            </span>
          </div>

          {presets.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Start from a preset</span>
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlers.onPreset(routine.id, preset.id)}
                  title={preset.note}
                  className="text-[11px] px-2.5 py-1 rounded-lg border border-white/15 text-zinc-300 hover:bg-white/10 hover:border-white/30 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
              {routine.steps.length > 0 && (
                <button onClick={() => handlers.onClearSteps(routine.id)} className="ml-auto text-[10px] text-zinc-600 hover:text-rose-300 transition-colors">
                  clear
                </button>
              )}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2 items-start">
            {/* The library. Eighteen morning steps is a column taller than the
                stack beside it, so it shows the first few and fades, the same
                way the value list does. */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Pick your steps</p>
              <Peek more={`Show all ${(bp?.library ?? []).length} steps`} collapsedHeight={200}>
              <ul className="mt-2 space-y-1">
                {(bp?.library ?? []).map((item) => {
                  const added = inStack.has(item.id)
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => handlers.onToggleStep(routine.id, item.id)}
                        aria-pressed={added}
                        className={`w-full flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-left transition-all ${
                          added ? "border-white/20 bg-white/[0.07]" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                        }`}
                      >
                        <span
                          className="size-4 rounded-md border flex items-center justify-center shrink-0 transition-colors"
                          style={added ? { backgroundColor: color, borderColor: color } : { borderColor: "rgba(255,255,255,0.25)" }}
                        >
                          {added ? <Check className="size-2.5 text-zinc-950" /> : <Plus className="size-2.5 text-zinc-400" />}
                        </span>
                        <span className={`text-[12.5px] min-w-0 ${added ? "text-zinc-400" : "text-zinc-100"}`}>{item.title}</span>
                        <span className="ml-auto text-[10.5px] text-zinc-500 tabular-nums shrink-0">
                          {sequence ? `${item.minutes}m` : `${item.daysPerWeek}×`}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              </Peek>

              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/5">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom() } }}
                  placeholder="Your own step"
                  aria-label={`Add your own step to ${routine.label}`}
                  className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-[11.5px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
                />
                {sequence ? (
                  <input
                    type="number"
                    min={0}
                    max={180}
                    value={draftMinutes}
                    onChange={(e) => setDraftMinutes(Math.max(0, Math.min(180, Number(e.target.value))))}
                    aria-label="Minutes for your step"
                    className="w-12 bg-white/5 border border-white/10 rounded-md px-1.5 py-1 text-[11px] text-zinc-200 focus:outline-none focus:border-white/30 tabular-nums"
                  />
                ) : (
                  <select
                    value={draftDays}
                    onChange={(e) => setDraftDays(Number(e.target.value))}
                    aria-label="Days per week for your step"
                    className="bg-white/5 border border-white/10 rounded-md px-1.5 py-1 text-[10.5px] text-zinc-300 focus:outline-none shrink-0"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n} className="bg-zinc-900">{n}×/wk</option>)}
                  </select>
                )}
                <button
                  onClick={addCustom}
                  disabled={!draft.trim()}
                  className="shrink-0 text-[11px] px-2 py-1 rounded-md border border-white/15 text-zinc-300 hover:bg-white/10 disabled:opacity-30 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Your stack */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="flex items-baseline gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  {sequence ? "Your routine, in order" : "Your week"}
                </p>
                {sequence && routine.steps.length > 0 && (
                  <span className="ml-auto text-[11px] text-zinc-400 tabular-nums">about {routineMinutes(routine)} min</span>
                )}
              </div>

              {routine.steps.length === 0 ? (
                <p className="text-[12px] text-zinc-500 mt-2 leading-relaxed">
                  Nothing in it yet. Pick from the left, or start from a preset. On a chaotic day any one step counts.
                </p>
              ) : (
                <ol className="mt-2 space-y-1">
                  {routine.steps.map((step, i) => (
                    <li key={step.id} className="group/step flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5">
                      <span
                        className="text-[10px] font-bold size-4.5 rounded-full flex items-center justify-center shrink-0 tabular-nums"
                        style={{ backgroundColor: `${color}26`, color }}
                      >{i + 1}</span>
                      <span className="text-[12.5px] text-zinc-200 min-w-0 flex-1">{step.title}</span>
                      {sequence ? (
                        <span className="text-[10.5px] text-zinc-500 tabular-nums shrink-0">{step.minutes}m</span>
                      ) : (
                        <select
                          value={step.daysPerWeek}
                          onChange={(e) => handlers.onStepDays(routine.id, step.id, Number(e.target.value))}
                          aria-label={`Days per week for ${step.title}`}
                          className="bg-white/5 border border-white/10 rounded px-1 py-0.5 text-[10px] text-zinc-300 focus:outline-none shrink-0"
                        >
                          {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n} className="bg-zinc-900">{n}×/wk</option>)}
                        </select>
                      )}
                      <span className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => handlers.onMoveStep(routine.id, i, -1)}
                          disabled={i === 0}
                          aria-label={`Move ${step.title} earlier`}
                          className="size-4.5 rounded border border-white/10 text-zinc-500 hover:bg-white/10 disabled:opacity-25 flex items-center justify-center"
                        ><ChevronDown className="size-3 rotate-180" /></button>
                        <button
                          onClick={() => handlers.onMoveStep(routine.id, i, 1)}
                          disabled={i === routine.steps.length - 1}
                          aria-label={`Move ${step.title} later`}
                          className="size-4.5 rounded border border-white/10 text-zinc-500 hover:bg-white/10 disabled:opacity-25 flex items-center justify-center"
                        ><ChevronDown className="size-3" /></button>
                        <button
                          onClick={() => handlers.onRemoveStep(routine.id, step.id)}
                          aria-label={`Remove ${step.title}`}
                          className="size-4.5 rounded text-zinc-600 hover:text-rose-300 flex items-center justify-center opacity-0 group-hover/step:opacity-100 focus:opacity-100 transition-all"
                        ><X className="size-3" /></button>
                      </span>
                    </li>
                  ))}
                </ol>
              )}

              {/* Mind, body and spirit. The floor is to touch all three. */}
              {routine.steps.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                  <span className="text-[9px] uppercase tracking-wide text-zinc-600">Covers</span>
                  {(["mind", "body", "spirit"] as const).map((d) => (
                    <span
                      key={d}
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${coverage[d] ? "border-emerald-400/40 text-emerald-300" : "border-white/10 text-zinc-600"}`}
                    >
                      {coverage[d] ? "✓" : "·"} {d}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* The training-week designer. Only the workout routine has one. */}
          {bp?.split && <SplitDesigner routine={routine} color={color} handlers={handlers} />}
        </div>
      )}
    </div>
  )
}

function SplitDesigner({ routine, color, handlers }: { routine: NsRoutine; color: string; handlers: RoutineHandlers }) {
  const [picking, setPicking] = useState(false)
  const preview = splitPreview(routine)

  if (routine.splitDays.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Name your training days</p>
        {picking ? (
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {NS_SPLITS.map((s) => (
              <button
                key={s.id}
                onClick={() => { handlers.onApplySplit(routine.id, s.id); setPicking(false) }}
                title={`${s.days.join(" · ")} — ${s.perWeek}×/wk`}
                className="text-[11px] px-2 py-0.5 rounded-full border border-white/15 text-zinc-300 hover:bg-white/10 hover:border-white/30 transition-colors"
              >
                {s.label} <span className="text-zinc-500">×{s.perWeek}</span>
              </button>
            ))}
            <button onClick={() => setPicking(false)} className="text-[10px] text-zinc-600 hover:text-zinc-400">cancel</button>
          </div>
        ) : (
          <button
            onClick={() => setPicking(true)}
            className="mt-1 text-[11.5px] text-zinc-400 hover:text-zinc-200 underline decoration-dotted underline-offset-2 transition-colors"
          >
            Pick a split. Push and pull, upper and lower, or your own
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-center gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Training days, in order</p>
        <button onClick={() => handlers.onClearSplit(routine.id)} className="ml-auto text-[10px] text-zinc-600 hover:text-rose-300 transition-colors">
          remove split
        </button>
      </div>
      <ul className="mt-2 space-y-1">
        {routine.splitDays.map((d, i) => (
          <li key={d.id} className="group/day flex items-center gap-1.5">
            <span
              className="text-[10px] font-bold size-4.5 rounded-full flex items-center justify-center shrink-0 tabular-nums"
              style={{ backgroundColor: `${color}26`, color }}
            >{i + 1}</span>
            <input
              value={d.name}
              onChange={(e) => handlers.onRenameSplitDay(routine.id, d.id, e.target.value)}
              aria-label={`Name for training day ${i + 1}`}
              className="flex-1 min-w-0 bg-transparent border-b border-transparent hover:border-white/10 focus:border-white/25 text-[12.5px] text-zinc-200 focus:outline-none py-0.5 transition-colors"
            />
            <span className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={() => handlers.onMoveSplitDay(routine.id, i, -1)}
                disabled={i === 0}
                aria-label={`Move ${d.name} earlier`}
                className="size-4.5 rounded border border-white/10 text-zinc-500 hover:bg-white/10 disabled:opacity-25 flex items-center justify-center"
              ><ChevronDown className="size-3 rotate-180" /></button>
              <button
                onClick={() => handlers.onMoveSplitDay(routine.id, i, 1)}
                disabled={i === routine.splitDays.length - 1}
                aria-label={`Move ${d.name} later`}
                className="size-4.5 rounded border border-white/10 text-zinc-500 hover:bg-white/10 disabled:opacity-25 flex items-center justify-center"
              ><ChevronDown className="size-3" /></button>
              <button
                onClick={() => handlers.onRemoveSplitDay(routine.id, d.id)}
                disabled={routine.splitDays.length <= 1}
                aria-label={`Remove ${d.name}`}
                className="size-4.5 rounded text-zinc-600 hover:text-rose-300 disabled:opacity-25 flex items-center justify-center opacity-0 group-hover/day:opacity-100 focus:opacity-100 transition-all"
              ><X className="size-3" /></button>
            </span>
          </li>
        ))}
      </ul>
      <button
        onClick={() => handlers.onAddSplitDay(routine.id)}
        className="mt-1.5 text-[11px] px-2 py-0.5 rounded-full border border-dashed border-white/20 text-zinc-500 hover:text-zinc-300 hover:border-white/30 transition-colors"
      >+ day</button>

      {preview.length > 0 && (
        <p className="text-[11px] text-zinc-400 mt-2">
          Your week:{" "}
          {preview.map((p, i) => (
            <span key={i}>
              {i > 0 && <span className="text-zinc-600"> · </span>}
              <span className="text-zinc-500">{WEEKDAY_SHORT[i]}</span> <span style={{ color }}>{p.dayName}</span>
            </span>
          ))}
          {routine.daysPerWeek < routine.splitDays.length && (
            <span className="text-zinc-600"> — only the first {routine.daysPerWeek} run each week. Raise the days to use them all.</span>
          )}
          {routine.daysPerWeek > routine.splitDays.length && <span className="text-zinc-600"> — the days repeat within the week.</span>}
        </p>
      )}
    </div>
  )
}
