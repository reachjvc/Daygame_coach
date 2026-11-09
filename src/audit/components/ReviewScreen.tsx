"use client"

/**
 * THE REVIEW, after the two weeks or after End now (Plans/energy-audit.md,
 * Phase 6). Every number says what it is based on.
 *
 * Order, from the owner's note on the look page (2026-11-09): first every
 * activity you logged, most frequent first, with its two averages; then the
 * same activities sorted into Martell's four boxes; then your energy through
 * the day. Tapping an activity opens its card: your "why" notes, and what you
 * decide to do with it (Do more · Keep · Hand off · Cut · Change how) with a
 * note, saved with the audit.
 */

import { ArrowLeft, Check } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { BottomSheet } from "@/components/BottomSheet"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AuditCallError, type AuditView } from "../auditClient"
import { BOX_NAMES, buildReview, REVIEW_NOTE_MAX, type Box, type BuiltReview, type ReviewGroup } from "../auditService"
import { clockLabel } from "../quarterService"
import { REVIEW_CHOICES, type AuditRun, type Review, type ReviewChoice } from "../types"
import type { AuditState } from "../hooks/useAudit"

const CHOICE_NAMES: Record<ReviewChoice, string> = {
  more: "Do more",
  keep: "Keep",
  handoff: "Hand off",
  cut: "Cut",
  change: "Change how",
}

/** Box tints, by meaning: green for "do more", amber for "costs", red for "cut", violet for "fun". */
const BOX_TONE: Record<Box, string> = {
  more: "border-emerald-500/50 bg-emerald-500/10",
  costs: "border-amber-500/50 bg-amber-500/10",
  cut: "border-red-500/50 bg-red-500/10",
  fun: "border-violet-500/50 bg-violet-500/10",
}
const BOX_DOT: Record<Box, string> = { more: "bg-emerald-500", costs: "bg-amber-500", cut: "bg-red-500", fun: "bg-violet-500" }

const hoursText = (h: number) => (h === 1 ? "1 hour" : `${Number.isInteger(h) ? h : h.toFixed(2).replace(/0$/, "")} hours`)
const answersText = (n: number) => (n === 1 ? "1 answer" : `${n} answers`)

function shortDate(iso: string, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: tz }).format(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}

function BoxChip({ box }: { box: Box }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn("size-2 rounded-full", BOX_DOT[box])} aria-hidden />
      {BOX_NAMES[box]}
    </span>
  )
}

function ActivityRow({ g, review, onOpen }: { g: ReviewGroup; review: Review; onOpen: () => void }) {
  const choice = review.choices[g.key]
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/40" data-testid="review-activity">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{g.label}</p>
          <p className="text-xs tabular-nums text-muted-foreground">
            {hoursText(g.minutes / 60)} · E {g.energy.toFixed(1)} · G {g.growth.toFixed(1)} · from {answersText(g.answers)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <BoxChip box={g.box} />
          {choice && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">{CHOICE_NAMES[choice]}</span>}
        </div>
      </button>
    </li>
  )
}

/** Growth up, energy right: top-left costs, top-right do more, bottom-left cut, bottom-right fun. */
function BoxGrid({ built, onOpen }: { built: BuiltReview; onOpen: (g: ReviewGroup) => void }) {
  const cell = (box: Box) => {
    const items = built.groups.filter((g) => g.box === box)
    return (
      <section className={cn("min-w-0 rounded-xl border p-2.5", BOX_TONE[box])} data-testid={`review-box-${box}`}>
        <p className="text-2xl font-semibold tabular-nums">{built.shares[box]}%</p>
        <p className="text-sm font-semibold leading-tight">{BOX_NAMES[box]}</p>
        <p className="text-[11px] text-muted-foreground">our name</p>
        <ul className="mt-2 space-y-1">
          {items.length === 0 ? (
            <li className="text-xs text-muted-foreground">Nothing here</li>
          ) : (
            items.map((g) => (
              <li key={g.key}>
                <button type="button" onClick={() => onOpen(g)} className="w-full min-w-0 rounded-md py-1 text-left hover:underline">
                  <span className="block truncate text-sm">{g.label}</span>
                  <span className="block text-[11px] tabular-nums text-muted-foreground">
                    {hoursText(g.minutes / 60)} · E {g.energy.toFixed(1)} · G {g.growth.toFixed(1)}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </section>
    )
  }
  return (
    <div>
      <div className="flex gap-1.5">
        <div className="flex w-4 shrink-0 items-center justify-center">
          <span className="-rotate-90 whitespace-nowrap text-[11px] text-muted-foreground">growth ↑</span>
        </div>
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-1.5">
          {cell("costs")}
          {cell("more")}
          {cell("cut")}
          {cell("fun")}
        </div>
      </div>
      <p className="mt-1 text-right text-[11px] text-muted-foreground">energy →</p>
    </div>
  )
}

/** One bar per local hour with enough answers; a 1–7 scale, 4 marked as neutral. */
function EnergyByHour({ built }: { built: BuiltReview }) {
  if (built.bestHours.length === 0) {
    return <p className="text-sm text-muted-foreground">Not enough answers yet: an hour shows once it has at least 4 answers.</p>
  }
  const H = 140
  const y = (v: number) => ((v - 1) / 6) * H
  return (
    <figure>
      <div className="flex gap-2">
        <div className="relative w-6 shrink-0 text-[11px] tabular-nums text-muted-foreground" style={{ height: H }} aria-hidden>
          {[7, 4, 1].map((v) => (
            <span key={v} className="absolute right-0 -translate-y-1/2" style={{ bottom: y(v) - 6 }}>
              {v}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="relative" style={{ height: H }}>
            <div className="absolute inset-x-0 border-t border-dashed border-muted-foreground/40" style={{ bottom: y(4) }} aria-hidden />
            <div className="absolute inset-x-0 bottom-0 border-t border-border" aria-hidden />
            <ul className="absolute inset-0 flex items-end gap-0.5" aria-label="Average energy for each hour of the day">
              {built.bestHours.map((h) => (
                <li
                  key={h.hour}
                  className="group relative flex h-full min-w-0 flex-1 items-end"
                  title={`${String(h.hour).padStart(2, "0")}:00–${String(h.hour + 1).padStart(2, "0")}:00 · energy ${h.energy.toFixed(1)} · from ${answersText(h.answers)}`}
                  aria-label={`${String(h.hour).padStart(2, "0")}:00, energy ${h.energy.toFixed(1)}, from ${answersText(h.answers)}`}
                >
                  <div className="w-full rounded-t-[4px] bg-primary group-hover:bg-primary/80" style={{ height: Math.max(3, y(h.energy)) }} />
                </li>
              ))}
            </ul>
          </div>
          <ul className="mt-1 flex gap-0.5" aria-hidden>
            {built.bestHours.map((h) => (
              <li key={h.hour} className="min-w-0 flex-1 text-center text-[10px] tabular-nums leading-tight text-muted-foreground">
                {String(h.hour).padStart(2, "0")}
                <br />
                <span className="opacity-70">{h.answers}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <figcaption className="mt-2 text-xs text-muted-foreground">
        Average energy (1–7) for each hour you answered at least 4 times. The number under each hour is how many answers it is from. The dashed line is 4, neutral.
      </figcaption>
    </figure>
  )
}

function ActivitySheet({
  group,
  review,
  timezone,
  onClose,
  onSave,
}: {
  group: ReviewGroup | null
  review: Review
  timezone: string
  onClose: () => void
  onSave: (key: string, choice: ReviewChoice | null, note: string) => Promise<string | null>
}) {
  const [choice, setChoice] = useState<ReviewChoice | null>(null)
  const [note, setNote] = useState("")
  const [state, setState] = useState<"idle" | "saving" | "saved" | { error: string }>("idle")
  // Reset when another activity opens, not when the saved review comes back
  // (that would wipe the "Saved" the person just saw).
  const key = group?.key ?? null
  useEffect(() => {
    if (key === null) return
    setChoice(review.choices[key] ?? null)
    setNote(review.notes[key] ?? "")
    setState("idle")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  if (!group) return null
  return (
    <BottomSheet open onClose={onClose} title={group.label} testId="review-activity-sheet">
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pb-2">
        <p className="text-sm tabular-nums text-muted-foreground">
          {hoursText(group.minutes / 60)} · energy {group.energy.toFixed(1)} · growth {group.growth.toFixed(1)} · from {answersText(group.answers)}
        </p>
        <BoxChip box={group.box} />
        <section>
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Why you felt like this</h3>
          {group.whys.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">You wrote no notes on this one.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {group.whys.map((w) => (
                <li key={w.slotAt} className="rounded-lg border-l-2 border-primary/60 bg-muted/30 px-3 py-2 text-sm">
                  {w.text}
                  <span className="block text-[11px] text-muted-foreground">
                    {shortDate(w.slotAt, timezone)}, {clockLabel(Date.parse(w.slotAt), timezone)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">What you will do with it</h3>
          <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="What you will do with it">
            {REVIEW_CHOICES.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={choice === c}
                onClick={() => {
                  setChoice(choice === c ? null : c)
                  setState("idle")
                }}
                className={cn(
                  "h-11 rounded-full border px-4 text-sm font-medium",
                  choice === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background/60 hover:bg-muted/50",
                )}
              >
                {CHOICE_NAMES[c]}
              </button>
            ))}
          </div>
          <label htmlFor="review-note" className="mt-3 block text-sm font-medium">
            Note <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <textarea
            id="review-note"
            value={note}
            maxLength={REVIEW_NOTE_MAX}
            rows={3}
            placeholder="How, when, or who could take it over"
            onChange={(e) => {
              setNote(e.target.value)
              setState("idle")
            }}
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-base"
            data-testid="review-note"
          />
          <div className="mt-2 flex items-center gap-3">
            <Button
              className="flex-1"
              disabled={state === "saving"}
              onClick={async () => {
                setState("saving")
                const failed = await onSave(group.key, choice, note)
                setState(failed ? { error: failed } : "saved")
              }}
              data-testid="review-save"
            >
              {state === "saving" ? "Saving…" : "Save"}
            </Button>
            {state === "saved" && (
              <span className="flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400" role="status" data-testid="review-saved">
                <Check className="size-4" aria-hidden /> Saved
              </span>
            )}
          </div>
          {typeof state === "object" && (
            <p className="mt-2 text-sm text-destructive" role="alert">
              Not saved: {state.error}. Your choice and note are still here; try again.
            </p>
          )}
        </section>
      </div>
    </BottomSheet>
  )
}

export function ReviewScreen({ s, runId, onBack }: { s: AuditState; runId: string; onBack: () => void }) {
  const [view, setView] = useState<AuditView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openKey, setOpenKey] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      setView(await s.readRun(runId))
    } catch (e) {
      setError(e instanceof AuditCallError ? e.message : "Could not read this audit")
    }
  }, [s, runId])
  useEffect(() => {
    void load()
  }, [load])

  const run: AuditRun | null = view?.runs.find((r) => r.id === runId) ?? null
  const built = useMemo(() => (view && run ? buildReview(view.slots, run, view.timezone) : null), [view, run])

  const save = async (key: string, choice: ReviewChoice | null, note: string): Promise<string | null> => {
    if (!run) return "This audit is not loaded"
    const choices = { ...run.review.choices }
    const notes = { ...run.review.notes }
    if (choice) choices[key] = choice
    else delete choices[key]
    if (note.trim()) notes[key] = note
    else delete notes[key]
    const failed = await s.saveReview(run.id, { choices, notes })
    if (!failed) await load()
    return failed
  }

  const back = (
    <button type="button" onClick={onBack} className="-ml-2 flex h-11 items-center gap-1 rounded-lg px-2 text-sm text-muted-foreground hover:text-foreground" data-testid="review-back">
      <ArrowLeft className="size-4" /> Audits
    </button>
  )

  if (!view || !run || !built) {
    return (
      <div data-testid="review">
        {back}
        {error ? (
          <div className="mt-4 rounded-2xl border border-border bg-card p-5" role="alert">
            <p>{error}.</p>
            <Button className="mt-3" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="mt-4 h-64 animate-pulse rounded-xl bg-card" aria-busy="true" aria-label="Loading the review" />
        )}
      </div>
    )
  }

  const tz = view.timezone
  const open = built.groups.find((g) => g.key === openKey) ?? null
  const answeredHours = built.hours
  return (
    <div data-testid="review">
      {back}
      <h2 className="mt-1 text-xl font-semibold">
        Your audit, {shortDate(run.startedAt, tz)} – {shortDate(run.endedAt ?? run.endsAt, tz)}
      </h2>
      <p className="mt-2 text-sm leading-relaxed" data-testid="review-basis">
        You answered {built.answered} of {built.possibleQuarters} quarters ({answeredHours} of {built.possibleHours} waking hours). Quarters you did not answer are not counted.
      </p>

      {built.answered === 0 ? (
        <p className="mt-6 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground" data-testid="review-empty">
          No answers in this audit, so there is nothing to show yet.
        </p>
      ) : (
        <>
          <section className="mt-6">
            <h3 className="text-base font-semibold">What you did, most often first</h3>
            <p className="text-xs text-muted-foreground">E is energy, G is growth: averages of your 1–7 answers. Tap one for your notes and what you will do with it.</p>
            <ul className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {built.groups.map((g) => (
                <ActivityRow key={g.key} g={g} review={run.review} onOpen={() => setOpenKey(g.key)} />
              ))}
            </ul>
          </section>

          <section className="mt-8">
            <h3 className="text-base font-semibold">Four boxes</h3>
            <p className="text-xs text-muted-foreground">
              Martell&apos;s four boxes, with growth in place of money. Above 4 counts as high. Each share is of the {answeredHours} hours you answered.
            </p>
            <div className="mt-3">
              <BoxGrid built={built} onOpen={(g) => setOpenKey(g.key)} />
            </div>
          </section>

          <section className="mt-8">
            <h3 className="text-base font-semibold">Your energy through the day</h3>
            <div className="mt-3">
              <EnergyByHour built={built} />
            </div>
          </section>
        </>
      )}

      <ActivitySheet group={open} review={run.review} timezone={tz} onClose={() => setOpenKey(null)} onSave={save} />
    </div>
  )
}
