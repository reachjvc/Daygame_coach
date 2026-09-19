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
import { AlertTriangle, Loader2 } from "lucide-react"
import { enrollmentName } from "../data/catalog"
import { LEVEL_LABELS } from "../config"
import type { ProgramEnrollment } from "../types"
import { endProgram } from "../programActions"

/*
 * THE DISAGREEMENT WARNING IS GONE, because nothing can disagree any more.
 *
 * It compared the plan's COPY of the day names against the CATALOGUE's days —
 * ignoring the enrollment's own schedule entirely. So it fired on every
 * renamed day, every self-built week and every endurance plan: "Your written
 * week (Push / Pull / Legs) is not the week any of these prescribe", in amber,
 * about the program you were actually running.
 *
 * The plan no longer keeps a copy of the week, so there is no second version
 * to compare against a first.
 */
interface Props {
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

export function RunningPrograms({ onEnded, tone = "dark" }: Props) {
  /**
   * The SHARED list, not a third copy of it.
   *
   * This used to run its own fetch of `/api/programs/enrollments`, which was
   * the third request for the same answer on one page load — and worse, it kept
   * its own copy, so ending a program here left the rest of the page showing a
   * program that no longer existed until something else happened to refetch.
   */
  const { enrollments, loading, error, refresh } = useActiveEnrollments()
  const [ending, setEnding] = useState<string | null>(null)
  const [endFailed, setEndFailed] = useState<string | null>(null)

  async function end(id: string, name: string) {
    // ONE CLICK IS NOT ENOUGH FOR THIS. It stops a program somebody is running;
    // it is not destructive any more, but it is not nothing either, and this
    // button sits next to five others in a band you did not come here to use.
    if (!confirm(`End ${name}? It stops prescribing sessions. Everything you logged is kept.`)) return
    setEnding(id)
    setEndFailed(null)
    try {
      // The answer matters: a workout left open on this program is a refusal,
      // and calling `onEnded` on one told the rest of the page it had stopped.
      const res = await endProgram(id)
      if (!res.ok) {
        setEndFailed(res.error)
        return
      }
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
  const dark = tone === "dark"

  /**
   * A LIST THAT COULD NOT BE READ IS NOT AN EMPTY LIST.
   *
   * `error` was never looked at, so a failed request rendered exactly like
   * "you have no programs": the band returned null and the page went on to
   * offer Start. Press it and you silently pause the program you were already
   * on — the app having decided, on no evidence, that there was nothing there.
   *
   * Shown in both branches: with a stale list still on screen it is just as
   * important, because the stale list is the thing that looks trustworthy.
   */
  const unavailable = error ? (
    <p
      role="alert"
      data-testid="running-programs-unavailable"
      className={`flex flex-wrap items-center gap-1.5 text-[11px] ${dark ? "text-amber-300/80" : "text-amber-600"}`}
    >
      <AlertTriangle className="size-3 shrink-0" />
      Your programs could not be loaded, so this may be out of date.
      <button type="button" onClick={() => void refresh()} className="underline underline-offset-2">
        Try again
      </button>
    </p>
  ) : null

  // A signed-out visitor gets an empty list from the endpoint, which renders
  // nothing — the same outcome as having no programs, which is correct for
  // both. A FAILED read is neither, and says so.
  if (enrollments.length === 0) return unavailable
  const names = enrollments.map(enrollmentName)
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
      {unavailable}
      {/* The server's own sentence — usually "finish the workout you have open
          first", which is a thing the person can go and do. */}
      {endFailed && (
        <p className={`mt-1.5 text-[11px] ${dark ? "text-red-300" : "text-destructive"}`} data-testid="running-end-failed">
          {endFailed}
        </p>
      )}
      {enrollments.length > 1 && (
        <p className={`mt-1.5 text-[11px] ${dark ? "text-amber-300/80" : "text-amber-600"}`}>
          More than one is running, so more than one session is prescribed. Ending a program keeps
          everything you have already logged.
        </p>
      )}
    </div>
  )
}
