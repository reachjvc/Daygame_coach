"use client"

/**
 * The five doors, and two of them.
 *
 * The chooser lives here, along with the two doors that are lists of lines you
 * tick: the 10 you already wrote, and the five questions. The other two are big
 * enough to be their own screens — the written day and the drawn week — and
 * live next door.
 *
 * The shape every door ends in is the same: candidate lines, unticked, with a
 * button that adds the ticked ones. NOTHING IS ADDED WITHOUT A TICK. A door
 * that helpfully filled the plan with fifteen fragments of somebody's paragraph
 * would be the second thing on this page to make a mess the person then has to
 * clean up, and the first one is the reason we are here.
 */

import { useMemo, useState } from "react"
import { ArrowRight, Check, Square } from "lucide-react"
import type { NorthStarTabId, NsArea, NsPlan } from "@/src/goals/types"
import {
  QUESTIONS_COPY,
  STARTER_KEY,
  STARTER_QUESTIONS,
  START_COPY,
  START_RAMPS,
  TEN_COPY,
  type StartRampId,
} from "@/src/goals/data/northStarStart"
import { areaReview, parseGoalDump, tenCandidates, wheelRatings } from "@/src/goals/northStarService"
import { GeneratePanel, type GenerateHandlers } from "./Generate"
import { SentenceBox } from "./SentenceBox"

export interface StartHandlers extends GenerateHandlers {
  /**
   * Everything a door produces lands as written lines in one area — the same
   * function the text box calls, so a goal that arrived through the questions
   * and a goal somebody typed are the same object, shaped the same way.
   */
  onAddDump: (areaId: string, text: string) => void
  /** What was typed, kept so the door is still there tomorrow. */
  onAnswer: (key: string, text: string) => void
  onGoToTab: (tab: NorthStarTabId) => void
}

/** The chooser. Five cards, no order, no recommendation. */
export function RampChooser({
  plan,
  area,
  onPick,
}: {
  plan: NsPlan
  area: NsArea | null
  onPick: (id: StartRampId) => void
}) {
  const tenReady = area ? tenCandidates(plan, area.id).length : 0
  return (
    <div>
      <h2 className="text-sm font-semibold text-zinc-200">{START_COPY.title}</h2>
      <p className="text-[11.5px] text-zinc-400 mt-1 leading-relaxed">{START_COPY.help}</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 mt-3">
        {START_RAMPS.map((ramp) => (
          <button
            key={ramp.id}
            onClick={() => onPick(ramp.id)}
            className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-left hover:border-white/30 hover:bg-white/[0.04] transition-colors group/r"
          >
            <span className="flex items-center gap-1.5">
              <span className="text-[12.5px] font-medium text-zinc-100">{ramp.label}</span>
              <ArrowRight className="size-3 text-zinc-700 group-hover/r:text-zinc-300 transition-colors" />
            </span>
            <span className="block text-[11px] text-zinc-500 mt-1 leading-relaxed">{ramp.blurb}</span>
            <span className="block text-[10px] text-zinc-600 mt-1.5">
              {ramp.id === "ten" && tenReady > 0 ? `${tenReady} pieces ready from your 10` : ramp.makes}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * The five doors as a row, above whichever one is open.
 *
 * The cards explain; this reminds. It is on screen the whole time somebody is
 * on this step, including while they are inside a door, because the version
 * without it hid four ways in behind whichever one happened to open by default
 * — and somebody who does not know a door exists cannot go looking for it.
 */
export function RampBar({ ramp, onPick }: { ramp: StartRampId | null; onPick: (id: StartRampId) => void }) {
  // Nothing written anywhere yet: the cards are about to be shown in full, and
  // a row of the same five directly above them is the same list twice.
  if (ramp === null) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-3">
      <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-600 mr-0.5">Ways in</span>
      {START_RAMPS.map((r) => {
        const on = r.id === ramp
        return (
          <button
            key={r.id}
            onClick={() => onPick(r.id)}
            aria-pressed={on}
            title={r.blurb}
            className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
              on ? "border-violet-400/50 bg-violet-500/15 text-violet-50" : "border-white/10 text-zinc-400 hover:text-zinc-100 hover:border-white/30"
            }`}
          >
            {r.label}
          </button>
        )
      })}
    </div>
  )
}

/** The back link every door carries, so no door is a room you get stuck in. */
export function RampHeader({ title, help, onBack }: { title: string; help: string; onBack: () => void }) {
  return (
    <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
        <p className="text-[11.5px] text-zinc-400 mt-1 leading-relaxed">{help}</p>
      </div>
      <button onClick={onBack} className="shrink-0 text-[11px] text-zinc-500 hover:text-zinc-200 transition-colors">
        {START_COPY.back}
      </button>
    </div>
  )
}

/**
 * A list of lines, ticked or not.
 *
 * Shared by the two doors here and by the questions, because "here are some
 * lines, which of these are goals" is the same interaction every time and
 * three copies of it would drift into three behaviours.
 */
export function CandidateList({
  lines,
  picked,
  onToggle,
  emptyNote,
}: {
  lines: string[]
  picked: Set<string>
  onToggle: (line: string) => void
  emptyNote?: string
}) {
  if (lines.length === 0) return emptyNote ? <p className="text-[11.5px] text-zinc-600 mt-2">{emptyNote}</p> : null
  return (
    <ul className="mt-2.5 space-y-1">
      {lines.map((line) => {
        const on = picked.has(line)
        return (
          <li key={line}>
            <button
              onClick={() => onToggle(line)}
              aria-pressed={on}
              className={`w-full flex items-start gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
                on ? "border-violet-400/40 bg-violet-500/10" : "border-white/[0.07] bg-white/[0.02] hover:border-white/20"
              }`}
            >
              {on ? (
                <span className="size-3.5 shrink-0 mt-0.5 rounded-[3px] bg-violet-500/30 border border-violet-400/50 inline-flex items-center justify-center">
                  <Check className="size-2.5 text-violet-100" />
                </span>
              ) : (
                <Square className="size-3.5 shrink-0 mt-0.5 text-zinc-700" />
              )}
              <span className={`text-[12.5px] leading-snug ${on ? "text-white" : "text-zinc-300"}`}>{line}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** The button under every list of candidates. */
export function AddPicked({ count, label, none, onAdd }: { count: number; label: string; none: string; onAdd: () => void }) {
  return (
    <div className="flex items-center gap-3 mt-3">
      <span className="text-[11px] text-zinc-600">{count === 0 ? none : `${count} ticked`}</span>
      <button
        onClick={onAdd}
        disabled={count === 0}
        className="ml-auto text-[12.5px] font-medium px-3 py-1.5 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-100 hover:bg-violet-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {label}
      </button>
    </div>
  )
}

// ------------------------------------------------------------------ the ten

/**
 * The 10, cut up.
 *
 * Plus the one question the rating makes possible and nothing else on the page
 * asks: you said this area is a 4 and you have described a 10, so what is the
 * first thing that makes it a 5? That question is answerable in one line by
 * somebody who cannot name a single goal, and the answer is always a goal.
 */
export function TenRamp({
  plan,
  area,
  today,
  handlers,
  onBack,
}: {
  plan: NsPlan
  area: NsArea
  today: string
  handlers: StartHandlers
  onBack: () => void
}) {
  const lines = useMemo(() => tenCandidates(plan, area.id), [plan, area.id])
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [gap, setGap] = useState("")
  const review = areaReview(plan, area.id)
  const rating = wheelRatings(plan, today)[area.id] ?? null

  const toggle = (line: string) =>
    setPicked((current) => {
      const next = new Set(current)
      if (next.has(line)) next.delete(line)
      else next.add(line)
      return next
    })

  const add = () => {
    const chosen = lines.filter((l) => picked.has(l))
    if (chosen.length === 0) return
    handlers.onAddDump(area.id, chosen.join("\n"))
    setPicked(new Set())
  }

  const addGap = () => {
    if (!gap.trim()) return
    handlers.onAddDump(area.id, gap)
    setGap("")
  }

  return (
    <div>
      <RampHeader title={TEN_COPY.title(area.label)} help={TEN_COPY.help} onBack={onBack} />

      {review.ten.trim() ? (
        <>
          <p className="text-[11.5px] text-zinc-500 mt-2.5 border-l-2 pl-2.5 leading-relaxed whitespace-pre-wrap" style={{ borderColor: area.color }}>
            {review.ten}
          </p>
          <CandidateList lines={lines} picked={picked} onToggle={toggle} emptyNote={TEN_COPY.already} />
          <AddPicked count={picked.size} label={TEN_COPY.add} none={TEN_COPY.none} onAdd={add} />
        </>
      ) : (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <p className="text-[12px] text-zinc-400 leading-relaxed">{TEN_COPY.empty(area.label)}</p>
          <button
            onClick={() => handlers.onGoToTab("now")}
            className="mt-2 text-[12px] font-medium px-3 py-1.5 rounded-lg border border-white/15 text-zinc-100 hover:bg-white/10 transition-colors"
          >
            {TEN_COPY.goEmpty}
          </button>
        </div>
      )}

      {/* Read the same paragraph the mechanical split just cut up. The split
          finds the sentences; this finds the goal hiding inside a sentence that
          was never phrased as one. */}
      {review.ten.trim().length >= 30 && (
        <GeneratePanel
          plan={plan}
          text={review.ten}
          areaId={area.id}
          areaLabel={area.label}
          ten={review.ten}
          mode="actions"
          label={TEN_COPY.actionsButton}
          handlers={handlers}
        />
      )}

      {/* The rating question. Only when there is a rating and it leaves room. */}
      {rating != null && rating < 10 && (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <p className="text-[12px] text-zinc-300">
            {TEN_COPY.gap(rating, area.label)} <span className="text-white">{TEN_COPY.gapAsk(rating + 1)}</span>
          </p>
          <div className="flex items-center gap-2 mt-2">
            <input
              value={gap}
              onChange={(e) => setGap(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addGap() } }}
              placeholder={TEN_COPY.gapPlaceholder}
              aria-label={TEN_COPY.gapAsk(rating + 1)}
              className="min-w-0 flex-1 bg-transparent border-b border-white/15 focus:border-white/35 text-[13px] text-zinc-100 placeholder:text-zinc-700 focus:outline-none py-1 transition-colors"
            />
            <button
              onClick={addGap}
              disabled={!gap.trim()}
              className="shrink-0 text-[11.5px] px-2.5 py-1 rounded-lg border border-white/15 text-zinc-100 hover:bg-white/10 disabled:opacity-30 transition-colors"
            >
              Add it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------ the questions

/**
 * Five questions, each with its own box, all of them optional.
 *
 * The answers are kept in the plan rather than in component state. Somebody
 * writes four lines under "what have you been meaning to do for over a year",
 * ticks one, and the other three are the next three goals — a week later, when
 * they are ready for them. Throwing that away on a tab switch is throwing away
 * the only writing on the page that was hard to do.
 */
export function QuestionsRamp({
  plan,
  area,
  handlers,
  onBack,
}: {
  plan: NsPlan
  area: NsArea
  handlers: StartHandlers
  onBack: () => void
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const existing = useMemo(
    () => new Set(plan.goals.map((g) => g.title.trim().toLowerCase())),
    [plan.goals],
  )

  const toggle = (line: string) =>
    setPicked((current) => {
      const next = new Set(current)
      if (next.has(line)) next.delete(line)
      else next.add(line)
      return next
    })

  const allLines = STARTER_QUESTIONS.flatMap((q) =>
    parseGoalDump(plan.answers[STARTER_KEY(q.id)] ?? "").filter((l) => !existing.has(l.trim().toLowerCase())),
  )
  const chosen = allLines.filter((l) => picked.has(l))

  const add = () => {
    if (chosen.length === 0) return
    handlers.onAddDump(area.id, chosen.join("\n"))
    setPicked(new Set())
  }

  return (
    <div>
      <RampHeader title={QUESTIONS_COPY.title} help={QUESTIONS_COPY.help} onBack={onBack} />

      <div className="space-y-3 mt-3">
        {STARTER_QUESTIONS.map((q) => {
          const value = plan.answers[STARTER_KEY(q.id)] ?? ""
          const lines = parseGoalDump(value).filter((l) => !existing.has(l.trim().toLowerCase()))
          return (
            <div key={q.id} className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
              <p className="text-[13px] font-medium text-zinc-100 leading-snug">{q.ask}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{q.note}</p>
              <SentenceBox
                value={value}
                onChange={(text) => handlers.onAnswer(STARTER_KEY(q.id), text)}
                placeholder={q.placeholder}
                label={q.ask}
                className="w-full mt-2 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-2 text-[13px] text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-white/30 transition-colors leading-relaxed resize-y"
              />
              {lines.length > 0 && (
                <>
                  <p className="text-[10px] text-zinc-600 mt-1.5">{QUESTIONS_COPY.pick}</p>
                  <CandidateList lines={lines} picked={picked} onToggle={toggle} />
                </>
              )}
              {value.trim() && lines.length === 0 && (
                <p className="text-[10.5px] text-zinc-600 mt-1.5 inline-flex items-center gap-1">
                  <Check className="size-3 text-emerald-400/70" />
                  everything here is already in your goals
                </p>
              )}
            </div>
          )
        })}
      </div>

      <AddPicked count={chosen.length} label={`${QUESTIONS_COPY.add} → ${area.label}`} none={QUESTIONS_COPY.none} onAdd={add} />
      <p className="text-[10.5px] text-zinc-600 mt-1.5">{QUESTIONS_COPY.saved}</p>

      {/* Across all five answers at once. A goal is often the thing sitting
          between two of them, which no per-question split can see. */}
      <GeneratePanel
        plan={plan}
        text={STARTER_QUESTIONS.map((q) => {
          const value = plan.answers[STARTER_KEY(q.id)] ?? ""
          return value.trim() ? `${q.ask}\n${value.trim()}` : ""
        }).filter(Boolean).join("\n\n")}
        areaId={area.id}
        areaLabel={area.label}
        handlers={handlers}
      />
    </div>
  )
}
