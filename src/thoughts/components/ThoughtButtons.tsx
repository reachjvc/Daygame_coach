"use client"

/**
 * YOUR THOUGHTS AS BUTTONS: one tap says "it happened again".
 *
 * Holding a button (or right-clicking it) opens that thought's own sheet
 * instead; "Show all" opens it too, for a keyboard or anyone who does not
 * know to hold. A tap must never be mistaken for a hold, so a finger that
 * moves more than a few pixels (a scroll) is neither.
 */

import { useRef, useState } from "react"
import { cn } from "@/lib/utils"
import type { Thought } from "../types"

const HOLD_MS = 450
const MOVE_PX = 10

export function ThoughtButton({
  thought,
  pending,
  onTap,
  onHold,
  size = "default",
}: {
  thought: Thought
  pending: number
  onTap: (t: Thought) => void
  onHold?: (t: Thought) => void
  size?: "default" | "large"
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const held = useRef(false)
  const [flash, setFlash] = useState(0)

  const clear = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }

  const today = thought.counts.today
  const label = `${thought.text}. ${today === 1 ? "Once" : `${today} times`} today.${pending > 0 ? " Saved on this phone, not sent yet." : ""}`

  return (
    <button
      type="button"
      aria-label={label}
      data-testid="thought-button"
      onPointerDown={(e) => {
        held.current = false
        start.current = { x: e.clientX, y: e.clientY }
        if (!onHold) return
        clear()
        timer.current = setTimeout(() => {
          held.current = true
          onHold(thought)
        }, HOLD_MS)
      }}
      onPointerMove={(e) => {
        if (!start.current) return
        if (Math.abs(e.clientX - start.current.x) > MOVE_PX || Math.abs(e.clientY - start.current.y) > MOVE_PX) {
          clear()
          start.current = null
        }
      }}
      onPointerUp={clear}
      onPointerCancel={() => {
        clear()
        start.current = null
      }}
      onContextMenu={(e) => {
        if (!onHold) return
        e.preventDefault()
        clear()
        held.current = true
        onHold(thought)
      }}
      onClick={() => {
        if (held.current) {
          held.current = false
          return
        }
        onTap(thought)
        setFlash((n) => n + 1)
      }}
      className={cn(
        "relative flex max-w-full touch-manipulation select-none items-center gap-2.5 rounded-2xl border text-left leading-snug transition-[transform,background-color,border-color] duration-150 active:scale-[0.97]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        size === "large" ? "min-h-12 w-full px-4 py-3 text-base" : "min-h-11 px-3.5 py-2 text-[15px]",
        thought.pinned ? "border-primary/40 bg-primary/10" : "border-border bg-card hover:border-muted-foreground/50",
      )}
    >
      {flash > 0 && (
        <span
          key={flash}
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl bg-primary/25 motion-safe:animate-[thought-flash_600ms_ease-out_forwards] motion-reduce:hidden"
        />
      )}
      <span className="min-w-0 flex-1 break-words">{thought.text}</span>
      <span
        aria-hidden
        className={cn(
          "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
          today > 0 ? "bg-background/60 text-foreground" : "text-muted-foreground",
        )}
      >
        {today}
      </span>
      {pending > 0 && <span aria-hidden className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-background bg-amber-400" />}
    </button>
  )
}

export function ThoughtButtons({
  thoughts,
  pending,
  onTap,
  onHold,
  size,
}: {
  thoughts: Thought[]
  pending: Map<string, number>
  onTap: (t: Thought) => void
  onHold?: (t: Thought) => void
  size?: "default" | "large"
}) {
  return (
    <ul className={cn("flex flex-wrap gap-2", size === "large" && "flex-col")} aria-label="Your thoughts">
      {thoughts.map((t) => (
        <li key={t.id} className={cn("max-w-full", size === "large" && "w-full")}>
          <ThoughtButton thought={t} pending={pending.get(t.id) ?? 0} onTap={onTap} onHold={onHold} size={size} />
        </li>
      ))}
    </ul>
  )
}
