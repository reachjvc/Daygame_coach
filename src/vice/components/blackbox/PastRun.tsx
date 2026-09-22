"use client"

/**
 * Entering a run you already had.
 *
 * This is how the chart gets a history at all. It asks for as little as it can
 * get away with — two dates and how it ended — because somebody filling in four
 * years from memory will abandon a form that asks eight questions per run, and
 * an approximate run on the chart is worth far more than a perfect one that was
 * never entered.
 *
 * What it does NOT do is guess. Anything not asked for stays empty rather than
 * being filled with a plausible default, so a remembered run never quietly
 * gains detail nobody supplied.
 */

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { BlackBoxRecord, ViceEndingId } from "../../types"
import { Chip, Field, PrimaryButton, QuietButton } from "../Ui"
import { ENDING_FAMILIES, STRUCTURE_SEEDS } from "../../data/blackbox"
import { VICES } from "../../data/vices"
import { isCalendarDay, overlapsExisting } from "../../blackbox/blackboxStore"
import { daysBetween } from "../../blackboxService"
import { days } from "./days"

export function PastRun({
  today,
  record,
  viceId,
  label,
  onAdd,
  onClose,
}: {
  today: string
  /** Every run already on the record, so a new one cannot cover the same days. */
  record: BlackBoxRecord
  /**
   * The vice every other run on this record is about, or null when there is no
   * run yet to inherit from — in which case the form ASKS.
   *
   * It used to take a non-null pair and the caller passed "nicotine" /
   * "Smoking or vaping" whenever no run was live. On an empty record — the one
   * state where this form is the primary action — every run somebody entered
   * from four years of memory was filed as smoking, and the chart then titled
   * itself with it. That is precisely the plausible default this component's
   * own rule says it never supplies.
   */
  viceId: string | null
  label: string | null
  onAdd: (input: {
    viceId: string
    label: string
    startedOn: string
    endedOn: string
    startedBy: string
    structure: string[]
    ending: ViceEndingId
    thought: string
  }) => void
  onClose: () => void
}) {
  const [startedOn, setStartedOn] = useState("")
  const [endedOn, setEndedOn] = useState("")
  const [ending, setEnding] = useState<ViceEndingId>("fine")
  const [thought, setThought] = useState("")
  const [startedBy, setStartedBy] = useState("")
  const [structure, setStructure] = useState<string[]>([])
  // Null until they pick, so nothing is pre-selected and "Add it" stays off.
  const [pickedId, setPickedId] = useState<string | null>(null)

  const asks = viceId === null
  const chosenId = asks ? pickedId : viceId
  const chosenLabel = asks ? (VICES.find((v) => v.id === pickedId)?.label ?? null) : label

  const toggle = (item: string) =>
    setStructure((v) => (v.includes(item) ? v.filter((x) => x !== item) : [...v, item]))

  const datesValid = isCalendarDay(startedOn) && isCalendarDay(endedOn)
  const ordered = datesValid && endedOn >= startedOn
  // Said before "Add it" is pressed. A run that covers days another run
  // already covers would be counted twice in "Across every run".
  const clashes = ordered && overlapsExisting(record, startedOn, endedOn)
  const length = ordered ? daysBetween(startedOn, endedOn) + 1 : null

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[88vh] overflow-y-auto bg-zinc-950 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-white">Add a run you already had</DialogTitle>
        </DialogHeader>

        <p className="text-[13px] leading-relaxed text-zinc-300">
          Roughly is fine. A run on the chart that is a fortnight out is worth more than one you
          never got round to entering.
        </p>

        {/* Only on a record with nothing to inherit from. Once one run exists,
            asking again on every remembered run would be a question with one
            possible answer. */}
        {asks && (
          <div>
            <p className="text-[12px] text-zinc-400">What was this run off?</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {VICES.filter((v) => v.id !== "custom").map((v) => (
                <Chip key={v.id} label={v.label} on={pickedId === v.id} onClick={() => setPickedId(v.id)} />
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-[12px] text-zinc-400" htmlFor="pr-from">It started</label>
            <input
              id="pr-from"
              type="date"
              value={startedOn}
              max={today}
              onChange={(e) => setStartedOn(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[14px] text-zinc-100 outline-none focus:border-white/30"
            />
          </div>
          <div>
            <label className="block text-[12px] text-zinc-400" htmlFor="pr-to">It ended</label>
            <input
              id="pr-to"
              type="date"
              value={endedOn}
              max={today}
              onChange={(e) => setEndedOn(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[14px] text-zinc-100 outline-none focus:border-white/30"
            />
          </div>
        </div>

        {datesValid && !ordered && (
          <p className="text-[11.5px] text-amber-200/80">
            That run ends before it starts. Check the two dates.
          </p>
        )}
        {clashes && (
          <p className="text-[11.5px] text-amber-200/80">
            Those days are already covered by another run on your record. Two runs over the same
            days would count them twice in your total.
          </p>
        )}
        {length !== null && (
          <p className="text-[12.5px] text-zinc-400">
            That is <b className="font-semibold text-zinc-100">{days(length)}</b> not doing it.
          </p>
        )}

        <div>
          <p className="text-[12px] text-zinc-400">How did it end?</p>
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
                <span className={`block text-[13px] ${ending === f.id ? "text-zinc-50" : "text-zinc-200"}`}>
                  {f.label}
                </span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-zinc-500">{f.sounds}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Item 3 of the owner's concept is what got a run going and what kept
            it underway — not only what ended it. Most runs on this chart will be
            entered from memory, so asking these only when a run starts live
            would have meant never collecting them for almost any of the record. */}
        <Field
          label="What got it going, if you remember?"
          help="Optional. What actually made you start that time."
          value={startedBy}
          onChange={setStartedBy}
          placeholder="Woke up coughing again"
          rows={2}
        />

        <div>
          <p className="text-[12px] text-zinc-400">What did you put in place that time?</p>
          <p className="mt-0.5 text-[11.5px] text-zinc-500">
            Optional, and an empty list is a finding — it is often the difference between the runs
            that held and the ones that did not.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {STRUCTURE_SEEDS.map((x) => (
              <Chip key={x} label={x} on={structure.includes(x)} onClick={() => toggle(x)} />
            ))}
          </div>
        </div>

        <Field
          label="What was the thought, if you remember it?"
          help="Optional. If it comes back to you, write it — this is what the chart later matches on."
          value={thought}
          onChange={setThought}
          placeholder="I'd done three months, I thought I could have one at the wedding"
          rows={2}
        />

        <div className="mt-3 flex items-center justify-between">
          <QuietButton onClick={onClose}>Cancel</QuietButton>
          <PrimaryButton
            disabled={!ordered || clashes || chosenId === null || chosenLabel === null}
            onClick={() => {
              // The button is disabled without a vice; this is the guard that
              // cannot be skipped, so a run is never filed against nothing.
              if (chosenId === null || chosenLabel === null) return
              onAdd({ viceId: chosenId, label: chosenLabel, startedOn, endedOn, startedBy, structure, ending, thought })
            }}
          >
            Add it
          </PrimaryButton>
        </div>
      </DialogContent>
    </Dialog>
  )
}
