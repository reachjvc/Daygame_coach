"use client"

/**
 * THE PAGE THE WRITING LEADS TO.
 *
 * Reported from the page: *"journal … doesnt lead anywhere (should lead to a
 * page where we journal, like field reports, weekly reviews, and user should be
 * able to write, possibly select standard questions, and see ALL old reports)."*
 *
 * That is three complaints and this tab is three sections, in that order:
 *
 *   - **Today** — every question the plan is asking you this day, each with a
 *     box. A step's own question ("Write three gratitudes") and a question
 *     somebody added sit in one list, because the difference between them
 *     matters when you are setting them up and never when you are answering
 *     them.
 *   - **Add a question** — the standard ones, already written, and the sets:
 *     weekly review, field report, morning pages. The complaint was not only
 *     that the journal led nowhere; it was that the way to make it lead
 *     somewhere was to invent the question yourself.
 *   - **Everything you have written** — every answer, every day, newest first.
 *
 * **Nothing here is a second store.** The boxes write to `plan.journal` and the
 * archive reads it back — the same pair the Today rows use, so a gratitude
 * written here at 21:00 is the same entry as the one written on the row at
 * 07:00, and the tick is the same tick.
 */

import { useMemo, useState } from "react"
import { ChevronDown, Plus, Trash2 } from "lucide-react"
import type { NsPlan } from "@/src/goals/types"
import { JOURNAL_COPY, JOURNAL_PROMPTS, JOURNAL_SETS, TODAY_COPY } from "@/src/goals/data/northStar"
import { journalArchive, journalQuestions, journalSetAnchor, journalTotals } from "@/src/goals/northStarTrackService"
import { formatTargetDate, journalEntry, journalHistory } from "@/src/goals/northStarService"
import { SENTENCE_HINT } from "./SentenceBox"

/**
 * ONE QUESTION AND TODAY'S ANSWER, with every previous answer folded under it.
 *
 * Held locally and committed on blur, for the reason every other box on this
 * flow is: a save re-renders the list the box sits inside, and typing a
 * paragraph through that is typing into a page that moves.
 */
function Box({
  id,
  question,
  from,
  value,
  history,
  onWrite,
  onRemove,
}: {
  id: string
  question: string
  from: string
  value: string
  history: { date: string; text: string }[]
  onWrite: (text: string) => void
  /** Stops the question being asked. Never deletes what is written under it. */
  onRemove: (() => void) | null
}) {
  const [draft, setDraft] = useState(value)
  const [pastOpen, setPastOpen] = useState(false)
  const commit = (text: string) => {
    if (text !== value) onWrite(text)
  }

  return (
    <div id={`journal-${id}`} className="scroll-mt-24 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <label htmlFor={`journal-box-${id}`} className="block text-[12.5px] text-zinc-200 leading-snug">
            {question}
          </label>
          <span className="block text-[10px] text-zinc-600 mt-0.5">{from}</span>
        </div>
        {onRemove && (
          <button
            onClick={onRemove}
            title={JOURNAL_COPY.removeHelp}
            aria-label={JOURNAL_COPY.removeAria(question)}
            className="shrink-0 text-zinc-600 hover:text-rose-300 transition-colors"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>
      <textarea
        id={`journal-box-${id}`}
        rows={3}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commit(draft)}
        placeholder={TODAY_COPY.fieldPlaceholder}
        className="w-full mt-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-[12.5px] text-zinc-200 placeholder:text-zinc-600 focus:border-white/30 focus:outline-none resize-y"
      />
      <p className="mt-1 text-[10px] text-zinc-600">{SENTENCE_HINT}</p>
      {history.length > 0 && (
        <>
          <button
            onClick={() => setPastOpen((v) => !v)}
            aria-expanded={pastOpen}
            aria-label={TODAY_COPY.fieldPastAria(question)}
            className="mt-1 inline-flex items-center gap-1 text-[10.5px] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <ChevronDown className={`size-3 transition-transform ${pastOpen ? "" : "-rotate-90"}`} />
            {TODAY_COPY.fieldPastOpen(history.length)}
          </button>
          {pastOpen && (
            <ul className="mt-1.5 space-y-1.5 border-l border-white/10 pl-3">
              {history.map((entry) => (
                <li key={entry.date}>
                  <span className="block text-[10px] text-zinc-600 tabular-nums">{formatTargetDate(entry.date)}</span>
                  <span className="block text-[12px] text-zinc-300 whitespace-pre-wrap leading-relaxed">{entry.text}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

export function JournalTab({
  plan,
  today,
  onWriteField,
  onNote,
  onAddQuestion,
  onRemoveField,
  onStepAsks,
}: {
  plan: NsPlan
  today: string
  onWriteField: (id: string, text: string) => void
  onNote: (text: string) => void
  /** Adds a question of your own, attached to the day. */
  onAddQuestion: (question: string) => void
  onRemoveField: (id: string) => void
  onStepAsks: (routineId: string, stepId: string, question: string | null) => void
}) {
  const questions = useMemo(() => journalQuestions(plan, today), [plan, today])
  const archive = useMemo(() => journalArchive(plan, today), [plan, today])
  const totals = useMemo(() => journalTotals(archive), [archive])
  const [own, setOwn] = useState("")
  const [note, setNote] = useState(plan.notes[today] ?? "")
  /** Which question the archive is narrowed to, or every one of them. */
  const [only, setOnly] = useState("")

  const askedToday = questions.filter((q) => q.today)
  /** What is already being asked, so the library can say so rather than add a second copy. */
  const asked = new Set(questions.map((q) => q.question.trim().toLowerCase()))

  const shown = only ? archive.map((day) => ({ ...day, note: "", entries: day.entries.filter((e) => e.id === only) })).filter((d) => d.entries.length > 0) : archive

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold text-white">{JOURNAL_COPY.title}</h2>
        <p className="text-[12.5px] text-zinc-400 mt-1 leading-relaxed max-w-2xl">{JOURNAL_COPY.help}</p>
      </header>

      {/* ------------------------------------------------------------ today */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">{JOURNAL_COPY.todayTitle}</h3>
          <p className="text-[11.5px] text-zinc-500 mt-0.5">{JOURNAL_COPY.todayHelp}</p>
        </div>
        {askedToday.length === 0 ? (
          <p className="text-[12px] text-zinc-500">{JOURNAL_COPY.todayEmpty}</p>
        ) : (
          <div className="space-y-2.5">
            {askedToday.map((q) => (
              <Box
                key={`${today}:${q.id}`}
                id={q.id}
                question={q.question}
                from={q.from}
                value={journalEntry(plan, today, q.id)}
                history={journalHistory(plan, q.id, today)}
                onWrite={(text) => onWriteField(q.id, text)}
                onRemove={
                  q.kind === "step" && q.routineId
                    ? () => onStepAsks(q.routineId as string, q.id, null)
                    : () => onRemoveField(q.id)
                }
              />
            ))}
          </div>
        )}
        {/* The day itself, for what belongs to no question. The same box the
            Today screen draws, writing to the same `plan.notes` entry. */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
          <label htmlFor="journal-day-note" className="block text-[12.5px] text-zinc-200">
            {JOURNAL_COPY.noteLabel}
          </label>
          <textarea
            id="journal-day-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => note !== (plan.notes[today] ?? "") && onNote(note)}
            placeholder={JOURNAL_COPY.notePlaceholder}
            className="w-full mt-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-[12.5px] text-zinc-200 placeholder:text-zinc-600 focus:border-white/30 focus:outline-none resize-y"
          />
        </div>
      </section>

      {/* -------------------------------------------------------------- add */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">{JOURNAL_COPY.addTitle}</h3>
          <p className="text-[11.5px] text-zinc-500 mt-0.5">{JOURNAL_COPY.addHelp}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {JOURNAL_PROMPTS.map((prompt) => {
            const already = asked.has(prompt.question.trim().toLowerCase())
            return (
              <button
                key={prompt.id}
                disabled={already}
                onClick={() => onAddQuestion(prompt.question)}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11.5px] transition-colors ${
                  already
                    ? "border-white/5 bg-white/[0.02] text-zinc-600 cursor-default"
                    : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-violet-400/40 hover:text-violet-100"
                }`}
              >
                {!already && <Plus className="size-3" />}
                {prompt.question}
                {already && <span className="text-[10px] text-zinc-600">· {JOURNAL_COPY.added}</span>}
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="journal-own" className="text-[11px] text-zinc-500">
            {JOURNAL_COPY.addOwn}
          </label>
          <input
            id="journal-own"
            value={own}
            onChange={(e) => setOwn(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || !own.trim()) return
              e.preventDefault()
              onAddQuestion(own.trim())
              setOwn("")
            }}
            placeholder={JOURNAL_COPY.addOwnPlaceholder}
            className="min-w-[16rem] flex-1 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:border-white/30 focus:outline-none"
          />
          <button
            disabled={!own.trim()}
            onClick={() => {
              onAddQuestion(own.trim())
              setOwn("")
            }}
            className="rounded-lg border border-violet-400/40 bg-violet-500/10 px-3 py-2 text-[11.5px] text-violet-100 disabled:opacity-40 hover:bg-violet-500/20 transition-colors"
          >
            {JOURNAL_COPY.add}
          </button>
        </div>

        <div className="pt-2">
          <h4 className="text-[12px] font-semibold text-zinc-200">{JOURNAL_COPY.setsTitle}</h4>
          <p className="text-[11px] text-zinc-500 mt-0.5">{JOURNAL_COPY.setsHelp}</p>
          <div className="grid gap-2 mt-2 sm:grid-cols-3">
            {JOURNAL_SETS.map((set) => {
              const already = set.questions.every((q) => asked.has(q.trim().toLowerCase()))
              return (
                <div key={set.id} id={journalSetAnchor(set.id)} className="scroll-mt-24 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
                  <p className="text-[12.5px] font-semibold text-zinc-100">{set.title}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{set.note}</p>
                  <ul className="mt-2 space-y-1">
                    {set.questions.map((q) => (
                      <li key={q} className="text-[11px] text-zinc-400 leading-snug">
                        {q}
                      </li>
                    ))}
                  </ul>
                  <button
                    disabled={already}
                    onClick={() => set.questions.forEach((q) => onAddQuestion(q))}
                    className={`mt-2.5 w-full rounded-lg border px-3 py-1.5 text-[11.5px] transition-colors ${
                      already
                        ? "border-white/5 bg-white/[0.02] text-zinc-600 cursor-default"
                        : "border-violet-400/40 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20"
                    }`}
                  >
                    {already ? JOURNAL_COPY.added : JOURNAL_COPY.addSet(set.questions.length)}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- archive */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">{JOURNAL_COPY.archiveTitle}</h3>
            <p className="text-[11.5px] text-zinc-500 mt-0.5">
              {JOURNAL_COPY.archiveHelp}
              {archive.length > 0 && <> · {JOURNAL_COPY.archiveCount(totals.entries, totals.days)}</>}
            </p>
          </div>
          {questions.length > 0 && archive.length > 0 && (
            <label className="flex items-center gap-1.5 text-[10.5px] text-zinc-500">
              {JOURNAL_COPY.archiveFilter}
              <select
                value={only}
                onChange={(e) => setOnly(e.target.value)}
                className="max-w-[16rem] rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-[11.5px] text-zinc-200 focus:border-white/30 focus:outline-none"
              >
                <option value="">{JOURNAL_COPY.archiveAll}</option>
                {questions.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.question}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {shown.length === 0 ? (
          <p className="text-[12px] text-zinc-500">{JOURNAL_COPY.archiveEmpty}</p>
        ) : (
          <ol className="space-y-3">
            {shown.map((day) => (
              <li key={day.date} className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 tabular-nums">
                  {formatTargetDate(day.date)}
                </p>
                {day.note && (
                  <p className="mt-2 text-[12.5px] text-zinc-200 whitespace-pre-wrap leading-relaxed">{day.note}</p>
                )}
                <ul className="mt-2 space-y-2">
                  {day.entries.map((entry) => (
                    <li key={entry.id}>
                      <span className={`block text-[10.5px] ${entry.missing ? "text-zinc-600 italic" : "text-zinc-500"}`}>
                        {entry.question}
                      </span>
                      <span className="block text-[12.5px] text-zinc-200 whitespace-pre-wrap leading-relaxed">{entry.text}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
