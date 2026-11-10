"use client"

import { useCouncilSettings, useWeekMarks } from "../hooks/useCouncilSettings"

/**
 * Today's tick for the value of the week (Franklin's book, Plans/role-models.md,
 * Phase 12): lived it, or fell short. Draws nothing until a value is chosen for
 * this week.
 */
export function WeekValueTick({ today }: { today: string }) {
  const { settings } = useCouncilSettings()
  const weekValue = settings?.weekValue ?? null
  const { marks, error, mark } = useWeekMarks(settings?.weekOf ?? today, today, Boolean(weekValue))
  if (!weekValue || !marks) return null
  const todays = marks.find((m) => m.day === today)
  const pick = (lived: boolean) => void mark(today, todays?.lived === lived ? null : lived)
  return (
    <div className="mt-3 rounded-xl border border-white/10 p-3" data-testid="week-value-tick">
      <p className="text-[12px] text-zinc-300">
        Value of the week: <span className="font-medium text-zinc-100">{weekValue}</span>
      </p>
      <div className="mt-2 flex gap-2" role="group" aria-label={`Did you live ${weekValue} today?`}>
        <button
          type="button"
          aria-pressed={todays?.lived === true}
          onClick={() => pick(true)}
          className={`min-h-10 rounded-lg border px-3 text-[12.5px] ${todays?.lived === true ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-100" : "border-white/15 text-zinc-200"}`}
          data-testid="week-value-lived"
        >
          Lived it
        </button>
        <button
          type="button"
          aria-pressed={todays?.lived === false}
          onClick={() => pick(false)}
          className={`min-h-10 rounded-lg border px-3 text-[12.5px] ${todays?.lived === false ? "border-amber-400/60 bg-amber-500/20 text-amber-100" : "border-white/15 text-zinc-200"}`}
          data-testid="week-value-short"
        >
          Fell short
        </button>
      </div>
      {error && <p role="alert" className="mt-1 text-[11.5px] text-red-300">{error}</p>}
    </div>
  )
}
