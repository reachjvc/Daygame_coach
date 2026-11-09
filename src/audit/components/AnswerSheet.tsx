"use client"

/**
 * THE ANSWER SHEET: one card per quarter, newest first, the quarter a ping
 * asked about on top (alpha test 2026-11-09: fast-audit-07, picky-eye-02/03).
 * A card covers the quarters before it only when the person ticks "Same
 * answer for the N quarters before", which names them. A stretch chosen in
 * the Day list stays one card: choosing it was the decision.
 *
 * Each card: what you did (pre-filled from Time when it knows, else from the
 * quarter before's answer), Energy 1–7, Growth 1–7, and optionally "Why I
 * feel like this". Activity and both scores are needed to save (D-REQUIRED).
 *
 * THREE TAPS FROM THE NOTIFICATION (fast-audit-06): on a new answer whose
 * activity is filled, the score tap that completes it saves it, so a ping is
 * tap, Energy, Growth. Save stays for the other cases (an answer being
 * changed, the activity typed last, another device's answer to replace) and
 * sticks to the bottom of the card, so it is never below the fold. Saving
 * folds the card into one green line, "✓ Saved · Gym · E 4 · G 7", with a
 * pencil to change it (and add a why), and moves to the next one.
 *
 * NO "AVOIDING" BUTTON. The owner's note on the look page (2026-11-09): the
 * "why" box is enough. The column stays (always false from here; an older
 * answer keeps its value when changed), so nothing stored is lost.
 */

import { Check, Pencil } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { BottomSheet } from "@/components/BottomSheet"
import { Button } from "@/components/ui/button"
import { WHY_MAX } from "../auditService"
import { stretchBefore, stretchLabel } from "../quarterService"
import type { ActivityCount } from "../suggestService"
import type { AnswerSource, AuditAnswer, ScaleValue } from "../types"
import type { DrawnSlot, NotKept } from "../hooks/useAudit"
import { ActivityField } from "./ActivityField"
import { ScaleRow } from "./ScaleRow"

export interface AnswerCardInput {
  quarters: number[]
  /** Pre-filled activity (from Time, or the answer being changed). */
  text: string
  /** Set when Time filled it in. */
  entryId: string | null
  /** The answer being changed, when there is one. */
  existing: DrawnSlot | null
  /** The quarter the tapped ping asked about. */
  asked?: boolean
  /** `text` is the quarter before's answer, offered when Time knows nothing. */
  sameAsBefore?: boolean
}

/** The quarters before a card that it can cover, and whether it does. */
interface Cover {
  quarters: number[]
  on: boolean
}

function Card({
  card,
  index,
  runId,
  timezone,
  source,
  suggestions,
  existingByQuarter,
  onSave,
  onDelete,
  saved,
  lost,
  onEdit,
  cover,
  onCover,
}: {
  card: AnswerCardInput
  index: number
  runId: string
  timezone: string
  source: AnswerSource
  suggestions: readonly ActivityCount[]
  existingByQuarter: ReadonlyMap<number, DrawnSlot>
  onSave: (answers: AuditAnswer[]) => void
  onDelete: ((id: string) => void) | null
  saved: boolean
  /** Why the server did not keep what this card saved, or null (fast-audit-02). */
  lost: string | null
  onEdit: () => void
  cover: Cover | null
  onCover: (on: boolean) => void
}) {
  const e = card.existing
  const quarters = cover?.on ? [...cover.quarters, ...card.quarters] : card.quarters
  const [activity, setActivity] = useState(card.text)
  const [energy, setEnergy] = useState<ScaleValue | null>(e?.energy ?? null)
  const [growth, setGrowth] = useState<ScaleValue | null>(e?.growth ?? null)
  const avoiding = e?.avoiding ?? false
  const [why, setWhy] = useState(e?.why ?? "")
  const [tried, setTried] = useState(false)
  /** This card has saved at least once: an answer now drawn for its quarters is its own. */
  const [savedOnce, setSavedOnce] = useState(false)
  const ready = activity.trim().length > 0 && energy !== null && growth !== null
  const fromTime = card.entryId !== null && !e
  // Opened on a gap, and the page's re-read now brings an answer for it that
  // this card did not save: another device (or tab) answered it meanwhile.
  const elsewhere = !e && !savedOnce ? quarters.map((q) => existingByQuarter.get(q)).find((s) => s !== undefined && !s.pending) ?? null : null

  const save = (en: ScaleValue | null = energy, gr: ScaleValue | null = growth) => {
    setTried(true)
    if (!activity.trim() || en === null || gr === null) return
    setSavedOnce(true)
    const answers = quarters.map((q) => {
      const slotAt = new Date(q).toISOString()
      return {
        // An answered quarter keeps its id, so a waiting delete or resend still names it.
        id: existingByQuarter.get(q)?.id ?? crypto.randomUUID(),
        runId,
        slotAt,
        activity: activity.trim(),
        energy: en,
        growth: gr,
        avoiding,
        why: why.trim() || null,
        source,
        timeEntryId: activity.trim() === card.text.trim() ? card.entryId : null,
        answeredAt: new Date().toISOString(),
      } satisfies AuditAnswer
    })
    onSave(answers)
  }
  // A new answer saves itself on the tap that completes it. A changed one (also
  // this card's own, reopened with the pencil), or one that would replace
  // another device's answer, waits for Save.
  const autoSave = !e && !elsewhere && !savedOnce
  const pickEnergy = (v: ScaleValue) => {
    setEnergy(v)
    if (autoSave && activity.trim() && growth !== null) save(v, growth)
  }
  const pickGrowth = (v: ScaleValue) => {
    setGrowth(v)
    if (autoSave && activity.trim() && energy !== null) save(energy, v)
  }

  const label = stretchLabel(quarters, timezone)
  if (saved && lost) {
    return (
      <section
        className="flex min-h-14 items-center gap-3 rounded-2xl border border-amber-500/60 bg-amber-500/10 px-3 py-2"
        data-testid="audit-card"
        data-card={index}
      >
        <div className="min-w-0 flex-1" role="alert" data-testid="audit-card-not-kept">
          <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">Not kept · {label}</p>
          <p className="text-sm">
            {activity.trim()}: {lost}. The Day list shows the answer that was kept.
          </p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/50"
          aria-label={`Answer ${label} again`}
        >
          <Pencil className="size-4" />
        </button>
      </section>
    )
  }
  if (saved) {
    return (
      <section
        className="flex min-h-14 items-center gap-3 rounded-2xl border border-emerald-500/60 bg-emerald-500/10 px-3 py-2"
        data-testid="audit-card"
        data-card={index}
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white" aria-hidden>
          <Check className="size-4" />
        </span>
        <div className="min-w-0 flex-1" role="status" data-testid="audit-card-saved">
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Saved · {label}</p>
          <p className="truncate text-sm">
            {activity.trim()} <span className="tabular-nums text-muted-foreground">· E {energy} · G {growth}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/50"
          aria-label={`Change the answer for ${label}`}
        >
          <Pencil className="size-4" />
        </button>
      </section>
    )
  }
  return (
    <section
      className="rounded-2xl border border-border bg-card px-2 py-3"
      data-testid="audit-card"
      data-card={index}
      data-autosave={autoSave ? "yes" : "no"}
    >
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h3 className="font-semibold">
          {label}
          {card.asked && (
            <span className="font-normal text-primary" data-testid="audit-asked">
              {" "}
              · this ping
            </span>
          )}
          {fromTime && <span className="font-normal text-muted-foreground"> · from Time</span>}
          {card.sameAsBefore && !e && <span className="font-normal text-muted-foreground"> · same as before</span>}
          {quarters.length > 1 && <span className="font-normal text-muted-foreground"> · {quarters.length} quarters</span>}
        </h3>
      </div>
      {cover && cover.quarters.length > 0 && (
        <label className="mx-1 mt-2 flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg bg-muted/40 px-2.5 py-1.5 text-sm" data-testid="audit-cover">
          <input type="checkbox" className="size-5 shrink-0 accent-primary" checked={cover.on} onChange={(ev) => onCover(ev.target.checked)} />
          <span>
            Same answer for the {cover.quarters.length === 1 ? "quarter" : `${cover.quarters.length} quarters`} before{" "}
            <span className="tabular-nums text-muted-foreground">({stretchLabel(cover.quarters, timezone)})</span>
          </span>
        </label>
      )}
      {elsewhere && (
        <p className="mx-1 mt-2 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-sm text-amber-700 dark:text-amber-300" role="status" data-testid="audit-card-elsewhere">
          Answered on another device just now: {elsewhere.activity} · E {elsewhere.energy} · G {elsewhere.growth}. Saving replaces it.
        </p>
      )}
      <div className="mt-3 space-y-4 px-1">
        <ActivityField id={`audit-activity-${index}`} value={activity} onChange={setActivity} suggestions={suggestions} />
        <ScaleRow label="Energy" low="1 takes my energy" high="7 gives me energy" value={energy} onChange={pickEnergy} testId="audit-energy" />
        <ScaleRow label="Growth" low="1 ruins my life" high="7 builds my life" value={growth} onChange={pickGrowth} testId="audit-growth" />
        <div>
          <label htmlFor={`audit-why-${index}`} className="text-sm font-medium">
            Why I feel like this <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <textarea
            id={`audit-why-${index}`}
            value={why}
            maxLength={WHY_MAX}
            rows={2}
            placeholder="Is it the activity itself, or how you were thinking about it?"
            onChange={(ev) => setWhy(ev.target.value)}
            className="mt-1.5 w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            data-testid="audit-why"
          />
        </div>
        {tried && !ready && (
          <p className="text-sm text-destructive" role="alert">
            Fill in what you did, energy and growth.
          </p>
        )}
        <div className="sticky bottom-0 -mx-1 flex gap-2 bg-card px-1 py-1">
          {onDelete && e && (
            <Button variant="outline" className="flex-1" onClick={() => onDelete(e.id)} data-testid="audit-delete">
              Delete
            </Button>
          )}
          <Button className="flex-1" onClick={() => save()} data-testid="audit-save">
            Save
          </Button>
        </div>
      </div>
    </section>
  )
}

export function AnswerSheet({
  open,
  onClose,
  title,
  cards,
  runId,
  timezone,
  source,
  suggestions,
  slots,
  notKept = [],
  onSave,
  onDelete,
}: {
  open: boolean
  onClose: () => void
  title: string
  cards: AnswerCardInput[]
  runId: string
  timezone: string
  source: AnswerSource
  suggestions: readonly ActivityCount[]
  slots: readonly DrawnSlot[]
  notKept?: readonly NotKept[]
  onSave: (answers: AuditAnswer[]) => void
  onDelete?: (id: string) => void
}) {
  const lostByQuarter = new Map<number, string>()
  for (const x of notKept) if (x.answer.runId === runId) lostByQuarter.set(Date.parse(x.answer.slotAt), x.reason)
  const [saved, setSaved] = useState<Set<number>>(new Set())
  /** Card index → the quarters before it that it covers, ticked by the person. */
  const [covers, setCovers] = useState<Map<number, number[]>>(new Map())
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    setSaved(new Set())
    setCovers(new Map())
  }, [open, cards])

  const existingByQuarter = new Map<number, DrawnSlot>()
  for (const s of slots) if (s.runId === runId) existingByQuarter.set(Date.parse(s.slotAt), s)

  // Single-quarter new cards can cover the open quarters right before them.
  const single = new Map<number, number>()
  cards.forEach((c, i) => {
    if (c.quarters.length === 1 && !c.existing) single.set(c.quarters[0], i)
  })
  const coveredBy = new Map<number, number>()
  for (const [i, qs] of covers) for (const q of qs) coveredBy.set(q, i)
  const coverOf = (i: number): { quarters: number[]; on: boolean } | null => {
    const c = cards[i]
    if (c.quarters.length !== 1 || c.existing) return null
    const ticked = covers.get(i)
    if (ticked) return { quarters: ticked, on: true }
    const isOpen = (q: number) => {
      const j = single.get(q)
      return j !== undefined && j !== i && !saved.has(j) && !coveredBy.has(q) && !covers.has(j)
    }
    return { quarters: stretchBefore(c.quarters[0], isOpen, (q) => cards[single.get(q) ?? i]?.entryId ?? null), on: false }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={title} testId="audit-answer-sheet">
      <div ref={box} className="max-h-[70vh] space-y-3 overflow-y-auto overflow-x-hidden pb-2">
        {cards.length === 0 ? (
          <p className="px-1 py-4 text-sm text-muted-foreground" data-testid="audit-sheet-empty">
            Nothing to answer: every quarter of the last 3 hours has an answer. Older gaps are in the Day list.
          </p>
        ) : (
          cards.map((card, i) => {
            // a quarter another card covers is answered by that card
            if (coveredBy.has(card.quarters[0]) && coveredBy.get(card.quarters[0]) !== i) return null
            const cover = coverOf(i)
            const quarters = cover?.on ? [...cover.quarters, ...card.quarters] : card.quarters
            return (
            <Card
              key={`${card.quarters[0]}-${card.existing?.id ?? "new"}`}
              card={card}
              index={i}
              runId={runId}
              timezone={timezone}
              source={source}
              suggestions={suggestions}
              existingByQuarter={existingByQuarter}
              saved={saved.has(i)}
              lost={quarters.map((q) => lostByQuarter.get(q)).find((r) => r !== undefined) ?? null}
              cover={cover}
              onCover={(on) =>
                setCovers((prev) => {
                  const next = new Map(prev)
                  if (on && cover) next.set(i, cover.quarters)
                  else next.delete(i)
                  return next
                })
              }
              onEdit={() =>
                setSaved((prev) => {
                  const next = new Set(prev)
                  next.delete(i)
                  return next
                })
              }
              onDelete={
                onDelete
                  ? (id) => {
                      onDelete(id)
                      onClose()
                    }
                  : null
              }
              onSave={(answers) => {
                onSave(answers)
                setSaved((prev) => new Set(prev).add(i))
                // the next card still open (a covered one is not drawn)
                const next = [...(box.current?.querySelectorAll<HTMLElement>("[data-autosave]") ?? [])].find((el) => Number(el.dataset.card) > i)
                next?.scrollIntoView({ behavior: "smooth", block: "start" })
              }}
            />
            )
          })
        )}
      </div>
    </BottomSheet>
  )
}
