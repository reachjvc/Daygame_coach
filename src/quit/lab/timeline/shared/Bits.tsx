"use client"

import { useEffect, useState } from "react"
import { PrimaryButton } from "../../../components/kit"
import { ExampleBar, InferredTag } from "../../progress/shared/Bits"
import { dayKey, keyToMs } from "../../progress/shared/calc"
import { sharedText } from "../../progress/shared/text"
import { labStore, useLabState } from "../../store"
import { beforeStart, seedStart, type TimelineSetup } from "./logic"
import { tlText } from "./text"

/** A ring in a colour of the copy's choosing; `stroke` is a full Tailwind stroke class. */
export function ColorRing({ value, size, strokeW, stroke, children, testId }: { value: number; size: number; strokeW: number; stroke: string; children?: React.ReactNode; testId?: string }) {
  const r = (size - strokeW) / 2
  const c = 2 * Math.PI * r
  const v = Math.min(1, Math.max(0, value))
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} data-testid={testId} data-value={v.toFixed(3)}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={strokeW} className="stroke-border" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={strokeW}
          strokeLinecap="round"
          className={stroke}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  )
}

/** A bar; `fillClass` is a full Tailwind background class. */
export function Bar({ value, fillClass, testId, height = "h-2.5" }: { value: number; fillClass: string; testId?: string; height?: string }) {
  const v = Math.min(1, Math.max(0, value))
  return (
    <div data-testid={testId} data-value={v.toFixed(3)} className={`w-full overflow-hidden rounded-full bg-border ${height}`}>
      <div className={`h-full rounded-full ${fillClass}`} style={{ width: `${v * 100}%`, transition: "width 0.8s ease" }} />
    </div>
  )
}

/** Label under a screen whose fills run on made-up durations (only in example mode). */
export function ExampleDurationLine({ setup }: { setup: TimelineSetup }) {
  if (!setup.seeded) return null
  return (
    <p data-testid="example-duration-line" className="text-xs text-muted-foreground">
      {tlText.exampleDuration}
    </p>
  )
}

/**
 * First open of a copy: example data (quit 23 days ago) or your own quit date. Setup screens
 * were never seen in public material, so they carry the inferred tag. A start date in the
 * future shows the "before the quit date" state (inferred).
 */
export function TimelineGate({ letter, children }: { letter: string; children: (setup: TimelineSetup, now: number) => React.ReactNode }) {
  const [setup, setSetup] = useLabState<TimelineSetup | null>("timeline", letter, "setup", null)
  const [mounted, setMounted] = useState(false)
  const [own, setOwn] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => setMounted(true), [])
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  if (!mounted) return null
  const clear = () => {
    labStore().set("timeline", letter, "setup", undefined)
    setSetup(null)
    setOwn(null)
  }
  if (setup) {
    return (
      <>
        {setup.seeded === 1 && <ExampleBar onClear={clear} />}
        {beforeStart(setup, now) && (
          <p data-testid="before-start" className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex-1">{tlText.beforeStart}</span>
            <InferredTag />
          </p>
        )}
        {children(setup, now)}
        <button type="button" data-testid="start-over" onClick={clear} className="mt-6 inline-flex min-h-11 items-center text-sm text-muted-foreground underline">
          {sharedText.startOver}
        </button>
      </>
    )
  }
  if (own !== null) {
    return (
      <section data-testid="setup-own" className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h2 className="flex-1 text-lg font-semibold">{tlText.startTitle}</h2>
          <InferredTag />
        </div>
        <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
          <span>{tlText.startLabel}</span>
          <input type="date" data-testid="setup-startMs" value={dayKey(own)} onChange={(e) => e.target.value && setOwn(keyToMs(e.target.value))} className="min-h-11 rounded-md border border-border bg-background px-2" />
        </label>
        <PrimaryButton testId="setup-save" onClick={() => setSetup({ startMs: own, seeded: 0 })}>
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
      <PrimaryButton testId="setup-seed" onClick={() => setSetup({ startMs: seedStart(Date.now()), seeded: 1 })}>
        {sharedText.seedBtn}
      </PrimaryButton>
      <button type="button" data-testid="setup-own-btn" onClick={() => setOwn(Date.now())} className="inline-flex min-h-12 w-full items-center justify-center rounded-md border border-border bg-card px-4 text-base">
        {sharedText.ownBtn}
      </button>
    </section>
  )
}
