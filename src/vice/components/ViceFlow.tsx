"use client"

/**
 * The chrome around a flow: the rail, the current step, the footer, and the
 * tools, all of which are reachable from every screen.
 *
 * Nothing gates. Every step is reachable at any time, no step blocks on a word
 * count, and the rail's ticks are descriptive rather than permissive — the same
 * decision the north star flow next door made, for the same reason. A gate on
 * step three does not produce a better answer to step three; it produces
 * somebody who closes the tab.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Check, ChevronDown } from "lucide-react"
import type { ViceFlowId, ViceHandlers, ViceToolId } from "../types"
import { PROVENANCE } from "../data/copy"
import { flowOf, flowProgress, stepIsDone, viceAsText, viceStateIsUntouched, votesCast } from "../viceService"
import { useViceState } from "../hooks/useViceState"
import { StepChips, StepIntro, StepPickVice, StepRuler, StepSafety, StepText, type StepProps } from "./steps/BasicSteps"
import { StepBinding, StepCard, StepIfThen, StepNegotiate, StepRefusal, StepTape, StepVoice } from "./steps/PlanSteps"
import { StepLog, StepMissions, StepReview, StepWindow } from "./steps/DataSteps"
import { StepCount, StepDoors, StepFeedback, StepTrajectory, StepUsage } from "./steps/AwarenessSteps"
import { StepBeliefTest, StepBeliefs, StepFutures, StepLetter, StepValues } from "./steps/GivesSteps"
import { CardTool, LapseTool, UrgeTool } from "./Tools"
import { HelpDoor } from "./HelpDoor"
import { AgainTool } from "./Again"
import { VoicesDialog } from "./Voices"
import { TripwireTool } from "./Tripwire"
import { QuietButton, Why } from "./Ui"

export function ViceFlow({ flowId }: { flowId: ViceFlowId }) {
  const flow = flowOf(flowId)
  const { state, loaded, today, handlers, reset } = useViceState(flowId)
  const [stepId, setStepId] = useState(flow.steps[0].id)
  const [tool, setTool] = useState<ViceToolId | "none">("none")
  const [confirmReset, setConfirmReset] = useState(false)
  const [railOpen, setRailOpen] = useState(false)
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle")

  const goToStep = useCallback((id: string) => {
    setStepId(id)
    // A step change that leaves the reader halfway down the previous screen
    // reads as nothing having happened.
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  const nextStep = useCallback(() => {
    setStepId((current) => {
      const at = flow.steps.findIndex((s) => s.id === current)
      return flow.steps[Math.min(flow.steps.length - 1, at + 1)].id
    })
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
  }, [flow])

  /** The shell owns the dialogs, so it supplies the handlers the hook cannot. */
  const on: ViceHandlers = useMemo(
    () => ({ ...handlers, openUrge: () => setTool("urge"), openHelp: () => setTool("help"), openTool: setTool, goToStep, nextStep }),
    [handlers, goToStep],
  )

  const index = flow.steps.findIndex((s) => s.id === stepId)
  const step = flow.steps[index] ?? flow.steps[0]
  const progress = flowProgress(state, flow)

  /**
   * Copy everything out.
   *
   * The confirmation resets itself. It used to latch: once clicked, the button
   * read "copied" (or "your browser blocked the copy") forever, so a second
   * copy looked like a dead control — the text never changed and nothing
   * appeared to happen. Anybody who wanted their notes twice got a button that
   * had visibly stopped working.
   */
  const copy = async () => {
    if (!today) return
    try {
      await navigator.clipboard.writeText(viceAsText(state, today))
      setCopied("done")
    } catch {
      setCopied("failed")
    }
  }

  useEffect(() => {
    if (copied === "idle") return
    const t = window.setTimeout(() => setCopied("idle"), 2500)
    return () => window.clearTimeout(t)
  }, [copied])

  const props: StepProps = { step, state, today: today ?? "", on }

  return (
    // `data-hydrated` flips once the client effect has run. The markup is
    // server-rendered, so every button exists and looks clickable well before
    // React has attached a handler to it — a click in that window does nothing
    // at all. This gives a test (and anybody debugging) one honest signal for
    // "the page is actually working now" rather than "the page is present".
    <div className="min-h-screen bg-zinc-950 text-white" data-hydrated={loaded ? "true" : undefined}>
      <div className="max-w-3xl mx-auto px-6 py-10 pb-32">
        <div className="flex items-center justify-between gap-3 mb-6">
          <Link href="/test/quit-vice" className="inline-flex items-center gap-1.5 text-[12px] text-zinc-500 hover:text-white transition-colors">
            <ArrowLeft className="size-3.5" />
            Back
          </Link>
          {confirmReset ? (
            <span className="flex items-center gap-2 text-[11px]">
              <span className="text-zinc-400">Delete everything, in every flow?</span>
              <button onClick={() => { reset(); setConfirmReset(false); goToStep(flow.steps[0].id) }} className="text-rose-300 hover:text-rose-200">yes, start over</button>
              <button onClick={() => setConfirmReset(false)} className="text-zinc-500 hover:text-zinc-300">keep it</button>
            </span>
          ) : (
            <button onClick={() => setConfirmReset(true)} className="text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors">
              start over
            </button>
          )}
        </div>

        <header className="mb-6">
          <h1 className="text-2xl font-semibold">{flow.label}</h1>
          <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{flow.pitch}</p>
          <Why label="the position this flow takes"><p>{flow.basis}</p></Why>
        </header>

        {/* The rail, collapsed.
            
            It used to list every step, numbered, on every screen — twelve
            titles on the longest flow, which is about sixty words repeated
            fifty times across the module and roughly a third of everything
            visible on a given screen. It also made every flow look like a
            twelve-part course before you had done anything.

            So: where you are, how far through, and the whole list one tap
            away. Nothing has become unreachable. */}
        <nav aria-label="Steps" className="mb-6">
          <button
            onClick={() => setRailOpen((v) => !v)}
            aria-expanded={railOpen}
            className="flex w-full items-center gap-2.5 text-left"
          >
            <span className="text-[11px] text-zinc-600 tabular-nums shrink-0">
              {index + 1}/{flow.steps.length}
            </span>
            <span className="text-[13px] text-zinc-200 truncate">{step.title}</span>
            <ChevronDown className={`size-3.5 ml-auto shrink-0 text-zinc-600 transition-transform ${railOpen ? "rotate-180" : ""}`} />
          </button>
          <div className="mt-2 h-0.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-violet-400/60 transition-all"
              style={{ width: `${((index + 1) / flow.steps.length) * 100}%` }}
            />
          </div>

          {railOpen && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {flow.steps.map((s, i) => {
                const active = s.id === step.id
                const done = stepIsDone(state, s)
                return (
                  <button
                    key={s.id}
                    onClick={() => { goToStep(s.id); setRailOpen(false) }}
                    aria-current={active ? "step" : undefined}
                    className={`inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-1.5 rounded-full border transition-colors ${
                      active
                        ? "border-violet-400/50 bg-violet-500/15 text-violet-100"
                        : done
                          ? "border-emerald-400/25 bg-emerald-500/[0.07] text-emerald-200/80 hover:border-emerald-400/50"
                          : "border-white/10 bg-white/[0.02] text-zinc-500 hover:border-white/30 hover:text-zinc-300"
                    }`}
                  >
                    {done ? <Check className="size-3 shrink-0" /> : <span className="tabular-nums text-[10px] opacity-60">{i + 1}</span>}
                    {s.title}
                  </button>
                )
              })}
            </div>
          )}
        </nav>

        {!loaded || !today ? (
          <p className="text-sm text-zinc-500">Opening…</p>
        ) : (
          <>
            {step.kind === "intro" && <StepIntro {...props} />}
            {step.kind === "pickVice" && <StepPickVice {...props} />}
            {step.kind === "safety" && <StepSafety {...props} />}
            {step.kind === "ruler" && <StepRuler {...props} />}
            {step.kind === "text" && <StepText {...props} />}
            {step.kind === "chips" && <StepChips {...props} />}
            {step.kind === "negotiate" && <StepNegotiate {...props} />}
            {step.kind === "ifthen" && <StepIfThen {...props} />}
            {step.kind === "binding" && <StepBinding {...props} />}
            {step.kind === "refusal" && <StepRefusal {...props} />}
            {step.kind === "voice" && <StepVoice {...props} />}
            {step.kind === "card" && <StepCard {...props} />}
            {step.kind === "tape" && <StepTape {...props} />}
            {step.kind === "log" && <StepLog {...props} />}
            {step.kind === "window" && <StepWindow {...props} />}
            {step.kind === "missions" && <StepMissions {...props} />}
            {step.kind === "review" && <StepReview {...props} />}
            {step.kind === "count" && <StepCount {...props} />}
            {step.kind === "usage" && <StepUsage {...props} />}
            {step.kind === "feedback" && <StepFeedback {...props} />}
            {step.kind === "trajectory" && <StepTrajectory {...props} />}
            {step.kind === "doors" && <StepDoors {...props} />}
            {step.kind === "beliefs" && <StepBeliefs {...props} />}
            {step.kind === "beliefTest" && <StepBeliefTest {...props} />}
            {step.kind === "values" && <StepValues {...props} />}
            {step.kind === "futures" && <StepFutures {...props} />}
            {step.kind === "letter" && <StepLetter {...props} />}

            <div className="flex items-center justify-between gap-3 mt-8">
              {index > 0 ? (
                <button onClick={() => goToStep(flow.steps[index - 1].id)} className="text-xs text-zinc-400 hover:text-white transition-colors">
                  ← {flow.steps[index - 1].title}
                </button>
              ) : <span />}
              {index < flow.steps.length - 1 ? (
                <button
                  onClick={() => goToStep(flow.steps[index + 1].id)}
                  className="text-sm font-medium px-4 py-2 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-100 hover:bg-violet-500/30 transition-colors"
                >
                  {flow.steps[index + 1].title} →
                </button>
              ) : (
                <span className="text-[11px] text-zinc-600 tabular-nums">{progress.done} of {progress.total} done</span>
              )}
            </div>

            {!viceStateIsUntouched(state) && (
              <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4">
                <div className="flex items-center gap-3">
                  <p className="text-[12px] text-zinc-400">
                    {progress.done} of {progress.total} steps have something in them, and {votesCast(state)} urges have come and gone without you acting on one.
                  </p>
                  <button onClick={copy} className="ml-auto text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors shrink-0">
                    {copied === "done" ? "copied" : copied === "failed" ? "your browser blocked the copy" : "copy it all as text"}
                  </button>
                </div>
              </div>
            )}

            <details className="mt-6">
              <summary className="cursor-pointer text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors">
                {PROVENANCE.title}
              </summary>
              <div className="mt-2 space-y-2">
                {PROVENANCE.lines.map((line, i) => (
                  <p key={i} className="text-[11px] text-zinc-600 leading-relaxed">{line}</p>
                ))}
                <p className="text-[11px] text-zinc-600 leading-relaxed">{PROVENANCE.evidence}</p>
              </div>
            </details>
          </>
        )}
      </div>

      {/* The toolbar. The same acute tools on every screen of every flow. */}
      <div className="sticky bottom-0 bg-zinc-950/90 backdrop-blur-sm border-t border-white/10">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-2">
          <button
            onClick={() => setTool("urge")}
            className="text-[13px] font-medium px-3.5 py-2 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-100 hover:bg-violet-500/30 transition-colors"
          >
            An urge, right now
          </button>
          <button
            onClick={() => setTool("lapse")}
            className="text-[13px] px-3.5 py-2 rounded-lg border border-white/10 text-zinc-300 hover:border-white/30 hover:text-white transition-colors"
          >
            It already happened
          </button>
          <button
            onClick={() => setTool("card")}
            className="text-[13px] px-3.5 py-2 rounded-lg border border-white/10 text-zinc-300 hover:border-white/30 hover:text-white transition-colors"
          >
            My card
          </button>
          {/* Quiet, and on every screen. Somebody who needs this needs it now,
              not after finding their way back to the hub. */}
          <button
            onClick={() => setTool("help")}
            className="ml-auto text-[12px] text-zinc-500 hover:text-white underline underline-offset-2 decoration-white/20 transition-colors shrink-0"
          >
            Need more than this
          </button>
        </div>
      </div>

      {tool === "urge" && loaded && (
        <UrgeTool state={state} on={on} onClose={() => setTool("none")} onLapse={() => setTool("lapse")} />
      )}
      {tool === "lapse" && loaded && <LapseTool state={state} on={on} onClose={() => setTool("none")} />}
      {tool === "card" && loaded && <CardTool state={state} on={on} onClose={() => setTool("none")} />}
      {tool === "help" && loaded && <HelpDoor state={state} on={on} onClose={() => setTool("none")} />}
      {tool === "again" && loaded && <AgainTool state={state} on={on} onClose={() => setTool("none")} />}
      {tool === "voices" && loaded && <VoicesDialog viceId={state.viceId} onClose={() => setTool("none")} />}
      {tool === "tripwire" && loaded && <TripwireTool state={state} on={on} onClose={() => setTool("none")} />}
    </div>
  )
}
