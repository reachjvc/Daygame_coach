"use client"

/**
 * The way out of the module.
 *
 * Reachable in one tap from every screen of every flow, and from the hub. That
 * is not generosity — the awareness flow can hand somebody an accurate picture
 * of a serious problem, and a module with no exit from itself is a module that
 * does that and then offers a body-map picker.
 *
 * Order on this screen is the design. Crisis first, unconditionally, before any
 * reading. Then "there is no bar to clear", because that single belief accounts
 * for most of the people who never get as far as looking. Then the three
 * corrections that change whether somebody picks up a phone — it is not rehab,
 * it does not require stopping completely, and there is medication. Barriers
 * after that, and a plan with a time on it at the bottom, because an intention
 * without a when is not a plan and this module already knows that.
 */

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LifeBuoy } from "lucide-react"
import type { HelpLocale, ViceHandlers, ViceState } from "../types"
import { HELP, SERVICES, VERIFIED } from "../data/help"
import { IFTHEN } from "../data/copy"
import { planProblem } from "../viceService"
import { Panel, PrimaryButton, QuietButton, Why } from "./Ui"

const LOCALES: HelpLocale[] = ["uk", "us", "other"]

export function HelpDoor({ state, on, onClose }: { state: ViceState; on: ViceHandlers; onClose: () => void }) {
  const locale = state.helpLocale
  const region = locale ? SERVICES[locale] : null
  const [when, setWhen] = useState("")
  const [then, setThen] = useState("")
  const [added, setAdded] = useState(false)

  const problem = when.trim() && then.trim() ? planProblem({ when, then }) : null
  // planProblem returns codes for the two rules and a sentence for the empty
  // fields. Rendering the code raw puts the word "negation" on the screen.
  const message = problem === "negation" ? IFTHEN.rejectNegation : problem === "vague" ? IFTHEN.vagueCue : problem
  const canAdd = when.trim().length > 0 && then.trim().length > 0 && !problem

  const relevant = (region?.items ?? []).filter(
    (service) => !service.forVice || (state.viceId !== null && service.forVice.includes(state.viceId)),
  )
  const crisis = relevant.filter((s) => s.crisis)
  const rest = relevant.filter((s) => !s.crisis)

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto bg-zinc-950 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-white">
            <LifeBuoy className="size-4 text-violet-300" />
            {HELP.title}
          </DialogTitle>
        </DialogHeader>

        {/* Locale first, because everything below it is a phone number and a
            phone number for the wrong country is worse than none. */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-zinc-400">{HELP.localeQuestion}</span>
          {LOCALES.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={locale === id}
              onClick={() => on.setHelpLocale(id)}
              className={`text-[12px] px-3 py-1 rounded-full border transition-colors ${
                locale === id
                  ? "border-violet-400/50 bg-violet-500/15 text-violet-100"
                  : "border-white/10 text-zinc-400 hover:border-white/30 hover:text-zinc-200"
              }`}
            >
              {SERVICES[id].label}
            </button>
          ))}
        </div>

        {!region ? (
          <p className="text-[12px] text-zinc-500 leading-relaxed">{HELP.localeNote}</p>
        ) : (
          <>
            {/* Unconditionally first. Nothing renders above this block. */}
            <div className="rounded-2xl border border-rose-400/35 bg-rose-500/[0.08] p-4">
              <p className="text-[13px] font-semibold text-rose-100">{HELP.crisisHeading}</p>
              <p className="text-[12.5px] text-rose-100/75 mt-1 leading-relaxed">{HELP.crisisBlurb}</p>
              <p className="text-[13px] text-rose-50 mt-3">
                Emergency: <span className="font-semibold tabular-nums">{region.emergency}</span>
              </p>
              <ul className="mt-2 space-y-2">
                {crisis.map((service) => (
                  <li key={service.name}>
                    <p className="text-[13px] text-rose-50">
                      {service.name} — <span className="font-semibold tabular-nums">{service.contact}</span>
                    </p>
                    <p className="text-[11.5px] text-rose-100/65 leading-relaxed">{service.note}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Headline visible, the case for it one tap down. Somebody who
                needs a phone number should not have to read four essays. */}
            {[HELP.badEnough, HELP.notRehab, HELP.notAbstinence, HELP.medication].map((block) => (
              <div key={block.title} className="rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-3">
                <p className="text-[13.5px] font-medium text-zinc-100">{block.title}</p>
                <Why label="the evidence">
                  {block.lines.map((line, i) => (<p key={i}>{line}</p>))}
                </Why>
              </div>
            ))}

            {rest.length > 0 && (
              <div className="mt-1">
                <p className="text-[13px] font-medium text-zinc-200 mb-2">Who to actually contact</p>
                <ul className="space-y-2">
                  {rest.map((service) => (
                    <li key={service.name} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                      <p className="flex flex-wrap items-baseline gap-x-2 text-[13px] text-zinc-100">
                        {service.name}
                        <span className="font-semibold tabular-nums text-violet-200">{service.contact}</span>
                      </p>
                      <p className="text-[11.5px] text-zinc-500 mt-1 leading-relaxed">{service.note}</p>
                      {service.url && (
                        <a
                          href={service.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors"
                        >
                          {service.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <details className="mt-1">
              <summary className="cursor-pointer text-[12px] text-zinc-400 hover:text-zinc-200 transition-colors">
                The reasons people give for not going, and what is true about each
              </summary>
              <ul className="mt-2 space-y-2.5">
                {HELP.barriers.map((item) => (
                  <li key={item.id}>
                    <p className="text-[12.5px] text-zinc-300 italic">&ldquo;{item.barrier}&rdquo;</p>
                    <p className="text-[12.5px] text-zinc-400 mt-0.5 leading-relaxed">{item.answer}</p>
                  </li>
                ))}
              </ul>
            </details>

            {/* The only thing on the screen that asks for anything. */}
            <Panel tone="live" className="mt-1">
              <p className="text-[13.5px] font-medium text-violet-100">{HELP.plan.title}</p>
              <p className="text-[12px] text-violet-200/70 mt-0.5 leading-relaxed">{HELP.plan.blurb}</p>
              <div className="grid gap-2 mt-3">
                <label className="block">
                  <span className="text-[11px] text-zinc-500">When…</span>
                  <input
                    value={when}
                    onChange={(e) => { setWhen(e.target.value); setAdded(false) }}
                    placeholder={HELP.plan.whenPlaceholder}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-white placeholder:text-zinc-700 focus:border-violet-400/50 focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] text-zinc-500">…then I</span>
                  <input
                    value={then}
                    onChange={(e) => { setThen(e.target.value); setAdded(false) }}
                    placeholder={HELP.plan.thenPlaceholder}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-white placeholder:text-zinc-700 focus:border-violet-400/50 focus:outline-none"
                  />
                </label>
              </div>
              {message && <p className="text-[11.5px] text-amber-200/80 mt-2 leading-relaxed">{message}</p>}
              {added ? (
                <p className="text-[12px] text-emerald-200/80 mt-3">{HELP.plan.done}</p>
              ) : (
                <div className="mt-3">
                  <PrimaryButton
                    disabled={!canAdd}
                    onClick={() => { on.addPlan(when.trim(), then.trim()); setAdded(true) }}
                  >
                    Add it to my plans
                  </PrimaryButton>
                </div>
              )}
            </Panel>

            <Why label="what this page can and cannot do"><p>{HELP.ceiling}</p></Why>
            <p className="text-[11px] text-zinc-700 leading-relaxed">
              {HELP.verifiedNote.replace("{date}", VERIFIED)}
            </p>
          </>
        )}

        <div className="mt-3">
          <QuietButton onClick={onClose}>close</QuietButton>
        </div>
      </DialogContent>
    </Dialog>
  )
}
