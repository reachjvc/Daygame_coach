"use client"

/**
 * THE DOOR THE WHOLE TOOL EXISTS FOR.
 *
 * One tap from the landing page, no form and no setup, at the moment somebody
 * thinks they could moderate. Pick which thought it is, and the screen answers
 * with that person's own record of it: how many runs it has ended, how many
 * clean days those runs held, how many times it turned up and did not win, and
 * what they wrote the last few times.
 *
 * Two rules it keeps.
 *
 * It pays out BEFORE asking for anything. Filing first and answering second is
 * how a log becomes a chore; answering first is what makes the next report
 * worth writing.
 *
 * And it invents nothing. With no history the honest output is "this is the
 * first time you have written this down" — a screen that manufactures a pattern
 * out of one data point teaches somebody to discount every number it ever shows
 * them afterwards.
 */

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { BlackBoxRecord, ViceEndingId } from "../../types"
import { answerFor } from "../../blackboxService"
import { ENDING_FAMILIES, familyFor } from "../../data/blackbox"
import { Empty, Panel, PrimaryButton, QuietButton } from "../Ui"
import { OneVoice } from "../Voices"
import { days } from "./days"

export function ThoughtDoor({
  record,
  today,
  hasLiveRun,
  viceId,
  onFileReport,
  onStartRun,
  onClose,
}: {
  record: BlackBoxRecord
  today: string
  /** Filing needs a run to file against; reading never does. */
  hasLiveRun: boolean
  /** Which vice, so an account about another one is not offered as yours. */
  viceId: string | null
  onFileReport: (ending: ViceEndingId, wentThrough: boolean) => void
  onStartRun: () => void
  onClose: () => void
}) {
  const [ending, setEnding] = useState<ViceEndingId | null>(null)
  const answer = ending ? answerFor(record, ending, today) : null
  const family = ending ? familyFor(ending) : null

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[88vh] overflow-y-auto bg-zinc-950 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-white">
            {answer ? "What happened last time" : "What is the thought?"}
          </DialogTitle>
        </DialogHeader>

        {!answer && (
          <>
            <p className="text-[13px] leading-relaxed text-zinc-300">
              Pick the one that sounds like the inside of your head right now.
            </p>
            <div className="mt-1 grid gap-2">
              {ENDING_FAMILIES.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setEnding(f.id)}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-3 text-left transition-colors hover:border-white/25"
                >
                  <span className="block text-[13.5px] text-zinc-100">{f.label}</span>
                  <span className="mt-0.5 block text-[11.5px] leading-snug text-zinc-500">{f.sounds}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {answer && family && (
          <>
            <p className="text-[13px] text-zinc-400">
              &ldquo;{family.label}&rdquo;
            </p>

            {answer.empty ? (
              <Panel tone="quiet">
                <Empty>
                  This is the first time you have written this one down. There is nothing to compare
                  it with yet — which is worth knowing too, and is the reason to file it now.
                </Empty>
              </Panel>
            ) : (
              <Panel tone={answer.runsEnded > 0 ? "warn" : "plain"}>
                <p className="text-[14px] leading-relaxed text-zinc-100">
                  {answer.runsEnded > 0 ? (
                    <>
                      This thought has ended{" "}
                      <b className="font-semibold">
                        {answer.runsEnded} {answer.runsEnded === 1 ? "run" : "runs"}
                      </b>
                      , holding <b className="font-semibold">{days(answer.daysEnded)}</b> between them.
                    </>
                  ) : (
                    <>
                      You have had this thought{" "}
                      <b className="font-semibold">
                        {answer.history.length} {answer.history.length === 1 ? "time" : "times"}
                      </b>{" "}
                      and it has never ended a run.
                    </>
                  )}
                </p>
                {answer.survived > 0 && (
                  <p className="mt-1.5 text-[12.5px] text-zinc-300">
                    It also turned up {answer.survived} {answer.survived === 1 ? "time" : "times"} and
                    did not win.
                  </p>
                )}
              </Panel>
            )}

            {answer.history.length > 0 && (
              <div>
                <p className="text-[12px] text-zinc-400">What you wrote, most recent first</p>
                <div className="mt-2 space-y-2">
                  {answer.history.slice(0, 5).map((r) => (
                    <div key={r.id} className="rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5">
                      <p className="text-[12.5px] leading-relaxed text-zinc-200">
                        {r.thought.trim() || <span className="text-zinc-500">No wording written down</span>}
                      </p>
                      <p className="mt-1 text-[11.5px] text-zinc-500">
                        {r.at.slice(0, 10)} &middot; {r.wentThrough ? "went through with it" : "did not"}
                        {r.closeness === null ? "" : ` · ${r.closeness}/10 close`}
                        {r.withWhom.trim() ? ` · ${r.withWhom.trim()}` : ""}
                        {!r.wentThrough && r.didInstead.trim() ? ` · ${r.didInstead.trim()}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SOMEBODY ELSE, AFTER YOUR OWN RECORD AND NEVER BEFORE IT.
                The 381-quote corpus came back into the product on 2026-09-24:
                it went to the archive with the old module, and reading other
                people's accounts was a recovery community's most-valued feature
                at 80.8%, which makes it the one thing in there hardest to call
                taste. This page read NONE of it until now.

                ONE ACCOUNT, IN PLACE, NOT A LIBRARY. The same research says a
                library only serves somebody already browsing, and that
                engagement volume predicts nothing good — proportion of recovery
                focus carries an odds ratio of 5.00 for a use episode. So it is
                one quote at the moment the thought arrives, under the person's
                own record, which is the thing that answers them first.

                `goodStretch`, because that is what this door IS. The corpus's
                strongest finding is that the hazard is the good stretch rather
                than the bad night — "now I can finally moderate" at day four,
                at ten days, at two months, at a year, at nine years — and that
                sentence is what the person just picked off the list.

                Rotated by how many reports are on the record rather than at
                random: a quote that changes on every render is unreadable, and
                one that never changes is stale by March. */}
            <OneVoice
              stage="goodStretch"
              viceId={viceId}
              rotate={record.reports.length}
              heading="Somebody else, at the same point"
            />

            <div className="mt-2 grid gap-2">
              {hasLiveRun ? (
                <>
                  <PrimaryButton onClick={() => onFileReport(ending!, false)}>
                    File this as a close call
                  </PrimaryButton>
                  <QuietButton onClick={() => onFileReport(ending!, true)}>
                    I already went through with it
                  </QuietButton>
                </>
              ) : (
                <>
                  <p className="text-[12.5px] leading-relaxed text-zinc-400">
                    There is no run going, so there is nothing to file this against. Reading it back
                    is the part that works right now.
                  </p>
                  <PrimaryButton onClick={onStartRun}>Start a run</PrimaryButton>
                </>
              )}
            </div>
            <div className="flex justify-between">
              <QuietButton onClick={() => setEnding(null)}>Pick a different thought</QuietButton>
              <QuietButton onClick={onClose}>Close</QuietButton>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
