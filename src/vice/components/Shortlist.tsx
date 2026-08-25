"use client"

/**
 * The short version.
 *
 * Ten things ranked by how many independent sources name them, most of which
 * happen away from this screen. It is the shortest path in the module and the
 * only one built from the evidence ranking rather than from a single school of
 * thought.
 *
 * The count at the top is deliberately not a streak and says so. What it
 * counts is how many structural changes are true right now, because the one
 * signal separating the accounts that held from the ones that did not was
 * whether the plan rested on structure or on self-trust.
 */

import type { ViceHandlers, ViceState, ViceToolId } from "../types"
import { SHORTLIST, SHORTLIST_COPY } from "../data/shortlist"
import { Why } from "./Ui"

/** Items that route to an existing tool rather than to the world. */
const TOOL_FOR: Record<string, ViceToolId> = {
  tripwire: "tripwire",
  refusal: "card",
}

export function Shortlist({ state, on }: { state: ViceState; on: ViceHandlers }) {
  const done = state.lists["shortlist.done"] ?? []
  const inPlace = SHORTLIST.filter((i) => done.includes(i.id)).length
  // Sorted by the number shown beside each item. The page claims to be "in the
  // order the evidence puts them", and a nine-source item sitting below an
  // eight-source one makes that claim visibly false on the first read.
  const ordered = [...SHORTLIST].sort((a, b) => b.recurrence - a.recurrence)

  return (
    <div>
      <div className="flex items-baseline gap-3">
        <h2 className="text-lg font-semibold text-white">{SHORTLIST_COPY.title}</h2>
        <span className="ml-auto text-[12px] text-zinc-500 tabular-nums">
          {inPlace}/{SHORTLIST.length} {SHORTLIST_COPY.countLabel}
        </span>
      </div>
      <p className="text-[13px] text-zinc-400 mt-1 leading-relaxed">{SHORTLIST_COPY.blurb}</p>
      <Why label="why none of this is motivational"><p>{SHORTLIST_COPY.frame}</p></Why>

      <ul className="space-y-2 mt-4">
        {ordered.map((item) => {
          const ticked = done.includes(item.id)
          const tool = TOOL_FOR[item.id]
          return (
            <li
              key={item.id}
              className={`rounded-xl border p-3.5 transition-colors ${
                ticked ? "border-emerald-400/30 bg-emerald-500/[0.06]" : "border-white/10 bg-white/[0.02]"
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={ticked}
                  aria-label={item.label}
                  onClick={() => on.toggleListItem("shortlist.done", item.id)}
                  className={`mt-0.5 size-4 shrink-0 rounded border transition-colors ${
                    ticked ? "border-emerald-400/60 bg-emerald-500/40" : "border-white/25 hover:border-white/50"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-[13.5px] leading-snug ${ticked ? "text-emerald-50" : "text-zinc-100"}`}>
                    {item.label}
                  </p>
                  <p className="text-[12px] text-zinc-500 mt-1 leading-relaxed">{item.does}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                    <span className="text-[10.5px] text-zinc-600 tabular-nums">
                      {item.recurrence} sources
                    </span>
                    {item.offScreen && (
                      <span className="text-[10.5px] text-zinc-600">{SHORTLIST_COPY.offScreenBadge}</span>
                    )}
                    {/* The cross-behaviour finding, marked per item rather than
                        explained once and forgotten. */}
                    {item.needsPerson && (
                      <span className="text-[10.5px] text-amber-200/70">{SHORTLIST_COPY.personBadge}</span>
                    )}
                    {tool && (
                      <button
                        onClick={() => on.openTool(tool)}
                        className="text-[10.5px] text-violet-300/80 hover:text-violet-200 underline underline-offset-2 decoration-violet-400/30 transition-colors"
                      >
                        do it here
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <p className="text-[12px] text-zinc-500 mt-4 leading-relaxed">
        {inPlace === 0 ? SHORTLIST_COPY.empty : inPlace === SHORTLIST.length ? SHORTLIST_COPY.allDone : SHORTLIST_COPY.eject}
      </p>
      <Why label="why the number is not a streak"><p>{SHORTLIST_COPY.countNote}</p></Why>
    </div>
  )
}
