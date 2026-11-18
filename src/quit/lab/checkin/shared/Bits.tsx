"use client"

import { useEffect, useState } from "react"
import { Card, Head } from "../../progress/shared/Bits"
import { sharedText } from "../../progress/shared/text"
import { labStore } from "../../store"
import { dayKey } from "./logic"
import { ckText } from "./text"

/** A whole screen that belongs to another tool: header and the one-line note. */
export function OtherScreen({ title, onBack }: { title: string; onBack: (() => void) | null }) {
  return (
    <section data-testid="other-screen" className="flex flex-col gap-3">
      <Head title={title} onBack={onBack} />
      <Card>
        <p className="text-sm text-muted-foreground">{ckText.partOther}</p>
      </Card>
    </section>
  )
}

interface GateProps {
  letter: string
  /** Store keys of the copy, wiped when the example is cleared or loaded again. */
  keys: string[]
  children: (seeded: boolean, today: string) => React.ReactNode
}

/**
 * Every copy opens with example data (14 days) so history and insight screens are filled.
 * "Clear example" empties the copy; "Load example data" brings the example back.
 */
export function ExampleGate({ letter, keys, children }: GateProps) {
  const [mode, setMode] = useState<"example" | "own" | null>(null)
  useEffect(() => {
    setMode(labStore().get("checkin", letter, "mode") === "own" ? "own" : "example")
  }, [letter])
  if (!mode) return null
  const switchTo = (next: "example" | "own") => {
    for (const k of keys) labStore().set("checkin", letter, k, undefined)
    labStore().set("checkin", letter, "mode", next)
    setMode(next)
  }
  return (
    <>
      {mode === "example" ? (
        <div data-testid="example-bar" className="mb-3 flex items-center justify-between gap-2 rounded-md border border-dashed border-border px-3 py-1 text-xs text-muted-foreground">
          <span>{sharedText.exampleLabel}</span>
          <button type="button" data-testid="example-clear" onClick={() => switchTo("own")} className="inline-flex min-h-11 items-center underline">
            {sharedText.clearExample}
          </button>
        </div>
      ) : null}
      <div key={mode}>{children(mode === "example", dayKey(Date.now()))}</div>
      {mode === "own" ? (
        <button type="button" data-testid="example-load" onClick={() => switchTo("example")} className="mt-6 inline-flex min-h-11 items-center text-sm text-muted-foreground underline">
          {ckText.loadExample}
        </button>
      ) : null}
    </>
  )
}

/** Round close or back control, 44px. */
export function RoundBtn({ label, onClick, children, testId }: { label: string; onClick: () => void; children: React.ReactNode; testId?: string }) {
  return (
    <button type="button" data-testid={testId} aria-label={label} onClick={onClick} className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-lg">
      {children}
    </button>
  )
}
