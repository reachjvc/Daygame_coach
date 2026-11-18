"use client"

import { useEffect, useState } from "react"
import { Cigarette, Droplet, Heart, PencilLine, Shield, ThumbsUp, Zap, type LucideIcon } from "lucide-react"
import { InferredTag, Placeholder, PlaceholderScreen } from "../shared/Bits"
import { useInterval } from "../shared/hooks"
import { sharedText } from "../shared/text"
import { useLabState } from "../../store"
import { shakeDetected } from "./shake"
import { dText, FACES } from "./text"

export type Mode = "feel" | "overcame" | "smoked"
export type Screen = "panel" | "strength" | "context" | "strategies" | "motivated" | "breathe" | "letgo" | "water" | "memory" | "substitutes" | "outcome" | "saved"

interface Entry {
  at: number
  mode: Mode
  strength: number
  feeling: number | null
  context: number | null
  strategy: string | null
  smoked: boolean | null
}

const TILE_STYLE = {
  overcame: "bg-blue-400/30 border-blue-300/40",
  smoked: "bg-purple-400/30 border-purple-300/40",
  memory: "bg-rose-400/30 border-rose-300/40",
  breathe: "bg-green-400/30 border-green-300/40",
  motivated: "bg-orange-400/30 border-orange-300/40",
  substitutes: "bg-card border-border",
} as const

const ICON: Record<string, LucideIcon> = {
  overcame: Shield,
  smoked: Zap,
  memory: PencilLine,
  breathe: Heart,
  motivated: ThumbsUp,
  substitutes: Cigarette,
  letgo: Shield,
  water: Droplet,
}

/** Copy D: panel of six tiles, then strength, feeling and context, then strategy tiles. */
export function SosD() {
  const [screen, setScreen] = useState<Screen>("panel")
  const [mode, setMode] = useState<Mode>("feel")
  const [strength, setStrength] = useState(5)
  const [feeling, setFeeling] = useState<number | null>(null)
  const [context, setContext] = useState<number | null>(null)
  const [strategy, setStrategy] = useState<string | null>(null)
  // true when a strategy page was opened straight from the panel (no log, no strategy list around it)
  const [direct, setDirect] = useState(false)
  const [log, setLog] = useLabState<Entry[]>("sos", "d", "log", [])

  const begin = (m: Mode) => {
    setMode(m)
    setStrength(5)
    setFeeling(null)
    setContext(null)
    setStrategy(null)
    setScreen("strength")
  }
  const save = (smoked: boolean | null) => {
    setLog([...log, { at: Date.now(), mode, strength, feeling, context, strategy, smoked: mode === "smoked" ? true : smoked }])
    setScreen("saved")
  }
  const toPanel = () => setScreen("panel")
  const openDirect = (s: Screen) => {
    setDirect(true)
    setScreen(s)
  }
  const stratBack = () => (direct ? toPanel() : setScreen("strategies"))
  const stratDone = () => (direct ? toPanel() : setScreen("outcome"))

  switch (screen) {
    case "panel":
      return <Panel onFeel={() => begin("feel")} onBegin={begin} onOpen={openDirect} />
    case "strength":
      return <StrengthFeeling strength={strength} setStrength={setStrength} feeling={feeling} setFeeling={setFeeling} onBack={toPanel} onNext={() => setScreen("context")} />
    case "context":
      return (
        <Context
          context={context}
          setContext={setContext}
          onBack={() => setScreen("strength")}
          onNext={() => (mode === "feel" ? setScreen("strategies") : save(null))}
        />
      )
    case "strategies":
      return (
        <Strategies
          onBack={() => setScreen("context")}
          onPick={(id) => {
            setStrategy(id)
            setDirect(false)
            setScreen(id as Screen)
          }}
        />
      )
    case "motivated":
      return <Motivated onBack={stratBack} onDone={stratDone} />
    case "breathe":
      return <Breathe onBack={stratBack} onDone={stratDone} />
    case "letgo":
      return <StrategyPlaceholder title={dText.letgoTitle} onBack={stratBack} onDone={stratDone} />
    case "water":
      return <StrategyPlaceholder title={dText.waterTitle} onBack={stratBack} onDone={stratDone} />
    case "memory":
      return <PlaceholderScreen title={dText.memoryTitle} onBack={toPanel} />
    case "substitutes":
      return <PlaceholderScreen title={dText.substitutesTitle} onBack={toPanel} />
    case "outcome":
      return (
        <section data-testid="outcome" className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <h2 className="flex-1 text-xl font-semibold">{dText.smokedQuestion}</h2>
            <InferredTag />
          </div>
          <button type="button" data-testid="smoked-no" onClick={() => save(false)} className="min-h-12 rounded-md bg-primary px-4 text-primary-foreground">
            {sharedText.no}
          </button>
          <button type="button" data-testid="smoked-yes" onClick={() => save(true)} className="min-h-12 rounded-md border border-border px-4">
            {sharedText.yes}
          </button>
        </section>
      )
    case "saved":
      return (
        <section data-testid="saved" className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <h2 className="flex-1 text-xl font-semibold">{dText.savedTitle}</h2>
            <InferredTag />
          </div>
          <p className="text-sm text-muted-foreground">{dText.savedLine}</p>
          <button type="button" data-testid="to-panel" onClick={toPanel} className="min-h-12 rounded-md bg-primary px-4 text-primary-foreground">
            {dText.toPanel}
          </button>
        </section>
      )
  }
}

function Icon({ icon: I }: { icon: LucideIcon }) {
  return <I className="size-6" aria-hidden="true" />
}

export function Panel({ onFeel, onBegin, onOpen }: { onFeel?: () => void; onBegin: (m: Mode) => void; onOpen: (s: Screen) => void }) {
  const tiles: { id: keyof typeof TILE_STYLE; label: string; tap: () => void }[] = [
    { id: "overcame", label: dText.tiles.overcame, tap: () => onBegin("overcame") },
    { id: "smoked", label: dText.tiles.smoked, tap: () => onBegin("smoked") },
    { id: "memory", label: dText.tiles.memory, tap: () => onOpen("memory") },
    { id: "breathe", label: dText.tiles.breathe, tap: () => onOpen("breathe") },
    { id: "motivated", label: dText.tiles.motivated, tap: () => onOpen("motivated") },
    { id: "substitutes", label: dText.tiles.substitutes, tap: () => onOpen("substitutes") },
  ]
  return (
    <div data-testid="panel" className="flex flex-col gap-3">
      {onFeel ? (
        <button type="button" data-testid="feel-bar" onClick={onFeel} className="flex min-h-28 items-end rounded-lg bg-emerald-500 p-4 text-left text-lg font-semibold text-white">
          {dText.panelBar}
        </button>
      ) : (
        <div data-testid="feel-bar" className="flex min-h-28 items-end rounded-lg bg-emerald-500 p-4 text-left text-lg font-semibold text-white">
          {dText.panelBar}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <button key={t.id} type="button" data-testid={`tile-${t.id}`} onClick={t.tap} className={`flex min-h-28 flex-col justify-between rounded-lg border p-3 text-left text-sm font-medium ${TILE_STYLE[t.id]}`}>
            <Icon icon={ICON[t.id]} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function Top({ onBack, withInfo }: { onBack: () => void; withInfo?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <button type="button" data-testid="back" onClick={onBack} className="inline-flex min-h-11 items-center text-sm text-muted-foreground">
          {dText.back}
        </button>
        {withInfo && (
          <button type="button" data-testid="info" aria-label={dText.info} aria-expanded={open} onClick={() => setOpen((o) => !o)} className="inline-flex size-11 items-center justify-center rounded-full border border-emerald-400 text-emerald-400">
            {"i"}
          </button>
        )}
      </div>
      {open && <Placeholder />}
    </div>
  )
}

function Face({ index, on }: { index: number; on: boolean }) {
  const f = FACES[index]
  return (
    <svg viewBox="0 0 40 40" className="size-12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity={on ? 1 : 0.7}>
      <circle cx="20" cy="20" r="17" />
      {f.eyes === "dot" && (
        <>
          <circle cx="14" cy="16" r="1.6" />
          <circle cx="26" cy="16" r="1.6" />
        </>
      )}
      {f.eyes === "wide" && (
        <>
          <circle cx="14" cy="16" r="3" />
          <circle cx="26" cy="16" r="3" />
        </>
      )}
      {f.eyes === "line" && <path d="M11 16 H17 M23 16 H29" />}
      {f.eyes === "brow" && <path d="M11 12 L17 15 M29 12 L23 15 M14 18 h.1 M26 18 h.1" />}
      <path d={f.mouth} />
    </svg>
  )
}

export function StrengthFeeling({
  strength,
  setStrength,
  feeling,
  setFeeling,
  onBack,
  onNext,
  tagNext,
}: {
  strength: number
  setStrength: (n: number) => void
  feeling: number | null
  setFeeling: (n: number) => void
  onBack: () => void
  onNext: () => void
  tagNext?: boolean
}) {
  const pct = ((strength - 1) / 9) * 100
  return (
    <div data-testid="strength" className="flex flex-col gap-5">
      <Top onBack={onBack} withInfo />
      <h2 className="text-2xl font-bold text-emerald-400">{dText.heading}</h2>
      <div>
        <p className="text-base">{dText.strengthQuestion}</p>
        <div className="relative mt-6 px-3">
          <span data-testid="strength-value" className="absolute -top-6 -translate-x-1/2 text-sm font-semibold text-emerald-400" style={{ left: `calc(${pct}% * 0.9 + 5%)` }}>
            {strength}
          </span>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={strength}
            onChange={(e) => setStrength(Number(e.target.value))}
            aria-label={dText.strengthQuestion}
            data-testid="strength-slider"
            className="h-11 w-full accent-emerald-400"
          />
        </div>
      </div>
      <div>
        <p className="text-base">{dText.feelQuestion}</p>
        <div className="mt-3 grid grid-cols-4 gap-2" role="radiogroup" aria-label={dText.feelQuestion}>
          {dText.feelings.map((label, i) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={feeling === i}
              data-testid={`feeling-${i}`}
              onClick={() => setFeeling(i)}
              className={`flex min-h-24 flex-col items-center justify-center gap-1 rounded-lg border px-1 py-2 text-xs ${feeling === i ? "border-emerald-400 bg-emerald-500 text-white" : "border-border bg-card text-muted-foreground"}`}
            >
              <Face index={i} on={feeling === i} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        {tagNext && (
          <div>
            <InferredTag />
          </div>
        )}
        <button type="button" data-testid="next" disabled={feeling === null} onClick={onNext} className="min-h-12 rounded-md bg-primary px-4 text-primary-foreground disabled:opacity-40">
          {dText.next}
        </button>
      </div>
    </div>
  )
}

export function Context({ context, setContext, onBack, onNext, tagNext }: { context: number | null; setContext: (n: number) => void; onBack: () => void; onNext: () => void; tagNext?: boolean }) {
  return (
    <div data-testid="context" className="flex flex-col gap-4">
      <Top onBack={onBack} />
      <h2 className="text-2xl font-bold text-emerald-400">{dText.heading}</h2>
      <p className="text-base">{dText.contextQuestion}</p>
      <ul className="flex flex-col gap-2" role="radiogroup" aria-label={dText.contextQuestion}>
        {dText.contexts.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              role="radio"
              aria-checked={context === i}
              data-testid={`context-${i}`}
              onClick={() => setContext(i)}
              className={`flex min-h-12 w-full items-center justify-between rounded-lg border px-4 text-left text-sm ${context === i ? "border-emerald-400" : "border-border bg-card"}`}
            >
              <span>{label}</span>
              {context === i && <span className="size-3 rounded-full bg-emerald-400" aria-hidden="true" />}
            </button>
          </li>
        ))}
        <li>
          <Placeholder />
        </li>
        <li>
          <Placeholder />
        </li>
        <li>
          <Placeholder />
        </li>
      </ul>
      <div className="flex flex-col gap-1">
        {tagNext && (
          <div>
            <InferredTag />
          </div>
        )}
        <button type="button" data-testid="next" disabled={context === null} onClick={onNext} className="min-h-12 rounded-md bg-primary px-4 text-primary-foreground disabled:opacity-40">
          {dText.next}
        </button>
      </div>
    </div>
  )
}

function Strategies({ onBack, onPick }: { onBack: () => void; onPick: (id: string) => void }) {
  const cards: { id: string; label: string; cls: string }[] = [
    { id: "letgo", label: dText.strategies.letgo, cls: "bg-blue-400/30 border-blue-300/40" },
    { id: "motivated", label: dText.strategies.motivated, cls: "bg-orange-400/30 border-orange-300/40" },
    { id: "breathe", label: dText.strategies.breathe, cls: "bg-green-400/30 border-green-300/40" },
    { id: "water", label: dText.strategies.water, cls: "bg-sky-400/30 border-sky-300/40" },
  ]
  return (
    <div data-testid="strategies" className="flex flex-col gap-4">
      <Top onBack={onBack} />
      <h2 className="text-2xl font-bold text-emerald-400">{dText.altHeading}</h2>
      <p className="text-base">{dText.altQuestion}</p>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <button key={c.id} type="button" data-testid={`strategy-${c.id}`} onClick={() => onPick(c.id)} className={`flex min-h-32 flex-col justify-between rounded-xl border p-3 text-left text-sm font-medium transition-transform active:-translate-y-1 active:rotate-1 ${c.cls}`}>
            <Icon icon={ICON[c.id] ?? Shield} />
            <span>{c.label}</span>
          </button>
        ))}
        <Placeholder className="min-h-32" />
        <Placeholder className="min-h-32" />
      </div>
    </div>
  )
}

/** A card of encouragement; shaking the phone (or the visible button) draws another. */
function Motivated({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [n, setN] = useState(1)
  useEffect(() => {
    let last = 0
    const onMotion = (e: DeviceMotionEvent) => {
      const now = Date.now()
      if (shakeDetected(e.accelerationIncludingGravity, now, last)) {
        last = now
        setN((x) => x + 1)
      }
    }
    window.addEventListener("devicemotion", onMotion)
    return () => window.removeEventListener("devicemotion", onMotion)
  }, [])
  const draw = () => {
    const ask = (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission
    if (typeof ask === "function") ask().catch(() => undefined)
    setN((x) => x + 1)
  }
  return (
    <section data-testid="motivated" className="flex flex-col gap-4">
      <Top onBack={onBack} />
      <h2 className="text-2xl font-bold text-orange-300">{dText.cardHeading}</h2>
      <div className="flex min-h-64 flex-col justify-between rounded-2xl border border-orange-300/40 bg-orange-400/20 p-4">
        <Icon icon={ThumbsUp} />
        <Placeholder />
        <p data-testid="card-count" className="text-xs text-muted-foreground">
          {dText.cardCount} {n}
        </p>
      </div>
      <button type="button" data-testid="draw-card" onClick={draw} className="min-h-12 rounded-md border border-border px-4">
        {dText.cardAction}
      </button>
      <button type="button" data-testid="strategy-done" onClick={onDone} className="min-h-12 rounded-md bg-primary px-4 text-primary-foreground">
        {dText.done}
      </button>
    </section>
  )
}

function Breathe({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [big, setBig] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setBig(true), 50)
    return () => clearTimeout(id)
  }, [])
  useInterval(() => setBig((b) => !b), 4000)
  return (
    <section data-testid="breathe" className="flex flex-col items-center gap-5">
      <div className="flex w-full items-center gap-2">
        <div className="flex-1">
          <Top onBack={onBack} />
        </div>
        <InferredTag />
      </div>
      <h2 className="text-2xl font-bold text-green-300">{dText.breatheHeading}</h2>
      <div className="flex size-56 items-center justify-center rounded-full border-4 border-green-300/60 bg-green-400/10" style={{ transform: `scale(${big ? 1 : 0.6})`, transition: "transform 4s ease-in-out" }}>
        <span data-testid="breathe-word" className="text-xl font-semibold">
          {big ? dText.breatheIn : dText.breatheOut}
        </span>
      </div>
      <Placeholder className="w-full" />
      <button type="button" data-testid="strategy-done" onClick={onDone} className="min-h-12 w-full rounded-md bg-primary px-4 text-primary-foreground">
        {dText.done}
      </button>
    </section>
  )
}

function StrategyPlaceholder({ title, onBack, onDone }: { title: string; onBack: () => void; onDone: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <PlaceholderScreen title={title} onBack={onBack} />
      <button type="button" data-testid="strategy-done" onClick={onDone} className="min-h-12 rounded-md bg-primary px-4 text-primary-foreground">
        {dText.done}
      </button>
    </div>
  )
}
