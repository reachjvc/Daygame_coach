"use client"

/**
 * The ideal day.
 *
 * The door for somebody who cannot name a goal and can absolutely describe a
 * good Tuesday. Everybody can do the second one — it is the question you answer
 * on a walk without noticing you are answering it — and a written day is a goal
 * list that has already been through the hardest test there is: it fits in a
 * day.
 *
 * What comes out is mostly NOT goals, and that is the point. "Up at 6:30, no
 * phone" is not a goal, it is a box that gets ticked or does not, and that is
 * the thing the person actually wanted tracked. So the default destination for
 * a line is a routine step, and only the lines with a real number in them —
 * "run 5 km", "write 1000 words" — arrive suggesting they be goals, because
 * those are the ones with somewhere to climb to.
 *
 * Fifteen lines each needing an area is fifteen dropdowns, so the areas are
 * guessed from the words. EVERY GUESS IS ON SCREEN BEFORE ANYTHING IS ADDED,
 * and a line it cannot place says "pick an area" instead of quietly landing in
 * Health. The Add button waits for those.
 */

import { useMemo, useState } from "react"
import { X } from "lucide-react"
import type { NsPlan } from "@/src/goals/types"
import { IDEAL_DAY_COPY, IDEAL_DAY_KEY } from "@/src/goals/data/northStarStart"
import {
  areaKeywordIndex,
  guessAreaId,
  idealDayMinutes,
  parseIdealDay,
  routineForMinute,
  shapeFromTitle,
  type IdealDayPlacement,
} from "@/src/goals/northStarService"
import { RampHeader, type StartHandlers } from "./StartRamps"

export interface IdealDayHandlers extends StartHandlers {
  onAddIdealDay: (placements: IdealDayPlacement[]) => void
}

/**
 * What the user has changed on one line.
 *
 * Keyed by what the line SAYS rather than by where it sits, because the list is
 * recomputed from the textarea on every keystroke: fix a typo on line two and
 * an index-keyed override would hand line three's area to line four.
 */
type Overrides = Record<string, { areaId?: string; destination?: "track" | "goal"; minutes?: number }>

const lineKey = (startMin: number | null, title: string) => `${startMin ?? ""}|${title.toLowerCase()}`

export function IdealDayRamp({
  plan,
  handlers,
  onBack,
}: {
  plan: NsPlan
  handlers: IdealDayHandlers
  onBack: () => void
}) {
  const text = plan.answers[IDEAL_DAY_KEY] ?? ""
  const [overrides, setOverrides] = useState<Overrides>({})
  const [added, setAdded] = useState<{ track: number; goals: number } | null>(null)

  const index = useMemo(() => areaKeywordIndex(plan.areas), [plan.areas])
  const lines = useMemo(() => parseIdealDay(text), [text])

  /**
   * The rows, guesses and all.
   *
   * Recomputed from the text on every keystroke rather than held in state, so
   * fixing a typo in the box above does not leave a stale list underneath it.
   */
  const rows = lines.map((line, i) => {
    const key = lineKey(line.startMin, line.title)
    const guess = guessAreaId(index, line.title)
    const shape = shapeFromTitle(line.title)
    return {
      ...line,
      key,
      minutes: overrides[key]?.minutes ?? idealDayMinutes(lines, i),
      areaId: overrides[key]?.areaId ?? guess,
      guessed: overrides[key]?.areaId == null && guess != null,
      destination:
        overrides[key]?.destination ??
        // A line with something to climb to is offered as a goal; everything
        // else is a box you tick.
        (shape.type === "milestone_ladder" ? ("goal" as const) : ("track" as const)),
    }
  })

  const ready = rows.filter((r) => r.areaId)
  const missing = rows.length - ready.length

  const set = (key: string, patch: Overrides[string]) =>
    setOverrides((current) => ({ ...current, [key]: { ...current[key], ...patch } }))

  /**
   * Removing a line removes it from the text, because the text is the truth
   * here and a list that disagrees with the box above it is a bug report. The
   * raw line is found by what it parses to rather than by its position, so the
   * other lines keep whatever way the person wrote them.
   */
  const drop = (row: { startMin: number | null; title: string }) => {
    const kept: string[] = []
    let removed = false
    for (const raw of text.split("\n")) {
      const [parsed] = parseIdealDay(raw)
      if (!removed && parsed && parsed.startMin === row.startMin && parsed.title === row.title) {
        removed = true
        continue
      }
      kept.push(raw)
    }
    handlers.onAnswer(IDEAL_DAY_KEY, kept.join("\n"))
  }

  const add = () => {
    if (ready.length === 0 || missing > 0) return
    const placements: IdealDayPlacement[] = ready.map((r) => ({
      title: r.title,
      startMin: r.startMin,
      minutes: r.minutes,
      areaId: r.areaId!,
      destination: r.destination,
    }))
    handlers.onAddIdealDay(placements)
    setAdded({
      track: placements.filter((p) => p.destination === "track").length,
      goals: placements.filter((p) => p.destination === "goal").length,
    })
    handlers.onAnswer(IDEAL_DAY_KEY, "")
    setOverrides({})
  }

  return (
    <div>
      <RampHeader title={IDEAL_DAY_COPY.title} help={IDEAL_DAY_COPY.help} onBack={onBack} />

      {added && (
        <div className="mt-3 rounded-xl border border-emerald-400/25 bg-emerald-500/[0.05] px-3 py-2.5">
          <p className="text-[12.5px] text-emerald-100">
            {added.track > 0 && IDEAL_DAY_COPY.addedTrack(added.track)}
            {added.track > 0 && added.goals > 0 && ", and "}
            {added.goals > 0 && IDEAL_DAY_COPY.addedGoals(added.goals)}
          </p>
          <button onClick={() => setAdded(null)} className="mt-1 text-[11px] text-emerald-200/70 hover:text-emerald-100 transition-colors">
            {IDEAL_DAY_COPY.again}
          </button>
        </div>
      )}

      <textarea
        value={text}
        onChange={(e) => handlers.onAnswer(IDEAL_DAY_KEY, e.target.value)}
        rows={9}
        placeholder={IDEAL_DAY_COPY.placeholder}
        aria-label={IDEAL_DAY_COPY.title}
        className="w-full mt-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-[13px] text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-white/30 transition-colors leading-relaxed resize-y"
      />
      <p className="text-[10.5px] text-zinc-600 mt-1">{IDEAL_DAY_COPY.saved}</p>

      {rows.length > 0 && (
        <>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mt-4">
            <h3 className="text-[12.5px] font-semibold text-zinc-200">{IDEAL_DAY_COPY.parsed(rows.length)}</h3>
            <span className="text-[10.5px] text-zinc-600 min-w-0 flex-1">{IDEAL_DAY_COPY.minutesNote}</span>
          </div>

          <ul className="mt-2 space-y-1">
            {rows.map((row) => {
              const area = plan.areas.find((a) => a.id === row.areaId)
              const routine = row.destination === "track" ? plan.routines.find((r) => r.id === routineForMinute(plan, row.startMin)) : null
              return (
                <li
                  key={row.key}
                  className={`group/l rounded-xl border px-3 py-2 ${
                    row.areaId ? "border-white/[0.07] bg-white/[0.02]" : "border-amber-400/30 bg-amber-500/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10.5px] text-zinc-600 tabular-nums w-11 shrink-0">
                      {row.startMin == null ? "—" : formatMin(row.startMin)}
                    </span>
                    <span className="min-w-0 flex-1 text-[12.5px] text-zinc-100 truncate">{row.title}</span>
                    <button
                      onClick={() => drop(row)}
                      aria-label={`Remove ${row.title}`}
                      className="shrink-0 text-zinc-700 hover:text-rose-300 transition-colors"
                    >
                      <X className="size-3" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5 pl-[3.25rem]">
                    {/* Where it goes: a box you tick, or a goal. */}
                    <div className="inline-flex rounded-lg border border-white/10 overflow-hidden">
                      {(["track", "goal"] as const).map((d) => (
                        <button
                          key={d}
                          onClick={() => set(row.key, { destination: d })}
                          aria-pressed={row.destination === d}
                          title={d === "track" ? IDEAL_DAY_COPY.trackNote : IDEAL_DAY_COPY.goalNote}
                          className={`text-[10.5px] px-2 py-0.5 transition-colors ${
                            row.destination === d ? "bg-violet-500/25 text-violet-50" : "text-zinc-500 hover:text-zinc-200"
                          }`}
                        >
                          {d === "track" ? IDEAL_DAY_COPY.track : IDEAL_DAY_COPY.goal}
                        </button>
                      ))}
                    </div>

                    <select
                      value={row.areaId ?? ""}
                      onChange={(e) => set(row.key, { areaId: e.target.value })}
                      aria-label={`Area for ${row.title}`}
                      className={`bg-white/5 border rounded-md px-1.5 py-0.5 text-[10.5px] focus:outline-none ${
                        row.areaId ? "border-white/10 text-zinc-300" : "border-amber-400/40 text-amber-100"
                      }`}
                    >
                      <option value="" className="bg-zinc-900">{IDEAL_DAY_COPY.areaMissing}</option>
                      {plan.areas.map((a) => (
                        <option key={a.id} value={a.id} className="bg-zinc-900">{a.label}</option>
                      ))}
                    </select>

                    {area && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-zinc-600">
                        <span className="size-1.5 rounded-full" style={{ backgroundColor: area.color }} />
                        {row.guessed ? "guessed" : "yours"}
                      </span>
                    )}

                    {row.destination === "track" && (
                      <>
                        <label className="inline-flex items-center gap-1 text-[10px] text-zinc-600">
                          <input
                            value={row.minutes}
                            onChange={(e) => set(row.key, { minutes: Math.max(1, Math.min(240, Number(e.target.value) || 0)) })}
                            inputMode="numeric"
                            aria-label={`Minutes for ${row.title}`}
                            className="w-9 bg-transparent border-b border-white/10 focus:border-white/30 text-[10.5px] tabular-nums text-zinc-300 focus:outline-none text-right"
                          />
                          min
                        </label>
                        {routine && <span className="text-[10px] text-zinc-600 truncate">→ {routine.label}</span>}
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="flex flex-wrap items-center gap-3 mt-3">
            {missing > 0 && (
              <span className="text-[11px] text-amber-200/80">
                {missing} {missing === 1 ? "line has" : "lines have"} no area yet.
              </span>
            )}
            <button
              onClick={add}
              disabled={rows.length === 0 || missing > 0}
              className="ml-auto text-[12.5px] font-medium px-3 py-1.5 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-100 hover:bg-violet-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {IDEAL_DAY_COPY.add(rows.length)}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function formatMin(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`
}
