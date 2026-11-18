"use client"

import { useEffect, useRef, useState } from "react"
import { InferredTag, NotSourced, Orb, Placeholder, PlaceholderScreen } from "../shared/Bits"
import { formatClock } from "../shared/clock"
import { useInterval } from "../shared/hooks"
import { sharedText } from "../shared/text"
import { useLabState } from "../../store"
import { Game2048 } from "./Game2048"
import { aText } from "./text"

type Screen = "toolkit" | "craving" | "g2048" | "gfall" | "gmemory" | "breath" | "meditation" | "tapping" | "seeall"
type Overlay = null | "leave" | "drink" | "done"

const SESSION_SECONDS = 20 * 60
const BREATH_SECONDS = 5 * 60
const MEDITATION_SECONDS = 8 * 60
const BREATH_PHASE = 4

interface LogEntry {
  at: number
  drank: boolean
  seconds: number
}

/** Copy A: a timed craving mode with games, affirmations, a leave ritual and a celebration. */
export function SosA() {
  const [screen, setScreen] = useState<Screen>("toolkit")
  const [tab, setTab] = useState(1)
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [active, setActive] = useState(false)
  const [left, setLeft] = useState(SESSION_SECONDS)
  const [log, setLog] = useLabState<LogEntry[]>("sos", "a", "log", [])
  const [toast, setToast] = useState(false)

  useInterval(() => setLeft((l) => Math.max(0, l - 1)), active ? 1000 : null)

  const enter = () => {
    setLeft(SESSION_SECONDS)
    setActive(true)
    setScreen("craving")
  }
  const finish = (drank: boolean) => {
    setLog([...log, { at: Date.now(), drank, seconds: SESSION_SECONDS - left }])
    setActive(false)
    setScreen("toolkit")
    setOverlay(null)
  }

  useEffect(() => {
    if (overlay !== "done") return
    const id = setTimeout(() => {
      finish(false)
      setToast(true)
    }, 2000)
    return () => clearTimeout(id)
    // finish is rebuilt every render; only the overlay change should start the timer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(false), 3000)
    return () => clearTimeout(id)
  }, [toast])

  const inSession = screen === "craving"
  return (
    <div data-testid="sos-a" className="relative flex min-h-[calc(100dvh-8rem)] flex-col">
      <div className="flex-1 pb-4">
        {tab !== 1 ? (
          <PlaceholderScreen title={aText.tabPlaceholderTitle} onBack={() => setTab(1)} />
        ) : screen === "toolkit" ? (
          <Toolkit onCraving={enter} onOpen={setScreen} />
        ) : screen === "craving" ? (
          <Craving onBack={() => setOverlay("leave")} onGame={setScreen} />
        ) : screen === "g2048" ? (
          <Game2048 onBack={() => setScreen("craving")} />
        ) : screen === "gfall" || screen === "gmemory" ? (
          <GamePlaceholder title={screen === "gfall" ? aText.playPlaceholderFall : aText.playPlaceholderMemory} onBack={() => setScreen("craving")} />
        ) : screen === "breath" ? (
          <Breathing onDone={() => setScreen("toolkit")} onBack={() => setScreen("toolkit")} />
        ) : screen === "meditation" ? (
          <Meditation onBack={() => setScreen("toolkit")} />
        ) : screen === "tapping" ? (
          <Tapping onBack={() => setScreen("toolkit")} />
        ) : (
          <PlaceholderScreen title={aText.seeAllTitle} onBack={() => setScreen("toolkit")} />
        )}
      </div>

      {inSession && (
        <div className="sticky bottom-0 z-10 flex items-center justify-between rounded-lg bg-primary px-4 py-2 text-primary-foreground">
          <div>
            <div className="text-xs">{aText.barLabel}</div>
            <div data-testid="countdown" className="text-xl font-semibold tabular-nums">
              {formatClock(left)}
            </div>
          </div>
          <button type="button" data-testid="exit" onClick={() => setOverlay("leave")} className="inline-flex min-h-11 items-center px-3 text-base font-semibold">
            {aText.exit}
          </button>
        </div>
      )}

      {screen === "toolkit" && tab === 1 && (
        <nav className="sticky bottom-0 z-10 mt-2 grid grid-cols-5 border-t border-border bg-background">
          {aText.tabs.map((label, i) => (
            <button
              key={label}
              type="button"
              data-testid={`tab-${i}`}
              onClick={() => setTab(i)}
              className={`min-h-11 px-1 py-2 text-xs ${i === tab ? "font-semibold text-primary" : "text-muted-foreground"}`}
            >
              {label}
            </button>
          ))}
        </nav>
      )}

      {overlay === "leave" && (
        <Dialog testId="dialog-leave" question={aText.leaveQuestion}>
          <button type="button" data-testid="leave-cancel" onClick={() => setOverlay(null)} className="min-h-11 rounded-full bg-primary px-5 text-primary-foreground">
            {aText.cancel}
          </button>
          <button type="button" data-testid="leave-yes" onClick={() => setOverlay("drink")} className="min-h-11 rounded-full border border-border px-5">
            {sharedText.yes}
          </button>
        </Dialog>
      )}
      {overlay === "drink" && (
        <Dialog testId="dialog-drink" question={aText.drinkQuestion}>
          <button type="button" data-testid="drink-no" onClick={() => setOverlay("done")} className="min-h-11 rounded-full bg-primary px-5 text-primary-foreground">
            {sharedText.no}
          </button>
          <button type="button" data-testid="drink-yes" onClick={() => finish(true)} className="min-h-11 rounded-full border border-border px-5">
            {sharedText.yes}
          </button>
        </Dialog>
      )}
      {overlay === "done" && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60">
          <div data-testid="well-done" className="flex size-64 flex-col items-center justify-center gap-2 rounded-2xl bg-card p-4 text-center">
            <p className="text-2xl font-semibold">{aText.wellDone}</p>
            <Fireworks />
          </div>
        </div>
      )}
      {toast && (
        <div data-testid="toast" className="fixed inset-x-4 bottom-4 z-30 flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm">
          <span aria-hidden="true">{"✓"}</span>
          <span>{aText.proud}</span>
        </div>
      )}
    </div>
  )
}

function Dialog({ testId, question, children }: { testId: string; question: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-30 flex items-end bg-black/60 pb-24">
      <div role="dialog" data-testid={testId} aria-label={question} className="mx-4 w-full rounded-2xl bg-card p-5">
        <p className="text-base font-semibold">{question}</p>
        <div className="mt-4 flex justify-end gap-3">{children}</div>
      </div>
    </div>
  )
}

/** Thin multicolour burst that grows for about two seconds. */
function Fireworks() {
  const rays = Array.from({ length: 16 }, (_, i) => (i * Math.PI * 2) / 16)
  const colors = ["#f59e0b", "#14b8a6", "#a78bfa", "#fb7185"]
  return (
    <svg viewBox="-50 -50 100 100" className="size-32" aria-hidden="true" data-testid="fireworks">
      <g>
        <animateTransform attributeName="transform" type="scale" from="0.2" to="1" dur="1.4s" fill="freeze" />
        {rays.map((a, i) => (
          <line key={i} x1={Math.cos(a) * 14} y1={Math.sin(a) * 14} x2={Math.cos(a) * 44} y2={Math.sin(a) * 44} stroke={colors[i % colors.length]} strokeWidth="2" strokeLinecap="round" />
        ))}
        {rays.map((a, i) => (
          <circle key={`d${i}`} cx={Math.cos(a + 0.2) * 48} cy={Math.sin(a + 0.2) * 48} r="1.6" fill={colors[(i + 1) % colors.length]} />
        ))}
      </g>
    </svg>
  )
}

function Toolkit({ onCraving, onOpen }: { onCraving: () => void; onOpen: (s: Screen) => void }) {
  const tiles: { id: Screen; label: string }[] = [
    { id: "breath", label: aText.tileBreathing },
    { id: "meditation", label: aText.tileMeditation },
    { id: "tapping", label: aText.tileTapping },
  ]
  return (
    <div data-testid="toolkit" className="flex flex-col gap-5">
      <h2 className="mt-2 text-center text-lg font-semibold">{aText.toolkitTitle}</h2>
      <div>
        <h3 className="text-sm font-semibold">{aText.cravingsHeading}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{aText.cravingsLine}</p>
      </div>
      <button type="button" data-testid="craving-card" onClick={onCraving} className="flex min-h-20 w-full items-stretch overflow-hidden rounded-xl border border-border bg-card text-left">
        <span className="flex w-20 shrink-0 items-center justify-center bg-primary/15 text-3xl" aria-hidden="true">
          {"◌"}
        </span>
        <span className="flex flex-col justify-center px-4 py-3">
          <span className="text-base font-semibold">{aText.cravingCardTitle}</span>
          <span className="text-sm text-muted-foreground">{aText.cravingCardLine}</span>
        </span>
      </button>
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{aText.mindfulnessHeading}</h3>
          <button type="button" data-testid="see-all" onClick={() => onOpen("seeall")} className="inline-flex min-h-11 items-center text-sm text-primary underline">
            {aText.seeAll}
          </button>
        </div>
        <div className="mt-2 flex gap-3 overflow-x-auto pb-1">
          {tiles.map((t) => (
            <button
              key={t.id}
              type="button"
              data-testid={`tile-${t.id}`}
              onClick={() => onOpen(t.id)}
              className="flex size-28 shrink-0 items-end rounded-xl border border-border bg-gradient-to-br from-primary/30 to-card p-3 text-left text-sm font-medium"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold">{aText.reflectionsHeading}</h3>
        <Placeholder className="mt-2" />
      </div>
    </div>
  )
}

function Craving({ onBack, onGame }: { onBack: () => void; onGame: (s: Screen) => void }) {
  const [dot, setDot] = useState(0)
  const scroller = useRef<HTMLDivElement>(null)
  return (
    <div data-testid="craving" className="flex flex-col gap-4">
      <div className="flex items-center gap-2 rounded-lg bg-primary px-2 text-primary-foreground">
        <button type="button" onClick={onBack} aria-label={aText.exit} data-testid="craving-back" className="inline-flex size-11 items-center justify-center text-xl">
          {"←"}
        </button>
        <h2 className="flex-1 pr-11 text-center text-base font-semibold">{aText.cravingTitle}</h2>
      </div>
      <div>
        <p className="text-xs text-primary">{aText.toolsLabel}</p>
        <h3 className="text-xl font-bold">{aText.didYouKnow}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {aText.factBefore} <NotSourced />. {aText.factAfter}
        </p>
      </div>
      <h3 className="text-sm font-semibold">{aText.gamesHeading}</h3>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1" data-testid="games">
        {(
          [
            ["g2048", aText.game2048],
            ["gfall", aText.gameTetris],
            ["gmemory", aText.gameMemory],
          ] as [Screen, string][]
        ).map(([id, label]) => (
          <button key={id} type="button" data-testid={`game-${id}`} onClick={() => onGame(id)} className="w-36 shrink-0 overflow-hidden rounded-xl border border-border bg-card text-left">
            <span className="flex h-20 items-center justify-center bg-gradient-to-b from-primary/40 to-primary/10 text-xl font-bold" aria-hidden="true">
              {id === "g2048" ? "2048" : id === "gfall" ? "▞▚" : "♠ ♥"}
            </span>
            <span className="block px-3 py-2 text-sm">{label}</span>
          </button>
        ))}
      </div>
      <h3 className="text-sm font-semibold">{aText.affirmationsHeading}</h3>
      <div
        ref={scroller}
        data-testid="affirmations"
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto"
        onScroll={(e) => {
          const el = e.currentTarget
          setDot(Math.round(el.scrollLeft / el.clientWidth))
        }}
      >
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex min-h-28 w-full shrink-0 snap-center items-center justify-center rounded-xl bg-gradient-to-b from-primary to-primary/50 p-4 text-center text-base font-medium text-primary-foreground">
            {i < aText.affirmations.length ? aText.affirmations[i] : <Placeholder className="w-full border-primary-foreground/50 text-primary-foreground" />}
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-1.5" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} data-testid="dot" data-on={i === dot} className={`size-2 rounded-full ${i === dot ? "bg-foreground" : "bg-muted-foreground/40"}`} />
        ))}
      </div>
    </div>
  )
}

function GamePlaceholder({ title, onBack }: { title: string; onBack: () => void }) {
  return <PlaceholderScreen title={title} onBack={onBack} />
}

function Breathing({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const [left, setLeft] = useState(BREATH_SECONDS)
  const [big, setBig] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setBig(true), 50)
    return () => clearTimeout(id)
  }, [])
  useInterval(() => setLeft((l) => l - 1), 1000)
  useInterval(() => setBig((b) => !b), BREATH_PHASE * 1000)
  useEffect(() => {
    if (left <= 0) onDone()
  }, [left, onDone])
  return (
    <section data-testid="breathing" className="flex flex-col items-center gap-6">
      <div className="flex w-full items-center gap-2">
        <button type="button" onClick={onBack} aria-label={aText.breathTitle} data-testid="breath-back" className="inline-flex size-11 items-center justify-center text-xl">
          {"←"}
        </button>
        <InferredTag />
      </div>
      <p data-testid="breath-clock" className="text-4xl font-semibold tabular-nums">
        {formatClock(left)}
      </p>
      <Orb big={big} seconds={BREATH_PHASE} label={big ? aText.inhale : aText.exhale} />
    </section>
  )
}

function Meditation({ onBack }: { onBack: () => void }) {
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  useInterval(() => setElapsed((e) => Math.min(MEDITATION_SECONDS, e + 1)), playing ? 1000 : null)
  return (
    <section data-testid="meditation" className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} aria-label={aText.meditationTitle} className="inline-flex size-11 items-center justify-center text-xl">
          {"←"}
        </button>
        <h2 className="flex-1 text-lg font-semibold">{aText.meditationTitle}</h2>
        <InferredTag />
      </div>
      <p className="text-sm text-muted-foreground">{aText.meditationLength}</p>
      <input type="range" min={0} max={MEDITATION_SECONDS} value={elapsed} onChange={(e) => setElapsed(Number(e.target.value))} aria-label={aText.meditationTitle} className="h-11 w-full accent-primary" />
      <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
        <span>{formatClock(elapsed)}</span>
        <span>{formatClock(MEDITATION_SECONDS)}</span>
      </div>
      <button type="button" data-testid="meditation-play" onClick={() => setPlaying((p) => !p)} className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-4 text-primary-foreground">
        {playing ? aText.pause : aText.play}
      </button>
      <p className="text-xs text-muted-foreground">{aText.meditationNote}</p>
    </section>
  )
}

const TAP_POINTS: [number, number][] = [
  [50, 18],
  [34, 28],
  [66, 28],
  [50, 44],
  [26, 58],
  [74, 58],
  [40, 76],
  [60, 76],
]

function Tapping({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState(0)
  return (
    <section data-testid="tapping" className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} aria-label={aText.tappingTitle} className="inline-flex size-11 items-center justify-center text-xl">
          {"←"}
        </button>
        <h2 className="flex-1 text-lg font-semibold">{aText.tappingTitle}</h2>
        <InferredTag />
      </div>
      <svg viewBox="0 0 100 100" className="mx-auto h-72" role="img" aria-label={aText.tappingTitle}>
        <circle cx="50" cy="16" r="9" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M30 98 V50 Q30 32 50 32 Q70 32 70 50 V98" fill="none" stroke="currentColor" strokeWidth="1" />
        {TAP_POINTS.map(([x, y], i) => (
          <g key={i} onClick={() => setStep(i)} data-testid={`tap-point-${i}`} data-on={i === step}>
            <circle cx={x} cy={y} r="5" className={i === step ? "fill-primary" : "fill-card stroke-border"} strokeWidth="0.6" />
            <text x={x} y={y + 1.8} textAnchor="middle" fontSize="5" className="fill-foreground">
              {i + 1}
            </text>
          </g>
        ))}
      </svg>
      <button type="button" data-testid="tap-next" onClick={() => setStep((s) => (s + 1) % TAP_POINTS.length)} className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-4 text-primary-foreground">
        {aText.tapNext}
      </button>
    </section>
  )
}
