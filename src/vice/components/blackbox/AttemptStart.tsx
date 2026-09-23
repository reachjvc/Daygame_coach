"use client"

/**
 * Starting a run.
 *
 * Asks the two things the owner wanted recorded and nothing else asks for:
 * what got it going, and what was put in place to keep it underway. The
 * accounts are consistent that what separates a durable attempt from a fragile
 * one is structural rather than motivational, and structure is only visible
 * later if somebody wrote it down at the start.
 *
 * THE SAFETY GATE LIVES HERE because this screen sets a quit date. Alcohol and
 * benzodiazepine withdrawal can kill; every other vice on the list is only
 * unpleasant. `medicalRisk` on the catalogue is what stands between a date and
 * that fact, and a second door into date-setting that skipped it would make the
 * first one decorative.
 */

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { BlackBoxRecord } from "../../types"
import { Chip, Field, Panel, PrimaryButton, QuietButton } from "../Ui"
import { STRUCTURE_SEEDS } from "../../data/blackbox"
import { SAFETY } from "../../data/copy"
import { VICES } from "../../data/vices"
import { isCalendarDay, overlapsExisting } from "../../blackbox/blackboxStore"

export function AttemptStart({
  today,
  record,
  initialViceId,
  onStart,
  onClose,
}: {
  today: string
  /** Every run already on the record, so a new one cannot cover days it holds. */
  record: BlackBoxRecord
  /** The vice the screen is showing, pre-selected. */
  initialViceId: string | null
  onStart: (input: {
    viceId: string
    label: string
    startedOn: string
    startedBy: string
    structure: string[]
    acknowledgedRisk: boolean
  }) => void
  onClose: () => void
}) {
  const [viceId, setViceId] = useState(initialViceId ?? "nicotine")
  const [startedOn, setStartedOn] = useState(today)
  const [startedBy, setStartedBy] = useState("")
  const [structure, setStructure] = useState<string[]>([])
  const [acknowledged, setAcknowledged] = useState(false)

  const vice = VICES.find((v) => v.id === viceId) ?? VICES[0]
  const validDate = isCalendarDay(startedOn)
  // A new run is alive, so it covers every day from its start to today.
  const clashes = validDate && overlapsExisting(record, startedOn, today, viceId)

  /** Exactly what is standing between this form and starting the run. */
  const blockedBecause: string | null = !validDate
    ? "That is not a date this can read. Pick one from the calendar."
    : clashes
      ? `A run off ${vice.label.toLowerCase()} already covers those days. End that one first, or start this one later.`
      : vice.medicalRisk && !acknowledged
        ? "Confirm you have read the note above before a date goes in."
        : null

  const toggle = (item: string) =>
    setStructure((s) => (s.includes(item) ? s.filter((x) => x !== item) : [...s, item]))

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[88vh] overflow-y-auto bg-zinc-950 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-white">Start a run</DialogTitle>
        </DialogHeader>

        <div>
          <p className="text-[12px] text-zinc-400">What are you stopping?</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {VICES.filter((v) => v.id !== "custom").map((v) => (
              <Chip key={v.id} label={v.label} on={viceId === v.id} onClick={() => { setViceId(v.id); setAcknowledged(false) }} />
            ))}
          </div>
        </div>

        {vice.medicalRisk && (
          <Panel tone="warn">
            <p className="text-[13px] font-medium text-amber-100">{SAFETY.title}</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-amber-100/85">{SAFETY.blurb}</p>
            <ul className="mt-2 space-y-0.5 text-[12px] text-amber-100/75">
              {SAFETY.signs.map((s) => <li key={s}>&middot; {s}</li>)}
            </ul>
            <p className="mt-2.5 text-[12.5px] leading-relaxed text-amber-100/85">
              If any of those happen, stopping suddenly on your own can be dangerous. Talk to a
              doctor before you set a date.
            </p>
            <div className="mt-3">
              <Chip
                label={acknowledged ? "I have read this" : "Tap to confirm you have read this"}
                on={acknowledged}
                onClick={() => setAcknowledged((a) => !a)}
              />
            </div>
          </Panel>
        )}

        {/* A native date input, not free text. Typed as text, "16/08/2026" was
            accepted, stored, and turned every length and bar width downstream
            into NaN — and reloading did not clear it, because it had been
            persisted. The picker cannot produce anything but YYYY-MM-DD, and
            `isCalendarDay` still checks, because a keyboard can reach this too. */}
        <div>
          <label className="block text-[12px] text-zinc-400" htmlFor="bb-start">
            When did it start?
          </label>
          <input
            id="bb-start"
            type="date"
            value={startedOn}
            max={today}
            onChange={(e) => setStartedOn(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[14px] text-zinc-100 outline-none focus:border-white/30"
          />
        </div>

        <Field
          label="What got it going this time?"
          help="The thing that actually made you start on that day, not the reason it is a good idea."
          value={startedBy}
          onChange={setStartedBy}
          placeholder="Read my own record and saw the same ending three times"
          rows={2}
        />

        <div>
          <p className="text-[12px] text-zinc-400">What did you put in place?</p>
          <p className="mt-0.5 text-[11.5px] text-zinc-500">
            Pick anything that is actually true. An empty list is a finding too.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {STRUCTURE_SEEDS.map((s) => (
              <Chip key={s} label={s} on={structure.includes(s)} onClick={() => toggle(s)} />
            ))}
          </div>
        </div>

        {/* One place decides why the button is off, and it is never off in
            silence — including for the overlap rule, which used to be enforced
            at the store with nothing on screen, so "Start the run" simply did
            nothing and the dialog stayed open. */}
        {blockedBecause && (
          <p className="mt-2 text-[12px] text-amber-200/85">{blockedBecause}</p>
        )}

        <div className="mt-3 flex items-center justify-between">
          <QuietButton onClick={onClose}>Cancel</QuietButton>
          <PrimaryButton
            disabled={blockedBecause !== null}
            onClick={() => onStart({ viceId, label: vice.label, startedOn, startedBy, structure, acknowledgedRisk: acknowledged })}
          >
            Start the run
          </PrimaryButton>
        </div>
      </DialogContent>
    </Dialog>
  )
}
