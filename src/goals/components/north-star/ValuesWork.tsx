"use client"

/**
 * The values exercise, in full, but split across two screens.
 *
 * The exercise is:
 *
 *   1. What has been most important to you so far. The list that built the life
 *      you already have, which is the only diagnosis available.
 *   2. What would have to be important to create the life in the paragraph.
 *   3. Order that list, one pair at a time, because "whatever number one is,
 *      everything else is being filtered through that".
 *   4. Read the conflicts the order produces. That is the payoff, and it is the
 *      part that changes what somebody does on Monday.
 *
 * WHY IT IS SPLIT. Steps 1 and 2 are noticing. Steps 3 and 4 are deciding, and
 * deciding needs material you do not have on the opening screen: at that point
 * you have written one paragraph. By the review you have rated twelve areas,
 * written what a 10 looks like in each, said what each one asks of you, and set
 * goals. So the pool being ordered is your whole plan rather than the six words
 * you could think of before breakfast. Ordering something you are still
 * discovering is guessing.
 *
 * `mode="elicit"` runs on the north star tab, `mode="order"` on the review.
 * Both read and write the same two lists, and the review keeps the lists
 * reachable behind a disclosure, because the review is where you notice the one
 * you forgot.
 *
 * Nothing is ever refused. A word that names a thing rather than a feeling gets
 * one follow-up question and is kept either way, because being told you typed
 * the wrong kind of word ends the exercise.
 *
 * Sources and quotes: docs/research/life-mastery/values-and-identity.md.
 */

import { useState, type ReactNode } from "react"
// ChevronDown for the disclosure. Reordering is a drag now, so it wears
// GripVertical — the handle every other sortable list in the project uses
// (SortablePriorityList, WidgetGrid, GoalCategorySection), same role, no new
// meaning borrowed.
import { ChevronDown, GripVertical, X } from "lucide-react"
import { DndContext } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import type { NsPlan } from "@/src/goals/types"
import {
  VALUES_DIFF,
  VALUES_INTRO,
  VALUES_MEANS,
  VALUES_NEEDED,
  VALUES_ORDER,
  VALUES_PAST,
  VALUES_PAST_MENU,
} from "@/src/goals/data/northStar"
import {
  collectValues,
  derivedValueSuggestions,
  looksLikeMeansValue,
  nextValuePair,
  valueConflicts,
  valuesDiff,
  valuesShortBy,
} from "@/src/goals/northStarService"
import { TagList } from "./GoalCard"
import { ValueBrowser } from "./ValueBrowser"
import { useValueDrag, useValueHandle } from "./valueDrag"

export interface ValuesHandlers {
  onCurrentValues: (values: string[]) => void
  onValues: (values: string[]) => void
  /** Drop `value` at `toIndex`, sliding everything between along. */
  onMoveValue: (value: string, toIndex: number) => void
  onRankAbove: (winner: string, loser: string) => void
}

/**
 * One draggable row of the order. Plumbing in `valueDrag.ts`, shared with the
 * area chips on the milestones step.
 *
 * The whole grip+rank+label strip is the handle, so the grab target is the row
 * rather than a 20px icon; the buttons on the right stay clickable because they
 * are outside it.
 *
 * The number printed is the live one: mid-drag it reads the place this row would
 * take if you let go now, so the column renumbers under your hand instead of
 * lying until the drop.
 */
function SortableValue({ id, label, children, trailing }: {
  id: string
  label: string
  /** The row's own controls, right-aligned and outside the drag handle. */
  trailing: ReactNode
  /** Anything that opens underneath the row, e.g. the means-value drill. */
  children?: ReactNode
}) {
  const { ref, style, handle, isDragging, rank } = useValueHandle(id)
  return (
    <li ref={ref} style={style} className={isDragging ? "relative" : undefined}>
      <div
        className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors ${
          isDragging
            ? "border-violet-400/50 bg-violet-500/10 shadow-lg shadow-black/40"
            : "border-white/10 bg-white/[0.02]"
        }`}
      >
        <div
          className="flex min-w-0 flex-1 items-center gap-2 cursor-grab active:cursor-grabbing touch-none select-none"
          aria-label={`Reorder ${label}`}
          {...handle}
        >
          <GripVertical className="size-3.5 shrink-0 text-zinc-600" />
          <span className="text-[11px] tabular-nums text-zinc-500 w-4 shrink-0">{rank}.</span>
          <span className="min-w-0 flex-1 text-[13px] text-zinc-100">{label}</span>
        </div>
        {trailing}
      </div>
      {children}
    </li>
  )
}

export function ValuesWork({ plan, handlers, mode }: {
  plan: NsPlan
  handlers: ValuesHandlers
  /** "elicit" is the north star tab's half; "order" is the review's. */
  mode: "elicit" | "order"
}) {
  /**
   * Pairs already answered, this visit.
   *
   * Not stored on the plan on purpose. The order IS the stored answer; which
   * questions produced it is scaffolding, and keeping it would mean a list
   * edited next month resumes a half-finished interrogation from the last one.
   */
  const [settled, setSettled] = useState<string[]>([])
  const [ordering, setOrdering] = useState(false)
  /** Which item's "what feeling is under this?" is open. One at a time. */
  const [drilling, setDrilling] = useState<string | null>(null)
  const [drillDraft, setDrillDraft] = useState("")
  const [listsOpen, setListsOpen] = useState(false)

  const { ids, dnd } = useValueDrag(plan.values, handlers.onMoveValue)

  const diff = valuesDiff(plan)
  const conflicts = valueConflicts(plan)
  const short = valuesShortBy(plan)
  const pair = nextValuePair(plan, settled)

  /**
   * The user's own words first, then anything they wrote per-area or per-goal,
   * then ours. Somebody who has just described waking up near the water with
   * their kids should be offered Freedom and Family off their own paragraph.
   */
  /**
   * The words read out of the user's own writing, plus anything they named
   * inside an area or a goal. These lead the SECOND list only. On the first one
   * they are the wrong prompt: that list is about the life you already have, and
   * cueing it off the life you just described is how you get the same list twice
   * and lose the diff the exercise exists for. The first list leads with his
   * menu instead.
   */
  const own = [...new Set([...derivedValueSuggestions(plan), ...collectValues(plan)])]

  /**
   * Values named inside an area or a goal that never made it onto the whole-life
   * list. By the review this is the interesting set: you said health mattered
   * enough to write it under three areas, and it is nowhere in the list that
   * decides your Tuesdays.
   */
  const onList = new Set(plan.values.map((v) => v.trim().toLowerCase()))
  const unlisted = collectValues(plan).filter((v) => !onList.has(v.trim().toLowerCase()))

  const answerPair = (winner: string, loser: string, key: string) => {
    handlers.onRankAbove(winner, loser)
    setSettled((s) => [...s, key])
  }

  const finishDrill = (item: string, how: "replace" | "add") => {
    const feeling = drillDraft.trim()
    setDrilling(null)
    setDrillDraft("")
    if (!feeling) return
    if (plan.values.some((v) => v.trim().toLowerCase() === feeling.toLowerCase())) return
    handlers.onValues(
      how === "replace"
        ? plan.values.map((v) => (v === item ? feeling : v))
        : plan.values.flatMap((v) => (v === item ? [v, feeling] : [v])),
    )
  }

  /** Nothing is ever added twice, whichever route it came in by. */
  const addTo = (list: string[], set: (next: string[]) => void) => (value: string) => {
    if (list.some((v) => v.trim().toLowerCase() === value.trim().toLowerCase())) return
    set([...list, value])
  }

  /** Steps 1 and 2: the two lists, and what they say about each other. */
  const lists = (
    <>
      {/* Pass 1, with his own prompting around it. Nobody produces a value
          cold: he asks the question, then reads a menu out loud, then asks
          "what else" over and over. The menu leads the suggestion row, and the
          "what else" is printed under the box from the first answer onward. */}
      <div className="mt-4">
        <TagList
          label={VALUES_PAST.question}
          hint={VALUES_PAST.help}
          placeholder={VALUES_PAST.placeholder}
          color="#71717a"
          items={plan.currentValues}
          onChange={handlers.onCurrentValues}
        />
        {plan.currentValues.length > 0 && (
          <p className="text-[11.5px] text-zinc-300 mt-2">
            {VALUES_PAST.again}
            <span className="block text-[10.5px] text-zinc-600 mt-0.5">{VALUES_PAST.againNote}</span>
          </p>
        )}
        <p className="text-[10.5px] text-zinc-600 mt-1.5 leading-relaxed">{VALUES_PAST.emotion}</p>
        {/* His menu leads, and it keeps his words: "has it been…". */}
        <ValueBrowser
          items={plan.currentValues}
          label={VALUES_PAST.question}
          lead={{ label: VALUES_PAST.first, values: VALUES_PAST_MENU }}
          onAdd={addTo(plan.currentValues, handlers.onCurrentValues)}
        />
      </div>

      <div className="mt-5 pt-4 border-t border-white/10">
        <TagList
          label={VALUES_NEEDED.question}
          hint={VALUES_NEEDED.help}
          placeholder={VALUES_NEEDED.placeholder}
          color="#c084fc"
          items={plan.values}
          onChange={handlers.onValues}
        />
        {/* Here the lead is their own writing. Somebody who has just described
            waking up near the water with their kids is offered Freedom and
            Family off their own page before ours. */}
        <ValueBrowser
          items={plan.values}
          label={VALUES_NEEDED.question}
          lead={own.length > 0 ? { label: VALUES_NEEDED.lead, values: own } : undefined}
          onAdd={addTo(plan.values, handlers.onValues)}
        />
        <p className="text-[10.5px] text-zinc-600 mt-1.5">
          {short > 0
            ? `${VALUES_INTRO.minimumNote} ${short} to go.`
            : `${plan.values.length} written. ${VALUES_INTRO.daily}`}
        </p>
      </div>

      {/* The diff between the two, which is the point of asking twice. */}
      {(diff.added.length > 0 || diff.dropped.length > 0) && plan.currentValues.length > 0 && plan.values.length > 0 && (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 space-y-1.5">
          {diff.added.length > 0 && (
            <p className="text-[11px] text-zinc-400">
              <span className="text-zinc-500">{VALUES_DIFF.added}</span>{" "}
              <span className="text-violet-200">{diff.added.join(" · ")}</span>
            </p>
          )}
          {diff.dropped.length > 0 && (
            <p className="text-[11px] text-zinc-400">
              <span className="text-zinc-500">{VALUES_DIFF.dropped}</span>{" "}
              <span className="text-zinc-300">{diff.dropped.join(" · ")}</span>
              <span className="block text-[10px] text-zinc-600 mt-0.5">{VALUES_DIFF.droppedNote}</span>
            </p>
          )}
        </div>
      )}
    </>
  )

  if (mode === "elicit") {
    return (
      <div className="rounded-2xl border border-violet-400/20 bg-violet-500/[0.03] p-5">
        <h2 className="text-sm font-semibold text-zinc-200">{VALUES_INTRO.title}</h2>
        <p className="text-[12px] text-zinc-500 mt-1 leading-relaxed">{VALUES_INTRO.help}</p>
        {lists}
        <p className="text-[10.5px] text-zinc-600 mt-4 pt-3 border-t border-white/10 leading-relaxed">
          {VALUES_INTRO.laterHint}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-violet-400/20 bg-violet-500/[0.03] p-5">
      <h2 className="text-sm font-semibold text-zinc-200">{VALUES_ORDER.title}</h2>
      <p className="text-[12px] text-zinc-500 mt-1 leading-relaxed">{VALUES_ORDER.help}</p>

      {/* Anything named inside an area or a goal and never carried up. By the
          review this is usually where the missing value is. */}
      {unlisted.length > 0 && (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
          <p className="text-[11px] text-zinc-400">{VALUES_ORDER.pooled}</p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {unlisted.map((v) => (
              <button
                key={v}
                onClick={() => handlers.onValues([...plan.values, v])}
                className="text-[10.5px] px-2 py-0.5 rounded-full border border-white/10 text-zinc-400 hover:text-zinc-100 hover:border-white/30 transition-colors"
              >
                + {v}
              </button>
            ))}
          </div>
          {unlisted.length > 1 && (
            <button
              onClick={() => handlers.onValues([...plan.values, ...unlisted])}
              className="text-[10.5px] text-zinc-500 hover:text-zinc-200 mt-1.5 underline decoration-dotted underline-offset-2 transition-colors"
            >
              {VALUES_ORDER.pull}
            </button>
          )}
        </div>
      )}

      {plan.values.length === 0 ? (
        <p className="mt-4 text-[11.5px] text-zinc-500 leading-relaxed">{VALUES_ORDER.empty}</p>
      ) : (
        <div className="mt-4">
          {plan.values.length > 1 && (
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[12.5px] text-zinc-200">{VALUES_ORDER.question}</p>
              <button
                onClick={() => { setOrdering((v) => !v); if (!ordering) setSettled([]) }}
                className="text-[11px] text-zinc-500 hover:text-zinc-200 transition-colors shrink-0"
              >
                {ordering ? "done for now" : settled.length > 0 ? VALUES_ORDER.restart : VALUES_ORDER.start}
              </button>
            </div>
          )}

          {ordering && (
            pair ? (
              <div className="mt-3 rounded-xl border border-violet-400/30 bg-violet-500/[0.06] p-4">
                <p className="text-[12.5px] text-zinc-200 text-center">{VALUES_ORDER.duel}</p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {/* Answering "the lower one" swaps the two, which bubbles it up
                      and makes the pair above the next question. Answering "the
                      higher one" only marks the pair settled. Either way the
                      same pair is never asked twice. */}
                  <button
                    onClick={() => answerPair(pair.a, pair.b, pair.key)}
                    className="rounded-lg border border-white/15 bg-white/[0.03] px-3 py-3 text-[13px] text-zinc-100 hover:border-violet-400/50 hover:bg-violet-500/10 transition-colors"
                  >
                    {pair.a}
                  </button>
                  <button
                    onClick={() => answerPair(pair.b, pair.a, pair.key)}
                    className="rounded-lg border border-white/15 bg-white/[0.03] px-3 py-3 text-[13px] text-zinc-100 hover:border-violet-400/50 hover:bg-violet-500/10 transition-colors"
                  >
                    {pair.b}
                  </button>
                </div>
                <p className="text-[10.5px] text-zinc-600 text-center mt-2">{VALUES_ORDER.duelNote}</p>
              </div>
            ) : (
              <p className="mt-3 text-[11.5px] text-emerald-300/80">{VALUES_ORDER.done}</p>
            )
          )}

          {/* The list itself, always visible, always directly editable. The duel
              is the fast way to a first order; dragging is how you fix one
              answer, or five, without sitting through the interview again.
              Nudging a row a place at a time was the old way, and it turned
              "Health is really number two" into five clicks and a recount. */}
          <DndContext {...dnd}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              <ol className="mt-3 space-y-1">
                {plan.values.map((value, i) => {
                  const means = looksLikeMeansValue(value)
                  return (
                    <SortableValue
                      key={ids[i]}
                      id={ids[i]}
                      label={value}
                      trailing={<>
                        {means && (
                          <button
                            onClick={() => { setDrilling(drilling === value ? null : value); setDrillDraft("") }}
                            aria-expanded={drilling === value}
                            className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border border-amber-400/30 text-amber-200/80 hover:bg-amber-400/10 transition-colors"
                          >
                            {VALUES_MEANS.hint}
                          </button>
                        )}
                        <button
                          onClick={() => handlers.onValues(plan.values.filter((_, n) => n !== i))}
                          aria-label={`Remove ${value}`}
                          className="shrink-0 text-zinc-700 hover:text-rose-300 transition-colors"
                        ><X className="size-3" /></button>
                      </>}
                    >
                      {drilling === value && (
                        <div className="mt-1 ml-9 rounded-lg border border-amber-400/20 bg-amber-500/[0.04] p-3">
                          <p className="text-[12px] text-zinc-200">{VALUES_MEANS.question(value)}</p>
                          <p className="text-[10.5px] text-zinc-500 mt-0.5 leading-relaxed">{VALUES_MEANS.help}</p>
                          <input
                            autoFocus
                            value={drillDraft}
                            onChange={(e) => setDrillDraft(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") finishDrill(value, "replace") }}
                            placeholder="Freedom, security, connection…"
                            aria-label={VALUES_MEANS.question(value)}
                            className="w-full mt-2 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1 text-[12.5px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/40 transition-colors"
                          />
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <button
                              onClick={() => finishDrill(value, "replace")}
                              disabled={!drillDraft.trim()}
                              className="text-[11px] px-2 py-0.5 rounded-full border border-white/15 text-zinc-200 hover:bg-white/10 disabled:opacity-30 transition-colors"
                            >{VALUES_MEANS.replace}</button>
                            <button
                              onClick={() => finishDrill(value, "add")}
                              disabled={!drillDraft.trim()}
                              className="text-[11px] px-2 py-0.5 rounded-full border border-white/15 text-zinc-200 hover:bg-white/10 disabled:opacity-30 transition-colors"
                            >{VALUES_MEANS.keep}</button>
                            <button
                              onClick={() => { setDrilling(null); setDrillDraft("") }}
                              className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
                            >{VALUES_MEANS.skip}</button>
                          </div>
                        </div>
                      )}
                    </SortableValue>
                  )
                })}
              </ol>
            </SortableContext>
          </DndContext>
          {plan.values.length > 1 && (
            <p className="text-[10.5px] text-zinc-600 mt-1.5">{VALUES_ORDER.dragNote}</p>
          )}
        </div>
      )}

      {/* What the order costs you. The reason the order was worth doing. */}
      {conflicts.length > 0 && (
        <div className="mt-4 space-y-2">
          {conflicts.map((c) => (
            <div key={`${c.above}-${c.below}`} className="rounded-xl border border-amber-400/25 bg-amber-500/[0.06] px-3 py-2.5">
              <p className="text-[11px] font-medium text-amber-100/90">
                {c.above} sits above {c.below}
              </p>
              <p className="text-[11px] text-amber-100/70 mt-0.5 leading-relaxed">{c.note}</p>
            </div>
          ))}
        </div>
      )}

      {/* The two lists stay reachable here, because the review is where you
          notice the one you forgot. They are just no longer the headline. */}
      <div className="mt-4 pt-3 border-t border-white/10">
        <button
          onClick={() => setListsOpen((v) => !v)}
          aria-expanded={listsOpen}
          className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ChevronDown className={`size-3 transition-transform ${listsOpen ? "" : "-rotate-90"}`} />
          Add to the lists
        </button>
        {listsOpen && lists}
      </div>
    </div>
  )
}
