"use client"

/**
 * ONE FORM FOR BOTH.
 *
 * A night you nearly went and a night you did are the same report, and
 * `wentThrough` is the only field that differs. That is taken from the Aviation
 * Safety Reporting System, which has collected voluntary close-call reports
 * since 1976 on the premise that the chain of events behind a near miss is the
 * same chain as behind the accident — you got lucky at the last link, and the
 * links are what you wanted to know about.
 *
 * Giving near misses a lighter, separate form is exactly how they become
 * second-class and stop being filed. And filing must cost nothing: there is no
 * counter on this screen to reset, no red, and no word for what you did.
 *
 * `factors` is plural on purpose. A blameless postmortem asks for two to five
 * contributing factors rather than a root cause, because a single reason is
 * always a story told afterwards. The form accepts one — a form that refuses
 * you at eleven at night is a form nobody fills in — but it asks in the plural.
 */

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { ViceEndingId } from "../../types"
import { Chip, Field, Line, Panel, PrimaryButton, QuietButton, Scale } from "../Ui"
import { ENDING_FAMILIES, FACTOR_SEEDS } from "../../data/blackbox"

export interface ReportDraft {
  wentThrough: boolean
  thought: string
  ending: ViceEndingId
  closeness: number | null
  withWhom: string
  where: string
  factors: string[]
  didInstead: string
}

export function ReportForm({
  initial,
  onFile,
  onClose,
}: {
  initial: { wentThrough: boolean; ending: ViceEndingId; thought?: string }
  onFile: (draft: ReportDraft) => void
  onClose: () => void
}) {
  const [wentThrough, setWentThrough] = useState(initial.wentThrough)
  const [ending, setEnding] = useState<ViceEndingId>(initial.ending)
  const [thought, setThought] = useState(initial.thought ?? "")
  // Starts unset, so `null` — "they did not say" — is a state a person can
  // actually reach. Defaulting it to 6 made the null branch dead code and
  // invented a number nobody had given.
  const [closeness, setCloseness] = useState<number | null>(null)
  const [withWhom, setWithWhom] = useState("")
  const [where, setWhere] = useState("")
  const [factors, setFactors] = useState<string[]>([])
  const [didInstead, setDidInstead] = useState("")

  const toggle = (item: string) =>
    setFactors((f) => (f.includes(item) ? f.filter((x) => x !== item) : [...f, item]))

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[88vh] overflow-y-auto bg-zinc-950 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-white">File a report</DialogTitle>
        </DialogHeader>

        <p className="text-[13px] leading-relaxed text-zinc-300">
          Same form either way. The only difference is the first question.
        </p>

        {/* The one field that separates a close call from a lapse. */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-pressed={!wentThrough}
            onClick={() => setWentThrough(false)}
            className={`rounded-xl border px-3 py-3 text-left text-[13px] transition-colors ${
              !wentThrough
                ? "border-blue-400/45 bg-blue-500/10 text-zinc-100"
                : "border-white/10 bg-white/[0.02] text-zinc-300 hover:border-white/25"
            }`}
          >
            I didn&rsquo;t do it
            <span className="mt-0.5 block text-[11.5px] text-zinc-500">A close call</span>
          </button>
          <button
            type="button"
            aria-pressed={wentThrough}
            onClick={() => setWentThrough(true)}
            className={`rounded-xl border px-3 py-3 text-left text-[13px] transition-colors ${
              wentThrough
                ? "border-orange-400/45 bg-orange-500/10 text-zinc-100"
                : "border-white/10 bg-white/[0.02] text-zinc-300 hover:border-white/25"
            }`}
          >
            I did it
            <span className="mt-0.5 block text-[11.5px] text-zinc-500">This ends the run</span>
          </button>
        </div>

        {wentThrough && (
          <Panel tone="quiet">
            <p className="text-[12.5px] leading-relaxed text-zinc-300">
              The run keeps every day it lasted. It stays on the chart at full length, and the next
              one starts underneath it.
            </p>
          </Panel>
        )}

        <Field
          label="What was the thought, in your own words?"
          help="Write the sentence your head actually used. Yours is the one worth recognising later."
          value={thought}
          onChange={setThought}
          placeholder="I've done five weeks, one wouldn't undo it"
          rows={2}
        />

        <div>
          <p className="text-[12px] text-zinc-400">Which of these is it?</p>
          <div className="mt-2 grid gap-2">
            {ENDING_FAMILIES.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={ending === f.id}
                onClick={() => setEnding(f.id)}
                className={`rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                  ending === f.id
                    ? "border-violet-400/40 bg-violet-500/10"
                    : "border-white/10 bg-white/[0.02] hover:border-white/25"
                }`}
              >
                <span className={`block text-[13px] ${ending === f.id ? "text-zinc-50" : "text-zinc-200"}`}>{f.label}</span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-zinc-500">{f.sounds}</span>
              </button>
            ))}
          </div>
        </div>

        <Scale
          label="How close did it get?"
          help={closeness === null ? "Leave it alone if you would rather not say." : undefined}
          value={closeness ?? 5}
          onChange={setCloseness}
          lowAnchor="Passing thought"
          highAnchor="Had it in my hand"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          {/* Being alone was a top-five predictor of whether a craving became a
              lapse across 37,002 entries, and nothing else in this module records it. */}
          <Line label="Who were you with?" value={withWhom} onChange={setWithWhom} placeholder="On my own" maxLength={60} />
          <Line label="Where were you?" value={where} onChange={setWhere} placeholder="Balcony, after work" maxLength={60} />
        </div>

        <div>
          <p className="text-[12px] text-zinc-400">What else was going on? Pick everything that applies.</p>
          <p className="mt-0.5 text-[11.5px] text-zinc-500">
            More than one. There is never only one reason, and the extra ones are the useful part.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {FACTOR_SEEDS.map((f) => (
              <Chip key={f} label={f} on={factors.includes(f)} onClick={() => toggle(f)} />
            ))}
          </div>
        </div>

        {!wentThrough && (
          <Field
            label="What did you do instead?"
            help="Whatever it actually was. This is the part you will want to read back."
            value={didInstead}
            onChange={setDidInstead}
            placeholder="Opened this and read the chart"
            rows={2}
          />
        )}

        <div className="mt-3 flex items-center justify-between">
          <QuietButton onClick={onClose}>Cancel</QuietButton>
          <PrimaryButton
            onClick={() =>
              onFile({ wentThrough, thought, ending, closeness, withWhom, where, factors, didInstead })
            }
          >
            File it
          </PrimaryButton>
        </div>
        <p className="text-[11.5px] text-zinc-500">
          Filed reports are kept on this device. Nothing is sent anywhere.
        </p>
      </DialogContent>
    </Dialog>
  )
}

