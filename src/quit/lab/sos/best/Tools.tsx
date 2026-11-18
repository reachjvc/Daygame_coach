"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { EvidenceChip, SourceTap } from "../../../components/kit"
import { realRefs, usable } from "../../../tools/common"
import type { QuitAddiction, QuitOption, QuitResponse, QuitNeed } from "../../../types"
import { useLabState } from "../../store"
import { addTile, canMove, move, newBoard, type Board, type Dir } from "../a/game2048"
import { BUBBLE_COUNT, buildDeck, freshSheet, moveSwap, nextCard, pop, poppedCount, prevCard, sheetDone, startCard } from "./logic"
import { bestText as t } from "./text"

/** Shown where an addiction's data file has no content for a tool yet. */
export function ContentComing() {
  return (
    <p data-testid="content-coming" className="rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
      {t.contentComing}
    </p>
  )
}

function Frame({ id, title, line, onBack, children }: { id: string; title: string; line: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <section data-testid={`tool-${id}`} className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button type="button" data-testid="tool-back" onClick={onBack} aria-label={t.back} className="inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-border text-xl">
          {"←"}
        </button>
        <h2 className="min-w-0 flex-1 text-lg font-semibold">{title}</h2>
      </div>
      <p className="text-sm text-muted-foreground">{line}</p>
      {children}
    </section>
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

const TILE: Record<number, string> = {
  2: "bg-stone-200 text-stone-800",
  4: "bg-amber-200 text-stone-800",
  8: "bg-orange-300 text-stone-900",
  16: "bg-orange-400 text-stone-900",
  32: "bg-orange-500 text-white",
  64: "bg-red-500 text-white",
  128: "bg-yellow-300 text-stone-900",
  256: "bg-yellow-400 text-stone-900",
  512: "bg-yellow-500 text-stone-900",
  1024: "bg-lime-400 text-stone-900",
  2048: "bg-emerald-400 text-stone-900",
}

/** The block puzzle: the 2048 rules from the lab's game logic, swipe or arrow keys. */
export function Blocks({ onBack }: { onBack: () => void }) {
  const [best, setBest] = useLabState<number>("sos", "best", "best2048", 0)
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
      if (total > best) setBest(total)
      if (!canMove(next)) setOver(true)
    },
    [board, score, best, over, setBest],
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
            className={`flex aspect-square items-center justify-center rounded-md text-xl font-bold ${n ? (TILE[n] ?? "bg-emerald-500 text-white") : "bg-muted/50"}`}
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

/** Move for five minutes: the swap and its sources, straight from the data file. */
export function Move({ data, onBack }: { data: QuitAddiction; onBack: () => void }) {
  const needs = usable<QuitNeed[]>(data.needs)
  const swap = moveSwap(needs)
  return (
    <Frame id="move" title={t.tools.move} line={t.moveLine} onBack={onBack}>
      {swap ? (
        <div data-testid="move-card" className="rounded-lg border border-border bg-card p-3">
          <h3 className="text-sm text-muted-foreground">{t.moveEvidence}</h3>
          <p className="mt-1 text-base">{swap.text}</p>
          <div className="mt-2">
            <EvidenceChip evidence={swap.evidence} />
          </div>
          <SourceTap refs={realRefs(swap.refs)} />
        </div>
      ) : (
        <ContentComing />
      )}
    </Frame>
  )
}

/** Help for this moment: pick the situation, then one idea at a time. */
export function Help({ data, onBack }: { data: QuitAddiction; onBack: () => void }) {
  const moments = usable<QuitOption[]>(data.riskyMoments)
  const deck = buildDeck(usable<QuitResponse[]>(data.responses), usable<QuitNeed[]>(data.needs))
  const [moment, setMoment] = useState<number | null>(null)
  const [i, setI] = useState(0)
  const card = deck[i]
  return (
    <Frame id="help" title={t.tools.help} line={t.helpLine} onBack={onBack}>
      {!moments || deck.length === 0 ? (
        <ContentComing />
      ) : (
        <>
          <div role="radiogroup" aria-label={t.helpMoment} className="flex flex-wrap gap-2">
            {moments.map((m, idx) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={moment === idx}
                data-testid={`moment-${m.id}`}
                onClick={() => {
                  setMoment(idx)
                  setI(startCard(idx, deck.length))
                }}
                className={`inline-flex min-h-11 items-center rounded-full border px-3 text-sm ${moment === idx ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
              >
                {m.label}
              </button>
            ))}
          </div>
          {moment !== null && card && (
            <div data-testid="help-card" className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">
                {t.helpCard} <span data-testid="help-pos">{i + 1}</span> {t.helpOf} {deck.length}
              </p>
              <p data-testid="help-text" className="min-h-16 text-lg">
                {card.text}
              </p>
              {card.swap && (
                <div>
                  <EvidenceChip evidence={card.swap.evidence} />
                  <SourceTap refs={realRefs(card.swap.refs)} />
                </div>
              )}
              <div className="flex items-center justify-between">
                <button type="button" data-testid="help-prev" aria-label={t.helpPrev} onClick={() => setI(prevCard(i, deck.length))} className="inline-flex size-12 items-center justify-center rounded-md border border-border text-2xl">
                  {"‹"}
                </button>
                <button type="button" data-testid="help-next" aria-label={t.helpNext} onClick={() => setI(nextCard(i, deck.length))} className="inline-flex size-12 items-center justify-center rounded-md border border-primary text-2xl text-primary">
                  {"›"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Frame>
  )
}

/** His own reasons and money kept, written by him and kept in this browser. */
export function Reasons({ addiction, onBack }: { addiction: string; onBack: () => void }) {
  const [reason, setReason] = useLabState<string>("sos", "best", `reason-${addiction}`, "")
  const [money, setMoney] = useLabState<string>("sos", "best", `money-${addiction}`, "")
  return (
    <Frame id="reasons" title={t.tools.reasons} line={t.reasonsLine} onBack={onBack}>
      <label className="flex flex-col gap-1 text-sm">
        {t.reasonsLabel}
        <textarea
          data-testid="reason-input"
          value={reason}
          maxLength={300}
          rows={3}
          placeholder={t.reasonsPlaceholder}
          onChange={(e) => setReason(e.target.value)}
          className="rounded-md border border-border bg-card p-3 text-base"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {t.moneyLabel}
        <input
          data-testid="money-input"
          inputMode="decimal"
          value={money}
          maxLength={9}
          onChange={(e) => setMoney(e.target.value.replace(/[^0-9.]/g, ""))}
          className="min-h-12 rounded-md border border-border bg-card px-3 text-base"
        />
      </label>
      {reason.trim() && (
        <p data-testid="reason-shown" className="rounded-lg border border-border bg-card p-3 text-lg">
          {reason}
        </p>
      )}
      {money.trim() && (
        <p data-testid="money-shown" className="text-2xl font-semibold tabular-nums">
          {money} {t.moneyUnit}
        </p>
      )}
    </Frame>
  )
}
