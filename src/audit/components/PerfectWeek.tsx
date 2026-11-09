"use client"

/**
 * DAN MARTELL'S PERFECT WEEK, at the end of the audit's review
 * (Plans/perfect-week.md, Phase 2). A week planned ahead from what the audit
 * showed: the activities you marked "Do more" and your best hours sit above
 * the week as the things to put in first. Martell's steps are listed as a
 * short checklist; the week itself is seven rows you fill block by block.
 *
 * The owner asked for this to be built without a look round first
 * (2026-11-09), so every choice here is Martell's where he made one and the
 * simplest otherwise; the plan lists which.
 */

import { useMemo, useState } from "react"
import { BottomSheet } from "@/components/BottomSheet"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { hhmm as minuteLabel } from "@/src/notifications/quietHours"
import type { ReviewGroup } from "../auditService"
import { TimeTile } from "./SettingsSheet"
import type { WeekBlock, WeekKind } from "../types"
import { bestHoursText, checkWeek, DAY_NAMES, DAY_SHORT, freeSlot, hoursByKind, WEEK_KIND_NAMES, WEEK_KINDS, WEEK_WHAT_MAX } from "../weekService"

const KIND_BAR: Record<WeekKind, string> = {
  deep: "bg-sky-500",
  workout: "bg-emerald-500",
  people: "bg-pink-500",
  batch: "bg-amber-500",
  admin: "bg-slate-400",
  rest: "bg-violet-400",
}

const STEPS: { title: string; text: string }[] = [
  { title: "Big rocks first", text: "Put in the weekly musts before anything else: deep work, workouts, time with people who matter." },
  { title: "Plan around your energy", text: "Hardest work in your best hours; admin and calls in your low ones." },
  { title: "Batch the same kind of work", text: "Group similar tasks into one block of two to three hours." },
  { title: "Block the hobbies", text: "Workouts get fixed blocks. His rule: never miss two days in a row." },
  { title: "No extra time", text: "Pair two things in one slot: calls while walking, an audiobook at the gym." },
  { title: "Say no often", text: "What has no room in this week gets a no." },
]

/** Quarter-hour times for the pickers. */
const STARTS = Array.from({ length: 96 }, (_, i) => i * 15)
const ENDS = Array.from({ length: 96 }, (_, i) => (i + 1) * 15)

/** The bar shows 06:00–24:00 unless a block starts earlier. */
function barStart(week: readonly WeekBlock[]): number {
  const earliest = week.reduce((m, b) => Math.min(m, b.start), 6 * 60)
  return Math.floor(earliest / 60) * 60
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

interface Draft {
  id: string | null
  day: number
  start: number
  end: number
  what: string
  kind: WeekKind
}

function BlockSheet({
  draft,
  suggestions,
  bestHours,
  onClose,
  onSave,
  onDelete,
}: {
  draft: Draft | null
  suggestions: string[]
  bestHours: string | null
  onClose: () => void
  onSave: (d: Draft) => Promise<string | null>
  onDelete: (id: string) => Promise<string | null>
}) {
  const [d, setD] = useState<Draft | null>(draft)
  const [state, setState] = useState<"idle" | "saving" | { error: string }>("idle")
  const [openedFor, setOpenedFor] = useState<Draft | null>(draft)
  // A new draft (another block, or Add) replaces the form; adjusting state while rendering, as React suggests.
  if (draft !== openedFor) {
    setOpenedFor(draft)
    setD(draft)
    setState("idle")
  }
  if (!d) return null
  const set = (patch: Partial<Draft>) => {
    setD({ ...d, ...patch })
    setState("idle")
  }
  const run = async (fn: () => Promise<string | null>) => {
    setState("saving")
    const failed = await fn()
    if (failed) setState({ error: failed })
  }
  return (
    <BottomSheet open onClose={onClose} title={d.id ? "Change block" : "Add a block"} testId="week-block-sheet">
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pb-2">
        <div>
          <label htmlFor="week-what" className="block text-sm font-medium">
            What
          </label>
          <input
            id="week-what"
            value={d.what}
            maxLength={WEEK_WHAT_MAX}
            placeholder="Write the book, Gym, Daygame…"
            onChange={(e) => set({ what: e.target.value })}
            className="mt-1.5 h-11 w-full rounded-lg border border-border bg-background px-3 text-base"
            data-testid="week-what"
          />
          {suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5" aria-label="From your Do more list">
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => set({ what: s.slice(0, WEEK_WHAT_MAX) })} className="h-9 max-w-full truncate rounded-full border border-emerald-500/50 bg-emerald-500/10 px-3 text-sm">
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <fieldset>
          <legend className="text-sm font-medium">Kind</legend>
          <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Kind">
            {WEEK_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={d.kind === k}
                onClick={() => set({ kind: k })}
                className={cn("flex h-10 items-center gap-1.5 rounded-full border px-3 text-sm", d.kind === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background/60 hover:bg-muted/50")}
              >
                <span className={cn("size-2 rounded-full", KIND_BAR[k])} aria-hidden />
                {WEEK_KIND_NAMES[k]}
              </button>
            ))}
          </div>
          {d.kind === "deep" && bestHours && <p className="mt-2 text-xs text-muted-foreground">Your best hours in this audit: {bestHours}.</p>}
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium">Day</legend>
          <div className="mt-2 grid grid-cols-7 gap-1" role="radiogroup" aria-label="Day">
            {DAY_SHORT.map((name, i) => (
              <button
                key={name}
                type="button"
                role="radio"
                aria-checked={d.day === i}
                aria-label={DAY_NAMES[i]}
                onClick={() => set({ day: i })}
                className={cn("h-10 rounded-lg border text-sm", d.day === i ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background/60")}
              >
                {name}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex gap-3">
          <TimeTile id="week-start" label="From" value={d.start} options={STARTS} onChange={(start) => set({ start })} />
          <TimeTile id="week-end" label="To" value={d.end} options={ENDS} onChange={(end) => set({ end })} />
        </div>

        {typeof state === "object" && (
          <p className="text-sm text-destructive" role="alert" data-testid="week-error">
            Not saved: {state.error}.
          </p>
        )}

        <div className="flex gap-2">
          <Button className="flex-1" disabled={state === "saving"} onClick={() => void run(() => onSave(d))} data-testid="week-save">
            {state === "saving" ? "Saving…" : "Save"}
          </Button>
          {d.id && (
            <Button variant="outline" disabled={state === "saving"} onClick={() => void run(() => onDelete(d.id as string))} data-testid="week-delete">
              Remove
            </Button>
          )}
        </div>
      </div>
    </BottomSheet>
  )
}

export function PerfectWeek({
  week,
  doMore,
  bestHours,
  onSaveBlock,
  onRemoveBlock,
}: {
  week: WeekBlock[]
  /** The activities marked "Do more" in this review, most frequent first. */
  doMore: ReviewGroup[]
  bestHours: { hour: number; energy: number; answers: number }[]
  /**
   * Saves one block; `edit` when it changes a block already there (refused if
   * another device removed it meanwhile, rather than adding it back). Resolves
   * to an error a person can read, or null. Only that block is sent, so blocks
   * saved on another device stay.
   */
  onSaveBlock: (block: WeekBlock, edit: boolean) => Promise<string | null>
  onRemoveBlock: (id: string) => Promise<string | null>
}) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const best = bestHoursText(bestHours)
  const totals = useMemo(() => hoursByKind(week), [week])
  const from = barStart(week)
  const span = 24 * 60 - from
  const suggestions = doMore.map((g) => g.label)

  const add = (day: number) => {
    const slot = freeSlot(week, day)
    if (!slot) return
    setDraft({ id: null, day, start: slot.start, end: slot.end, what: "", kind: "deep" })
  }

  const save = async (d: Draft): Promise<string | null> => {
    const block: WeekBlock = { id: d.id ?? newId(), day: d.day, start: d.start, end: d.end, what: d.what, kind: d.kind }
    const next = d.id ? week.map((b) => (b.id === d.id ? block : b)) : [...week, block]
    // Checked here first so a mistake (an overlap, an empty name) is said at once, in the sheet, without a round trip.
    const checked = checkWeek(next)
    if ("error" in checked) return checked.error
    const failed = await onSaveBlock(block, d.id !== null)
    if (!failed) setDraft(null)
    return failed
  }
  const remove = async (id: string): Promise<string | null> => {
    const failed = await onRemoveBlock(id)
    if (!failed) setDraft(null)
    return failed
  }

  return (
    <section className="mt-8" data-testid="perfect-week">
      <h3 className="text-base font-semibold">Your perfect week</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Dan Martell&apos;s step after the audit: plan the week before it starts, so other people&apos;s requests don&apos;t fill it. Lived exactly, it should leave you energized, with real work done and something put
        into your health and your relationships.
      </p>

      <div className="mt-3 space-y-2 rounded-xl border border-border bg-card p-3 text-sm" data-testid="week-inputs">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">From this audit</p>
        {suggestions.length > 0 ? (
          <p>
            Do more: <span className="font-medium">{suggestions.join(" · ")}</span>
          </p>
        ) : (
          <p className="text-muted-foreground">Mark activities &quot;Do more&quot; above; they show here as the first things to put in your week.</p>
        )}
        <p>{best ? <>Your best hours: <span className="font-medium tabular-nums">{best}</span>. Put your hardest work there.</> : <span className="text-muted-foreground">Not enough answers yet to name your best hours.</span>}</p>
      </div>

      <details className="mt-3 rounded-xl border border-border bg-card px-3 py-2 text-sm">
        <summary className="cursor-pointer py-1 font-medium">Martell&apos;s steps</summary>
        <ol className="mt-1 list-decimal space-y-1.5 pb-1 pl-5">
          {STEPS.map((s) => (
            <li key={s.title}>
              <span className="font-medium">{s.title}.</span> <span className="text-muted-foreground">{s.text}</span>
            </li>
          ))}
        </ol>
      </details>

      <ul className="mt-4 space-y-3" aria-label="Your perfect week, Monday to Sunday">
        {DAY_NAMES.map((name, day) => {
          const blocks = week.filter((b) => b.day === day)
          return (
            <li key={name} className="rounded-xl border border-border bg-card p-3" data-testid={`week-day-${day}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{name}</p>
                {freeSlot(week, day) ? (
                  <button type="button" onClick={() => add(day)} className="h-9 rounded-full border border-dashed border-primary px-3 text-sm text-primary hover:bg-primary/10" data-testid={`week-add-${day}`} aria-label={`Add a block on ${name}`}>
                    + Block
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground">Day full</span>
                )}
              </div>
              <div className="relative mt-2 h-3 overflow-hidden rounded-full bg-muted-foreground/20" aria-hidden>
                {blocks.map((b) => (
                  <span key={b.id} className={cn("absolute inset-y-0", KIND_BAR[b.kind])} style={{ left: `${((b.start - from) / span) * 100}%`, width: `${((b.end - b.start) / span) * 100}%` }} />
                ))}
              </div>
              <div className="mt-0.5 flex justify-between text-[10px] tabular-nums text-muted-foreground" aria-hidden>
                <span>{minuteLabel(from)}</span>
                <span>24:00</span>
              </div>
              {blocks.length === 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">Nothing planned.</p>
              ) : (
                <ul className="mt-1 divide-y divide-border">
                  {blocks.map((b) => (
                    <li key={b.id}>
                      <button type="button" onClick={() => setDraft({ ...b })} className="flex min-h-11 w-full items-center gap-2 py-1.5 text-left text-sm hover:bg-muted/40" data-testid="week-block">
                        <span className={cn("size-2.5 shrink-0 rounded-full", KIND_BAR[b.kind])} aria-hidden />
                        <span className="w-[6.5rem] shrink-0 tabular-nums text-muted-foreground">
                          {minuteLabel(b.start)}–{minuteLabel(b.end)}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium">{b.what}</span>
                        <span className="sr-only">{WEEK_KIND_NAMES[b.kind]}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>

      {week.length > 0 && (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground" data-testid="week-totals">
          In the week:{" "}
          {WEEK_KINDS.filter((k) => totals[k] > 0)
            .map((k) => `${WEEK_KIND_NAMES[k]} ${totals[k]} h`)
            .join(" · ")}
        </p>
      )}

      <BlockSheet draft={draft} suggestions={suggestions} bestHours={best} onClose={() => setDraft(null)} onSave={save} onDelete={remove} />
    </section>
  )
}
