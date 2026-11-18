"use client"

import { useState } from "react"
import { IconBtn, NotSourced, Placeholder, PlaceholderScreen, ShareBtn } from "../../progress/shared/Bits"
import { Bar, ExampleDurationLine, TimelineGate } from "../shared/Bits"
import { countdown, fill, remainingMs, type TimelineSetup } from "../shared/logic"
import { tlText } from "../shared/text"
import { E_ITEMS } from "./logic"
import { eText } from "./text"

type Key = keyof typeof eText.names
type Screen = "list" | "menu" | "settings" | "info"

/** Copy E: symptom cards with a bar and a live countdown that ticks every second. */
export function TimelineE() {
  return (
    <div data-testid="timeline-e">
      <TimelineGate letter="e">{(setup, now) => <Main setup={setup} now={now} />}</TimelineGate>
    </div>
  )
}

function Main({ setup, now }: { setup: TimelineSetup; now: number }) {
  const [screen, setScreen] = useState<Screen>("list")
  const back = () => setScreen("list")
  if (screen === "menu") return <PlaceholderScreen title={eText.menuTitle} onBack={back} />
  if (screen === "settings") return <PlaceholderScreen title={eText.settingsTitle} onBack={back} />
  if (screen === "info") return <PlaceholderScreen title={eText.infoTitle} onBack={back} />
  return (
    <section data-testid="screen-list" className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5 rounded-lg bg-green-700 px-2 py-1 text-white">
        <IconBtn label={eText.menu} onClick={() => setScreen("menu")} testId="e-menu">
          {"≡"}
        </IconBtn>
        <IconBtn label={eText.settings} onClick={() => setScreen("settings")} testId="e-settings">
          {"⚙"}
        </IconBtn>
        <h2 className="min-w-0 flex-1 truncate text-center text-base font-semibold">{eText.title}</h2>
        <IconBtn label={eText.info} onClick={() => setScreen("info")} testId="e-info">
          {"i"}
        </IconBtn>
        <ShareBtn text={eText.shareMsg} testId="e-share" />
      </div>
      <ExampleDurationLine setup={setup} />
      {E_ITEMS.map((m) => {
        const key = m.key as Key
        const f = fill(setup, m, now)
        const left = remainingMs(setup, m, now)
        return (
          <div key={m.key} data-testid={`e-card-${m.key}`} data-state={f >= 1 ? "done" : "progress"} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
            <div className="flex items-start gap-3">
              <span aria-hidden="true" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-xl">
                {eText.glyphs[key]}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-semibold">{eText.names[key]}</span>
                <span className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                  {eText.usual} <NotSourced />
                </span>
                <span className="flex flex-wrap items-center gap-1 text-xs text-green-500">
                  {eText.yours} <NotSourced />
                </span>
              </div>
              <NotSourced />
            </div>
            <Bar value={f} fillClass="bg-green-500" testId={`e-bar-${m.key}`} height="h-3" />
            <div className="flex items-center justify-between gap-2 text-sm">
              <span data-testid={`e-countdown-${m.key}`} className="tabular-nums">
                {!setup.seeded ? tlText.noCountdown : f >= 1 ? eText.done : countdown(left)}
              </span>
              <span aria-hidden="true" className="text-muted-foreground">
                {"▣"}
              </span>
            </div>
          </div>
        )
      })}
      <Placeholder />
      <Placeholder />
    </section>
  )
}
