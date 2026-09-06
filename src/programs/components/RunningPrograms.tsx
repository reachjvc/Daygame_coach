"use client"

/**
 * WHAT YOU ARE ACTUALLY ENROLLED IN, read from the database and said out loud.
 *
 * The failure this exists to prevent: somebody opened their dashboard and found
 * a training program there they had never picked. Nothing was lying — but
 * nothing was telling the truth either, because "the program I am on" was being
 * asserted in two places that had no way to disagree out loud:
 *
 *   - the Life Mastery plan, which copied a program's DAY NAMES into
 *     localStorage the moment you pressed start and then never looked again
 *   - `program_enrollments`, which is what the app actually trains you on
 *
 * A plan could say Upper/Lower forever while the account was enrolled in
 * something else, or in nothing. And enrollments only ever deactivate WITHIN a
 * discipline — start a strength program and a bodybuilding one from a year ago
 * keeps running — so they accumulate silently and the oldest never dies.
 *
 * This does not add a third opinion. It shows the database's answer, which is
 * the only one that decides what gets prescribed, with the date it started and
 * a way to end it. The plan's written week stays what it always was: a week you
 * wrote down. The difference is that now you can see when the two disagree.
 */

import { useState } from "react"
import { useActiveEnrollments } from "../hooks/useEnrollment"
import { Loader2 } from "lucide-react"
import { getProgram } from "../data/catalog"
import { LEVEL_LABELS } from "../config"
import type { ProgramEnrollment } from "../types"

interface Props {
  /** Day names the surrounding plan believes it is training, if it has any. */
  planDays?: string[]
  /**
   * Told which enrollment ended, so the caller can stop claiming it.
   *
   * The id, not a bare "something changed": the Life Mastery plan records the
   * enrollment its training week is tracked by, and a plan that keeps pointing
   * at an ended one is the same two-answers problem in a new place.
   */
  onEnded?: (enrollmentId: string) => void
  /** Dark Life-Mastery surface vs. the app's ordinary card. */
  tone?: "dark" | "app"
}

export function RunningPrograms({ planDays = [], onEnded, tone = "dark" }: Props) {
  /**
   * The SHARED list, not a third copy of it.
   *
   * This used to run its own fetch of `/api/programs/enrollments`, which was
   * the third request for the same answer on one page load — and worse, it kept
   * its own copy, so ending a program here left the rest of the page showing a
   * program that no longer existed until something else happened to refetch.
   */
  const { enrollments, loading, refresh } = useActiveEnrollments()
  const [ending, setEnding] = useState<string | null>(null)

  async function end(id: string, name: string) {
    // ONE CLICK IS NOT ENOUGH FOR THIS. It stops a program somebody is running;
    // it is not destructive any more, but it is not nothing either, and this
    // button sits next to five others in a band you did not come here to use.
    if (!confirm(`End ${name}? It stops prescribing sessions. Everything you logged is kept.`)) return
    setEnding(id)
    try {
      await fetch(`/api/programs/enrollments/${id}`, { method: "DELETE" })
      await refresh()
      onEnded?.(id)
    } finally {
      setEnding(null)
    }
  }

  if (loading) {
    return (
      <p className={`flex items-center gap-1.5 text-[12px] ${tone === "dark" ? "text-zinc-500" : "text-muted-foreground"}`}>
        <Loader2 className="size-3 animate-spin" /> Checking what you are enrolled in…
      </p>
    )
  }
  // A signed-out visitor gets an empty list from the endpoint, which renders
  // nothing — the same outcome as having no programs, which is correct for both.
  if (enrollments.length === 0) return null

  const dark = tone === "dark"
  /**
   * The disagreement, named rather than resolved.
   *
   * Overwriting one side with the other would be guessing which is right. A
   * week you wrote by hand is not wrong just because you are also on a program,
   * and a program is not wrong just because your plan says something else.
   */
  const names = enrollments.map((e) => getProgram(e.program_id)?.name ?? e.program_id)
  /**
   * A program is only "forgotten" once it has had time to be forgotten.
   *
   * This said "you may have started this and forgotten it" about a program
   * started seconds earlier, which is both wrong and faintly rude. Never trained
   * AND started a fortnight ago is a ghost; never trained and started today is
   * simply a program you have not been to the gym for yet.
   */
  const FORGOTTEN_AFTER_DAYS = 14
  const staleness = (e: ProgramEnrollment): "trained" | "forgotten" | "new" => {
    if (e.lastLoggedAt) return "trained"
    const days = (Date.now() - new Date(e.started_at).getTime()) / 86_400_000
    return days >= FORGOTTEN_AFTER_DAYS ? "forgotten" : "new"
  }
  const planDiffers =
    planDays.length > 0 &&
    enrollments.length > 0 &&
    !enrollments.some((e) => {
      const p = getProgram(e.program_id)
      if (!p) return false
      const days = "days" in p.schedule ? p.schedule.days.map((d) => d.label) : []
      return days.length === planDays.length && days.every((d, i) => d === planDays[i])
    })

  return (
    <div
      className={`rounded-md border p-2.5 ${
        dark ? "border-emerald-400/25 bg-emerald-500/[0.06]" : "border-border bg-muted/40"
      }`}
      data-testid="running-programs"
    >
      <p className={`text-[10px] font-semibold uppercase tracking-wider ${dark ? "text-emerald-300/80" : "text-muted-foreground"}`}>
        {enrollments.length === 1 ? "Running now" : `Running now — ${enrollments.length} programs`}
      </p>
      <ul className="mt-1.5 space-y-1.5">
        {enrollments.map((e, i) => (
          <li key={e.id} className="flex items-center justify-between gap-3">
            <span className="min-w-0">
              <span className={`block truncate text-[12.5px] ${dark ? "text-zinc-200" : "text-foreground"}`}>
                {names[i]}
              </span>
              <span className={`block text-[11px] ${dark ? "text-zinc-500" : "text-muted-foreground"}`}>
                {LEVEL_LABELS[e.level]} · started {new Date(e.started_at).toLocaleDateString()}
              </span>
              {/* WHETHER IT IS ACTUALLY BEING TRAINED. "Started in April" reads
                  the same for a program somebody runs every week and one they
                  abandoned the day they picked it. This is the line that tells
                  them apart, and the one that explains a program on the
                  dashboard nobody remembers choosing. */}
              <span
                className={`block text-[11px] ${
                  staleness(e) === "forgotten"
                    ? dark ? "text-amber-300/80" : "text-amber-600"
                    : dark ? "text-zinc-500" : "text-muted-foreground"
                }`}
              >
                {e.lastLoggedAt
                  ? `last logged ${new Date(e.lastLoggedAt).toLocaleDateString()}`
                  : staleness(e) === "forgotten"
                    ? "never trained — you may have started this and forgotten it"
                    : "not trained yet"}
              </span>
            </span>
            <button
              type="button"
              onClick={() => end(e.id, names[i])}
              disabled={ending === e.id}
              className={`shrink-0 rounded-md border px-2 py-1 text-[11px] transition-colors disabled:opacity-40 ${
                dark
                  ? "border-white/12 text-zinc-400 hover:bg-white/[0.06]"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              {ending === e.id ? "Ending…" : "End"}
            </button>
          </li>
        ))}
      </ul>
      {enrollments.length > 1 && (
        <p className={`mt-1.5 text-[11px] ${dark ? "text-amber-300/80" : "text-amber-600"}`}>
          More than one is running, so more than one session is prescribed. Ending a program keeps
          everything you have already logged.
        </p>
      )}
      {planDiffers && (
        <p className={`mt-1.5 text-[11px] ${dark ? "text-amber-300/80" : "text-amber-600"}`}>
          Your written week ({planDays.join(" / ")}) is not the week any of these prescribe. Starting
          a program below rewrites the written one to match.
        </p>
      )}
    </div>
  )
}
