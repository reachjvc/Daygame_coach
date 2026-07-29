"use client"

/**
 * An area's target date, shown in its card header on the Plan board.
 *
 * An area shows the MAIN date (the north star's "achieve goal by") until the user gives it
 * one of its own: inherited reads dim, an override reads in the area's color and offers a
 * reset back to inherited. The same precedence drives the area's timeline lane — see
 * `areaEndDate` in GoalsConfigStep.
 */

import { useState, useRef, useEffect } from "react"
import { X } from "lucide-react"

function fmtShort(iso: string): string {
  const t = Date.parse(iso + "T00:00:00")
  if (Number.isNaN(t)) return iso
  const d = new Date(t)
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${d.getDate()} ${months[d.getMonth()]}`
}

export function AreaDateButton({
  areaId,
  areaLabel,
  color,
  /** This area's OWN date (YYYY-MM-DD), or "" when it inherits the main date. */
  date,
  /** The north star's "achieve goal by" date — shown when the area has no date of its own. */
  mainDate,
  /** "" resets the area back to inheriting the main date. */
  onChange,
}: {
  areaId: string
  areaLabel: string
  color: string
  date: string
  mainDate: string
  onChange: (id: string, date: string) => void
}) {
  const [picking, setPicking] = useState(false)
  const dateRef = useRef<HTMLInputElement>(null)

  // Opening the picker focuses the (visually hidden) date input and pops the native calendar.
  useEffect(() => {
    if (!picking) return
    const el = dateRef.current
    if (!el) return
    el.focus()
    // showPicker throws if the browser blocks it (not user-activated) — focus alone still works.
    try { el.showPicker?.() } catch { /* fall back to focus */ }
  }, [picking])

  const own = !!date
  const shown = date || mainDate

  return (
    <span className="relative inline-flex items-center gap-1 shrink-0">
      <button
        onClick={() => setPicking(true)}
        className={`text-[10px] tabular-nums transition-colors ${own ? "" : "text-zinc-500 hover:text-zinc-300"}`}
        style={own ? { color } : undefined}
        title={
          own
            ? `${areaLabel} has its own date — click to change`
            : mainDate
              ? "Inherited from your main date — click to give this area its own"
              : `Set a date for ${areaLabel}`
        }
        aria-label={`${areaLabel} target date`}
      >
        {shown ? fmtShort(shown) : "+ date"}
      </button>

      {own && (
        <button
          onClick={() => onChange(areaId, "")}
          className="text-zinc-600 hover:text-zinc-200 transition-colors"
          aria-label={`Reset ${areaLabel} to the main date`}
          title="Back to the main date"
        >
          <X className="size-3" />
        </button>
      )}

      {picking && (
        <input
          ref={dateRef}
          type="date"
          value={date || mainDate || ""}
          onChange={(e) => onChange(areaId, e.target.value)}
          onBlur={() => setPicking(false)}
          className="absolute left-0 bottom-0 w-px h-px opacity-0"
          aria-label={`${areaLabel} target date`}
        />
      )}
    </span>
  )
}
