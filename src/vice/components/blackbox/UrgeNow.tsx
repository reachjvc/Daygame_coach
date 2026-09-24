"use client"

/**
 * AN URGE, RIGHT NOW — the one thing this page could not answer.
 *
 * The Black Box's door answers "maybe I could moderate": a thought, with time
 * to read your own record. It had nothing at all for the other moment, the
 * acute one, where the question is not what you believe but what you do in the
 * next ten minutes. That lived in the retired module's urge tool and went to
 * the archive with it on 2026-09-24.
 *
 * ----------------------------------------------------------------------------
 * WHAT CAME BACK, AND WHAT DID NOT, BY THE OWNER'S OWN RULE.
 *
 * Concept item 7: a research finding with a source outside this repo survives,
 * a product decision AI made is taste and does not. The old tool was a
 * six-stage flow — HALT check, a body-sensation picker, an intensity slider, a
 * ninety-second timer, a debrief — wrapped around four responses. **The four
 * responses and their ordering are the cited part. The six stages are the
 * choreography.** So this is the responses, on the Black Box's own record,
 * rather than the old flow ported onto a data shape it was not written for.
 *
 * The citations, all in `RESPOND` in `data/copy.ts` where they can be read:
 * urge surfing is nearly absent from the largest peer community — four mentions
 * against ten for playing the tape forward, which that community teaches
 * newcomers — people report it *extending* the urge, several report the urge is
 * too fast to observe at all, and a practitioner who uses it says that in a
 * cue-rich room the skilful move is to direct attention AWAY. So the room is
 * asked about first, and a cue-rich answer puts the two attention-away
 * responses at the top. Watching stays, because people credit it; it is not the
 * default, and it is never the only door.
 *
 * ----------------------------------------------------------------------------
 * IT ENDS IN A REPORT, WHICH IS WHY IT NEEDED NO NEW STORAGE.
 *
 * An urge that passed IS a close call, and one that did not is a lapse — the
 * Black Box has filed both on one form since it was built, a single
 * `wentThrough` flag apart. So this hands its outcome to that form rather than
 * inventing a second place to keep the same fact. What the person typed goes
 * into `didInstead`, which is the field that already means "what you did
 * instead" and is already marked as only meaningful on a close call.
 *
 * NO TIMER AND NO COUNTER. The module's standing rule is that nothing here
 * counts up or resets on a lapse, and the old tool's own copy says this page
 * does not tell you how long an urge lasts — once you have filed a few, your
 * own record does.
 */

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RESPOND } from "../../data/copy"
import { Empty, Panel, PrimaryButton, QuietButton } from "../Ui"
import { OneVoice } from "../Voices"

type Stage = "where" | "respond" | "outcome"

/** The prompt that belongs to each response, so the box asks something real. */
const PROMPTS: Record<string, string> = {
  tape: RESPOND.tapePrompt,
  out: RESPOND.outPrompt,
  move: RESPOND.movePrompt,
  watch: "What is it doing? Write what you notice rather than what you think of it.",
}

export function UrgeNow({
  viceId,
  rotate,
  hasLiveRun,
  onFile,
  onClose,
}: {
  /** Which vice, so an account about another one is not offered as yours. */
  viceId: string | null
  /** Rotates the account shown. The report count, so it moves as the record grows. */
  rotate: number
  /** Filing needs a run to file against. Reading never does. */
  hasLiveRun: boolean
  onFile: (outcome: { wentThrough: boolean; didInstead: string }) => void
  onClose: () => void
}) {
  const [stage, setStage] = useState<Stage>("where")
  /** Whether the room is full of the cue. Decides the steer, not the order. */
  const [cueRich, setCueRich] = useState<boolean | null>(null)
  const [choice, setChoice] = useState<string | null>(null)
  const [wrote, setWrote] = useState("")

  /**
   * THE ORDER IS THE DATA'S, AND THERE IS NO SORT HERE ANY MORE.
   *
   * There was one — `cueRich` moved watching to the end — and it was DEAD CODE:
   * `RESPOND.options` already lists tape, out, move, watch, so the sort never
   * changed anything. I only found out because the test I wrote to prove the
   * reordering passed with the sort deleted, which is the third guard today
   * that was green while checking nothing.
   *
   * The ordering guarantee belongs to the data, where the citation is, and
   * `tests/unit/vice/urgeResponses.test.ts` asserts it: the two attention-away
   * responses first, watching last, and all four present. The steer for a
   * cue-rich room is `cueRichNote`, which is a real thing this component shows
   * or does not.
   */
  const ordered = RESPOND.options

  const picked = ordered.find((o) => o.id === choice) ?? null

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[88vh] overflow-y-auto bg-zinc-950 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-white">
            {stage === "outcome" ? "What happened" : RESPOND.title}
          </DialogTitle>
        </DialogHeader>

        {stage === "where" && (
          <>
            <p className="text-[13px] leading-relaxed text-zinc-300">{RESPOND.whereQuestion}</p>
            <div className="grid gap-2">
              {RESPOND.whereOptions.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    setCueRich(o.cueRich)
                    setStage("respond")
                  }}
                  className="min-h-11 rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-3 text-left text-[13.5px] text-zinc-100 transition-colors hover:border-white/25"
                >
                  {o.label}
                </button>
              ))}
            </div>
          </>
        )}

        {stage === "respond" && (
          <>
            <p className="text-[12.5px] leading-relaxed text-zinc-400">{RESPOND.blurb}</p>
            {cueRich && (
              <Panel tone="warn">
                <p className="text-[12.5px] leading-relaxed text-zinc-200">{RESPOND.cueRichNote}</p>
              </Panel>
            )}

            <div className="grid gap-2">
              {ordered.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={choice === o.id}
                  onClick={() => setChoice(o.id)}
                  className={`min-h-11 rounded-xl border px-3.5 py-3 text-left transition-colors ${
                    choice === o.id
                      ? "border-violet-400/45 bg-violet-500/10"
                      : "border-white/10 bg-white/[0.02] hover:border-white/25"
                  }`}
                >
                  <span className="block text-[13.5px] text-zinc-100">{o.label}</span>
                  <span className="mt-0.5 block text-[11.5px] leading-snug text-zinc-400">{o.help}</span>
                  {/* WHY IT IS ON THE LIST, on the list. A response offered with
                      no basis is indistinguishable from one somebody invented,
                      and this module's whole claim is that it did not. */}
                  <span className="mt-1 block text-[11px] leading-snug text-zinc-500">{o.basis}</span>
                </button>
              ))}
            </div>

            {picked && (
              <label className="block">
                <span className="text-[12px] text-zinc-400">{PROMPTS[picked.id]}</span>
                <textarea
                  value={wrote}
                  onChange={(e) => setWrote(e.target.value)}
                  rows={3}
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-white placeholder:text-zinc-700 focus:border-violet-400/50 focus:outline-none"
                />
              </label>
            )}

            {/* Somebody else, at the same moment rather than in general. */}
            <OneVoice stage="urge" viceId={viceId} rotate={rotate} />

            <p className="text-[11.5px] leading-relaxed text-zinc-500">{RESPOND.anyIsFine}</p>

            <div className="flex items-center justify-between gap-3">
              <QuietButton onClick={() => setStage("where")}>Back</QuietButton>
              <PrimaryButton disabled={!picked} onClick={() => setStage("outcome")}>
                Come back to this
              </PrimaryButton>
            </div>
          </>
        )}

        {stage === "outcome" && (
          <>
            {hasLiveRun ? (
              <>
                <p className="text-[13px] leading-relaxed text-zinc-300">
                  Either answer is worth filing. A night you nearly went is the same chain as a night
                  you did, and the near ones are the ones nobody writes down.
                </p>
                <div className="grid gap-2">
                  <PrimaryButton onClick={() => onFile({ wentThrough: false, didInstead: wrote.trim() })}>
                    It passed
                  </PrimaryButton>
                  <QuietButton onClick={() => onFile({ wentThrough: true, didInstead: wrote.trim() })}>
                    I went through with it
                  </QuietButton>
                </div>
              </>
            ) : (
              <Panel tone="quiet">
                <Empty>
                  There is no run going, so there is nothing to file this against. What you just did
                  still counts; starting a run is what gives the next one somewhere to land.
                </Empty>
              </Panel>
            )}
            <div className="flex justify-between">
              <QuietButton onClick={() => setStage("respond")}>Back</QuietButton>
              <QuietButton onClick={onClose}>Close</QuietButton>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
