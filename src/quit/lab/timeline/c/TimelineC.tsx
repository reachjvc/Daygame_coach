"use client"

import { useState } from "react"
import { Head, NotSourced, PlaceholderScreen } from "../../progress/shared/Bits"
import { ColorRing, ExampleDurationLine, TimelineGate } from "../shared/Bits"
import { fill, stateOf, type TimelineSetup } from "../shared/logic"
import { C_CARDS, C_ORGANS, C_RING_CLASS } from "./logic"
import { cText } from "./text"

type Organ = keyof typeof cText.organs

/** Copy C: a Stats screen with three organ rings, a heart achievement card and a medal card. */
export function TimelineC() {
  return (
    <div data-testid="timeline-c">
      <TimelineGate letter="c">{(setup, now) => <Main setup={setup} now={now} />}</TimelineGate>
    </div>
  )
}

function Main({ setup, now }: { setup: TimelineSetup; now: number }) {
  const [more, setMore] = useState(false)
  if (more) return <PlaceholderScreen title={cText.moreTitle} onBack={() => setMore(false)} />
  const card = (key: "heartCard" | "medal", title: string, line: string, glyph: string) => {
    const m = C_CARDS.find((c) => c.key === key)!
    const st = stateOf(fill(setup, m, now))
    const earned = st === "done"
    return (
      <div data-testid={`c-card-${key}`} data-state={st} className={`flex flex-col gap-2 rounded-xl p-3 ${earned ? "bg-green-700 text-white" : "border border-border bg-card opacity-70"}`}>
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="text-3xl">
            {glyph}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="font-semibold">{title}</span>
            <span className="text-sm">{line}</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="flex items-center gap-1">
            {cText.timePoint} <NotSourced />
          </span>
          {!earned && <span>{cText.notReached}</span>}
          <button type="button" data-testid={`c-more-${key}`} onClick={() => setMore(true)} className="inline-flex min-h-11 items-center px-1 underline">
            {cText.viewMore}
          </button>
        </div>
      </div>
    )
  }
  return (
    <section data-testid="screen-stats" className="flex flex-col gap-4">
      <Head title={cText.statsTitle} onBack={() => setMore(false)} />
      <div className="flex flex-col gap-3">
        <h3 className="border-b-2 border-green-500 pb-1 text-base font-semibold">{cText.improvements}</h3>
        <div className="grid grid-cols-3 gap-2">
          {C_ORGANS.map((m) => {
            const key = m.key as Organ
            return (
              <div key={m.key} data-testid={`c-organ-${m.key}`} className="flex flex-col items-center gap-1.5 text-center">
                <ColorRing value={fill(setup, m, now)} size={84} strokeW={8} stroke={C_RING_CLASS[key]} testId={`c-ring-${m.key}`} />
                <NotSourced />
                <span className="text-sm font-semibold">{cText.organs[key]}</span>
              </div>
            )
          })}
        </div>
        <ExampleDurationLine setup={setup} />
      </div>
      <div className="flex flex-col gap-3">
        <h3 className="border-b-2 border-green-500 pb-1 text-base font-semibold">{cText.achievements}</h3>
        {card("heartCard", cText.heartCardTitle, cText.heartCardLine, "♥")}
        {card("medal", cText.medalTitle, cText.medalLine, "★")}
      </div>
    </section>
  )
}
