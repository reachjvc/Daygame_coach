"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useLabState } from "../../store"
import { addTile, canMove, move, newBoard, type Board, type Dir } from "./game2048"
import { aText } from "./text"

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

/** The 2048 game: swipe or arrow keys, tiles slide and merge, restart keeps the best score. */
export function Game2048({ onBack }: { onBack: () => void }) {
  const [best, setBest] = useLabState<number>("sos", "a", "best2048", 0)
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

  const restart = () => {
    setBoard(newBoard(Math.random))
    setScore(0)
    setOver(false)
  }

  return (
    <section data-testid="game-2048" className="flex flex-col gap-4 rounded-lg bg-black/30 p-3">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} aria-label={aText.cravingTitle} data-testid="game-back" className="inline-flex size-11 items-center justify-center text-xl">
          {"←"}
        </button>
        <h2 className="flex-1 text-center text-base font-semibold">{aText.playTitle}</h2>
        <button type="button" onClick={restart} aria-label={aText.restart} data-testid="game-restart" className="inline-flex size-11 items-center justify-center text-xl">
          {"↻"}
        </button>
        <button type="button" aria-label={aText.menu} className="inline-flex size-11 items-center justify-center text-xl">
          {"⋮"}
        </button>
      </div>
      <div className="flex justify-between px-1 text-sm">
        <div>
          <div data-testid="score" className="text-xl font-semibold tabular-nums">
            {score}
          </div>
          <div className="text-muted-foreground">{aText.score}</div>
        </div>
        <div className="text-right">
          <div data-testid="best" className="text-xl font-semibold tabular-nums">
            {best}
          </div>
          <div className="text-muted-foreground">{aText.best}</div>
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
            className={`flex aspect-square items-center justify-center rounded-md text-xl font-bold ${n ? (TILE[n] ?? "bg-emerald-500 text-white") : "bg-muted/50"}`}
          >
            {n || ""}
          </div>
        ))}
      </div>
      {over && (
        <p data-testid="game-over" className="text-center text-sm text-muted-foreground">
          {aText.gameOver}
        </p>
      )}
    </section>
  )
}
