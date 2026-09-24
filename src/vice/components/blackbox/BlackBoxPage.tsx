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
 *
 * ONE VICE AT A TIME. The record holds runs off several things — `viceId` has
 * been on every attempt since day one — and every read here used to ignore it,
 * so a record with a smoking run and a porn run drew both on one chart under
 * one caption and added them into one total. Everything below the switcher is
 * computed from `view`, the record filtered to the vice on screen.
 *
 * AND EVERY MISTAKE CAN BE TAKEN BACK. There was no undo, edit or delete
 * anywhere in this module: one tap on "I did it" ended a 207-day run for good.
 * A record you cannot correct is a record you stop writing in the first time it
 * is wrong, which is the one failure this tool cannot survive.
 */

import { useState } from "react"
import Link from "next/link"
import type { BlackBoxRecord, ViceEndingId } from "../../types"
import { useBlackBox } from "../../blackbox/useBlackBox"
import { useBlackBoxView } from "../../blackbox/useBlackBoxView"
import { useBlackBoxSync } from "../../blackbox/useBlackBoxSync"
import { syncNotice } from "../../blackbox/viceSyncService"
import {
  exportRecord,
  fileReport,
  importRecord,
  latestReportDay,
  living,
  nowInBrowser,
  recordPastRun,
  removeAttempt,
  removeReport,
  revivalClashes,
  startAttempt,
} from "../../blackbox/blackboxStore"
import { currentAttempt, forVice, runLanes, stats, thoughtCosts, vicesOn } from "../../blackboxService"
import { mergeRecords } from "../../blackbox/viceSyncService"
import { familyFor } from "../../data/blackbox"
import { LIFE_MASTERY, viceStep } from "@/src/shared/lifeMasteryRoutes"
import { BackLink } from "@/components/BackLink"
import { OfflineShell } from "@/src/shared/components/OfflineShell"
import { PrimaryButton, QuietButton, Stat } from "../Ui"
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

export function BlackBoxPage() {
  const { record, update, ready, today } = useBlackBox()
  // The account. The page never waits for it: everything below renders from
  // the browser copy, and this only reports what is happening behind that.
  const sync = useBlackBoxSync({ record, update, ready })
  const [dialog, setDialog] = useState<Dialog>({ kind: "none" })
  const [notice, setNotice] = useState("")
  const [openRun, setOpenRun] = useState<string | null>(null)
  /**
   * The vice on screen. Whatever was last looked at, falling back to the run
   * started most recently — and only to that on a browser with nothing
   * remembered, or one whose record no longer holds what was remembered.
   */
  const { viewing, remember } = useBlackBoxView()
  /**
   * The report filed a moment ago, so it can be taken straight back.
   *
   * The mis-tap this exists for is specific: "I didn't do it" and "I did it"
   * are a two-up grid, one thumb-width apart, read at eleven at night, and the
   * right-hand one ends the run. Correcting it later from the run's own panel
   * works, but an undo has to be where the mistake was made.
   */
  const [justFiled, setJustFiled] = useState<{ id: string; wentThrough: boolean } | null>(null)

  const vices = vicesOn(record)
  const remembered = vices.find((v) => v.viceId === viewing)?.viceId ?? null
  const viceId = remembered ?? vices[0]?.viceId ?? null
  const current = vices.find((v) => v.viceId === viceId) ?? null
  // One owner for "what is this screen about", so the header, the chart's
  // caption and the two forms cannot name three different things.
  const viceLabel = current?.label ?? null

  /** Everything below is answered for the vice on screen, and only that one. */
  const view = forVice(record, viceId)
  const live = currentAttempt(view)
  const summary = stats(view, today)
  const costs = thoughtCosts(view, today)
  const worst = costs[0]

  /** Show a vice, and keep showing it next time the page is opened. */
  function showVice(next: string) {
    remember(next)
    setOpenRun(null)
  }

  function file(draft: ReportDraft) {
    if (!live) return
    // The day they named, at the moment they named it when that day is today,
    // and at midday otherwise — the convention `recordPastRun` already uses
    // for a day nobody remembers a clock time for.
    const at = draft.on === today ? nowInBrowser() : `${draft.on}T12:00:00`
    // Built from the record in hand rather than inside the updater: the id of
    // the row just written is needed for the undo, and a state setter must not
    // run inside another state setter's callback.
    const next = fileReport(record, {
      attemptId: live.id,
      at,
      wentThrough: draft.wentThrough,
      thought: draft.thought,
      ending: draft.ending,
      closeness: draft.closeness,
      withWhom: draft.withWhom,
      where: draft.where,
      factors: draft.factors,
      didInstead: draft.didInstead,
    })
    const added = next.reports.find((row) => !record.reports.some((old) => old.id === row.id))
    update(() => next)
    setJustFiled(added ? { id: added.id, wentThrough: draft.wentThrough } : null)
    setNotice("")
    setDialog({ kind: "none" })
  }

  /** Take back whatever was just filed. A lapse undone brings its run back. */
  function undoJustFiled() {
    if (!justFiled) return
    update((r) => removeReport(r, justFiled.id))
    setJustFiled(null)
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
      // LOADING A COPY MERGES. It used to replace, and the confirm dialog that
      // guarded the replace is gone with it — deleted deliberately, because the
      // danger it was protecting against no longer exists.
      //
      // Replace made sense while this record lived in one browser and a file
      // was the only way to move it to another. Now the account does that, and
      // replace had quietly stopped working: the rows it removed came back on
      // the next load, because the account still had them. The dialog promised
      // "everything on this device is swapped for what is in the file, and
      // there is no way back" — and by then neither half was true. It did not
      // replace, and it was not irreversible.
      //
      // A union is the same rule the rest of the sync follows, and it cannot
      // lose a row. It also does the right thing in the case people actually
      // load a copy for: rows in the file this record has never seen are added,
      // and anything deleted since the file was written stays deleted, because
      // the deletion is a row with a newer stamp and it wins.
      const before = living(record.attempts).length + living(record.reports).length
      const merged = mergeRecords(record, parsed)
      const added = living(merged.attempts).length + living(merged.reports).length - before
      update(() => merged)
      setNotice(
        added > 0
          ? `Added ${added} ${added === 1 ? "row" : "rows"} from that file. Nothing was removed.`
          : "Everything in that file was already on your record. Nothing changed.",
      )
    }
    reader.readAsText(file)
  }

  return (
    // `data-hydrated` is how every other screen in this module tells a test
    // that the browser record has been read. Without it the dead-control
    // sweep could not wait for this page, so when the front door became the
    // Black Box the sweep timed out here and covered neither module.
    // `data-sync` is the same kind of seam as `data-hydrated` beside it: the
    // account's answer arrives about 700ms after load, and without a way to
    // wait for it every test in `blackbox.spec.ts` was racing the network and
    // passing because it won. It carries the real state, so it cannot drift
    // from what the page is actually doing.
    <div
      className="mx-auto max-w-3xl px-4 pb-24 pt-7"
      data-hydrated={ready ? "true" : undefined}
      data-sync={sync.state}
      // How many rows are waiting to go up. `data-sync` alone is not enough to
      // wait on: for the instant between an action and the effect that notices
      // it, the state is still whatever the LAST completed sync left, so a test
      // can match a stale "synced" and carry on before the change has even been
      // queued. "Synced AND nothing pending" is the true condition.
      data-pending={sync.pending}
    >
      {/* THE PAGE HAS TO BE OPENABLE WITH NO SIGNAL, not merely survivable.
          Everything below already runs from the browser copy and queues its
          writes, so once this is on screen the network can die and nothing is
          lost. Opening it cold with no connection was a different story: the
          document itself had to be fetched, so you got the browser's error
          page — at the one moment this tool was designed for. This registers
          the worker that keeps the page; `SHELL_PATHS` in `public/sw.js` is
          where this address is listed, and the worker is what does the work.
          Production builds only; in development it is a no-op by design. */}
      <OfflineShell />

      <BackLink
        fallback={LIFE_MASTERY}
        fallbackLabel="Life Mastery"
        className="mb-3 inline-flex min-h-11 items-center gap-1.5 text-[12px] text-zinc-500 transition-colors hover:text-white"
      />

      <header>
        <h1 className="text-[19px] font-semibold tracking-tight text-white">Black Box</h1>
        <p className="mt-1.5 text-[13px] text-zinc-400">
          {viceLabel
            ? `${viceLabel} · every run you have had, and every night you nearly went.`
            : "Every run you have had, and every night you nearly went."}
        </p>
      </header>

      {/* ---------------------------------------------- which one
          Only once there is more than one thing on the record. A switcher over
          a single vice is a control with one possible answer, and this page is
          already dense. */}
      {ready && vices.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {vices.map((v) => (
            <button
              key={v.viceId}
              type="button"
              aria-pressed={v.viceId === viceId}
              // Spelled out, because the count sits in its own element with a
              // margin and no space between them: read aloud, and matched by
              // name in a test, the label was "Smoking or vaping1 run".
              aria-label={`${v.label}, ${v.runs} ${v.runs === 1 ? "run" : "runs"}`}
              onClick={() => showVice(v.viceId)}
              className={`inline-flex min-h-11 items-center rounded-full border px-3.5 text-[12.5px] transition-colors ${
                v.viceId === viceId
                  ? "border-white/30 bg-white/10 text-zinc-100"
                  : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/25"
              }`}
            >
              {v.label}
              <span className="ml-1.5 text-zinc-500">
                {v.runs} {v.runs === 1 ? "run" : "runs"}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ---------------------------------------------- just filed
          The undo for the mis-tap, at the top because after a lapse the run
          section it was pressed in has already turned into "No run going". */}
      {justFiled && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5">
          <p className="text-[12.5px] text-zinc-300">
            {justFiled.wentThrough
              ? "Filed, and the run is closed on that day."
              : "Close call filed. The run carries on."}
          </p>
          <QuietButton onClick={undoJustFiled}>Undo that</QuietButton>
        </div>
      )}

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
      {ready && view.reports.length > 0 && (
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
              record={view}
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
            <RunDetail
              record={view}
              today={today}
              openRun={openRun}
              onRemoveReport={(id) => {
                update((r) => removeReport(r, id))
                // The undo strip names a report by id. Removing that same
                // report from this panel would leave the strip offering to
                // undo a row that is already gone.
                if (justFiled?.id === id) setJustFiled(null)
              }}
              onRemoveRun={(id) => {
                update((r) => removeAttempt(r, id))
                setOpenRun(null)
                setJustFiled(null)
              }}
              canRemoveReport={(id) => !revivalClashes(record, id)}
            />
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
                    {/* A thought that has never won has cost nothing, and
                        "0 days clean" next to a bar of no width reads as a
                        broken stat rather than as the good news it is. */}
                    <span className="whitespace-nowrap text-[12px] text-zinc-400">
                      {row.runsEnded > 0 ? `${days(row.daysEnded)} clean` : "cost you nothing yet"}
                    </span>
                  </div>
                  {/* No bar at all for a thought that has ended nothing. A 2%
                      stub is a mark on a length scale saying "a little", and
                      the true answer is none — it drew an orange pip under a
                      row whose own figure said it had cost nothing. */}
                  {row.daysEnded > 0 && (
                    <div
                      className="mt-1.5 h-2 rounded-full"
                      style={{
                        width: `${Math.max(width, 4)}%`,
                        background: accent ? "#d95926" : "#52525b",
                        opacity: accent ? 1 : 0.55,
                      }}
                    />
                  )}
                  <p className="mt-1.5 text-[11.5px] text-zinc-500">
                    {row.runsEnded > 0
                      ? `ended ${row.runsEnded} ${row.runsEnded === 1 ? "run" : "runs"}`
                      : "has never ended a run"}
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
      {ready && record.attempts.length > 0 && (
      <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-zinc-500">
          Your copy
        </h2>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-zinc-400">
          This record is on your account, so it is on your other devices too. Save a copy you can
          keep as well — it is the one thing no outage can take. Loading one adds whatever it holds
          that you do not; it never removes anything.
        </p>
        {/* ONE LINE, AND NEVER ABOVE THE DOOR.
            What the account is doing is worth knowing and is never the reason
            somebody opened this page. It says what is true, including when
            that is "not saved", and it never claims work was lost — because it
            never is: an unsent row is still on this device and still unsent. */}
        {syncNotice(sync.state, sync.pending) && (
          <p className="mt-1.5 text-[12px] text-zinc-500">{syncNotice(sync.state, sync.pending)}</p>
        )}
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
          record={view}
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
          record={record}
          initialViceId={viceId}
          onClose={() => setDialog({ kind: "none" })}
          onStart={(input) => {
            update((r) => startAttempt(r, { ...input, today }))
            // Follow the run that was just started, which may be off a vice
            // the screen was not showing.
            showVice(input.viceId)
            setDialog({ kind: "none" })
          }}
        />
      )}

      {dialog.kind === "past" && (
        <PastRun
          today={today}
          record={record}
          viceId={viceId}
          label={viceLabel}
          onClose={() => setDialog({ kind: "none" })}
          onAdd={(input) => {
            update((r) => recordPastRun(r, input))
            showVice(input.viceId)
            setDialog({ kind: "none" })
          }}
        />
      )}

      {dialog.kind === "report" && (
        <ReportForm
          initial={{ wentThrough: dialog.wentThrough, ending: dialog.ending }}
          today={today}
          runStartedOn={live?.startedOn ?? today}
          lastFiledOn={live ? latestReportDay(record, live.id) : today}
          onClose={() => setDialog({ kind: "none" })}
          onFile={file}
        />
      )}
    </div>
  )
}

/**
 * One run, read back — and the one place a run can be corrected.
 *
 * Deliberately shows the empty cases as empty — a run with no structure says so
 * in words, because "nothing in place" next to a four-day bar and "told someone,
 * changed the route" next to an eighty-nine-day one is the comparison the whole
 * record exists to make. Filling the gap with a plausible default would erase it.
 *
 * CORRECTION LIVES HERE, beside the row it changes, rather than in a settings
 * screen or an edit mode. Every report filed against the run is listed with the
 * words that were written, so removing one is a matter of reading it and saying
 * no — not of remembering which of three close calls last Tuesday was the
 * mistyped one. Both controls confirm in place, and the confirm says what
 * actually leaves, because the only backup this record has is "Save a copy".
 */
function RunDetail({ record, today, openRun, onRemoveReport, onRemoveRun, canRemoveReport }: {
  record: BlackBoxRecord
  today: string
  openRun: string | null
  onRemoveReport: (reportId: string) => void
  onRemoveRun: (attemptId: string) => void
  /** False when removing it would revive a run beside one already alive. */
  canRemoveReport: (reportId: string) => boolean
}) {
  const [confirming, setConfirming] = useState<string | null>(null)

  if (!openRun) {
    return (
      <p className="mt-3 text-[11.5px] text-zinc-500">
        Tap a bar to see what started that run, what you had in place and what ended it. Anything
        you filed by mistake can be put right there.
      </p>
    )
  }
  const lane = runLanes(record, today).find((l) => l.attempt.id === openRun)
  if (!lane) return null
  const a = lane.attempt
  const ending = record.reports.find((r) => r.id === a.endedByReportId) ?? null
  const filed = record.reports
    .filter((r) => r.attemptId === a.id)
    .sort((x, y) => y.at.localeCompare(x.at))

  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
      <p className="text-[13px] font-medium text-zinc-100">
        {days(lane.days)}
        <span className="font-normal text-zinc-400">
          {" \u00b7 "}{a.startedOn}{a.endedOn ? ` to ${a.endedOn}` : " \u2014 still going"}
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
              ? <>{familyFor(ending.ending).label}{ending.thought.trim() ? ` \u2014 \u201c${ending.thought.trim()}\u201d` : ""}</>
              : <span className="text-zinc-500">It has not</span>}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Close calls you survived</dt>
          <dd className="text-zinc-200">{lane.closeCallDays.length}</dd>
        </div>
      </dl>

      {filed.length > 0 && (
        <div className="mt-3.5 border-t border-white/10 pt-3">
          <p className="text-[11.5px] text-zinc-500">
            Filed against this run. Remove one you wrote by mistake.
          </p>
          <ul className="mt-2 space-y-2">
            {filed.map((r) => {
              const endsIt = r.id === a.endedByReportId
              const allowed = canRemoveReport(r.id)
              return (
                <li key={r.id} className="flex items-start justify-between gap-3">
                  <span className="text-[12px] leading-snug text-zinc-300">
                    {r.at.slice(0, 10)}{" \u00b7 "}
                    {r.wentThrough ? "went through with it" : "did not"}
                    {r.thought.trim() ? ` \u2014 \u201c${r.thought.trim()}\u201d` : ""}
                  </span>
                  {confirming === r.id ? (
                    <span className="flex shrink-0 items-center gap-2 text-[11.5px]">
                      <button
                        type="button"
                        onClick={() => { setConfirming(null); onRemoveReport(r.id) }}
                        className="inline-flex min-h-11 items-center px-2 -mx-2 text-rose-300 hover:text-rose-200"
                      >
                        remove{endsIt ? " and reopen" : ""}?
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirming(null)}
                        className="inline-flex min-h-11 items-center px-2 -mx-2 text-zinc-500 hover:text-zinc-300"
                      >
                        keep
                      </button>
                    </span>
                  ) : allowed ? (
                    <button
                      type="button"
                      onClick={() => setConfirming(r.id)}
                      aria-label={`Remove the report filed on ${r.at.slice(0, 10)}`}
                      className="inline-flex min-h-11 shrink-0 items-center px-2 -mx-2 text-[11.5px] text-zinc-500 transition-colors hover:text-rose-300"
                    >
                      remove
                    </button>
                  ) : (
                    // Never a control that does nothing: removing this one would
                    // reopen its run beside a run off the same thing that is
                    // still going, and two live runs would count the same days
                    // twice. The later run is the one to deal with first.
                    <span className="shrink-0 text-[11.5px] text-zinc-500">
                      end the newer run first
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="mt-3.5 border-t border-white/10 pt-3">
        {confirming === a.id ? (
          <p className="text-[12px] text-zinc-300">
            This takes {days(lane.days)} and {filed.length}{" "}
            {filed.length === 1 ? "report" : "reports"} off your record for good.{" "}
            <button
              type="button"
              onClick={() => { setConfirming(null); onRemoveRun(a.id) }}
              className="inline-flex min-h-11 items-center px-2 -mx-2 text-rose-300 underline underline-offset-2 hover:text-rose-200"
            >
              Remove it
            </button>
            {" or "}
            <button
              type="button"
              onClick={() => setConfirming(null)}
              className="inline-flex min-h-11 items-center px-2 -mx-2 text-zinc-400 underline underline-offset-2 hover:text-zinc-200"
            >
              keep it
            </button>
            .
          </p>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(a.id)}
            className="inline-flex min-h-11 items-center px-2 -mx-2 text-[11.5px] text-zinc-500 transition-colors hover:text-rose-300"
          >
            Remove this whole run
          </button>
        )}
      </div>
    </div>
  )
}
