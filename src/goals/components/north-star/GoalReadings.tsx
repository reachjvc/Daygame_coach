"use client"

/**
 * READINGS ON A NUMBER GOAL (Plans/life-plan-readings.md): body weight, bench,
 * body fat. Write where you are today; the last few readings sit under it,
 * and the change since the first one.
 *
 * A reading is the goal's number on a day, so it is saved with the day, like a
 * count on Today. The box takes digits with one decimal mark (a comma works)
 * and refuses a thousands mark, as Today's number boxes do (`readTypedNumber`).
 */

import { useMemo, useState } from "react"
import type { NsGoal, NsPlan } from "@/src/goals/types"
import { READINGS_COPY as COPY } from "@/src/goals/data/northStar"
import { readingsOf } from "@/src/goals/goalReadings"
import { dateKeyLabel } from "@/src/shared/dateUtils"
import { readTypedNumber } from "./TodayTab"

const dayLabel = (key: string) => dateKeyLabel(key, { day: "numeric", month: "short" })

/** The number with the goal's unit, when it names one: "90 kg". */
export function withUnit(goal: NsGoal, value: number): string {
  const unit = goal.unit.trim()
  return unit ? `${value} ${unit}` : String(value)
}

/** One box for today's reading. Committed on Enter or on leaving the box. */
export function ReadingInput({ goal, value, onSet, label }: {
  goal: NsGoal
  /** Today's reading, if one is written. */
  value: number | null
  onSet: (value: number | null) => void
  label: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const [refused, setRefused] = useState(false)
  const commit = () => {
    if (draft === null) return
    const n = readTypedNumber(draft)
    // Refused: what was typed stays to be corrected, not thrown away.
    if (n === undefined) {
      setRefused(true)
      return
    }
    setDraft(null)
    setRefused(false)
    if (n !== value) onSet(n)
  }
  return (
    <span className="inline-flex flex-col">
      <span className="inline-flex items-center gap-1.5">
        <input
          inputMode="decimal"
          value={draft ?? (value == null ? "" : String(value))}
          onChange={(e) => {
            setDraft(e.target.value)
            setRefused(false)
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return
            e.preventDefault()
            e.currentTarget.blur()
          }}
          onBlur={commit}
          aria-label={label}
          placeholder={COPY.placeholder}
          className="w-20 rounded-lg border border-white/10 bg-white/[0.02] px-2 py-1 text-[12px] text-zinc-200 tabular-nums placeholder:text-zinc-600 focus:border-white/30 focus:outline-none"
        />
        {goal.unit.trim() && <span className="text-[11px] text-zinc-500">{goal.unit.trim()}</span>}
      </span>
      {refused && <span className="mt-1 text-[10.5px] text-amber-300/80">{COPY.refused}</span>}
    </span>
  )
}

/** On a number goal's card: today's reading, the last few, and the change since the first. */
export function GoalReadings({ plan, goal, today, onReading }: {
  plan: NsPlan
  goal: NsGoal
  today: string
  onReading: (date: string, value: number | null) => void
}) {
  const all = useMemo(() => readingsOf(plan, goal.id, today), [plan, goal.id, today])
  const todays = all.find((r) => r.date === today)?.value ?? null
  const latest = all.length > 0 ? all[all.length - 1] : null
  const first = all[0]
  const change = latest && first ? Math.round((latest.value - first.value) * 10) / 10 : 0
  const recent = [...all].reverse().slice(0, 6)
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] p-3" aria-labelledby={`readings-${goal.id}`}>
      <h4 id={`readings-${goal.id}`} className="text-[12.5px] text-zinc-200">{COPY.title}</h4>
      <p className="text-[11px] text-zinc-500 mt-0.5">{COPY.help}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <ReadingInput goal={goal} value={todays} onSet={(v) => onReading(today, v)} label={COPY.todayAria(goal.title)} />
        {latest && first && latest.date !== first.date && (
          <span className="text-[11px] text-zinc-400 tabular-nums" data-testid="reading-change">
            {change === 0 ? COPY.same(dayLabel(first.date)) : COPY.since(withUnit(goal, change), dayLabel(first.date))}
          </span>
        )}
      </div>
      {recent.length > 0 && (
        <p className="mt-2 text-[10.5px] text-zinc-500 tabular-nums" data-testid="reading-history">
          {recent.map((r) => `${dayLabel(r.date)}: ${withUnit(goal, r.value)}`).join(" · ")}
        </p>
      )}
    </section>
  )
}
