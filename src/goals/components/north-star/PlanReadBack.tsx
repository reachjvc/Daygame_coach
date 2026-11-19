"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import type { NsPlan } from "@/src/goals/types"
import * as ns from "@/src/goals/northStarService"

/**
 * "YOUR PLAN, READ BACK": the plan as plain text, closed until asked for, with "copy as text".
 *
 * Moved out of `NorthStarFlow` unchanged (Plans/plan-new-from-real.md, Phase 4); the open and copied states and the copy
 * action went with it.
 */
export function PlanReadBack({ plan, loaded, today }: { plan: NsPlan; loaded: boolean; today: string | null }) {
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle")
  const [readBackOpen, setReadBackOpen] = useState(false)
  const readBack = loaded && today ? ns.planAsText(plan, today) : ""
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(readBack)
      setCopied("done")
    } catch {
      setCopied("failed")
    }
  }
  return (
    <>
    {/* The plan read back as plain text. Closed by default: expanded it is
        the longest thing on the page, and it is a thing you go and look at
        rather than something you need under every screen. */}
    {loaded && today && readBack.trim() && (
      <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/[0.04]">
        <div className="flex items-center gap-3 px-5 py-3">
          <button
            onClick={() => setReadBackOpen((v) => !v)}
            aria-expanded={readBackOpen}
            className="flex items-center gap-2 min-w-0 text-left group"
          >
            <ChevronDown className={`size-4 shrink-0 text-zinc-500 transition-transform ${readBackOpen ? "" : "-rotate-90"}`} />
            <span className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">Your plan, read back</span>
            <span className="text-[11px] text-zinc-600 tabular-nums">{readBack.split("\n").length} lines</span>
          </button>
          <button onClick={copy} className="ml-auto text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors shrink-0">
            {copied === "done" ? "copied" : copied === "failed" ? "your browser blocked the copy" : "copy as text"}
          </button>
        </div>
        {readBackOpen && (
          <pre className="px-5 pb-5 text-[12px] text-zinc-400 leading-relaxed whitespace-pre-wrap font-sans">{readBack}</pre>
        )}
      </div>
    )}
    </>
  )
}
