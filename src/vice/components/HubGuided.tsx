"use client"

/**
 * Guided — two doors, everything else one level down. The default.
 *
 * The full hub's mistake was treating "which of six methodologies" as the
 * first question. It is not; it is a question most people cannot answer and
 * many find off-putting. The question that actually routes is whether
 * something is happening right now or whether they are working something out,
 * and that is the only thing this screen asks.
 */

import { useState } from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"
import type { ViceFlowId, ViceToolId } from "../types"
import { GUIDED } from "../data/plain"
import { VICE_FLOWS } from "../data/flows"



const CHANGE_FLOWS = VICE_FLOWS.filter((f) => f.id !== "where" && f.id !== "gives")

export function HubGuided({ openTool }: { openTool: (t: ViceToolId) => void }) {
  // The acute door starts open. Somebody arriving mid-urge should not have to
  // tap a disclosure before they can reach the ninety seconds — that is one
  // interaction too many at the only moment the timing really matters. The
  // considered door stays shut, because nothing behind it is urgent.
  const [open, setOpen] = useState<string | null>("now")
  const [showFlows, setShowFlows] = useState(false)

  return (
    <div>
      <h1 className="text-2xl font-semibold">Quitting something</h1>

      <div className="space-y-2.5 mt-6">
        {GUIDED.doors.map((door) => {
          const isOpen = open === door.id
          return (
            <div key={door.id} className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : door.id)}
                aria-expanded={isOpen}
                className="w-full p-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span className="text-[16px] font-medium text-zinc-100">{door.label}</span>
                  <ChevronDown className={`size-4 ml-auto text-zinc-600 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </span>
                <span className="block text-[12.5px] text-zinc-500 mt-0.5">{door.sub}</span>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-1.5">
                  {door.items.map((item) => {
                    if ("tool" in item && item.tool) {
                      return (
                        <button
                          key={item.id}
                          onClick={() => openTool(item.tool as ViceToolId)}
                          className="block w-full rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-left text-[13.5px] text-zinc-200 hover:border-violet-400/40 transition-colors"
                        >
                          {item.label}
                        </button>
                      )
                    }
                    if ("href" in item && item.href) {
                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          className="block rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-[13.5px] text-zinc-200 hover:border-violet-400/40 transition-colors"
                        >
                          {item.label}
                        </Link>
                      )
                    }
                    if ("flow" in item && item.flow) {
                      return (
                        <Link
                          key={item.id}
                          href={`/test/quit-vice/${item.flow as ViceFlowId}`}
                          className="block rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-[13.5px] text-zinc-200 hover:border-violet-400/40 transition-colors"
                        >
                          {item.label}
                        </Link>
                      )
                    }
                    // The four change-flows, kept behind one more tap because
                    // picking between contradictory methodologies is the part
                    // people bounce off.
                    return (
                      <div key={item.id}>
                        <button
                          onClick={() => setShowFlows((v) => !v)}
                          aria-expanded={showFlows}
                          className="block w-full rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-left text-[13.5px] text-zinc-200 hover:border-violet-400/40 transition-colors"
                        >
                          {item.label}
                        </button>
                        {showFlows && (
                          <div className="mt-1.5 space-y-1.5 pl-3 border-l border-white/10">
                            {/* First, because it is the only one built from the
                                evidence ranking rather than from one school of
                                thought — and the shortest by a distance. */}
                            <Link
                              href="/test/quit-vice/shortlist"
                              className="block rounded-lg px-2.5 py-2 text-[13px] text-zinc-200 hover:text-white hover:bg-white/[0.03] transition-colors"
                            >
                              The short version
                              <span className="block text-[11px] text-zinc-600">
                                Ten things, ranked by the evidence. Most happen away from here.
                              </span>
                            </Link>
                            <p className="text-[11.5px] text-zinc-600 leading-relaxed pt-1">{GUIDED.changeIntro}</p>
                            {CHANGE_FLOWS.map((f) => (
                              <Link
                                key={f.id}
                                href={`/test/quit-vice/${f.id}`}
                                className="block rounded-lg px-2.5 py-2 text-[13px] text-zinc-300 hover:text-white hover:bg-white/[0.03] transition-colors"
                              >
                                {f.label}
                                <span className="block text-[11px] text-zinc-600">{f.forWho}</span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button
        onClick={() => openTool("help")}
        className="mt-5 text-[12px] text-zinc-500 hover:text-white underline underline-offset-2 decoration-white/20 transition-colors"
      >
        {GUIDED.helpLink}
      </button>
    </div>
  )
}
