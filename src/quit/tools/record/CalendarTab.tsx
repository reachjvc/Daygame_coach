"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { RecordCtx } from "./ctx"
import { fmtDay, fmtMonth, fmtShort } from "./fmt"
import { cellState, dayInfo, monthGrid, monthSpan } from "./logic"
import { recordText as t } from "./text"

const cmp = (a: [number, number], b: [number, number]) => a[0] * 12 + a[1] - (b[0] * 12 + b[1])

/** Month grid, Monday first, from the month of the first run to this month. Tap a day to see what it holds. */
export function CalendarTab({ ctx }: { ctx: RecordCtx }) {
  const { view, today } = ctx
  const span = monthSpan(view, today)
  // Until he moves to another month, the calendar follows today (across a month end the ring moves with it).
  const [moved, setMoved] = useState<[number, number] | null>(null)
  const month = moved ?? span.last
  const [picked, setPicked] = useState<string | null>(null)
  const thisYear = Number(today.slice(0, 4))
  const atFirst = cmp(month, span.first) <= 0
  const atLast = cmp(month, span.last) >= 0
  const step = (d: number) => {
    const n = month[0] * 12 + month[1] + d
    setMoved([Math.floor(n / 12), n % 12])
  }
  const info = picked ? dayInfo(picked, view, today) : null
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <button type="button" data-testid="cal-prev" aria-label={t.calPrev} disabled={atFirst} onClick={() => step(-1)} className="inline-flex size-11 items-center justify-center rounded-md border border-border disabled:opacity-40">
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <h2 data-testid="cal-month" className="text-lg font-semibold">
          {fmtMonth(month[0], month[1])}
        </h2>
        <button type="button" data-testid="cal-next" aria-label={t.calNext} disabled={atLast} onClick={() => step(1)} className="inline-flex size-11 items-center justify-center rounded-md border border-border disabled:opacity-40">
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>
      <div role="grid" aria-label={fmtMonth(month[0], month[1])} className="flex flex-col gap-1">
        <div role="row" className="grid grid-cols-7 gap-1 text-center text-sm text-muted-foreground">
          {t.calWeekdays.map((w) => (
            <span key={w} role="columnheader">
              {w}
            </span>
          ))}
        </div>
        {monthGrid(month[0], month[1]).map((week, wi) => (
          <div key={wi} role="row" className="grid grid-cols-7 gap-1">
            {week.map((day, di) => {
              if (!day) return <span key={di} role="gridcell" />
              const i = dayInfo(day, view, today)
              const st = cellState(i)
              const label = new Date(`${day}T12:00:00`).getDate()
              const cls =
                st === "slip"
                  ? "border-2 border-dashed border-foreground"
                  : st === "clean"
                    ? "border border-primary bg-primary text-primary-foreground"
                    : "border border-transparent text-muted-foreground"
              return (
                <button
                  key={day}
                  type="button"
                  role="gridcell"
                  data-testid={`cal-${day}`}
                  data-state={st}
                  data-today={i.today ? "true" : "false"}
                  data-close={i.closeCalls.length > 0 ? "true" : "false"}
                  aria-label={t.calDayLabel(fmtDay(day, today), st === "clean" ? t.stateClean : st === "slip" ? t.stateSlip : t.stateOther, i.closeCalls.length > 0)}
                  aria-pressed={picked === day}
                  onClick={() => setPicked(day)}
                  className={`relative flex size-full min-h-11 items-center justify-center rounded-md text-base tabular-nums ${cls} ${i.today ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""} ${picked === day ? "outline outline-[3px] outline-offset-[3px] outline-foreground" : ""}`}
                >
                  {label}
                  {i.closeCalls.length > 0 && <span aria-hidden="true" className={`absolute bottom-1 size-1.5 rounded-full ${st === "clean" ? "bg-primary-foreground" : "bg-foreground"}`} />}
                </button>
              )
            })}
          </div>
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 rounded-sm bg-primary" />
          {t.calKey.clean}
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 rounded-sm border-2 border-dashed border-foreground" />
          {t.calKey.slip}
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-foreground" />
          {t.calKey.close}
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 rounded-sm ring-2 ring-foreground" />
          {t.calKey.today}
        </li>
      </ul>
      <div data-testid="cal-line" aria-live="polite" className="flex min-h-12 flex-col gap-1 break-words rounded-lg border border-border bg-card p-3 text-base">
        {!info && <p className="text-muted-foreground">{t.calPick}</p>}
        {info && (
          <>
            <p className="text-sm text-muted-foreground">{fmtDay(info.day, today)}</p>
            {info.clean && info.slips.length === 0 && <p>{t.calClean(info.clean.dayNo, fmtShort(info.clean.runStart, thisYear))}</p>}
            {info.slips.map((s, k) => (
              <p key={`s${k}`}>{t.calSlip(s)}</p>
            ))}
            {info.closeCalls.map((s, k) => (
              <p key={`c${k}`}>{t.calClose(s)}</p>
            ))}
            {!info.clean && info.slips.length === 0 && info.closeCalls.length === 0 && <p>{info.future ? t.calFuture : t.calNone}</p>}
          </>
        )}
      </div>
    </div>
  )
}
