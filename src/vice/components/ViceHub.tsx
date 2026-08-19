"use client"

/**
 * The front door.
 *
 * Two things on it, in this order. The tools first — because something might be
 * happening right now, and a page that makes somebody pick a methodology before
 * it will help them at eleven at night is no use at eleven at night. Then the
 * four flows, described honestly enough that nobody starts the wrong one.
 *
 * The flows are laid out as a choice rather than a recommendation. Each one is
 * built on a position the research actually takes, those positions contradict
 * each other, and the contradictions are real — so the page says what each is
 * for and what it asks, and leaves the picking alone.
 */

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { ViceHandlers } from "../types"
import { VICE_FLOWS } from "../data/flows"
import { PROVENANCE, TRIPWIRE } from "../data/copy"
import { daysHeld, flowOf, inHazardWindow, payoffSummary, plansOfKind, urgeSummary, viceStateIsUntouched, votesCast } from "../viceService"
import { useViceState } from "../hooks/useViceState"
import { CardTool, LapseTool, UrgeTool } from "./Tools"
import { HelpDoor } from "./HelpDoor"
import { VoicesDialog } from "./Voices"
import { TripwireTool } from "./Tripwire"
import { HubPlain } from "./HubPlain"
import { HubGuided } from "./HubGuided"
import { VersionSwitcher } from "./VersionSwitcher"
import { useViceVersion } from "../hooks/useViceVersion"
import { Panel, Stat } from "./Ui"

/**
 * The two that ask for no commitment go above, together, and apart from the
 * rest. Both work on somebody who has concluded nothing, which is where most
 * people are — including most of the people who turn out to have a problem.
 */
const OPEN_FLOWS = [flowOf("where"), flowOf("gives")]
const CHANGE_FLOWS = VICE_FLOWS.filter((flow) => !OPEN_FLOWS.some((f) => f.id === flow.id))

export function ViceHub() {
  const { state, loaded, handlers } = useViceState(null)
  const { version, setVersion, loaded: versionLoaded } = useViceVersion()
  const [tool, setTool] = useState<"none" | "urge" | "lapse" | "card" | "help" | "voices" | "tripwire">("none")

  const on: ViceHandlers = useMemo(
    () => ({ ...handlers, openUrge: () => setTool("urge"), openHelp: () => setTool("help"), goToStep: () => {} }),
    [handlers],
  )

  const started = loaded && !viceStateIsUntouched(state)
  // The good stretch is the moment nothing else in this module speaks to.
  const hazard = loaded ? inHazardWindow(state) : null
  const hasTripwire = plansOfKind(state, "tripwire").length > 0
  const payoff = payoffSummary(state)
  const urges = urgeSummary(state)

  return (
    // See the note in ViceFlow: this flips once the client effect has run, and
    // it is the only reliable "the buttons work now" signal on a page that is
    // server-rendered before it is interactive.
    <div className="min-h-screen bg-zinc-950 text-white" data-hydrated={loaded ? "true" : undefined}>
      <div className="max-w-3xl mx-auto px-6 py-10 pb-20">
        <Link href="/test" className="inline-flex items-center gap-1.5 text-[12px] text-zinc-500 hover:text-white transition-colors">
          <ArrowLeft className="size-3.5" />
          Test pages
        </Link>

        {/* Three front doors over one state. Everything below the switcher is
            the same data whichever is picked — a version is a view, never a
            container, and switching must never cost somebody their work. */}
        {version === "plain" && <HubPlain state={state} on={on} openTool={setTool} />}
        {version === "guided" && <HubGuided openTool={setTool} />}
        {version === "full" && (
          <>
        <header className="mt-6 mb-7">
          <h1 className="text-2xl font-semibold">Quitting something</h1>
          <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
            Two ways to work out where you stand, four ways through it once you have, and three things that work with none of it.
          </p>
        </header>

        {/* First, and above the flows on purpose. Roughly half the attempts
            that work are not planned in advance, so the door has to open for
            somebody who arrived mid-urge with no intention of reading anything. */}
        <section className="mb-8">
          <h2 className="text-[13px] font-semibold text-zinc-200 mb-2">Right now</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              onClick={() => setTool("urge")}
              className="rounded-xl border border-violet-400/40 bg-violet-500/10 p-3.5 text-left hover:bg-violet-500/15 transition-colors"
            >
              <span className="block text-[14px] font-medium text-violet-100">An urge, now</span>
              <span className="block text-[11px] text-violet-200/60 mt-0.5 leading-snug">Ninety seconds. Nothing to set up.</span>
            </button>
            <button
              onClick={() => setTool("lapse")}
              className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 text-left hover:border-white/25 transition-colors"
            >
              <span className="block text-[14px] font-medium text-zinc-100">It already happened</span>
              <span className="block text-[11px] text-zinc-500 mt-0.5 leading-snug">No counter to reset. There is not one.</span>
            </button>
            <button
              onClick={() => setTool("card")}
              className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 text-left hover:border-white/25 transition-colors"
            >
              <span className="block text-[14px] font-medium text-zinc-100">My card</span>
              <span className="block text-[11px] text-zinc-500 mt-0.5 leading-snug">Three reasons and one line.</span>
            </button>
            {/* Fourth, and it needs no setup at all — which is why it is up
                here with the other three rather than filed under reading.
                In the one community with good measured outcomes this was the
                most-valued thing on offer. */}
            <button
              onClick={() => setTool("voices")}
              className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 text-left hover:border-white/25 transition-colors"
            >
              <span className="block text-[14px] font-medium text-zinc-100">What other people said</span>
              <span className="block text-[11px] text-zinc-500 mt-0.5 leading-snug">Real accounts, cited. Nothing to set up.</span>
            </button>
          </div>
          {/* Not styled as an alarm. Somebody who wants it will find it, and
              making it loud would make the page feel like it expects a crisis. */}
          <button
            onClick={() => setTool("help")}
            className="mt-2 text-[12px] text-zinc-500 hover:text-white underline underline-offset-2 decoration-white/20 transition-colors"
          >
            If this is past what a page can do — who to ring, and what treatment actually is
          </button>
          <button
            onClick={() => setTool("tripwire")}
            className="mt-1.5 block text-[12px] text-zinc-500 hover:text-white underline underline-offset-2 decoration-white/20 transition-colors"
          >
            A rule for the week it is going well — the moment people actually describe going wrong
          </button>
        </section>

        {/* Fires on a good stretch rather than a bad night, which is the one
            moment this module had nothing to say about. Framed as information,
            never as a warning that they are about to fail. */}
        {hazard !== null && !hasTripwire && (
          <button
            onClick={() => setTool("tripwire")}
            className="mb-8 block w-full rounded-2xl border border-amber-400/25 bg-amber-500/[0.06] p-4 text-left hover:border-amber-400/45 transition-colors"
          >
            <span className="block text-[14px] font-medium text-amber-100">{TRIPWIRE.nudgeTitle}</span>
            <span className="block text-[12.5px] text-amber-100/70 mt-1 leading-relaxed">{TRIPWIRE.nudge}</span>
          </button>
        )}

        {started && (
          <section className="mb-8">
            <div className="flex items-baseline gap-2 mb-2">
              <h2 className="text-[13px] font-semibold text-zinc-200">Where you are</h2>
              {state.viceLabel && <span className="text-[11px] text-zinc-600">{state.viceLabel}</span>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Stat value={String(votesCast(state))} caption="urges came and went without you acting" tone={votesCast(state) > 0 ? "good" : "plain"} />
              <Stat value={String(daysHeld(state))} caption="days with something logged and nothing done" tone={daysHeld(state) > 0 ? "good" : "plain"} />
              <Stat value={payoff.n > 0 ? `${payoff.avgExpected} → ${payoff.avgActual}` : "–"} caption="expected, then actual" />
              <Stat value={urges.n > 0 ? `${urges.medianMinutes}m` : "–"} caption="your median urge when you did not act" />
            </div>
          </section>
        )}

        {/* Sits above the four, and apart from them, because it is the only one
            that works on somebody who has not concluded there is anything to
            work on — which is the position most people are in, including most
            of the people who turn out to have a real problem. */}
        <section className="mb-8">
          <h2 className="text-[13px] font-semibold text-zinc-200 mb-2">Not sure yet</h2>
          <div className="space-y-2.5">
            {OPEN_FLOWS.map((flow) => (
              <Link
                key={flow.id}
                href={`/test/quit-vice/${flow.id}`}
                className="block rounded-2xl border border-sky-400/25 bg-sky-500/[0.05] p-4 hover:border-sky-400/50 hover:bg-sky-500/[0.08] transition-colors group"
              >
                <div className="flex items-baseline gap-3">
                  <h3 className="text-[15px] font-semibold text-sky-50 group-hover:text-white transition-colors">{flow.label}</h3>
                  <span className="text-[11px] text-zinc-600 tabular-nums ml-auto shrink-0">about {flow.minutes} min</span>
                </div>
                <p className="text-[13px] text-zinc-300 mt-1 leading-relaxed">{flow.pitch}</p>
                <p className="text-[11.5px] text-zinc-500 mt-1.5 leading-relaxed">{flow.forWho}</p>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-[13px] font-semibold text-zinc-200 mb-2">Four ways through it</h2>
          <div className="space-y-2.5">
            {CHANGE_FLOWS.map((flow) => (
              <Link
                key={flow.id}
                href={`/test/quit-vice/${flow.id}`}
                className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:border-violet-400/40 hover:bg-violet-500/[0.05] transition-colors group"
              >
                <div className="flex items-baseline gap-3">
                  <h3 className="text-[15px] font-semibold text-zinc-100 group-hover:text-white transition-colors">{flow.label}</h3>
                  <span className="text-[11px] text-zinc-600 tabular-nums ml-auto shrink-0">
                    about {flow.minutes} min
                    {state.flowId === flow.id && <span className="text-violet-300/70"> · last opened</span>}
                  </span>
                </div>
                <p className="text-[13px] text-zinc-300 mt-1 leading-relaxed">{flow.pitch}</p>
                <dl className="mt-2.5 space-y-1">
                  <div className="flex gap-2">
                    <dt className="text-[11px] text-zinc-600 w-14 shrink-0">For</dt>
                    <dd className="text-[11.5px] text-zinc-400 leading-relaxed">{flow.forWho}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-[11px] text-zinc-600 w-14 shrink-0">Asks</dt>
                    <dd className="text-[11.5px] text-zinc-400 leading-relaxed">{flow.asks}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-[11px] text-zinc-600 w-14 shrink-0">Based on</dt>
                    <dd className="text-[11.5px] text-zinc-500 leading-relaxed">{flow.basis}</dd>
                  </div>
                </dl>
              </Link>
            ))}
          </div>
          <p className="text-[11px] text-zinc-600 mt-3 leading-relaxed">
            They share everything. Start one, move to another, and the log, the plans, the card and the voice work all come with you.
          </p>
        </section>

          </>
        )}

        {version === "full" && (
        <Panel tone="quiet" className="mt-8">
          <p className="text-[12px] text-zinc-400 leading-relaxed">{PROVENANCE.evidence}</p>
          <details className="mt-3">
            <summary className="cursor-pointer text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors">{PROVENANCE.title}</summary>
            <div className="mt-2 space-y-2">
              {PROVENANCE.lines.map((line, i) => (
                <p key={i} className="text-[11px] text-zinc-600 leading-relaxed">{line}</p>
              ))}
            </div>
          </details>
        </Panel>
        )}

        {versionLoaded && <VersionSwitcher version={version} onChange={setVersion} />}

        <p className="text-[11px] text-zinc-600 mt-6 leading-relaxed">
          Everything you type stays in this browser. Nothing is sent anywhere, and there is no account. &ldquo;Start over&rdquo; inside any flow deletes the lot.
        </p>
      </div>

      {tool === "urge" && loaded && (
        <UrgeTool state={state} on={on} onClose={() => setTool("none")} onLapse={() => setTool("lapse")} />
      )}
      {tool === "lapse" && loaded && <LapseTool state={state} on={on} onClose={() => setTool("none")} />}
      {tool === "card" && loaded && <CardTool state={state} on={on} onClose={() => setTool("none")} />}
      {tool === "help" && loaded && <HelpDoor state={state} on={on} onClose={() => setTool("none")} />}
      {tool === "voices" && loaded && <VoicesDialog viceId={state.viceId} onClose={() => setTool("none")} />}
      {tool === "tripwire" && loaded && <TripwireTool state={state} on={on} onClose={() => setTool("none")} />}
    </div>
  )
}
