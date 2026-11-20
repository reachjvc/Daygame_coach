"use client"

import { Mic } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { BlackBoxBridge } from "../../components/BlackBoxBridge"
import { LocalBlackBoxBridge } from "../../components/LocalBlackBoxBridge"
import { nowInBrowser, useSignedIn, type QuitBlackBoxApi } from "../../blackbox"
import { endingForBelief } from "../../blackboxLogic"
import { count } from "../../count"
import { useQuitRecord } from "../../record"
import { ROUTES } from "@/src/shared/routes"
import { fill, tooltext as tt } from "../../tooltext"
import type { Evidence, QuitBelief, QuitMomentSwap, QuitNeed, QuitOption, QuitRef, ToolProps } from "../../types"
import { didYouUse } from "../../wording"
import { localDate, realRefs, usable } from "../common"
import { useCarry, useToolState } from "../hooks"
import { EMPTY_IFTHEN, parseIfthen, type IfthenState } from "../ifthen/logic"
import { NotReady } from "../NotReady"
import { Blocks, Breathe, Bubbles, Help, Move, Reasons, Voice } from "./Tiles"
import {
  beliefOf,
  EMPTY_SOS,
  FIGHT_WAIT,
  freshVisit,
  isFinished,
  isNewVisit,
  moneyKept,
  parseSos,
  recentCloseCall,
  ringClock,
  ringView,
  situationBars,
  WAIT_CHOICES,
  type LogEntry,
  type SosState,
  type WaitMinutes,
} from "./logic"

const t = tt.sos
const TILES = ["voice", "breathe", "move", "bubbles", "blocks", "help", "reasons"] as const
type TileId = (typeof TILES)[number]
const GLYPH: Record<TileId, string> = { voice: "", breathe: "◯", move: "↗", bubbles: "●", blocks: "▦", help: "☰", reasons: "♡" }
const isTile = (x: string | null): x is TileId => x !== null && (TILES as readonly string[]).includes(x)

/** Craving now: a shelf of one-tap tools, a ten-minute ring, and two taps afterwards. */
export function SosTool({ addiction, data }: ToolProps) {
  const beliefs = usable<QuitBelief[]>(data.beliefs)
  const moments = usable<QuitOption[]>(data.riskyMoments)
  const swaps = usable<QuitMomentSwap[]>(data.momentSwaps)
  const needs = usable<QuitNeed[]>(data.needs)
  if (!beliefs || !moments || !swaps || swaps.length === 0 || !needs) return <NotReady />
  // The move tile's study: the swap of the "relief" need that cites the exercise review.
  const swap = needs.find((n) => n.id === "relief")?.swaps.find((s) => realRefs(s.refs).some((r) => r.cite.startsWith("Haasova")))
  const refs = realRefs(swap?.refs).filter((r) => r.cite.startsWith("Haasova"))
  if (!swap || refs.length === 0) return <NotReady />
  return <Inner addiction={addiction} beliefs={beliefs} moments={moments} swaps={swaps} evidence={swap.evidence} refs={refs} />
}

interface InnerProps {
  addiction: string
  beliefs: QuitBelief[]
  moments: QuitOption[]
  swaps: QuitMomentSwap[]
  evidence: Evidence
  refs: QuitRef[]
}

function Inner(props: InnerProps) {
  const signedIn = useSignedIn(true, true)
  const [bb, setBb] = useState<QuitBlackBoxApi | null>(null)
  const onApi = useCallback((api: QuitBlackBoxApi | null) => setBb(api), [])
  // Signed in the Black Box syncs to the account; otherwise it is the copy in this browser.
  return (
    <>
      {signedIn ? <BlackBoxBridge viceId={props.addiction} onApi={onApi} /> : <LocalBlackBoxBridge viceId={props.addiction} onApi={onApi} />}
      <Screens {...props} signedIn={signedIn} bb={bb} />
    </>
  )
}

type Phase = "ask" | "no" | "yes"
interface Want {
  kind: "close" | "slip"
  at: string
  thought: string
  ending: ReturnType<typeof endingForBelief>
}

function Screens({ addiction, beliefs, moments, swaps, evidence, refs, signedIn, bb }: InnerProps & { signedIn: boolean | null; bb: QuitBlackBoxApi | null }) {
  const carry = useCarry()
  const pathname = usePathname()
  const sp = useSearchParams()
  const { state, update } = useToolState<SosState>(addiction, "sos", EMPTY_SOS, parseSos)
  const { state: plan } = useToolState<IfthenState>(addiction, "ifthen", EMPTY_IFTHEN, parseIfthen)
  const { record } = useQuitRecord(addiction)
  const [ready, setReady] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [phase, setPhase] = useState<Phase>("ask")
  const [fightNote, setFightNote] = useState(false)
  const [want, setWant] = useState<Want | null>(null)
  const [noRun, setNoRun] = useState(false)
  const [refused, setRefused] = useState(false)
  const [updated, setUpdated] = useState(false)
  const [undone, setUndone] = useState(false)
  const [strength, setStrength] = useState<number | null>(null)
  const [situation, setSituation] = useState<string | null>(null)
  const [rowMsg, setRowMsg] = useState(false)
  const answered = useRef(false)
  const pushed = useRef(false)
  const sentStart = useRef(false)
  const wasOver = useRef(false)
  const seenRing = useRef(false)

  const tParam = sp.get("t")
  const view: "shelf" | "after" | TileId = tParam === "after" ? "after" : isTile(tParam) ? tParam : "shelf"

  const hrefFor = useCallback(
    (tile: string | null) => {
      const p = new URLSearchParams(sp.toString())
      if (tile === null) p.delete("t")
      else p.set("t", tile)
      const q = p.toString()
      return q ? `${pathname}?${q}` : pathname
    },
    [sp, pathname],
  )
  const open = useCallback(
    (tile: string) => {
      pushed.current = true
      window.history.pushState(null, "", hrefFor(tile))
    },
    [hrefFor],
  )
  /** One step back to the shelf: the history entry the tile made, else a rewrite of this one. */
  const toShelf = useCallback(() => {
    if (pushed.current) {
      pushed.current = false
      window.history.back()
    } else window.history.replaceState(null, "", hrefFor(null))
  }, [hrefFor])
  useEffect(() => {
    if (tParam === null) pushed.current = false
  }, [tParam])

  // Every visit starts fresh: a new ring, no old result.
  const inited = useRef(false)
  useEffect(() => {
    if (state === null || inited.current) return
    inited.current = true
    const n = Date.now()
    if (isNewVisit(state, n)) {
      update((s) => freshVisit(s, n))
      if (tParam === "after") window.history.replaceState(null, "", hrefFor(null))
    }
    setNow(n)
    setReady(true)
  }, [state, update, tParam, hrefFor])

  useEffect(() => {
    const tick = () => setNow(Date.now())
    const id = window.setInterval(tick, 500)
    document.addEventListener("visibilitychange", tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener("visibilitychange", tick)
    }
  }, [])

  const ring = state ? ringView(state.ringMinutes, state.ringStartedAt, now) : null
  const over = ring?.over === true && state?.ended === false
  useEffect(() => {
    if (!ready || !ring) return
    if (!seenRing.current) {
      // A ring that is already over when the page opens is not a new "time is up".
      seenRing.current = true
      wasOver.current = ring.over
      return
    }
    if (ring.over && !wasOver.current) {
      try {
        navigator.vibrate?.(200)
      } catch {
        // no vibration available
      }
    }
    wasOver.current = ring.over
  }, [ready, ring])

  const started = useCallback(() => {
    if (sentStart.current) return
    sentStart.current = true
    count(addiction, "sos", "start")
  }, [addiction])

  const openTile = (tile: TileId) => {
    started()
    open(tile)
  }

  const belief = state ? beliefOf(state.belief, beliefs) : null

  // The filing waits for the Black Box to be read; the answer on screen never waits.
  useEffect(() => {
    if (!want || !bb || !bb.ready || !bb.settled || !state) return
    setWant(null)
    if (!bb.run) {
      setNoRun(true)
      return
    }
    if (want.kind === "close") {
      const near = recentCloseCall(bb.reports, want.at)
      if (near) {
        update((s) => ({ ...s, reportId: near.id, reportKind: "close" }))
        setUpdated(true)
        return
      }
      const id = bb.fileCloseCall({ at: want.at, thought: want.thought, ending: want.ending, didInstead: "" })
      setRefused(id === null)
      update((s) => ({ ...s, reportId: id, reportKind: id ? "close" : null }))
    } else {
      const id = bb.fileSlip({ at: want.at, thought: want.thought, ending: want.ending })
      setRefused(id === null)
      update((s) => ({ ...s, reportId: id, reportKind: id ? "slip" : null }))
    }
  }, [want, bb, state, update])

  if (!state || !ring || !ready) return null

  const unit = record.unit
  const verb = didYouUse(unit)
  const ringWords = t.ringWords[String(state.ringMinutes) as keyof typeof t.ringWords]

  const restartRing = (minutes: WaitMinutes) => update((s) => ({ ...s, ringMinutes: minutes, ringStartedAt: Date.now(), ended: false }))

  const answer = (a: "no" | "fight" | "yes") => {
    if (answered.current) return
    if (a === "fight") {
      restartRing(FIGHT_WAIT)
      setFightNote(true)
      if (view !== "shelf") toShelf()
      return
    }
    answered.current = true
    setUndone(false)
    setUpdated(false)
    setRefused(false)
    setNoRun(false)
    setRowMsg(false)
    setStrength(null)
    setSituation(null)
    setPhase(a)
    setWant({
      kind: a === "no" ? "close" : "slip",
      at: nowInBrowser(),
      thought: belief ? (usable<string>(belief.short) ?? "") : "",
      ending: endingForBelief(state.belief, beliefs),
    })
    update((s) => ({ ...s, ended: true, reportId: null, reportKind: null }))
    count(addiction, "sos", "done")
    if (view === "shelf") open("after")
    else if (view !== "after") window.history.replaceState(null, "", hrefFor("after"))
  }

  const askBlock = (
    <div className="flex flex-col gap-2" data-testid="ask">
      <p className="text-xl font-semibold">{verb}</p>
      <button type="button" data-testid="ask-no" onClick={() => answer("no")} className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-primary px-4 text-base font-medium text-primary-foreground">
        {t.askNo}
      </button>
      <button type="button" data-testid="ask-fight" onClick={() => answer("fight")} className="inline-flex min-h-12 w-full items-center justify-center rounded-md border border-border px-4 text-base">
        {t.askStill}
      </button>
      <button type="button" data-testid="ask-yes" onClick={() => answer("yes")} className="inline-flex min-h-12 w-full items-center justify-center rounded-md border border-border px-4 text-base">
        {t.askYes}
      </button>
    </div>
  )

  const banner =
    over && view !== "after" ? (
      <div data-testid="ring-over" role="status" className="sticky top-0 z-10 flex flex-col gap-3 rounded-lg border border-primary bg-card p-4 shadow-md">
        <p className="text-lg font-semibold">{fill(t.ringOver, { Words: ringWords.charAt(0).toUpperCase() + ringWords.slice(1) })}</p>
        {askBlock}
      </div>
    ) : null

  const logs: LogEntry[] = bb ? bb.reports.map((r) => ({ at: r.at, where: r.where })) : []

  const body = (() => {
    switch (view) {
      case "voice":
        return <Voice beliefs={beliefs} value={state.belief} onPick={(id) => update((s) => ({ ...s, belief: id }))} onBack={toShelf} />
      case "breathe":
        return <Breathe onBack={toShelf} />
      case "bubbles":
        return <Bubbles onBack={toShelf} />
      case "blocks":
        return <Blocks best={state.best2048} onBest={(n) => update((s) => ({ ...s, best2048: Math.max(s.best2048, n) }))} onBack={toShelf} />
      case "move":
        return <Move evidence={evidence} refs={refs} onBack={toShelf} />
      case "help":
        return <Help moments={moments} swaps={swaps} plan={plan?.lines ?? []} onBack={toShelf} />
      case "reasons":
        return (
          <Reasons
            reasons={state.reasons}
            onReasons={(r) => update((s) => ({ ...s, reasons: r }))}
            kept={moneyKept(record.quitDate, localDate(new Date(now)), unit)}
            quitDate={record.quitDate}
            onBack={toShelf}
          />
        )
      case "after":
        return renderAfter()
      default:
        return renderShelf()
    }
  })()

  function renderAfter() {
    if (!state) return null
    if (phase === "ask" || !state.ended) {
      return (
        <section data-testid="after" className="flex flex-col gap-4">
          {askBlock}
          <button type="button" data-testid="after-back" onClick={toShelf} className="inline-flex min-h-11 items-center self-start text-sm text-muted-foreground underline">
            {t.back}
          </button>
        </section>
      )
    }
    const filed = state.reportId !== null && !undone
    const statusText = () => {
      // While sign-in is unknown the line says saving, so it never claims "on this phone" and then changes its mind.
      if (!state.reportId || !bb) return signedIn === false ? t.savedLocal : tt.blackbox.saving
      const s = bb.status(state.reportId)
      if (signedIn === true) return s === "saved" ? t.savedAccount : s === "local" ? tt.blackbox.localOnly : tt.blackbox.saving
      return signedIn === false ? t.savedLocal : tt.blackbox.saving
    }
    return (
      <section data-testid="result" className="flex flex-col gap-4">
        {phase === "no" ? (
          <>
            <p data-testid="result-no" className="text-xl font-semibold">
              {t.noTitle}
            </p>
            {filed && renderRow()}
          </>
        ) : (
          <>
            <p data-testid="result-yes" className="text-xl font-semibold">
              {t.yesTitle}
            </p>
            {isFinished("slip") ? (
              <Link href={carry(`/quit/${addiction}/slip`)} data-testid="slip-link" className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-4 font-medium text-primary-foreground">
                {t.slipLink}
              </Link>
            ) : (
              <p data-testid="slip-step">{t.yesStep}</p>
            )}
          </>
        )}
        {filed && (
          <div data-testid="sos-saved" className="rounded-lg border border-border bg-card p-3">
            <p data-testid="sos-saved-text" className="font-medium">
              {statusText()}
            </p>
            {updated && <p className="text-sm text-muted-foreground">{t.rowUpdated}</p>}
            {!updated && <button
              type="button"
              data-testid="sos-undo"
              onClick={() => {
                if (bb && state.reportId && bb.undo(state.reportId)) {
                  setUndone(true)
                  update((s) => ({ ...s, reportId: null, reportKind: null }))
                }
              }}
              className="inline-flex min-h-11 items-center text-primary underline"
            >
              {tt.blackbox.undo}
            </button>}
          </div>
        )}
        {bb?.newerSaved && (
          <p data-testid="sos-newer" className="text-sm text-muted-foreground">
            {t.newerSaved}
          </p>
        )}
        {undone && <p data-testid="sos-undone">{tt.blackbox.undone}</p>}
        {refused && <p>{tt.blackbox.notSaved}</p>}
        {noRun && (
          <Link href={ROUTES.quitVice} data-testid="sos-keep-record" className="inline-flex min-h-11 items-center text-primary underline">
            {tt.blackbox.keepRecord}
          </Link>
        )}
        <Link href={carry(`/quit/${addiction}`)} data-testid="to-menu" className="inline-flex min-h-11 items-center text-primary underline">
          {t.toMenu}
        </Link>
      </section>
    )
  }

  /** The optional row of "I got through it": how strong and where; it updates the filed close call. */
  function renderRow() {
    if (!state) return null
    return (
      <section data-testid="log-row" className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <p className="text-sm text-muted-foreground">{t.noRowLine}</p>
        <div role="radiogroup" aria-label={t.strengthLabel} className="grid grid-cols-5 gap-2">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={strength === n}
              data-testid={`strength-${n}`}
              onClick={() => setStrength(n)}
              className={`min-h-11 rounded-md border text-base ${strength === n ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
            >
              {n}
            </button>
          ))}
        </div>
        <div role="radiogroup" aria-label={t.situationLabel} className="flex flex-wrap gap-2">
          {moments.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={situation === m.id}
              data-testid={`log-situation-${m.id}`}
              onClick={() => setSituation(m.id)}
              className={`inline-flex min-h-11 items-center rounded-full border px-3 text-sm ${situation === m.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          data-testid="log-save"
          disabled={strength === null && situation === null}
          onClick={() => {
            if (bb && state.reportId && bb.amend(state.reportId, { ...(strength !== null ? { closeness: strength } : {}), ...(situation !== null ? { where: situation } : {}) })) setRowMsg(true)
          }}
          className="inline-flex min-h-12 items-center justify-center rounded-md border border-primary px-4 text-primary disabled:opacity-40"
        >
          {t.rowSave}
        </button>
        {rowMsg && (
          <p data-testid="log-msg" role="status" className="text-sm">
            {t.rowSaved}
          </p>
        )}
      </section>
    )
  }

  function renderShelf() {
    if (!state || !ring) return null
    const p = situationBars(logs, moments)
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{t.line}</p>
        {fightNote && (
          <p data-testid="fight-note" className="text-base font-medium">
            {t.fightNote}
          </p>
        )}
        <RingCard minutes={state.ringMinutes} words={ringWords} ring={ring} onChoose={restartRing} />
        <ul data-testid="shelf" aria-label={t.shelfLabel} className="grid grid-cols-2 gap-3">
          {TILES.map((tile, i) => (
            <li key={tile} className={`flex ${i === TILES.length - 1 ? "col-span-2" : ""}`}>
              <button
                type="button"
                data-testid={`tile-${tile}`}
                onClick={() => openTile(tile)}
                className="flex min-h-24 w-full flex-1 flex-col items-start justify-between gap-2 rounded-lg border border-border bg-card p-3 text-left"
              >
                <span aria-hidden="true" className="text-2xl text-primary">
                  {tile === "voice" ? <Mic className="size-6" /> : GLYPH[tile]}
                </span>
                <span className="text-sm font-medium">{t.tools[tile]}</span>
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          data-testid="finish"
          onClick={() => {
            setPhase("ask")
            answered.current = false
            open("after")
          }}
          className="inline-flex min-h-12 items-center justify-center rounded-md border border-border px-4 text-base"
        >
          {t.through}
        </button>
        <section data-testid="pattern" className="flex flex-col gap-2 rounded-lg border border-border p-4">
          <h3 className="text-base font-semibold">{t.patternTitle}</h3>
          {!p.ready ? (
            <p data-testid="pattern-wait" className="text-sm text-muted-foreground">
              {t.patternWait}
            </p>
          ) : (
            <>
              <ul data-testid="pattern-bars" aria-label={t.patternBar} className="flex flex-col gap-3">
                {p.bars.map((b) => (
                  <li key={b.id} data-testid="pattern-bar">
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="min-w-0">{b.label}</span>
                      <span className="shrink-0 tabular-nums">
                        {b.count} · {b.percent} %
                      </span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${b.percent}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">{fill(t.patternBasis, { n: p.total })}</p>
            </>
          )}
        </section>
      </div>
    )
  }

  return (
    <div data-testid="sos" className="flex w-full flex-col gap-4">
      {banner}
      {!banner && view !== "shelf" && view !== "after" && ring.running && (
        <div data-testid="ring-mini" className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-1 shadow-sm">
          <span role="timer" aria-label={t.ringMiniLabel} className="text-lg font-semibold tabular-nums">
            {ringClock(ring.leftMs)}
          </span>
          <button
            type="button"
            data-testid="mini-finish"
            onClick={() => {
              setPhase("ask")
              answered.current = false
              window.history.replaceState(null, "", hrefFor("after"))
            }}
            className="inline-flex min-h-11 items-center text-primary underline"
          >
            {t.through}
          </button>
        </div>
      )}
      {body}
    </div>
  )
}

const RADIUS = 44
const CIRC = 2 * Math.PI * RADIUS

function RingCard({ minutes, words, ring, onChoose }: { minutes: number; words: string; ring: ReturnType<typeof ringView>; onChoose: (m: WaitMinutes) => void }) {
  return (
    <section data-testid="ring-card" className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <div className="relative size-24 shrink-0">
        <svg viewBox="0 0 100 100" className="size-24 -rotate-90" aria-hidden>
          <circle cx={50} cy={50} r={RADIUS} fill="none" strokeWidth={6} className="stroke-muted" />
          <circle
            data-testid="ring-arc"
            cx={50}
            cy={50}
            r={RADIUS}
            fill="none"
            strokeWidth={6}
            strokeLinecap="round"
            className="stroke-primary transition-[stroke-dashoffset] duration-500 ease-linear motion-reduce:transition-none"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - ring.fraction)}
          />
        </svg>
        <span role="timer" aria-label={t.ringLabel} data-testid="ring-clock" className="absolute inset-0 flex items-center justify-center text-lg font-semibold tabular-nums">
          {ringClock(ring.leftMs)}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-sm font-medium">{fill(t.ringTitle, { words })}</p>
        <div role="radiogroup" aria-label={t.ringChoices} className="flex gap-2">
          {WAIT_CHOICES.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={minutes === m}
              data-testid={`wait-${m}`}
              onClick={() => onChoose(m)}
              className={`min-h-11 min-w-11 flex-1 rounded-md border px-2 text-sm ${minutes === m ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}
            >
              {m} {t.minutes}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
