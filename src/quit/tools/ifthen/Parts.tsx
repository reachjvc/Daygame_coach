"use client"

import { useState } from "react"
import { BasisBox, OptionCard } from "../date/Bits"
import { EVIDENCE } from "./evidence"
import { hasNegation, MAX_THEN, showThen, thenOk, withStop, type Choice, type Line } from "./logic"
import { ifthenText as t } from "./text"

const btn = "inline-flex min-h-11 items-center justify-center rounded-md border border-border px-3 text-sm"
const wrap = "[overflow-wrap:anywhere]"

const partLabel = "text-xs font-semibold uppercase tracking-wide text-muted-foreground"

/** The card he is building: "If" and "Then" as two labelled parts, each text exactly as listed or as he wrote it. */
export function PlanCard({ label, then, testId, compact = false }: { label: string; then: string; testId: string; compact?: boolean }) {
  if (compact) {
    // One line each, label beside the text: the card being built on a question screen stays short.
    return (
      <div data-testid={testId} className={`flex flex-col gap-1 ${wrap}`}>
        <p className="text-base">
          <span className={`${partLabel} mr-2`}>{t.ifLabel}</span>
          <span data-testid={`${testId}-if`}>{label}</span>
        </p>
        <p className="text-base">
          <span className={`${partLabel} mr-2`}>{t.thenLabel}</span>
          <span data-testid={`${testId}-then`}>{then.trim() ? showThen(then) : t.thenEmpty}</span>
        </p>
      </div>
    )
  }
  return (
    <div data-testid={testId} className={`flex flex-col gap-2 ${wrap}`}>
      <div>
        <p className={partLabel}>{t.ifLabel}</p>
        <p data-testid={`${testId}-if`} className="text-lg">
          {label}
        </p>
      </div>
      <div>
        <p className={partLabel}>{t.thenLabel}</p>
        <p data-testid={`${testId}-then`} className="text-lg">
          {then.trim() ? showThen(then) : t.thenEmpty}
        </p>
      </div>
    </div>
  )
}

/** The plain line under a typed "then" that names something he will not do, with its basis one tap away. */
function Nudge({ testId }: { testId: string }) {
  return (
    <div data-testid={testId} className="rounded-md border border-border bg-card p-3 text-sm">
      <p>{t.nudge}</p>
      <p className="mt-2 text-muted-foreground">{EVIDENCE.negation.text}</p>
      <BasisBox basis={EVIDENCE.negation.basis} refs={[...EVIDENCE.negation.refs]} testId={`${testId}-basis`} />
    </div>
  )
}

/**
 * The choices for one moment: its three cards, his own words, and "More ideas" (the quick ideas).
 * The quick ideas start open when the moment has no cards or his current pick is one of them.
 * Give it a `key` per moment so the open state starts fresh.
 */
export function Choices({
  swaps,
  ideas,
  value,
  onChange,
  prefix,
}: {
  swaps: string[]
  ideas: { id: string; text: string }[]
  value: Choice | undefined
  onChange: (c: Choice) => void
  prefix: string
}) {
  const [more, setMore] = useState(swaps.length === 0 || value?.from === "idea")
  // What he typed is kept while he looks at a card, and comes back when he taps the box again.
  const [typed, setTyped] = useState(value?.from === "own" ? value.then : "")
  const own = value?.from === "own" ? value.then : typed
  const showIdeas = ideas.length > 0 && (swaps.length === 0 || more)
  const ownBox = (
    <>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold">{swaps.length === 0 && ideas.length === 0 ? t.ownLabelAlone : t.ownLabel}</span>
        <textarea
          data-testid={`${prefix}own-then`}
          value={own}
          rows={2}
          maxLength={MAX_THEN}
          placeholder={t.ownPlaceholder}
          onFocus={() => {
            if (value?.from !== "own" && typed.trim() !== "") onChange({ then: typed, from: "own" })
          }}
          onChange={(e) => {
            const v = e.target.value.replace(/\s*\n\s*/g, " ")
            setTyped(v)
            onChange({ then: v, from: "own" })
          }}
          className={`min-h-[4rem] w-full resize-none rounded-md border border-border bg-card px-3 py-2 text-base [field-sizing:content] ${wrap}`}
        />
      </label>
      {own.length >= MAX_THEN - 20 && (
        <p data-testid={`${prefix}own-count`} className="-mt-3 text-right text-xs text-muted-foreground tabular-nums">
          {t.counter(own.length, MAX_THEN)}
        </p>
      )}
      {value?.from === "own" && hasNegation(value.then) && <Nudge testId={`${prefix}nudge`} />}
    </>
  )
  return (
    <div className="flex flex-col gap-4">
      {swaps.length > 0 && (
        <div role="radiogroup" aria-label={t.groupMoment} className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{t.groupMoment}</h3>
          {swaps.map((s, i) => (
            <OptionCard key={s} testId={`${prefix}swap-${i}`} label={s} selected={value?.from === "card" && value.then === s} onClick={() => onChange({ then: s, from: "card" })} />
          ))}
        </div>
      )}
      {swaps.length > 0 && ideas.length > 0 && (
        <button type="button" data-testid={`${prefix}more-ideas`} aria-expanded={more} onClick={() => setMore(!more)} className={`${btn} min-h-12 w-full`}>
          {more ? t.fewerIdeas : t.moreIdeas}
        </button>
      )}
      {showIdeas && (
        <div role="radiogroup" aria-label={t.groupQuick} className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{t.groupQuick}</h3>
          {ideas.map((x) => (
            <OptionCard
              key={x.id}
              testId={`${prefix}idea-${x.id}`}
              label={withStop(x.text)}
              selected={value?.from === "idea" && value.then === x.text}
              onClick={() => onChange({ then: x.text, from: "idea" })}
            />
          ))}
        </div>
      )}
      {ownBox}
    </div>
  )
}

/**
 * One card of the plan. The card shows only If and Then and one Edit button; Edit opens the choices with
 * Cancel and Done, and Move up, Move down and Remove. On the check-back day: Kept / Change (Change opens Edit).
 */
export function LineCard({
  line,
  label,
  index,
  count,
  swaps,
  ideas,
  due,
  answer,
  onSave,
  onMove,
  onRemove,
  onAnswer,
}: {
  line: Line
  label: string
  index: number
  count: number
  swaps: string[]
  ideas: { id: string; text: string }[]
  due: boolean
  answer: "kept" | "change" | undefined
  onSave: (c: Choice) => void
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
  /** null takes the answer back. */
  onAnswer: (a: "kept" | "change" | null) => void
}) {
  const [editing, setEditing] = useState(false)
  // Set when "Change" on the check-back day opened the editor: Cancel then takes that answer back.
  const [fromDue, setFromDue] = useState(false)
  const [draft, setDraft] = useState<Choice>({ then: line.then, from: line.from })
  const open = (viaDue: boolean) => {
    setDraft({ then: line.then, from: line.from })
    setFromDue(viaDue)
    setEditing(true)
  }
  const cancel = () => {
    if (fromDue) onAnswer(null)
    setEditing(false)
  }
  return (
    <li data-testid={`card-${index}`} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <PlanCard label={label} then={editing ? draft.then : line.then} testId={`card-${index}-text`} />
      {due && !editing && (
        <div role="group" aria-label={t.dueTitle} className="flex gap-2">
          {(["kept", "change"] as const).map((a) => (
            <button
              key={a}
              type="button"
              aria-pressed={answer === a}
              data-testid={`${a}-${index}`}
              onClick={() => {
                onAnswer(a)
                if (a === "change") open(answer !== "change")
              }}
              className={`${btn} flex-1 ${answer === a ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}
            >
              {a === "kept" ? t.kept : t.change}
            </button>
          ))}
        </div>
      )}
      {!due && !editing && (
        <button type="button" data-testid={`card-${index}-change`} onClick={() => open(false)} className={`${btn} self-start`}>
          {t.edit}
        </button>
      )}
      {editing && (
        <div data-testid={`card-${index}-edit`} className="flex flex-col gap-3 rounded-md border border-border bg-background p-3">
          <Choices key={line.id} swaps={swaps} ideas={ideas} value={draft} onChange={setDraft} prefix={`edit-${index}-`} />
          <div className="flex gap-2">
            <button type="button" data-testid={`card-${index}-cancel`} onClick={cancel} className={`${btn} min-h-12 flex-1 text-base`}>
              {t.cancel}
            </button>
            <button
              type="button"
              data-testid={`card-${index}-done`}
              disabled={!thenOk(draft)}
              onClick={() => {
                onSave({ then: draft.then.trim(), from: draft.from })
                setEditing(false)
              }}
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-md bg-primary px-4 text-base font-medium text-primary-foreground disabled:opacity-40"
            >
              {t.done}
            </button>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            <button type="button" data-testid={`card-${index}-up`} aria-label={t.up} disabled={index === 0} onClick={() => onMove(-1)} className={`${btn} gap-1 disabled:opacity-40`}>
              <span aria-hidden="true">↑</span> {t.upShort}
            </button>
            <button type="button" data-testid={`card-${index}-down`} aria-label={t.down} disabled={index === count - 1} onClick={() => onMove(1)} className={`${btn} gap-1 disabled:opacity-40`}>
              <span aria-hidden="true">↓</span> {t.downShort}
            </button>
            <button type="button" data-testid={`card-${index}-remove`} onClick={onRemove} className={`${btn} ml-auto`}>
              {t.remove}
            </button>
          </div>
        </div>
      )}
    </li>
  )
}

/** The plain print view: the cards and the check-back day. Everything else is hidden when printing. */
export function PrintView({ cards, checkText, onClose }: { cards: { id: string; label: string; then: string }[]; checkText: string; onClose: () => void }) {
  return (
    <section data-testid="print-view" data-print-root className="flex flex-col gap-3 text-foreground">
      <style>
        {
          "@media print{html,body{background:white !important;color:black !important}body *{visibility:hidden}[data-print-root],[data-print-root] *{visibility:visible}[data-print-root]{position:absolute;left:0;top:0;width:100%;color:black;background:white;border:0}[data-no-print]{display:none}[data-print-root] .text-muted-foreground{color:#444 !important}}"
        }
      </style>
      <h2 className="hidden text-xl font-semibold print:block">{t.printTitle}</h2>
      <ol className="flex flex-col gap-3">
        {cards.map((c, i) => (
          <li key={c.id} data-testid={`print-card-${i}`} className="rounded-md border border-border p-3">
            <PlanCard label={c.label} then={c.then} testId={`print-card-${i}-text`} />
          </li>
        ))}
      </ol>
      <p data-testid="print-check" className="text-base">
        <span className="font-semibold">{t.printCheck}:</span> {checkText}
      </p>
      <div data-no-print className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="print-go"
          onClick={() => window.print()}
          className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-4 text-base font-medium text-primary-foreground"
        >
          {t.printBtn}
        </button>
        <button type="button" data-testid="print-close" onClick={onClose} className={btn}>
          {t.printBack}
        </button>
      </div>
    </section>
  )
}
