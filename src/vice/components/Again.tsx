"use client"

/**
 * "I have tried before" — the attempt review.
 *
 * Built on the one question the research corpus answers best: what was
 * different on the attempt that finally worked. The answer is consistently
 * structural rather than motivational, and it is learned from the specific way
 * the last attempt ended — so the screen asks about that ending first and
 * responds to it, rather than listing generic advice.
 *
 * It deliberately does not congratulate, encourage, or predict.
 */

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { ViceHandlers, ViceState } from "../types"
import { AGAIN, DIFFERENCES, ENDINGS } from "../data/again"
import { Chip, Field, Panel, PrimaryButton, QuietButton, Why } from "./Ui"
import { OneVoice, TechniqueHints } from "./Voices"

const COUNTS = ["1", "2–3", "4–10", "more than I can count"]

export function AgainTool({ state, on, onClose }: {
  state: ViceState
  on: ViceHandlers
  onClose: () => void
}) {
  const count = state.answers["again.count"] ?? ""
  const ending = state.answers["again.ending"] ?? ""
  const picked = state.lists["again.differences"] ?? []
  const chosen = ENDINGS.find((e) => e.id === ending) ?? null
  const [showCounter, setShowCounter] = useState(false)

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[88vh] overflow-y-auto bg-zinc-950 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-white">{AGAIN.title}</DialogTitle>
        </DialogHeader>

        <p className="text-[13px] text-zinc-300 leading-relaxed">{AGAIN.blurb}</p>
        <Why label="why the last attempt is the useful thing to look at">
          <p>{AGAIN.frame}</p>
        </Why>

        <div>
          <p className="text-[12px] text-zinc-400">{AGAIN.countLabel}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {COUNTS.map((c) => (
              <Chip key={c} label={c} on={count === c} onClick={() => on.setAnswer("again.count", count === c ? "" : c)} />
            ))}
          </div>
          <p className="text-[11px] text-zinc-600 mt-1.5">{AGAIN.countNote}</p>
        </div>

        <div>
          <p className="text-[12px] text-zinc-400">{AGAIN.endingLabel}</p>
          <div className="grid gap-2 mt-2">
            {ENDINGS.map((e) => (
              <button
                key={e.id}
                type="button"
                aria-pressed={ending === e.id}
                onClick={() => on.setAnswer("again.ending", ending === e.id ? "" : e.id)}
                className={`rounded-xl border px-3.5 py-2.5 text-left text-[13px] transition-colors ${
                  ending === e.id
                    ? "border-violet-400/40 bg-violet-500/10 text-zinc-100"
                    : "border-white/10 bg-white/[0.02] text-zinc-300 hover:border-white/25"
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-zinc-600 mt-1.5">{AGAIN.endingNote}</p>
        </div>

        {/* The response is keyed to the specific ending, because that is what
            the accounts say the durable rule gets learned from. */}
        {chosen && (
          <Panel tone="live">
            <p className="text-[12.5px] text-violet-100/90 leading-relaxed">{chosen.answer}</p>
          </Panel>
        )}

        {chosen && (
          <OneVoice
            stage={ending === "fine" ? "goodStretch" : "lapse"}
            viceId={state.viceId}
            rotate={picked.length}
            heading="Somebody whose attempt ended the same way"
          />
        )}

        <div>
          <p className="text-[12px] text-zinc-400">{AGAIN.differencesLabel}</p>
          <div className="grid gap-2 mt-2">
            {DIFFERENCES.map((d) => {
              const on_ = picked.includes(d.id)
              return (
                <button
                  key={d.id}
                  type="button"
                  aria-pressed={on_}
                  onClick={() => on.toggleListItem("again.differences", d.id)}
                  className={`rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                    on_ ? "border-emerald-400/35 bg-emerald-500/[0.07]" : "border-white/10 bg-white/[0.02] hover:border-white/25"
                  }`}
                >
                  <span className={`block text-[13px] ${on_ ? "text-emerald-50" : "text-zinc-200"}`}>{d.label}</span>
                  <span className="block text-[11.5px] text-zinc-500 mt-0.5 leading-snug">{d.help}</span>
                </button>
              )
            })}
          </div>
          <p className="text-[11px] text-zinc-600 mt-1.5">{AGAIN.differencesNote}</p>
        </div>

        {/* Said plainly rather than softened. An empty list is the finding. */}
        {picked.length === 0 && ending && (
          <p className="text-[12.5px] text-amber-100/90 leading-relaxed rounded-xl border border-amber-400/25 bg-amber-500/[0.06] px-3 py-2.5">
            {AGAIN.noneYet}
          </p>
        )}

        {picked.length > 0 && (
          <Field
            label={AGAIN.writeLabel}
            value={state.answers["again.different"] ?? ""}
            onChange={(text) => on.setAnswer("again.different", text)}
            placeholder={AGAIN.writePlaceholder}
            rows={2}
          />
        )}

        <button
          type="button"
          onClick={() => setShowCounter((v) => !v)}
          className="text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors text-left"
        >
          {showCounter ? "hide" : "what if none of this fits?"}
        </button>
        {showCounter && <p className="text-[12.5px] text-zinc-400 leading-relaxed">{AGAIN.counter}</p>}

        <TechniqueHints stage="deciding" viceId={state.viceId} heading="What people credited on the attempt that held" />

        <Why label="a better number than days since"><p>{AGAIN.metric}</p></Why>

        <div className="mt-1 flex items-center gap-3">
          <PrimaryButton onClick={onClose}>Done</PrimaryButton>
          <QuietButton onClick={onClose}>close</QuietButton>
        </div>
      </DialogContent>
    </Dialog>
  )
}
