"use client"

import { useState } from "react"
import type { NsPlan } from "@/src/goals/types"
import { COMMIT_EDIT_COPY } from "@/src/goals/data/northStar"

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
