"use client"

/**
 * Three small pieces of the real tool that NorthStarFlow keeps private (the errand ribbon, the plan's
 * step-by-step progress list and the quick add of a goal line), copied here unchanged so `/plan/new/s/<step>`
 * can draw the same markup (Plans/plan-new-from-real.md, Phase 3.3).
 *
 * Copied, not imported, only because NorthStarFlow.tsx is not edited in this phase. Once it may be, export
 * them from there and delete this file: the three functions below are the same text.
 */

import { useState } from "react"
import { ArrowLeft, Check } from "lucide-react"
import type { NorthStarTabId, NsPlan } from "@/src/goals/types"
import { COMMIT_EDIT_COPY, ERRAND_COPY, PROGRESS_COPY, SCORED_TABS, TAB_LABELS } from "@/src/goals/data/northStar"
import * as ns from "@/src/goals/northStarService"

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


/**
 * Empty ring, ring with a dot, filled ring.
 *
 * Three states because there are three: nothing here yet, something here, and
 * every box this step asks for is filled. Amber rather than green — green is


/**
 * THE PLAN, STEP BY STEP, at the top of Everything: the total, then one row
 * per scored step with its bar and percentage, each a link to the step.
 */
export function PlanProgressList({ progress, onGo }: { progress: ns.NsPlanProgress; onGo: (tab: NorthStarTabId) => void }) {
  return (
    <section data-testid="plan-progress" className="mb-6 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 sm:px-5">
      <h2 className="text-sm font-semibold text-zinc-100">{PROGRESS_COPY.total(progress.percent)}</h2>
      <div
        role="progressbar"
        aria-label={PROGRESS_COPY.total(progress.percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800"
      >
        <div className="h-full rounded-full bg-amber-400" style={{ width: `${progress.percent}%` }} />
      </div>
      <ul className="mt-3 divide-y divide-white/5">
        {SCORED_TABS.map((tab) => {
          const pct = ns.percentDown(progress.steps[tab].fraction)
          return (
            <li key={tab}>
              <button type="button" onClick={() => onGo(tab)} className="flex w-full items-center gap-3 py-2 text-left hover:bg-white/[0.03] rounded-md">
                <span className="w-28 shrink-0 truncate text-[12.5px] text-zinc-200 sm:w-40">{TAB_LABELS[tab]}</span>
                <span aria-hidden className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-zinc-800">
                  <span className="block h-full rounded-full bg-amber-400/80" style={{ width: `${pct}%` }} />
                </span>
                <span className="w-10 shrink-0 text-right text-[12px] tabular-nums text-zinc-400">{PROGRESS_COPY.percent(pct)}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}


/**
 * One line, into any area, from the page that reads the plan back.
 *
 * The commonest thing somebody does while reading their own plan is remember
 * something that is not in it. Sending them four steps back to write it down is
 * how it stays not in it.
 */
export function QuickAdd({ plan, onAdd }: { plan: NsPlan; onAdd: (areaId: string, text: string) => void }) {
  const [areaId, setAreaId] = useState(plan.areas[0]?.id ?? "")
  const [text, setText] = useState("")
  const add = () => {
    if (!text.trim() || !areaId) return
    onAdd(areaId, text)
    setText("")
  }
  return (
    <div className="flex flex-wrap items-center gap-2 px-5 py-3">
      <select
        value={areaId}
        onChange={(e) => setAreaId(e.target.value)}
        aria-label={COMMIT_EDIT_COPY.addArea}
        className="shrink-0 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11.5px] text-zinc-200 focus:outline-none focus:border-white/30"
      >
        {plan.areas.map((a) => <option key={a.id} value={a.id} className="bg-zinc-900">{a.label}</option>)}
      </select>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add() } }}
        placeholder={COMMIT_EDIT_COPY.addPlaceholder}
        aria-label={COMMIT_EDIT_COPY.add}
        className="min-w-0 flex-1 bg-transparent border-b border-white/15 focus:border-white/35 text-[12.5px] text-zinc-100 placeholder:text-zinc-700 focus:outline-none py-1 transition-colors"
      />
      <button
        onClick={add}
        disabled={!text.trim()}
        className="shrink-0 text-[11.5px] px-2.5 py-1 rounded-lg border border-white/15 text-zinc-100 hover:bg-white/10 disabled:opacity-30 transition-colors"
      >
        {COMMIT_EDIT_COPY.add}
      </button>
    </div>
  )
}
