"use client"

import { useState } from "react"
import { Head, NotSourced, PlaceholderScreen, ShareBtn } from "../../progress/shared/Bits"
import { ColorRing, ExampleDurationLine } from "../shared/Bits"
import { TimelineGate } from "../shared/Bits"
import { fill, type TimelineSetup } from "../shared/logic"
import { A_CARD_KEYS, A_ITEMS } from "./logic"
import { aText } from "./text"

type Key = keyof typeof aText.names
type Screen = { name: "dash" } | { name: "health" } | { name: "detail"; key: Key }

const RING = "stroke-green-500"

/** Copy A: a dashboard card of three rings with an Explore button, and a Health page of big rings. */
export function TimelineA() {
  return (
    <div data-testid="timeline-a">
      <TimelineGate letter="a">{(setup, now) => <Main setup={setup} now={now} />}</TimelineGate>
    </div>
  )
}

function Main({ setup, now }: { setup: TimelineSetup; now: number }) {
  const [screen, setScreen] = useState<Screen>({ name: "dash" })
  const value = (key: Key) => fill(setup, A_ITEMS.find((m) => m.key === key)!, now)
  if (screen.name === "detail") return <PlaceholderScreen title={`${aText.names[screen.key]}: ${aText.detailSuffix}`} onBack={() => setScreen({ name: "health" })} />
  if (screen.name === "health") {
    return (
      <section data-testid="screen-health" className="flex flex-col gap-4">
        <Head title={aText.healthTitle} onBack={() => setScreen({ name: "dash" })} right={<ShareBtn text={aText.shareMsg} testId="a-share" />} />
        <p className="text-center text-sm text-muted-foreground">{aText.intro}</p>
        <ExampleDurationLine setup={setup} />
        {A_ITEMS.map((m) => {
          const key = m.key as Key
          return (
            <button key={m.key} type="button" data-testid={`a-block-${m.key}`} onClick={() => setScreen({ name: "detail", key })} className="flex min-h-11 flex-col items-center gap-2 text-center">
              <ColorRing value={value(key)} size={136} strokeW={10} stroke={RING} testId={`a-ring-${m.key}`}>
                <NotSourced />
              </ColorRing>
              <span className="font-semibold">{aText.names[key]}</span>
              <span className="text-sm text-muted-foreground">{aText.sentences[key]}</span>
              <span className="text-xs text-muted-foreground">
                {aText.timePoint}: <NotSourced />
              </span>
            </button>
          )
        })}
      </section>
    )
  }
  return (
    <section data-testid="screen-dash" className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
        <h2 className="text-base font-semibold">{aText.dashTitle}</h2>
        <div className="grid grid-cols-3 gap-2">
          {A_CARD_KEYS.map((k) => (
            <button key={k} type="button" data-testid={`a-tile-${k}`} onClick={() => setScreen({ name: "health" })} className="flex min-h-11 flex-col items-center gap-1.5 text-center">
              <ColorRing value={value(k)} size={72} strokeW={7} stroke={RING} testId={`a-card-ring-${k}`} />
              <NotSourced />
              <span className="text-xs">{aText.tileLabels[k]}</span>
            </button>
          ))}
        </div>
        <ExampleDurationLine setup={setup} />
        <button type="button" data-testid="a-explore" onClick={() => setScreen({ name: "health" })} className="inline-flex min-h-11 items-center justify-center self-center rounded-full bg-green-600 px-6 text-sm font-semibold uppercase text-white">
          {aText.explore}
        </button>
      </div>
    </section>
  )
}
