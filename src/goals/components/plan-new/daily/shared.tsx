"use client"

import Link from "next/link"
import { useId, useState, type ReactNode } from "react"
import { usePlanNew } from "../PlanNewContext"
import { GrownText, Line, btnQuiet, card, dateText, inputCls, linkQuiet, SaveIndicator, Chip } from "../ui"
import { homeHref } from "@/src/goals/planSteps/planRoutes"
import { ROUTES } from "@/src/shared/routes"
import { commonCopy } from "@/src/goals/planSteps/copy/common"
import { todayCopy } from "@/src/goals/planSteps/copy/daily"
import { setDayNumber, setJournalEntry, setDayNote } from "@/src/goals/northStarService"
import { fieldScale, fieldUnitKey, readText } from "@/src/goals/planSteps/planFacts"
import { scaleLabels } from "@/src/goals/planSteps/daily/todayModel"
import type { NsDailyField } from "@/src/goals/types"

/** The header every daily page shares: the way back to the plan home, the title, the date and the save line. */
export function DailyHeader({ title, date }: { title: string; date?: string }) {
  return (
    <header className="space-y-1">
      <div className="flex items-center justify-between gap-3">
        <Link href={homeHref()} className={linkQuiet} data-testid="daily-home">
          <span aria-hidden>‹</span>&nbsp;{commonCopy.plan_home}
        </Link>
        <SaveIndicator />
      </div>
      <h1 className="text-2xl font-semibold text-zinc-50">{title}</h1>
      {date && <p className="text-sm text-zinc-400">{dateText(date)}</p>}
    </header>
  )
}

export function Section({ title, children, testId }: { title: string; children: ReactNode; testId?: string }) {
  return (
    <section className="space-y-2" aria-label={title} data-testid={testId}>
      <h2 className="text-sm font-semibold text-zinc-300">{title}</h2>
      {children}
    </section>
  )
}

/** A written answer for one day, saved as it is typed (every change goes to the store, which saves at once). */
export function AnswerBox({ id, label, date, testId }: { id: string; label: string; date: string; testId?: string }) {
  const { plan, store } = usePlanNew()
  return (
    <GrownText
      label={label}
      value={plan.journal[date]?.[id] ?? ""}
      onChange={(v) => store.updateDay((p) => setJournalEntry(p, date, id, v))}
      placeholder={todayCopy.answer_placeholder}
      max={5000}
      rows={2}
      testId={testId ?? `answer-${id}`}
    />
  )
}

export function DayNoteBox({ date }: { date: string }) {
  const { plan, store } = usePlanNew()
  return (
    <GrownText
      label={todayCopy.day_note_heading}
      value={plan.notes[date] ?? ""}
      onChange={(v) => store.updateDay((p) => setDayNote(p, date, v))}
      placeholder={todayCopy.day_note_placeholder}
      max={5000}
      rows={2}
      testId="day-note"
    />
  )
}

/** One number question for the day: a row of tap buttons for a 1-5 or 1-10 scale, else a number box. */
export function NumberQuestion({ field, date }: { field: NsDailyField; date: string }) {
  const { plan, store } = usePlanNew()
  const id = useId()
  const scale = fieldScale(plan, field.id)
  const value = plan.numbers[date]?.[field.id] ?? null
  const set = (v: number | null) => store.updateDay((p) => setDayNumber(p, date, field.id, v))
  if (scale) {
    const { low, high } = scaleLabels(plan, field.id)
    const nums = Array.from({ length: scale }, (_, i) => i + 1)
    return (
      <div data-testid={`rating-${field.id}`}>
        <p className="mb-1 text-sm font-medium text-zinc-200">{field.label}</p>
        <div className="grid grid-cols-5 gap-2" role="group" aria-label={field.label}>
          {nums.map((n) => (
            <Chip key={n} on={value === n} testId={`rating-${field.id}-${n}`} onClick={() => set(value === n ? null : n)}>
              <span className="block text-center">{n}</span>
            </Chip>
          ))}
        </div>
        {(low || high) && (
          <p className="mt-1 flex justify-between text-xs text-zinc-500">
            <span>{low && `1 ${low}`}</span>
            <span>{high && `${scale} ${high}`}</span>
          </p>
        )}
      </div>
    )
  }
  const unit = plan.answers[fieldUnitKey(field.id)] ?? ""
  return (
    <div data-testid={`rating-${field.id}`}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-zinc-200">{field.label}{unit && ` (${unit})`}</label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        defaultValue={value ?? ""}
        onChange={(e) => { const t = e.target.value.trim(); if (t === "") set(null); else if (Number.isFinite(Number(t))) set(Number(t)) }}
        className={inputCls}
        data-testid={`rating-${field.id}-box`}
      />
    </div>
  )
}

/** The day-level or row-level fields: write, read, go, number. */
export function Fields({ fields, date }: { fields: NsDailyField[]; date: string }) {
  const { plan } = usePlanNew()
  return (
    <>
      {fields.map((f) => {
        if (f.kind === "number") return <NumberQuestion key={f.id} field={f} date={date} />
        if (f.kind === "write") return <AnswerBox key={f.id} id={f.id} label={f.label || todayCopy.answer_placeholder} date={date} />
        if (f.kind === "read") {
          const text = readText(plan, f.readSourceId)
          return text ? (
            <div key={f.id} className={card}>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{f.label}</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-zinc-100">{text}</p>
            </div>
          ) : null
        }
        const path = f.readSourceId
        return path && path.startsWith(ROUTES.planNew) ? (
          <Link key={f.id} href={path} className={btnQuiet}>{f.label}</Link>
        ) : null
      })}
    </>
  )
}

/** A small add-and-tick list under a row. Ticks are day data; adding an item is a plan change. */
export { Line }
export function useDraft(): [string, (v: string) => void] {
  return useState("")
}
