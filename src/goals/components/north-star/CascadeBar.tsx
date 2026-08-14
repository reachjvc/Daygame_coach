"use client"

/**
 * The chain, on one line, at the top of the goals tab.
 *
 * Every level of this plan is made of the one above it, and nothing on the page
 * ever said so. The north star was on tab 1, the areas on tab 2, the goals in a
 * dialog on tab 3, the milestones one level inside those, and the routines in a
 * sidebar that knew about none of it — so the thing a person came here to build,
 * a life that cascades down into this week, was only ever visible to whoever had
 * read the whole flow.
 *
 * It is counts rather than prose because counts move. Adding a goal set moves
 * four numbers at once, and watching them move is the explanation.
 */

import type { NsCascade } from "@/src/goals/northStarService"
import type { NorthStarTabId } from "@/src/goals/types"
import { CASCADE_COPY } from "@/src/goals/data/northStarBuild"

export function CascadeBar({ cascade, load, onGoToTab, onJump }: {
  cascade: NsCascade
  load: { minutes: number; actions: number; over: boolean }
  onGoToTab: (tab: NorthStarTabId) => void
  /** Scroll to a section of this tab rather than leaving it. */
  onJump: (section: "board" | "timeline" | "routines") => void
}) {
  const links: Array<{ key: string; head: string; sub: string; go: () => void; dim?: boolean; warn?: boolean }> = [
    {
      key: "star",
      head: "North star",
      sub: cascade.starWritten ? "written" : CASCADE_COPY.starEmpty,
      go: () => onGoToTab("star"),
      dim: !cascade.starWritten,
    },
    {
      key: "areas",
      head: `${cascade.areas} areas`,
      sub: `${cascade.areasWithTen} pictured`,
      go: () => onGoToTab("now"),
      dim: cascade.areasWithTen === 0,
    },
    {
      key: "goals",
      head: `${cascade.goals} ${cascade.goals === 1 ? "goal" : "goals"}`,
      sub: cascade.goals === 0 ? "none yet" : "yours to pick",
      go: () => onJump("board"),
      dim: cascade.goals === 0,
    },
    {
      key: "milestones",
      head: `${cascade.milestones} milestones`,
      sub: cascade.milestones === 0 ? "none yet" : "dated",
      go: () => onJump("timeline"),
      dim: cascade.milestones === 0,
    },
    {
      key: "actions",
      head: `${load.actions}×/wk`,
      sub: "actions",
      go: () => onJump("board"),
      dim: load.actions === 0,
      warn: load.over,
    },
    {
      key: "routines",
      head: `${cascade.routines} routines`,
      sub: `${cascade.routineSteps} steps`,
      go: () => onJump("routines"),
      dim: cascade.routineSteps === 0,
    },
  ]

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3.5">
      <ol className="flex flex-wrap items-stretch gap-x-1 gap-y-2">
        {links.map((link, i) => (
          <li key={link.key} className="flex items-center gap-1">
            <button
              onClick={link.go}
              className={`rounded-lg px-2 py-1 text-left transition-colors hover:bg-white/[0.06] ${link.dim ? "opacity-55" : ""}`}
            >
              <span className={`block text-[12.5px] font-medium tabular-nums ${link.warn ? "text-amber-200" : "text-zinc-100"}`}>
                {link.head}
              </span>
              <span className="block text-[10px] text-zinc-500">{link.sub}</span>
            </button>
            {i < links.length - 1 && <span className="text-zinc-700 text-[11px] select-none" aria-hidden>→</span>}
          </li>
        ))}
      </ol>
      <p className="text-[10.5px] text-zinc-600 mt-1.5">{CASCADE_COPY.help}</p>
    </section>
  )
}
