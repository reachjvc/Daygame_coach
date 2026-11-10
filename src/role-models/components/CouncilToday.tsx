"use client"

import Link from "next/link"
import { useState } from "react"

import { memberForDay, quoteForDay } from "../councilTypes"
import { useCouncil } from "../hooks/useCouncil"
import { roleModelHref } from "../routes"
import { RoleModelVisual } from "./RoleModelVisual"
import { WeekValueTick } from "./WeekValueTick"

/**
 * TODAY'S COUNCIL MEMBER, and "What would he do?" (Plans/role-models.md, Phases
 * 8 and 9).
 *
 * Seneca, Letter 11: "living as if he were watching you". One member a day, in
 * council order (the day number modulo its size), with one of his checked lines
 * and the value you took from him. It reads the council after the rest of Today
 * has drawn, so a slow read never holds the page up; with an empty council it
 * draws nothing.
 *
 * "What would he do?" is self-distancing (Grossmann & Kross 2014): you read his
 * principles and write one line yourself. No AI speaks in his voice. The line
 * goes into the day's note through the note's own save.
 */
export function CouncilToday({ today, note, onNote }: { today: string; note: string; onNote: (text: string) => void }) {
  const { state } = useCouncil()
  const [asking, setAsking] = useState(false)
  if (state.status !== "ready") return null
  const members = state.members.filter((m) => state.people[m.roleModelId])
  const member = memberForDay(members, today)
  if (!member) return null
  const person = state.people[member.roleModelId]
  const quote = quoteForDay(person.quotes, today)

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5" data-testid="council-today">
      <div className="flex gap-4">
        <RoleModelVisual name={person.name} years={person.years} color={person.color} size="small" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wider text-zinc-500">Your council today</p>
          <Link href={roleModelHref(person.id)} className="text-sm font-semibold text-zinc-100 hover:underline">
            {person.name}
          </Link>
          {quote && (
            <figure className="mt-2">
              <blockquote className="text-[13px] italic leading-relaxed text-zinc-200">“{quote.text}”</blockquote>
              <figcaption className="mt-0.5 text-[10.5px] text-zinc-500">
                {quote.place}
                {quote.translation ? ` · tr. ${quote.translation}` : ""}
              </figcaption>
            </figure>
          )}
          <p className="mt-2 text-[12px] text-zinc-300">
            You take from {person.pronoun === "she" ? "her" : "him"}: <span className="text-zinc-100">{member.takenValues.join(", ")}</span>
          </p>
          <p className="mt-1 text-[12px] text-violet-200" data-testid="council-today-line">
            Today, as if {person.pronoun} were watching.
          </p>
        </div>
      </div>
      <WeekValueTick today={today} />
      <button
        type="button"
        onClick={() => setAsking((a) => !a)}
        aria-expanded={asking}
        className="mt-3 min-h-10 rounded-lg border border-white/15 px-3 text-[12.5px] text-zinc-200"
        data-testid="what-would-he-do"
      >
        What would {person.pronoun} do?
      </button>
      {asking && (
        <WhatWouldHeDo
          members={members.map((m) => state.people[m.roleModelId])}
          first={person.id}
          note={note}
          onNote={(text) => {
            onNote(text)
            setAsking(false)
          }}
        />
      )}
    </section>
  )
}

type Person = { id: string; name: string; pronoun: "he" | "she"; principles: string[] }

/** Pick a member, read his principles, write one line. Saved by appending it to the day's note. */
function WhatWouldHeDo({ members, first, note, onNote }: { members: Person[]; first: string; note: string; onNote: (text: string) => void }) {
  const [id, setId] = useState(first)
  const [line, setLine] = useState("")
  const person = members.find((m) => m.id === id) ?? members[0]
  const save = () => {
    const text = line.trim()
    if (!text) return
    const entry = `What would ${person.name} do? ${text}`
    onNote(note.trim() ? `${note.trimEnd()}\n${entry}` : entry)
  }
  return (
    <div className="mt-3 flex flex-col gap-3 rounded-xl border border-white/10 p-3" data-testid="what-would-he-do-sheet">
      {members.length > 1 && (
        <label className="flex items-center gap-2 text-[12px] text-zinc-300">
          Who
          <select value={person.id} onChange={(e) => setId(e.target.value)} className="rounded-lg border border-white/15 bg-zinc-900 px-2 py-1 text-zinc-100">
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div>
        <p className="text-[11px] text-zinc-500">{person.pronoun === "she" ? "Her" : "His"} principles</p>
        <ul className="mt-1 list-disc pl-5 text-[12.5px] text-zinc-200">
          {person.principles.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>
      <label className="flex flex-col gap-1 text-[12px] text-zinc-300">
        What would {person.pronoun} do now? One line, in your words.
        <input
          value={line}
          onChange={(e) => setLine(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save()
          }}
          maxLength={300}
          className="min-h-10 rounded-lg border border-white/15 bg-white/[0.02] px-3 text-[13px] text-zinc-100"
          data-testid="what-would-he-do-line"
        />
      </label>
      <button
        type="button"
        onClick={save}
        disabled={!line.trim()}
        className="min-h-10 self-start rounded-lg bg-violet-500/70 px-4 text-[12.5px] font-medium text-white disabled:opacity-40"
        data-testid="what-would-he-do-save"
      >
        Add to today&apos;s note
      </button>
    </div>
  )
}
