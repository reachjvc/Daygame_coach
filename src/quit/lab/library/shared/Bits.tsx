"use client"

import { useState } from "react"
import { InferredTag, PlaceholderScreen } from "../../progress/shared/Bits"
import { useLabState } from "../../store"
import { lbText } from "./text"

const TONES = ["from-sky-700/60 to-indigo-900/60", "from-rose-700/60 to-purple-900/60", "from-emerald-700/60 to-teal-900/60", "from-amber-600/60 to-orange-900/60", "from-fuchsia-700/60 to-violet-900/60"]

/** Our own flat picture: a tinted tile with a soft shape. */
export function Pic({ tone = 0, className = "h-28", round }: { tone?: number; className?: string; round?: boolean }) {
  return (
    <div data-testid="pic" role="img" aria-label={lbText.pic} className={`relative shrink-0 overflow-hidden bg-gradient-to-br ${TONES[tone % TONES.length]} ${round ? "rounded-full" : "rounded-lg"} ${className}`}>
      <span aria-hidden="true" className="absolute -bottom-6 -right-4 size-24 rounded-full bg-white/15" />
      <span aria-hidden="true" className="absolute left-4 top-4 size-8 rounded-full bg-white/20" />
    </div>
  )
}

/** Dashed tile where an article body would be. */
export function ArticleTile({ text = lbText.articleTile }: { text?: string }) {
  return (
    <div data-testid="article-tile" className="flex min-h-16 items-center justify-center rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
      {text}
    </div>
  )
}

export function LabOnlyTag() {
  return (
    <span data-testid="lab-only-tag" className="inline-flex items-center rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground">
      {lbText.labOnly}
    </span>
  )
}

/** Saved ids of one copy, kept in the lab store. */
export function useSaved(letter: string): [string[], (id: string) => void] {
  const [saved, set] = useLabState<string[]>("library", letter, "saved", [])
  const toggle = (id: string) => set(saved.includes(id) ? saved.filter((x) => x !== id) : [...saved, id])
  return [saved, toggle]
}

export function SaveBtn({ on, onClick, testId = "save-btn" }: { on: boolean; onClick: () => void; testId?: string }) {
  return (
    <button type="button" data-testid={testId} aria-pressed={on} aria-label={on ? lbText.unsave : lbText.save} onClick={onClick} className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border text-lg ${on ? "bg-primary/40" : "bg-card"}`}>
      {"🔖"}
    </button>
  )
}

export function BackBtn({ onClick, testId = "screen-back" }: { onClick: () => void; testId?: string }) {
  return (
    <button type="button" data-testid={testId} aria-label={lbText.back} onClick={onClick} className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-lg">
      {"‹"}
    </button>
  )
}

/** One article opened from a card: back, title, picture, body tile. `inferred` when the screen itself was never seen. */
export function ItemPage({ title, onBack, inferred, right, testId = "item-page", children }: { title: string; onBack: () => void; inferred?: boolean; right?: React.ReactNode; testId?: string; children?: React.ReactNode }) {
  return (
    <section data-testid={testId} className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <BackBtn onClick={onBack} />
        <h2 className="min-w-0 flex-1 text-lg font-semibold">{title}</h2>
        {inferred && <InferredTag />}
        {right}
      </div>
      <Pic tone={1} className="h-36" />
      {children ?? <ArticleTile />}
    </section>
  )
}

/** A visible "Share" control: opens the share sheet where the browser has one. */
export function LabelledShare({ text, label, testId }: { text: string; label: string; testId?: string }) {
  const share = () => {
    try {
      if (typeof navigator !== "undefined" && navigator.share) void navigator.share({ text }).catch(() => undefined)
    } catch {
      // no share sheet here
    }
  }
  return (
    <button type="button" data-testid={testId} onClick={share} className="inline-flex min-h-11 items-center gap-1 rounded-full border border-border bg-card px-4 text-sm">
      <span aria-hidden="true">{"↗"}</span>
      {label}
    </button>
  )
}

/** Tiny dashed tile standing where a name or host would be. */
export function NameTile({ text }: { text: string }) {
  return <span data-testid="name-tile" className="inline-block rounded border border-dashed border-border px-1.5 py-0.5 text-xs text-muted-foreground">{text}</span>
}

/** Lab-only entries to the two screens no public material shows. */
export function LabInferredLinks({ onSearch, onSaved, search = true }: { onSearch: () => void; onSaved: () => void; search?: boolean }) {
  return (
    <div data-testid="lab-links" className="mt-2 flex flex-wrap items-center gap-2 border-t border-dashed border-border pt-3">
      <LabOnlyTag />
      {search && (
        <button type="button" data-testid="lab-search" onClick={onSearch} className="min-h-11 rounded-full border border-border px-3 text-sm">
          {lbText.labSearch}
        </button>
      )}
      <button type="button" data-testid="lab-saved" onClick={onSaved} className="min-h-11 rounded-full border border-border px-3 text-sm">
        {lbText.labSaved}
      </button>
    </div>
  )
}

export function InferredScreen({ title, onBack }: { title: string; onBack: () => void }) {
  return <PlaceholderScreen title={title} onBack={onBack} />
}

/** A card row with an "n of N" pager and arrows under it; the next card peeks in at the right edge. */
export function Row({ children, id }: { children: React.ReactNode[]; id: string }) {
  const [i, setI] = useState(0)
  const n = children.length
  return (
    <div data-testid={id} className="flex flex-col gap-2">
      <div className="flex gap-3 overflow-hidden">
        <div className="w-[88%] shrink-0" data-testid={`${id}-card`}>{children[i]}</div>
        {i < n - 1 && <div aria-hidden="true" className="w-[88%] shrink-0 opacity-50">{children[i + 1]}</div>}
      </div>
      <div className="flex items-center justify-center gap-3 text-sm">
        <button type="button" data-testid={`${id}-prev`} aria-label={lbText.prev} disabled={i === 0} onClick={() => setI(i - 1)} className="inline-flex size-11 items-center justify-center disabled:opacity-30">{"‹"}</button>
        <span data-testid={`${id}-count`}>{lbText.of(i + 1, n)}</span>
        <button type="button" data-testid={`${id}-next`} aria-label={lbText.more} disabled={i === n - 1} onClick={() => setI(i + 1)} className="inline-flex size-11 items-center justify-center disabled:opacity-30">{"›"}</button>
      </div>
    </div>
  )
}
