"use client"

/**
 * Plain — one question, four answers, nothing else.
 *
 * Built against the specific failure of the full hub: it puts six flows, five
 * tools and two libraries in front of somebody and asks them to pick a
 * methodology. At eleven at night that is not a menu, it is an obstacle.
 *
 * So this version asks the only question that actually routes — what is
 * happening right now — and sends each answer to the one thing that helps.
 * Everything else in the module is still there and still reachable; it is just
 * not on this screen. The whole page is under sixty words before a choice.
 */

import Link from "next/link"
import type { ViceHandlers, ViceState } from "../types"
import { PLAIN } from "../data/plain"

export function HubPlain({ state, on, openTool }: {
  state: ViceState
  on: ViceHandlers
  openTool: (t: "urge" | "lapse" | "card" | "help" | "voices" | "tripwire") => void
}) {
  void state
  void on

  return (
    <div>
      <h1 className="text-2xl font-semibold">{PLAIN.question}</h1>

      <div className="grid gap-2.5 mt-6">
        {PLAIN.answers.map((a) => {
          const inner = (
            <>
              <span className="block text-[15px] font-medium text-zinc-100">{a.label}</span>
              {a.sub && <span className="block text-[12px] text-zinc-500 mt-0.5">{a.sub}</span>}
            </>
          )
          const cls =
            "block w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left hover:border-violet-400/40 hover:bg-violet-500/[0.05] transition-colors"
          // Some answers open a tool, some go to a flow. Routing every answer
          // to a dialog was the fault here: "I do not know if this is a
          // problem" opened the reading library instead of the flow that
          // actually answers it.
          return "flow" in a && a.flow ? (
            <Link key={a.id} href={`/test/quit-vice/${a.flow}`} className={cls}>
              {inner}
            </Link>
          ) : (
            <button key={a.id} onClick={() => a.tool && openTool(a.tool)} className={cls}>
              {inner}
            </button>
          )
        })}
      </div>

      {/* One quiet line, because somebody in real trouble has to be able to
          get out of this page without reading anything first. */}
      <button
        onClick={() => openTool("help")}
        className="mt-5 text-[12px] text-zinc-500 hover:text-white underline underline-offset-2 decoration-white/20 transition-colors"
      >
        {PLAIN.helpLink}
      </button>
    </div>
  )
}
