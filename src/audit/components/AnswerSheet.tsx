"use client"

/**
 * THE ANSWER SHEET: one card per quarter, newest first, the quarter a ping
 * asked about on top (alpha test 2026-11-09: fast-audit-07, picky-eye-02/03).
 * A blank card covers the quarters before it only when the person ticks "Same
 * answer for the N quarters before", which names them. A stretch chosen in
 * the Day list stays one card: choosing it was the decision. Quarters Time
 * filled from one entry are one card too, "09:00–10:00 · 4 quarters · from
 * Time: Gym", with "Split into 4 single quarters" (prove-eye-14); each quarter
 * it saves still carries its own `was`.
 *
 * Each card: what you did (pre-filled from Time when it knows, else from the
 * quarter before's answer), optionally "Why I feel like this", Energy 1–7,
 * Growth 1–7. The why opens above the scores from "+ Why I feel like this"
 * (which takes no height while closed, so both scores stay on screen), and a
 * why written top-down is saved by the same Growth tap (alpha prove-audit-02).
 * Activity and both scores are needed to save (D-REQUIRED).
 *
 * THREE TAPS FROM THE NOTIFICATION (fast-audit-06): on a new answer whose
 * activity is filled, the score tap that completes it saves it, so a ping is
 * tap, Energy, Growth. Save stays for the other cases (an answer being
 * changed, the activity typed last, another device's answer to replace) and
 * sticks to the bottom of the card, so it is never below the fold. Saving
 * folds the card into one green line, "✓ Saved · Gym · E 4 · G 7", with a
 * pencil to change it, and moves to the next one.
 *
 * TWO DEVICES, ONE QUARTER (alpha slow-pass-06). Each save carries what the
 * card saw for its quarters when it opened (`was`; another device's answer
 * the card has named since counts as seen). When the quarter holds something
 * else by then, the server keeps that and returns it, and the card says
 * "Answered on another device: Walk · E 5 · G 4" with "Keep that one" and
 * "Use mine" (which sends this answer again over that one). Never a plain
 * "Saved" over an answer that was not kept. The refusal comes back after the
 * sheet has moved on to the next card, so the sheet scrolls back to the
 * refused card, says "1 answer needs you" on top until it is settled, and
 * moves on from no save while one waits (prove-eye-01).
 *
 * NO "AVOIDING" BUTTON. The owner's note on the look page (2026-11-09): the
 * "why" box is enough. The column stays (always false from here; an older
 * answer keeps its value when changed), so nothing stored is lost.
 */

import { Check, Pencil } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { BottomSheet } from "@/components/BottomSheet"
import { Button } from "@/components/ui/button"
import { markOf, missingAnswerLine, WHY_MAX } from "../auditService"
import { stretchBefore, stretchLabel } from "../quarterService"
import type { ActivityCount } from "../suggestService"
import type { AnswerMark, AnswerSource, AuditAnswer, ScaleValue } from "../types"
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
  /** A stretch Time filled from one entry: the single-quarter cards it splits into, in sheet order. */
  parts?: AnswerCardInput[]
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
  onKeepStored,
  onDelete,
  saved,
  lost,
  onEdit,
  cover,
  onCover,
  onTouched,
  onSplit,
}: {
  card: AnswerCardInput
  index: number
  runId: string
  timezone: string
  source: AnswerSource
  suggestions: readonly ActivityCount[]
  existingByQuarter: ReadonlyMap<number, DrawnSlot>
  onSave: (answers: AuditAnswer[]) => void
  onKeepStored: (answers: AuditAnswer[]) => void
  onDelete: ((id: string) => void) | null
  saved: boolean
  /** What the server did not keep of what this card saved, and why (fast-audit-02, slow-pass-06). */
  lost: readonly NotKept[]
  onEdit: () => void
  cover: Cover | null
  onCover: (on: boolean) => void
  /** The person changed something here: no other card may cover (and hide) it now. */
  onTouched: () => void
  /** Split a Time stretch into its single quarters. */
  onSplit: () => void
}) {
  const e = card.existing
  const quarters = cover?.on ? [...cover.quarters, ...card.quarters] : card.quarters
  const [activity, setActivity] = useState(card.text)
  const [energy, setEnergy] = useState<ScaleValue | null>(e?.energy ?? null)
  const [growth, setGrowth] = useState<ScaleValue | null>(e?.growth ?? null)
  const avoiding = e?.avoiding ?? false
  const [why, setWhy] = useState(e?.why ?? "")
  /** The why box shows once asked for, or when the answer has a why. */
  const [whyOpen, setWhyOpen] = useState(Boolean(e?.why))
  const [tried, setTried] = useState(false)
  /** This card has saved at least once: an answer now drawn for its quarters is its own. */
  const [savedOnce, setSavedOnce] = useState(false)
  const ready = activity.trim().length > 0 && energy !== null && growth !== null
  const fromTime = card.entryId !== null && !e
  // Opened on a gap, and the page's re-read now brings an answer for it that
  // this card did not save: another device (or tab) answered it meanwhile.
  const elsewhere = !e && !savedOnce ? quarters.map((q) => existingByQuarter.get(q)).find((s) => s !== undefined && !s.pending) ?? null : null
  /**
   * Per quarter, the answer this card's next save replaces: what was drawn
   * when it opened, then its own last save, or the other device's answer it
   * was told about (alpha slow-pass-06).
   */
  const base = useRef<Map<number, AnswerMark | null> | null>(null)
  if (base.current === null) base.current = new Map([...existingByQuarter].map(([q, s]) => [q, markOf(s)]))
  /** "Keep that one" was chosen: the other device's answers, shown in place of this card's. */
  const [keptOther, setKeptOther] = useState<(AnswerMark | null)[] | null>(null)

  const save = (en: ScaleValue | null = energy, gr: ScaleValue | null = growth) => {
    setTried(true)
    if (!activity.trim() || en === null || gr === null) return
    setSavedOnce(true)
    setKeptOther(null)
    const seen = base.current!
    const answers = quarters.map((q) => {
      const slotAt = new Date(q).toISOString()
      // the other device's answer named on this card ("Saving replaces it") counts as seen
      const shown = elsewhere ? existingByQuarter.get(q) : undefined
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
        was: shown ? markOf(shown) : (seen.get(q) ?? null),
      } satisfies AuditAnswer
    })
    for (const a of answers) seen.set(Date.parse(a.slotAt), markOf(a))
    onSave(answers)
  }
  const conflicts = lost.filter((x) => x.stored !== undefined)
  /** "Use mine": the refused answers again, now over the answer each quarter holds. */
  const useMine = () => {
    const again = conflicts.map((x) => ({ ...x.answer, answeredAt: new Date().toISOString(), was: x.stored ?? null }))
    for (const a of again) base.current!.set(Date.parse(a.slotAt), markOf(a))
    onSave(again)
  }
  const keepThat = () => {
    for (const x of conflicts) base.current!.set(Date.parse(x.answer.slotAt), x.stored ?? null)
    setKeptOther(distinct(conflicts.map((x) => x.stored ?? null)))
    onKeepStored(conflicts.map((x) => x.answer))
  }
  // A new answer saves itself on the tap that completes it. A changed one (also
  // this card's own, reopened with the pencil), or one that would replace
  // another device's answer, waits for Save.
  const autoSave = !e && !elsewhere && !savedOnce
  const pickEnergy = (v: ScaleValue) => {
    setEnergy(v)
    onTouched()
    if (autoSave && activity.trim() && growth !== null) save(v, growth)
  }
  const pickGrowth = (v: ScaleValue) => {
    setGrowth(v)
    onTouched()
    if (autoSave && activity.trim() && energy !== null) save(energy, v)
  }

  const label = stretchLabel(quarters, timezone)
  if (saved && conflicts.length > 0 && !keptOther) {
    const theirs = distinct(conflicts.map((x) => x.stored ?? null))
    return (
      <section
        className="scroll-mt-14 rounded-2xl border border-amber-500/60 bg-amber-500/10 px-3 py-2"
        data-testid="audit-card"
        data-card={index}
      >
        <div role="alert" data-testid="audit-card-conflict">
          <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">Not saved yet · {stretchLabel(conflicts.map((x) => Date.parse(x.answer.slotAt)), timezone)}</p>
          {theirs.map((t) =>
            t ? (
              <p key={t.id} className="text-sm">
                Answered on another device: {t.activity} <span className="tabular-nums">· E {t.energy} · G {t.growth}</span>
              </p>
            ) : (
              <p key="deleted" className="text-sm">
                Deleted on another device
              </p>
            ),
          )}
          <p className="text-sm text-muted-foreground">
            Yours: {activity.trim()} <span className="tabular-nums">· E {energy} · G {growth}</span>
          </p>
        </div>
        <div className="mt-2 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={keepThat} data-testid="audit-conflict-keep">
            Keep that one
          </Button>
          <Button className="flex-1" onClick={useMine} data-testid="audit-conflict-mine">
            Use mine
          </Button>
        </div>
      </section>
    )
  }
  if (saved && keptOther) {
    return (
      <section
        className="flex min-h-14 items-center gap-3 rounded-2xl border border-emerald-500/60 bg-emerald-500/10 px-3 py-2"
        data-testid="audit-card"
        data-card={index}
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white" aria-hidden>
          <Check className="size-4" />
        </span>
        <div className="min-w-0 flex-1" role="status" data-testid="audit-card-kept">
          <p className="text-sm font-semibold text-success">Kept the other device's {keptOther.some((t) => t) ? "answer" : "delete"} · {label}</p>
          {keptOther.map((t) =>
            t ? (
              <p key={t.id} className="truncate text-sm">
                {t.activity} <span className="tabular-nums text-muted-foreground">· E {t.energy} · G {t.growth}</span>
              </p>
            ) : (
              <p key="deleted" className="truncate text-sm">
                No answer
              </p>
            ),
          )}
        </div>
      </section>
    )
  }
  if (saved && lost.length > 0) {
    return (
      <section
        className="flex min-h-14 items-center gap-3 rounded-2xl border border-amber-500/60 bg-amber-500/10 px-3 py-2"
        data-testid="audit-card"
        data-card={index}
      >
        <div className="min-w-0 flex-1" role="alert" data-testid="audit-card-not-kept">
          <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">Not kept · {label}</p>
          <p className="text-sm">
            {activity.trim()}: {lost[0].reason}. The Day list shows the answer that was kept.
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
          <p className="text-sm font-semibold text-success">Saved · {label}</p>
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
          {quarters.length > 1 && <span className="font-normal text-muted-foreground"> · {quarters.length} quarters</span>}
          {fromTime && <span className="font-normal text-muted-foreground"> · from Time{card.parts ? `: ${card.text}` : ""}</span>}
          {card.sameAsBefore && !e && <span className="font-normal text-muted-foreground"> · same as before</span>}
        </h3>
      </div>
      {card.parts && !savedOnce && (
        <button
          type="button"
          onClick={onSplit}
          className="mx-1 min-h-11 text-sm text-primary underline-offset-4 hover:underline"
          data-testid="audit-split"
        >
          Split into {card.parts.length} single quarters
        </button>
      )}
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
        <ActivityField id={`audit-activity-${index}`} value={activity} onChange={(v) => {
            setActivity(v)
            onTouched()
          }} suggestions={suggestions} invalid={tried && !activity.trim()} />
        {/* Above the scores: the tap that completes a new answer saves it, so a why
            written top-down goes in the same pass (alpha prove-audit-02, K-D5). */}
        {whyOpen && (
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
              onChange={(ev) => {
                setWhy(ev.target.value)
                onTouched()
              }}
              className="mt-1.5 w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              data-testid="audit-why"
            />
          </div>
        )}
        <div className="relative">
          {/* Closed, it takes no height: the three-tap path keeps both scores on screen. */}
          {!whyOpen && (
            <button
              type="button"
              onClick={() => {
                setWhyOpen(true)
                // straight into typing: the open is the one extra tap
                requestAnimationFrame(() => document.getElementById(`audit-why-${index}`)?.focus())
              }}
              className="absolute -top-4 right-0 z-10 flex h-10 items-center px-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
              data-testid="audit-why-open"
            >
              + Why I feel like this
            </button>
          )}
          <ScaleRow label="Energy" low="1 takes my energy" high="7 gives me energy" value={energy} onChange={pickEnergy} testId="audit-energy" invalid={tried && energy === null} />
        </div>
        <ScaleRow label="Growth" low="1 ruins my life" high="7 builds my life" value={growth} onChange={pickGrowth} testId="audit-growth" invalid={tried && growth === null} />
        {tried && !ready && (
          <p className="text-sm text-destructive" role="alert" data-testid="audit-card-missing">
            {missingAnswerLine({ activity, energy, growth })}
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

/** One of each answer (a stretch of quarters holds the same answer under many ids). */
function distinct(marks: readonly (AnswerMark | null)[]): (AnswerMark | null)[] {
  const out = new Map<string, AnswerMark | null>()
  for (const m of marks) out.set(m ? `${m.activity}\u0000${m.energy}\u0000${m.growth}` : "", m)
  return [...out.values()]
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
  onKeepStored = () => {},
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
  /** "Keep that one": the other device's answer stays for these quarters. */
  onKeepStored?: (answers: AuditAnswer[]) => void
  onDelete?: (id: string) => void
}) {
  // A split Time stretch replaces its card with its parts, until new cards come (prove-eye-14).
  const [splitState, setSplitState] = useState<{ of: AnswerCardInput[]; list: AnswerCardInput[] }>({ of: cards, list: cards })
  const list = splitState.of === cards ? splitState.list : cards
  const lostByQuarter = new Map<number, NotKept>()
  for (const x of notKept) if (x.answer.runId === runId) lostByQuarter.set(Date.parse(x.answer.slotAt), x)
  const [saved, setSaved] = useState<Set<number>>(new Set())
  /** Card index → the quarters before it that it covers, ticked by the person. */
  const [covers, setCovers] = useState<Map<number, number[]>>(new Map())
  /** Cards the person has typed or tapped in: never covered, so nothing typed is hidden (code review). */
  const [touched, setTouched] = useState<Set<number>>(new Set())
  const box = useRef<HTMLDivElement>(null)
  const lastNeeds = useRef("")
  useEffect(() => {
    if (!open) return
    setSaved(new Set())
    setCovers(new Map())
    setTouched(new Set())
  }, [open, cards])

  const existingByQuarter = new Map<number, DrawnSlot>()
  for (const s of slots) if (s.runId === runId) existingByQuarter.set(Date.parse(s.slotAt), s)

  // Single-quarter new cards can cover the open quarters right before them.
  const single = new Map<number, number>()
  list.forEach((c, i) => {
    if (c.quarters.length === 1 && !c.existing) single.set(c.quarters[0], i)
  })
  const coveredBy = new Map<number, number>()
  for (const [i, qs] of covers) for (const q of qs) coveredBy.set(q, i)
  const coverOf = (i: number): { quarters: number[]; on: boolean } | null => {
    const c = list[i]
    if (c.quarters.length !== 1 || c.existing) return null
    const ticked = covers.get(i)
    if (ticked) return { quarters: ticked, on: true }
    const isOpen = (q: number) => {
      const j = single.get(q)
      return j !== undefined && j !== i && !saved.has(j) && !coveredBy.has(q) && !covers.has(j) && !touched.has(j) && !list[j].asked
    }
    return { quarters: stretchBefore(c.quarters[0], isOpen, (q) => list[single.get(q) ?? i]?.entryId ?? null), on: false }
  }
  const quartersOf = (i: number): number[] => {
    const cover = coverOf(i)
    return cover?.on ? [...cover.quarters, ...list[i].quarters] : list[i].quarters
  }

  // Saved cards the server refused for another device's answer: they need him (prove-eye-01).
  const needsYou = list.flatMap((_, i) => (saved.has(i) && quartersOf(i).some((q) => lostByQuarter.get(q)?.stored !== undefined) ? [i] : []))
  const showCard = (i: number) => box.current?.querySelector<HTMLElement>(`[data-testid="audit-card"][data-card="${i}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" })
  const needsKey = needsYou.join(",")
  useEffect(() => {
    const before = new Set(lastNeeds.current.split(","))
    lastNeeds.current = needsKey
    // a refusal that has just come back: bring its card into view
    const fresh = needsKey.split(",").find((k) => k !== "" && !before.has(k))
    if (fresh !== undefined) showCard(Number(fresh))
  }, [needsKey])

  const splitCard = (i: number) => {
    const parts = list[i].parts
    if (!parts) return
    const shift = (j: number) => (j > i ? j + parts.length - 1 : j)
    setSplitState({ of: cards, list: [...list.slice(0, i), ...parts, ...list.slice(i + 1)] })
    setSaved((prev) => new Set([...prev].map(shift)))
    setTouched((prev) => new Set([...prev].filter((j) => j !== i).map(shift)))
    setCovers((prev) => new Map([...prev].map(([j, qs]) => [shift(j), qs])))
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={title} testId="audit-answer-sheet">
      <div ref={box} className="max-h-[70vh] space-y-3 overflow-y-auto overflow-x-hidden pb-2">
        {needsYou.length > 0 && (
          <button
            type="button"
            onClick={() => showCard(needsYou[0])}
            className="sticky top-0 z-10 flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-amber-500/60 bg-card px-3 text-left text-sm font-semibold text-amber-500 shadow-sm"
            data-testid="audit-sheet-needs-you"
          >
            <span>{needsYou.length === 1 ? "1 answer needs you" : `${needsYou.length} answers need you`}</span>
            <span className="font-normal underline underline-offset-4">Show</span>
          </button>
        )}
        {list.length === 0 ? (
          <p className="px-1 py-4 text-sm text-muted-foreground" data-testid="audit-sheet-empty">
            Nothing to answer: every quarter of the last 3 hours has an answer. Older gaps are in the Day list.
          </p>
        ) : (
          list.map((card, i) => {
            // a quarter another card covers is answered by that card
            if (coveredBy.has(card.quarters[0]) && coveredBy.get(card.quarters[0]) !== i) return null
            const cover = coverOf(i)
            const quarters = quartersOf(i)
            return (
            <Card
              key={`${card.quarters[0]}x${card.quarters.length}-${card.existing?.id ?? "new"}`}
              card={card}
              index={i}
              runId={runId}
              timezone={timezone}
              source={source}
              suggestions={suggestions}
              existingByQuarter={existingByQuarter}
              saved={saved.has(i)}
              lost={quarters.flatMap((q) => lostByQuarter.get(q) ?? [])}
              onKeepStored={onKeepStored}
              cover={cover}
              onSplit={() => splitCard(i)}
              onTouched={() => {
                if (!touched.has(i)) setTouched((prev) => new Set(prev).add(i))
              }}
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
                // never on past a card that still needs him (prove-eye-01)
                const waiting = needsYou.find((j) => j !== i)
                if (waiting !== undefined) return void showCard(waiting)
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
