"use client"

/**
 * THE VERSIONS TO TRY, on the copy space only (Plans/plan-new-from-real.md, Phase 7, decision T7).
 *
 * - `VersionSwitcher`: which order of screens (V1, V2, V3) and which sorter (S1, S2, S3) the copy plan is trying. Both
 *   are plan answers (`start:new:sequence`, `start:new:sorter`), so the choice survives a reload and changes no data.
 * - `DeeperCard`: the short, skippable go-deeper card of V3, drawn in place by the real parts (`DeeperPromptsContext`).
 * - `SorterCards`: what S2 ("Moved to Experiences · Undo") and S3 ("Something you do every week, or something you want
 *   to happen?") show.
 */

import { useEffect, useRef } from "react"
import * as ns from "@/src/goals/northStarService"
import { SEQUENCE_KEY } from "@/src/goals/planSteps/planFacts"
import { SEQUENCES, sequenceOfPlan } from "@/src/goals/planSteps/planSequences"
import { HALF_NAME, SORTERS, sorterOfPlan, withSorter, type Half, type SorterId } from "@/src/goals/planSteps/planSorter"
import { usePlanNew } from "./PlanNewContext"

const seg = (on: boolean) =>
  `inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border px-3 text-sm transition-colors ${
    on ? "border-primary/60 bg-primary/15 text-primary" : "border-white/10 text-muted-foreground hover:border-white/25 hover:text-foreground"
  }`

/** The two small rows above every screen of the copy space. Nothing in the plan changes but the two answers. */
export function VersionSwitcher() {
  const { plan, store } = usePlanNew()
  if (!store.loaded) return null
  const seq = sequenceOfPlan(plan)
  const sorter = sorterOfPlan(plan)
  const setSequence = (id: string) => store.update((p) => ns.setAnswer(p, SEQUENCE_KEY, id))
  const setSorter = (id: SorterId) => store.update((p) => withSorter(p, id))
  return (
    <div className="mt-2 space-y-1 rounded-xl border border-white/10 px-3 py-2" data-testid="version-switcher" role="group" aria-label="Versions to try">
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-14 text-xs text-muted-foreground">Order</span>
        {SEQUENCES.map((s) => (
          <button key={s.id} type="button" className={seg(s.id === seq.id)} aria-pressed={s.id === seq.id} onClick={() => setSequence(s.id)} title={s.blurb} data-testid={`version-${s.id}`}>
            {s.label}
          </button>
        ))}
        <span className="min-w-0 basis-full text-xs text-muted-foreground sm:flex-1 sm:basis-0" data-testid="version-blurb">{seq.blurb}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-14 text-xs text-muted-foreground">Sorter</span>
        {SORTERS.map((s) => (
          <button key={s.id} type="button" className={seg(s.id === sorter)} aria-pressed={s.id === sorter} onClick={() => setSorter(s.id)} title={s.blurb} data-testid={`sorter-${s.id}`}>
            {s.label}
          </button>
        ))}
        <span className="min-w-0 basis-full text-xs text-muted-foreground sm:flex-1 sm:basis-0" data-testid="sorter-blurb">{SORTERS.find((s) => s.id === sorter)?.blurb}</span>
      </div>
    </div>
  )
}

/** One go-deeper card: a line, one button that opens it, and "Not now". */
export function DeeperCard({ testId, title, line, openLabel, onOpen, onNotNow }: {
  testId: string
  title: string
  line?: string
  openLabel: string
  onOpen: () => void
  onNotNow: () => void
}) {
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/[0.06] p-3" data-testid={testId} role="group" aria-label={title}>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {line && <p className="mt-0.5 text-xs text-muted-foreground">{line}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={onOpen} className="inline-flex min-h-11 items-center rounded-lg border border-primary/50 bg-primary/10 px-3 text-sm text-primary" data-testid={`${testId}-open`}>
          {openLabel}
        </button>
        <button type="button" onClick={onNotNow} className="inline-flex min-h-11 items-center rounded-lg border border-white/10 px-3 text-sm text-muted-foreground hover:text-foreground" data-testid={`${testId}-not-now`}>
          Not now
        </button>
      </div>
    </div>
  )
}

/** A line the sorter moved (S2). */
export interface SorterNotice {
  areaId: string
  titles: string[]
  /** The half it was typed on. */
  from: Half
}
/** A line the sorter asks about (S3). */
export interface SorterAsk {
  areaId: string
  title: string
  typedOn: Half
}

const otherHalf = (h: Half): Half => (h === "systems" ? "experiences" : "systems")

export function SorterCards({ notice, asks, onUndo, onDismiss, onAnswer }: {
  notice: SorterNotice | null
  asks: SorterAsk[]
  onUndo: () => void
  onDismiss: () => void
  onAnswer: (ask: SorterAsk, half: Half) => void
}) {
  // The notice fades by itself; a question stays until it is answered.
  useEffect(() => {
    if (!notice) return
    const t = window.setTimeout(onDismiss, 20_000)
    return () => window.clearTimeout(t)
  }, [notice, onDismiss])
  const ask = asks[0]
  const card = useRef<HTMLDivElement>(null)
  // The card sits above the bottom bar and the page is padded by the same height (the spacer), so the box that was typed in
  // can always be scrolled clear of it; if it is under the card now, scroll it up by the overlap.
  useEffect(() => {
    const el = card.current
    const box = document.activeElement
    if (!el || !box || box === document.body) return
    const over = box.getBoundingClientRect().bottom - el.getBoundingClientRect().top
    if (over > -16) window.scrollBy({ top: over + 16 })
  }, [ask, notice])
  if (!ask && !notice) return null
  return (
    <>
    <div aria-hidden className="h-44" />
    <div ref={card} className="pointer-events-none fixed inset-x-0 bottom-20 z-[80] flex justify-center px-3" data-testid="sorter-card">
      {ask ? (
        <div className="pointer-events-auto w-full max-w-md rounded-xl border border-primary/40 bg-zinc-900 p-3 shadow-xl" role="alertdialog" aria-label="Where does this line go?" data-testid="sorter-ask">
          <p className="break-words text-xs text-muted-foreground">{`“${ask.title}”`}</p>
          <p className="mt-1 text-sm font-medium text-foreground">Something you do every week, or something you want to happen?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => onAnswer(ask, "systems")} className="inline-flex min-h-11 items-center rounded-lg border border-primary/50 bg-primary/10 px-3 text-sm text-primary" data-testid="sorter-every-week">
              Every week
            </button>
            <button type="button" onClick={() => onAnswer(ask, "experiences")} className="inline-flex min-h-11 items-center rounded-lg border border-primary/50 bg-primary/10 px-3 text-sm text-primary" data-testid="sorter-want">
              Want it to happen
            </button>
          </div>
        </div>
      ) : (
        notice && (
          <div className="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-xl border border-white/15 bg-zinc-900 px-3 py-1 shadow-xl" role="status" data-testid="sorter-notice">
            <p className="min-w-0 flex-1 break-words text-sm text-foreground">
              {`Moved to ${HALF_NAME[otherHalf(notice.from)]} · `}
              <button type="button" onClick={onUndo} className="inline-flex min-h-11 items-center text-primary underline underline-offset-2" data-testid="sorter-undo">Undo</button>
              <span className="block truncate text-xs text-muted-foreground">{notice.titles.map((t) => `“${t}”`).join(", ")}</span>
            </p>
            <button type="button" onClick={onDismiss} aria-label="Close" className="inline-flex min-h-11 min-w-11 items-center justify-center text-muted-foreground">×</button>
          </div>
        )
      )}
    </div>
    </>
  )
}
