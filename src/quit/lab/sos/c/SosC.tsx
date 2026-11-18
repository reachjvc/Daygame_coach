"use client"

import { useEffect, useRef, useState } from "react"
import { InferredTag, Placeholder, PlaceholderScreen } from "../shared/Bits"
import { holdProgress } from "../shared/clock"
import { useInterval } from "../shared/hooks"
import { useLabState } from "../../store"
import { SnakeGame } from "./SnakeGame"
import { cText } from "./text"

type Screen = "tabs" | "snake" | "breathe"

const HOLD_TARGET_MS = 6000
const DAY_MS = 86_400_000

/** Copy C: home with a game button, a timed snake game, a hold-to-breathe scene, a discover tab strip. */
export function SosC() {
  const [screen, setScreen] = useState<Screen>("tabs")
  const [tab, setTab] = useState(0)
  if (screen === "snake") return <SnakeGame onBack={() => setScreen("tabs")} />
  if (screen === "breathe") return <Breathe onBack={() => setScreen("tabs")} />
  return (
    <div data-testid="sos-c" className="flex flex-col gap-4">
      {tab === 0 ? (
        <Home onSnake={() => setScreen("snake")} />
      ) : tab === 3 ? (
        <Discover onSnake={() => setScreen("snake")} onBreathe={() => setScreen("breathe")} />
      ) : (
        <PlaceholderScreen title={cText.tabPlaceholderTitle} onBack={() => setTab(0)} />
      )}
      <nav className="sticky bottom-0 z-10 grid grid-cols-4 border-t border-border bg-background">
        {cText.tabs.map((label, i) => (
          <button
            key={label}
            type="button"
            data-testid={`tab-${i}`}
            onClick={() => setTab(i)}
            className={`min-h-11 py-2 text-xs ${i === tab ? "font-semibold text-primary" : "text-muted-foreground"}`}
          >
            {label}
          </button>
        ))}
      </nav>
    </div>
  )
}

function Home({ onSnake }: { onSnake: () => void }) {
  const [startedAt, setStartedAt] = useLabState<number | null>("sos", "c", "startedAt", null)
  const [bannerGone, setBannerGone] = useLabState<boolean>("sos", "c", "bannerGone", false)
  useEffect(() => {
    if (startedAt === null) setStartedAt(Date.now())
  }, [startedAt, setStartedAt])
  const day = Math.min(28, startedAt === null ? 1 : Math.floor((Date.now() - startedAt) / DAY_MS) + 1)
  // Semi-circle dial: arc length proportional to the day.
  const frac = day / 28
  const a = Math.PI * (1 - frac)
  const ex = 50 + 40 * Math.cos(a)
  const ey = 50 - 40 * Math.sin(a)
  return (
    <div data-testid="home" className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-lg bg-primary px-4 py-3 text-primary-foreground">
        <h2 className="text-xl font-bold">{cText.homeTitle}</h2>
        <span className="inline-flex min-h-11 items-center text-sm">{cText.settings}</span>
      </div>
      {!bannerGone && (
        <div data-testid="banner" className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/20 text-lg" aria-hidden="true">
            {"★"}
          </span>
          <p className="flex-1 text-sm font-medium">{cText.bannerLine}</p>
          <button type="button" data-testid="banner-dismiss" aria-label={cText.bannerDismiss} onClick={() => setBannerGone(true)} className="inline-flex size-11 items-center justify-center text-lg">
            {"✕"}
          </button>
        </div>
      )}
      <div className="rounded-lg border border-border bg-card p-3">
        <h3 className="text-base font-semibold">{cText.progressHeading}</h3>
        <svg viewBox="0 0 100 58" className="mx-auto mt-2 w-full max-w-72" role="img" aria-label={cText.progressHeading}>
          <path d="M10 50 A40 40 0 0 1 90 50" fill="none" strokeWidth="6" strokeLinecap="round" className="stroke-muted" />
          <path d={`M10 50 A40 40 0 0 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`} fill="none" strokeWidth="6" strokeLinecap="round" className="stroke-primary" />
          <text x="50" y="42" textAnchor="middle" fontSize="11" fontWeight="700" className="fill-foreground" data-testid="day">
            {cText.dayLabel} {day}
          </text>
          <text x="50" y="52" textAnchor="middle" fontSize="5" className="fill-muted-foreground">
            {cText.ofLabel}
          </text>
        </svg>
        <div className="mt-2 grid grid-cols-2 gap-3 text-center">
          <div className="rounded-md bg-muted/40 p-2">
            <div className="text-lg font-semibold tabular-nums">{"$0"}</div>
            <div className="text-xs text-muted-foreground">{cText.saved}</div>
          </div>
          <div className="rounded-md bg-muted/40 p-2">
            <div className="text-lg font-semibold tabular-nums">
              {day} {cText.streakUnit}
            </div>
            <div className="text-xs text-muted-foreground">{cText.streak}</div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3 rounded-md border border-border p-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground" aria-hidden="true">
            {"▦"}
          </span>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">{cText.weekGuide}</p>
            <p className="text-sm font-medium">{cText.weekGuideTitle}</p>
          </div>
        </div>
        <button type="button" data-testid="play-snake" onClick={onSnake} className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-full border-2 border-primary text-base font-semibold text-primary">
          {cText.playSnake}
        </button>
      </div>
    </div>
  )
}

function Discover({ onSnake, onBreathe }: { onSnake: () => void; onBreathe: () => void }) {
  const [sub, setSub] = useState(0)
  return (
    <div data-testid="discover" className="flex flex-col gap-4">
      <div className="rounded-lg bg-primary px-4 py-3 text-primary-foreground">
        <h2 className="text-xl font-bold">{cText.discoverTitle}</h2>
      </div>
      <div className="flex gap-2">
        <input type="search" placeholder={cText.searchPlaceholder} aria-label={cText.searchPlaceholder} className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-card px-3 text-base" />
        <button type="button" className="min-h-11 rounded-md bg-primary px-4 text-primary-foreground">
          {cText.searchButton}
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto" role="tablist">
        {cText.discoverTabs.map((label, i) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={i === sub}
            data-testid={`discover-tab-${i}`}
            onClick={() => setSub(i)}
            className={`min-h-11 shrink-0 rounded-full border px-4 text-sm ${i === sub ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {sub === 0 && (
        <article data-testid="discover-card" className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex h-32 items-center justify-center border-b border-dashed border-border text-xs text-muted-foreground" aria-hidden="true">
            {"▦"}
          </div>
          <div className="p-3">
            <p className="text-xs text-primary">{cText.cardLabel}</p>
            <h3 className="text-base font-semibold">{cText.cardTitle}</h3>
            <p className="text-sm text-muted-foreground">{cText.cardLine}</p>
          </div>
        </article>
      )}
      {sub === 1 && (
        <>
          <Placeholder />
          <Placeholder />
        </>
      )}
      {sub === 2 && <Placeholder />}
      {sub === 3 && (
        <div data-testid="cravings-tab" className="flex flex-col gap-3">
          <InferredTag />
          <button type="button" data-testid="cravings-game" onClick={onSnake} className="min-h-12 rounded-md border border-border bg-card px-4 text-left">
            {cText.cravingsGame}
          </button>
          <button type="button" data-testid="cravings-breathe" onClick={onBreathe} className="min-h-12 rounded-md border border-border bg-card px-4 text-left">
            {cText.cravingsBreathe}
          </button>
          <Placeholder />
        </div>
      )}
    </div>
  )
}

/** Press and hold the knob: the face opens into an "o", the knob slides along the track while you breathe out. */
function Breathe({ onBack }: { onBack: () => void }) {
  const [held, setHeld] = useState(false)
  const [progress, setProgress] = useState(0)
  const since = useRef(0)
  useInterval(() => setProgress(holdProgress(Date.now() - since.current, HOLD_TARGET_MS)), held ? 50 : null)
  const down = () => {
    since.current = Date.now()
    setProgress(0)
    setHeld(true)
  }
  const up = () => {
    setHeld(false)
    setProgress(0)
  }
  return (
    <section data-testid="breathe" className="relative flex min-h-[calc(100dvh-7rem)] flex-col gap-6 overflow-hidden rounded-lg bg-[#1f3a7a] p-4 text-white">
      <div className="flex items-center gap-2">
        <button type="button" data-testid="breathe-back" onClick={onBack} className="inline-flex min-h-11 items-center text-sm">
          {"‹ "}
          {cText.breatheBack}
        </button>
        <InferredTag />
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div
          data-testid="face"
          data-held={held}
          className="flex size-44 flex-col items-center justify-center gap-3 rounded-full bg-sky-100"
          style={{ transform: `scale(${held ? 1 - progress * 0.35 : 1})`, transition: "transform 100ms linear" }}
        >
          <div className="flex gap-6">
            <span className="size-3 rounded-full bg-[#1f3a7a]" />
            <span className="size-3 rounded-full bg-[#1f3a7a]" />
          </div>
          {held ? <span className="size-7 rounded-full border-[6px] border-[#1f3a7a]" /> : <span className="h-4 w-16 rounded-b-full border-b-[5px] border-[#1f3a7a]" />}
        </div>
      </div>
      <p data-testid="breathe-text" className="text-center text-2xl font-bold">
        {held ? cText.holdBreathe : cText.holdTitle}
      </p>
      <div className="relative h-16">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 bg-white" />
        <button
          type="button"
          data-testid="knob"
          aria-label={cText.holdTitle}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            down()
          }}
          onPointerUp={up}
          onPointerCancel={up}
          onKeyDown={(e) => {
            if ((e.key === " " || e.key === "Enter") && !e.repeat) down()
          }}
          onKeyUp={up}
          className="absolute top-1/2 size-14 touch-none rounded-full border-4 border-white bg-blue-600"
          style={{ left: `calc(50% - 1.75rem + ${(progress * 40).toFixed(1)}%)`, transform: "translateY(-50%)" }}
        />
      </div>
      <p className="text-center text-xs text-white/70">{cText.holdMotion}</p>
    </section>
  )
}
