"use client"

import { useState } from "react"
import { Head, InferredTag, NotSourced, Placeholder } from "../../progress/shared/Bits"
import { Bar, ColorRing, ExampleDurationLine, TimelineGate } from "../shared/Bits"
import { doneCount, fill, stateOf, type TimelineSetup } from "../shared/logic"
import { tlText } from "../shared/text"
import { B_ITEMS } from "./logic"
import { bText } from "./text"

type Key = keyof typeof bText.rows
type Screen = "home" | "health"

const stateLabel = { done: tlText.stateDone, progress: tlText.stateProgress, locked: tlText.stateLocked } as const

/** Copy B: a list of rows (now number, bar, target number, sentence) and a detail card with a big ring. */
export function TimelineB() {
  return (
    <div data-testid="timeline-b">
      <TimelineGate letter="b">{(setup, now) => <Main setup={setup} now={now} />}</TimelineGate>
    </div>
  )
}

function Main({ setup, now }: { setup: TimelineSetup; now: number }) {
  const [screen, setScreen] = useState<Screen>("health")
  const [open, setOpen] = useState<Key | null>(null)
  if (screen === "home") {
    return (
      <section data-testid="screen-home" className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <h2 className="flex-1 text-lg font-semibold">{bText.homeTitle}</h2>
          <InferredTag />
        </div>
        <button type="button" data-testid="b-health-tile" onClick={() => setScreen("health")} className="flex min-h-11 items-center rounded-lg border border-border bg-card p-3 text-left font-semibold">
          {bText.healthTile}
        </button>
        <Placeholder />
      </section>
    )
  }
  const done = doneCount(setup, B_ITEMS, now)
  return (
    <section data-testid="screen-health" className="flex flex-col gap-3">
      <Head
        title={bText.healthTitle}
        onBack={() => setScreen("home")}
        right={
          <span data-testid="b-count" className="inline-flex min-h-11 items-center gap-1 text-sm">
            <span aria-hidden="true" className="text-pink-500">
              {"♥"}
            </span>
            {tlText.doneCount(done, B_ITEMS.length)}
          </span>
        }
      />
      <ExampleDurationLine setup={setup} />
      <ul className="flex flex-col gap-3">
        {B_ITEMS.map((m) => {
          const key = m.key as Key
          const f = fill(setup, m, now)
          const st = stateOf(f)
          return (
            <li key={m.key}>
              <button type="button" data-testid={`b-row-${m.key}`} data-state={st} onClick={() => setOpen(key)} className="flex min-h-11 w-full flex-col gap-1.5 rounded-lg border border-border bg-card p-3 text-left">
                <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {bText.now} <NotSourced />
                  </span>
                  <span className="flex items-center gap-1">
                    {bText.target} <NotSourced />
                  </span>
                </span>
                <Bar value={f} fillClass={st === "done" ? "bg-sky-500" : "bg-orange-400"} testId={`b-bar-${m.key}`} />
                <span className="flex items-start gap-2 text-sm">
                  <span className="flex-1">{bText.rows[key]}</span>
                  <span aria-hidden="true" className="text-green-500">
                    {"›"}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">{stateLabel[st]}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <Placeholder />
      {open && (
        <div data-testid="b-detail" className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(null)}>
          <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border border-border bg-card p-5 text-center" onClick={(e) => e.stopPropagation()}>
            <ColorRing value={fill(setup, B_ITEMS.find((m) => m.key === open)!, now)} size={150} strokeW={12} stroke="stroke-sky-500" testId="b-detail-ring">
              <NotSourced />
            </ColorRing>
            <p className="text-sm">{bText.details[open]}</p>
            <button type="button" data-testid="b-detail-close" onClick={() => setOpen(null)} className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm">
              {bText.close}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
