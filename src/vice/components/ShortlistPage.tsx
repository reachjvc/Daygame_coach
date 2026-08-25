"use client"

/**
 * The shortlist on its own page, with the module's chrome around it.
 *
 * Deliberately not a flow: it has no steps, no rail and no progress. The four
 * change-flows are wizards because each walks a particular argument; this one
 * has no argument to walk, it is a list of things the evidence ranks, and
 * wrapping it in a twelve-step shell would misrepresent what it is.
 */

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { ViceHandlers, ViceToolId } from "../types"
import { useViceState } from "../hooks/useViceState"
import { Shortlist } from "./Shortlist"
import { CardTool, LapseTool, UrgeTool } from "./Tools"
import { HelpDoor } from "./HelpDoor"
import { VoicesDialog } from "./Voices"
import { TripwireTool } from "./Tripwire"
import { AgainTool } from "./Again"
import { QuietButton } from "./Ui"

export function ShortlistPage() {
  const { state, loaded, handlers } = useViceState(null)
  const [tool, setTool] = useState<ViceToolId | "none">("none")

  const on: ViceHandlers = useMemo(
    () => ({ ...handlers, openUrge: () => setTool("urge"), openHelp: () => setTool("help"), openTool: setTool }),
    [handlers],
  )

  return (
    <div className="min-h-screen bg-zinc-950 text-white" data-hydrated={loaded ? "true" : undefined}>
      <div className="max-w-3xl mx-auto px-6 py-10 pb-24">
        <Link
          href="/test/quit-vice"
          className="inline-flex items-center gap-1.5 text-[12px] text-zinc-500 hover:text-white transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back
        </Link>

        <div className="mt-6">
          {loaded ? <Shortlist state={state} on={on} /> : <p className="text-sm text-zinc-500">Opening…</p>}
        </div>

        <div className="mt-8">
          <QuietButton onClick={() => setTool("help")}>if this is past what a page can do</QuietButton>
        </div>
      </div>

      {tool === "urge" && loaded && (
        <UrgeTool state={state} on={on} onClose={() => setTool("none")} onLapse={() => setTool("lapse")} />
      )}
      {tool === "lapse" && loaded && <LapseTool state={state} on={on} onClose={() => setTool("none")} />}
      {tool === "card" && loaded && <CardTool state={state} on={on} onClose={() => setTool("none")} />}
      {tool === "help" && loaded && <HelpDoor state={state} on={on} onClose={() => setTool("none")} />}
      {tool === "voices" && loaded && <VoicesDialog viceId={state.viceId} onClose={() => setTool("none")} />}
      {tool === "tripwire" && loaded && <TripwireTool state={state} on={on} onClose={() => setTool("none")} />}
      {tool === "again" && loaded && <AgainTool state={state} on={on} onClose={() => setTool("none")} />}
    </div>
  )
}
