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
   * The vice the screen is currently showing, pre-selected here — or null on a
   * record with nothing to pre-select from.
   *
   * IT IS A DEFAULT, NEVER AN ASSUMPTION. Two earlier versions got this wrong
   * in opposite directions. The first took a non-null pair and the caller
   * passed "nicotine" / "Smoking or vaping" whenever no run was live, so on an
   * empty record every run entered from four years of memory was filed as
   * smoking. The second asked only when the record was empty and inherited
   * silently ever after, which made a second vice unenterable from this form at
   * all: the chips were the one place the record could learn you had also
   * stopped drinking. The chips are always on screen now, with the current one
   * already lit.
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
  // Seeded with whatever the screen is showing, and null only on a record that
  // has nothing to seed from — where "Add it" stays off until they pick.
  const [pickedId, setPickedId] = useState<string | null>(viceId)

  const chosenId = pickedId
  const chosenLabel =
    pickedId === null
      ? null
      : pickedId === viceId && label !== null
        ? label
        : (VICES.find((v) => v.id === pickedId)?.label ?? null)

  const toggle = (item: string) =>
    setStructure((v) => (v.includes(item) ? v.filter((x) => x !== item) : [...v, item]))

  const datesValid = isCalendarDay(startedOn) && isCalendarDay(endedOn)
  const ordered = datesValid && endedOn >= startedOn
  // Said before "Add it" is pressed. A run that covers days another run off the
  // SAME vice covers would be counted twice in "Across every run"; two
  // different things quit over the same months are two records, not a clash.
  const clashes = ordered && chosenId !== null && overlapsExisting(record, startedOn, endedOn, chosenId)
  const length = ordered ? daysBetween(startedOn, endedOn) + 1 : null

  /** Exactly what is standing between this form and being submitted. */
  const blockedBecause: string | null =
    chosenId === null || chosenLabel === null
      ? "Pick what you were stopping, at the top."
      : !datesValid
        ? "Both dates are needed — when the run started and when it ended."
        : !ordered
          ? "That run ends before it starts. Check the two dates."
          : clashes
            ? `Those dates overlap a run off ${chosenLabel.toLowerCase()} you have already recorded.`
            : null

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

        {/* Always asked, with the current one already lit. It is the only place
            the record can learn about a second thing you stopped. */}
        <div>
          <p className="text-[12px] text-zinc-400">What were you stopping?</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {VICES.filter((v) => v.id !== "custom").map((v) => (
              <Chip key={v.id} label={v.label} on={pickedId === v.id} onClick={() => setPickedId(v.id)} />
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-[12px] text-zinc-400" htmlFor="pr-from">It started</label>
            <input
              id="pr-from"
              type="date"
              value={startedOn}
              max={today}
              onChange={(e) => setStartedOn(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/[0.03] min-h-11 px-3 py-2 text-[14px] text-zinc-100 outline-none focus:border-white/30"
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
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/[0.03] min-h-11 px-3 py-2 text-[14px] text-zinc-100 outline-none focus:border-white/30"
            />
          </div>
        </div>

        {/* The "ends before it starts" note used to live here as well as in
            blockedBecause below, so the same sentence rendered twice. One
            place decides why the form is blocked. */}
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

        {/* A DISABLED BUTTON MUST SAY WHY.
            This form had three separate ways to be unsubmittable and showed a
            reason for only one of them, so a first user filled in both dates,
            read "that is 89 days", chose an ending, and then met a dead button
            with nothing on screen explaining it. The primary action on the
            empty page led to a form that could not be completed. */}
        {blockedBecause && (
          <p className="mt-2 text-[12px] text-amber-200/85">{blockedBecause}</p>
        )}

        <div className="mt-3 flex items-center justify-between">
          <QuietButton onClick={onClose}>Cancel</QuietButton>
          <PrimaryButton
            disabled={blockedBecause !== null}
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
