"use client"

/**
 * The week, drawn.
 *
 * The door for somebody who does not think in outcomes and does think in
 * hours. "Gym three times a week" is a goal they will not book; "Tuesday and
 * Thursday at 7, Saturday at 10" is a week they will live, and it is the same
 * information with the one part filled in that decides whether it happens.
 *
 * WHAT IS DRAWN HERE IS THE PLAN ITSELF, not a picture of it. Every block is a
 * routine step: the same object the routine cards edit, counted in the same
 * weekly load, ticked in the same places. Drawing a block adds a step, dragging
 * nothing anywhere means the grid can be used with one finger, and taking a
 * block off the grid leaves the step alone and unplaced rather than deleting
 * somebody's routine because they wanted their morning back.
 *
 * The tray beside it is everything already running that has never been given a
 * time — which, the first time anybody opens this, is all four routines.
 */

import { useState } from "react"
import { Trash2, X } from "lucide-react"
import type { NsPlan } from "@/src/goals/types"
import { WEEK_COPY, WEEK_DAYS, WEEK_HOURS } from "@/src/goals/data/northStarStart"
import { routineForMinute, unplacedSteps, weekBlocks } from "@/src/goals/northStarService"
import { RampHeader } from "./StartRamps"

export interface WeekHandlers {
  onAddBlock: (routineId: string, title: string, minutes: number, days: number[], startMin: number) => void
  onPlaceStep: (routineId: string, stepId: string, days: number[], startMin: number | null) => void
  onUpdateStep: (routineId: string, stepId: string, patch: { title?: string; minutes?: number }) => void
  onRemoveStep: (routineId: string, stepId: string) => void
}

/** The slot being written into: either a new block, or one already on the grid. */
type Draft =
  | { mode: "new"; day: number; startMin: number; title: string; routineId: string; minutes: number; days: number[] }
  | { mode: "edit"; routineId: string; stepId: string; title: string; minutes: number; days: number[]; startMin: number }

const SNAP = 15
const ROW_HEIGHT = 34

export function WeekGrid({ plan, handlers, onBack }: { plan: NsPlan; handlers: WeekHandlers; onBack: () => void }) {
  const [wide, setWide] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [placing, setPlacing] = useState<{ routineId: string; stepId: string; title: string } | null>(null)

  const from = wide ? 0 : WEEK_HOURS.from
  const to = wide ? 24 : WEEK_HOURS.to
  const fromMin = from * 60
  const pxPerMin = ROW_HEIGHT / 60
  const height = (to - from) * ROW_HEIGHT

  const blocks = weekBlocks(plan)
  const tray = unplacedSteps(plan)
  // What is ON THE GRID, not the whole week's load. The number sits under a
  // picture, and a number that counts things the picture does not show is the
  // page contradicting itself.
  const drawnMinutes = blocks.reduce((total, b) => total + b.minutes, 0)

  /** Where in the day a click landed, snapped, clamped to the visible window. */
  const minutesFrom = (clientY: number, column: HTMLElement): number => {
    const rect = column.getBoundingClientRect()
    const raw = fromMin + (clientY - rect.top) / pxPerMin
    const snapped = Math.round(raw / SNAP) * SNAP
    return Math.max(fromMin, Math.min(to * 60 - SNAP, snapped))
  }

  const clickColumn = (day: number, e: React.MouseEvent<HTMLDivElement>) => {
    const startMin = minutesFrom(e.clientY, e.currentTarget)
    if (placing) {
      handlers.onPlaceStep(placing.routineId, placing.stepId, [day], startMin)
      setPlacing(null)
      return
    }
    // The routine that owns that hour, by the same rule the written day uses.
    // Everything defaulting into the morning routine puts somebody's Tuesday
    // afternoon inside their morning.
    const routineId = routineForMinute(plan, startMin)
    if (!routineId) return
    setDraft({ mode: "new", day, startMin, title: "", routineId, minutes: 30, days: [day] })
  }

  const save = () => {
    if (!draft || !draft.title.trim()) return
    if (draft.mode === "new") {
      handlers.onAddBlock(draft.routineId, draft.title, draft.minutes, draft.days, draft.startMin)
    } else {
      handlers.onUpdateStep(draft.routineId, draft.stepId, { title: draft.title, minutes: draft.minutes })
      handlers.onPlaceStep(draft.routineId, draft.stepId, draft.days, draft.startMin)
    }
    setDraft(null)
  }

  return (
    <div>
      <RampHeader title={WEEK_COPY.title} help={WEEK_COPY.help} onBack={onBack} />

      <div className="flex flex-wrap items-center gap-3 mt-3">
        <span className="text-[11px] text-zinc-500 tabular-nums">{WEEK_COPY.load(Math.round(drawnMinutes / 6) / 10)}</span>
        <button onClick={() => setWide(!wide)} className="ml-auto text-[11px] text-zinc-500 hover:text-zinc-200 transition-colors">
          {wide ? WEEK_COPY.narrower : WEEK_COPY.wider}
        </button>
      </div>

      {placing && (
        <div className="mt-2 rounded-xl border border-violet-400/40 bg-violet-500/10 px-3 py-2 flex items-center gap-3">
          <span className="text-[12px] text-violet-100 min-w-0 truncate">{WEEK_COPY.placing(placing.title)}</span>
          <button onClick={() => setPlacing(null)} className="ml-auto shrink-0 text-[11px] text-zinc-400 hover:text-white transition-colors">
            {WEEK_COPY.cancel}
          </button>
        </div>
      )}

      <div className="grid gap-3 mt-3 lg:grid-cols-[minmax(0,1fr)_190px] items-start">
        {/* ---------------------------------------------------------- the grid */}
        <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="grid grid-cols-[2.5rem_repeat(7,minmax(0,1fr))] border-b border-white/10">
            <span />
            {WEEK_DAYS.map((day) => (
              <span key={day} className="px-1 py-1.5 text-[10.5px] text-zinc-400 text-center">{day}</span>
            ))}
          </div>

          <div className="overflow-y-auto max-h-[26rem]">
            <div className="grid grid-cols-[2.5rem_repeat(7,minmax(0,1fr))]" style={{ height }}>
              {/* The hours down the side. */}
              <div className="relative border-r border-white/[0.07]">
                {Array.from({ length: to - from }, (_, i) => (
                  <div key={i} className="absolute right-1 text-[9.5px] text-zinc-600 tabular-nums" style={{ top: i * ROW_HEIGHT - 4 }}>
                    {String(from + i).padStart(2, "0")}
                  </div>
                ))}
              </div>

              {WEEK_DAYS.map((label, day) => (
                <div
                  key={label}
                  data-day-column
                  onClick={(e) => clickColumn(day, e)}
                  className={`relative border-r border-white/[0.05] last:border-r-0 ${placing ? "cursor-copy" : "cursor-cell"}`}
                >
                  {/* Hour lines, so a block at 07:00 reads as 07:00. */}
                  {Array.from({ length: to - from }, (_, i) => (
                    <div key={i} className="absolute inset-x-0 border-t border-white/[0.05]" style={{ top: i * ROW_HEIGHT }} />
                  ))}

                  {blocks
                    .filter((b) => b.day === day && b.startMin + b.minutes > fromMin && b.startMin < to * 60)
                    .map((b) => (
                      <button
                        key={`${b.step.id}-${b.day}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setPlacing(null)
                          setDraft({
                            mode: "edit",
                            routineId: b.routineId,
                            stepId: b.step.id,
                            title: b.step.title,
                            minutes: b.minutes,
                            days: b.step.days,
                            startMin: b.startMin,
                          })
                        }}
                        title={`${b.step.title} — ${b.routineLabel}`}
                        className="absolute inset-x-0.5 rounded-md border px-1 py-0.5 text-left overflow-hidden hover:brightness-125 transition-all"
                        style={{
                          top: (b.startMin - fromMin) * pxPerMin,
                          height: Math.max(14, b.minutes * pxPerMin - 2),
                          backgroundColor: `${b.color}22`,
                          borderColor: `${b.color}66`,
                        }}
                      >
                        <span className="block text-[9.5px] leading-tight text-zinc-100 line-clamp-2">{b.step.title}</span>
                      </button>
                    ))}
                </div>
              ))}
            </div>
          </div>

          {blocks.length === 0 && <p className="px-3 py-2 text-[11px] text-zinc-600 border-t border-white/10">{WEEK_COPY.empty}</p>}
        </div>

        {/* ---------------------------------------------------------- the tray */}
        <div className="min-w-0">
          <h3 className="text-[12.5px] font-semibold text-zinc-200">{WEEK_COPY.tray}</h3>
          <p className="text-[10.5px] text-zinc-500 mt-0.5 leading-relaxed">
            {tray.length === 0 ? WEEK_COPY.trayEmpty : WEEK_COPY.trayHelp}
          </p>
          <ul className="mt-2 space-y-1 max-h-[24rem] overflow-y-auto pr-0.5">
            {tray.map((item) => {
              const on = placing?.stepId === item.step.id
              return (
                <li key={`${item.routineId}-${item.step.id}`}>
                  <button
                    onClick={() => setPlacing(on ? null : { routineId: item.routineId, stepId: item.step.id, title: item.step.title })}
                    aria-pressed={on}
                    className={`w-full rounded-lg border px-2 py-1.5 text-left transition-colors ${
                      on ? "border-violet-400/50 bg-violet-500/15" : "border-white/[0.07] bg-white/[0.02] hover:border-white/25"
                    }`}
                  >
                    <span className="block text-[11.5px] text-zinc-200 leading-snug line-clamp-2">{item.step.title}</span>
                    <span className="block text-[9.5px] text-zinc-600 tabular-nums mt-0.5">
                      {item.routineLabel} · {item.step.daysPerWeek}×/wk · {item.step.minutes} min
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      {draft && (
        <BlockEditor
          plan={plan}
          draft={draft}
          setDraft={setDraft}
          onSave={save}
          onUnplace={
            draft.mode === "edit"
              ? () => { handlers.onPlaceStep(draft.routineId, draft.stepId, [], null); setDraft(null) }
              : null
          }
          onDelete={
            draft.mode === "edit"
              ? () => { handlers.onRemoveStep(draft.routineId, draft.stepId); setDraft(null) }
              : null
          }
        />
      )}
    </div>
  )
}

/**
 * One block, being written.
 *
 * A panel under the grid rather than a popover over it, because a popover on a
 * calendar covers the two hours either side of the thing you are placing, which
 * is the part you were looking at when you decided where to put it.
 */
function BlockEditor({
  plan,
  draft,
  setDraft,
  onSave,
  onUnplace,
  onDelete,
}: {
  plan: NsPlan
  draft: Draft
  setDraft: (next: Draft | null) => void
  onSave: () => void
  onUnplace: (() => void) | null
  onDelete: (() => void) | null
}) {
  const toggleDay = (day: number) => {
    const has = draft.days.includes(day)
    const days = has ? draft.days.filter((d) => d !== day) : [...draft.days, day].sort((a, b) => a - b)
    // A block on no days is not on the grid at all, which is what the tray is
    // for — so the last day cannot be unticked away by accident.
    if (days.length === 0) return
    setDraft({ ...draft, days })
  }

  return (
    <div className="mt-3 rounded-xl border border-white/15 bg-white/[0.04] p-3">
      <div className="flex items-center gap-2">
        <input
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onSave() } }}
          placeholder={WEEK_COPY.namePlaceholder}
          aria-label={WEEK_COPY.namePlaceholder}
          autoFocus
          className="min-w-0 flex-1 bg-transparent border-b border-white/15 focus:border-white/35 text-[13px] text-zinc-100 placeholder:text-zinc-700 focus:outline-none py-1 transition-colors"
        />
        <button onClick={() => setDraft(null)} aria-label="Close" className="shrink-0 text-zinc-600 hover:text-zinc-200 transition-colors">
          <X className="size-3.5" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2.5">
        <label className="inline-flex items-center gap-1.5 text-[10.5px] text-zinc-500">
          {WEEK_COPY.length}
          <select
            value={draft.minutes}
            onChange={(e) => setDraft({ ...draft, minutes: Number(e.target.value) })}
            className="bg-white/5 border border-white/10 rounded-md px-1.5 py-0.5 text-[10.5px] text-zinc-300 focus:outline-none"
          >
            {[10, 15, 20, 30, 45, 60, 75, 90, 120, 180].map((m) => (
              <option key={m} value={m} className="bg-zinc-900">{m} min</option>
            ))}
          </select>
        </label>

        <label className="inline-flex items-center gap-1.5 text-[10.5px] text-zinc-500 min-w-0">
          {WEEK_COPY.routine}
          <select
            value={draft.routineId}
            onChange={(e) => setDraft({ ...draft, routineId: e.target.value } as Draft)}
            disabled={draft.mode === "edit"}
            className="min-w-0 bg-white/5 border border-white/10 rounded-md px-1.5 py-0.5 text-[10.5px] text-zinc-300 focus:outline-none disabled:opacity-60"
          >
            {plan.routines.map((r) => (
              <option key={r.id} value={r.id} className="bg-zinc-900">{r.label}</option>
            ))}
          </select>
        </label>

        <span className="inline-flex items-center gap-1 text-[10.5px] text-zinc-500">
          {WEEK_COPY.repeats}
          {WEEK_DAYS.map((label, day) => {
            const on = draft.days.includes(day)
            return (
              <button
                key={label}
                onClick={() => toggleDay(day)}
                aria-pressed={on}
                className={`size-5 rounded text-[9.5px] transition-colors ${
                  on ? "bg-violet-500/30 text-violet-50" : "bg-white/5 text-zinc-600 hover:text-zinc-300"
                }`}
              >
                {label[0]}
              </button>
            )
          })}
        </span>

        <span className="text-[10.5px] text-zinc-600 tabular-nums">
          at {String(Math.floor(draft.startMin / 60)).padStart(2, "0")}:{String(draft.startMin % 60).padStart(2, "0")}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-3">
        {onUnplace && (
          <button onClick={onUnplace} className="text-[11px] text-zinc-500 hover:text-zinc-200 transition-colors">
            {WEEK_COPY.remove}
          </button>
        )}
        {onDelete && (
          <button onClick={onDelete} className="inline-flex items-center gap-1 text-[11px] text-zinc-600 hover:text-rose-300 transition-colors">
            <Trash2 className="size-3" />
            {WEEK_COPY.removeAll}
          </button>
        )}
        <button
          onClick={onSave}
          disabled={!draft.title.trim()}
          className="ml-auto text-[12.5px] font-medium px-3 py-1.5 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-100 hover:bg-violet-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  )
}
