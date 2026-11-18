"use client"

import { useState } from "react"
import { BottomNav, NotSourced, Placeholder, PlaceholderScreen } from "../../progress/shared/Bits"
import { Bar, ExampleDurationLine, OtherToolScreen, TimelineGate } from "../shared/Bits"
import { fill, type TimelineSetup } from "../shared/logic"
import { D_ITEMS } from "./logic"
import { dText } from "./text"

type Key = keyof typeof dText.titles

/** Copy D: an Information tab with a heart/book/calendar button row and a stack of cards with an orange bar. */
export function TimelineD() {
  return (
    <div data-testid="timeline-d">
      <TimelineGate letter="d">{(setup, now) => <Main setup={setup} now={now} />}</TimelineGate>
    </div>
  )
}

function Main({ setup, now }: { setup: TimelineSetup; now: number }) {
  const [tab, setTab] = useState(1)
  const [sub, setSub] = useState(0)
  const nav = <BottomNav id="d-nav" items={dText.tabs} value={tab} onChange={(i) => setTab(i)} />
  if (tab !== 1) {
    return (
      <div className="flex flex-col">
        {tab === 0 ? <OtherToolScreen title={dText.tabs[0]} onBack={() => setTab(1)} /> : <PlaceholderScreen title={dText.tabs[tab]} onBack={() => setTab(1)} />}
        {nav}
      </div>
    )
  }
  return (
    <div className="flex flex-col">
      <section data-testid="screen-health" className="flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-2">
          {dText.topButtons.map((label, i) => (
            <button
              key={label}
              type="button"
              data-testid={`d-top-${i}`}
              aria-label={label}
              aria-pressed={sub === i}
              onClick={() => setSub(i)}
              className={`inline-flex min-h-12 items-center justify-center rounded-xl border-2 bg-card text-lg ${sub === i ? "border-orange-400 text-orange-400" : "border-border"}`}
            >
              {dText.glyphs[i]}
            </button>
          ))}
        </div>
        {sub === 0 ? (
          <>
            <ExampleDurationLine setup={setup} />
            {D_ITEMS.map((m) => {
              const key = m.key as Key
              const f = fill(setup, m, now)
              return (
                <div key={m.key} data-testid={`d-card-${m.key}`} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
                  <h3 className="text-right font-semibold">{dText.titles[key]}</h3>
                  <div className="flex items-center gap-2">
                    <Bar value={f} fillClass="bg-orange-400" testId={`d-bar-${m.key}`} />
                    <NotSourced />
                  </div>
                  <p className="text-sm text-muted-foreground">{dText.sentences[key]}</p>
                </div>
              )
            })}
            <Placeholder />
          </>
        ) : (
          <OtherToolScreen title={sub === 1 ? dText.knowledgeTitle : dText.tipsTitle} onBack={() => setSub(0)} />
        )}
      </section>
      {nav}
    </div>
  )
}
