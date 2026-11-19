"use client"

import { useState } from "react"
import { BasisBox, OptionCard } from "../date/Bits"
import { EVIDENCE } from "./evidence"
import { hasNegation, thenOk, withStop, type Choice, type Line } from "./logic"
import { ifthenText as t } from "./text"

const btn = "inline-flex min-h-11 items-center justify-center rounded-md border border-border px-3 text-sm"
const wrap = "[overflow-wrap:anywhere]"

/** The card he is building: "If" and "Then", two labelled parts, shown as he wrote or picked them. */
export function PlanCard({ label, then, testId }: { label: string; then: string; testId: string }) {
  return (
    <div data-testid={testId} className={`flex flex-col gap-1 ${wrap}`}>
      <p className="text-lg">
        <span className="font-semibold">{t.ifLabel}</span> <span data-testid={`${testId}-if`}>{label}</span>
      </p>
      <p className="text-lg">
        <span className="font-semibold">{t.thenLabel}</span> <span data-testid={`${testId}-then`}>{then.trim() ? withStop(then) : t.thenEmpty}</span>
      </p>
    </div>
  )
}

/** The plain line under a typed "then" that names something he will not do, with its basis one tap away. */
function Nudge({ testId }: { testId: string }) {
  return (
    <div data-testid={testId} className="rounded-md border border-border bg-card p-3 text-sm">
      <span className="mb-1 inline-flex rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">{t.nudgeTag}</span>
      <p>{t.nudge}</p>
      <BasisBox basis={EVIDENCE.negation.basis} refs={[...EVIDENCE.negation.refs]} testId={`${testId}-basis`} />
    </div>
  )
}

/** The choices for one moment: its three cards, the quick ideas, or his own words. */
export function Choices({ swaps, ideas, value, onChange, prefix }: { swaps: string[]; ideas: { id: string; text: string }[]; value: Choice | undefined; onChange: (c: Choice) => void; prefix: string }) {
  const own = value?.from === "own" ? value.then : ""
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
      <div role="radiogroup" aria-label={t.groupQuick} className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">{t.groupQuick}</h3>
        {ideas.map((x) => (
          <OptionCard key={x.id} testId={`${prefix}idea-${x.id}`} label={x.text} selected={value?.from === "idea" && value.then === x.text} onClick={() => onChange({ then: x.text, from: "idea" })} />
        ))}
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold">{t.ownLabel}</span>
        <input
          data-testid={`${prefix}own-then`}
          value={own}
          maxLength={160}
          placeholder={t.ownPlaceholder}
          onChange={(e) => onChange({ then: e.target.value, from: "own" })}
          className="min-h-12 w-full rounded-md border border-border bg-card px-3 text-base"
        />
      </label>
      {value?.from === "own" && hasNegation(value.then) && <Nudge testId={`${prefix}nudge`} />}
    </div>
  )
}

/** One card of the plan, with Change, Move up, Move down, Remove, and Kept / Change when the check-back day is here. */
export function LineCard({ line, label, index, count, swaps, ideas, due, answer, onSave, onMove, onRemove, onAnswer }: {
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
  onAnswer: (a: "kept" | "change") => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Choice>({ then: line.then, from: line.from })
  const open = () => {
    setDraft({ then: line.then, from: line.from })
    setEditing(true)
  }
  return (
    <li data-testid={`card-${index}`} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <PlanCard label={label} then={line.then} testId={`card-${index}-text`} />
      {due && (
        <div role="group" aria-label={t.dueTitle} className="flex gap-2">
          {(["kept", "change"] as const).map((a) => (
            <button
              key={a}
              type="button"
              aria-pressed={answer === a}
              data-testid={`${a}-${index}`}
              onClick={() => {
                onAnswer(a)
                if (a === "change" && !editing) open()
              }}
              className={`${btn} flex-1 ${answer === a ? "border-primary bg-primary text-primary-foreground" : "bg-background"}`}
            >
              {a === "kept" ? t.kept : t.change}
            </button>
          ))}
        </div>
      )}
      {editing && (
        <div data-testid={`card-${index}-edit`} className="flex flex-col gap-3 rounded-md border border-border bg-background p-3">
          <Choices swaps={swaps} ideas={ideas} value={draft} onChange={setDraft} prefix={`edit-${index}-`} />
          <button
            type="button"
            data-testid={`card-${index}-done`}
            disabled={!thenOk(draft)}
            onClick={() => {
              onSave({ then: draft.then.trim(), from: draft.from })
              setEditing(false)
            }}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-primary px-4 text-base font-medium text-primary-foreground disabled:opacity-40"
          >
            {t.done}
          </button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {!editing && !due && (
          <button type="button" data-testid={`card-${index}-change`} onClick={open} className={btn}>
            {t.change}
          </button>
        )}
        <button type="button" data-testid={`card-${index}-up`} aria-label={t.up} disabled={index === 0} onClick={() => onMove(-1)} className={`${btn} w-11 disabled:opacity-40`}>
          {"↑"}
        </button>
        <button type="button" data-testid={`card-${index}-down`} aria-label={t.down} disabled={index === count - 1} onClick={() => onMove(1)} className={`${btn} w-11 disabled:opacity-40`}>
          {"↓"}
        </button>
        <button type="button" data-testid={`card-${index}-remove`} onClick={onRemove} className={btn}>
          {t.remove}
        </button>
      </div>
    </li>
  )
}

/** The plain print view: the cards and the check-back day. Everything else is hidden when printing. */
export function PrintView({ cards, checkText, onClose }: { cards: { id: string; label: string; then: string }[]; checkText: string; onClose: () => void }) {
  return (
    <section data-testid="print-view" data-print-root className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 text-foreground">
      <style>{"@media print{body *{visibility:hidden}[data-print-root],[data-print-root] *{visibility:visible}[data-print-root]{position:absolute;left:0;top:0;width:100%;color:CanvasText;background:Canvas;border:0}[data-no-print]{display:none}}"}</style>
      <h2 className="text-xl font-semibold">{t.printTitle}</h2>
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
        <button type="button" data-testid="print-go" onClick={() => window.print()} className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-4 text-base font-medium text-primary-foreground">
          {t.printBtn}
        </button>
        <button type="button" data-testid="print-close" onClick={onClose} className={btn}>
          {t.printBack}
        </button>
      </div>
    </section>
  )
}
