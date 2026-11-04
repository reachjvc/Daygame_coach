"use client"

/**
 * WHEN THIS NORTH STAR STARTED, THE ONES BEFORE IT, AND THE WAY TO START ANEW.
 *
 * Writing a new paragraph over the old one used to destroy it. Now "Start a new
 * north star" keeps the current one, with the day it ended and the answers it
 * had, and the old ones are listed here (Plans/life-plan-rebuild.md, Phase 2).
 * Two presses, because the box it empties is the biggest piece of writing in
 * the plan.
 */

import { useState } from "react"
import type { NsPlan } from "@/src/goals/types"

function day(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

export function NorthStarHistory({ plan, onNewNorthStar }: { plan: NsPlan; onNewNorthStar: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const [open, setOpen] = useState(false)
  const past = [...plan.pastNorthStars].reverse()
  const written = plan.northStar.trim().length > 0

  return (
    <div className="mt-4 pt-3 border-t border-white/10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] text-zinc-500">
          {plan.northStarStartedOn ? `This north star since ${day(plan.northStarStartedOn)}` : "Not saved yet"}
        </span>
        {written &&
          (confirming ? (
            <span className="flex items-center gap-2 text-[11px]">
              <span className="text-zinc-400">Keep this one as history and start an empty one?</span>
              <button
                onClick={() => {
                  setConfirming(false)
                  onNewNorthStar()
                }}
                className="px-2 py-1 rounded-md border border-violet-400/40 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25 transition-colors"
              >
                Start a new one
              </button>
              <button onClick={() => setConfirming(false)} className="px-2 py-1 text-zinc-500 hover:text-zinc-300 transition-colors">
                Cancel
              </button>
            </span>
          ) : (
            <button onClick={() => setConfirming(true)} className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">
              Start a new north star
            </button>
          ))}
      </div>

      {past.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {open ? "Hide" : "Show"} earlier north stars ({past.length})
          </button>
          {open && (
            <ol className="mt-2 space-y-2">
              {past.map((p) => (
                <li key={p.id} className="rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-3">
                  <p className="text-[11px] text-zinc-500 tabular-nums">
                    {day(p.startedOn)} – {day(p.endedOn)} · {p.horizonYears} years
                  </p>
                  <p className="mt-1 text-[12.5px] text-zinc-300 leading-relaxed whitespace-pre-line">
                    {p.text.trim() || "(no paragraph written)"}
                  </p>
                  {p.answers.star_why && (
                    <p className="mt-1.5 text-[11.5px] text-zinc-500 leading-relaxed">Why: {p.answers.star_why}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  )
}
