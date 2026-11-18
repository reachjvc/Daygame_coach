"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { journalCopy } from "@/src/goals/planSteps/copy/daily"
import { screenHref } from "@/src/goals/planSteps/planRoutes"
import { journalEntries, answeredQuestions, type EntryType } from "@/src/goals/planSteps/daily/journalModel"
import { fieldsFor } from "@/src/goals/planSteps/daily/todayModel"
import { fill } from "@/src/goals/planSteps/text"
import { usePlanNew } from "../PlanNewContext"
import { Chip, ChipRow, card, dateText, linkQuiet } from "../ui"
import { AnswerBox, DailyHeader, DayNoteBox, Section } from "./shared"

/** Not in the words file: the heading over an old answer whose question has since been removed. */
const GONE_QUESTION = "Earlier question"

type Filter = "all" | EntryType | `q:${string}`

export function JournalPage() {
  const { plan, store, today } = usePlanNew()
  const [filter, setFilter] = useState<Filter>("all")
  const entries = useMemo(() => journalEntries(plan), [plan])
  const questions = useMemo(() => answeredQuestions(entries), [entries])
  if (!store.loaded) return <p className="px-4 text-sm text-zinc-500">…</p>

  const shown = entries.filter((e) => (filter === "all" ? true : filter.startsWith("q:") ? e.type === "answer" && e.questionId === filter.slice(2) : e.type === filter))
  const dayFields = fieldsFor(plan, null).filter((f) => f.kind === "write")
  const stepAsks = plan.routines.flatMap((r) => r.steps).filter((s) => s.asks?.trim() && s.days.includes(((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7)))
  const manage = screenHref("questions/pick")
  const label = (e: (typeof entries)[number]) =>
    e.type === "answer" ? fill(journalCopy.type_answer, { question: e.question ?? GONE_QUESTION }) : e.type === "day-note" ? journalCopy.type_day_note : e.type === "checkin" ? journalCopy.type_checkin : journalCopy.type_season

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 px-4 pb-24" data-testid="journal">
      <DailyHeader title={journalCopy.title} />

      <Section title={journalCopy.today_heading} testId="journal-today">
        {dayFields.length === 0 && stepAsks.length === 0 && (
          <p className="text-sm text-zinc-500">
            {journalCopy.today_empty}{" "}
            <Link href={manage} className="underline">{journalCopy.today_empty_link}</Link>
          </p>
        )}
        {dayFields.map((f) => <AnswerBox key={f.id} id={f.id} label={f.label} date={today} />)}
        {stepAsks.map((s) => <AnswerBox key={s.id} id={s.id} label={s.asks ?? s.title} date={today} testId={`asks-${s.id}`} />)}
        <div className={card}><DayNoteBox date={today} /></div>
      </Section>

      <Section title={journalCopy.all_heading} testId="journal-all">
        <div>
          <p className="mb-1 text-sm font-medium text-zinc-200">{journalCopy.filter_label}</p>
          <ChipRow>
            <Chip on={filter === "all"} onClick={() => setFilter("all")} testId="filter-all">{journalCopy.filter_all}</Chip>
            <Chip on={filter === "day-note"} onClick={() => setFilter("day-note")} testId="filter-day-note">{journalCopy.type_day_note}</Chip>
            <Chip on={filter === "checkin"} onClick={() => setFilter("checkin")} testId="filter-checkin">{journalCopy.type_checkin}</Chip>
            <Chip on={filter === "season"} onClick={() => setFilter("season")} testId="filter-season">{journalCopy.type_season}</Chip>
            {questions.map((q) => (
              <Chip key={q.id} on={filter === `q:${q.id}`} onClick={() => setFilter(`q:${q.id}`)} testId={`filter-q-${q.id}`}>{q.question ?? GONE_QUESTION}</Chip>
            ))}
          </ChipRow>
        </div>
        {shown.length === 0 ? (
          <p className="text-sm text-zinc-500" data-testid="journal-empty">{journalCopy.all_empty}</p>
        ) : (
          <ul className="space-y-2">
            {shown.map((e) => (
              <li key={e.key} className={card} data-testid="journal-entry" data-type={e.type}>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{e.date ? dateText(e.date) : ""} · {label(e)}</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-zinc-100">{e.text}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Link href={manage} className={linkQuiet} data-testid="manage-questions">{journalCopy.manage_link}</Link>
    </div>
  )
}
