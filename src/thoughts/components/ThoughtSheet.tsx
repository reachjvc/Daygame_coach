"use client"

/**
 * ONE THOUGHT'S OWN SHEET: how often it comes, its reframes, and everything
 * you can do with it (Plans/thought.md, screen 4).
 *
 * Rewording keeps its history: it is still the same thought. Merging moves
 * its history into another. Archive hides it and keeps everything. Delete
 * removes it and every log and reframe, after one confirm, and is only ever
 * done here, by the person (Q18).
 */

import { useEffect, useState } from "react"
import { ChevronLeft } from "lucide-react"
import { BottomSheet, SheetRow } from "@/components/BottomSheet"
import { Button } from "@/components/ui/button"
import { ThoughtsCallError } from "../thoughtsClient"
import { checkThoughtText } from "../thoughtsService"
import type { Reframe, Thought } from "../types"
import { formatDay } from "./format"

type Mode = "main" | "edit" | "merge" | "delete"

export function ThoughtSheet({
  thought,
  others,
  timezone,
  onClose,
  onReframe,
  update,
  merge,
  remove,
  loadReframes,
  trend,
}: {
  thought: Thought | null
  others: Thought[]
  timezone: string
  onClose: () => void
  onReframe: (t: Thought) => void
  update: (id: string, patch: { text?: string; pinned?: boolean; archived?: boolean }) => Promise<unknown>
  merge: (id: string, into: string) => Promise<unknown>
  remove: (id: string) => Promise<unknown>
  loadReframes: (id: string) => Promise<Reframe[]>
  /** The last 14 days as a line (FrequenciesView's `ThoughtTrend`). */
  trend?: React.ReactNode
}) {
  const [mode, setMode] = useState<Mode>("main")
  const [draft, setDraft] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<Reframe[] | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    setMode("main")
    setError(null)
    setHistory(null)
    setShowHistory(false)
    setDraft(thought?.text ?? "")
  }, [thought?.id, thought?.text])

  if (!thought) return null

  const run = async (action: () => Promise<unknown>, after: () => void) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      after()
    } catch (e) {
      if (e instanceof ThoughtsCallError && e.status === 409) {
        setError("You already have a thought with these words. Merge into it instead.")
        setMode("merge")
      } else {
        setError(e instanceof Error ? e.message : "Something went wrong")
      }
    } finally {
      setBusy(false)
    }
  }

  const c = thought.counts
  const mergeTargets = others.filter((o) => o.id !== thought.id && !o.archived)

  return (
    <BottomSheet open onClose={onClose} title={mode === "main" ? "Thought" : mode === "edit" ? "Edit wording" : mode === "merge" ? "Merge into" : "Delete"} testId="thought-sheet">
      <div className="space-y-4 pb-2">
        {mode !== "main" && (
          <button type="button" onClick={() => setMode("main")} className="-ml-1 flex min-h-11 items-center gap-1 text-sm text-muted-foreground">
            <ChevronLeft className="size-4" /> Back
          </button>
        )}

        <p className="text-lg font-semibold leading-snug" data-testid="thought-sheet-text">
          “{thought.text}”
        </p>

        {mode === "main" && (
          <>
            <dl className="grid grid-cols-3 gap-2 text-center">
              {[
                ["today", c.today],
                ["7 days", c.week],
                ["all time", c.total],
              ].map(([label, n]) => (
                <div key={label} className="rounded-xl bg-background/60 px-2 py-3">
                  <dd className="text-2xl font-semibold tabular-nums">{n}</dd>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                </div>
              ))}
            </dl>
            {trend}
            {c.firstAt && <p className="text-xs text-muted-foreground">First logged {formatDay(c.firstAt, timezone)}.</p>}

            {thought.reframe && (
              <div className="rounded-xl border border-primary/30 bg-primary/[0.06] p-3.5">
                <p className="text-xs uppercase tracking-wide text-primary">Your reframe · {formatDay(thought.reframe.createdAt, timezone)}</p>
                <p className="mt-1 leading-relaxed">{thought.reframe.text}</p>
                {thought.reframeCount > 1 && (
                  <button
                    type="button"
                    className="mt-2 min-h-11 text-xs text-muted-foreground underline underline-offset-4"
                    onClick={async () => {
                      setShowHistory((s) => !s)
                      if (!history) setHistory(await loadReframes(thought.id).catch(() => []))
                    }}
                  >
                    {showHistory ? "Hide" : "Show"} earlier reframes ({thought.reframeCount - 1})
                  </button>
                )}
                {showHistory && history && (
                  <ul className="mt-1 space-y-2 border-t border-border pt-2">
                    {history.slice(1).map((r) => (
                      <li key={r.id} className="text-sm text-muted-foreground">
                        <span className="text-xs">{formatDay(r.createdAt, timezone)}: </span>
                        {r.text}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="divide-y divide-border rounded-xl border border-border">
              <SheetRow onClick={() => onReframe(thought)} testId="thought-sheet-reframe">
                {thought.reframe ? "Reframe again" : "Reframe this thought"}
              </SheetRow>
              <SheetRow onClick={() => setMode("edit")}>
                Edit wording
              </SheetRow>
              <SheetRow onClick={() => void run(() => update(thought.id, { pinned: !thought.pinned }), () => undefined)} disabled={busy}>
                {thought.pinned ? "Unpin" : "Pin to top"}
              </SheetRow>
              {mergeTargets.length > 0 && <SheetRow onClick={() => setMode("merge")}>Merge into another thought</SheetRow>}
              <SheetRow onClick={() => void run(() => update(thought.id, { archived: !thought.archived }), onClose)} disabled={busy}>
                {thought.archived ? "Bring back from the archive" : "Archive (hides it, keeps its history)"}
              </SheetRow>
              <SheetRow destructive onClick={() => setMode("delete")} testId="thought-sheet-delete">
                Delete
              </SheetRow>
            </div>
          </>
        )}

        {mode === "edit" && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              const checked = checkThoughtText(draft)
              if (!checked.ok) return setError(checked.error)
              void run(() => update(thought.id, { text: checked.value }), () => setMode("main"))
            }}
          >
            <label htmlFor="thought-edit" className="text-sm text-muted-foreground">
              New wording. Its history stays with it.
            </label>
            <input
              id="thought-edit"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              className="min-h-12 w-full rounded-xl border border-border bg-input px-4 text-base focus-visible:border-ring focus-visible:outline-none"
            />
            <Button type="submit" className="w-full" disabled={busy}>
              Save wording
            </Button>
          </form>
        )}

        {mode === "merge" && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Every log and reframe of this thought moves into the one you pick. Typing these words again will find it.
            </p>
            <ul className="space-y-1.5">
              {mergeTargets.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void run(() => merge(thought.id, o.id), onClose)}
                    className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-2 text-left hover:bg-muted"
                  >
                    <span className="min-w-0 break-words">{o.text}</span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{o.counts.total}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {mode === "delete" && (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed">
              This deletes the thought, its {c.total === 1 ? "one log" : `${c.total} logs`}
              {thought.reframeCount > 0 ? ` and ${thought.reframeCount === 1 ? "its reframe" : `its ${thought.reframeCount} reframes`}` : ""}.
              It cannot be undone. Archive keeps the history and only hides it.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setMode("main")}>
                Keep it
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={busy}
                data-testid="thought-sheet-confirm-delete"
                onClick={() => void run(() => remove(thought.id), onClose)}
              >
                Delete for good
              </Button>
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {busy && <p className="text-xs text-muted-foreground">Saving…</p>}
      </div>
    </BottomSheet>
  )
}
