"use client"

import type { RefObject } from "react"
import type { NorthStarTabId } from "@/src/goals/types"
import { BUILD_STEPS, PROGRESS_COPY, RAIL_COPY, SCORED_TABS, TAB_BLURBS, TAB_LABELS, TAB_ORDER, USE_STEPS } from "@/src/goals/data/northStar"
import * as ns from "@/src/goals/northStarService"

/**
 * THE STEP PICKER: on a phone one line that opens the list, on a desktop the cards with their progress rings.
 *
 * Moved out of `NorthStarFlow` unchanged (Plans/plan-new-from-real.md, Phase 4). The caller keeps the open/closed state
 * and says what a pick does (`onPick`); `/plan` changes its tab, `/plan/new` goes to the step's screen.
 */
export function StepPicker({
  tab,
  inUse,
  states,
  planPct,
  railOpen,
  setRailOpen,
  showBuild,
  setBuildOpen,
  railToggleRef,
  onPick,
  order = TAB_ORDER,
}: {
  tab: NorthStarTabId
  inUse: boolean
  states: Record<NorthStarTabId, ns.NsStepState>
  planPct: ns.NsPlanProgress
  railOpen: boolean
  setRailOpen: (update: (open: boolean) => boolean) => void
  showBuild: boolean
  setBuildOpen: (update: (open: boolean) => boolean) => void
  railToggleRef: RefObject<HTMLButtonElement | null>
  onPick: (id: NorthStarTabId) => void
  /** The order and numbering of the steps; default is the real tool's (`/plan/new` passes the active version's). */
  order?: readonly NorthStarTabId[]
}) {
  /** One step card in the rail, numbered by TAB_ORDER so a number always names the same step. */
  const card = (id: NorthStarTabId) => {
    const active = id === tab
    const state = states[id]
    return (
      <button
        key={id}
        onClick={() => { onPick(id); if (window.matchMedia?.("(max-width: 639px)").matches) railToggleRef.current?.focus() }}
        aria-current={active ? "step" : undefined}
        className={`rounded-xl border p-3 text-left transition-colors ${
          active ? "border-primary/40 bg-primary/10" : "border-white/10 bg-white/[0.02] hover:border-white/25"
        }`}
      >
        <span className="flex items-center gap-2">
          <span className={`inline-flex items-center justify-center size-5 rounded-full text-[10px] tabular-nums shrink-0 ${
            active ? "bg-primary/25 text-foreground" : "bg-white/5 text-zinc-500"
          }`}>
            {order.indexOf(id) + 1}
          </span>
          <span className={`text-sm font-medium min-w-0 flex-1 ${active ? "text-white" : "text-zinc-300"}`}>{TAB_LABELS[id]}</span>
          {/* HOW FULL, NOT WHETHER VISITED.
              A green tick used to appear the moment a step had one
              sentence in it, which is a scoreboard telling somebody
              they are finished with work they have barely begun. */}
          {/* No dot on the fork: there is nothing on it to fill in,
              and a dot there would be scoring somebody on having
              chosen a door. */}
          {SCORED_TABS.includes(id) && <StepDot state={state} fraction={planPct.steps[id].fraction} label={TAB_LABELS[id]} />}
        </span>
        <span className="block text-[11px] text-zinc-500 mt-1">{TAB_BLURBS[id]}</span>
        {/* What is left, in a few words, under the blurb. Not on an empty step:
            its ring says nothing is written, and a count beside it of answers
            the ring does not score (the season's four, before its sentence)
            would contradict it. */}
        {SCORED_TABS.includes(id) && state !== "empty" && (
          <span className="block text-[11px] text-amber-200/70 mt-1 tabular-nums">
            {PROGRESS_COPY.railLine(planPct.steps[id].fraction, planPct.steps[id].parts)}
          </span>
        )}
      </button>
    )
  }

  return (
    <>
    {/* The rail. Every tab is reachable at any time: on a phone behind one line,
        and once the plan is in use the setup steps behind "Edit your plan". */}
    <button ref={railToggleRef} type="button" className="sm:hidden w-full mb-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-left text-sm text-zinc-200" aria-expanded={railOpen} aria-controls="plan-sections" onClick={() => setRailOpen((o) => !o)}>{inUse && USE_STEPS.includes(tab) ? RAIL_COPY.phoneUse(TAB_LABELS[tab]) : RAIL_COPY.phoneStep(order.indexOf(tab) + 1, order.length, TAB_LABELS[tab], SCORED_TABS.includes(tab) ? ns.percentDown(planPct.steps[tab].fraction) : null)} <span aria-hidden>▾</span></button>
    <nav id="plan-sections" aria-label="Sections" className={`${railOpen ? "grid" : "hidden"} sm:grid gap-2 sm:grid-cols-2 lg:grid-cols-4 mb-8`}>
      {inUse ? (
        <>
          {USE_STEPS.map(card)}
          <div className="col-span-full">
            <button type="button" aria-expanded={showBuild} onClick={() => setBuildOpen((o) => !o)} className="text-[12px] text-zinc-400 hover:text-zinc-100 py-1">{RAIL_COPY.editPlan(BUILD_STEPS.length, planPct.percent)} <span aria-hidden>{showBuild ? "▴" : "▾"}</span></button>
          </div>
          {showBuild && order.filter((id) => BUILD_STEPS.includes(id)).map(card)}
        </>
      ) : (
        order.map(card)
      )}
    </nav>
    </>
  )
}

/**
 * Empty ring, ring with a dot, filled ring.
 *
 * Three states because there are three: nothing here yet, something here, and
 * every box this step asks for is filled. Amber rather than green — green is
 * the colour of "you are finished", and the middle state is the common one.
 */
function StepDot({ state, fraction, label }: { state: ns.NsStepState; fraction: number; label: string }) {
  const pct = ns.percentDown(fraction)
  const said =
    state === "done" ? `${label}: every box filled, 100 %` : state === "started" ? `${label}: in progress, ${pct} %` : `${label}: nothing written yet`
  // A ring that fills as the step does (Plans/plan-progress-percent.md):
  // the arc starts at twelve o'clock and runs clockwise.
  const r = 6
  const around = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 16 16" className="size-4 shrink-0" role="img" aria-label={said}>
      <title>{said}</title>
      <circle cx="8" cy="8" r={r} fill={state === "done" ? "rgb(251 191 36 / 0.9)" : "none"} stroke="rgb(113 113 122 / 0.55)" strokeWidth="2" />
      {state === "started" && (
        <circle
          cx="8"
          cy="8"
          r={r}
          fill="none"
          stroke="rgb(251 191 36 / 0.9)"
          strokeWidth="2"
          strokeDasharray={`${Math.max(fraction, 0.04) * around} ${around}`}
          transform="rotate(-90 8 8)"
        />
      )}
      {state === "done" && <circle cx="8" cy="8" r={r} fill="none" stroke="rgb(251 191 36 / 0.9)" strokeWidth="2" />}
    </svg>
  )
}
