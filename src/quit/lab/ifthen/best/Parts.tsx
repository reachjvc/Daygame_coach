"use client"

import { useState } from "react"
import { SourceTap } from "../../../components/kit"
import type { IfEvidence } from "./evidence"
import { evidenceMode } from "./logic"
import { bestText as t } from "./text"

/** One study line with its basis and sources one tap away. Hidden for porn when only smokers or drinkers were studied. */
export function EvidenceLine({ ev, addiction, testId }: { ev: IfEvidence; addiction: string; testId: string }) {
  const [open, setOpen] = useState(false)
  const mode = evidenceMode(ev.studiedIn, addiction)
  if (mode === "hidden") return null
  return (
    <div data-testid={testId} className="rounded-lg border border-border bg-card p-3 text-sm">
      {mode === "tagged" && (
        <span data-testid={`${testId}-tag`} className="mb-1 inline-flex rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
          {t.studiedIn[ev.studiedIn]}
        </span>
      )}
      <p className="text-base">{ev.text}</p>
      <button type="button" data-testid={`${testId}-basis`} aria-expanded={open} onClick={() => setOpen(!open)} className="inline-flex min-h-11 items-center text-sm text-primary underline">
        {open ? t.basisClose : t.basisOpen}
      </button>
      {open && (
        <div data-testid={`${testId}-detail`}>
          <dl className="mt-1 flex flex-col gap-1 text-muted-foreground">
            {(
              [
                [t.basisWho, ev.basis.who],
                [t.basisN, ev.basis.n],
                [t.basisDesign, ev.basis.design],
                [t.basisWhen, ev.basis.when],
              ] as const
            ).map(([k, v]) => (
              <div key={k}>
                <dt className="inline font-medium text-foreground">{k}: </dt>
                <dd className="inline">{v}</dd>
              </div>
            ))}
          </dl>
          <SourceTap refs={[...ev.refs]} />
        </div>
      )}
    </div>
  )
}

/** The plain line under a typed "then" that names something he will not do; the basis is one tap away. */
export function Nudge({ addiction, testId, negation }: { addiction: string; testId: string; negation: IfEvidence }) {
  const [open, setOpen] = useState(false)
  return (
    <div data-testid={testId} className="rounded-md border border-border bg-card p-3 text-sm">
      <p>{t.nudge}</p>
      <button type="button" data-testid={`${testId}-why`} aria-expanded={open} onClick={() => setOpen(!open)} className="inline-flex min-h-11 items-center text-primary underline">
        {t.nudgeBasis}
      </button>
      {open && <EvidenceLine ev={negation} addiction={addiction} testId={`${testId}-ev`} />}
    </div>
  )
}
