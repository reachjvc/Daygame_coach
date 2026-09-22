"use client"

/**
 * THE BLACK BOX — what `/life-mastery/quit-vice` shows.
 *
 * A flight recorder for quitting: every run you have had, every night you
 * nearly went, and a page that answers you with your own record at the moment
 * you start thinking you could moderate.
 *
 * It is deliberately the whole screen rather than one more tile on a hub. The
 * module it replaces at the front door had six flows, a teaching spine, a
 * shortlist and seven tools, and reading it meant choosing before you knew what
 * any of it was. The old screens are all still there, at `/quit-vice/old`, and
 * nothing has been deleted.
 *
 * Read order on the page is deliberate: the door first, because the one moment
 * this has to work is the moment somebody opens it mid-thought; then the three
 * numbers; then the picture; then what each thought has cost.
 */

import { useState } from "react"
import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { BlackBoxRecord, ViceEndingId } from "../../types"
import { useBlackBox } from "../../blackbox/useBlackBox"
import { exportRecord, fileReport, importRecord, nowInBrowser, recordPastRun, startAttempt } from "../../blackbox/blackboxStore"
import { currentAttempt, latestAttempt, runLanes, stats, thoughtCosts, viceLabelOf } from "../../blackboxService"
import { familyFor } from "../../data/blackbox"
import { LIFE_MASTERY, viceStep } from "@/src/shared/lifeMasteryRoutes"
import { BackLink } from "@/components/BackLink"
import { Empty, PrimaryButton, QuietButton, Stat } from "../Ui"
import { days } from "./days"
import { Lanes } from "./Lanes"
import { AttemptStart } from "./AttemptStart"
import { ReportForm, type ReportDraft } from "./ReportForm"
import { ThoughtDoor } from "./ThoughtDoor"
import { PastRun } from "./PastRun"

type Dialog =
  | { kind: "none" }
  | { kind: "thought" }
  | { kind: "start" }
  | { kind: "past" }
  | { kind: "report"; ending: ViceEndingId; wentThrough: boolean }
  | { kind: "confirmImport"; incoming: BlackBoxRecord }

export function BlackBoxPage() {
  const { record, update, ready, today } = useBlackBox()
  const [dialog, setDialog] = useState<Dialog>({ kind: "none" })
  const [notice, setNotice] = useState("")
  const [openRun, setOpenRun] = useState<string | null>(null)

  const live = currentAttempt(record)
  // One owner for "what is this record about", so the header, the chart's
  // caption and the remembered-run form cannot name three different things.
  const viceLabel = viceLabelOf(record)
  const latest = latestAttempt(record)
  const summary = stats(record, today)
  const costs = thoughtCosts(record, today)
  const worst = costs[0]

  function file(draft: ReportDraft) {
    if (!live) return
    update((r) =>
      fileReport(r, {
        attemptId: live.id,
        at: nowInBrowser(),
        wentThrough: draft.wentThrough,
        thought: draft.thought,
        ending: draft.ending,
        closeness: draft.closeness,
        withWhom: draft.withWhom,
        where: draft.where,
        factors: draft.factors,
        didInstead: draft.didInstead,
      }),
    )
    setDialog({ kind: "none" })
  }

  function download() {
    const blob = new Blob([exportRecord(record)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `black-box-${today}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function upload(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = importRecord(String(reader.result))
      if (!parsed) {
        setNotice("That file was not a Black Box record, so nothing was changed.")
        return
      }
      // Loading REPLACES, it does not merge — and the thing being replaced is
      // the years this tool exists to accumulate. It used to overwrite on the
      // file-picker's change event, with no undo anywhere in the module, so
      // picking yesterday's export by mistake ended the record. Asked in the
      // app's own words, and it says what is on each side.
      if (record.attempts.length > 0) {
        setDialog({ kind: "confirmImport", incoming: parsed })
        return
      }
      update(() => parsed)
      setNotice(`Loaded ${parsed.attempts.length} runs and ${parsed.reports.length} reports.`)
    }
    reader.readAsText(file)
  }

  return (
    // `data-hydrated` is how every other screen in this module tells a test
    // that the browser record has been read. Without it the dead-control
    // sweep could not wait for this page, so when the front door became the
    // Black Box the sweep timed out here and covered neither module.
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-7" data-hydrated={ready ? "true" : undefined}>
      <BackLink
        fallback={LIFE_MASTERY}
        fallbackLabel="Life Mastery"
        className="mb-5 inline-flex items-center gap-1.5 text-[12px] text-zinc-500 transition-colors hover:text-white"
      />

      <header>
        <h1 className="text-[19px] font-semibold tracking-tight text-white">Black Box</h1>
        <p className="mt-1.5 text-[13px] text-zinc-400">
          {viceLabel
            ? `${viceLabel} · every run you have had, and every night you nearly went.`
            : "Every run you have had, and every night you nearly went."}
        </p>
      </header>

      {/* ---------------------------------------------- the door
          Shown whether or not a run is going. It used to require a live run,
          which removed it at exactly the moment the thought is most likely to
          be acted on — between runs, with nothing to lose by giving in. The
          reading half works regardless; only the filing half needs a run, and
          the door says so itself.

          It IS hidden while the record is empty. With nothing filed it can only
          answer "this is the first time you have written this down", and a
          page whose loudest element leads nowhere teaches you to ignore it —
          which is fatal for the one control that has to work mid-thought. It
          appears with the first report. */}
      {ready && record.reports.length > 0 && (
        <button
          type="button"
          onClick={() => setDialog({ kind: "thought" })}
          className="mt-5 flex w-full items-center justify-between gap-3 rounded-2xl border border-orange-400/35 bg-gradient-to-b from-orange-500/[0.14] to-orange-500/[0.05] px-4 py-4 text-left transition-colors hover:border-orange-400/55"
        >
          <span>
            <span className="block text-[15px] font-medium text-white">I&rsquo;m having a thought</span>
            <span className="mt-0.5 block text-[12.5px] text-zinc-300">
              See what happened the last time you had it
            </span>
          </span>
          <span aria-hidden className="text-[18px] text-orange-300">&rarr;</span>
        </button>
      )}

      {/* ---------------------------------------------- the numbers */}
      {ready && summary.runs > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <Stat value={days(summary.longestDays)} caption="Longest run" />
          <Stat value={days(summary.totalCleanDays)} caption="Across every run" />
          <Stat
            value={summary.currentDays === null ? "—" : days(summary.currentDays)}
            caption={summary.currentDays === null ? "No run going" : "This run, still going"}
          />
        </div>
      )}

      {/* ---------------------------------------------- the picture */}
      {(!ready || summary.runs > 0) && (
      <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-zinc-500">
          Every run
        </h2>
        {!ready ? (
          <p className="mt-3 text-[12.5px] text-zinc-500">Reading your record&hellip;</p>
        ) : (
          <div className="mt-3">
            <Lanes
              record={record}
              today={today}
              viceLabel={viceLabel}
              selectedId={openRun}
              onSelect={(id) => setOpenRun((cur) => (cur === id ? null : id))}
            />

            {/* Item 3 of the concept is the important periods understood — what
                got a run going and what kept it underway, not only what ended
                it. The chart shows length and ending; those two were being
                collected and then displayed nowhere, so the most interesting
                comparison in the record (what the long runs had that the short
                ones did not) was invisible. Tap a bar. */}
            <RunDetail record={record} today={today} openRun={openRun} />
          </div>
        )}
      </section>
      )}

      {/* ---------------------------------------------- what it cost */}
      {costs.length > 0 && (
        <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-zinc-500">
            What each thought has cost you
          </h2>
          <p className="mt-1 text-[12.5px] text-zinc-400">
            Ranked by the clean time it ended, not by how often you have had it.
          </p>
          <div className="mt-3">
            {costs.map((row) => {
              const accent = familyFor(row.ending).accent
              const width = worst && worst.daysEnded > 0 ? (row.daysEnded / worst.daysEnded) * 100 : 0
              return (
                <div key={row.ending} className="border-b border-white/10 py-3 last:border-b-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className={`text-[13.5px] ${accent ? "font-medium text-orange-300" : "text-zinc-200"}`}>
                      {row.label}
                    </span>
                    <span className="whitespace-nowrap text-[12px] text-zinc-400">
                      {days(row.daysEnded)} clean
                    </span>
                  </div>
                  <div
                    className="mt-1.5 h-2 rounded-full"
                    style={{
                      width: `${Math.max(width, row.daysEnded > 0 ? 4 : 2)}%`,
                      background: accent ? "#d95926" : "#52525b",
                      opacity: accent ? 1 : 0.55,
                    }}
                  />
                  <p className="mt-1.5 text-[11.5px] text-zinc-500">
                    ended {row.runsEnded} {row.runsEnded === 1 ? "run" : "runs"}
                    {row.survived > 0 ? ` · survived ${row.survived}` : ""}
                    {row.ownWords ? ` · “${row.ownWords}”` : ""}
                  </p>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ---------------------------------------------- the run itself */}
      <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        {live ? (
          <>
            <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-zinc-500">
              This run
            </h2>
            <p className="mt-1.5 text-[13px] text-zinc-300">
              Started {live.startedOn}
              {live.startedBy.trim() ? ` — ${live.startedBy.trim()}` : ""}
            </p>
            {live.structure.length > 0 && (
              <p className="mt-1 text-[12.5px] text-zinc-400">
                What you put in place: {live.structure.join(", ")}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <PrimaryButton onClick={() => setDialog({ kind: "report", ending: "fine", wentThrough: false })}>
                File a report
              </PrimaryButton>
              <QuietButton onClick={() => setDialog({ kind: "past" })}>
                Add a run you already had
              </QuietButton>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-zinc-500">
              {summary.runs === 0 ? "Start with what already happened" : "No run going"}
            </h2>
            {summary.runs === 0 ? (
              <>
                <p className="mt-1.5 text-[14px] leading-relaxed text-zinc-200">
                  Every time you have stopped before, and what ended it.
                </p>
                <p className="mt-2 text-[12.5px] leading-relaxed text-zinc-400">
                  Put in the attempts you have already had, roughly — two dates and how it ended is
                  enough. Three or four of them is the point at which this starts answering back,
                  and they are the ones you can add right now instead of waiting months for.
                </p>
              </>
            ) : (
              <p className="mt-1.5 text-[13px] text-zinc-300">
                Everything above stays exactly as it is. A new run starts underneath it.
              </p>
            )}
            {/* On an empty record the emphasis flips. The copy above says the
                useful first move is entering the runs you already had, and a
                screen whose loudest button says the opposite is a screen that
                does not mean it. Once there is anything on the chart, starting
                the next run is the live action again. */}
            <div className="mt-3 flex flex-wrap items-center gap-4">
              {summary.runs === 0 ? (
                <>
                  <PrimaryButton onClick={() => setDialog({ kind: "past" })}>
                    Add a run you already had
                  </PrimaryButton>
                  <QuietButton onClick={() => setDialog({ kind: "start" })}>
                    Or start one now
                  </QuietButton>
                </>
              ) : (
                <>
                  <PrimaryButton onClick={() => setDialog({ kind: "start" })}>Start a run</PrimaryButton>
                  <QuietButton onClick={() => setDialog({ kind: "past" })}>
                    Add a run you already had
                  </QuietButton>
                </>
              )}
            </div>
          </>
        )}
      </section>

      {/* ---------------------------------------------- keeping it */}
      {summary.runs > 0 && (
      <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-zinc-500">
          Your copy
        </h2>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-zinc-400">
          This record lives on this device only. Save a copy you can keep, and load it back on
          another one.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <QuietButton onClick={download}>Save a copy</QuietButton>
          <label className="cursor-pointer text-[12px] text-zinc-500 transition-colors hover:text-zinc-200">
            Load a copy
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) upload(f)
                e.target.value = ""
              }}
            />
          </label>
        </div>
        {notice && <p className="mt-2 text-[11.5px] text-zinc-400">{notice}</p>}
      </section>
      )}

      <p className="mt-6 text-[11.5px] text-zinc-500">
        The older quit-a-vice screens are still here:{" "}
        <Link href={viceStep("old")} className="text-zinc-400 underline underline-offset-2 hover:text-zinc-200">
          the flows, tools and reading
        </Link>
        .
      </p>

      {dialog.kind === "thought" && (
        <ThoughtDoor
          record={record}
          today={today}
          hasLiveRun={live !== null}
          onClose={() => setDialog({ kind: "none" })}
          onStartRun={() => setDialog({ kind: "start" })}
          onFileReport={(ending, wentThrough) => setDialog({ kind: "report", ending, wentThrough })}
        />
      )}

      {dialog.kind === "start" && (
        <AttemptStart
          today={today}
          onClose={() => setDialog({ kind: "none" })}
          onStart={(input) => {
            update((r) => startAttempt(r, input))
            setDialog({ kind: "none" })
          }}
        />
      )}

      {dialog.kind === "past" && (
        <PastRun
          today={today}
          record={record}
          viceId={latest?.viceId ?? null}
          label={latest?.label ?? null}
          onClose={() => setDialog({ kind: "none" })}
          onAdd={(input) => {
            update((r) => recordPastRun(r, input))
            setDialog({ kind: "none" })
          }}
        />
      )}

      {dialog.kind === "confirmImport" && (
        <Dialog open onOpenChange={(open) => { if (!open) setDialog({ kind: "none" }) }}>
          <DialogContent className="sm:max-w-md bg-zinc-950 border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-white">
                This replaces what is here
              </DialogTitle>
            </DialogHeader>
            <p className="text-[13px] leading-relaxed text-zinc-300">
              Loading a copy does not merge. Everything on this device is swapped for what is in
              the file, and there is no way back to it afterwards.
            </p>
            <dl className="mt-3 space-y-1.5 text-[12.5px]">
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-400">On this device now</dt>
                <dd className="text-zinc-200">
                  {record.attempts.length} runs, {record.reports.length} reports
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-400">In the file</dt>
                <dd className="text-zinc-200">
                  {dialog.incoming.attempts.length} runs, {dialog.incoming.reports.length} reports
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-[12px] text-zinc-500">
              If you are not sure, save a copy of this one first.
            </p>
            <div className="mt-3 flex items-center justify-between">
              <QuietButton onClick={() => setDialog({ kind: "none" })}>Keep what is here</QuietButton>
              <PrimaryButton
                onClick={() => {
                  const incoming = dialog.incoming
                  update(() => incoming)
                  setNotice(`Loaded ${incoming.attempts.length} runs and ${incoming.reports.length} reports.`)
                  setDialog({ kind: "none" })
                }}
              >
                Replace it
              </PrimaryButton>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {dialog.kind === "report" && (
        <ReportForm
          initial={{ wentThrough: dialog.wentThrough, ending: dialog.ending }}
          onClose={() => setDialog({ kind: "none" })}
          onFile={file}
        />
      )}
    </div>
  )
}

/**
 * One run, read back.
 *
 * Deliberately shows the empty cases as empty — a run with no structure says so
 * in words, because "nothing in place" next to a four-day bar and "told someone,
 * changed the route" next to an eighty-nine-day one is the comparison the whole
 * record exists to make. Filling the gap with a plausible default would erase it.
 */
function RunDetail({ record, today, openRun }: {
  record: BlackBoxRecord
  today: string
  openRun: string | null
}) {
  if (!openRun) {
    return (
      <p className="mt-3 text-[11.5px] text-zinc-500">
        Tap a bar to see what started that run, what you had in place, and what ended it.
      </p>
    )
  }
  const lane = runLanes(record, today).find((l) => l.attempt.id === openRun)
  if (!lane) return null
  const a = lane.attempt
  const ending = record.reports.find((r) => r.id === a.endedByReportId) ?? null

  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
      <p className="text-[13px] font-medium text-zinc-100">
        {days(lane.days)}
        <span className="font-normal text-zinc-400">
          {" · "}{a.startedOn}{a.endedOn ? ` to ${a.endedOn}` : " — still going"}
        </span>
      </p>

      <dl className="mt-2.5 grid gap-2 text-[12.5px]">
        <div>
          <dt className="text-zinc-500">What got it going</dt>
          <dd className="text-zinc-200">{a.startedBy.trim() || <span className="text-zinc-500">Not written down</span>}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">What you had in place</dt>
          <dd className="text-zinc-200">
            {a.structure.length > 0
              ? a.structure.join(", ")
              : <span className="text-zinc-500">Nothing in particular</span>}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">How it ended</dt>
          <dd className="text-zinc-200">
            {ending
              ? <>{familyFor(ending.ending).label}{ending.thought.trim() ? ` — “${ending.thought.trim()}”` : ""}</>
              : <span className="text-zinc-500">It has not</span>}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Close calls you survived</dt>
          <dd className="text-zinc-200">{lane.closeCallDays.length}</dd>
        </div>
      </dl>
    </div>
  )
}
