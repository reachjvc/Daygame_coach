"use client"

import { ArrowLeft, Check } from "lucide-react"
import { ERRAND_COPY } from "@/src/goals/data/northStar"

/**
 * THE ERRAND, ON THE SCREEN IT SENT YOU TO.
 *
 * Three things, because a jump needs all three to be worth making: what you
 * came here to do, the tick for it, and the way back. Without the third it is a
 * trapdoor — Today sends you to your north star at 07:00 and leaves you to find
 * your own way back through a rail of thirteen steps — and a trapdoor is a door
 * nobody uses twice.
 *
 * The tick writes to the same place Today's does, so "read my north star" ticked
 * here is ticked there. Rendered both in the page and inside the two dialogs: a
 * modal makes everything behind it inert, so a ribbon that only lived on the
 * page would be a way back you can see and cannot click.
 */
export function ErrandRibbon({
  label,
  done,
  onTick,
  onBack,
  onDismiss,
}: {
  label: string
  /** Null when there is nothing to tick — a goal opened to move its date. */
  done: boolean | null
  onTick: () => void
  onBack: () => void
  onDismiss: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-violet-400/35 bg-violet-500/10 px-4 py-2.5">
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] uppercase tracking-wide text-violet-300/70">{ERRAND_COPY.from}</span>
        <span className="block text-[12.5px] text-zinc-100 truncate">{label}</span>
      </span>
      {done !== null && (
        <button
          onClick={onTick}
          aria-pressed={done}
          className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11.5px] transition-colors ${
            done
              ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
              : "border-white/15 text-zinc-300 hover:border-white/35 hover:text-white"
          }`}
        >
          <Check className="size-3.5" />
          {done ? ERRAND_COPY.isDone : ERRAND_COPY.done}
        </button>
      )}
      <button
        onClick={onBack}
        aria-label={ERRAND_COPY.backAria}
        className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-violet-400/40 bg-violet-500/20 px-2.5 py-1.5 text-[11.5px] text-violet-50 hover:bg-violet-500/30 transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        {ERRAND_COPY.back}
      </button>
      <button
        onClick={onDismiss}
        aria-label={ERRAND_COPY.dismissAria}
        className="shrink-0 text-[10.5px] text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        {ERRAND_COPY.dismiss}
      </button>
    </div>
  )
}

