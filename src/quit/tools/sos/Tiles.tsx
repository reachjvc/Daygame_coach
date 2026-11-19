"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CountedLine, SourceTap, EvidenceChip, Chips } from "../../components/kit"
import { fill, tooltext as tt } from "../../tooltext"
import type { Evidence, QuitBelief, QuitMomentSwap, QuitOption, QuitRef } from "../../types"
import { usable } from "../common"
import { BeliefBasis } from "../beliefs/BeliefBasis"
import { addTile, canMove, move, newBoard, type Board, type Dir } from "./game2048"
import { BUBBLE_COUNT, freshSheet, pop, poppedCount, sheetDone } from "./bubbles"
import { lineForMoment, showThen, withStop, type Line } from "../ifthen/logic"
import { beliefOf, MOVE_MS, niceDay, OTHER, ringClock, type Kept } from "./logic"

const t = tt.sos

function Frame({ id, title, line, onBack, children }: { id: string; title: string; line?: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <section data-testid={`tool-${id}`} className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button type="button" data-testid="tool-back" onClick={onBack} aria-label={t.back} className="inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-border text-xl">
          {"←"}
        </button>
        <h2 className="min-w-0 flex-1 text-lg font-semibold">{title}</h2>
      </div>
      {line && <p className="text-sm text-muted-foreground">{line}</p>}
      {children}
    </section>
  )
}

/** What is it telling you: the voice chips, then "The other side" with its proof and basis. */
export function Voice({ beliefs, value, onPick, onBack }: { beliefs: QuitBelief[]; value: string | null; onPick: (id: string) => void; onBack: () => void }) {
  const options = [...beliefs.map((b) => ({ id: b.id, label: usable<string>(b.short) ?? b.id })), { id: OTHER, label: t.somethingElse }]
  const belief = beliefOf(value, beliefs)
  // The answer can land below the screen on a phone: bring it into view when a voice is picked.
  useEffect(() => {
    if (value) document.querySelector('[data-testid="sos-counterpart"], [data-testid="sos-other"]')?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [value])
  return (
    <Frame id="voice" title={t.tools.voice} onBack={onBack}>
      <p className="font-medium">{t.voiceQuestion}</p>
      <Chips label={t.voiceQuestion} options={options} value={value ? [value] : []} onChange={(next) => onPick(next[0])} />
      {belief && (
        <section data-testid="sos-counterpart" className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm text-muted-foreground">{t.otherSide}</h3>
          <p className="text-lg font-medium">{belief.counterpart}</p>
          <h3 className="mt-3 text-sm text-muted-foreground">{t.proofLabel}</h3>
          <p>{belief.proof}</p>
          <CountedLine text={belief.counted} />
          <BeliefBasis item={belief} testId="sos-basis" />
        </section>
      )}
      {value === OTHER && (
        <p data-testid="sos-other" className="text-base">
          {t.otherNote}
        </p>
      )}
    </Frame>
  )
}

/** Hold the button to breathe out: the circle follows his own breath, not a fixed pace. */
export function Breathe({ onBack }: { onBack: () => void }) {
  const [held, setHeld] = useState(false)
  const [last, setLast] = useState<number | null>(null)
  const [count, setCount] = useState(0)
  const since = useRef(0)
  const down = () => {
    if (held) return
    since.current = Date.now()
    setHeld(true)
  }
  const up = () => {
    if (!held) return
    setLast(Math.round((Date.now() - since.current) / 100) / 10)
    setCount((c) => c + 1)
    setHeld(false)
  }
  return (
    <Frame id="breathe" title={t.tools.breathe} line={t.breatheLine} onBack={onBack}>
      <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-card p-4">
        <div className="flex h-56 items-center justify-center">
          <div
            data-testid="breathe-circle"
            data-held={held}
            className="flex size-52 items-center justify-center rounded-full border-4 border-primary/60 bg-primary/10"
            style={{ transform: `scale(${held ? 0.45 : 1})`, transition: held ? "transform 8s linear" : "transform 4s ease-out" }}
          />
        </div>
        <p data-testid="breathe-word" className="text-xl font-semibold">
          {held ? t.breatheOut : t.breatheIn}
        </p>
        <button
          type="button"
          data-testid="breathe-hold"
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
          className="min-h-16 w-full touch-none select-none rounded-full border-2 border-primary bg-primary/20 text-lg font-medium"
        >
          {t.breatheHold}
        </button>
        <p className="text-sm text-muted-foreground">
          <span>{t.breatheCount}: </span>
          <span data-testid="breathe-count">{count}</span>
          {last !== null && (
            <span>
              {" · "}
              {t.breatheLast}: <span data-testid="breathe-last">{last}</span> {t.seconds}
            </span>
          )}
        </p>
      </div>
    </Frame>
  )
}

/** Bubble wrap: no rules, no score to beat. */
export function Bubbles({ onBack }: { onBack: () => void }) {
  const [sheet, setSheet] = useState<boolean[]>(freshSheet)
  const popOne = (i: number) => {
    if (sheet[i]) return
    try {
      navigator.vibrate?.(8)
    } catch {
      // no vibration available
    }
    setSheet((s) => pop(s, i))
  }
  return (
    <Frame id="bubbles" title={t.tools.bubbles} line={t.bubblesLine} onBack={onBack}>
      <div data-testid="bubble-sheet" className="grid grid-cols-6 gap-2 rounded-lg border border-border bg-card p-3">
        {sheet.map((popped, i) => (
          <button
            key={i}
            type="button"
            data-testid="bubble"
            data-popped={popped}
            aria-label={t.bubblePop}
            aria-pressed={popped}
            onClick={() => popOne(i)}
            className={`aspect-square min-h-11 rounded-full border transition-transform ${popped ? "scale-75 border-border bg-muted/40" : "border-primary/60 bg-primary/20 shadow-inner active:scale-90"}`}
          />
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {t.bubblesPopped}: <span data-testid="bubble-count">{poppedCount(sheet)}</span> / {BUBBLE_COUNT}
      </p>
      {sheetDone(sheet) && (
        <button type="button" data-testid="bubble-new" onClick={() => setSheet(freshSheet())} className="min-h-12 rounded-md border border-primary px-4 text-primary">
          {t.bubblesNew}
        </button>
      )}
    </Frame>
  )
}

/** A block's colour: the part's own colour (the theme's primary), stronger the bigger the number. */
function tileStyle(n: number): { backgroundColor: string; color: string } {
  const level = Math.min(11, Math.max(1, Math.round(Math.log2(n))))
  const pct = Math.min(100, 8 + level * 9)
  return {
    backgroundColor: `color-mix(in oklab, var(--primary) ${pct}%, var(--card))`,
    color: pct >= 56 ? "var(--primary-foreground)" : "var(--foreground)",
  }
}

/** The block puzzle: swipe or arrow keys. */
export function Blocks({ best, onBest, onBack }: { best: number; onBest: (n: number) => void; onBack: () => void }) {
  const [board, setBoard] = useState<Board>(() => newBoard(Math.random))
  const [score, setScore] = useState(0)
  const [over, setOver] = useState(false)
  const start = useRef<{ x: number; y: number } | null>(null)

  const play = useCallback(
    (dir: Dir) => {
      if (over) return
      const r = move(board, dir)
      if (!r.moved) return
      const next = addTile(r.board, Math.random)
      const total = score + r.gained
      setBoard(next)
      setScore(total)
      if (total > best) onBest(total)
      if (!canMove(next)) setOver(true)
    },
    [board, score, best, over, onBest],
  )

  useEffect(() => {
    const keys: Record<string, Dir> = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" }
    const onKey = (e: KeyboardEvent) => {
      const d = keys[e.key]
      if (!d) return
      e.preventDefault()
      play(d)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [play])

  return (
    <Frame id="blocks" title={t.tools.blocks} line={t.blocksLine} onBack={onBack}>
      <div className="flex items-end justify-between gap-2 px-1 text-sm">
        <div>
          <div data-testid="score" className="text-xl font-semibold tabular-nums">
            {score}
          </div>
          <div className="text-muted-foreground">{t.score}</div>
        </div>
        <button
          type="button"
          data-testid="blocks-restart"
          onClick={() => {
            setBoard(newBoard(Math.random))
            setScore(0)
            setOver(false)
          }}
          className="min-h-11 rounded-md border border-border px-4"
        >
          {t.restart}
        </button>
        <div className="text-right">
          <div data-testid="best" className="text-xl font-semibold tabular-nums">
            {best}
          </div>
          <div className="text-muted-foreground">{t.best}</div>
        </div>
      </div>
      <div
        data-testid="board"
        className="grid touch-none grid-cols-4 gap-2 rounded-lg bg-card p-2"
        onPointerDown={(e) => {
          start.current = { x: e.clientX, y: e.clientY }
        }}
        onPointerUp={(e) => {
          const s = start.current
          start.current = null
          if (!s) return
          const dx = e.clientX - s.x
          const dy = e.clientY - s.y
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return
          play(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up")
        }}
      >
        {board.flat().map((n, i) => (
          <div
            key={i}
            data-testid="tile"
            data-value={n}
            aria-label={t.tile}
            style={n ? tileStyle(n) : undefined}
            className={`flex aspect-square items-center justify-center rounded-md text-xl font-bold ${n ? "" : "bg-muted/50"}`}
          >
            {n || ""}
          </div>
        ))}
      </div>
      {over && (
        <p data-testid="blocks-over" className="text-center text-sm text-muted-foreground">
          {t.blocksOver}
        </p>
      )}
    </Frame>
  )
}

/** Move for a few minutes: a 5-minute countdown he starts, with the study behind it. */
export function Move({ evidence, refs, onBack }: { evidence: Evidence; refs: QuitRef[]; onBack: () => void }) {
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (startedAt === null) return
    const id = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(id)
  }, [startedAt])
  const left = startedAt === null ? MOVE_MS : Math.min(MOVE_MS, Math.max(0, MOVE_MS - (now - startedAt)))
  const running = startedAt !== null && left > 0
  return (
    <Frame id="move" title={t.moveTitle} line={t.moveLine} onBack={onBack}>
      <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-4">
        <span role="timer" aria-label={t.moveLabel} data-testid="move-clock" className="text-5xl font-semibold tabular-nums">
          {ringClock(left)}
        </span>
        {startedAt !== null && left === 0 && <p data-testid="move-done">{t.moveDone}</p>}
        {running ? (
          <button type="button" data-testid="move-stop" onClick={() => setStartedAt(null)} className="inline-flex min-h-12 w-full items-center justify-center rounded-md border border-border px-4">
            {t.moveStop}
          </button>
        ) : (
          <button
            type="button"
            data-testid="move-start"
            onClick={() => {
              const n = Date.now()
              setNow(n)
              setStartedAt(n)
            }}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-md border border-primary px-4 text-primary"
          >
            {startedAt === null ? t.moveStart : t.moveAgain}
          </button>
        )}
      </div>
      <div data-testid="move-basis" className="rounded-lg border border-border bg-card p-3 text-sm">
        <EvidenceChip evidence={evidence} />
        <p data-testid="move-finding" className="mt-2">{t.moveFinding}</p>
        <details className="mt-1">
          <summary className="flex min-h-11 cursor-pointer items-center font-medium">{t.basisTitle}</summary>
          <dl className="flex flex-col gap-2">
            <div>
              <dt className="text-muted-foreground">{tt.common.basis.design}</dt>
              <dd>{t.moveDesign}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{tt.common.basis.who}</dt>
              <dd>{t.moveWho}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{tt.common.basis.measured}</dt>
              <dd>{t.moveMeasured}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{tt.common.basis.caveat}</dt>
              <dd>{t.moveCaveat}</dd>
            </div>
          </dl>
        </details>
        <SourceTap refs={refs} />
      </div>
    </Frame>
  )
}

/** What to do right here: pick the place, its three cards show together. */
export function Help({ moments, swaps, plan, onBack }: { moments: QuitOption[]; swaps: QuitMomentSwap[]; plan: Line[]; onBack: () => void }) {
  const [picked, setPicked] = useState<string | null>(null)
  const cards = swaps.find((s) => s.momentId === picked)?.cards ?? []
  const mine = picked ? lineForMoment(plan, picked) : null
  return (
    <Frame id="help" title={t.tools.help} line={t.helpLine} onBack={onBack}>
      <Chips label={t.helpMoment} options={moments.map((m) => ({ id: m.id, label: m.label }))} value={picked ? [picked] : []} onChange={(next) => setPicked(next[0])} />
      {picked && (
        <ul data-testid="help-cards" className="flex flex-col gap-3">
          {mine && (
            <li data-testid="help-plan" className="rounded-lg border border-primary bg-card p-4 text-lg [overflow-wrap:anywhere]">
              <span className="block text-sm font-semibold text-muted-foreground">{t.yourPlan}</span>
              {showThen(mine.then)}
            </li>
          )}
          {cards.filter((c) => !mine || withStop(c).toLowerCase() !== withStop(mine.then).toLowerCase()).map((c) => (
            <li key={c} data-testid="help-card" className="rounded-lg border border-border bg-card p-4 text-lg">
              {c}
            </li>
          ))}
        </ul>
      )}
    </Frame>
  )
}

/** His reasons, and the money kept when his numbers allow it. */
export function Reasons({ reasons, onReasons, kept, quitDate, onBack }: { reasons: string; onReasons: (s: string) => void; kept: Kept | null; quitDate: string | null; onBack: () => void }) {
  const usd = (n: number, places = 2) => `$${n.toFixed(places)}`
  return (
    <Frame id="reasons" title={t.tools.reasons} line={t.reasonsLine} onBack={onBack}>
      <label className="flex flex-col gap-1 text-sm">
        {t.reasonsLabel}
        <textarea
          data-testid="reason-input"
          value={reasons}
          maxLength={300}
          rows={4}
          placeholder={t.reasonsPlaceholder}
          onChange={(e) => onReasons(e.target.value)}
          className="rounded-md border border-border bg-card p-3 text-base"
        />
      </label>
      {kept && quitDate && (
        <section data-testid="kept" className="rounded-lg border border-border bg-card p-4">
          <p data-testid="kept-amount" className="text-2xl font-semibold tabular-nums">
            {fill(t.kept, { amount: usd(kept.amountUsd, 0), date: niceDay(quitDate) })}
          </p>
          <p data-testid="kept-sum" className="mt-1 text-sm text-muted-foreground">
            {fill(t.keptSum, { perDay: kept.perDay, each: usd(kept.eachUsd, kept.eachUsd < 1 ? 3 : 2), days: kept.days, total: usd(kept.amountUsd) })}
          </p>
        </section>
      )}
    </Frame>
  )
}
