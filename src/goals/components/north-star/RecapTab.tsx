"use client"

/**
 * The last step — the plan, whole, on one page.
 *
 * Every other step asks a question. This one asks nothing. It is the thing the
 * other twelve produced, laid out to be RE-READ: the paragraph, the reason
 * under it, who you said you are, what you hold yourself to, your affirmations,
 * your values in order, the twelve areas with the 10 you wrote in each, the
 * goals, the routines, and the list of things to have done.
 *
 * Two decisions decide the whole shape of it.
 *
 * READ FIRST, EDIT SECOND. Everything on the page renders as prose, not as a
 * form. The steps that wrote this material are forms and should be — a page of
 * boxes is what you need when you are deciding — but a box is a bad way to be
 * reminded of something, and "what did I say my values were" is not a question
 * you answer by scrolling past twelve labelled textareas. So each block reads
 * back, and each block carries one "edit" link that swaps that block, and only
 * that block, into the editor the writing step uses.
 *
 * NOTHING IS COUNTED HERE. No rings, no "3 of 5 answered", no list of what is
 * missing. The outstanding work already has a home under every tab. A page you
 * open to remember who you decided to be must not greet you with what you owe
 * it — that is the one thing that would stop somebody coming back to it, and
 * coming back to it is the entire mechanism.
 *
 * The goals list is passed in rather than built here: it is `GoalOverview`, the
 * same component the commit step reads back, with the flow's handlers on it.
 */

import { useState } from "react"
// Utility icons only. Every semantic icon in this project already means
// something somewhere else, and reusing one in a new context needs sign-off.
// `Check` is here in the one meaning it already carries in this folder: the tick
// on a "things to have done" row, the same markup `Experiences.tsx` draws.
import { Check, ChevronDown } from "lucide-react"
import type { NsArea, NsAreaReview, NsPlan, NsReviewPrompt } from "@/src/goals/types"
import { HORIZON_CHOICES, HORIZON_SCREEN } from "@/src/goals/data/lifeMasteryWhy"
import {
  NORTH_STAR_SCREEN,
  RECAP_COPY,
  RECAP_DRIVING_ANCHOR,
  RECAP_PRACTICES,
  REVIEW_PROMPTS,
  SEASON_FOCUS_COPY,
  STAR_PROMPTS,
  STAR_WHY_ID,
} from "@/src/goals/data/northStar"
import { COMMIT_DATE_KEY, COMMIT_KEY, EXPERIENCES_COPY, ONE_ANSWERS, ONE_COPY } from "@/src/goals/data/northStarStart"
import {
  answerOf,
  areaReview,
  dailyAverage,
  formatTargetDate,
  planIsUntouched,
  practiceState,
  routineSummary,
  seasonFocus,
  valuesDiff,
} from "@/src/goals/northStarService"
import { AreaWheel } from "./AreaWheel"
import { ValuesWork, type ValuesHandlers } from "./ValuesWork"

export interface RecapHandlers {
  onStar: (text: string) => void
  onHorizon: (years: number) => void
  onAnswer: (promptId: string, text: string) => void
  onAreaReview: (areaId: string, patch: Partial<NsAreaReview>) => void
  onAddExperiences: (text: string) => void
  onToggleExperience: (id: string) => void
  onRemoveExperience: (id: string) => void
  /** Tick a routine step off for today, or untick it. Writes today's log. */
  onTickPractice: (stepId: string) => void
  /** Start running one: turn the step on, and tick today, in one press. */
  onTrackPractice: (blueprintId: string, stepId: string) => void
}

function starPrompt(id: string): NsReviewPrompt {
  const prompt = STAR_PROMPTS.find((p) => p.id === id)
  if (!prompt) throw new Error(`Unknown star prompt "${id}"`)
  return prompt
}

/**
 * A block of the document: a heading you can fold, and one edit link.
 *
 * `defaultOpen` is false only for the blocks that are long and situational —
 * the areas, the routines, the closing answers. The material somebody comes
 * here to re-read (the star, who they are, the values) is open on arrival,
 * because a page that opens as a list of closed headings has reminded nobody
 * of anything.
 */
function Block({
  title,
  help,
  aside,
  defaultOpen = true,
  onEdit,
  editing,
  accent,
  children,
}: {
  title: string
  help?: string
  /** A short right-hand readout: a count, a date, a horizon. */
  aside?: React.ReactNode
  defaultOpen?: boolean
  /** Omitted on blocks whose editing happens somewhere else. */
  onEdit?: () => void
  editing?: boolean
  accent?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section
      className={`rounded-2xl border ${
        accent ? "border-violet-400/25 bg-gradient-to-br from-violet-500/[0.07] via-white/[0.03] to-transparent" : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <div className="flex items-center gap-3 px-5 py-3.5">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-baseline gap-2 min-w-0 flex-1 text-left group"
        >
          <ChevronDown className={`size-4 shrink-0 self-center text-zinc-500 transition-transform ${open ? "" : "-rotate-90"}`} />
          <span className="min-w-0">
            <span className={`block text-sm font-semibold ${accent ? "text-violet-100" : "text-zinc-200"} group-hover:text-white transition-colors`}>
              {title}
            </span>
            {help && <span className="block text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{help}</span>}
          </span>
        </button>
        {aside && <span className="text-[11px] text-zinc-500 tabular-nums shrink-0">{aside}</span>}
        {onEdit && (
          <button
            onClick={() => { setOpen(true); onEdit() }}
            className="shrink-0 text-[11px] text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            {editing ? RECAP_COPY.done : RECAP_COPY.edit}
          </button>
        )}
      </div>
      {open && <div className="px-5 pb-5">{children}</div>}
    </section>
  )
}

/** One written answer, read back, with the same box under it when asked for. */
function Answer({
  prompt,
  plan,
  editing,
  onAnswer,
  /** Identity, standards and affirmations are lists of lines, not paragraphs. */
  asLines,
}: {
  prompt: NsReviewPrompt
  plan: NsPlan
  editing: boolean
  onAnswer: (promptId: string, text: string) => void
  asLines?: boolean
}) {
  const text = answerOf(plan, prompt.id).trim()
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{prompt.question}</p>
      {editing ? (
        <textarea
          value={answerOf(plan, prompt.id)}
          onChange={(e) => onAnswer(prompt.id, e.target.value)}
          placeholder={prompt.placeholder}
          rows={asLines ? 5 : 4}
          aria-label={prompt.question}
          className="w-full mt-1.5 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-400/40 resize-y transition-colors"
        />
      ) : lines.length === 0 ? (
        <p className="text-[12.5px] text-zinc-600 mt-1">{prompt.placeholder ?? ""}</p>
      ) : asLines ? (
        <ul className="mt-1.5 space-y-1">
          {lines.map((line, i) => (
            <li key={i} className="text-[13.5px] text-zinc-200 leading-relaxed pl-3 border-l-2 border-violet-400/30">
              {line}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13.5px] text-zinc-200 leading-relaxed mt-1 whitespace-pre-wrap">{text}</p>
      )}
    </div>
  )
}

/**
 * THE TICK, ON THE THING YOU JUST READ.
 *
 * Reading the north star is a step in a morning stack, and until now the only
 * place to tick it was the Today step: read it here, then leave the page, open
 * Today, unfold the stack, and find the line whose entire content you had just
 * finished doing. Two screens for one act.
 *
 * It writes to the same day's log Today writes to — `plan.logged[date]`, keyed
 * by the step's id — so the two screens can never disagree about whether it
 * happened. Nothing about it is a second tally.
 *
 * When nothing in the plan runs this practice yet, the row is an offer instead,
 * and one press does both halves: it turns the step on in the routine it
 * belongs to, and ticks off today, because somebody who has just read the thing
 * has already done today's.
 */
function PracticeRow({
  plan,
  today,
  practiceKey,
  onTick,
  onTrack,
}: {
  plan: NsPlan
  today: string
  practiceKey: keyof typeof RECAP_PRACTICES
  onTick: (stepId: string) => void
  onTrack: (blueprintId: string, stepId: string) => void
}) {
  const { running, offer } = practiceState(plan, practiceKey, today)

  if (running.length === 0) {
    if (!offer) return null
    return (
      <button
        onClick={() => onTrack(offer.blueprintId, offer.stepId)}
        className="mt-3 flex items-center gap-2 text-[11.5px] text-zinc-500 hover:text-zinc-200 transition-colors"
      >
        <span className="size-4 shrink-0 rounded-[4px] border border-dashed border-white/20 inline-flex items-center justify-center">+</span>
        <span>{RECAP_COPY.practiceStart}</span>
        <span className="text-zinc-600">
          {RECAP_COPY.practiceStartHelp}{" "}
          {offer.addsRoutine ? RECAP_COPY.practiceAdds(offer.routineLabel) : RECAP_COPY.practiceWhere(offer.routineLabel)}
        </span>
      </button>
    )
  }

  return (
    <div className="mt-3 space-y-1.5">
      {running.map((practice) => (
        <button
          key={practice.stepId}
          onClick={() => onTick(practice.stepId)}
          aria-pressed={practice.doneToday}
          className="flex items-center gap-2 text-left group/p"
        >
          {/* The same tick as Today and the experiences list. One gesture. */}
          <span
            className={`size-4 shrink-0 rounded-[4px] border inline-flex items-center justify-center transition-colors ${
              practice.doneToday ? "bg-emerald-500/25 border-emerald-400/50" : "border-white/15 group-hover/p:border-white/40"
            }`}
          >
            {practice.doneToday && <Check className="size-2.5 text-emerald-200" />}
          </span>
          <span className={`text-[11.5px] ${practice.doneToday ? "text-emerald-300/90" : "text-zinc-400 group-hover/p:text-zinc-200"} transition-colors`}>
            {practice.doneToday ? RECAP_COPY.practiceDone : RECAP_COPY.practiceTick}
          </span>
          <span className="text-[11px] text-zinc-600 min-w-0 truncate">
            {practice.title} · {RECAP_COPY.practiceWhere(practice.routineLabel)}
          </span>
        </button>
      ))}
    </div>
  )
}

/** One area, read back: the rating, the 10, and what it asks of you. */
function AreaCard({ area, plan, today, onOpen }: { area: NsArea; plan: NsPlan; today: string; onOpen: () => void }) {
  const r = areaReview(plan, area.id)
  const avg = dailyAverage(plan, area.id, today)
  const written = [r.ten, r.purpose, r.identity, r.snapshot].some((t) => t.trim())

  return (
    <button
      onClick={onOpen}
      className="text-left rounded-xl border border-white/10 bg-white/[0.02] hover:border-white/25 transition-colors p-3.5 w-full"
      aria-label={`${RECAP_COPY.areaOpen}: ${area.label}`}
    >
      <span className="flex items-center gap-2">
        <span className="size-2.5 rounded-full shrink-0" style={{ background: area.color }} />
        <span className="text-[13px] font-medium text-zinc-100 min-w-0 flex-1 truncate">{area.label}</span>
        <span className="text-[11px] tabular-nums shrink-0 text-zinc-400">
          {r.fortnight != null ? `${r.fortnight}/10` : RECAP_COPY.areaUnrated}
          {avg != null && <span className="text-zinc-600"> · {avg}</span>}
        </span>
      </span>

      {written ? (
        <span className="block mt-2 space-y-1.5">
          {r.ten.trim() && (
            <span className="block">
              <span className="block text-[10px] uppercase tracking-[0.12em] text-zinc-600">{RECAP_COPY.areaTen}</span>
              <span className="block text-[12.5px] text-zinc-300 leading-relaxed">{r.ten.trim()}</span>
            </span>
          )}
          {r.purpose.trim() && (
            <span className="block">
              <span className="block text-[10px] uppercase tracking-[0.12em] text-zinc-600">{RECAP_COPY.areaPurpose}</span>
              <span className="block text-[12.5px] text-zinc-400 leading-relaxed">{r.purpose.trim()}</span>
            </span>
          )}
          {r.identity.trim() && (
            <span className="block">
              <span className="block text-[10px] uppercase tracking-[0.12em] text-zinc-600">{RECAP_COPY.areaIdentity}</span>
              <span className="block text-[12.5px] text-zinc-300 leading-relaxed">{r.identity.trim()}</span>
            </span>
          )}
        </span>
      ) : (
        <span className="block mt-2 text-[11.5px] text-zinc-600">{area.sublabel}</span>
      )}

      {r.values.length > 0 && (
        <span className="flex flex-wrap gap-1 mt-2">
          {r.values.map((v) => (
            <span key={v} className="text-[10.5px] px-1.5 py-0.5 rounded-full border border-white/10 text-zinc-400">{v}</span>
          ))}
        </span>
      )}
    </button>
  )
}

export function RecapTab({
  plan,
  today,
  handlers,
  valuesHandlers,
  onOpenArea,
  onOpenRoutine,
  onGoToTab,
  oneThing,
  goals,
}: {
  plan: NsPlan
  today: string
  handlers: RecapHandlers
  valuesHandlers: ValuesHandlers
  /** Opens the area's own dialog, where the rest of its boxes are. */
  onOpenArea: (areaId: string) => void
  onOpenRoutine: (routineId: string) => void
  onGoToTab: (tab: "star" | "one" | "now" | "milestones" | "systems" | "values" | "commit") => void
  /**
   * The saved one thing, read from the account by the flow. Null when nothing
   * has been written. Not editable here — see the block below.
   */
  oneThing: string | null
  /**
   * The goals, read back — `GoalOverview` with the flow's handlers, and the
   * quick-add above it. Passed in rather than built here for the same reason
   * the commit step takes it as a prop: reordering and deleting a goal are the
   * flow's business, and a second copy of that wiring is a second thing to keep
   * in step.
   */
  goals?: React.ReactNode
}) {
  /** Which block is in edit mode. One at a time, so the page stays readable. */
  const [editing, setEditing] = useState<string | null>(null)
  const [dump, setDump] = useState("")
  const toggle = (id: string) => setEditing((cur) => (cur === id ? null : id))

  const focus = seasonFocus(plan)
  const diff = valuesDiff(plan)
  const routines = plan.routines.filter((r) => r.steps.length > 0)
  const ratings = Object.fromEntries(
    plan.areas.map((a) => [a.id, areaReview(plan, a.id).fortnight]).filter(([, v]) => v != null) as Array<[string, number]>
  )
  const goalCounts = Object.fromEntries(plan.areas.map((a) => [a.id, plan.goals.filter((g) => g.areaId === a.id).length]))
  const committedOn = answerOf(plan, COMMIT_DATE_KEY)
  const closing = REVIEW_PROMPTS.filter((p) => answerOf(plan, p.id).trim() || editing === "closing")

  if (planIsUntouched(plan)) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-8 text-center">
        <p className="text-sm text-zinc-400">{RECAP_COPY.empty}</p>
        <button
          onClick={() => onGoToTab("star")}
          className="mt-3 text-[12.5px] px-3 py-1.5 rounded-lg border border-violet-500/40 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25 transition-colors"
        >
          {RECAP_COPY.starTitle} →
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">{RECAP_COPY.title}</h2>
        <p className="text-[12.5px] text-zinc-400 mt-1 leading-relaxed">{RECAP_COPY.help}</p>
        <p className="text-[11px] text-zinc-600 mt-1">{RECAP_COPY.openHint}</p>
      </div>

      {/* The paragraph, and the reason under it. One card, because the reason
          is the half that survives a bad month and reading one without the
          other is what makes a vision feel like a wish. */}
      <Block
        title={RECAP_COPY.starTitle}
        accent
        aside={RECAP_COPY.starHorizon(plan.horizonYears)}
        onEdit={() => toggle("star")}
        editing={editing === "star"}
      >
        {editing === "star" ? (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {HORIZON_CHOICES.map((years) => {
                const option = HORIZON_SCREEN.options.find((o) => o.years === years)
                const active = plan.horizonYears === years
                return (
                  <button
                    key={years}
                    onClick={() => handlers.onHorizon(years)}
                    aria-pressed={active}
                    className={`text-[12px] px-3 py-1.5 rounded-lg border transition-colors ${
                      active ? "border-violet-400/50 bg-violet-500/15 text-violet-100" : "border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/25"
                    }`}
                  >
                    {option?.label ?? `${years} years`}
                  </button>
                )
              })}
            </div>
            <textarea
              value={plan.northStar}
              onChange={(e) => handlers.onStar(e.target.value)}
              placeholder={NORTH_STAR_SCREEN.placeholder}
              rows={12}
              aria-label={RECAP_COPY.starTitle}
              className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-[15px] leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-400/40 resize-y transition-colors"
            />
          </>
        ) : plan.northStar.trim() ? (
          <p className="text-[15px] text-zinc-100 leading-[1.75] whitespace-pre-wrap">{plan.northStar.trim()}</p>
        ) : (
          <p className="text-[13px] text-zinc-600">{RECAP_COPY.starEmpty}</p>
        )}

        <div className="mt-4 pt-4 border-t border-white/10">
          <Answer prompt={starPrompt(STAR_WHY_ID)} plan={plan} editing={editing === "star"} onAnswer={handlers.onAnswer} />
        </div>

        {/* Under the reading, because that is when it has been done. */}
        <PracticeRow
          plan={plan}
          today={today}
          practiceKey="star"
          onTick={handlers.onTickPractice}
          onTrack={handlers.onTrackPractice}
        />
      </Block>

      {/* The one thing, and the four answers that hold it up. */}
      <Block
        title={RECAP_COPY.oneTitle}
        onEdit={() => toggle("one")}
        editing={editing === "one"}
      >
        {editing === "one" ? (
          <div className="space-y-4">
            {/* NOT A SECOND BOX TO WRITE IT IN.
                This was a textarea that wrote the sentence into the plan while
                the account held the real one, so editing your one thing on the
                recap changed a copy nothing reads and left the tracking header
                showing the old words. The sentence has one editing surface, on
                the step that owns it, because it carries a deadline and a
                history that no textarea here could write. */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{ONE_COPY.title}</p>
              <p className="text-[13px] text-zinc-100 mt-1.5 leading-relaxed">
                {oneThing?.trim() || <span className="text-zinc-600">{RECAP_COPY.oneEmpty}</span>}
              </p>
              <button
                type="button"
                onClick={() => onGoToTab("one")}
                className="mt-1.5 text-[11px] text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                {oneThing?.trim() ? "Change it on the step that owns it" : "Write it on the step that owns it"}
              </button>
            </div>
            {[
              { key: ONE_ANSWERS.why, label: ONE_COPY.whyTitle },
              { key: ONE_ANSWERS.cost, label: ONE_COPY.costTitle },
              { key: ONE_ANSWERS.identity, label: ONE_COPY.identityTitle },
              { key: ONE_ANSWERS.values, label: ONE_COPY.valuesTitle },
            ].map(({ key, label }) => (
              <div key={key}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</p>
                <textarea
                  value={answerOf(plan, key)}
                  onChange={(e) => handlers.onAnswer(key, e.target.value)}
                  rows={3}
                  aria-label={label}
                  className="w-full mt-1.5 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-400/40 resize-y transition-colors"
                />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* THE SENTENCE, NOT THE MARKED GOAL.
                `seasonFocusId` is a different field with a confusingly similar
                name: it is the goal you would keep if you dropped everything
                else, ticked on a goal card. This block asks what the one thing
                IS, and every other surface in the flow answers that with the
                sentence from step 3 — reading the marked goal here meant
                somebody who wrote "100 days of no weed" was told their one
                thing was "flat bench 100 kg", because a goal had been ticked
                weeks earlier. The marked goal is shown under it, named for
                what it is. */}
            <p className="text-[15px] text-zinc-100 leading-relaxed">
              {oneThing?.trim() || <span className="text-zinc-600 text-[13px]">{RECAP_COPY.oneEmpty}</span>}
            </p>
            {focus && (
              <p className="text-[11.5px] text-zinc-500 mt-1.5">{SEASON_FOCUS_COPY.banner(focus.label)}</p>
            )}
            <div className="mt-3 space-y-3">
              {[
                { key: ONE_ANSWERS.why, label: ONE_COPY.whyTitle },
                { key: ONE_ANSWERS.cost, label: ONE_COPY.costTitle },
                { key: ONE_ANSWERS.identity, label: ONE_COPY.identityTitle },
                { key: ONE_ANSWERS.values, label: ONE_COPY.valuesTitle },
              ]
                .filter(({ key }) => answerOf(plan, key).trim())
                .map(({ key, label }) => (
                  <div key={key}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">{label}</p>
                    <p className="text-[13px] text-zinc-300 leading-relaxed mt-0.5 whitespace-pre-wrap">{answerOf(plan, key).trim()}</p>
                  </div>
                ))}
            </div>
          </>
        )}
      </Block>

      {/* Who you say you are, what you hold yourself to, and the lines you say
          out loud. Together, because they are one daily read and splitting them
          across three cards is what made them three separate chores. */}
      <Block
        title={RECAP_COPY.identityTitle}
        help={RECAP_COPY.identityHelp}
        onEdit={() => toggle("identity")}
        editing={editing === "identity"}
      >
        <div className="space-y-4">
          <Answer prompt={starPrompt("identity_total")} plan={plan} editing={editing === "identity"} onAnswer={handlers.onAnswer} asLines />
          <Answer prompt={starPrompt("conduct")} plan={plan} editing={editing === "identity"} onAnswer={handlers.onAnswer} asLines />
          <Answer prompt={starPrompt("affirmations")} plan={plan} editing={editing === "identity"} onAnswer={handlers.onAnswer} asLines />
          <div className="pt-3 border-t border-white/10">
            <Answer prompt={starPrompt("become")} plan={plan} editing={editing === "identity"} onAnswer={handlers.onAnswer} />
          </div>
        </div>

        {/* Two practices, because they are two things you say out loud. */}
        <PracticeRow plan={plan} today={today} practiceKey="identity" onTick={handlers.onTickPractice} onTrack={handlers.onTrackPractice} />
        <PracticeRow plan={plan} today={today} practiceKey="affirmations" onTick={handlers.onTickPractice} onTrack={handlers.onTrackPractice} />
      </Block>

      {/* The values, in order, with the list they replaced under them. */}
      <Block
        title={RECAP_COPY.valuesTitle}
        help={RECAP_COPY.valuesHelp}
        aside={plan.values.length > 0 ? `${plan.values.length}` : undefined}
        onEdit={() => toggle("values")}
        editing={editing === "values"}
      >
        {editing === "values" ? (
          <ValuesWork plan={plan} handlers={valuesHandlers} mode="order" />
        ) : plan.values.length === 0 ? (
          <p className="text-[13px] text-zinc-600">{RECAP_COPY.valuesEmpty}</p>
        ) : (
          <ol className="space-y-1.5">
            {plan.values.map((value, i) => (
              <li key={value} className="flex items-baseline gap-3">
                <span className={`text-[11px] tabular-nums w-5 shrink-0 text-right ${i < 3 ? "text-violet-300" : "text-zinc-600"}`}>{i + 1}</span>
                <span className={i < 3 ? "text-[15px] text-zinc-100" : "text-[13.5px] text-zinc-300"}>{value}</span>
              </li>
            ))}
          </ol>
        )}

        {(plan.currentValues.length > 0 || diff.added.length > 0 || diff.dropped.length > 0) && (
          <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
            {plan.currentValues.length > 0 && (
              <p className="text-[11.5px] text-zinc-500">
                <span className="text-zinc-600">{RECAP_COPY.valuesPast}: </span>
                {plan.currentValues.join(", ")}
              </p>
            )}
            {diff.added.length > 0 && (
              <p className="text-[11.5px] text-emerald-300/80">
                <span className="text-zinc-600">{RECAP_COPY.valuesAdded}: </span>
                {diff.added.join(", ")}
              </p>
            )}
            {diff.dropped.length > 0 && (
              <p className="text-[11.5px] text-amber-200/80">
                <span className="text-zinc-600">{RECAP_COPY.valuesDropped}: </span>
                {diff.dropped.join(", ")}
              </p>
            )}
          </div>
        )}
      </Block>

      {/* The twelve areas. The wheel because it is the picture people remember
          the shape of, and the cards because the wheel cannot hold a sentence. */}
      <Block title={RECAP_COPY.areasTitle} help={RECAP_COPY.areasHelp} defaultOpen={false}>
        <div className="flex justify-center">
          <AreaWheel
            areas={plan.areas}
            ratings={ratings}
            goalCounts={goalCounts}
            activeId={null}
            selectedIds={plan.seasonAreaIds}
            onPick={onOpenArea}
            centreLabel={RECAP_COPY.areasTitle}
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 mt-4">
          {plan.areas.map((area) => (
            <AreaCard key={area.id} area={area} plan={plan} today={today} onOpen={() => onOpenArea(area.id)} />
          ))}
        </div>
      </Block>

      {/* The goals, exactly as the commit step reads them back. */}
      {goals && (
        <Block title={RECAP_COPY.goalsTitle} aside={plan.goals.length > 0 ? `${plan.goals.length}` : undefined} defaultOpen={false}>
          {goals}
        </Block>
      )}

      {/* What actually runs every week. */}
      <Block
        title={RECAP_COPY.routinesTitle}
        aside={routines.length > 0 ? `${routines.length}` : undefined}
        defaultOpen={false}
      >
        {routines.length === 0 ? (
          <p className="text-[13px] text-zinc-600">{RECAP_COPY.routinesEmpty}</p>
        ) : (
          <div className="space-y-3">
            {routines.map((routine) => (
              <div key={routine.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
                <button onClick={() => onOpenRoutine(routine.id)} className="flex items-baseline gap-2 w-full text-left group">
                  <span className="text-[13px] font-medium text-zinc-100 group-hover:text-white transition-colors">{routine.label}</span>
                  <span className="text-[11px] text-zinc-500">{routineSummary(routine)}</span>
                </button>
                <ol className="mt-2 space-y-0.5">
                  {routine.steps.map((step) => (
                    <li key={step.id} className="text-[12.5px] text-zinc-400 flex items-baseline gap-2">
                      <span className="text-zinc-700">·</span>
                      <span className="min-w-0 flex-1">{step.title}</span>
                      {routine.kind === "weekly" && <span className="text-[11px] text-zinc-600 tabular-nums shrink-0">{step.daysPerWeek}×/wk</span>}
                    </li>
                  ))}
                </ol>
                {routine.splitDays.length > 0 && (
                  <p className="text-[11px] text-zinc-500 mt-2">{routine.splitDays.map((d) => d.name).join(" · ")}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Block>

      {/* Things to have done. Editable in place, because remembering one is the
          commonest thing that happens while reading this page. */}
      <Block
        title={RECAP_COPY.experiencesTitle}
        aside={plan.experiences.length > 0 ? `${plan.experiences.filter((e) => e.done).length}/${plan.experiences.length}` : undefined}
        defaultOpen={false}
      >
        {plan.experiences.length === 0 ? (
          <p className="text-[13px] text-zinc-600">{RECAP_COPY.experiencesEmpty}</p>
        ) : (
          <ul className="space-y-1">
            {plan.experiences.map((item) => {
              const area = item.areaId ? plan.areas.find((a) => a.id === item.areaId) : null
              return (
              <li key={item.id} className="flex items-center gap-2 group">
                {/* The same tick as the experiences step, deliberately: it is the
                    same row, and a list that ticks differently in two places
                    reads as two lists. */}
                <button
                  onClick={() => handlers.onToggleExperience(item.id)}
                  aria-pressed={item.done}
                  aria-label={item.done ? EXPERIENCES_COPY.undo : EXPERIENCES_COPY.done}
                  className={`size-4 shrink-0 rounded-[4px] border inline-flex items-center justify-center transition-colors ${
                    item.done ? "bg-emerald-500/25 border-emerald-400/50" : "border-white/15 hover:border-white/40"
                  }`}
                >
                  {item.done && <Check className="size-2.5 text-emerald-200" />}
                </button>
                {area && <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: area.color }} />}
                <span className={`min-w-0 flex-1 text-[13px] leading-relaxed ${item.done ? "text-zinc-500 line-through" : "text-zinc-200"}`}>
                  {item.title}
                </span>
                <button
                  onClick={() => handlers.onRemoveExperience(item.id)}
                  className="shrink-0 text-[11px] text-zinc-700 hover:text-rose-300 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  remove
                </button>
              </li>
              )
            })}
          </ul>
        )}
        <textarea
          value={dump}
          onChange={(e) => setDump(e.target.value)}
          rows={3}
          placeholder={RECAP_COPY.experiencesAdd}
          aria-label={RECAP_COPY.experiencesAdd}
          className="w-full mt-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-[13px] text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-white/30 transition-colors leading-relaxed resize-y"
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={() => { handlers.onAddExperiences(dump); setDump("") }}
            disabled={!dump.trim()}
            className="text-[11.5px] px-2.5 py-1 rounded-lg border border-white/15 text-zinc-100 hover:bg-white/10 disabled:opacity-30 transition-colors"
          >
            Add
          </button>
        </div>
      </Block>

      {/* What could stop you, who could help, and what you signed. */}
      <Block
        title={RECAP_COPY.closingTitle}
        defaultOpen={false}
        onEdit={() => toggle("closing")}
        editing={editing === "closing"}
      >
        <div className="space-y-4">
          {closing.map((prompt) => (
            <Answer key={prompt.id} prompt={prompt} plan={plan} editing={editing === "closing"} onAnswer={handlers.onAnswer} />
          ))}
          <div className="pt-3 border-t border-white/10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{RECAP_COPY.commitTitle}</p>
            {editing === "closing" ? (
              <textarea
                value={answerOf(plan, COMMIT_KEY)}
                onChange={(e) => handlers.onAnswer(COMMIT_KEY, e.target.value)}
                rows={3}
                aria-label={RECAP_COPY.commitTitle}
                className="w-full mt-1.5 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-400/40 resize-y transition-colors"
              />
            ) : answerOf(plan, COMMIT_KEY).trim() ? (
              <p className="text-[13.5px] text-zinc-200 leading-relaxed mt-1 whitespace-pre-wrap">{answerOf(plan, COMMIT_KEY).trim()}</p>
            ) : (
              <p className="text-[13px] text-zinc-600 mt-1">{RECAP_COPY.commitNone}</p>
            )}
            {committedOn && (
              <p className="text-[11px] text-emerald-300/80 mt-1.5">{RECAP_COPY.commitOn(formatTargetDate(committedOn))}</p>
            )}
          </div>
        </div>
      </Block>

      {/* THE WHOLE THING, AT THE END OF THE WHOLE THING.
          Reading the driving force — vision, purpose, identity, standards,
          values — is one practice and this page is all five of them. It sits
          last because that is where somebody is standing when they have done
          it, and it is the only row on the page that is about the page. */}
      <section id={RECAP_DRIVING_ANCHOR} className="scroll-mt-24 rounded-2xl border border-violet-400/20 bg-violet-500/[0.04] px-5 py-4">
        <h2 className="text-sm font-semibold text-violet-100">{RECAP_COPY.wholeTitle}</h2>
        <p className="text-[11.5px] text-zinc-400 mt-1 leading-relaxed">{RECAP_COPY.wholeHelp}</p>
        <PracticeRow plan={plan} today={today} practiceKey="whole" onTick={handlers.onTickPractice} onTrack={handlers.onTrackPractice} />
      </section>
    </div>
  )
}
