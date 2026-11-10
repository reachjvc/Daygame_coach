"use client"

import { useWeekMarks } from "../hooks/useCouncilSettings"

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

/**
 * The week's seven marks in the weekly review (Franklin's book, Plans/role-models.md,
 * Phase 12). Draws nothing for a week with no marks.
 */
export function WeekMarks({ start }: { start: string }) {
  const end = addDays(start, 6)
  const { marks } = useWeekMarks(start, end)
  if (!marks || marks.length === 0) return null
  const byDay = new Map(marks.map((m) => [m.day, m]))
  const value = marks[marks.length - 1].value
  return (
    <div className="mt-3" data-testid="week-marks">
      <p className="text-[12px] text-zinc-300">
        Value of the week: <span className="text-zinc-100">{value}</span>
      </p>
      <ol className="mt-1.5 grid grid-cols-7 gap-1 text-center text-[10.5px]">
        {DAYS.map((d, i) => {
          const m = byDay.get(addDays(start, i))
          return (
            <li key={d} className="flex flex-col items-center gap-0.5" data-testid={`week-mark-${i}`}>
              <span className="text-zinc-500">{d}</span>
              <span
                className={`flex size-7 items-center justify-center rounded-full border ${
                  m?.lived === true ? "border-emerald-400/60 text-emerald-200" : m?.lived === false ? "border-amber-400/60 text-amber-200" : "border-white/10 text-zinc-600"
                }`}
                aria-label={m ? (m.lived ? "lived it" : "fell short") : "no mark"}
              >
                {m ? (m.lived ? "✓" : "–") : "·"}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
