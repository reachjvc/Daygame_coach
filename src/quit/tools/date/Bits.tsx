"use client"

import { useState } from "react"
import { SourceTap } from "../../components/kit"
import type { QuitRef } from "../../types"
import { dateText as t } from "./text"

/** A tall single-choice card: label, grey line, radio dot. Taking it only selects; a Continue button moves on. */
export function OptionCard({ label, sub, selected, onClick, testId, date }: { label: string; sub?: string; selected: boolean; onClick: () => void; testId?: string; date?: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-testid={testId}
      data-date={date}
      onClick={onClick}
      className={`flex min-h-16 w-full items-center gap-3 rounded-lg border p-3 text-left ${selected ? "border-primary bg-primary/10" : "border-border bg-card"}`}
    >
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{label}</span>
        {sub && <span className="block text-sm text-muted-foreground">{sub}</span>}
      </span>
      <span aria-hidden="true" className={`size-5 shrink-0 rounded-full border-2 ${selected ? "border-primary bg-primary" : "border-border"}`} />
    </button>
  )
}

export interface Basis {
  who: string
  n: string
  design: string
  when: string
  caveat?: string
}

/** The basis of a number: who, how many, what kind of study, when, the caveat, and the sources one tap away. */
export function BasisBox({ basis, refs, testId }: { basis: Basis; refs: QuitRef[]; testId: string }) {
  const [open, setOpen] = useState(false)
  const rows: [string, string | undefined][] = [
    [t.basisWho, basis.who],
    [t.basisN, basis.n],
    [t.basisDesign, basis.design],
    [t.basisWhen, basis.when],
    [t.basisCaveat, basis.caveat],
  ]
  return (
    <div data-testid={testId}>
      <button type="button" data-testid={`${testId}-toggle`} aria-expanded={open} onClick={() => setOpen(!open)} className="inline-flex min-h-11 items-center text-sm text-primary underline">
        {open ? t.basisClose : t.basisOpen}
      </button>
      {open && (
        <div data-testid={`${testId}-detail`} className="rounded-md border border-border bg-background p-3 text-sm">
          <dl className="flex flex-col gap-1 text-muted-foreground">
            {rows
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <dt className="inline font-medium text-foreground">{k}: </dt>
                  <dd className="inline">{v}</dd>
                </div>
              ))}
          </dl>
          <SourceTap refs={refs} />
        </div>
      )}
    </div>
  )
}

/** One plain information line with its basis box. Not a warning: no alarm colour, no icon. */
export function InfoLine({ text, basis, refs, testId }: { text: string; basis: Basis; refs: QuitRef[]; testId: string }) {
  return (
    <div data-testid={testId} className="rounded-lg border border-border bg-card p-3">
      <p className="text-base">{text}</p>
      <BasisBox basis={basis} refs={refs} testId={`${testId}-basis`} />
    </div>
  )
}
