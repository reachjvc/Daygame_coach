"use client"

import { useEffect, useState } from "react"
import { PrimaryButton } from "../../../components/kit"
import { useLabState } from "../../store"
import { DAY, dayKey, keyToMs } from "./calc"
import { InferredTag, NumField } from "./Bits"
import { sharedText } from "./text"

export type SetupValues = Record<string, number>

export interface SetupField {
  key: string
  label: string
  /** "date" holds a start time in ms; "number" a plain amount. */
  kind: "date" | "number"
  step?: number
}

interface GateProps<T extends SetupValues> {
  letter: string
  fields: SetupField[]
  /** Values for "Start with example data" (start date 23 days ago and so on). */
  seed: (now: number) => T
  /** Defaults shown in the "my own" form. */
  own: (now: number) => T
  children: (setup: T, startOver: () => void) => React.ReactNode
}

/**
 * First open of a copy: "Start with example data" or "Set up my own". The setup is stored in
 * the lab store under `setup`. Setup screens were never seen in public material, so the
 * screen carries the inferred tag and asks only what the spec says the app stores.
 */
export function SetupGate<T extends SetupValues>({ letter, fields, seed, own, children }: GateProps<T>) {
  const [setup, setSetup] = useLabState<T | null>("progress", letter, "setup", null)
  const [mounted, setMounted] = useState(false)
  const [form, setForm] = useState<T | null>(null)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  if (setup) return <>{children(setup, () => setSetup(null))}</>

  if (form) {
    const ok = fields.every((f) => Number.isFinite(form[f.key]))
    return (
      <section data-testid="setup-own" className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h2 className="flex-1 text-lg font-semibold">{sharedText.ownTitle}</h2>
          <InferredTag />
        </div>
        {fields.map((f) =>
          f.kind === "date" ? (
            <label key={f.key} className="flex min-h-11 items-center justify-between gap-3 text-sm">
              <span>{f.label}</span>
              <input
                type="date"
                data-testid={`setup-${f.key}`}
                value={dayKey(form[f.key])}
                max={dayKey(Date.now())}
                onChange={(e) => e.target.value && setForm({ ...form, [f.key]: keyToMs(e.target.value) })}
                className="min-h-11 rounded-md border border-border bg-background px-2"
              />
            </label>
          ) : (
            <NumField key={f.key} label={f.label} value={form[f.key]} step={f.step} testId={`setup-${f.key}`} onChange={(n) => setForm({ ...form, [f.key]: n })} />
          ),
        )}
        <PrimaryButton testId="setup-save" disabled={!ok} onClick={() => setSetup(form)}>
          {sharedText.save}
        </PrimaryButton>
      </section>
    )
  }

  return (
    <section data-testid="setup-choice" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-lg font-semibold">{sharedText.setupTitle}</h2>
        <InferredTag />
      </div>
      <p className="text-sm text-muted-foreground">{sharedText.setupLine}</p>
      <PrimaryButton testId="setup-seed" onClick={() => setSetup(seed(Date.now()))}>
        {sharedText.seedBtn}
      </PrimaryButton>
      <button
        type="button"
        data-testid="setup-own-btn"
        onClick={() => setForm(own(Date.now()))}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-md border border-border bg-card px-4 text-base"
      >
        {sharedText.ownBtn}
      </button>
    </section>
  )
}

/** Start time 23 days (and part of a day) ago, as the example data uses. */
export const seedStart = (now: number, extraMs = 0) => now - 23 * DAY - extraMs

/** "Start over" link at the foot of a copy. */
export function StartOver({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" data-testid="start-over" onClick={onClick} className="mt-6 inline-flex min-h-11 items-center text-sm text-muted-foreground underline">
      {sharedText.startOver}
    </button>
  )
}
