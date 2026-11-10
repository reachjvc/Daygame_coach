"use client"

import { useCouncil } from "../hooks/useCouncil"
import { WeekMarks } from "./WeekMarks"

/**
 * THE COUNCIL'S QUESTIONS in the weekly review (Plans/role-models.md, Phase 8).
 *
 * Napoleon Hill's "Invisible Counselors", made honest: each member asks one
 * question built from one of his checked principles, and says which. Nothing is
 * stored here; answers go in the review's own boxes below.
 */
export function CouncilQuestions({ weekStart }: { weekStart: string }) {
  const { state } = useCouncil()
  if (state.status !== "ready") return null
  const people = state.members.map((m) => state.people[m.roleModelId]).filter(Boolean)
  if (people.length === 0) return null
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5" data-testid="council-questions">
      <h3 className="text-sm font-semibold text-zinc-200">Your council asks</h3>
      <ul className="mt-2 flex flex-col gap-3">
        {people.map((p) => (
          <li key={p.id} data-testid={`council-question-${p.id}`}>
            <p className="text-[13px] text-zinc-100">
              <span className="text-zinc-400">{p.name}:</span> {p.question.text}
            </p>
            {p.question.principle && (
              <p className="mt-0.5 text-[11px] text-zinc-500">From {p.pronoun === "she" ? "her" : "his"} principle: {p.question.principle}</p>
            )}
          </li>
        ))}
      </ul>
      <WeekMarks start={weekStart} />
      <p className="mt-3 text-[11px] text-zinc-500">Write what you find in the boxes below.</p>
    </section>
  )
}
