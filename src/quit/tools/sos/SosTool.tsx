"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { BlackBoxBridge } from "../../components/BlackBoxBridge"
import { Chips, ClearAnswers, EvidenceChip, OneQuestion, PrimaryButton, SourceTap, SourcesFold } from "../../components/kit"
import { nowInBrowser, useSignedIn, type CloseCallInput, type QuitBlackBoxApi } from "../../blackbox"
import { endingForBelief } from "../../blackboxLogic"
import { ROUTES } from "@/src/shared/routes"
import { useQuitStore } from "../../store"
import { tooltext as t } from "../../tooltext"
import type { QuitBelief, QuitNeed, ToolProps } from "../../types"
import { realRefs, usable } from "../common"
import { parseGives } from "../gives/logic"
import { useCarry, useDoneCount, useScreens, useStartCount, useToolState } from "../hooks"
import { NotReady } from "../NotReady"
import {
  currentSwap,
  EMPTY_SOS,
  firstUnanswered,
  formatClock,
  minutesGone,
  needForBelief,
  OTHER,
  parseSos,
  remainingMs,
  WAIT_MS,
  type SosState,
} from "./logic"

/** Craving now: name the voice, get the answer, a swap, a wait. */
export function SosTool({ addiction, data }: ToolProps) {
  const beliefs = usable<QuitBelief[]>(data.beliefs)
  const needs = usable<QuitNeed[]>(data.needs)
  const tape = usable<string[]>(data.tapeForward)
  if (!beliefs || !needs || needs.length === 0 || !tape) return <NotReady />
  return <Inner addiction={addiction} beliefs={beliefs} needs={needs} tape={tape} />
}

interface InnerProps {
  addiction: string
  beliefs: QuitBelief[]
  needs: QuitNeed[]
  tape: string[]
}

function Inner({ addiction, beliefs, needs, tape }: InnerProps) {
  const store = useQuitStore()
  const carry = useCarry()
  const { state, update, clear } = useToolState<SosState>(addiction, "sos", EMPTY_SOS, parseSos)
  const signedIn = useSignedIn(true)
  const [bb, setBb] = useState<QuitBlackBoxApi | null>(null)
  const onApi = useCallback((api: QuitBlackBoxApi) => setBb(api), [])
  const [undone, setUndone] = useState(false)
  const [refused, setRefused] = useState(false)
  // The close call waiting for the sign-in answer; filed once, the moment it says signed in.
  const [want, setWant] = useState<CloseCallInput | null>(null)
  // One tap per visit to the question: a double tap files one close call.
  const answered = useRef(false)

  const first = state ? firstUnanswered(state) : 1
  const { screen, go, back: goBack, reset, isResult } = useScreens(first, 4, state !== null)
  const started = useStartCount(addiction, "sos")
  useDoneCount(addiction, "sos", state !== null && isResult)

  const bridge = signedIn ? <BlackBoxBridge viceId={addiction} onApi={onApi} /> : null
  // Yes never waits: the answer shows at once and the filing follows when the Black Box is ready.
  const bbLoading = signedIn === null || (signedIn && !(bb && bb.ready))

  useEffect(() => {
    if (!want) return
    if (signedIn === false) {
      setWant(null)
      return
    }
    if (signedIn !== true || !bb || !bb.ready) return
    setWant(null)
    if (!bb.run) return
    const id = bb.fileCloseCall(want)
    setRefused(id === null)
    update((s) => ({ ...s, reportId: id }))
  }, [want, signedIn, bb, update])

  useEffect(() => {
    if (screen !== 4) answered.current = false
  }, [screen])
  if (!state) return null
  const back = screen > 1 ? goBack : null
  const belief = beliefs.find((b) => b.id === state.belief) ?? null
  const need = needs.find((n) => n.id === state.need)
  const rated = parseGives(store.get(addiction, "gives")).rated

  const pass = (patch: Partial<SosState> = {}) => {
    update((s) => ({ ...s, ...patch, done: Math.max(s.done, screen) }))
    go(screen + 1)
  }

  if (screen === 1) {
    const options = [
      ...beliefs.map((b) => ({ id: b.id, label: usable<string>(b.short) ?? b.id })),
      { id: OTHER, label: t.sos.somethingElse },
    ]
    return (
      <>
        {bridge}
        <OneQuestion step={1} total={4} onBack={null}>
          <p className="font-medium">{t.sos.voiceQuestion}</p>
          <Chips
            label={t.sos.voiceQuestion}
            options={options}
            value={state.belief ? [state.belief] : []}
            onChange={(next) => {
              started()
              update((s) => ({ ...s, belief: next[0], need: needForBelief(next[0], beliefs), swapIdx: 0 }))
            }}
          />
          <PrimaryButton testId="sos-continue" disabled={state.belief === null} onClick={() => pass()}>
            {t.common.continue}
          </PrimaryButton>
        </OneQuestion>
        <SourcesFold refs={[]} />
      </>
    )
  }

  if (screen === 2) {
    return (
      <>
        {bridge}
        <OneQuestion step={2} total={4} onBack={back}>
          <p className="font-medium">{t.sos.wantQuestion}</p>
          <Chips
            label={t.sos.wantQuestion}
            options={needs.map((n) => ({ id: n.id, label: n.name }))}
            value={state.need ? [state.need] : []}
            onChange={(next) => update((s) => ({ ...s, need: next[0], swapIdx: 0 }))}
          />
          <PrimaryButton testId="sos-continue" disabled={state.need === null} onClick={() => pass()}>
            {t.common.continue}
          </PrimaryButton>
        </OneQuestion>
        <SourcesFold refs={[]} />
      </>
    )
  }

  if (screen === 3) {
    const swap = currentSwap(need, rated, state.swapIdx)
    return (
      <>
        {bridge}
        <OneQuestion step={3} total={4} onBack={back}>
          {belief && (
            <section data-testid="sos-counterpart">
              <h2 className="text-sm text-muted-foreground">{t.sos.otherSide}</h2>
              <p className="mt-1 text-lg font-medium">{belief.counterpart}</p>
            </section>
          )}
          {swap && need && (
            <section data-testid="sos-swap" className="rounded-lg border border-border bg-card p-3">
              <h2 className="text-sm text-muted-foreground">{t.sos.swapHeading}</h2>
              <p className="mt-1 text-base">{swap.text}</p>
              <div className="mt-1">
                <EvidenceChip evidence={swap.evidence} />
              </div>
              <SourceTap refs={realRefs(swap.refs)} />
              {need.swaps.length > 1 && (
                <button
                  type="button"
                  data-testid="sos-another"
                  onClick={() => update((s) => ({ ...s, swapIdx: s.swapIdx + 1 }))}
                  className="mt-2 inline-flex min-h-11 items-center rounded-md border border-border px-3"
                >
                  {t.sos.anotherOne}
                </button>
              )}
            </section>
          )}
          <section>
            <h2 className="text-sm text-muted-foreground">{t.sos.move5Heading}</h2>
            <p className="mt-1 text-base">{t.sos.move5}</p>
          </section>
          <section data-testid="sos-tape">
            <h2 className="text-sm text-muted-foreground">{t.sos.tapeHeading}</h2>
            <ul className="mt-1 flex flex-col gap-2">
              {tape.map((line) => (
                <li key={line} className="text-base">
                  {line}
                </li>
              ))}
            </ul>
          </section>
          <Countdown
            startedAt={state.waitStartedAt}
            sound={state.sound}
            onStart={() => update((s) => ({ ...s, waitStartedAt: Date.now() }))}
            onStop={() => update((s) => ({ ...s, waitStartedAt: null }))}
            onSound={(on) => update((s) => ({ ...s, sound: on }))}
          />
          <PrimaryButton testId="sos-to-question" onClick={() => pass()}>
            {t.sos.next}
          </PrimaryButton>
        </OneQuestion>
        <SourcesFold refs={swap ? realRefs(swap.refs) : []} />
      </>
    )
  }

  if (screen === 4) {
    const answer = (passed: boolean) => {
      if (answered.current) return
      answered.current = true
      // A close call already filed on this run and not taken back is not filed twice.
      if (passed && state.reportId === null) {
        setWant({
          at: nowInBrowser(),
          thought: belief ? (usable<string>(belief.short) ?? "") : "",
          ending: endingForBelief(state.belief, beliefs),
          didInstead: currentSwap(need, rated, state.swapIdx)?.text ?? "",
        })
      }
      setRefused(false)
      setUndone(false)
      pass({ passed, waitStartedAt: null })
    }
    return (
      <>
        {bridge}
        <OneQuestion step={4} total={4} onBack={back}>
          <p className="text-xl font-semibold">{t.sos.toQuestion}</p>
          <PrimaryButton testId="sos-yes" onClick={() => answer(true)}>
            {t.sos.yes}
          </PrimaryButton>
          <button
            type="button"
            data-testid="sos-no"
            onClick={() => answer(false)}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-md border border-border px-4 text-base"
          >
            {t.sos.no}
          </button>
        </OneQuestion>
        <SourcesFold refs={[]} />
      </>
    )
  }

  const filed = state.reportId !== null && !undone
  return (
    <div data-testid="result" className="flex flex-col gap-4">
      {bridge}
      {state.passed ? (
        <>
          {filed && (
            <div data-testid="sos-saved" className="rounded-lg border border-primary p-4">
              <p data-testid="sos-saved-text" className="font-medium">
                {state.reportId && bb ? (bb.status(state.reportId) === "saved" ? t.sos.savedClose : bb.status(state.reportId) === "local" ? t.blackbox.localOnly : t.blackbox.saving) : t.blackbox.saving}
              </p>
              <button
                type="button"
                data-testid="sos-undo"
                disabled={bbLoading}
                onClick={() => {
                  if (bb && state.reportId && bb.undo(state.reportId)) {
                    setUndone(true)
                    update((s) => ({ ...s, reportId: null }))
                  }
                }}
                className="mt-2 inline-flex min-h-11 items-center text-primary underline disabled:opacity-40"
              >
                {t.blackbox.undo}
              </button>
            </div>
          )}
          {undone && <p data-testid="sos-undone">{t.blackbox.undone}</p>}
          {refused && <p>{t.blackbox.notSaved}</p>}
          {!filed && !undone && !refused && signedIn === true && bb && !bb.run && (
            <Link href={ROUTES.quitVice} data-testid="sos-keep-record" className="inline-flex min-h-11 items-center text-primary underline">
              {t.blackbox.keepRecord}
            </Link>
          )}
          {!filed && !undone && signedIn === false && <p data-testid="sos-next-time">{t.sos.nextTime}</p>}
        </>
      ) : (
        <>
          <p>{t.sos.notPassed}</p>
          <Link
            href={carry(`/quit/${addiction}/slip`)}
            data-testid="sos-slip-link"
            className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-4 font-medium text-primary-foreground"
          >
            {t.sos.slipLink}
          </Link>
        </>
      )}
      <Link href={carry(`/quit/${addiction}`)} className="inline-flex min-h-11 items-center text-primary underline">
        {t.sos.toMenu}
      </Link>
      <ClearAnswers
        onClear={() => {
          clear()
          reset()
          setUndone(false)
          setRefused(false)
        }}
      />
      <SourcesFold refs={[]} />
    </div>
  )
}

const RADIUS = 70
const CIRC = 2 * Math.PI * RADIUS

interface CountdownProps {
  startedAt: number | null
  sound: boolean
  onStart: () => void
  onStop: () => void
  onSound: (on: boolean) => void
}

/** A calm ten-minute wait. The start time is saved, so a reload or a sleeping tab keeps the right time. */
function Countdown({ startedAt, sound, onStart, onStop, onSound }: CountdownProps) {
  const [now, setNow] = useState(() => Date.now())
  const ctx = useRef<AudioContext | null>(null)
  const announced = useRef(0)

  useEffect(() => {
    if (startedAt === null) return
    const tick = () => setNow(Date.now())
    tick()
    announced.current = minutesGone(startedAt, Date.now())
    const id = window.setInterval(tick, 500)
    document.addEventListener("visibilitychange", tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener("visibilitychange", tick)
    }
  }, [startedAt])

  const left = startedAt === null ? WAIT_MS : remainingMs(startedAt, now)
  const gone = startedAt === null ? 0 : minutesGone(startedAt, now)

  useEffect(() => {
    if (startedAt === null || !sound || gone <= announced.current) return
    announced.current = gone
    tone(ctx.current)
  }, [gone, sound, startedAt])

  const wake = () => {
    try {
      if (!ctx.current && typeof AudioContext !== "undefined") ctx.current = new AudioContext()
      void ctx.current?.resume()
    } catch {
      // no sound available
    }
  }
  const running = startedAt !== null && left > 0
  const over = startedAt !== null && left === 0

  return (
    <section data-testid="sos-wait" className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-4">
      {startedAt !== null && (
        <div className="relative size-40">
          <svg viewBox="0 0 160 160" className="size-40 -rotate-90" aria-hidden>
            <circle cx={80} cy={80} r={RADIUS} fill="none" strokeWidth={8} className="stroke-muted" />
            <circle
              cx={80}
              cy={80}
              r={RADIUS}
              fill="none"
              strokeWidth={8}
              strokeLinecap="round"
              className="stroke-primary transition-[stroke-dashoffset] duration-500 ease-linear motion-reduce:transition-none"
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC * (1 - left / WAIT_MS)}
            />
          </svg>
          <span
            role="timer"
            aria-label={t.sos.waitLabel}
            data-testid="wait-clock"
            className="absolute inset-0 flex items-center justify-center text-3xl font-semibold tabular-nums"
          >
            {formatClock(left)}
          </span>
        </div>
      )}
      {over && <p data-testid="wait-over">{t.sos.waitDone}</p>}
      {running ? (
        <button
          type="button"
          data-testid="wait-stop"
          onClick={onStop}
          className="inline-flex min-h-11 items-center rounded-md border border-border px-4"
        >
          {t.sos.waitStop}
        </button>
      ) : (
        <button
          type="button"
          data-testid="wait-start"
          onClick={() => {
            wake()
            onStart()
          }}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-md border border-primary px-4 text-primary"
        >
          {t.sos.waitStart}
        </button>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={sound}
        aria-label={t.sos.soundLabel}
        data-testid="wait-sound"
        onClick={() => {
          wake()
          onSound(!sound)
        }}
        className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline"
      >
        {sound ? t.sos.soundOn : t.sos.soundOff}
      </button>
    </section>
  )
}

/** One soft tone. */
function tone(ctx: AudioContext | null) {
  try {
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "sine"
    osc.frequency.value = 528
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.1)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.4)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 1.5)
  } catch {
    // no sound available
  }
}

