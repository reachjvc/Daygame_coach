"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { formatClock } from "../shared/clock"
import { useInterval } from "../shared/hooks"
import { InferredTag, Placeholder } from "../shared/Bits"
import { useLabState } from "../../store"
import { COLS, ROWS, newSnake, step, turn, type Dir, type SnakeState } from "./snake"
import { cText } from "./text"

const SESSION_SECONDS = 180
const TICK_MS = 150

/** The timed snake game: four arrow buttons (or swipe, or keys), score, pause, a session clock. */
export function SnakeGame({ onBack }: { onBack: () => void }) {
  const [total, setTotal] = useLabState<number>("sos", "c", "total", 0)
  const [state, setState] = useState<SnakeState>(() => newSnake(Math.random))
  const [left, setLeft] = useState(SESSION_SECONDS)
  const [paused, setPaused] = useState(false)
  const dirRef = useRef<Dir>("right")
  const counted = useRef(false)
  const swipe = useRef<{ x: number; y: number } | null>(null)

  const ended = !state.alive || left <= 0
  const running = !ended && !paused

  useInterval(() => setState((s) => step(s, dirRef.current, Math.random)), running ? TICK_MS : null)
  useInterval(() => setLeft((l) => l - 1), running ? 1000 : null)

  useEffect(() => {
    if (!ended || counted.current) return
    counted.current = true
    setTotal(total + state.score)
    // runs once when the run ends
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ended])

  const go = useCallback((d: Dir) => {
    dirRef.current = turn(dirRef.current, d)
  }, [])

  useEffect(() => {
    const keys: Record<string, Dir> = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" }
    const onKey = (e: KeyboardEvent) => {
      const d = keys[e.key]
      if (!d) return
      e.preventDefault()
      go(d)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [go])

  const again = () => {
    setState(newSnake(Math.random))
    setLeft(SESSION_SECONDS)
    setPaused(false)
    dirRef.current = "right"
    counted.current = false
  }

  if (ended) {
    return (
      <section data-testid="snake-result" className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <h2 className="flex-1 text-lg font-semibold">{state.alive ? cText.resultTitle : cText.deadTitle}</h2>
          <InferredTag />
        </div>
        <p className="text-sm text-muted-foreground">{cText.resultScore}</p>
        <p data-testid="result-score" className="text-4xl font-semibold tabular-nums">
          {state.score}
        </p>
        <Placeholder />
        <button type="button" data-testid="play-again" onClick={again} className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-4 text-primary-foreground">
          {cText.playAgain}
        </button>
        <button type="button" data-testid="result-back" onClick={onBack} className="inline-flex min-h-11 items-center justify-center text-sm text-muted-foreground underline">
          {cText.gameBack}
        </button>
      </section>
    )
  }

  const head = state.snake[0]
  const arrow = (d: Dir, label: string, glyph: string) => (
    <button
      type="button"
      data-testid={`dpad-${d}`}
      aria-label={label}
      onClick={() => go(d)}
      className="inline-flex size-12 items-center justify-center rounded-full border border-white/70 text-xl text-pink-500"
    >
      {glyph}
    </button>
  )
  return (
    <section data-testid="snake" className="flex min-h-[calc(100dvh-7rem)] flex-col gap-3 rounded-lg bg-black p-3 text-white">
      <button type="button" data-testid="snake-back" onClick={onBack} className="inline-flex min-h-11 items-center self-start text-sm text-white/70 underline">
        {cText.gameBack}
      </button>
      <svg
        viewBox={`0 0 ${COLS} ${ROWS}`}
        className="w-full touch-none rounded-md bg-[#12010d]"
        data-testid="snake-board"
        onPointerDown={(e) => {
          swipe.current = { x: e.clientX, y: e.clientY }
        }}
        onPointerUp={(e) => {
          const s = swipe.current
          swipe.current = null
          if (!s) return
          const dx = e.clientX - s.x
          const dy = e.clientY - s.y
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return
          go(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up")
        }}
      >
        {state.food.map((f, i) => (
          <rect key={i} data-testid="food" x={f.x + 0.15} y={f.y + 0.15} width="0.7" height="0.7" fill="#7dd3fc" opacity="0.8" />
        ))}
        {state.snake.map((p, i) => (
          <rect key={i} data-testid={i === 0 ? "snake-head" : "snake-part"} x={p.x + 0.05} y={p.y + 0.05} width="0.9" height="0.9" fill={i === 0 ? "#ffffff" : "#d4009f"} />
        ))}
        <text x={head.x + 1.2} y={head.y + 0.2} fontSize="1.6" fontWeight="700" fill="#ffffff" data-testid="run-score">
          {state.score}
        </text>
      </svg>
      <div className="flex flex-col items-center gap-1">
        {arrow("up", cText.up, "⌃")}
        <div className="flex gap-16">
          {arrow("left", cText.left, "‹")}
          {arrow("right", cText.right, "›")}
        </div>
        {arrow("down", cText.down, "⌄")}
      </div>
      <div className="mt-auto flex items-end justify-between">
        <div>
          <div className="text-xs text-white/70">{cText.score}</div>
          <div data-testid="total-score" className="text-2xl font-semibold tabular-nums">
            {total + state.score}
          </div>
        </div>
        <button type="button" data-testid="pause" onClick={() => setPaused((p) => !p)} className="min-h-11 rounded-full border border-white/70 px-8 text-sm font-semibold">
          {paused ? cText.resume : cText.pause}
        </button>
        <div className="text-right">
          <div className="text-xs text-white/70">{cText.time}</div>
          <div data-testid="time" className="text-2xl font-semibold tabular-nums">
            {formatClock(left)}
          </div>
        </div>
      </div>
    </section>
  )
}
