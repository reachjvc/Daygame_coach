"use client"

/**
 * THE ANSWER SHEET: one card per stretch of quarters (D-RANGE).
 *
 * Each card: what you did (pre-filled from Time when it knows), Energy 1–7,
 * Growth 1–7, optionally "Avoiding something" and "Why I feel like this".
 * Activity and both scores are needed to save (D-REQUIRED). Saving shows
 * "✓ Saved" on the card and moves to the next one.
 */

import { Check } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { BottomSheet } from "@/components/BottomSheet"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { WHY_MAX } from "../auditService"
import { stretchLabel } from "../quarterService"
import type { ActivityCount } from "../suggestService"
import type { AnswerSource, AuditAnswer, ScaleValue } from "../types"
import type { DrawnSlot } from "../hooks/useAudit"
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
}) {
  const e = card.existing
  const [activity, setActivity] = useState(card.text)
  const [energy, setEnergy] = useState<ScaleValue | null>(e?.energy ?? null)
  const [growth, setGrowth] = useState<ScaleValue | null>(e?.growth ?? null)
  const [avoiding, setAvoiding] = useState(e?.avoiding ?? false)
  const [why, setWhy] = useState(e?.why ?? "")
  const [tried, setTried] = useState(false)
  const ready = activity.trim().length > 0 && energy !== null && growth !== null
  const fromTime = card.entryId !== null && !e

  const save = () => {
    setTried(true)
    if (!ready) return
    const answers = card.quarters.map((q) => {
      const slotAt = new Date(q).toISOString()
      return {
        // An answered quarter keeps its id, so a waiting delete or resend still names it.
        id: existingByQuarter.get(q)?.id ?? crypto.randomUUID(),
        runId,
        slotAt,
        activity: activity.trim(),
        energy: energy!,
        growth: growth!,
        avoiding,
        why: why.trim() || null,
        source,
        timeEntryId: activity.trim() === card.text.trim() ? card.entryId : null,
      } satisfies AuditAnswer
    })
    onSave(answers)
  }

  const label = stretchLabel(card.quarters, timezone)
  return (
    <section
      className={cn("rounded-2xl border bg-card px-2 py-3", saved ? "border-emerald-500/50" : "border-border")}
      data-testid="audit-card"
      data-card={index}
    >
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h3 className="font-semibold">
          {label}
          {fromTime && <span className="font-normal text-muted-foreground"> · from Time</span>}
          {card.quarters.length > 1 && <span className="font-normal text-muted-foreground"> · {card.quarters.length} quarters</span>}
        </h3>
        {saved && (
          <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-emerald-500" role="status" data-testid="audit-card-saved">
            <Check className="size-4" aria-hidden /> Saved
          </span>
        )}
      </div>
      <div className="mt-3 space-y-4 px-1">
        <ActivityField id={`audit-activity-${index}`} value={activity} onChange={setActivity} suggestions={suggestions} />
        <ScaleRow label="Energy" low="1 takes my energy" high="7 gives me energy" value={energy} onChange={setEnergy} testId="audit-energy" />
        <ScaleRow label="Growth" low="1 ruins my life" high="7 builds my life" value={growth} onChange={setGrowth} testId="audit-growth" />
        <button
          type="button"
          aria-pressed={avoiding}
          onClick={() => setAvoiding((v) => !v)}
          className={cn(
            "flex h-11 w-full items-center justify-between rounded-lg border px-3 text-left text-base",
            avoiding ? "border-primary bg-primary/10" : "border-border bg-background/60",
          )}
          data-testid="audit-avoiding"
        >
          <span>Avoiding something</span>
          <span className="text-sm text-muted-foreground">{avoiding ? "Yes" : "Optional"}</span>
        </button>
        <div>
          <label htmlFor={`audit-why-${index}`} className="text-sm font-medium">
            Why I feel like this <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <textarea
            id={`audit-why-${index}`}
            value={why}
            maxLength={WHY_MAX}
            rows={2}
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
        <div className="flex gap-2">
          {onDelete && e && (
            <Button variant="outline" className="flex-1" onClick={() => onDelete(e.id)} data-testid="audit-delete">
              Delete
            </Button>
          )}
          <Button className="flex-1" onClick={save} data-testid="audit-save">
            {saved ? "Save again" : "Save"}
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
  onSave: (answers: AuditAnswer[]) => void
  onDelete?: (id: string) => void
}) {
  const [saved, setSaved] = useState<Set<number>>(new Set())
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (open) setSaved(new Set())
  }, [open, cards])

  const existingByQuarter = new Map<number, DrawnSlot>()
  for (const s of slots) if (s.runId === runId) existingByQuarter.set(Date.parse(s.slotAt), s)

  return (
    <BottomSheet open={open} onClose={onClose} title={title} testId="audit-answer-sheet">
      <div ref={box} className="max-h-[70vh] space-y-3 overflow-y-auto overflow-x-hidden pb-2">
        {cards.length === 0 ? (
          <p className="px-1 py-4 text-sm text-muted-foreground" data-testid="audit-sheet-empty">
            Nothing to answer: every quarter of the last 3 hours has an answer. Older gaps are in the Day list.
          </p>
        ) : (
          cards.map((card, i) => (
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
                const next = box.current?.querySelector<HTMLElement>(`[data-card="${i + 1}"]`)
                next?.scrollIntoView({ behavior: "smooth", block: "start" })
              }}
            />
          ))
        )}
      </div>
    </BottomSheet>
  )
}
