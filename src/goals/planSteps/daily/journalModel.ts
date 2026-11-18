/** EVERYTHING WRITTEN, in one list (job spec 6.3). Nothing is dropped: an answer whose question is gone still shows. */

import type { NsPlan } from "@/src/goals/types"

export type EntryType = "answer" | "day-note" | "checkin" | "season"

export interface JournalEntry {
  key: string
  date: string
  type: EntryType
  /** Answers: the question's id (a field, a step, or an id that has gone). */
  questionId?: string
  /** Answers: the question's words, or null when the question is gone. */
  question: string | null
  text: string
}

function questionWords(plan: NsPlan, id: string): string | null {
  const field = plan.fields.find((f) => f.id === id)
  if (field) return field.label.trim() || null
  for (const r of plan.routines) {
    const step = r.steps.find((s) => s.id === id)
    if (step) return step.asks?.trim() || step.title
  }
  return null
}

export function journalEntries(plan: NsPlan): JournalEntry[] {
  const out: JournalEntry[] = []
  for (const [date, row] of Object.entries(plan.journal)) {
    for (const [id, text] of Object.entries(row)) {
      if (text.trim()) out.push({ key: `a:${date}:${id}`, date, type: "answer", questionId: id, question: questionWords(plan, id), text })
    }
  }
  for (const [date, text] of Object.entries(plan.notes)) {
    if (text.trim()) out.push({ key: `n:${date}`, date, type: "day-note", question: null, text })
  }
  for (const r of plan.reviews) {
    const text = [r.lessons, r.magicMoments].map((t) => t.trim()).filter(Boolean).join("\n\n")
    if (text) out.push({ key: `c:${r.id}`, date: r.writtenOn || r.periodEnd || r.periodStart, type: "checkin", question: null, text })
  }
  const seasons = new Map(plan.pastSeasons.map((s) => [s.id, s.endedOn]))
  for (const [key, value] of Object.entries(plan.answers)) {
    const m = /^start:new:season-take:(.+)$/.exec(key)
    if (m && value.trim()) out.push({ key: `s:${m[1]}`, date: seasons.get(m[1]) ?? "", type: "season", question: null, text: value })
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.key.localeCompare(b.key)))
}

/** The distinct questions that have answers, for the filter. */
export function answeredQuestions(entries: JournalEntry[]): { id: string; question: string | null }[] {
  const seen = new Map<string, string | null>()
  for (const e of entries) if (e.type === "answer" && e.questionId && !seen.has(e.questionId)) seen.set(e.questionId, e.question)
  return [...seen].map(([id, question]) => ({ id, question }))
}
