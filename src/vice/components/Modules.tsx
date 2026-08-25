"use client"

/**
 * The teaching spine: nine modules, each one idea, one exercise, real accounts.
 *
 * Collapsed by default so the whole course is scannable in one screen. Opening
 * one shows the takeaway first, then the exercise, then somebody who was in
 * that spot — the evidence stays folded, because the point of a module is to
 * get somebody to do the exercise, not to read the citation.
 */

import { useState } from "react"
import Link from "next/link"
import { Check, ChevronDown } from "lucide-react"
import type { ViceHandlers, ViceState } from "../types"
import { MODULES, MODULES_COPY } from "../data/modules"
import { OneVoice } from "./Voices"
import { Why } from "./Ui"

export function Modules({ state, on }: { state: ViceState; on: ViceHandlers }) {
  const [open, setOpen] = useState<string | null>(null)
  const read = state.lists["modules.read"] ?? []

  return (
    <div>
      <div className="flex items-baseline gap-3">
        <h2 className="text-lg font-semibold text-white">{MODULES_COPY.title}</h2>
        <span className="ml-auto text-[12px] text-zinc-500 tabular-nums">
          {read.length}/{MODULES.length} {MODULES_COPY.doneLabel}
        </span>
      </div>
      <p className="text-[13px] text-zinc-400 mt-1 leading-relaxed">{MODULES_COPY.blurb}</p>
      <Why label="why this order"><p>{MODULES_COPY.frame}</p></Why>

      <ol className="space-y-2 mt-4">
        {MODULES.map((m, i) => {
          const isOpen = open === m.id
          const isRead = read.includes(m.id)
          return (
            <li
              key={m.id}
              className={`rounded-2xl border overflow-hidden transition-colors ${
                isRead ? "border-emerald-400/25 bg-emerald-500/[0.04]" : "border-white/10 bg-white/[0.02]"
              }`}
            >
              <button
                onClick={() => setOpen(isOpen ? null : m.id)}
                aria-expanded={isOpen}
                className="w-full p-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                <span className="flex items-baseline gap-2.5">
                  <span className="text-[11px] text-zinc-600 tabular-nums shrink-0">
                    {isRead ? <Check className="size-3 text-emerald-400/70" /> : i + 1}
                  </span>
                  <span className="text-[15px] font-medium text-zinc-100">{m.title}</span>
                  <ChevronDown
                    className={`size-4 ml-auto shrink-0 text-zinc-600 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </span>
                <span className="block text-[12.5px] text-zinc-500 mt-1 leading-relaxed pl-6">{m.premise}</span>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pl-10 space-y-3">
                  {/* The takeaway first: somebody who reads only this line has
                      still got the useful part. */}
                  <div className="rounded-xl border border-violet-400/25 bg-violet-500/[0.06] px-3.5 py-2.5">
                    <p className="text-[11px] text-violet-200/60">{MODULES_COPY.takeawayLabel}</p>
                    <p className="text-[13.5px] text-violet-50 mt-0.5 leading-relaxed">{m.takeaway}</p>
                  </div>

                  {m.exercise.tool ? (
                    <button
                      onClick={() => on.openTool(m.exercise.tool!)}
                      className="block w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-left hover:border-violet-400/40 transition-colors"
                    >
                      <span className="text-[13.5px] text-zinc-100">{m.exercise.label}</span>
                      <span className="block text-[11px] text-zinc-600 mt-0.5">about {m.minutes} min</span>
                    </button>
                  ) : (
                    <Link
                      href={m.exercise.href ?? `/test/quit-vice/${m.exercise.flow}`}
                      className="block rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 hover:border-violet-400/40 transition-colors"
                    >
                      <span className="text-[13.5px] text-zinc-100">{m.exercise.label}</span>
                      <span className="block text-[11px] text-zinc-600 mt-0.5">about {m.minutes} min</span>
                    </Link>
                  )}

                  <OneVoice
                    stage={m.accounts}
                    viceId={state.viceId}
                    rotate={i}
                    heading={MODULES_COPY.accountsLabel}
                  />

                  <Why label={MODULES_COPY.evidenceLabel}><p>{m.evidence}</p></Why>

                  <button
                    onClick={() => on.toggleListItem("modules.read", m.id)}
                    className="text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {isRead ? "mark unread" : "mark as read"}
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ol>

      <p className="text-[11.5px] text-zinc-600 mt-4 leading-relaxed">{MODULES_COPY.ejectNote}</p>
      <Why label="what the count is"><p>{MODULES_COPY.progressNote}</p></Why>
    </div>
  )
}
