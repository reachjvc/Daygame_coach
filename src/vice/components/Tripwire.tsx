"use client"

/**
 * A rule for the week it is going well.
 *
 * The module's other planning surfaces all point at a bad moment. This one
 * points at a good one, because that is the moment the research says people
 * actually describe losing it — feeling fine, concluding the problem is solved,
 * and reasoning their way to a test of that conclusion.
 *
 * It reuses the if-then validator deliberately: a tripwire phrased as what you
 * will *not* do backfires for the same reason every other negated plan does.
 */

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { ViceHandlers, ViceState } from "../types"
import { IFTHEN, TRIPWIRE } from "../data/copy"
import { planProblem, plansOfKind } from "../viceService"
import { Chip, Empty, PrimaryButton, QuietButton, Why } from "./Ui"
import { OneVoice } from "./Voices"

export function TripwireTool({ state, on, onClose }: {
  state: ViceState
  on: ViceHandlers
  onClose: () => void
}) {
  const existing = plansOfKind(state, "tripwire")
  const [when, setWhen] = useState("")
  const [then, setThen] = useState("")
  const [added, setAdded] = useState(false)

  const problem = when.trim() && then.trim() ? planProblem({ when, then }) : null
  const message = problem === "negation" ? IFTHEN.rejectNegation : problem === "vague" ? IFTHEN.vagueCue : problem
  const canAdd = when.trim().length > 0 && then.trim().length > 0 && !problem
  // The counter-intuitive one. Plans resting on self-trust are the fragile kind.
  const restsOnSelfTrust = /\b(i (will|'ll) be (fine|ok|okay)|i can handle|trust myself|be careful|just one)\b/i.test(then)

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[88vh] overflow-y-auto bg-zinc-950 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-white">{TRIPWIRE.title}</DialogTitle>
        </DialogHeader>

        <p className="text-[13px] text-zinc-300 leading-relaxed">{TRIPWIRE.blurb}</p>

        <Why label="why a good week is the risky one">
          {TRIPWIRE.why.map((line, i) => (<p key={i}>{line}</p>))}
        </Why>

        {/* Somebody describing the thought while it was happening to them. */}
        <OneVoice
          stage="goodStretch"
          viceId={state.viceId}
          rotate={state.plans.length}
          heading="Somebody who had the thought"
        />

        {existing.length > 0 && (
          <div>
            <p className="text-[12px] text-zinc-500 mb-1.5">Already written</p>
            <ul className="space-y-1">
              {existing.map((p) => (
                <li key={p.id} className="text-[13px] text-zinc-300 leading-relaxed">
                  <span className="text-zinc-500">When I notice</span> {p.when}
                  <span className="text-zinc-500">, then I</span> {p.then}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <p className="text-[12px] text-zinc-400">{TRIPWIRE.whenLabel}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {TRIPWIRE.thoughts.map((t) => (
              <Chip key={t} label={t} on={when === t} onClick={() => setWhen(when === t ? "" : t)} />
            ))}
          </div>
          <input
            value={when}
            onChange={(e) => { setWhen(e.target.value); setAdded(false) }}
            placeholder="or your own words for it"
            className="mt-2.5 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-white placeholder:text-zinc-700 focus:border-violet-400/50 focus:outline-none"
          />
        </div>

        <label className="block">
          <span className="text-[12px] text-zinc-400">{TRIPWIRE.thenLabel}</span>
          <input
            value={then}
            onChange={(e) => { setThen(e.target.value); setAdded(false) }}
            placeholder={TRIPWIRE.thenPlaceholder.replace("{person}", "someone")}
            className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-white placeholder:text-zinc-700 focus:border-violet-400/50 focus:outline-none"
          />
        </label>

        {message && <p className="text-[11.5px] text-amber-200/80 leading-relaxed">{message}</p>}
        {restsOnSelfTrust && !message && (
          <p className="text-[11.5px] text-amber-200/80 leading-relaxed">{TRIPWIRE.selfTrustWarning}</p>
        )}

        {added ? (
          <p className="text-[12px] text-emerald-200/80">{TRIPWIRE.saved}</p>
        ) : (
          <PrimaryButton
            disabled={!canAdd}
            onClick={() => { on.addPlan(when.trim(), then.trim(), "tripwire"); setAdded(true); setWhen(""); setThen("") }}
          >
            Save the tripwire
          </PrimaryButton>
        )}

        {existing.length === 0 && !added && <Empty>{TRIPWIRE.empty}</Empty>}

        <Why label="what the thought means"><p>{TRIPWIRE.note}</p></Why>

        <div className="mt-1">
          <QuietButton onClick={onClose}>close</QuietButton>
        </div>
      </DialogContent>
    </Dialog>
  )
}
