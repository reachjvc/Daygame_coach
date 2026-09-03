"use client"

/**
 * The third step, and it is one sentence with everything that holds it up.
 *
 * This used to be "All goals": straight from picturing twelve areas into
 * listing what you want in all twelve. What comes out of that is a list of
 * everything that came to mind, area by area, with no argument about which of
 * it matters — and a plan that is a list of everything is a plan nobody runs.
 *
 * So the step before the list asks for the one change that would make the next
 * few years far more likely to work, and then asks the four questions that
 * decide whether it survives contact with February:
 *
 *   why it matters, and what it costs if it does not happen
 *   who you would have to be for it to be true
 *   what it is in service of — the values it is a bet on
 *   WHAT NEEDS TO HAPPEN for it to work
 *
 * That last one is not a reflection. Each line becomes a real goal, filed in
 * the area it belongs to, and the goals page opens with them already written:
 * the list stops being everything you want and starts being what this needs.
 */

import { useState } from "react"
import { ArrowRight, Check, Plus, X } from "lucide-react"
import type { NsPlan, NorthStarTabId } from "@/src/goals/types"
import { ONE_ANSWERS, ONE_COPY } from "@/src/goals/data/northStarStart"
import {
  answerOf,
  areaKeywordIndex,
  collectValues,
  goalsLikeOneThing,
  guessAreaId,
  oneThingAreas,
  oneThingRequirements,
} from "@/src/goals/northStarService"
import { OneThingCard, type OneThingHandlers } from "./OneThing"
import type { OneThingAccount } from "./useOneThing"
import { SentenceBox } from "./SentenceBox"

export interface OneThingTabHandlers extends OneThingHandlers {
  onAddRequirement: (title: string, areaId?: string) => void
  onMarkServes: (goalId: string, on: boolean) => void
  onRemoveGoal: (goalId: string) => void
  onGoToTab: (tab: NorthStarTabId) => void
  onToggleOneThingArea: (areaId: string) => void
}

export function OneThingTab({
  plan,
  handlers,
  account,
}: {
  plan: NsPlan
  handlers: OneThingTabHandlers
  account: OneThingAccount
}) {
  /* THE SAVED SENTENCE, not a draft of one. Everything on this step hangs off
     the one thing, and it used to hang off whatever was in the box — so the
     questions underneath opened for text nobody had committed to, and closed
     again if the browser was cleared while the account still held the answer. */
  const oneThing = account.current?.body ?? ""
  const requirements = oneThingRequirements(plan)
  const related = oneThing.trim() ? goalsLikeOneThing(plan, oneThing) : []
  const values = collectValues(plan)
  const touches = oneThingAreas(plan)
  const chosen = answerOf(plan, ONE_ANSWERS.values).split("\n").filter(Boolean)
  // Everything under the sentence is about the sentence, so none of it opens
  // until there is one. Asking why something matters before it exists is how
  // you get a page of empty boxes.
  /**
   * THE GATE ONLY CLOSES ON SOMETHING WE ACTUALLY KNOW.
   *
   * "Nothing is written yet" is an assertion about the account, so it is only
   * safe to make it when the account has answered. While the read is in flight,
   * when it failed, and when nobody is signed in — the anonymous
   * `/test/life-mastery` surface — this page must not hide the why, the cost,
   * the identity and the values that are sitting in the plan already. Hiding
   * them there would have been permanent: signed out, the sentence cannot be
   * saved at all, so the gate could never open.
   */
  const accountAnswered = account.loaded && !account.signedOut && !account.error
  const written = oneThing.trim().length > 0 || !accountAnswered

  return (
    <div className="space-y-5">
      <p className="text-[12.5px] text-zinc-400 leading-relaxed">{ONE_COPY.intro}</p>

      {/* ------------------------------------------------------ the sentence */}
      <section className="rounded-2xl border border-violet-400/25 bg-violet-500/[0.05] px-5 py-4">
        <OneThingCard account={account} title={ONE_COPY.title} help={ONE_COPY.help} />
      </section>

      {!written ? (
        <p className="text-[11.5px] text-zinc-500 leading-relaxed px-1">{ONE_COPY.waiting}</p>
      ) : (
        <>
          {/* --------------------------------------------- why, and the cost */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-200">{ONE_COPY.whyTitle}</h2>
              <p className="text-[11.5px] text-zinc-400 mt-1 leading-relaxed">{ONE_COPY.whyHelp}</p>
              <div className="mt-2.5">
                <SentenceBox
                  value={answerOf(plan, ONE_ANSWERS.why)}
                  onChange={(text) => handlers.onAnswer(ONE_ANSWERS.why, text)}
                  placeholder={ONE_COPY.whyPlaceholder}
                  label={ONE_COPY.whyTitle}
                  rows={2}
                />
              </div>
            </div>
            <div>
              <p className="text-[13px] text-zinc-200">{ONE_COPY.costTitle}</p>
              <p className="text-[11.5px] text-zinc-400 mt-1 leading-relaxed">{ONE_COPY.costHelp}</p>
              <div className="mt-2.5">
                <SentenceBox
                  value={answerOf(plan, ONE_ANSWERS.cost)}
                  onChange={(text) => handlers.onAnswer(ONE_ANSWERS.cost, text)}
                  placeholder={ONE_COPY.costPlaceholder}
                  label={ONE_COPY.costTitle}
                  rows={2}
                />
              </div>
            </div>
          </section>

          {/* --------------------------------------------------- who, and what for */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4">
            <h2 className="text-sm font-semibold text-zinc-200">{ONE_COPY.identityTitle}</h2>
            <p className="text-[11.5px] text-zinc-400 mt-1 leading-relaxed">{ONE_COPY.identityHelp}</p>
            <div className="mt-2.5">
              <SentenceBox
                value={answerOf(plan, ONE_ANSWERS.identity)}
                onChange={(text) => handlers.onAnswer(ONE_ANSWERS.identity, text)}
                placeholder={ONE_COPY.identityPlaceholder}
                label={ONE_COPY.identityTitle}
                rows={2}
              />
            </div>

            <p className="text-[13px] text-zinc-200 mt-4">{ONE_COPY.valuesTitle}</p>
            <p className="text-[11.5px] text-zinc-400 mt-1 leading-relaxed">{ONE_COPY.valuesHelp}</p>
            {values.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5 mt-2">
                {values.map((value) => {
                  const on = chosen.includes(value)
                  return (
                    <li key={value}>
                      <button
                        onClick={() => {
                          const next = on ? chosen.filter((v) => v !== value) : [...chosen, value]
                          handlers.onAnswer(ONE_ANSWERS.values, next.join("\n"))
                        }}
                        aria-pressed={on}
                        className={`inline-flex items-center gap-1 text-[11.5px] px-2.5 py-1 rounded-full border transition-colors ${
                          on ? "border-violet-400/50 bg-violet-500/15 text-violet-50" : "border-white/10 text-zinc-400 hover:text-zinc-100 hover:border-white/30"
                        }`}
                      >
                        {on && <Check className="size-3" />}
                        {value}
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              // Values are named in the areas and ranked at step 6. Nothing to
              // pick from is a real state, not an error.
              <p className="text-[11.5px] text-zinc-500 mt-2 leading-relaxed">{ONE_COPY.valuesNone}</p>
            )}
          </section>

          {/* ------------------------------------------- which areas it touches */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4">
            <h2 className="text-sm font-semibold text-zinc-200">{ONE_COPY.areasTitle}</h2>
            <p className="text-[11.5px] text-zinc-400 mt-1 leading-relaxed">{ONE_COPY.areasHelp}</p>
            <ul className="flex flex-wrap gap-1.5 mt-2.5">
              {plan.areas.map((area) => {
                const on = touches.includes(area.id)
                return (
                  <li key={area.id}>
                    <button
                      onClick={() => handlers.onToggleOneThingArea(area.id)}
                      aria-pressed={on}
                      className={`inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-1 rounded-full border transition-colors ${
                        on ? "border-violet-400/50 bg-violet-500/15 text-violet-50" : "border-white/10 text-zinc-400 hover:text-zinc-100 hover:border-white/30"
                      }`}
                    >
                      <span className="size-1.5 rounded-full" style={{ backgroundColor: area.color }} />
                      {area.label}
                      {on && <Check className="size-3" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>

          {/* ------------------------------------ what needs to happen for it */}
          <Requirements plan={plan} requirements={requirements} related={related} handlers={handlers} />
        </>
      )}
    </div>
  )
}

/**
 * The list that becomes the plan.
 *
 * Each line is a goal, in an area, and the area is guessed from the words and
 * then shown as a chip you can change — guessing silently is how "stop buying
 * it" ends up filed under Health when the person meant Money.
 */
function Requirements({
  plan,
  requirements,
  related,
  handlers,
}: {
  plan: NsPlan
  requirements: ReturnType<typeof oneThingRequirements>
  related: ReturnType<typeof goalsLikeOneThing>
  handlers: OneThingTabHandlers
}) {
  const [draft, setDraft] = useState("")
  const [areaId, setAreaId] = useState<string | null>(null)
  const guess = draft.trim() ? guessAreaId(areaKeywordIndex(plan.areas), draft) : null
  const filed = areaId ?? guess ?? plan.areas[0]?.id ?? null

  const add = () => {
    if (!draft.trim()) return
    handlers.onAddRequirement(draft, filed ?? undefined)
    setDraft("")
    setAreaId(null)
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4">
      <h2 className="text-sm font-semibold text-zinc-200">{ONE_COPY.needsTitle}</h2>
      <p className="text-[11.5px] text-zinc-400 mt-1 leading-relaxed">{ONE_COPY.needsHelp}</p>

      {requirements.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {requirements.map((goal) => {
            const area = plan.areas.find((a) => a.id === goal.areaId)
            return (
              <li key={goal.id} className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5">
                <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: area?.color ?? "#a1a1aa" }} />
                <span className="min-w-0 flex-1 text-[12.5px] text-zinc-100 truncate">{goal.title}</span>
                <span className="text-[10px] text-zinc-500 shrink-0">{area?.label}</span>
                <button
                  onClick={() => handlers.onRemoveGoal(goal.id)}
                  aria-label={`Remove ${goal.title}`}
                  className="shrink-0 text-zinc-600 hover:text-rose-300 transition-colors"
                ><X className="size-3.5" /></button>
              </li>
            )
          })}
        </ul>
      )}

      <div className="flex items-center gap-1.5 mt-3">
        <Plus className="size-3.5 text-zinc-600 shrink-0" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add() } }}
          placeholder={ONE_COPY.needsPlaceholder}
          aria-label={ONE_COPY.needsTitle}
          className="flex-1 min-w-0 bg-transparent border-b border-white/10 focus:border-white/30 text-[13px] text-zinc-100 placeholder:text-zinc-700 focus:outline-none py-1 transition-colors"
        />
        <button
          onClick={add}
          disabled={!draft.trim()}
          className="shrink-0 text-[11.5px] px-2.5 py-1 rounded-lg border border-white/15 text-zinc-100 hover:bg-white/10 disabled:opacity-30 transition-colors"
        >{ONE_COPY.needsAdd}</button>
      </div>

      {/* Where it lands, before it lands. */}
      {draft.trim() && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">{ONE_COPY.needsArea}</span>
          {plan.areas.map((area) => (
            <button
              key={area.id}
              onClick={() => setAreaId(area.id)}
              aria-pressed={filed === area.id}
              className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                filed === area.id ? "border-white/35 bg-white/10 text-zinc-100" : "border-white/10 text-zinc-500 hover:text-zinc-200"
              }`}
            >
              <span className="size-1.5 rounded-full" style={{ backgroundColor: area.color }} />
              {area.label}
            </button>
          ))}
        </div>
      )}

      {/* Already written, and about this. Offered rather than linked: a word in
          common is a reason to ask, not an answer. */}
      {related.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] text-zinc-500">{ONE_COPY.needsAlready}</p>
          <ul className="mt-1.5 space-y-1">
            {related.slice(0, 6).map((goal) => {
              const area = plan.areas.find((a) => a.id === goal.areaId)
              return (
                <li key={goal.id}>
                  <button
                    onClick={() => handlers.onMarkServes(goal.id, true)}
                    className="w-full flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5 text-left hover:border-white/25 transition-colors"
                  >
                    <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: area?.color ?? "#a1a1aa" }} />
                    <span className="min-w-0 flex-1 text-[12.5px] text-zinc-200 truncate">{goal.title}</span>
                    {/* The area, because two areas can hold the same sentence
                        and a list with one title twice reads as broken. */}
                    <span className="text-[10px] text-zinc-500 shrink-0">{area?.label}</span>
                    <span className="text-[10px] text-zinc-600 shrink-0">{ONE_COPY.needsLink}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {requirements.length > 0 && (
        <button
          onClick={() => handlers.onGoToTab("milestones")}
          className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-lg border border-violet-500/40 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25 transition-colors"
        >
          {ONE_COPY.needsGo(requirements.length)}
          <ArrowRight className="size-3.5" />
        </button>
      )}
    </section>
  )
}
