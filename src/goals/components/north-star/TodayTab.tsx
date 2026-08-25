"use client"

/**
 * Today. The only screen in the flow that asks what you actually did.
 *
 * Everything else here is about deciding: what your life is for, which areas,
 * which goals, what runs weekly. This one assumes all of that is settled and
 * asks the one question a plan needs answered over and over — **did you do it**
 * — with as little between the question and the answer as possible.
 *
 * So it is one list, today's date at the top, and nothing to configure. What is
 * on today comes first. Everything else that runs weekly comes after it, still
 * inputtable, because a plan that only accepts the sessions it predicted
 * under-counts the weeks you actually had.
 *
 * **Two stores, and the row says which it is writing to.** A routine step is a
 * line in a stack, not a goal, and its tick lives on the plan in this browser.
 * A driver IS a goal: once it has been pushed on the track step it is a row
 * with a target, a period and a weekly reset already built, and its count goes
 * there. A driver that has not been pushed is shown and cannot be counted —
 * said plainly, with the way to fix it — rather than given a second tally that
 * would disagree with the real one the moment it was pushed.
 *
 * Milestones and experiences are absent for the same reason they are absent
 * from the schedule: neither is a thing you did today.
 *
 * **Nothing is listed flat.** "Read your north star out loud" is a line in a
 * morning stack, not a task, and a flat list of nineteen of them hides the four
 * stacks they actually belong to. So the list is headers — one per routine, in
 * the order the day happens, steps folded inside — the same grouping the
 * schedule uses (`trackGroups`), so the two screens describe one plan.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowRight, Check, ChevronDown, ChevronUp, Loader2, Minus, Plus, Trash2 } from "lucide-react"
import type { NorthStarTabId, NsDailyField, NsFieldKind, NsPlan, NsSubStep } from "@/src/goals/types"
import { GOES_TO_COPY, TODAY_COPY } from "@/src/goals/data/northStar"
import { cadenceLabel, destination, destinations, fieldTargets, groupLogged, groupSummary, readSource, readSources, standingItems, stepLogged, todayItems, todayProgress, trackGroups, type TodayItem } from "@/src/goals/northStarTrackService"
import { dailyFieldsFor, dailyRating, formatTargetDate, journalEntry, journalHistory, subStepProgress, subStepsFor } from "@/src/goals/northStarService"
import { ScoreRow } from "./ScoreRow"
import { SENTENCE_HINT } from "./SentenceBox"

interface HubGoal {
  id: string
  template_id?: string | null
  current_value?: number
  target_value?: number
}

const longDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  })
}

const clockTime = (startMin: number) =>
  `${String(Math.floor(startMin / 60)).padStart(2, "0")}:${String(startMin % 60).padStart(2, "0")}`

/**
 * ONE OF YOUR OWN QUESTIONS, ANSWERED FOR TODAY.
 *
 * It sits under the row it belongs to, so "one key learning" is written next
 * to the thing that taught it rather than in one box at the bottom of the page
 * that has to cover the whole day.
 *
 * Held locally and committed on blur, for the reason the day note is: every
 * save re-renders the list this box sits inside, and typing a sentence through
 * that is typing into a page that moves. Enter is handled where it stands
 * rather than through `SentenceBox`, which saves on every keystroke — the one
 * thing this box cannot do — and the hint string is imported from it so the
 * two never come to say different things about the same key.
 */
function WriteField({
  id,
  label,
  value,
  history,
  onWrite,
  footer,
}: {
  /** The journal key: a field's id, or the id of the step that asks it. */
  id: string
  label: string
  value: string
  /** Every other day this one was answered, newest first. */
  history: { date: string; text: string }[]
  onWrite: (text: string) => void
  /** Anything the box needs underneath it — the control that silences a step's question. */
  footer?: React.ReactNode
}) {
  const [draft, setDraft] = useState(value)
  const [focused, setFocused] = useState(false)
  /**
   * THE RUN OF ANSWERS, which is the whole reason to write the same line daily.
   *
   * Reported from the page: "I want to be able to write my key learning
   * directly, tick that it is done, but also easily access past responses."
   * They existed — `plan.journal` is keyed by date — and had nowhere to be
   * seen: the box holds today and today only. Folded, because the question is
   * today's and the archive is a second question.
   */
  const [pastOpen, setPastOpen] = useState(false)
  const commit = (text: string) => {
    if (text !== value) onWrite(text)
  }

  return (
    <div className="px-5 py-2.5 scroll-mt-24">
      <label htmlFor={`field-${id}`} className="block text-[10.5px] text-zinc-500 mb-1">
        {label.trim() || TODAY_COPY.fieldUnnamed}
      </label>
      <textarea
        id={`field-${id}`}
        rows={2}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || e.shiftKey) return
          e.preventDefault()
          const text = draft.trim()
          setDraft(text)
          commit(text)
          e.currentTarget.blur()
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false)
          commit(draft)
        }}
        placeholder={TODAY_COPY.fieldPlaceholder}
        className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-[12.5px] text-zinc-200 placeholder:text-zinc-600 focus:border-white/30 focus:outline-none resize-y"
      />
      {focused && <p className="mt-1 text-[10px] text-zinc-600">{SENTENCE_HINT}</p>}
      {history.length > 0 ? (
        <>
          <button
            onClick={() => setPastOpen((v) => !v)}
            aria-expanded={pastOpen}
            aria-label={TODAY_COPY.fieldPastAria(label.trim() || TODAY_COPY.fieldUnnamed)}
            className="mt-1 inline-flex items-center gap-1 text-[10.5px] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <ChevronDown className={`size-3 transition-transform ${pastOpen ? "" : "-rotate-90"}`} />
            {TODAY_COPY.fieldPastOpen(history.length)}
          </button>
          {pastOpen && (
            <ul className="mt-1.5 space-y-1.5 border-l border-white/10 pl-3">
              {history.map((entry) => (
                <li key={entry.date}>
                  <span className="block text-[10px] text-zinc-600 tabular-nums">{formatTargetDate(entry.date)}</span>
                  <span className="block text-[12px] text-zinc-300 whitespace-pre-wrap leading-relaxed">{entry.text}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        focused && <p className="mt-1 text-[10px] text-zinc-600">{TODAY_COPY.fieldPastNone}</p>
      )}
      {footer}
    </div>
  )
}

/**
 * THE OTHER DIRECTION: a row that hands you something to read.
 *
 * "Read your north star out loud" is a line in a morning stack and, as a tick
 * on its own, useless — the paragraph it names is four steps away, so the step
 * either sends you off the screen at 07:00 or gets ticked without being done.
 * The paragraph goes on the row instead, resolved live from the plan so there
 * is one copy of it and not a copy and a quote.
 *
 * A source that names nothing, or names something still empty, SAYS SO. The
 * alternative is a blank panel every morning under a line that says to read
 * something.
 */
function ReadField({ field, source }: { field: NsDailyField; source: { label: string; text: string } | null }) {
  return (
    <div id={`field-${field.id}`} className="px-5 py-2.5 scroll-mt-24">
      <p className="text-[10.5px] text-zinc-500 mb-1">{field.label.trim() || TODAY_COPY.fieldUnnamed}</p>
      {source ? (
        <blockquote className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
          <span className="block text-[10px] text-zinc-600 mb-1">{source.label}</span>
          <span className="block text-[13px] text-zinc-100 whitespace-pre-wrap leading-relaxed">{source.text}</span>
        </blockquote>
      ) : (
        <p className="text-[11.5px] text-zinc-500">
          {field.readSourceId ? TODAY_COPY.fieldSourceMissing : TODAY_COPY.fieldSourceUnset}
        </p>
      )}
    </div>
  )
}

/**
 * THE ROW THAT TAKES YOU TO THE THING INSTEAD OF QUOTING IT.
 *
 * `ReadField` puts the paragraph on the row, which is right for a paragraph you
 * re-read and wrong for anything you might want to CHANGE while you are looking
 * at it. Reported from the page: "I want to click that, and then go to the
 * north star… read it, and easily track it, and go back to where I was."
 *
 * All three of those are the row: the button goes, the tick is here so the
 * going is not the only way to mark it done, and the going carries an errand
 * ribbon that brings you back. The tick lives in `plan.logged` beside the
 * steps' own, because "read my north star today" is the same kind of fact as
 * "did the cold shower today" and a second store for it would be a second
 * answer to one question.
 *
 * A go field has its OWN tick where a read field does not: a read field sits
 * under a step that already carries one, and a go field can hang on the day
 * itself, where nothing else does.
 */
function GoField({
  field,
  source,
  done,
  onToggle,
  onOpen,
}: {
  field: NsDailyField
  source: { label: string; group: string } | null
  done: boolean
  onToggle: () => void
  onOpen: () => void
}) {
  const label = field.label.trim() || TODAY_COPY.fieldUnnamed
  return (
    <div id={`field-${field.id}`} className="px-5 py-2 scroll-mt-24">
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
        <input
          type="checkbox"
          checked={done}
          onChange={onToggle}
          className="size-4 shrink-0 accent-violet-500"
          aria-label={TODAY_COPY.fieldGoDoneAria(label)}
        />
        <span className="min-w-0 flex-1">
          <span className={`block text-[12.5px] truncate ${done ? "text-zinc-500 line-through" : "text-zinc-200"}`}>{label}</span>
          <span className="block text-[10.5px] text-zinc-500 truncate">
            {source ? `${source.group} · ${source.label}` : field.readSourceId ? TODAY_COPY.fieldSourceMissing : TODAY_COPY.fieldGoUnset}
          </span>
        </span>
        {source && (
          <button
            onClick={onOpen}
            aria-label={TODAY_COPY.fieldOpenAria(label, source.label)}
            className="shrink-0 inline-flex items-center gap-1 rounded-md border border-violet-400/40 bg-violet-500/10 px-2.5 py-1 text-[11px] text-violet-100 hover:bg-violet-500/20 transition-colors"
          >
            {TODAY_COPY.fieldOpen}
            <ArrowRight className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * WHERE THIS ROW SENDS YOU, ON THE ROW, WITH THE WAY TO CHANGE IT.
 *
 * Reported from the page (2026-08-23), after clicking "Read your north star out
 * loud" and staying exactly where they were: *"i still dont go there when i
 * click it on the today page… and i cant see where i would change it."*
 *
 * Both halves were the same mistake. A row COULD be a door — but only by
 * building a second thing next to it, in a section at the bottom of Today
 * called "Your own text fields", which is neither where somebody is looking nor
 * a name that means "this is where doors are made". The row that already says
 * the right words carries it now, and says out loud where it goes.
 *
 * Drawn as a sibling of the row and never inside it: a step's row is a `<label>`
 * wrapping its checkbox, and a button inside that label would tick the step
 * every time somebody tried to open the thing it names.
 *
 * When it points at something still empty, it SAYS SO rather than drawing a
 * door onto a blank page — the same rule the read fields follow.
 */
function GoesTo({
  title,
  sourceId,
  source,
  groups,
  onOpen,
  onPick,
}: {
  title: string
  sourceId: string | null
  source: { label: string; group: string } | null
  groups: { label: string; items: { id: string; label: string }[] }[]
  onOpen: () => void
  onPick: (sourceId: string | null) => void
}) {
  const [picking, setPicking] = useState(false)

  if (picking) {
    return (
      <div className="px-5 pb-2 pl-[3.25rem] flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-[10.5px] text-zinc-500">
          {GOES_TO_COPY.pick}
          <select
            autoFocus
            value={sourceId ?? ""}
            onChange={(e) => {
              onPick(e.target.value || null)
              setPicking(false)
            }}
            aria-label={GOES_TO_COPY.setAria(title)}
            className="max-w-[16rem] rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-[11.5px] text-zinc-200 focus:border-white/30 focus:outline-none"
          >
            <option value="">{GOES_TO_COPY.nowhere}</option>
            {groups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <button onClick={() => setPicking(false)} className="text-[10.5px] text-zinc-500 hover:text-zinc-300 transition-colors">
          {GOES_TO_COPY.done}
        </button>
      </div>
    )
  }

  return (
    <div className="px-5 pb-2 pl-[3.25rem] flex flex-wrap items-center gap-2">
      {source ? (
        <>
          <button
            onClick={onOpen}
            aria-label={GOES_TO_COPY.openAria(title, source.label)}
            className="inline-flex items-center gap-1.5 min-w-0 rounded-md border border-violet-400/35 bg-violet-500/10 px-2 py-1 text-[10.5px] text-violet-100 hover:bg-violet-500/20 transition-colors"
          >
            <ArrowRight className="size-3 shrink-0" />
            <span className="truncate">{source.label}</span>
          </button>
          <button
            onClick={() => setPicking(true)}
            aria-label={GOES_TO_COPY.changeAria(title)}
            className="text-[10.5px] text-zinc-600 hover:text-zinc-300 underline underline-offset-2 transition-colors"
          >
            {GOES_TO_COPY.change}
          </button>
        </>
      ) : (
        <>
          {sourceId && <span className="text-[10.5px] text-zinc-500">{GOES_TO_COPY.missing}</span>}
          <button
            onClick={() => setPicking(true)}
            aria-label={GOES_TO_COPY.setAria(title)}
            className="inline-flex items-center gap-1 text-[10.5px] text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            <ArrowRight className="size-3" />
            {GOES_TO_COPY.set}
          </button>
        </>
      )}
    </div>
  )
}

/**
 * WHAT THIS ROW ASKS YOU, AND THE WAY TO CHANGE OR START IT.
 *
 * The question itself is drawn as a box by `WriteField`; this is the line under
 * it, and the line that stands in its place when there is no question yet.
 *
 * The second half is the one the first build of this forgot. A question that
 * can be silenced and not restored is a worse dead end than the bare checkbox
 * it replaced — the row that had a box yesterday has none today and says
 * nothing about why. And it is not only for undoing: our library gives a
 * question to the steps whose words ask for one, which leaves every other row
 * unable to ask anything, and somebody whose "Cold shower finish" wants a line
 * about the water is not wrong.
 */
function Asks({
  title,
  asks,
  onSet,
}: {
  title: string
  asks: string | null
  onSet: (question: string | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(asks ?? "")
  /**
   * Two homes, one control. With no question it is a sibling of the row and
   * has to indent past the checkbox itself; with one it sits under the box,
   * which is already indented. Inheriting the wrong one is a line that floats
   * five characters off the text it belongs to.
   */
  const pad = asks?.trim() ? "mt-1" : "px-5 pb-2 pl-[3.25rem]"

  if (editing) {
    return (
      <div className={`${pad} flex flex-wrap items-center gap-2`}>
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") return setEditing(false)
            if (e.key !== "Enter" || !draft.trim()) return
            e.preventDefault()
            onSet(draft.trim())
            setEditing(false)
          }}
          placeholder={TODAY_COPY.askPlaceholder}
          aria-label={TODAY_COPY.askEditAria(title)}
          className="min-w-[14rem] flex-1 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1.5 text-[11.5px] text-zinc-200 placeholder:text-zinc-600 focus:border-white/30 focus:outline-none"
        />
        <button
          disabled={!draft.trim()}
          onClick={() => {
            onSet(draft.trim())
            setEditing(false)
          }}
          className="rounded-md border border-violet-400/40 bg-violet-500/10 px-2.5 py-1 text-[10.5px] text-violet-100 disabled:opacity-40 hover:bg-violet-500/20 transition-colors"
        >
          {TODAY_COPY.askSave}
        </button>
        <button onClick={() => setEditing(false)} className="text-[10.5px] text-zinc-500 hover:text-zinc-300 transition-colors">
          {TODAY_COPY.askCancel}
        </button>
      </div>
    )
  }

  if (!asks?.trim()) {
    return (
      <div className={pad}>
        <button
          onClick={() => {
            setDraft("")
            setEditing(true)
          }}
          aria-label={TODAY_COPY.askOnAria(title)}
          className="inline-flex items-center gap-1 text-[10.5px] text-zinc-600 hover:text-zinc-300 transition-colors"
        >
          <Plus className="size-3" />
          {TODAY_COPY.askOn}
        </button>
      </div>
    )
  }

  return (
    <div className={`${pad} flex flex-wrap items-center gap-3`}>
      <button
        onClick={() => {
          setDraft(asks)
          setEditing(true)
        }}
        aria-label={TODAY_COPY.askEditAria(title)}
        className="text-[10px] text-zinc-600 hover:text-zinc-300 underline underline-offset-2 transition-colors"
      >
        {TODAY_COPY.askEdit}
      </button>
      <button
        onClick={() => onSet(null)}
        className="text-[10px] text-zinc-600 hover:text-zinc-300 underline underline-offset-2 transition-colors"
      >
        {TODAY_COPY.askOff}
      </button>
    </div>
  )
}

/**
 * ONE LINE OF A TO-DO LIST UNDER A BIGGER THING.
 *
 * The tick goes where every other tick on this screen goes — `plan.logged`,
 * by date — so "did the outline today" is the same kind of fact as "did the
 * cold shower today", stored once. The title edits in place with a local
 * draft, for the reason the write box does: a save re-renders the list this
 * row sits in.
 */
function SubStepRow({
  sub,
  done,
  onToggle,
  onRename,
  onMove,
  onRemove,
}: {
  sub: NsSubStep
  done: boolean
  onToggle: () => void
  onRename: (title: string) => void
  onMove: (delta: number) => void
  onRemove: () => void
}) {
  const [draft, setDraft] = useState(sub.title)
  return (
    <li className="flex items-center gap-2 py-1">
      <input
        type="checkbox"
        checked={done}
        onChange={onToggle}
        className="size-3.5 shrink-0 accent-violet-500"
        aria-label={TODAY_COPY.subTitleAria(sub.title)}
      />
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft.trim() && draft !== sub.title && onRename(draft.trim())}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return
          e.preventDefault()
          e.currentTarget.blur()
        }}
        aria-label={TODAY_COPY.subTitleAria(sub.title)}
        className={`min-w-0 flex-1 bg-transparent text-[12px] focus:outline-none ${done ? "text-zinc-500 line-through" : "text-zinc-300"}`}
      />
      <button onClick={() => onMove(-1)} aria-label={TODAY_COPY.subUp} className="text-zinc-600 hover:text-zinc-300 transition-colors">
        <ChevronUp className="size-3.5" />
      </button>
      <button onClick={() => onMove(1)} aria-label={TODAY_COPY.subDown} className="text-zinc-600 hover:text-zinc-300 transition-colors">
        <ChevronDown className="size-3.5" />
      </button>
      <button
        onClick={onRemove}
        aria-label={TODAY_COPY.subRemove(sub.title)}
        className="text-zinc-600 hover:text-rose-300 transition-colors"
      >
        <Trash2 className="size-3.5" />
      </button>
    </li>
  )
}

/**
 * THE LIST ITSELF, AND THE ONE BOX THAT GROWS IT.
 *
 * The box stays open after an add and keeps the focus, because a to-do list is
 * written in one sitting: four lines, one after another, and a control that
 * closes itself after each one turns that into four clicks it did not need.
 */
function SubSteps({
  targetId,
  title,
  subs,
  isDone,
  onToggle,
  onAdd,
  onRename,
  onMove,
  onRemove,
}: {
  targetId: string
  title: string
  subs: NsSubStep[]
  isDone: (id: string) => boolean
  onToggle: (id: string) => void
  onAdd: (title: string) => void
  onRename: (id: string, title: string) => void
  onMove: (id: string, delta: number) => void
  onRemove: (id: string) => void
}) {
  const [draft, setDraft] = useState("")
  const [adding, setAdding] = useState(false)

  if (subs.length === 0 && !adding) {
    return (
      <div className="px-5 pb-2 pl-[3.25rem]">
        <button
          onClick={() => setAdding(true)}
          aria-label={TODAY_COPY.subAddAria(title)}
          className="inline-flex items-center gap-1 text-[10.5px] text-zinc-600 hover:text-zinc-300 transition-colors"
        >
          <Plus className="size-3" />
          {TODAY_COPY.subAdd}
        </button>
      </div>
    )
  }

  return (
    <div className="px-5 pb-2.5 pl-[3.25rem]">
      <ul className="divide-y divide-white/5">
        {subs.map((sub) => (
          <SubStepRow
            key={sub.id}
            sub={sub}
            done={isDone(sub.id)}
            onToggle={() => onToggle(sub.id)}
            onRename={(text) => onRename(sub.id, text)}
            onMove={(delta) => onMove(sub.id, delta)}
            onRemove={() => onRemove(sub.id)}
          />
        ))}
      </ul>
      <input
        value={draft}
        autoFocus={adding}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return
          e.preventDefault()
          if (!draft.trim()) return
          onAdd(draft.trim())
          setDraft("")
        }}
        onBlur={() => {
          if (draft.trim()) {
            onAdd(draft.trim())
            setDraft("")
          }
          setAdding(false)
        }}
        placeholder={TODAY_COPY.subPlaceholder}
        aria-label={TODAY_COPY.subAddAria(title)}
        data-target={targetId}
        className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1.5 text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:border-white/30 focus:outline-none"
      />
    </div>
  )
}

export function TodayTab({
  plan,
  today,
  runId,
  onToggleStep,
  onToggleExperience,
  onRate,
  onNote,
  onAddField,
  onRenameField,
  onMoveField,
  onRemoveField,
  onWriteField,
  onFieldKind,
  onFieldSource,
  onAddSubStep,
  onRenameSubStep,
  onMoveSubStep,
  onRemoveSubStep,
  onGoToTrack,
  onOpenRoutine,
  onOpenField,
  onOpenGoal,
  onOpenStep,
  onStepGoesTo,
  onStepAsks,
  onGoToTab,
}: {
  plan: NsPlan
  today: string
  runId: string
  onToggleStep: (stepId: string) => void
  /** Ticking one of the things you wanted to have done. */
  onToggleExperience: (id: string) => void
  onRate: (areaId: string, score: number) => void
  onNote: (text: string) => void
  /**
   * YOUR OWN QUESTIONS, declared once and answered every day.
   *
   * A new field starts attached to the day and unnamed — nothing is written on
   * anybody's behalf — and is then named and hung wherever it belongs. Writing
   * one is keyed by field and by date, so renaming the question later does not
   * rewrite the answers underneath it.
   */
  onAddField: (targetId: string | null) => void
  onRenameField: (id: string, label: string) => void
  onMoveField: (id: string, targetId: string | null) => void
  onRemoveField: (id: string) => void
  onWriteField: (fieldId: string, text: string) => void
  /** Whether the field asks you something or shows you something. */
  onFieldKind: (id: string, kind: NsFieldKind) => void
  onFieldSource: (id: string, sourceId: string | null) => void
  /**
   * The to-do list under a bigger weekly thing. Its ticks go through
   * `onToggleStep`, the same store the routine steps use: a sub-step done
   * today is the same kind of fact as a step done today.
   */
  onAddSubStep: (targetId: string, title: string) => void
  onRenameSubStep: (id: string, title: string) => void
  onMoveSubStep: (id: string, delta: number) => void
  onRemoveSubStep: (id: string) => void
  onGoToTrack: () => void
  /**
   * THE WAY OUT OF A TICK LIST, which it did not have.
   *
   * You find out a routine is wrong by running it, and the screen where you
   * run it is this one — "read your north star" at 07:00 turns out to be a
   * 21:00 thing, the weekly review wants a day. Sending somebody to hunt for
   * the Systems step and find the right routine again is how a plan stays
   * wrong. `onOpenRoutine` opens that routine, already expanded, on the step
   * that edits it.
   */
  onOpenRoutine: (routineId: string) => void
  /**
   * A "go to it" field, followed.
   *
   * The field says where — the flow resolves it, arrives, and carries the
   * errand back. Passing the id rather than the destination keeps this screen
   * out of the business of knowing which tab holds what.
   */
  onOpenField: (fieldId: string) => void
  /**
   * A ROW THAT IS A GOAL, OPENED AS ONE.
   *
   * The driver rows and the milestone rows on this screen ARE goals, and the
   * only thing you could do to one from here was count it. Everything you find
   * out on Today — the date is wrong, four a week is three, the curve starts
   * too high — is a change to the goal card, and the card was three clicks and
   * a search away. `activity.id` is the plan goal id for both, so the row can
   * open its own goal.
   */
  onOpenGoal: (goalId: string) => void
  /**
   * A ROUTINE STEP, FOLLOWED TO THE THING IT NAMES.
   *
   * The whole point of the report this came from: "read your north star out
   * loud" is a tick nobody can honestly make while the paragraph is four steps
   * away. Resolved in the flow, because the step names a source and the source
   * knows where it lives; this screen has no business knowing which tab holds
   * what.
   */
  onOpenStep: (stepId: string) => void
  /** Where that step should send you from now on, or null for just a tick. */
  onStepGoesTo: (routineId: string, stepId: string, sourceId: string | null) => void
  /** Change, or silence, the question a routine step asks. Never deletes an answer. */
  onStepAsks: (routineId: string, stepId: string, question: string | null) => void
  onGoToTab: (tab: NorthStarTabId) => void
}) {
  const [hubGoals, setHubGoals] = useState<HubGoal[] | null>(null)
  const [signedOut, setSignedOut] = useState(false)
  /** The driver currently being counted, so its buttons can say so. */
  const [busyId, setBusyId] = useState<string | null>(null)
  /**
   * The note, held locally and committed on blur.
   *
   * Every other box in the flow saves on each keystroke, which is right for a
   * one-line answer. This one sits under a list whose every row re-renders on
   * a save, and typing a paragraph through that is typing into a page that
   * moves. Keyed by date so opening tomorrow does not show today's draft.
   */
  const [note, setNote] = useState(() => plan.notes[today] ?? "")
  useEffect(() => {
    setNote(plan.notes[today] ?? "")
  }, [today, plan.notes])
  const [error, setError] = useState<string | null>(null)
  /**
   * WHICH HEADERS HAVE BEEN TOGGLED, not which are open.
   *
   * Today's own list opens; the overflow underneath does not, because it is
   * everything that did NOT come up today and six open stacks is the flat list
   * this grouping replaces. Holding the toggles rather than the state lets each
   * list keep its own default until somebody actually touches a header.
   */
  const [toggled, setToggled] = useState<Set<string>>(() => new Set())
  const isOpen = (key: string, byDefault: boolean) => (toggled.has(key) ? !byDefault : byDefault)
  const toggleOpen = (key: string) =>
    setToggled((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/goals")
      if (res.status === 401) {
        setSignedOut(true)
        setHubGoals([])
        return
      }
      if (!res.ok) throw new Error("Could not read your goals")
      const data = await res.json()
      setHubGoals(Array.isArray(data) ? data : data.goals ?? [])
      setError(null)
    } catch (e) {
      setHubGoals([])
      setError(e instanceof Error ? e.message : "Could not read your goals")
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const items = useMemo(
    () => todayItems(plan, today, hubGoals ?? [], runId),
    [plan, today, hubGoals, runId]
  )
  const progress = useMemo(() => todayProgress(items), [items])
  /**
   * THREE LISTS, because the plan gives three answers about today.
   *
   * What it put on today, what it said only a rate for — once a week, twenty a
   * week, so today is as good a day as any — and what it put on other days.
   * The middle one used to be in the last one, which read "not your problem
   * today" for the weekly review and the piece of content that are exactly
   * today's problem when today is the day you do them.
   */
  const onToday = items.filter((i) => i.when === "today")
  const anyDay = items.filter((i) => i.when === "anyDay")
  const rest = items.filter((i) => i.when === "otherDay")
  const standing = useMemo(() => standingItems(plan), [plan])
  /**
   * The write boxes for one row, or nothing at all when nothing is hung off it.
   *
   * Drawn as siblings of the row rather than inside it: a step's row is a
   * `<label>` wrapping its checkbox, and a textarea inside that label would
   * tick the step every time somebody clicked into the box.
   */
  /**
   * "2/5 steps", when a row has a list under it.
   *
   * Deliberately NOT part of the day's own count: the thing that got done is
   * the row, and adding its parts to the total would make a day with one big
   * item broken into six read as six things to do.
   */
  /**
   * The plan's own step behind a Today row, and which routine it is in.
   *
   * The row is a `TrackActivity` — a flattened view for the list — and setting
   * where a step goes writes to the step itself, which needs both ids.
   */
  const planStep = (stepId: string) => {
    for (const routine of plan.routines) {
      const step = routine.steps.find((s) => s.id === stepId)
      if (step) return { routineId: routine.id, goesTo: step.goesTo, asks: step.asks }
    }
    return null
  }

  const subCount = (targetId: string) => {
    const { done, total } = subStepProgress(plan, today, targetId)
    return total > 0 ? TODAY_COPY.subDone(done, total) : null
  }

  const fieldBox = (field: NsDailyField) =>
    field.kind === "go" ? (
      <GoField
        key={field.id}
        field={field}
        source={destination(plan, field.readSourceId)}
        done={stepLogged(plan, today, field.id)}
        onToggle={() => onToggleStep(field.id)}
        onOpen={() => onOpenField(field.id)}
      />
    ) : field.kind === "read" ? (
      <ReadField key={field.id} field={field} source={readSource(plan, field.readSourceId)} />
    ) : (
      <WriteField
        key={`${today}:${field.id}`}
        id={field.id}
        label={field.label}
        value={journalEntry(plan, today, field.id)}
        history={journalHistory(plan, field.id, today)}
        onWrite={(text) => onWriteField(field.id, text)}
      />
    )

  /**
   * EVERYTHING HUNG OFF ONE ROW: its to-do list, then its fields.
   *
   * The list first, because it is what the row is asking you to DO; the
   * reading and the writing come after the doing.
   */
  /**
   * THE QUESTION THE ROW ITSELF ASKS, with the box it was missing.
   *
   * Reported from the page: rows whose words ask for writing — "Journal",
   * "Write three gratitudes", "Two lines on how the day went" — arrived as a
   * checkbox and nothing else, and the box you would have written in had to be
   * BUILT, by hand, in a section at the bottom of the screen. Ticking "Journal"
   * without writing anything is the row lying about what happened.
   *
   * Drawn exactly like a question somebody added, because it is one: same
   * store, same archive, same run of past answers underneath. The only extra is
   * the line that turns it off, for somebody who keeps that particular practice
   * on paper — and turning it off never deletes what is already written.
   */
  const stepQuestion = (step: { routineId: string; id: string; title: string; asks: string | null }) => {
    const set = (question: string | null) => onStepAsks(step.routineId, step.id, question)
    if (!step.asks?.trim()) return <Asks title={step.title} asks={null} onSet={set} />
    return (
      <WriteField
        key={`${today}:${step.id}:asks`}
        id={step.id}
        label={step.asks}
        value={journalEntry(plan, today, step.id)}
        history={journalHistory(plan, step.id, today)}
        onWrite={(text) => onWriteField(step.id, text)}
        footer={<Asks title={step.title} asks={step.asks} onSet={set} />}
      />
    )
  }

  const fieldsUnder = (targetId: string, title: string, step?: { routineId: string; goesTo: string | null; asks: string | null }) => (
    <>
      {/* WHERE THIS ROW GOES, first: it is what the row NAMES, and the to-do
          list under it is what the row is broken into. "Read your north star
          out loud" is about the paragraph before it is about anything else. */}
      {step && (
        <GoesTo
          title={title}
          sourceId={step.goesTo}
          source={destination(plan, step.goesTo)}
          groups={placeGroups}
          onOpen={() => onOpenStep(targetId)}
          onPick={(sourceId) => onStepGoesTo(step.routineId, targetId, sourceId)}
        />
      )}
      <SubSteps
        targetId={targetId}
        title={title}
        subs={subStepsFor(plan, targetId)}
        isDone={(id) => stepLogged(plan, today, id)}
        onToggle={onToggleStep}
        onAdd={(text) => onAddSubStep(targetId, text)}
        onRename={onRenameSubStep}
        onMove={onMoveSubStep}
        onRemove={onRemoveSubStep}
      />
      {step && stepQuestion({ routineId: step.routineId, id: targetId, title, asks: step.asks })}
      {dailyFieldsFor(plan, targetId).map(fieldBox)}
    </>
  )
  const dayFields = dailyFieldsFor(plan, null)
  /**
   * WHETHER ANYTHING FOLDED AWAY IN HERE HAS A BOX TO WRITE IN.
   *
   * Both the standing section and the other-days list are closed by default,
   * which is right when they hold rows you are not being asked about today. A
   * text field IS being asked about today wherever it hangs, so a group that
   * holds one opens: attaching a field to a milestone and watching it vanish
   * is the same bug as never having added it.
   */
  const hasField = (ids: readonly string[]) => ids.some((id) => dailyFieldsFor(plan, id).length > 0)
  /** Folded away, unless it holds a box you are meant to write in today. */
  const standingOpen = isOpen("standing", hasField(standing.map((i) => i.id)))
  const targets = useMemo(() => fieldTargets(plan), [plan])
  /**
   * The two lists a picker can offer, and they are not the same list.
   *
   * A READ field quotes its source on the row, so it can only name something
   * with words already in it — `readSources`. A GO field, and a step's own
   * door, open a place, and one of those places is the journal, which has no
   * text to quote and is exactly where a row that says "Journal" should land.
   */
  const sources = useMemo(() => readSources(plan), [plan])
  const places = useMemo(() => destinations(plan), [plan])
  /**
   * The pickers' option groups, in the order Today draws their rows.
   *
   * Grouped by walking the list rather than by bucketing it, so the groups
   * come out in the service's order and a header cannot appear twice.
   */
  const group = <T extends { group: string }>(items: T[]) => {
    const out: { label: string; items: T[] }[] = []
    for (const item of items) {
      const last = out[out.length - 1]
      if (last && last.label === item.group) last.items.push(item)
      else out.push({ label: item.group, items: [item] })
    }
    return out
  }
  const targetGroups = useMemo(() => group(targets), [targets])
  const sourceGroups = useMemo(() => group(sources), [sources])
  const placeGroups = useMemo(() => group(places), [places])

  const count = async (item: TodayItem, amount: number) => {
    if (!item.goalId || busyId) return
    setBusyId(item.activity.id)
    setError(null)
    try {
      const res = await fetch(`/api/goals/${item.goalId}/increment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      })
      if (!res.ok) throw new Error("That did not save")
      // Re-read rather than trusting a local guess: the goal may have rolled
      // over into a new week between the page loading and the button.
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not save")
    } finally {
      setBusyId(null)
    }
  }

  if (hubGoals === null) {
    return <p className="text-sm text-zinc-500">{TODAY_COPY.loading}</p>
  }

  if (items.length === 0) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-6">
        <h2 className="text-sm font-semibold text-zinc-200">{longDate(today)}</h2>
        <p className="text-[12px] text-zinc-500 mt-2 leading-relaxed max-w-prose">{TODAY_COPY.empty}</p>
      </section>
    )
  }

  const row = (item: TodayItem) => {
    const { activity } = item
    const busy = busyId === activity.id

    if (activity.kind === "routine") {
      const step = planStep(activity.id)
      return (
        /* Anchored, so "back to today" lands on the row you left rather than
           the top of a list it is somewhere inside. */
        <li key={activity.id} id={`row-${activity.id}`} className="scroll-mt-24">
          <label className="flex items-center gap-3 px-5 py-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors">
            <input
              type="checkbox"
              checked={item.done}
              onChange={() => onToggleStep(activity.id)}
              className="size-4 shrink-0 accent-violet-500"
              aria-label={`Did ${activity.title}`}
            />
            <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: activity.areaColor }} />
            <span className="min-w-0 flex-1">
              <span className={`block text-[12.5px] truncate ${item.done ? "text-zinc-500 line-through" : "text-zinc-200"}`}>
                {activity.title}
              </span>
              {/* The routine name is the header this row sits under now, so
                  the line under the title carries what the header does not:
                  HOW OFTEN, first, because "once a week" and "every day" are
                  two different promises and the list used to read them the
                  same — and then how long it takes. */}
              <span className="block text-[10.5px] text-zinc-500 truncate">
                {[cadenceLabel(activity), activity.minutes > 0 ? `${activity.minutes} min` : null, subCount(activity.id)]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
            {activity.startMin != null && (
              <span className="text-[10.5px] text-zinc-500 tabular-nums shrink-0">{clockTime(activity.startMin)}</span>
            )}
          </label>
          {fieldsUnder(activity.id, activity.title, step ?? undefined)}
        </li>
      )
    }

    /**
     * A DRIVER: A NUMBER THIS WEEK, NOT A TICK — and the number is now the
     * loudest thing on the row.
     *
     * It used to be a bare `+1` at the right-hand end, with "3 of 20 this week"
     * buried mid-sentence in the grey line above it between the cadence and the
     * area. So the one control on this screen that writes to somebody's real
     * goals looked like the smallest thing on it, and what it would do to the
     * count was on a different line from the count. Reported from the page:
     * "I hate the +1 thing, it is just not intuitive at all."
     *
     * Now: the count and its bar sit under the title where the eye already is,
     * the button says what it does in words, and taking one back off is a quiet
     * link that only exists once there is something to take back — an undo is
     * not a control you need to see before you have done anything.
     */
    const counted = item.current ?? 0
    return (
      <li key={activity.id}>
        <div className="flex items-start gap-3 px-5 py-2.5">
          <span className="mt-[7px] size-1.5 rounded-full shrink-0" style={{ backgroundColor: activity.areaColor }} />
          <span className="min-w-0 flex-1">
            {/* THE TITLE IS THE WAY INTO THE GOAL. A driver is a goal, and
                Today is where you find out its date or its rate is wrong. */}
            <button
              onClick={() => onOpenGoal(activity.id)}
              title={TODAY_COPY.openGoal(activity.title)}
              aria-label={TODAY_COPY.openGoal(activity.title)}
              className="block max-w-full text-left text-[12.5px] text-zinc-200 truncate hover:text-white hover:underline underline-offset-2 decoration-white/30 transition-colors"
            >
              {activity.title}
            </button>
            <span className="block text-[10.5px] text-zinc-500 truncate">
              {[cadenceLabel(activity), activity.areaLabel, subCount(activity.id)].filter(Boolean).join(" · ")}
            </span>
            {/* WHERE THE WEEK STANDS, under the title rather than inside the
                grey sentence. A bar only when there is a target to be a
                fraction of; a plain count when there is not, because a bar
                with no end is a picture of nothing. */}
            {item.goalId && (
              <span className="mt-1.5 flex items-center gap-2">
                {item.target != null && item.target > 0 && (
                  <span className="h-1 w-full max-w-[7rem] rounded-full bg-white/10 overflow-hidden">
                    <span
                      className="block h-full rounded-full bg-violet-400/80 transition-[width]"
                      style={{ width: `${Math.min(100, Math.round((counted / item.target) * 100))}%` }}
                    />
                  </span>
                )}
                <span className="text-[10.5px] text-zinc-400 tabular-nums shrink-0">
                  {item.target != null && item.target > 0
                    ? TODAY_COPY.countProgress(counted, item.target)
                    : TODAY_COPY.countSoFar(counted)}
                </span>
              </span>
            )}
          </span>
          {item.goalId ? (
            <span className="flex flex-col items-end gap-1 shrink-0">
              <button
                onClick={() => count(item, 1)}
                disabled={busy}
                aria-label={TODAY_COPY.countOneAria(activity.title)}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-violet-400/40 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25 disabled:opacity-40 transition-colors"
              >
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                <span className="text-[11.5px] font-medium">{TODAY_COPY.countOne}</span>
              </button>
              {counted > 0 && (
                <button
                  onClick={() => count(item, -1)}
                  disabled={busy}
                  aria-label={TODAY_COPY.countUndoAria(activity.title)}
                  className="inline-flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 disabled:opacity-30 transition-colors"
                >
                  <Minus className="size-3" />
                  {TODAY_COPY.countUndo}
                </button>
              )}
            </span>
          ) : (
            /* NOT COUNTED YET, and not given a second tally that would disagree
               with the real one the day it is pushed. */
            <button
              onClick={onGoToTrack}
              className="text-[10.5px] text-zinc-500 hover:text-zinc-300 underline underline-offset-2 shrink-0 transition-colors"
            >
              {TODAY_COPY.notTracked}
            </button>
          )}
        </div>
        {fieldsUnder(activity.id, activity.title)}
      </li>
    )
  }

  /**
   * ONE LIST, UNDER HEADERS, in the order the day happens.
   *
   * `trackGroups` does the grouping and the ordering — the same call the
   * schedule makes — so a step sits under the same routine on both screens.
   * `keyPrefix` keeps the two lists' headers apart: the morning routine appears
   * in both, and one open/closed flag for both would move the wrong one.
   */
  const groupedList = (list: TodayItem[], keyPrefix: string, openByDefault: boolean) => {
    const byId = new Map(list.map((i) => [i.activity.id, i]))
    const groups = trackGroups(list.map((i) => i.activity))

    return (
      <ul className="divide-y divide-white/5 border-y border-white/5">
        {groups.map((group) => {
          const key = `${keyPrefix}:${group.id}`
          const open = isOpen(key, openByDefault || hasField(group.activities.map((a) => a.id)))
          const logged = groupLogged(plan, today, group)
          const allDone = logged.total > 0 && logged.done === logged.total
          return (
            <li key={group.id}>
              <div className="flex items-center hover:bg-white/[0.02] transition-colors">
                <button
                  onClick={() => toggleOpen(key)}
                  aria-expanded={open}
                  className="flex items-center gap-2.5 min-w-0 flex-1 pl-5 py-2.5 text-left group"
                >
                  <ChevronDown className={`size-4 shrink-0 text-zinc-500 transition-transform ${open ? "" : "-rotate-90"}`} />
                  <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-medium text-zinc-100 truncate group-hover:text-white transition-colors">
                      {group.label}
                    </span>
                    <span className="block text-[10.5px] text-zinc-500 tabular-nums">{groupSummary(group)}</span>
                  </span>
                  {group.startMin != null && (
                    <span className="text-[10.5px] text-zinc-500 tabular-nums shrink-0">{clockTime(group.startMin)}</span>
                  )}
                  {logged.total > 0 && (
                    <span className={`text-[10.5px] tabular-nums shrink-0 ${allDone ? "text-emerald-300/90" : "text-zinc-500"}`}>
                      {allDone ? <Check className="size-3.5" aria-label={TODAY_COPY.allDone} /> : `${logged.done}/${logged.total}`}
                    </span>
                  )}
                </button>
                {/* THE WAY TO FIX WHAT YOU JUST FOUND OUT IS WRONG.
                    A routine opens on the step that edits it; the drivers are
                    goals and open on the step that writes them. */}
                <button
                  onClick={() => (group.kind === "routine" ? onOpenRoutine(group.id) : onGoToTab("systems"))}
                  aria-label={group.kind === "routine" ? TODAY_COPY.changeRoutine(group.label) : TODAY_COPY.changeDrivers}
                  className="shrink-0 px-5 py-2.5 text-[10.5px] text-zinc-600 hover:text-zinc-300 underline underline-offset-2 transition-colors"
                >
                  {TODAY_COPY.change}
                </button>
              </div>
              {open && <ul className="pl-6 border-t border-white/5 divide-y divide-white/5">{group.activities.map((a) => row(byId.get(a.id)!))}</ul>}
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-zinc-200">{longDate(today)}</h2>
            <p className="text-[11.5px] text-zinc-400 mt-1 leading-relaxed max-w-prose">{TODAY_COPY.help}</p>
          </div>
          {progress.total > 0 && (
            <span className="text-[11px] text-zinc-500 tabular-nums shrink-0">
              {progress.done} of {progress.total} {TODAY_COPY.doneSuffix}
            </span>
          )}
        </div>

        {onToday.length > 0 ? (
          <div className="mt-3">{groupedList(onToday, "today", true)}</div>
        ) : (
          <p className="px-5 py-5 text-[12px] text-zinc-500">{TODAY_COPY.nothingOn}</p>
        )}

        {progress.total > 0 && progress.done === progress.total && (
          <p className="flex items-center gap-1.5 px-5 py-3 text-[11.5px] text-emerald-300/90">
            <Check className="size-3.5" />
            {TODAY_COPY.allDone}
          </p>
        )}

        {error && <p className="px-5 pb-4 text-[11.5px] text-rose-300">{error}</p>}
        {signedOut && <p className="px-5 pb-4 text-[11.5px] text-zinc-500">{TODAY_COPY.signedOut}</p>}
      </section>

      {/* WHAT TODAY COULD BE FOR, which is not the same as what today is for.
          A rate names no day, so the plan cannot put it on today and cannot
          leave it out either. Ticking one here is how the week gets counted. */}
      {anyDay.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="px-5 pt-4">
            <h2 className="text-sm font-semibold text-zinc-200">{TODAY_COPY.anyDayTitle}</h2>
            <p className="text-[11.5px] text-zinc-400 mt-1 leading-relaxed max-w-prose">{TODAY_COPY.anyDayHelp}</p>
          </div>
          <div className="mt-3">{groupedList(anyDay, "anyday", true)}</div>
        </section>
      )}

      {/* NOT A WEEKLY THING AT ALL, folded, out of today's count.
          A milestone is not something you do on a Tuesday and an experience is
          not either — but "the day you finally do one" needs somewhere to be
          said, and the flow had nowhere. Only the experiences tick: a
          milestone's progress is its goal row in the hub, and a second tick
          here would disagree with it. */}
      {standing.length > 0 && (
        <section className="relative rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <button
            onClick={() => toggleOpen("standing")}
            aria-expanded={standingOpen}
            className="flex items-start gap-2.5 w-full px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
          >
            <ChevronDown className={`size-4 mt-0.5 shrink-0 text-zinc-500 transition-transform ${standingOpen ? "" : "-rotate-90"}`} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-zinc-200">{TODAY_COPY.standingTitle}</span>
              <span className="block text-[11.5px] text-zinc-400 mt-1 leading-relaxed max-w-prose">{TODAY_COPY.standingHelp}</span>
            </span>
            <span className="text-[11px] text-zinc-500 tabular-nums shrink-0 mr-12">{standing.length}</span>
          </button>
          <button
            onClick={() => onGoToTab("milestones")}
            aria-label={TODAY_COPY.changeStanding}
            className="absolute right-5 top-4 text-[10.5px] text-zinc-600 hover:text-zinc-300 underline underline-offset-2 transition-colors"
          >
            {TODAY_COPY.change}
          </button>

          {standingOpen && (
            <ul className="divide-y divide-white/5 border-t border-white/5">
              {standing.map((item) => (
                <li key={`${item.kind}:${item.id}`}>
                  {item.kind === "experience" ? (
                    <>
                      <label className="flex items-center gap-3 px-5 py-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors">
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() => onToggleExperience(item.id)}
                          className="size-4 shrink-0 accent-violet-500"
                          aria-label={`Have done ${item.title}`}
                        />
                        <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: item.areaColor }} />
                        <span className="min-w-0 flex-1">
                          <span className={`block text-[12.5px] truncate ${item.done ? "text-zinc-500 line-through" : "text-zinc-200"}`}>
                            {item.title}
                          </span>
                          {item.areaLabel && <span className="block text-[10.5px] text-zinc-500 truncate">{item.areaLabel}</span>}
                        </span>
                        {item.done && item.doneOn && (
                          <span className="text-[10.5px] text-emerald-300/80 tabular-nums shrink-0">
                            {TODAY_COPY.standingDoneOn} {formatTargetDate(item.doneOn)}
                          </span>
                        )}
                      </label>
                      {fieldsUnder(item.id, item.title)}
                    </>
                  ) : (
                    /* NO TICK, on purpose: this one is counted on the goals
                       page once it has been pushed, and a second tick here
                       would disagree with it. It does OPEN, though — a
                       milestone with no date is the commonest thing this list
                       shows and the date lives on the goal card, so the row
                       that reports it is also the way to fix it. */
                    <>
                      <div className="flex items-center gap-3 px-5 py-2.5 pl-[3.25rem]">
                        <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: item.areaColor }} />
                        <span className="min-w-0 flex-1">
                          <button
                            onClick={() => onOpenGoal(item.id)}
                            title={TODAY_COPY.openGoal(item.title)}
                            aria-label={TODAY_COPY.openGoal(item.title)}
                            className="block max-w-full text-left text-[12.5px] text-zinc-300 truncate hover:text-white hover:underline underline-offset-2 decoration-white/30 transition-colors"
                          >
                            {item.title}
                          </button>
                          <span className="block text-[10.5px] text-zinc-500 truncate">
                            {[item.readout, item.areaLabel, TODAY_COPY.standingMilestone].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        <button
                          onClick={() => onOpenGoal(item.id)}
                          aria-label={TODAY_COPY.openGoal(item.title)}
                          className={`text-[10.5px] tabular-nums shrink-0 underline underline-offset-2 decoration-dotted transition-colors ${
                            item.targetDate ? "text-zinc-500 hover:text-zinc-300" : "text-amber-300/70 hover:text-amber-200"
                          }`}
                        >
                          {item.targetDate ? formatTargetDate(item.targetDate) : TODAY_COPY.standingNoDate}
                        </button>
                      </div>
                      {fieldsUnder(item.id, item.title)}
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* HOW TODAY WENT, in the areas the whole plan is organised around.
          The same 0-10 the wheel uses and the same store (`plan.daily`), so a
          day rated here moves the rolling average the assessment step reads —
          two screens asking one question, not two questions. */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="px-5 pt-4">
          <h2 className="text-sm font-semibold text-zinc-200">{TODAY_COPY.feltTitle}</h2>
          <p className="text-[11.5px] text-zinc-400 mt-1 leading-relaxed max-w-prose">{TODAY_COPY.feltHelp}</p>
        </div>
        <div className="px-5 py-3 grid gap-x-6 gap-y-1 lg:grid-cols-2">
          {plan.areas.map((area) => (
            <ScoreRow
              key={area.id}
              label={area.label}
              value={dailyRating(plan, today, area.id)}
              color={area.color}
              ariaLabel={(n) => `${area.label} today: ${n} out of 10`}
              onPick={(n) => onRate(area.id, n)}
            />
          ))}
        </div>
        <div className="px-5 pb-5">
          <label htmlFor="today-note" className="block text-[11px] text-zinc-400 mb-1">
            {TODAY_COPY.noteLabel}
          </label>
          <textarea
            id="today-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => onNote(note)}
            placeholder={TODAY_COPY.notePlaceholder}
            className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-[12.5px] text-zinc-200 placeholder:text-zinc-600 focus:border-white/30 focus:outline-none resize-y"
          />
          <p className="text-[10.5px] text-zinc-600 mt-1">{TODAY_COPY.noteSaved}</p>
        </div>
        {/* THE FIELDS HUNG OFF THE DAY ITSELF rather than off one thing in the
            plan. "One key learning of today" is usually one of these; the ones
            attached to a goal are drawn on that goal's own row. */}
        {dayFields.length > 0 && <div className="pb-3">{dayFields.map(fieldBox)}</div>}
      </section>

      {/* WHERE THE FIELDS ARE MADE, and the only place they are configured.
          The writing happens on the row each one belongs to; naming it,
          hanging it somewhere else and deleting it happen here, once, so no
          row on the list above has to carry three controls it needs on the day
          it is set up and never again. */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="px-5 pt-4">
          <h2 className="text-sm font-semibold text-zinc-200">{TODAY_COPY.fieldsTitle}</h2>
          <p className="text-[11.5px] text-zinc-400 mt-1 leading-relaxed max-w-prose">{TODAY_COPY.fieldsHelp}</p>
        </div>
        {plan.fields.length === 0 ? (
          <p className="px-5 pt-3 text-[11.5px] text-zinc-500">{TODAY_COPY.fieldsEmpty}</p>
        ) : (
          <ul className="mt-3 divide-y divide-white/5 border-y border-white/5">
            {plan.fields.map((field) => (
              <li key={field.id} className="flex flex-wrap items-center gap-2 px-5 py-2.5">
                <input
                  value={field.label}
                  onChange={(e) => onRenameField(field.id, e.target.value)}
                  placeholder={TODAY_COPY.fieldLabelPlaceholder}
                  aria-label={TODAY_COPY.fieldLabelAria}
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1.5 text-[12.5px] text-zinc-200 placeholder:text-zinc-600 focus:border-white/30 focus:outline-none"
                />
                {/* WHICH DIRECTION IT RUNS. Everything else about a field is
                    the same either way, so it is one dropdown and not two
                    kinds of thing to add. */}
                <label className="flex items-center gap-1.5 text-[10.5px] text-zinc-500">
                  {TODAY_COPY.fieldKindLabel}
                  <select
                    value={field.kind}
                    onChange={(e) => onFieldKind(field.id, e.target.value as NsFieldKind)}
                    className="rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-[11.5px] text-zinc-200 focus:border-white/30 focus:outline-none"
                  >
                    <option value="write">{TODAY_COPY.fieldKindWrite}</option>
                    <option value="read">{TODAY_COPY.fieldKindRead}</option>
                    <option value="go">{TODAY_COPY.fieldKindGo}</option>
                  </select>
                </label>
                {/* ONE PICKER FOR BOTH DIRECTIONS THAT NAME SOMETHING.
                    Read and go pick from the same list — the difference is
                    what happens when you get there, not what you can point at
                    — so the choice of which is a dropdown and not two kinds of
                    field to add and re-point. The label is the only part that
                    changes, because "shows" and "goes to" are not the same
                    promise. */}
                {(field.kind === "read" || field.kind === "go") && (
                  <label className="flex items-center gap-1.5 text-[10.5px] text-zinc-500">
                    {field.kind === "go" ? TODAY_COPY.fieldGoes : TODAY_COPY.fieldShows}
                    <select
                      value={field.readSourceId ?? ""}
                      onChange={(e) => onFieldSource(field.id, e.target.value || null)}
                      className="max-w-[16rem] rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-[11.5px] text-zinc-200 focus:border-white/30 focus:outline-none"
                    >
                      <option value="">{field.kind === "go" ? TODAY_COPY.fieldGoesNothing : TODAY_COPY.fieldShowsNothing}</option>
                      {(field.kind === "go" ? placeGroups : sourceGroups).map((group) => (
                        <optgroup key={group.label} label={group.label}>
                          {group.items.map((source) => (
                            <option key={source.id} value={source.id}>
                              {source.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </label>
                )}
                <label className="flex items-center gap-1.5 text-[10.5px] text-zinc-500">
                  {TODAY_COPY.fieldAttachedTo}
                  <select
                    value={field.targetId ?? ""}
                    onChange={(e) => onMoveField(field.id, e.target.value || null)}
                    className="max-w-[14rem] rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-[11.5px] text-zinc-200 focus:border-white/30 focus:outline-none"
                  >
                    <option value="">{TODAY_COPY.fieldOnTheDay}</option>
                    {targetGroups.map((group) => (
                      <optgroup key={group.label} label={group.label}>
                        {group.items.map((target) => (
                          <option key={target.id} value={target.id}>
                            {target.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
                {/* Says what it takes with it, because it takes the answers
                    too — an entry keyed to a field nobody can name again can
                    never be read or edited, so keeping it keeps nothing. */}
                <button
                  onClick={() => onRemoveField(field.id)}
                  aria-label={TODAY_COPY.fieldRemove(field.label.trim() || TODAY_COPY.fieldUnnamed)}
                  title={TODAY_COPY.fieldRemove(field.label.trim() || TODAY_COPY.fieldUnnamed)}
                  className="size-7 shrink-0 inline-flex items-center justify-center rounded-md border border-white/10 text-zinc-500 hover:border-rose-400/40 hover:text-rose-300 transition-colors"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="px-5 py-3">
          <button
            onClick={() => onAddField(null)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11.5px] text-zinc-300 hover:border-white/30 hover:text-white transition-colors"
          >
            <Plus className="size-3.5" />
            {TODAY_COPY.fieldAdd}
          </button>
        </div>
      </section>

      {/* NOT ON TODAY, still inputtable.
          A plan that only accepts the sessions it predicted quietly under-counts
          the weeks somebody actually had. */}
      {rest.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="px-5 pt-4">
            <h2 className="text-sm font-semibold text-zinc-200">{TODAY_COPY.restTitle}</h2>
            <p className="text-[11.5px] text-zinc-400 mt-1 leading-relaxed max-w-prose">{TODAY_COPY.restHelp}</p>
          </div>
          <div className="mt-3">{groupedList(rest, "rest", false)}</div>
        </section>
      )}
    </div>
  )
}
