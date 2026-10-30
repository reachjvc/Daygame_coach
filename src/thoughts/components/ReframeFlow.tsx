"use client"

/**
 * REFRAMING A THOUGHT (Plans/thought.md, screen 5; Q9).
 *
 * The shape of a standard thought record, cut to what earns its place: how
 * true the old thought feels, what speaks against it, what you would tell a
 * friend who thought it, and the new sentence. ONLY THE NEW SENTENCE IS
 * REQUIRED; the rest is offered, folded, because every required field is a
 * reason not to finish. After the sentence, "how true does the old one feel
 * now" is asked once more, so the change can be seen later.
 *
 * Full screen rather than a sheet: it is writing, and a keyboard on a phone
 * leaves a sheet no room.
 */

import { useEffect, useState } from "react"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { MAX_REFRAME_LENGTH } from "../thoughtsService"
import type { Reframe, Thought } from "../types"
import { frequencyLine } from "./format"

function Belief({ label, value, onChange, id }: { label: string; value: number | null; onChange: (v: number) => void; id: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm">
          {label}
        </label>
        <span className="text-lg font-semibold tabular-nums" aria-hidden>
          {value === null ? "–" : value}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={5}
        value={value ?? 50}
        aria-valuetext={value === null ? "Not answered" : `${value} out of 100`}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerDown={() => value === null && onChange(50)}
        className={cn("h-11 w-full cursor-pointer accent-[var(--primary)]", value === null && "opacity-50")}
      />
      <div className="flex justify-between text-xs text-muted-foreground" aria-hidden>
        <span>not at all</span>
        <span>completely</span>
      </div>
    </div>
  )
}

function Optional({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint: string }) {
  const [open, setOpen] = useState(value.length > 0)
  return (
    <div className="rounded-xl border border-border">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left text-sm"
      >
        <span>
          {label} <span className="text-muted-foreground">(optional)</span>
        </span>
        <span aria-hidden className="text-lg text-muted-foreground">
          {open ? "–" : "+"}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            maxLength={2000}
            aria-label={label}
            placeholder={hint}
            className="w-full rounded-lg border border-border bg-input p-3 text-base placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none"
          />
        </div>
      )}
    </div>
  )
}

export function ReframeFlow({
  thought,
  editing,
  onClose,
  onSave,
}: {
  thought: Thought
  /** An existing reframe to edit; otherwise a new one is written. */
  editing?: Reframe | null
  onClose: () => void
  onSave: (input: {
    id?: string
    thoughtId: string
    text: string
    beliefBefore: number | null
    beliefAfter: number | null
    evidence: string
    friend: string
  }) => Promise<unknown>
}) {
  const [before, setBefore] = useState<number | null>(editing?.beliefBefore ?? null)
  const [after, setAfter] = useState<number | null>(editing?.beliefAfter ?? null)
  const [evidence, setEvidence] = useState(editing?.evidence ?? "")
  const [friend, setFriend] = useState(editing?.friend ?? "")
  const [text, setText] = useState(editing?.text ?? "")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  const canSave = text.trim().length > 0 && !busy

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="reframe-title" className="fixed inset-0 z-50 overflow-y-auto bg-background" data-testid="reframe-flow">
      <div className="mx-auto w-full max-w-xl px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close without saving">
            <ChevronLeft className="size-5" />
          </Button>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Reframing</span>
          <span className="size-11" aria-hidden />
        </div>

        <div className="mt-4 space-y-6">
          <div>
            <h2 id="reframe-title" className="text-xl font-semibold leading-snug">
              “{thought.text}”
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{frequencyLine(thought.counts.total, thought.counts.firstAt, new Date())}</p>
          </div>

          <Belief id="belief-before" label="How true does it feel right now?" value={before} onChange={setBefore} />

          <div className="space-y-2">
            <Optional
              label="What speaks against it?"
              value={evidence}
              onChange={setEvidence}
              hint="Times it was not true. Things you are leaving out."
            />
            <Optional
              label="What would you tell a friend who thought it?"
              value={friend}
              onChange={setFriend}
              hint="Say it the way you would to someone you like."
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="reframe-text" className="text-sm font-medium">
              Your reframe
            </label>
            <textarea
              id="reframe-text"
              data-testid="reframe-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              maxLength={MAX_REFRAME_LENGTH}
              placeholder="A more accurate, more useful way to say it."
              className="w-full rounded-xl border border-border bg-input p-3.5 text-base leading-relaxed placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Make it believable, specific and fair. A slogan like “I’m great” rarely sticks; “I made mistakes today,
              and I am learning” can.
            </p>
          </div>

          {text.trim().length > 0 && (
            <Belief id="belief-after" label="And the old thought, how true does it feel now?" value={after} onChange={setAfter} />
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <Button
            className="h-12 w-full text-base"
            disabled={!canSave}
            data-testid="reframe-save"
            onClick={async () => {
              setBusy(true)
              setError(null)
              try {
                await onSave({ id: editing?.id, thoughtId: thought.id, text, beliefBefore: before, beliefAfter: after, evidence, friend })
                onClose()
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not save the reframe")
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? "Saving…" : "Save reframe"}
          </Button>
        </div>
      </div>
    </div>
  )
}
